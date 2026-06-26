import { type Vec3, type Vec6, mat3MulVec, vcross } from "../../lib/math/vec";
import type { SE3 } from "../../lib/math/se3";

/**
 * Transforms a wrench F = [m, f] from frame b to frame a using Ad_T^{-T}.
 * Math:
 *   fa = R * fb
 *   ma = R * mb + p x fa
 */
export function adjointTransposeApply(T: SE3, F: Vec6): Vec6 {
  const m: Vec3 = [F[0], F[1], F[2]];
  const f: Vec3 = [F[3], F[4], F[5]];
  const Rm = mat3MulVec(T.R, m);
  const Rf = mat3MulVec(T.R, f);
  const pxRf = vcross(T.p, Rf);
  return [
    Rm[0] + pxRf[0], Rm[1] + pxRf[1], Rm[2] + pxRf[2],
    Rf[0], Rf[1], Rf[2]
  ];
}

/**
 * Computes the Lie bracket transpose ad_V^T F for twist V = [w, v] and wrench F = [m, f].
 * Math:
 *   ad_V^T F = [ m x w + f x v, f x w ]
 */
export function adTransposeApply(V: Vec6, F: Vec6): Vec6 {
  const w: Vec3 = [V[0], V[1], V[2]];
  const v: Vec3 = [V[3], V[4], V[5]];
  const m: Vec3 = [F[0], F[1], F[2]];
  const f: Vec3 = [F[3], F[4], F[5]];
  const mxw = vcross(m, w);
  const fxv = vcross(f, v);
  const fxw = vcross(f, w);
  return [
    mxw[0] + fxv[0], mxw[1] + fxv[1], mxw[2] + fxv[2],
    fxw[0], fxw[1], fxw[2]
  ];
}

export interface Eig2 {
  values: [number, number];
  vectors: [[number, number], [number, number]];
}

/**
 * Symmetric eigen-decomposition of a 2x2 symmetric matrix [ [a, b], [b, c] ]
 */
export function eig2sym(a: number, b: number, c: number): Eig2 {
  const tr = a + c;
  const gap = a - c;
  const term = Math.sqrt(0.25 * gap * gap + b * b);
  const l1 = 0.5 * tr + term;
  const l2 = 0.5 * tr - term;

  let v1: [number, number] = [1, 0];
  let v2: [number, number] = [0, 1];

  if (Math.abs(b) > 1e-12) {
    const n1 = Math.hypot(l1 - c, b);
    v1 = [(l1 - c) / n1, b / n1];
    const n2 = Math.hypot(l2 - c, b);
    v2 = [(l2 - c) / n2, b / n2];
  } else {
    if (a < c) {
      v1 = [0, 1];
      v2 = [1, 0];
    }
  }

  // sort descending
  if (l1 >= l2) {
    return { values: [l1, l2], vectors: [v1, v2] };
  } else {
    return { values: [l2, l1], vectors: [v2, v1] };
  }
}

/**
 * Computes the 2x2 mass matrix M(theta) for a planar 2R robot with point masses
 * m1 and m2 at the distal end of links of length L1 and L2.
 * Returns a flat array [M11, M12, M21, M22].
 */
export function planar2R_M(
  theta: [number, number],
  m: [number, number],
  L: [number, number]
): [number, number, number, number] {
  const [, t2] = theta;
  const [m1, m2] = m;
  const [L1, L2] = L;
  const c2 = Math.cos(t2);

  const M11 = m1 * L1 * L1 + m2 * (L1 * L1 + 2 * L1 * L2 * c2 + L2 * L2);
  const M12 = m2 * (L1 * L2 * c2 + L2 * L2);
  const M22 = m2 * L2 * L2;

  return [M11, M12, M12, M22];
}

/**
 * Computes the Coriolis/centripetal torque vector c(theta, thetadot) for a planar 2R robot.
 * Returns [c1, c2].
 */
export function planar2R_c(
  theta: [number, number],
  thetadot: [number, number],
  m: [number, number],
  L: [number, number]
): [number, number] {
  const [, t2] = theta;
  const [td1, td2] = thetadot;
  const [, m2] = m;
  const [L1, L2] = L;
  const s2 = Math.sin(t2);

  const c1 = -m2 * L1 * L2 * s2 * (2 * td1 * td2 + td2 * td2);
  const c2 = m2 * L1 * L2 * td1 * td1 * s2;

  return [c1, c2];
}

/**
 * Computes the gravity torque vector g(theta) for a planar 2R robot.
 * Returns [g1, g2]. Note that gravity acts in the -y direction.
 */
