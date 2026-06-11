// Small vector/matrix helpers. Mat3 is row-major number[9]; Vec3 is [x, y, z].

export type Vec3 = [number, number, number];
export type Mat3 = number[]; // length 9, row-major
export type Vec6 = [number, number, number, number, number, number];

export const EPS = 1e-9;

export const vadd = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vsub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vscale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const vdot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vnorm = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const vcross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const vunit = (a: Vec3): Vec3 => {
  const n = vnorm(a);
  return n < EPS ? [0, 0, 0] : vscale(a, 1 / n);
};

export const mat3Identity = (): Mat3 => [1, 0, 0, 0, 1, 0, 0, 0, 1];

export const mat3Mul = (a: Mat3, b: Mat3): Mat3 => {
  const c = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) c[3 * i + j] += a[3 * i + k] * b[3 * k + j];
  return c;
};

export const mat3MulVec = (m: Mat3, v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

export const mat3Transpose = (m: Mat3): Mat3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

export const mat3Add = (a: Mat3, b: Mat3): Mat3 => a.map((x, i) => x + b[i]);
export const mat3Scale = (a: Mat3, s: number): Mat3 => a.map(x => x * s);

export const mat3Det = (m: Mat3): number =>
  m[0] * (m[4] * m[8] - m[5] * m[7]) -
  m[1] * (m[3] * m[8] - m[5] * m[6]) +
  m[2] * (m[3] * m[7] - m[4] * m[6]);

export const mat3Trace = (m: Mat3): number => m[0] + m[4] + m[8];

/** Column i of a row-major 3x3 matrix. */
export const mat3Col = (m: Mat3, i: number): Vec3 => [m[i], m[3 + i], m[6 + i]];

/** Build a 3x3 matrix from three column vectors. */
export const mat3FromCols = (x: Vec3, y: Vec3, z: Vec3): Mat3 => [
  x[0], y[0], z[0],
  x[1], y[1], z[1],
  x[2], y[2], z[2],
];

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Wrap an angle to (-pi, pi]. */
export const wrapAngle = (a: number) => {
  let x = ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  if (x === -Math.PI) x = Math.PI;
  return x;
};

export const deg = (rad: number) => (rad * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;
