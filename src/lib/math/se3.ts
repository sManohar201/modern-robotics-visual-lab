// SE(3) routines following Lynch & Park chapter 3.
// A transform is { R, p }. Twists are V = (omega, v) in R^6; screws S = (omega, v) with
// either |omega| = 1 (finite-pitch screw) or omega = 0, |v| = 1 (pure translation).

import {
  type Vec3, type Vec6, type Mat3, EPS,
  mat3Identity, mat3Mul, mat3MulVec, mat3Transpose, mat3Add, mat3Scale,
  vadd, vscale, vnorm, vunit, vcross, vdot,
} from "./vec";
import { skew, exp3, log3 } from "./so3";

export interface SE3 {
  R: Mat3;
  p: Vec3;
}

export const se3Identity = (): SE3 => ({ R: mat3Identity(), p: [0, 0, 0] });

export const se3Mul = (a: SE3, b: SE3): SE3 => ({
  R: mat3Mul(a.R, b.R),
  p: vadd(mat3MulVec(a.R, b.p), a.p),
});

export const se3Inv = (t: SE3): SE3 => {
  const Rt = mat3Transpose(t.R);
  return { R: Rt, p: vscale(mat3MulVec(Rt, t.p), -1) };
};

export const se3Apply = (t: SE3, q: Vec3): Vec3 => vadd(mat3MulVec(t.R, q), t.p);

/** Screw axis of a revolute joint: axis direction what through point q. S = (what, -what x q). */
export const screwFromAxisPoint = (what: Vec3, q: Vec3, pitch = 0): Vec6 => {
  const w = vunit(what);
  const v = vadd(vcross(q, w), vscale(w, pitch)); // -w x q = q x w
  return [w[0], w[1], w[2], v[0], v[1], v[2]];
};

/**
 * exp([S] theta) for screw S = (w, v).
 * If |w| = 1:  R = exp([w] t),  p = G(t) v with G = I t + (1-cos t)[w] + (t - sin t)[w]^2.
 * If w = 0:    pure translation by v * theta.
 */
export const exp6 = (S: Vec6, theta: number): SE3 => {
  const w: Vec3 = [S[0], S[1], S[2]];
  const v: Vec3 = [S[3], S[4], S[5]];
  if (vnorm(w) < EPS) {
    return { R: mat3Identity(), p: vscale(v, theta) };
  }
  const W = skew(vunit(w));
  const W2 = mat3Mul(W, W);
  const G = mat3Add(
    mat3Scale(mat3Identity(), theta),
    mat3Add(mat3Scale(W, 1 - Math.cos(theta)), mat3Scale(W2, theta - Math.sin(theta))),
  );
  return { R: exp3(vunit(w), theta), p: mat3MulVec(G, v) };
};

/** Matrix log: returns the screw S and theta such that exp([S] theta) = T. */
export const log6 = (T: SE3): { S: Vec6; theta: number } => {
  const { axis, theta } = log3(T.R);
  if (theta < 1e-6) {
    const d = vnorm(T.p);
    if (d < EPS) return { S: [0, 0, 0, 0, 0, 0], theta: 0 };
    const v = vunit(T.p);
    return { S: [0, 0, 0, v[0], v[1], v[2]], theta: d };
  }
  // G^{-1}(t) = I/t - [w]/2 + (1/t - cot(t/2)/2) [w]^2
  const W = skew(axis);
  const W2 = mat3Mul(W, W);
  const Ginv = mat3Add(
    mat3Scale(mat3Identity(), 1 / theta),
    mat3Add(
      mat3Scale(W, -0.5),
      mat3Scale(W2, 1 / theta - 0.5 / Math.tan(theta / 2)),
    ),
  );
  const v = mat3MulVec(Ginv, T.p);
  return { S: [axis[0], axis[1], axis[2], v[0], v[1], v[2]], theta };
};

/** Adjoint map: Ad_T as a function on twists, V_a = Ad_{T_ab} V_b. */
export const adjointApply = (T: SE3, V: Vec6): Vec6 => {
  const w: Vec3 = [V[0], V[1], V[2]];
  const v: Vec3 = [V[3], V[4], V[5]];
  const Rw = mat3MulVec(T.R, w);
  const Rv = mat3MulVec(T.R, v);
  const pxRw = vcross(T.p, Rw);
  return [Rw[0], Rw[1], Rw[2], pxRw[0] + Rv[0], pxRw[1] + Rv[1], pxRw[2] + Rv[2]];
};

/** Forward kinematics, space form: T = e^{[S1]t1} ... e^{[Sn]tn} M. */
export const fkSpace = (M: SE3, Slist: Vec6[], thetas: number[]): SE3 => {
  let T = se3Identity();
  for (let i = 0; i < Slist.length; i++) T = se3Mul(T, exp6(Slist[i], thetas[i]));
  return se3Mul(T, M);
};

/** Space Jacobian: column i = Ad_{e^{[S1]t1}...e^{[S_{i-1}]t_{i-1}}} S_i. */
export const jacobianSpace = (Slist: Vec6[], thetas: number[]): Vec6[] => {
  const cols: Vec6[] = [];
  let T = se3Identity();
  for (let i = 0; i < Slist.length; i++) {
    cols.push(adjointApply(T, Slist[i]));
    T = se3Mul(T, exp6(Slist[i], thetas[i]));
  }
  return cols;
};

/** Pitch of a twist: h = w . v / |w|^2 (Infinity convention: pure translation returns Infinity). */
export const twistPitch = (V: Vec6): number => {
  const w: Vec3 = [V[0], V[1], V[2]];
  const v: Vec3 = [V[3], V[4], V[5]];
  const n2 = vdot(w, w);
  if (n2 < EPS) return Infinity;
  return vdot(w, v) / n2;
};
