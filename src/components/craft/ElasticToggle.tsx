import { useEffect, useRef, useState } from "react";
import { clamp } from "../../lib/utils";
import { prefersReducedMotion } from "../../lib/pointer";

const STIFFNESS = 210;
const DAMPING = 15;

/**
 * Instrument 02 — a real spring, not a CSS transition. Drag the knob to pull
 * the spring; release and it finds the nearest state with visible overshoot.
 * The knob stretches with velocity and the fill trails it.
 */
export default function ElasticToggle() {
  const [on, setOn] = useState(false);
  const trackRef = useRef<HTMLButtonElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  const pos = useRef(0);
  const velocity = useRef(0);
  const target = useRef(0);
  const travel = useRef(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const dragRef = useRef<{ active: boolean; startX: number; startPos: number; moved: boolean }>({
    active: false,
    startX: 0,
    startPos: 0,
    moved: false,
  });
  const suppressClickRef = useRef(false);

  const apply = () => {
    const knob = knobRef.current;
    const fill = fillRef.current;
    if (!knob || !fill) return;
    const stretch = Math.min(0.24, Math.abs(velocity.current) * 0.02);
    const x = clamp(pos.current, -0.08, 1.08);
    knob.style.transform = `translate3d(${(x * travel.current).toFixed(2)}px, 0, 0) scaleX(${(1 + stretch).toFixed(3)}) scaleY(${(1 - stretch * 0.5).toFixed(3)})`;
    fill.style.transform = `scaleX(${clamp(pos.current, 0, 1).toFixed(4)})`;
  };

  const settle = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (prefersReducedMotion()) {
      pos.current = target.current;
      velocity.current = 0;
      apply();
      return;
    }
    lastRef.current = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (now - lastRef.current) / 1000));
      lastRef.current = now;
      const accel = (target.current - pos.current) * STIFFNESS - velocity.current * DAMPING;
      velocity.current += accel * dt;
      pos.current += velocity.current * dt;
      apply();
      if (Math.abs(velocity.current) > 0.004 || Math.abs(target.current - pos.current) > 0.002) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        pos.current = target.current;
        velocity.current = 0;
        apply();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const measure = () => {
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return;
    travel.current = track.clientWidth - knob.offsetWidth - 8;
    apply();
  };

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (trackRef.current) observer.observe(trackRef.current);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const setState = (next: boolean) => {
    setOn(next);
    target.current = next ? 1 : 0;
    settle();
  };

  const onClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setState(!on);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragRef.current = { active: true, startX: event.clientX, startPos: pos.current, moved: false };
    cancelAnimationFrame(rafRef.current);
    velocity.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag.active || travel.current <= 0) return;
    const dx = event.clientX - drag.startX;
    if (Math.abs(dx) > 3) drag.moved = true;
    pos.current = clamp(drag.startPos + dx / travel.current, 0, 1);
    target.current = pos.current;
    apply();
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    if (!drag.moved) {
      suppressClickRef.current = false;
      return;
    }
    suppressClickRef.current = true;
    const next = pos.current > 0.5;
    setOn(next);
    target.current = next ? 1 : 0;
    settle();
  };

  return (
    <div className="craft__elastic">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Elastic spring switch"
        className="elastic__track"
        ref={trackRef}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-cursor="drag"
      >
        <span className="elastic__fill" ref={fillRef} aria-hidden="true" />
        <span className="elastic__knob" ref={knobRef} aria-hidden="true">
          <span className="elastic__knob-line" />
        </span>
      </button>

      <div className="elastic__readout mono" aria-hidden="true">
        <span className="elastic__readout-item"><em>k</em><b>210</b></span>
        <span className="elastic__readout-item"><em>ζ</em><b>0.52</b></span>
        <span className={`elastic__readout-item elastic__state${on ? " is-on" : ""}`}>{on ? "ON" : "OFF"}</span>
      </div>
    </div>
  );
}
