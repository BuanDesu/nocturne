import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../lib/pointer";
import "../styles/marquee.css";

export interface MarqueeProps {
  items: string[];
  /** Horizontal travel in pixels per second. */
  speed?: number;
  className?: string;
}

/**
 * Full-bleed typographic band. The track repeats three times and loops
 * seamlessly; hovering eases it almost to a stop so the letterforms can be read.
 * Purely decorative — hidden from assistive technology.
 */
export default function Marquee({ items, speed = 64, className = "" }: MarqueeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const set = setRef.current;
    if (!root || !track || !set) return;
    if (prefersReducedMotion()) return;

    let raf = 0;
    let running = false;
    let visible = true;
    let last = performance.now();
    let x = 0;
    let width = Math.max(1, set.offsetWidth);
    let factor = 1;
    let target = 1;

    const measure = () => {
      width = Math.max(1, set.offsetWidth);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(set);
    document.fonts?.ready.then(measure).catch(() => {});

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min(64, Math.max(0, now - last)) / 1000;
      last = now;
      factor += (target - factor) * Math.min(1, dt * 5);
      x -= speed * factor * dt;
      if (x <= -width) x += width;
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const slow = () => {
      target = 0.16;
    };
    const resume = () => {
      target = 1;
    };

    root.addEventListener("pointerenter", slow);
    root.addEventListener("pointerleave", resume);

    const intersection = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible && !document.hidden) start();
        else stop();
      },
      { threshold: 0 },
    );
    intersection.observe(root);

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      root.removeEventListener("pointerenter", slow);
      root.removeEventListener("pointerleave", resume);
    };
  }, [items, speed]);

  return (
    <div className={`marquee ${className}`.trim()} ref={rootRef} aria-hidden="true">
      <div className="marquee__track" ref={trackRef}>
        {[0, 1, 2].map((copy) => (
          <div className="marquee__set" key={copy} ref={copy === 0 ? setRef : undefined}>
            {items.map((item, index) => (
              <span className="marquee__item" key={`${copy}-${index}`}>
                {item}
                <span className="marquee__sep">✳</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}