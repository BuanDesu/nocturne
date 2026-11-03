/**
 * GLStage — a small WebGL surface manager.
 *
 * Handles context creation, DPR-aware resizing, RAF with visibility pausing,
 * uniform plumbing, context-loss recovery and teardown. Experiments only need
 * to supply a fragment shader + an onFrame callback.
 */
export type UniformValue = number | boolean | number[] | Float32Array;

export const FULLSCREEN_VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Shader compile error: " + log);
  }
  return shader;
}

function link(gl: WebGLRenderingContext, vert: string, frag: string): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create program");
  const vs = compile(gl, gl.VERTEX_SHADER, vert);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error("Program link error: " + log);
  }
  return program;
}

export interface GLStageOptions {
  frag: string;
  vert?: string;
  alpha?: boolean;
  antialias?: boolean;
  maxDpr?: number;
  autoStart?: boolean;
}

export class GLStage {
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGLRenderingContext;
  readonly maxDpr: number;
  width = 0;
  height = 0;
  dpr = 1;
  time = 0;
  running = false;
  visible = true;
  frameCallback: ((time: number, dt: number, stage: GLStage) => void) | null = null;

  private fragSource: string;
  private vertSource: string;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private locations = new Map<string, WebGLUniformLocation | null>();
  private textures = new Map<string, WebGLTexture>();
  private rafId = 0;
  private lastTime = 0;
  private startTime = 0;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private onVisibility = () => {
    if (document.hidden) this.pauseLoop();
    else if (this.visible && this.running) this.startLoop();
  };

  constructor(canvas: HTMLCanvasElement, options: GLStageOptions) {
    this.canvas = canvas;
    this.fragSource = options.frag;
    this.vertSource = options.vert ?? FULLSCREEN_VERT;
    this.maxDpr = options.maxDpr ?? 2;

    const attrs: WebGLContextAttributes = {
      alpha: options.alpha ?? false,
      antialias: options.antialias ?? false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    };

    const gl =
      (canvas.getContext("webgl2", attrs) as WebGL2RenderingContext | null) ??
      (canvas.getContext("webgl", attrs) as WebGLRenderingContext | null) ??
      (canvas.getContext("experimental-webgl", attrs) as WebGLRenderingContext | null);
    if (!gl) throw new Error("WebGL is not available");
    this.gl = gl;

    this.build();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        this.visible = entries.some((entry) => entry.isIntersecting);
        if (this.visible && this.running) this.startLoop();
        else this.pauseLoop();
      },
      { rootMargin: "120px" },
    );
    this.intersectionObserver.observe(canvas);

    document.addEventListener("visibilitychange", this.onVisibility);
    canvas.addEventListener("webglcontextlost", this.handleContextLost);

    this.resize();
    if (options.autoStart !== false) this.start();
  }

  private handleContextLost = (event: Event) => {
    event.preventDefault();
    this.pauseLoop();
  };

  private build() {
    const gl = this.gl;
    this.program = link(gl, this.vertSource, this.fragSource);
    gl.useProgram(this.program);

    const buffer = gl.createBuffer();
    this.buffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // One oversized triangle covers the viewport with zero seams.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(this.program, "aPos");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    this.locations.clear();
    const count = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(this.program, i);
      if (info) this.locations.set(info.name.replace("[0]", ""), gl.getUniformLocation(this.program, info.name));
    }
  }

  /** Upload (or update) a texture bound to a unit and wire it to a sampler uniform. */
  setTexture(name: string, unit: number, source: TexImageSource) {
    const gl = this.gl;
    let texture = this.textures.get(name);
    if (!texture) {
      texture = gl.createTexture() ?? undefined;
      if (!texture) return;
      this.textures.set(name, texture);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    this.set(name, unit);
  }

  set(name: string, value: UniformValue) {
    const gl = this.gl;
    if (!this.program) return;
    if (!this.locations.has(name)) {
      this.locations.set(name, gl.getUniformLocation(this.program, name));
    }
    const loc = this.locations.get(name);
    if (!loc) return;
    if (typeof value === "number") gl.uniform1f(loc, value);
    else if (typeof value === "boolean") gl.uniform1i(loc, value ? 1 : 0);
    else if (value instanceof Float32Array) {
      if (value.length === 16) gl.uniformMatrix4fv(loc, false, value);
      else if (value.length === 9) gl.uniformMatrix3fv(loc, false, value);
      else gl.uniform1fv(loc, value);
    } else if (Array.isArray(value)) {
      if (value.length === 2) gl.uniform2f(loc, value[0], value[1]);
      else if (value.length === 3) gl.uniform3f(loc, value[0], value[1], value[2]);
      else if (value.length === 4) gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
      else gl.uniform1fv(loc, value);
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (width === this.canvas.width && height === this.canvas.height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.gl.viewport(0, 0, width, height);
  }

  start() {
    this.running = true;
    if (!this.startTime) this.startTime = performance.now();
    if (this.visible) this.startLoop();
  }

  pauseLoop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  startLoop() {
    if (this.rafId || !this.running) return;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.rafId = 0;
    const dt = this.lastTime ? Math.min(0.064, (now - this.lastTime) / 1000) : 1 / 60;
    this.lastTime = now;
    this.time = (now - this.startTime) / 1000;
    this.draw(dt);
    if (this.running && this.visible && !document.hidden) this.rafId = requestAnimationFrame(this.tick);
  };

  /** Draw one frame. Bind the program and uniforms inside the frame callback. */
  draw(dt: number) {
    const gl = this.gl;
    if (!this.program) return;
    this.resize();
    gl.useProgram(this.program);
    this.frameCallback?.(this.time, dt, this);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Draw a single static frame (used for reduced-motion). */
  renderOnce() {
    if (!this.startTime) this.startTime = performance.now();
    this.resize();
    this.draw(1 / 60);
  }

  stop() {
    this.running = false;
    this.pauseLoop();
  }

  destroy() {
    this.stop();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    const gl = this.gl;
    this.textures.forEach((texture) => gl.deleteTexture(texture));
    this.textures.clear();
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.program) gl.deleteProgram(this.program);
    const ext = gl.getExtension("WEBGL_lose_context");
    ext?.loseContext();
  }
}

/** Random RGBA noise texture — handy for dithering / dissolve effects. */
export function createNoiseTexture(gl: WebGLRenderingContext, size = 256): WebGLTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    data[i] = v;
    data[i + 1] = Math.floor(Math.random() * 256);
    data[i + 2] = Math.floor(Math.random() * 256);
    data[i + 3] = 255;
  }
  const texture = gl.createTexture();
  if (!texture) throw new Error("Unable to create texture");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return texture;
}
