import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap, getLenis, prefersReducedMotion } from "../../lib/motion";
import { useArtCanvas } from "./useArtCanvas";
import { PROJECTS, padIndex, projectByIndex } from "./projects";

interface CaseOverlayProps {
  startIndex: number;
  originRect: DOMRect | null;
  getRectForIndex: (index: number) => DOMRect | null;
  onClose: (finalIndex: number) => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function insetFor(rect: DOMRect | null): string {
  if (!rect) return "inset(20% 26% 20% 26%)";
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = Math.max(0, Math.min(vh, rect.top));
  const left = Math.max(0, Math.min(vw, rect.left));
  const right = Math.max(0, Math.min(vw, vw - rect.right));
  const bottom = Math.max(0, Math.min(vh, vh - rect.bottom));
  return "inset(" + top + "px " + right + "px " + bottom + "px " + left + "px)";
}

/**
 * Full-screen case study. The dark preview card the visitor was holding
 * unfolds into the room they are standing in.
 */
export default function CaseOverlay({ startIndex, originRect, getRectForIndex, onClose }: CaseOverlayProps) {
  const [index, setIndex] = useState(startIndex);
  const project = projectByIndex(index);

  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closingRef = useRef(false);
  const indexRef = useRef(index);
  indexRef.current = index;
  const isFirst = useRef(true);

  useArtCanvas(canvasRef, project.id, true);

  /* Lock the page while the room is open. */
  useEffect(() => {
    const lenis = getLenis();
    lenis?.stop();
    document.body.classList.add("is-locked");
    return () => {
      document.body.classList.remove("is-locked");
      lenis?.start();
    };
  }, []);

  /* The page behind the room is inert to pointers and to assistive tech. */
  useEffect(() => {
    const main = document.getElementById("main");
    const nav = document.querySelector<HTMLElement>(".nav");
    main?.setAttribute("inert", "");
    main?.setAttribute("aria-hidden", "true");
    nav?.setAttribute("inert", "");
    return () => {
      main?.removeAttribute("inert");
      main?.removeAttribute("aria-hidden");
      nav?.removeAttribute("inert");
    };
  }, []);

  /* Unfold from the preview card (or the row) into the viewport. */
  useEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root) return;
    closeRef.current?.focus({ preventScroll: true });

    if (prefersReducedMotion()) {
      gsap.set(root, { clipPath: "inset(0px 0px 0px 0px)" });
      gsap.set(content, { autoAlpha: 1, y: 0 });
      return;
    }

