import { useState } from "react";
import { PageHeader, M, Eq, KeyIdea, Aside, Worked, BookRef } from "../../components/prose";
import { Quiz } from "../../components/widgets/Quiz";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { PointArrow, AxisArc } from "../../components/three/viz3d";
import { Bone } from "../../components/three/SpatialArm";
import { type Vec3, type Vec6, deg, mat3Identity, mat3MulVec, vcross, vnorm } from "../../lib/math/vec";
import { type SE3, exp6, screwFromAxisPoint, se3Mul, se3Inv, se3Apply, adjointApply } from "../../lib/math/se3";
import { adjointTransposeApply } from "./dynamics";

const LINK_COLORS = ["#c2571c", "#0b7285", "#6741d9"] as const;
const JOINT_COLOR = "#33343d";
const GRAV_COLOR = "#d9483f"; // red — gravity
const FORCE_COLOR = "#6741d9"; // purple — tip load
const TORQUE_COLOR = "#b08c1d"; // gold — joint torque arcs
const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];

const L1 = 1.0;
const L2 = 1.0;
const L3 = 0.8;
const g = 9.81;

export default function Rnea() {
  const [t1, setT1] = useState(0.4);
  const [t2, setT2] = useState(-0.7);
  const [t3, setT3] = useState(1.1);
  const [fx, setFx] = useState(0.0);
  const [fy, setFy] = useState(0.0);
  const [fz, setFz] = useState(0.0);
  const [m1, setM1] = useState(1.0);
  const [m2, setM2] = useState(1.0);
  const [m3, setM3] = useState(1.0);
  const [preset, setPreset] = useState<"unit" | "ur5">("unit");

  const setUnit = () => { setPreset("unit"); setM1(1); setM2(1); setM3(1); };
  const setUr5 = () => { setPreset("ur5"); setM1(3.7); setM2(8.3); setM3(2.3); };

  // 3R spatial arm: base yaw (z), shoulder pitch (y), elbow pitch (y)
  const S_list = [
    screwFromAxisPoint([0, 0, 1], [0, 0, 0]),
    screwFromAxisPoint([0, 1, 0], [0, 0, L1]),
    screwFromAxisPoint([0, 1, 0], [L2, 0, L1]),
  ];
  const T1 = exp6(S_list[0], t1);
  const T2 = se3Mul(T1, exp6(S_list[1], t2));
  const T3 = se3Mul(T2, exp6(S_list[2], t3));

  // center-of-mass home frames
  const M_co1: SE3 = { R: mat3Identity(), p: [0, 0, L1 / 2] };
  const M_co2: SE3 = { R: mat3Identity(), p: [L2 / 2, 0, L1] };
  const M_co3: SE3 = { R: mat3Identity(), p: [L2 + L3 / 2, 0, L1] };
  const M_ee: SE3 = { R: mat3Identity(), p: [L2 + L3, 0, L1] };

  const T_co1 = se3Mul(T1, M_co1);
  const T_co2 = se3Mul(T2, M_co2);
  const T_co3 = se3Mul(T3, M_co3);
  const T_ee = se3Mul(T3, M_ee);
  const pEE = T_ee.p;

  const pJoint1: Vec3 = [0, 0, 0];
  const pJoint2 = se3Apply(T1, [0, 0, L1]);
  const pJoint3 = se3Apply(T2, [L2, 0, L1]);

  // joint axis directions in the world
  const ax1: Vec3 = [0, 0, 1];
  const ax2 = mat3MulVec(T1.R, [0, 1, 0]);
  const ax3 = mat3MulVec(T2.R, [0, 1, 0]);

  const I_val = preset === "unit" ? 0.1 : 0.4;
  const G_I: [number, number, number] = [I_val, I_val, I_val];

  // ---- static RNEA: gravity enters as an upward base acceleration ----
  const Vdot0: Vec6 = [0, 0, 0, 0, 0, g];
  const T10 = se3Inv(T_co1);
  const T21 = se3Mul(se3Inv(T_co2), T_co1);
  const T32 = se3Mul(se3Inv(T_co3), T_co2);
  const T43 = se3Mul(se3Inv(T_ee), T_co3);

  const Vdot1 = adjointApply(T10, Vdot0);
  const Vdot2 = adjointApply(T21, Vdot1);
  const Vdot3 = adjointApply(T32, Vdot2);

  const gWrench = (Vd: Vec6, mi: number): Vec6 => [
    G_I[0] * Vd[0], G_I[1] * Vd[1], G_I[2] * Vd[2],
    mi * Vd[3], mi * Vd[4], mi * Vd[5],
  ];
  const G1V = gWrench(Vdot1, m1);
  const G2V = gWrench(Vdot2, m2);
  const G3V = gWrench(Vdot3, m3);

  const F_tip: Vec6 = [0, 0, 0, fx, fy, fz];
  const F3 = netWrench(se3Inv(T43), F_tip, G3V);
  const F2 = netWrench(se3Inv(T32), F3, G2V);
  const F1 = netWrench(se3Inv(T21), F2, G1V);

  const A1 = jointScrewInComFrame(T_co1, [0, 0, 1], [0, 0, 0]);
  const A2 = jointScrewInComFrame(T_co2, mat3MulVec(T1.R, [0, 1, 0]), pJoint2);
  const A3 = jointScrewInComFrame(T_co3, mat3MulVec(T2.R, [0, 1, 0]), pJoint3);

  const tau1 = dot6(F1, A1);
  const tau2 = dot6(F2, A2);
  const tau3 = dot6(F3, A3);

  // challenge: balance the shoulder (joint 2) to zero holding torque
  const met = Math.abs(tau2) < 0.4;

  const fMag = vnorm([fx, fy, fz]);
  const torqueArc = (tau: number) => Math.max(-2.5, Math.min(2.5, tau * 0.12));

  return (
    <div>
      <PageHeader
        chapter="Chapter 8"
        section="Dynamics of Open Chains"
        title="Newton–Euler Inverse Dynamics"
        lede="Rather than expand one gigantic symbolic formula, the recursive Newton–Euler algorithm sweeps the chain twice: outward to propagate motion, inward to accumulate force. Two passes give every joint torque exactly."
      />

      <p>
        Picture a bucket brigade — a line of people passing buckets along a chain. The robot's
        links form one. First a message travels <em>outward</em> from the base: "here is how fast
        you are moving and accelerating," each link telling the next, adding its own joint's
        contribution as it passes the word along. Then the buckets come <em>back</em>: starting at
        the fingertip, each link hands its neighbor the total force it needs to do its job —
        support its own weight, produce its own acceleration, plus <em>everything the links beyond
        it handed over</em>. By the time the bucket reaches the shoulder it contains the whole
        arm's demands. Each motor's torque is simply its share of the bucket passing through it.
      </p>
      <p>
        That is the entire algorithm. Formally: inverse dynamics asks, given the state{" "}
        <M>{"(\\theta, \\dot\\theta)"}</M> and a desired acceleration <M>{"\\ddot\\theta"}</M>,
        what joint torques <M>{"\\tau"}</M> are required? The{" "}
        <strong>recursive Newton–Euler algorithm</strong> (RNEA) answers it in two sweeps:
      </p>
      <ol>
        <li>
          <strong>Forward sweep (base → tip).</strong> Propagate each link's twist{" "}
          <M>{"\\mathcal{V}_i"}</M> and acceleration <M>{"\\dot{\\mathcal{V}}_i"}</M> outward.
          Gravity slips in as a trick: give the base an upward acceleration{" "}
          <M>{"\\dot{\\mathcal{V}}_0 = (0, -\\mathfrak{g})"}</M>, and every link inherits its
          weight for free.
        </li>
        <li>
          <strong>Backward sweep (tip → base).</strong> At each link the total wrench is the
          rigid-body wrench <M>{"\\mathcal{G}_i\\dot{\\mathcal{V}}_i - \\mathrm{ad}^{\\mathsf T}_{\\mathcal{V}_i}\\mathcal{G}_i\\mathcal{V}_i"}</M>{" "}
          plus whatever the next link pushes back. Project it onto the joint's screw axis to read
          off the torque.
        </li>
      </ol>
      <Eq>{"\\mathcal{F}_i = \\mathrm{Ad}^{\\mathsf T}_{T_{i+1,i}}(\\mathcal{F}_{i+1}) + \\mathcal{G}_i\\dot{\\mathcal{V}}_i - \\mathrm{ad}^{\\mathsf T}_{\\mathcal{V}_i}(\\mathcal{G}_i\\mathcal{V}_i), \\qquad \\tau_i = \\mathcal{F}_i^{\\mathsf T}\\mathcal{A}_i."}</Eq>
      <p>
        Don't let the adjoints intimidate you — the equation is the bucket, term by term. The first
        term is <em>what the next link handed back</em> (<M>{"\\mathcal F_{i+1}"}</M>), with{" "}
        <M>{"\\mathrm{Ad}^{\\mathsf T}"}</M> doing nothing more exotic than re-expressing that
        wrench in this link's frame — the same force and moment, new bookkeeping point (a force at
        your fingertip is also a twist at your elbow). The second term is <em>this link's own
        demand</em>: mass times acceleration in wrench form. The third is a velocity correction
        (zero whenever the arm isn't moving). Add them, and the joint torque is the one component
        of the total that this joint's axis <M>{"\\mathcal A_i"}</M> can actually feel — a single
        dot product.
      </p>

      <Worked title="Pass the bucket down a 2-link arm">
        <p>
          <strong>Given.</strong> A planar 2-link arm held horizontally at rest. Each link: mass 1
          kg, length 1 m, weight acting at its middle. No tip load. What are the holding torques?
        </p>
        <p>
          <strong>Backward sweep, link 2 (outermost).</strong> Its bucket contains only its own
          weight, 9.81 N at 0.5 m past the elbow. Projecting onto the elbow axis:{" "}
          <M>{"\\tau_2 = 9.81 \\times 0.5 \\approx 4.9"}</M> N·m.
        </p>
        <p>
          <strong>Hand the bucket to link 1.</strong> The elbow passes back the same 9.81 N — but
          seen from the shoulder that force acts at 1.5 m (that is all the adjoint transpose is
          doing: same force, new lever arm). Link 1 adds its own weight, 9.81 N at 0.5 m.
        </p>
        <p>
          <strong>Shoulder torque.</strong>{" "}
          <M>{"\\tau_1 = 9.81(0.5) + 9.81(1.5) \\approx 19.6"}</M> N·m — four times the elbow's,
          from identical links. <strong>Check:</strong> in the widget, set unit masses, lay the arm
          out flat, and compare the two gold arcs: the shoulder's is by far the largest. The
          bucket always gets heavier toward the base.
        </p>
      </Worked>

      <p>
        Below is the static slice (<M>{"\\dot\\theta = \\ddot\\theta = 0"}</M>): only gravity and
        the tip load survive, so the readouts are the holding torques each motor must supply. The{" "}
        <span style={{ color: TORQUE_COLOR }}>gold arcs</span> show those torques live.
      </p>
      <p>
        <strong>Try this:</strong> straighten the arm out horizontally and read the three torques —
        they grow toward the base, exactly like the worked example. Then push a purely vertical
        tip load <M>{"F_z"}</M> and watch <em>every</em> gold arc respond: a force entering at the
        tip rides the bucket brigade all the way down. Finally note that <M>{"\\tau_1"}</M> ignores
        gravity entirely no matter the pose — its axis is vertical — but leaps awake the moment you
        apply a horizontal <M>{"F_x"}</M> or <M>{"F_y"}</M>.
      </p>

      <WidgetShell
        title="Static joint torques from gravity + tip load"
        onReset={() => {
          setT1(0.4); setT2(-0.7); setT3(1.1);
          setFx(0); setFy(0); setFz(0);
          setUnit();
        }}
        caption={
          <>
            <span style={{ color: GRAV_COLOR }}>Red</span> arrows are each link's weight;{" "}
            <span style={{ color: FORCE_COLOR }}>purple</span> is the external tip load;{" "}
            <span style={{ color: TORQUE_COLOR }}>gold arcs</span> are the resulting joint
            torques. Repose the arm or load the tip and watch the backward sweep re-balance.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={400} camera={[3.2, 2.2, 3.4]}>
              <Triad ghost colors={GHOST} scale={0.5} />

              <Bone a={[0, 0, 0]} b={pJoint2} color={LINK_COLORS[0]} radius={0.05} />
              <Bone a={pJoint2} b={pJoint3} color={LINK_COLORS[1]} radius={0.045} />
              <Bone a={pJoint3} b={pEE} color={LINK_COLORS[2]} radius={0.04} />

              {[pJoint1, pJoint2, pJoint3].map((p, i) => (
                <mesh key={i} position={p}>
                  <sphereGeometry args={[0.06, 16, 16]} />
                  <meshStandardMaterial color={JOINT_COLOR} />
                </mesh>
              ))}
              <mesh position={pEE}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshStandardMaterial color={JOINT_COLOR} />
              </mesh>

              {/* gravity on each COM (down = -z math) */}
              <PointArrow at={T_co1.p} dir={[0, 0, -1]} length={m1 * g * 0.018} color={GRAV_COLOR} thickness={0.022} />
              <PointArrow at={T_co2.p} dir={[0, 0, -1]} length={m2 * g * 0.018} color={GRAV_COLOR} thickness={0.022} />
              <PointArrow at={T_co3.p} dir={[0, 0, -1]} length={m3 * g * 0.018} color={GRAV_COLOR} thickness={0.022} />

              {/* tip load */}
              {fMag > 1e-3 && (
                <PointArrow at={pEE} dir={[fx, fy, fz]} length={fMag * 0.06} color={FORCE_COLOR} thickness={0.032} />
              )}

              {/* joint torque arcs */}
              <AxisArc center={pJoint1} axis={ax1} radius={0.26} sweep={torqueArc(tau1)} color={TORQUE_COLOR} />
              <AxisArc center={pJoint2} axis={ax2} radius={0.26} sweep={torqueArc(tau2)} color={TORQUE_COLOR} />
              <AxisArc center={pJoint3} axis={ax3} radius={0.22} sweep={torqueArc(tau3)} color={TORQUE_COLOR} />
            </Scene3D>
          </div>

          <div className="w-full md:w-[260px] shrink-0 flex flex-col gap-4">
            <div className="flex gap-2">
              <WidgetButton active={preset === "unit"} onClick={setUnit}>unit masses</WidgetButton>
              <WidgetButton active={preset === "ur5"} onClick={setUr5}>UR5-ish</WidgetButton>
            </div>
            <div className="border-t border-[var(--rule)] pt-3 flex flex-col gap-3">
              <LabeledSlider label={<M>{"\\theta_1"}</M>} value={t1} min={-Math.PI} max={Math.PI} onChange={setT1} fmt={v => `${deg(v).toFixed(0)}°`} width={120} />
              <LabeledSlider label={<M>{"\\theta_2"}</M>} value={t2} min={-2} max={2} onChange={setT2} fmt={v => `${deg(v).toFixed(0)}°`} width={120} />
              <LabeledSlider label={<M>{"\\theta_3"}</M>} value={t3} min={-2} max={2} onChange={setT3} fmt={v => `${deg(v).toFixed(0)}°`} width={120} />
            </div>
            <div className="border-t border-[var(--rule)] pt-3 flex flex-col gap-3">
              <LabeledSlider label={<M>{"F_x"}</M>} value={fx} min={-8} max={8} step={0.5} onChange={setFx} width={120} />
              <LabeledSlider label={<M>{"F_y"}</M>} value={fy} min={-8} max={8} step={0.5} onChange={setFy} width={120} />
              <LabeledSlider label={<M>{"F_z"}</M>} value={fz} min={-8} max={8} step={0.5} onChange={setFz} width={120} />
            </div>
            <div className="border-t border-[var(--rule)] pt-3 flex flex-col gap-2">
              <Readout label={<M>{"\\tau_1"}</M>} value={`${tau1.toFixed(2)}`} color={TORQUE_COLOR} />
              <Readout label={<M>{"\\tau_2"}</M>} value={`${tau2.toFixed(2)}`} color={Math.abs(tau2) < 0.4 ? "var(--good)" : TORQUE_COLOR} />
              <Readout label={<M>{"\\tau_3"}</M>} value={`${tau3.toFixed(2)}`} color={TORQUE_COLOR} />
            </div>
          </div>
        </div>
      </WidgetShell>

      <Challenge id="ch8-rnea-torque" met={met}>
        Balance the shoulder: repose the arm — and add a tip load if you like — so the holding
        torque on joint 2 drops below <M>{"0.4\\,\\text{N·m}"}</M>. Its gold arc shrinks to nothing
        when the weight above it is stacked over the axis.
      </Challenge>

      <Aside>
        Joint 1's axis is vertical, so gravity (also vertical) exerts no torque about it — only a
        horizontal tip load can. The pitch joints 2 and 3 carry the real gravity load, which is
        exactly why the shoulder of a real robot needs the strongest actuator.
      </Aside>

      <KeyIdea>
        RNEA never forms the big symbolic <M>{"M, c, g"}</M> matrices. It marches outward
        propagating accelerations, then inward propagating wrenches, solving one screw equation
        per link. It is <M>{"O(n)"}</M> and is how real robots compute torques in real time.
      </KeyIdea>

      <Quiz
        challengeId="ch8-rnea-quiz"
        goal={<>Own the two-sweep structure.</>}
        questions={[
          {
            prompt: <>In the backward sweep, what does link i receive from link i+1?</>,
            options: [
              { label: <>The total wrench link i+1 needs — its own demands plus everything from links beyond it</>, correct: true },
              { label: <>Only link i+1's weight</> },
              { label: <>Its joint angle and velocity</> },
            ],
            explain: <>The bucket accumulates: each link adds its own inertial and gravity demands to whatever it was handed. That's why base joints carry the most.</>,
          },
          {
            prompt: <>How does gravity enter the RNEA?</>,
            options: [
              { label: <>As a fake upward acceleration of the base, inherited by every link in the forward sweep</>, correct: true },
              { label: <>As an extra torque added to each motor at the end</> },
              { label: <>It doesn't; RNEA ignores gravity</> },
            ],
            explain: <>Accelerating the base upward at g is indistinguishable from gravity pulling everything down — one initial condition handles all links' weights automatically.</>,
          },
          {
            prompt: <>Why do real-time controllers use RNEA instead of evaluating the closed-form M(θ)θ̈ + c + g?</>,
            options: [
              { label: <>Two O(n) sweeps of small equations beat assembling giant symbolic matrices</>, correct: true },
              { label: <>The closed form gives different (wrong) torques</> },
              { label: <>RNEA also solves the forward kinematics</> },
            ],
            explain: <>Both give identical answers — RNEA just never builds M, c, g explicitly. One local screw equation per link, linear in the number of joints, every millisecond.</>,
          },
        ]}
      />

      <BookRef>Modern Robotics §8.3 — Newton–Euler Inverse Dynamics (Eqs. 8.50–8.54).</BookRef>
    </div>
  );
}

// F_i = Ad^T_{T_{i+1,i}} F_{i+1} + G_i Vdot_i  (static: velocity-product term is zero)
function netWrench(T_next_curr: SE3, F_next: Vec6, G_Vdot: Vec6): Vec6 {
  const t = adjointTransposeApply(T_next_curr, F_next);
  return [t[0] + G_Vdot[0], t[1] + G_Vdot[1], t[2] + G_Vdot[2], t[3] + G_Vdot[3], t[4] + G_Vdot[4], t[5] + G_Vdot[5]];
}

// joint screw axis expressed in the link's COM frame
function jointScrewInComFrame(T_co: SE3, axisWorld: Vec3, pointWorld: Vec3): Vec6 {
  const Tinv = se3Inv(T_co);
  const a = mat3MulVec(Tinv.R, axisWorld);
  const q = se3Apply(Tinv, pointWorld);
  const qxa = vcross(q, a);
  return [a[0], a[1], a[2], qxa[0], qxa[1], qxa[2]];
}

function dot6(a: Vec6, b: Vec6): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] + a[4] * b[4] + a[5] * b[5];
}
