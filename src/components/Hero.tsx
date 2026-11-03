import { useEffect, useRef } from "react";
import { GLStage } from "../lib/gl";
import { gsap, ScrollTrigger, scrollToTarget, splitText, unsplit, reducedMotion } from "../lib/motion";
import { isCoarsePointer, subscribePointer } from "../lib/pointer";
import { damp } from "../lib/utils";
import heroFrag from "../shaders/hero.frag?raw";
import "../styles/hero.css";

const MOVEMENTS = [
  { id: "#manifesto", index: "01", label: "Manifesto" },
  { id: "#lab", index: "02", label: "Lab" },
  { id: "#index", index: "03", label: "Index" },
  { id: "#craft", index: "04", label: "Craft" },
  { id: "#coda", index: "05", label: "Coda" },
];

export default function Hero({ ready }: { ready: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const asideRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<GLStage | null>(null);
  const scrollProgress = useRef(0);
  const intro = useRef(0);
  const introTarget = useRef(0);
  const mouse = useRef({ x: 0, y: 0 });

  /* WebGL stage */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let stage: GLStage;
    try {
      stage = new GLStage(canvas, {
        frag: heroFrag,
        maxDpr: Math.min(window.devicePixelRatio || 1, isCoarsePointer() ? 1.5 : 1.9),
        autoStart: false,
      });
    } catch (error) {
      console.warn("[hero] WebGL unavailable", error);
      return;
    }
    stageRef.current = stage;

    stage.frameCallback = (time, dt, surface) => {
      intro.current = damp(intro.current, introTarget.current, 3.2, dt);
      const aspect = surface.width / Math.max(1, surface.height);
      surface.set("uRes", [surface.width, surface.height]);
      surface.set("uTime", time);
      surface.set("uMouse", [mouse.current.x * 0.5 * aspect, -mouse.current.y * 0.5]);
      surface.set("uIntro", reducedMotion() ? 1 : intro.current);
      surface.set("uScroll", scrollProgress.current);
      if (reducedMotion()) surface.pauseLoop();
    };

    if (!reducedMotion()) stage.start();
    else {
      intro.current = 1;
      introTarget.current = 1;
      stage.renderOnce();
    }

    const unsubscribe = subscribePointer((pointer) => {
      mouse.current.x = pointer.sx;
      mouse.current.y = pointer.sy;
    });

    return () => {
      unsubscribe();
      stage.destroy();
      stageRef.current = null;
    };
  }, []);

  /* Intro timeline once the preloader lifts */
  useEffect(() => {
    if (!ready) return;
    introTarget.current = 1;
    const word = wordRef.current;
    if (!word) return;

    const reduced = reducedMotion();
    const chars = splitText(word, "chars");

    if (reduced) {
      unsplit(word);
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.fromTo(".hero__top > *", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.09 }, 0.15)
      .fromTo(chars, { yPercent: 118, rotate: 5 }, { yPercent: 0, rotate: 0, duration: 1.45, stagger: 0.048 }, 0.2)
      .fromTo(asideRef.current, { autoAlpha: 0, x: 34 }, { autoAlpha: 1, x: 0, duration: 1.2 }, 0.65)
      .fromTo(".hero__footer > *", { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 1.05, stagger: 0.1 }, 0.8)
      .fromTo(".hero__asterisk", { autoAlpha: 0, scale: 0.4, rotate: -120 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.1 }, 1.15)
      .fromTo(".hero__side", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 1.3)
      .call(() => unsplit(word));

    return () => { tl.kill(); };
  }, [ready]);

  /* Scroll choreography */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const ctx = gsap.context(() => {
      if (reducedMotion()) return;
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => { scrollProgress.current = self.progress; },
      });
      gsap.to(contentRef.current, {
        yPercent: -14,
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(canvasRef.current, {
        scale: 1.12,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true },
      });
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" id="overture" ref={sectionRef} aria-label="Overture">
      <canvas className="hero__canvas" ref={canvasRef} aria-hidden="true" />
      <div className="hero__veil" aria-hidden="true" />
      <div className="hero__content" ref={contentRef}>
        <div className="hero__top mono">
          <span>Front-end craft</span>
          <span className="hero__top-mid">Independent studio — MMXXV</span>
          <span>Edition 01 / 06</span>
        </div>

        <div className="hero__main">
          <h1 className="hero__title" aria-label="Nocturne">
            <span className="hero__word" ref={wordRef}>Nocturne</span>
            <span className="hero__asterisk" aria-hidden="true">✳</span>
          </h1>

          <div className="hero__aside" ref={asideRef}>
            <p className="hero__tag">
              <span className="serif-i">A study in motion &amp; light</span>
              <span className="hero__tag-body">Six movements, built by hand.</span>
            </p>
            <ol className="hero__index" aria-label="Movements">
              {MOVEMENTS.map((movement) => (
                <li key={movement.id}>
                  <a
                    href={movement.id}
                    onClick={(event) => { event.preventDefault(); scrollToTarget(movement.id); }}
                    data-cursor="link"
                  >
                    <span className="hero__index-num mono">{movement.index}</span>
                    <span className="hero__index-label">{movement.label}</span>
                    <span className="hero__index-line" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="hero__footer">
          <p className="hero__lede">
            We compose interfaces where <em>type, motion and light</em> behave as one material — designed for the
            considered web, measured in milliseconds.
          </p>
          <div className="hero__actions">
            <button
              className="hero__cta"
              onClick={() => scrollToTarget("#index")}
              data-cursor="link"
              type="button"
            >
              <span>Explore the index</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 12L12 2M12 2H4.5M12 2v7.5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
            <div className="hero__cue" aria-hidden="true">
              <span className="mono">Scroll</span>
              <span className="hero__cue-track"><span className="hero__cue-dot" /></span>
            </div>
          </div>
          <div className="hero__status">
            <span className="pill"><span className="dot-live" aria-hidden="true" />Available for select collaborations</span>
          </div>
        </div>
      </div>
      <span className="hero__side mono" aria-hidden="true">31.2304° N — 121.4737° E</span>
    </section>
  );
}
