import { useCallback, useEffect, useRef, type RefObject } from "react";

export interface CanvasFrame {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** Seconds since the page started. */
  time: number;
  /** Milliseconds since the previous frame. */
  dt: number;
  dpr: number;
}

interface CanvasLoopOptions {
  /** Keep animating for people who prefer reduced motion (live data readouts). */
  liveUnderReducedMotion?: boolean;
  onResize?: (width: number, height: number) => void;
}

/**
 * DPR-capped, resize-aware canvas loop. Runs only while the canvas is on screen
 * and the tab is visible; draws a single static frame when motion is reduced
 * (unless the demo is a live data readout). Returns a redraw() escape hatch for
 * state changes that need to repaint a paused canvas.
 */
export function useCanvasLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  draw: (frame: CanvasFrame) => void,
  options: CanvasLoopOptions = {},
) {
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = !reduced || Boolean(optionsRef.current.liveUnderReducedMotion);

    let raf = 0;
    let running = false;
    let visible = true;
    let last = performance.now();
    const frame: CanvasFrame = { ctx, width: 1, height: 1, time: 0, dt: 0, dpr: 1 };

    const paint = () => drawRef.current(frame);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      frame.width = Math.max(1, Math.round(rect.width));
      frame.height = Math.max(1, Math.round(rect.height));
      frame.dpr = dpr;
      const pixelWidth = Math.round(frame.width * dpr);
      const pixelHeight = Math.round(frame.height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      optionsRef.current.onResize?.(frame.width, frame.height);
      paint();
    };

    const tick = (now: number) => {
      if (!running) return;
      frame.dt = Math.min(64, Math.max(0, now - last));
      last = now;
      frame.time = now / 1000;
      paint();
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!animate || running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    redrawRef.current = () => {
      resize();
      if (!running) paint();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    start();

    const intersection = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    intersection.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.fonts?.ready.then(resize).catch(() => {});

    return () => {
      stop();
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [canvasRef]);

  return useCallback(() => redrawRef.current(), []);
}

export interface StageColors {
  fg: [number, number, number];
  acid: string;
  fgAlpha: (alpha: number) => string;
}

const parseRgb = (value: string): [number, number, number] | null => {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
  return [parts[0], parts[1], parts[2]];
};

/** Read the resolved section ink once per mount so canvas drawing matches CSS. */
export function readStageColors(el: HTMLElement): StageColors {
  const styles = getComputedStyle(el);
  const fg = parseRgb(styles.color) ?? [239, 233, 220];
  const acid = styles.getPropertyValue("--acid").trim() || "#daff3e";
  return {
    fg,
    acid,
    fgAlpha: (alpha: number) => `rgba(${fg[0]}, ${fg[1]}, ${fg[2]}, ${alpha})`,
  };
}
