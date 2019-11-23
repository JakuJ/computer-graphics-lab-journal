#define MAX_STEPS 50
#define MAX_DIST 150.0
#define SURF_DIST 0.001
#define WORLD_SIZE 12.0
#define GLOW_MARGIN 2.0
#define SHADOWS 0
#define ATTENUATION 1

precision mediump float;

varying vec2 fragPosition;
uniform float time;

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
  point = vecMod(point, WORLD_SIZE);
  return length(point - center) - radius;
}

float de_plane(vec3 point, float y) { return point.y - y; }

float getDistance(vec3 point) {
  float sphereDist = de_sphere(point, vec3(0, 1, 1), 2.0);
  float planeDist = de_plane(point, 0.0);
  return sminCubic(sphereDist, planeDist, 2.0);
}

float rayMarch(vec3 rayOrigin, vec3 rayDirection, out float minDist) {
  float dist = 0.0;
  minDist = MAX_DIST;

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = rayOrigin + rayDirection * dist;
    float d = getDistance(p);

    if (d < minDist) {
      minDist = d;
    }

    dist += d;
    if (dist > MAX_DIST || dist < SURF_DIST)
      break;
  }

  return dist;
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
  return rayOrigin + WORLD_SIZE * 2.0 * vec3(sin(time), 0, cos(time));
}

vec3 getLight(vec3 point, vec3 rayOrigin, float minDist) {
  // coefficients
  float Ka = 0.05;
  float Kg = 0.2;
  float Kd = 0.65;
  float Ks = 0.2;
  float alpha = 50.0;

  // material properties
  vec3 Ma = vec3(1, 1, 1);        // ambient
  vec3 Mg = vec3(1, 0.7, 1);      // glow
  vec3 Md = vec3(0.76, 0.7, 0.5); // diffuse
  vec3 Ms = vec3(1, 1, 0);        // specular

  // point light in the eye
  vec3 lightPos = getLightPosition(rayOrigin);
  vec3 l = normalize(lightPos - point);
  vec3 n = getNormal(point);
  vec3 v = normalize(rayOrigin - point);

  vec3 color = vec3(0);

  // ambient term
  color += Ka * Ma;

  // glow term
  if (minDist < GLOW_MARGIN) {
    float str = (1.0 - minDist / GLOW_MARGIN);
    color += Mg * Kg * str * str;
  }

  // no other terms in the void
  float dist = getDistance(point);
  if (dist > SURF_DIST) {
    return color;
  }

  if (dot(n, l) > 0.0) {
    // lambertian term
    float diffuse = dot(n, l);

    // specular term
    float cos_alpha = dot(reflect(-l, n), v);
    float specular = pow(cos_alpha, alpha);

#if SHADOWS
    float minLight;
    float distanceToLight = rayMarch(point + n * SURF_DIST * 2., l, minLight);
    // point light shadows
    if (distanceToLight < length(lightPos - point)) {
      diffuse *= 0.5;
      specular *= 0.0;
    }
#endif
#if ATTENUATION
    // inverse square law
    float m = exp(-0.01 * length(lightPos - point));
    diffuse *= m;
    specular *= m;

#endif
    color += Md * Kd * diffuse;
    color += Ms * Ks * specular;
  }

  return clamp(color, 0.0, 1.0);
}

void main() {
  // model space
  vec3 rayOrigin = vec3(time, 4, time);
  vec3 rayDirection = normalize(vec3(fragPosition, 1));

  float minDist;
  float dist = rayMarch(rayOrigin, rayDirection, minDist);

  vec3 point = rayOrigin + dist * rayDirection;
  vec3 color = vec3(getLight(point, rayOrigin, minDist));
  gl_FragColor = vec4(color, 1);
}