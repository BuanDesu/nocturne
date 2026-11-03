import { useEffect, useRef } from "react";
import { pointer, prefersReducedMotion } from "../../lib/pointer";
import { clamp } from "../../lib/utils";
import { fbm } from "./noise";
import { CanvasSurface } from "./surface";
import type { SurfaceProps } from "./ExperimentRow";

const BONE = "239, 233, 220";
const ACID = "218, 255, 62";
const LILAC = "162, 145, 255";
const VOID = "6, 6, 10";

const FIELD_COLS = 44;
const FIELD_ROWS = 26;

/**
 * EXP.02 — Curl field.
 * A few thousand particles advected by a curl-noise LUT, painted as
 * additive trails. The field is rebuilt a dozen times a second, never per
 * particle, so the whole simulation stays cheap.
 */
export default function ParticleField({ onFps, registerReset }: SurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = prefersReducedMotion();

    let width = 0;
    let height = 0;
    let count = 0;
    let ready = false;

    let x = new Float32Array(0);
    let y = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let speed = new Float32Array(0);
    let seed = new Float32Array(0);
    let hot = new Uint8Array(0);
    let wrapped = new Uint8Array(0);

    const fieldVx = new Float32Array(FIELD_COLS * FIELD_ROWS);
    const fieldVy = new Float32Array(FIELD_COLS * FIELD_ROWS);
    let fieldAge = 10;

    const buildField = (time: number) => {
      const ox = time * 0.055;
      const oy = -time * 0.041;
      const sx = 2.35;
      const sy = 1.65;
      const eps = 0.0025;
      for (let j = 0; j < FIELD_ROWS; j += 1) {
        const gy = j / (FIELD_ROWS - 1);
        for (let i = 0; i < FIELD_COLS; i += 1) {
          const gx = i / (FIELD_COLS - 1);
          const px = gx * sx + ox;
          const py = gy * sy + oy;
          const p = fbm(px, py);
          const px2 = px + eps;
          const p2 = fbm(px2, py);
          const py2 = py + eps;
          const p3 = fbm(px, py2);
          const idx = j * FIELD_COLS + i;
          /* curl of the scalar potential: divergence free, so trails never clump. */
          fieldVx[idx] = ((p3 - p) / eps) * 12;
          fieldVy[idx] = (-(p2 - p) / eps) * 12;
        }
      }
    };

    const seedParticles = (burst = false) => {
      for (let i = 0; i < count; i += 1) {
        x[i] = Math.random() * width;
        y[i] = Math.random() * height;
        vx[i] = 0;
        vy[i] = 0;
        seed[i] = Math.random() * 6.28318;
        if (burst) {
          const dx = x[i] - width * 0.5;
          const dy = y[i] - height * 0.5;
          const d = Math.hypot(dx, dy) || 1;
          const force = 60 + Math.random() * 190;
          vx[i] = (dx / d) * force;
          vy[i] = (dy / d) * force;
        }
      }
      hot.fill(0);
      wrapped.fill(0);
    };

    const allocate = (w: number, h: number) => {
      width = w;
      height = h;
      const target = Math.round(clamp((w * h) / 95, 720, 3800));
      if (target === count) return;
      count = target;
      x = new Float32Array(count);
      y = new Float32Array(count);
      vx = new Float32Array(count);
      vy = new Float32Array(count);
      speed = new Float32Array(count);
      seed = new Float32Array(count);
      hot = new Uint8Array(count);
      wrapped = new Uint8Array(count);
      seedParticles(false);
    };

    let surface: CanvasSurface | null = null;

    const step = (dt: number, time: number) => {
      const ctx = surface?.ctx;
      if (!ctx) return;
      const dampScale = 1 - Math.exp(-1.9 * dt);
      const now = time;

      if (now - fieldAge > 0.085) {
        buildField(now);
        fieldAge = now;
      }
      fieldAge = Math.max(fieldAge, now - 100);

      /* Pointer as a local force in canvas space. */
      const rect = canvas.getBoundingClientRect();
      const px = pointer.x - rect.left;
      const py = pointer.y - rect.top;
      const pActive = pointer.active;
      const pDown = pointer.down;
      const R = Math.min(width, height) * 0.42;
      const R2 = R * R;

      const speedMax = Math.max(70, Math.min(width, height) * 0.5);

      for (let i = 0; i < count; i += 1) {
        const gx = clamp(x[i] / width, 0, 0.9999) * (FIELD_COLS - 1);
        const gy = clamp(y[i] / height, 0, 0.9999) * (FIELD_ROWS - 1);
        const i0 = gx | 0;
        const j0 = gy | 0;
        const i1 = Math.min(i0 + 1, FIELD_COLS - 1);
        const j1 = Math.min(j0 + 1, FIELD_ROWS - 1);
        const fx = gx - i0;
        const fy = gy - j0;
        const a = fieldVx[j0 * FIELD_COLS + i0];
        const b = fieldVx[j0 * FIELD_COLS + i1];
        const c = fieldVx[j1 * FIELD_COLS + i0];
        const d = fieldVx[j1 * FIELD_COLS + i1];
        const targetVx = (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * 70.0;
        const a2 = fieldVy[j0 * FIELD_COLS + i0];
        const b2 = fieldVy[j0 * FIELD_COLS + i1];
        const c2 = fieldVy[j1 * FIELD_COLS + i0];
        const d2 = fieldVy[j1 * FIELD_COLS + i1];
        const targetVy = (a2 + (b2 - a2) * fx + (c2 - a2) * fy + (a2 - b2 - c2 + d2) * fx * fy) * 70.0;

        vx[i] += (targetVx - vx[i]) * dampScale;
        vy[i] += (targetVy - vy[i]) * dampScale;

        if (pActive) {
          const dx = x[i] - px;
          const dy = y[i] - py;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < R2) {
            const dist = Math.sqrt(dist2) + 0.001;
            const falloff = 1 - dist / R;
            const swirl = falloff * falloff * (pDown ? -280 : 150);
            const pull = falloff * (pDown ? 190 : 70);
            vx[i] += ((-dy / dist) * swirl + (dx / dist) * pull) * dt;
            vy[i] += ((dx / dist) * swirl + (dy / dist) * pull) * dt;
          }
        }

        const sp2 = vx[i] * vx[i] + vy[i] * vy[i];
        if (sp2 > 62500) {
          const scale = 250 / Math.sqrt(sp2);
          vx[i] *= scale;
          vy[i] *= scale;
        }
        speed[i] = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);

        x[i] += vx[i] * dt;
        y[i] += vy[i] * dt;
        wrapped[i] = 0;
        if (x[i] < -12 || x[i] > width + 12 || y[i] < -12 || y[i] > height + 12) {
          wrapped[i] = 1;
          x[i] = Math.random() * width;
          y[i] = Math.random() * height;
          vx[i] *= 0.2;
          vy[i] *= 0.2;
        }

        if (speed[i] > 130) hot[i] = 2;
        else if (speed[i] > 55) hot[i] = 1;
        else hot[i] = 0;
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      /* Both the trail decay and the emission are time-based, so the field
         looks identical at 60Hz, 120Hz or an uncapped headless display. */
      const fade = 1 - Math.exp(-6.5 * dt);
      const expose = Math.min(2, dt * 60);
      const lilacA = (0.0132 * expose).toFixed(3);
      const bloomA = (0.0046 * expose).toFixed(3);
      const boneA = (0.0455 * expose).toFixed(3);
      const acidA = (0.0538 * expose).toFixed(3);
      const sparkA = (0.0276 * expose).toFixed(3);

      ctx.fillStyle = `rgba(${VOID}, ${fade.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      /* A faint wide bloom under everything: turns hard trails into ink. */
      ctx.lineWidth = 5.0;
      ctx.strokeStyle = `rgba(${BONE}, ${bloomA})`;
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        if (wrapped[i]) continue;
        ctx.moveTo(x[i] - vx[i] * dt, y[i] - vy[i] * dt);
        ctx.lineTo(x[i], y[i]);
      }
      ctx.stroke();

      /* Violet undertone under everything — the cool floor of the drawing. */
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = `rgba(${LILAC}, ${lilacA})`;
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        if (wrapped[i]) continue;
        ctx.moveTo(x[i] - vx[i] * dt, y[i] - vy[i] * dt);
        ctx.lineTo(x[i], y[i]);
      }
      ctx.stroke();

      /* Bone filaments. */
      ctx.lineWidth = 1.05;
      ctx.strokeStyle = `rgba(${BONE}, ${boneA})`;
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        if (hot[i] > 0 || wrapped[i]) continue;
        ctx.moveTo(x[i] - vx[i] * dt, y[i] - vy[i] * dt);
        ctx.lineTo(x[i], y[i]);
      }
      ctx.stroke();

      /* Hot acid streaks. */
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = `rgba(${ACID}, ${acidA})`;
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        if (hot[i] !== 2 || wrapped[i]) continue;
        ctx.moveTo(x[i] - vx[i] * dt, y[i] - vy[i] * dt);
        ctx.lineTo(x[i], y[i]);
      }
      ctx.stroke();

      /* A few sparks on the fastest particles. */
      ctx.fillStyle = `rgba(${ACID}, ${sparkA})`;
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        if (hot[i] !== 2 || speed[i] < 150) continue;
        ctx.rect(x[i] - 0.7, y[i] - 0.7, 1.4, 1.4);
      }
      ctx.fill();
    };

    const reset = () => {
      if (!ready || !surface) return;
      seedParticles(true);
      surface.ctx.globalCompositeOperation = "source-over";
      surface.ctx.fillStyle = `rgba(${VOID}, 1)`;
      surface.ctx.fillRect(0, 0, width, height);
    };

    /** One fully-settled frame, used when prefers-reduced-motion is on. */
    const paintStatic = () => {
      if (!ready) return;
      const ctx = surface?.ctx;
      if (!ctx) return;
      buildField(0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(${VOID}, 1)`;
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 170; i += 1) step(1 / 60, i / 60);
    };

    const hooks = {
      resize: (w: number, h: number) => {
        allocate(w, h);
        if (reduced && ready) paintStatic();
      },
      frame: (dt: number, time: number) => step(dt, time),
      staticFrame: paintStatic,
    };

    /** Simulate and paint ~1.4s of history up front, so the first visible
     *  frame already has filaments instead of an empty field. */
    const prewarm = () => {
      buildField(0);
      for (let i = 0; i < 160; i += 1) step(1 / 60, i / 60);
    };

    surface = new CanvasSurface(canvas, hooks, { maxDpr: 2, onFps });
    if (surface.width > 1 && surface.height > 1) {
      ready = true;
      if (reduced) paintStatic();
      else {
        prewarm();
        surface.start();
      }
    }
    registerReset(reset);

    return () => {
      surface?.destroy();
      surface = null;
    };
  }, [onFps, registerReset]);

  return <canvas className="lab__canvas" ref={canvasRef} aria-hidden="true" />;
}
