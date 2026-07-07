import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { planar2R_M, planar2R_c, planar2R_g } from "../ch8/dynamics";

// ---- 2R planar arm tracking a circular reference --------------------------
const L1 = 1.0;
const L2 = 0.8;
const LL: [number, number] = [L1, L2];
const BASE_M: [number, number] = [1.0, 1.0]; // link point-masses (kg)
const FRIC = 0.2; // viscous joint friction
const GRAV = 9.81;

const DT = 0.001;
const STEPS_PER_FRAME = 16;

const GOOD = "var(--good)";
const BAD = "var(--bad)";
const LINK1_COLOR = "#3b6fd4";
const LINK2_COLOR = "#c2571c";
const DESIRED_COLOR = "#2f9e44";
const ACTUAL_COLOR = "#d9483f";

// circular reference trajectory in task space, center C, radius RR
const CX = 0.9,
  CY = 0.5,
  RR = 0.45;

function fk(t1: number, t2: number): [number, number] {
  return [L1 * Math.cos(t1) + L2 * Math.cos(t1 + t2), L1 * Math.sin(t1) + L2 * Math.sin(t1 + t2)];
}
function ik(x: number, y: number): [number, number] | null {
  const d2 = x * x + y * y;
  const c2 = (d2 - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (c2 > 1 || c2 < -1) return null;
  const s2 = Math.sqrt(1 - c2 * c2); // elbow-up
  const t2 = Math.atan2(s2, c2);
  const t1 = Math.atan2(y, x) - Math.atan2(L2 * s2, L1 + L2 * c2);
  return [t1, t2];
}
function Jv(t1: number, t2: number): [number, number, number, number] {
  const s1 = Math.sin(t1), c1 = Math.cos(t1);
  const s12 = Math.sin(t1 + t2), c12 = Math.cos(t1 + t2);
  return [-L1 * s1 - L2 * s12, -L2 * s12, L1 * c1 + L2 * c12, L2 * c12];
}
function Jdot(t1: number, t2: number, d1: number, d2: number): [number, number, number, number] {
  const s1 = Math.sin(t1), c1 = Math.cos(t1);
  const s12 = Math.sin(t1 + t2), c12 = Math.cos(t1 + t2);
  const w1 = d1, w12 = d1 + d2;
  return [
    -L1 * c1 * w1 - L2 * c12 * w12,
    -L2 * c12 * w12,
    -L1 * s1 * w1 - L2 * s12 * w12,
    -L2 * s12 * w12,
  ];
}
function inv2(m: [number, number, number, number]): [number, number, number, number] | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-7) return null;
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det];
}

// reference state at time t (position, velocity, acceleration in joint space)
function refState(t: number, speed: number) {
  const w = speed; // angular rate around the circle
  const a = w * t;
  const x = CX + RR * Math.cos(a);
  const y = CY + RR * Math.sin(a);
  const xd = -RR * w * Math.sin(a);
  const yd = RR * w * Math.cos(a);
  const xdd = -RR * w * w * Math.cos(a);
  const ydd = -RR * w * w * Math.sin(a);
  const q = ik(x, y);
  if (!q) return null;
  const J = Jv(q[0], q[1]);
  const Ji = inv2(J);
  if (!Ji) return null;
  const qd: [number, number] = [Ji[0] * xd + Ji[1] * yd, Ji[2] * xd + Ji[3] * yd];
  const Jd = Jdot(q[0], q[1], qd[0], qd[1]);
  const r0 = xdd - (Jd[0] * qd[0] + Jd[1] * qd[1]);
  const r1 = ydd - (Jd[2] * qd[0] + Jd[3] * qd[1]);
  const qdd: [number, number] = [Ji[0] * r0 + Ji[1] * r1, Ji[2] * r0 + Ji[3] * r1];
  return { q, qd, qdd, x, y };
}

type Mode = "pd" | "ct";

