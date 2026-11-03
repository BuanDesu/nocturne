import type { ReactNode } from "react";

export interface CraftCellProps {
  index: string;
  label: string;
  hint: string;
  /** Layout modifier, e.g. "craft__cell--magnet". */
  variant: string;
  touched?: boolean;
  children: ReactNode;
}

/** One instrument bay: serif numeral, mono label, a hint at the right edge. */
export default function CraftCell({ index, label, hint, variant, touched = false, children }: CraftCellProps) {
  return (
    <article
      className={`craft__cell ${variant}${touched ? " is-touched" : ""}`}
      data-craft-cell={Number(index)}
    >
      <header className="craft__cell-head">
        <span className="craft__cell-index serif" aria-hidden="true">{index}</span>
        <h3 className="craft__cell-label mono">{label}</h3>
        <span className="craft__cell-hint mono" aria-hidden="true">{hint}</span>
      </header>
      <div className="craft__cell-body">{children}</div>
    </article>
  );
}
