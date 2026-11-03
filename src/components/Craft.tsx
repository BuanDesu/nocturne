import { useEffect, useRef, useState, type CSSProperties } from "react";
import { bindCursorTargets, useReveals } from "../lib/motion";
import { prefersReducedMotion } from "../lib/pointer";
import { pad } from "../lib/utils";
import CraftCell from "./craft/CraftCell";
import MagneticButton from "./craft/MagneticButton";
import ElasticToggle from "./craft/ElasticToggle";
import TiltCard from "./craft/TiltCard";
import EasingCurve from "./craft/EasingCurve";
import TypeTester from "./craft/TypeTester";
import PaletteSwatches from "./craft/PaletteSwatches";
import FrameMeter from "./craft/FrameMeter";
import VelocityRibbon from "./craft/VelocityRibbon";
import "../styles/craft.css";

/**
 * 04 — Craft. Eight small instruments in an asymmetric bento. Each bay is a
 * working demo, not an image; the header counts how many you have touched.
 */
export default function Craft() {
  const sectionRef = useRef<HTMLElement>(null);
  const bentoRef = useRef<HTMLDivElement>(null);
  const [visited, setVisited] = useState<Set<number>>(() => new Set());
  const [reduced] = useState(() => prefersReducedMotion());

  useReveals(sectionRef);

  useEffect(() => {
    const bento = bentoRef.current;
    if (!bento) return;
    const mark = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const cell = target?.closest<HTMLElement>("[data-craft-cell]");
      if (!cell) return;
      const index = Number(cell.dataset.craftCell);
      if (!Number.isFinite(index)) return;
      setVisited((current) => {
        if (current.has(index)) return current;
        const next = new Set(current);
        next.add(index);
        return next;
      });
    };
    bento.addEventListener("pointerdown", mark);
    bento.addEventListener("keydown", mark);
    return () => {
      bento.removeEventListener("pointerdown", mark);
      bento.removeEventListener("keydown", mark);
    };
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;
    return bindCursorTargets(sectionRef.current);
  }, []);

  const explored = visited.size;
  const progress = explored / 8;

  return (
    <section className="section craft" id="craft" aria-label="Craft" ref={sectionRef}>
      <div className="container craft__inner">
        <div className="craft__top mono" data-reveal="fade">
          <span>04 / Craft</span>
          <span className="craft__top-mid">Eight instruments — all live</span>
          <span className="craft__top-hint">Nothing pre-rendered</span>
        </div>

        <div className="craft__intro">
          <h2 className="craft__statement display">
            <span className="craft__line" data-reveal>Small instruments,</span>
            <span className="craft__line" data-reveal data-reveal-delay="0.08">
              <em className="serif-i">built to be touched.</em>
            </span>
          </h2>

          <div className="craft__side">
            <p className="craft__lede" data-reveal data-reveal-delay="0.12">
              No screenshots, no mockups. Every bay below is wired to the page you are reading — pull it, drag it,
              copy from it. All of it is generated in the browser, and none of it survives a reload.
            </p>
            <div className="craft__meter" data-reveal data-reveal-delay="0.2" aria-hidden="true">
              <p className="craft__meter-row mono">
                <span>Touched</span>
                <span className="craft__meter-count">
                  {pad(explored)} <i>/ 08</i>
                </span>
              </p>
              <span className="craft__meter-track">
                <span className="craft__meter-fill" style={{ transform: `scaleX(${progress})` } as CSSProperties} />
              </span>
            </div>
          </div>
        </div>

        <div
          className="craft__bento"
          ref={bentoRef}
          {...(reduced ? {} : { "data-reveal-mask": "" })}
        >
          <CraftCell index="01" label="Magnetic button" hint="Move" variant="craft__cell--magnet" touched={visited.has(1)}>
            <MagneticButton />
          </CraftCell>
          <CraftCell index="02" label="Elastic toggle" hint="Drag / tap" variant="craft__cell--toggle" touched={visited.has(2)}>
            <ElasticToggle />
          </CraftCell>
          <CraftCell index="03" label="Tilt + spotlight" hint="Tilt" variant="craft__cell--tilt" touched={visited.has(3)}>
            <TiltCard />
          </CraftCell>
          <CraftCell index="04" label="Easing curve" hint="3 presets" variant="craft__cell--easing" touched={visited.has(4)}>
            <EasingCurve />
          </CraftCell>
          <CraftCell index="05" label="Type tester" hint="Slide" variant="craft__cell--type" touched={visited.has(5)}>
            <TypeTester />
          </CraftCell>
          <CraftCell index="06" label="Palette" hint="Click to copy" variant="craft__cell--palette" touched={visited.has(6)}>
            <PaletteSwatches />
          </CraftCell>
          <CraftCell index="07" label="Frame meter" hint="Live" variant="craft__cell--frame" touched={visited.has(7)}>
            <FrameMeter />
          </CraftCell>
          <CraftCell index="08" label="Scroll velocity" hint="Scroll" variant="craft__cell--velocity" touched={visited.has(8)}>
            <VelocityRibbon />
          </CraftCell>
        </div>

        <footer className="craft__foot mono" data-reveal>
          <span>CSS transforms · Canvas 2D · spring integration</span>
          <span>Nothing here is a screenshot.</span>
        </footer>
      </div>
    </section>
  );
}