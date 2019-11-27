#define STEPS 5
#define BACKGROUND vec3(0)

precision highp float;

varying vec2 fragPosition;
uniform float time;

uniform float scale;
uniform float threshold;
uniform float multiplier;

/// Permutation polynomial: (34x^2 + x) mod 289
vec4 permute(vec4 x) { return mod((34.0 * x + 1.0) * x, 289.0); }
vec3 permute(vec3 x) { return mod((34.0 * x + 1.0) * x, 289.0); }

vec4 dist(vec4 x, vec4 y, vec4 z) { return x * x + y * y + z * z; }

vec2 worley(vec3 P, float jitter) {
  float K = 0.142857142857;     // 1/7
  float Ko = 0.428571428571;    // 1/2-K/2
  float K2 = 0.020408163265306; // 1/(7*7)
  float Kz = 0.166666666667;    // 1/6
  float Kzo = 0.416666666667;   // 1/2-1/6*2

  vec3 Pi = mod(floor(P), 289.0);
  vec3 Pf = fract(P);
  vec4 Pfx = Pf.x + vec4(0.0, -1.0, 0.0, -1.0);
  vec4 Pfy = Pf.y + vec4(0.0, 0.0, -1.0, -1.0);
  vec4 p = permute(Pi.x + vec4(0.0, 1.0, 0.0, 1.0));
  p = permute(p + Pi.y + vec4(0.0, 0.0, 1.0, 1.0));
  vec4 p1 = permute(p + Pi.z);             // z+0
  vec4 p2 = permute(p + Pi.z + vec4(1.0)); // z+1
  vec4 ox1 = fract(p1 * K) - Ko;
  vec4 oy1 = mod(floor(p1 * K), 7.0) * K - Ko;
  vec4 oz1 = floor(p1 * K2) * Kz - Kzo; // p1 < 289 guaranteed
  vec4 ox2 = fract(p2 * K) - Ko;
  vec4 oy2 = mod(floor(p2 * K), 7.0) * K - Ko;
  vec4 oz2 = floor(p2 * K2) * Kz - Kzo;
  vec4 dx1 = Pfx + jitter * ox1;
  vec4 dy1 = Pfy + jitter * oy1;
  vec4 dz1 = Pf.z + jitter * oz1;
  vec4 dx2 = Pfx + jitter * ox2;
  vec4 dy2 = Pfy + jitter * oy2;
  vec4 dz2 = Pf.z - 1.0 + jitter * oz2;
  vec4 d1 = dist(dx1, dy1, dz1);
  vec4 d2 = dist(dx2, dy2, dz2);

  // Do it right and sort out both F1 and F2
  vec4 d = min(d1, d2);             // F1 is now in d
  d2 = max(d1, d2);                 // Make sure we keep all candidates for F2
  d.xy = (d.x < d.y) ? d.xy : d.yx; // Swap smallest to d.x
  d.xz = (d.x < d.z) ? d.xz : d.zx;
  d.xw = (d.x < d.w) ? d.xw : d.wx; // F1 is now in d.x
  d.yzw = min(d.yzw, d2.yzw);       // F2 now not in d2.yzw
  d.y = min(d.y, d.z);              // nor in d.z
  d.y = min(d.y, d.w);              // nor in d.w
  d.y = min(d.y, d2.x);             // F2 is now in d.y
  return 1.0 - sqrt(d.xy);          // inverted F1 and F2
}

vec4 sampleNoise(vec3 point) {
  vec3 p1 = point * scale;
  float n1 = worley(p1, 1.0).x;

  vec3 p2 = point * scale * 2.0;
  float n2 = worley(p2, 1.0).x;

  vec3 p3 = point * scale * 4.0;
  float n3 = worley(p3, 1.0).x;

  vec3 p4 = point * scale * 8.0;
  float n4 = worley(p4, 1.0).x;

  return vec4(n1, n2, n3, n4);
}

// SAMPLE NOISE

float noiseDensity(vec3 point) {
  point.x += time;
  vec4 n = sampleNoise(point);

  vec4 coeffs = vec4(0.5, 0.25, 0.125, 0.0625);
  float density = dot(coeffs, n);

  return max(0.0, density - threshold) * multiplier;
}

// TRANSFORMATION MATRICES

mat4 translate(vec3 v) {
  return mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, v, 1);
}

mat4 rotate(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat4(
      oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s,
      oc * axis.z * axis.x + axis.y * s, 0.0, oc * axis.x * axis.y + axis.z * s,
      oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 0.0,
      oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s,
      oc * axis.z * axis.z + c, 0.0, 0.0, 0.0, 0.0, 1.0);
}

// RAY - BOX INTERSECTION

vec2 boxIntersection(vec3 ro, vec3 rd, vec3 boxSize, out vec3 outNormal) {
  vec3 m = 1.0 / rd; // can precompute if traversing a set of aligned boxes
  vec3 n = m * ro;   // can precompute if traversing a set of aligned boxes
  vec3 k = abs(m) * boxSize;
  vec3 t1 = -n - k;
  vec3 t2 = -n + k;
  float tN = max(max(t1.x, t1.y), t1.z);
  float tF = min(min(t2.x, t2.y), t2.z);

  if (tN > tF || tF < 0.0) {
    return vec2(-1.0); // no intersection
  }

  outNormal = -sign(rd) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
  return vec2(tN, tF);
}

vec2 sceneIntersection(vec3 ro, vec3 rd) {
  vec3 normal;
  return boxIntersection(ro, rd, vec3(2), normal);
}

// RENDERING FUNCTIONS

vec3 volumetricRayMarch(vec3 rayOrigin, vec3 rayDirection) {
  // find bounds of the cloud box
  vec2 bounds = sceneIntersection(rayOrigin, rayDirection);

  // check if not intersecting
  if (bounds.y < 0.0) {
    return BACKGROUND;
  }

  float fullDist = bounds.y - bounds.x;

  float dist = bounds.x;
  float stepSize = fullDist / float(STEPS);

  float transmittance = 1.0;

  for (int i = 1; i <= STEPS; i++) {
    vec3 point = rayOrigin + rayDirection * dist;

    // return vec3(noiseDensity(point));

    float density = noiseDensity(point) * stepSize;
    transmittance *= exp(-density);

    dist += stepSize;

    // early exit
    if (transmittance < 0.01) {
      break;
    }
  }

  return 1.0 - vec3(transmittance);
}

void main() {
  mat4 modelView = translate(vec3(0, 0, -6)); // orbiting the center

  vec3 rayOrigin = (modelView * vec4(0, 0, 0, 1)).xyz;
  vec3 rayDirection = normalize(modelView * vec4(fragPosition, 1, 0)).xyz;

  vec3 color = volumetricRayMarch(rayOrigin, rayDirection);
  gl_FragColor = vec4(color, 1);
}