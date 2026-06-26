import { useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { SpatialArm, armState } from "../../components/three/SpatialArm";
import { Ellipsoid, PrincipalAxes } from "../../components/three/viz3d";
import { type Vec3, rad, deg } from "../../lib/math/vec";
import { jacobianSpace } from "../../lib/math/se3";
import { eig3sym, gramian } from "../../lib/math/eig";
import { ARM_JOINTS, ARM_M, ARM_HOME, eePointJac } from "./arm";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const VEL = "#0b7285"; // manipulability ellipsoid
const FORCE = "#c2571c"; // force ellipsoid
const ELL = 0.5; // velocity-ellipsoid draw scale
const FELL = 0.5; // force-ellipsoid draw scale
const CAP = 2.4; // clamp on a blowing-up force semi-axis

export default function Manipulability() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 5"
        section="Velocity Kinematics & Statics"
        title="Manipulability & Force Ellipsoids"
        lede="Singularity is a yes/no question; manipulability measures how close you are. Feed the Jacobian a unit sphere of joint rates and out comes an ellipsoid — round is good, flat is nearly singular."
      />

      <p>
        A configuration is either singular or not, but it is just as useful to ask how{" "}
        <em>nearly</em> singular a posture is, and in which directions motion is getting expensive.
        Send every unit-effort set of joint rates — the unit sphere{" "}
        <M>{"\\lVert\\dot\\theta\\rVert = 1"}</M> — through the Jacobian and the reachable
        end-effector velocities form an ellipsoid.
      </p>
      <Eq>{"1 = \\dot\\theta^{\\mathsf T}\\dot\\theta = \\dot x^{\\mathsf T}(JJ^{\\mathsf T})^{-1}\\dot x."}</Eq>
      <p>
        The shape is set by <M>{"A = JJ^{\\mathsf T}"}</M>: its eigenvectors are the principal axes
        and the square roots of its eigenvalues <M>{"\\sqrt{\\lambda_i}"}</M> are the semi-axis
        lengths. A round ellipsoid means the tip moves equally easily in all directions; a flat one
        means a direction is becoming hard; at a singularity it collapses to a disk or a line.
      </p>

      <H2>The manipulability ellipsoid, live</H2>
      <p>
        Three scalars summarize it: the axis ratio{" "}
        <M>{"\\mu_1 = \\sqrt{\\lambda_{\\max}/\\lambda_{\\min}}"}</M> (best near 1), its square{" "}
        <M>{"\\mu_2"}</M> (the condition number), and the volume{" "}
        <M>{"\\mu_3 = \\sqrt{\\lambda_1\\lambda_2\\lambda_3} = \\sqrt{\\det A}"}</M> (bigger is
        better).
      </p>

      <ManipWidget />

      <H2>The force ellipsoid is the dual</H2>
      <p>
        A unit sphere of joint <em>torques</em> maps to a force ellipsoid governed by{" "}
        <M>{"B = (JJ^{\\mathsf T})^{-1} = A^{-1}"}</M>. It shares the manipulability ellipsoid's
        axes, but its semi-axes are the reciprocals <M>{"1/\\sqrt{\\lambda_i}"}</M> — long where the
        other is short.
      </p>
      <p>
        This is a real trade-off: the direction the tip moves most easily is the one it can push
        hardest <em>against</em> least, and vice versa. Because the semi-axes multiply to a constant,
        the product of the two ellipsoid volumes is fixed for all postures. Near a singularity the
        manipulability ellipsoid collapses while the force ellipsoid stretches toward infinity along
        the arm — exactly why a straight elbow holds a heavy load with so little joint torque.
      </p>

      <DualityWidget />

      <Aside>
        Angular and linear velocity have different units, so in practice one usually draws two
        ellipsoids — one from <M>{"J_\\omega J_\\omega^{\\mathsf T}"}</M> for rotation and one from{" "}
        <M>{"J_v J_v^{\\mathsf T}"}</M> for translation. The widgets here show the linear-velocity
        ellipsoid of the end-effector point, the most directly visible one.
      </Aside>

      <KeyIdea>
        Manipulability ellipsoid: eigenvectors of <M>{"A=JJ^{\\mathsf T}"}</M>, semi-axes{" "}
        <M>{"\\sqrt{\\lambda_i}"}</M>. Force ellipsoid: same axes, semi-axes{" "}
        <M>{"1/\\sqrt{\\lambda_i}"}</M>. Easy to move ⇔ hard to push. The product of their volumes is
        constant, and both degenerate at a singularity.
      </KeyIdea>

      <BookRef>Modern Robotics §5.4 — Manipulability.</BookRef>
    </div>
  );
}

