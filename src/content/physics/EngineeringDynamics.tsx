import { useState, useRef, useEffect, useMemo } from "react";
import { Play, Pause } from "lucide-react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";
import { circleIntersect } from "../../lib/svg";
import { Link, GroundPin, nearest } from "../../components/widgets/linkage";
import { rad, clamp } from "../../lib/math/vec";

const W = 760;
const H = 360;
const RED = "#d9483f";
const GREEN = "#2f9e44";
const BLUE = "#3b6fd4";
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";
const GOLD = "#caa53d";
const GOLD_TXT = "#8a6d12";

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

function ArrowDefs({ prefix }: { prefix: string }) {
  const m = (id: string, color: string) => (
    <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
    </marker>
  );
  return (
    <defs>
      {m(`${prefix}-b`, BLUE)}
      {m(`${prefix}-g`, GREEN)}
      {m(`${prefix}-p`, PURPLE)}
      {m(`${prefix}-o`, ORANGE)}
    </defs>
  );
}

// ------------------------------------------------------------------
// Rigid body velocity field — with live gold ICR marker
// ------------------------------------------------------------------
function RigidBodyVelocity() {
  const [vx, setVx] = useState(2);
  const [vy, setVy] = useState(0);
  const [omega, setOmega] = useState(1.5);

  const cx = 420;
  const cy = 174;
  const PXM = 52; // px per meter of body frame
  const VS = 12;  // px per (m/s) — ONE scale for every arrow on this canvas

  // Grid of material points (body coordinates in meters)
  const pts: { px: number; py: number; tvx: number; tvy: number }[] = [];
  for (let gx = -3; gx <= 3; gx++) {
    for (let gy = -3; gy <= 3; gy++) {
      if (gx === 0 && gy === 0) continue;
      const px = cx + gx * PXM;
      const py = cy - gy * PXM;
      // v = v_cm + ω × r (2D: ω×r = [−ω·r_y, ω·r_x])
      const tvx = vx - omega * gy;
      const tvy = vy + omega * gx;
      pts.push({ px, py, tvx, tvy });
    }
  }

  // ICR: the point where v_cm + ω×r = 0, i.e. r = (−v_y/ω, v_x/ω)
  const hasRot = Math.abs(omega) > 0.05;
  const icrRx = hasRot ? -vy / omega : 0;
  const icrRy = hasRot ? vx / omega : 0;
  const icrPx = cx + icrRx * PXM;
  const icrPy = cy - icrRy * PXM;
  const icrOnCanvas = hasRot && icrPx > 10 && icrPx < W - 10 && icrPy > 10 && icrPy < H - 10;

  const icrVisible = pts.some(p => Math.hypot(p.tvx, p.tvy) < 0.1);
  const icrMet = icrVisible && Math.hypot(vx, vy) >= 1 && Math.abs(omega) >= 0.5;

  return (
    <>
      <WidgetShell
        title="Rigid body velocity field"
        onReset={() => { setVx(2); setVy(0); setOmega(1.5); }}
        caption="Every material point's velocity is v_cm + ω × r. Grid spacing is 1 m; every arrow (including the purple CM arrow) uses the same scale — see the legend. The gold marker is the instantaneous center of rotation, computed live at r = (−v_y/ω, v_x/ω): the one point of the moving body that is standing still."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <ArrowDefs prefix="rbv" />
          {/* body outline */}
          <rect x={cx - 170} y={cy - 170} width={340} height={340} rx={8}
            fill="#f0eee8" stroke="#d6d2c4" strokeWidth={1.5} opacity={0.5} />

          {/* body-frame axis numbers (meters) */}
          {[-3, -2, -1, 0, 1, 2, 3].map(g => (
            <g key={g} className="ui">
              <text x={cx + g * PXM} y={cy + 3 * PXM + 18} textAnchor="middle" className="fill-[var(--ink-faint)] text-[9.5px]">{g}</text>
              {g !== 0 && (
                <text x={cx - 3 * PXM - 14} y={cy - g * PXM + 3.5} textAnchor="end" className="fill-[var(--ink-faint)] text-[9.5px]">{g}</text>
              )}
            </g>
          ))}
          <text x={cx + 3 * PXM + 26} y={cy + 3 * PXM + 18} className="ui fill-[var(--ink-faint)] text-[9.5px]">r_x (m)</text>
          <text x={cx - 3 * PXM - 14} y={cy - 3 * PXM - 10} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9.5px]">r_y (m)</text>

          {/* field vectors — all on the shared VS scale */}
          {pts.map((p, i) => {
            const speed = Math.hypot(p.tvx, p.tvy);
            if (speed < 0.05) {
              return (
                <g key={i}>
                  <circle cx={p.px} cy={p.py} r={7.5} fill="none" stroke={GOLD} strokeWidth={2} />
                  <circle cx={p.px} cy={p.py} r={3} fill={BLUE} />
                </g>
              );
            }
            return (
              <g key={i}>
                <line x1={p.px} y1={p.py} x2={p.px + p.tvx * VS} y2={p.py - p.tvy * VS}
                  stroke={BLUE} strokeWidth={2} markerEnd="url(#rbv-b)" opacity={0.65} />
                <circle cx={p.px} cy={p.py} r={3} fill={BLUE} opacity={0.5} />
              </g>
            );
          })}

          {/* CM marker + velocity, same scale as the field */}
          <circle cx={cx} cy={cy} r={9} fill={ORANGE} stroke="#fff" strokeWidth={2.5} />
          <text x={cx + 13} y={cy + 14} className="ui text-[11px] font-bold" fill={ORANGE}>CM</text>
          {Math.hypot(vx, vy) > 0.05 && (
            <line x1={cx} y1={cy} x2={cx + vx * VS} y2={cy - vy * VS}
              stroke={PURPLE} strokeWidth={3.5} markerEnd="url(#rbv-p)" />
          )}

          {/* gold ICR marker — the live still point */}
          {icrOnCanvas && (
            <g>
              <line x1={icrPx - 12} y1={icrPy} x2={icrPx + 12} y2={icrPy} stroke={GOLD} strokeWidth={1.4} />
              <line x1={icrPx} y1={icrPy - 12} x2={icrPx} y2={icrPy + 12} stroke={GOLD} strokeWidth={1.4} />
              <circle cx={icrPx} cy={icrPy} r={6} fill={GOLD} stroke="#fff" strokeWidth={2} />
              <text x={icrPx + 12} y={icrPy - 8} className="ui text-[11px] font-bold" fill={GOLD_TXT}>ICR</text>
            </g>
          )}

          {/* legend card */}
          <rect x={14} y={14} width={192} height={122} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <g className="ui">
            <line x1={26} y1={32} x2={50} y2={32} stroke={PURPLE} strokeWidth={3} markerEnd="url(#rbv-p)" />
            <text x={58} y={36} className="text-[10.5px]" fill="var(--ink-soft)">v of CM</text>
            <line x1={26} y1={50} x2={50} y2={50} stroke={BLUE} strokeWidth={2} markerEnd="url(#rbv-b)" opacity={0.75} />
            <text x={58} y={54} className="text-[10.5px]" fill="var(--ink-soft)">point velocity</text>
            <circle cx={38} cy={68} r={5} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
            <text x={58} y={72} className="text-[10.5px]" fill="var(--ink-soft)">ICR — still point</text>
            <line x1={26} y1={88} x2={26 + 2 * VS} y2={88} stroke="#8a8a9b" strokeWidth={2} markerEnd="url(#rbv-b)" />
            <text x={58} y={92} className="text-[10.5px]" fill="var(--ink-soft)">= 2 m/s (scale)</text>
            <text x={26} y={114} className="text-[10px]" fill={hasRot ? GOLD_TXT : "#8a8a9b"}>
              {hasRot
                ? `ICR at (${icrRx.toFixed(1)}, ${icrRy.toFixed(1)}) m${icrOnCanvas ? "" : " — off canvas"}`
                : "ICR at ∞ (pure translation)"}
            </text>
          </g>
        </svg>
        <ControlBar>
          <LabeledSlider label="v_x" value={vx} min={-3} max={3} step={0.1} onChange={setVx}
            fmt={v => `${v.toFixed(1)} m/s`} color={PURPLE} />
          <LabeledSlider label="v_y" value={vy} min={-3} max={3} step={0.1} onChange={setVy}
            fmt={v => `${v.toFixed(1)} m/s`} color={PURPLE} />
          <LabeledSlider label="ω" value={omega} min={-2} max={2} step={0.05} onChange={setOmega}
            fmt={v => `${v.toFixed(2)} rad/s`} color={ORANGE} />
          <Readout label="v_cm" value={`${Math.hypot(vx, vy).toFixed(2)} m/s`} color={PURPLE} />
          <Readout label="ICR"
            value={hasRot ? `(${icrRx.toFixed(1)}, ${icrRy.toFixed(1)}) m` : "at ∞"}
            color={GOLD_TXT} />
          <Readout label="still point" value={icrVisible ? "on grid ✓" : "off grid"} color={icrVisible ? GREEN : "#8a8a9b"} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys7-field-icr" met={icrMet}>
        Make one grid dot's arrow vanish while the body is genuinely moving (
        <M>{"|\\mathbf{v}_{cm}| \\geq 1"}</M> m/s and <M>{"|\\omega| \\geq 0.5"}</M> rad/s).
        The gold ICR marker shows the still point live — steer it exactly onto a grid dot and
        that dot gets a gold ring. Hint: the still point sits at{" "}
        <M>{"(r_x, r_y) = (-v_y/\\omega,\\; v_x/\\omega)"}</M> — pick round numbers.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Instantaneous center of rotation — rolling wheel with cycloid trace
