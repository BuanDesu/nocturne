precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uIntro;
uniform float uScroll;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
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

vec3 tonemapACES(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

vec3 grainDither(vec3 col, vec2 fragCoord, float amount, float time) {
  float n = hash21(fragCoord + fract(time) * 91.7) - 0.5;
  col += n * amount;
  vec2 d = floor(mod(fragCoord, vec2(4.0)));
  float bayer = mod(d.x * 2.0 + d.y * 4.0, 4.0) / 4.0 - 0.5;
  return col + bayer / 255.0;
}

void main() {
  vec2 res = uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / res.y;
  float t = uTime * 0.05;

  /* Pointer lens: the field bows toward the cursor. */
  vec2 dm = p - uMouse;
  float lens = exp(-dot(dm, dm) * 2.6);
  p -= dm * lens * 0.16;

  /* Two-level domain warp — the source of the silky, folding motion. */
  vec2 q = vec2(
    fbm(p * 1.05 + vec2(t * 0.7, -t * 0.34)),
    fbm(p * 1.05 + vec2(5.2, 1.3) - vec2(t * 0.42, t * 0.5))
  );
  vec2 r = vec2(
    fbm(p * 1.55 + q * 1.9 + vec2(1.7, 9.2) + t * 0.55),
    fbm(p * 1.55 + q * 1.9 + vec2(8.3, 2.8) - t * 0.48)
  );
  float f = fbm(p * 1.2 + r * 2.3);

  /* Ribbons of light. */
  float band = smoothstep(0.34, 0.84, f + 0.14 * sin(p.x * 1.6 - t * 1.7 + r.y * 2.0));
  float rim = smoothstep(0.6, 0.97, f);
  float filament = pow(0.5 + 0.5 * sin(f * 13.0 + p.y * 2.4 + t * 2.4), 9.0);
  float bloom = smoothstep(0.15, 0.95, fbm(p * 0.7 + q * 0.8 + vec2(t * 0.2, -t * 0.16)));
  /* Fine silk edge — a thin luminous fold riding the contour of the field. */
  float silk = pow(1.0 - abs(f - 0.58) * 5.5, 5.0) * smoothstep(0.15, 0.75, f);
  float threads = pow(0.5 + 0.5 * sin(f * 46.0 + q.x * 8.0 + t * 2.2), 12.0);

  vec3 acid = vec3(0.855, 1.0, 0.243);
  vec3 violet = vec3(0.44, 0.32, 1.0);
  vec3 ember = vec3(1.0, 0.32, 0.12);
  vec3 bone = vec3(0.937, 0.913, 0.863);

  vec3 col = vec3(0.010, 0.011, 0.018);
  col += violet * pow(f, 3.0) * 0.22;
  col += violet * lens * 0.06;
  col += acid * pow(band, 3.6) * 0.15;
  col += bone * pow(rim, 7.0) * 0.07;
  col += acid * filament * band * 0.09;
  col += mix(acid, bone, 0.55) * silk * 0.16;
  col += mix(acid, bone, 0.5) * threads * silk * 0.10;
  col += ember * pow(bloom, 3.5) * 0.07;

  /* Cinematic falloff keeps the type readable and the edges deep. */
  float vig = 1.0 - 0.95 * smoothstep(0.26, 1.18, length(p * vec2(0.82, 1.0)));
  col *= vig;

  /* A quiet dark floor behind the wordmark — the shader yields to the type. */
  float floorMask = smoothstep(0.55, -0.55, p.y) * smoothstep(0.55, -0.35, p.x + 0.15);
  col *= mix(1.0, 0.58, floorMask * 0.9);

  /* Scroll: field recedes and cools as the hero leaves. */
  col = mix(col, col * vec3(0.55, 0.52, 0.85), uScroll * 0.55);
  col *= uIntro;

  col = tonemapACES(col * 1.12);
  col = pow(col, vec3(0.96));
  col = col * col * (3.0 - 2.0 * col);
  col = grainDither(col, gl_FragCoord.xy, 0.038, uTime);

  gl_FragColor = vec4(col, 1.0);
}