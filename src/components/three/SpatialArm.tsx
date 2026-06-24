import { Fragment } from "react";
import { PosedGroup, Triad } from "./Scene3D";
import { type Vec3, type Vec6, vadd, vscale, vsub, vnorm, mat3MulVec } from "../../lib/math/vec";
import {
  type SE3, se3Identity, se3Mul, exp6, se3Apply, screwFromAxisPoint,
} from "../../lib/math/se3";

/**
 * A general open-chain arm rendered from a product-of-exponentials description.
 * Each joint is a revolute or prismatic screw given by an axis direction and a
 * point on the axis (space frame, at home). Links are drawn between successive
 * joint pivots; the end-effector triad sits at T(θ) = (∏ e^{[S_i]θ_i}) M.
 */

export interface JointSpec {
  type: "R" | "P";
  axis: Vec3; // unit axis direction at home, space frame
  point: Vec3; // a point on the axis (R) or rail base (P), space frame at home
}

export const screwsFromJoints = (joints: JointSpec[]): Vec6[] =>
  joints.map(j =>
    j.type === "R"
      ? screwFromAxisPoint(j.axis, j.point)
      : ([0, 0, 0, j.axis[0], j.axis[1], j.axis[2]] as Vec6),
  );

export interface ArmState {
  S: Vec6[]; // screw axes
  Ts: SE3[]; // cumulative transforms, Ts[k] = product of first k joints (Ts[0] = I)
  ee: SE3; // end-effector pose T(θ) = Ts[n] M
  pivots: Vec3[]; // world position of each joint axis point (length n)
  linkEnds: Vec3[]; // world positions of link endpoints (length n+1): pivots carried distally + EE
  axisDirs: Vec3[]; // current world axis direction of each joint (length n)
}

/** Compute everything a scene needs to draw the arm and place glyphs on it. */
export function armState(joints: JointSpec[], M: SE3, thetas: number[]): ArmState {
  const S = screwsFromJoints(joints);
  const n = joints.length;
  const Ts: SE3[] = [se3Identity()];
  for (let i = 0; i < n; i++) Ts.push(se3Mul(Ts[i], exp6(S[i], thetas[i])));

  const pivots: Vec3[] = [];
  const axisDirs: Vec3[] = [];
  const linkEnds: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    pivots.push(se3Apply(Ts[i], joints[i].point));
    axisDirs.push(mat3MulVec(Ts[i].R, joints[i].axis));
    // distal end of link i is carried by all joints up to and including i
    linkEnds.push(se3Apply(Ts[i + 1], joints[i].point));
  }
  const ee = se3Mul(Ts[n], M);
  linkEnds.push([ee.p[0], ee.p[1], ee.p[2]]);

  return { S, Ts, ee, pivots, linkEnds, axisDirs };
}

/** A solid bone (cylinder) drawn between two world points. */
export function Bone({ a, b, color, radius = 0.045 }: { a: Vec3; b: Vec3; color: string; radius?: number }) {
  const d = vsub(b, a);
  const len = vnorm(d);
  if (len < 1e-6) return null;
  const mid = vadd(a, vscale(d, 0.5));
  const dir: Vec3 = [d[0] / len, d[1] / len, d[2] / len];
  // rotate local +y onto dir
  const from: Vec3 = [0, 1, 0];
  const cross: Vec3 = [
    from[1] * dir[2] - from[2] * dir[1],
    from[2] * dir[0] - from[0] * dir[2],
    from[0] * dir[1] - from[1] * dir[0],
  ];
  const dot = from[0] * dir[0] + from[1] * dir[1] + from[2] * dir[2];
  const s = Math.sqrt((1 + dot) * 2);
  const q: [number, number, number, number] =
    s < 1e-6 ? [1, 0, 0, 0] : [cross[0] / s, cross[1] / s, cross[2] / s, s / 2];
  return (
    <group position={mid} quaternion={q}>
      <mesh>
        <cylinderGeometry args={[radius, radius, len, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

const DEFAULT_LINK_COLORS = ["#c2571c", "#0b7285", "#6741d9", "#2f9e44", "#b08c1d", "#9c36b5"];

export function SpatialArm({
  joints,
  M,
  thetas,
  linkColors = DEFAULT_LINK_COLORS,
  eeTriadScale = 0.34,
  showAxes = false,
  axisColor = "#9c36b5",
}: {
  joints: JointSpec[];
  M: SE3;
  thetas: number[];
  linkColors?: string[];
  eeTriadScale?: number;
  showAxes?: boolean;
  axisColor?: string;
}) {
  const { Ts, ee, pivots, linkEnds, axisDirs } = armState(joints, M, thetas);
  const n = joints.length;

  return (
    <>
      {/* links between successive pivots (proximal end = pivot, distal end = linkEnd) */}
      {Array.from({ length: n }).map((_, i) => {
        const a = se3Apply(Ts[i + 1], joints[i].point);
        const b = linkEnds[i + 1];
        return <Bone key={`bone${i}`} a={a} b={b} color={linkColors[i % linkColors.length]} />;
      })}

      {/* joint markers + optional axis lines */}
      {pivots.map((p, i) => (
        <Fragment key={`j${i}`}>
          <mesh position={p}>
            <sphereGeometry args={[0.062, 18, 18]} />
            <meshStandardMaterial color={joints[i].type === "P" ? "#50525e" : "#33343d"} />
          </mesh>
          {showAxes && (
            <Bone
              a={vadd(p, vscale(axisDirs[i], -0.55))}
              b={vadd(p, vscale(axisDirs[i], 0.55))}
              color={axisColor}
              radius={0.012}
            />
          )}
        </Fragment>
      ))}

      {/* base anchor */}
      <mesh position={pivots[0] ?? [0, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 0.08, 24]} />
        <meshStandardMaterial color="#8d8d99" />
      </mesh>

      {eeTriadScale > 0 && (
        <PosedGroup R={ee.R} p={[ee.p[0], ee.p[1], ee.p[2]]}>
          <Triad scale={eeTriadScale} thickness={0.022} />
        </PosedGroup>
      )}
    </>
  );
}
