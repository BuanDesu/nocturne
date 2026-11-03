# Nocturne — QA baseline

Independent audit of the current build. Verifier-owned harness; no app files were modified.

- Date: 2026-11-02 ~17:41 CST
- Dev server audited: http://127.0.0.1:5178 (Vite dev)
- Production build audited: dist served on http://127.0.0.1:5179 (build 17:29)
- Browser: Chrome 156 headless (SwiftShader WebGL), 5 viewports: 1920x1080, 1440x900, 1024x768, 768x1024, 390x844
- Harness: `cd C:/Projects/TEST/.tools && node qa.mjs --url http://127.0.0.1:5178 --out C:/Projects/TEST/.shots --label baseline`
- Artifacts: `C:/Projects/TEST/.shots/verifier-baseline.json` (raw data + rule findings), `verifier-baseline.md` (generated), 31 screenshots `verifier-*.png`.
- Run validity: VALID — 5/5 viewports mounted (6 sections, hero canvas present, preloader display:none, body not .is-locked), wheel scrolling passes at every viewport (320px moves). 8 Vite hot updates (Lab/ParticleField) landed during the run; layout/console results are still consistent but the 2268ms long task and 5.99s preloader reading in that run are HMR artifacts, not product numbers.

## Verdict

No P0 blockers. Hero, nav, preloader and cursor are at or above the contract bar; sections read as deliberate editorial work, not a template. Remaining items are one accessibility P1 (below-fold interactive content is hidden from keyboard/screen readers until scrolled) and P2 polish (hero micro-label contrast, preloader font timing, per-canvas rAF budget, three Craft a11y/token nits). Console and network are clean in both dev and production: 0 errors, 0 warnings, 0 page errors, 0 third-party requests, 0 failed requests.

## Issues

### P1 — Interactive content is visibility:hidden until its section is scrolled into view (keyboard + SR)
- What: 21 interactive elements are hidden at load: Lab reset buttons (3), Index rows + end link (6), Coda mail copy / CTA / 9 footer links / craft toggle (12). Tab order after the hero CTA jumps straight to Craft controls; screen readers do not see Lab/Index/Coda content until a mouse/scroll reveal fires.
- Evidence: `audit.keyboard.hiddenInteractive` in verifier-baseline.json; focus walk stops `f12 -> f13` (hero CTA -> craft magnet button); rhythm screenshots show the sections render correctly once revealed.
- Root cause (code): `src/lib/reveal.ts` `initReveals()` animates `[data-reveal]` / `[data-reveal-group]` with GSAP `autoAlpha`, which sets inline `visibility:hidden` below the fold. Keyboard focus cannot enter hidden subtrees.
- Suggested fix (lead, `lib/reveal.ts`): keep interactive/text blocks visible to a11y — hide with opacity/transform/clip only (no visibility), or force `visibility:visible` on interactive containers and rely on the opacity/transform tween; alternatively reveal on `:focus-within`/`scrollIntoView` before focus. Do not edit section files for this.
- Selector example: `section#lab button.lab__reset`, `section#index button.index__row-btn`, `section#coda a.coda__link`.

### P2 — Hero micro-label contrast below AA
- `span.hero__index-num.mono` (01–05): `rgba(239,233,220,0.34)` on `#06060A` = 2.64:1 at 8.8px.
- `span.hero__tag-body` ("Six movements, built by hand."): 0.45 alpha = 3.88:1 at 9.6px.
- Global AA text tokens were raised, but these hero-local rgba values remain. Owner: lead (hero.css). Evidence: 1440x900-top.png. Decorative-intent call is acceptable if intentional, but they are below the stated 4.5:1 body bar.

### P2 — Preloader resolves before webfonts in the reduced-motion path (intermittent FOUT)
- Normal path caps the font wait at 2.5s after the count; reduced-motion path fades the curtain after ~0.35s without waiting for `document.fonts.ready`.
- Observed once with cold fonts: Instrument Serif not loaded at reveal, hero word 871px -> 715px after the swap (CLS 0.027–0.043). Later runs had warm fonts (no FOUT), so it is reproducible only on cold cache / hard reload. Owner: lead (Preloader.tsx).
- Fix: on the reduced path, finish only after `document.fonts.ready` (or after the 2.5s cap), same as the standard path.
- Evidence: verifier-reduced-fonts-early.png / verifier-reduced-fonts-settled.png, verifier-slowfonts-at-reveal.png / verifier-slowfonts-after-fonts.png.

