/**
 * CanvasSurface — the frame budget for every 2D experiment.
 *
 * Owns DPR clamping, resize handling, visibility/document pausing and FPS
 * sampling so the three lab surfaces share one predictable cost model.
 */
export interface SurfaceHooks {
  resize(width: number, height: number): void;
  frame(dt: number, time: number): void;
  staticFrame?(): void;
}

export interface SurfaceOptions {
  maxDpr?: number;
  onFps?: (fps: number) => void;
}

export class CanvasSurface {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  dpr = 1;

  private hooks: SurfaceHooks;
  private maxDpr: number;
  private onFps?: (fps: number) => void;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private raf = 0;
  private running = false;
  private visible = false;
  private last = 0;
  private origin = 0;
  private frames = 0;
  private fpsClock = 0;

  constructor(canvas: HTMLCanvasElement, hooks: SurfaceHooks, options: SurfaceOptions = {}) {
    this.canvas = canvas;
    this.hooks = hooks;
    this.maxDpr = options.maxDpr ?? 2;
    this.onFps = options.onFps;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.ctx = ctx;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);

    this.io = new IntersectionObserver(
      (entries) => {
        this.visible = entries.some((entry) => entry.isIntersecting);
        if (this.visible && this.running) this.play();
        else this.pause();
      },
      { rootMargin: "220px 0px" },
    );
    this.io.observe(canvas);

    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("resize", this.onResize);

    this.resize(true);
  }

  /** Latest size in CSS pixels. */
  get cssWidth() {
    return this.width;
  }

  start() {
    this.running = true;
    this.origin = performance.now();
    this.last = this.origin;
    this.frames = 0;
    this.fpsClock = 0;
    if (this.visible && !document.hidden) this.play();
  }

  stop() {
    this.running = false;
    this.pause();
  }

  /** Paint one static frame (used when prefers-reduced-motion is on). */
  renderStatic() {
    this.resize(true);
    if (this.width < 2 || this.height < 2) return;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.hooks.staticFrame?.();
  }

  destroy() {
    this.stop();
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("resize", this.onResize);
  }

  private play() {
    if (this.raf || !this.running || document.hidden) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private pause() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private onVisibility = () => {
    if (document.hidden) this.pause();
    else if (this.visible && this.running) this.play();
  };

  private onResize = () => {
    this.resize();
  };

  private resize = (force = false) => {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width < 2 || height < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    if (!force && width === this.width && height === this.height && dpr === this.dpr) return;

    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.hooks.resize(width, height);
  };

  private tick = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    this.hooks.frame(dt, (now - this.origin) / 1000);

    this.frames += 1;
    this.fpsClock += dt;
    if (this.fpsClock >= 0.55) {
      this.onFps?.(Math.round(this.frames / this.fpsClock));
      this.frames = 0;
      this.fpsClock = 0;
    }

    if (this.running && this.visible && !document.hidden) {
      this.raf = requestAnimationFrame(this.tick);
    }
  };
}
