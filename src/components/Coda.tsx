import { useCallback, useEffect, useRef, useState } from "react";
import {
  gsap,
  prefersReducedMotion,
  scrollToTarget,
  useMagnetic,
  useReveals,
} from "../lib/motion";
import { prefersReducedMotion as reduceMotion } from "../lib/pointer";
import "../styles/coda.css";

const EMAIL = "hello@nocturne.studio";
const MAILTO = "mailto:hello@nocturne.studio?subject=Project%20inquiry%20%E2%80%94%20Nocturne";

const STUDIO = ["Nocturne — independent practice", "128 Anfu Road, Xuhui", "Shanghai 200031, CN"];

const INDEX_LINKS = [
  { id: "#manifesto", index: "01", label: "Manifesto" },
  { id: "#lab", index: "02", label: "Lab" },
  { id: "#index", index: "03", label: "Index" },
  { id: "#craft", index: "04", label: "Craft" },
  { id: "#coda", index: "05", label: "Contact" },
];

const ELSEWHERE = [
  { label: "Instagram", href: "https://www.instagram.com" },
  { label: "Are.na", href: "https://www.are.na" },
  { label: "Read.cv", href: "https://read.cv" },
  { label: "GitHub", href: "https://github.com" },
];

const CLOCK = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Shanghai",
});

const clockText = () => CLOCK.format(new Date());

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, k: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * k),
  Math.round(a[1] + (b[1] - a[1]) * k),
  Math.round(a[2] + (b[2] - a[2]) * k),
];
const rgba = (color: RGB, alpha: number) =>
  "rgba(" + color[0] + "," + color[1] + "," + color[2] + "," + Math.max(0, Math.min(1, alpha)).toFixed(3) + ")";

/**
 * 05 / Coda — the plane lands. A statement, a magnetic aperture to start a
 * project, an honest footer, and the wordmark cropped by the page edge.
 */
