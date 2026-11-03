import type { ArtId } from "./projects";

/**
 * Generative studies for the five projects. Every mark is drawn at runtime —
 * no textures, no images. Each generator is deterministic in structure and
 * slow in motion: the artwork should feel engraved rather than animated.
 */

type RGB = [number, number, number];

const BONE: RGB = [239, 233, 220];
const ACID: RGB = [218, 255, 62];
const EMBER: RGB = [255, 90, 43];
const LILAC: RGB = [162, 145, 255];

const rgba = (color: RGB, alpha: number) =>
  `rgba(${color[0]},${color[1]},${color[2]},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Working unit: keeps wide panels (the case figure) from feeling empty. */
const unit = (w: number, h: number) => Math.min(w, h * 1.55);

function base(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#08080d";
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.64);
  g.addColorStop(0, "rgba(32, 32, 46, 0.55)");
  g.addColorStop(0.52, "rgba(16, 16, 26, 0.24)");
  g.addColorStop(1, "rgba(6, 6, 10, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, amount = 0.8) {
  const g = ctx.createRadialGradient(
    w * 0.5, h * 0.48, Math.min(w, h) * 0.22,
    w * 0.5, h * 0.5, Math.hypot(w, h) * 0.62,
  );
  g.addColorStop(0, "rgba(6, 6, 10, 0)");
  g.addColorStop(0.72, `rgba(6, 6, 10, ${amount * 0.28})`);
  g.addColorStop(1, `rgba(6, 6, 10, ${amount})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/* --------------------------------------------------------------------------
   LUMEN — an aperture of light. Retail as lens.
   -------------------------------------------------------------------------- */
function lumen(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, px: number, py: number) {
  base(ctx, w, h);
  const min = unit(w, h);
  const cx = w * (0.5 + px * 0.016);
  const cy = h * (0.48 + py * 0.014);
  const maxR = Math.min(min * 0.47, h * 0.44);

  /* Shafts of light falling through the frame. */
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 7; i++) {
    const x = w * (0.06 + i * 0.145) + Math.sin(t * 0.14 + i * 1.9) * w * 0.032;
    const width = w * (0.045 + 0.028 * (0.5 + 0.5 * Math.sin(i * 2.1 + t * 0.11)));
    const g = ctx.createLinearGradient(x - width, 0, x + width, 0);
    g.addColorStop(0, rgba(BONE, 0));
    g.addColorStop(0.5, rgba(BONE, 0.022 + 0.012 * Math.sin(t * 0.26 + i)));
    g.addColorStop(1, rgba(BONE, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - width, 0, width * 2, h);
  }
  ctx.restore();

  /* Aperture blades — open arcs, spinning at different rates. */
  const rings = 10;
  for (let i = 0; i < rings; i++) {
    const r = maxR * (0.2 + i * 0.078);
    const alpha = 0.05 + (i / rings) * 0.15;
    const blades = 3 + (i % 3);
    const spin = t * (0.028 + i * 0.004) * (i % 2 ? 1 : -1) + i * 0.62;
    for (let b = 0; b < blades; b++) {
      const a0 = spin + (b * Math.PI * 2) / blades;
      const a1 = a0 + ((Math.PI * 2) / blades) * 0.68;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a1);
      ctx.strokeStyle = rgba(BONE, alpha);
      ctx.lineWidth = i > 6 ? 1.25 : 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r, a1 - 0.14, a1);
      ctx.strokeStyle = rgba(BONE, alpha * 2.2);
      ctx.stroke();
    }
  }

  /* Core bloom. */
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.9);
  core.addColorStop(0, rgba(ACID, 0.46));
  core.addColorStop(0.07, rgba(ACID, 0.2));
  core.addColorStop(0.28, rgba(LILAC, 0.05));
  core.addColorStop(1, rgba(ACID, 0));
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, w, h);

  /* Horizontal filaments. */
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const y = Math.round(h * (0.3 + i * 0.1) + Math.sin(t * 0.18 + i) * h * 0.018) + 0.5;
    const g = ctx.createLinearGradient(0, y, w, y);
    g.addColorStop(0, rgba(BONE, 0));
    g.addColorStop(0.5, rgba(BONE, 0.045));
    g.addColorStop(1, rgba(BONE, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, y, w, 1);
  }
  ctx.restore();

  /* Dust suspended in the light. */
  const dust = seeded(137);
  for (let i = 0; i < 90; i++) {
    const x = dust() * w;
    const y = dust() * h;
    const alpha = 0.03 + dust() * 0.15;
    const size = 0.4 + dust() * 1.1;
    ctx.fillStyle = rgba(BONE, alpha);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  /* An engraved frame around the aperture. */
  const frameR = Math.min(maxR * 1.06, h * 0.465);
  ctx.strokeStyle = rgba(BONE, 0.1);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, frameR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = rgba(BONE, 0.2);
  for (let i = 0; i < 4; i++) {
    const angle = i * (Math.PI / 2) + Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * frameR, cy + Math.sin(angle) * frameR);
    ctx.lineTo(cx + Math.cos(angle) * (frameR + min * 0.022), cy + Math.sin(angle) * (frameR + min * 0.022));
    ctx.stroke();
  }

  ctx.fillStyle = rgba(ACID, 0.95);
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1.4, min * 0.0045), 0, Math.PI * 2);
  ctx.fill();

  vignette(ctx, w, h, 0.72);
}