// ------------------------------------------------------------------
function InstantaneousCenter() {
  const R = 0.5;    // wheel radius (m)
  const PXM = 110;  // px per meter
  const RPX = R * PXM;
  const VS = 9;     // px per (m/s) — one scale for all velocity arrows
  const XOFF = 30;  // px of world x = 0
  const groundY = 300;
  const yc = groundY - RPX;

  const [v, setV] = useState(3);
  const [beta, setBeta] = useState(90); // probe position around the rim, ° from contact
  const [running, setRunning] = useState(false);
  const stateRef = useRef({ xc: 1.2, roll: 0, tStrobe: 0 });
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const strobeRef = useRef<{ x: number; y: number }[]>([]);
  const cuspRef = useRef<number[]>([]);
  const [snap, setSnap] = useState({ xc: 1.2, roll: 0 });

  function reset() {
    setRunning(false);
    stateRef.current = { xc: 1.2, roll: 0, tStrobe: 0 };
    trailRef.current = [];
    strobeRef.current = [];
    cuspRef.current = [];
    setSnap({ xc: 1.2, roll: 0 });
    setV(3);
    setBeta(90);
  }

  useRaf(running, dt => {
    const s = stateRef.current;
    s.xc += v * dt;
    s.roll += (v / R) * dt; // rolling without slipping: ω = v/R
    // wrap around the canvas; the stale trail would be misleading, so clear it
    if (s.xc > 6.1 || s.xc < 0.4) {
      s.xc = v > 0 ? 0.6 : 5.9;
      trailRef.current = [];
      strobeRef.current = [];
      cuspRef.current = [];
    }
    // rim tracer (glued to the wheel, starts at the contact point): a cycloid
    const tx = XOFF + (s.xc - R * Math.sin(s.roll)) * PXM;
    const ty = groundY - R * (1 - Math.cos(s.roll)) * PXM;
    trailRef.current.push({ x: tx, y: ty });
    if (trailRef.current.length > 900) trailRef.current.shift();
    s.tStrobe += dt;
    if (s.tStrobe >= 0.15) {
      s.tStrobe = 0;
      strobeRef.current.push({ x: tx, y: ty });
      if (strobeRef.current.length > 60) strobeRef.current.shift();
    }
    // cusp: the rim point kisses the ground with zero speed
    if (1 - Math.cos(s.roll) < 0.005) {
      const last = cuspRef.current[cuspRef.current.length - 1];
      if (last === undefined || Math.abs(tx - last) > 14) {
        cuspRef.current.push(tx);
        if (cuspRef.current.length > 20) cuspRef.current.shift();
      }
    }
    setSnap({ xc: s.xc, roll: s.roll });
  });

  const xcPx = XOFF + snap.xc * PXM;
  const omega = v / R;
  const icrX = xcPx;
  const icrY = groundY;

  // velocity of a screen point (px), from v = ω × r about the ICR — physical units
  const velOf = (px: number, py: number) => {
    const rx = (px - icrX) / PXM;
    const ry = (py - icrY) / PXM;
    return { vx: -omega * ry, vy: omega * rx }; // screen sense (y down)
  };

  const points = [
    { label: "top", dx: 0, dy: -RPX, desc: "2v" },
    { label: "center", dx: 0, dy: 0, desc: "v" },
    { label: "right", dx: RPX, dy: 0, desc: "v√2" },
    { label: "left", dx: -RPX, dy: 0, desc: "v√2" },
  ];

  // probe on the rim, β measured around from the contact point
  const b = rad(beta);
  const probeX = xcPx + RPX * Math.sin(b);
  const probeY = yc + RPX * Math.cos(b);
  const dIcr = 2 * R * Math.sin(b / 2); // chord distance from ICR (m)
  const vProbe = Math.abs(omega) * dIcr; // = 2|v|·sin(β/2)
  const pv = velOf(probeX, probeY);

  const probeMet = Math.abs(vProbe - 5) <= 0.2;

  // probe-speed gauge
  const gX0 = 517, gX1 = 733, gY = 52;
  const gMap = (s: number) => gX0 + (clamp(s, 0, 12) / 12) * (gX1 - gX0);

  const trailPath = trailRef.current.length > 1
    ? trailRef.current.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
    : "";

  return (
    <>
      <WidgetShell
        title="Instantaneous center of rotation (ICR)"
        onReset={reset}
        caption="A wheel of radius 0.5 m rolling without slipping; the ruler is in meters. The gold dot is the ICR — always the contact point. Every green arrow is ω × (distance from the ICR), all on the scale in the legend. Press roll: the red rim point traces a cycloid whose gold cusps mark the instants that piece of rim was truly at rest. The orange probe reads speed = 2v·sin(β/2) on the gauge."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <ArrowDefs prefix="icr" />
          {/* ground + meter ruler */}
          <line x1={16} y1={groundY} x2={W - 16} y2={groundY} stroke="#8a8a9b" strokeWidth={2} />
          {[0, 1, 2, 3, 4, 5, 6].map(m => (
            <g key={m}>
              <line x1={XOFF + m * PXM} y1={groundY} x2={XOFF + m * PXM} y2={groundY + 9} stroke="#a8a496" strokeWidth={1.2} />
              <text x={XOFF + m * PXM} y={groundY + 24} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">{m}</text>
            </g>
          ))}
          <text x={XOFF + 6 * PXM + 18} y={groundY + 24} className="ui fill-[var(--ink-faint)] text-[10px]">m</text>
          {[...Array(24)].map((_, i) => (
            <line key={i} x1={26 + i * 31} y1={groundY} x2={16 + i * 31} y2={groundY + 10} stroke="#dcd8cc" strokeWidth={1} />
          ))}

          {/* cycloid trail of the rim point */}
          {trailPath && <path d={trailPath} fill="none" stroke={RED} strokeWidth={1.6} opacity={0.4} />}
          {strobeRef.current.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={2.4} fill={RED} opacity={0.55} />
          ))}
          {/* gold cusp markers: v = 0 moments */}
          {cuspRef.current.map((x, i) => (
            <g key={i}>
              <circle cx={x} cy={groundY} r={5} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
            </g>
          ))}

          {/* wheel with rotating spokes */}
          <circle cx={xcPx} cy={yc} r={RPX} fill="none" stroke={BLUE} strokeWidth={3} />
          {[0, 1, 2, 3].map(k => {
            const a = snap.roll + (k * Math.PI) / 2;
            return (
              <line key={k} x1={xcPx} y1={yc}
                x2={xcPx - 0.85 * RPX * Math.sin(a)} y2={yc + 0.85 * RPX * Math.cos(a)}
                stroke="#a9c3e8" strokeWidth={2} />
            );
          })}
          <circle cx={xcPx} cy={yc} r={5} fill={BLUE} />
          {/* rim tracer point */}
          <circle cx={xcPx - RPX * Math.sin(snap.roll)} cy={yc + RPX * Math.cos(snap.roll)} r={5.5}
            fill={RED} stroke="#fff" strokeWidth={1.5} />

          {/* dashed spokes from ICR to the labeled points */}
          {points.map(p => (
            <line key={p.label} x1={icrX} y1={icrY} x2={xcPx + p.dx} y2={yc + p.dy}
              stroke="#e0dcd0" strokeWidth={1} strokeDasharray="4 3" />
          ))}

          {/* canonical point velocities — one shared scale */}
          {points.map(p => {
            const px = xcPx + p.dx;
            const py = yc + p.dy;
            const { vx, vy } = velOf(px, py);
            const speed = Math.hypot(vx, vy);
            if (speed < 0.1) return null;
            return (
              <g key={p.label}>
                <line x1={px} y1={py} x2={px + vx * VS} y2={py + vy * VS}
                  stroke={GREEN} strokeWidth={2.6} markerEnd="url(#icr-g)" />
                <circle cx={px} cy={py} r={3.5} fill={PURPLE} />
                <text x={px + vx * VS + (vx >= 0 ? 6 : -6)} y={py + vy * VS + 3}
                  textAnchor={vx >= 0 ? "start" : "end"} className="ui text-[10.5px]" fill={GREEN}>
                  {p.desc}
                </text>
              </g>
            );
          })}

          {/* gold ICR marker at the contact point */}
          <circle cx={icrX} cy={icrY} r={8} fill={GOLD} stroke="#fff" strokeWidth={2.5} />
          <text x={icrX + 13} y={icrY - 8} className="ui text-[11.5px] font-bold" fill={GOLD_TXT}>ICR · v = 0</text>

          {/* probe point + its velocity + chord to the ICR */}
          <line x1={icrX} y1={icrY} x2={probeX} y2={probeY} stroke={ORANGE} strokeWidth={1.2} strokeDasharray="5 3" opacity={0.7} />
          {vProbe > 0.1 && (
            <line x1={probeX} y1={probeY} x2={probeX + pv.vx * VS} y2={probeY + pv.vy * VS}
              stroke={ORANGE} strokeWidth={2.8} markerEnd="url(#icr-o)" />
          )}
          <circle cx={probeX} cy={probeY} r={6} fill={ORANGE} stroke="#fff" strokeWidth={2} />
          <text x={probeX + (Math.sin(b) >= 0 ? 10 : -10)} y={probeY + 14}
            textAnchor={Math.sin(b) >= 0 ? "start" : "end"} className="ui text-[10.5px] font-bold" fill={ORANGE}>probe</text>

          {/* legend card */}
          <rect x={14} y={14} width={210} height={100} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <g className="ui">
            <line x1={26} y1={32} x2={26 + 3 * VS} y2={32} stroke={GREEN} strokeWidth={2.4} markerEnd="url(#icr-g)" />
            <text x={26 + 3 * VS + 8} y={36} className="text-[10.5px]" fill="var(--ink-soft)">point velocity · = 3 m/s</text>
            <circle cx={32} cy={50} r={4.5} fill={ORANGE} />
            <text x={44} y={54} className="text-[10.5px]" fill="var(--ink-soft)">probe (slider β)</text>
            <circle cx={32} cy={68} r={4} fill={RED} />
            <text x={44} y={72} className="text-[10.5px]" fill="var(--ink-soft)">rim point — cycloid path</text>
            <circle cx={32} cy={86} r={4.5} fill={GOLD} stroke="#fff" strokeWidth={1} />
            <text x={44} y={90} className="text-[10.5px]" fill="var(--ink-soft)">v = 0 (ICR, cycloid cusps)</text>
          </g>

          {/* probe-speed gauge with gold target */}
          <rect x={505} y={14} width={241} height={62} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={gX0} y={32} className="ui text-[10.5px] font-bold" fill="#4b4b5e">probe speed (m/s)</text>
          <line x1={gX0} y1={gY} x2={gX1} y2={gY} stroke="#cfcabc" strokeWidth={3} strokeLinecap="round" />
          {[0, 5, 10].map(s => (
            <g key={s}>
              <line x1={gMap(s)} y1={gY - 4} x2={gMap(s)} y2={gY + 4} stroke={s === 5 ? GOLD : "#b6b2a4"} strokeWidth={s === 5 ? 2.4 : 1.2} />
              <text x={gMap(s)} y={gY + 17} textAnchor="middle" className="ui text-[9.5px]" fill={s === 5 ? GOLD_TXT : "var(--ink-faint)"}
                fontWeight={s === 5 ? 700 : 400}>
                {s === 5 ? "target 5" : s}
              </text>
            </g>
          ))}
          <circle cx={gMap(vProbe)} cy={gY} r={6} fill={probeMet ? GREEN : ORANGE} stroke="#fff" strokeWidth={2} />
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={() => setRunning(r => !r)} labels={["roll", "pause"]} />
          <LabeledSlider label="v (m/s)" value={v} min={-6} max={6} step={0.1} onChange={setV}
            fmt={x => `${x.toFixed(1)}`} color={PURPLE} />
          <LabeledSlider label="probe β" value={beta} min={5} max={355} step={1} onChange={setBeta}
            fmt={x => `${x.toFixed(0)}°`} color={ORANGE} />
          <Readout label="ω = v/R" value={`${omega.toFixed(1)} rad/s`} color={BLUE} />
          <Readout label="v top" value={`${(2 * Math.abs(v)).toFixed(1)} m/s`} color={GREEN} />
          <Readout label="d from ICR" value={`${dIcr.toFixed(2)} m`} />
          <Readout label="v probe" value={`${vProbe.toFixed(2)} m/s`} color={ORANGE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys7-icr-verify" met={probeMet}>
        Park the orange marker on the gauge's gold target: make the probe move at exactly{" "}
        <M>{"5.0"}</M> m/s (±0.2). Its speed is <M>{"\\omega"}</M> times its distance from the
        ICR, i.e. <M>{"2v\\sin(\\beta/2)"}</M> — so there are two ways in: slide the probe
        farther from the gold contact point, or roll the wheel faster. Find either.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Four-bar linkage — drawn to scale, with rocker-angle plot ψ(θ)
// ------------------------------------------------------------------
function FourBarLinkage() {
  const [crankAngle, setCrankAngle] = useState(45);
  const [running, setRunning] = useState(false);
  const rafRef = useRef<number>(0);
  const angleRef = useRef(45);
  const traceRef = useRef<[number, number][]>([]);
  const binsRef = useRef<Set<number>>(new Set());
  const [binCount, setBinCount] = useState(0);
  const [snap, setSnap] = useState({ angle: 45, trace: [] as [number, number][] });

  // Four-bar dimensions (Grashof crank-rocker), drawn at 100 px = 1 m
  const A: [number, number] = [180, 260]; // fixed pivot A
  const D: [number, number] = [530, 260]; // fixed pivot D
  const lenAB = 90;  // crank  (0.9 m)
  const lenBC = 210; // coupler (2.1 m)
  const lenCD = 160; // rocker (1.6 m)

  function solveAt(ang: number) {
    const th = rad(ang);
    const B: [number, number] = [A[0] + lenAB * Math.cos(th), A[1] - lenAB * Math.sin(th)];
    const sol1 = circleIntersect(B, lenBC, D, lenCD, 1);
    const sol2 = circleIntersect(B, lenBC, D, lenCD, -1);
    const prev = traceRef.current.length > 0 ? traceRef.current[traceRef.current.length - 1] : null;
    const C = nearest(prev, sol1, sol2);
    return { B, C };
  }

  // full-cycle sweep of the rocker angle ψ(θ), branch-continuous
  const sweep = useMemo(() => {
    const pts: { th: number; psi: number }[] = [];
    let prev: [number, number] | null = null;
    for (let a = 0; a <= 360; a += 2) {
      const t = rad(a);
      const B: [number, number] = [A[0] + lenAB * Math.cos(t), A[1] - lenAB * Math.sin(t)];
      const C = nearest(prev, circleIntersect(B, lenBC, D, lenCD, 1), circleIntersect(B, lenBC, D, lenCD, -1));
      if (C) {
        prev = C;
        pts.push({ th: a, psi: (Math.atan2(D[1] - C[1], C[0] - D[0]) * 180) / Math.PI });
      }
    }
    let lo = pts[0], hi = pts[0];
    for (const p of pts) {
      if (p.psi < lo.psi) lo = p;
      if (p.psi > hi.psi) hi = p;
    }
    return { pts, lo, hi };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    function step(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      angleRef.current = (angleRef.current + dt * 60) % 360;
      const { C } = solveAt(angleRef.current);
      if (C) {
        traceRef.current.push(C);
        if (traceRef.current.length > 600) traceRef.current.shift();
      }
      setSnap({ angle: angleRef.current, trace: [...traceRef.current] });
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const liveAngle = running ? snap.angle : crankAngle;
  const { B, C } = useMemo(() => solveAt(liveAngle), [liveAngle]); // eslint-disable-line react-hooks/exhaustive-deps

  const psiLive = C ? (Math.atan2(D[1] - C[1], C[0] - D[0]) * 180) / Math.PI : 0;

  const coupleTrace = snap.trace;
  const tracePath = coupleTrace.length > 1
    ? coupleTrace.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")
    : "";

  // ψ(θ) plot card geometry
  const px0 = 52, px1 = 200, py0 = 46, py1 = 118;
  const psiLo = sweep.lo.psi - 4, psiHi = sweep.hi.psi + 4;
  const mapTh = (t: number) => px0 + (t / 360) * (px1 - px0);
  const mapPsi = (p: number) => py1 - ((p - psiLo) / (psiHi - psiLo)) * (py1 - py0);
  const psiPath = sweep.pts.map((p, i) => `${i === 0 ? "M" : "L"} ${mapTh(p.th).toFixed(1)} ${mapPsi(p.psi).toFixed(1)}`).join(" ");

  // rocker extreme ghost positions on the mechanism
  const extremeEnd = (psi: number): [number, number] =>
    [D[0] + lenCD * Math.cos(rad(psi)), D[1] - lenCD * Math.sin(rad(psi))];
  const endLo = extremeEnd(sweep.lo.psi);
  const endHi = extremeEnd(sweep.hi.psi);

  const scrubMet = binCount >= 24;

  function onScrub(v: number) {
    setCrankAngle(v);
    binsRef.current.add(Math.floor(v / 15) % 24);
    setBinCount(binsRef.current.size);
    const { C: c } = solveAt(v);
    if (c) {
      traceRef.current.push(c);
      if (traceRef.current.length > 600) traceRef.current.shift();
    }
    setSnap({ angle: v, trace: [...traceRef.current] });
  }

  return (
    <>
      <WidgetShell
        title="Four-bar linkage"
        onReset={() => {
          setRunning(false); setCrankAngle(45);
          angleRef.current = 45; traceRef.current = [];
          binsRef.current = new Set(); setBinCount(0);
          setSnap({ angle: 45, trace: [] });
        }}
        caption="Drawn to scale (bar bottom right): crank 0.9 m (purple), coupler 2.1 m (blue), rocker 1.6 m (orange), ground 3.5 m. The card plots the rocker angle ψ against the crank angle θ for a full cycle — the gold dots are the rocker's two extremes, ghosted in gold on the mechanism itself. The dots ringing the crank turn gold as you scrub through them."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* crank dial — gold dots record which crank angles you have scrubbed */}
          {[...Array(24)].map((_, i) => {
            const a = rad(i * 15 + 7.5);
            return (
              <circle key={i} cx={A[0] + 98 * Math.cos(a)} cy={A[1] - 98 * Math.sin(a)} r={2.5}
                fill={binsRef.current.has(i) ? GOLD : "#e2ded2"} />
            );
          })}

          {/* coupler trace */}
          {tracePath && <path d={tracePath} fill="none" stroke={BLUE} strokeWidth={1.5} opacity={0.45} strokeLinecap="round" />}

          {/* rocker extreme ghosts (gold) */}
          <line x1={D[0]} y1={D[1]} x2={endLo[0]} y2={endLo[1]} stroke={GOLD} strokeWidth={2} strokeDasharray="6 4" opacity={0.75} />
          <line x1={D[0]} y1={D[1]} x2={endHi[0]} y2={endHi[1]} stroke={GOLD} strokeWidth={2} strokeDasharray="6 4" opacity={0.75} />
          <circle cx={endLo[0]} cy={endLo[1]} r={4} fill={GOLD} />
          <circle cx={endHi[0]} cy={endHi[1]} r={4} fill={GOLD} />
          <text x={endHi[0] + 8} y={endHi[1] - 6} className="ui text-[10px]" fill={GOLD_TXT}>rocker extremes</text>

          {/* links */}
          {B && C ? (
            <>
              <Link a={A} b={B} color={PURPLE} w={8} />
              <Link a={B} b={C} color={BLUE} w={7} />
              <Link a={C} b={D} color={ORANGE} w={8} />
              <line x1={A[0]} y1={A[1]} x2={D[0]} y2={D[1]} stroke="#b0aaaa" strokeWidth={5} strokeDasharray="10 6" />
            </>
          ) : (
            <text x={W / 2} y={H / 2} textAnchor="middle" className="ui text-[14px]" fill={RED}>
              Linkage cannot be assembled at this angle
            </text>
          )}

          {/* ground pins */}
          <GroundPin x={A[0]} y={A[1]} />
          <GroundPin x={D[0]} y={D[1]} />

          {/* labels */}
          <text x={A[0] - 16} y={A[1] + 40} className="ui text-[11.5px] font-bold" fill={PURPLE}>Crank 0.9 m</text>
          <text x={D[0] + 14} y={D[1] + 40} className="ui text-[11.5px] font-bold" fill={ORANGE}>Rocker 1.6 m</text>
          {B && <text x={B[0] + 10} y={B[1] - 10} className="ui text-[11px]" fill={PURPLE}>B</text>}
          {C && <text x={C[0] + 10} y={C[1] - 10} className="ui text-[11px]" fill={ORANGE}>C</text>}

          {/* ψ(θ) plot card */}
          <rect x={14} y={14} width={212} height={148} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={26} y={32} className="ui text-[10.5px] font-bold" fill="#4b4b5e">rocker ψ vs crank θ</text>
          {/* gold extreme lines + dots */}
          {[sweep.lo, sweep.hi].map((e, i) => (
            <g key={i}>
              <line x1={px0} y1={mapPsi(e.psi)} x2={px1} y2={mapPsi(e.psi)} stroke={GOLD} strokeWidth={1.2} strokeDasharray="4 3" opacity={0.8} />
              <text x={px0 - 4} y={mapPsi(e.psi) + 3.5} textAnchor="end" className="ui text-[9px]" fill={GOLD_TXT}>{e.psi.toFixed(0)}°</text>
              <circle cx={mapTh(e.th)} cy={mapPsi(e.psi)} r={3.5} fill={GOLD} stroke="#fff" strokeWidth={1} />
            </g>
          ))}
          {/* axes + ticks */}
          <line x1={px0} y1={py1 + 4} x2={px1} y2={py1 + 4} stroke="#cfcabc" strokeWidth={1.2} />
          {[0, 180, 360].map(t => (
            <g key={t}>
              <line x1={mapTh(t)} y1={py1 + 4} x2={mapTh(t)} y2={py1 + 8} stroke="#b6b2a4" />
              <text x={mapTh(t)} y={py1 + 19} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9px]">{t}°</text>
            </g>
          ))}
          <text x={px1 + 4} y={py1 + 19} className="ui fill-[var(--ink-faint)] text-[9px]">θ</text>
          {/* curve + live dot */}
          <path d={psiPath} fill="none" stroke={ORANGE} strokeWidth={2} />
          <circle cx={mapTh(liveAngle)} cy={mapPsi(psiLive)} r={4.5} fill={PURPLE} stroke="#fff" strokeWidth={1.5} />

          {/* scale bar: 100 px = 1 m */}
          <line x1={620} y1={330} x2={720} y2={330} stroke="#50525e" strokeWidth={2} />
          <line x1={620} y1={325} x2={620} y2={335} stroke="#50525e" strokeWidth={2} />
          <line x1={720} y1={325} x2={720} y2={335} stroke="#50525e" strokeWidth={2} />
          <text x={670} y={348} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">1 m</text>
        </svg>
        <ControlBar>
          {!running && (
            <LabeledSlider label="crank θ" value={crankAngle} min={0} max={359} step={1}
              onChange={onScrub}
              fmt={v => `${v.toFixed(0)}°`} color={PURPLE} width={200} />
          )}
          <WidgetButton onClick={() => {
            if (running) setCrankAngle(angleRef.current);
            else angleRef.current = crankAngle;
            setRunning(r => !r);
          }} active={running}>
            {running ? "Stop" : "Animate crank"}
          </WidgetButton>
          <Readout label="crank θ" value={`${liveAngle.toFixed(0)}°`} color={PURPLE} />
          <Readout label="rocker ψ" value={`${psiLive.toFixed(1)}°`} color={ORANGE} />
          <Readout label="swing" value={`${(sweep.hi.psi - sweep.lo.psi).toFixed(0)}°`} color={GOLD_TXT} />
          <Readout label="scrubbed" value={`${binCount}/24`} color={binCount >= 24 ? GREEN : "#8a8a9b"} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys7-fourbar-trace" met={scrubMet}>
        Drive the crank yourself: with the animation stopped, drag the crank slider through one
        full revolution until all 24 dial dots turn gold. The blue coupler curve closes into a
        loop, and the live dot in the ψ(θ) card sweeps from one gold extreme to the other and
        back — full rotation in, finite oscillation out. (Watching the animation draws the
        curve, but your own scrubbing is what earns this one.)
      </Challenge>
    </>
  );
}

export default function EngineeringDynamics() {
  return (
    <div>
      <PageHeader
        chapter="Physics 7"
        section="College Physics & Dynamics"
        title="Engineering Dynamics"
        lede="Rigid body motion in a plane is described by three numbers: two for translation of the center of mass and one for rotation. Every point in the body has a velocity that is the superposition of both."
      />

      <p>
        Slide a book across a table while spinning it, and freeze time: every point of the book
        is moving in its own direction at its own speed — thousands of different velocities on
        one object. Yet a <strong>rigid body</strong> (one that cannot stretch or bend) in a
        plane needs only <em>three numbers</em> to describe its motion completely: two for how
        its center translates, one for how fast it spins. Every point's velocity follows from
        those three:
      </p>
      <Eq>{"\\mathbf{v}_P = \\mathbf{v}_A + \\boldsymbol{\\omega} \\times \\mathbf{r}_{AP}."}</Eq>
      <p>
        Read it back: pick any reference point A you like. Point P's velocity is A's velocity
        (the shared translation), plus a rotation contribution that grows with P's distance
        from A and points perpendicular to the line joining them. Rigidity is what makes this
        work — no point is allowed to change its distance to any other, so rotation is the only
        extra motion available.
      </p>

      <p>
        <strong>Try this:</strong> set <M>{"\\omega = 0"}</M> and see the most boring field in
        physics — every arrow identical (pure translation). Then set{" "}
        <M>{"v_x = v_y = 0"}</M> for a pure pinwheel about the center. Now mix them: with both
        knobs nonzero there is <em>always</em> one point standing perfectly still, and the gold
        ICR marker shows you exactly where it is, live. For the challenge, steer that gold
        marker onto a grid dot and watch the dot's arrow vanish.
      </p>

      <RigidBodyVelocity />

      <H2>Instantaneous center of rotation</H2>
      <p>
        The still point you found above has a name: the{" "}
        <strong>instantaneous center of rotation</strong> (ICR). At any frozen instant, a
        moving rigid body's velocity field looks like pure rotation about its ICR — translation
        is just the special case where the ICR has moved off to infinity. For a wheel rolling
        without slipping, the ICR is the contact point with the ground: that point of rubber is
        momentarily <em>at rest</em> (that's what "not slipping" means), while the top of the
        wheel moves at twice the center's speed.
      </p>

      <p>
        <strong>Try this:</strong> read each green arrow as "distance from the gold ICR dot,
        times ω" — the contact point (zero distance) doesn't move, the hub moves at{" "}
        <M>{"v"}</M>, the top at <M>{"2v"}</M>. Then press <em>roll</em> and watch the red rim
        point: it traces arches (a <em>cycloid</em>) and kisses the ground at the gold cusp
        markers — each cusp is an instant when that piece of rubber was truly at rest. Finally
        drag the orange probe around the rim and watch its speed gauge: farther from the ICR
        means faster, which is why the top of your car's tires travels at twice your
        speedometer reading.
      </p>

      <InstantaneousCenter />

      <Worked title="How fast does a tire spin on the highway?">
        <p>
          <strong>Given.</strong> A car drives at 30 m/s (108 km/h) on tires of radius 0.3 m.
          Find the wheel's spin rate and the speed of the tire's top.
        </p>
        <p>
          <strong>Set up.</strong> Rolling without slipping: <M>{"v = R\\omega"}</M>, so{" "}
          <M>{"\\omega = v/R"}</M>.
        </p>
        <p>
          <strong>Solve.</strong> <M>{"\\omega = 30/0.3 = 100"}</M> rad/s — about 955 rpm. Top
          of the tire: <M>{"2v = 60"}</M> m/s, or 216 km/h.
        </p>
        <p>
          <strong>Check.</strong> The contact patch is at 0 km/h — which is why tread can grip
          the road at all, and why a photo of a moving car shows sharp wheel bottoms and
          blurred tops.
        </p>
      </Worked>

      <KeyIdea>
        Rolling without slipping imposes a constraint <M>{"v = R\\omega"}</M> that halves
        the degrees of freedom. The constraint is <em>nonholonomic</em> — a word you'll meet
        properly in Chapter 13; it means the constraint restricts velocity but not position,
        which is why a car can reach any parking spot despite never being able to slide
        sideways.
      </KeyIdea>

      <H2>Four-bar linkage</H2>
      <p>
        A four-bar linkage has four rigid links connected by revolute joints. When the
        shortest link can rotate fully, the mechanism is a <em>crank-rocker</em>. The
        coupler point (on the middle link) traces a complex algebraic curve called the
        <em>coupler curve</em>. Linkages are the backbone of classical mechanism design.
      </p>
      <Eq>{"\\text{DOF} = 3(N-1) - 2J = 3(4-1) - 2(4) = 1."}</Eq>
      <p>
        Read it back: three links free to move in the plane would have 9 freedoms; each of the
        four pin joints removes 2; one freedom survives. One degree of freedom means one motor
        drives the whole mechanism — turn the crank and everything else <em>must</em> follow.
        (This counting rule is Grübler's formula; Chapter 2 of Modern Robotics builds it
        carefully.)
      </p>
      <p>
        <strong>Try this:</strong> scrub the crank slider slowly through a full turn (the dial
        dots around the crank turn gold as you cover it). Watch the orange rocker in both
        places at once: on the mechanism it swings between its two gold ghost positions, and in
        the ψ(θ) card the live dot rides a wave between the gold extremes — the crank only ever
        goes forward, yet the rocker oscillates, a rotation converted into a back-and-forth
        with zero gears. Windshield wipers, bicycle derailleurs, oil-pump walking beams, and
        the legs of many walking toys are all four-bars wearing costumes.
      </p>

      <FourBarLinkage />

      <Aside>
        Linkages are the building blocks of many robot end-effectors, prosthetics, and
        parallel mechanisms. The Stewart-Gough platform from Chapter 7 of Modern Robotics
        is a spatial six-bar linkage with one DOF per actuated leg.
      </Aside>

      <Quiz
        challengeId="phys7-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: (
              <>
                A wheel rolls without slipping. At the instant a tread block touches the road,
                its velocity is…
              </>
            ),
            options: [
              { label: "exactly zero", correct: true },
              { label: "equal to the car's speed" },
              { label: "twice the car's speed" },
              { label: "backwards at the car's speed" },
            ],
            explain:
              "The contact point is the ICR — momentarily at rest. If it weren't, the tire would be skidding by definition.",
          },
          {
            prompt: (
              <>
                A planar rigid body translates at 2 m/s and spins at 1 rad/s. How many of its
                points are instantaneously at rest?
              </>
            ),
            options: [
              { label: "Exactly one — the ICR (possibly outside the body's material)", correct: true },
              { label: "None — everything is moving" },
              { label: "Infinitely many" },
              { label: "Only the center of mass" },
            ],
            explain:
              "Any translation-plus-rotation is a pure rotation about one point, at r = (−v_y/ω, v_x/ω) from the reference. The point may lie outside the physical body — it still organizes the whole field.",
          },
          {
            prompt: <>A four-bar linkage has one degree of freedom. Practically, this means…</>,
            options: [
              { label: "one motor at the crank determines the motion of every link", correct: true },
              { label: "it can only move in one direction" },
              { label: "only one link can move at a time" },
              { label: "it cannot move at all" },
            ],
            explain:
              "DOF counts independent ways to move. With one, a single actuator fully drives the mechanism — the economy that makes linkages so useful.",
          },
        ]}
      />

      <H2>Where you'll use this in Modern Robotics</H2>
      <p>
        The velocity-field formula <M>{"\\mathbf{v}_P = \\mathbf{v}_A + \\omega \\times \\mathbf{r}"}</M>{" "}
        is the planar shadow of the book's central object: the <em>twist</em> of Chapter 3,
        which packages <M>{"(\\omega, v)"}</M> into one six-dimensional velocity for bodies in
        3D. The ICR grows up to become the screw axis. Chapter 13 locates the ICR of a wheeled
        robot to decide how it can steer, and the four-bar is the doorway to Chapter 7's closed
        chains, where several "arms" grasp one platform and the loop constraint does the
        talking.
      </p>

      <BookRef>
        Physics track · Module 7 of 10: planar rigid body kinematics, instantaneous center,
        relative velocity, linkage analysis. Bridges to MR §3 (twists), §7 (closed chains),
        §13 (wheeled robots).
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
