// Shared kinematics for the Chapter 6 inverse-kinematics pages.
//
//  • PLANAR 2R   — the motivational example (workspace annulus, lefty/righty).
//  • PLANAR 3R   — full-pose (x, y, φ) targets with elbow-up/down solutions
//                  (numerical NR basins) and one redundant DOF for the velocity
//                  and redundancy pages.
//  • PUMA 3R     — the spatial yaw–pitch–pitch positioning arm reused from
//                  Chapter 5 (ARM_JOINTS / ARM_M); its inverse-position problem
//                  has up to four solutions.
//
// All arms are described once as a JointSpec[] (space form, for drawing with
// SpatialArm) plus a constant body-screw list Blist (for the body-Jacobian
// Newton–Raphson math). The two are numerically identical FK.

import type { JointSpec } from "../../components/three/SpatialArm";
import { screwsFromJoints } from "../../components/three/SpatialArm";
import {
  type SE3, fkSpace, fkBody, jacobianSpace, jacobianBody, log6, se3Inv, se3Mul,
} from "../../lib/math/se3";
import {
  mat3Identity, type Vec3, type Vec6, vadd, vcross,
} from "../../lib/math/vec";
import { type Mat, pinvDamped, matVec } from "../../lib/math/linalg";

import { ARM_JOINTS as PUMA_JOINTS, ARM_M as PUMA_M, ARM_HOME as PUMA_HOME } from "../ch5/arm";
export { PUMA_JOINTS, PUMA_M, PUMA_HOME };

/* ============================== planar 2R ============================== */

// Unequal links (1.2, 0.8) so the reachable workspace is a genuine annulus:
// inner radius |L₁−L₂| = 0.4, outer radius L₁+L₂ = 2.0.
export const L2R: [number, number] = [1.2, 0.8];
export const P2R_JOINTS: JointSpec[] = [
  { type: "R", axis: [0, 0, 1], point: [0, 0, 0] },
  { type: "R", axis: [0, 0, 1], point: [L2R[0], 0, 0] },
];
export const P2R_M: SE3 = { R: mat3Identity(), p: [L2R[0] + L2R[1], 0, 0] };

