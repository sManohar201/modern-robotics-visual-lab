import { useEffect, useRef, useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { SpatialArm, armState } from "../../components/three/SpatialArm";
import { type Vec3, deg } from "../../lib/math/vec";
import { pinvDamped, matVec } from "../../lib/math/linalg";
import { P3R_JOINTS, P3R_M, selfMotion3R, planarPointJac } from "./arm";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const GOLD = "#caa53d";
const ARMc = "#0b7285";
const OBST = "#d9483f";
const PATHc = "#caa53d";

function tip2(thetas: number[]): [number, number] {
  const st = armState(P3R_JOINTS, P3R_M, thetas);
  return [st.ee.p[0], st.ee.p[1]];
}
function skeleton(thetas: number[]): Vec3[] {
  const st = armState(P3R_JOINTS, P3R_M, thetas);
  return [...st.pivots, [st.ee.p[0], st.ee.p[1], st.ee.p[2]]];
}

export default function InverseVelocity() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 6"
        section="Inverse Kinematics"
        title="Inverse Velocity & Redundancy"
        lede="With more joints than the task needs, the inverse is no longer unique — there is a whole space of joint motions that produce the same tip motion. That freedom is a gift: spend it dodging obstacles, easing torque, or staying comfortable."
      />

      <p>
        To follow a desired end-effector trajectory you can skip repeated inverse kinematics and work
        at the velocity level directly:
      </p>
      <Eq>{"\\dot\\theta = J^{\\dagger}(\\theta)\\,\\mathcal V_d."}</Eq>
      <p>
        If the arm is <strong>redundant</strong> — <M>{"n>6"}</M> joints, or here three joints for a
        two-dimensional tip task — the equation <M>{"J\\dot\\theta=\\mathcal V_d"}</M> has an entire{" "}
        <M>{"(n-m)"}</M>-dimensional family of solutions. The pseudoinverse returns the smallest one,
        but you can add any motion in the null space of <M>{"J"}</M> without disturbing the tip:
      </p>
      <Eq>{"\\dot\\theta = J^{\\dagger}\\mathcal V_d + \\big(I - J^{\\dagger}J\\big)z."}</Eq>
      <p>
        The projector <M>{"(I-J^{\\dagger}J)"}</M> kills any tip motion, so the secondary term{" "}
        <M>{"z"}</M> is free to chase a second goal — minimize kinetic energy with a mass-weighted
        inverse, descend a potential <M>{"\\nabla h(\\theta)"}</M> to avoid obstacles, or keep joints
        away from their limits.
      </p>

      <H2>Self-motion: reconfigure without moving the tip</H2>
      <p>
        Hold the tip on its target and there is still one degree of freedom left: the arm can flex
        through a one-parameter family of postures, the <strong>self-motion</strong>. Use it to swing
        the body of the arm clear of the red obstacle while the tip never budges.
      </p>

      <SelfMotionWidget />

      <Aside>
        The Lagrange-multiplier solution to "minimize kinetic energy{" "}
        <M>{"\\tfrac12\\dot\\theta^{\\mathsf T}M\\dot\\theta"}</M> subject to{" "}
        <M>{"J\\dot\\theta=\\mathcal V_d"}</M>" is the mass-weighted pseudoinverse{" "}
        <M>{"\\dot\\theta = M^{-1}J^{\\mathsf T}(JM^{-1}J^{\\mathsf T})^{-1}\\mathcal V_d"}</M>, and the
        multiplier <M>{"\\lambda"}</M> is exactly a task-space wrench — the same{" "}
        <M>{"\\tau = J^{\\mathsf T}\\mathcal F"}</M> duality from the statics page.
      </Aside>

      <H2>A closed task loop need not close in joint space</H2>
      <p>
        Drive the tip around a closed loop using <M>{"\\dot\\theta=J^{\\dagger}\\mathcal V_d"}</M> and
        something surprising happens: the tip returns home, but the joints do not. Pseudoinverse
        velocity control is not conservative — each lap leaves a little residual drift in joint space.
      </p>

      <LoopWidget />

      <KeyIdea>
        Velocity-level inverse kinematics is <M>{"\\dot\\theta=J^{\\dagger}\\mathcal V_d"}</M>. A
        redundant arm adds a null-space term <M>{"(I-J^{\\dagger}J)z"}</M> that retunes the posture
        without moving the tip — for obstacle avoidance, torque minimization, or comfort. And because
        the pseudoinverse map is not conservative, a closed loop in task space generally drifts in
        joint space.
      </KeyIdea>

      <BookRef>Modern Robotics §6.3–6.4 — Inverse velocity kinematics; a note on closed loops.</BookRef>
    </div>
  );
}