export default function ComputedTorque() {
  const [mode, setMode] = useState<Mode>("pd");
  const [payload, setPayload] = useState(0.6);
  const [speed, setSpeed] = useState(1.4);
  const [kp, setKp] = useState(120);
  const [kd, setKd] = useState(22);
  const [running, setRunning] = useState(true);

  const modeRef = useRef(mode); modeRef.current = mode;
  const payloadRef = useRef(payload); payloadRef.current = payload;
  const speedRef = useRef(speed); speedRef.current = speed;
  const gainRef = useRef({ kp, kd }); gainRef.current = { kp, kd };

  const stateRef = useRef({ q: [0, 0] as [number, number], qd: [0, 0] as [number, number], t: 0 });
  const errRef = useRef({ rms: 0, peak: 0, n: 0, sumSq: 0 });
  const [theta, setTheta] = useState<[number, number]>([0, 0]);
  const [errRms, setErrRms] = useState(0);
  const [errPeak, setErrPeak] = useState(0);
  const tipTrail = useRef<[number, number][]>([]);

  const init = useCallback(() => {
    const r = refState(0, speedRef.current);
    const q0 = r ? r.q : ([0.3, 0.6] as [number, number]);
    stateRef.current = { q: [q0[0], q0[1]], qd: [0, 0], t: 0 };
    errRef.current = { rms: 0, peak: 0, n: 0, sumSq: 0 };
    tipTrail.current = [];
    setTheta([q0[0], q0[1]]);
    setErrRms(0);
    setErrPeak(0);
  }, []);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const frame = () => {
      const st = stateRef.current;
      const md = modeRef.current;
      const sp = speedRef.current;
      const { kp: KP, kd: KD } = gainRef.current;
      // total link-2 mass includes payload at the tip
      const mArr: [number, number] = [BASE_M[0], BASE_M[1] + payloadRef.current];

      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        const ref = refState(st.t, sp);
        if (!ref) { st.t += DT; continue; }
        const e: [number, number] = [ref.q[0] - st.q[0], ref.q[1] - st.q[1]];
        const ed: [number, number] = [ref.qd[0] - st.qd[0], ref.qd[1] - st.qd[1]];

        let tau: [number, number];
        if (md === "ct") {
          // computed torque: tau = M(qdd_d + Kp e + Kd ed) + C qdot + g
          const Mm = planar2R_M(st.q, mArr, LL);
          const cc = planar2R_c(st.q, st.qd, mArr, LL);
          const gg = planar2R_g(st.q, mArr, LL, GRAV);
          const a0 = ref.qdd[0] + KP * e[0] + KD * ed[0];
          const a1 = ref.qdd[1] + KP * e[1] + KD * ed[1];
          tau = [
            Mm[0] * a0 + Mm[1] * a1 + cc[0] + gg[0],
            Mm[2] * a0 + Mm[3] * a1 + cc[1] + gg[1],
          ];
        } else {
          // independent-joint PD: tau = Kp e + Kd ed   (no dynamics model)
          tau = [KP * e[0] + KD * ed[0], KP * e[1] + KD * ed[1]];
        }

        // true plant: M(q) qdd + C(q,qd) qd + g(q) + b qd = tau
        const Mm = planar2R_M(st.q, mArr, LL);
        const cc = planar2R_c(st.q, st.qd, mArr, LL);
        const gg = planar2R_g(st.q, mArr, LL, GRAV);
        const rhs0 = tau[0] - cc[0] - gg[0] - FRIC * st.qd[0];
        const rhs1 = tau[1] - cc[1] - gg[1] - FRIC * st.qd[1];
        const Mi = inv2(Mm);
        if (!Mi) { st.t += DT; continue; }
        const qdd0 = Mi[0] * rhs0 + Mi[1] * rhs1;
        const qdd1 = Mi[2] * rhs0 + Mi[3] * rhs1;
        st.qd[0] += qdd0 * DT;
        st.qd[1] += qdd1 * DT;
        st.q[0] += st.qd[0] * DT;
        st.q[1] += st.qd[1] * DT;
        st.t += DT;
      }

      // ---- tracking-error metric in task space (tip distance) -----------
      const ref = refState(st.t, sp);
      if (ref) {
        const tip = fk(st.q[0], st.q[1]);
        const dx = tip[0] - ref.x;
        const dy = tip[1] - ref.y;
        const dist = Math.hypot(dx, dy);
        const er = errRef.current;
        // windowed RMS: keep contributions fresh by decaying after a full lap
        er.n += 1;
        er.sumSq += dist * dist;
        if (er.n > 240) { er.sumSq -= er.sumSq / er.n; er.n -= 1; }
        er.rms = Math.sqrt(er.sumSq / er.n);
        er.peak = Math.max(er.peak * 0.997, dist);
        setErrRms(er.rms);
        setErrPeak(er.peak);

        const tr = tipTrail.current;
        tr.push([tip[0], tip[1]]);
        if (tr.length > 160) tr.shift();
      }

      setTheta([st.q[0], st.q[1]]);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const challengeMet = running && mode === "ct" && payload > 0.05 && errRms < 0.01 && errPeak < 0.02;

  // ---- geometry / SVG mapping (world -> svg) -------------------------------
  const VW = 300, VH = 260;
  const scale = 100, ox = 40, oy = 210;
  const wx = (x: number) => ox + x * scale;
  const wy = (y: number) => oy - y * scale;

  const j0: [number, number] = [0, 0];
  const j1: [number, number] = [L1 * Math.cos(theta[0]), L1 * Math.sin(theta[0])];
  const tip = fk(theta[0], theta[1]);

  // desired circle path
  const circlePts: string[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    circlePts.push(`${wx(CX + RR * Math.cos(a)).toFixed(1)},${wy(CY + RR * Math.sin(a)).toFixed(1)}`);
  }
  const trailPts = tipTrail.current.map(p => `${wx(p[0]).toFixed(1)},${wy(p[1]).toFixed(1)}`).join(" L ");

  return (
    <div>
      <PageHeader
        chapter="Chapter 11"
        section="Robot Control"
        title="Computed Torque Control"
        lede="A good model is leverage. Independent-joint PD fights the robot's own inertia, gravity, and Coriolis coupling blind; computed-torque control cancels all of it first, leaving clean linear error dynamics — and near-perfect tracking."
      />

      <p>
        Carry a full coffee cup across the room. You don't stare at the surface, wait for a
        slosh, and then react — you already know how your arm-plus-cup responds, its weight and
        its swing, so you pre-shape the whole motion in advance and keep your reflexes only for
        the little leftovers. That is the idea of this page: use a <em>model</em> of the robot to
        compute most of the torque ahead of time, and let feedback mop up whatever the model
        missed. Two words for the two ingredients: <strong>feedforward</strong> is torque
        computed in advance from the model, before any error appears;{" "}
        <strong>feedback</strong> is torque computed from the measured error, after the fact.
      </p>
      <p>
        Compare that with the last lesson's approach. Independent-joint control treats each joint
        as if it were alone: <M>{"\\tau = K_p\\theta_e + K_d\\dot\\theta_e"}</M> — pure feedback,
        no model. That ignores the configuration-dependent inertia <M>{"M(\\theta)"}</M>, the
        Coriolis/centripetal coupling <M>{"C(\\theta,\\dot\\theta)\\dot\\theta"}</M>, and gravity{" "}
        <M>{"g(\\theta)"}</M> — exactly the terms that dominate when a real arm moves fast or
        carries a load. The controller only reacts to those forces after they have already pushed
        the arm off course.
      </p>

      <H2>Cancel the dynamics, then stabilize</H2>
      <p>
        The <strong>computed-torque</strong> (feedback-linearizing / inverse-dynamics) controller uses
        the model to feed those terms forward and shape a desired acceleration
        (Modern Robotics Eq. 11.37):
      </p>
      <Eq>{"\\tau = M(\\theta)\\big(\\ddot\\theta_d + K_p\\theta_e + K_d\\dot\\theta_e\\big) + C(\\theta,\\dot\\theta)\\dot\\theta + g(\\theta)."}</Eq>
      <p>
        Read it back: pay the Coriolis and gravity bills in full (<M>{"C\\dot\\theta + g"}</M>),
        then ask for an acceleration — the planned <M>{"\\ddot\\theta_d"}</M> plus a spring–damper
        correction on the error — priced through the inertia <M>{"M(\\theta)"}</M>. Note that{" "}
        <M>{"M"}</M>, <M>{"C"}</M>, and <M>{"g"}</M> are evaluated at the <em>measured</em>{" "}
        <M>{"\\theta,\\dot\\theta"}</M>, so this is not blind playback of a recorded plan.
      </p>
      <p>
        Now watch what this torque does to the robot. The true dynamics are
      </p>
      <Eq>{"M(\\theta)\\,\\ddot\\theta + C(\\theta,\\dot\\theta)\\,\\dot\\theta + g(\\theta) = \\tau."}</Eq>
      <p>
        Substitute the controller's <M>{"\\tau"}</M> in on the right — if the model is exact, the
        symbols match term for term:
      </p>
      <Eq>{"M\\ddot\\theta + C\\dot\\theta + g = M\\big(\\ddot\\theta_d + K_p\\theta_e + K_d\\dot\\theta_e\\big) + C\\dot\\theta + g."}</Eq>
      <p>
        The <M>{"C\\dot\\theta"}</M> and <M>{"g"}</M> terms appear identically on both sides.
        Cancel them:
      </p>
      <Eq>{"M\\,\\ddot\\theta = M\\big(\\ddot\\theta_d + K_p\\theta_e + K_d\\dot\\theta_e\\big)."}</Eq>
      <p>
        The mass matrix is positive definite (see{" "}
        <a href="#/ch8-mass-matrix">Chapter 8 · The Mass Matrix</a>), so it is invertible —
        multiply it away on both sides:
      </p>
      <Eq>{"\\ddot\\theta = \\ddot\\theta_d + K_p\\theta_e + K_d\\dot\\theta_e."}</Eq>
      <p>
        Finally, since <M>{"\\theta_e = \\theta_d - \\theta"}</M>, the difference{" "}
        <M>{"\\ddot\\theta_d - \\ddot\\theta"}</M> is just <M>{"\\ddot\\theta_e"}</M>. Move
        everything to one side:
      </p>
      <Eq>{"\\ddot\\theta_e + K_d\\dot\\theta_e + K_p\\theta_e = 0."}</Eq>
      <p>
        Read it back: cancel the model, and what's left is a pure spring–damper acting on the{" "}
        <em>error</em>. The robot's nonlinearity — posture-dependent inertia, velocity coupling,
        gravity — has vanished from the error's point of view. Each joint's error is now one
        independent, linear second-order system you can tune with the tools of the last lesson
        (pick <M>{"K_p, K_d"}</M> for critical damping). And because the feedforward acceleration{" "}
        <M>{"\\ddot\\theta_d"}</M> is in the loop, the arm starts moving before any error even
        accumulates.
      </p>

      <p>
        <strong>Try this:</strong> run the <strong>PD</strong> controller with the default
        0.6&nbsp;kg payload and watch the red trail sag off the green circle — the blind
        controller is always reacting late to forces it didn't predict. Crank speed to 2.5 rad/s
        and it gets worse (Coriolis terms grow with speed²). Now switch to{" "}
        <strong>computed torque</strong> with the <em>same</em> gains and watch the trail snap
        onto the circle. Then raise the payload to 2&nbsp;kg — CT still tracks, because its model
        includes the payload (see the Aside below).
      </p>

      <WidgetShell
        title="PD vs. computed torque on a circle"
        onReset={() => {
          setMode("pd");
          setPayload(0.6);
          setSpeed(1.4);
          setKp(120);
          setKd(22);
          setRunning(true);
          init();
        }}
        caption={
          <>
            The arm is asked to trace the <span style={{ color: DESIRED_COLOR }}>green circle</span>;
            the <span style={{ color: ACTUAL_COLOR }}>red trail</span> is where the tip actually
            goes. Under <strong>PD</strong>, payload and speed pull the trail off the circle; switch to{" "}
            <strong>computed torque</strong> and it snaps back on, even with a heavy tip load.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} className="bg-[#fcfbf9] border border-gray-200 rounded">
              {/* desired circle */}
              <path d={`M ${circlePts.join(" L ")} Z`} fill="none" stroke={DESIRED_COLOR} strokeWidth={2} strokeDasharray="4 3" />
              {/* actual tip trail */}
              {tipTrail.current.length > 1 && (
                <path d={`M ${trailPts}`} fill="none" stroke={ACTUAL_COLOR} strokeWidth={2} opacity={0.85} />
              )}
              {/* arm links */}
              <line x1={wx(j0[0])} y1={wy(j0[1])} x2={wx(j1[0])} y2={wy(j1[1])} stroke={LINK1_COLOR} strokeWidth={6} strokeLinecap="round" />
              <line x1={wx(j1[0])} y1={wy(j1[1])} x2={wx(tip[0])} y2={wy(tip[1])} stroke={LINK2_COLOR} strokeWidth={5.5} strokeLinecap="round" />
              <circle cx={wx(j0[0])} cy={wy(j0[1])} r={5} fill="#33343d" />
              <circle cx={wx(j1[0])} cy={wy(j1[1])} r={4} fill="#33343d" />
              {/* tip + payload */}
              <circle cx={wx(tip[0])} cy={wy(tip[1])} r={5 + payload * 4} fill={LINK2_COLOR} opacity={0.9} />
            </svg>
          </div>

          <div className="w-full md:w-[260px] shrink-0 flex flex-col gap-3">
            <div className="flex gap-2">
              <WidgetButton active={running} onClick={() => setRunning(r => !r)}>{running ? "Pause" : "Run"}</WidgetButton>
              <WidgetButton onClick={() => { setRunning(true); init(); }}>Restart</WidgetButton>
            </div>

            <div className="flex gap-1.5 text-[11px]">
              <span className="ui font-semibold text-[var(--ink-soft)] self-center">controller:</span>
              {(["pd", "ct"] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); init(); }} className={`px-2 py-0.5 rounded ${mode === m ? "bg-[var(--accent)] text-white" : "bg-gray-200"}`}>
                  {m === "pd" ? "PD" : "computed torque"}
                </button>
              ))}
            </div>

            <div className="border-t border-[var(--rule)] pt-2 flex flex-col gap-2">
              <LabeledSlider label="payload" value={payload} min={0} max={2} step={0.1} onChange={v => { setPayload(v); }} fmt={v => `${v.toFixed(1)} kg`} width={120} />
              <LabeledSlider label="speed" value={speed} min={0.4} max={3.0} step={0.1} onChange={v => { setSpeed(v); init(); }} fmt={v => `${v.toFixed(1)} rad/s`} width={120} />
              <LabeledSlider label={<M>{"K_p"}</M>} value={kp} min={20} max={400} step={5} onChange={setKp} fmt={v => v.toFixed(0)} width={120} />
              <LabeledSlider label={<M>{"K_d"}</M>} value={kd} min={2} max={60} step={1} onChange={setKd} fmt={v => v.toFixed(0)} width={120} />
            </div>

            <div className="border-t border-[var(--rule)] pt-2 flex flex-col gap-1.5">
              <Readout label="RMS tip error" value={`${(errRms * 1000).toFixed(1)} mm`} color={errRms < 0.01 ? GOOD : BAD} />
              <Readout label="peak tip error" value={`${(errPeak * 1000).toFixed(1)} mm`} color={errPeak < 0.02 ? GOOD : BAD} />
              <Readout label="mode" value={mode === "ct" ? "model-based" : "blind PD"} />
            </div>
          </div>
        </div>
      </WidgetShell>

      <Aside>
        Both controllers see the <em>same</em> PD gains; the only difference is that computed torque
        also adds the <M>{"M\\ddot\\theta_d + C\\dot\\theta + g"}</M> terms from the
        <code> planar2R_M / planar2R_c / planar2R_g </code> dynamics of Chapter 8. The plant is
        integrated with the true mass matrix (including the tip payload) at{" "}
        <M>{"\\Delta t = 1\\,\\text{ms}"}</M>; the tip-error readouts are measured live.
      </Aside>

      <Challenge id="ch11-computed-torque" met={challengeMet}>
        Hang a payload on the tip (at least <M>{"0.1\\,\\text{kg}"}</M>) and then switch to{" "}
        <strong>computed torque</strong>. With the dynamics cancelled, the tip should hug the circle:
        get the <strong>RMS tip error under 10&nbsp;mm</strong> and the peak under 20&nbsp;mm. Notice
        PD alone cannot do this once the load and speed are large.
      </Challenge>

      <H2>Traps</H2>
      <ul>
        <li>
          <strong>Computed torque is only as good as its model.</strong> The cancellation above
          worked because every symbol matched. Get a mass wrong and the terms cancel only
          partially — the leftover acts as a disturbance the spring–damper must fight. The
          widget's controller is told the payload exactly; a real robot picking up an unknown
          object is not.
        </li>
        <li>
          <strong>Same gains ≠ same controller.</strong> The PD and CT modes in the widget share
          identical <M>{"K_p, K_d"}</M>. Every bit of the performance gap comes from the model
          terms, not from tuning.
        </li>
        <li>
          <strong>Feedforward alone drifts.</strong> Dropping the <M>{"K_p, K_d"}</M> terms and
          playing back pure model torque fails: the cancellation is never exact, and with no
          feedback the small residual errors accumulate unchecked.
        </li>
        <li>
          <strong>It costs computation.</strong> Full inverse dynamics —{" "}
          <M>{"M(\\theta),\\ C(\\theta,\\dot\\theta),\\ g(\\theta)"}</M> — must be evaluated every
          control tick, typically hundreds of times per second. That is exactly why Chapter 8's
          recursive Newton–Euler algorithm matters in practice.
        </li>
      </ul>

      <KeyIdea>
        PD control fights the robot's nonlinear dynamics; computed-torque control cancels them. By
        feeding <M>{"M(\\theta)\\ddot\\theta_d + C\\dot\\theta + g"}</M> forward, it converts a coupled
        nonlinear plant into one clean linear error equation per joint — turning sloppy tracking into
        near-perfect tracking, even under load.
      </KeyIdea>

      <Quiz
        challengeId="ch11-ct-quiz"
        goal={<>Answer all three correctly.</>}
        questions={[
          {
            prompt: (
              <>
                With a perfect model, what equation does each joint's error obey under
                computed-torque control?
              </>
            ),
            options: [
              {
                label:
                  "A linear spring–damper, θ̈e + Kd·θ̇e + Kp·θe = 0 — one per joint, the same in every posture",
                correct: true,
              },
              { label: "The full nonlinear dynamics M·θ̈e + C·θ̇e + g = 0" },
              { label: "Zero error exactly — the model makes feedback unnecessary" },
            ],
            explain:
              "That is the whole point of the cancellation: the nonlinear plant disappears from the error's point of view, leaving one decoupled, critically-tunable second-order system per joint.",
          },
          {
            prompt: (
              <>
                Why does plain PD tracking get worse as payload and speed grow, while computed
                torque barely notices?
              </>
            ),
            options: [
              { label: "PD's gains are smaller — cranking Kp high enough would match CT exactly" },
              {
                label:
                  "PD must react after inertia, Coriolis, and gravity forces (which grow with load and speed) have already caused error; CT cancels them with the model before they act",
                correct: true,
              },
              { label: "CT runs at a faster control rate than PD" },
            ],
            explain:
              "Both controllers in the widget share the same gains and the same rate. PD is purely reactive, so bigger disturbances mean bigger errors; CT pre-pays those forces via the model.",
          },
          {
            prompt: (
              <>
                The controller's model thinks the payload is 0.5&nbsp;kg but the real one is
                1&nbsp;kg. What happens?
              </>
            ),
            options: [
              { label: "The arm goes unstable almost immediately" },
              { label: "Nothing — the feedforward term doesn't depend on the payload" },
              {
                label:
                  "The cancellation is partial; the mismatch acts as a disturbance, tracking degrades gracefully, and the feedback terms still stabilize",
                correct: true,
              },
            ],
            explain:
              "Model error doesn't break the controller — it just leaves a residual force for the spring–damper feedback to fight, so performance degrades smoothly toward plain PD.",
          },
        ]}
      />

      <BookRef>Modern Robotics §11.4.2 — Computed torque (inverse-dynamics) control (Eqs. 11.35–11.37).</BookRef>
    </div>
  );
}
