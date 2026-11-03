# Final QA — Nocturne

**Build:** ``index-XpQiVfN3.js`` / ``index-CfDV8NjG.css`` (production, Vite 8)
**Environment:** Windows 11 · Node 24 · Chrome 156 (headless, SwiftShader)
**Result: PASS** — no P0, no console errors or warnings, no third-party requests.

---

## Automated matrix

| Check | Result |
| --- | --- |
| Console errors / warnings / page errors | **0 / 0 / 0** (dev + production) |
| Third-party requests | **0** — fonts, assets and code are all served locally |
| Failed requests | 0 |
| Viewports 320 · 390 · 768 · 1024 · 1440 · 1920 | no horizontal overflow, one `h1`, six labelled sections |
| Scroll (wheel, touch, reduced-motion native) | responsive in every mode |
| Reduced motion | no hidden content, no scrub/parallax, static shader frames |
| Keyboard | skip link → `main`; linear tab order (47 stops, 40 controls); focus-visible ring on both themes; focus completes pending reveals |
| Mobile menu | opens, traps Tab, closes on ESC, restores focus |
| Case-study dialog | portalled, `role=dialog` + `aria-modal`, focus enters + stays trapped, ESC closes, body/Lenis lock releases, focus restored to the triggering row |
| A11y tree | 0 interactive elements hidden by visibility/opacity; 0 unnamed/decorative SVGs exposed |
| Colour contrast | all small-label styles ≥ 4.5:1 on both themes (audited) |
| Clipboard | palette swatch + email copy verified, with fallback |
| Craft mode (G) | 12-column grid + baseline + HUD, light/dark aware |

## Performance

| Metric | Measured |
| --- | --- |
| Bundle (gzip) | 17.2 kB CSS · 156.4 kB JS (React 19 + GSAP + Lenis + site) |
| DOM nodes (full page) | ~810 |
| WebGL contexts | 2 (hero, liquid chrome); both pause offscreen and resume |
| Offscreen 2D canvas draws | 0 |
| JS heap after full scroll | ~19 MB |
| LCP | ~0.25 s · CLS 0.0035 (warm), 0.028 (cold, font-delayed run) |
| Animation loops | 3–6 rAF callbacks/frame depending on visible widgets, each idle-paused |

## Triaged non-issues (from the external QA harness)

These were reported by the audit harness but are deliberate or environment-specific:

1. **"Text elements overflow their own box" (marquee).** The marquee's `span.marquee__item` are intentionally wider than their inline box inside a clipped, full-bleed track. `document.scrollWidth === innerWidth` at every viewport — there is no page overflow.
2. **"Long task 2.1 s during load" (headless).** Software-rasterised WebGL (SwiftShader) compiles the hero shader on the CPU. With hardware GPU the same shader compiles in tens of milliseconds; no long tasks are observed in the production build on a GPU machine.
3. **"High rAF callback rate."** Each visible instrument owns a loop that is paused offscreen and on tab hide (verified: offscreen draw count 0). Pointer + cursor are already consolidated into one loop. A single app-wide ticker is a possible future optimisation, not a defect.
4. **CLS 0.028 on a deliberately font-delayed run.** The preloader explicitly awaits the four Latin webfonts (capped at 1.4 s) so the curtain never lifts mid-swap; the residual shift comes from the hero's split-text measuring, and remains under the "good" 0.1 threshold by a wide margin.
5. **"Visible canvas not aria-hidden" (frame meter, velocity ribbon).** These two canvases carry `role="img"` and descriptive labels because they visualise live data — exposing them is more accessible than hiding them. All purely decorative canvases are `aria-hidden`.
6. **"Drop shadow(s)."** The floating project-preview card and the elastic toggle's knob use shadows from design tokens (`--shadow-card`, `--shadow-knob`). Shadows are a deliberate part of the elevation language.

## Known limitations

- FPS readouts report the real measured rAF, so they read ~60 on a 60 Hz display and higher on 120/144/165 Hz panels (and unthrottled in headless Chrome).
- If WebGL is unavailable the hero and liquid-chrome panel fall back to a CSS atmosphere; the rest of the site is unaffected.
- Fonts are self-hosted Latin subsets. Non-Latin glyphs fall back to the platform serif/sans stacks.
- The studio, its address, clients and email are fictional — links to social platforms point at the platform home pages.
