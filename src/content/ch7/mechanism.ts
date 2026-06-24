// Shared kinematics for the Chapter 7 closed-chain pages.
//
//  • 3×RPR planar parallel mechanism — inverse trivial, forward (up to six
//    assembly modes) by deterministic multi-start Newton.
//  • Stewart–Gough 6×SPS spatial platform — inverse analytic; leg screws give
//    the inverse-Jacobian/static map  F_s = J^{-T} τ.
//  • Four-bar linkage — 1-D C-space curve φ(θ) with bifurcation points.
//  • Five-bar linkage — closed-form center joint; configuration-space /
//    actuator / end-effector singularities.
//
// All geometry constants were chosen and numerically validated in Python: the
// 3×RPR recovers up to four real assembly modes (leg error ~1e-16), and the
// Stewart–Gough home is well conditioned (cond J^{-T} ≈ 7.6).

import { type Vec3, type Mat3, type Vec6, mat3Mul, mat3MulVec, vsub, vcross, vnorm, vunit } from "../../lib/math/vec";
import { exp3 } from "../../lib/math/so3";

/* ========================= 2-D helpers ========================= */

export type V2 = [number, number];
const rot2 = (phi: number): [V2, V2] => {
  const c = Math.cos(phi), s = Math.sin(phi);
  return [[c, -s], [s, c]];
};
const apply2 = (R: [V2, V2], v: V2): V2 => [R[0][0] * v[0] + R[0][1] * v[1], R[1][0] * v[0] + R[1][1] * v[1]];

/* ===================== 3×RPR planar platform ===================== */

// Base anchors aᵢ (radius 2) and platform anchors bᵢ (radius 1), both an
// equilateral triangle pointing up (90°, 210°, 330°).
export const RPR_RB = 2.0;
export const RPR_RP = 1.0;
const RPR_ANG = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];
export const RPR_A: V2[] = RPR_ANG.map(t => [RPR_RB * Math.cos(t), RPR_RB * Math.sin(t)]);
export const RPR_B: V2[] = RPR_ANG.map(t => [RPR_RP * Math.cos(t), RPR_RP * Math.sin(t)]);

/** Platform anchor i in world coordinates (z = 0) for a pose (px, py, φ). */
export function rprPlatformPt(px: number, py: number, phi: number, i: number): Vec3 {
  const R = rot2(phi);
  const b = apply2(R, RPR_B[i]);
  return [px + b[0], py + b[1], 0];
}

/** Inverse kinematics (trivial): the three leg lengths for a pose. */
export function rprLegs(px: number, py: number, phi: number): [number, number, number] {
  const out = [0, 0, 0] as [number, number, number];
  for (let i = 0; i < 3; i++) {
    const Bi = rprPlatformPt(px, py, phi, i);
    out[i] = Math.hypot(Bi[0] - RPR_A[i][0], Bi[1] - RPR_A[i][1]);
  }
  return out;
}

type Pose = { px: number; py: number; phi: number };

// Residual F = legᵢ² − sᵢ² and its 3×3 Jacobian, for Newton's method.
function rprResidual(q: Pose, s: number[]): number[] {
  const L = rprLegs(q.px, q.py, q.phi);
  return [L[0] * L[0] - s[0] * s[0], L[1] * L[1] - s[1] * s[1], L[2] * L[2] - s[2] * s[2]];
}
function rprJac(q: Pose): number[][] {
  const c = Math.cos(q.phi), s = Math.sin(q.phi);
  const dR: [V2, V2] = [[-s, -c], [c, -s]];
  const M: number[][] = [];
  for (let i = 0; i < 3; i++) {
    const b = RPR_B[i];
    const Bi = apply2(rot2(q.phi), b);
    const d: V2 = [q.px + Bi[0] - RPR_A[i][0], q.py + Bi[1] - RPR_A[i][1]];
    const db = apply2(dR, b);
    M.push([2 * d[0], 2 * d[1], 2 * (d[0] * db[0] + d[1] * db[1])]);
  }
  return M;
}
// Direct 3×3 solve (Cramer) — the systems are tiny.
function solve3(A: number[][], b: number[]): number[] | null {
  const det =
    A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  if (Math.abs(det) < 1e-14) return null;
  const col = (j: number, v: number[]) => A.map((row, i) => row.map((x, k) => (k === j ? v[i] : x)));
  const det3 = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  return [det3(col(0, b)) / det, det3(col(1, b)) / det, det3(col(2, b)) / det];
}

/**
 * Forward kinematics of the 3×RPR: all real platform poses for given leg
 * lengths, by deterministic multi-start Newton over a fixed (px, py, φ) grid.
 * Returns the distinct assembly modes (up to six exist for general geometry).
 */
