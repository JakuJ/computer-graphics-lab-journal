#define STEPS 3
#define LIGHT_STEPS 3
#define BACKGROUND vec3(0.53, 0.81, 1.0)
#define CLOUD_COL vec3(1, 1, 1)

precision highp float;

varying vec2 fragPosition;
uniform float time;

uniform float scale;
uniform float threshold;
uniform float multiplier;
uniform float lightAbsorptionTowardsSun;
uniform float lightAbsorptionThroughCloud;
uniform float darknessThreshold;

uniform bool useLight;
uniform bool lookDown;

// WORLEY NOISE FUNCTION
// https://github.com/stegu/webgl-noise/blob/master/src/cellular2x2x2.glsl

// Modulo 289 without a division (only multiplications)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }

// Modulo 7 without a division
vec4 mod7(vec4 x) { return x - floor(x * (1.0 / 7.0)) * 7.0; }

// Permutation polynomial: (34x^2 + x) mod 289
vec3 permute(vec3 x) { return mod289((34.0 * x + 1.0) * x); }

vec4 permute(vec4 x) { return mod289((34.0 * x + 1.0) * x); }

// Cellular noise, returning F1 and F2 in a vec2.
// Speeded up by using 2x2x2 search window instead of 3x3x3,
// at the expense of some pattern artifacts.
// F2 is often wrong and has sharp discontinuities.
// If you need a good F2, use the slower 3x3x3 version.
vec2 worley(vec3 P) {
#define K 0.142857142857     // 1/7
#define Ko 0.428571428571    // 1/2-K/2
#define K2 0.020408163265306 // 1/(7*7)
#define Kz 0.166666666667    // 1/6
#define Kzo 0.416666666667   // 1/2-1/6*2
#define jitter 0.8           // smaller jitter gives less errors in F2
  vec3 Pi = mod289(floor(P));
  vec3 Pf = fract(P);
  vec4 Pfx = Pf.x + vec4(0.0, -1.0, 0.0, -1.0);
  vec4 Pfy = Pf.y + vec4(0.0, 0.0, -1.0, -1.0);
  vec4 p = permute(Pi.x + vec4(0.0, 1.0, 0.0, 1.0));
  p = permute(p + Pi.y + vec4(0.0, 0.0, 1.0, 1.0));
  vec4 p1 = permute(p + Pi.z);             // z+0
  vec4 p2 = permute(p + Pi.z + vec4(1.0)); // z+1
  vec4 ox1 = fract(p1 * K) - Ko;
  vec4 oy1 = mod7(floor(p1 * K)) * K - Ko;
  vec4 oz1 = floor(p1 * K2) * Kz - Kzo; // p1 < 289 guaranteed
  vec4 ox2 = fract(p2 * K) - Ko;
  vec4 oy2 = mod7(floor(p2 * K)) * K - Ko;
  vec4 oz2 = floor(p2 * K2) * Kz - Kzo;
  vec4 dx1 = Pfx + jitter * ox1;
  vec4 dy1 = Pfy + jitter * oy1;
  vec4 dz1 = Pf.z + jitter * oz1;
  vec4 dx2 = Pfx + jitter * ox2;
  vec4 dy2 = Pfy + jitter * oy2;
  vec4 dz2 = Pf.z - 1.0 + jitter * oz2;
  vec4 d1 = dx1 * dx1 + dy1 * dy1 + dz1 * dz1; // z+0
  vec4 d2 = dx2 * dx2 + dy2 * dy2 + dz2 * dz2; // z+1

  // Sort out the two smallest distances (F1, F2)
  // Cheat and sort out only F1
  d1 = min(d1, d2);
  d1.xy = min(d1.xy, d1.wz);
  d1.x = min(d1.x, d1.y);
  return vec2(sqrt(d1.x));
}

vec4 sampleNoise(vec3 point) {
  vec3 p1 = point * scale;
  float n1 = worley(p1).x;

  vec3 p2 = point * scale * 2.0;
  float n2 = worley(p2).x;

  vec3 p3 = point * scale * 4.0;
  float n3 = worley(p3).x;

  // vec3 p4 = point * scale * 8.0;
  // float n4 = worley(p4).x;

  return vec4(n1, n2, n3, 0);
}

// Sample noise density at point

