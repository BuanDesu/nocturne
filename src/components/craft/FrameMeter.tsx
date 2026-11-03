import { useRef } from "react";
import { readStageColors, useCanvasLoop, type CanvasFrame } from "./useCanvasLoop";

const SLOTS = 64;
const BUDGET = 16.7;

/**
 * Instrument 07 — a live frame meter. Real requestAnimationFrame deltas fill a
 * 64-slot strip that flows left to right; the 16.7ms budget is drawn in, and the
 * scale adapts so a fast machine still reads as a composed instrument.
 */
export default function FrameMeter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const avgRef = useRef<HTMLElement>(null);
  const maxRef = useRef<HTMLElement>(null);
  const samplesRef = useRef<number[]>([]);
  const colorsRef = useRef<ReturnType<typeof readStageColors> | null>(null);
  const ceilingRef = useRef(20);
  const domClock = useRef(0);

  useCanvasLoop(
    canvasRef,
    (frame: CanvasFrame) => {
      const { ctx, width, height, time, dt } = frame;
      const colors = colorsRef.current ?? (colorsRef.current = readStageColors(ctx.canvas));
      const samples = samplesRef.current;

      if (dt > 0.5 && dt < 100) {
        samples.push(dt);
        if (samples.length > SLOTS) samples.shift();
      }

      const measured = samples.length ? samples : [BUDGET];
      const peak = Math.max(...measured);
      const targetCeiling = Math.max(20, peak * 1.18);
      const ease = 1 - Math.exp(-3 * Math.min(0.064, dt / 1000 || 0.016));
      ceilingRef.current += (targetCeiling - ceilingRef.current) * ease;
      const ceiling = ceilingRef.current;

      ctx.clearRect(0, 0, width, height);

      const gap = Math.max(1.5, width / SLOTS / 3.4);
      const slotWidth = Math.max(1, (width - gap * (SLOTS - 1)) / SLOTS);
      const floor = height - 1;

      // Empty slots read as a hairline rail — the instrument is simply warming up.
      ctx.fillStyle = colors.fgAlpha(0.055);
      for (let i = 0; i < SLOTS; i += 1) {
        ctx.fillRect(i * (slotWidth + gap), floor - 2, slotWidth, 2);
      }

      const offset = SLOTS - samples.length;
      for (let i = 0; i < samples.length; i += 1) {
        const sample = samples[i];
        // Perceptual scale: frame time is read at a glance, not measured off the chart.
        const normal = Math.sqrt(Math.min(1, sample / ceiling));
        const barHeight = Math.max(2, normal * (height - 6));
        const x = (offset + i) * (slotWidth + gap);
        const isLatest = i === samples.length - 1;
        ctx.fillStyle = isLatest ? colors.acid : colors.fgAlpha(0.14 + (i / SLOTS) * 0.3);
        ctx.fillRect(x, floor - barHeight, slotWidth, barHeight);
      }

      // Budget hairline.
      if (BUDGET <= ceiling) {
        const budgetY = floor - (BUDGET / ceiling) * (height - 6);
        ctx.strokeStyle = colors.fgAlpha(0.16);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, Math.round(budgetY) + 0.5);
        ctx.lineTo(width, Math.round(budgetY) + 0.5);
        ctx.stroke();
      }

      if (time - domClock.current > 0.18) {
        domClock.current = time;
        const average = measured.reduce((sum, value) => sum + value, 0) / measured.length;
        const maximum = Math.max(...measured);
        if (fpsRef.current) fpsRef.current.textContent = String(Math.round(1000 / Math.max(1, average)));
        if (avgRef.current) avgRef.current.textContent = `${average.toFixed(1)} ms`;
        if (maxRef.current) maxRef.current.textContent = `${maximum.toFixed(1)} ms`;
      }
    },
    { liveUnderReducedMotion: true },
  );

  return (
    <div className="craft__frame">
      <div className="frame__head">
        <span className="frame__fps serif num" ref={fpsRef}>60</span>
        <span className="frame__unit mono">fps</span>
        <dl className="frame__stats mono">
          <div className="frame__stat">
            <dt>Frame</dt>
            <dd ref={avgRef}>16.7 ms</dd>
          </div>
          <div className="frame__stat">
            <dt>Peak</dt>
            <dd ref={maxRef}>16.7 ms</dd>
          </div>
          <div className="frame__stat">
            <dt>Budget</dt>
            <dd>16.7 ms</dd>
          </div>
        </dl>
      </div>
      <canvas className="frame__canvas" ref={canvasRef} aria-label="Frame time history, last 64 frames" role="img" />
      <div className="frame__foot mono">
        <span>requestAnimationFrame · last 64</span>
        <span>16.7 budget</span>
      </div>
    </div>
  );
}