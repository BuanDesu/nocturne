import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/motion";
import { pad } from "../lib/utils";
import "../styles/preloader.css";

interface PreloaderProps {
  onDone: () => void;
}

/**
 * Curtain preloader: counts real progress, waits for webfonts, then splits the
 * screen in two to reveal the hero.
 */
export default function Preloader({ onDone }: PreloaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const doneRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // This effect can re-run if the parent re-renders after completion
    // (e.g. a fresh onDone closure). Never re-lock a page that is already live.
    if (doneRef.current) return;

    const root = rootRef.current;
    const count = countRef.current;
    const bar = barRef.current;
    if (!root || !count || !bar) return;

    const reduced = prefersReducedMotion();
    document.body.classList.add("is-locked");

    // Request the faces the hero depends on, then wait for them. Awaiting
    // document.fonts.ready alone is not enough: it can resolve before any text
    // has painted and therefore before the browser has requested the fonts.
    const fontsReady = (async () => {
      try {
        if (!document.fonts) return;
        await Promise.allSettled([
          document.fonts.load('400 1em "Instrument Serif"'),
          document.fonts.load('italic 400 1em "Instrument Serif"'),
          document.fonts.load('400 1em "Instrument Sans"'),
          document.fonts.load('500 1em "JetBrains Mono"'),
        ]);
        await document.fonts.ready;
      } catch {
        /* fonts are an enhancement, never a blocker */
      }
    })();

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      document.body.classList.remove("is-locked");
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      gsap.set(root, { display: "none" });
      root.setAttribute("aria-hidden", "true");
      onDone();
    };

    if (reduced) {
      // Even with motion off, wait for the webfonts (capped) so the hero never
      // repaints its type after the curtain lifts.
      const tl = gsap.timeline({ onComplete: finish });
      let started = false;
      const reveal = () => {
        if (started) return;
        started = true;
        tl.to(root, { autoAlpha: 0, duration: 0.25 });
      };
      const fallback = window.setTimeout(reveal, 1400);
      fontsReady.then(reveal).catch(reveal);
      return () => {
        window.clearTimeout(fallback);
        tl.kill();
      };
    }

    const progress = { value: 0 };
    const render = () => {
      count.textContent = pad(progress.value, 3);
      bar.style.transform = `scaleX(${(progress.value / 100).toFixed(4)})`;
    };
    render();

    const tl = gsap.timeline();
    let fontsDone = false;
    fontsReady.then(() => { fontsDone = true; }).catch(() => { fontsDone = true; });

    // Count up to 92% right away, then wait for fonts before finishing.
    tl.to(progress, {
      value: 92,
      duration: 1.35,
      ease: "power2.inOut",
      onUpdate: render,
    });

    tl.add(() => {
      const complete = () => {
        gsap.to(progress, {
          value: 100,
          duration: 0.55,
          ease: "power2.out",
          onUpdate: render,
          onComplete: reveal,
        });
      };
      if (fontsDone) complete();
      else {
        let waited = 0;
        intervalRef.current = window.setInterval(() => {
          waited += 50;
          if (fontsDone || waited > 2500) {
            if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
            intervalRef.current = null;
            complete();
          }
        }, 50);
      }
    });

    const reveal = () => {
      const split = document.querySelectorAll<HTMLElement>(".preloader__panel");
      const inner = root.querySelector(".preloader__inner");
      gsap
        .timeline({ onComplete: finish })
        .to(inner, { autoAlpha: 0, y: -14, duration: 0.35, ease: "power2.in" })
        .to(
          split,
          {
            yPercent: (index) => (index === 0 ? -101 : 101),
            duration: 1.05,
            ease: "expo.inOut",
            stagger: 0,
          },
          "-=0.05",
        );
    };

    return () => { tl.kill(); };
  }, [onDone]);

  return (
    <div className="preloader" ref={rootRef} role="status" aria-live="polite" aria-label="Loading">
      <div className="preloader__panel preloader__panel--top" />
      <div className="preloader__panel preloader__panel--bottom" />
      <div className="preloader__inner">
        <div className="preloader__top mono">
          <span>Nocturne</span>
          <span>Front-end craft · MMXXV</span>
        </div>
        <div className="preloader__center">
          <svg className="preloader__mark" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M50 6v88M6 50h88M19 19l62 62M81 19L19 81" stroke="currentColor" strokeWidth="1" />
          </svg>
          <span className="preloader__count num" ref={countRef}>000</span>
        </div>
        <div className="preloader__bottom">
          <span className="mono">Loading the nocturne</span>
          <span className="preloader__bar"><span ref={barRef} /></span>
          <span className="mono">MMXXV</span>
        </div>
      </div>
    </div>
  );
}