export default function Coda() {
  const sectionRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const ringRef = useRef<HTMLCanvasElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const [toast, setToast] = useState<string | null>(null);

  useReveals(sectionRef);
  useMagnetic(ctaRef, 0.24);

  /* Statement arrives line by line, masks intact. */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".coda__line-inner",
        { yPercent: 112 },
        {
          yPercent: 0,
          duration: 1.5,
          ease: "expo.out",
          stagger: 0.1,
          scrollTrigger: { trigger: ".coda__statement", start: "top 88%", once: true },
        },
      );
    }, section);
    return () => ctx.revert();
  }, []);

  /* Local time, Shanghai. Written straight to the DOM — no re-renders. */
  useEffect(() => {
    const tick = () => {
      if (clockRef.current) clockRef.current.textContent = clockText();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  /* The aperture: rings that bend toward the pointer, acid on hover. */
  useEffect(() => {
    const canvas = ringRef.current;
    const cta = ctaRef.current;
    if (!canvas || !cta) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduced = reduceMotion();
    let width = 0;
    let height = 0;
    let dpr = 0;
    let visible = true;
    let raf = 0;
    let hover = 0;
    let hoverTarget = 0;
    let localX = 0;
    let localY = 0;
    let t = 0;
    let last = performance.now();

    const draw = (dt: number) => {
      if (!width || !height) return;
      const ease = reduced ? 1 : 1 - Math.exp(-7 * Math.min(0.064, dt));
      hover += (hoverTarget - hover) * ease;
      const min = Math.min(width, height);
      const cx = width / 2;
      const cy = height / 2;

      const bg = mix([11, 11, 17], [218, 255, 62], hover);
      ctx.fillStyle = "rgb(" + bg[0] + "," + bg[1] + "," + bg[2] + ")";
      ctx.fillRect(0, 0, width, height);

      const stroke = mix([239, 233, 220], [11, 11, 17], hover);
      const rings = 15;
      const speed = 0.16 + hover * 0.9;
      for (let i = 0; i < rings; i++) {
        const base = min * 0.055 + i * min * 0.031;
        const phase = t * speed + i * 0.34;
        const alpha = (0.3 - i * 0.011) * (0.62 + 0.38 * hover) + 0.035;
        ctx.beginPath();
        const segments = 84;
        for (let a = 0; a <= segments; a++) {
          const angle = (a / segments) * Math.PI * 2;
          const wave = Math.sin(angle * 3 + phase) * 0.014 + Math.sin(angle * 5 - phase * 1.4) * 0.008;
          const align = Math.cos(angle) * localX + Math.sin(angle) * localY;
          const pull = hover * 0.16 * Math.max(0, align) * (1 - (i / rings) * 0.55);
          const radius = base * (1 + wave + pull);
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = rgba(stroke, Math.max(0.02, alpha));
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      /* A quiet centre so the label stays legible over the field. */
      const veil = ctx.createRadialGradient(cx, cy, 0, cx, cy, min * 0.3);
      veil.addColorStop(0, rgba(bg, 0.92));
      veil.addColorStop(0.5, rgba(bg, 0.55));
      veil.addColorStop(1, rgba(bg, 0));
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, width, height);

      const accent = mix([218, 255, 62], [11, 11, 17], hover);
      ctx.strokeStyle = rgba(accent, 0.9);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      const spin = t * 0.34;
      ctx.arc(cx, cy, min * 0.455, spin, spin + Math.PI * 0.58);
      ctx.stroke();

      ctx.fillStyle = rgba(accent, 0.95);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1.6, min * 0.008), 0, Math.PI * 2);
      ctx.fill();
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w === width && h === height && nextDpr === dpr) return;
      width = w;
      height = h;
      dpr = nextDpr;
      canvas.width = Math.round(w * nextDpr);
      canvas.height = Math.round(h * nextDpr);
      ctx.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);
      draw(0);
    };

    const loop = (now: number) => {
      raf = window.requestAnimationFrame(loop);
      const dt = Math.min(0.064, (now - last) / 1000);
      last = now;
      if (document.hidden || !visible) return;
      t += dt;
      draw(dt);
    };

    const onEnter = () => {
      hoverTarget = 1;
      if (reduced) draw(0);
    };
    const onLeave = () => {
      hoverTarget = 0;
      localX = 0;
      localY = 0;
      if (reduced) draw(0);
    };
    const onMove = (event: PointerEvent) => {
      const rect = cta.getBoundingClientRect();
      localX = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      localY = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
    };

    cta.addEventListener("pointerenter", onEnter);
    cta.addEventListener("pointerleave", onLeave);
    cta.addEventListener("pointermove", onMove);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
        },
        { rootMargin: "120px" },
      );
      io.observe(canvas);
    }

    resize();
    if (reduced) {
      draw(0);
    } else {
      t = 2.4;
      draw(0);
      raf = window.requestAnimationFrame(loop);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
      cta.removeEventListener("pointerenter", onEnter);
      cta.removeEventListener("pointerleave", onLeave);
      cta.removeEventListener("pointermove", onMove);
    };
  }, []);

  /* Clipboard with a graceful fallback. */
  const copyEmail = useCallback(async () => {
    const show = (message: string) => {
      setToast(message);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 2600);
    };
    try {
      await navigator.clipboard.writeText(EMAIL);
      show("Copied — " + EMAIL);
    } catch {
      const field = document.createElement("textarea");
      field.value = EMAIL;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      try {
        document.execCommand("copy");
        show("Copied — " + EMAIL);
      } catch {
        show("Copy unavailable — select the address");
      }
      document.body.removeChild(field);
    }
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const go = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    scrollToTarget(id);
  };

  return (
    <section className="section coda" id="coda" aria-label="Coda" ref={sectionRef}>
      <div className="container coda__inner">
        <div className="coda__label-row" data-reveal="fade">
          <span className="eyebrow">05 / Coda</span>
          <span className="mono coda__clock">
            Shanghai — <span ref={clockRef}>--:--:--</span> CST
          </span>
        </div>

        <div className="coda__top">
          <h2 className="coda__statement" aria-label="Let's make something that moves.">
            <span className="coda__line">
              <span className="coda__line-inner serif">Let&apos;s make</span>
            </span>
            <span className="coda__line">
              <span className="coda__line-inner serif">something that</span>
            </span>
            <span className="coda__line">
              <span className="coda__line-inner serif">
                <em className="serif-i">moves</em>.
              </span>
            </span>
          </h2>

          <div className="coda__aside" data-reveal="up" data-reveal-delay="0.25">
            <p className="coda__aside-text">
              Two or three projects a year — interfaces where type, motion and light are the material.
              Tell us what you are building, and what it has to move.
            </p>
            <span className="pill coda__pill">
              <span className="dot-live" aria-hidden="true" />
              Accepting two projects — Q1 2026
            </span>
          </div>
        </div>

        <div className="coda__contact" data-reveal="up" data-reveal-delay="0.1">
          <div className="coda__mail">
            <p className="mono coda__mail-label">Inquiries</p>
            <button
              type="button"
              className="coda__mail-copy"
              onClick={copyEmail}
              data-cursor="link"
              data-cursor-label="Copy"
              aria-label={"Copy email address " + EMAIL}
            >
              <span className="coda__mail-address">{EMAIL}</span>
              <span className="coda__mail-icon" aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
                  <rect x="5.5" y="5.5" width="8" height="8" stroke="currentColor" strokeWidth="1.1" />
                  <path d="M10.5 5.5v-3h-8v8h3" stroke="currentColor" strokeWidth="1.1" />
                </svg>
              </span>
            </button>
            <p className="mono coda__mail-hint">Click to copy — replies within two working days</p>
          </div>

          <a
            className="coda__cta"
            ref={ctaRef}
            href={MAILTO}
            data-cursor="link"
            data-cursor-label="Write"
            aria-label="Start a project — write to Nocturne"
          >
            <canvas className="coda__cta-canvas" ref={ringRef} aria-hidden="true" />
            <span className="coda__cta-content">
              <span className="coda__cta-label mono">
                Start a<br />project
              </span>
              <span className="coda__cta-arrow" aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
                  <path d="M4 12L12 4M12 4H5.5M12 4v6.5" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </span>
            </span>
          </a>
        </div>

        <footer className="coda__footer" data-reveal="fade">
          <div className="coda__cols">
            <div className="coda__col">
              <h3 className="mono coda__col-title">Studio</h3>
              <ul>
                {STUDIO.map((line) => (
                  <li key={line}>{line}</li>
                ))}
                <li className="coda__col-muted">Independent practice — MMXIX</li>
              </ul>
            </div>

            <div className="coda__col">
              <h3 className="mono coda__col-title">Index</h3>
              <ul>
                {INDEX_LINKS.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.id}
                      onClick={(event) => go(event, link.id)}
                      data-cursor="link"
                      className="coda__link"
                    >
                      <span className="mono coda__link-index">{link.index}</span>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="coda__col coda__col--elsewhere">
              <h3 className="mono coda__col-title">Elsewhere</h3>
              <ul>
                {ELSEWHERE.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="coda__link"
                      data-cursor="link"
                    >
                      {link.label}
                      <span className="coda__link-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="coda__col coda__col--colophon">
              <h3 className="mono coda__col-title">Colophon</h3>
              <p className="coda__colophon">
                React 19 · TypeScript · WebGL
                <br />
                GSAP · Lenis · hand-written CSS
              </p>
              <p className="coda__colophon coda__colophon--muted">
                Set in Instrument Serif, Instrument Sans &amp; JetBrains Mono. No templates, no images.
              </p>
              <button type="button" data-craft-toggle className="coda__craft-toggle">
                Craft mode <span className="coda__craft-key">G</span>
              </button>
            </div>
          </div>

          <div className="coda__base">
            <span className="mono">© MMXXV Nocturne</span>
            <span className="mono coda__honest">A front-end demonstration. Not a real studio.</span>
            <span className="mono coda__coords">31.2304° N — 121.4737° E</span>
          </div>
        </footer>
      </div>

      <div className="coda__wordmark" aria-hidden="true" data-reveal="fade">
        <span className="coda__wordmark-text serif" data-parallax="0.06">
          Nocturne
        </span>
      </div>

      <div
        className={"coda__toast" + (toast ? " is-visible" : "")}
        role="status"
        aria-live="polite"
      >
        <span className="coda__toast-dot" aria-hidden="true" />
        <span className="mono coda__toast-text">{toast ?? ""}</span>
      </div>
    </section>
  );
}
