// Tiny dense linear algebra for the Chapter 6 inverse-kinematics pages.
// Matrices are row-major `number[][]`. Everything here operates on the small
// (≤ 6×6) systems that arise from manipulator Jacobians, so a plain
// Gauss–Jordan inverse is more than fast enough.

export type Mat = number[][]; // rows

export const matT = (A: Mat): Mat => {
  const m = A.length, n = A[0].length;
  const B: Mat = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) B[j][i] = A[i][j];
  return B;
};

export const matMul = (A: Mat, B: Mat): Mat => {
  const m = A.length, k = B.length, n = B[0].length;
  const C: Mat = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let p = 0; p < k; p++) {
      const a = A[i][p];
      if (a === 0) continue;
      for (let j = 0; j < n; j++) C[i][j] += a * B[p][j];
    }
  return C;
};

export const matVec = (A: Mat, x: number[]): number[] =>
  A.map(row => row.reduce((s, v, j) => s + v * x[j], 0));

export const eye = (n: number): Mat =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

/** A + s·I (square A). */
export const addScaledEye = (A: Mat, s: number): Mat =>
  A.map((row, i) => row.map((v, j) => (i === j ? v + s : v)));

/** Inverse of a square matrix by Gauss–Jordan elimination with partial pivoting. */
export function invSquare(A: Mat): Mat {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...eye(n)[i]]);
  for (let col = 0; col < n; col++) {
    // pivot
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) continue; // (caller guards against true singularity via damping)
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    for (let j = 0; j < 2 * n; j++) M[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j];
    }
  }
  return M.map(row => row.slice(n));
}

/**
 * (Damped) Moore–Penrose pseudoinverse of J (m×n).
 * λ = 0 gives the exact pseudoinverse when J is full rank:
 *   fat  (m ≤ n): Jᵀ(JJᵀ)⁻¹  — minimum-norm right inverse
 *   tall (m > n): (JᵀJ)⁻¹Jᵀ  — least-squares left inverse
 * λ > 0 gives the damped least-squares (Levenberg–Marquardt) inverse, which
 * stays bounded through singularities.
 */
export function pinvDamped(J: Mat, lambda = 0): Mat {
  const m = J.length, n = J[0].length;
  const Jt = matT(J);
  const l2 = lambda * lambda;
  if (m <= n) {
    // Jᵀ (J Jᵀ + λ²I)⁻¹
    const inner = addScaledEye(matMul(J, Jt), l2); // m×m
    return matMul(Jt, invSquare(inner));
  }
  // (JᵀJ + λ²I)⁻¹ Jᵀ
  const inner = addScaledEye(matMul(Jt, J), l2); // n×n
  return matMul(invSquare(inner), Jt);
}

/** Null-space projector N = I − J†J (n×n): maps any vector to a J-null-space motion. */
export function nullProjector(J: Mat, lambda = 0): Mat {
  const n = J[0].length;
  return eye(n).map((row, i) =>
    row.map((v, j) => v - matMul(pinvDamped(J, lambda), J)[i][j]),
  );
}

/** Frobenius/2-norm of a vector. */
export const norm = (x: number[]): number => Math.sqrt(x.reduce((s, v) => s + v * v, 0));