### P2 — rAF budget is spread across per-canvas loops
- 5.02 rAF callbacks per animation frame sustained; 662–992 callbacks/s at every scroll stop (hero/manifesto/lab/index/craft/coda), from ~10 2D-canvas loops + pointer loop + GSAP ticker. 8 2D canvas contexts + 2 WebGL contexts.
- Drawing itself is correct: hero WebGL 151 draws/s on screen, 0 draws while scrolled out, 167/s after returning (independently re-probed); no 2D canvas drew while offscreen in any sampled stop. Long tasks on clean loads: 99ms + 178ms (previous clean run 110/142ms) during load, none during the hero entrance, LCP 252ms, CLS 0.0035.
- Not a launch blocker; final pass should consider routing section canvases through the shared ticker if the budget grows. Owner: lead / section owners.

### P2 — Craft a11y/token nits (teammate-b)
- `canvas.frame__canvas` and `canvas.velocity__canvas` use `role="img"` + aria-label instead of `aria-hidden` — accessible charts, but inconsistent with the contract wording; keep if deliberate.
- Six palette copy-icon `svg` elements lack `aria-hidden` (decorative duplicate inside already-labelled buttons).
- `span.elastic__knob` carries `box-shadow: rgba(0,0,0,0.8) 0 10px 24px -12px`; contract allows no shadows except `--shadow-card` on floating cards.

## Verified passes (evidence)

- Console: 0 errors / 0 warnings / 0 page errors in dev; production build console completely silent. Dev font-preload warnings were not reproducible once pages are kept open; they were Vite-dev/early-close artifacts, not product bugs.
- Network: 95 local requests dev / 9 prod, all 127.0.0.1; all 5 webfonts served from /fonts; zero third-party, zero failures.
- Preloader: resolves 3.56s clean (5.99s during the HMR rebuild run); display:none + aria-hidden after finish, body unlocked, hero title unsplit after settle, reveal complete. Captures at 300/1200/2500ms + post.
- Nav: desktop links/active state/progress; 390x844 menu opens 375x844, focus moves inside dialog, 6 Tab stops stay inside, ESC closes, body unlocks, focus returns to the menu button.
- Skip link: first Tab stop, targets #main (tabindex=-1), Enter moves focus to MAIN.
- Reduced motion: 0 hidden elements at rest and after warm-scrolling the whole page, no reveal animation, no parallax movement, no extra WebGL/2D draws, wheel scroll 600px, cursor disabled.
- Keyboard: 26 stops, no trap/repeat, visible 2px acid focus ring at every stop.
- Cursor: fine pointer enabled, ring/dot visible, nav-link intent fires; touch/coarse pointer disables the custom cursor, keeps native cursor, taps work, swipe scrolls 345px.
- Semantics: exactly one h1; h1 -> h2 -> h3 order; 6 named sections; no broken anchors, no duplicate ids; hero/lab canvases and decorative SVGs aria-hidden; controls vs links correct.
- Layout: no horizontal page overflow at any viewport (scrollWidth <= innerWidth; negative delta is scrollbar gutter); no unclipped bleed; no clipped-at-rest text; no fixed-element collisions; nav/hero top clearance 18px desktop / 40px mobile; hero content bottom gap 14–33px.
- Visual quality: hero composition (oversized Instrument Serif against the acid-lit shader), nav hairline/blend treatment, preloader count typography, mobile 390 stacking, bone/dark section alternation and the Lab live canvases all read as bespoke and high-end. No generic-template signals found. Craft bento asymmetry and Index rows are strong. Only visual nits are the hero micro-label contrast and the Craft knob shadow.

## Screenshots (C:/Projects/TEST/.shots/)

- Viewports: verifier-1920x1080-top.png, verifier-1440x900-top.png, verifier-1024x768-top.png, verifier-768x1024-top.png, verifier-390x844-top.png, verifier-1440x900-full.png
- Section rhythm (warm-scrolled, viewport captures): verifier-1440x900-rhythm-{overture,manifesto,lab,index,craft,coda}.png; verifier-390x844-rhythm-{...}.png
- Preloader: verifier-preloader-0300ms/1200ms/2500ms/post.png; verifier-slowfonts-at-reveal/after-fonts.png
- Reduced motion: verifier-reduced-top.png, verifier-reduced-manifesto.png, verifier-reduced-fonts-early/settled.png
- Keyboard/cursor/menu: verifier-focus-skip-link.png, verifier-menu-open-mobile.png, verifier-cursor-fine.png, verifier-cursor-touch.png

## Final-pass checklist (same harness)

1. Freeze both dev and prod (no HMR during run) — the harness reports hot-update count and refuses to call the run valid if any viewport fails to mount/scroll.
2. Re-shoot Lab after the curl-field brightness tuning, plus macro shots of Craft/Palette.
3. Re-check the P1 after the reveal fix (expected hiddenInteractive = 0, Tab reaches Lab/Index/Coda controls).
4. Confirm hero micro-label contrast after tokens, Craft knob shadow, Canvas/SVG aria-hidden.
5. Re-run reduced-motion cold-font case (hard reload, no warm cache) to confirm no FOUT; re-run production preview for console parity.
