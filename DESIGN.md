# Design notes — Nocturne

The site is the argument. Everything below exists to make one point: the front end is a craft, and craft is legible.

---

## 1. Premise

Most "front-end showcase" pages are galleries of other people's work. Nocturne inverts that: it is a studio site for a studio that does not exist, and its subject is the medium itself — light, type, timing, restraint. The copy is written to be self-aware ("A front-end demonstration. Not a real studio."), which gives the page permission to be honest instead of promotional.

The structure is a **movement score**, not a landing page: Overture, Manifesto, Lab, Index, Craft, Coda. Six movements, each with exactly one idea, each earning the next.

## 2. Rhythm

```
Overture  dark   — atmosphere, scale, a promise
Manifesto bone   — silence, a printed page, principles
Lab       dark   — proof: three running experiments
Index     bone   — work, as a monograph index
Craft     dark   — proof: eight small instruments
Coda      dark   — a close, a colophon, a wry note
```

Dark → light → dark → light → dark → dark. The two light sections are the page's breathing points; they are also where the header flips its ink so the chrome never fights the content. Nothing is "card grid on dark" twice in a row.

## 3. Visual system

**Palette.** Three values carry the entire design: a near-black void with a blue bias (`#06060A`), a warm bone (`#EFE9DC`), and one acid accent (`#DAFF3E`). Ember and lilac exist only inside generated artwork, never in UI. A single accent forces every hover, focus and emphasis to be a deliberate decision rather than a default.

The light sections shift the accent to a deep olive (`#4A5308`) because acid on bone is a contrast failure; the token flips, the components don't.

**Type.** Instrument Serif for display — a high-contrast, slightly condensed face that reads as editorial rather than startup. Instrument Sans for UI and body, as the quieter sibling. JetBrains Mono for labels, numbers and metadata: the "instrument panel" voice that tells you this is engineered, not just styled.

The scale is fluid (`clamp`), the display sizes are large and tight (`-0.02em` to `-0.045em`), and italic serif is rationed to one emotional beat per section.

**Layout.** A 12-column grid with fluid page padding (1.15rem → 3.25rem) and a 1720px max width. Hairlines (1px at 13% ink) are the primary structural device: they divide rows, underline indexes, frame the footer. Corners are 3px or fully round — never the 8–16px "app card" radius. Shadows appear only on floating elements.

**Texture.** A static film grain (SVG turbulence, 5.5% overlay) sits above everything; the hero adds per-pixel dithering in-shader to kill 8-bit banding in its gradients.

## 4. Motion system

Motion is scored in time, not sprinkled as decoration.

- **Entrances** are masked: words rise 118% inside clipping lines, staggered. Text is always split after webfonts load, and the original markup is restored when the animation completes — the DOM goes back to being document, not puppet.
- **Scroll choreography** uses GSAP ScrollTrigger with `once: true` for reveals and scrubbed only for parallax. The hero cools and recedes as it leaves.
- **Inertia**: Lenis drives scroll with a lerp of 0.085, fed by GSAP's ticker so ScrollTrigger and smooth scroll share one clock. No competing rAF loops.
- **Magnetic hover** (buttons, seal, CTA) uses `gsap.quickTo` on a single axis pair — pointer-following without layout thrash.
- **Custom cursor**: a fast acid dot and a trailing bone ring with intent states (`link`, `view`, `drag`), disabled for touch and reduced motion.
- Timings: 180–450ms for state changes, 0.9–1.5s for entrances; easing is expo-out for arrival, in-out-quart for state.

Under `prefers-reduced-motion`, the preloader becomes a 200ms fade, splits/parallax/scrubs are skipped, the shader renders a single frame, and every revealed element starts visible.

## 5. WebGL

The hero is a full-screen fragment shader, written by hand and run through a ~250-line `GLStage` manager.

- **Field**: two-level domain warping of 5-octave value-noise fbm, producing slow, silk-like folds.
- **Light**: ridged contours extract thin luminous folds from the field; a separate low-frequency bloom adds violet depth; a warm ember core sits underneath.
- **Interaction**: the domain is displaced toward the pointer with a Gaussian lens, and a soft cursor glow rides the same falloff.
- **Grade**: ACES tonemap, slight gamma lift, smooth-step contrast, vignette, a quiet dark floor behind the wordmark so the type always wins, and per-pixel grain/dither.
- **Engineering**: DPR clamped (1.5 on touch, 1.9 on desktop), pauses offscreen and on tab hide, ResizeObserver-driven sizing, context-loss handling, full teardown on unmount.

The Lab continues the same approach with different physics:

- **Liquid chrome** — a heightfield built from two fbm layers and three drifting swells, shaded only by a procedural studio reflection (a bright ceiling with one dark gap, a razor horizon, a single acid crease). Pointer drag sprays a four-slot ripple train; Reset fires a centre shockwave. One draw call, one program.
- **Curl field** — ~3.3k particles advected by a curl-noise lookup table re-baked at ~12 Hz (never per particle per frame), with emission and trail decay normalised by delta-time so the field looks identical at 60, 120 or 165 Hz. It is pre-warmed with 160 painted steps before the first visible frame, so the field is already dense when you arrive.
- **Glyph drift** — typography rasterised into points, per-word fitted, spring-morphed between TYPE / LIGHT / MOTION / NOCTURNE with a pointer scatter field. Every transition is a spring, never a crossfade.

Each canvas reports its own measured frame rate and sleeps the moment it leaves the viewport.

## 6. "Craft mode"

Press **G**. A 12-column grid, an 8px baseline, section bounds, and a HUD with viewport, breakpoint, frame time and scroll position appear over the page. It is a small love letter to the people who inspect things: the site's own design system, opened up. The frame meter is honest — it measures the same rAF the rest of the page uses.

## 7. Accessibility

- Skip link; semantic landmarks; one `h1` (the wordmark), `h2` per movement.
- Scroll entrances are *additive*, not subtractive: containers that hold interactive elements animate their transform only, so they stay in the accessibility tree and in tab order even before they enter the viewport — and a focus safety net completes any pending reveal the moment keyboard focus lands inside one.
- Keyboard: visible focus at every stop; the mobile menu traps Tab and restores focus; the case-study dialog traps Tab, closes on ESC, locks Lenis and restores focus to the row that opened it.
- Decorative canvases are `aria-hidden`; interactive canvases have descriptive labels and visible hints.
- Reduced motion is a first-class path, not an afterthought.
- The custom cursor never replaces the native cursor for touch or reduced-motion users.

## 8. Performance

- One pointer rAF for the whole app; one ticker for scroll + scroll-driven tweens.
- Offscreen canvases stop entirely (IntersectionObserver), not merely `opacity: 0`.
- DPR clamps: hero 1.9/1.5, experiment canvases ≤ 2.
- No network requests after the first load; fonts are self-hosted `woff2` (latin subset, ~145KB total).
- Animations are transform/opacity/clip-path; no layout animation in loops.
- The preloader counts *real* preparation (webfonts ready) rather than a fake timer.
- Measured production bundle: **17.2 kB CSS / 156 kB JS** gzipped, **~810 DOM nodes**, two WebGL contexts, ~19 MB JS heap after a full scroll of the page.
- Final audit (production build): six viewports from 320 to 1920 with zero horizontal overflow, zero console errors or warnings, zero third-party requests; skip link → main, focus-trapped case-study dialog with ESC restore, reduced-motion path with no hidden content, touch scroll and tap targets verified.

---

*Fictional studio, real engineering. Built as a front-end demonstration.*
