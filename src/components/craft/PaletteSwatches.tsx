import { useEffect, useRef, useState } from "react";

const SWATCHES = [
  { name: "Void", hex: "#06060A", ink: false },
  { name: "Ink", hex: "#0B0B11", ink: false },
  { name: "Bone", hex: "#EFE9DC", ink: true },
  { name: "Acid", hex: "#DAFF3E", ink: true },
  { name: "Ember", hex: "#FF5A2B", ink: true },
  { name: "Lilac", hex: "#A291FF", ink: true },
];

const IDLE = "Click a swatch to copy";

const copyFallback = (value: string) => {
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  area.remove();
  return copied;
};

/**
 * Instrument 06 — the palette as material samples. Clicking copies the hex;
 * the status line confirms in the section's own voice instead of a browser toast.
 */
export default function PaletteSwatches() {
  const [status, setStatus] = useState(IDLE);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const announce = (message: string) => {
    setStatus(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setStatus(IDLE);
      setCopied(null);
    }, 1900);
  };

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      announce(`Copied — ${hex}`);
    } catch {
      const ok = copyFallback(hex);
      if (ok) {
        setCopied(hex);
        announce(`Copied — ${hex}`);
      } else {
        announce("Copy blocked — select the hex");
      }
    }
  };

  return (
    <div className="craft__palette">
      <div className="palette__grid" role="group" aria-label="Palette swatches, click to copy hex">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch.hex}
            type="button"
            className={`palette__swatch${copied === swatch.hex ? " is-copied" : ""}`}
            style={{ backgroundColor: swatch.hex, color: swatch.ink ? "#0B0B11" : "#EFE9DC" }}
            onClick={() => void copy(swatch.hex)}
            aria-label={`Copy ${swatch.name} ${swatch.hex}`}
            data-cursor="link"
          >
            <span className="palette__copy" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true" focusable="false">
                <rect x="3.2" y="3.2" width="6.2" height="6.2" stroke="currentColor" strokeWidth="0.9" />
                <path d="M1.4 7.6V1.6h6" stroke="currentColor" strokeWidth="0.9" />
              </svg>
            </span>
            <span className="palette__hex mono">{swatch.hex}</span>
            <span className="palette__name mono" aria-hidden="true">{swatch.name}</span>
          </button>
        ))}
      </div>

      <p className={`palette__status mono${copied ? " is-copied" : ""}`} role="status" aria-live="polite">
        {copied ? <span className="palette__status-mark" aria-hidden="true">✓</span> : <span className="palette__status-mark" aria-hidden="true">—</span>}
        {status}
      </p>
    </div>
  );
}
