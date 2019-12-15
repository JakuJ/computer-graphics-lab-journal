#define MAX_STEPS 100
#define SURF_DIST 0.001
#define SPONGE_SIZE 1.0
#define PLANE_Y (-3.0)
#define WORLD_SIZE 6.0
#define MAX_DIST 40.0
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

// HELPER FUNCTIONS

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

float de_plane(vec3 point, float y) { return point.y - y; }

// SCENE DISTANCE FUNCTION

vec4 distanceField(vec3 point) {
  // Modulo repetition of the world
  point = vecMod(point);

  // Ground plane distance
  float planedist = de_plane(point, PLANE_Y);

  // Optimization - we can use early exit below some y value
  // because the scene is axis-oriented
  if (planedist < 1.0) {
    return vec4(planedist, vec3(1));
  }

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

  // Ground plane, union with the fractal
  if (planedist < d) {
    return vec4(planedist, vec3(1));
  }

  return vec4(d, material);
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

  for (int i = 1; i <= MAX_STEPS; i++) {
    point = rayOrigin + rayDirection * total;
    vec4 field = distanceField(point);
    dist = field.x;

    // volumetric glow density using distance attenuation
    // disabled for the ground plane
    // fractal color doesn't have the green component
    if (field.z < 0.99) {
      glowDensity += glowIntensity(dist, total);
    }

    if (dist < SURF_DIST || total > MAX_DIST) {
      break;
    }

    total += dist;
  }

  // glow correction when we collide with a surface that's not the ground plane
  if (dist < SURF_DIST && point.y > PLANE_Y + SURF_DIST) {
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
    } else if (total > MAX_DIST) {
      break;
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

  // numerical approximation to the SDF gradient
  vec3 n = d - vec3(distanceField(p - eps.xyy).x, distanceField(p - eps.yxy).x,
                    distanceField(p - eps.yyx).x);

  return normalize(n);
}

vec3 getLightPosition(vec3 rayOrigin) { return vec3(5.0 * sin(5.0 * time), 10, 0); }

vec3 getLight(vec3 rayOrigin, vec3 rayDirection) {
  // material properties
  const vec3 Ma = vec3(1);        // ambient
  const vec3 Md = vec3(1); // diffuse
  const vec3 Ms = vec3(1);        // specular
  const vec3 Mg = vec3(1, 0.6, 0.8);    // glow

  // ray march
  float glowDensity;
  float totalDist;
  vec4 rm = rayMarch(rayOrigin, rayDirection, glowDensity);
  vec3 point = rm.xyz;
  totalDist = rm.w;

  // point light in the eye
  vec3 lightPos = getLightPosition(rayOrigin);
  vec3 l = normalize(lightPos - point);
  vec3 n = getNormal(point);
  vec3 v = normalize(rayOrigin - point);

  // glow term
  vec3 color = Mg * Kg * glowDensity;

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
  mat4 modelView = rotate(vec3(0, 1, 0), time / 2.0) * rotate(vec3(1, 0, 0), -0.5) *
                   translate(vec3(0, 0, -(WORLD_SIZE + 3.0 * SPONGE_SIZE))); // orbiting the center

  vec3 rayOrigin = (modelView * vec4(0, 0, 0, 1)).xyz;
  vec3 rayDirection = normalize(modelView * vec4(fragPosition, 1, 0)).xyz;

  vec3 color = getLight(rayOrigin, rayDirection);

  gl_FragColor = vec4(color, 1);
}