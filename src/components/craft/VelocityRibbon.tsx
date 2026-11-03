import { useEffect, useRef } from "react";
import type Lenis from "lenis";
import { getLenis } from "../../lib/motion";
import { prefersReducedMotion } from "../../lib/pointer";
import { readStageColors, useCanvasLoop, type CanvasFrame } from "./useCanvasLoop";

interface ScrollSource {
  velocity: number;
  progress: number;
}

/**
 * Instrument 08 — the scroll itself, instrumented. Reads Lenis velocity and
 * progress, feeds a damped seismograph ribbon, and reports units the page is
 * actually moving in. Works without Lenis too (native scroll fallback).
 */
export default function VelocityRibbon() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const dirRef = useRef<HTMLSpanElement>(null);
  const colorsRef = useRef<ReturnType<typeof readStageColors> | null>(null);
  const source = useRef<ScrollSource>({ velocity: 0, progress: 0 });
  const state = useRef({ velocity: 0, offset: 0, lastY: 0, started: false, domClock: 0 });

  /* Lenis is created by App after child effects — poll briefly for it. */
  useEffect(() => {
    let off: (() => void) | null = null;
    let timer = 0;
    let attempts = 0;
    const attach = () => {
      const lenis = getLenis();
      if (!lenis) {
        if (attempts < 50) {
          attempts += 1;
          timer = window.setTimeout(attach, 100);
        }
        return;
      }
      source.current.progress = lenis.progress;
      const onScroll = (instance: Lenis) => {
        source.current.velocity = instance.velocity;
        source.current.progress = instance.progress;
      };
      off = lenis.on("scroll", onScroll);
    };
    attach();
    return () => {
      window.clearTimeout(timer);
      off?.();
    };
  }, []);

  useCanvasLoop(
    canvasRef,
    (frame: CanvasFrame) => {
      const { ctx, width, height, time, dt } = frame;
      const colors = colorsRef.current ?? (colorsRef.current = readStageColors(ctx.canvas));
      const clock = state.current;
      const seconds = dt / 1000;
      const lenis = getLenis();

      let targetVelocity = source.current.velocity;
      let progress = 0;
      if (lenis) {
        progress = source.current.progress;
        if (!clock.started) {
          clock.started = true;
          clock.lastY = window.scrollY;
        }
      } else {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress = window.scrollY / max;
        targetVelocity = window.scrollY - clock.lastY;
        clock.lastY = window.scrollY;
      }
      if (!clock.started) clock.lastY = window.scrollY;

      const ease = 1 - Math.exp(-9 * seconds);
      clock.velocity += (targetVelocity - clock.velocity) * ease;
      if (Math.abs(clock.velocity) < 0.01) clock.velocity = 0;
      clock.offset = (clock.offset + clock.velocity * seconds * 5.5) % 480;

      const intensity = Math.min(1, Math.abs(clock.velocity) / 40);
      const center = width / 2;
      const still = prefersReducedMotion();

      ctx.clearRect(0, 0, width, height);

      const count = Math.max(24, Math.floor(width / 9));
      const spacing = width / count;
      const mid = height * 0.5;
      for (let i = 0; i < count; i += 1) {
        let x = i * spacing - (clock.offset * spacing * 0.02) % spacing;
        x = ((x % width) + width) % width;
        const distance = Math.abs(x - center) / (width / 2);
        const envelope = Math.exp(-distance * distance * 3.4);
        const wave = 0.5 + 0.5 * Math.sin(i * 0.52 + clock.offset * 0.09 + (still ? 0 : time * 0.9));
        const barHeight = 5 + wave * 24 * envelope + intensity * 26 * envelope;
        const alpha = 0.1 + envelope * 0.3 + intensity * 0.16;
        ctx.strokeStyle = colors.fgAlpha(Math.min(0.9, alpha));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, mid - barHeight);
        ctx.lineTo(Math.round(x) + 0.5, mid + barHeight);
        ctx.stroke();
      }

      // Centre tick: the one acid mark in the instrument.
      ctx.strokeStyle = colors.acid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(center) + 0.5, mid - 36);
      ctx.lineTo(Math.round(center) + 0.5, mid + 36);
      ctx.stroke();

      // Progress rail along the base.
      const railY = height - 7;
      ctx.strokeStyle = colors.fgAlpha(0.1);
      ctx.beginPath();
      ctx.moveTo(0, railY + 0.5);
      ctx.lineTo(width, railY + 0.5);
      ctx.stroke();
      ctx.strokeStyle = colors.acid;
      ctx.beginPath();
      ctx.moveTo(0, railY + 0.5);
      ctx.lineTo(Math.max(2, progress * width), railY + 0.5);
      ctx.stroke();
      ctx.fillStyle = colors.acid;
      ctx.beginPath();
      ctx.arc(Math.max(2, progress * width), railY + 0.5, 2.2, 0, Math.PI * 2);
      ctx.fill();

      if (time - clock.domClock > 0.12) {
        clock.domClock = time;
        if (valueRef.current) valueRef.current.textContent = Math.abs(clock.velocity).toFixed(2);
        if (progressRef.current) progressRef.current.textContent = `${Math.round(progress * 100)}%`;
        if (dirRef.current) {
          dirRef.current.textContent = clock.velocity > 0.4 ? "↓" : clock.velocity < -0.4 ? "↑" : "·";
        }
      }
    },
    { liveUnderReducedMotion: true },
  );

  return (
    <div className="craft__velocity">
      <div className="velocity__head">
        <div className="velocity__value">
          <span className="velocity__num serif num" ref={valueRef}>0.00</span>
          <span className="velocity__unit mono">lenis velocity</span>
        </div>
        <div className="velocity__meta mono">
          <span>Direction <b ref={dirRef} aria-hidden="true">·</b></span>
          <span>Progress <b ref={progressRef}>0%</b></span>
          <span>Lerp <b>0.085</b></span>
        </div>
      </div>
      <canvas className="velocity__canvas" ref={canvasRef} aria-label="Scroll velocity seismograph" role="img" />
      <div className="velocity__foot mono">
        <span>Lenis · gsap ticker · one rAF</span>
        <span>Scroll to feed the ribbon</span>
      </div>
    </div>
  );
}