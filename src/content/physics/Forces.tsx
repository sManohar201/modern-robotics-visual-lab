import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { PageHeader, H2, M, Eq, KeyIdea, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";
import { clamp, deg, rad } from "../../lib/math/vec";

const W = 760;
const H = 360;
const RED = "#d9483f";
const GREEN = "#2f9e44";
const BLUE = "#3b6fd4";
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";
const GOLD = "#caa53d";
const G = 9.81;

/** Shared rAF loop — callback kept in a ref so state stays fresh (see Foundations). */
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

function Arrow({ x1, y1, x2, y2, color, id, label, labelOffset = [10, -8] }: {
  x1: number; y1: number; x2: number; y2: number; color: string;
  id: string; label?: string; labelOffset?: [number, number];
}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 4) return null;
  return (
    <g>
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={4.5} markerEnd={`url(#${id})`} />
      {label && (
        <text x={x2 + labelOffset[0]} y={y2 + labelOffset[1]} fill={color}
          className="ui text-[13px] font-semibold">{label}</text>
      )}
    </g>
  );
}

/* ===================================================================== */
/* Widget 1 — free-body diagram + the stick–slip friction curve          */
/* ===================================================================== */

function FreeBodyDiagram() {
  const [mass, setMass] = useState(5);
  const [applied, setApplied] = useState(12);
  const [mu, setMu] = useState(0.3);

  const weight = mass * G;
  const normal = weight;
  const frictionMax = mu * normal;
  const netX = applied - Math.min(Math.abs(applied), frictionMax) * Math.sign(applied);
  const accel = netX / mass;
  const isSliding = Math.abs(applied) > frictionMax;
  const friction = isSliding ? frictionMax * Math.sign(applied) : applied;

  // one scale for ALL force arrows, so lengths are honestly comparable
  const k = 90 / Math.max(weight, 62);

  const cx = 218;
  const cy = 196;
  const bw = 80;
  const bh = 60;

  // friction-response plot: f(|F|) on the right
  const px0 = 486;
  const pw = 246;
  const py0 = 56;
  const ph = 226;
  const fCap = 62; // both axes 0..62 N
  const fx = (F: number) => px0 + (clamp(F, 0, fCap) / fCap) * pw;
  const fy = (f: number) => py0 + ph - (clamp(f, 0, fCap) / fCap) * ph;
  const brk = Math.min(frictionMax, fCap); // breakaway point (clipped to plot)

  const netMet = Math.abs(accel - 3) < 0.12 && isSliding;

  return (
    <>
      <WidgetShell
        title="Free-body diagram & the friction curve"
        onReset={() => { setMass(5); setApplied(12); setMu(0.3); }}
        caption="Left: every force on the block, drawn to one common scale (the 20 N reference bar shows it). Right: the friction the surface answers with, as a function of your push — it matches you one-for-one along the 45° line, then tops out at μN. The gold dot is the breakaway point; the purple dot is where you are now."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* ground */}
          <line x1={50} y1={cy + bh / 2 + 1} x2={430} y2={cy + bh / 2 + 1} stroke="#8a8a9b" strokeWidth={2} />
          {[...Array(11)].map((_, i) => (
            <line key={i} x1={66 + i * 36} y1={cy + bh / 2 + 1} x2={56 + i * 36} y2={cy + bh / 2 + 13} stroke="#c4c0b4" strokeWidth={1.3} />
          ))}
          {/* block */}
          <rect x={cx - bw / 2} y={cy - bh / 2} width={bw} height={bh}
            rx={4} fill={isSliding ? "#ffe3e0" : "#dbd7c8"} stroke="#50525e" strokeWidth={2} />
          <text x={cx} y={cy + 5} textAnchor="middle" className="ui text-[13px] font-semibold" fill="#4b4b5e">{mass} kg</text>

          {/* weight (down) and normal (up) */}
          <Arrow x1={cx} y1={cy + bh / 2} x2={cx} y2={cy + bh / 2 + weight * k}
            color={RED} id="fbw" label="W" labelOffset={[8, 0]} />
          <Arrow x1={cx} y1={cy - bh / 2} x2={cx} y2={cy - bh / 2 - normal * k}
            color={GREEN} id="fbn" label="N" labelOffset={[8, -4]} />
          {/* applied force */}
          {Math.abs(applied) > 0.5 && (
            <Arrow
              x1={applied > 0 ? cx + bw / 2 : cx - bw / 2}
              y1={cy}
              x2={(applied > 0 ? cx + bw / 2 : cx - bw / 2) + applied * k}
              y2={cy}
              color={PURPLE} id="fbf" label="F" labelOffset={applied > 0 ? [8, -4] : [-22, -4]} />
          )}
          {/* friction, opposing */}
          {Math.abs(friction) > 0.5 && (
            <Arrow
              x1={applied > 0 ? cx - bw / 2 : cx + bw / 2}
              y1={cy - 16}
              x2={(applied > 0 ? cx - bw / 2 : cx + bw / 2) - friction * k}
              y2={cy - 16}
              color={ORANGE} id="fbfr" label="f" labelOffset={applied > 0 ? [-18, -4] : [8, -4]} />
          )}

          {/* status card with the common arrow scale */}
          <rect x={30} y={20} width={196} height={86} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={42} y={41} className="ui text-[10.5px] font-bold tracking-[0.1em]"
            fill={isSliding ? ORANGE : GREEN}>
            {isSliding ? "SLIDING" : "STATIC — f cancels F"}
          </text>
          <text x={42} y={60} className="ui text-[12.5px]" fill="#1d1d28">
            a = {accel.toFixed(2)} m/s²
          </text>
          <text x={42} y={77} className="ui text-[11.5px]" fill="#4b4b5e">
            f = {friction.toFixed(1)} N of μN = {frictionMax.toFixed(1)} N
          </text>
          <line x1={42} y1={93} x2={42 + 20 * k} y2={93} stroke="#50525e" strokeWidth={3} />
          <text x={48 + 20 * k} y={97} className="ui text-[10px]" fill="var(--ink-faint)">= 20 N (arrow scale)</text>

          {/* divider */}
          <line x1={448} y1={30} x2={448} y2={H - 26} stroke="#e4e1d8" strokeWidth={1.4} />

          {/* ---- friction-response plot ---- */}
          <text x={px0} y={py0 - 14} className="ui text-[11.5px]" fill="var(--ink-soft)">friction f vs push |F|</text>
          {/* sliding region shading */}
          {brk < fCap - 1 && (
            <>
              <rect x={fx(brk)} y={py0} width={px0 + pw - fx(brk)} height={ph} fill={ORANGE} opacity={0.06} />
              <text x={fx(brk) + 8} y={py0 + 14} className="ui text-[10px]" fill={ORANGE}>sliding</text>
              <text x={fx(brk) - 8} y={py0 + 14} textAnchor="end" className="ui text-[10px]" fill={GREEN}>static</text>
            </>
          )}
          {/* axes + ticks */}
          <line x1={px0} y1={py0} x2={px0} y2={py0 + ph} stroke="#b6b2a4" strokeWidth={1.4} />
          <line x1={px0} y1={py0 + ph} x2={px0 + pw} y2={py0 + ph} stroke="#b6b2a4" strokeWidth={1.4} />
          {[0, 20, 40, 60].map(v => (
            <g key={v} className="ui">
              <line x1={fx(v)} y1={py0 + ph} x2={fx(v)} y2={py0 + ph + 5} stroke="#b6b2a4" />
              <text x={fx(v)} y={py0 + ph + 17} textAnchor="middle" className="fill-[var(--ink-faint)] text-[10px]">{v}</text>
              <line x1={px0 - 5} y1={fy(v)} x2={px0} y2={fy(v)} stroke="#b6b2a4" />
              <text x={px0 - 8} y={fy(v) + 3.5} textAnchor="end" className="fill-[var(--ink-faint)] text-[10px]">{v}</text>
            </g>
          ))}
          <text x={px0 + pw} y={py0 + ph + 30} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10.5px]">applied |F| (N)</text>
          <text x={px0 - 8} y={py0 - 2} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10.5px]">f (N)</text>
          {/* the response curve: 45° stick line, then flat at μN */}
          <line x1={fx(0)} y1={fy(0)} x2={fx(brk)} y2={fy(brk)} stroke={ORANGE} strokeWidth={2.6} />
          {brk < fCap - 0.5 && (
            <line x1={fx(brk)} y1={fy(brk)} x2={fx(fCap)} y2={fy(brk)} stroke={ORANGE} strokeWidth={2.6} />
          )}
          {/* breakaway marker */}
          {brk < fCap - 0.5 && (
            <>
              <line x1={fx(brk)} y1={fy(brk)} x2={fx(brk)} y2={py0 + ph} stroke={GOLD} strokeWidth={1.6} strokeDasharray="4 4" />
              <circle cx={fx(brk)} cy={fy(brk)} r={5} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
              <text x={fx(brk) + 8} y={fy(brk) - 8} className="ui text-[10.5px]" fill="#8a6d12">
                breakaway μN = {frictionMax.toFixed(1)} N
              </text>
            </>
          )}
          {/* live operating point */}
          <circle cx={fx(Math.abs(applied))} cy={fy(Math.abs(friction))} r={6} fill={PURPLE} stroke="#fff" strokeWidth={2} />
        </svg>
        <ControlBar>
          <LabeledSlider label="mass m" value={mass} min={1} max={20} step={0.5} onChange={setMass}
            fmt={v => `${v.toFixed(1)} kg`} />
          <LabeledSlider label="force F" value={applied} min={-60} max={60} step={0.5} onChange={setApplied}
            fmt={v => `${v.toFixed(1)} N`} color={PURPLE} />
          <LabeledSlider label="μₛ / μₖ" value={mu} min={0.05} max={0.9} step={0.01} onChange={setMu}
            fmt={v => v.toFixed(2)} color={ORANGE} />
          <Readout label="friction limit" value={`${frictionMax.toFixed(1)} N`} color={ORANGE} />
          <Readout label="a" value={`${accel.toFixed(2)} m/s²`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys2-fbd-accel3" met={netMet}>
        Tune force and friction to make the block accelerate at exactly{" "}
        <M>{"3 \\text{ m/s}^2"}</M> (within 0.12). The block must be sliding — push the purple
        dot past the gold breakaway point first.
      </Challenge>
    </>
  );
}

