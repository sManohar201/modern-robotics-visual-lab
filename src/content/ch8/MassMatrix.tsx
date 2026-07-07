import { useCallback, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { CircleMap, type CircleMapInfo, type CircleMapPreset } from "../../components/widgets/CircleMap";
import { Scene3D, Triad, PosedGroup } from "../../components/three/Scene3D";
import { Ellipsoid, PrincipalAxes } from "../../components/three/viz3d";
import { type Vec3, deg, mat3Identity } from "../../lib/math/vec";
import { exp6, screwFromAxisPoint, se3Mul } from "../../lib/math/se3";
import { planar2R_M, planar2R_Jv, planar2R_Lambda, eig2sym } from "./dynamics";

const LINK_COLORS = ["#c2571c", "#0b7285"] as const;
const JOINT_COLOR = "#33343d";
const TASK_COLOR = "#6741d9"; // purple
const JOINT_ELL = "#b08c1d"; // gold
const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const ABSTRACT_GHOST: [string, string, string] = ["#cfcabb", "#cfcabb", "#cfcabb"];

export default function MassMatrix() {
  const [t1, setT1] = useState(0.0);
  const [t2, setT2] = useState(Math.PI / 2);
  const [m1, setM1] = useState(1.0);
  const [m2, setM2] = useState(1.0);
  const [preset, setPreset] = useState<"unit" | "ur5">("unit");

  const L1 = 1.0;
  const L2 = preset === "unit" ? 1.0 : 0.8;

  const setUnit = () => {
    setPreset("unit");
    setM1(1.0);
    setM2(1.0);
  };
  const setUr5 = () => {
    setPreset("ur5");
    setM1(3.7);
    setM2(2.3);
  };

  const theta: [number, number] = [t1, t2];
  const m: [number, number] = [m1, m2];
  const L: [number, number] = [L1, L2];

  // kinematics
  const S0 = screwFromAxisPoint([0, 0, 1], [0, 0, 0]);
  const S1 = screwFromAxisPoint([0, 0, 1], [L1, 0, 0]);
  const T1 = exp6(S0, t1);
  const T2 = se3Mul(T1, exp6(S1, t2));
  const eeP = se3Mul(T2, { R: mat3Identity(), p: [L2, 0, 0] }).p;
  const pEE: Vec3 = [eeP[0], eeP[1], 0];
  const pElbow: Vec3 = [T1.p[0], T1.p[1], 0];

  // dynamics matrices
  const Mmat = planar2R_M(theta, m, L);
  const Jv = planar2R_Jv(theta, L);
  const Lambda = planar2R_Lambda(Mmat, Jv);

  // joint-space M eigendecomposition (abstract)
  const Meig = eig2sym(Mmat[0], Mmat[1], Mmat[3]);
  // task-space Lambda eigendecomposition (Cartesian xy)
  const Leig = eig2sym(Lambda[0], Lambda[1], Lambda[3]);

  const condM = Meig.values[0] / Math.max(1e-6, Meig.values[1]);

  // Ellipses are normalized to a fixed visual size (largest semi-axis = target),
  // so the *shape* reads the anisotropy without blowing up near singularities
  // (where Lambda diverges). The numeric cond readout carries the raw magnitude.
  const taskTarget = 0.7;
  const tScale = taskTarget / Math.max(1e-3, Leig.values[0]);
  const taskRadii: [number, number, number] = [
    Math.max(1e-3, Leig.values[0] * tScale),
    Math.max(1e-3, Leig.values[1] * tScale),
    0.002,
  ];
  const taskAxes: [Vec3, Vec3, Vec3] = [
    [Leig.vectors[0][0], Leig.vectors[0][1], 0],
    [Leig.vectors[1][0], Leig.vectors[1][1], 0],
    [0, 0, 1],
  ];

  const jointTarget = 0.9;
  const jScale = jointTarget / Math.max(1e-3, Meig.values[0]);
  const jointRadii: [number, number, number] = [
    Math.max(1e-3, Meig.values[0] * jScale),
    Math.max(1e-3, Meig.values[1] * jScale),
    0.002,
  ];
  const jointAxes: [Vec3, Vec3, Vec3] = [
    [Meig.vectors[0][0], Meig.vectors[0][1], 0],
    [Meig.vectors[1][0], Meig.vectors[1][1], 0],
    [0, 0, 1],
  ];

  // challenge: straighten the elbow to maximize joint-1 inertia
  const met = Math.abs(t2) < 0.05;

  return (
    <div>
      <PageHeader
        chapter="Chapter 8"
        section="Dynamics of Open Chains"
        title="The Mass Matrix & Kinetic Energy"
        lede="For a point mass, mass is a single scalar that resists acceleration equally in every direction. For a robot, the effective inertia is a matrix that changes with posture and feels heavier in some directions than others."
      />

      <p>
        Stretch your arm straight out and swing it quickly side to side from the shoulder. Now
        tuck your fist to your chest and swing again. Same arm, same mass, same muscles — but the
        folded arm starts and stops far more easily. Fold the arm and the mass sits close to the
        shoulder; stretch it and the same kilograms are suddenly much harder for the shoulder to
        accelerate. Whatever number plays the role of "mass" for a robot arm clearly is not a
        constant — it depends on the arm's posture, and, as you will see, on the <em>direction</em>{" "}
        you try to accelerate in.
      </p>

      <p>
        For a single point mass, Newton gives <M>{"f = \\mathfrak{m}a"}</M>: one scalar{" "}
        <M>{"\\mathfrak{m}"}</M>, resisting acceleration the same amount in every direction. For a
        robot, the honest replacement is the <strong>mass matrix</strong> <M>{"M(\\theta)"}</M> —
        the matrix that converts joint accelerations into the joint torques needed to cause them.
        At rest (<M>{"\\dot{\\theta}=0"}</M>, so no velocity-dependent effects) the relationship is:
      </p>
      <Eq>{"\\tau = M(\\theta)\\,\\ddot{\\theta} + g(\\theta), \\qquad \\mathcal{K} = \\tfrac12\\,\\dot{\\theta}^{\\mathsf T} M(\\theta)\\,\\dot{\\theta}."}</Eq>
      <p>
        Read it back. The first equation is <M>{"f = \\mathfrak{m}a"}</M> with the scalar swapped
        for a matrix (plus the gravity torque <M>{"g(\\theta)"}</M>, which is there even standing
        still). The second is <M>{"\\tfrac12 \\mathfrak{m} v^2"}</M> with the matrix sitting in the
        middle of the square — a <em>quadratic form</em>, the same "sandwich a matrix between a
        vector and itself" pattern you met with the manipulability ellipsoid. And <M>{"M"}</M> is{" "}
        <strong>positive-definite</strong>, which is just physics wearing a math word: the kinetic
        energy <M>{"\\tfrac12\\dot\\theta^{\\mathsf T} M \\dot\\theta"}</M> comes out strictly
        positive for every nonzero motion — a moving robot always carries energy.
      </p>
      <p>
        Because <M>{"M"}</M> is generally not a scalar multiple of the identity, the acceleration{" "}
        <M>{"\\ddot{\\theta}"}</M> is <em>not</em> parallel to the torque <M>{"\\tau"}</M> that
        produced it — the arm has a preferred set of "easy" and "hard" directions, given by the
        eigenvectors of <M>{"M(\\theta)"}</M>.
      </p>

      <KeyIdea>
        A robot does not have <em>a</em> mass. It has a mass <em>matrix</em>{" "}
        <M>{"M(\\theta)"}</M> that changes with posture and resists acceleration by different
        amounts in different directions. Torque in, acceleration out — but tilted.
      </KeyIdea>

      <H2>Feed it every acceleration at once</H2>
      <p>
        A matrix is best understood by what it does to a whole circle of inputs, not one input at
        a time. Take every joint acceleration of "unit effort" — the unit circle in the{" "}
        <M>{"(\\ddot\\theta_1, \\ddot\\theta_2)"}</M> plane — and push each one through{" "}
        <M>{"\\tau = M\\ddot\\theta"}</M>. Out comes an ellipse of torques. Long axis: a
        combination of joint accelerations that demands a lot of torque — a "heavy" direction.
        Short axis: a combination the arm barely resists — a "light" one. Because <M>{"M"}</M> is
        symmetric, those two special directions are exactly its eigenvectors, and the axis lengths
        are its eigenvalues.
      </p>
      <p>
        How lopsided the ellipse is gets its own name: the <strong>condition number</strong>{" "}
        <M>{"\\lambda_{\\max}/\\lambda_{\\min}"}</M> — how many times heavier the heaviest
        direction feels than the lightest. A condition number of 1 is a circle: mass the same in
        every direction, like a point mass. A condition number of 30 is a needle: the same motor
        effort that snaps the arm along one direction barely budges it along another.
      </p>

      <Aside>
        This is the same circle-to-ellipse machine from the{" "}
        <a href="#/math2-linalg">Math 2 · Linear algebra module</a>, now loaded with genuine mass
        matrices of the unit 2R arm (<M>{"\\mathfrak{m}_1 = \\mathfrak{m}_2 = L_1 = L_2 = 1"}</M>)
        at named elbow angles. Since a mass matrix is symmetric, the gold eigen-lines always line
        up with the ellipse axes — that alignment is special to symmetric matrices, not a general
        fact.
      </Aside>

      <p>
        <strong>Try this:</strong> step through the presets from <em>folded flat</em> to{" "}
        <em>straight</em> — the elbow angle unbending in stages. Folded flat gives a perfect
        circle (the arm doubles back on itself and, for this idealized model, joint 1 feels only
        1 kg·m² every way). By <em>straight</em>, the ellipse is a needle tipped along the
        "both joints together" direction: accelerating both joints the same way slings the far
        mass fastest and costs the most torque. Watch the eigenvalue labels on the gold lines
        grow apart as you go.
      </p>

      <MassCircleWidget />

      <H2>Two ellipses, two spaces</H2>
      <p>
        Mapping a unit ball of accelerations through a mass matrix produces an{" "}
        <strong>inertia ellipsoid</strong> whose axes are the eigenvectors and whose semi-axis
        lengths are the eigenvalues. There are two genuinely different ones, and it is easy to
        conflate them:
      </p>
      <ul>
        <li>
          The <strong>joint-space</strong> ellipsoid of <M>{"M(\\theta)"}</M> lives in the
          abstract plane of joint accelerations <M>{"(\\ddot\\theta_1, \\ddot\\theta_2)"}</M> and
          torques <M>{"(\\tau_1, \\tau_2)"}</M> — it has nothing to do with Cartesian directions.
        </li>
        <li>
          The <strong>task-space</strong> mass matrix{" "}
          <M>{"\\Lambda(\\theta) = J^{-\\mathsf T}(\\theta)\\,M(\\theta)\\,J^{-1}(\\theta)"}</M>{" "}
          is the apparent mass felt at the end-effector. Its ellipsoid <em>does</em> live in
          Cartesian <M>{"(x,y)"}</M> — it is literally how heavy the tip feels when you push it
          in each direction.
        </li>
      </ul>

      <p>
        <strong>Try this:</strong> set the arm to the book pose <M>{"(0^\\circ, 90^\\circ)"}</M>{" "}
        on the <em>unit</em> preset and check the readouts against the matrix you just explored:{" "}
        <M>{"M_{11}=3,\\ M_{12}=1,\\ M_{22}=1"}</M>. Then drag <M>{"\\theta_2"}</M> slowly toward
        0° and watch both pictures at once — the gold joint-space ellipse stretches (cond climbs
        and turns red past 6), while the purple tip ellipse rotates with the arm. Finally crank{" "}
        <M>{"\\mathfrak{m}_2"}</M> up: the far mass dominates everything.
      </p>

      <WidgetShell
        title="Inertia ellipsoids of the 2R arm"
        onReset={() => {
          setT1(0.0);
          setT2(Math.PI / 2);
          setUnit();
        }}
        caption={
          <>
            Left: the arm with its <span style={{ color: TASK_COLOR }}>task-space mass
            ellipse</span> <M>{"\\Lambda(\\theta)"}</M> drawn at the tip in Cartesian space.
            Right: the <span style={{ color: JOINT_ELL }}>joint-space inertia ellipse</span> of{" "}
            <M>{"M(\\theta)"}</M> in the abstract acceleration/torque plane. A long axis means
            "heavy / hard to accelerate" in that direction.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={360} camera={[0, 0, 3.4]}>
              <Triad ghost colors={GHOST} scale={0.4} />
              <PosedGroup R={T1.R} p={[T1.p[0], T1.p[1], T1.p[2]]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.06, 0.06, 0.15, 20]} />
                  <meshStandardMaterial color={JOINT_COLOR} />
                </mesh>
                <mesh position={[L1 / 2, 0, 0]}>
                  <boxGeometry args={[L1, 0.08, 0.04]} />
                  <meshStandardMaterial color={LINK_COLORS[0]} />
                </mesh>
              </PosedGroup>
              <mesh position={pElbow}>
                <sphereGeometry args={[0.055, 16, 16]} />
                <meshStandardMaterial color={LINK_COLORS[0]} />
              </mesh>
              <PosedGroup R={T2.R} p={[T2.p[0], T2.p[1], T2.p[2]]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.05, 0.05, 0.12, 20]} />
                  <meshStandardMaterial color={JOINT_COLOR} />
                </mesh>
                <mesh position={[L2 / 2, 0, 0]}>
                  <boxGeometry args={[L2, 0.065, 0.03]} />
                  <meshStandardMaterial color={LINK_COLORS[1]} />
                </mesh>
              </PosedGroup>
              <Ellipsoid center={pEE} axes={taskAxes} radii={taskRadii} color={TASK_COLOR} opacity={0.26} />
              <PrincipalAxes center={pEE} axes={taskAxes} radii={taskRadii} color={TASK_COLOR} />
            </Scene3D>
            <div className="ui text-[11px] text-center text-[var(--ink-faint)] mt-1">
              task space — <M>{"\\Lambda(\\theta)"}</M> at the tip
            </div>
          </div>

          <div className="w-full md:w-[230px] shrink-0 flex flex-col">
            <Scene3D height={220} camera={[0, 0, 3.0]}>
              <Triad ghost colors={ABSTRACT_GHOST} scale={0.7} />
              <Ellipsoid center={[0, 0, 0]} axes={jointAxes} radii={jointRadii} color={JOINT_ELL} opacity={0.26} />
              <PrincipalAxes center={[0, 0, 0]} axes={jointAxes} radii={jointRadii} color={JOINT_ELL} />
            </Scene3D>
            <div className="ui text-[11px] text-center text-[var(--ink-faint)] mt-1">
              joint space — <M>{"M(\\theta)"}</M> in <M>{"(\\ddot\\theta_1, \\ddot\\theta_2)"}</M>
            </div>
          </div>
        </div>

        <div className="ui flex flex-wrap items-center gap-x-6 gap-y-3 mt-3">
          <LabeledSlider label={<M>{"\\theta_1"}</M>} value={t1} min={-Math.PI} max={Math.PI} onChange={setT1} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
          <LabeledSlider label={<M>{"\\theta_2"}</M>} value={t2} min={-Math.PI} max={Math.PI} onChange={setT2} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
          <LabeledSlider label={<M>{"\\mathfrak{m}_1"}</M>} value={m1} min={0.2} max={8} step={0.1} onChange={setM1} width={110} />
          <LabeledSlider label={<M>{"\\mathfrak{m}_2"}</M>} value={m2} min={0.2} max={8} step={0.1} onChange={setM2} width={110} />
          <div className="flex gap-2">
            <WidgetButton active={preset === "unit"} onClick={setUnit}>unit</WidgetButton>
            <WidgetButton active={preset === "ur5"} onClick={setUr5}>UR5-ish</WidgetButton>
          </div>
        </div>

        <div className="ui flex flex-wrap gap-x-5 gap-y-2 mt-3 border-t border-[var(--rule)] pt-3">
          <Readout label={<M>{"M_{11}"}</M>} value={Mmat[0].toFixed(2)} />
          <Readout label={<M>{"M_{12}"}</M>} value={Mmat[1].toFixed(2)} />
          <Readout label={<M>{"M_{22}"}</M>} value={Mmat[3].toFixed(2)} />
          <Readout label={<M>{"\\lambda_{\\max}"}</M>} value={Meig.values[0].toFixed(2)} />
          <Readout label={<M>{"\\lambda_{\\min}"}</M>} value={Meig.values[1].toFixed(2)} />
          <Readout label="cond" value={condM.toFixed(1)} color={condM > 6 ? "var(--bad)" : undefined} />
        </div>
      </WidgetShell>

      <Challenge id="ch8-mass-matrix-max" met={met}>
        Straighten the elbow (<M>{"\\theta_2 \\to 0"}</M>) to push the arm to its longest reach.
        Watch the joint-space ellipse stretch — that maximizes <M>{"M_{11}"}</M>, the inertia
        the base joint must overcome.
      </Challenge>

      <Aside>
        The book's Figure 8.3 case: at <M>{"\\theta = (0^\\circ, 90^\\circ)"}</M> with{" "}
        <M>{"L_1 = L_2 = \\mathfrak{m}_1 = \\mathfrak{m}_2 = 1"}</M>, the readouts show{" "}
        <M>{"M = \\begin{bmatrix} 3 & 1 \\\\ 1 & 1 \\end{bmatrix}"}</M> — exactly the figure.
        The ellipsoid view only describes forces and accelerations at zero velocity, where there
        are no Coriolis or centripetal terms.
      </Aside>

      <KeyIdea>
        The mass matrix is configuration-dependent and direction-dependent. Extending the arm
        raises the inertia seen by the base joint; the task-space matrix{" "}
        <M>{"\\Lambda = J^{-\\mathsf T} M J^{-1}"}</M> turns that into the apparent mass felt at
        the fingertip — central to haptics and force control.
      </KeyIdea>

      <H2>Traps</H2>
      <ul>
        <li>
          <strong>The joint-space ellipse is not pointing anywhere in the room.</strong> Its long
          axis is a <em>combination of joint accelerations</em> — "both joints together" or
          "joints opposing" — not a Cartesian direction. Only the purple <M>{"\\Lambda"}</M>{" "}
          ellipse at the tip lives in real space.
        </li>
        <li>
          <strong>There is no single "mass of the robot".</strong> Any control gain or motor
          sizing based on one number is implicitly picking one posture and one direction;{" "}
          <M>{"M(\\theta)"}</M> can change several-fold between folded and stretched.
        </li>
        <li>
          <strong>Big eigenvalue means heavy, not strong.</strong> A long ellipse axis is a
          direction the motors struggle to accelerate — resistance, not capability. (Note the
          torque ellipse of <M>{"M"}</M> is long exactly where the acceleration ellipse of{" "}
          <M>{"M^{-1}"}</M> is short.)
        </li>
        <li>
          <strong><M>{"\\Lambda"}</M> blows up at singularities.</strong> It is built from{" "}
          <M>{"J^{-1}"}</M>, so as the arm straightens, the apparent mass in the lost direction
          goes to infinity — the tip truly cannot be accelerated that way, no matter the torque.
          That is why the widget normalizes the ellipse's size and reports the raw numbers
          separately.
        </li>
      </ul>

      <Quiz
        challengeId="ch8-massmatrix-quiz"
        goal={<>Answer all three questions correctly.</>}
        questions={[
          {
            prompt: (
              <>
                The joint-space inertia ellipse of <M>{"M(\\theta)"}</M> has a long gold axis.
                What does that direction mean?
              </>
            ),
            options: [
              { label: "A Cartesian direction in which the tip is hard to push" },
              {
                label: "A combination of joint accelerations that demands the most torque per unit acceleration",
                correct: true,
              },
              { label: "The direction the arm will fall under gravity" },
            ],
            explain: (
              <>
                The ellipse lives in the abstract <M>{"(\\ddot\\theta_1, \\ddot\\theta_2)"}</M>{" "}
                plane. Its long axis is the "heaviest" mix of joint accelerations. Cartesian
                heaviness at the tip is the job of <M>{"\\Lambda"}</M>, and gravity is a separate
                term entirely.
              </>
            ),
          },
          {
            prompt: <>Why does the mass matrix depend on the configuration <M>{"\\theta"}</M>?</>,
            options: [
              { label: "The links' masses change as the motors heat up" },
              {
                label: "Folding or extending the arm moves the same masses closer to or farther from the joints that must swing them",
                correct: true,
              },
              { label: "It doesn't — mass is conserved, so M is constant" },
            ],
            explain: (
              <>
                No mass is created or destroyed — but leverage changes. A mass far from a joint's
                axis is harder for that joint to accelerate (the <M>{"2L_1L_2\\cos\\theta_2"}</M>{" "}
                term), so the <em>effective</em> inertia is posture-dependent even though the
                kilograms are fixed.
              </>
            ),
          },
          {
            prompt: (
              <>
                You push sideways on the robot's end-effector to feel how heavy it is. Which
                matrix answers?
              </>
            ),
            options: [
              { label: <M>{"M(\\theta)"}</M> },
              { label: <M>{"\\Lambda(\\theta) = J^{-\\mathsf T} M J^{-1}"}</M>, correct: true },
              { label: <>The condition number <M>{"\\lambda_{\\max}/\\lambda_{\\min}"}</M></> },
            ],
            explain: (
              <>
                Pushing the tip is a Cartesian, task-space question, so it is answered by the
                task-space mass matrix <M>{"\\Lambda"}</M> — <M>{"M"}</M> relates joint torques to
                joint accelerations, and the condition number is just a shape summary, not a map.
              </>
            ),
          },
        ]}
      />

      <BookRef>Modern Robotics §8.1.3 — Understanding the Mass Matrix (Figs. 8.3–8.4).</BookRef>
    </div>
  );
}

