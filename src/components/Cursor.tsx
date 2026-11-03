import { useEffect, useRef } from "react";
import { isCoarsePointer, prefersReducedMotion, subscribePointer } from "../lib/pointer";
import { damp } from "../lib/utils";
import "../styles/cursor.css";

type Intent = "default" | "link" | "view" | "drag" | "text" | "hide";

/**
 * Two-part custom cursor: an acid dot with tight tracking and a bone ring that
 * trails behind it. Hover intent expands the ring and reveals a label.
 */
export default function Cursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    const dot = dotRef.current;
    const label = labelRef.current;
    if (!ring || !dot || !label) return;
    if (isCoarsePointer() || prefersReducedMotion()) return;

    document.body.classList.add("has-custom-cursor");

    let ringX = window.innerWidth / 2;
    let ringY = window.innerHeight / 2;
    let dotX = ringX;
    let dotY = ringY;
    let scale = 1;
    let targetScale = 1;
    let opacity = 0;
    let targetOpacity = 0;
    let intent: Intent = "default";

    const applyIntent = (next: Intent, text: string) => {
      intent = next;
      label.textContent = text;
      ring.dataset.intent = next;
      targetScale = next === "default" ? 1 : next === "link" ? 1.9 : next === "view" ? 3.1 : next === "drag" ? 1.55 : 0.4;
      dot.style.opacity = next === "view" || next === "hide" ? "0" : "1";
    };

    const unsubscribePointer = subscribePointer((p, dt) => {
      const seconds = dt / 1000;
      ringX = damp(ringX, p.x, 16, seconds);
      ringY = damp(ringY, p.y, 16, seconds);
      dotX = damp(dotX, p.x, 40, seconds);
      dotY = damp(dotY, p.y, 40, seconds);
      scale = damp(scale, targetScale * (p.down ? 0.82 : 1), 18, seconds);
      targetOpacity = p.active ? 1 : 0;
      opacity = damp(opacity, targetOpacity, 10, seconds);

      ring.style.transform = `translate3d(${ringX.toFixed(2)}px, ${ringY.toFixed(2)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      dot.style.transform = `translate3d(${dotX.toFixed(2)}px, ${dotY.toFixed(2)}px, 0) translate(-50%, -50%)`;
      ring.style.opacity = opacity.toFixed(3);
      dot.style.opacity = intent === "view" || intent === "hide" ? "0" : opacity.toFixed(3);
    });

    const onIntent = (event: Event) => {
      const detail = (event as CustomEvent<{ intent: Intent; label: string }>).detail;
      applyIntent(detail.intent, detail.label);
    };
    window.addEventListener("nocturne:cursor", onIntent);

    return () => {
      unsubscribePointer();
      window.removeEventListener("nocturne:cursor", onIntent);
      document.body.classList.remove("has-custom-cursor");
    };
  }, []);

  return (
    <div className="cursor" aria-hidden="true">
      <div className="cursor__ring" ref={ringRef} data-intent="default">
        <span className="cursor__label" ref={labelRef} />
      </div>
      <div className="cursor__dot" ref={dotRef} />
    </div>
  );
}
