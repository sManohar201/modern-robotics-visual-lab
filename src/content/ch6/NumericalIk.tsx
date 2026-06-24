import { useMemo, useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad, PosedGroup } from "../../components/three/Scene3D";
import { SpatialArm, armState } from "../../components/three/SpatialArm";
import { type Vec3, deg, rad, wrapAngle } from "../../lib/math/vec";
import { adjointApply } from "../../lib/math/se3";
import { P3R_JOINTS, P3R_M, P3R_B, nrBodyStep } from "./arm";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const GOLD = "#caa53d";
const CUR = "#6741d9";
const SCREW = "#c2571c";
const TOLw = 1e-3, TOLv = 1e-4;

// Goal pose: planar 3R at (20°, 40°, −30°). Elbow-down is the rival solution.
const GOAL_THETA: [number, number, number] = [rad(20), rad(40), rad(-30)];
const GOAL = armState(P3R_JOINTS, P3R_M, GOAL_THETA).ee;
const GOAL_EE: Vec3 = [GOAL.p[0], GOAL.p[1], GOAL.p[2]];

function eeOf(thetas: number[]): Vec3 {
  const st = armState(P3R_JOINTS, P3R_M, thetas);
  return [st.ee.p[0], st.ee.p[1], st.ee.p[2]];
}
function skeleton(thetas: number[]): Vec3[] {
  const st = armState(P3R_JOINTS, P3R_M, thetas);
  return [...st.pivots, [st.ee.p[0], st.ee.p[1], st.ee.p[2]]];
}

export default function NumericalIk() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 6"
        section="Inverse Kinematics"
        title="Numerical IK: Newton–Raphson"
        lede="No closed form? Linearize. The Jacobian says which way the tip moves for a small joint change, so invert that locally, step, and repeat. A few iterations carry almost any nearby guess onto the solution."
      />

      <p>
        Most arms have no tidy analytic inverse. The workhorse is <strong>Newton–Raphson</strong>
        root-finding applied to <M>{"g(\\theta) = x_d - f(\\theta) = 0"}</M>. Linearize the forward
        kinematics about the current guess and solve the linear system for the correction:
      </p>
      <Eq>{"J(\\theta^i)\\,\\Delta\\theta = x_d - f(\\theta^i), \\qquad \\theta^{i+1} = \\theta^i + J^{\\dagger}(\\theta^i)\\,(x_d - f(\\theta^i))."}</Eq>
      <p>
        For a desired configuration <M>{"T_{sd}\\in SE(3)"}</M> the error is not a coordinate
        difference but a <strong>body twist</strong>: the constant-velocity screw that would carry the
        current frame to the goal in unit time. Compute it with the matrix log, then correct with the
        body Jacobian:
      </p>
      <Eq>{"[\\mathcal V_b] = \\log\\!\\big(T_{sb}^{-1}(\\theta^i)\\,T_{sd}\\big), \\qquad \\theta^{i+1} = \\theta^i + J_b^{\\dagger}(\\theta^i)\\,\\mathcal V_b."}</Eq>

      <H2>Step it yourself</H2>
      <p>
        Set an initial guess, then press <em>step</em> to run one iteration at a time. The orange
        marker is the screw axis of the current error twist — the pole the tip rotates about on its
        way to the goal — and the readouts are the rotational and translational error magnitudes{" "}
        <M>{"\\lVert\\omega_b\\rVert"}</M> and <M>{"\\lVert v_b\\rVert"}</M>, which should plunge toward
        zero in a handful of steps.
      </p>

      <NewtonWidget />

      <Aside>
        If <M>{"J"}</M> is not square or not invertible, the Moore–Penrose pseudoinverse{" "}
        <M>{"J^{\\dagger}"}</M> stands in: for a "fat" Jacobian it returns the smallest{" "}
        <M>{"\\Delta\\theta"}</M> that solves the linear step exactly; for a "tall" one, the{" "}
        <M>{"\\Delta\\theta"}</M> that comes closest in the least-squares sense. More on that, and on
        damping near singularities, on the next page.
      </Aside>

      <H2>Basins of attraction</H2>
      <p>
        Newton–Raphson converges to whichever solution is "closest" to the guess — each solution owns
        a <strong>basin of attraction</strong>. This full-pose goal has two solutions, elbow-up and
        elbow-down. Start with the elbow already bent the right way and you land in that basin; start
        on the wrong side and the iteration walks to the other solution. A guess near a singularity
        (the plateau of <M>{"x_d-f(\\theta)"}</M>) can overshoot or fail to converge at all.
      </p>

      <KeyIdea>
        Numerical IK = repeatedly linearize and step: <M>{"\\theta^{i+1}=\\theta^i+J_b^{\\dagger}(\\theta^i)\\mathcal V_b"}</M>,
        with <M>{"\\mathcal V_b"}</M> the matrix-log twist from the current pose to the goal. It
        converges quickly from a good guess and finds the solution in whose basin of attraction the
        guess lies.
      </KeyIdea>

      <BookRef>Modern Robotics §6.2 — Numerical Inverse Kinematics (Newton–Raphson).</BookRef>
    </div>
  );
}