/* --------------------------------------------------------------------------
   HALCYON — a printed halftone disc inside the editorial grid.
   -------------------------------------------------------------------------- */
function halcyon(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, px: number, py: number) {
  base(ctx, w, h);
  const min = unit(w, h);
  const m = 0.07;

  /* Column rules. */
  ctx.strokeStyle = rgba(BONE, 0.07);
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const x = Math.round(w * (0.09 + i * 0.136)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.1);
    ctx.lineTo(x, h * 0.9);
    ctx.stroke();
  }

  /* Crop marks — the tell of a print proof. */
  const arm = min * 0.03;
  ctx.strokeStyle = rgba(BONE, 0.16);
  const corner = (x: number, y: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * arm);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * arm, y);
    ctx.stroke();
  };
  corner(w * m, h * m, 1, 1);
  corner(w * (1 - m), h * m, -1, 1);
  corner(w * m, h * (1 - m), 1, -1);
  corner(w * (1 - m), h * (1 - m), -1, -1);

  /* Halftone sphere, lit from the upper left. */
  const cx = w * (0.56 + px * 0.008);
  const cy = h * (0.5 + py * 0.008);
  const R = Math.min(min * 0.3, h * 0.4);
  const lx = Math.cos(t * 0.1) * 0.62 + 0.1;
  const ly = Math.sin(t * 0.08) * 0.42 - 0.42;
  const lz = 0.82;
  const ll = Math.hypot(lx, ly, lz);
  const lightX = lx / ll;
  const lightY = ly / ll;
  const lightZ = lz / ll;
  const step = Math.max(4, min * 0.019);
  for (let y = cy - R; y <= cy + R; y += step) {
    for (let x = cx - R; x <= cx + R; x += step) {
      const nx = (x - cx) / R;
      const ny = (y - cy) / R;
      const d2 = nx * nx + ny * ny;
      if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2);
      const shade = Math.max(0, nx * lightX + ny * lightY + nz * lightZ);
      const r = step * (0.13 + shade * 0.35);
      if (r < 0.3) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(BONE, 0.14 + shade * 0.56);
      ctx.fill();
    }
  }

  /* Two rules: one acid, one bone. The magazine's voice. */
  ctx.fillStyle = rgba(ACID, 0.92);
  ctx.fillRect(w * 0.09, Math.round(h * 0.78) + 0.5, w * 0.16, 1.5);
  ctx.fillStyle = rgba(BONE, 0.55);
  ctx.fillRect(w * 0.74, Math.round(h * 0.196) + 0.5, w * 0.17, 3);

  vignette(ctx, w, h, 0.82);
}

/* --------------------------------------------------------------------------
   MERIDIAN — capital drawn as a contour map.
   -------------------------------------------------------------------------- */
