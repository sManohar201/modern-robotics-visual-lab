import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";

const W = 760;
const H = 360;
const RED = "#d9483f";
const BLUE = "#3b6fd4";
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";
const GOLD = "#caa53d";
const G = 9.81;

/** One shared requestAnimationFrame loop (see Foundations.tsx). */
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

// ------------------------------------------------------------------
// Newton vs Lagrange — simple pendulum
// ------------------------------------------------------------------
function NewtonVsLagrange() {
  const [L, setL] = useState(1.2);
  const [th, setTh] = useState(35);

  const thR = (th * Math.PI) / 180;
  const alpha_L = -(G / L) * Math.sin(thR); // exact equation of motion
  const alpha_small = -(G / L) * thR; // small-angle approximation
  const errPct = th > 0.5 ? (thR / Math.sin(thR) - 1) * 100 : 0;

  // pendulum drawing (top left)
  const pivX = 215;
  const pivY = 48;
  const rodLen = L * Math.min(120, 165 / L); // clamp so long pendulums stay on canvas
  const bobX = pivX + rodLen * Math.sin(thR);
  const bobY = pivY + rodLen * Math.cos(thR);

  // force decomposition at the bob (m = 1 kg, fixed)
  const FSC = 48; // px for mg
  const tanMag = FSC * Math.sin(thR);
  const tanVec: [number, number] = [-tanMag * Math.cos(thR), tanMag * Math.sin(thR)];
  const radMag = FSC * Math.cos(thR);
  const radVec: [number, number] = [radMag * Math.sin(thR), radMag * Math.cos(thR)];

  // α(θ) plot (bottom left): exact vs small-angle, θ ∈ [0, 180°]
  const pj = { x0: 62, x1: 406, y0: 248, y1: 334 };
  const yMax = (G / L) * Math.PI; // magnitude of the linear line at 180°
  const mapTh = (t: number) => pj.x0 + (t / Math.PI) * (pj.x1 - pj.x0);
  const mapAl = (a: number) => pj.y0 + (-a / yMax) * (pj.y1 - pj.y0);
  const NS = 60;
  const exactPath = Array.from({ length: NS + 1 }, (_, i) => {
    const t = (i / NS) * Math.PI;
    return `${i === 0 ? "M" : "L"} ${mapTh(t).toFixed(1)} ${mapAl(-(G / L) * Math.sin(t)).toFixed(1)}`;
  }).join(" ");
  const linPath = `M ${mapTh(0).toFixed(1)} ${mapAl(0).toFixed(1)} L ${mapTh(Math.PI).toFixed(1)} ${mapAl(-(G / L) * Math.PI).toFixed(1)}`;

  const smallAngleMet = errPct >= 15;

  return (
    <>
      <WidgetShell
        title="Newton vs. Lagrange — simple pendulum"
        onReset={() => { setL(1.2); setTh(35); }}
        caption="Left: Newton's picture — mg resolved into a tangential piece (orange, the only one that matters) and an along-rod piece (dashed) that the tension cancels. Right: the Lagrange crank, which never meets the tension. Bottom plot: the exact θ̈ = −(g/L) sin θ against the small-angle line −(g/L) θ — the gold gap is the error of pretending a pendulum is a harmonic oscillator."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <defs>
            <marker id="nvl-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={RED} />
            </marker>
            <marker id="nvl-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={ORANGE} />
            </marker>
            <marker id="nvl-r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#8a8576" />
            </marker>
          </defs>

          {/* ceiling + pivot */}
          <line x1={pivX - 46} y1={pivY} x2={pivX + 46} y2={pivY} stroke="#8a8a9b" strokeWidth={2.5} />
          {[...Array(6)].map((_, i) => (
            <line key={i} x1={pivX - 40 + i * 16} y1={pivY} x2={pivX - 48 + i * 16} y2={pivY - 10} stroke="#c4c0b4" strokeWidth={1.4} />
          ))}
          {/* vertical reference */}
          <line x1={pivX} y1={pivY} x2={pivX} y2={pivY + rodLen + 18} stroke="#d9d5ca" strokeWidth={1.4} strokeDasharray="5 5" />
          {/* angle arc */}
          {th > 3 && (
            <>
              <path
                d={`M ${pivX} ${pivY + 34} A 34 34 0 0 0 ${(pivX + 34 * Math.sin(thR)).toFixed(1)} ${(pivY + 34 * Math.cos(thR)).toFixed(1)}`}
                fill="none" stroke={PURPLE} strokeWidth={1.6} opacity={0.7}
              />
              <text x={pivX + 48 * Math.sin(thR / 2)} y={pivY + 48 * Math.cos(thR / 2) + 4} textAnchor="middle" className="ui text-[11.5px]" fill={PURPLE}>θ</text>
            </>
          )}
          {/* rod + bob */}
          <line x1={pivX} y1={pivY} x2={bobX} y2={bobY} stroke="#50525e" strokeWidth={4} strokeLinecap="round" />
          <circle cx={pivX} cy={pivY} r={6.5} fill="#50525e" stroke="#fff" strokeWidth={2} />
          <circle cx={bobX} cy={bobY} r={16} fill={PURPLE} opacity={0.85} stroke="#fff" strokeWidth={2.5} />
          <text x={bobX} y={bobY + 4.5} textAnchor="middle" className="ui text-[11px] fill-white">m</text>

          {/* weight and its decomposition */}
          <line x1={bobX} y1={bobY} x2={bobX} y2={bobY + FSC} stroke={RED} strokeWidth={3.5} markerEnd="url(#nvl-w)" />
          <text x={bobX + 7} y={bobY + FSC + 2} className="ui text-[11px]" fill={RED}>mg</text>
          {th > 3 && (
            <>
              <line x1={bobX} y1={bobY} x2={bobX + tanVec[0]} y2={bobY + tanVec[1]} stroke={ORANGE} strokeWidth={3} markerEnd="url(#nvl-a)" />
              <text x={bobX + tanVec[0] - 8} y={bobY + tanVec[1] + 4} textAnchor="end" className="ui text-[10.5px]" fill={ORANGE}>−mg sinθ</text>
              <line x1={bobX} y1={bobY} x2={bobX + radVec[0]} y2={bobY + radVec[1]} stroke="#8a8576" strokeWidth={2} strokeDasharray="4 4" markerEnd="url(#nvl-r)" />
              <text x={bobX + radVec[0] + 7} y={bobY + radVec[1] + 10} className="ui text-[9.5px] fill-[#8a8576]">mg cosθ — canceled</text>
              <text x={bobX + radVec[0] + 7} y={bobY + radVec[1] + 21} className="ui text-[9.5px] fill-[#8a8576]">by rod tension</text>
            </>
          )}

          {/* α(θ) plot */}
          <line x1={pj.x0} y1={pj.y0} x2={pj.x0} y2={pj.y1} stroke="#b6b2a4" strokeWidth={1.3} />
          <line x1={pj.x0} y1={pj.y0} x2={pj.x1} y2={pj.y0} stroke="#b6b2a4" strokeWidth={1.3} />
          {[0, 45, 90, 135, 180].map(d => (
            <g key={d}>
              <line x1={mapTh((d * Math.PI) / 180)} y1={pj.y0} x2={mapTh((d * Math.PI) / 180)} y2={pj.y0 + 4} stroke="#b6b2a4" />
              <text x={mapTh((d * Math.PI) / 180)} y={pj.y0 - 5} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9.5px]">{d}°</text>
            </g>
          ))}
          <line x1={pj.x0 - 4} y1={mapAl(-(G / L))} x2={pj.x0} y2={mapAl(-(G / L))} stroke="#b6b2a4" />
          <text x={pj.x0 - 7} y={mapAl(-(G / L)) + 3.5} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9.5px]">−{(G / L).toFixed(1)}</text>
          <text x={pj.x0 - 7} y={pj.y0 + 3.5} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9.5px]">0</text>
          <text x={pj.x0 - 26} y={(pj.y0 + pj.y1) / 2} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9.5px]" transform={`rotate(-90 ${pj.x0 - 26} ${(pj.y0 + pj.y1) / 2})`}>θ̈ (rad/s²)</text>
          <path d={linPath} fill="none" stroke="#8a8576" strokeWidth={1.8} strokeDasharray="5 5" />
          <path d={exactPath} fill="none" stroke={ORANGE} strokeWidth={2.6} />
          {/* legend */}
          <g className="ui">
            <line x1={pj.x1 - 158} y1={pj.y1 - 22} x2={pj.x1 - 140} y2={pj.y1 - 22} stroke={ORANGE} strokeWidth={2.6} />
            <text x={pj.x1 - 135} y={pj.y1 - 18.5} className="text-[9.5px]" fill="var(--ink-soft)">exact −(g/L) sinθ</text>
            <line x1={pj.x1 - 158} y1={pj.y1 - 8} x2={pj.x1 - 140} y2={pj.y1 - 8} stroke="#8a8576" strokeWidth={1.8} strokeDasharray="4 4" />
            <text x={pj.x1 - 135} y={pj.y1 - 4.5} className="text-[9.5px]" fill="var(--ink-soft)">small-angle −(g/L) θ</text>
          </g>
          {/* current θ marker + gold gap */}
          <line x1={mapTh(thR)} y1={pj.y0} x2={mapTh(thR)} y2={pj.y1} stroke={GOLD} strokeWidth={1.4} strokeDasharray="4 4" opacity={0.8} />
          <line x1={mapTh(thR)} y1={mapAl(alpha_L)} x2={mapTh(thR)} y2={mapAl(alpha_small)} stroke={GOLD} strokeWidth={3.5} opacity={0.75} strokeLinecap="round" />
          <circle cx={mapTh(thR)} cy={mapAl(alpha_L)} r={4.5} fill={ORANGE} stroke="#fff" strokeWidth={1.5} />
          <circle cx={mapTh(thR)} cy={mapAl(alpha_small)} r={4} fill="#8a8576" stroke="#fff" strokeWidth={1.5} />

          {/* Lagrange derivation card */}
          <rect x={440} y={14} width={304} height={222} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={454} y={38} className="ui text-[10.5px] font-bold fill-[#8a8a9b]" letterSpacing="1.2">LAGRANGE METHOD</text>
          <text x={454} y={60} className="ui text-[12px] fill-[#4b4b5e]">q = θ  (generalized coordinate)</text>
          <text x={454} y={82} className="ui text-[12px] fill-[#4b4b5e]">T = ½mL²θ̇²</text>
          <text x={454} y={104} className="ui text-[12px] fill-[#4b4b5e]">V = −mgL cosθ</text>
          <text x={454} y={126} className="ui text-[12px] fill-[#4b4b5e]">L = T − V</text>
          <line x1={454} y1={138} x2={730} y2={138} stroke="#e4e1d8" />
          <text x={454} y={158} className="ui text-[12px] fill-[#4b4b5e]">d/dt(∂L/∂θ̇) − ∂L/∂θ = 0</text>
          <text x={454} y={180} className="ui text-[12px] fill-[#4b4b5e]">mL²θ̈ + mgL sinθ = 0</text>
          <text x={454} y={204} className="ui text-[13px] font-bold" fill={PURPLE}>⟹  θ̈ = −(g/L) sinθ</text>
          <text x={454} y={224} className="ui text-[10.5px] fill-[#8a8a9b]">rod tension never appears</text>

          {/* small-angle error card */}
          <rect x={440} y={248} width={304} height={88} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={454} y={270} className="ui text-[10.5px] font-bold fill-[#8a8a9b]" letterSpacing="1.2">SMALL-ANGLE CHECK</text>
          <text x={454} y={292} className="ui text-[12px] fill-[#4b4b5e]">
            θ = {thR.toFixed(3)} rad   vs   sinθ = {Math.sin(thR).toFixed(3)}
          </text>
          <text x={454} y={316} className="ui text-[12.5px] font-bold" fill={smallAngleMet ? "#b08c1d" : "#4b4b5e"}>
            approximation error: {errPct.toFixed(1)}%{smallAngleMet ? " — SHM has left the building" : ""}
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="L" value={L} min={0.3} max={2.5} step={0.05} onChange={setL}
            fmt={v => `${v.toFixed(2)} m`} />
          <LabeledSlider label="θ" value={th} min={0} max={170} step={1} onChange={setTh}
            fmt={v => `${v.toFixed(0)}°`} color={PURPLE} width={200} />
          <Readout label="θ̈" value={`${alpha_L.toFixed(3)} rad/s²`} color={ORANGE} />
          <Readout label="T (small-angle)" value={`${(2 * Math.PI * Math.sqrt(L / G)).toFixed(2)} s`} color={PURPLE} />
          <Readout label="sinθ error" value={`${errPct.toFixed(1)} %`} color={GOLD} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys8-small-angle" met={smallAngleMet}>
        Drag θ up until the small-angle approximation <M>{"\\sin\\theta \\approx \\theta"}</M> is
        wrong by at least <strong>15%</strong> (around 52°) — watch the gold gap between the exact
        curve and the dashed line open up. Below that angle a pendulum is an honest harmonic
        oscillator; above it, the nonlinearity that fuels the chaos below starts to matter.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Double pendulum — twin systems, chaotic divergence