export function rprForward(s: number[]): Pose[] {
  const sols: Pose[] = [];
  const grid = [-1.2, -0.6, 0, 0.6, 1.2];
  const phis = [0, 1, 2, 3, 4, 5, 6, 7].map(k => (k * Math.PI) / 4);
  for (const gx of grid)
    for (const gy of grid)
      for (const ph of phis) {
        let q: Pose = { px: gx, py: gy, phi: ph };
        let ok = true;
        for (let it = 0; it < 40; it++) {
          const f = rprResidual(q, s);
          const dq = solve3(rprJac(q), f);
          if (!dq) { ok = false; break; }
          q = { px: q.px - dq[0], py: q.py - dq[1], phi: q.phi - dq[2] };
          if (Math.hypot(dq[0], dq[1], dq[2]) < 1e-12) break;
        }
        if (!ok) continue;
        const r = rprResidual(q, s);
        if (Math.hypot(r[0], r[1], r[2]) > 1e-7) continue;
        const phi = ((q.phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const dup = sols.some(t => {
          const dphi = Math.abs(t.phi - phi);
          return Math.abs(t.px - q.px) < 1e-4 && Math.abs(t.py - q.py) < 1e-4 &&
            Math.min(dphi, 2 * Math.PI - dphi) < 1e-4;
        });
        if (!dup) sols.push({ px: q.px, py: q.py, phi });
      }
  return sols;
}

/* ===================== Stewart–Gough 6×SPS ===================== */

// Six anchors per platform arranged in three "pairs" around a circle. Validated
// well-conditioned home: base radius 2 (gap 0.3), platform radius 1.2 (gap 0.9,
// rotated 60°), nominal height 2.2.
function hexAnchors(r: number, rot: number, gap: number): Vec3[] {
  const out: Vec3[] = [];
  for (const base of [rot, rot + (2 * Math.PI) / 3, rot + (4 * Math.PI) / 3]) {
    out.push([r * Math.cos(base - gap), r * Math.sin(base - gap), 0]);
    out.push([r * Math.cos(base + gap), r * Math.sin(base + gap), 0]);
  }
  return out;
}
export const SG_A: Vec3[] = hexAnchors(2.0, 0.0, 0.3);            // base, in {s}
export const SG_B: Vec3[] = hexAnchors(1.2, Math.PI / 3, 0.9);   // platform, in {b}
export const SG_HOME_H = 2.2;

/** ZYX rotation R = Rot(z,a)Rot(y,b)Rot(x,c) as a row-major Mat3. */
export function rotZYX(a: number, b: number, c: number): Mat3 {
  return mat3Mul(exp3([0, 0, 1], a), mat3Mul(exp3([0, 1, 0], b), exp3([1, 0, 0], c)));
}

/** Platform anchor i in world coordinates for pose (p, R). */
export const sgPlatformPt = (p: Vec3, R: Mat3, i: number): Vec3 => {
  const Rb = mat3MulVec(R, SG_B[i]);
  return [p[0] + Rb[0], p[1] + Rb[1], p[2] + Rb[2]];
};

/** Inverse kinematics (analytic, unique): the six leg lengths for a pose. */
export function sgLegs(p: Vec3, R: Mat3): number[] {
  return SG_A.map((a, i) => vnorm(vsub(sgPlatformPt(p, R, i), a)));
}

/** Unit direction n̂ᵢ of leg i (base → platform). */
export const sgLegDir = (p: Vec3, R: Mat3, i: number): Vec3 => vunit(vsub(sgPlatformPt(p, R, i), SG_A[i]));

/**
 * Columns of the inverse-transpose Jacobian: leg wrench i = [qᵢ × n̂ᵢ ; n̂ᵢ],
 * with qᵢ the fixed base anchor. The static map is F_s = J^{-T} τ, i.e. the
 * resultant spatial wrench is Σ τᵢ · (column i).
 */
export function sgLegWrenches(p: Vec3, R: Mat3): Vec6[] {
  return SG_A.map((q, i) => {
    const n = sgLegDir(p, R, i);
    const m = vcross(q, n);
    return [m[0], m[1], m[2], n[0], n[1], n[2]] as Vec6;
  });
}

/** Resultant platform wrench F_s = Σ τᵢ · wrench_i (= J^{-T} τ). */
export function sgResultantWrench(p: Vec3, R: Mat3, tau: number[]): Vec6 {
  const W = sgLegWrenches(p, R);
  const F: number[] = [0, 0, 0, 0, 0, 0];
  W.forEach((col, i) => col.forEach((x, r) => (F[r] += x * tau[i])));
  return F as Vec6;
}

/* ===================== Four-bar linkage ===================== */

// Crank-rocker geometry from the book's Figure 7.5: L1 = L2 = 4, L3 = L4 = 2.
export const FB_L: [number, number, number, number] = [4, 4, 2, 2];

const fbABG = (theta: number) => {
  const [L1, L2, L3, L4] = FB_L;
  return {
    a: 2 * L3 * L4 - 2 * L1 * L3 * Math.cos(theta),
    b: -2 * L1 * L3 * Math.sin(theta),
    g: L2 * L2 - L4 * L4 - L3 * L3 - L1 * L1 + 2 * L1 * L4 * Math.cos(theta),
  };
};

/** The two output-angle branches φ(θ); empty where the loop cannot close. */
export function fourBarPhi(theta: number): number[] {
  const { a, b, g } = fbABG(theta);
  const rad = Math.hypot(a, b);
  const ratio = g / rad;
  if (Math.abs(ratio) > 1) return [];
  const base = Math.atan2(b, a);
  const off = Math.acos(Math.max(-1, Math.min(1, ratio)));
  return [base + off, base - off];
}

/** Discriminant α²+β²−γ²; a bifurcation (branch merge) occurs where it → 0. */
export function fourBarDisc(theta: number): number {
  const { a, b, g } = fbABG(theta);
  return a * a + b * b - g * g;
}

/**
 * Joint points of the four-bar for drawing. Decoding the book's α,β,γ fixes the
 * geometry: input crank L1 from O0 at angle θ; ground link L4 to O1; output
 * crank L3 from O1 at angle φ; coupler L2 closes P→Q (verified |P−Q| = L2).
 */
export function fourBarPoints(theta: number, branch: 0 | 1): { O0: V2; O1: V2; P: V2; Q: V2 } | null {
  const [L1, , L3, L4] = FB_L;
  const O0: V2 = [0, 0];        // input-crank ground pivot
  const O1: V2 = [L4, 0];       // output-crank ground pivot (ground link L4)
  const phis = fourBarPhi(theta);
  if (phis.length === 0) return null;
  const phi = phis[branch];
  const P: V2 = [L1 * Math.cos(theta), L1 * Math.sin(theta)];            // input-crank tip
  const Q: V2 = [O1[0] + L3 * Math.cos(phi), O1[1] + L3 * Math.sin(phi)]; // output-crank tip
  return { O0, O1, P, Q };
}

/* ===================== Five-bar linkage ===================== */

// Two grounded revolutes at (0,0) and (L5,0); four moving links of length 1
// meeting at a central joint C.
export const FB5_L = 1.0;
export const FB5_BASE = 1.6;

function circInt(c1: V2, r1: number, c2: V2, r2: number): V2[] {
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1];
  const d = Math.hypot(dx, dy);
  if (d < 1e-9 || d > r1 + r2 || d < Math.abs(r1 - r2)) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const mx = c1[0] + (a * dx) / d, my = c1[1] + (a * dy) / d;
  return [[mx - (h * dy) / d, my + (h * dx) / d], [mx + (h * dy) / d, my - (h * dx) / d]];
}

export interface FiveBar { E1: V2; E2: V2; C: V2; G0: V2; G1: V2; }

/** Closed-form five-bar: actuated ground angles (a1, b1), branch chooses the center joint. */
export function fiveBar(a1: number, b1: number, branch: 0 | 1 = 0): FiveBar | null {
  const G0: V2 = [0, 0];
  const G1: V2 = [FB5_BASE, 0];
  const E1: V2 = [FB5_L * Math.cos(a1), FB5_L * Math.sin(a1)];
  const E2: V2 = [G1[0] + FB5_L * Math.cos(b1), G1[1] + FB5_L * Math.sin(b1)];
  const pts = circInt(E1, FB5_L, E2, FB5_L);
  if (pts.length === 0) return null;
  return { E1, E2, C: pts[Math.min(branch, pts.length - 1)], G0, G1 };
}

/** End-effector singularity: a leg's two moving links are colinear (|G→C| ≈ 2ℓ). */
export function fiveBarLeftAligned(fb: FiveBar): number {
  return Math.abs(Math.hypot(fb.C[0] - fb.G0[0], fb.C[1] - fb.G0[1]) - 2 * FB5_L);
}
export function fiveBarRightAligned(fb: FiveBar): number {
  return Math.abs(Math.hypot(fb.C[0] - fb.G1[0], fb.C[1] - fb.G1[1]) - 2 * FB5_L);
}
