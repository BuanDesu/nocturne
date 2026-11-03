import { useEffect, useRef } from "react";
import { GLStage } from "../../lib/gl";
import { colorHelpers, fbm, hash, noise, rotation } from "../../lib/glsl";
import { prefersReducedMotion, pointer } from "../../lib/pointer";
import { damp } from "../../lib/utils";
import chromeFrag from "../../shaders/lab-chrome.frag?raw";
import type { SurfaceProps } from "./ExperimentRow";

/** GLSL building blocks + the experiment body. */
const FRAG = ["precision highp float;", hash, noise, fbm, rotation, colorHelpers, chromeFrag].join("\n");

/**
 * EXP.01 — Liquid chrome.
 * A single full-screen fragment shader: height field in, studio reflection out.
 */
export default function LiquidChrome({ onFps, registerReset }: SurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let stage: GLStage;
    try {
      stage = new GLStage(canvas, { frag: FRAG, maxDpr: 1.8, autoStart: false });
    } catch {
      canvas.classList.add("is-fallback");
      return;
    }

    const reduced = prefersReducedMotion();
    const uRes = [0, 0];
    const uMouse = [0, 0];
    const ripples = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];

    let mouseX = 0;
    let mouseY = 0;
    let active = 0;
    let drag = 0;
    let wasDown = false;
    let lastSpawn = 0;
    let lastTime = 0;
    let slot = 0;
    let frames = 0;
    let clock = 0;

    const spawn = (x: number, y: number, strength: number, time: number) => {
      const ripple = ripples[slot];
      slot = (slot + 1) % ripples.length;
      ripple[0] = x;
      ripple[1] = y;
      ripple[2] = time;
      ripple[3] = strength;
    };

    stage.frameCallback = (time, dt, surface) => {
      const width = surface.width;
      const height = surface.height;
      if (width < 2 || height < 2) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const aspect = width / height;
        const tx = ((pointer.x - rect.left) / rect.width - 0.5) * aspect;
        const ty = 0.5 - (pointer.y - rect.top) / rect.height;
        mouseX = damp(mouseX, tx, 11, dt);
        mouseY = damp(mouseY, ty, 11, dt);
      }

      active = damp(active, pointer.active ? 1 : 0, 6, dt);
      drag = damp(drag, pointer.down ? 1 : 0, 4.5, dt);

      if (pointer.down) {
        const now = time;
        if (!wasDown) spawn(mouseX, mouseY, 1.0, now);
        else if (pointer.speed > 0.04 && now - lastSpawn > 0.11) {
          spawn(mouseX, mouseY, 0.28 + Math.min(0.62, pointer.speed), now);
          lastSpawn = now;
        }
      }
      wasDown = pointer.down;
      lastTime = time;

      uRes[0] = width;
      uRes[1] = height;
      uMouse[0] = mouseX;
      uMouse[1] = mouseY;
      surface.set("uRes", uRes);
      surface.set("uTime", time);
      surface.set("uMouse", uMouse);
      surface.set("uActive", active);
      surface.set("uDrag", drag);
      surface.set("uR0", ripples[0]);
      surface.set("uR1", ripples[1]);
      surface.set("uR2", ripples[2]);
      surface.set("uR3", ripples[3]);

      frames += 1;
      clock += dt;
      if (clock >= 0.55) {
        onFps(Math.round(frames / clock));
        frames = 0;
        clock = 0;
      }
    };

    const renderStatic = () => {
      if (!stage) return;
      if (stage.width < 2) stage.resize();
      uRes[0] = stage.width;
      uRes[1] = stage.height;
      stage.set("uRes", uRes);
      stage.set("uTime", 0);
      stage.set("uMouse", uMouse);
      stage.set("uActive", 0);
      stage.set("uDrag", 0);
      stage.set("uR0", ripples[0]);
      stage.set("uR1", ripples[1]);
      stage.set("uR2", ripples[2]);
      stage.set("uR3", ripples[3]);
      stage.renderOnce();
    };

    const reset = () => {
      ripples.forEach((ripple) => {
        ripple[3] = 0;
      });
      if (!reduced && lastTime > 0) spawn(0, 0, 1.45, lastTime);
    };

    if (reduced) {
      renderStatic();
      window.addEventListener("resize", renderStatic);
    } else {
      stage.start();
    }

    registerReset(reset);

    return () => {
      window.removeEventListener("resize", renderStatic);
      stage.destroy();
    };
  }, [onFps, registerReset]);

  return <canvas className="lab__canvas" ref={canvasRef} aria-hidden="true" />;
}