float noiseDensity(vec3 point) {
  point.x += time;
  vec4 n = sampleNoise(point);

  vec4 coeffs = vec4(0.5, 0.25, 0.125, 0.0625);
  float density = dot(coeffs, n);

  return max(0.0, (density - threshold) * multiplier);
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

vec2 rayBoxDst(vec3 boundsMin, vec3 boundsMax, vec3 rayOrigin, vec3 invRaydir) {
  // Adapted from: http://jcgt.org/published/0007/03/04/
  vec3 t0 = (boundsMin - rayOrigin) * invRaydir;
  vec3 t1 = (boundsMax - rayOrigin) * invRaydir;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);

  float dstA = max(max(tmin.x, tmin.y), tmin.z);
  float dstB = min(tmax.x, min(tmax.y, tmax.z));

  // CASE 1: ray intersects box from outside (0 <= dstA <= dstB)
  // dstA is dst to nearest intersection, dstB dst to far intersection

  // CASE 2: ray intersects box from inside (dstA < 0 < dstB)
  // dstA is the dst to intersection behind the ray, dstB is dst to forward
  // intersection

  // CASE 3: ray misses box (dstA > dstB)

  float dstToBox = max(0.0, dstA);
  float dstInsideBox = max(0.0, dstB - dstToBox);
  return vec2(dstToBox, dstInsideBox);
}

vec2 sceneIntersection(vec3 ro, vec3 rd) {
  vec3 normal;
  vec3 bounds = vec3(3, 1, 3);
  // vec2 rbd = rayBoxDst(bounds, bounds, ro, 1.0 / rd);
  // return vec2(rbd.x, rbd.y);
  return boxIntersection(ro, rd, bounds, normal);
}

// RENDERING FUNCTIONS

vec3 getLightDirection() { return vec3(0, 1, -1); }

// Calculate proportion of light that reaches the given point from the
// lightsource
float lightMarch(vec3 point) {
  vec3 dirToLight = getLightDirection();

  float dstInsideBox = sceneIntersection(point, dirToLight).y;

  float stepSize = dstInsideBox / float(LIGHT_STEPS);
  point += dirToLight * stepSize * 0.5;

  float totalDensity = 0.0;

  for (int i = 0; i < LIGHT_STEPS; i++) {
    float density = noiseDensity(point);
    totalDensity += max(0.0, density * stepSize);
    point += dirToLight * stepSize;
  }

  float transmittance = exp(-totalDensity * lightAbsorptionTowardsSun);
  return darknessThreshold +
         transmittance * (1.0 - darknessThreshold); // clamped transmittance
}

vec3 volumetricRayMarch(vec3 rayOrigin, vec3 rayDirection) {
  // find bounds of the cloud box
  vec2 bounds = sceneIntersection(rayOrigin, rayDirection);

  // check if not intersecting
  if (bounds.y <= 0.0) {
    return BACKGROUND;
  }

  float dist = bounds.x;
  float stepSize = bounds.y / float(STEPS);

  float transmittance = 1.0;
  float lightEnergy = 0.0;

  for (int i = 1; i <= STEPS; i++) {
    vec3 point = rayOrigin + rayDirection * dist;

    float density = noiseDensity(point) * stepSize;

    // light
    if (density > 0.0) {
      if (useLight) {
        float lightTransmittance = lightMarch(point);
        lightEnergy += density * stepSize * transmittance * lightTransmittance;
      }

      transmittance *= exp(-density * stepSize * lightAbsorptionThroughCloud);

      // early exit
      if (transmittance < 0.01) {
        break;
      }
    }

    dist += stepSize;
  }

  return BACKGROUND * transmittance + CLOUD_COL * lightEnergy;
}

void main() {

  mat4 modelView =
      translate(vec3(0, lookDown ? 3 : -3, -5)) *
      rotate(vec3(1, 0, 0), lookDown ? -0.7 : 0.7); // orbiting the center

  vec3 rayOrigin = (modelView * vec4(0, 0, 0, 1)).xyz;
  vec3 rayDirection = normalize(modelView * vec4(fragPosition, 1, 0)).xyz;

  vec3 color = volumetricRayMarch(rayOrigin, rayDirection);
  gl_FragColor = vec4(color, 1);
}