/* ===================================================================== */
/* Widget 2 — block on incline + the two competing curves vs angle       */
/* ===================================================================== */

function InclineBlock() {
  const [angle, setAngle] = useState(12);
  const [mass, setMass] = useState(4);
  const [muS, setMuS] = useState(0.45);

  const th = rad(angle);
  const weight = mass * G;
  const Wperp = weight * Math.cos(th);
  const Wpar = weight * Math.sin(th);
  const normal = Wperp;
  const frictionMax = muS * normal;
  const sliding = Wpar > frictionMax;
  const friction = sliding ? frictionMax : Wpar;
  const netAlong = sliding ? Wpar - friction : 0;
  const accel = netAlong / mass;
  const critAngle = deg(Math.atan(muS));

  // incline with fixed slope length so it always fits the canvas
  const ox = 42;
  const oy = 308;
  const R = 380;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const base = R * cos;
  const rise = R * sin;

  // block center, seated on the slope at 60% of the way up
  const bw2 = 30;
  const bh2 = 20;
  const bx = ox + 0.6 * R * cos - bh2 * sin;
  const by = oy - 0.6 * R * sin - bh2 * cos;
  const corners = [
    [-bw2, -bh2], [bw2, -bh2], [bw2, bh2], [-bw2, bh2],
  ].map(([lx, ly]) => [
    bx + lx * cos - ly * sin,
    by - lx * sin - ly * cos,
  ]);
  const poly = corners.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ");

  // one honest arrow scale (weight arrow ≈ 100 px)
  const k = 100 / Math.max(weight, 40);

  // W∥ vs f_max plot on the right
  const thetaMax = 50;
  const px0 = 468;
  const pw = 264;
  const py0 = 48;
  const ph = 216;
  const pxT = (t: number) => px0 + (t / thetaMax) * pw;
  const pyF = (f: number) => py0 + ph - (f / (weight * 1.06)) * ph;
  const curve = (f: (t: number) => number) =>
    Array.from({ length: 51 }, (_, i) => `${i === 0 ? "M" : "L"} ${pxT(i).toFixed(1)} ${pyF(f(i)).toFixed(1)}`).join(" ");
  const wparPath = curve(t => weight * Math.sin(rad(t)));
  const fmaxPath = curve(t => muS * weight * Math.cos(rad(t)));

  const slipMet = Math.abs(angle - critAngle) < 1.2;

  return (
    <>
      <WidgetShell
        title="Block on incline — the tipping of the balance"
        onReset={() => { setAngle(12); setMass(4); setMuS(0.45); }}
        caption="Left: the weight splits into W∥ (orange, drives sliding) and the part the normal force cancels; friction (purple) answers W∥ until it can't. Right: both sides of the contest plotted against angle — mg·sinθ climbs, μ·mg·cosθ falls, and the gold crossing is the critical angle. The dashed playhead is your current angle."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* incline triangle (fixed hypotenuse length) */}
          <polygon points={`${ox},${oy} ${(ox + base).toFixed(1)},${oy} ${(ox + base).toFixed(1)},${(oy - rise).toFixed(1)}`}
            fill="#ece8dd" stroke="#8a8a9b" strokeWidth={1.5} />
          {[...Array(10)].map((_, i) => (
            <line key={i} x1={ox + i * 40} y1={oy} x2={ox + i * 40 - 10} y2={oy + 12} stroke="#c4c0b4" strokeWidth={1.2} />
          ))}
          {/* angle arc */}
          <path d={`M ${ox + 50},${oy} A 50,50 0 0 0 ${(ox + 50 * cos).toFixed(1)},${(oy - 50 * sin).toFixed(1)}`}
            fill="none" stroke="#8a8a9b" strokeWidth={1.5} />
          <text x={ox + 58} y={oy - 8} className="ui text-[12px]" fill="#50525e">{angle}°</text>

          {/* block */}
          <polygon points={poly} fill={sliding ? "#ffe3e0" : "#dbd7c8"} stroke="#50525e" strokeWidth={2} />

          {/* weight straight down */}
          <Arrow x1={bx} y1={by} x2={bx} y2={by + weight * k}
            color={RED} id="incw" label="W" labelOffset={[6, 0]} />
          {/* normal, perpendicular off the slope */}
          <Arrow x1={bx} y1={by} x2={bx - normal * k * sin} y2={by - normal * k * cos}
            color={GREEN} id="incn" label="N" labelOffset={[6, -4]} />
          {/* W∥ down the slope (toward lower-left) */}
          <Arrow x1={bx} y1={by} x2={bx - Wpar * k * cos} y2={by + Wpar * k * sin}
            color={ORANGE} id="incwp" label="W∥" labelOffset={[-28, 8]} />
          {/* friction up the slope */}
          {friction > 0.5 && (
            <Arrow x1={bx} y1={by} x2={bx + friction * k * cos} y2={by - friction * k * sin}
              color={PURPLE} id="incfr" label="f" labelOffset={[6, -4]} />
          )}

          {/* status card */}
          <rect x={26} y={16} width={210} height={92} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={38} y={37} className="ui text-[10.5px] font-bold tracking-[0.1em]"
            fill={sliding ? RED : GREEN}>
            {sliding ? `SLIDING  a = ${accel.toFixed(2)} m/s²` : "STATIC  a = 0"}
          </text>
          <text x={38} y={56} className="ui text-[11.5px]" fill="#4b4b5e">
            W∥ = {Wpar.toFixed(1)} N · f_max = {frictionMax.toFixed(1)} N
          </text>
          <text x={38} y={74} className="ui text-[11.5px]" fill="#4b4b5e">
            critical angle θc = {critAngle.toFixed(1)}°
          </text>
          <line x1={38} y1={92} x2={38 + 20 * k} y2={92} stroke="#50525e" strokeWidth={3} />
          <text x={44 + 20 * k} y={96} className="ui text-[10px]" fill="var(--ink-faint)">= 20 N (arrow scale)</text>

          {/* ---- W∥ vs f_max plot ---- */}
          <line x1={px0} y1={py0} x2={px0} y2={py0 + ph} stroke="#b6b2a4" strokeWidth={1.4} />
          <line x1={px0} y1={py0 + ph} x2={px0 + pw} y2={py0 + ph} stroke="#b6b2a4" strokeWidth={1.4} />
          {[0, 10, 20, 30, 40, 50].map(t => (
            <g key={t} className="ui">
              <line x1={pxT(t)} y1={py0 + ph} x2={pxT(t)} y2={py0 + ph + 5} stroke="#b6b2a4" />
              <text x={pxT(t)} y={py0 + ph + 17} textAnchor="middle" className="fill-[var(--ink-faint)] text-[10px]">{t}°</text>
            </g>
          ))}
          {[0, weight / 2, weight].map((f, i) => (
            <g key={i} className="ui">
              <line x1={px0 - 5} y1={pyF(f)} x2={px0} y2={pyF(f)} stroke="#b6b2a4" />
              <text x={px0 - 8} y={pyF(f) + 3.5} textAnchor="end" className="fill-[var(--ink-faint)] text-[10px]">{f.toFixed(0)}</text>
            </g>
          ))}
          <text x={px0 - 8} y={py0 - 6} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10.5px]">N</text>
          <text x={px0 + pw} y={py0 + ph + 30} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10.5px]">angle θ</text>
          <path d={wparPath} fill="none" stroke={ORANGE} strokeWidth={2.6} />
          <path d={fmaxPath} fill="none" stroke={PURPLE} strokeWidth={2.6} />
          {/* the gold crossing = critical angle */}
          <line x1={pxT(critAngle)} y1={pyF(weight * Math.sin(rad(critAngle)))} x2={pxT(critAngle)} y2={py0 + ph}
            stroke={GOLD} strokeWidth={1.6} strokeDasharray="4 4" />
          <circle cx={pxT(critAngle)} cy={pyF(weight * Math.sin(rad(critAngle)))} r={5.5} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
          <text x={clamp(pxT(critAngle), px0 + 40, px0 + pw - 60)} y={py0 + ph - 8} textAnchor="middle"
            className="ui text-[10.5px]" fill="#8a6d12">slips at {critAngle.toFixed(1)}°</text>
          {/* live playhead */}
          <line x1={pxT(angle)} y1={py0} x2={pxT(angle)} y2={py0 + ph} stroke="#8a8576" strokeWidth={1.4} strokeDasharray="5 4" opacity={0.7} />
          <circle cx={pxT(angle)} cy={pyF(Wpar)} r={5} fill={ORANGE} stroke="#fff" strokeWidth={1.5} />
          <circle cx={pxT(angle)} cy={pyF(frictionMax)} r={5} fill={PURPLE} stroke="#fff" strokeWidth={1.5} />
          {/* legend under the plot */}
          <g className="ui">
            <rect x={px0} y={py0 + ph + 40} width={9} height={9} rx={2} fill={ORANGE} />
            <text x={px0 + 14} y={py0 + ph + 48} className="text-[11px]" fill="var(--ink-soft)">W∥ = mg sin θ</text>
            <rect x={px0 + 130} y={py0 + ph + 40} width={9} height={9} rx={2} fill={PURPLE} />
            <text x={px0 + 144} y={py0 + ph + 48} className="text-[11px]" fill="var(--ink-soft)">f_max = μₛ mg cos θ</text>
          </g>
        </svg>
        <ControlBar>
          <LabeledSlider label="angle θ" value={angle} min={0} max={50} step={1} onChange={setAngle}
            fmt={v => `${v.toFixed(0)}°`} />
          <LabeledSlider label="mass m" value={mass} min={1} max={20} step={0.5} onChange={setMass}
            fmt={v => `${v.toFixed(1)} kg`} />
          <LabeledSlider label="μₛ" value={muS} min={0.05} max={0.9} step={0.01} onChange={setMuS}
            fmt={v => v.toFixed(2)} color={PURPLE} />
          <Readout label="W∥" value={`${Wpar.toFixed(1)} N`} color={ORANGE} />
          <Readout label="N" value={`${normal.toFixed(1)} N`} color={GREEN} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys2-incline-slip" met={slipMet}>
        Raise the angle until the block <em>just barely</em> starts to slide — park the grey
        playhead on the gold crossing, within ±1°. At that angle{" "}
        <M>{"\\tan\\theta = \\mu_s"}</M>.
      </Challenge>
    </>
  );
}

