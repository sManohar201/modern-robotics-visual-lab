import { PosedGroup, Triad } from "./Scene3D";
import { mat3Identity, type Vec3, type Vec6 } from "../../lib/math/vec";
import { type SE3, se3Mul, exp6, screwFromAxisPoint } from "../../lib/math/se3";

/**
 * The book's 3R planar arm (all joints about ẑ, links along x̂ at home) —
 * shared between the Chapter 4 PoE pages so the robot looks identical
 * everywhere. Math z-up coordinates; Scene3D handles the screen mapping.
 */

export const ARM3R_COLORS = ["#c2571c", "#0b7285", "#6741d9"] as const;

/** Home joint positions q_i = (0,0,0), (L1,0,0), (L1+L2,0,0). */
export const arm3RJointsHome = (L1: number, L2: number): Vec3[] => [
  [0, 0, 0],
  [L1, 0, 0],
  [L1 + L2, 0, 0],
];

/** Space screw axes S_i = (ẑ, −ẑ×q_i) at home. */
export const arm3RScrews = (L1: number, L2: number): Vec6[] =>
  arm3RJointsHome(L1, L2).map(q => screwFromAxisPoint([0, 0, 1], q));

/** Home configuration M: identity rotation, p = (L1+L2+L3, 0, 0). */
export const arm3RHome = (L1: number, L2: number, L3: number): SE3 => ({
  R: mat3Identity(),
  p: [L1 + L2 + L3, 0, 0],
});

export function Arm3R({
  lengths,
  thetas,
  linkColors = ARM3R_COLORS as unknown as [string, string, string],
  eeTriadScale = 0.32,
}: {
  lengths: [number, number, number];
  thetas: [number, number, number];
  linkColors?: [string, string, string];
  /** 0 hides the end-effector triad */
  eeTriadScale?: number;
}) {
  const [L1, L2, L3] = lengths;
  const S = arm3RScrews(L1, L2);
  const T1 = exp6(S[0], thetas[0]);
  const T2 = se3Mul(T1, exp6(S[1], thetas[1]));
  const T3 = se3Mul(T2, exp6(S[2], thetas[2]));
  const T = se3Mul(T3, arm3RHome(L1, L2, L3));
  const starts = [0, L1, L1 + L2];
  const Ts = [T1, T2, T3];

  return (
    <>
      {Ts.map((Ti, i) => (
        <PosedGroup key={i} R={Ti.R} p={[Ti.p[0], Ti.p[1], Ti.p[2]]}>
          {/* joint pin, vertical along the ẑ joint axis */}
          <mesh position={[starts[i], 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.16, 20]} />
            <meshStandardMaterial color="#33343d" />
          </mesh>
          <mesh position={[starts[i] + lengths[i] / 2, 0, 0]}>
            <boxGeometry args={[lengths[i], 0.085, 0.05]} />
            <meshStandardMaterial color={linkColors[i]} />
          </mesh>
        </PosedGroup>
      ))}
      {eeTriadScale > 0 && (
        <PosedGroup R={T.R} p={[T.p[0], T.p[1], T.p[2]]}>
          <Triad scale={eeTriadScale} thickness={0.024} />
        </PosedGroup>
      )}
    </>
  );
}
