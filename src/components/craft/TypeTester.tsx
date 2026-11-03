import { useState, type CSSProperties } from "react";

const MIN = 400;
const MAX = 700;

/**
 * Instrument 05 — the variable weight axis of Instrument Sans, wired live.
 * The specimen, the sample line and the readout share one state, so the slider
 * feels like it is typing rather than filtering.
 */
export default function TypeTester() {
  const [weight, setWeight] = useState(460);
  const progress = ((weight - MIN) / (MAX - MIN)) * 100;
  const specimenStyle = {
    fontVariationSettings: `"wght" ${weight}`,
    fontWeight: weight,
  } as CSSProperties;

  return (
    <div className="craft__type">
      <div className="type__specimen" style={specimenStyle}>
        <span className="type__aa" aria-hidden="true">Aa</span>
        <span className="type__sample">Motion is meaning.</span>
        <span className="type__alphabet" aria-hidden="true">ABCDEFGHIJKLMNOPQRSTUVWXYZ</span>
      </div>

      <div className="type__control">
        <div className="type__meta mono">
          <span>Variable weight</span>
          <span className="type__value">{weight}</span>
        </div>
        <input
          className="type__range"
          type="range"
          min={MIN}
          max={MAX}
          step={1}
          value={weight}
          onChange={(event) => setWeight(Number(event.target.value))}
          aria-label={`Variable font weight, ${weight} of ${MAX}`}
          style={{ "--fill": `${progress}%` } as CSSProperties}
        />
        <div className="type__scale mono" aria-hidden="true">
          <span>{MIN}</span>
          <span>wght</span>
          <span>{MAX}</span>
        </div>
        <p className="type__hint mono" aria-hidden="true">Drag or use arrow keys</p>
      </div>
    </div>
  );
}