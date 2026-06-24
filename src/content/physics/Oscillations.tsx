import { useState, useRef, useEffect, useMemo } from "react";
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

// ------------------------------------------------------------------
// Spring-mass oscillator with RK4 + x(t) plot
// ------------------------------------------------------------------
function SpringOscillator() {
  const [k, setK] = useState(30);
  const [mass, setMass] = useState(1.5);
  const [b, setB] = useState(0.5);
  const [running, setRunning] = useState(false);
  const stateRef = useRef({ x: 1.2, v: 0, t: 0 });
  const histRef = useRef<{ t: number; x: number }[]>([]);
  const rafRef = useRef<number>(0);
  const [snap, setSnap] = useState({ x: 1.2, v: 0, t: 0 });

  const omega0 = Math.sqrt(k / mass);
  const period = 2 * Math.PI / omega0;
  const zeta = b / (2 * Math.sqrt(k * mass));

  function reset() {
    setRunning(false);
    stateRef.current = { x: 1.2, v: 0, t: 0 };
    histRef.current = [];
    setSnap({ x: 1.2, v: 0, t: 0 });
  }

  useEffect(() => { reset(); }, [k, mass, b]);

  useEffect(() => {
    if (!running) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    function step(now: number) {
      const dt = Math.min((now - last) / 1000, 0.025);
      last = now;
      const s = stateRef.current;
      // RK4 for x'' = -(k/m)x - (b/m)x'
      const f = (x: number, v: number) => -(k / mass) * x - (b / mass) * v;
      const k1x = s.v, k1v = f(s.x, s.v);
      const k2x = s.v + 0.5 * dt * k1v, k2v = f(s.x + 0.5 * dt * k1x, s.v + 0.5 * dt * k1v);
      const k3x = s.v + 0.5 * dt * k2v, k3v = f(s.x + 0.5 * dt * k2x, s.v + 0.5 * dt * k2v);
      const k4x = s.v + dt * k3v, k4v = f(s.x + dt * k3x, s.v + dt * k3v);
      s.x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
      s.v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
      s.t += dt;
      histRef.current.push({ t: s.t, x: s.x });
      if (histRef.current.length > 400) histRef.current.shift();
      setSnap({ ...s });
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, k, mass, b]);

  const x = snap.x;
  const v = snap.v;

  // SVG layout: left = spring animation, right = x(t) plot
  const springX = 260;
  const massX = springX + x * 90;
  const wallX = 60;

  const plotX0 = 430;
  const plotY0 = 30;
  const plotW = 290;
  const plotH = 280;
  const tWindow = Math.max(period * 4, 4);
  const hist = histRef.current;
  const tNow = snap.t;

  const plotPath = hist.length > 1
    ? hist.map((p, i) => {
        const px = plotX0 + ((p.t - (tNow - tWindow)) / tWindow) * plotW;
        const py = plotY0 + plotH / 2 - p.x * (plotH / 2.8);
        return `${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${clamp(py, plotY0, plotY0 + plotH).toFixed(1)}`;
      }).join(" ")
    : "";

  const underdampedMet = zeta < 1 && zeta > 0.05 && running;
  const resonanceMet = Math.abs(zeta - 1) < 0.05;

  return (
    <>
      <WidgetShell
        title="Damped spring-mass oscillator"
        onReset={reset}
        caption="Left: mass position. Right: x(t) time history. Damping ratio ζ = b/(2√km) determines the regime."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* wall */}
          <line x1={wallX} y1={120} x2={wallX} y2={230} stroke="#8a8a9b" strokeWidth={3} />
          {[...Array(5)].map((_, i) => (
            <line key={i} x1={wallX - 12} y1={130 + i * 22} x2={wallX} y2={140 + i * 22} stroke="#c4c0b4" strokeWidth={1.5} />
          ))}
          {/* spring coils */}
          {Array.from({ length: 12 }, (_, i) => {
            const t0 = wallX + (i / 12) * (massX - 44 - wallX);
            const t1 = wallX + ((i + 1) / 12) * (massX - 44 - wallX);
            const y0 = 175 + (i % 2 === 0 ? -13 : 13);
            const y1 = 175 + ((i + 1) % 2 === 0 ? -13 : 13);
            return <line key={i} x1={t0} y1={y0} x2={t1} y2={y1} stroke="#50525e" strokeWidth={2.5} />;
          })}
          {/* mass */}
          <rect x={massX - 28} y={150} width={56} height={50} rx={6}
            fill={zeta >= 1 ? "#e8f5ea" : "#e8e4f9"} stroke={PURPLE} strokeWidth={2.5} />
          <text x={massX} y={180} textAnchor="middle" fontFamily="Inter, sans-serif"
            fontSize="13" fontWeight="600" fill={PURPLE}>m={mass}</text>
          {/* equilibrium line */}
          <line x1={springX} y1={140} x2={springX} y2={218} stroke="#bbb" strokeWidth={1.5} strokeDasharray="5 4" />
          <text x={springX + 5} y={138} fontFamily="Inter, sans-serif" fontSize="10" fill="#8a8a9b">eq</text>

          {/* plot area */}
          <rect x={plotX0 - 4} y={plotY0 - 4} width={plotW + 8} height={plotH + 8} rx={6}
            fill="#faf9f6" stroke="#e4e1d8" />
          <line x1={plotX0} y1={plotY0 + plotH / 2} x2={plotX0 + plotW} y2={plotY0 + plotH / 2}
            stroke="#d6d2c4" strokeWidth={1.5} />
          <line x1={plotX0} y1={plotY0} x2={plotX0} y2={plotY0 + plotH}
            stroke="#d6d2c4" strokeWidth={1} />
          {plotPath && (
            <path d={plotPath} fill="none" stroke={PURPLE} strokeWidth={2.5} strokeLinecap="round" />
          )}
          <text x={plotX0 + plotW - 4} y={plotY0 + 14} textAnchor="end"
            fontFamily="Inter, sans-serif" fontSize="10.5" fill="#8a8a9b">x(t)</text>

          {/* damping regime label */}
          <rect x={16} y={16} width={185} height={60} rx={8}
            fill={zeta < 1 ? "#f4f1fb" : zeta === 1 ? "#f0f8f1" : "#fff7f0"}
            stroke={zeta < 1 ? "#c4b8ef" : zeta === 1 ? "#bfdfc4" : "#f0b982"} />
          <text x={26} y={36} fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700"
            fill={zeta < 1 ? PURPLE : zeta <= 1.02 ? GREEN : ORANGE}>
            {zeta < 0.98 ? "Underdamped" : zeta <= 1.02 ? "Critical" : "Overdamped"}
          </text>
          <text x={26} y={56} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            ζ = {zeta.toFixed(3)}   ω₀ = {omega0.toFixed(2)} rad/s
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="k (N/m)" value={k} min={1} max={200} step={1} onChange={setK}
            fmt={v => `${v.toFixed(0)}`} color={BLUE} />
          <LabeledSlider label="mass (kg)" value={mass} min={0.1} max={10} step={0.05} onChange={setMass}
            fmt={v => `${v.toFixed(2)}`} />
          <LabeledSlider label="b (damping)" value={b} min={0} max={30} step={0.1} onChange={setB}
            fmt={v => `${v.toFixed(1)}`} color={ORANGE} />
          <WidgetButton onClick={() => setRunning(r => !r)} active={running}>
            {running ? "Pause" : "Play"}
          </WidgetButton>
          <Readout label="ζ" value={zeta.toFixed(3)} color={ORANGE} />
          <Readout label="T" value={`${period.toFixed(2)} s`} color={PURPLE} />
          <Readout label="x" value={`${x.toFixed(3)} m`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys6-critical-damp" met={resonanceMet}>
        Achieve critical damping: set the parameters so <M>{"\\zeta = b/(2\\sqrt{km}) \\approx 1"}</M>{" "}
        (within 0.05). At critical damping the mass returns to equilibrium as fast as possible without oscillating.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Pendulum phase portrait
// ------------------------------------------------------------------
function PendulumPhase() {
  const [L, setL] = useState(1.2);
  const [b, setB] = useState(0.3);
  const [theta0, setTheta0] = useState(1.5);
  const [running, setRunning] = useState(false);
  const stateRef = useRef({ th: 1.5, w: 0, t: 0 });
  const histRef = useRef<{ th: number; w: number }[]>([]);
  const rafRef = useRef<number>(0);
  const [snap, setSnap] = useState({ th: 1.5, w: 0 });
  const G = 9.81;

  function reset() {
    setRunning(false);
    stateRef.current = { th: theta0, w: 0, t: 0 };
    histRef.current = [{ th: theta0, w: 0 }];
    setSnap({ th: theta0, w: 0 });
  }

  useEffect(() => { reset(); }, [theta0, L, b]);

  useEffect(() => {
    if (!running) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    function step(now: number) {
      const dt = Math.min((now - last) / 1000, 0.025);
      last = now;
      const s = stateRef.current;
      const f = (th: number, w: number) => -(G / L) * Math.sin(th) - b * w;
      const k1t = s.w, k1w = f(s.th, s.w);
      const k2t = s.w + 0.5 * dt * k1w, k2w = f(s.th + 0.5 * dt * k1t, s.w + 0.5 * dt * k1w);
      const k3t = s.w + 0.5 * dt * k2w, k3w = f(s.th + 0.5 * dt * k2t, s.w + 0.5 * dt * k2w);
      const k4t = s.w + dt * k3w, k4w = f(s.th + dt * k3t, s.w + dt * k3w);
      s.th += (dt / 6) * (k1t + 2 * k2t + 2 * k3t + k4t);
      s.w += (dt / 6) * (k1w + 2 * k2w + 2 * k3w + k4w);
      s.t += dt;
      histRef.current.push({ th: s.th, w: s.w });
      if (histRef.current.length > 600) histRef.current.shift();
      setSnap({ th: s.th, w: s.w });
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, L, b]);

  const th = snap.th;
  const w = snap.w;

  // Pendulum SVG
  const pivX = 200, pivY = 50;
  const pL = L * 130;
  const bobX = pivX + pL * Math.sin(th);
  const bobY = pivY + pL * Math.cos(th);

  // Phase portrait (right side)
  const ppX0 = 400, ppY0 = 20, ppW = 340, ppH = 310;
  const thScale = ppW / (2 * Math.PI * 1.1);
  const wScale = ppH / (8);
  const toPhaseX = (t: number) => ppX0 + ppW / 2 + t * thScale;
  const toPhaseY = (ww: number) => ppY0 + ppH / 2 - ww * wScale;

  const phasePath = histRef.current.length > 1
    ? histRef.current.map((p, i) =>
        `${i === 0 ? "M" : "L"} ${toPhaseX(p.th).toFixed(1)} ${clamp(toPhaseY(p.w), ppY0, ppY0 + ppH).toFixed(1)}`
      ).join(" ")
    : "";

  const smallAngleMet = theta0 < 0.2 && running;

  return (
    <>
      <WidgetShell
        title="Pendulum and phase portrait"
        onReset={reset}
        caption="Left: pendulum animation. Right: phase portrait (θ, θ̇). Spiral inward = damping. Loops = oscillation."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* pivot */}
          <circle cx={pivX} cy={pivY} r={7} fill="#50525e" />
          {/* rod */}
          <line x1={pivX} y1={pivY} x2={bobX} y2={bobY} stroke="#50525e" strokeWidth={3} />
          {/* bob */}
          <circle cx={bobX} cy={bobY} r={18}
            fill={Math.abs(th) > 2.5 ? RED : PURPLE} opacity={0.85} stroke="#fff" strokeWidth={2.5} />
          {/* equilibrium line */}
          <line x1={pivX} y1={pivY} x2={pivX} y2={pivY + pL} stroke="#d6d2c4" strokeWidth={1.5} strokeDasharray="5 4" />

          {/* phase plot */}
          <rect x={ppX0} y={ppY0} width={ppW} height={ppH} rx={6} fill="#faf9f6" stroke="#e4e1d8" />
          <line x1={ppX0} y1={ppY0 + ppH / 2} x2={ppX0 + ppW} y2={ppY0 + ppH / 2} stroke="#d6d2c4" strokeWidth={1.5} />
          <line x1={ppX0 + ppW / 2} y1={ppY0} x2={ppX0 + ppW / 2} y2={ppY0 + ppH} stroke="#d6d2c4" strokeWidth={1} />
          {phasePath && (
            <path d={phasePath} fill="none" stroke={BLUE} strokeWidth={2} strokeLinecap="round" />
          )}
          {/* current point */}
          <circle cx={toPhaseX(th)} cy={clamp(toPhaseY(w), ppY0, ppY0 + ppH)} r={5}
            fill={ORANGE} stroke="#fff" strokeWidth={2} />
          <text x={ppX0 + ppW / 2 - 8} y={ppY0 + 14} textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="10" fill="#8a8a9b">θ →</text>
          <text x={ppX0 + 10} y={ppY0 + ppH / 2 - 6}
            fontFamily="Inter, sans-serif" fontSize="10" fill="#8a8a9b">θ̇ ↑</text>

          {/* readout */}
          <rect x={16} y={16} width={175} height={58} rx={8} fill="#f4f1fb" stroke="#c4b8ef" />
          <text x={26} y={36} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            θ = {(th * 180 / Math.PI).toFixed(1)}°
          </text>
          <text x={26} y={54} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            θ̇ = {w.toFixed(3)} rad/s
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="L (length)" value={L} min={0.3} max={2.5} step={0.05} onChange={setL}
            fmt={v => `${v.toFixed(2)} m`} />
          <LabeledSlider label="b (damping)" value={b} min={0} max={3} step={0.05} onChange={setB}
            fmt={v => `${v.toFixed(2)}`} color={ORANGE} />
          <LabeledSlider label="θ₀ (initial)" value={theta0} min={0.05} max={Math.PI - 0.05} step={0.05}
            onChange={setTheta0} fmt={v => `${(v * 180 / Math.PI).toFixed(0)}°`} />
          <WidgetButton onClick={() => setRunning(r => !r)} active={running}>
            {running ? "Pause" : "Play"}
          </WidgetButton>
          <Readout label="ω₀" value={`${Math.sqrt(G / L).toFixed(2)} rad/s`} color={PURPLE} />
          <Readout label="T" value={`${(2 * Math.PI * Math.sqrt(L / G)).toFixed(2)} s`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys6-pendulum-chaos" met={theta0 > 2.8 && b < 0.1 && running}>
        Push the pendulum to <M>{"\\theta_0 > 160°"}</M> with very low damping. The phase portrait
        should show large looping orbits where the pendulum nearly goes over the top.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Resonance tuner — driven harmonic oscillator
// ------------------------------------------------------------------
function ResonanceTuner() {
  const [k, setK] = useState(40);
  const [mass, setMass] = useState(1);
  const [b, setB] = useState(1.5);
  const [driveFrac, setDriveFrac] = useState(1.0);

  const omega0 = Math.sqrt(k / mass);
  const omega = driveFrac * omega0;
  const zeta = b / (2 * Math.sqrt(k * mass));
  // Steady-state amplitude of driven harmonic oscillator
  const F0 = 5;
  const denom = Math.sqrt((omega0 * omega0 - omega * omega) ** 2 + (2 * zeta * omega0 * omega) ** 2);
  const amplitude = F0 / (mass * (denom || 1e-6));

  // Plot amplitude vs. frequency ratio
  const nPts = 120;
  const ampPts = Array.from({ length: nPts }, (_, i) => {
    const r = (i / (nPts - 1)) * 2.5; // frequency ratio 0 to 2.5
    const om = r * omega0;
    const d = Math.sqrt((omega0 ** 2 - om ** 2) ** 2 + (2 * zeta * omega0 * om) ** 2);
    return { r, amp: Math.min(F0 / (mass * (d || 1e-6)), 30) };
  });
  const maxAmp = Math.max(...ampPts.map(p => p.amp));

  const plotX0 = 60, plotY0 = 30, plotW = 620, plotH = 250;
  const xS = (r: number) => plotX0 + (r / 2.5) * plotW;
  const yS = (a: number) => plotY0 + plotH - (a / Math.max(maxAmp, 1)) * plotH;

  const path = ampPts.map((p, i) => `${i === 0 ? "M" : "L"} ${xS(p.r).toFixed(1)} ${yS(p.amp).toFixed(1)}`).join(" ");

  const resonanceMet = Math.abs(driveFrac - 1) < 0.04;

  return (
    <>
      <WidgetShell
        title="Resonance — driven harmonic oscillator"
        onReset={() => { setK(40); setMass(1); setB(1.5); setDriveFrac(1.0); }}
        caption="Amplitude of steady-state response vs. driving frequency ratio ω/ω₀. The peak occurs near ω = ω₀."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <line x1={plotX0} y1={plotY0 + plotH} x2={plotX0 + plotW} y2={plotY0 + plotH} stroke="#8a8a9b" strokeWidth={1.5} />
          <line x1={plotX0} y1={plotY0} x2={plotX0} y2={plotY0 + plotH} stroke="#8a8a9b" strokeWidth={1.5} />
          {[0, 0.5, 1, 1.5, 2, 2.5].map(r => (
            <g key={r}>
              <line x1={xS(r)} y1={plotY0} x2={xS(r)} y2={plotY0 + plotH} stroke="#e4e1d8" />
              <text x={xS(r)} y={plotY0 + plotH + 18} textAnchor="middle"
                fontFamily="Inter, sans-serif" fontSize="11" fill="#8a8a9b">{r}</text>
            </g>
          ))}
          <path d={path} fill="none" stroke={PURPLE} strokeWidth={3.5} />
          {/* resonance line */}
          <line x1={xS(1)} y1={plotY0} x2={xS(1)} y2={plotY0 + plotH}
            stroke={ORANGE} strokeWidth={2} strokeDasharray="6 4" />
          <text x={xS(1) + 6} y={plotY0 + 18} fontFamily="Inter, sans-serif"
            fontSize="11" fill={ORANGE}>ω₀</text>
          {/* current position */}
          <circle cx={xS(driveFrac)} cy={yS(amplitude)} r={6}
            fill={ORANGE} stroke="#fff" strokeWidth={2} />
          {/* axis labels */}
          <text x={plotX0 + plotW / 2} y={plotY0 + plotH + 34} textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="11" fill="#8a8a9b">ω / ω₀</text>
          <text x={plotX0 - 8} y={plotY0 + 10} textAnchor="end"
            fontFamily="Inter, sans-serif" fontSize="11" fill="#8a8a9b">A</text>
        </svg>
        <ControlBar>
          <LabeledSlider label="k" value={k} min={5} max={200} step={1} onChange={setK}
            fmt={v => `${v.toFixed(0)} N/m`} color={BLUE} />
          <LabeledSlider label="mass" value={mass} min={0.1} max={5} step={0.05} onChange={setMass}
            fmt={v => `${v.toFixed(2)} kg`} />
          <LabeledSlider label="damping b" value={b} min={0.1} max={15} step={0.05} onChange={setB}
            fmt={v => `${v.toFixed(2)}`} color={ORANGE} />
          <LabeledSlider label="ω / ω₀" value={driveFrac} min={0.1} max={2.5} step={0.01} onChange={setDriveFrac}
            fmt={v => `${v.toFixed(2)}`} color={PURPLE} width={170} />
          <Readout label="ω₀" value={`${omega0.toFixed(2)} rad/s`} color={BLUE} />
          <Readout label="A" value={`${amplitude.toFixed(3)} m`} color={PURPLE} />
          <Readout label="ζ" value={zeta.toFixed(3)} color={ORANGE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys6-resonance-peak" met={resonanceMet}>
        Drive the system at exactly the natural frequency: set <M>{"\\omega/\\omega_0 = 1"}</M> (within 0.04).
        Watch the orange dot sit at the peak. Reduce damping to see how sharp the peak becomes.
      </Challenge>
    </>
  );
}

export default function Oscillations() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 6"
        section="College Physics & Dynamics"
        title="Oscillations and Waves"
        lede="Any system near a stable equilibrium oscillates. The spring and the pendulum are archetypes — simple harmonic motion that recurs across mechanics, electronics, and robotics."
      />

      <p>
        A mass on a spring satisfies <M>{"m\\ddot x = -kx"}</M>, giving sinusoidal motion
        at the natural frequency <M>{"\\omega_0 = \\sqrt{k/m}"}</M>. Real systems also have
        damping — a term proportional to velocity that drains energy:
      </p>
      <Eq>{"m\\ddot x + b\\dot x + kx = 0."}</Eq>
      <p>
        The behavior depends on the <em>damping ratio</em>{" "}
        <M>{"\\zeta = b/(2\\sqrt{km})"}</M>. Below 1 the system oscillates while decaying,
        above 1 it returns exponentially without oscillating. At exactly 1 — critical
        damping — it returns as fast as possible.
      </p>

      <SpringOscillator />

      <H2>The pendulum — nonlinear oscillation</H2>
      <p>
        The pendulum equation <M>{"\\ddot\\theta + (g/L)\\sin\\theta = 0"}</M> is nonlinear.
        For small angles <M>{"\\sin\\theta \\approx \\theta"}</M> it reduces to simple
        harmonic motion with <M>{"\\omega_0 = \\sqrt{g/L}"}</M>. At large amplitudes the
        period grows and the motion is no longer sinusoidal.
      </p>
      <Eq>{"T = 2\\pi\\sqrt{\\frac{L}{g}} \\quad (\\text{small angle}), \\qquad T_0 \\approx 2.006\\,\\sqrt{L/g} \\quad (180^\\circ)."}</Eq>

      <PendulumPhase />

      <KeyIdea>
        The phase portrait makes damping visible: underdamped trajectories spiral inward,
        overdamped trajectories curve directly to the equilibrium point, and critically
        damped trajectories reach the origin as fast as any path can.
      </KeyIdea>

      <H2>Resonance</H2>
      <p>
        When an external periodic force drives the system at its natural frequency, energy
        is added efficiently on every cycle and the amplitude grows — limited only by
        damping. This is resonance. The steady-state amplitude of a driven oscillator is:
      </p>
      <Eq>{"A(\\omega) = \\frac{F_0/m}{\\sqrt{(\\omega_0^2-\\omega^2)^2 + (2\\zeta\\omega_0\\omega)^2}}."}</Eq>

      <ResonanceTuner />

      <Aside>
        Resonance appears in robot joints: if the controller's bandwidth approaches a
        structural resonance frequency of the arm, the robot shakes itself apart. Engineers
        design controllers to stay well below the first resonant mode. Compliance and
        vibration analysis are key topics in advanced robot control.
      </Aside>

      <BookRef>
        Physics track: simple harmonic motion, spring-mass, pendulum, damping, driven
        oscillations, resonance.
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
