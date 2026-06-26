import { useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
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
        At rest (<M>{"\\dot{\\theta}=0"}</M>) the joint torques and accelerations are linked by
        the symmetric positive-definite <strong>mass matrix</strong> <M>{"M(\\theta)"}</M>:
      </p>
      <Eq>{"\\tau = M(\\theta)\\,\\ddot{\\theta} + g(\\theta), \\qquad \\mathcal{K} = \\tfrac12\\,\\dot{\\theta}^{\\mathsf T} M(\\theta)\\,\\dot{\\theta}."}</Eq>
      <p>
        The kinetic-energy quadratic is the direct generalization of{" "}
        <M>{"\\tfrac12 \\mathfrak{m} v^2"}</M>. Because <M>{"M"}</M> is generally not a scalar
        multiple of the identity, the acceleration <M>{"\\ddot{\\theta}"}</M> is{" "}
        <em>not</em> parallel to the torque <M>{"\\tau"}</M> that produced it — the arm has a
        preferred set of "easy" and "hard" directions, given by the eigenvectors of{" "}
        <M>{"M(\\theta)"}</M>.
      </p>

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

      <BookRef>Modern Robotics §8.1.3 — Understanding the Mass Matrix (Figs. 8.3–8.4).</BookRef>
    </div>
  );
}