/* ============ widget 0: joint-acceleration circle → torque ellipse ============ */

// Genuine planar2R_M(θ) of the unit arm (m₁ = m₂ = L₁ = L₂ = 1) at named elbow
// angles; M11 = 3 + 2cosθ₂, M12 = 1 + cosθ₂, M22 = 1.
const MASS_PRESETS: CircleMapPreset[] = [
  { label: "folded flat (θ₂ = 180°)", m: [1, 0, 0, 1] },
  { label: "half bent (θ₂ = 120°)", m: [2, 0.5, 0.5, 1] },
  { label: "book pose (θ₂ = 90°)", m: [3, 1, 1, 1] },
  { label: "nearly straight (θ₂ = 30°)", m: [4.73, 1.87, 1.87, 1] },
  { label: "straight (θ₂ = 0°)", m: [5, 2, 2, 1] },
];

function MassCircleWidget() {
  const [info, setInfo] = useState<CircleMapInfo | null>(null);
  const onState = useCallback((s: CircleMapInfo) => setInfo(s), []);

  // condition number from the singular values (= |eigenvalues| for symmetric M)
  const cond = info && info.sigma[1] > 1e-9 ? info.sigma[0] / info.sigma[1] : Infinity;
  const symmetric = !!info && Math.abs(info.m[1] - info.m[2]) < 0.05;
  const met = !!info && symmetric && info.sigma[1] >= 0.05 && cond >= 8;

  return (
    <>
      <CircleMap
        title="Joint-acceleration circle in, torque ellipse out"
        initial={[3, 1, 1, 1]}
        presets={MASS_PRESETS}
        showEigen={true}
        unitPx={36}
        sliderRange={6}
        inputLabel="unit circle of joint accelerations (θ̈₁, θ̈₂)"
        outputLabel="the torques they demand"
        onState={onState}
        caption={
          <>
            Dashed gray: every joint acceleration of unit effort. Purple: the torques{" "}
            <M>{"\\tau = M\\ddot\\theta"}</M> they demand. The presets are the unit 2R arm's
            genuine mass matrix at named elbow angles; gold lines are the eigen-directions —
            because <M>{"M"}</M> is symmetric they sit exactly on the ellipse axes, with the
            eigenvalue printed as the stretch factor. (Scale: 1 grid unit = 1 rad/s² in,
            1 N·m out.)
          </>
        }
      />
      <Challenge id="ch8-mass-circle" met={met}>
        Make the arm at least 8× heavier in its heaviest direction than in its lightest — get the
        condition number <M>{"\\lambda_{\\max}/\\lambda_{\\min} \\ge 8"}</M> while keeping the
        matrix symmetric (<M>{"b = c"}</M>, or it is no longer a mass matrix). Unbending the elbow
        past <em>nearly straight</em> is one route; the sliders are another.
      </Challenge>
    </>
  );
}
