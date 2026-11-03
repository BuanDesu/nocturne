/**
 * Minimal, dependency-free split text.
 * Splits plain-text elements into words / characters / measured lines and
 * restores the original markup afterwards so layout never stays locked.
 */
export type SplitKind = "chars" | "words" | "lines";

const originals = new WeakMap<HTMLElement, string>();

export function splitText(el: HTMLElement, kind: SplitKind = "words"): HTMLElement[] {
  unsplit(el);
  const text = el.textContent ?? "";
  originals.set(el, el.innerHTML);
  el.dataset.splitKind = kind;
  el.setAttribute("aria-label", text);
  el.textContent = "";

  const targets: HTMLElement[] = [];
  const frag = document.createDocumentFragment();

  if (kind === "chars") {
    for (const ch of Array.from(text)) {
      if (ch === " ") {
        frag.appendChild(document.createTextNode("\u00a0"));
        continue;
      }
      const span = document.createElement("span");
      span.className = "split-char";
      span.textContent = ch;
      span.setAttribute("aria-hidden", "true");
      frag.appendChild(span);
      targets.push(span);
    }
    el.appendChild(frag);
    return targets;
  }

  const tokens = text.split(/(\s+)/).filter((s) => s.length > 0);
  const wordEls: { el: HTMLElement; line: number }[] = [];

  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      frag.appendChild(document.createTextNode(token));
      continue;
    }
    const outer = document.createElement("span");
    outer.className = "split-word";
    const inner = document.createElement("span");
    inner.textContent = token;
    inner.setAttribute("aria-hidden", "true");
    outer.appendChild(inner);
    frag.appendChild(outer);
    targets.push(inner);
    wordEls.push({ el: outer, line: 0 });
  }

  el.appendChild(frag);
  if (kind === "words") return targets;

  let line = 0;
  let prevTop = Number.NEGATIVE_INFINITY;
  for (const word of wordEls) {
    const top = word.el.offsetTop;
    if (Math.abs(top - prevTop) > 2) {
      line += 1;
      prevTop = top;
    }
    word.line = line;
  }

  const nodes = Array.from(el.childNodes);
  el.textContent = "";
  const lineMap = new Map<HTMLElement, number>(wordEls.map((word) => [word.el, word.line]));
  let current: HTMLElement | null = null;
  let currentIndex = -1;

  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (current) current.appendChild(node);
      continue;
    }
    const element = node as HTMLElement;
    const index = lineMap.get(element) ?? currentIndex + 1;
    if (!current || index !== currentIndex) {
      current = document.createElement("span");
      current.className = "split-line";
      el.appendChild(current);
      currentIndex = index;
    }
    current.appendChild(node);
  }

  return targets;
}

export function unsplit(el: HTMLElement) {
  const original = originals.get(el);
  if (original === undefined) return;
  el.innerHTML = original;
  el.removeAttribute("data-split-kind");
  el.removeAttribute("aria-label");
  originals.delete(el);
}