function NewtonWidget() {
  const [g1, setG1] = useState(rad(0));
  const [g2, setG2] = useState(rad(30));
  const [g3, setG3] = useState(rad(0));
  const [iters, setIters] = useState<number[][]>([[rad(0), rad(30), rad(0)]]);

  // when the guess sliders move, restart the iteration from the new guess
  const setGuess = (which: 0 | 1 | 2, v: number) => {
    const g: [number, number, number] = [g1, g2, g3];
    g[which] = v;
    [setG1, setG2, setG3][which](v);
    setIters([[g[0], g[1], g[2]]]);
  };

  const cur = iters[iters.length - 1];
  const step = useMemo(() => nrBodyStep(P3R_B, P3R_M, cur, GOAL), [cur]);
  const converged = step.wErr < TOLw && step.vErr < TOLv;
  const elbowDown = wrapAngle(cur[1]) < -0.05;
  const met = converged && elbowDown;

  // screw-axis pole of the current error twist (in the space frame)
  const Vs = adjointApply(step.Tsb, step.Vb);
  const wz = Vs[2];
  const pole: Vec3 | null = Math.abs(wz) > 0.05 ? [-Vs[4] / wz, Vs[3] / wz, 0] : null;

  const rows = iters.map(th => {
    const s = nrBodyStep(P3R_B, P3R_M, th, GOAL);
    return { th, w: s.wErr, v: s.vErr };
  });

  const doStep = () => { if (!converged) setIters(prev => [...prev, step.next]); };
  const runAll = () => {
    let th = cur, hist = [...iters];
    for (let k = 0; k < 30; k++) {
      const s = nrBodyStep(P3R_B, P3R_M, th, GOAL);
      if (s.wErr < TOLw && s.vErr < TOLv) break;
      th = s.next; hist = [...hist, th];
    }
    setIters(hist);
  };

  return (
    <>
      <WidgetShell
        title="Newton–Raphson, one iteration at a time"
        onReset={() => { setG1(rad(0)); setG2(rad(30)); setG3(rad(0)); setIters([[rad(0), rad(30), rad(0)]]); }}
        caption={
          <>
            The purple arm is the current iterate; the faint arm and gold triad are the goal pose. The
            orange dot/line is the screw axis the tip is rotating about to reach the goal. Press{" "}
            <em>step</em> to apply one correction <M>{"J_b^{\\dagger}\\mathcal V_b"}</M>; the error
            magnitudes collapse in a few steps.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={380} camera={[1.4, 5.0, 3.6]}>
              <Triad ghost colors={GHOST} scale={0.5} />
              {/* goal */}
              <Line points={skeleton(GOAL_THETA)} color="#b8b3a6" lineWidth={2} transparent opacity={0.5} />
              <PosedGroup R={GOAL.R} p={GOAL_EE}><Triad scale={0.4} thickness={0.02} ghost colors={[GOLD, GOLD, GOLD]} /></PosedGroup>
              {/* current iterate */}
              <SpatialArm joints={P3R_JOINTS} M={P3R_M} thetas={cur} eeTriadScale={0.34} linkColors={[CUR, CUR, CUR]} />
              {/* error screw axis (pole) */}
              {pole && !converged && (
                <>
                  <Line points={[[pole[0], pole[1], -0.4], [pole[0], pole[1], 0.4]]} color={SCREW} lineWidth={2.5} />
                  <mesh position={pole}><sphereGeometry args={[0.06, 14, 14]} /><meshStandardMaterial color={SCREW} /></mesh>
                  <Line points={[eeOf(cur), GOAL_EE]} color={SCREW} lineWidth={1.5} dashed dashSize={0.06} gapSize={0.05} />
                </>
              )}
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2 md:w-[250px]">
            <Readout label="iteration" value={String(iters.length - 1)} />
            <Readout label="‖ω_b‖" value={step.wErr.toFixed(4)} color={step.wErr < TOLw ? "var(--good)" : undefined} />
            <Readout label="‖v_b‖" value={step.vErr.toFixed(4)} color={step.vErr < TOLv ? "var(--good)" : undefined} />
            <Readout label="status" value={converged ? "converged" : "iterating"} color={converged ? "var(--good)" : undefined} />
            <Readout label="elbow" value={elbowDown ? "down" : "up"} color={elbowDown ? CUR : undefined} />
            <div className="flex gap-2 mt-1">
              <WidgetButton onClick={doStep} disabled={converged}>step</WidgetButton>
              <WidgetButton onClick={runAll} disabled={converged}>run</WidgetButton>
            </div>
          </div>
        </div>

        {/* iteration table */}
        <div className="ui mt-3 overflow-x-auto">
          <table className="mono text-[11.5px] w-full">
            <thead className="text-[var(--ink-faint)]">
              <tr className="text-right"><th className="text-left pr-3">i</th><th className="px-2">θ₁</th><th className="px-2">θ₂</th><th className="px-2">θ₃</th><th className="px-2">‖ω_b‖</th><th className="px-2">‖v_b‖</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="text-right border-t border-[var(--rule)]">
                  <td className="text-left pr-3">{i}</td>
                  <td className="px-2">{deg(r.th[0]).toFixed(1)}°</td>
                  <td className="px-2">{deg(r.th[1]).toFixed(1)}°</td>
                  <td className="px-2">{deg(r.th[2]).toFixed(1)}°</td>
                  <td className="px-2">{r.w.toFixed(4)}</td>
                  <td className="px-2">{r.v.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ControlBar>
          <LabeledSlider label="θ₁⁰" value={g1} min={rad(-180)} max={rad(180)} onChange={v => setGuess(0, v)} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
          <LabeledSlider label="θ₂⁰" value={g2} min={rad(-180)} max={rad(180)} onChange={v => setGuess(1, v)} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
          <LabeledSlider label="θ₃⁰" value={g3} min={rad(-180)} max={rad(180)} onChange={v => setGuess(2, v)} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch6-nr-elbow-down" met={met}>
        Land in the <em>elbow-down</em> basin. The goal pose has two solutions; the default guess
        converges elbow-up. Bend the initial guess the other way (try{" "}
        <M>{"\\theta_2^0 < 0"}</M>), then <em>run</em> — when the iteration settles with{" "}
        <M>{"\\theta_2 < 0"}</M> and the error magnitudes hit zero, you have found the other root.
      </Challenge>
    </>
  );
}
