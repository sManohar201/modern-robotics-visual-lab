import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
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

/** One shared requestAnimationFrame loop (same pattern as Foundations). */
function useRaf(running: boolean, onFrame: (dt: number) => void) {
  const cb = useRef(onFrame);
  cb.current = onFrame;
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let id = 0;
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      cb.current(dt);
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [running]);
}

function PlayButton({ running, onClick, labels = ["play", "pause"] }: { running: boolean; onClick: () => void; labels?: [string, string] }) {
  return (
    <WidgetButton onClick={onClick} active={running}>
      <span className="inline-flex items-center gap-1.5">
        {running ? <Pause size={13} /> : <Play size={13} />}
        {running ? labels[1] : labels[0]}
      </span>
    </WidgetButton>
  );
}

function OscArrowDefs() {
  const m = (id: string, color: string) => (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
    </marker>
  );
  return <defs>{m("osc-arrow-b", BLUE)}</defs>;
}

// ------------------------------------------------------------------
// Spring-mass oscillator with RK4 + labeled x(t) plot and envelope
// ------------------------------------------------------------------
function SpringOscillator() {
  const X0 = 1.2; // release position (m)
  const [k, setK] = useState(30);
  const [mass, setMass] = useState(1.5);
  const [b, setB] = useState(0.5);
  const [running, setRunning] = useState(false);
  const stateRef = useRef({ x: X0, v: 0, t: 0 });
  const histRef = useRef<{ t: number; x: number }[]>([]);
  const [snap, setSnap] = useState({ x: X0, v: 0, t: 0 });

  const omega0 = Math.sqrt(k / mass);
  const period = 2 * Math.PI / omega0;
  const zeta = b / (2 * Math.sqrt(k * mass));
  const bCrit = 2 * Math.sqrt(k * mass);

  const regime = zeta < 0.98 ? "Underdamped" : zeta <= 1.02 ? "Critically damped" : "Overdamped";
  const regimeColor = zeta < 0.98 ? PURPLE : zeta <= 1.02 ? GREEN : ORANGE;

  function reset() {
    setRunning(false);
    stateRef.current = { x: X0, v: 0, t: 0 };
    histRef.current = [];
    setSnap({ x: X0, v: 0, t: 0 });
  }

  useEffect(() => { reset(); }, [k, mass, b]); // eslint-disable-line react-hooks/exhaustive-deps

  useRaf(running, dt => {
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
    if (histRef.current.length > 1500) histRef.current.shift();
    setSnap({ ...s });
  });

  const x = snap.x;
  const v = snap.v;

  // ---- left panel: spring, mass, meter ruler ----
  const eqX = 250; // screen x of equilibrium
  const PXM = 90; // px per meter
  const massX = eqX + x * PXM;
  const wallX = 56;

  // ---- right panel: x(t) plot in a white card ----
  const plotX0 = 430;
  const plotY0 = 34;
  const plotW = 300;
  const plotH = 260;
  const plotMid = plotY0 + plotH / 2;
  const xScale = plotH / 2.8; // px per meter of displacement
  const tWindow = clamp(4 * period, 4, 20);
  const tNow = snap.t;
  const tStart = Math.max(0, tNow - tWindow);
  const mapT = (t: number) => plotX0 + ((t - tStart) / tWindow) * plotW;
  const hist = histRef.current;

  const plotPath = hist.length > 1
    ? hist
        .filter(p => p.t >= tStart)
        .map((p, i) => `${i === 0 ? "M" : "L"} ${mapT(p.t).toFixed(1)} ${clamp(plotMid - p.x * xScale, plotY0, plotY0 + plotH).toFixed(1)}`)
        .join(" ")
    : "";

  // theoretical decay envelope ±x₀e^(−ζω₀t), meaningful in the underdamped regime
  const envSeg = (sign: 1 | -1) =>
    Array.from({ length: 61 }, (_, i) => {
      const t = tStart + (i / 60) * tWindow;
      const e = X0 * Math.exp(-zeta * omega0 * t);
      return `${i === 0 ? "M" : "L"} ${mapT(t).toFixed(1)} ${clamp(plotMid - sign * e * xScale, plotY0, plotY0 + plotH).toFixed(1)}`;
    }).join(" ");

  const tickStep = tWindow > 12 ? 4 : tWindow > 6 ? 2 : 1;
  const ticks: number[] = [];
  for (let t = Math.ceil(tStart / tickStep) * tickStep; t <= tStart + tWindow + 1e-9; t += tickStep) ticks.push(t);

  const criticalMet = Math.abs(zeta - 1) < 0.05;

  return (
    <>
      <WidgetShell
        title="Damped spring-mass oscillator"
        onReset={reset}
        caption="Left: the mass on its meter ruler, released from x₀ = 1.2 m; the blue arrow is its live velocity. Right: x(t) with a time axis in seconds and a ±1 m scale. The dashed grey curves are the decay envelope ±x₀e^(−ζω₀t) — the trace rings inside it when underdamped. The card names the current regime live."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <OscArrowDefs />
          {/* wall */}
          <line x1={wallX} y1={118} x2={wallX} y2={232} stroke="#8a8a9b" strokeWidth={3} />
          {[...Array(5)].map((_, i) => (
            <line key={i} x1={wallX - 12} y1={128 + i * 22} x2={wallX} y2={138 + i * 22} stroke="#c4c0b4" strokeWidth={1.5} />
          ))}
          {/* spring coils */}
          {Array.from({ length: 12 }, (_, i) => {
            const t0 = wallX + (i / 12) * (massX - 30 - wallX);
            const t1 = wallX + ((i + 1) / 12) * (massX - 30 - wallX);
            const y0 = 175 + (i % 2 === 0 ? -13 : 13);
            const y1 = 175 + ((i + 1) % 2 === 0 ? -13 : 13);
            return <line key={i} x1={t0} y1={y0} x2={t1} y2={y1} stroke="#50525e" strokeWidth={2.5} />;
          })}
          {/* velocity arrow above the mass */}
          {Math.abs(v) > 0.05 && (
            <>
              <line x1={massX} y1={136} x2={massX + clamp(v * 20, -75, 75)} y2={136} stroke={BLUE} strokeWidth={3} markerEnd="url(#osc-arrow-b)" />
              <text x={massX + clamp(v * 20, -75, 75) + (v > 0 ? 7 : -7)} y={140} textAnchor={v > 0 ? "start" : "end"} className="ui text-[10.5px]" fill={BLUE}>v</text>
            </>
          )}
          {/* mass */}
          <rect x={massX - 28} y={150} width={56} height={50} rx={6}
            fill={zeta >= 1 ? "#e8f5ea" : "#e8e4f9"} stroke={PURPLE} strokeWidth={2.5} />
          <text x={massX} y={180} textAnchor="middle" className="ui text-[13px] font-semibold" fill={PURPLE}>m={mass}</text>
          {/* equilibrium line */}
          <line x1={eqX} y1={132} x2={eqX} y2={224} stroke={GOLD} strokeWidth={1.5} strokeDasharray="5 4" />
          <text x={eqX} y={126} textAnchor="middle" className="ui text-[10px]" fill="#8a6d12">x = 0</text>
          {/* meter ruler under the track */}
          <line x1={eqX - 1.6 * PXM} y1={232} x2={eqX + 1.6 * PXM} y2={232} stroke="#a8a496" strokeWidth={1.5} />
          {[-1.5, -1, -0.5, 0, 0.5, 1, 1.5].map(m => (
            <g key={m}>
              <line x1={eqX + m * PXM} y1={232} x2={eqX + m * PXM} y2={m % 1 === 0 ? 240 : 237} stroke="#a8a496" strokeWidth={1.2} />
              {m % 1 === 0 && (
                <text x={eqX + m * PXM} y={253} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">{m}</text>
              )}
            </g>
          ))}
          <text x={eqX + 1.6 * PXM + 8} y={253} className="ui fill-[var(--ink-faint)] text-[10px]">m</text>
          {/* live position marker on the ruler */}
          <circle cx={clamp(massX, eqX - 1.6 * PXM, eqX + 1.6 * PXM)} cy={232} r={4} fill={PURPLE} stroke="#fff" strokeWidth={1.5} />

          {/* regime card — names the current damping regime live */}
          <rect x={16} y={14} width={200} height={64} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={28} y={36} className="ui text-[12.5px] font-bold" fill={regimeColor}>{regime}</text>
          <text x={28} y={56} className="ui text-[11.5px]" fill="#4b4b5e">
            ζ = {zeta.toFixed(3)} · ω₀ = {omega0.toFixed(2)} rad/s
          </text>
          <text x={28} y={71} className="ui text-[10px]" fill="#8a8a9b">
            {zeta < 0.98 ? "overshoots and rings" : zeta <= 1.02 ? "fastest return, no overshoot" : "oozes home slowly"}
          </text>

          {/* x(t) plot in a white card */}
          <rect x={plotX0 - 8} y={plotY0 - 8} width={plotW + 16} height={plotH + 16} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          {/* ±1 m gridlines */}
          {[1, -1].map(m => (
            <g key={m}>
              <line x1={plotX0} y1={plotMid - m * xScale} x2={plotX0 + plotW} y2={plotMid - m * xScale} stroke="#ece8dd" strokeWidth={1.2} />
              <text x={plotX0 + 4} y={plotMid - m * xScale - 3} className="ui fill-[var(--ink-faint)] text-[9.5px]">{m > 0 ? "+1 m" : "−1 m"}</text>
            </g>
          ))}
          {/* zero line */}
          <line x1={plotX0} y1={plotMid} x2={plotX0 + plotW} y2={plotMid} stroke="#cfcabc" strokeWidth={1.4} />
          {/* decay envelope (underdamped regime) */}
          {zeta < 1 && (
            <>
              <path d={envSeg(1)} fill="none" stroke="#9e9e9e" strokeWidth={1.3} strokeDasharray="4 4" opacity={0.85} />
              <path d={envSeg(-1)} fill="none" stroke="#9e9e9e" strokeWidth={1.3} strokeDasharray="4 4" opacity={0.85} />
            </>
          )}
          {/* legend */}
          <g className="ui">
            <line x1={plotX0 + 70} y1={plotY0 + 12} x2={plotX0 + 88} y2={plotY0 + 12} stroke={PURPLE} strokeWidth={2.6} />
            <text x={plotX0 + 93} y={plotY0 + 16} className="text-[10.5px]" fill="var(--ink-soft)">x(t)</text>
            {zeta < 1 && (
              <>
                <line x1={plotX0 + 128} y1={plotY0 + 12} x2={plotX0 + 146} y2={plotY0 + 12} stroke="#9e9e9e" strokeWidth={1.5} strokeDasharray="4 3" />
                <text x={plotX0 + 151} y={plotY0 + 16} className="text-[10.5px]" fill="var(--ink-soft)">±x₀e^(−ζω₀t)</text>
              </>
            )}
          </g>
          {plotPath && <path d={plotPath} fill="none" stroke={PURPLE} strokeWidth={2.6} strokeLinecap="round" />}
          {/* live dot ties trace to mass */}
          {hist.length > 1 && (
            <circle cx={plotX0 + plotW} cy={clamp(plotMid - x * xScale, plotY0, plotY0 + plotH)} r={4.5} fill={PURPLE} stroke="#fff" strokeWidth={1.5} />
          )}
          {hist.length <= 1 && (
            <text x={plotX0 + plotW / 2} y={plotMid - 12} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[11.5px]">
              press play — x(t) traces here
            </text>
          )}
          {/* time axis in seconds */}
          {ticks.map(t => (
            <g key={t.toFixed(2)}>
              <line x1={mapT(t)} y1={plotY0 + plotH + 8} x2={mapT(t)} y2={plotY0 + plotH + 13} stroke="#b6b2a4" />
              <text x={mapT(t)} y={plotY0 + plotH + 25} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9.5px]">{t.toFixed(0)}</text>
            </g>
          ))}
          <text x={plotX0 + plotW + 4} y={plotY0 + plotH + 25} className="ui fill-[var(--ink-faint)] text-[9.5px]">s</text>
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={() => setRunning(r => !r)} />
          <LabeledSlider label="k (N/m)" value={k} min={1} max={200} step={1} onChange={setK}
            fmt={v2 => `${v2.toFixed(0)}`} color={BLUE} />
          <LabeledSlider label="mass (kg)" value={mass} min={0.1} max={10} step={0.05} onChange={setMass}
            fmt={v2 => `${v2.toFixed(2)}`} />
          <LabeledSlider label="b (damping)" value={b} min={0} max={30} step={0.1} onChange={setB}
            fmt={v2 => `${v2.toFixed(1)}`} color={ORANGE} />
          <Readout label="ζ" value={zeta.toFixed(3)} color={regimeColor} />
          <Readout label="b crit" value={bCrit.toFixed(1)} color={GREEN} />
          <Readout label="T" value={`${period.toFixed(2)} s`} color={PURPLE} />
          <Readout label="x" value={`${x.toFixed(3)} m`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys6-critical-damp" met={criticalMet}>
        Achieve critical damping: set the parameters so <M>{"\\zeta = b/(2\\sqrt{km}) \\approx 1"}</M>{" "}
        (within 0.05) — the <em>b crit</em> readout tells you the damping to aim for. Then press
        play: the mass returns to equilibrium as fast as possible without a single overshoot.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Pendulum phase portrait with separatrix and labeled axes
// ------------------------------------------------------------------
function PendulumPhase() {
  const [L, setL] = useState(1.2);
  const [b, setB] = useState(0.3);
  const [theta0, setTheta0] = useState(1.5);
  const [running, setRunning] = useState(false);
  const stateRef = useRef({ th: 1.5, w: 0, t: 0 });
  const histRef = useRef<{ th: number; w: number }[]>([]);
  const [snap, setSnap] = useState({ th: 1.5, w: 0 });
  const G = 9.81;

  function reset() {
    setRunning(false);
    stateRef.current = { th: theta0, w: 0, t: 0 };
    histRef.current = [{ th: theta0, w: 0 }];
    setSnap({ th: theta0, w: 0 });
  }

  useEffect(() => { reset(); }, [theta0, L, b]); // eslint-disable-line react-hooks/exhaustive-deps

  useRaf(running, dt => {
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
  });

  const th = snap.th;
  const w = snap.w;

  // ---- pendulum panel ----
  const pivX = 170, pivY = 56;
  const pL = L * 86;
  const bobX = pivX + pL * Math.sin(th);
  const bobY = pivY + pL * Math.cos(th);
  const ghostX = pivX + pL * Math.sin(theta0);
  const ghostY = pivY + pL * Math.cos(theta0);
  // tangential velocity arrow at the bob
  const vbx = pL * Math.cos(th) * w * 0.22;
  const vby = -pL * Math.sin(th) * w * 0.22;

  // ---- phase portrait ----
  const ppX0 = 396, ppY0 = 22, ppW = 344, ppH = 306;
  const thScale = ppW / (2 * Math.PI * 1.1);
  const wScale = ppH / 8;
  const wLim = ppH / 2 / wScale; // ±4 rad/s visible
  const toPhaseX = (t: number) => ppX0 + ppW / 2 + t * thScale;
  const toPhaseY = (ww: number) => ppY0 + ppH / 2 - ww * wScale;

  const buildPath = (pts: { th: number; w: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toPhaseX(p.th).toFixed(1)} ${clamp(toPhaseY(p.w), ppY0, ppY0 + ppH).toFixed(1)}`).join(" ");
  const hist = histRef.current;
  const oldPath = hist.length > 1 ? buildPath(hist) : "";
  const recentPath = hist.length > 1 ? buildPath(hist.slice(-120)) : "";

  // separatrix ω = ±2√(g/L)·cos(θ/2): the boundary between swinging and going over the top
  const sepPath = (() => {
    let d = "";
    for (const sign of [1, -1]) {
      let pen = false;
      for (let i = 0; i <= 120; i++) {
        const t = -Math.PI + (i / 120) * 2 * Math.PI;
        const ww = sign * 2 * Math.sqrt(G / L) * Math.cos(t / 2);
        if (Math.abs(ww) <= wLim * 0.98 && Math.abs(t) <= Math.PI) {
          d += `${pen ? "L" : "M"} ${toPhaseX(t).toFixed(1)} ${toPhaseY(ww).toFixed(1)} `;
          pen = true;
        } else pen = false;
      }
    }
    return d;
  })();

  return (
    <>
      <WidgetShell
        title="Pendulum and phase portrait"
        onReset={reset}
        caption="Left: the pendulum, with the release angle θ₀ ghosted and the live tangential velocity in blue. Right: the phase portrait (θ, θ̇) with degree and rad/s axes. The gold dashed separatrix is the over-the-top boundary — orbits inside it swing back and forth; touch it and the pendulum barely creeps past vertical. Damping makes the blue trail spiral inward."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <OscArrowDefs />
          {/* equilibrium (vertical) line */}
          <line x1={pivX} y1={pivY} x2={pivX} y2={pivY + pL + 22} stroke="#d6d2c4" strokeWidth={1.5} strokeDasharray="5 4" />
          {/* angle arc from vertical to the rod */}
          {Math.abs(th) > 0.08 && (
            <>
              <path
                d={`M ${pivX} ${pivY + 34} A 34 34 0 ${Math.abs(th) > Math.PI ? 1 : 0} ${th > 0 ? 0 : 1} ${(pivX + 34 * Math.sin(th)).toFixed(1)} ${(pivY + 34 * Math.cos(th)).toFixed(1)}`}
                fill="none" stroke={PURPLE} strokeWidth={1.6} opacity={0.6}
              />
              <text
                x={pivX + 50 * Math.sin(th / 2)} y={pivY + 50 * Math.cos(th / 2) + 4}
                textAnchor="middle" className="ui text-[11px]" fill={PURPLE}
              >θ</text>
            </>
          )}
          {/* release-angle ghost */}
          <line x1={pivX} y1={pivY} x2={ghostX} y2={ghostY} stroke="#c4c0b4" strokeWidth={2} strokeDasharray="4 4" />
          <circle cx={ghostX} cy={ghostY} r={9} fill="none" stroke="#c4c0b4" strokeWidth={2} strokeDasharray="3 3" />
          <text x={ghostX + (theta0 > 0 ? 14 : -14)} y={ghostY + 4} textAnchor={theta0 > 0 ? "start" : "end"} className="ui fill-[var(--ink-faint)] text-[10px]">θ₀</text>
          {/* pivot + rod + bob */}
          <circle cx={pivX} cy={pivY} r={7} fill="#50525e" />
          <line x1={pivX} y1={pivY} x2={bobX} y2={bobY} stroke="#50525e" strokeWidth={3} />
          <circle cx={bobX} cy={bobY} r={17}
            fill={Math.abs(th) > 2.5 ? RED : PURPLE} opacity={0.85} stroke="#fff" strokeWidth={2.5} />
          {/* tangential velocity arrow */}
          {Math.abs(w) > 0.15 && (
            <line x1={bobX} y1={bobY} x2={bobX + clamp(vbx, -85, 85)} y2={bobY + clamp(vby, -85, 85)}
              stroke={BLUE} strokeWidth={3} markerEnd="url(#osc-arrow-b)" />
          )}

          {/* state card */}
          <rect x={16} y={H - 56} width={230} height={40} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={28} y={H - 31} className="ui text-[11.5px]" fill="#4b4b5e">
            θ = {(th * 180 / Math.PI).toFixed(1)}° · θ̇ = {w.toFixed(2)} rad/s
          </text>

          {/* phase portrait card */}
          <rect x={ppX0} y={ppY0} width={ppW} height={ppH} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          {/* θ gridlines at ±90°, ±180° */}
          {[-Math.PI, -Math.PI / 2, Math.PI / 2, Math.PI].map(t => (
            <g key={t.toFixed(2)}>
              <line x1={toPhaseX(t)} y1={ppY0 + 4} x2={toPhaseX(t)} y2={ppY0 + ppH - 4} stroke="#ece8dd" strokeWidth={1.1} />
              <text x={toPhaseX(t)} y={ppY0 + ppH - 8} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9.5px]">
                {(t * 180 / Math.PI).toFixed(0)}°
              </text>
            </g>
          ))}
          {/* θ̇ gridlines at ±2 rad/s */}
          {[2, -2].map(ww => (
            <g key={ww}>
              <line x1={ppX0 + 4} y1={toPhaseY(ww)} x2={ppX0 + ppW - 4} y2={toPhaseY(ww)} stroke="#ece8dd" strokeWidth={1.1} />
              <text x={ppX0 + 8} y={toPhaseY(ww) - 3} className="ui fill-[var(--ink-faint)] text-[9.5px]">{ww > 0 ? "+2" : "−2"}</text>
            </g>
          ))}
          {/* axes */}
          <line x1={ppX0 + 4} y1={ppY0 + ppH / 2} x2={ppX0 + ppW - 4} y2={ppY0 + ppH / 2} stroke="#cfcabc" strokeWidth={1.4} />
          <line x1={ppX0 + ppW / 2} y1={ppY0 + 4} x2={ppX0 + ppW / 2} y2={ppY0 + ppH - 4} stroke="#cfcabc" strokeWidth={1.1} />
          <text x={ppX0 + ppW - 8} y={ppY0 + ppH / 2 - 6} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10px]">θ →</text>
          <text x={ppX0 + ppW / 2 + 6} y={ppY0 + 14} className="ui fill-[var(--ink-faint)] text-[10px]">θ̇ (rad/s)</text>
          {/* separatrix */}
          {sepPath && <path d={sepPath} fill="none" stroke={GOLD} strokeWidth={1.6} strokeDasharray="6 4" opacity={0.9} />}
          {/* trajectory with fading trail */}
          {oldPath && <path d={oldPath} fill="none" stroke={BLUE} strokeWidth={1.6} strokeLinecap="round" opacity={0.22} />}
          {recentPath && <path d={recentPath} fill="none" stroke={BLUE} strokeWidth={2.2} strokeLinecap="round" opacity={0.95} />}
          {/* current point */}
          <circle cx={clamp(toPhaseX(th), ppX0, ppX0 + ppW)} cy={clamp(toPhaseY(w), ppY0, ppY0 + ppH)} r={5}
            fill={ORANGE} stroke="#fff" strokeWidth={2} />
          {/* legend */}
          <g className="ui">
            <line x1={ppX0 + 12} y1={ppY0 + 12} x2={ppX0 + 30} y2={ppY0 + 12} stroke={BLUE} strokeWidth={2.4} />
            <text x={ppX0 + 35} y={ppY0 + 16} className="text-[10px]" fill="var(--ink-soft)">trajectory</text>
            <line x1={ppX0 + 12} y1={ppY0 + 26} x2={ppX0 + 30} y2={ppY0 + 26} stroke={GOLD} strokeWidth={1.8} strokeDasharray="5 3" />
            <text x={ppX0 + 35} y={ppY0 + 30} className="text-[10px]" fill="var(--ink-soft)">separatrix (over the top)</text>
          </g>
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={() => setRunning(r => !r)} />
          <LabeledSlider label="L (length)" value={L} min={0.3} max={2.5} step={0.05} onChange={setL}
            fmt={v => `${v.toFixed(2)} m`} />
          <LabeledSlider label="b (damping)" value={b} min={0} max={3} step={0.05} onChange={setB}
            fmt={v => `${v.toFixed(2)}`} color={ORANGE} />
          <LabeledSlider label="θ₀ (initial)" value={theta0} min={0.05} max={Math.PI - 0.05} step={0.05}
            onChange={setTheta0} fmt={v => `${(v * 180 / Math.PI).toFixed(0)}°`} />
          <Readout label="ω₀" value={`${Math.sqrt(G / L).toFixed(2)} rad/s`} color={PURPLE} />
          <Readout label="T" value={`${(2 * Math.PI * Math.sqrt(L / G)).toFixed(2)} s`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys6-pendulum-chaos" met={theta0 > 2.8 && b < 0.1 && running}>
        Push the release angle above <M>{"160°"}</M>, cut the damping below 0.1, and press play.
        The orbit stretches out to hug the gold separatrix — the pendulum hesitates near the top,
        creeping past vertical instead of swinging smoothly.
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
  const [driveFrac, setDriveFrac] = useState(0.4); // start well below resonance — finding the peak is the challenge

  const omega0 = Math.sqrt(k / mass);
  const omega = driveFrac * omega0;
  const zeta = b / (2 * Math.sqrt(k * mass));
  const Q = 1 / (2 * zeta);
  // Steady-state amplitude of driven harmonic oscillator
  const F0 = 5;
  const denom = Math.sqrt((omega0 * omega0 - omega * omega) ** 2 + (2 * zeta * omega0 * omega) ** 2);
  const amplitude = F0 / (mass * (denom || 1e-6));

  // Amplitude vs. frequency ratio
  const nPts = 160;
  const ampPts = Array.from({ length: nPts }, (_, i) => {
    const r = (i / (nPts - 1)) * 2.5;
    const om = r * omega0;
    const d = Math.sqrt((omega0 ** 2 - om ** 2) ** 2 + (2 * zeta * omega0 * om) ** 2);
    return { r, amp: Math.min(F0 / (mass * (d || 1e-6)), 30) };
  });
  const maxAmp = Math.max(...ampPts.map(p => p.amp));
  let iPeak = 0;
  ampPts.forEach((p, i) => { if (p.amp > ampPts[iPeak].amp) iPeak = i; });
  const peakAmp = ampPts[iPeak].amp;

  // half-power band: where A ≥ A_peak/√2
  const thr = peakAmp / Math.SQRT2;
  let iLo = iPeak, iHi = iPeak;
  while (iLo > 0 && ampPts[iLo - 1].amp >= thr) iLo--;
  while (iHi < nPts - 1 && ampPts[iHi + 1].amp >= thr) iHi++;

  const plotX0 = 64, plotY0 = 36, plotW = 620, plotH = 244;
  const xS = (r: number) => plotX0 + (r / 2.5) * plotW;
  const yS = (a: number) => plotY0 + plotH - (a / Math.max(maxAmp, 1)) * plotH;

  const path = ampPts.map((p, i) => `${i === 0 ? "M" : "L"} ${xS(p.r).toFixed(1)} ${yS(p.amp).toFixed(1)}`).join(" ");
  // shaded area under the curve inside the half-power band
  const bandPts = ampPts.slice(iLo, iHi + 1);
  const bandArea =
    `M ${xS(bandPts[0].r).toFixed(1)} ${(plotY0 + plotH).toFixed(1)} ` +
    bandPts.map(p => `L ${xS(p.r).toFixed(1)} ${yS(p.amp).toFixed(1)}`).join(" ") +
    ` L ${xS(bandPts[bandPts.length - 1].r).toFixed(1)} ${(plotY0 + plotH).toFixed(1)} Z`;
  const bandWide = xS(ampPts[iHi].r) - xS(ampPts[iLo].r) > 0.85 * plotW;

  const aClamped = Math.min(amplitude, 30);
  const resonanceMet = Math.abs(driveFrac - 1) < 0.04;

  return (
    <>
      <WidgetShell
        title="Resonance — driven harmonic oscillator"
        onReset={() => { setK(40); setMass(1); setB(1.5); setDriveFrac(0.4); }}
        caption="Steady-state amplitude vs. driving frequency ratio ω/ω₀, with the amplitude axis in meters. The gold line marks the natural frequency ω₀ and the gold dot the actual peak. The shaded band is the half-power band (A ≥ A_peak/√2) — the narrower it is, the pickier the system. Slide the orange drive marker over the peak."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* frame */}
          <line x1={plotX0} y1={plotY0 + plotH} x2={plotX0 + plotW} y2={plotY0 + plotH} stroke="#8a8a9b" strokeWidth={1.5} />
          <line x1={plotX0} y1={plotY0} x2={plotX0} y2={plotY0 + plotH} stroke="#8a8a9b" strokeWidth={1.5} />
          {/* x gridlines + ticks */}
          {[0, 0.5, 1, 1.5, 2, 2.5].map(r => (
            <g key={r}>
              <line x1={xS(r)} y1={plotY0} x2={xS(r)} y2={plotY0 + plotH} stroke="#ece8dd" />
              <text x={xS(r)} y={plotY0 + plotH + 18} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[11px]">{r}</text>
            </g>
          ))}
          {/* amplitude ticks in meters */}
          {[0.25, 0.5, 0.75, 1].map(f => (
            <g key={f}>
              <line x1={plotX0} y1={yS(f * maxAmp)} x2={plotX0 + plotW} y2={yS(f * maxAmp)} stroke="#ece8dd" />
              <text x={plotX0 - 6} y={yS(f * maxAmp) + 3.5} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10px]">
                {(f * maxAmp).toFixed(1)}
              </text>
            </g>
          ))}
          <text x={plotX0 - 6} y={plotY0 + plotH + 3.5} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10px]">0</text>
          {/* half-power band shading */}
          <path d={bandArea} fill={PURPLE} opacity={0.1} stroke="none" />
          {!bandWide && (
            <text x={(xS(ampPts[iLo].r) + xS(ampPts[iHi].r)) / 2} y={plotY0 + plotH - 8} textAnchor="middle"
              className="ui text-[10px]" fill={PURPLE} opacity={0.8}>
              half-power band Δ = {(ampPts[iHi].r - ampPts[iLo].r).toFixed(2)}
            </text>
          )}
          {/* response curve */}
          <path d={path} fill="none" stroke={PURPLE} strokeWidth={3} />
          {/* natural frequency — gold event line */}
          <line x1={xS(1)} y1={plotY0} x2={xS(1)} y2={plotY0 + plotH} stroke={GOLD} strokeWidth={2} strokeDasharray="6 4" />
          <text x={xS(1) + 6} y={plotY0 + 16} className="ui text-[11px]" fill="#8a6d12">ω₀ (natural)</text>
          {/* actual peak marker */}
          <circle cx={xS(ampPts[iPeak].r)} cy={yS(peakAmp)} r={4.5} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
          <text x={xS(ampPts[iPeak].r) + 8} y={yS(peakAmp) - 8} className="ui text-[10.5px]" fill="#8a6d12">
            peak A = {peakAmp.toFixed(1)} m
          </text>
          {/* current drive marker */}
          <line x1={xS(driveFrac)} y1={plotY0} x2={xS(driveFrac)} y2={plotY0 + plotH} stroke={ORANGE} strokeWidth={1.4} strokeDasharray="4 4" opacity={0.7} />
          <circle cx={xS(driveFrac)} cy={yS(aClamped)} r={6} fill={ORANGE} stroke="#fff" strokeWidth={2} />
          <text x={xS(driveFrac)} y={plotY0 + plotH + 32} textAnchor="middle" className="ui text-[10px]" fill={ORANGE}>drive</text>
          {/* axis labels */}
          <text x={plotX0 + plotW / 2} y={plotY0 + plotH + 50} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[11px]">
            driving frequency ratio ω / ω₀
          </text>
          <text x={plotX0 + 8} y={plotY0 - 10} className="ui fill-[var(--ink-faint)] text-[11px]">steady-state amplitude A (m)</text>
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
          <Readout label="Q" value={Q.toFixed(1)} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys6-resonance-peak" met={resonanceMet}>
        Slide the drive up from 0.4 until you sit on the resonance: <M>{"\\omega/\\omega_0 = 1"}</M>{" "}
        (within 0.04) — the orange dot rides the curve to the gold peak. Then reduce damping and
        watch the half-power band shrink: the peak becomes a spike.
      </Challenge>
    </>
  );
}

export default function Oscillations() {
  return (
    <div>
      <PageHeader
        chapter="Physics 6"
        section="College Physics & Dynamics"
        title="Oscillations and Waves"
        lede="Any system near a stable equilibrium oscillates. The spring and the pendulum are archetypes — simple harmonic motion that recurs across mechanics, electronics, and robotics."
      />

      <p>
        Nudge almost anything that has a resting position — a guitar string, a tree branch, a
        car on its suspension, a robot arm holding a pose — and it wobbles about that position
        before settling. The wobble is no coincidence: near any stable equilibrium, the
        restoring force is approximately proportional to how far you've strayed, and that one
        fact makes everything oscillate the same way. The archetype is a mass on a spring,{" "}
        <M>{"m\\ddot x = -kx"}</M>: sinusoidal motion at the <strong>natural frequency</strong>{" "}
        <M>{"\\omega_0 = \\sqrt{k/m}"}</M> — the pace the system <em>wants</em> to swing at,
        set only by stiffness and mass.
      </p>
      <p>
        Real systems also lose energy to friction and air. The simplest model of that loss is{" "}
        <strong>damping</strong>: a force proportional to velocity and opposing it, with
        strength <M>{"b"}</M>. Add it and you get the most important differential equation in
        engineering:
      </p>
      <Eq>{"m\\ddot x + b\\dot x + kx = 0."}</Eq>
      <p>
        Read it back: inertia (<M>{"m\\ddot x"}</M>) argues for overshooting, the spring
        (<M>{"kx"}</M>) pulls back toward home, and damping (<M>{"b\\dot x"}</M>) bleeds off
        speed. Who wins? The answer turns out to depend on the three constants only through one
        dimensionless combination, the <strong>damping ratio</strong>:
      </p>
      <Eq>{"\\zeta = \\frac{b}{2\\sqrt{km}}."}</Eq>
      <p>
        ("Dimensionless" means the units cancel — <M>{"\\zeta"}</M> is a pure number, so a
        skyscraper and a wristwatch with the same <M>{"\\zeta"}</M> wobble in exactly the same{" "}
        <em>shape</em>, just at different speeds and sizes.) Three regimes:{" "}
        <M>{"\\zeta < 1"}</M> <strong>underdamped</strong> — overshoots and rings, like a
        plucked ruler; <M>{"\\zeta > 1"}</M> <strong>overdamped</strong> — oozes home without
        overshooting, like a spoon through honey; <M>{"\\zeta = 1"}</M>{" "}
        <strong>critically damped</strong> — the razor's edge, home as fast as possible with
        zero overshoot. Car suspensions and disk-drive heads are engineered to live near here.
      </p>

      <p>
        <strong>Try this:</strong> press play with the default (underdamped) settings and count
        the overshoots in the x(t) trace — notice the trace rings <em>inside</em> the dashed
        grey envelope. Then raise <M>{"b"}</M> until the wiggles just disappear — you have
        found critical damping by eye; check the ζ readout and the regime card. Push{" "}
        <M>{"b"}</M> far beyond it and notice settling gets <em>slower</em> again: too much
        damping is as bad as too little, which is precisely the tuning dilemma every robot
        joint controller faces.
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

      <p>
        The right-hand panel below is a <strong>phase portrait</strong> — the same picture you
        met in the <a href="#/math4-diffeq">Math 4 module</a>. Instead of plotting angle
        against time, it plots angle against angular velocity, so the system's entire state is
        one moving point. Reading them is a robotics survival skill: closed loops mean
        steady oscillation, inward spirals mean decay, and the picture shows <em>all possible
        futures</em> at once, not just the one you happened to simulate.
      </p>
      <p>
        <strong>Try this:</strong> run it with low damping and a small starting angle — a neat
        ellipse. Then raise the starting angle toward 170° and watch the orbit stretch out
        toward the gold separatrix, hesitating near the top (the pendulum creeping past
        vertical). Finally add damping and watch the loop become a spiral sinking into the
        center.
      </p>

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

      <p>
        You already know resonance in your bones: pushing a child on a swing. Push at random
        moments and you get nowhere; push in rhythm with the swing's own period and each small
        shove adds up. <strong>Try this:</strong> slide the driving frequency slowly from 0.4
        up through the gold line at <M>{"\\omega/\\omega_0 = 1"}</M> and watch the orange dot
        ride over the peak. Then cut the damping to its minimum and sweep again — the peak
        turns into a spike and the shaded half-power band narrows to a sliver. Low-damping
        systems are exquisitely picky about frequency; that pickiness is how radios tune and
        why soldiers break step on bridges.
      </p>

      <ResonanceTuner />

      <Worked title="Designing a grandfather clock">
        <p>
          <strong>Given.</strong> A pendulum clock "ticks" every half-period. For one tick per
          second (period <M>{"T = 2"}</M> s), how long must the pendulum be?
        </p>
        <p>
          <strong>Set up.</strong> Small-angle period: <M>{"T = 2\\pi\\sqrt{L/g}"}</M>. Solve
          for <M>{"L = g\\,(T/2\\pi)^2"}</M>.
        </p>
        <p>
          <strong>Solve.</strong> <M>{"L = 9.81 \\times (2/6.283)^2 \\approx 0.994"}</M> m —
          just under a meter, which is exactly why grandfather clocks are the height they are.
        </p>
        <p>
          <strong>Check.</strong> Notice what's <em>absent</em>: the bob's mass. A heavier bob
          changes nothing about the timing (it only helps the clock run longer between
          windings). Confirm in the pendulum widget: length is the only slider that moves the
          period readout.
        </p>
      </Worked>

      <Aside>
        Resonance appears in robot joints: if the controller's bandwidth approaches a
        structural resonance frequency of the arm, the robot shakes itself apart. Engineers
        design controllers to stay well below the first resonant mode. Compliance and
        vibration analysis are key topics in advanced robot control.
      </Aside>

      <Quiz
        challengeId="phys6-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: (
              <>
                To get a playground swing going high, you push in rhythm with its natural
                period. Which concept is that?
              </>
            ),
            options: [
              { label: "Resonance — driving at ω₀ adds energy every cycle", correct: true },
              { label: "Critical damping" },
              { label: "Conservation of momentum" },
              { label: "The small-angle approximation" },
            ],
            explain:
              "Each push arrives exactly when it reinforces the motion. Off-rhythm pushes partly cancel — the amplitude curve you explored is the swing's response to your timing.",
          },
          {
            prompt: (
              <>
                A car's suspension is designed near <M>{"\\zeta = 1"}</M>. Why not much lower
                or much higher?
              </>
            ),
            options: [
              {
                label: "Lower would bounce repeatedly after bumps; higher would recover sluggishly",
                correct: true,
              },
              { label: "Lower would break the springs" },
              { label: "Higher would make the car resonate" },
              { label: "ζ = 1 minimizes fuel consumption" },
            ],
            explain:
              "Underdamped = boat-like wallowing; overdamped = slow, harsh recovery. Critical damping settles fastest with no overshoot — the same target a robot-joint controller aims for.",
          },
          {
            prompt: (
              <>
                Two pendulum clocks are identical except one bob is twice as heavy. Which runs
                faster?
              </>
            ),
            options: [
              { label: "Neither — the period depends only on L and g", correct: true },
              { label: "The heavy one" },
              { label: "The light one" },
              { label: "Depends on the starting angle only" },
            ],
            explain:
              "T = 2π√(L/g): gravity accelerates the heavier bob with proportionally more force, and the two effects cancel — Galileo's insight again, in rotational clothing.",
          },
        ]}
      />

      <H2>Where you'll use this in Modern Robotics</H2>
      <p>
        This module is the secret syllabus of Chapter 11 (robot control). A PID-controlled
        joint <em>is</em> a mass–spring–damper: the P gain plays the spring, the D gain plays
        the damper, and tuning them is literally choosing <M>{"\\omega_0"}</M> and{" "}
        <M>{"\\zeta"}</M> for the tracking error. When Chapter 11 asks for "critically damped
        error dynamics," it is asking for the ζ = 1 behavior you dialed in above. The phase
        portrait returns in Chapter 9's time-optimal trajectories and Chapter 13's mobile-robot
        planning as the standard picture of a system's state.
      </p>

      <BookRef>
        Physics track · Module 6 of 10: simple harmonic motion, spring-mass, pendulum, damping,
        driven oscillations, resonance. Bridges to MR §9 (trajectories) and §11 (control).
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
