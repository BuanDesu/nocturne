# Nocturne — build contract

A front-end craft demonstration. Six movements, one page, zero templates.
This file is the single source of truth for design language, shared APIs and file ownership.

---

## 1. Run & verify

- Dev server is ALREADY running at **http://127.0.0.1:5178** (Vite + HMR). Do not start another one, do not kill it.
- Typecheck: `cd C:/Projects/TEST/nocturne && npx tsc --noEmit` (only run when your section is complete; ignore pre-existing noise from other files).
- Screenshot harness (Chrome headless, already installed):

```bash
cd C:/Projects/TEST/.tools && node capture.mjs '{"out":"C:/Projects/TEST/.shots","shots":[{"name":"b-manifesto","selector":"#manifesto","settle":1800}],"width":1440,"height":900}'
```

Then look at the PNG with the `read_image` tool. Always inspect your own work visually, at desktop **and** mobile (`"width":390,"height":844`). Prefix your shots with your name. Console errors are printed by the harness — keep the output clean.

**Never run `pnpm install`, never edit package.json, never add dependencies.** Everything needed is installed.

---

## 2. Stack

React 19 + TypeScript · Vite 8 · GSAP 3.15 + ScrollTrigger · Lenis smooth scroll · raw WebGL via `lib/gl.ts`.
No UI library. No external assets, images, videos or third-party requests — every visual is CSS, SVG, canvas or WebGL, generated in-browser. Fonts are self-hosted.

---

## 3. Design language

### Palette (use the CSS variables, never raw hex in CSS)
```
--void #06060A      page black          --acid #DAFF3E   the single accent
--ink  #0B0B11      ink black           --ember #FF5A2B  warm, rare, shader/art only
--bone #EFE9DC      warm paper          --lilac #A291FF  cool, shader/art only
```

Semantic tokens (these flip inside `.theme-bone`):
`--bg --bg-2 --surface --surface-2 --fg --fg-muted --fg-faint --fg-ghost --line --line-strong --accent --accent-fill --accent-fg`

Rules
- Dark sections use `--void`; the two light sections add `class="theme-bone"` to their `<section>`.
- Acid is a scalpel: links, live dots, one underline, one hover fill. Never large acid areas except the deliberate CTA fill.
- Ember/lilac only inside generated artwork, never UI chrome.
- Borders: 1px `var(--line)` — hairlines are the signature. No drop shadows except `--shadow-card` on floating cards.
- Corners: 3px max, or fully round pills. Never 8–16px "web app" radii.

### Type
- Display: **Instrument Serif** (`.display`, `.serif`, `.serif-i`) — big statements, project names, numbers. Italic serif = emotional emphasis, used sparingly (1–2 per section).
- UI/body: **Instrument Sans** — text, buttons, navigation.
- Labels: **JetBrains Mono** (`.mono`, `.eyebrow`) — uppercase, 10–11px, tracking 0.16em. Every section opens with a mono index label ("03 / Lab").
- Display sizes: use `var(--fs-display)` for section statements, `var(--fs-title)` for card titles. Body `var(--fs-body)`.
- Set `text-wrap: balance` on headings, `pretty` on paragraphs.

### Layout
- `.container` = max-width 1720px + fluid padding. `.section` = fluid vertical padding. `.grid-12` = 12-col grid.
- Editorial asymmetry beats centered symmetry. Let one element break the grid deliberately.
- Vertical rhythm: section label row at top, then statement, then content. Hairline separates zones.
- Whitespace is the luxury. When in doubt, add 40% more space.

### Motion
- Easing: `--ease-out-expo` for entrances, `--ease-in-out-quart` for stateful transitions. Durations 180–1200ms. Never linear except scrubbed parallax.
- Everything enters on scroll; nothing bounces unless the demo is *about* springs.
- Hover transitions 250–450ms. Prefer transform/opacity only.
- Respect `prefers-reduced-motion`: use `prefersReducedMotion()` from `lib/motion` and skip non-essential motion.

### Voice
Short, confident, technical, a little poetic. No "unleash", "revolutionize", "seamless", "cutting-edge", no exclamation marks. Present tense. Concrete nouns. Numbers feel credible ("the half-second", "1px", "60 frames").
The site is self-aware: it *is* a front-end demonstration — that honesty is part of the charm.

---

## 4. Shared APIs (import from `../lib/...`)

### `lib/motion`
```ts
useReveals(ref)                  // wires all declarative reveals inside a section ref (fonts-aware)
initReveals(el)                  // manual version, returns cleanup
useMagnetic(ref, strength?)       // magnetic hover
bindCursorTargets(el)             // enables [data-cursor] hover states for a subtree
gsap, ScrollTrigger, EASE, reducedMotion, prefersReducedMotion
scrollToTarget("#id" | el)        // Lenis-aware anchor scrolling
splitText(el, "words"|"chars"|"lines"), unsplit(el)
```