// ------------------------------------------------------------------
type PendState = { th1: number; th2: number; w1: number; w2: number };

const TWIN_OFFSET = 0.001; // rad — the twin starts 0.06° apart
const DIV_THRESHOLD = 0.5; // m — tip separation that counts as "diverged"

function DoublePendulum() {
  const [L1, setL1] = useState(1.0);
  const [L2, setL2] = useState(0.8);
  const [m1, setM1] = useState(1.0);
  const [m2, setM2] = useState(0.8);
  const [th1_0, setTh1_0] = useState(1.2);
  const [th2_0, setTh2_0] = useState(2.0);
  const [running, setRunning] = useState(false);
  const aRef = useRef<PendState>({ th1: 1.2, th2: 2.0, w1: 0, w2: 0 });
  const bRef = useRef<PendState>({ th1: 1.2, th2: 2.0 + TWIN_OFFSET, w1: 0, w2: 0 });
  const trARef = useRef<[number, number][]>([]);
  const trBRef = useRef<[number, number][]>([]);
  const divRef = useRef<{ t: number; d: number }[]>([]);
  const divergedAtRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const [, force] = useState(0);

  const scl = Math.min(92, 235 / (L1 + L2));
  const piv: [number, number] = [190, 95];

  function reset() {
    setRunning(false);
    aRef.current = { th1: th1_0, th2: th2_0, w1: 0, w2: 0 };
    bRef.current = { th1: th1_0, th2: th2_0 + TWIN_OFFSET, w1: 0, w2: 0 };
    trARef.current = [];
    trBRef.current = [];
    divRef.current = [];
    divergedAtRef.current = null;
    tRef.current = 0;
    force(n => n + 1);
  }

  useEffect(() => { reset(); }, [th1_0, th2_0, L1, L2, m1, m2]); // eslint-disable-line react-hooks/exhaustive-deps

  // Euler-Lagrange equations of motion (point-mass double pendulum)
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

  function rk4(s: PendState, h: number) {
    const [k1a, k1b, k1c, k1d] = derivs(s.th1, s.th2, s.w1, s.w2);
    const [k2a, k2b, k2c, k2d] = derivs(s.th1 + 0.5 * h * k1a, s.th2 + 0.5 * h * k1b, s.w1 + 0.5 * h * k1c, s.w2 + 0.5 * h * k1d);
    const [k3a, k3b, k3c, k3d] = derivs(s.th1 + 0.5 * h * k2a, s.th2 + 0.5 * h * k2b, s.w1 + 0.5 * h * k2c, s.w2 + 0.5 * h * k2d);
    const [k4a, k4b, k4c, k4d] = derivs(s.th1 + h * k3a, s.th2 + h * k3b, s.w1 + h * k3c, s.w2 + h * k3d);
    s.th1 += (h / 6) * (k1a + 2 * k2a + 2 * k3a + k4a);
    s.th2 += (h / 6) * (k1b + 2 * k2b + 2 * k3b + k4b);
    s.w1 += (h / 6) * (k1c + 2 * k2c + 2 * k3c + k4c);
    s.w2 += (h / 6) * (k1d + 2 * k2d + 2 * k3d + k4d);
  }

  const tipMeters = (s: PendState): [number, number] => [
    L1 * Math.sin(s.th1) + L2 * Math.sin(s.th2),
    L1 * Math.cos(s.th1) + L2 * Math.cos(s.th2),
  ];
  const tipScreen = (s: PendState): [number, number] => {
    const [mx, my] = tipMeters(s);
    return [piv[0] + mx * scl, piv[1] + my * scl];
  };

  useRaf(running, dt => {
    const sub = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / sub;
    for (let i = 0; i < sub; i++) {
      rk4(aRef.current, h);
      rk4(bRef.current, h);
      tRef.current += h;
    }
    trARef.current.push(tipScreen(aRef.current));
    trBRef.current.push(tipScreen(bRef.current));
    if (trARef.current.length > 380) trARef.current.shift();
    if (trBRef.current.length > 380) trBRef.current.shift();
    const [ax, ay] = tipMeters(aRef.current);
    const [bx, by] = tipMeters(bRef.current);
    const d = Math.hypot(ax - bx, ay - by);
    divRef.current.push({ t: tRef.current, d });
    if (divRef.current.length > 1400) divRef.current.shift();
    if (d > DIV_THRESHOLD && divergedAtRef.current === null) divergedAtRef.current = tRef.current;
    force(n => n + 1);
  });

  const a = aRef.current;
  const b = bRef.current;
  const x1 = piv[0] + L1 * scl * Math.sin(a.th1);
  const y1 = piv[1] + L1 * scl * Math.cos(a.th1);
  const [x2, y2] = tipScreen(a);
  const bx1 = piv[0] + L1 * scl * Math.sin(b.th1);
  const by1 = piv[1] + L1 * scl * Math.cos(b.th1);
  const [bx2, by2] = tipScreen(b);

  // energy of pendulum A (conserved — the Lagrangian bookkeeping check)
  const T = 0.5 * (m1 + m2) * L1 * L1 * a.w1 * a.w1
    + 0.5 * m2 * L2 * L2 * a.w2 * a.w2
    + m2 * L1 * L2 * a.w1 * a.w2 * Math.cos(a.th1 - a.th2);
  const V = -(m1 + m2) * G * L1 * Math.cos(a.th1) - m2 * G * L2 * Math.cos(a.th2);

  const div = divRef.current;
  const dNow = div.length ? div[div.length - 1].d : L2 * TWIN_OFFSET;
  const tNow = tRef.current;

  // fading trail: three slices of increasing opacity
  const fadePaths = (tr: [number, number][], color: string) => {
    if (tr.length < 4) return null;
    const seg = (from: number, to: number) =>
      tr.slice(from, to + 1).map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const n = tr.length;
    const i1 = Math.floor(n / 3);
    const i2 = Math.floor((2 * n) / 3);
    return (
      <g>
        <path d={seg(0, i1)} fill="none" stroke={color} strokeWidth={1.3} opacity={0.12} strokeLinecap="round" />
        <path d={seg(i1, i2)} fill="none" stroke={color} strokeWidth={1.5} opacity={0.28} strokeLinecap="round" />
        <path d={seg(i2, n - 1)} fill="none" stroke={color} strokeWidth={1.8} opacity={0.55} strokeLinecap="round" />
      </g>
    );
  };

  // divergence plot (log scale)
  const DP = { x0: 432, x1: 736, y0: 52, y1: 250 };
  const LOG_MIN = -3;
  const LOG_MAX = 0.65;
  const tWin = 20;
  const t0w = Math.max(0, tNow - tWin);
  const mapT = (t: number) => DP.x0 + ((t - t0w) / tWin) * (DP.x1 - DP.x0);
  const mapD = (d: number) => {
    const l = Math.min(LOG_MAX, Math.max(LOG_MIN, Math.log10(Math.max(d, 1e-4))));
    return DP.y1 - ((l - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (DP.y1 - DP.y0);
  };
  const divPath = div
    .filter(p => p.t >= t0w)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${mapT(p.t).toFixed(1)} ${mapD(p.d).toFixed(1)}`)
    .join(" ");
  const timeTicks: number[] = [];
  for (let k = Math.ceil(t0w / 5) * 5; k <= t0w + tWin + 1e-9; k += 5) timeTicks.push(k);
  const dTicks: { d: number; l: string }[] = [
    { d: 0.001, l: "1 mm" }, { d: 0.01, l: "1 cm" }, { d: 0.1, l: "10 cm" }, { d: 1, l: "1 m" },
  ];

  const divergedAt = divergedAtRef.current;
  const chaosMet = divergedAt !== null;

  return (
    <>
      <WidgetShell
        title="Double pendulum — twin systems, Lagrangian chaos"
        onReset={reset}
        caption="Two identical double pendulums run side by side; the twin (red tip) starts with θ₂ offset by just 0.06°. Left: both pendulums with fading tip trails. Right: the tip separation δ(t) on a log scale — chaotic runs climb through the gold 0.5 m line in seconds, while small-angle runs stay flat. The energy readout is conserved throughout: chaos is not noise."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* fading trails */}
          {fadePaths(trBRef.current, RED)}
          {fadePaths(trARef.current, PURPLE)}

          {/* twin pendulum (underneath, translucent) */}
          <line x1={piv[0]} y1={piv[1]} x2={bx1} y2={by1} stroke={BLUE} strokeWidth={4} strokeLinecap="round" opacity={0.35} />
          <line x1={bx1} y1={by1} x2={bx2} y2={by2} stroke={ORANGE} strokeWidth={3.5} strokeLinecap="round" opacity={0.35} />
          <circle cx={bx1} cy={by1} r={6} fill={BLUE} opacity={0.4} />
          <circle cx={bx2} cy={by2} r={9} fill={RED} stroke="#fff" strokeWidth={2} opacity={0.85} />

          {/* pendulum A */}
          <line x1={piv[0]} y1={piv[1]} x2={x1} y2={y1} stroke={BLUE} strokeWidth={5} strokeLinecap="round" />
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ORANGE} strokeWidth={4.5} strokeLinecap="round" />
          <circle cx={piv[0]} cy={piv[1]} r={7} fill="#50525e" stroke="#fff" strokeWidth={2} />
          <circle cx={x1} cy={y1} r={9} fill={BLUE} stroke="#fff" strokeWidth={2} />
          <circle cx={x2} cy={y2} r={12} fill={PURPLE} stroke="#fff" strokeWidth={2.5} />

          {/* legend / energy card (drawn above the swinging arms) */}
          <rect x={14} y={12} width={186} height={92} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <circle cx={28} cy={30} r={5} fill={PURPLE} />
          <text x={39} y={34} className="ui text-[11px] fill-[#4b4b5e]">tip A — purple trail</text>
          <circle cx={28} cy={49} r={5} fill={RED} />
          <text x={39} y={53} className="ui text-[11px] fill-[#4b4b5e]">twin tip — θ₂ + 0.06°</text>
          <line x1={22} y1={62} x2={192} y2={62} stroke="#e4e1d8" />
          <text x={24} y={80} className="ui text-[11px] fill-[#4b4b5e]">E = T + V = {(T + V).toFixed(2)} J</text>
          <text x={24} y={96} className="ui text-[10px] fill-[#8a8a9b]">conserved while chaos unfolds</text>

          {/* divergence plot */}
          <line x1={DP.x0} y1={DP.y0} x2={DP.x0} y2={DP.y1} stroke="#b6b2a4" strokeWidth={1.4} />
          <line x1={DP.x0} y1={DP.y1} x2={DP.x1} y2={DP.y1} stroke="#b6b2a4" strokeWidth={1.4} />
          <text x={DP.x1 - 2} y={DP.y0 - 10} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[12px]">tip separation δ(t) — log scale</text>
          {dTicks.map(tk => (
            <g key={tk.l}>
              <line x1={DP.x0} y1={mapD(tk.d)} x2={DP.x1} y2={mapD(tk.d)} stroke="#ece8dd" />
              <line x1={DP.x0 - 4} y1={mapD(tk.d)} x2={DP.x0} y2={mapD(tk.d)} stroke="#b6b2a4" />
              <text x={DP.x0 - 7} y={mapD(tk.d) + 3.5} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9.5px]">{tk.l}</text>
            </g>
          ))}
          {timeTicks.map(tk => (
            <g key={tk}>
              <line x1={mapT(tk)} y1={DP.y1} x2={mapT(tk)} y2={DP.y1 + 5} stroke="#b6b2a4" />
              <text x={mapT(tk)} y={DP.y1 + 17} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">{tk.toFixed(0)}</text>
            </g>
          ))}
          <text x={DP.x1 + 4} y={DP.y1 + 17} className="ui fill-[var(--ink-faint)] text-[10px]">s</text>
          {/* gold divergence threshold */}
          <line x1={DP.x0} y1={mapD(DIV_THRESHOLD)} x2={DP.x1} y2={mapD(DIV_THRESHOLD)} stroke={GOLD} strokeWidth={1.6} strokeDasharray="5 4" />
          <text x={DP.x1 - 2} y={mapD(DIV_THRESHOLD) - 5} textAnchor="end" className="ui text-[10px]" fill="#8a6d12">δ = 0.5 m — trajectories decorrelated</text>
          {div.length > 1 && <path d={divPath} fill="none" stroke={RED} strokeWidth={2.4} />}
          {div.length > 1 && (
            <circle cx={mapT(Math.min(tNow, t0w + tWin))} cy={mapD(dNow)} r={4.5} fill={RED} stroke="#fff" strokeWidth={1.5} />
          )}
          {divergedAt !== null && divergedAt >= t0w && (
            <>
              <line x1={mapT(divergedAt)} y1={DP.y0} x2={mapT(divergedAt)} y2={DP.y1} stroke={GOLD} strokeWidth={1.6} strokeDasharray="4 4" />
              <circle cx={mapT(divergedAt)} cy={mapD(DIV_THRESHOLD)} r={5} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
              <text x={mapT(divergedAt) + 6} y={DP.y0 + 12} className="ui text-[10.5px] font-semibold" fill="#8a6d12">
                split at t = {divergedAt.toFixed(1)} s
              </text>
            </>
          )}
          {div.length <= 1 && (
            <>
              <text x={(DP.x0 + DP.x1) / 2} y={(DP.y0 + DP.y1) / 2 - 8} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[12px]">press play —</text>
              <text x={(DP.x0 + DP.x1) / 2} y={(DP.y0 + DP.y1) / 2 + 10} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[12px]">the twins' separation traces itself here</text>
            </>
          )}
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={() => setRunning(r => !r)} />
          <LabeledSlider label="L₁" value={L1} min={0.3} max={1.5} step={0.05} onChange={setL1}
            fmt={v => `${v.toFixed(2)} m`} color={BLUE} width={110} />
          <LabeledSlider label="L₂" value={L2} min={0.3} max={1.5} step={0.05} onChange={setL2}
            fmt={v => `${v.toFixed(2)} m`} color={ORANGE} width={110} />
          <LabeledSlider label="m₁" value={m1} min={0.1} max={3} step={0.05} onChange={setM1}
            fmt={v => `${v.toFixed(2)} kg`} color={BLUE} width={110} />
          <LabeledSlider label="m₂" value={m2} min={0.1} max={3} step={0.05} onChange={setM2}
            fmt={v => `${v.toFixed(2)} kg`} color={ORANGE} width={110} />
          <LabeledSlider label="θ₁₀" value={th1_0} min={0.1} max={3.0} step={0.05} onChange={setTh1_0}
            fmt={v => `${(v * 180 / Math.PI).toFixed(0)}°`} width={110} />
          <LabeledSlider label="θ₂₀" value={th2_0} min={0.1} max={3.0} step={0.05} onChange={setTh2_0}
            fmt={v => `${(v * 180 / Math.PI).toFixed(0)}°`} width={110} />
          <Readout label="δ tip" value={dNow < 0.01 ? `${(dNow * 1000).toFixed(2)} mm` : `${(dNow * 100).toFixed(1)} cm`} color={RED} />
          <Readout label="t" value={`${tNow.toFixed(1)} s`} />
          <Readout label="E" value={`${(T + V).toFixed(2)} J`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys8-double-chaos" met={chaosMet}>
        Press play with large initial angles (the defaults work) and let the twin pendulums —
        launched just 0.06° apart — run until their tips separate by more than{" "}
        <strong>0.5 m</strong>, crossing the gold line in the δ(t) plot. Then try both starting
        angles below ~30° and watch δ stay pinned near a millimeter: chaos lives only in the
        nonlinear regime.
      </Challenge>
    </>
  );
}

export default function Lagrangian() {
  return (
    <div>
      <PageHeader
        chapter="Physics 8"
        section="College Physics & Dynamics"
        title="Lagrangian and Analytical Mechanics"
        lede="The Lagrangian formulation replaces force vectors with scalar energy functions. Choose any coordinates that describe the configuration, write T − V, and the equations of motion follow automatically."
      />

      <p>
        Newton's method has a hidden tax. To analyze a pendulum with{" "}
        <M>{"F = ma"}</M> you must introduce the rod's tension — a force you usually don't
        care about — solve for it, and then eliminate it again. For a two-link arm there are
        more such internal forces; for a walking robot, dozens. In the 1780s Joseph-Louis
        Lagrange found a way to skip the tax entirely: <em>describe the system by the
        coordinates it actually has, write down two energies, and turn a crank.</em>
      </p>
      <p>
        Step one is choosing <strong>generalized coordinates</strong> <M>{"q_i"}</M>: the
        smallest set of numbers that pins down the system's configuration. For a pendulum,
        one angle <M>{"\\theta"}</M> — not the bob's <M>{"(x, y)"}</M>, which are two numbers
        handcuffed by the rod. Choosing <M>{"\\theta"}</M> <em>builds the constraint in</em>,
        which is exactly why the rod tension will never appear. Step two: write the kinetic
        energy <M>{"T"}</M> and potential energy <M>{"V"}</M> in those coordinates, and form
        the <strong>Lagrangian</strong> <M>{"\\mathcal{L} = T - V"}</M> (yes, minus — the
        asymmetry is the point). Step three, the crank:
      </p>
      <Eq>{"\\frac{d}{dt}\\frac{\\partial \\mathcal{L}}{\\partial \\dot q_i} - \\frac{\\partial \\mathcal{L}}{\\partial q_i} = \\tau_i."}</Eq>
      <p>
        Read it back, one coordinate at a time: "how the Lagrangian responds to the{" "}
        <em>velocity</em> <M>{"\\dot q_i"}</M>, tracked over time, minus how it responds to
        the <em>position</em> <M>{"q_i"}</M>, equals the applied force (or torque){" "}
        <M>{"\\tau_i"}</M> on that coordinate." The <M>{"\\partial"}</M>s are partial
        derivatives — the one-knob-at-a-time derivatives from the{" "}
        <a href="#/math3-calculus">Math 3 module</a>. Every equation of motion in this course,
        and most of Chapter 8 of Modern Robotics, comes out of this single line.
      </p>

      <p>
        <strong>Try this:</strong> drag θ and watch the two accounts agree: Newton's picture
        on the left resolves <M>{"mg"}</M> into components and keeps only the tangential one,
        while the Lagrange panel on the right never mentions the rod tension at all — and both
        land on <M>{"\\ddot\\theta = -(g/L)\\sin\\theta"}</M>. Then watch the bottom plot as
        you drag: the gold gap between the exact curve and the dashed small-angle line is the
        price of pretending <M>{"\\sin\\theta = \\theta"}</M>. One physics, two bookkeeping
        systems, and one of them scales to 30 joints.
      </p>

      <NewtonVsLagrange />

      <Worked title="Turning the crank on the simplest system alive">
        <p>
          <strong>Given.</strong> A mass <M>{"m"}</M> falls vertically. Coordinate:{" "}
          <M>{"q = y"}</M> (height). Derive its motion from the Lagrangian.
        </p>
        <p>
          <strong>Set up.</strong> <M>{"T = \\tfrac12 m\\dot y^2"}</M>, <M>{"V = mgy"}</M>, so{" "}
          <M>{"\\mathcal{L} = \\tfrac12 m\\dot y^2 - mgy"}</M>.
        </p>
        <p>
          <strong>Solve.</strong> <M>{"\\partial\\mathcal{L}/\\partial\\dot y = m\\dot y"}</M>,
          so <M>{"\\tfrac{d}{dt}(m\\dot y) = m\\ddot y"}</M>. And{" "}
          <M>{"\\partial\\mathcal{L}/\\partial y = -mg"}</M>. The crank gives{" "}
          <M>{"m\\ddot y - (-mg) = 0"}</M>, i.e. <M>{"\\ddot y = -g"}</M>.
        </p>
        <p>
          <strong>Check.</strong> Free fall, as Newton would insist. The method adds nothing
          for one falling mass — its value explodes when coordinates are angles and
          constraints are everywhere, as in the double pendulum below.
        </p>
      </Worked>

      <H2>Double pendulum — deterministic chaos</H2>
      <p>
        The double pendulum has two generalized coordinates <M>{"(\\theta_1, \\theta_2)"}</M>.
        Its Lagrangian is:
      </p>
      <Eq>{"\\mathcal{L} = \\tfrac{1}{2}(m_1+m_2)L_1^2\\dot\\theta_1^2 + \\tfrac{1}{2}m_2 L_2^2 \\dot\\theta_2^2 + m_2 L_1 L_2 \\dot\\theta_1 \\dot\\theta_2 \\cos(\\theta_1-\\theta_2) + \\text{const}\\cdot\\cos\\theta_1 + m_2 g L_2\\cos\\theta_2."}</Eq>
      <p>
        Applying the Euler-Lagrange equations gives two coupled nonlinear ODEs — no analytic
        solution exists. The system is <em>deterministic but chaotic</em>: the equations
        contain no randomness whatsoever, yet nearly identical initial conditions lead to
        wildly different trajectories after a few swings, so long-term prediction is hopeless
        in practice.
      </p>

      <p>
        <strong>Try this:</strong> press play and watch the twin experiment run live — two
        identical pendulums whose second angles differ by 0.06°, less than the width of a
        pencil line. For the first second or two the red twin hides perfectly behind the
        purple tip; then the δ(t) plot on the right shows their separation climbing the log
        scale almost linearly — exponential growth — until the trajectories are meters apart.
        Keep an eye on the energy readout — E stays constant (this is a frictionless
        Lagrangian system doing perfect bookkeeping) even while the motion looks like
        nonsense.
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

      <Quiz
        challengeId="phys8-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: (
              <>
                What is the main practical advantage of the Lagrangian method over drawing
                free-body diagrams?
              </>
            ),
            options: [
              {
                label: "Constraint forces (rod tensions, joint reactions) never need to be computed",
                correct: true,
              },
              { label: "It works even when energy isn't conserved" },
              { label: "It avoids calculus entirely" },
              { label: "It gives more accurate answers than Newton's laws" },
            ],
            explain:
              "Choosing generalized coordinates builds the constraints in, so their forces do no work and vanish from the analysis. Both methods give the same physics — Lagrange just refuses to do the paperwork on forces you don't care about.",
          },
          {
            prompt: <>The Lagrangian is…</>,
            options: [
              { label: "kinetic minus potential energy, T − V", correct: true },
              { label: "kinetic plus potential energy, T + V" },
              { label: "the total work done on the system" },
              { label: "potential minus kinetic energy, V − T" },
            ],
            explain:
              "T + V is the total energy; the crank runs on the difference T − V. Mixing them up flips signs in the equations of motion — a classic exam disaster.",
          },
          {
            prompt: <>The double pendulum is "chaotic." That means…</>,
            options: [
              {
                label: "deterministic, but so sensitive to initial conditions that long-term prediction fails",
                correct: true,
              },
              { label: "its motion is genuinely random" },
              { label: "energy is not conserved" },
              { label: "the equations of motion are unknown" },
            ],
            explain:
              "The equations are exact and energy is conserved — you watched it. Chaos is about sensitivity: microscopic differences in the start amplify exponentially.",
          },
        ]}
      />

      <H2>Where you'll use this in Modern Robotics</H2>
      <p>
        Chapter 8 of Modern Robotics is this module scaled up. A robot's generalized
        coordinates are its joint angles <M>{"\\theta"}</M>; write the arm's total kinetic and
        potential energy, turn the same crank, and the result always organizes itself as{" "}
        <M>{"M(\\theta)\\ddot\\theta + C(\\theta,\\dot\\theta)\\dot\\theta + g(\\theta) = \\tau"}</M>{" "}
        — mass matrix, velocity-coupling terms, gravity vector. The double pendulum you just
        played with <em>is</em> a 2R robot arm with the motors switched off; switch them on and
        you are doing Chapter 11.
      </p>

      <BookRef>
        Physics track · Module 8 of 10: generalized coordinates, kinetic and potential energy,
        Euler-Lagrange equations, constraints, double pendulum, mass matrix. Bridges to MR §8
        (dynamics of open chains).
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
