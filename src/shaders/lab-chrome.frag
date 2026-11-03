/* ==========================================================================
   LAB-01 — Liquid chrome
   A noise-warped height field shaded only by what it reflects: a dark
   studio ceiling with a hard dark gap, a razor horizon and one acid crease.
   ========================================================================== */

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uActive;
uniform float uDrag;
uniform vec4 uR0;
uniform vec4 uR1;
uniform vec4 uR2;
uniform vec4 uR3;

const vec3 BONE = vec3(0.937, 0.913, 0.863);
const vec3 ACID = vec3(0.855, 1.0, 0.243);
const vec3 EMBER = vec3(1.0, 0.353, 0.169);

float lobe(vec2 p, vec2 c, float k) {
  vec2 d = p - c;
  return exp(-dot(d, d) * k);
}

/* Soft-edged rectangle in (azimuth, elevation) reflection space. */
float panel(vec2 uv, vec2 c, vec2 hs, float soft) {
  vec2 d = abs(uv - c) - hs;
  return 1.0 - smoothstep(-soft, soft, max(d.x, d.y));
}

float ringAt(vec4 ripple, vec2 p) {
  if (ripple.w <= 0.0) return 0.0;
  float age = uTime - ripple.z;
  if (age < 0.0 || age > 3.2) return 0.0;
  float d = length(p - ripple.xy);
  float radius = age * 0.52 + 0.015;
  float width = 0.03 + age * 0.05;
  float ring = exp(-pow((d - radius) / width, 2.0));
  return ring * exp(-age * 1.35) * ripple.w * 0.085;
}

float heightAt(vec2 p) {
  float t = uTime * 0.052;
  vec2 q = rot2(t * 0.4) * p;

  /* Slow folds — broad first layer, a little silk on top. */
  float h = (fbm3(q * 1.05 + vec2(t * 1.15, -t * 0.78)) - 0.44) * 1.20;
  h += (fbm3(q * 3.10 + vec2(-t * 0.92, t * 0.68) + 8.3) - 0.44) * 0.075;

  /* Three drifting swells give the liquid its slow bulge. */
  h += 0.18 * lobe(q, vec2(sin(t * 0.95) * 0.62, cos(t * 0.78) * 0.34), 2.3);
  h += 0.15 * lobe(q, vec2(cos(t * 0.62 + 1.6) * 0.74 + 0.18, sin(t * 0.85) * 0.30 - 0.18), 3.0);
  h += 0.12 * lobe(q, vec2(sin(t * 0.50 + 3.2) * 0.86 - 0.30, cos(t * 0.58 + 1.1) * 0.36), 4.2);

  /* Pointer: a dent plus a travelling ripple, stronger while dragging. */
  vec2 md = p - uMouse;
  float dp = dot(md, md);
  h -= uActive * exp(-dp * 9.0) * (0.085 + uDrag * 0.20);
  h += uActive * exp(-dp * 2.4) * sin(sqrt(dp) * 19.0 - uTime * 2.2) * (0.010 + uDrag * 0.030);

  /* Ripple train from dragging. */
  h += ringAt(uR0, p) + ringAt(uR1, p) + ringAt(uR2, p) + ringAt(uR3, p);
  return h;
}

/* Dark studio: the still parts of the liquid reflect the ceiling as silver;
   where the folds tilt away they catch the void. That contrast is the metal. */
vec3 studioEnv(vec3 r) {
  float az = atan(r.y, r.x);
  float el = asin(clamp(r.z, -1.0, 1.0));
  vec2 uv = vec2(az, el);

  /* Nearly black, with a cold breath near the zenith. */
  vec3 col = vec3(0.0012, 0.0014, 0.0022);
  col += vec3(0.0050, 0.0057, 0.0084) * smoothstep(1.10, 1.57, el);

  /* The bright ceiling, with one large dark gap for composition. */
  float ceiling = panel(uv, vec2(0.0, 1.45), vec2(3.2, 0.245), 0.030);
  ceiling *= 1.0 - 0.97 * panel(uv, vec2(-0.86, 1.45), vec2(0.66, 0.30), 0.040);
  ceiling *= 1.0 - 0.58 * panel(uv, vec2(1.52, 1.45), vec2(0.24, 0.15), 0.030);
  float grad = 0.44 + 0.56 * smoothstep(1.12, 1.58, el);
  col += BONE * ceiling * 0.98 * grad;

  /* A soft pool low on the right, seen only in the steeper folds. */
  col += BONE * panel(uv, vec2(2.32, 0.64), vec2(0.30, 0.10), 0.035) * 0.42;

  /* Razor horizon: bright bone on the right, acid on the left. */
  float horizon = panel(uv, vec2(0.0, 0.112), vec2(3.2, 0.0090), 0.0040);
  col += BONE * horizon * 1.90;
  col += ACID * horizon * panel(uv, vec2(-2.55, 0.112), vec2(1.05, 0.02), 0.02) * 1.15;
  col += EMBER * horizon * panel(uv, vec2(1.15, 0.112), vec2(0.20, 0.02), 0.02) * 0.85;

  return col;
}

void main() {
  vec2 res = uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / max(res.y, 1.0);

  /* Normal from forward differences on the height field. */
  float eps = 0.0035;
  float h0 = heightAt(p);
  float hx = heightAt(p + vec2(eps, 0.0));
  float hy = heightAt(p + vec2(0.0, eps));
  vec3 n = normalize(vec3((h0 - hx) / eps * 0.100, (h0 - hy) / eps * 0.100, 1.0));

  /* Mirror: the surface itself is nearly invisible — only its reflection. */
  vec3 refl = reflect(vec3(0.0, 0.0, -1.0), n);
  vec3 env = studioEnv(refl);

  float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 4.0);
  vec3 col = env * (1.0 + 0.80 * fres);

  /* Liquid body under the mirror. */
  col += vec3(0.010, 0.011, 0.018) * (1.0 - fres);

  /* Wet glint from a virtual key light, and an acid sheen on the steepest
     creases — one accent, never a colour wash. */
  vec3 L = normalize(vec3(-0.36, 0.52, 0.76));
  col += BONE * pow(max(dot(refl, L), 0.0), 150.0) * 1.1;
  col += ACID * pow(clamp(1.0 - n.z, 0.0, 1.0), 6.0) * 0.55;

  /* Troughs sink into the black. */
  col *= 0.60 + 0.40 * smoothstep(-0.35, 0.45, h0);

  /* Photographic grade: cold shadows, warm silver. */
  float lum = luminance(col);
  vec3 cool = col * vec3(0.90, 0.94, 1.08);
  vec3 warm = col * vec3(1.07, 1.01, 0.91);
  col = mix(cool, warm, smoothstep(0.12, 0.80, lum));

  /* Cinematic falloff so the frame melts into the page. */
  float r2 = dot(p * vec2(0.82, 1.18), p * vec2(0.82, 1.18));
  col *= 0.16 + 0.84 * (1.0 - smoothstep(0.12, 0.98, r2));

  col = tonemapACES(col * 1.08);
  col = pow(col, vec3(1.18));
  col *= 0.94;
  col = grainDither(col, gl_FragCoord.xy, 0.036, uTime);

  gl_FragColor = vec4(col, 1.0);
}
