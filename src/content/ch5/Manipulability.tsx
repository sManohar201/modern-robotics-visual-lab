import { useCallback, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { CircleMap, type CircleMapInfo, type CircleMapPreset } from "../../components/widgets/CircleMap";
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
        lede="Singular is a yes/no question; manipulability is the dimmer switch. Feed the arm every possible unit-effort command at once and the tip velocities trace out an ellipsoid — round means healthy, flat means a singularity is near."
      />

      <p>
        Hold your arm out almost — but not quite — straight, and try to draw a small circle with
        your fingertip. Sweeping side to side is effortless. But the part of the circle that moves
        the fingertip <em>along</em> the arm, toward or away from your shoulder, is agony: your
        elbow has to fold at a furious rate to buy a millimeter of tip motion. The arm isn't
        singular — every direction is still reachable — but some directions have become{" "}
        <em>expensive</em>. The singularities page asked the yes/no question "is a direction lost?"
        This page asks the better engineering question: <strong>how close to lost is it, and which
        direction goes first?</strong>
      </p>

      <H2>Feed it every command at once</H2>
      <p>
        Here is the trick that turns "how easy is each direction?" into a single picture. Instead
        of testing tip directions one at a time, take <em>every</em> combination of joint rates of
        unit effort — all the vectors <M>{"\\dot\\theta"}</M> with{" "}
        <M>{"\\lVert\\dot\\theta\\rVert = 1"}</M>, which form a circle (two joints) or a sphere
        (three) — and push the whole batch through the Jacobian at once. Each input lands at{" "}
        <M>{"\\dot x = J\\dot\\theta"}</M>, and the outputs trace out an{" "}
        <strong>ellipse</strong> (or ellipsoid): stretched in directions the arm moves easily,
        pinched in directions it doesn't.
      </p>
      <Aside>
        "A matrix turns the unit circle into an ellipse" is exactly the machine built in the{" "}
        <a href="#/math2-linalg">Math 2 · Linear algebra module</a> — same widget, general matrix.
        Here the matrix is a real arm's Jacobian, so the circle is joint-rate commands and the
        ellipse is tip velocities.
      </Aside>
      <p>
        <strong>Try this:</strong> the presets below are the planar 2R arm's actual Jacobian at
        named postures (link lengths 1 and 1). Click <em>elbow square</em> and note a healthy,
        chubby ellipse. Step through <em>nearly straight</em> and then <em>straight — singular</em>:
        the ellipse thins into a needle and finally collapses to a line segment — the flatland
        version of the fingertip experiment above. The red and green arrows are the two Jacobian
        columns; watch them become parallel as the ellipse dies.
      </p>

      <CircleWidget />

      <H2>Putting an equation on the picture</H2>
      <p>
        Now let's earn the formula for that ellipse. Every point <M>{"\\dot x"}</M> on it came from
        some unit input, so run the machine backwards: the input was{" "}
        <M>{"\\dot\\theta = J^{-1}\\dot x"}</M>, and "the input had unit effort" says{" "}
        <M>{"\\dot\\theta^{\\mathsf T}\\dot\\theta = 1"}</M>. Substitute the first into the second
        and the ellipse's equation falls out:
      </p>
      <Eq>{"1 = \\dot\\theta^{\\mathsf T}\\dot\\theta = (J^{-1}\\dot x)^{\\mathsf T}(J^{-1}\\dot x) = \\dot x^{\\mathsf T}(JJ^{\\mathsf T})^{-1}\\dot x."}</Eq>
      <p>
        Read it back. An expression of the shape <M>{"\\dot x^{\\mathsf T} M \\dot x"}</M> — a
        matrix sandwiched between two copies of a vector — is called a{" "}
        <strong>quadratic form</strong>: it eats a vector and returns one number, and setting that
        number to 1 carves out an ellipse (in 2-D) or ellipsoid (in 3-D). So the equation says:
        the tip velocities reachable with unit effort are exactly the ellipsoid whose matrix is{" "}
        <M>{"(JJ^{\\mathsf T})^{-1}"}</M>. All the geometry is stored in the symmetric matrix{" "}
        <M>{"A = JJ^{\\mathsf T}"}</M>: its eigenvectors point along the ellipsoid's principal
        axes, and the square roots of its eigenvalues <M>{"\\sqrt{\\lambda_i}"}</M> are the
        semi-axis lengths — how far the ellipsoid reaches along each axis.
      </p>

      <H2>The manipulability ellipsoid, live</H2>
      <p>
        Three scalars summarize the shape. The axis ratio{" "}
        <M>{"\\mu_1 = \\sqrt{\\lambda_{\\max}/\\lambda_{\\min}}"}</M> — longest reach over shortest
        — is 1 for a perfect sphere and blows up to <M>{"\\infty"}</M> at a singularity. Its square{" "}
        <M>{"\\mu_2"}</M> is the <strong>condition number</strong> of <M>{"A"}</M> (the standard
        linear-algebra name for "how lopsided"). And the volume{" "}
        <M>{"\\mu_3 = \\sqrt{\\lambda_1\\lambda_2\\lambda_3} = \\sqrt{\\det A}"}</M> measures the
        overall speed budget — bigger is better, all else equal.
      </p>
      <p>
        <strong>Try this:</strong> straighten the elbow (<M>{"\\theta_3 \\to 0"}</M>) and watch the
        teal ellipsoid squash into a disk while <M>{"\\mu_1"}</M> climbs. Then hunt the other way:
        refold the arm looking for the roundest ellipsoid you can find, watching <M>{"\\mu_1"}</M>{" "}
        drop toward 1. The winning postures are comfortable, mid-fold ones — exactly where a human
        (or a well-programmed robot) prefers to work.
      </p>

      <ManipWidget />

      <KeyIdea>
        Push the unit sphere of joint rates through <M>{"J"}</M> and you get the manipulability
        ellipsoid: axes along the eigenvectors of <M>{"A = JJ^{\\mathsf T}"}</M>, semi-axes{" "}
        <M>{"\\sqrt{\\lambda_i}"}</M>. Round (<M>{"\\mu_1 \\approx 1"}</M>) means every direction
        is equally easy; flat means a direction is nearly lost; collapsed means singular.
      </KeyIdea>

      <H2>The force ellipsoid is the dual</H2>
      <p>
        Now swap velocities for pushes. Run the same game with joint <em>torques</em> instead of
        joint rates: take every unit-effort torque vector <M>{"\\lVert\\tau\\rVert = 1"}</M> and
        ask what tip forces the arm can exert. Statics (<M>{"\\tau = J^{\\mathsf T}f"}</M>, from
        the previous page) turns the crank, and out comes a <strong>force ellipsoid</strong>{" "}
        governed by <M>{"B = (JJ^{\\mathsf T})^{-1} = A^{-1}"}</M>. Inverting a matrix keeps its
        eigenvectors but flips each eigenvalue to <M>{"1/\\lambda_i"}</M> — so the force ellipsoid
        shares the manipulability ellipsoid's axes, with semi-axes the reciprocals{" "}
        <M>{"1/\\sqrt{\\lambda_i}"}</M>: long exactly where the other is short.
      </p>
      <p>
        This is a real trade-off, not a bookkeeping curiosity: the direction the tip moves most
        easily is the direction it pushes most weakly, and vice versa. Because each pair of
        semi-axes multiplies to 1, the product of the two ellipsoid volumes is the same at every
        posture. Near a singularity the manipulability ellipsoid collapses while the force
        ellipsoid stretches toward infinity along the arm — which is exactly why you carry a heavy
        bag with a straight, hanging arm: at that (singular) posture the load direction lies along
        the force ellipsoid's enormous axis, and your muscles pay almost nothing.
      </p>
      <p>
        <strong>Try this:</strong> toggle both ellipsoids on and confirm they share axes — teal
        long where orange is short. Then straighten the elbow slowly and watch the exchange: teal
        pancakes, orange spears out along the arm, and the <M>{"V_A \\cdot V_B"}</M> readout never
        moves. That frozen product is the duality in one number.
      </p>

      <DualityWidget />

      <H2>Traps</H2>
      <p>
        <strong>A big volume can hide a flat shape.</strong> <M>{"\\mu_3"}</M> is a product, so a
        pancake — huge in two directions, dying in the third — can have a respectable volume while
        being one slider-nudge from singular. Always check the ratio <M>{"\\mu_1"}</M> too.
      </p>
      <p>
        <strong>The ellipsoid is a property of the posture, not the robot.</strong>{" "}
        <M>{"A = JJ^{\\mathsf T}"}</M> is rebuilt from <M>{"J(\\theta)"}</M> at every pose. A robot
        doesn't "have" a manipulability; it has one at each configuration, and motion planners
        chase the good ones.
      </p>
      <p>
        <strong>Don't mix rotations and translations in one ellipsoid.</strong> Angular velocity
        (rad/s) and linear velocity (m/s) have different units, so lumping all six twist rows into
        one <M>{"JJ^{\\mathsf T}"}</M> adds apples to oranges. In practice you draw two ellipsoids
        — one from the angular rows <M>{"J_\\omega J_\\omega^{\\mathsf T}"}</M>, one from the
        linear rows <M>{"J_v J_v^{\\mathsf T}"}</M>. The widgets here show the linear-velocity
        ellipsoid of the end-effector point, the one you can see.
      </p>
      <p>
        <strong>The force ellipsoid's long axis is strength, not speed.</strong> It's tempting to
        read any long axis as "good." Long teal = fast motion; long orange = strong push. At a
        singularity the orange spike means "infinitely strong against loads in this direction" —
        precisely because the arm cannot move that way at all.
      </p>

      <KeyIdea>
        Force ellipsoid: same axes as the manipulability ellipsoid, semi-axes flipped to{" "}
        <M>{"1/\\sqrt{\\lambda_i}"}</M>. Easy to move ⇔ weak to push. The product of the two
        volumes is constant across postures, and both ellipsoids degenerate together at a
        singularity.
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

/* ============ widget 0: 2R joint-rate circle → tip-velocity ellipse ============ */

// Planar 2R Jacobian J = [[-s1-s12, -s12],[c1+c12, c12]] with L1 = L2 = 1,
// evaluated at named postures for the preset buttons.
const ARM_PRESETS: CircleMapPreset[] = [
  { label: "elbow square (0°, 90°)", m: [-1, -1, 1, 0] },
  { label: "worked pose (90°, −90°)", m: [-1, 0, 1, 1] },
  { label: "folded (0°, 150°)", m: [-0.5, -0.5, 0.13, -0.87] },
  { label: "nearly straight (0°, 20°)", m: [-0.34, -0.34, 1.94, 0.94] },
  { label: "straight — singular (0°, 0°)", m: [0, 0, 2, 1] },
];

function CircleWidget() {
  const [info, setInfo] = useState<CircleMapInfo | null>(null);
  const onState = useCallback((s: CircleMapInfo) => setInfo(s), []);

  const ratio = info && info.sigma[1] > 1e-9 ? info.sigma[0] / info.sigma[1] : Infinity;
  const met = !!info && info.sigma[1] >= 0.05 && ratio >= 6;

  return (
    <>
      <CircleMap
        title="Joint-rate circle in, tip-velocity ellipse out"
        initial={[-1, -1, 1, 0]}
        presets={ARM_PRESETS}
        showEigen={false}
        inputLabel="unit circle of joint rates (θ̇₁, θ̇₂)"
        outputLabel="the tip velocities they produce"
        onState={onState}
        caption={
          <>
            Dashed gray: every joint-rate command of unit effort. Purple: the tip velocities they
            produce, <M>{"\\dot x = J\\dot\\theta"}</M>. The presets are the 2R arm's genuine
            Jacobian at named postures; the <span style={{ color: "#d9483f" }}>red</span> and{" "}
            <span style={{ color: "#2f9e44" }}>green</span> arrows are its columns — where pure
            joint-1 and pure joint-2 speed send the tip. The sliders let you go off-road to any
            2×2 matrix.
          </>
        }
      />
      <Challenge id="ch5-manip-flat" met={met}>
        Make the ellipse <em>nearly</em> singular without killing it: get the long axis at least
        6× the short one while the short axis stays alive (≥ 0.05). The <em>nearly straight</em>{" "}
        posture is one way; or drag the sliders until the two column arrows almost line up —
        near-parallel columns are exactly what "close to singular" means.
      </Challenge>
    </>
  );
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
        goal={<>Confirm the ellipsoid picture and the velocity–force duality.</>}
        questions={[
          {
            prompt: <>An axis ratio <M>{"\\mu_1"}</M> close to 1 means…</>,
            options: [
              { label: "the tip moves about equally easily in every direction", correct: true },
              { label: "the arm is at a singularity" },
              { label: "the arm can exert no force" },
            ],
            explain: <>Round ellipsoid ⇔ <M>{"\\lambda_{\\max}\\approx\\lambda_{\\min}"}</M> ⇔ no direction is favored — the isotropic, far-from-singular case. Singularity is the opposite extreme, <M>{"\\mu_1\\to\\infty"}</M>.</>,
          },
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
            explain: <>The manipulability volume → 0 while the force volume → ∞; their product stays constant. Straight-arm bag carry: no motion possible along the load, so no torque needed against it.</>,
          },
        ]}
      />
    </>
  );
}