/* ===================================================================== */
/* Widget 3 — half-Atwood machine, animated, with a(m₂) design curve     */
/* ===================================================================== */

function ConnectedMasses() {
  const [m1, setM1] = useState(3);
  const [m2, setM2] = useState(5);
  const [friction, setFriction] = useState(0);
  const [simS, setSimS] = useState(0); // metres travelled
  const [running, setRunning] = useState(false);
  const velRef = useRef(0);
  const strobeRef = useRef<number[]>([]);
  const strobeClock = useRef(0);

  // half-Atwood: m₁ on the table, m₂ hanging. Static friction can hold it.
  const drive = m2 * G;
  const drag = friction * m1 * G;
  const stuck = drive <= drag + 1e-9;
  const accel = stuck ? 0 : (drive - drag) / (m1 + m2);
  const tension = stuck ? drive : m1 * (accel + friction * G);

  const PXM = 40; // px per metre
  const maxS = 2.6; // m₂ hits the floor after 2.6 m
  const landed = simS >= maxS - 1e-6;

  useRaf(running, dt => {
    velRef.current += accel * dt;
    setSimS(prev => {
      const n = prev + velRef.current * dt;
      strobeClock.current += dt;
      if (strobeClock.current >= 0.15) {
        strobeClock.current -= 0.15;
        strobeRef.current.push(Math.min(n, maxS));
      }
      if (n >= maxS) { setRunning(false); return maxS; }
      return n;
    });
  });

  useEffect(() => {
    setRunning(false); setSimS(0);
    velRef.current = 0; strobeRef.current = []; strobeClock.current = 0;
  }, [m1, m2, friction]);

  function launch() {
    if (running) { setRunning(false); return; }
    if (landed) { setSimS(0); velRef.current = 0; strobeRef.current = []; strobeClock.current = 0; }
    setRunning(true);
  }

  // scene geometry
  const tableY = 150;
  const pulleyX = 386;
  const groundY = 330;
  const b1x = 130 + simS * PXM; // m₁ centre
  const b2top = 180 + simS * PXM; // m₂ top edge
  const kA = 60 / Math.max(drive, 60); // arrow scale

  // a(m₂) design plot
  const px0 = 470;
  const pw = 262;
  const py0 = 44;
  const ph = 236;
  const aCap = 10;
  const pxM = (m: number) => px0 + (m / 15) * pw;
  const pyA = (a: number) => py0 + ph - (clamp(a, 0, aCap) / aCap) * ph;
  const aOf = (mm2: number) => Math.max(0, (mm2 * G - friction * m1 * G) / (m1 + mm2));
  const aPath = Array.from({ length: 59 }, (_, i) => {
    const mm2 = 0.5 + (i / 58) * 14.5;
    return `${i === 0 ? "M" : "L"} ${pxM(mm2).toFixed(1)} ${pyA(aOf(mm2)).toFixed(1)}`;
  }).join(" ");
  const m2Break = friction * m1; // m₂ below this ⇒ static

  const accelMet = Math.abs(accel - 2) < 0.15;

  return (
    <>
      <WidgetShell
        title="Half-Atwood machine — table block + hanging weight"
        onReset={() => { setM1(3); setM2(5); setFriction(0); setSimS(0); setRunning(false); velRef.current = 0; strobeRef.current = []; strobeClock.current = 0; }}
        caption="Left: press play and the hanging weight drags the table block along. The gold dots beside the fall are stamped at equal time intervals — their widening spacing is acceleration made visible. Right: the acceleration you'd get for every choice of m₂; the gold line is the challenge target, the gold dot the breakaway mass below which friction holds everything still."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* table */}
          <rect x={60} y={tableY} width={330} height={14} rx={3} fill="#d6d2c4" stroke="#9a9585" strokeWidth={1.5} />
          <rect x={80} y={tableY + 14} width={16} height={120} fill="#e2ded1" />
          <rect x={330} y={tableY + 14} width={16} height={120} fill="#e2ded1" />
          {/* floor under m₂ */}
          <line x1={330} y1={groundY} x2={450} y2={groundY} stroke="#8a8a9b" strokeWidth={2} />
          {[...Array(4)].map((_, i) => (
            <line key={i} x1={346 + i * 30} y1={groundY} x2={336 + i * 30} y2={groundY + 11} stroke="#c4c0b4" strokeWidth={1.2} />
          ))}
          {/* m₁ on the table */}
          <rect x={b1x - 30} y={tableY - 46} width={60} height={46} rx={4}
            fill={running && !stuck ? "#ffe3e0" : "#dbd7c8"} stroke="#50525e" strokeWidth={2} />
          <text x={b1x} y={tableY - 16} textAnchor="middle" className="ui text-[13px] font-semibold" fill="#4b4b5e">{m1} kg</text>
          {/* string, pulley, hanging string */}
          <line x1={b1x + 30} y1={tableY - 23} x2={pulleyX} y2={tableY - 23} stroke="#50525e" strokeWidth={2.5} />
          <circle cx={pulleyX} cy={tableY - 22} r={20} fill="#f6f4ee" stroke="#50525e" strokeWidth={2.5} />
          <circle cx={pulleyX} cy={tableY - 22} r={6} fill="#50525e" />
          <line x1={pulleyX} y1={tableY - 2} x2={pulleyX} y2={b2top} stroke="#50525e" strokeWidth={2.5} />
          {/* m₂ hanging */}
          <rect x={pulleyX - 28} y={b2top} width={56} height={46} rx={4}
            fill={running && !stuck ? "#ffe3e0" : "#dbd7c8"} stroke="#50525e" strokeWidth={2} />
          <text x={pulleyX} y={b2top + 29} textAnchor="middle" className="ui text-[13px] font-semibold" fill="#4b4b5e">{m2} kg</text>
          {/* equal-time strobe marks beside the fall path */}
          {strobeRef.current.map((s, i) => (
            <circle key={i} cx={pulleyX + 40} cy={203 + s * PXM} r={3} fill={GOLD} opacity={0.85} />
          ))}
          {strobeRef.current.length > 1 && (
            <text x={pulleyX + 50} y={210} className="ui text-[9.5px]" fill="#8a6d12">every 0.15 s</text>
          )}

          {/* force arrows (shared scale) */}
          <Arrow x1={b1x + 30} y1={tableY - 23} x2={b1x + 30 + tension * kA} y2={tableY - 23}
            color={BLUE} id="pT1" label="T" labelOffset={[6, -6]} />
          {friction > 0.005 && drag * kA > 4 && (
            <Arrow x1={b1x - 30} y1={tableY - 40} x2={b1x - 30 - Math.min(drag, tension) * kA} y2={tableY - 40}
              color={ORANGE} id="pFr" label="f" labelOffset={[-16, -4]} />
          )}
          <Arrow x1={pulleyX} y1={b2top + 46} x2={pulleyX} y2={b2top + 46 + drive * kA}
            color={RED} id="pW2" label="m₂g" labelOffset={[8, 0]} />
          <Arrow x1={pulleyX} y1={b2top} x2={pulleyX} y2={b2top - tension * kA}
            color={BLUE} id="pT2" />

          {/* status card */}
          <rect x={26} y={18} width={200} height={92} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={38} y={39} className="ui text-[10.5px] font-bold tracking-[0.1em]"
            fill={stuck ? GREEN : landed ? "#8a6d12" : ORANGE}>
            {stuck ? "STATIC — friction wins" : landed ? "LANDED" : "MOVING"}
          </text>
          <text x={38} y={58} className="ui text-[12px]" fill="#4b4b5e">a = {accel.toFixed(2)} m/s² · T = {tension.toFixed(1)} N</text>
          <text x={38} y={76} className="ui text-[11.5px]" fill="#4b4b5e">v = {Math.abs(velRef.current).toFixed(2)} m/s</text>
          <line x1={38} y1={92} x2={38 + 20 * kA} y2={92} stroke="#50525e" strokeWidth={3} />
          <text x={44 + 20 * kA} y={96} className="ui text-[10px]" fill="var(--ink-faint)">= 20 N (arrow scale)</text>

          {/* ---- a(m₂) design plot ---- */}
          <line x1={px0} y1={py0} x2={px0} y2={py0 + ph} stroke="#b6b2a4" strokeWidth={1.4} />
          <line x1={px0} y1={py0 + ph} x2={px0 + pw} y2={py0 + ph} stroke="#b6b2a4" strokeWidth={1.4} />
          {[0, 5, 10, 15].map(m => (
            <g key={m} className="ui">
              <line x1={pxM(m)} y1={py0 + ph} x2={pxM(m)} y2={py0 + ph + 5} stroke="#b6b2a4" />
              <text x={pxM(m)} y={py0 + ph + 17} textAnchor="middle" className="fill-[var(--ink-faint)] text-[10px]">{m}</text>
            </g>
          ))}
          {[0, 2, 4, 6, 8, 10].map(a => (
            <g key={a} className="ui">
              <line x1={px0 - 5} y1={pyA(a)} x2={px0} y2={pyA(a)} stroke="#b6b2a4" />
              <text x={px0 - 8} y={pyA(a) + 3.5} textAnchor="end" className="fill-[var(--ink-faint)] text-[10px]">{a}</text>
            </g>
          ))}
          <text x={px0 + pw} y={py0 + ph + 30} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10.5px]">m₂ (kg)</text>
          <text x={px0 - 8} y={py0 - 4} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10.5px]">a (m/s²)</text>
          {/* asymptote a = g */}
          <line x1={px0} y1={pyA(G)} x2={px0 + pw} y2={pyA(G)} stroke="#9e9e9e" strokeWidth={1} strokeDasharray="3 4" opacity={0.8} />
          <text x={px0 + pw - 4} y={pyA(G) - 4} textAnchor="end" className="ui text-[9.5px]" fill="var(--ink-faint)">g = 9.81 (never reached)</text>
          {/* challenge target */}
          <line x1={px0} y1={pyA(2)} x2={px0 + pw} y2={pyA(2)} stroke={GOLD} strokeWidth={1.6} strokeDasharray="5 4" />
          <text x={px0 + pw - 4} y={pyA(2) - 5} textAnchor="end" className="ui text-[10px]" fill="#8a6d12">target a = 2</text>
          {/* the curve */}
          <path d={aPath} fill="none" stroke={BLUE} strokeWidth={2.6} />
          {/* breakaway mass */}
          {m2Break > 0.4 && (
            <>
              <circle cx={pxM(Math.min(m2Break, 15))} cy={pyA(0)} r={5} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
              <text x={clamp(pxM(m2Break), px0 + 34, px0 + pw - 40)} y={pyA(0) - 8} textAnchor="middle"
                className="ui text-[9.5px]" fill="#8a6d12">breaks free</text>
            </>
          )}
          {/* live operating point */}
          <circle cx={pxM(m2)} cy={pyA(accel)} r={6} fill={PURPLE} stroke="#fff" strokeWidth={2} />
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={launch} labels={["play", "pause"]} />
          <LabeledSlider label="m₁ (table)" value={m1} min={0.5} max={15} step={0.1} onChange={setM1}
            fmt={v => `${v.toFixed(1)} kg`} color={GREEN} />
          <LabeledSlider label="m₂ (hang)" value={m2} min={0.5} max={15} step={0.1} onChange={setM2}
            fmt={v => `${v.toFixed(1)} kg`} color={RED} />
          <LabeledSlider label="μ (table)" value={friction} min={0} max={0.5} step={0.01} onChange={setFriction}
            fmt={v => v.toFixed(2)} color={ORANGE} />
          <Readout label="a" value={`${accel.toFixed(2)} m/s²`} color={PURPLE} />
          <Readout label="T" value={`${tension.toFixed(1)} N`} color={BLUE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys2-pulley-accel2" met={accelMet}>
        Land the purple dot on the gold line: choose masses and friction so the system
        accelerates at exactly <M>{"2 \\text{ m/s}^2"}</M> (within 0.15) — then press play and
        watch the strobe marks confirm it.
      </Challenge>
    </>
  );
}

