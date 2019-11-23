#define MAX_STEPS 100
#define MAX_DIST 50.0
#define SURF_DIST 0.01
#define WORLD_SIZE 10.0
#define GLOW_MARGIN 2.0

precision highp float;

varying vec2 fragPosition;
uniform float time;
uniform float Ka;
uniform float Kg;
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

// polynomial smooth min (k = 0.1);
float sminCubic(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * h * k * (1.0 / 6.0);
}

// distance estimators
float de_sphere(vec3 point, vec3 center, float radius) {
  //   point = vecMod(point, WORLD_SIZE);
  return length(point - center) - radius;
}

float de_plane(vec3 point, float y) { return point.y - y; }

float getDistance(vec3 point) {
  float sphereDist = de_sphere(point, vec3(0, 1, 3), 1.0);
  float planeDist = de_plane(point, -1.0);
  return sminCubic(sphereDist, planeDist, 2.0);
}

float rayMarch(vec3 rayOrigin, vec3 rayDirection, out float glowDensity) {
  float dist = 0.0;

  glowDensity = 0.0;
  float glowIncrease = 0.0;

  float steps = float(MAX_STEPS);
  vec3 p;
  float d;

  for (int i = 1; i <= MAX_STEPS; i++) {
    p = rayOrigin + rayDirection * dist;
    d = getDistance(p);

    // volumetric glow density for all but the last object
    if (d < GLOW_MARGIN) {
      glowIncrease += (1.0 - d / GLOW_MARGIN);
    } else {
      glowDensity += glowIncrease;
      glowIncrease = 0.0;
    }

    dist += d;
    if (dist > MAX_DIST || dist < SURF_DIST) {
      steps = float(i);
      break;
    }
  }

  if (d > SURF_DIST) {
    glowDensity += glowIncrease;
  }

  glowDensity /= steps;
  return dist;
}

float softShadow(vec3 rayOrigin, vec3 rayDirection, float k) {
  float res = 1.0;
  float total = 0.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    float dist = getDistance(rayOrigin + rayDirection * total);
    if (dist < SURF_DIST) {
      return 0.0;
    } else if (dist > MAX_DIST) {
      return res;
    }

    res = min(res, k * dist / total);
    total += dist;
  }
  return res;
}

vec3 getNormal(vec3 p) {
  float d = getDistance(p);
  vec2 eps = vec2(.01, 0);

  // numerical approximation to a derivative
  vec3 n = d - vec3(getDistance(p - eps.xyy), getDistance(p - eps.yxy),
                    getDistance(p - eps.yyx));

  return normalize(n);
}

vec3 getLightPosition(vec3 rayOrigin) {
  return vec3(2.0 * -sin(time), 10, 3.0 + 2.0 * cos(time));
}

vec3 getLight(vec3 point, vec3 rayOrigin, float glowDensity) {
  // material properties
  vec3 Ma = vec3(1, 1, 1);        // ambient
  vec3 Mg = vec3(1, 0.8, 1);      // glow
  vec3 Md = vec3(0.76, 0.7, 0.5); // diffuse
  vec3 Ms = vec3(1, 1, 1);        // specular

  // point light in the eye
  vec3 lightPos = getLightPosition(rayOrigin);
  vec3 l = normalize(lightPos - point);
  vec3 n = getNormal(point);
  vec3 v = normalize(rayOrigin - point);

  vec3 color = vec3(0);

  // glow term
  color += Mg * Kg * max(glowDensity, 0.0);
  //   return color;

  // no other terms in the void
  float dist = getDistance(point);
  if (dist > SURF_DIST) {
    return color;
  }

  // ambient term
  color += Ka * Ma;

  // lambertian term
  float diffuse = dot(n, l);

  if (diffuse > 0.0) {
    // specular term
    vec3 r = normalize(reflect(-l, n));
    float cos_alpha = max(dot(v, r), 0.0);
    float specular = pow(cos_alpha, shininess);

    if (useShadows) {
      float k = softShadow(point + 2.0 * SURF_DIST * n, l, 32.0);
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

  return clamp(color, 0.0, 1.0);
}

void main() {
  // model space
  vec3 rayOrigin = vec3(0, 1, -1);
  vec3 rayDirection = normalize(vec3(fragPosition, 1));

  float glowDensity;
  float dist = rayMarch(rayOrigin, rayDirection, glowDensity);

  vec3 point = rayOrigin + dist * rayDirection;
  vec3 color = getLight(point, rayOrigin, glowDensity);
  gl_FragColor = vec4(color, 1);
}