Declarative attributes handled by `useReveals`:
- `data-split="words|chars|lines"` — masked text reveal (plain-text elements only)
- `data-reveal` / `data-reveal="fade|scale|up"` + `data-reveal-delay` — fade/rise
- `data-reveal-group` (+ value = stagger seconds) — children stagger in
- `data-reveal-mask` — clip-path wipe (great for canvas/cards)
- `data-parallax="0.15"` — scrub drift
- `data-cursor="link|view|drag" data-cursor-label="Open"` — custom cursor intent

### `lib/pointer`
```ts
subscribePointer((pointer, dt) => {...})   // one rAF for the whole app; returns unsubscribe
// pointer: { x,y, nx,ny, sx,sy, vx,vy, speed, down, active } — nx/ny are -1..1
isCoarsePointer()
```

### `lib/gl` + `lib/glsl`
```ts
new GLStage(canvas, { frag, maxDpr, autoStart })
stage.frameCallback = (time, dt, stage) => { stage.set("uTime", time); stage.set("uRes", [stage.width, stage.height]); };
stage.set(name, number | boolean | array | Float32Array)
stage.setTexture(name, unit, source)
stage.renderOnce(); stage.start(); stage.stop(); stage.destroy();
```
GLSL chunks in `lib/glsl.ts`: `hash`, `noise`, `fbm`, `rotation`, `colorHelpers` (tonemap + grainDither). Concatenate into `.frag` files imported with `?raw`.
GLStage already: DPR-clamps, resizes via ResizeObserver, pauses offscreen + on tab hide. Always `destroy()` in cleanup.

### `lib/utils`
`clamp lerp damp pad rand seeded range formatClock hexToRgb`

---

## 5. File ownership — do not write outside your scope

| Owner | Files |
|---|---|
| **Lead** | `src/App.tsx`, `src/main.tsx`, `index.html`, all `src/lib/**`, `src/components/{Nav,Hero,Preloader,Cursor,Grain}.tsx`, `src/styles/{tokens,base,fonts,hero,nav,cursor,preloader,sections}.css`, config files, `README.md`, `DESIGN.md` |
| **teammate-b** | `src/components/Manifesto.tsx`, `src/components/Craft.tsx`, `src/components/Marquee.tsx`, `src/components/craft/**`, `src/styles/{manifesto,craft,marquee}.css` |
| **teammate-c** | `src/components/Lab.tsx`, `src/components/lab/**`, `src/shaders/lab-*.frag`, `src/styles/lab.css` |
| **teammate-d** | `src/components/Work.tsx`, `src/components/Coda.tsx`, `src/components/work/**`, `src/styles/{work,coda}.css` |
| **verifier** | `reports/**` only |

If you need a change in `lib/` or global styles, message the Lead — do not edit them.
Each component imports its own CSS file. Namespace every class with your section prefix (`.manifesto__…`, `.lab__…`, `.craft__…`).
Keep existing `<section id="…">` ids and `aria-label`s — the nav, hero index and reveal system rely on them.

---

## 6. Section briefs

Overall page rhythm (already wired in App.tsx):
`Hero (dark) → Manifesto (bone) → Lab (dark) → Index (bone) → Craft (dark) → Coda (dark)`

### 01 · Manifesto — teammate-b (`#manifesto`, `.section.theme-bone`)
- Opens with mono row: `01 / Manifesto` left, `MMXXV — Shanghai` right, hairline under.
- Statement, split into 3–4 lines, `var(--fs-display)`, max ~18ch per line, with one italic serif phrase:
  "The best interfaces are *felt* before they are read."
- Supporting paragraph (~45 words) + a second smaller column.
- Four principles in a hairline list: `01 Restraint`, `02 Rhythm`, `03 Honesty`, `04 Detail` — each with a one-line explanation; hover reveals acid index / shifts text.
- Stats strip with serif numerals: `06` Movements, `03` Live experiments, `00` Templates.
- A slowly rotating circular seal (SVG text on a path: "NOCTURNE · FRONT-END CRAFT · MMXXV ·") — 40–56s rotation.
- Ends with a full-bleed `<Marquee />` band of outlined serif text ("MOTION IS MEANING — LIGHT IS MATERIAL —") — this is the transition into the dark Lab.
- Light theme: bone bg, ink text, acid→olive accent token `--accent` (already overridden). Keep it airy and quiet.

