/**
 * Shared GLSL building blocks (GLSL ES 1.00 — runs on WebGL1 and WebGL2).
 * Concatenate into fragment shaders with template literals.
 */

export const hash = /* glsl */ `
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
`;

export const noise = /* glsl */ `
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
`;

export const fbm = /* glsl */ `
float fbm2(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.02 + 11.7;
    a *= 0.5;
  }
  return v;
}

float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.03 + 7.3;
    a *= 0.5;
  }
  return v;
}
`;

export const rotation = /* glsl */ `
mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}
`;

export const colorHelpers = /* glsl */ `
float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 tonemapACES(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// Film grain + ordered dithering to kill 8-bit banding in big gradients.
vec3 grainDither(vec3 col, vec2 fragCoord, float amount, float time) {
  float n = hash21(fragCoord + fract(time) * 91.7) - 0.5;
  col += n * amount;
  vec2 d = floor(mod(fragCoord, vec2(4.0)));
  float bayer = mod(d.x * 2.0 + d.y * 4.0, 4.0) / 4.0 - 0.5;
  return col + bayer / 255.0;
}
`;

export const noiseTexture = /* glsl */ `
float noiseTex(sampler2D tex, vec2 uv) {
  return texture2D(tex, uv).r;
}
`;