export function planar2R_g(
  theta: [number, number],
  m: [number, number],
  L: [number, number],
  g = 9.81
): [number, number] {
  const [t1, t2] = theta;
  const [m1, m2] = m;
  const [L1, L2] = L;

  const g1 = (m1 + m2) * L1 * g * Math.cos(t1) + m2 * g * L2 * Math.cos(t1 + t2);
  const g2 = m2 * g * L2 * Math.cos(t1 + t2);

  return [g1, g2];
}

/**
 * Computes the 2x2 linear velocity Jacobian Jv(theta) at the end-effector.
 * Returns [J11, J12, J21, J22] representing row-major layout:
 *   [ dx/dt1, dx/dt2 ]
 *   [ dy/dt1, dy/dt2 ]
 */
export function planar2R_Jv(
  theta: [number, number],
  L: [number, number]
): [number, number, number, number] {
  const [t1, t2] = theta;
  const [L1, L2] = L;
  const s1 = Math.sin(t1);
  const c1 = Math.cos(t1);
  const s12 = Math.sin(t1 + t2);
  const c12 = Math.cos(t1 + t2);

  const J11 = -L1 * s1 - L2 * s12;
  const J12 = -L2 * s12;
  const J21 = L1 * c1 + L2 * c12;
  const J22 = L2 * c12;

  return [J11, J12, J21, J22];
}

/**
 * Time derivative of the linear velocity Jacobian, Jdot(theta, thetadot).
 * Returns [J11, J12, J21, J22] (row-major), matching planar2R_Jv layout.
 */
export function planar2R_Jdot(
  theta: [number, number],
  thetadot: [number, number],
  L: [number, number]
): [number, number, number, number] {
  const [t1, t2] = theta;
  const [td1, td2] = thetadot;
  const [L1, L2] = L;
  const s1 = Math.sin(t1);
  const c1 = Math.cos(t1);
  const s12 = Math.sin(t1 + t2);
  const c12 = Math.cos(t1 + t2);
  const d1 = td1; // d/dt of theta1
  const d12 = td1 + td2; // d/dt of (theta1 + theta2)

  // J11 = -L1 s1 - L2 s12  ->  -L1 c1 d1 - L2 c12 d12
  const Jd11 = -L1 * c1 * d1 - L2 * c12 * d12;
  // J12 = -L2 s12  ->  -L2 c12 d12
  const Jd12 = -L2 * c12 * d12;
  // J21 = L1 c1 + L2 c12  ->  -L1 s1 d1 - L2 s12 d12
  const Jd21 = -L1 * s1 * d1 - L2 * s12 * d12;
  // J22 = L2 c12  ->  -L2 s12 d12
  const Jd22 = -L2 * s12 * d12;

  return [Jd11, Jd12, Jd21, Jd22];
}

/**
 * Computes the task-space mass matrix Lambda = Jv^{-T} * M * Jv^{-1}.
 * Returns a flat array [L11, L12, L21, L22].
 * If Jv is singular, returns a very large diagonal matrix as fallback.
 */
export function planar2R_Lambda(
  M: [number, number, number, number],
  Jv: [number, number, number, number]
): [number, number, number, number] {
  const [J11, J12, J21, J22] = Jv;
  const det = J11 * J22 - J12 * J21;

  if (Math.abs(det) < 1e-6) {
    // Singular fallback: high mass
    return [1000, 0, 0, 1000];
  }

  // Inverse Jv^{-1}:
  //   [ J22, -J12 ] / det
  //   [ -J21, J11 ] / det
  const inv11 = J22 / det;
  const inv12 = -J12 / det;
  const inv21 = -J21 / det;
  const inv22 = J11 / det;

  const [M11, M12, , M22] = M; // M is symmetric: M21 = M12

  // Compute A = M * Jv^{-1}
  const A11 = M11 * inv11 + M12 * inv21;
  const A12 = M11 * inv12 + M12 * inv22;
  const A21 = M12 * inv11 + M22 * inv21;
  const A22 = M12 * inv12 + M22 * inv22;

  // Compute Lambda = Jv^{-T} * A = (Jv^{-1})^T * A
  //   [ inv11, inv21 ] * [ A11, A12 ]
  //   [ inv12, inv22 ]   [ A21, A22 ]
  const L11 = inv11 * A11 + inv21 * A21;
  const L12 = inv11 * A12 + inv21 * A22;
  const L21 = inv12 * A11 + inv22 * A21;
  const L22 = inv12 * A12 + inv22 * A22;

  return [L11, L12, L21, L22];
}
