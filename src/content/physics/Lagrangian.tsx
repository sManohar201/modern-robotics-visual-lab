import { useState, useRef, useEffect } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";
import { clamp } from "../../lib/math/vec";

const W = 760;
const H = 360;
const RED = "#d9483f";
const GREEN = "#2f9e44";
const BLUE = "#3b6fd4";
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";
const GOLD = "#caa53d";
const G = 9.81;

// ------------------------------------------------------------------
// Double pendulum — chaotic Lagrangian system
// ------------------------------------------------------------------
function DoublePendulum() {
  const [L1, setL1] = useState(1.0);
  const [L2, setL2] = useState(0.8);
  const [m1, setM1] = useState(1.0);
  const [m2, setM2] = useState(0.8);
  const [th1_0, setTh1_0] = useState(1.2);
  const [th2_0, setTh2_0] = useState(2.0);
  const [running, setRunning] = useState(false);
  const stateRef = useRef({ th1: 1.2, th2: 2.0, w1: 0, w2: 0 });
  const traceRef = useRef<[number, number][]>([]);
  const rafRef = useRef<number>(0);
  const [snap, setSnap] = useState({ th1: 1.2, th2: 2.0, w1: 0, w2: 0 });

  function reset() {
    setRunning(false);
    stateRef.current = { th1: th1_0, th2: th2_0, w1: 0, w2: 0 };
    traceRef.current = [];
    setSnap({ th1: th1_0, th2: th2_0, w1: 0, w2: 0 });
  }

  useEffect(() => { reset(); }, [th1_0, th2_0, L1, L2, m1, m2]);

  useEffect(() => {
    if (!running) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();

    // Lagrangian equations of motion for double pendulum
    // Uses the standard form derived from Lagrangian mechanics
    function derivs(th1: number, th2: number, w1: number, w2: number): [number, number, number, number] {
      const dth = th1 - th2;
      const denom1 = (m1 + m2) * L1 - m2 * L1 * Math.cos(dth) * Math.cos(dth);
      const denom2 = (L2 / L1) * denom1;

      const alpha1 = (m2 * L1 * w1 * w1 * Math.sin(dth) * Math.cos(dth)
        + m2 * G * Math.sin(th2) * Math.cos(dth)
        + m2 * L2 * w2 * w2 * Math.sin(dth)
        - (m1 + m2) * G * Math.sin(th1)) / denom1;

      const alpha2 = (-m2 * L2 * w2 * w2 * Math.sin(dth) * Math.cos(dth)
        + (m1 + m2) * G * Math.sin(th1) * Math.cos(dth)
        - (m1 + m2) * L1 * w1 * w1 * Math.sin(dth)
        - (m1 + m2) * G * Math.sin(th2)) / denom2;

      return [w1, w2, alpha1, alpha2];
    }

    function step(now: number) {
      const dt = Math.min((now - last) / 1000, 0.02);
      last = now;
      const s = stateRef.current;

      // RK4 for 4-dimensional system
      const [k1_th1, k1_th2, k1_w1, k1_w2] = derivs(s.th1, s.th2, s.w1, s.w2);
      const [k2_th1, k2_th2, k2_w1, k2_w2] = derivs(
        s.th1 + 0.5 * dt * k1_th1, s.th2 + 0.5 * dt * k1_th2,
        s.w1 + 0.5 * dt * k1_w1, s.w2 + 0.5 * dt * k1_w2
      );
      const [k3_th1, k3_th2, k3_w1, k3_w2] = derivs(
        s.th1 + 0.5 * dt * k2_th1, s.th2 + 0.5 * dt * k2_th2,
        s.w1 + 0.5 * dt * k2_w1, s.w2 + 0.5 * dt * k2_w2
      );
      const [k4_th1, k4_th2, k4_w1, k4_w2] = derivs(
        s.th1 + dt * k3_th1, s.th2 + dt * k3_th2,
        s.w1 + dt * k3_w1, s.w2 + dt * k3_w2
      );

      s.th1 += (dt / 6) * (k1_th1 + 2 * k2_th1 + 2 * k3_th1 + k4_th1);
      s.th2 += (dt / 6) * (k1_th2 + 2 * k2_th2 + 2 * k3_th2 + k4_th2);
      s.w1 += (dt / 6) * (k1_w1 + 2 * k2_w1 + 2 * k3_w1 + k4_w1);
      s.w2 += (dt / 6) * (k1_w2 + 2 * k2_w2 + 2 * k3_w2 + k4_w2);

      const scl = 100;
      const piv: [number, number] = [220, 80];
      const x1 = piv[0] + L1 * scl * Math.sin(s.th1);
      const y1 = piv[1] + L1 * scl * Math.cos(s.th1);
      const x2 = x1 + L2 * scl * Math.sin(s.th2);
      const y2 = y1 + L2 * scl * Math.cos(s.th2);

      traceRef.current.push([x2, y2]);
      if (traceRef.current.length > 1200) traceRef.current.shift();
      setSnap({ th1: s.th1, th2: s.th2, w1: s.w1, w2: s.w2 });
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, L1, L2, m1, m2]);

  const scl = 100;
  const piv: [number, number] = [220, 80];
  const th1 = snap.th1, th2 = snap.th2;
  const x1 = piv[0] + L1 * scl * Math.sin(th1);
  const y1 = piv[1] + L1 * scl * Math.cos(th1);
  const x2 = x1 + L2 * scl * Math.sin(th2);
  const y2 = y1 + L2 * scl * Math.cos(th2);

  const trace = traceRef.current;
  const tracePath = trace.length > 2
    ? trace.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")
    : "";

  // Energy
  const T = 0.5 * m1 * (L1 * snap.w1) ** 2
    + 0.5 * m2 * ((L1 * snap.w1 * Math.cos(th1) + L2 * snap.w2 * Math.cos(th2)) ** 2
    + (L1 * snap.w1 * Math.sin(th1) + L2 * snap.w2 * Math.sin(th2)) ** 2);
  const V = -m1 * G * L1 * Math.cos(th1) - m2 * G * (L1 * Math.cos(th1) + L2 * Math.cos(th2));

  const chaosMet = trace.length > 600 && running;

  // Phase portrait for θ₁ (right panel)
  const ppX0 = 430, ppY0 = 20, ppW = 300, ppH = 310;

  return (
    <>
      <WidgetShell
        title="Double pendulum — Lagrangian chaos"
        onReset={reset}
        caption="The Euler-Lagrange equations are derived from L = T − V. Left: pendulum. Right: tip trace (chaotic orbit)."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* trace */}
          {tracePath && (
            <path d={tracePath} fill="none" stroke={PURPLE} strokeWidth={1.5} opacity={0.5} strokeLinecap="round" />
          )}

          {/* links */}
          <line x1={piv[0]} y1={piv[1]} x2={x1} y2={y1} stroke={BLUE} strokeWidth={5} strokeLinecap="round" />
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ORANGE} strokeWidth={4.5} strokeLinecap="round" />

          {/* pivot */}
          <circle cx={piv[0]} cy={piv[1]} r={7} fill="#50525e" stroke="#fff" strokeWidth={2} />
          {/* joint */}
          <circle cx={x1} cy={y1} r={10} fill={BLUE} stroke="#fff" strokeWidth={2} />
          {/* tip */}
          <circle cx={x2} cy={y2} r={13} fill={ORANGE} stroke="#fff" strokeWidth={2.5} />

          {/* labels */}
          <text x={piv[0] + 10} y={piv[1] - 8} fontFamily="Inter, sans-serif" fontSize="11" fill="#50525e">pivot</text>
          <text x={x1 + 12} y={y1 - 6} fontFamily="Inter, sans-serif" fontSize="11" fill={BLUE}>m₁={m1}</text>
          <text x={x2 + 14} y={y2} fontFamily="Inter, sans-serif" fontSize="11" fill={ORANGE}>m₂={m2}</text>

          {/* energy readout */}
          <rect x={16} y={16} width={195} height={72} rx={8} fill="#f4f1fb" stroke="#c4b8ef" />
          <text x={26} y={36} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            T = {T.toFixed(3)} J
          </text>
          <text x={26} y={54} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            V = {V.toFixed(3)} J
          </text>
          <text x={26} y={72} fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700" fill={PURPLE}>
            E = {(T + V).toFixed(3)} J
          </text>

          {/* trace length */}
          <text x={W - 16} y={H - 16} textAnchor="end" fontFamily="Inter, sans-serif"
            fontSize="11" fill="#8a8a9b">
            trace: {trace.length} pts
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="L₁" value={L1} min={0.3} max={1.5} step={0.05} onChange={setL1}
            fmt={v => `${v.toFixed(2)} m`} color={BLUE} />
          <LabeledSlider label="L₂" value={L2} min={0.3} max={1.5} step={0.05} onChange={setL2}
            fmt={v => `${v.toFixed(2)} m`} color={ORANGE} />
          <LabeledSlider label="m₁" value={m1} min={0.1} max={3} step={0.05} onChange={setM1}
            fmt={v => `${v.toFixed(2)} kg`} color={BLUE} />
          <LabeledSlider label="m₂" value={m2} min={0.1} max={3} step={0.05} onChange={setM2}
            fmt={v => `${v.toFixed(2)} kg`} color={ORANGE} />
          <LabeledSlider label="θ₁₀" value={th1_0} min={0.1} max={3.0} step={0.05} onChange={setTh1_0}
            fmt={v => `${(v * 180 / Math.PI).toFixed(0)}°`} />
          <LabeledSlider label="θ₂₀" value={th2_0} min={0.1} max={3.0} step={0.05} onChange={setTh2_0}
            fmt={v => `${(v * 180 / Math.PI).toFixed(0)}°`} />
          <WidgetButton onClick={() => setRunning(r => !r)} active={running}>
            {running ? "Pause" : "Play"}
          </WidgetButton>
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys8-double-chaos" met={chaosMet}>
        Let the double pendulum run long enough to trace at least 600 points. Set large initial
        angles (above 90°) to see the chaotic, space-filling trajectory that is the hallmark
        of deterministic chaos.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Newton vs Lagrange — simple pendulum
// ------------------------------------------------------------------
function NewtonVsLagrange() {
  const [L, setL] = useState(1.2);
  const [th, setTh] = useState(35);

  const thR = th * Math.PI / 180;
  const Wt = 1 * G;
  const WL = Wt * Math.sin(thR); // along rod
  const WN = Wt * Math.cos(thR); // normal to rod (centripetal)
  const alpha_N = -G / L * Math.sin(thR);
  const alpha_L = -(G / L) * Math.sin(thR); // same result

  const pivX = W / 2, pivY = 60;
  const rodLen = L * 140;
  const bobX = pivX + rodLen * Math.sin(thR);
  const bobY = pivY + rodLen * Math.cos(thR);

  return (
    <>
      <WidgetShell
        title="Newton vs. Lagrange — simple pendulum"
        onReset={() => { setL(1.2); setTh(35); }}
        caption="Both methods give the same equation of motion. Lagrange avoids constraint forces by choosing generalized coordinates."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* pivot */}
          <circle cx={pivX} cy={pivY} r={7} fill="#50525e" />
          {/* rod */}
          <line x1={pivX} y1={pivY} x2={bobX} y2={bobY} stroke="#50525e" strokeWidth={4} strokeLinecap="round" />
          {/* bob */}
          <circle cx={bobX} cy={bobY} r={20} fill={PURPLE} opacity={0.8} stroke="#fff" strokeWidth={2.5} />
          <text x={bobX} y={bobY + 5} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="12" fill="#fff">m</text>

          {/* weight */}
          <defs>
            <marker id="nvl-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={RED} />
            </marker>
            <marker id="nvl-t" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={BLUE} />
            </marker>
            <marker id="nvl-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={ORANGE} />
            </marker>
          </defs>
          <line x1={bobX} y1={bobY} x2={bobX} y2={bobY + Wt * 16}
            stroke={RED} strokeWidth={4} markerEnd="url(#nvl-w)" />
          <text x={bobX + 8} y={bobY + 50} fontFamily="Inter, sans-serif" fontSize="12" fill={RED}>mg</text>

          {/* tangential component */}
          <line x1={bobX} y1={bobY}
            x2={bobX + WL * 16 * Math.cos(thR)} y2={bobY + WL * 16 * Math.sin(thR)}
            stroke={ORANGE} strokeWidth={3} markerEnd="url(#nvl-a)" />
          <text x={bobX + WL * 8 * Math.cos(thR) + 10} y={bobY + WL * 8 * Math.sin(thR)}
            fontFamily="Inter, sans-serif" fontSize="11.5" fill={ORANGE}>mg sinθ → α</text>

          {/* Lagrangian panel */}
          <rect x={W - 305} y={20} width={285} height={H - 40} rx={10} fill="#faf8f2" stroke="#e4e1d8" />
          <text x={W - 293} y={46} fontFamily="Inter, sans-serif" fontSize="11.5" fontWeight="700"
            letterSpacing="1.2" fill="#8a8a9b">LAGRANGE METHOD</text>
          <text x={W - 293} y={68} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            q = θ  (generalized coordinate)
          </text>
          <text x={W - 293} y={90} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            T = ½mL²θ̇²
          </text>
          <text x={W - 293} y={112} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            V = −mgL cosθ
          </text>
          <text x={W - 293} y={134} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            L = T − V
          </text>
          <line x1={W - 293} y1={148} x2={W - 28} y2={148} stroke="#e4e1d8" />
          <text x={W - 293} y={168} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            d/dt(∂L/∂θ̇) − ∂L/∂θ = 0
          </text>
          <text x={W - 293} y={190} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            mL²θ̈ + mgL sinθ = 0
          </text>
          <text x={W - 293} y={214} fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill={PURPLE}>
            ⟹  θ̈ = −(g/L) sinθ
          </text>
          <line x1={W - 293} y1={228} x2={W - 28} y2={228} stroke="#e4e1d8" />
          <text x={W - 293} y={248} fontFamily="Inter, sans-serif" fontSize="11.5" fontWeight="700"
            letterSpacing="1.2" fill="#8a8a9b">CURRENT VALUES</text>
          <text x={W - 293} y={270} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            θ = {th.toFixed(1)}°
          </text>
          <text x={W - 293} y={290} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            θ̈ = {alpha_L.toFixed(4)} rad/s²
          </text>
          <text x={W - 293} y={310} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            L = {L.toFixed(2)} m
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="L" value={L} min={0.3} max={2.5} step={0.05} onChange={setL}
            fmt={v => `${v.toFixed(2)} m`} />
          <LabeledSlider label="θ" value={th} min={0} max={170} step={1} onChange={setTh}
            fmt={v => `${v.toFixed(0)}°`} color={PURPLE} />
          <Readout label="θ̈" value={`${alpha_L.toFixed(4)} rad/s²`} color={ORANGE} />
          <Readout label="T" value={`${(2 * Math.PI * Math.sqrt(L / G)).toFixed(3)} s`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
    </>
  );
}

export default function Lagrangian() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 8"
        section="College Physics & Dynamics"
        title="Lagrangian and Analytical Mechanics"
        lede="The Lagrangian formulation replaces force vectors with scalar energy functions. Choose any coordinates that describe the configuration, write T − V, and the equations of motion follow automatically."
      />

      <p>
        The <strong>Euler-Lagrange equation</strong> gives the equations of motion from the
        Lagrangian <M>{"\\mathcal{L} = T - V"}</M>:
      </p>
      <Eq>{"\\frac{d}{dt}\\frac{\\partial \\mathcal{L}}{\\partial \\dot q_i} - \\frac{\\partial \\mathcal{L}}{\\partial q_i} = \\tau_i."}</Eq>
      <p>
        The <M>{"q_i"}</M> are <em>generalized coordinates</em> — any set of independent
        variables that fully specifies the configuration. For a pendulum, the angle <M>{"\\theta"}</M>
        is a natural choice; no constraint forces appear because they were already absorbed
        into the coordinate choice.
      </p>

      <NewtonVsLagrange />

      <H2>Double pendulum — deterministic chaos</H2>
      <p>
        The double pendulum has two generalized coordinates <M>{"(\\theta_1, \\theta_2)"}</M>.
        Its Lagrangian is:
      </p>
      <Eq>{"\\mathcal{L} = \\tfrac{1}{2}(m_1+m_2)L_1^2\\dot\\theta_1^2 + \\tfrac{1}{2}m_2 L_2^2 \\dot\\theta_2^2 + m_2 L_1 L_2 \\dot\\theta_1 \\dot\\theta_2 \\cos(\\theta_1-\\theta_2) + \\text{const}\\cdot\\cos\\theta_1 + m_2 g L_2\\cos\\theta_2."}</Eq>
      <p>
        Applying the Euler-Lagrange equations gives two coupled nonlinear ODEs — no analytic
        solution exists. The system is <em>deterministic but chaotic</em>: nearly identical
        initial conditions lead to wildly different trajectories after a few swings.
      </p>

      <DoublePendulum />

      <KeyIdea>
        The Lagrangian approach scales directly to robot dynamics. The mass matrix{" "}
        <M>{"M(\\theta)"}</M>, Coriolis matrix <M>{"C(\\theta, \\dot\\theta)"}</M>, and
        gravity vector <M>{"g(\\theta)"}</M> are all derived from the robot's Lagrangian.
        The equation of motion is <M>{"M\\ddot\\theta + C\\dot\\theta + g = \\tau"}</M>.
      </KeyIdea>

      <Aside>
        Chaos in mechanical systems has robotics implications. Flexible manipulators, legged
        robots, and underactuated systems can all exhibit sensitive dependence on initial
        conditions. Model-based control works best far from such regimes.
      </Aside>

      <BookRef>
        Dynamics track: generalized coordinates, kinetic and potential energy, Euler-Lagrange
        equations, constraints, double pendulum, mass matrix.
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
