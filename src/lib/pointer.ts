/**
 * Single source of truth for pointer state.
 * One rAF loop, one listener — every canvas subscribes instead of adding its own.
 */

export interface PointerState {
  /** Raw viewport coordinates. */
  x: number;
  y: number;
  /** Normalized -1..1 (origin at viewport center). */
  nx: number;
  ny: number;
  /** Smoothed normalized position, eased toward the raw value. */
  sx: number;
  sy: number;
  /** Normalized velocity of the smoothed position. */
  vx: number;
  vy: number;
  /** 0..1, ramps up while the user moves. */
  speed: number;
  down: boolean;
  /** True once the pointer has moved at least once. */
  active: boolean;
}

export const pointer: PointerState = {
  x: 0, y: 0, nx: 0, ny: 0, sx: 0, sy: 0, vx: 0, vy: 0, speed: 0, down: false, active: false,
};

type Listener = (p: PointerState, dt: number) => void;

const listeners = new Set<Listener>();
let rafId = 0;
let lastTime = 0;
let lastMoveTime = 0;
let started = false;

function frame(time: number) {
  const dt = lastTime ? Math.min(64, time - lastTime) : 16.67;
  lastTime = time;

  const ease = 1 - Math.pow(0.0018, dt / 1000); // frame-rate independent lerp
  const prevX = pointer.sx;
  const prevY = pointer.sy;
  pointer.sx += (pointer.nx - pointer.sx) * ease;
  pointer.sy += (pointer.ny - pointer.sy) * ease;
  pointer.vx = (pointer.sx - prevX) / (dt / 16.67);
  pointer.vy = (pointer.sy - prevY) / (dt / 16.67);

  const decay = Math.pow(0.9, dt / 16.67);
  pointer.speed *= decay;
  if (time - lastMoveTime > 120) pointer.speed *= decay;

  listeners.forEach((fn) => fn(pointer, dt));
  rafId = requestAnimationFrame(frame);
}

function onMove(e: PointerEvent) {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ny = (e.clientY / window.innerHeight) * 2 - 1;
  pointer.active = true;
  lastMoveTime = performance.now();
  pointer.speed = Math.min(1, pointer.speed + 0.5);
}

function onDown() { pointer.down = true; }
function onUp() { pointer.down = false; }
function onLeave() { pointer.active = false; }

export function initPointer(): () => void {
  if (started) return () => {};
  started = true;
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  rafId = requestAnimationFrame(frame);
  return () => {
    started = false;
    cancelAnimationFrame(rafId);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointerleave", onLeave);
    listeners.clear();
  };
}

export function subscribePointer(fn: Listener): () => void {
  listeners.add(fn);
  if (!started) initPointer();
  return () => listeners.delete(fn);
}

export const isCoarsePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
