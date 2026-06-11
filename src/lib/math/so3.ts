// SO(3) routines following Lynch & Park, "Modern Robotics", chapter 3.
// Rotation matrices are row-major Mat3; exponential coordinates are omega-hat * theta.

import {
  type Vec3, type Mat3, EPS,
  mat3Identity, mat3Mul, mat3Add, mat3Scale, mat3Transpose, mat3Trace, vnorm, vunit, clamp,
} from "./vec";

/** [w]: the 3x3 skew-symmetric matrix such that [w] v = w x v. */
export const skew = (w: Vec3): Mat3 => [
  0, -w[2], w[1],
  w[2], 0, -w[0],
  -w[1], w[0], 0,
];

export const unskew = (m: Mat3): Vec3 => [m[7], m[2], m[3]];

export const rotX = (t: number): Mat3 => [
  1, 0, 0,
  0, Math.cos(t), -Math.sin(t),
  0, Math.sin(t), Math.cos(t),
];
export const rotY = (t: number): Mat3 => [
  Math.cos(t), 0, Math.sin(t),
  0, 1, 0,
  -Math.sin(t), 0, Math.cos(t),
];
export const rotZ = (t: number): Mat3 => [
  Math.cos(t), -Math.sin(t), 0,
  Math.sin(t), Math.cos(t), 0,
  0, 0, 1,
];

/**
 * Rodrigues' formula: exp([w-hat] theta) = I + sin(t) [w] + (1 - cos(t)) [w]^2.
 * `what` must be a unit vector (or zero, giving the identity).
 */
export const exp3 = (what: Vec3, theta: number): Mat3 => {
  if (vnorm(what) < EPS) return mat3Identity();
  const W = skew(vunit(what));
  const W2 = mat3Mul(W, W);
  return mat3Add(
    mat3Identity(),
    mat3Add(mat3Scale(W, Math.sin(theta)), mat3Scale(W2, 1 - Math.cos(theta))),
  );
};

/** Exponential of an arbitrary rotation vector r = w-hat * theta. */
export const expVec3 = (r: Vec3): Mat3 => exp3(vunit(r), vnorm(r));

/**
 * Matrix log of R in SO(3): returns { axis, theta } with theta in [0, pi].
 * At theta = 0 the axis is arbitrary (returned as zero vector).
 */
export const log3 = (R: Mat3): { axis: Vec3; theta: number } => {
  const cos = clamp((mat3Trace(R) - 1) / 2, -1, 1);
  const theta = Math.acos(cos);
  if (theta < 1e-6) return { axis: [0, 0, 0], theta: 0 };
  if (Math.PI - theta < 1e-6) {
    // theta = pi: extract axis from R = I + 2 [w][w]  ->  R_ii = 1 - 2(w_j^2 + w_k^2)
    const wx = Math.sqrt(Math.max(0, (R[0] + 1) / 2));
    const wy = Math.sqrt(Math.max(0, (R[4] + 1) / 2));
    const wz = Math.sqrt(Math.max(0, (R[8] + 1) / 2));
    // fix signs using off-diagonal sums (R + R^T)/2 off-diagonals = 2 w_i w_j
    let axis: Vec3 = [wx, wy, wz];
    if (wx >= wy && wx >= wz) {
      axis = [wx, (R[1] + R[3]) / (4 * wx), (R[2] + R[6]) / (4 * wx)];
    } else if (wy >= wz) {
      axis = [(R[1] + R[3]) / (4 * wy), wy, (R[5] + R[7]) / (4 * wy)];
    } else {
      axis = [(R[2] + R[6]) / (4 * wz), (R[5] + R[7]) / (4 * wz), wz];
    }
    return { axis: vunit(axis), theta: Math.PI };
  }
  const s = 1 / (2 * Math.sin(theta));
  const axis: Vec3 = [
    s * (R[7] - R[5]),
    s * (R[2] - R[6]),
    s * (R[3] - R[1]),
  ];
  return { axis: vunit(axis), theta };
};

/** Geodesic distance (radians) between two rotations. */
export const so3Distance = (Ra: Mat3, Rb: Mat3): number =>
  log3(mat3Mul(mat3Transpose(Ra), Rb)).theta;
