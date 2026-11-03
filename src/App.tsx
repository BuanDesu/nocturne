import { useCallback, useEffect, useState } from "react";
import { bindCursorTargets, getLenis, initSmoothScroll, prefersReducedMotion, refreshScroll } from "./lib/motion";
import { initPointer } from "./lib/pointer";
import CraftMode from "./components/CraftMode";
import Cursor from "./components/Cursor";
import Grain from "./components/Grain";
import Nav from "./components/Nav";
import Preloader from "./components/Preloader";
import Hero from "./components/Hero";
import Manifesto from "./components/Manifesto";
import Lab from "./components/Lab";
import Work from "./components/Work";
import Craft from "./components/Craft";
import Coda from "./components/Coda";

export default function App() {
  const [ready, setReady] = useState(false);
  const handleLoaded = useCallback(() => setReady(true), []);

  useEffect(() => {
    const stopScroll = initSmoothScroll();
    const stopPointer = initPointer();
    const unbindCursor = bindCursorTargets(document.body);
    if (!prefersReducedMotion()) window.scrollTo(0, 0);
    getLenis()?.stop();
    if (import.meta.env.DEV) {
      (window as unknown as { __lenis: unknown }).__lenis = getLenis();
      (window as unknown as { __ready: unknown }).__ready = false;
    }
    return () => {
      stopScroll();
      stopPointer();
      unbindCursor();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    getLenis()?.start();
    // Sections report their final heights once webfonts + canvases settle.
    const id = window.setTimeout(() => refreshScroll(), 600);
    return () => window.clearTimeout(id);
  }, [ready]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Grain />
      <Cursor />
      <CraftMode />
      <Preloader onDone={handleLoaded} />
      <Nav />
      <main id="main" tabIndex={-1}>
        <Hero ready={ready} />
        <Manifesto />
        <Lab />
        <Work />
        <Craft />
        <Coda />
      </main>
    </>
  );
}
