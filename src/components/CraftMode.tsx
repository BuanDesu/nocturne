import { useCallback, useEffect, useRef, useState } from "react";
import "../styles/craftmode.css";

/**
 * "Craft mode" — a design-engineering overlay for the curious:
 * 12-column grid, 8px baseline, section bounds, and a live HUD with
 * viewport, breakpoint, frame time and scroll telemetry.
 * Toggle with G, or any element carrying [data-craft-toggle].
 */
export default function CraftMode() {
  const [active, setActive] = useState(false);
  const hudRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setActive((value) => !value), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== "g") return;
      const target = event.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      event.preventDefault();
      toggle();
    };
    const onClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement)?.closest("[data-craft-toggle]")) {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [toggle]);

  useEffect(() => {
    document.body.classList.toggle("craft-on", active);
    if (!active) return;

    const hud = hudRef.current;
    const overlay = overlayRef.current;
    let frame = 0;
    let last = performance.now();
    let samples = 0;
    let elapsed = 0;
    let fps = 60;
    let painted = 0;

    const paint = () => {
      const now = performance.now();
      if (now - painted < 120) return;
      painted = now;
      if (!hud) return;

      const sections = Array.from(document.querySelectorAll<HTMLElement>("section[id]"));
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const breakpoint =
        width >= 1440 ? "desktop-xl" : width >= 1100 ? "desktop" : width >= 900 ? "tablet-l" : width >= 640 ? "tablet" : "mobile";
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;

      let current = sections[0];
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 84 && rect.bottom > 84) {
          current = section;
          break;
        }
      }
      if (overlay && current) {
        overlay.dataset.theme = current.classList.contains("theme-bone") ? "light" : "dark";
      }

      const rows = [
        { label: "viewport", value: `${width} × ${window.innerHeight} · ${dpr.toFixed(1)}×` },
        { label: "breakpoint", value: `${breakpoint} · ${String(sections.length).padStart(2, "0")} sections` },
        { label: "section", value: current ? "#" + current.id : "—" },
        { label: "frame", value: `${(1000 / fps).toFixed(1)}ms · ${fps.toFixed(0)}fps` },
        { label: "scroll", value: `${String(progress).padStart(3, "0")}%` },
      ];

      hud.innerHTML =
        rows.map((row) => `<span><i>${row.label}</i><b>${row.value}</b></span>`).join("") +
        `<span class="craftmode__hint"><i>grid</i><b>12 col · 8 px baseline · G to close</b></span>`;
    };

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      samples += 1;
      elapsed += delta;
      if (elapsed >= 500) {
        fps = (samples * 1000) / elapsed;
        samples = 0;
        elapsed = 0;
        paint();
      }
      frame = requestAnimationFrame(tick);
    };

    paint();
    frame = requestAnimationFrame(tick);
    window.addEventListener("resize", paint);
    window.addEventListener("scroll", paint, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", paint);
      window.removeEventListener("scroll", paint);
      document.body.classList.remove("craft-on");
    };
  }, [active]);

  return (
    <>
      {active && (
        <div className="craftmode" ref={overlayRef} data-theme="dark" aria-hidden="true">
          <div className="craftmode__baseline" />
          <div className="craftmode__grid container">
            {Array.from({ length: 12 }, (_, index) => <span key={index} />)}
          </div>
          <div className="craftmode__hud" ref={hudRef} />
        </div>
      )}
    </>
  );
}
