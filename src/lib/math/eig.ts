// Symmetric eigen-decomposition for the 3×3 SPD matrices that drive the
// manipulability and force ellipsoids (A = J_v J_vᵀ etc.). Classic cyclic
// Jacobi rotation method — robust and tiny for fixed 3×3 input.

import { type Mat3, type Vec3 } from "./vec";

export interface Eig3 {
  /** eigenvalues, sorted descending */
  values: [number, number, number];
  /** unit eigenvectors, columns matching `values` order */
  vectors: [Vec3, Vec3, Vec3];
}

export function eig3sym(M: Mat3): Eig3 {
  // working copy as 3×3
  const a = [
    [M[0], M[1], M[2]],
    [M[3], M[4], M[5]],
    [M[6], M[7], M[8]],
  ];
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  for (let sweep = 0; sweep < 24; sweep++) {
    // largest off-diagonal magnitude
    const off = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]);
    if (off < 1e-12) break;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]] as const) {
      const apq = a[p][q];
      if (Math.abs(apq) < 1e-15) continue;
      const app = a[p][p];
      const aqq = a[q][q];
      const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      // rotate A: A' = Jᵀ A J
      for (let k = 0; k < 3; k++) {
        const akp = a[k][p];
        const akq = a[k][q];
        a[k][p] = c * akp - s * akq;
        a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p][k];
        const aqk = a[q][k];
        a[p][k] = c * apk - s * aqk;
        a[q][k] = s * apk + c * aqk;
      }
      // accumulate eigenvectors
      for (let k = 0; k < 3; k++) {
        const vkp = v[k][p];
        const vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq;
        v[k][q] = s * vkp + c * vkq;
      }
    }
  }

  const eig = [
    { val: a[0][0], vec: [v[0][0], v[1][0], v[2][0]] as Vec3 },
    { val: a[1][1], vec: [v[0][1], v[1][1], v[2][1]] as Vec3 },
    { val: a[2][2], vec: [v[0][2], v[1][2], v[2][2]] as Vec3 },
  ];
  eig.sort((x, y) => y.val - x.val);
  return {
    values: [Math.max(0, eig[0].val), Math.max(0, eig[1].val), Math.max(0, eig[2].val)],
    vectors: [eig[0].vec, eig[1].vec, eig[2].vec],
  };
}

/** A = G Gᵀ for a 3×n matrix G given as n column 3-vectors. Symmetric 3×3 (Mat3). */
export function gramian(cols: Vec3[]): Mat3 {
  let a = 0, b = 0, c = 0, d = 0, e = 0, f = 0;
  for (const [x, y, z] of cols) {
    a += x * x; b += x * y; c += x * z;
    d += y * y; e += y * z; f += z * z;
  }
  return [a, b, c, b, d, e, c, e, f];
}