/** Closed-form inverse kinematics of the planar 2R for tip position (x, y). */
export function ik2R(x: number, y: number, L1 = L2R[0], L2 = L2R[1]): [number, number][] {
  const r2 = x * x + y * y;
  const D = (r2 - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (Math.abs(D) > 1) return [];
  const out: [number, number][] = [];
  for (const sgn of [1, -1] as const) {
    const t2 = Math.atan2(sgn * Math.sqrt(Math.max(0, 1 - D * D)), D);
    const t1 = Math.atan2(y, x) - Math.atan2(L2 * Math.sin(t2), L1 + L2 * Math.cos(t2));
    out.push([t1, t2]);
  }
  return out;
}

/* ============================== planar 3R ============================== */

export const P3R_JOINTS: JointSpec[] = [
  { type: "R", axis: [0, 0, 1], point: [0, 0, 0] },
  { type: "R", axis: [0, 0, 1], point: [1, 0, 0] },
  { type: "R", axis: [0, 0, 1], point: [2, 0, 0] },
];
export const P3R_M: SE3 = { R: mat3Identity(), p: [3, 0, 0] };
export const P3R_B: Vec6[] = [
  [0, 0, 1, 0, 3, 0],
  [0, 0, 1, 0, 2, 0],
  [0, 0, 1, 0, 1, 0],
];
export const L3R: [number, number, number] = [1, 1, 1];

/** Closed-form IK of the planar 3R for a full pose (x, y, φ): elbow-up/down. */
export function ik3R(
  x: number, y: number, phi: number, L: [number, number, number] = L3R,
): [number, number, number][] {
  const [L1, L2, L3] = L;
  const wx = x - L3 * Math.cos(phi);
  const wy = y - L3 * Math.sin(phi);
  const r2 = wx * wx + wy * wy;
  const D = (r2 - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (Math.abs(D) > 1) return [];
  const out: [number, number, number][] = [];
  for (const sgn of [1, -1] as const) {
    const t2 = Math.atan2(sgn * Math.sqrt(Math.max(0, 1 - D * D)), D);
    const t1 = Math.atan2(wy, wx) - Math.atan2(L2 * Math.sin(t2), L1 + L2 * Math.cos(t2));
    const t3 = phi - t1 - t2;
    out.push([t1, t2, t3]);
  }
  return out;
}

/**
 * One slice of the redundant planar 3R's self-motion: hold the tip at
 * (tx, ty), choose the base joint angle θ₁ freely, then solve the remaining 2R
 * (links L₂, L₃) so the tip stays put. Returns null where θ₁ is infeasible.
 */
export function selfMotion3R(
  tx: number, ty: number, th1: number, elbow: 1 | -1, L: [number, number, number] = L3R,
): [number, number, number] | null {
  const [, L2, L3] = L;
  const p1x = L[0] * Math.cos(th1);
  const p1y = L[0] * Math.sin(th1);
  const dx = tx - p1x, dy = ty - p1y;
  const r2 = dx * dx + dy * dy;
  const D = (r2 - L2 * L2 - L3 * L3) / (2 * L2 * L3);
  if (Math.abs(D) > 1) return null;
  const t3 = Math.atan2(elbow * Math.sqrt(1 - D * D), D);
  const phi = Math.atan2(dy, dx);
  const t2abs = phi - Math.atan2(L3 * Math.sin(t3), L2 + L3 * Math.cos(t3));
  return [th1, t2abs - th1, t3];
}

/* ===================== PUMA-type spatial 3R position ===================== */

const PUMA_S = screwsFromJoints(PUMA_JOINTS);
export const pumaTipAt = (thetas: number[]): Vec3 => {
  const p = fkSpace(PUMA_M, PUMA_S, thetas).p;
  return [p[0], p[1], p[2]];
};

/**
 * Inverse-position kinematics of the PUMA-type yaw–pitch–pitch arm (zero
 * shoulder offset, unit upper-arm and forearm, shoulder on the ẑ-axis at
 * height 1). Generates the {θ₁, θ₁+π} × {elbow-up, elbow-down} candidates and
 * keeps those that reach the target — up to four solutions.
 */
export function pumaPosIk(p: Vec3): [number, number, number][] {
  const [px, py, pz] = p;
  const a1 = Math.atan2(py, px);
  const out: [number, number, number][] = [];
  for (const t1 of [a1, a1 + Math.PI]) {
    const rho = px * Math.cos(t1) + py * Math.sin(t1); // radial reach in the arm plane
    const H = pz - 1.0; // height above the shoulder
    const c2 = (rho * rho + H * H - 2) / 2;
    if (Math.abs(c2) > 1) continue;
    for (const sgn of [1, -1] as const) {
      const beta = sgn * Math.acos(Math.max(-1, Math.min(1, c2)));
      const alpha = Math.atan2(H, rho) - Math.atan2(Math.sin(beta), 1 + Math.cos(beta));
      const th: [number, number, number] = [t1, -alpha, -beta];
      const tip = pumaTipAt(th);
      const e = Math.hypot(tip[0] - px, tip[1] - py, tip[2] - pz);
      if (e < 1e-6) out.push(th);
    }
  }
  return out;
}

/* ===================== Stanford-type RRP position ===================== */

// Replace the PUMA elbow with a prismatic joint: yaw, shoulder pitch, then a
// rail that extends the forearm. Shoulder on the ẑ-axis at height 1; forearm
// length 1 at zero extension.
export const STANFORD_JOINTS: JointSpec[] = [
  { type: "R", axis: [0, 0, 1], point: [0, 0, 0] },
  { type: "R", axis: [0, 1, 0], point: [0, 0, 1] },
  { type: "P", axis: [1, 0, 0], point: [0, 0, 1] },
];
export const STANFORD_M: SE3 = { R: mat3Identity(), p: [1, 0, 1] };

const STANFORD_S = screwsFromJoints(STANFORD_JOINTS);
export const stanfordTipAt = (thetas: number[]): Vec3 => {
  const p = fkSpace(STANFORD_M, STANFORD_S, thetas).p;
  return [p[0], p[1], p[2]];
};

/** Inverse-position kinematics of the Stanford-type arm: two solutions. */
export function stanfordPosIk(p: Vec3): [number, number, number][] {
  const [px, py, pz] = p;
  const a1 = Math.atan2(py, px);
  const out: [number, number, number][] = [];
  for (const t1 of [a1, a1 + Math.PI]) {
    const rho = px * Math.cos(t1) + py * Math.sin(t1);
    const H = pz - 1.0;
    const L = Math.hypot(rho, H);
    const t2 = Math.atan2(-H, rho);
    const ext = L - 1.0;
    if (ext < -1e-9) continue;
    const th: [number, number, number] = [t1, t2, ext];
    const tip = stanfordTipAt(th);
    if (Math.hypot(tip[0] - px, tip[1] - py, tip[2] - pz) < 1e-6) out.push(th);
  }
  return out;
}

/* ===================== Jacobian / Newton–Raphson glue ===================== */

/** Stack n screw columns (Vec6) into a 6×n dense matrix. */
export const vec6ColsToMat = (cols: Vec6[]): Mat =>
  Array.from({ length: 6 }, (_, r) => cols.map(c => c[r]));

/** Planar point-velocity Jacobian (2×n): rows = ẋ, ẏ of the tip. */
export function planarPointJac(joints: JointSpec[], M: SE3, thetas: number[]): Mat {
  const S = screwsFromJoints(joints);
  const cols = jacobianSpace(S, thetas);
  const ee = fkSpace(M, S, thetas).p;
  const pEE: Vec3 = [ee[0], ee[1], ee[2]];
  const xs: number[] = [], ys: number[] = [];
  for (const c of cols) {
    const w: Vec3 = [c[0], c[1], c[2]];
    const v: Vec3 = [c[3], c[4], c[5]];
    const vp = vadd(v, vcross(w, pEE));
    xs.push(vp[0]); ys.push(vp[1]);
  }
  return [xs, ys];
}

export interface NRStep {
  next: number[];
  Vb: Vec6; // body-twist error (= log of T_sb⁻¹ T_sd)
  wErr: number; // ‖ω_b‖
  vErr: number; // ‖v_b‖
  Tsb: SE3;
}

/** One body-frame Newton–Raphson iteration toward T_sd. */
export function nrBodyStep(Blist: Vec6[], M: SE3, thetas: number[], Tsd: SE3): NRStep {
  const Tsb = fkBody(M, Blist, thetas);
  const Tbd = se3Mul(se3Inv(Tsb), Tsd);
  const { S, theta } = log6(Tbd);
  const Vb = S.map(x => x * theta) as Vec6; // the matrix-log twist (scaled by θ)
  const wErr = Math.hypot(Vb[0], Vb[1], Vb[2]);
  const vErr = Math.hypot(Vb[3], Vb[4], Vb[5]);
  const Jb = vec6ColsToMat(jacobianBody(Blist, thetas));
  const dth = matVec(pinvDamped(Jb, 0), Vb);
  const next = thetas.map((t, i) => t + dth[i]);
  return { next, Vb, wErr, vErr, Tsb };
}
