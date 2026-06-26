// Shared spatial arm for the Chapter 5 pages: a classic articulated 3R
// (base yaw about ẑ, then shoulder and elbow pitch about ŷ). Its tip moves in
// all three dimensions, so the manipulability/force ellipsoids are genuine 3D
// ellipsoids and the elbow-straight posture is a real singularity.

import type { JointSpec } from "../../components/three/SpatialArm";
import type { SE3 } from "../../lib/math/se3";
import { mat3Identity, type Vec3, type Vec6, vadd, vcross, vscale } from "../../lib/math/vec";

export const ARM_JOINTS: JointSpec[] = [
  { type: "R", axis: [0, 0, 1], point: [0, 0, 0] }, // base yaw
  { type: "R", axis: [0, 1, 0], point: [0, 0, 1] }, // shoulder pitch
  { type: "R", axis: [0, 1, 0], point: [1, 0, 1] }, // elbow pitch
];

export const ARM_M: SE3 = { R: mat3Identity(), p: [2, 0, 1] };

export const ARM_COLORS = ["#c2571c", "#0b7285", "#6741d9"] as const;

/** A comfortable non-singular default posture (elbow bent). */
export const ARM_HOME: [number, number, number] = [0.5, -0.6, 1.1];

/**
 * Velocity of the end-effector *point* given the space Jacobian columns and
 * joint rates. For a spatial twist (ω, v), the velocity of the point at p is
 * v + ω × p.
 */
export const eePointVel = (cols: Vec6[], thetasdot: number[], pEE: Vec3): Vec3 => {
  let acc: Vec3 = [0, 0, 0];
  for (let i = 0; i < cols.length; i++) {
    const w: Vec3 = [cols[i][0], cols[i][1], cols[i][2]];
    const v: Vec3 = [cols[i][3], cols[i][4], cols[i][5]];
    const vp = vadd(v, vcross(w, pEE));
    acc = vadd(acc, vscale(vp, thetasdot[i]));
  }
  return acc;
};

/** Linear-velocity (point) Jacobian columns at the EE: column i = v_i + ω_i × p. */
export const eePointJac = (cols: Vec6[], pEE: Vec3): Vec3[] =>
  cols.map(c => {
    const w: Vec3 = [c[0], c[1], c[2]];
    const v: Vec3 = [c[3], c[4], c[5]];
    return vadd(v, vcross(w, pEE));
  });