/* ===================== self-motion + obstacle ===================== */

const TARGET: [number, number] = [1.6, 1.4];
const OBSTACLE: [number, number] = [1.9, 0.55];
const CLEAR = 0.35;

function SelfMotionWidget() {
  const [th1, setTh1] = useState(0.0);
  const [elbow, setElbow] = useState<1 | -1>(1);

  const sol = selfMotion3R(TARGET[0], TARGET[1], th1, elbow);
  const valid = sol !== null;
  const thetas = sol ?? [th1, 0, 0];
  const st = armState(P3R_JOINTS, P3R_M, thetas);
  const joints: Vec3[] = [st.pivots[1], st.pivots[2], [st.ee.p[0], st.ee.p[1], st.ee.p[2]]];
  const obst3: Vec3 = [OBSTACLE[0], OBSTACLE[1], 0];
  const clearance = valid
    ? Math.min(...joints.map(j => Math.hypot(j[0] - OBSTACLE[0], j[1] - OBSTACLE[1])))
    : 0;
  const tipErr = valid ? Math.hypot(tip2(thetas)[0] - TARGET[0], tip2(thetas)[1] - TARGET[1]) : 9;
  const met = valid && tipErr < 1e-3 && clearance > CLEAR;

  return (
    <>
      <WidgetShell
        title="Sweep the self-motion to clear the obstacle"
        onReset={() => { setTh1(0); setElbow(1); }}
        caption={
          <>
            The gold dot is the fixed tip target; the red dot is an obstacle. The base-angle slider
            walks the arm along its self-motion — every posture keeps the tip exactly on target, yet
            the elbow swings through a wide arc. Find a posture that gives the arm room around the
            obstacle.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={380} camera={[1.4, 5.0, 3.6]}>
              <Triad ghost colors={GHOST} scale={0.5} />
              <mesh position={[TARGET[0], TARGET[1], 0]}><sphereGeometry args={[0.08, 18, 18]} /><meshStandardMaterial color={GOLD} /></mesh>
              <mesh position={obst3}><sphereGeometry args={[0.16, 20, 20]} /><meshStandardMaterial color={OBST} transparent opacity={0.55} /></mesh>
              {valid && <SpatialArm joints={P3R_JOINTS} M={P3R_M} thetas={thetas} eeTriadScale={0} linkColors={[ARMc, ARMc, ARMc]} />}
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2 md:w-[230px]">
            <Readout label="tip error" value={valid ? tipErr.toFixed(3) : "—"} color="var(--good)" />
            <Readout label="obstacle clearance" value={valid ? clearance.toFixed(2) : "infeasible"} color={clearance > CLEAR ? "var(--good)" : OBST} />
            <div className="flex gap-2 mt-1">
              <WidgetButton onClick={() => setElbow(1)} active={elbow === 1}>elbow +</WidgetButton>
              <WidgetButton onClick={() => setElbow(-1)} active={elbow === -1}>elbow −</WidgetButton>
            </div>
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="θ₁ (self-motion)" value={th1} min={-0.6} max={1.6} onChange={setTh1} fmt={v => `${deg(v).toFixed(0)}°`} width={220} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch6-redundancy-dodge" met={met}>
        Keep the tip glued to its target (the slider guarantees it) and use the leftover freedom to
        back the arm away from the obstacle: raise the clearance above {CLEAR}. This is the null space
        doing useful work — a secondary objective served at zero cost to the primary task.
      </Challenge>
    </>
  );
}

/* ===================== closed-loop drift ===================== */

const START_THETA = [0.5, 0.6, 0.4];
const RADIUS = 0.45;
const TIP0 = tip2(START_THETA);
const CENTER: [number, number] = [TIP0[0] - RADIUS, TIP0[1]];
const OMEGA = 0.9; // rad/s around the loop
const LAM = 0.03, KP = 2.0;

function LoopWidget() {
  const [thetas, setThetas] = useState<number[]>(START_THETA);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState(0);
  const total = useRef(0);
  const start = useRef<number[]>(START_THETA);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      total.current += OMEGA * dt;
      setLaps(Math.floor(total.current / (2 * Math.PI)));
      const a = total.current;
      const desired: [number, number] = [CENTER[0] + RADIUS * Math.cos(a), CENTER[1] + RADIUS * Math.sin(a)];
      setThetas(prev => {
        const ee = tip2(prev);
        const Vd = [
          -Math.sin(a) * RADIUS * OMEGA + KP * (desired[0] - ee[0]),
          Math.cos(a) * RADIUS * OMEGA + KP * (desired[1] - ee[1]),
        ];
        const J = planarPointJac(P3R_JOINTS, P3R_M, prev);
        const dq = matVec(pinvDamped(J, LAM), Vd);
        return prev.map((t, i) => t + dq[i] * dt);
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const drift = thetas.map((t, i) => deg(t - start.current[i]));
  const driftNorm = Math.hypot(...drift);

  const reset = () => {
    setRunning(false); total.current = 0; setLaps(0);
    setThetas(START_THETA); start.current = START_THETA;
  };

  return (
    <WidgetShell
      title="Tip returns, joints drift"
      onReset={reset}
      caption={
        <>
          The tip runs the gold circle; the faint arm is the starting posture. After each lap the tip
          comes back exactly, but the joint angles have crept — the running drift is shown at right.
          Pure pseudoinverse velocity control does not return the arm to where it began.
        </>
      }
    >
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1 min-w-0">
          <Scene3D height={380} camera={[1.4, 5.0, 3.6]}>
            <Triad ghost colors={GHOST} scale={0.5} />
            <Line points={Array.from({ length: 65 }, (_, i) => { const a = (2 * Math.PI * i) / 64; return [CENTER[0] + RADIUS * Math.cos(a), CENTER[1] + RADIUS * Math.sin(a), 0] as Vec3; })} color={PATHc} lineWidth={1.8} />
            <Line points={skeleton(start.current)} color="#b8b3a6" lineWidth={2} transparent opacity={0.45} />
            <SpatialArm joints={P3R_JOINTS} M={P3R_M} thetas={thetas} eeTriadScale={0} linkColors={[ARMc, ARMc, ARMc]} />
          </Scene3D>
        </div>
        <div className="ui flex flex-col justify-center gap-2 md:w-[230px]">
          <Readout label="laps" value={String(laps)} />
          <Readout label="Δθ₁" value={`${drift[0].toFixed(1)}°`} />
          <Readout label="Δθ₂" value={`${drift[1].toFixed(1)}°`} />
          <Readout label="Δθ₃" value={`${drift[2].toFixed(1)}°`} />
          <Readout label="‖Δθ‖" value={`${driftNorm.toFixed(1)}°`} color={driftNorm > 1 ? OBST : "var(--good)"} />
          <div className="mt-1">
            <WidgetButton onClick={() => setRunning(r => !r)} active={running}>{running ? "pause" : "run"}</WidgetButton>
          </div>
        </div>
      </div>

      <Quiz
        challengeId="ch6-loop-quiz"
        goal={<>Read off the closed-loop lesson.</>}
        questions={[
          {
            prompt: <>After the tip completes a closed loop under <M>{"\\dot\\theta=J^{\\dagger}\\mathcal V_d"}</M>, the joint configuration…</>,
            options: [
              { label: "generally differs from the start (joint-space drift)", correct: true },
              { label: "always returns exactly to the start" },
              { label: "diverges to infinity" },
            ],
            explain: <>The pseudoinverse velocity map is not conservative, so a closed task loop need not close in joint space — extra conditions are needed for cyclic motion.</>,
          },
          {
            prompt: <>The null-space term <M>{"(I-J^{\\dagger}J)z"}</M> changes…</>,
            options: [
              { label: "the posture, with no effect on tip velocity", correct: true },
              { label: "the tip velocity, with no effect on posture" },
              { label: "neither" },
            ],
            explain: <>It lies in the null space of <M>{"J"}</M>, so <M>{"J(I-J^{\\dagger}J)z=0"}</M> — pure self-motion.</>,
          },
        ]}
      />
    </WidgetShell>
  );
}
