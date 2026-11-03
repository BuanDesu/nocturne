/**
 * Smooth scroll (Lenis) wired into GSAP's ticker and ScrollTrigger.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { prefersReducedMotion } from "./pointer";

gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };

export const EASE = {
  expo: "expo.out",
  power3: "power3.out",
  power2: "power2.inOut",
  inOut: "power3.inOut",
} as const;

export const reducedMotion = prefersReducedMotion;

let lenis: Lenis | null = null;
let ticker: ((time: number) => void) | null = null;

export function initSmoothScroll(): () => void {
  if (lenis || prefersReducedMotion()) return () => {};

  lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
    smoothWheel: true,
    syncTouch: false,
  });

  lenis.on("scroll", ScrollTrigger.update);
  ticker = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(ticker);
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.config({ ignoreMobileResize: true });

  return () => {
    if (ticker) gsap.ticker.remove(ticker);
    lenis?.destroy();
    lenis = null;
    ticker = null;
  };
}

export const getLenis = () => lenis;

export function scrollToTarget(target: string | HTMLElement, offset = -8) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  // Keep the header visible while (and shortly after) a programmatic jump.
  window.dispatchEvent(new CustomEvent("nocturne:navpin", { detail: { until: performance.now() + 1800 } }));
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.25 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function refreshScroll() {
  ScrollTrigger.refresh();
}
