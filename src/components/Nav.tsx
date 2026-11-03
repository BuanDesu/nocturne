import { useEffect, useRef, useState } from "react";
import { gsap, scrollToTarget } from "../lib/motion";
import { formatClock } from "../lib/utils";
import "../styles/nav.css";

const LINKS = [
  { id: "#manifesto", index: "01", label: "Manifesto" },
  { id: "#lab", index: "02", label: "Lab" },
  { id: "#index", index: "03", label: "Index" },
  { id: "#craft", index: "04", label: "Craft" },
  { id: "#coda", index: "05", label: "Contact" },
];

export default function Nav() {
  const headerRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState(() => formatClock());
  const [active, setActive] = useState("#overture");
  const [onLight, setOnLight] = useState(false);
  const lightRef = useRef(false);
  const menuTimeline = useRef<gsap.core.Timeline | null>(null);

  /* Clock */
  useEffect(() => {
    const id = window.setInterval(() => setClock(formatClock()), 1000);
    return () => window.clearInterval(id);
  }, []);

  /* Scroll progress + condensed header */
  useEffect(() => {
    const header = headerRef.current;
    const progress = progressRef.current;
    if (!header || !progress) return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section[id]"));
    let lastY = window.scrollY;
    let pinnedUntil = 0;
    const onPin = (event: Event) => {
      pinnedUntil = (event as CustomEvent<{ until: number }>).detail.until;
    };
    window.addEventListener("nocturne:navpin", onPin);

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const value = max > 0 ? window.scrollY / max : 0;
      const y = window.scrollY;
      progress.style.transform = `scaleX(${value.toFixed(4)})`;
      header.classList.toggle("is-scrolled", y > 24);

      // The header yields to the content while scrolling down, returns on the way up.
      const pinned = performance.now() < pinnedUntil;
      const delta = y - lastY;
      if (Math.abs(delta) > 5) {
        if (delta > 0 && y > 260 && !pinned) header.classList.add("is-hidden");
        else header.classList.remove("is-hidden");
        lastY = y;
      }
      if (y <= 160) header.classList.remove("is-hidden");

      // The header samples the section sitting underneath it and flips its ink.
      let isLight = false;
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 84 && rect.bottom > 84) {
          isLight = section.classList.contains("theme-bone");
          break;
        }
      }
      if (isLight !== lightRef.current) {
        lightRef.current = isLight;
        setOnLight(isLight);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("nocturne:navpin", onPin);
    };
  }, []);

  /* Active section */
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section[id]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive("#" + entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  /* Menu keyboard behaviour: Escape closes, Tab is trapped inside, focus restores. */
  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(menu?.querySelectorAll<HTMLElement>("a[href]") ?? []);

    const focusTimer = window.setTimeout(() => focusables()[0]?.focus(), 360);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && index === items.length - 1) {
        event.preventDefault();
        items[0].focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);

  /* Mobile menu animation */
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    menuTimeline.current?.kill();
    headerRef.current?.classList.remove("is-hidden");
    if (open) {
      document.body.classList.add("is-locked");
      const items = menu.querySelectorAll(".menu__item, .menu__meta");
      const tl = gsap.timeline();
      tl.set(menu, { display: "flex" })
        .fromTo(menu, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "expo.inOut" })
        .fromTo(items, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.9, stagger: 0.06, ease: "expo.out" }, "-=0.45");
      menuTimeline.current = tl;
    } else {
      document.body.classList.remove("is-locked");
      if (menu.style.display === "flex") {
        const tl = gsap.timeline({ onComplete: () => { menu.style.display = "none"; } });
        tl.to(menu, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.65, ease: "expo.inOut" });
        menuTimeline.current = tl;
      }
    }
    return () => { menuTimeline.current?.kill(); };
  }, [open]);

  const go = (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, id: string) => {
    event.preventDefault();
    setOpen(false);
    window.setTimeout(() => scrollToTarget(id), open ? 120 : 0);
  };

  return (
    <>
      <header className="nav" ref={headerRef} data-theme={onLight && !open ? "light" : "dark"}>
        <span className="nav__progress" ref={progressRef} aria-hidden="true" />
        <div className="nav__inner">
          <a className="nav__brand" href="#overture" onClick={(e) => go(e, "#overture")} data-cursor="link">
            <span className="nav__wordmark">Nocturne</span>
            <span className="nav__reg">®</span>
          </a>

          <nav className="nav__links" aria-label="Primary">
            {LINKS.slice(0, 4).map((link) => (
              <a
                key={link.id}
                href={link.id}
                onClick={(e) => go(e, link.id)}
                className={`nav__link ${active === link.id ? "is-active" : ""}`}
                data-cursor="link"
              >
                <span className="nav__link-index">{link.index}</span>
                <span>{link.label}</span>
              </a>
            ))}
          </nav>

          <div className="nav__right">
            <span className="nav__clock mono">
              <span className="dot-live" aria-hidden="true" />
              {clock} <span className="nav__tz">CST</span>
            </span>
            <a href="#coda" className="nav__cta" onClick={(e) => go(e, "#coda")} data-cursor="link">
              Start a project
            </a>
            <button className="nav__menu-btn" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Menu">
              <span className={open ? "is-open" : ""} />
              <span className={open ? "is-open" : ""} />
            </button>
          </div>
        </div>
      </header>

      <div className="menu" ref={menuRef} role="dialog" aria-modal="true" aria-label="Navigation">
        <div className="menu__inner">
          <ol className="menu__list">
            {LINKS.map((link) => (
              <li className="menu__item" key={link.id}>
                <a href={link.id} onClick={(e) => go(e, link.id)}>
                  <span className="menu__index mono">{link.index}</span>
                  <span className="menu__label">{link.label}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="menu__meta">
            <span className="mono">Shanghai · 31.2304° N, 121.4737° E</span>
            <span className="mono">hello@nocturne.studio</span>
          </div>
        </div>
      </div>
    </>
  );
}
