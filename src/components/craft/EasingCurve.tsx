import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../lib/pointer";
import { readStageColors, useCanvasLoop, type CanvasFrame } from "./useCanvasLoop";

const PRESETS = [
  { id: "expo", label: "Expo", points: [0.16, 1, 0.3, 1] as const, css: "0.16, 1, 0.3, 1" },
  { id: "quart", label: "Quart", points: [0.25, 1, 0.5, 1] as const, css: "0.25, 1, 0.5, 1" },
  { id: "spring", label: "Spring", points: [0.34, 1.56, 0.64, 1] as const, css: "0.34, 1.56, 0.64, 1" },
];

const bezier = (t: number, p1: number, p2: number) => {
  const inv = 1 - t;
  return 3 * inv * inv * t * p1 + 3 * inv * t * t * p2 + t * t * t;
};

/** Solve x(t) = progress for t, then read y(t) — the dot rides the real curve. */
const easeAt = (progress: number, points: readonly number[]) => {
  let low = 0;
  let high = 1;
  let t = progress;
  for (let i = 0; i < 18; i += 1) {
    const x = bezier(t, points[0], points[2]);
    if (Math.abs(x - progress) < 0.0005) break;
    if (x < progress) low = t;
    else high = t;
    t = (low + high) / 2;
  }
  return bezier(t, points[1], points[3]);
};

const CYCLE = 2.7;
const TRAVEL = 1.5;

/**
 * Instrument 04 — a cubic-bezier viewer. The dot moves across at constant
 * horizontal speed and rises by the curve's real value; presets morph the
 * control points instead of cutting. Pointer inspection reports x → y.
 */
export default function EasingCurve() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const [preset, setPreset] = useState(0);
  const pointsRef = useRef<number[]>([...PRESETS[0].points]);
  const targetRef = useRef<number[]>([...PRESETS[0].points]);
  const pointerRef = useRef<{ active: boolean; x: number }>({ active: false, x: 0 });
  const startedRef = useRef(0);
  const colorCache = useRef<ReturnType<typeof readStageColors> | null>(null);

  const redraw = useCanvasLoop(canvasRef, (frame) => draw(frame));

  useEffect(() => {
    targetRef.current = [...PRESETS[preset].points];
    redraw();
  }, [preset, redraw]);

  function draw({ ctx, width, height, time, dt }: CanvasFrame) {
    const colors = colorCache.current ?? (colorCache.current = readStageColors(ctx.canvas));
    const pad = { left: 20, right: 16, top: 16, bottom: 26 };
    const plotW = Math.max(1, width - pad.left - pad.right);
    const plotH = Math.max(1, height - pad.top - pad.bottom);
    const x0 = pad.left;
    const y0 = pad.top + plotH;
    const mapX = (value: number) => x0 + value * plotW;
    const mapY = (value: number) => y0 - value * plotH;

    const reduced = prefersReducedMotion();
    const lerp = Math.min(1, (reduced ? 1 : dt) * 0.012);
    for (let i = 0; i < 4; i += 1) pointsRef.current[i] += (targetRef.current[i] - pointsRef.current[i]) * lerp;
    const points = pointsRef.current;

    ctx.clearRect(0, 0, width, height);

    // Plot frame, hairlines every quarter.
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const gx = mapX(i / 4);
      const gy = mapY(i / 4);
      ctx.strokeStyle = colors.fgAlpha(i === 0 || i === 4 ? 0.22 : 0.08);
      ctx.beginPath();
      ctx.moveTo(gx + 0.5, mapY(1.08));
      ctx.lineTo(gx + 0.5, y0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0, gy + 0.5);
      ctx.lineTo(mapX(1), gy + 0.5);
      ctx.stroke();
    }

    // Curve.
    ctx.strokeStyle = colors.fgAlpha(0.85);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= 72; i += 1) {
      const t = i / 72;
      const px = mapX(bezier(t, points[0], points[2]));
      const py = mapY(bezier(t, points[1], points[3]));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Control handles.
    ctx.strokeStyle = colors.fgAlpha(0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(mapX(points[0]), mapY(points[1]));
    ctx.moveTo(mapX(1), mapY(1));
    ctx.lineTo(mapX(points[2]), mapY(points[3]));
    ctx.stroke();

    const handleFill = (px: number, py: number, acid: boolean) => {
      ctx.beginPath();
      ctx.arc(px, py, acid ? 3 : 2.4, 0, Math.PI * 2);
      ctx.fillStyle = acid ? colors.acid : colors.fgAlpha(0.5);
      ctx.fill();
    };
    handleFill(mapX(points[0]), mapY(points[1]), false);
    handleFill(mapX(points[2]), mapY(points[3]), false);

    // Progress: linear across x, eased up the curve.
    if (!startedRef.current) startedRef.current = time;
    const elapsed = (time - startedRef.current) % CYCLE;
    const progress = reduced ? 0.68 : Math.min(1, elapsed / TRAVEL);
    const value = easeAt(progress, points);
    const dotX = mapX(progress);
    const dotY = mapY(value);

    ctx.strokeStyle = colors.fgAlpha(0.16);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, dotY + 0.5);
    ctx.lineTo(dotX, dotY + 0.5);
    ctx.moveTo(dotX + 0.5, dotY);
    ctx.lineTo(dotX + 0.5, y0);
    ctx.stroke();

    const glow = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 16);
    glow.addColorStop(0, "rgba(218, 255, 62, 0.28)");
    glow.addColorStop(1, "rgba(218, 255, 62, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(dotX, dotY, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = colors.acid;
    ctx.fill();

    if (readoutRef.current && !pointerRef.current.active) {
      readoutRef.current.textContent = `x ${progress.toFixed(2)} → y ${value.toFixed(2)}`;
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pad = { left: 20, right: 16, top: 16, bottom: 26 };
    const plotW = Math.max(1, rect.width - pad.left - pad.right);
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left - pad.left) / plotW));
    pointerRef.current = { active: true, x };
    const value = easeAt(x, pointsRef.current);
    if (readoutRef.current) readoutRef.current.textContent = `x ${x.toFixed(2)} → y ${value.toFixed(2)}`;
  };

  const onPointerLeave = () => {
    pointerRef.current = { active: false, x: 0 };
  };

  const active = PRESETS[preset];

  return (
    <div className="craft__easing">
      <div className="easing__stage">
        <canvas
          className="easing__canvas"
          ref={canvasRef}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          aria-hidden="true"
        />
        <span className="easing__axis mono easing__axis--y" aria-hidden="true">ease</span>
        <span className="easing__axis mono easing__axis--x" aria-hidden="true">t</span>
      </div>
      <div className="easing__controls">
        <div className="easing__presets" role="group" aria-label="Easing presets">
          {PRESETS.map((option, index) => (
            <button
              key={option.id}
              type="button"
              className={`easing__preset mono${index === preset ? " is-active" : ""}`}
              aria-pressed={index === preset}
              onClick={() => setPreset(index)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="easing__readout mono" ref={readoutRef} aria-hidden="true">x 0.00 → y 0.00</span>
      </div>
      <span className="easing__formula mono">cubic-bezier({active.css})</span>
    </div>
  );
}