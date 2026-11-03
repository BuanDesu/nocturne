export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frame-rate independent damping toward a target. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const pad = (n: number, len = 2) => String(Math.floor(n)).padStart(len, "0");

export const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Deterministic pseudo-random — keeps generative art stable between reloads. */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export function formatClock(date = new Date()) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}
