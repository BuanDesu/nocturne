import { useEffect, useRef } from "react";
import { gsap } from "../../lib/motion";
import { isCoarsePointer, prefersReducedMotion } from "../../lib/pointer";

/**
 * Instrument 03 — a card that tilts toward the pointer with a spotlight that
 * tracks it. Content sits on separate Z planes, so the surface has real depth;
 * leaving the card returns it on an expo settle.
 */
export default function TiltCard() {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const card = cardRef.current;
    if (!stage || !card) return;

    const reduced = prefersReducedMotion();
    const coarse = isCoarsePointer();
    if (coarse) return;

    const tiltX = gsap.quickTo(card, "rotationX", { duration: 0.7, ease: "power3.out" });
    const tiltY = gsap.quickTo(card, "rotationY", { duration: 0.7, ease: "power3.out" });

    const setVars = (px: number, py: number) => {
      card.style.setProperty("--mx", `${(px * 100).toFixed(2)}%`);
      card.style.setProperty("--my", `${(py * 100).toFixed(2)}%`);
      card.style.setProperty("--shift-x", `${((px - 0.5) * 18).toFixed(2)}px`);
      card.style.setProperty("--shift-y", `${((py - 0.5) * 18).toFixed(2)}px`);
    };

    const onMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const px = (event.clientX - rect.left) / Math.max(1, rect.width);
      const py = (event.clientY - rect.top) / Math.max(1, rect.height);
      setVars(px, py);
      if (reduced) return;
      tiltX((0.5 - py) * 14);
      tiltY((px - 0.5) * 16);
    };

    const onLeave = () => {
      tiltX(0);
      tiltY(0);
      setVars(0.5, 0.42);
    };

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    setVars(0.5, 0.42);

    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(card);
      gsap.set(card, { rotationX: 0, rotationY: 0 });
    };
  }, []);

  return (
    <div className="craft__tilt" ref={stageRef}>
      <div className="tilt__card" ref={cardRef}>
        <span className="tilt__grid" aria-hidden="true" />
        <span className="tilt__glow" aria-hidden="true" />
        <span className="tilt__bracket tilt__bracket--tl" aria-hidden="true" />
        <span className="tilt__bracket tilt__bracket--tr" aria-hidden="true" />
        <span className="tilt__bracket tilt__bracket--bl" aria-hidden="true" />
        <span className="tilt__bracket tilt__bracket--br" aria-hidden="true" />
        <div className="tilt__content">
          <span className="tilt__meta mono">Material study / 03</span>
          <p className="tilt__title serif">
            A surface <span className="serif-i">that answers.</span>
          </p>
          <p className="tilt__body">
            The plane leans toward attention. Light stays one step ahead of the hand.
          </p>
          <div className="tilt__foot mono">
            <span>pointer-aware</span>
            <span>±14°</span>
          </div>
        </div>
      </div>
    </div>
  );
}