function ellipsoidData(thetas: [number, number, number]) {
  const st = armState(ARM_JOINTS, ARM_M, thetas);
  const cols = jacobianSpace(st.S, thetas);
  const pEE: Vec3 = [st.ee.p[0], st.ee.p[1], st.ee.p[2]];
  const Jp = eePointJac(cols, pEE);
  const { values, vectors } = eig3sym(gramian(Jp));
  const r: [number, number, number] = [Math.sqrt(values[0]), Math.sqrt(values[1]), Math.sqrt(values[2])];
  const mu1 = r[2] > 1e-6 ? r[0] / r[2] : Infinity;
  const mu3 = r[0] * r[1] * r[2];
  return { st, pEE, vectors, r, values, mu1, mu3 };
}

/* ================= widget 1: manipulability ellipsoid ================= */

function ManipWidget() {
  const [t1, setT1] = useState(ARM_HOME[0]);
  const [t2, setT2] = useState(ARM_HOME[1]);
  const [t3, setT3] = useState(ARM_HOME[2]);

  const thetas: [number, number, number] = [t1, t2, t3];
  const { pEE, vectors, r, mu1, mu3 } = ellipsoidData(thetas);
  const radii: [number, number, number] = [r[0] * ELL, r[1] * ELL, r[2] * ELL];
  const met = Number.isFinite(mu1) && mu1 < 2.2;

  return (
    <>
      <WidgetShell
        title="The velocity ellipsoid, morphing live"
        onReset={() => {
          setT1(ARM_HOME[0]); setT2(ARM_HOME[1]); setT3(ARM_HOME[2]);
        }}
        caption={
          <>
            The teal ellipsoid is every tip velocity reachable from a unit sphere of joint rates.
            Round means the tip moves easily in all directions; a flattened ellipsoid means a
            direction is going expensive. Refold the arm toward a singularity and it squashes into a
            disk as <M>{"\\mu_1\\to\\infty"}</M>.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={380} camera={[4.0, 3.0, 4.0]}>
              <Triad ghost colors={GHOST} scale={0.6} />
              <SpatialArm joints={ARM_JOINTS} M={ARM_M} thetas={thetas} eeTriadScale={0.3} />
              <Ellipsoid center={pEE} axes={vectors} radii={radii} color={VEL} opacity={0.26} />
              <PrincipalAxes center={pEE} axes={vectors} radii={radii} color={VEL} />
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2 md:w-[220px]">
            <Readout label="μ₁ = ℓmax/ℓmin" value={Number.isFinite(mu1) ? mu1.toFixed(2) : "∞"} color={met ? "var(--good)" : undefined} />
            <Readout label="μ₂ = cond(A)" value={Number.isFinite(mu1) ? (mu1 * mu1).toFixed(1) : "∞"} />
            <Readout label="μ₃ = √det A" value={mu3.toFixed(3)} />
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="θ₁" value={t1} min={rad(-180)} max={rad(180)} onChange={setT1} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
          <LabeledSlider label="θ₂" value={t2} min={rad(-150)} max={rad(150)} onChange={setT2} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
          <LabeledSlider label="θ₃" value={t3} min={rad(-150)} max={rad(150)} onChange={setT3} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch5-manip-isotropy" met={met}>
        Hunt for the most isotropic posture: refold the arm until <M>{"\\mu_1 < 2.2"}</M>, where the
        ellipsoid is closest to a sphere. There the tip moves nearly equally well in every direction —
        the posture furthest from any singularity, and usually the best place to do precise work.
      </Challenge>
    </>
  );
}

/* ================= widget 2: force ellipsoid duality ================= */

function DualityWidget() {
  const [t1, setT1] = useState(0.9);
  const [t2, setT2] = useState(-0.5);
  const [t3, setT3] = useState(0.9);
  const [showForce, setShowForce] = useState(true);
  const [showVel, setShowVel] = useState(true);

  const thetas: [number, number, number] = [t1, t2, t3];
  const { pEE, vectors, r, values } = ellipsoidData(thetas);
  const velR: [number, number, number] = [r[0] * ELL, r[1] * ELL, r[2] * ELL];
  // force ellipsoid: semi-axes 1/√λ along the same axes, clamped for drawing
  const forceR: [number, number, number] = [
    Math.min(CAP, (r[0] > 1e-4 ? 1 / r[0] : CAP) * FELL),
    Math.min(CAP, (r[1] > 1e-4 ? 1 / r[1] : CAP) * FELL),
    Math.min(CAP, (r[2] > 1e-4 ? 1 / r[2] : CAP) * FELL),
  ];
  const VA = r[0] * r[1] * r[2];
  const VB = r[0] * r[1] * r[2] > 1e-9 ? 1 / (r[0] * r[1] * r[2]) : Infinity;
  const product = Number.isFinite(VB) ? VA * VB : 1;
  void values;

  return (
    <>
      <WidgetShell
        title="Velocity and force: perpendicular twins"
        onReset={() => {
          setT1(0.9); setT2(-0.5); setT3(0.9); setShowForce(true); setShowVel(true);
        }}
        caption={
          <>
            <span style={{ color: VEL }}>Teal</span> is the manipulability ellipsoid (easy motion);{" "}
            <span style={{ color: FORCE }}>orange</span> is the force ellipsoid (strong push). They
            share principal axes but are long where the other is short. Drive toward a singularity and
            the teal one flattens while the orange one stretches out — the product of their volumes
            stays put.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={380} camera={[4.0, 3.0, 4.0]}>
              <Triad ghost colors={GHOST} scale={0.6} />
              <SpatialArm joints={ARM_JOINTS} M={ARM_M} thetas={thetas} eeTriadScale={0.3} />
              {showForce && <Ellipsoid center={pEE} axes={vectors} radii={forceR} color={FORCE} opacity={0.16} wireframe />}
              {showVel && <Ellipsoid center={pEE} axes={vectors} radii={velR} color={VEL} opacity={0.28} />}
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2 md:w-[220px]">
            <Readout label="V_A (velocity vol)" value={VA.toFixed(3)} color={VEL} />
            <Readout label="V_B (force vol)" value={Number.isFinite(VB) ? VB.toFixed(3) : "∞"} color={FORCE} />
            <Readout label="V_A · V_B" value={product.toFixed(2)} color="var(--good)" />
            <div className="flex gap-2 mt-1">
              <WidgetButton onClick={() => setShowVel(v => !v)} active={showVel}>velocity</WidgetButton>
              <WidgetButton onClick={() => setShowForce(v => !v)} active={showForce}>force</WidgetButton>
            </div>
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="θ₁" value={t1} min={rad(-180)} max={rad(180)} onChange={setT1} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
          <LabeledSlider label="θ₂" value={t2} min={rad(-150)} max={rad(150)} onChange={setT2} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
          <LabeledSlider label="θ₃" value={t3} min={rad(-150)} max={rad(150)} onChange={setT3} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
        </ControlBar>
      </WidgetShell>

      <Quiz
        challengeId="ch5-manip-quiz"
        goal={<>Confirm the velocity–force duality.</>}
        questions={[
          {
            prompt: <>The force ellipsoid's semi-axes are, relative to the manipulability ellipsoid's…</>,
            options: [
              { label: "reciprocal lengths along the same axes", correct: true },
              { label: "the same lengths along the same axes" },
              { label: "reciprocal lengths along perpendicular axes" },
            ],
            explain: <>Same eigenvectors; eigenvalues invert, so semi-axes go from <M>{"\\sqrt{\\lambda_i}"}</M> to <M>{"1/\\sqrt{\\lambda_i}"}</M>.</>,
          },
          {
            prompt: <>As the arm approaches a singularity, the force ellipsoid…</>,
            options: [
              { label: "stretches toward infinity along the lost-motion direction", correct: true },
              { label: "collapses to a point" },
              { label: "is unchanged" },
            ],
            explain: <>The manipulability volume → 0 while the force volume → ∞; their product stays constant.</>,
          },
        ]}
      />
    </>
  );
}
