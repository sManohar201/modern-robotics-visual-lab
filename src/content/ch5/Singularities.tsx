import { useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { SpatialArm, armState } from "../../components/three/SpatialArm";
import { PointArrow, ScrewAxisLine } from "../../components/three/viz3d";
import { type Vec3, rad, deg, mat3FromCols, mat3Det, vnorm } from "../../lib/math/vec";
import { jacobianSpace } from "../../lib/math/se3";
import { eig3sym, gramian } from "../../lib/math/eig";
import { ARM_JOINTS, ARM_M, ARM_HOME, eePointJac } from "./arm";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const LOST = "#d9483f";
const AXC = "#9c36b5";

export default function Singularities() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 5"
        section="Velocity Kinematics & Statics"
        title="Singularities"
        lede="At certain postures the Jacobian loses rank and the end-effector can no longer move in some direction, no matter how the joints turn. These kinematic singularities are intrinsic to the arm."
      />

      <p>
        The end-effector can only achieve twists that are linear combinations of the Jacobian's
        columns. As long as the columns span the space, every direction is reachable. At a{" "}
        <strong>kinematic singularity</strong> the columns become linearly dependent — the rank of{" "}
        <M>{"J(\\theta)"}</M> drops below its maximum — and a direction of motion is lost.
      </p>
      <Eq>{"\\text{singular} \\iff \\operatorname{rank} J(\\theta) < \\max."}</Eq>
      <p>
        Two facts make this a clean, intrinsic notion. First, it is{" "}
        <strong>frame-independent</strong>: relocating the base or the tool frame multiplies{" "}
        <M>{"J"}</M> by an invertible adjoint, which cannot change its rank, so the space and body
        Jacobians go singular together. Second, lost mobility is paired with{" "}
        <strong>gained resistance</strong>: in the lost direction the arm cannot move, but it can
        bear an external load there with no joint effort.
      </p>

      <H2>Drive the arm into a singularity</H2>
      <p>
        Straighten the elbow and the two pitch joints push the tip the same way — their columns
        align and the tip loses a direction. Reach the tip directly over the base and the yaw joint
        stops contributing. The widget draws the lost direction in red as the determinant collapses.
      </p>

      <SingularDriveWidget />

      <H2>The classic six-DOF cases</H2>
      <p>
        For spatial open chains built from revolute and prismatic joints, a handful of geometric
        patterns force a rank drop. Each is just a way for the column screw axes to become linearly
        dependent. Step through them:
      </p>

      <CaseGalleryWidget />

      <Aside>
        These are the canonical 6R cases from the text: (I) two collinear revolute axes; (II) three
        coplanar parallel axes; (III) four axes meeting at a point; (IV) four coplanar axes; (V) six
        axes crossing one common line. Mixed prismatic/revolute chains have their own analogues — e.g.
        a prismatic axis normal to the plane of two parallel revolute axes.
      </Aside>

      <KeyIdea>
        A singularity is any posture where <M>{"\\operatorname{rank} J"}</M> is not maximal: the
        column screw axes become dependent and the end-effector loses a direction of motion (while
        gaining the ability to resist load there for free). It is independent of the chosen frames.
      </KeyIdea>

      <BookRef>Modern Robotics §5.3 — Singularity Analysis.</BookRef>
    </div>
  );
}

/* ================= widget 1: drive into a singularity ================= */

