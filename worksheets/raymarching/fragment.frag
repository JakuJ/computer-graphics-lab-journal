#define MAX_STEPS 50
#define MAX_DIST 500.0
#define SURF_DIST 0.05
#define WORLD_SIZE 10.0

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

// float modulo
vec3 vecMod(vec3 point, float boxSize) {
  vec3 base = floor(point / boxSize + 0.5);
  return point - boxSize * base;
}

// cubic smooth min (k = 0.1);
float smoothUnion(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * h * k * (1.0 / 6.0);
}

// distance estimators
float de_sphere(vec3 point, vec3 center, float radius) {
  point = vecMod(point, WORLD_SIZE);
  return length(point - center) - radius;
}

float de_plane(vec3 point, float y) { return abs(point.y - y); }

float getDistance(vec3 point) {
  float sphereDist = de_sphere(point, vec3(0, 0, 0), 2.0);
  float planeDist1 = de_plane(point, 0.0);
  return smoothUnion(planeDist1, sphereDist, 2.0);
}

float glowIntensity(vec3 point, float dist) {
  float d = getDistance(point);
  if (d < glowRadius) {
    float intensity = 1.0 - (d / glowRadius);
    if (useAttenuation) {
      intensity *= exp(-attenuationCoefficient * dist);
    }
    return intensity;
  }
  return 0.0;
}

float rayMarch(vec3 rayOrigin, vec3 rayDirection, out float glowDensity) {
  float total = 0.0;
  float dist;

  glowDensity = 0.0;

  for (int i = 1; i <= MAX_STEPS; i++) {
    vec3 point = rayOrigin + rayDirection * total;
    dist = getDistance(point);
    total += dist;

    // volumetric (?) glow density using distance attenuation
    glowDensity += glowIntensity(point, total);

    if (total > MAX_DIST || dist < SURF_DIST) {
      break;
    }
  }

  if (dist < SURF_DIST) {
    float surfaceGlow = 10.0;
    if (useAttenuation) {
      surfaceGlow *= exp(-attenuationCoefficient * total);
    }
    glowDensity = max(glowDensity, surfaceGlow);
  }

  glowDensity *= 0.1;

  return total;
}

float softShadow(vec3 rayOrigin, vec3 rayDirection, float distanceToLight,
                 float k) {
  float res = 1.0;
  float total = 0.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    float dist = getDistance(rayOrigin + rayDirection * total);

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
  float d = getDistance(p);
  const vec2 eps = vec2(SURF_DIST * 0.1, 0);

  // numerical approximation to a derivative
  vec3 n = d - vec3(getDistance(p - eps.xyy), getDistance(p - eps.yxy),
                    getDistance(p - eps.yyx));

  return normalize(n);
}

vec3 getLightPosition(vec3 rayOrigin) {
  return rayOrigin + WORLD_SIZE * vec3(0, 0.5, 0);
}

vec3 getLight(vec3 rayOrigin, vec3 rayDirection, out vec3 point) {
  // material properties
  const vec3 Ma = vec3(1, 1, 1);        // ambient
  const vec3 Mg = vec3(1, 0.6, 0.8);    // glow
  const vec3 Md = vec3(0.76, 0.7, 0.5); // diffuse
  const vec3 Ms = vec3(1, 1, 1);        // specular

  // ray march
  float glowDensity;
  float dist = rayMarch(rayOrigin, rayDirection, glowDensity);
  point = rayOrigin + dist * rayDirection;

  // point light in the eye
  vec3 lightPos = getLightPosition(rayOrigin);
  vec3 l = normalize(lightPos - point);
  vec3 n = getNormal(point);
  vec3 v = normalize(rayOrigin - point);

  vec3 color = vec3(0);

  // glow term
  color += Mg * Kg * glowDensity;

  // no other terms in the void
  if (getDistance(point) > SURF_DIST) {
    return color;
  }

  // ambient term
  float ambient = 1.0;
  if (useAttenuation) {
    ambient *= exp(-attenuationCoefficient * length(rayOrigin - point));
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
                           length(point - lightPos), 64.0);
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

  return color;
}

void main() {
  // model space
  vec3 rayOrigin = vec3(WORLD_SIZE * 0.5, WORLD_SIZE, 3.0 * time);
  vec3 rayDirection = normalize(vec3(fragPosition, 1));

  vec3 point;
  vec3 color = getLight(rayOrigin, rayDirection, point);

  if (getDistance(point) < SURF_DIST) {
    vec3 refl = normalize(reflect(rayDirection, getNormal(point)));
    vec3 point2;
    vec3 color2 = getLight(point + 2.0 * refl * SURF_DIST, refl, point2);
    if (useAttenuation) {
      color2 *= exp(-attenuationCoefficient * length(rayOrigin - point));
    }
    color += color2;
  }

  gl_FragColor = vec4(color, 1);
}