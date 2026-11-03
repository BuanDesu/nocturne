import { useEffect, useRef } from "react";
import { pointer, prefersReducedMotion } from "../../lib/pointer";
import { clamp } from "../../lib/utils";
import { CanvasSurface } from "./surface";
import type { SurfaceProps } from "./ExperimentRow";

const WORDS = ["TYPE", "LIGHT", "MOTION", "NOCTURNE"];
const HOLD = 4.2;
const TAU = Math.PI * 2;
const BONE = "239, 233, 220";
const ACID = "218, 255, 62";
const VOID = "6, 6, 10";

/**
 * EXP.03 — Glyph drift.
 * Each word is rasterised and sampled into points; particles spring between
 * the point sets, so the type is always mid-transit rather than swapping.
 */
export default function GlyphMorph({ onFps, registerReset }: SurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = prefersReducedMotion();

    let width = 0;
    let height = 0;
    let ready = false;
    let count = 0;
    let points: Float32Array[] = [];
    let word = 0;
    let clock = 0;
    let surface: CanvasSurface | null = null;

    let x = new Float32Array(0);
    let y = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let seed = new Float32Array(0);
    let hot = new Uint8Array(0);

    const sampler = document.createElement("canvas");
    const sctx = sampler.getContext("2d", { willReadFrequently: true });

    /** Rasterise a word and resample its footprint into exactly `target` points. */
    const sampleWord = (text: string, target: number, fontPx: number): Float32Array => {
      const out = new Float32Array(target * 2);
      if (!sctx) return out;
      sampler.width = Math.max(2, Math.round(width));
      sampler.height = Math.max(2, Math.round(height));
      sctx.clearRect(0, 0, width, height);
      sctx.font = `400 ${fontPx}px "Instrument Serif", Georgia, serif`;
      sctx.textAlign = "center";
      sctx.textBaseline = "middle";
      sctx.fillStyle = "#ffffff";
      sctx.fillText(text, width / 2, height / 2 + fontPx * 0.04);

      const data = sctx.getImageData(0, 0, Math.round(width), Math.round(height)).data;
      const raw: number[] = [];
      const step = 2;
      for (let yy = 0; yy < height; yy += step) {
        for (let xx = 0; xx < width; xx += step) {
          if (data[(yy * Math.round(width) + xx) * 4 + 3] > 120) {
            raw.push(xx, yy);
          }
        }
      }
      const found = raw.length / 2;
      if (found === 0) return out;
      for (let i = 0; i < target; i += 1) {
        const idx = Math.floor((i * found) / target) * 2;
        out[i * 2] = raw[idx];
        out[i * 2 + 1] = raw[idx + 1];
      }
      return out;
    };

    const buildPoints = () => {
      const target = Math.round(clamp(1500 + (width * height) / 240, 1500, 2800));
      if (!sctx) return;
      sampler.width = Math.max(2, Math.round(width));
      sampler.height = Math.max(2, Math.round(height));
      sctx.font = `400 100px "Instrument Serif", Georgia, serif`;
      count = target;
      /* Measure every word at the same size first, then set each as large as
         the frame allows — the morph is also a change of scale. */
      const measured = WORDS.map((text) => sctx.measureText(text).width || 1);
      points = WORDS.map((text, index) => {
        const fontPx = Math.min(height * 0.68, (width * 0.88 * 100) / measured[index]);
        return sampleWord(text, target, fontPx);
      });
    };

    const allocate = () => {
      x = new Float32Array(count);
      y = new Float32Array(count);
      vx = new Float32Array(count);
      vy = new Float32Array(count);
      seed = new Float32Array(count);
      hot = new Uint8Array(count);
      for (let i = 0; i < count; i += 1) {
        x[i] = Math.random() * width;
        y[i] = Math.random() * height;
        seed[i] = Math.random();
      }
    };

    const paintStatic = () => {
      const ctx = surface?.ctx;
      const target = points[0];
      if (!ctx || !target) return;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(${VOID}, 1)`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${BONE}, 0.52)`;
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        ctx.rect(target[i * 2] - 0.95, target[i * 2 + 1] - 0.95, 1.9, 1.9);
      }
      ctx.fill();
    };

    const advance = () => {
      word = (word + 1) % WORDS.length;
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * TAU;
        const power = 12 + Math.random() * 48;
        vx[i] += Math.cos(angle) * power;
        vy[i] += Math.sin(angle) * power;
      }
    };

    const step = (dt: number) => {
      const ctx = surface?.ctx;
      const target = points[word];
      if (!ctx || !target) return;
      const pdt = Math.min(dt, 1 / 30);

      if (!reduced) {
        clock += pdt;
        if (clock > HOLD) {
          clock = 0;
          advance();
        }
      }

      const rect = canvas.getBoundingClientRect();
      const mx = pointer.x - rect.left;
      const my = pointer.y - rect.top;
      const pActive = pointer.active;
      const pDown = pointer.down;
      const R = Math.min(width, height) * 0.22 + 40;
      const R2 = R * R;

      for (let i = 0; i < count; i += 1) {
        const wobble = Math.sin(clock * 0.9 + seed[i] * TAU) * 1.6;
        let ax = (target[i * 2] + wobble - x[i]) * 20 - vx[i] * 5.0;
        let ay = (target[i * 2 + 1] + wobble * 0.7 - y[i]) * 20 - vy[i] * 5.0;

        if (pActive) {
          const dx = x[i] - mx;
          const dy = y[i] - my;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < R2) {
            const dist = Math.sqrt(dist2) + 0.001;
            const falloff = 1 - dist / R;
            const force = (pDown ? 2600 : 760) * falloff * falloff;
            ax += (dx / dist) * force;
            ay += (dy / dist) * force;
          }
        }

        vx[i] += ax * pdt;
        vy[i] += ay * pdt;
        x[i] += vx[i] * pdt;
        y[i] += vy[i] * pdt;

        const sp2 = vx[i] * vx[i] + vy[i] * vy[i];
        if (sp2 > 160000) {
          const scale = 400 / Math.sqrt(sp2);
          vx[i] *= scale;
          vy[i] *= scale;
        }
        hot[i] = sp2 > 14000 || (pActive && Math.abs(x[i] - mx) < R && Math.abs(y[i] - my) < R) ? 1 : 0;
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(${VOID}, 0.25)`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      ctx.fillStyle = `rgba(${BONE}, 0.105)`;
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        ctx.rect(x[i] - 0.95, y[i] - 0.95, 1.9, 1.9);
      }
      ctx.fill();

      /* Only the genuinely fast points flare acid — the rest stay bone. */
      ctx.fillStyle = `rgba(${ACID}, 0.11)`;
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        if (!hot[i] || vx[i] * vx[i] + vy[i] * vy[i] < 110000) continue;
        ctx.rect(x[i] - 0.95, y[i] - 0.95, 1.9, 1.9);
      }
      ctx.fill();
    };

    const reset = () => {
      if (!ready) return;
      word = 0;
      clock = 0;
      for (let i = 0; i < count; i += 1) {
        x[i] = Math.random() * width;
        y[i] = Math.random() * height;
        const angle = Math.random() * TAU;
        const power = 80 + Math.random() * 240;
        vx[i] = Math.cos(angle) * power;
        vy[i] = Math.sin(angle) * power;
      }
      const ctx = surface?.ctx;
      if (ctx) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(${VOID}, 1)`;
        ctx.fillRect(0, 0, width, height);
      }
      if (reduced) paintStatic();
    };

    const hooks = {
      resize: (w: number, h: number) => {
        width = w;
        height = h;
        if (!ready) return;
        buildPoints();
        if (x.length !== count) allocate();
        if (reduced) paintStatic();
      },
      frame: (dt: number) => step(dt),
      staticFrame: paintStatic,
    };

    const boot = async () => {
      try {
        await document.fonts.ready;
        await document.fonts.load('400 100px "Instrument Serif"');
      } catch {
        /* fall back to whatever serif the canvas can measure */
      }
      if (!surface) return;
      if (width < 2 || height < 2) return;
      buildPoints();
      allocate();
      ready = true;
      if (reduced) paintStatic();
      else surface.start();
    };

    surface = new CanvasSurface(canvas, hooks, { maxDpr: 2, onFps });
    registerReset(reset);
    void boot();

    return () => {
      surface?.destroy();
      surface = null;
    };
  }, [onFps, registerReset]);

  return <canvas className="lab__canvas" ref={canvasRef} aria-hidden="true" />;
}
