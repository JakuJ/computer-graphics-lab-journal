#define STEPS 10
#define BACKGROUND vec3(1)

precision highp float;

varying vec2 fragPosition;
uniform float time;

uniform sampler2D texture0;
uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D texture4;
uniform sampler2D texture5;
uniform sampler2D texture6;
uniform sampler2D texture7;
uniform sampler2D texture8;
uniform sampler2D texture9;
uniform sampler2D texture10;
uniform sampler2D texture11;
uniform sampler2D texture12;
uniform sampler2D texture13;
uniform sampler2D texture14;
uniform sampler2D texture15;

// SAMPLE NOISE

vec4 sampleNoise(vec3 point) {
  point.y = fract(point.y);

  float mapTo7 = point.y * 15.0;
  int lower = int(floor(mapTo7));
  float height = fract(mapTo7);

  if (lower == 0) {
    return mix(texture2D(texture0, point.xz), texture2D(texture1, point.xz),
               height);
  } else if (lower == 1) {
    return mix(texture2D(texture1, point.xz), texture2D(texture2, point.xz),
               height);
  } else if (lower == 2) {
    return mix(texture2D(texture2, point.xz), texture2D(texture3, point.xz),
               height);
  } else if (lower == 3) {
    return mix(texture2D(texture3, point.xz), texture2D(texture4, point.xz),
               height);
  } else if (lower == 4) {
    return mix(texture2D(texture4, point.xz), texture2D(texture5, point.xz),
               height);
  } else if (lower == 5) {
    return mix(texture2D(texture5, point.xz), texture2D(texture6, point.xz),
               height);
  } else if (lower == 6) {
    return mix(texture2D(texture6, point.xz), texture2D(texture7, point.xz),
               height);
  } else if (lower == 7) {
    return mix(texture2D(texture7, point.xz), texture2D(texture8, point.xz),
               height);
  } else if (lower == 8) {
    return mix(texture2D(texture8, point.xz), texture2D(texture9, point.xz),
               height);
  } else if (lower == 9) {
    return mix(texture2D(texture9, point.xz), texture2D(texture10, point.xz),
               height);
  } else if (lower == 10) {
    return mix(texture2D(texture10, point.xz), texture2D(texture11, point.xz),
               height);
  } else if (lower == 11) {
    return mix(texture2D(texture11, point.xz), texture2D(texture12, point.xz),
               height);
  } else if (lower == 12) {
    return mix(texture2D(texture12, point.xz), texture2D(texture13, point.xz),
               height);
  } else if (lower == 13) {
    return mix(texture2D(texture13, point.xz), texture2D(texture14, point.xz),
               height);
  } else if (lower == 14) {
    return mix(texture2D(texture14, point.xz), texture2D(texture15, point.xz),
               height);
  }

  return vec4(0.0);
}

float noiseDensity(vec3 point) {
  vec4 n = sampleNoise(point);
  return 0.5 * n.x + 0.25 * n.y + 0.125 * n.z + 0.0625 * n.w;
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
  return boxIntersection(ro, rd, vec3(1), normal);
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

  float totalDensity = 0.0;

  for (int i = 1; i <= STEPS; i++) {
    vec3 point = rayOrigin + rayDirection * dist;
    // return vec3(noiseDensity(point));

    totalDensity += noiseDensity(point) * stepSize;
    dist += stepSize;
  }

  float transmittance = exp(-totalDensity);
  return BACKGROUND * transmittance;
}

void main() {
  mat4 modelView = rotate(vec3(0, 1, 1), time) *
                   translate(vec3(0, 0, -5)); // orbiting the center

  vec3 rayOrigin = (modelView * vec4(0, 0, 0, 1)).xyz;
  vec3 rayDirection = normalize(modelView * vec4(fragPosition, 1, 0)).xyz;

  vec3 color = volumetricRayMarch(rayOrigin, rayDirection);
  gl_FragColor = vec4(color, 1);
}