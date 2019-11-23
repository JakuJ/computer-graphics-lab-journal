#define MAX_STEPS 100
#define MAX_DIST 100.0
#define SURF_DIST 0.001

precision mediump float;

varying vec2 fragPosition;
uniform float time;

float getDistance(vec3 point) {
  vec3 spherePosition = vec3(0, 0, 4);
  float sphereRadius = 1.0;
  float sphereDistance = length(spherePosition - point) - sphereRadius;

  float planeY = -1.0;
  float planeDistance = point.y - planeY;
  return min(sphereDistance, planeDistance);
}

float rayMarch(vec3 rayOrigin, vec3 rayDirection) {
  float dist = 0.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = rayOrigin + rayDirection * dist;
    float d = getDistance(p);
    dist += d;
    if (dist > MAX_DIST || dist < SURF_DIST)
      break;
  }

  return dist;
}

vec3 getNormal(vec3 p) {
  float d = getDistance(p);
  vec2 e = vec2(.001, 0);

  // numerical approximation to a derivative
  vec3 n = d - vec3(getDistance(p - e.xyy), getDistance(p - e.yxy),
                    getDistance(p - e.yyx));

  return normalize(n);
}

vec3 getLightPosition() {
  vec3 center = vec3(0, 5, 0);
  return center + 10.0 * vec3(sin(time), 0, cos(time));
}

float getLight(vec3 point, vec3 rayOrigin) {
  vec3 lightPos = getLightPosition();

  // no light in the void
  if (getDistance(point) > SURF_DIST) {
      return 0.0;
  }

  vec3 l = normalize(lightPos - point);
  vec3 n = getNormal(point);
  vec3 v = normalize(rayOrigin - point);

  // ambient term
  float ambient = 0.1;

  // lambertian term
  float diffuse = clamp(dot(n, l), 0.0, 0.5);

  // specular term
  float cos_alpha = clamp(dot(reflect(-l, n), v), 0.0, 1.0);
  float alpha = 100.0;
  float specular = pow(cos_alpha, alpha);

  // shadows
  float distanceToLight = rayMarch(point + n * SURF_DIST * 2., l);

  if (distanceToLight < length(lightPos - point)) {
    diffuse *= 0.2;
    specular *= 0.0;
  }

  return clamp(ambient + diffuse + specular, 0.0, 1.0);
}

void main() {
  // model space
  vec3 rayOrigin = vec3(0, 0, 0);
  vec3 rayDirection = normalize(vec3(fragPosition, 1));

  // camera space
  vec3 cameraPosition = rayOrigin;

  float dist = rayMarch(cameraPosition, rayDirection);
  vec3 point = rayOrigin + dist * rayDirection;
  vec3 color = vec3(getLight(point, rayOrigin));
  //   vec3 color = vec3(clamp(dist / MAX_DIST, 0.0, 1.0));
  gl_FragColor = vec4(color, 1);
}