### 02 · Lab — teammate-c (`#lab`, dark)
Three live experiments, each a full-width row (canvas + editorial column), alternating sides, hairline dividers:
1. **Liquid chrome** (WebGL, GLStage) — a metallic/ivory liquid surface, raymarched or noise-warped, reacting to pointer. Acid rim light, deep shadows. Drag to disturb.
2. **Particle field** (2D canvas) — 2–4k particles on a curl-noise flow, bone dots with acid trails, pointer attracts/repels. Persistent trails, additive glow.
3. **Glyph morph** (2D canvas) — particles sampled from rendered type, morphing between words ("TYPE", "LIGHT", "MOTION", "NOCTURNE"), pointer scatters them, they reassemble.
- Each: mono index `EXP.01`, serif title, 1–2 sentence description, tech tags (mono), a live FPS readout, a hint ("Drag to disturb"), and a reset control.
- Motion must be slow/organic, never chaotic. Pause offscreen (2D canvases: IntersectionObserver + document.hidden).
- DPR clamp ≤ 2 (≤1.5 for full-bleed). Reduced motion → static single frame.
- Section intro: `02 / Lab` label, statement "Three experiments, running live." + note "Every pixel generated in the browser — no images, no video."

### 03 · Index — teammate-d (`#index`, `.section.theme-bone`)
- Mono label `03 / Index`. Statement: "Selected transmissions." + short lead.
- Five project rows (hairline separated): serif name (large, ~var(--fs-title)+), discipline, year, arrow.
  1. Lumen — Immersive retail — 2025
  2. Halcyon — Editorial engine — 2024
  3. Meridian — Fintech narrative — 2024
  4. Sable — Fashion commerce — 2023
  5. Orbit — Music product launch — 2022
- Hover: a floating generative preview card (canvas art unique per project) follows the cursor with easing; row name shifts, arrow appears. `data-cursor="view" data-cursor-label="Open"`.
- Click/Enter opens a full-screen case overlay (dark): big serif title, meta grid (year, role, stack), 2 paragraphs, generative art panel reusing the same seed, close button + ESC, body scroll locked, focus moved into the dialog and restored after. Overlay must be reduced-motion friendly.

### 04 · Craft — teammate-b (`#craft`, dark)
"Instruments" — an asymmetric bento grid of eight live micro-demos (each a real, interactive thing, not a picture):
  1. Magnetic button (big, central, pulls toward pointer)
  2. Elastic toggle / spring switch
  3. Tilt + spotlight card (cursor-aware 3D tilt, radial glow)
  4. Easing curve (canvas bezier with moving dot; 3 presets selectable)
  5. Type tester (variable-weight slider on Instrument Sans, live "Aa" + sample line)
  6. Palette swatches (click copies hex, toast confirms)
  7. Frame meter (live rAF fps + frame-time bars)
  8. Scroll velocity / progress ribbon (reads Lenis velocity)
- Bento must be genuinely asymmetric (span 4/5/3 columns), hairline borders, mono labels, serif numerals. Hover states everywhere. Mobile: single column stack.
- Intro: `04 / Craft` + "Small instruments, built to be touched."

### 05 · Coda — teammate-d (`#coda`, dark)
- Marquee-ish statement: "Let's make something that *moves*." (serif, huge)
- Circular magnetic "Start a project" button + email `hello@nocturne.studio` with copy-to-clipboard + toast. Email is a demo address.
- Footer, 4 columns: Studio / Index / Elsewhere / Colophon ("React 19 · TypeScript · WebGL · GSAP · Lenis — hand-written CSS, no templates").
- Local time + coordinates, copyright, and an honest line: "A front-end demonstration. Not a real studio."
- Giant cropped outlined wordmark "Nocturne" at the very bottom edge.

---

## 7. Quality bar (definition of done)

- Desktop 1440×900 and 390×844 both look intentional; no horizontal overflow; no clipped text.
- `prefers-reduced-motion`: content fully visible, no essential motion.
- Keyboard: all interactive elements reachable, `:focus-visible` visible, overlay closes on ESC.
- Semantic headings (one h1 — the hero; sections use h2), `aria-label` on sections/canvases, canvases `aria-hidden`.
- Zero console errors or warnings. Zero third-party network requests.
- Offscreen canvases paused; no unbounded rAF loops; cleanup on unmount.
- Text contrast: body copy ≥ 4.5:1 on its background; large display type may be lower but must stay legible.
- Looks expensive at 1920 wide. Zoom isn't a defense.

When done: message the Lead with (a) what you built, (b) files touched, (c) any integration caveats, (d) the paths of your screenshots.
