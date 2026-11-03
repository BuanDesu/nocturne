/**
 * Declarative scroll choreography.
 *
 *   [data-split="chars|words|lines"]  masked text reveal
 *   [data-reveal]                     fade + rise  (data-reveal="fade|scale|up")
 *   [data-reveal-group] > *           staggered children
 *   [data-reveal-mask]                clip-path wipe
 *   [data-parallax="0.2"]             scrub-linked drift
 */
import { useLayoutEffect, type RefObject } from "react";
import { gsap, ScrollTrigger, EASE } from "./scroll";
import { splitText, unsplit, type SplitKind } from "./split";
import { isCoarsePointer, prefersReducedMotion } from "./pointer";

const FOCUSABLE = "a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])";

/** Interactive containers keep full opacity while animating — Tab and screen
 *  readers must be able to reach them even before they scroll into view. */
function isInteractive(node: HTMLElement) {
  return node.matches(FOCUSABLE) || node.querySelector(FOCUSABLE) !== null;
}

export function initReveals(scope: HTMLElement): () => void {
  const animated = new Map<HTMLElement, gsap.core.Tween>();
  const ctx = gsap.context(() => {
    const reduced = prefersReducedMotion();

    scope.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
      const kind = (el.dataset.split as SplitKind) || "words";
      const delay = parseFloat(el.dataset.splitDelay || "0");
      const targets = splitText(el, kind);
      if (reduced) {
        unsplit(el);
        return;
      }

      gsap.fromTo(
        targets,
        { yPercent: 118 },
        {
          yPercent: 0,
          duration: 1.1,
          ease: EASE.expo,
          stagger: kind === "chars" ? 0.022 : 0.03,
          delay,
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
          onComplete: () => unsplit(el),
        },
      );
    });

    scope.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      if (reduced) {
        gsap.set(el, { opacity: 1, y: 0, scale: 1, clearProps: "transform" });
        return;
      }
      const kind = el.dataset.reveal || "up";
      const delay = parseFloat(el.dataset.revealDelay || "0");
      const interactive = isInteractive(el);
      const from =
        kind === "fade"
          ? interactive ? { y: 24 } : { opacity: 0 }
          : kind === "scale"
            ? interactive ? { y: 24 } : { opacity: 0, scale: 0.94 }
            : interactive ? { y: 30 } : { opacity: 0, y: 30 };
      const tween = gsap.fromTo(el, from, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: kind === "fade" ? 1 : 1.15,
        ease: EASE.power3,
        delay,
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
        onComplete: () => {
          el.classList.add("is-revealed");
          animated.delete(el);
        },
      });
      animated.set(el, tween);
    });

    scope.querySelectorAll<HTMLElement>("[data-reveal-group]").forEach((group) => {
      const children = Array.from(group.children) as HTMLElement[];
      if (!children.length) return;
      if (reduced) {
        gsap.set(children, { opacity: 1, y: 0 });
        return;
      }
      children.forEach((child, index) => {
        const interactive = isInteractive(child);
        const tween = gsap.fromTo(
          child,
          interactive ? { y: 26 } : { opacity: 0, y: 26 },
          {
            opacity: 1,
            y: 0,
            duration: 1.05,
            ease: EASE.power3,
            delay: index * parseFloat(group.dataset.revealGroup || "0.08"),
            scrollTrigger: { trigger: group, start: "top 90%", once: true },
            onComplete: () => animated.delete(child),
          },
        );
        animated.set(child, tween);
      });
    });

    scope.querySelectorAll<HTMLElement>("[data-reveal-mask]").forEach((el) => {
      if (reduced) {
        gsap.set(el, { clipPath: "inset(0% 0% 0% 0%)" });
        return;
      }
      gsap.fromTo(
        el,
        { clipPath: "inset(0% 0% 100% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.35,
          ease: EASE.expo,
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        },
      );
    });

    if (!reduced) {
      scope.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
        const speed = parseFloat(el.dataset.parallax || "0.15");
        gsap.fromTo(
          el,
          { yPercent: speed * 50 },
          {
            yPercent: -speed * 50,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 },
          },
        );
      });
    }
  }, scope);

  const revealForFocus = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    animated.forEach((tween, el) => {
      if (!el.contains(target)) return;
      tween.progress(1);
      gsap.set(el, { opacity: 1, y: 0, scale: 1, clipPath: "inset(0% 0% 0% 0%)" });
      animated.delete(el);
    });
  };
  scope.addEventListener("focusin", revealForFocus);

  return () => {
    scope.removeEventListener("focusin", revealForFocus);
    ctx.revert();
  };
}

/** Initialize declarative reveals inside a section once fonts are ready. */
export function useReveals<T extends HTMLElement>(ref: RefObject<T | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    const run = () => {
      if (cancelled || !ref.current) return;
      cleanup = initReveals(ref.current);
    };
    if (document.fonts && document.fonts.status !== "loaded") {
      document.fonts.ready.then(run).catch(run);
    } else {
      run();
    }
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [ref]);
}

/** Magnetic hover — the element eases toward the pointer. */
export function useMagnetic<T extends HTMLElement>(ref: RefObject<T | null>, strength = 0.35) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || isCoarsePointer() || prefersReducedMotion()) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      xTo((e.clientX - (rect.left + rect.width / 2)) * strength);
      yTo((e.clientY - (rect.top + rect.height / 2)) * strength);
    };
    const onLeave = () => { xTo(0); yTo(0); };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(el);
      gsap.set(el, { x: 0, y: 0 });
    };
  }, [ref, strength]);
}

/** Bridge DOM hover targets to the global custom cursor. */
export function bindCursorTargets(scope: HTMLElement) {
  const emit = (intent: string, label = "") =>
    window.dispatchEvent(new CustomEvent("nocturne:cursor", { detail: { intent, label } }));

  const over = (e: Event) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-cursor]");
    if (!target) return;
    emit(target.dataset.cursor || "default", target.dataset.cursorLabel || "");
  };
  const out = (e: Event) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-cursor]");
    if (!target) return;
    emit("default", "");
  };

  scope.addEventListener("pointerover", over);
  scope.addEventListener("pointerout", out);
  return () => {
    scope.removeEventListener("pointerover", over);
    scope.removeEventListener("pointerout", out);
  };
}