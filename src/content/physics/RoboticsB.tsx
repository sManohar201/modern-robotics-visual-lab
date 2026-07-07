import { useState, useRef, useEffect } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";

const W = 760;
const H = 360;
const RED = "#d9483f";
const GREEN = "#2f9e44";
const BLUE = "#3b6fd4";
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";
const GOLD = "#caa53d";
const G = 9.81;

const PX_PER_N = 1.2; // gravity-arrow scale
const G1_TARGET = 28; // N·m — challenge target (the Worked example gives 30.4)

/** Curved torque-arc arrow around a joint. Positive tau = counterclockwise. */
function TorqueArc({ cx, cy, tau, label, labelDy = -30 }: { cx: number; cy: number; tau: number; label: string; labelDy?: number }) {
  const mag = Math.abs(tau);
  if (mag < 0.3) return null;
  const r = 24;
  const sweep = Math.min(200, 40 + mag * 3.6); // degrees of arc, grows with |τ|
  const a0 = -20;
  const a1 = tau > 0 ? a0 + sweep : a0 - sweep;
  const rad = (d: number) => (d * Math.PI) / 180;
  const x0 = cx + r * Math.cos(rad(a0)), y0 = cy - r * Math.sin(rad(a0));
  const x1 = cx + r * Math.cos(rad(a1)), y1 = cy - r * Math.sin(rad(a1));
  const large = sweep > 180 ? 1 : 0;
  // SVG y is flipped: CCW in physics = sweep-flag 0 with our sign handling
  const sweepFlag = tau > 0 ? 0 : 1;
  return (
    <g>
      <path d={`M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} ${sweepFlag} ${x1.toFixed(1)} ${y1.toFixed(1)}`}
        fill="none" stroke={PURPLE} strokeWidth={Math.min(5, 1.8 + mag / 10)} markerEnd="url(#rb-tq)" opacity={0.85} />
      <text x={cx} y={cy + labelDy} textAnchor="middle" className="ui text-[10.5px] font-semibold" fill={PURPLE}>{label}</text>
    </g>
  );
}

