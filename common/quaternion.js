// quaternion.js (c) 2014 Jeppe Revall Frisvad
/** 
 * This is a class for working with quaternions.
 */

/**
 * Constructor of Quaternion.
 * If opt_src is specified, new quaternion is initialized by opt_src.
 * Otherwise, new quaternion is initialized by identity quaternion.
 * @param opt_src source matrix(option)
 */
var Quaternion = function (opt_src) {
  var v = new Float32Array(4);
  if (opt_src && typeof opt_src === 'object') {
    if(opt_src.elements)
      v.set(opt_src.elements);
    else
      v.set(opt_src);
  } else {
    v[0] = 0; v[1] = 0; v[2] = 0; v[3] = 1;
  }
  this.elements = v;
};

/**
 * Set the identity quaternion.
 * @return this
 */
Quaternion.prototype.setIdentity = function () {
  var e = this.elements;
  e[0] = 0; e[1] = 0; e[2] = 0; e[3] = 1;
  return this;
};

/**
 * Copy quaternion.
 * @param src source matrix
 * @return this
 */
Quaternion.prototype.set = function (src) {
  var s = src.elements ? src.elements : src;
  var d = this.elements;
  if (s === d) {
    return;
  }
  for (var i = 0; i < 4; ++i) {
    d[i] = s[i];
  }
  return this;
};

/**
 * Apply quaternion: q * p * q^-1 with p = (vec, 1).
 * @param vec The vector to be rotated according to the quaternion
 * @return Rotated vector
 */
Quaternion.prototype.apply = function (vec) {
  var p = new Quaternion(vec);
  var q = new Quaternion(this);
  var q_inv = new Quaternion(this);
  q_inv = q_inv.invert();
  p = p.multiply(q_inv);
  p = q.multiply(p);
  var result = p.elements;
  return vec3(result[0], result[1], result[2]);
}

/**
 * Multiply the quaternion from the right.
 * @param other The multiply quaternion
 * @return this
 */
Quaternion.prototype.multiply = function (other) {
    // Calculate e = a * b
    var e = this.elements;
    var a = new Float32Array(this.elements);
    var b = new Float32Array(other.elements);
    e[0] = a[1] * b[2] - a[2] * b[1] + b[3] * a[0] + a[3] * b[0];
    e[1] = a[2] * b[0] - a[0] * b[2] + b[3] * a[1] + a[3] * b[1];
    e[2] = a[0] * b[1] - a[1] * b[0] + b[3] * a[2] + a[3] * b[2];
    e[3] = a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2];
    return this;
};

/**
 * Add quaternion.
 * @param other The quaternion to be added
 * @return this
 */
Quaternion.prototype.add = function (other) {
  var a = this.elements;
  var b = other.elements;
  a[0] = a[0] + b[0];
  a[1] = a[1] + b[1];
  a[2] = a[2] + b[2];
  a[3] = a[3] + b[3];
  return this;
};

/**
 * Multiply by scalar.
 * @param s  The scalar
 * @return this
 */
Quaternion.prototype.multiplyScalar = function (s) {
  var e = this.elements;
  e[0] = e[0] * s; e[1] = e[1] * s; e[2] = e[2] * s; e[3] = e[3] * s;
  return this;
};

/**
 * Quaternion conjugate.
 * @return Return the conjugate q* = (-q_imag, q_real)
 */
Quaternion.prototype.conjugate = function () {
  var e = this.elements;
  e[0] = -e[0]; e[1] = -e[1]; e[2] = -e[2];
  return this;
};

/**
 * Imaginary part of quaternion.
 * @return vec3 specifying the imaginary part
 */
Quaternion.prototype.get_imag = function () {
  var e = this.elements;
  return vec3(e[0], e[1], e[2]);
};

/**
 * Real part of quaternion.
 * @return Scalar specifying the real part
 */
Quaternion.prototype.get_real = function () {
  var e = this.elements;
  return e[3];
}

/**
 * Squared norm of quaternion.
 * @return The squared norm
 */
Quaternion.prototype.sqr_norm = function () {
  var e = this.elements;
  return e[0]*e[0] + e[1]*e[1] + e[2]*e[2] + e[3]*e[3];
}

/**
 * Inverse of quaternion.
 * @return this
 */
Quaternion.prototype.invert = function () {
  var sn = this.sqr_norm();
  var e = this.elements;
  e[0] = -e[0] / sn; e[1] = -e[1] / sn; e[2] = -e[2] / sn; e[3] = e[3] / sn;
  return this;
}

/**
 * Make quaternion corresponding to rotation by an angle around an axis.
 * @param angle  The angle
 * @param vec  The direction of the axis of rotation
 * @return this
 */
Quaternion.prototype.make_rot_angle_axis = function (angle, vec) {
  var e = this.elements;
  var v = normalize(vec)*Math.sin(angle);
  e[0] = v[0]; e[1] = v[1]; e[2] = v[2]; e[3] = Math.cos(angle / 2);
  return this;
}

/**
 * Make quaternion corresponding to the rotation from one vector to another.
 * @param a The vec3 we are rotating from
 * @param b The vec3 we are rotating to
 * @return this
 */
Quaternion.prototype.make_rot_vec2vec = function (a, b) {
  var e = this.elements;
  var tmp = Math.sqrt(2 * (1 + a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  e[0] = (a[1] * b[2] - a[2] * b[1]) / tmp;
  e[1] = (a[2] * b[0] - a[0] * b[2]) / tmp;
  e[2] = (a[0] * b[1] - a[1] * b[0]) / tmp;
  e[3] = tmp / 2;
  return this;
}
