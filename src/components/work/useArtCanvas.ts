import { useEffect, type RefObject } from "react";
import { pointer, prefersReducedMotion } from "../../lib/pointer";
import { drawStudy } from "./art";
import type { ArtId } from "./projects";

/**
 * Mounts one generative study onto a canvas. Handles DPR clamping, resize,
 * offscreen pausing and reduced motion (a single static frame).
 */
export function useArtCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  id: ArtId,
  enabled = true,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 0;
    let raf = 0;
    let visible = true;
    const reduced = prefersReducedMotion();

    const draw = (time: number) => {
      if (!width || !height) return;
      drawStudy(ctx, id, width, height, time, pointer.sx, pointer.sy);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w === width && h === height && nextDpr === dpr) return;
      width = w;
      height = h;
      dpr = nextDpr;
      canvas.width = Math.round(w * nextDpr);
      canvas.height = Math.round(h * nextDpr);
      ctx.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);
      draw(0);
    };

    const loop = (now: number) => {
      raf = window.requestAnimationFrame(loop);
      if (document.hidden || !visible) return;
      draw((now - start) / 1000);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
        },
        { rootMargin: "100px" },
      );
      io.observe(canvas);
    }

    const start = performance.now();
    resize();
    draw(0);

    if (enabled && !reduced) {
      raf = window.requestAnimationFrame(loop);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
    };
  }, [canvasRef, id, enabled]);
}