// ------------------------------------------------------------------
// 2-link arm dynamics visualizer
// ------------------------------------------------------------------
function TwoLinkArmDynamics() {
  const [th1, setTh1] = useState(90);
  const [th2, setTh2] = useState(0);
  const [w1, setW1] = useState(0);
  const [w2, setW2] = useState(0);
  const [L1, setL1] = useState(1.0);
  const [L2, setL2] = useState(0.8);
  const [m1, setM1] = useState(2.0);
  const [m2, setM2] = useState(1.5);
  const [showGravity, setShowGravity] = useState(true);
  const [showCoriolis, setShowCoriolis] = useState(true);

  const t1 = (th1 * Math.PI) / 180;
  const t2 = (th2 * Math.PI) / 180;
  const lc1 = L1 / 2;
  const lc2 = L2 / 2;

  // Mass matrix M(θ)
  const I1 = (m1 * L1 * L1) / 3 + m2 * L1 * L1;
  const I2 = (m2 * L2 * L2) / 3;
  const M11 = I1 + I2 + 2 * m2 * L1 * L2 * Math.cos(t2);
  const M12 = I2 + m2 * L1 * L2 * Math.cos(t2);
  const M22 = I2;

  // Coriolis / centrifugal (live — the θ̇ sliders feed these)
  const hh = -m2 * L1 * L2 * Math.sin(t2);
  const C1 = hh * w2 * w1 + hh * w2 * (w1 + w2);
  const C2 = -hh * w1 * w1;

  // Gravity torques
  const g1of = (a1: number) => m1 * G * lc1 * Math.cos(a1) + m2 * G * (L1 * Math.cos(a1) + lc2 * Math.cos(a1 + t2));
  const g1 = g1of(t1);
  const g2 = m2 * G * lc2 * Math.cos(t1 + t2);

  // Torque to hold this state without accelerating (θ̈ = 0)
  const tau1 = (showCoriolis ? C1 : 0) + (showGravity ? g1 : 0);
  const tau2 = (showCoriolis ? C2 : 0) + (showGravity ? g2 : 0);

  // SVG geometry
  const pivX = 185, pivY = 250;
  const scl = Math.min(120, 220 / (L1 + L2));
  const x1 = pivX + L1 * scl * Math.cos(t1);
  const y1 = pivY - L1 * scl * Math.sin(t1);
  const x2 = x1 + L2 * scl * Math.cos(t1 + t2);
  const y2 = y1 - L2 * scl * Math.sin(t1 + t2);
  const c1x = (pivX + x1) / 2, c1y = (pivY + y1) / 2;
  const c2x = (x1 + x2) / 2, c2y = (y1 + y2) / 2;

  // g1(θ1) plot, all other knobs held at their current values
  const pl = { x0: 500, x1: 738, y0: 335, y1: 225 };
  const gAbsMax = m1 * G * lc1 + m2 * G * (L1 + lc2); // hard bound, θ-independent
  const mapA = (deg: number) => pl.x0 + ((deg + 90) / 265) * (pl.x1 - pl.x0);
  const mapG = (v: number) => (pl.y0 + pl.y1) / 2 - (v / gAbsMax) * ((pl.y0 - pl.y1) / 2);
  const NP = 54;
  let peakDeg = -90, peakVal = 0;
  const gPath = Array.from({ length: NP + 1 }, (_, i) => {
    const deg = -90 + (i / NP) * 265;
    const v = g1of((deg * Math.PI) / 180);
    if (Math.abs(v) > Math.abs(peakVal)) { peakVal = v; peakDeg = deg; }
    return `${i === 0 ? "M" : "L"} ${mapA(deg).toFixed(1)} ${mapG(v).toFixed(1)}`;
  }).join(" ");

  const gravMet = showGravity && Math.abs(g1) >= G1_TARGET;

  return (
    <>
      <WidgetShell
        title="2-link arm dynamics"
        onReset={() => { setTh1(90); setTh2(0); setW1(0); setW2(0); setL1(1.0); setL2(0.8); setM1(2.0); setM2(1.5); }}
        caption="The manipulator equation M(θ)θ̈ + C(θ,θ̇)θ̇ + g(θ) = τ, live. Red arrows are the link weights (shared scale, legend bottom-left); purple arcs are the holding torques at each joint, fatter and longer as |τ| grows. Bottom-right: g₁ as a function of θ₁ with the gold ±28 N·m challenge lines — the gold dot marks the worst-case pose. Give the joints velocity with the θ̇ sliders and watch the Coriolis terms wake up."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <defs>
            <marker id="rb-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={RED} />
            </marker>
            <marker id="rb-tq" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={PURPLE} />
            </marker>
          </defs>

          {/* ground */}
          <line x1={pivX - 34} y1={pivY} x2={pivX + 34} y2={pivY} stroke="#8a8a9b" strokeWidth={3} />
          {[...Array(4)].map((_, i) => (
            <line key={i} x1={pivX - 24 + i * 16} y1={pivY} x2={pivX - 30 + i * 16} y2={pivY + 12} stroke="#c4c0b4" strokeWidth={1.5} />
          ))}

          {/* angle arc for θ1 */}
          <path d={`M ${pivX + 36},${pivY} A 36,36 0 0 0 ${pivX + 36 * Math.cos(t1)},${pivY - 36 * Math.sin(t1)}`}
            fill="none" stroke="#8a8a9b" strokeWidth={1.4} opacity={0.7} />
          <text x={pivX + 48 * Math.cos(t1 / 2)} y={pivY - 48 * Math.sin(t1 / 2) + 4} textAnchor="middle" className="ui text-[10.5px] fill-[#8a8a9b]">θ₁</text>

          {/* links */}
          <line x1={pivX} y1={pivY} x2={x1} y2={y1} stroke={BLUE} strokeWidth={13} strokeLinecap="round" />
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ORANGE} strokeWidth={10} strokeLinecap="round" />
          <circle cx={pivX} cy={pivY} r={8} fill="#50525e" stroke="#fff" strokeWidth={2} />
          <circle cx={x1} cy={y1} r={7} fill={ORANGE} stroke="#fff" strokeWidth={2} />
          <circle cx={x2} cy={y2} r={6} fill={ORANGE} stroke="#fff" strokeWidth={2} />

          {/* weights at link centers, one scale */}
          {showGravity && (
            <>
              <line x1={c1x} y1={c1y} x2={c1x} y2={c1y + m1 * G * PX_PER_N} stroke={RED} strokeWidth={3} markerEnd="url(#rb-g)" />
              <text x={c1x + 7} y={c1y + m1 * G * PX_PER_N + 3} className="ui text-[9.5px]" fill={RED}>{(m1 * G).toFixed(0)} N</text>
              <line x1={c2x} y1={c2y} x2={c2x} y2={c2y + m2 * G * PX_PER_N} stroke={RED} strokeWidth={3} markerEnd="url(#rb-g)" />
              <text x={c2x + 7} y={c2y + m2 * G * PX_PER_N + 3} className="ui text-[9.5px]" fill={RED}>{(m2 * G).toFixed(0)} N</text>
            </>
          )}

          {/* holding-torque arcs */}
          <TorqueArc cx={pivX} cy={pivY} tau={tau1} label={`τ₁ = ${tau1.toFixed(1)} N·m`} labelDy={40} />
          <TorqueArc cx={x1} cy={y1} tau={tau2} label={`τ₂ = ${tau2.toFixed(1)} N·m`} labelDy={-32} />

          {/* arrow-scale legend */}
          <rect x={14} y={300} width={130} height={46} rx={8} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <line x1={24} y1={318} x2={24 + 20 * PX_PER_N} y2={318} stroke={RED} strokeWidth={3} markerEnd="url(#rb-g)" />
          <text x={24 + 20 * PX_PER_N + 6} y={321.5} className="ui text-[9.5px] fill-[#8a8a9b]">= 20 N weight</text>
          <path d="M 30 336 A 8 8 0 1 1 38 330" fill="none" stroke={PURPLE} strokeWidth={2} markerEnd="url(#rb-tq)" />
          <text x={46} y={339} className="ui text-[9.5px] fill-[#8a8a9b]">joint torque</text>

          {/* dynamics terms card */}
          <rect x={490} y={14} width={256} height={196} rx={9} fill="#ffffff" opacity={0.92} stroke="#d8d4c8" />
          <text x={504} y={36} className="ui text-[10.5px] font-bold fill-[#8a8a9b]" letterSpacing="1.2">DYNAMICS TERMS</text>
          <text x={504} y={56} className="ui text-[11px] font-semibold" fill={PURPLE}>mass matrix M(θ) (kg·m²)</text>
          <text x={504} y={73} className="ui text-[11px] fill-[#4b4b5e]">M₁₁ = {M11.toFixed(2)}   M₁₂ = {M12.toFixed(2)}   M₂₂ = {M22.toFixed(2)}</text>
          <text x={504} y={96} className="ui text-[11px] font-semibold" fill={ORANGE}>Coriolis / centrifugal (N·m)</text>
          <text x={504} y={113} className="ui text-[11px] fill-[#4b4b5e]">C₁θ̇ = {C1.toFixed(2)}   C₂θ̇ = {C2.toFixed(2)}</text>
          <text x={504} y={128} className="ui text-[9.5px] fill-[#8a8a9b]">{w1 === 0 && w2 === 0 ? "zero — the joints aren't moving" : "alive — velocities are coupling"}</text>
          <text x={504} y={149} className="ui text-[11px] font-semibold" fill={RED}>gravity g(θ) (N·m)</text>
          <text x={504} y={166} className="ui text-[11px] fill-[#4b4b5e]">g₁ = {g1.toFixed(1)}   g₂ = {g2.toFixed(1)}</text>
          <line x1={504} y1={176} x2={732} y2={176} stroke="#e4e1d8" />
          <text x={504} y={196} className="ui text-[12px] font-bold" fill={PURPLE}>
            τ₁ = {tau1.toFixed(1)}   τ₂ = {tau2.toFixed(1)} N·m  (θ̈ = 0)
          </text>

          {/* g1(θ1) plot */}
          <line x1={pl.x0} y1={pl.y0} x2={pl.x0} y2={pl.y1} stroke="#b6b2a4" strokeWidth={1.3} />
          <line x1={pl.x0} y1={(pl.y0 + pl.y1) / 2} x2={pl.x1} y2={(pl.y0 + pl.y1) / 2} stroke="#b6b2a4" strokeWidth={1.3} />
          {[-90, 0, 90, 175].map(d => (
            <g key={d}>
              <line x1={mapA(d)} y1={(pl.y0 + pl.y1) / 2 - 3} x2={mapA(d)} y2={(pl.y0 + pl.y1) / 2 + 3} stroke="#b6b2a4" />
              <text x={mapA(d)} y={pl.y0 + 12} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9px]">{d}°</text>
            </g>
          ))}
          <text x={pl.x0 - 6} y={pl.y1 + 8} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9px]">{gAbsMax.toFixed(0)}</text>
          <text x={pl.x0 - 6} y={pl.y0} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9px]">−{gAbsMax.toFixed(0)}</text>
          <text x={pl.x1} y={pl.y1 - 6} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10px]">g₁(θ₁) N·m</text>
          {/* gold target lines */}
          {G1_TARGET < gAbsMax && (
            <>
              <line x1={pl.x0} y1={mapG(G1_TARGET)} x2={pl.x1} y2={mapG(G1_TARGET)} stroke={GOLD} strokeWidth={1.3} strokeDasharray="4 3" />
              <line x1={pl.x0} y1={mapG(-G1_TARGET)} x2={pl.x1} y2={mapG(-G1_TARGET)} stroke={GOLD} strokeWidth={1.3} strokeDasharray="4 3" />
              <text x={pl.x1} y={mapG(G1_TARGET) - 4} textAnchor="end" className="ui text-[9px]" fill="#8a6d12">±{G1_TARGET} N·m target</text>
            </>
          )}
          <path d={gPath} fill="none" stroke={RED} strokeWidth={2.2} />
          {/* gold peak marker */}
          <circle cx={mapA(peakDeg)} cy={mapG(peakVal)} r={4} fill={GOLD} stroke="#fff" strokeWidth={1.3} />
          <text x={mapA(peakDeg)} y={mapG(peakVal) - 8} textAnchor="middle" className="ui text-[9px]" fill="#8a6d12">worst pose</text>
          {/* live dot */}
          <circle cx={mapA(th1)} cy={mapG(g1)} r={5} fill={gravMet ? GOLD : RED} stroke="#fff" strokeWidth={1.8} />
        </svg>
        <ControlBar>
          <LabeledSlider label="θ₁" value={th1} min={-90} max={175} step={1} onChange={setTh1}
            fmt={v => `${v.toFixed(0)}°`} color={BLUE} width={130} />
          <LabeledSlider label="θ₂" value={th2} min={-170} max={170} step={1} onChange={setTh2}
            fmt={v => `${v.toFixed(0)}°`} color={ORANGE} width={130} />
          <LabeledSlider label="θ̇₁" value={w1} min={-3} max={3} step={0.1} onChange={setW1}
            fmt={v => `${v.toFixed(1)} rad/s`} color={BLUE} width={110} />
          <LabeledSlider label="θ̇₂" value={w2} min={-3} max={3} step={0.1} onChange={setW2}
            fmt={v => `${v.toFixed(1)} rad/s`} color={ORANGE} width={110} />
          <LabeledSlider label="L₁" value={L1} min={0.3} max={1.5} step={0.05} onChange={setL1}
            fmt={v => `${v.toFixed(2)} m`} width={100} />
          <LabeledSlider label="L₂" value={L2} min={0.3} max={1.5} step={0.05} onChange={setL2}
            fmt={v => `${v.toFixed(2)} m`} width={100} />
          <LabeledSlider label="m₁" value={m1} min={0.1} max={5} step={0.1} onChange={setM1}
            fmt={v => `${v.toFixed(1)} kg`} color={BLUE} width={100} />
          <LabeledSlider label="m₂" value={m2} min={0.1} max={5} step={0.1} onChange={setM2}
            fmt={v => `${v.toFixed(1)} kg`} color={ORANGE} width={100} />
          <WidgetButton onClick={() => setShowGravity(v => !v)} active={showGravity}>gravity</WidgetButton>
          <WidgetButton onClick={() => setShowCoriolis(v => !v)} active={showCoriolis}>Coriolis</WidgetButton>
          <Readout label="g₁" value={`${g1.toFixed(1)} N·m`} color={RED} />
          <Readout label="τ₁" value={`${tau1.toFixed(1)} N·m`} color={PURPLE} />
          <Readout label="τ₂" value={`${tau2.toFixed(1)} N·m`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys10-gravity-comp" met={gravMet}>
        The arm starts pointing straight up, where gravity costs the shoulder nothing. Swing
        θ₁ down toward horizontal until <M>{"|g_1| \\geq 28"}</M> N·m — the live dot crossing
        the gold line in the g₁(θ₁) plot. With the default masses the flat-out worst pose reads
        ≈ 30.4 N·m, exactly the Worked example's number: that is the torque a gravity-compensation
        controller must supply forever, just to keep the arm from falling.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Coriolis effect explorer — physical turntable
// ------------------------------------------------------------------
const R_DISC = 2.0; // m
const R0 = 0.5; // m — launch radius
const SCL = 75; // px per m
const DEFL_TARGET = 90; // degrees
const F_PX_PER_N = 3;

type CorSnap = { x: number; y: number; defl: number; vx: number; vy: number; exited: boolean };

function CoriolisExplorer() {
  const [omega, setOmega] = useState(1.5);
  const [vr, setVr] = useState(2.0);
  const [mass, setMass] = useState(1);
  const [running, setRunning] = useState(false);
  const tRef = useRef(0);
  const prevRef = useRef<{ x: number; y: number; phi: number }>({ x: R0, y: 0, phi: 0 });
  const pathRef = useRef<[number, number][]>([]);
  const rafRef = useRef<number>(0);
  const [snap, setSnap] = useState<CorSnap>({ x: R0, y: 0, defl: 0, vx: vr, vy: 0, exited: false });

  function reset() {
    setRunning(false);
    tRef.current = 0;
    prevRef.current = { x: R0, y: 0, phi: 0 };
    pathRef.current = [];
    setSnap({ x: R0, y: 0, defl: 0, vx: vr, vy: 0, exited: false });
  }

  useEffect(() => { reset(); }, [omega, vr]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    function step(now: number) {
      const dt = Math.min((now - last) / 1000, 0.025);
      last = now;
      const t = tRef.current + dt;
      tRef.current = t;
      // inertial frame: straight line, launched co-rotating from (R0, 0)
      const xi = R0 + vr * t;
      const yi = omega * R0 * t;
      // view in the rotating frame: rotate by −ωt
      const c = Math.cos(-omega * t), s = Math.sin(-omega * t);
      const xr = xi * c - yi * s;
      const yr = xi * s + yi * c;
      const prev = prevRef.current;
      // unwrapped angular deflection from the launch ray
      const phi = Math.atan2(yr, xr);
      let dphi = phi - (((prev.phi % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      if (dphi > Math.PI) dphi -= 2 * Math.PI;
      if (dphi < -Math.PI) dphi += 2 * Math.PI;
      const defl = prev.phi + dphi;
      const vx = (xr - prev.x) / dt, vy = (yr - prev.y) / dt;
      prevRef.current = { x: xr, y: yr, phi: defl };
      pathRef.current.push([xr, yr]);
      if (pathRef.current.length > 900) pathRef.current.shift();
      const r = Math.hypot(xr, yr);
      if (r >= R_DISC) {
        setSnap({ x: (xr / r) * R_DISC, y: (yr / r) * R_DISC, defl, vx, vy, exited: true });
        setRunning(false);
        return;
      }
      setSnap({ x: xr, y: yr, defl, vx, vy, exited: false });
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, omega, vr]);

  const cx = 205, cy = 185;
  const toPx = (x: number, y: number): [number, number] => [cx + x * SCL, cy - y * SCL];
  const [px, py] = toPx(snap.x, snap.y);
  const trace = pathRef.current.length > 2
    ? pathRef.current.map((p, i) => {
        const [tx, ty] = toPx(p[0], p[1]);
        return `${i === 0 ? "M" : "L"} ${tx.toFixed(1)} ${ty.toFixed(1)}`;
      }).join(" ")
    : "";

  // straight inertial path, drawn to where it leaves the disc
  const vix = vr, viy = omega * R0;
  const a = vix * vix + viy * viy;
  const b = 2 * R0 * vix;
  const cq = R0 * R0 - R_DISC * R_DISC;
  const tExit = (-b + Math.sqrt(b * b - 4 * a * cq)) / (2 * a);
  const [ex, ey] = toPx(R0 + vix * tExit, viy * tExit);
  const [lx, ly] = toPx(R0, 0);

  // Coriolis force on the particle (rotating frame): F = 2mω (v_y, −v_x)
  const speedRel = Math.hypot(snap.vx, snap.vy);
  const Fc = 2 * mass * omega * (tRef.current > 0 ? speedRel : vr);
  const fx = 2 * mass * omega * snap.vy;
  const fy = -2 * mass * omega * snap.vx;
  const fLen = Math.hypot(fx, fy);
  const fDraw = Math.min(60, fLen * F_PX_PER_N);
  const deflDeg = Math.abs(snap.defl) * (180 / Math.PI);
  const deflMet = deflDeg >= DEFL_TARGET;

  // gold deflection arc from the launch ray to the current bearing
  const rCur = Math.max(0.2, Math.hypot(snap.x, snap.y));
  const deflClamped = Math.max(-1.94 * Math.PI, Math.min(1.94 * Math.PI, snap.defl));
  const [ax0, ay0] = toPx(rCur, 0);
  const [ax1, ay1] = toPx(rCur * Math.cos(deflClamped), rCur * Math.sin(deflClamped));
  const arcLarge = Math.abs(deflClamped) > Math.PI ? 1 : 0;
  const arcSweep = deflClamped > 0 ? 0 : 1;

  return (
    <>
      <WidgetShell
        title="Coriolis effect on a turntable"
        onReset={reset}
        caption="A 2 m turntable spinning at ω. A ball is launched from the gold ring at r = 0.5 m, sliding outward at v_r while co-rotating. Seen from outside (green dashed) it travels dead straight; seen riding the disc (purple) it curls — the gold arc measures the deflection. The orange arrow is the Coriolis force −2mω × v, always at right angles to the rotating-frame velocity."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <defs>
            <marker id="cor-f" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={ORANGE} />
            </marker>
            <marker id="cor-w" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={BLUE} />
            </marker>
          </defs>

          {/* disc with metric rings */}
          <circle cx={cx} cy={cy} r={R_DISC * SCL} fill="#f4f1fb" stroke="#c4b8ef" strokeWidth={1.6} />
          {[0.5, 1, 1.5].map(r => (
            <g key={r}>
              <circle cx={cx} cy={cy} r={r * SCL} fill="none" stroke="#ddd7f2" strokeWidth={1} />
              <text x={cx + r * SCL + 3} y={cy - 4} className="ui text-[8.5px] fill-[#9a93b8]">{r} m</text>
            </g>
          ))}
          <text x={cx + R_DISC * SCL + 3} y={cy - 4} className="ui text-[8.5px] fill-[#9a93b8]">2 m</text>
          {[0, 60, 120, 180, 240, 300].map(aDeg => (
            <line key={aDeg} x1={cx} y1={cy}
              x2={cx + R_DISC * SCL * Math.cos((aDeg * Math.PI) / 180)}
              y2={cy - R_DISC * SCL * Math.sin((aDeg * Math.PI) / 180)}
              stroke="#e4def5" strokeWidth={1} />
          ))}
          {/* ω arrow */}
          <path d={`M ${cx + 26},${cy} A 26,26 0 0 0 ${cx + 26 * Math.cos(1.1)},${cy - 26 * Math.sin(1.1)}`}
            fill="none" stroke={BLUE} strokeWidth={2.4} markerEnd="url(#cor-w)" />
          <text x={cx + 34} y={cy - 30} className="ui text-[11px] font-semibold" fill={BLUE}>ω</text>

          {/* straight path seen from outside */}
          <line x1={lx} y1={ly} x2={ex} y2={ey} stroke={GREEN} strokeWidth={2} strokeDasharray="7 5" opacity={0.7} />

          {/* launch point */}
          <circle cx={lx} cy={ly} r={7} fill="none" stroke={GOLD} strokeWidth={2.5} />

          {/* gold deflection arc */}
          {Math.abs(snap.defl) > 0.03 && (
            <>
              <path d={`M ${ax0.toFixed(1)} ${ay0.toFixed(1)} A ${(rCur * SCL).toFixed(1)} ${(rCur * SCL).toFixed(1)} 0 ${arcLarge} ${arcSweep} ${ax1.toFixed(1)} ${ay1.toFixed(1)}`}
                fill="none" stroke={GOLD} strokeWidth={2.4} opacity={0.85} />
              <text x={cx} y={cy + R_DISC * SCL + 14} textAnchor="middle" className="ui text-[10.5px] font-semibold" fill="#8a6d12">
                deflected {deflDeg.toFixed(0)}°{deflMet ? " — past the 90° target" : ""}
              </text>
            </>
          )}

          {/* rotating-frame trace + ball */}
          {trace && <path d={trace} fill="none" stroke={PURPLE} strokeWidth={2.4} strokeLinecap="round" />}
          <circle cx={px} cy={py} r={9} fill={ORANGE} stroke="#fff" strokeWidth={2} />
          {/* Coriolis force arrow */}
          {running && fLen > 0.1 && (
            <line x1={px} y1={py} x2={px + (fx / fLen) * fDraw} y2={py - (fy / fLen) * fDraw}
              stroke={ORANGE} strokeWidth={3} markerEnd="url(#cor-f)" />
          )}
          {/* exit marker */}
          {snap.exited && (
            <>
              <circle cx={px} cy={py} r={7} fill={GOLD} stroke="#fff" strokeWidth={2} />
              <text x={px + 12} y={py + 4} className="ui text-[10.5px] font-semibold" fill="#8a6d12">
                flew off at {deflDeg.toFixed(0)}°
              </text>
            </>
          )}

          {/* legend card */}
          <rect x={412} y={20} width={332} height={104} rx={9} fill="#ffffff" opacity={0.92} stroke="#d8d4c8" />
          <line x1={426} y1={40} x2={452} y2={40} stroke={GREEN} strokeWidth={2} strokeDasharray="6 4" />
          <text x={460} y={43.5} className="ui text-[10.5px] fill-[#4b4b5e]">the ball's path seen from outside — straight</text>
          <line x1={426} y1={60} x2={452} y2={60} stroke={PURPLE} strokeWidth={2.4} />
          <text x={460} y={63.5} className="ui text-[10.5px] fill-[#4b4b5e]">the same journey, seen riding the disc</text>
          <line x1={426} y1={80} x2={448} y2={80} stroke={ORANGE} strokeWidth={3} markerEnd="url(#cor-f)" />
          <text x={460} y={83.5} className="ui text-[10.5px] fill-[#4b4b5e]">Coriolis force (3 px per N)</text>
          <line x1={426} y1={100} x2={452} y2={100} stroke={GOLD} strokeWidth={2.4} />
          <text x={460} y={103.5} className="ui text-[10.5px] fill-[#4b4b5e]">deflection arc — the challenge meter</text>

          {/* readout card */}
          <rect x={412} y={140} width={332} height={118} rx={9} fill="#ffffff" opacity={0.92} stroke="#d8d4c8" />
          <text x={426} y={162} className="ui text-[10.5px] font-bold fill-[#8a8a9b]" letterSpacing="1.2">ROTATING-FRAME BOOKKEEPING</text>
          <text x={426} y={184} className="ui text-[11.5px] fill-[#4b4b5e]">|v_rel| = {(tRef.current > 0 ? speedRel : vr).toFixed(2)} m/s</text>
          <text x={426} y={204} className="ui text-[12px] font-bold" fill={ORANGE}>F_Cor = 2mω|v_rel| = {Fc.toFixed(2)} N</text>
          <text x={426} y={226} className="ui text-[13px] font-bold" fill={deflMet ? "#b08c1d" : "#4b4b5e"}>
            deflection: {deflDeg.toFixed(0)}° {deflMet ? "✓" : `(target ${DEFL_TARGET}°)`}
          </text>
          <text x={426} y={248} className="ui text-[10px] fill-[#8a8a9b]">
            slow crossings on fast discs deflect the most — τ ∝ time spent aboard
          </text>
        </svg>
        <ControlBar>
          <WidgetButton onClick={() => { if (snap.exited) reset(); setRunning(r => !r); }} active={running}>
            {running ? "Pause" : snap.exited ? "Relaunch" : "Launch"}
          </WidgetButton>
          <LabeledSlider label="ω (disc)" value={omega} min={0.2} max={4} step={0.05} onChange={setOmega}
            fmt={v => `${v.toFixed(2)} rad/s`} color={BLUE} width={170} />
          <LabeledSlider label="v_r (outward)" value={vr} min={0.2} max={3} step={0.05} onChange={setVr}
            fmt={v => `${v.toFixed(2)} m/s`} color={PURPLE} width={170} />
          <LabeledSlider label="mass" value={mass} min={0.1} max={3} step={0.05} onChange={setMass}
            fmt={v => `${v.toFixed(2)} kg`} width={120} />
          <Readout label="F_Cor" value={`${Fc.toFixed(2)} N`} color={ORANGE} />
          <Readout label="deflection" value={`${deflDeg.toFixed(0)}°`} color={GOLD} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys10-coriolis-deflect" met={deflMet}>
        Launch the ball and make it deflect by more than <strong>90°</strong> in the rotating
        frame before it slides off the disc. The defaults curl it only ~45° — you need a{" "}
        <em>fast disc</em> and a <em>slow crossing</em> (high ω, low v_r): the Coriolis force
        gets more time to act. Notice the green line never changes — the "force" exists only
        in the spinning bookkeeping.
      </Challenge>
    </>
  );
}

export default function RoboticsB() {
  return (
    <div>
      <PageHeader
        chapter="Physics 10"
        section="College Physics & Dynamics"
        title="Dynamics for Robotics"
        lede="Robot dynamics combines Lagrangian mechanics and rigid body inertia into a single equation: M(θ)θ̈ + C(θ,θ̇)θ̇ + g(θ) = τ. Each term has a clear physical interpretation."
      />

      <p>
        Hold your arm straight out to the side. Within a minute your shoulder burns — it is
        producing a constant torque against gravity just to hold still. Now imagine you are
        the motor controller for a robot shoulder: how much torque, exactly, and how does it
        change as the elbow bends? This module is the capstone of the physics track — every
        piece you've built (Newton, energy, torque, moment of inertia, Lagrange) assembles
        here into the single equation that runs every robot arm. Apply the Euler-Lagrange
        crank from Module 8 to a chain of rigid links and the answer always organizes itself
        as the <strong>manipulator equation of motion</strong>:
      </p>
      <Eq>{"M(\\theta)\\ddot{\\theta} + C(\\theta,\\dot{\\theta})\\dot{\\theta} + g(\\theta) = \\tau."}</Eq>
      <p>
        Read it back, term by term. <strong><M>{"M(\\theta)"}</M></strong> is the{" "}
        <strong>mass matrix</strong> — the arm's moment of inertia grown up into a matrix,
        because in a chain, accelerating one joint drags mass around every other joint too;
        it depends on the pose <M>{"\\theta"}</M> because an outstretched arm carries its
        mass farther from the axes (the skater effect from Module 5).{" "}
        <strong><M>{"C(\\theta,\\dot\\theta)\\dot\\theta"}</M></strong> collects the
        velocity-coupling (Coriolis and centrifugal) torques that appear only while moving.{" "}
        <strong><M>{"g(\\theta)"}</M></strong> is the gravity torque at each joint — your
        burning shoulder. And <M>{"\\tau"}</M> is what the motors must supply.
      </p>

      <p>
        <strong>Try this:</strong> the arm starts pointing straight up, where holding still is
        free. Swing θ₁ down to horizontal (θ₁ = 0°, θ₂ = 0°) and watch the purple torque arc
        at the shoulder fatten as <M>{"g_1"}</M> rides the red curve to its gold "worst pose"
        marker. Fold the elbow (θ₂ toward ±170°) and watch both <M>{"g_1"}</M> <em>and</em>{" "}
        <M>{"M_{11}"}</M> drop — the same fold helps the shoulder twice, against gravity and
        against inertia. Finally give the joints some speed with the θ̇ sliders: the Coriolis
        line in the card wakes up, torque the motors must supply even though nothing is
        accelerating.
      </p>

      <TwoLinkArmDynamics />

      <Worked title="The burning-shoulder number">
        <p>
          <strong>Given.</strong> The widget's arm (m₁ = 2 kg, L₁ = 1 m, m₂ = 1.5 kg,
          L₂ = 0.8 m) held straight out horizontally. What torque does the shoulder motor
          hold?
        </p>
        <p>
          <strong>Set up.</strong> Each link's weight acts at its center:{" "}
          <M>{"g_1 = m_1 g \\tfrac{L_1}{2} + m_2 g\\left(L_1 + \\tfrac{L_2}{2}\\right)"}</M>.
        </p>
        <p>
          <strong>Solve.</strong>{" "}
          <M>{"g_1 = 2(9.81)(0.5) + 1.5(9.81)(1.4) \\approx 9.8 + 20.6 = 30.4"}</M> N·m.
        </p>
        <p>
          <strong>Check.</strong> Set θ₁ = 0°, θ₂ = 0° in the widget and read g₁ — it should
          say ≈ 30.4. Note the far link contributes twice as much despite weighing less:
          lever arm beats mass. This is why real robot forearms are skinny and shoulder
          motors are huge.
        </p>
      </Worked>

      <H2>The Coriolis effect</H2>
      <p>
        When an object moves inside a rotating reference frame — like a link moving relative
        to the base frame of a spinning robot — it experiences a fictitious Coriolis force:
      </p>
      <Eq>{"\\mathbf{F}_{\\text{Cor}} = -2m\\boldsymbol{\\omega} \\times \\mathbf{v}_{\\text{rel}}."}</Eq>
      <p>
        In robot dynamics the Coriolis matrix <M>{"C(\\theta,\\dot\\theta)"}</M> captures
        these coupling effects between joint velocities. When one joint spins fast while
        another moves, large coupling torques appear. ("Fictitious" doesn't mean fake — the
        torque the motor must supply is perfectly real; it means the force appears only
        because you insisted on doing your bookkeeping in a rotating frame.)
      </p>

      <p>
        <strong>Try this:</strong> launch the ball and watch the same journey from two points
        of view at once — the dashed green line is the honest straight path seen from outside,
        the purple curve is what an observer riding the turntable records, and the gold arc
        keeps score of the disagreement. Crank ω up and slow v_r down and the curl tightens
        into a hook. Watch the orange Coriolis arrow: it stays exactly perpendicular to the
        purple path, which is why it bends the path without ever speeding the ball up.
      </p>

      <CoriolisExplorer />

      <KeyIdea>
        Gravity compensation — commanding <M>{"\\tau = g(\\theta)"}</M> — is the simplest
        model-based controller. It makes the robot "weightless" so the arm floats at any
        configuration. Every more sophisticated controller adds inertia and Coriolis
        compensation on top.
      </KeyIdea>

      <H2>The mass matrix and manipulability</H2>
      <p>
        The mass matrix <M>{"M(\\theta)"}</M> changes with configuration. When the arm is
        outstretched, <M>{"M_{11}"}</M> is large — joint 1 must move the entire extended
        arm. Near the shoulder (small <M>{"\\theta_1"}</M>), <M>{"M_{11}"}</M> is smaller.
        The manipulability ellipsoid from Chapter 5 is the inverse of the generalized
        inertia seen by the task-space force.
      </p>
      <Eq>{"\\Lambda(\\theta) = (J M^{-1} J^T)^{-1} \\quad \\text{(operational space inertia)}."}</Eq>

      <Aside>
        The Chapter 8 manipulator dynamics (Modern Robotics textbook) derives <M>{"M"}</M>,{" "}
        <M>{"C"}</M>, and <M>{"g"}</M> using the spatial momentum formulation and Newton-Euler
        recursion. This page shows the same physics through the Lagrangian lens — when you
        reach Chapter 8, you'll re-meet the challenges above in the book's own notation.
      </Aside>

      <Quiz
        challengeId="phys10-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: (
              <>
                A robot arm is holding perfectly still (<M>{"\\dot\\theta = \\ddot\\theta = 0"}</M>).
                What must the motors supply?
              </>
            ),
            options: [
              { label: "τ = g(θ) — exactly the gravity torques, nothing else", correct: true },
              { label: "τ = 0 — nothing is moving" },
              { label: "The full M, C, and g terms" },
              { label: "Only the Coriolis torques" },
            ],
            explain:
              "With zero velocity and acceleration, the M and C terms vanish and the equation collapses to τ = g(θ). Holding still is real work — ask your shoulder.",
          },
          {
            prompt: <>Why does the mass matrix M depend on the configuration θ?</>,
            options: [
              {
                label: "The links' mass sits at different distances from the joint axes in different poses",
                correct: true,
              },
              { label: "The links' masses change as the arm moves" },
              { label: "It doesn't — mass is constant" },
              { label: "Because gravity is stronger in some poses" },
            ],
            explain:
              "Moment of inertia is Σmr² — same masses, different r as the arm folds and extends. The skater pulling her arms in is a robot changing its own M(θ).",
          },
          {
            prompt: (
              <>
                When are the Coriolis/centrifugal torques{" "}
                <M>{"C(\\theta,\\dot\\theta)\\dot\\theta"}</M> exactly zero?
              </>
            ),
            options: [
              { label: "Whenever the arm's joints aren't moving", correct: true },
              { label: "Whenever the arm is fully extended" },
              { label: "Never — they always act" },
              { label: "Only in zero gravity" },
            ],
            explain:
              "Every term in C is built from products of joint velocities: F = 2mωv needs motion in a rotating frame. Slow robots can often ignore C; fast ones cannot.",
          },
        ]}
      />

      <H2>Where you go from here</H2>
      <p>
        You now hold every physical idea Modern Robotics assumes. Chapter 2 starts the book
        proper by asking the deceptively simple question "how many numbers does it take to say
        where a robot is?" — and everything you've built here (frames from Module 1, torque
        and inertia from Module 5, the Lagrangian crank from Module 8, this equation from
        Module 10) will resurface with sharper notation as the book unfolds. When Chapter 8's
        derivations feel dense, come back to this page: the widget above <em>is</em> that
        chapter, in miniature.
      </p>

      <BookRef>
        Physics track · Module 10 of 10: Lagrangian robot dynamics, mass matrix, Coriolis
        terms, gravity compensation, operational-space control. Bridges directly to MR §8
        (dynamics) and §11 (control).
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
