import { useEffect, useRef, useState } from "react";
import { gsap } from "../../lib/motion";
import { prefersReducedMotion } from "../../lib/pointer";
import { clamp } from "../../lib/utils";

/**
 * Instrument 01 — a button that leans toward the pointer. Two rings follow at
 * different rates so the bay reads as a small magnetic field; a single acid
 * satellite keeps orbiting the halo. Clicking latches the button.
 */
export default function MagneticButton() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);
  const orbitRef = useRef<HTMLSpanElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const field = fieldRef.current;
    const button = buttonRef.current;
    const halo = haloRef.current;
    const orbit = orbitRef.current;
    if (!field || !button || !halo || !orbit) return;
    if (prefersReducedMotion()) return;

    const buttonX = gsap.quickTo(button, "x", { duration: 0.8, ease: "power3.out" });
    const buttonY = gsap.quickTo(button, "y", { duration: 0.8, ease: "power3.out" });
    const haloX = gsap.quickTo(halo, "x", { duration: 1.5, ease: "power3.out" });
    const haloY = gsap.quickTo(halo, "y", { duration: 1.5, ease: "power3.out" });
    const haloScale = gsap.quickTo(halo, "scale", { duration: 1.1, ease: "power3.out" });
    const orbitX = gsap.quickTo(orbit, "x", { duration: 1.8, ease: "power3.out" });
    const orbitY = gsap.quickTo(orbit, "y", { duration: 1.8, ease: "power3.out" });

    const onMove = (event: PointerEvent) => {
      const rect = field.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const limitX = rect.width * 0.26;
      const limitY = rect.height * 0.24;
      buttonX(clamp(dx * 0.42, -limitX, limitX));
      buttonY(clamp(dy * 0.42, -limitY, limitY));
      haloX(clamp(dx * 0.19, -limitX, limitX));
      haloY(clamp(dy * 0.19, -limitY, limitY));
      orbitX(clamp(dx * 0.1, -limitX, limitX));
      orbitY(clamp(dy * 0.1, -limitY, limitY));
      haloScale(1.05);
    };

    const onLeave = () => {
      buttonX(0);
      buttonY(0);
      haloX(0);
      haloY(0);
      orbitX(0);
      orbitY(0);
      haloScale(1);
    };

    field.addEventListener("pointermove", onMove);
    field.addEventListener("pointerleave", onLeave);

    return () => {
      field.removeEventListener("pointermove", onMove);
      field.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf([button, halo, orbit]);
      gsap.set([button, halo, orbit], { x: 0, y: 0, scale: 1 });
    };
  }, []);

  const onClick = () => {
    setHeld((value) => !value);
    const ripple = rippleRef.current;
    if (!ripple || prefersReducedMotion()) return;
    gsap.killTweensOf(ripple);
    gsap.fromTo(
      ripple,
      { scale: 0.72, autoAlpha: 0.9 },
      { scale: 1.9, autoAlpha: 0, duration: 1.05, ease: "expo.out", overwrite: true },
    );
  };

  return (
    <div className="craft__magnet" ref={fieldRef}>
      <span className="magnet__halo" ref={haloRef} aria-hidden="true" />
      <span className="magnet__orbit" ref={orbitRef} aria-hidden="true">
        <span className="magnet__satellite" />
      </span>
      <button
        type="button"
        ref={buttonRef}
        className={`magnet__button${held ? " is-held" : ""}`}
        aria-pressed={held}
        aria-label="Magnetic button — pull with the pointer, activate to latch"
        onClick={onClick}
        data-cursor="link"
      >
        <span className="magnet__label mono">{held ? "Latched" : "Pull"}</span>
        <span className="magnet__icon serif" aria-hidden="true">{held ? "✳" : "↗"}</span>
        <span className="magnet__ripple" ref={rippleRef} aria-hidden="true" />
      </button>
    </div>
  );
}