function meridian(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, px: number, py: number) {
  base(ctx, w, h);
  const min = unit(w, h);
  const cx = w * (0.5 + px * 0.02);
  const cy = h * (0.55 + py * 0.02);
  const horizon = h * 0.79;

  /* The horizon: a ruled baseline with survey ticks. */
  ctx.strokeStyle = rgba(BONE, 0.2);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.06, Math.round(horizon) + 0.5);
  ctx.lineTo(w * 0.94, Math.round(horizon) + 0.5);
  ctx.stroke();
  for (let i = 0; i <= 10; i++) {
    const x = Math.round(w * (0.06 + i * 0.088)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, horizon - (i % 5 === 0 ? 5 : 3));
    ctx.lineTo(x, horizon + 4);
    ctx.stroke();
  }

  /* Three contour systems sharing one coordinate space. */
  const systems = [
    { x: cx, y: cy, r: min * 0.56, squash: 0.72, amp: 0.09, phase: 0.7 },
    { x: cx - w * 0.2, y: cy - h * 0.11, r: min * 0.3, squash: 0.86, amp: 0.17, phase: 2.4 },
    { x: cx + w * 0.21, y: cy + h * 0.07, r: min * 0.27, squash: 0.8, amp: 0.21, phase: 4.1 },
  ];
  systems.forEach((s, si) => {
    for (let i = 0; i < 15; i++) {
      const rr = s.r * (0.1 + i * 0.064);
      const alpha = 0.045 + 0.13 * (1 - i / 15);
      ctx.beginPath();
      for (let a = 0; a <= 108; a++) {
        const ang = (a / 108) * Math.PI * 2;
        const wob =
          1 +
          s.amp *
            (0.42 * Math.sin(ang * 3 + s.phase + t * 0.06 + i * 0.3) +
              0.28 * Math.sin(ang * 7 - t * 0.045 + i * 0.9 + si));
        const x = s.x + Math.cos(ang) * rr * wob;
        const y = s.y + Math.sin(ang) * rr * wob * s.squash;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = rgba(BONE, alpha);
      ctx.lineWidth = i === 6 ? 1.3 : 1;
      ctx.stroke();
    }
  });

  /* The acid meridian — the only instrument on the map. */
  const scan = w * (0.5 + Math.sin(t * 0.075) * 0.29 + px * 0.012);
  ctx.save();
  const glow = ctx.createLinearGradient(scan - min * 0.045, 0, scan + min * 0.045, 0);
  glow.addColorStop(0, rgba(ACID, 0));
  glow.addColorStop(0.5, rgba(ACID, 0.1));
  glow.addColorStop(1, rgba(ACID, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(scan - min * 0.045, h * 0.08, min * 0.09, h * 0.84);
  ctx.fillStyle = rgba(ACID, 0.5);
  ctx.fillRect(Math.round(scan) + 0.5, h * 0.1, 1, h * 0.8);
  ctx.restore();

  ctx.fillStyle = rgba(ACID, 0.95);
  ctx.beginPath();
  ctx.arc(scan, horizon, Math.max(1.6, min * 0.005), 0, Math.PI * 2);
  ctx.fill();

  /* Margin rules. */
  ctx.strokeStyle = rgba(BONE, 0.1);
  ctx.beginPath();
  ctx.moveTo(Math.round(w * 0.06) + 0.5, h * 0.14);
  ctx.lineTo(Math.round(w * 0.06) + 0.5, horizon);
  ctx.moveTo(Math.round(w * 0.94) + 0.5, h * 0.14);
  ctx.lineTo(Math.round(w * 0.94) + 0.5, horizon);
  ctx.stroke();

  vignette(ctx, w, h, 0.78);
}

/* --------------------------------------------------------------------------
   SABLE — draped cloth, drawn as a field of folds.
   -------------------------------------------------------------------------- */
function sable(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, _px: number, _py: number) {
  base(ctx, w, h);
  const folds = 15;
  const band = w / folds;
  const time = t * 0.17;

  const edges: { top: number; c1: number; c2: number; bot: number }[] = [];
  for (let i = 0; i <= folds; i++) {
    const ph = i * 0.82 + time;
    edges.push({
      top: i * band + Math.sin(ph * 0.9) * band * 0.5,
      c1: i * band + Math.sin(ph + 0.9) * band * 1.15,
      c2: i * band + Math.sin(ph + 2.1) * band * 0.95,
      bot: i * band + Math.sin(ph + 1.5) * band * 0.85,
    });
  }

  for (let i = 0; i < folds; i++) {
    const a = edges[i];
    const b = edges[i + 1];
    const light = 0.5 + 0.5 * Math.sin(i * 1.7 + time * 0.6);
    ctx.beginPath();
    ctx.moveTo(a.top, -h * 0.06);
    ctx.bezierCurveTo(a.c1, h * 0.32, a.c2, h * 0.68, a.bot, h * 1.06);
    ctx.lineTo(b.bot, h * 1.06);
    ctx.bezierCurveTo(b.c2, h * 0.68, b.c1, h * 0.32, b.top, -h * 0.06);
    ctx.closePath();
    const g = ctx.createLinearGradient(a.top, 0, b.top, 0);
    g.addColorStop(0, rgba(BONE, 0.018 + 0.075 * light));
    g.addColorStop(0.58, rgba(BONE, 0.004 + 0.02 * light));
    g.addColorStop(1, rgba(BONE, 0.014 + 0.068 * (1 - light)));
    ctx.fillStyle = g;
    ctx.fill();
  }

  /* The ridges where light catches the weave. */
  for (let i = 1; i < folds; i++) {
    const e = edges[i];
    const alpha = 0.06 + 0.16 * (0.5 + 0.5 * Math.sin(i * 1.9 + time));
    ctx.beginPath();
    ctx.moveTo(e.top, -h * 0.06);
    ctx.bezierCurveTo(e.c1, h * 0.32, e.c2, h * 0.68, e.bot, h * 1.06);
    ctx.strokeStyle = rgba(BONE, alpha);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /* Warm edge light, right side only. */
  const warm = ctx.createLinearGradient(w * 0.58, 0, w, 0);
  warm.addColorStop(0, rgba(EMBER, 0));
  warm.addColorStop(1, rgba(EMBER, 0.1));
  ctx.fillStyle = warm;
  ctx.fillRect(w * 0.58, 0, w * 0.42, h);

  /* A sheen crossing the drape. */
  const sheen = ctx.createLinearGradient(0, h * 0.32, 0, h * 0.72);
  sheen.addColorStop(0, rgba(BONE, 0));
  sheen.addColorStop(0.5, rgba(BONE, 0.028));
  sheen.addColorStop(1, rgba(BONE, 0));
  ctx.fillStyle = sheen;
  ctx.fillRect(0, h * 0.32, w, h * 0.4);

  const fall = ctx.createLinearGradient(0, 0, 0, h * 0.34);
  fall.addColorStop(0, "rgba(6, 6, 10, 0.72)");
  fall.addColorStop(1, "rgba(6, 6, 10, 0)");
  ctx.fillStyle = fall;
  ctx.fillRect(0, 0, w, h * 0.34);

  vignette(ctx, w, h, 0.8);
}

/* --------------------------------------------------------------------------
   ORBIT — one system, no fixed choreography.
   -------------------------------------------------------------------------- */
function orbit(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, px: number, py: number) {
  base(ctx, w, h);
  const min = unit(w, h);
  const cx = w * (0.5 + px * 0.022);
  const cy = h * (0.5 + py * 0.022);

  /* Distant starfield — static, seeded. */
  const rnd = seeded(523);
  for (let i = 0; i < 110; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const alpha = 0.04 + rnd() * 0.2;
    const r = 0.35 + rnd() * 0.9;
    ctx.fillStyle = rgba(BONE, alpha);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Orbital rings, each carrying one body. */
  const rings = 6;
  const fit = Math.min(min, h * 0.94);
  for (let i = 0; i < rings; i++) {
    const rot = i * 0.46 + t * 0.03 * (i % 2 ? 1 : -1) + 0.22;
    const rx = fit * (0.15 + i * 0.064);
    const ry = rx * (0.5 + 0.04 * Math.sin(t * 0.1 + i));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(BONE, 0.09 + 0.045 * (0.5 + 0.5 * Math.sin(i * 2 + t * 0.14)));
    ctx.lineWidth = 1;
    ctx.stroke();

    const da = t * (0.07 + i * 0.018) * (i % 2 ? -1 : 1) + i * 1.3;
    const dx = Math.cos(da) * rx;
    const dy = Math.sin(da) * ry;
    if (i === 2) {
      const halo = ctx.createRadialGradient(dx, dy, 0, dx, dy, min * 0.04);
      halo.addColorStop(0, rgba(ACID, 0.3));
      halo.addColorStop(1, rgba(ACID, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(dx - min * 0.04, dy - min * 0.04, min * 0.08, min * 0.08);
    }
    ctx.beginPath();
    ctx.arc(dx, dy, i === 2 ? Math.max(1.8, min * 0.006) : Math.max(1.1, min * 0.0038), 0, Math.PI * 2);
    ctx.fillStyle = i === 2 ? rgba(ACID, 0.95) : rgba(BONE, 0.72);
    ctx.fill();
    ctx.restore();
  }

  /* Core. */
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, min * 0.22);
  core.addColorStop(0, rgba(ACID, 0.38));
  core.addColorStop(0.18, rgba(LILAC, 0.13));
  core.addColorStop(1, rgba(ACID, 0));
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = rgba(ACID, 0.92);
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1.4, min * 0.0045), 0, Math.PI * 2);
  ctx.fill();

  /* Instrument ticks. */
  const tick = min * 0.022;
  ctx.strokeStyle = rgba(BONE, 0.22);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - tick * 2.6, Math.round(cy) + 0.5);
  ctx.lineTo(cx - tick * 1.3, Math.round(cy) + 0.5);
  ctx.moveTo(cx + tick * 1.3, Math.round(cy) + 0.5);
  ctx.lineTo(cx + tick * 2.6, Math.round(cy) + 0.5);
  ctx.stroke();

  vignette(ctx, w, h, 0.84);
}

const GENERATORS: Record<
  ArtId,
  (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, px: number, py: number) => void
> = {
  lumen,
  halcyon,
  meridian,
  sable,
  orbit,
};

/** Draw one frame of a project generative study. Time is seconds. */
export function drawStudy(
  ctx: CanvasRenderingContext2D,
  id: ArtId,
  w: number,
  h: number,
  t: number,
  px = 0,
  py = 0,
) {
  if (w <= 0 || h <= 0) return;
  ctx.save();
  GENERATORS[id](ctx, w, h, t, px, py);
  ctx.restore();
}