export default function Forces() {
  return (
    <div>
      <PageHeader
        chapter="Physics 2"
        section="College Physics & Dynamics"
        title="Forces and Newtonian Mechanics"
        lede="A force is an interaction that changes an object's momentum. Newton's second law — net force equals mass times acceleration — is the engine of classical mechanics."
      />

      <p>
        Push a stalled car and it barely creeps; push a shopping cart the same way and it takes
        off. Same push, different response — the difference is <strong>mass</strong>, an
        object's built-in reluctance to change its motion. Newton's second law makes the
        relationship exact:
      </p>

      <Eq>{"\\sum \\mathbf{F} = m\\mathbf{a}"}</Eq>

      <p>
        Read it back: add up <em>every</em> force acting on one object (that is what the{" "}
        <M>{"\\sum"}</M> demands — forgetting one force is the classic mistake), and the sum
        tells you the acceleration, scaled down by the mass. Every force in mechanics has a
        physical origin: gravity pulling down, a surface pushing back (the{" "}
        <strong>normal force</strong>, "normal" meaning <em>perpendicular</em> to the surface —
        it is not a special kind of force, just the surface refusing to be crushed), tension in
        a rope, friction, drag. The <strong>free-body diagram</strong> is the bookkeeping tool:
        isolate one object, draw every force on it as an arrow, then add the arrows.
      </p>

      <p>
        One more character needs an introduction: the <strong>friction coefficient</strong>{" "}
        <M>{"\\mu"}</M> (mu), a dimensionless number measuring how grippy two surfaces are
        together. Friction can push back with any force up to <M>{"\\mu N"}</M> — up to a fixed
        fraction of how hard the surfaces are pressed together. Rubber on dry concrete:{" "}
        <M>{"\\mu \\approx 1"}</M>. Steel on ice: <M>{"\\mu \\approx 0.03"}</M>. (Strictly there
        are two: static <M>{"\\mu_s"}</M> before sliding starts, kinetic <M>{"\\mu_k"}</M> once
        it has, with <M>{"\\mu_k"}</M> slightly smaller — which is why a skidding wheel grips
        worse than a rolling one.)
      </p>

      <p>
        <strong>Try this:</strong> in the diagram below, slowly increase the applied force with
        μ fixed and watch the purple dot in the right-hand plot ride up the 45° line — friction
        matching your push newton for newton, block STATIC. The instant the dot passes the gold
        breakaway point the curve goes flat, the status flips to SLIDING, and every extra newton
        becomes acceleration. Then double the mass and watch the whole gold corner slide up and
        to the right: the friction limit <M>{"\\mu N"}</M> doubled too.
      </p>

      <FreeBodyDiagram />

      <H2>Forces on an incline</H2>
      <p>
        A tilted surface introduces a crucial idea: it is always useful to decompose forces
        along and perpendicular to the constraint surface. The weight{" "}
        <M>{"W = mg"}</M> splits into a component <em>perpendicular</em> to the slope that
        the normal force cancels, and a component <em>parallel</em> to the slope that drives
        sliding:
      </p>
      <Eq>{"W_\\perp = mg\\cos\\theta, \\qquad W_\\parallel = mg\\sin\\theta."}</Eq>
      <p>
        Static friction can resist up to <M>{"\\mu_s N = \\mu_s mg\\cos\\theta"}</M>. The block
        begins to slide when <M>{"W_\\parallel > f_{\\max}"}</M>, which simplifies to{" "}
        <M>{"\\tan\\theta > \\mu_s"}</M>.
      </p>

      <p>
        <strong>Try this:</strong> raise the angle one degree at a time and watch the two curves
        in the right-hand plot: the orange <M>{"mg\\sin\\theta"}</M> climbing, the purple{" "}
        <M>{"\\mu_s mg\\cos\\theta"}</M> falling, the block letting go exactly where they cross
        (that's the challenge below). Then change the mass and confirm the gold crossing{" "}
        <em>doesn't move</em> — both curves scale together. Only the μ slider moves it.
      </p>

      <InclineBlock />

      <KeyIdea>
        The critical angle for slip is <M>{"\\theta_c = \\arctan(\\mu_s)"}</M> — independent
        of mass. Heavier blocks push harder on the slope but also require more friction force
        to stay still. The two effects cancel.
      </KeyIdea>

      <H2>Connected bodies and pulleys</H2>
      <p>
        When two masses are linked by a rope over a frictionless pulley, they form a single
        system: the rope forces them to share one acceleration <M>{"a"}</M> and one tension{" "}
        <M>{"T"}</M>. In the setup below — <M>{"m_1"}</M> sliding on a table with friction
        coefficient <M>{"\\mu"}</M>, <M>{"m_2"}</M> hanging — writing Newton's second law once
        per body and eliminating <M>{"T"}</M> gives:
      </p>
      <Eq>{"a = \\frac{m_2 g - \\mu m_1 g}{m_1 + m_2}, \\qquad T = m_1(a + \\mu g)."}</Eq>

      <p>
        Read it back: the hanging weight <M>{"m_2 g"}</M> drives the system, table friction{" "}
        <M>{"\\mu m_1 g"}</M> drags against it, and the <em>total</em> mass resists — both
        blocks must accelerate together because the rope ties their fates.{" "}
        <strong>Try this:</strong> with μ at zero, notice even a tiny hanging mass moves the
        system — the table carries <M>{"m_1"}</M>'s weight, so nothing opposes the pull. Now
        raise μ until <M>{"\\mu m_1 \\ge m_2"}</M> and watch the status flip to STATIC: friction
        wins and the machine locks. Finally make <M>{"m_2"}</M> huge and see <M>{"a"}</M>{" "}
        approach (but never reach) the dashed <M>{"g"}</M> line in the plot: even a monstrous
        hanging weight cannot make the system fall faster than free fall.
      </p>

      <ConnectedMasses />

      <Worked title="Will the crate slide off the ramp?">
        <p>
          <strong>Given.</strong> A 4 kg crate rests on a 25° loading ramp with{" "}
          <M>{"\\mu_s = 0.45"}</M> (the widget defaults). Does it slide? If the ramp is raised
          to 35°, what is its acceleration (take <M>{"\\mu_k = 0.40"}</M>)?
        </p>
        <p>
          <strong>Set up.</strong> Slide test: compare <M>{"\\tan 25° = 0.47"}</M> with{" "}
          <M>{"\\mu_s = 0.45"}</M>. Since <M>{"0.47 > 0.45"}</M>… it actually{" "}
          <em>just barely</em> slides! (The critical angle is{" "}
          <M>{"\\arctan 0.45 = 24.2°"}</M>.)
        </p>
        <p>
          <strong>Solve at 35°.</strong>{" "}
          <M>{"a = g(\\sin\\theta - \\mu_k\\cos\\theta) = 9.81(0.574 - 0.40 \\times 0.819) \\approx 2.4\\ \\text{m/s}^2"}</M>
          . The mass canceled out of the whole calculation.
        </p>
        <p>
          <strong>Check.</strong> Sanity bounds: with no friction the answer would be{" "}
          <M>{"g\\sin 35° = 5.6"}</M> m/s²; with enough friction it would be 0. Our 2.4 sits
          between them. ✓
        </p>
      </Worked>

      <KeyIdea>
        Newton's second law is always about <em>one</em> object and <em>all</em> its forces.
        Most "hard" force problems are just bookkeeping failures: a missing arrow, or two
        objects' forces mixed onto one diagram.
      </KeyIdea>

      <Quiz
        challengeId="phys2-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: (
              <>
                A book sits motionless on a table. Which pair of forces is an{" "}
                <em>action–reaction</em> pair in Newton's third-law sense?
              </>
            ),
            options: [
              {
                label: "The table pushing up on the book, and the book pushing down on the table",
                correct: true,
              },
              { label: "Gravity pulling the book down, and the table pushing the book up" },
              { label: "Gravity and friction" },
              { label: "There are no forces — the book isn't moving" },
            ],
            explain:
              "Third-law pairs act on different objects and are the same interaction seen from both sides. Weight and the normal force both act on the book — they happen to balance, but they are not a third-law pair.",
          },
          {
            prompt: <>Doubling the mass of the block on the incline does what to the slip angle?</>,
            options: [
              { label: "Nothing — the slip angle depends only on μₛ", correct: true },
              { label: "Halves it" },
              { label: "Doubles it" },
              { label: "Raises it slightly" },
            ],
            explain:
              "Both the driving force mg sinθ and the friction limit μ mg cosθ scale with m, so m cancels: tan θc = μₛ.",
          },
          {
            prompt: (
              <>
                In the pulley system, <M>{"m_2"}</M> is made enormous compared with{" "}
                <M>{"m_1"}</M>. The acceleration approaches…
              </>
            ),
            options: [
              { label: "g, from below", correct: true },
              { label: "infinity" },
              { label: "zero" },
              { label: "exactly 2g" },
            ],
            explain:
              "In the limit, m₂ is essentially in free fall, dragging a negligible m₁ behind it — nothing can make it fall faster than g.",
          },
        ]}
      />

      <H2>Where you'll use this in Modern Robotics</H2>
      <p>
        Newton's second law applied to every link, all at once, <em>is</em> robot dynamics: the
        recursive Newton–Euler algorithm of Chapter 8 is literally a free-body diagram drawn
        for each link in turn, with the pulley-style "shared constraint" idea generalized to
        joints. Friction cones (<M>{"\\tan^{-1}\\mu"}</M> again!) return in Chapter 12 as the
        geometry of grasping, and the incline's decompose-along-the-constraint move is how
        every contact force in the book gets split into normal and tangential parts.
      </p>

      <BookRef>
        Physics track · Module 2 of 10: Newton's laws, friction, normal forces, connected
        bodies, Atwood machine. Bridges to MR §8 (dynamics) and §12 (grasping).
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