    gsap.set(root, { clipPath: insetFor(originRect) });
    gsap.set(content, { opacity: 0, y: 16 });
    const tl = gsap.timeline();
    tl.to(root, { clipPath: "inset(0px 0px 0px 0px)", duration: 1.02, ease: "expo.inOut" }).to(
      content,
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
      0.3,
    );
    return () => {
      tl.kill();
    };
  }, [originRect]);

  /* After switching projects: return to the top and let the heading speak. */
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const scroll = scrollRef.current;
    scroll?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    const id = window.requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(id);
  }, [index]);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const root = rootRef.current;
    const content = contentRef.current;
    const finish = () => onClose(indexRef.current);

    if (!root || !content || prefersReducedMotion()) {
      finish();
      return;
    }

    const target = getRectForIndex(indexRef.current) ?? originRect;
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(content, { autoAlpha: 0, y: 12, duration: 0.3, ease: "power2.in" }, 0).to(
      root,
      { clipPath: insetFor(target), duration: 0.76, ease: "expo.inOut" },
      0.05,
    );
  }, [getRectForIndex, onClose, originRect]);

  /* Escape closes; Tab stays inside the dialog. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      const scroll = scrollRef.current;
      if (scroll && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const page = window.innerHeight * 0.82;
        const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
        const key = event.key;
        if (key === "PageDown" || key === "PageUp" || key === "ArrowDown" || key === "ArrowUp" || key === "Home" || key === "End") {
          event.preventDefault();
          if (key === "PageDown") scroll.scrollBy({ top: page, behavior });
          else if (key === "PageUp") scroll.scrollBy({ top: -page, behavior });
          else if (key === "ArrowDown") scroll.scrollBy({ top: 88, behavior });
          else if (key === "ArrowUp") scroll.scrollBy({ top: -88, behavior });
          else if (key === "Home") scroll.scrollTo({ top: 0, behavior });
          else scroll.scrollTo({ top: scroll.scrollHeight, behavior });
          return;
        }
      }
      if (event.key !== "Tab") return;
      const root = rootRef.current;
      if (!root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null || node === document.activeElement,
      );
      if (nodes.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const root = rootRef.current;
      if (!root || closingRef.current) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        closeRef.current?.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [close]);

  const next = () => {
    setIndex((value) => (value + 1) % PROJECTS.length);
  };

  const nextProject = projectByIndex(index + 1);

  return createPortal(
    <div
      className="case"
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-title"
      tabIndex={-1}
    >
      <div className="case__scroll" ref={scrollRef} data-lenis-prevent>
        <div className="case__content" ref={contentRef}>
          <header className="case__bar">
            <span className="mono case__bar-label">03 / Index — Case study</span>
            <span className="mono case__bar-count">
              {padIndex(index)} / {padIndex(PROJECTS.length - 1)}
            </span>
            <button
              type="button"
              className="case__close"
              ref={closeRef}
              onClick={close}
              aria-label="Close case study"
              data-cursor="link"
            >
              <span className="mono">Close</span>
              <span className="case__close-icon" aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </span>
            </button>
          </header>

          <div className="case__head" key={"head-" + project.id}>
            <div className="case__title-block">
              <p className="mono case__kicker">{project.discipline}</p>
              <h2 className="case__title serif" id="case-title" ref={titleRef} tabIndex={-1}>
                {project.name}
              </h2>
              <p className="case__deck serif-i">{project.deck}</p>
            </div>
            <dl className="case__meta">
              <div className="case__meta-item">
                <dt className="mono">Year</dt>
                <dd>{project.year}</dd>
              </div>
              <div className="case__meta-item">
                <dt className="mono">Role</dt>
                <dd>{project.role}</dd>
              </div>
              <div className="case__meta-item">
                <dt className="mono">Stack</dt>
                <dd>{project.stack.join(" · ")}</dd>
              </div>
              <div className="case__meta-item">
                <dt className="mono">Studio</dt>
                <dd>Nocturne — Shanghai</dd>
              </div>
            </dl>
          </div>

          <figure className="case__figure" key={"art-" + project.id}>
            <div className="case__figure-stage">
              <canvas className="case__canvas" ref={canvasRef} aria-hidden="true" />
              <span className="case__figure-grain" aria-hidden="true" />
              <span className="case__figure-corner case__figure-corner--tl" aria-hidden="true" />
              <span className="case__figure-corner case__figure-corner--tr" aria-hidden="true" />
              <span className="case__figure-corner case__figure-corner--bl" aria-hidden="true" />
              <span className="case__figure-corner case__figure-corner--br" aria-hidden="true" />
            </div>
            <figcaption className="mono case__caption">
              Fig. {padIndex(index)} — {project.name} / generative study, drawn live
            </figcaption>
          </figure>

          <div className="case__body" key={"body-" + project.id}>
            <div className="case__copy">
              {project.paragraphs.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <aside className="case__notes" aria-label="Project notes">
              <p className="mono case__notes-title">In the frame</p>
              <ul>
                {project.highlights.map((highlight) => (
                  <li key={highlight.label}>
                    <span className="mono">{highlight.label}</span>
                    <span className="serif case__notes-value">{highlight.value}</span>
                  </li>
                ))}
              </ul>
              <p className="mono case__notes-tags">{project.tags.join("  /  ")}</p>
            </aside>
          </div>

          <div className="case__foot">
            <button type="button" className="case__next" onClick={next} data-cursor="link">
              <span className="mono case__next-label">Next case</span>
              <span className="case__next-name serif">{nextProject.name}</span>
              <span className="mono case__next-disc">{nextProject.discipline}</span>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
            <span className="mono case__esc">Esc to close</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
