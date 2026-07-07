import { useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
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
        lede="At certain postures an arm simply cannot move its tip in some direction — no combination of joint speeds will do it. This page shows you how to feel those postures, spot them in the Jacobian, and recognize the classic geometric patterns that cause them."
      />

      <p>
        Stretch your arm out as straight as it goes and touch a wall with your fingertip. Now, keeping
        the arm straight, try to push the fingertip <em>farther</em> — deeper into the wall, directly
        away from your shoulder. You can't. Swing the shoulder and the fingertip moves sideways; bend
        the elbow and it comes <em>back toward</em> you. But at that fully-stretched instant there is
        no joint motion, fast or slow, that moves the fingertip outward. One entire direction of
        motion has vanished.
      </p>
      <p>
        Notice something else about that posture: it is the pose you instinctively choose to{" "}
        <em>carry</em> something. Hang a heavy bag from your straightened arm and your shoulder and
        elbow muscles barely work — the bones take the load. The direction you cannot move is exactly
        the direction you can resist for free. Both effects have the same cause, and this page names
        it.
      </p>

      <H2>A direction the tip cannot move</H2>
      <p>
        The previous page showed that the tip's velocity is always a blend of the Jacobian's columns
        — one column per joint, scaled by that joint's speed. Usually the columns point in usefully
        different directions, so by mixing them you can send the tip anywhere. But the columns move
        with the pose, and at special postures they gang up: two columns become parallel, or three
        squash into a common plane. Any blend of arrows lying in a plane stays in that plane — so
        whatever points <em>out</em> of it becomes unreachable. That is what happened to your
        straightened arm: the shoulder column and the elbow column both push the fingertip
        sideways-or-back, and no mix of "sideways" and "back" adds up to "farther out."
      </p>
      <p>
        Linear algebra has a word for how many genuinely different directions a set of columns
        spans: the <strong>rank</strong> of the matrix — plainly, the number of independent
        directions the columns actually cover, after all the redundancy is discounted. With that
        word, the whole story compresses into one line:
      </p>
      <Eq>{"\\text{kinematic singularity:}\\quad \\operatorname{rank} J(\\theta) < \\max."}</Eq>
      <p>
        Read it back: at a <strong>kinematic singularity</strong> the columns of{" "}
        <M>{"J(\\theta)"}</M> have become linearly dependent — some column is just a blend of the
        others — so the columns span fewer directions than they have room to, and the tip loses at
        least one direction of motion. Away from such poses the rank is maximal and every direction
        is reachable.
      </p>
      <Aside>
        If <em>rank</em>, <em>span</em>, or <em>linearly dependent</em> feel shaky, the{" "}
        <a href="#/math2-linalg">Math 2 · Linear algebra module</a> builds all three from pictures
        of arrows — ten minutes there makes this page easy.
      </Aside>
      <p>
        Two facts make this a clean, intrinsic notion. First, it is{" "}
        <strong>frame-independent</strong>: relocating the base or the tool frame multiplies{" "}
        <M>{"J"}</M> by an invertible matrix, which cannot change its rank — so a singularity is a
        property of the arm's <em>posture</em>, not of anyone's choice of coordinates, and the space
        and body Jacobians go singular together. Second, lost mobility is paired with{" "}
        <strong>gained resistance</strong>: in the lost direction the arm cannot move, but it can
        bear an external load there with no joint effort — the straight-armed bag carry. The statics
        page makes that second half precise.
      </p>

      <H2>Drive the arm into a singularity</H2>
      <p>
        Straighten the elbow and the two pitch joints push the tip the same way — their columns
        align and the tip loses a direction. The widget tracks this with two live numbers:{" "}
        <M>{"\\det J"}</M>, the determinant of the tip-point Jacobian, which shrinks to zero exactly
        when the columns collapse into a plane; and the red arrow, drawn along the direction the tip
        can move <em>least</em> easily right now. At a singularity the red direction becomes
        completely unreachable.
      </p>
      <p>
        <strong>Try this:</strong> drag <M>{"\\theta_3"}</M> slowly toward 0° and watch{" "}
        <M>{"\\det J"}</M> collapse while the red arrow settles along the straightened arm — the
        wall-push direction. Reset, then find the <em>other</em> singularity: raise the tip until it
        sits directly above the base (<M>{"\\theta_2"}</M> strongly negative) and notice the rank
        readout drop even though the elbow is still bent — up there, base yaw spins the arm without
        moving the tip at all, so joint 1's column dies.
      </p>

      <SingularDriveWidget />

      <KeyIdea>
        A singularity is any posture where <M>{"\\operatorname{rank} J"}</M> is not maximal: the
        columns become dependent and the tip loses a direction of motion, while gaining the ability
        to resist load there for free. It is independent of the chosen frames.
      </KeyIdea>

      <H2>The classic six-DOF cases</H2>
      <p>
        For spatial open chains built from revolute and prismatic joints, a handful of geometric
        patterns force a rank drop — and experienced designers learn to spot them on sight, straight
        from the drawing, without computing anything. Each pattern is just a way for the column
        screw axes to become linearly dependent.
      </p>
      <p>
        <strong>Try this:</strong> step through all five cases. For each one, pause and ask: which
        axis could I delete without losing any motion? In case I the answer is obvious (the two axes
        are the <em>same line</em>); in case III, look at the red dot — every axis passes through
        it, so no joint can move that point.
      </p>

      <CaseGalleryWidget />

      <Aside>
        These are the canonical 6R cases from the text: (I) two collinear revolute axes; (II) three
        coplanar parallel axes; (III) four axes meeting at a point; (IV) four coplanar axes; (V) six
        axes crossing one common line. Mixed prismatic/revolute chains have their own analogues — e.g.
        a prismatic axis normal to the plane of two parallel revolute axes.
      </Aside>

      <H2>Traps</H2>
      <ul>
        <li>
          <strong>Singularities are not only at the workspace edge.</strong> The stretched-arm case
          sits on the boundary of reach, but the tip-over-the-base case is deep <em>inside</em> the
          workspace. Real 6R wrists have interior singularities that path planners must route
          around.
        </li>
        <li>
          <strong>Near-singular is almost as bad as singular.</strong> Command a tip velocity with a
          component along the nearly-lost direction and the required joint rates{" "}
          <M>{"\\dot\\theta = J^{-1}\\mathcal{V}"}</M> blow up — tiny <M>{"\\det J"}</M> in the
          denominator means enormous joint speeds. Motors saturate well before{" "}
          <M>{"\\det J"}</M> actually reaches zero.
        </li>
        <li>
          <strong>You cannot fix a singularity by moving a frame.</strong> Rank is unchanged by the
          invertible adjoints that relocate frames. If a posture is singular, it is singular in
          every coordinate system.
        </li>
        <li>
          <strong><M>{"\\det J = 0"}</M> is a square-matrix test.</strong> For a redundant arm
          (more joints than task directions) <M>{"J"}</M> is not square and has no determinant;
          there you check the rank directly, or the smallest singular value.
        </li>
      </ul>

      <KeyIdea>
        Singular postures come from recognizable geometry — collinear axes, coplanar axes, axes
        through a common point or line. Each pattern makes one column expressible as a blend of the
        others, and one direction of tip motion disappears.
      </KeyIdea>

      <Quiz
        challengeId="ch5-sing-quiz"
        goal={<>Answer all three correctly.</>}
        questions={[
          {
            prompt: (
              <>
                What physically happens to the end-effector at a kinematic singularity?
              </>
            ),
            options: [
              { label: "It stops moving entirely" },
              {
                label: "It loses at least one direction of motion — no joint speeds can move it that way",
                correct: true,
              },
              { label: "It can only rotate, not translate" },
            ],
            explain:
              "The columns of J collapse into fewer independent directions, so blends of them can no longer reach some direction. Motion in the remaining directions is still fine.",
          },
          {
            prompt: (
              <>
                An arm is <em>near</em> (not at) a singularity, and you command a steady tip
                velocity pointing along the nearly-lost direction. What do the joints do?
              </>
            ),
            options: [
              { label: "Nothing — the command is simply ignored" },
              { label: "They move at normal speeds; near-singular poses are harmless" },
              {
                label: "They spin extremely fast — the required joint rates blow up as det J → 0",
                correct: true,
              },
            ],
            explain:
              "θ̇ = J⁻¹𝒱 divides by a nearly-zero determinant. This is why controllers avoid the neighborhood of a singularity, not just the exact pose.",
          },
          {
            prompt: (
              <>
                Your arm is at a singular posture. A colleague suggests redefining the base frame
                somewhere else so that <M>{"J"}</M> becomes invertible. Does it work?
              </>
            ),
            options: [
              {
                label: "No — changing frames multiplies J by an invertible matrix, which can't change its rank",
                correct: true,
              },
              { label: "Yes — singularity depends on where you put the coordinate frames" },
              { label: "Only if the tool frame is moved too" },
            ],
            explain:
              "A singularity is a property of the arm's posture, not of anyone's coordinates. The space and body Jacobians go singular at exactly the same poses.",
          },
        ]}
      />

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
            The red arrow is the direction the end-effector point can move <em>least</em> easily at
            the current pose. As you straighten the arm (<M>{"\\theta_3 \\to 0"}</M>) or lift the tip
            over the base, the determinant of <M>{"J"}</M> falls to zero and that direction becomes
            completely unreachable — the rank readout drops from 3 to 2.
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
  const [idx, setIdxRaw] = useState(0);
  const [seen, setSeen] = useState<number[]>([0]);
  const cse = CASES[idx];

  const setIdx = (i: number) => {
    setIdxRaw(i);
    setSeen(s => (s.includes(i) ? s : [...s, i]));
  };

  return (
    <>
      <WidgetShell
        title="The five canonical singularities"
        onReset={() => {
          setIdxRaw(0);
          setSeen([0]);
        }}
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
            <div className="ui text-[11px] text-[var(--ink-faint)] leading-relaxed">
              viewed {seen.length} of {CASES.length} cases
            </div>
          </div>
        </div>
      </WidgetShell>

      <Challenge id="ch5-sing-cases" met={seen.length === CASES.length}>
        Tour all five canonical cases. For each, find the redundancy before reading the caption:
        which axis contributes nothing the others don't already provide? Collinear (I), parallel
        in a plane (II), through a point (III), in a plane (IV), through a line (V) — five
        geometric ways for columns to become dependent.
      </Challenge>
    </>
  );
}