function SingularDriveWidget() {
  const [t1, setT1] = useState(ARM_HOME[0]);
  const [t2, setT2] = useState(ARM_HOME[1]);
  const [t3, setT3] = useState(ARM_HOME[2]);

  const thetas: [number, number, number] = [t1, t2, t3];
  const st = armState(ARM_JOINTS, ARM_M, thetas);
  const cols = jacobianSpace(st.S, thetas);
  const pEE: Vec3 = [st.ee.p[0], st.ee.p[1], st.ee.p[2]];
  const Jp = eePointJac(cols, pEE); // 3 column Vec3
  const det = Math.abs(mat3Det(mat3FromCols(Jp[0], Jp[1], Jp[2])));
  const { values, vectors } = eig3sym(gramian(Jp));
  const lostDir = vectors[2]; // eigenvector of smallest eigenvalue = least-reachable direction
  const lambdaMin = values[2];
  const near = det < 0.12;
  const met = det < 0.12;

  return (
    <>
      <WidgetShell
        title="Collapse the determinant"
        onReset={() => {
          setT1(ARM_HOME[0]); setT2(ARM_HOME[1]); setT3(ARM_HOME[2]);
        }}
        caption={
          <>
            The red arrow is the direction the end-effector point can move <em>least</em> easily — the
            eigenvector of the smallest singular value of the point Jacobian. As you straighten the
            arm (<M>{"\\theta_3 \\to 0"}</M>) or lift the tip over the base, the determinant of{" "}
            <M>{"J"}</M> falls to zero and that direction becomes completely unreachable.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={360} camera={[3.8, 2.8, 3.8]}>
              <Triad ghost colors={GHOST} scale={0.6} />
              <SpatialArm joints={ARM_JOINTS} M={ARM_M} thetas={thetas} eeTriadScale={0.3} showAxes />
              {vnorm(lostDir) > 0.1 && (
                <>
                  <PointArrow at={pEE} dir={lostDir} length={0.85} color={LOST} thickness={0.026} />
                  <PointArrow at={pEE} dir={[-lostDir[0], -lostDir[1], -lostDir[2]]} length={0.85} color={LOST} thickness={0.026} />
                </>
              )}
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2 md:w-[230px]">
            <Readout label="det J" value={det.toFixed(3)} color={near ? LOST : undefined} />
            <Readout label="λ_min" value={lambdaMin.toFixed(3)} color={near ? LOST : undefined} />
            <Readout label="rank" value={near ? "2 (singular)" : "3 (full)"} color={near ? LOST : "var(--good)"} />
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="θ₁" value={t1} min={rad(-180)} max={rad(180)} onChange={setT1} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
          <LabeledSlider label="θ₂" value={t2} min={rad(-150)} max={rad(150)} onChange={setT2} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
          <LabeledSlider label="θ₃" value={t3} min={rad(-150)} max={rad(150)} onChange={setT3} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch5-sing-reach" met={met}>
        Bring the arm to a singularity: straighten the elbow (<M>{"\\theta_3 \\to 0"}</M>) until{" "}
        <M>{"\\det J < 0.12"}</M>. The red lost-motion arrow marks the direction the tip can no longer
        move — at that instant the two pitch columns have become parallel and the Jacobian has dropped
        to rank 2.
      </Challenge>
    </>
  );
}

/* ================= widget 2: gallery of canonical cases ================= */

interface Axis {
  q: Vec3;
  dir: Vec3;
}
interface SingCase {
  name: string;
  blurb: string;
  axes: Axis[];
  marks?: Vec3[]; // intersection points / lines to highlight
}

const CASES: SingCase[] = [
  {
    name: "I · two collinear axes",
    blurb: "Two revolute joints share the same line. Their columns are identical, so the rank drops by one.",
    axes: [
      { q: [0, 0, -0.2], dir: [0, 0, 1] },
      { q: [0, 0, 0.2], dir: [0, 0, 1] },
    ],
    marks: [[0, 0, 0]],
  },
  {
    name: "II · three coplanar parallel axes",
    blurb: "Three parallel revolute axes lying in one plane. Any one column is a combination of the other two.",
    axes: [
      { q: [-1, 0, 0], dir: [0, 0, 1] },
      { q: [0, 0, 0], dir: [0, 0, 1] },
      { q: [1, 0, 0], dir: [0, 0, 1] },
    ],
  },
  {
    name: "III · four axes through a point",
    blurb: "Four revolute axes intersect at one point — choose it as the origin and every column has zero linear part, so four columns cannot be independent.",
    axes: [
      { q: [0, 0, 0], dir: [0, 0, 1] },
      { q: [0, 0, 0], dir: [1, 0, 0.4] },
      { q: [0, 0, 0], dir: [0, 1, 0.4] },
      { q: [0, 0, 0], dir: [1, 1, 0.2] },
    ],
    marks: [[0, 0, 0]],
  },
  {
    name: "IV · four coplanar axes",
    blurb: "Four revolute axes lie in a common plane. Their screws share too few independent components to stay independent.",
    axes: [
      { q: [-1, -0.6, 0], dir: [1, 0.3, 0] },
      { q: [-0.3, 0.6, 0], dir: [0.6, 1, 0] },
      { q: [0.6, -0.4, 0], dir: [1, -0.5, 0] },
      { q: [1.1, 0.5, 0], dir: [0.2, 1, 0] },
    ],
  },
  {
    name: "V · six axes through one line",
    blurb: "Six revolute axes all cross a common line (here the ẑ-axis). The shared line forces a rank deficiency.",
    axes: [
      { q: [0, 0, -1], dir: [1, 0, 0.6] },
      { q: [0, 0, -0.6], dir: [0.6, 0.8, 0.5] },
      { q: [0, 0, -0.2], dir: [0, 1, 0.5] },
      { q: [0, 0, 0.2], dir: [-0.7, 0.7, 0.5] },
      { q: [0, 0, 0.6], dir: [-1, 0, 0.6] },
      { q: [0, 0, 1], dir: [-0.5, -0.8, 0.5] },
    ],
  },
];

function CaseGalleryWidget() {
  const [idx, setIdx] = useState(0);
  const cse = CASES[idx];

  return (
    <WidgetShell
      title="The five canonical singularities"
      caption={<>{cse.blurb}</>}
    >
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1 min-w-0">
          <Scene3D height={340} camera={[3.4, 2.6, 3.4]}>
            <Triad ghost colors={GHOST} scale={0.5} />
            {/* common line for case V */}
            {idx === 4 && <Line points={[[0, 0, -1.5], [0, 0, 1.5]]} color="#b9b5a8" lineWidth={1.5} dashed dashSize={0.08} gapSize={0.05} />}
            {cse.axes.map((a, i) => (
              <ScrewAxisLine key={i} q={a.q} dir={a.dir} color={AXC} half={1.3} lineWidth={2.5} />
            ))}
            {cse.marks?.map((m, i) => (
              <mesh key={i} position={m}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial color={LOST} />
              </mesh>
            ))}
          </Scene3D>
        </div>
        <div className="ui flex flex-col gap-2 md:w-[230px] justify-center">
          {CASES.map((c, i) => (
            <WidgetButton key={i} onClick={() => setIdx(i)} active={idx === i}>
              {c.name}
            </WidgetButton>
          ))}
        </div>
      </div>
    </WidgetShell>
  );
}
