#define MAX_STEPS 100
#define SURF_DIST 0.001
#define SPONGE_SIZE 2.0
#define WORLD_SIZE 6.0
#define MAX_DIST 100.0
#define REFLECTIONS 0
#define BACKGROUND vec3(0)

precision highp float;

varying vec2 fragPosition;
uniform float time;
uniform float Ka;
uniform float Kg;
uniform float glowRadius;
uniform float Kd;
uniform float Ks;
uniform float shininess;

uniform bool useShadows;

uniform bool useAttenuation;
uniform float attenuationCoefficient;

uniform int boundMode;

// HELPER FUNCTIONS

// float modulo
vec3 vecMod(vec3 point) {
  const vec3 repetitions = vec3(1, 0, 0);
  vec3 base = floor(point / WORLD_SIZE + 0.5);

  return point - WORLD_SIZE * clamp(base, -repetitions, repetitions);
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

// DISTANCE ESTIMATORS

float de_box3D(vec3 point, vec3 bounds) {
  vec3 q = abs(point) - bounds;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// RAY TRACING INTERSECTIONS
// used to speed up ray marching by the use of bounding boxes

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

// SCENE DISTANCE FUNCTION

vec4 distanceField(vec3 point) {
  // Modulo repeated world
  point = vecMod(point);

  // Menger sponge
  float d = de_box3D(point, vec3(SPONGE_SIZE));
  float s = 1.0;

  vec3 material = vec3(1, 0, 0);

  const float iters = 3.0;

  for (float m = 1.0; m <= iters; m++) {
    vec3 a = mod(point * s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = abs(1.0 - 3.0 * abs(a));

    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float c = (min(da, min(db, dc)) - 1.0) / s;

    if (c > d) {
      d = c;
      material = vec3(0.2 * da * db * dc, 0, 1.0 - m / iters);
    }
  }
  return vec4(d, material);
}

float sceneBoundsRT(vec3 rayOrigin, vec3 rayDirection) {
  vec3 normal;
  vec2 res =
      boxIntersection(rayOrigin, rayDirection,
                      vec3(SPONGE_SIZE + SURF_DIST + glowRadius), normal);

  if (sign(res.x * res.y) < 0.5) {
    return 0.0;
  } else if (res.x > 0.0) {
    return res.x;
  }

  return -1.0;
}

float boundsField(vec3 point) {
  point = vecMod(point);

  vec3 boxSize = vec3(SPONGE_SIZE + glowRadius);
  return de_box3D(point, boxSize);
}

float sceneBoundsRM(vec3 rayOrigin, vec3 rayDirection) {
  float total = 0.0;
  vec3 point;

  for (int i = 1; i <= MAX_STEPS; i++) {
    point = rayOrigin + rayDirection * total;
    float dist = boundsField(point);

    if (total > MAX_DIST) {
      return -1.0;
    } else if (dist < SURF_DIST) {
      return total;
    }

    total += dist;
  }

  return -1.0;
}

// RENDERING FUNCTIONS

float glowIntensity(float d, float dist) {
  if (d < glowRadius) {
    float intensity = 1.0 - (d / glowRadius);
    if (useAttenuation) {
      intensity *= exp(-attenuationCoefficient * dist);
    }
    return intensity;
  }
  return 0.0;
}

vec4 rayMarch(vec3 rayOrigin, vec3 rayDirection, out float glowDensity) {
  float total = 0.0;
  float dist;
  vec3 point;

  glowDensity = 0.0;

  // hopefully a speed-up: try to raytrace once with simple bounding boxes
  if (boundMode == 1) {
    total = sceneBoundsRT(rayOrigin, rayDirection);
  } else if (boundMode == 2) {
    total = sceneBoundsRM(rayOrigin, rayDirection);
  }

  if (total < 0.0) {
    return vec4(rayOrigin, total);
  }

  for (int i = 1; i <= MAX_STEPS; i++) {
    point = rayOrigin + rayDirection * total;
    dist = distanceField(point).x;

    // volumetric (?) glow density using distance attenuation
    glowDensity += glowIntensity(dist, total);

    if (total > MAX_DIST || dist < SURF_DIST) {
      break;
    }

    total += dist;
  }

  if (dist < SURF_DIST) {
    float surfaceGlow = 10.0;
    if (useAttenuation) {
      surfaceGlow *= exp(-attenuationCoefficient * total);
    }
    glowDensity = max(glowDensity, surfaceGlow);
  }

  glowDensity *= 0.1;

  return vec4(point, total);
}

float softShadow(vec3 rayOrigin, vec3 rayDirection, float distanceToLight,
                 float k) {
  float res = 1.0;
  float total = 0.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    float dist = distanceField(rayOrigin + rayDirection * total).x;

    if (dist < SURF_DIST) {
      return 0.0;
    } else if (dist > MAX_DIST) {
      return res;
    }

    if (total > distanceToLight) {
      break;
    }

    res = min(res, k * dist / total);
    total += dist;
  }
  return res;
}

vec3 getNormal(vec3 p) {
  float d = distanceField(p).x;
  const vec2 eps = vec2(SURF_DIST * 0.1, 0);

  // numerical approximation to a derivative
  vec3 n = d - vec3(distanceField(p - eps.xyy).x, distanceField(p - eps.yxy).x,
                    distanceField(p - eps.yyx).x);

  return normalize(n);
}

vec3 getLightPosition(vec3 rayOrigin) { return rayOrigin + vec3(0, 1, 0); }

vec3 getLight(vec3 rayOrigin, vec3 rayDirection, out vec3 point) {
  // material properties
  const vec3 Ma = vec3(1, 1, 1);        // ambient
  const vec3 Mg = vec3(1, 0.6, 0.8);    // glow
  const vec3 Md = vec3(0.76, 0.7, 0.5); // diffuse
  const vec3 Ms = vec3(1, 1, 1);        // specular

  // ray march
  float glowDensity;
  float totalDist;
  vec4 rm = rayMarch(rayOrigin, rayDirection, glowDensity);
  point = rm.xyz;
  totalDist = rm.w;

  // ray marching stopped by boundary check
  if (rm.w < 0.0) {
    return BACKGROUND;
  }

  // point light in the eye
  vec3 lightPos = getLightPosition(rayOrigin);
  vec3 l = normalize(lightPos - point);
  vec3 n = getNormal(point);
  vec3 v = normalize(rayOrigin - point);

  vec3 color = vec3(0);

  // glow term
  color += Mg * Kg * glowDensity;

  // no other terms in the void
  vec4 field = distanceField(point);
  if (field.x > SURF_DIST) {
    return color;
  }

  // ambient term
  float ambient = 1.0;
  if (useAttenuation) {
    ambient *= exp(-attenuationCoefficient * totalDist);
  }
  color += Ka * Ma * ambient;

  // lambertian term
  float diffuse = dot(n, l);

  if (diffuse > 0.0) {
    // specular term
    vec3 r = normalize(reflect(-l, n));
    float cos_alpha = max(dot(v, r), 0.0);
    float specular = pow(cos_alpha, shininess);

    if (useShadows) {
      float k = softShadow(point + 2.0 * SURF_DIST * n, l,
                           length(lightPos - point), 32.0);
      diffuse *= k;
      specular *= k;
    }

    if (useAttenuation) {
      float m = exp(-attenuationCoefficient * length(lightPos - point));
      diffuse *= m;
      specular *= m;
    }

    color += Md * Kd * diffuse;
    color += Ms * Ks * specular;
  }

  return color * field.yzw;
}

void main() {
  // model space
  mat4 modelView = rotate(vec3(0, 1, 0), time) *
                   translate(vec3(0, 0, -(WORLD_SIZE + 2.0 * SPONGE_SIZE))); // orbiting the center

  vec3 rayOrigin = (modelView * vec4(0, 0, 0, 1)).xyz;
  vec3 rayDirection = normalize(modelView * vec4(fragPosition, 1, 0)).xyz;

  vec3 point;
  vec3 color = getLight(rayOrigin, rayDirection, point);

// first reflection
#if REFLECTIONS >= 1
  if (distanceField(point).x < SURF_DIST) {
    vec3 refl = normalize(reflect(rayDirection, getNormal(point)));
    vec3 point2;
    vec3 color2 = getLight(point + 2.0 * refl * SURF_DIST, refl, point2);
    if (useAttenuation) {
      color2 *= exp(-attenuationCoefficient * length(rayOrigin - point));
    }
    color += 0.5 * color2;
#if REFLECTIONS == 2
    // second reflection
    if (distanceField(point2).x < SURF_DIST) {
      vec3 refl2 = normalize(reflect(refl, getNormal(point2)));
      vec3 point3;
      vec3 color3 = getLight(point2 + 2.0 * refl2 * SURF_DIST, refl2, point3);
      if (useAttenuation) {
        color3 *= exp(-attenuationCoefficient * length(point - point2));
      }
      color += 0.25 * color3;
    }
#endif
  }
#endif
  gl_FragColor = vec4(color, 1);
}