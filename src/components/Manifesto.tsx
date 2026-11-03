import { useEffect, useRef } from "react";
import { bindCursorTargets, gsap, useReveals } from "../lib/motion";
import { prefersReducedMotion } from "../lib/pointer";
import Marquee from "./Marquee";
import "../styles/manifesto.css";

const PRINCIPLES = [
  { index: "01", name: "Restraint", text: "Remove until only the necessary remains." },
  { index: "02", name: "Rhythm", text: "Space and time share a single measure." },
  { index: "03", name: "Honesty", text: "The mechanism is never hidden." },
  { index: "04", name: "Detail", text: "A hairline is a decision, not a default." },
];

const STATS = [
  { value: "06", label: "Movements", note: "One page, six." },
  { value: "03", label: "Live experiments", note: "Running in the Lab." },
  { value: "00", label: "Templates", note: "Every line set by hand." },
];

const BAND = ["Motion is meaning", "Light is material"];

/**
 * 01 — Manifesto.
 * The first light section: a printed monograph page turned open. A three-line
 * statement, four principles, three figures, a rotating seal; it closes on a
 * full-bleed marquee that hands the page back to the dark.
 */
export default function Manifesto() {
  const sectionRef = useRef<HTMLElement>(null);
  const statementRef = useRef<HTMLHeadingElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  useReveals(sectionRef);

  /* Statement: masked line rise + the hand-drawn underline on "felt". */
  useEffect(() => {
    const statement = statementRef.current;
    if (!statement || prefersReducedMotion()) return;
    const felt = statement.querySelector<HTMLElement>(".manifesto__felt");
    const underline = statement.querySelector<SVGPathElement>(".manifesto__underline path");
    const replay = () => {
      if (!underline) return;
      gsap.fromTo(
        underline,
        { strokeDashoffset: 150 },
        { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut", overwrite: true },
      );
    };
    felt?.addEventListener("pointerenter", replay);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        statement.querySelectorAll<HTMLElement>(".manifesto__line-in"),
        { yPercent: 112 },
        {
          yPercent: 0,
          duration: 1.3,
          ease: "expo.out",
          stagger: 0.13,
          scrollTrigger: { trigger: statement, start: "top 87%", once: true },
        },
      );
      gsap.fromTo(
        ".manifesto__underline path",
        { strokeDashoffset: 150 },
        {
          strokeDashoffset: 0,
          duration: 1.15,
          ease: "power2.inOut",
          delay: 0.5,
          scrollTrigger: { trigger: statement, start: "top 87%", once: true },
        },
      );
    }, statement);
    return () => {
      felt?.removeEventListener("pointerenter", replay);
      ctx.revert();
    };
  }, []);

  /* The seal keeps time; hovering it briefly runs it faster. */
  useEffect(() => {
    const seal = sealRef.current;
    const ring = seal?.querySelector<SVGGElement>(".seal__spin");
    if (!seal || !ring || prefersReducedMotion()) return;

    const tween = gsap.to(ring, {
      rotation: 360,
      svgOrigin: "100 100",
      duration: 54,
      ease: "none",
      repeat: -1,
    });

    const speed = { value: 1 };
    let speedTween: gsap.core.Tween | null = null;
    const easeSpeed = (value: number) => {
      speedTween?.kill();
      speedTween = gsap.to(speed, {
        value,
        duration: 0.9,
        ease: "power2.out",
        onUpdate: () => tween.timeScale(speed.value),
      });
    };
    const enter = () => easeSpeed(2.4);
    const leave = () => easeSpeed(1);
    seal.addEventListener("pointerenter", enter);
    seal.addEventListener("pointerleave", leave);

    return () => {
      tween.kill();
      speedTween?.kill();
      seal.removeEventListener("pointerenter", enter);
      seal.removeEventListener("pointerleave", leave);
    };
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;
    return bindCursorTargets(sectionRef.current);
  }, []);

  return (
    <section className="section theme-bone manifesto" id="manifesto" aria-label="Manifesto" ref={sectionRef}>
      <div className="container manifesto__inner">
        <div className="manifesto__top mono" data-reveal="fade">
          <span>01 / Manifesto</span>
          <span>MMXXV — Shanghai</span>
        </div>

        <div className="manifesto__hero">
          <h2 className="manifesto__statement display" ref={statementRef}>
            <span className="manifesto__line">
              <span className="manifesto__line-in">The best interfaces</span>
            </span>
            <span className="manifesto__line">
              <span className="manifesto__line-in">
                are <em className="manifesto__felt">felt
                  <svg className="manifesto__underline" viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    <path d="M2 8.4C20 4.2 42 9.8 61 6.6S100 3.6 118 8" />
                  </svg>
                </em> before
              </span>
            </span>
            <span className="manifesto__line">
              <span className="manifesto__line-in">they are read.</span>
            </span>
          </h2>

          <aside className="manifesto__aside">
            <div className="manifesto__seal" ref={sealRef} data-reveal="scale" data-reveal-delay="0.2" aria-hidden="true">
              <svg viewBox="0 0 200 200" role="presentation" aria-hidden="true" focusable="false">
                <defs>
                  <path id="manifesto-seal-path" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" fill="none" />
                </defs>
                <circle className="seal__ring" cx="100" cy="100" r="96" />
                <circle className="seal__ring seal__ring--inner" cx="100" cy="100" r="58" />
                <g className="seal__spin">
                  <text className="seal__text">
                    <textPath href="#manifesto-seal-path" startOffset="0">NOCTURNE · FRONT-END CRAFT · NOCTURNE · FRONT-END CRAFT ·</textPath>
                  </text>
                  <circle className="seal__dot" cx="100" cy="22" r="2.6" />
                </g>
                <g className="seal__center">
                  <text className="seal__monogram" x="100" y="119" textAnchor="middle">N</text>
                  <circle className="seal__monogram-dot" cx="139" cy="96" r="3" />
                </g>
              </svg>
            </div>

            <p className="manifesto__lede" data-reveal data-reveal-delay="0.1">
              We build for the half-second before understanding — the weight of a page turning, a line of type
              arriving, a button that resists the hand. Most of that work is invisible. All of it is deliberate.
              This is a study in that margin: six movements, made by hand.
            </p>

            <dl className="manifesto__spec" data-reveal data-reveal-delay="0.2">
              <div className="manifesto__spec-row">
                <dt className="mono">Set in</dt>
                <dd>Instrument Serif &amp; Sans</dd>
              </div>
              <div className="manifesto__spec-row">
                <dt className="mono">Built with</dt>
                <dd>Hand-written CSS</dd>
              </div>
              <div className="manifesto__spec-row">
                <dt className="mono">Measured in</dt>
                <dd>Milliseconds</dd>
              </div>
            </dl>
          </aside>
        </div>

        <ol className="manifesto__principles" aria-label="Four principles" data-reveal-group="0.07">
          {PRINCIPLES.map((principle) => (
            <li className="manifesto__principle" key={principle.index}>
              <span className="manifesto__principle-index mono" aria-hidden="true">{principle.index}</span>
              <h3 className="manifesto__principle-name serif">
                <span className="roll">
                  <span className="roll__inner">
                    <span className="roll__a">{principle.name}</span>
                    <span className="roll__b" aria-hidden="true">{principle.name}</span>
                  </span>
                </span>
              </h3>
              <p className="manifesto__principle-text">{principle.text}</p>
              <span className="manifesto__principle-arrow" aria-hidden="true">↗</span>
            </li>
          ))}
        </ol>

        <div className="manifesto__stats">
          {STATS.map((stat, index) => (
            <div className="manifesto__stat" key={stat.label} data-reveal data-reveal-delay={index * 0.08}>
              <span className="manifesto__stat-num serif num">{stat.value}</span>
              <span className="manifesto__stat-label mono">{stat.label}</span>
              <span className="manifesto__stat-note">{stat.note}</span>
            </div>
          ))}
          <p className="manifesto__quote serif-i" data-reveal data-reveal-delay="0.2">
            The page is the proof.
          </p>
        </div>
      </div>

      <div className="manifesto__band">
        <Marquee items={BAND} speed={58} />
      </div>
      <p className="sr-only">Motion is meaning. Light is material.</p>
    </section>
  );
}