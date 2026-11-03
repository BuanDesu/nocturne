import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion, scrollToTarget, useReveals } from "../lib/motion";
import { isCoarsePointer, subscribePointer } from "../lib/pointer";
import { clamp, damp } from "../lib/utils";
import { PROJECTS, padIndex } from "./work/projects";
import { useArtCanvas } from "./work/useArtCanvas";
import CaseOverlay from "./work/CaseOverlay";
import "../styles/work.css";

const CARD_GAP = 82;

/**
 * 03 / Index — a monograph index. Five lines of type, hairlines, and a
 * generative preview that leans toward the cursor.
 */
export default function Work() {
  const sectionRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeRef = useRef<number | null>(null);
  const position = useRef({ x: 0, y: 0, rotation: 0, w: 320, h: 396, placed: false });

  const [preview, setPreview] = useState<number | null>(null);
  const [overlay, setOverlay] = useState<{ index: number; rect: DOMRect | null } | null>(null);

  useReveals(sectionRef);
  useArtCanvas(previewCanvasRef, PROJECTS[preview ?? 0].id, preview !== null);

  /* The statement rises line by line, masks intact. */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".index__statement-inner",
        { yPercent: 112 },
        {
          yPercent: 0,
          duration: 1.4,
          ease: "expo.out",
          stagger: 0.1,
          scrollTrigger: { trigger: ".index__statement", start: "top 88%", once: true },
        },
      );
    }, section);
    return () => ctx.revert();
  }, []);

  /* Keep the preview card under a damped cursor, flipping sides near the edge. */
  useEffect(() => {
    const reduce = prefersReducedMotion();
    return subscribePointer((pointer, dt) => {
      if (activeRef.current === null) return;
      const el = previewRef.current;
      if (!el) return;

      const { w, h } = position.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const edge = 18;
      const topSafe = Math.max(84, vh * 0.12);

      let x = pointer.x + w / 2 + CARD_GAP;
      if (x + w / 2 > vw - edge) x = pointer.x - w / 2 - CARD_GAP;
      x = clamp(x, w / 2 + edge, vw - w / 2 - edge);
      let y = pointer.y - h * 0.06;
      y = clamp(y, h / 2 + topSafe, vh - h / 2 - edge);

      const seconds = Math.min(0.064, dt / 1000);
      if (!position.current.placed || reduce) {
        position.current.x = x;
        position.current.y = y;
        position.current.placed = true;
      } else {
        position.current.x = damp(position.current.x, x, 16, seconds);
        position.current.y = damp(position.current.y, y, 16, seconds);
      }

      const targetRotation = reduce ? 0 : clamp(pointer.vx * 9, -5, 5);
      position.current.rotation = reduce
        ? 0
        : damp(position.current.rotation, targetRotation, 12, seconds);

      el.style.transform =
        "translate3d(" + position.current.x.toFixed(2) + "px, " + position.current.y.toFixed(2) +
        "px, 0) translate(-50%, -50%) rotate(" + position.current.rotation.toFixed(2) + "deg)";
    });
  }, []);

  /* Measure the card once for the clamp maths. */
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width && rect.height) {
        position.current.w = rect.width;
        position.current.h = rect.height;
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const activate = (index: number) => {
    position.current.placed = false;
    activeRef.current = index;
    setPreview(index);
  };

  const deactivate = () => {
    activeRef.current = null;
    setPreview(null);
  };

  /* Scrolling without moving the pointer releases the preview card. */
  useEffect(() => {
    const release = () => {
      if (activeRef.current !== null) deactivate();
    };
    window.addEventListener("scroll", release, { passive: true });
    return () => window.removeEventListener("scroll", release);
  }, []);

  const openCase = (index: number) => {
    const fromPreview = preview === index && !isCoarsePointer();
    const rect = fromPreview
      ? previewRef.current?.getBoundingClientRect() ?? null
      : rowRefs.current[index]?.getBoundingClientRect() ?? null;
    deactivate();
    setOverlay({ index, rect });
  };

  const closeCase = useCallback((finalIndex: number) => {
    setOverlay(null);
    window.requestAnimationFrame(() => {
      rowRefs.current[finalIndex]?.focus({ preventScroll: true });
    });
  }, []);

  const rectForIndex = useCallback((index: number) => {
    return rowRefs.current[index]?.getBoundingClientRect() ?? null;
  }, []);

  const current = PROJECTS[preview ?? 0];

  return (
    <section className="section theme-bone index" id="index" aria-label="Index" ref={sectionRef}>
      <div className="container">
        <div className="index__label-row" data-reveal="fade">
          <span className="eyebrow index__label">03 / Index</span>
          <span className="mono index__label-right">Selected work — MMXXII / MMXXV</span>
        </div>

        <div className="index__intro">
          <h2 className="index__statement" aria-label="Selected transmissions.">
            <span className="index__statement-line index__statement-line--indent">
              <span className="index__statement-inner serif">Selected</span>
            </span>
            <span className="index__statement-line">
              <span className="index__statement-inner serif-i">transmissions.</span>
            </span>
          </h2>
          <div className="index__intro-side" data-reveal="up" data-reveal-delay="0.2">
            <p className="index__lead">
              Five projects, filed by year — each a different negotiation between type, motion and
              material. Hover a line to see the study; open the case for the full account.
            </p>
            <p className="index__hint mono">
              <span className="index__hint-dot" aria-hidden="true" />
              <span className="index__hint-fine">Hover to preview — enter to open</span>
              <span className="index__hint-touch">Tap a line to open the case</span>
            </p>
          </div>
        </div>

        <ol
          className={"index__list" + (preview !== null ? " is-previewing" : "")}
          data-reveal-group="0.075"
          aria-label="Selected projects"
          onPointerLeave={deactivate}
        >
          {PROJECTS.map((project, index) => (
            <li className="index__row" key={project.id} data-active={preview === index}>
              <button
                type="button"
                className="index__row-btn"
                ref={(node) => {
                  rowRefs.current[index] = node;
                }}
                onPointerEnter={() => activate(index)}
                onClick={() => openCase(index)}
                data-cursor="view"
                data-cursor-label="Open"
                aria-haspopup="dialog"
                aria-label={"Open case study: " + project.name + " — " + project.discipline + ", " + project.year}
              >
                <span className="index__num mono">{padIndex(index)}</span>
                <span className="index__name serif">{project.name}</span>
                <span className="index__disc">{project.discipline}</span>
                <span className="index__year mono">{project.year}</span>
                <span className="index__arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                    <path d="M6 18L18 6M18 6H8.5M18 6v9.5" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div
          className={"index__end" + (preview !== null ? " is-previewing" : "")}
          data-reveal="up"
        >
          <span className="mono index__end-count">End of index — 05 entries</span>
          <span className="mono index__end-note">Every mark generated in the browser. No images.</span>
          <button
            type="button"
            className="index__end-link"
            onClick={() => scrollToTarget("#coda")}
            data-cursor="link"
          >
            <span>Start a project</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 10L10 2M10 2H4.5M10 2v5.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={"index__preview" + (preview !== null ? " is-active" : "")}
        ref={previewRef}
        aria-hidden="true"
      >
        <div className="index__preview-inner">
          <div className="index__preview-art">
            <canvas className="index__preview-canvas" ref={previewCanvasRef} />
            <span className="index__preview-wipe" key={preview ?? "none"} />
            <span className="index__preview-tag mono">Preview — {padIndex(preview ?? 0)}</span>
            <span className="index__preview-cross" />
          </div>
          <div className="index__preview-meta">
            <span className="index__preview-name serif">{current.name}</span>
            <span className="index__preview-info mono">
              {current.discipline}
              <br />
              {current.year}
            </span>
          </div>
        </div>
      </div>

      {overlay !== null ? (
        <CaseOverlay
          startIndex={overlay.index}
          originRect={overlay.rect}
          getRectForIndex={rectForIndex}
          onClose={closeCase}
        />
      ) : null}

      <span className="sr-only" role="note">
        Five projects: Lumen, Halcyon, Meridian, Sable and Orbit.
      </span>

      <span className="index__list-ghost" aria-hidden="true">
        Index — five selected works
      </span>
    </section>
  );
}
