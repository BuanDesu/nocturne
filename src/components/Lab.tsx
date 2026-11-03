import { useEffect, useRef } from "react";
import { bindCursorTargets, EASE, gsap, prefersReducedMotion, useReveals } from "../lib/motion";
import ExperimentRow, { type SurfaceProps } from "./lab/ExperimentRow";
import GlyphMorph from "./lab/GlyphMorph";
import LiquidChrome from "./lab/LiquidChrome";
import ParticleField from "./lab/ParticleField";
import "../styles/lab.css";
import type { ComponentType } from "react";

interface Experiment {
  id: string;
  index: string;
  engine: string;
  title: string;
  description: string;
  tags: string[];
  hint: string;
  touchHint: string;
  cursorLabel: string;
  side: "left" | "right";
  Surface: ComponentType<SurfaceProps>;
}

const EXPERIMENTS: Experiment[] = [
  {
    id: "exp-01",
    index: "EXP.01",
    engine: "LAB-01 — WEBGL",
    title: "Liquid chrome",
    description:
      "One fragment shader, one draw call: a noise-warped heightfield reflected into a studio that exists only in code. Drag, and the surface remembers the disturbance for a moment.",
    tags: ["GLSL ES", "Heightfield", "Pointer ripple"],
    hint: "Drag to disturb",
    touchHint: "Touch to disturb",
    cursorLabel: "Disturb",
    side: "left",
    Surface: LiquidChrome,
  },
  {
    id: "exp-02",
    index: "EXP.02",
    engine: "LAB-02 — CANVAS 2D",
    title: "Curl field",
    description:
      "Three thousand particles drift on a curl-noise field, and their trails are the only record of where they have been. The pointer bends the stream; release, and it settles back into itself.",
    tags: ["Curl noise", "Additive trails", "Pointer force"],
    hint: "Hover to attract · drag to repel",
    touchHint: "Touch to bend",
    cursorLabel: "Bend",
    side: "right",
    Surface: ParticleField,
  },
  {
    id: "exp-03",
    index: "EXP.03",
    engine: "LAB-03 — CANVAS 2D",
    title: "Glyph drift",
    description:
      "Type is rasterised into points and pulled between words by a spring. Nothing snaps: each word is already in transit to the next.",
    tags: ["Type raster", "Spring morph", "Pointer scatter"],
    hint: "Drag to scatter",
    touchHint: "Touch to scatter",
    cursorLabel: "Scatter",
    side: "left",
    Surface: GlyphMorph,
  },
];

export default function Lab() {
  const sectionRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  useReveals(sectionRef);

  /* Masked line entrance for the statement — keeps the italic word intact. */
  useEffect(() => {
    const intro = introRef.current;
    if (!intro || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const lines = intro.querySelectorAll<HTMLElement>(".lab__statement-line > span");
      if (!lines.length) return;
      gsap.fromTo(
        lines,
        { yPercent: 118 },
        {
          yPercent: 0,
          duration: 1.25,
          ease: EASE.expo,
          stagger: 0.1,
          scrollTrigger: { trigger: intro, start: "top 84%", once: true },
        },
      );
    }, intro);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;
    return bindCursorTargets(sectionRef.current);
  }, []);

  return (
    <section className="section lab" id="lab" aria-label="Lab" ref={sectionRef}>
      <div className="container">
        <div className="lab__label" data-reveal="fade">
          <span className="lab__label-index mono">02 / Lab</span>
          <span className="lab__label-rule" aria-hidden="true" />
          <span className="lab__label-meta mono">Surfaces 01 — 03</span>
        </div>

        <div className="lab__intro" ref={introRef}>
          <h2 className="lab__statement display">
            <span className="lab__statement-line">
              <span>Three experiments,</span>
            </span>
            <span className="lab__statement-line">
              <span>
                <em className="serif-i">running live.</em>
              </span>
            </span>
          </h2>
          <div className="lab__aside" data-reveal="fade" data-reveal-delay="0.12">
            <p className="lab__note">
              Every pixel generated in the browser — no images, no video. Each surface is measured live, and sleeps
              the moment it leaves the viewport.
            </p>
            <ul className="lab__meta mono">
              <li>03 surfaces</li>
              <li>00 assets</li>
              <li>1 frame budget</li>
            </ul>
          </div>
        </div>

        <div className="lab__rows">
          {EXPERIMENTS.map(({ Surface, ...experiment }) => (
            <ExperimentRow key={experiment.id} Surface={Surface} {...experiment} />
          ))}
        </div>

        <footer className="lab__foot" data-reveal="fade">
          <span className="mono">End of experiments</span>
          <span className="mono lab__foot-mid">All surfaces idle when offscreen</span>
          <span className="mono">DPR clamped — 2.0</span>
        </footer>
      </div>
    </section>
  );
}
