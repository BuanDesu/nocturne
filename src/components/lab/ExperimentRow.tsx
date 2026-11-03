import { useCallback, useRef, useState, type ComponentType } from "react";
import { prefersReducedMotion } from "../../lib/motion";

/** Every experiment surface receives this small control contract. */
export interface SurfaceProps {
  onFps: (fps: number) => void;
  registerReset: (reset: () => void) => void;
}

interface ExperimentRowProps {
  id: string;
  index: string;
  engine: string;
  title: string;
  description: string;
  tags: string[];
  hint: string;
  touchHint: string;
  cursorLabel: string;
  side: "left" | "right";
  Surface: ComponentType<SurfaceProps>;
}

/**
 * One experiment: an instrument frame on one side, the editorial column on the
 * other, alternating down the page. The frame reports its own frame rate.
 */
export default function ExperimentRow({
  id,
  index,
  engine,
  title,
  description,
  tags,
  hint,
  touchHint,
  cursorLabel,
  side,
  Surface,
}: ExperimentRowProps) {
  const [fps, setFps] = useState<number | null>(null);
  const resetRef = useRef<() => void>(() => {});
  const reduced = prefersReducedMotion();

  const onFps = useCallback((value: number) => setFps(value), []);
  const registerReset = useCallback((reset: () => void) => {
    resetRef.current = reset;
  }, []);

  const titleId = `${id}-title`;

  return (
    <article className={`lab__row lab__row--${side}`} id={id} aria-labelledby={titleId}>
      <header className="lab__row-head" data-reveal="fade">
        <span className="lab__num mono">{index}</span>
        <span className="lab__head-rule" aria-hidden="true" />
        <span className="lab__engine mono">{engine}</span>
      </header>

      <div className="lab__row-body">
        <div className="lab__stage" data-cursor="drag" data-cursor-label={cursorLabel}>
          <div className="lab__stage-frame" data-reveal-mask>
            <Surface onFps={onFps} registerReset={registerReset} />
            <div className="lab__stage-shade" aria-hidden="true" />
            <div className="lab__hud" aria-hidden="true">
              <span className={`lab__hud-live mono${reduced ? " is-static" : ""}`}>
                <span className="dot-live" />
                {reduced ? "Static frame" : "Live"}
              </span>
              <span className="lab__hud-fps mono">
                {reduced ? (
                  "No loop"
                ) : (
                  <>
                    <span className="num">{fps ?? "—"}</span> fps
                  </>
                )}
              </span>
            </div>
          </div>
          <span className="lab__crop lab__crop--tl" aria-hidden="true" />
          <span className="lab__crop lab__crop--tr" aria-hidden="true" />
          <span className="lab__crop lab__crop--bl" aria-hidden="true" />
          <span className="lab__crop lab__crop--br" aria-hidden="true" />
        </div>

        <div className="lab__copy" data-reveal-group="0.09">
          <h3 className="lab__title" id={titleId}>
            {title}
          </h3>
          <p className="lab__desc">{description}</p>
          <ul className="lab__tags" aria-label="Techniques">
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
          <div className="lab__controls">
            <span className="lab__hint mono">
              <span className="lab__hint-fine">{hint}</span>
              <span className="lab__hint-coarse">{touchHint}</span>
            </span>
            <button
              className="lab__reset"
              type="button"
              onClick={() => resetRef.current()}
              data-cursor="link"
              aria-label={`Reset the ${title} experiment`}
            >
              <span>Reset</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M10.4 6a4.4 4.4 0 1 1-1.36-3.18M10.4 1.1v3.2H7.2"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
