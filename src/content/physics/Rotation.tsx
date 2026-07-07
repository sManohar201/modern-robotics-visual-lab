import { useEffect, useRef, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";
import { rad } from "../../lib/math/vec";

const W = 760;
const RED = "#d9483f";
const GREEN = "#2f9e44";
const BLUE = "#3b6fd4";
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";
const GOLD = "#caa53d";

/** One shared requestAnimationFrame loop (same house pattern as Physics 1). */
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

/** Pick a friendly tick step so axis numbers stay round. */
function niceStep(max: number) {
  const raw = Math.max(max, 1e-9) / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const m = n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10;
  return m * pow;
}

function ArrowDefsR() {
  const m = (id: string, color: string) => (
    <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
    </marker>
  );
  return (
    <defs>
      {m("rot-arr-r", RED)}
      {m("rot-arr-p", PURPLE)}
      {m("rot-arr-gold", GOLD)}
    </defs>
  );
}

// ------------------------------------------------------------------
// Torque and lever arm — beam scene + τ(θ) plot + target gauge
// ------------------------------------------------------------------
function TorqueLeverArm() {
  const HC = 470;
  const [pivotFrac, setPivotFrac] = useState(0.5);
  const [force, setForce] = useState(20);
  const [angle, setAngle] = useState(90);

  const PX_PER_M = 100;
  const barX0 = 100;
  const barX1 = 620;
  const barY = 140;
  const barL = barX1 - barX0; // 520 px = 5.2 m
  const pivotX = barX0 + pivotFrac * barL;
  const d = (barX1 - pivotX) / PX_PER_M; // lever arm in meters
  const th = rad(angle);
  const torque = force * d * Math.sin(th); // N·m
  const fPerp = force * Math.sin(th);

  // force arrow: θ measured from the beam (+x), θ=90° is straight up
  const S = 1.8; // px per newton
  const fx = Math.cos(th) * force * S;
  const fy = -Math.sin(th) * force * S;

  const torqueMet = Math.abs(torque - 2) < 0.15;

  // ---- τ(θ) plot geometry ----------------------------------------
  const plotX0 = 448, plotX1 = 716, plotY0 = 424, plotY1 = 292;
  const tauMax = Math.max(force * d, 2.5) * 1.12;
  const PX = (deg: number) => plotX0 + (deg / 180) * (plotX1 - plotX0);
  const PY = (tau: number) => plotY0 - (tau / tauMax) * (plotY0 - plotY1);
  const curve = Array.from({ length: 61 }, (_, i) => {
    const a = i * 3;
    return `${PX(a).toFixed(1)},${PY(force * d * Math.sin(rad(a))).toFixed(1)}`;
  }).join(" ");
  const tStep = niceStep(tauMax);
  const tTicks: number[] = [];
  for (let k = tStep; k <= tauMax; k += tStep) tTicks.push(k);

  // ---- target gauge (0–4 N·m) ------------------------------------
  const gx0 = 44, gx1 = 344, gy = 366;
  const GX = (v: number) => gx0 + (Math.min(Math.max(v, 0), 4) / 4) * (gx1 - gx0);

  return (
    <>
      <WidgetShell
        title="Torque and lever arm"
        onReset={() => { setPivotFrac(0.5); setForce(20); setAngle(90); }}
        caption="τ = F·d·sin θ. Slide the pivot to change the lever arm d (blue band on the ruler), tilt the force away from square-on, and watch the τ(θ) curve: only the perpendicular part of the force (dashed purple) turns the beam. The gauge tracks your distance from the 2 N·m challenge target."
      >
        <svg viewBox={`0 0 ${W} ${HC}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <ArrowDefsR />

          {/* lever-arm dimension line */}
          <line x1={pivotX} y1={barY - 30} x2={barX1} y2={barY - 30} stroke={BLUE} strokeWidth={2} strokeDasharray="6 4" />
          <text x={(pivotX + barX1) / 2} y={barY - 37} textAnchor="middle" className="ui text-[12px] font-semibold" fill={BLUE}>
            d = {d.toFixed(2)} m
          </text>

          {/* beam */}
          <rect x={barX0} y={barY - 10} width={barL} height={20} rx={5} fill="#d6d2c4" stroke="#8a8a9b" strokeWidth={2} />

          {/* pivot triangle */}
          <polygon points={`${pivotX},${barY + 10} ${pivotX - 18},${barY + 36} ${pivotX + 18},${barY + 36}`} fill="#50525e" />
          <line x1={pivotX - 24} y1={barY + 37} x2={pivotX + 24} y2={barY + 37} stroke="#50525e" strokeWidth={2} />

          {/* torque arc around the pivot — thickness scales with τ */}
          {torque > 0.02 && (
            <path
              d={`M ${pivotX + 44} ${barY} A 44 44 0 0 0 ${pivotX} ${barY - 44}`}
              fill="none" stroke={GOLD} strokeWidth={2 + Math.min(torque, 30) / 7}
              markerEnd="url(#rot-arr-gold)" opacity={0.9}
            />
          )}

          {/* force arrow + components at the beam tip */}
          <line x1={barX1} y1={barY} x2={barX1 + fx} y2={barY + fy} stroke={RED} strokeWidth={4.5} markerEnd="url(#rot-arr-r)" />
          <text x={barX1 + fx + (fx >= 0 ? 10 : -10)} y={barY + fy - 8} textAnchor={fx >= 0 ? "start" : "end"}
            className="ui text-[12.5px] font-semibold" fill={RED}>
            F = {force.toFixed(0)} N
          </text>
          {/* perpendicular (turning) component */}
          <line x1={barX1} y1={barY} x2={barX1} y2={barY + fy} stroke={PURPLE} strokeWidth={2.5} strokeDasharray="5 4" markerEnd="url(#rot-arr-p)" />
          <text x={barX1 + 8} y={barY + fy / 2} className="ui text-[10.5px] font-semibold" fill={PURPLE}>F⊥</text>
          {/* wasted along-beam component */}
          {Math.abs(fx) > 4 && (
            <>
              <line x1={barX1} y1={barY} x2={barX1 + fx} y2={barY} stroke="#9e9e9e" strokeWidth={2} strokeDasharray="3 4" />
              <text x={barX1 + fx / 2} y={barY + 16} textAnchor="middle" className="ui text-[9.5px]" fill="#8a8a9b">wasted</text>
            </>
          )}
          {/* θ arc between beam and force */}
          <path d={`M ${barX1 + 26} ${barY} A 26 26 0 0 ${fy <= 0 ? 0 : 1} ${barX1 + 26 * Math.cos(th)} ${barY - 26 * Math.sin(th)}`}
            fill="none" stroke={BLUE} strokeWidth={1.6} />
          <text x={barX1 + 40 * Math.cos(th / 2)} y={barY - 40 * Math.sin(th / 2) + 4} textAnchor="middle"
            className="ui text-[10.5px] font-semibold" fill={BLUE}>θ</text>

          {/* ruler in meters, with the lever arm shaded */}
          <rect x={pivotX} y={214} width={barX1 - pivotX} height={12} fill={BLUE} opacity={0.13} />
          <line x1={barX0} y1={226} x2={barX1} y2={226} stroke="#a8a496" strokeWidth={1.4} />
          {[0, 1, 2, 3, 4, 5].map(mk => (
            <g key={mk}>
              <line x1={barX0 + mk * PX_PER_M} y1={221} x2={barX0 + mk * PX_PER_M} y2={231} stroke="#a8a496" strokeWidth={1.1} />
              <text x={barX0 + mk * PX_PER_M} y={245} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9.5px]">{mk}</text>
            </g>
          ))}
          <text x={barX1 + 14} y={245} className="ui fill-[var(--ink-faint)] text-[9.5px]">m</text>
          <line x1={pivotX} y1={214} x2={pivotX} y2={231} stroke={BLUE} strokeWidth={1.6} />
          <text x={pivotX} y={209} textAnchor="middle" className="ui text-[9.5px] font-semibold" fill={BLUE}>pivot</text>

          {/* ---------- readout + target-gauge card ---------- */}
          <rect x={24} y={262} width={348} height={192} rx={9} fill="#ffffff" opacity={0.92} stroke="#d8d4c8" />
          <text x={44} y={288} className="ui text-[12px]" fill="var(--ink-soft)">τ = F · d · sin θ</text>
          <text x={44} y={314} className="ui text-[16px] font-bold" fill={PURPLE}>τ = {torque.toFixed(2)} N·m</text>
          <text x={44} y={336} className="ui text-[11px]" fill={PURPLE}>F⊥ = F sin θ = {fPerp.toFixed(1)} N</text>
          {/* target gauge */}
          <text x={44} y={358} className="ui fill-[var(--ink-faint)] text-[10px]">target gauge (0–4 N·m)</text>
          <rect x={gx0} y={gy} width={gx1 - gx0} height={9} rx={4.5} fill="#eceadf" stroke="#d8d4c8" strokeWidth={0.8} />
          <rect x={GX(1.85)} y={gy - 2} width={GX(2.15) - GX(1.85)} height={13} rx={3} fill={GOLD} opacity={0.55} />
          <path d={`M ${GX(torque)} ${gy - 3} l -5 -8 l 10 0 Z`} fill={torqueMet ? GREEN : RED} />
          {[0, 1, 2, 3, 4].map(v => (
            <text key={v} x={GX(v)} y={gy + 24} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9px]">{v}</text>
          ))}
          {torque > 4 && (
            <text x={gx1} y={gy - 10} textAnchor="end" className="ui text-[9.5px] font-semibold" fill={RED}>τ off scale →</text>
          )}
          {/* force-arrow scale legend */}
          <line x1={44} y1={430} x2={44 + 20 * S} y2={430} stroke={RED} strokeWidth={4} markerEnd="url(#rot-arr-r)" />
          <text x={44 + 20 * S + 10} y={434} className="ui fill-[var(--ink-faint)] text-[10px]">force arrows: this length = 20 N</text>

          {/* ---------- τ(θ) plot card ---------- */}
          <rect x={396} y={262} width={344} height={192} rx={9} fill="#ffffff" opacity={0.92} stroke="#d8d4c8" />
          <text x={412} y={284} className="ui fill-[var(--ink-faint)] text-[11px]">τ vs angle θ (at current F and d)</text>
          {tTicks.map(k => (
            <g key={k}>
              <line x1={plotX0} y1={PY(k)} x2={plotX1} y2={PY(k)} stroke="#eceadf" strokeDasharray="3 4" />
              <text x={plotX0 - 5} y={PY(k) + 3} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9px]">
                {k < 10 ? k.toFixed(1) : k.toFixed(0)}
              </text>
            </g>
          ))}
          <line x1={plotX0} y1={plotY0} x2={plotX1} y2={plotY0} stroke="#cfcabc" strokeWidth={1.2} />
          <line x1={plotX0} y1={plotY0} x2={plotX0} y2={plotY1 - 6} stroke="#cfcabc" strokeWidth={1.2} />
          {[0, 45, 90, 135, 180].map(a => (
            <g key={a}>
              <line x1={PX(a)} y1={plotY0} x2={PX(a)} y2={plotY0 + 4} stroke="#a8a496" />
              <text x={PX(a)} y={plotY0 + 15} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9px]">{a}°</text>
            </g>
          ))}
          <text x={plotX1 + 4} y={plotY0 + 15} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[8.5px]">θ</text>
          <text x={plotX0 - 26} y={plotY1 - 10} className="ui fill-[var(--ink-faint)] text-[9px]">N·m</text>
          {/* challenge target line */}
          {2 <= tauMax && (
            <>
              <line x1={plotX0} y1={PY(2)} x2={plotX1} y2={PY(2)} stroke={GOLD} strokeWidth={1.6} strokeDasharray="5 4" />
              <text x={plotX1} y={PY(2) - 4} textAnchor="end" className="ui text-[9px] font-semibold" fill="#8a6d12">target 2 N·m</text>
            </>
          )}
          {/* the curve, its 90° peak, and you */}
          <polyline points={curve} fill="none" stroke={PURPLE} strokeWidth={2.2} />
          <circle cx={PX(90)} cy={PY(force * d)} r={3.5} fill="none" stroke={GOLD} strokeWidth={2} />
          <text x={PX(90)} y={PY(force * d) - 8} textAnchor="middle" className="ui text-[9px] font-semibold" fill="#8a6d12">max at 90°</text>
          <circle cx={PX(angle)} cy={PY(torque)} r={5} fill={GOLD} stroke="#fff" strokeWidth={1.8} />
        </svg>
        <ControlBar>
          <LabeledSlider label="pivot position" value={pivotFrac} min={0.05} max={0.95} step={0.01}
            onChange={setPivotFrac} fmt={v => `${(v * 100).toFixed(0)}%`} />
          <LabeledSlider label="force F" value={force} min={1} max={50} step={0.5} onChange={setForce}
            fmt={v => `${v.toFixed(1)} N`} color={RED} />
          <LabeledSlider label="angle θ" value={angle} min={10} max={170} step={1} onChange={setAngle}
            fmt={v => `${v.toFixed(0)}°`} color={BLUE} />
          <Readout label="d" value={`${d.toFixed(2)} m`} color={BLUE} />
          <Readout label="τ" value={`${torque.toFixed(2)} N·m`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys5-torque-2nm" met={torqueMet}>
        Achieve exactly <M>{"2 \\pm 0.15 \\text{ N·m}"}</M> of torque — put the needle in the gold
        zone of the gauge. Try different combinations of force, lever-arm length, and angle. A
        perpendicular force (90°) gives maximum torque for a given distance.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Moment of inertia comparison — real axis, gridlines, target line
// ------------------------------------------------------------------
function MomentOfInertia() {
  const HC = 400;
  const [mass, setMass] = useState(2);
  const [radius, setRadius] = useState(1);

  const ringI = mass * radius * radius;
  const inertiaMet = Math.abs(ringI - 8) < 0.15 && mass <= 4.05;

  const shapes = [
    { label: "Ring / Hoop", formula: "I = mR²", I: mass * radius * radius, color: RED },
    { label: "Solid Disk", formula: "I = ½mR²", I: 0.5 * mass * radius * radius, color: GREEN },
    { label: "Solid Sphere", formula: "I = ⅖mR²", I: 0.4 * mass * radius * radius, color: BLUE },
    { label: "Point mass at R", formula: "I = mR²", I: mass * radius * radius, color: ORANGE },
  ];

  // axis: target line at 8 kg·m² always in view, so you can see how far you are
  const yMax = Math.max(ringI, 8) * 1.18;
  const y0 = 316;
  const plotTop = 90;
  const IY = (v: number) => y0 - (v / yMax) * (y0 - plotTop);
  const step = niceStep(yMax);
  const ticks: number[] = [];
  for (let k = step; k <= yMax; k += step) ticks.push(k);

  return (
    <>
      <WidgetShell
        title="Moment of inertia — shape comparison"
        onReset={() => { setMass(2); setRadius(1); }}
        caption="Same mass and radius for all four — only the mass distribution differs. The gold dashed line is the challenge target: 8 kg·m² for the ring, using at most 4 kg. Double the radius and watch every bar quadruple (that's the R² in I = Σmr²)."
      >
        <svg viewBox={`0 0 ${W} ${HC}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* gridlines + numbered axis */}
          {ticks.map(k => (
            <g key={k}>
              <line x1={120} y1={IY(k)} x2={724} y2={IY(k)} stroke="#eceadf" strokeDasharray="3 4" />
              <text x={112} y={IY(k) + 3} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9.5px]">
                {k < 10 && step < 1 ? k.toFixed(1) : k.toFixed(0)}
              </text>
            </g>
          ))}
          <line x1={120} y1={y0} x2={724} y2={y0} stroke="#cfcabc" strokeWidth={1.2} />
          <line x1={120} y1={y0} x2={120} y2={plotTop - 26} stroke="#cfcabc" strokeWidth={1.2} />
          <text x={112} y={y0 + 3} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9.5px]">0</text>
          <text x={24} y={plotTop - 32} className="ui fill-[var(--ink-faint)] text-[10.5px]">I (kg·m²)</text>

          {/* challenge target line */}
          <line x1={120} y1={IY(8)} x2={724} y2={IY(8)} stroke={GOLD} strokeWidth={1.8} strokeDasharray="6 4" />
          <text x={724} y={IY(8) - 6} textAnchor="end" className="ui text-[10px] font-semibold" fill="#8a6d12">
            challenge target · 8 kg·m² (ring)
          </text>

          {shapes.map((sh, i) => {
            const bx = 156 + i * 142;
            const cx = bx + 42;
            const barH = y0 - IY(sh.I);
            const r = 18;
            return (
              <g key={sh.label}>
                {/* shape icon above the column */}
                {i === 0 && <circle cx={cx} cy={48} r={r} fill="none" stroke={sh.color} strokeWidth={6} />}
                {i === 1 && <circle cx={cx} cy={48} r={r} fill={sh.color} opacity={0.3} stroke={sh.color} strokeWidth={2.5} />}
                {i === 2 && (
                  <>
                    <circle cx={cx} cy={48} r={r} fill={sh.color} opacity={0.5} stroke={sh.color} strokeWidth={2} />
                    <circle cx={cx - 6} cy={42} r={5} fill="#fff" opacity={0.55} />
                  </>
                )}
                {i === 3 && (
                  <>
                    <line x1={cx} y1={48} x2={cx + r} y2={48} stroke={sh.color} strokeWidth={2} strokeDasharray="4 3" />
                    <circle cx={cx} cy={48} r={2.5} fill="#8a8a9b" />
                    <circle cx={cx + r} cy={48} r={7} fill={sh.color} />
                  </>
                )}
                {/* bar */}
                <rect x={bx} y={IY(sh.I)} width={84} height={Math.max(barH, 0.5)} rx={4}
                  fill={sh.color} opacity={0.25} stroke={sh.color} strokeWidth={1.5} />
                <text x={cx} y={IY(sh.I) - 7} textAnchor="middle" className="ui text-[12px] font-bold" fill={sh.color}>
                  {sh.I.toFixed(2)}
                </text>
                {/* labels below the axis */}
                <text x={cx} y={y0 + 20} textAnchor="middle" className="ui text-[11px] font-bold" fill={sh.color}>{sh.label}</text>
                <text x={cx} y={y0 + 36} textAnchor="middle" className="ui text-[10.5px]" fill="#8a8a9b">{sh.formula}</text>
              </g>
            );
          })}
        </svg>
        <ControlBar>
          <LabeledSlider label="mass m" value={mass} min={0.1} max={10} step={0.1} onChange={setMass}
            fmt={v => `${v.toFixed(1)} kg`} />
          <LabeledSlider label="radius R" value={radius} min={0.1} max={2} step={0.05} onChange={setRadius}
            fmt={v => `${v.toFixed(2)} m`} />
          <Readout label="I_ring" value={`${(mass * radius * radius).toFixed(3)} kg·m²`} color={RED} />
          <Readout label="I_disk" value={`${(0.5 * mass * radius * radius).toFixed(3)} kg·m²`} color={GREEN} />
          <Readout label="I_sphere" value={`${(0.4 * mass * radius * radius).toFixed(3)} kg·m²`} color={BLUE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys5-inertia-target" met={inertiaMet}>
        Raise the <em>ring's</em> bar to the gold target line — exactly <M>{"8 \\text{ kg·m}^2"}</M>{" "}
        (±0.15) — using <strong>at most 4 kg</strong> of mass. Mass alone won't get you there —
        you'll have to exploit the fact that radius enters as <M>{"R^2"}</M>.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Rolling race — real dynamics, strobes, winner marker, ω(t) plot
// ------------------------------------------------------------------
function RollingRace() {
  const HC = 520;
  const [angle, setAngle] = useState(20);
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);

  const L = 6; // slope length, m
  const R = 0.2; // common radius, m
  const g = 9.81;
  const betas = [1, 0.5, 0.4]; // hoop, disk, sphere: I = β m R²
  const names = ["hoop", "disk", "sphere"];
  const colors = [RED, GREEN, BLUE];
  const th = rad(angle);
  const accels = betas.map(b => (g * Math.sin(th)) / (1 + b)); // a = g sinθ/(1+β)
  const Tfin = accels.map(a => Math.sqrt((2 * L) / a)); // time to cover L from rest
  const sOf = (a: number, tt: number) => Math.min(0.5 * a * tt * tt, L);

  useEffect(() => { setRunning(false); setT(0); }, [angle]);
  useRaf(running, dt => setT(tt => tt + dt));
  const raceOver = t >= Tfin[0] + 0.4; // hoop (β=1) is always last
  useEffect(() => { if (raceOver) setRunning(false); }, [raceOver]);

  function startPause() {
    if (running) { setRunning(false); return; }
    if (t >= Tfin[0]) setT(0);
    setRunning(true);
  }

  // ---- ramp geometry (screen) ------------------------------------
  const PXM = 50; // px per meter
  const Lpx = L * PXM;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const ox = 60;
  const oy = 252; // bottom of ramp
  const topX = ox;
  const topY = oy - Lpx * sin;
  // point on the ramp surface at distance s (m) from the top
  const P = (s: number): [number, number] => [topX + s * PXM * cos, topY + s * PXM * sin];
  // unit normal pointing away from the surface
  const nx = sin, ny = -cos;
  const laneOff = [0, 30, 60]; // hoop on the surface, disk and sphere on raised lanes
  const rpx = R * PXM;
  const center = (i: number, s: number): [number, number] => {
    const [px, py] = P(s);
    const off = laneOff[i] + rpx;
    return [px + nx * off, py + ny * off];
  };

  // strobe times every 0.4 s up to now
  const strobes: number[] = [];
  for (let k = 0.4; k <= t; k += 0.4) strobes.push(k);

  // finishing order by time (sphere < disk < hoop, always)
  const order = [2, 1, 0];

  // ---- ω(t) plot geometry ----------------------------------------
  const pX0 = 84, pX1 = 690, pY0 = 468, pY1 = 322;
  const Tmax = Tfin[0] * 1.04;
  const wMax = (accels[2] * Tfin[2]) / R * 1.08;
  const TX = (tt: number) => pX0 + (tt / Tmax) * (pX1 - pX0);
  const WY = (w: number) => pY0 - (w / wMax) * (pY0 - pY1);
  const wStep = niceStep(wMax);
  const wTicks: number[] = [];
  for (let k = wStep; k <= wMax; k += wStep) wTicks.push(k);
  const tStep = niceStep(Tmax);
  const tTicks: number[] = [];
  for (let k = tStep; k <= Tmax; k += tStep) tTicks.push(k);

  const sphereWinsMet = t >= Tfin[2] && Tfin[2] < Math.min(Tfin[0], Tfin[1]);

  return (
    <>
      <WidgetShell
        title="Rolling race — moment of inertia and speed"
        onReset={() => { setRunning(false); setT(0); }}
        caption="All three have the same mass and radius; only β differs. Ghost dots are equal-time strobes (0.4 s apart) — the sphere's spread apart fastest. Below, ω(t) = at/R is drawn live for each racer: the slope of each line is its angular acceleration, and the gold dots mark each finish."
      >
        <svg viewBox={`0 0 ${W} ${HC}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <ArrowDefsR />

          {/* ramp */}
          <polygon points={`${topX},${topY} ${ox + Lpx * cos},${oy} ${ox},${oy}`}
            fill="#ece8dd" stroke="#8a8a9b" strokeWidth={1.5} />
          <text x={ox + (Lpx * cos) / 2} y={oy + 18} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">
            slope length L = {L} m · θ = {angle}°
          </text>
          {/* raised lanes for disk and sphere */}
          {[1, 2].map(i => (
            <line key={i}
              x1={P(0)[0] + nx * laneOff[i]} y1={P(0)[1] + ny * laneOff[i]}
              x2={P(L)[0] + nx * laneOff[i]} y2={P(L)[1] + ny * laneOff[i]}
              stroke="#c4c0b4" strokeWidth={1.2} strokeDasharray="5 5" />
          ))}

          {/* finish line across all lanes */}
          <line x1={P(L)[0]} y1={P(L)[1]}
            x2={P(L)[0] + nx * (laneOff[2] + 2 * rpx + 8)} y2={P(L)[1] + ny * (laneOff[2] + 2 * rpx + 8)}
            stroke={GOLD} strokeWidth={3} strokeDasharray="8 4" />

          {/* equal-time strobes */}
          {strobes.map(st =>
            [0, 1, 2].map(i => {
              const [cx, cy] = center(i, sOf(accels[i], st));
              return <circle key={`${st}-${i}`} cx={cx} cy={cy} r={2.6} fill={colors[i]} opacity={0.3} />;
            })
          )}

          {/* racers, with a spoke so you can see them spin */}
          {[0, 1, 2].map(i => {
            const s = sOf(accels[i], t);
            const [cx, cy] = center(i, s);
            const phi = (s / R) - th; // rolling: rotation angle grows with distance
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={rpx + (i === 0 ? 0 : 0)} fill={colors[i]} opacity={0.85} stroke="#fff" strokeWidth={2} />
                {i === 0 && <circle cx={cx} cy={cy} r={rpx - 4.5} fill="#fbfaf7" opacity={0.85} />}
                <line x1={cx} y1={cy} x2={cx + (rpx - 2) * Math.cos(phi)} y2={cy + (rpx - 2) * Math.sin(phi)}
                  stroke={i === 0 ? colors[i] : "#fff"} strokeWidth={2} opacity={0.9} />
                {/* name at the start of each lane */}
                <text x={P(0)[0] + nx * (laneOff[i] + rpx) - 12} y={P(0)[1] + ny * (laneOff[i] + rpx) + 4}
                  textAnchor="end" className="ui text-[10.5px] font-bold" fill={colors[i]}>
                  {names[i]}
                </text>
                {/* finish time appears as each racer crosses */}
                {t >= Tfin[i] && (
                  <text x={P(L)[0] + nx * (laneOff[i] + rpx) + 14} y={P(L)[1] + ny * (laneOff[i] + rpx) + 4}
                    className="ui text-[10px] font-semibold" fill={colors[i]}>
                    {Tfin[i].toFixed(2)} s
                  </text>
                )}
              </g>
            );
          })}

          {/* winner banner */}
          {t >= Tfin[2] && (
            <g>
              <circle cx={P(L)[0] + nx * (laneOff[2] + rpx)} cy={P(L)[1] + ny * (laneOff[2] + rpx)} r={rpx + 5}
                fill="none" stroke={GOLD} strokeWidth={2.5} />
              <text x={W / 2 + 90} y={40} textAnchor="middle" className="ui text-[13px] font-bold" fill="#8a6d12">
                ★ sphere wins in {Tfin[2].toFixed(2)} s — smallest β, biggest a
              </text>
            </g>
          )}

          {/* results card */}
          <rect x={506} y={58} width={234} height={92} rx={9} fill="#ffffff" opacity={0.92} stroke="#d8d4c8" />
          <text x={520} y={78} className="ui fill-[var(--ink-faint)] text-[10.5px]">a = g·sinθ / (1 + β)</text>
          {order.map((i, row) => (
            <g key={i} className="ui">
              <rect x={520} y={86 + row * 19} width={9} height={9} rx={2} fill={colors[i]} />
              <text x={535} y={94 + row * 19} className="text-[10.5px] font-semibold" fill={colors[i]}>
                {names[i]} · β = {betas[i]}
              </text>
              <text x={726} y={94 + row * 19} textAnchor="end" className="text-[10.5px]" fill={t >= Tfin[i] ? "#8a6d12" : "var(--ink-faint)"}>
                {t >= Tfin[i] ? `${["1st", "2nd", "3rd"][row]} · ${Tfin[i].toFixed(2)} s` : `a = ${accels[i].toFixed(2)} m/s²`}
              </text>
            </g>
          ))}

          {/* ---------- ω(t) plot card ---------- */}
          <rect x={24} y={288} width={712} height={218} rx={9} fill="#ffffff" opacity={0.92} stroke="#d8d4c8" />
          <text x={40} y={310} className="ui fill-[var(--ink-faint)] text-[11px]">angular velocity ω(t) = a·t / R while racing</text>
          {wTicks.map(k => (
            <g key={k}>
              <line x1={pX0} y1={WY(k)} x2={pX1} y2={WY(k)} stroke="#eceadf" strokeDasharray="3 4" />
              <text x={pX0 - 6} y={WY(k) + 3} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9px]">{k.toFixed(0)}</text>
            </g>
          ))}
          {tTicks.map(k => (
            <g key={k}>
              <line x1={TX(k)} y1={pY0} x2={TX(k)} y2={pY0 + 4} stroke="#a8a496" />
              <text x={TX(k)} y={pY0 + 15} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9px]">
                {tStep < 1 ? k.toFixed(1) : k.toFixed(0)}
              </text>
            </g>
          ))}
          <line x1={pX0} y1={pY0} x2={pX1} y2={pY0} stroke="#cfcabc" strokeWidth={1.2} />
          <line x1={pX0} y1={pY0} x2={pX0} y2={pY1 - 6} stroke="#cfcabc" strokeWidth={1.2} />
          <text x={pX1 + 8} y={pY0 + 15} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9px]">t (s)</text>
          <text x={pX0 - 44} y={pY1 - 8} className="ui fill-[var(--ink-faint)] text-[9px]">ω (rad/s)</text>
          {/* curves drawn up to the current time, capped at each finish */}
          {[0, 1, 2].map(i => {
            const tEnd = Math.min(t, Tfin[i]);
            if (tEnd <= 0) return null;
            const pts = Array.from({ length: 41 }, (_, k) => {
              const tt = (tEnd * k) / 40;
              return `${TX(tt).toFixed(1)},${WY((accels[i] * tt) / R).toFixed(1)}`;
            }).join(" ");
            return (
              <g key={i}>
                <polyline points={pts} fill="none" stroke={colors[i]} strokeWidth={2.2} />
                {t >= Tfin[i] && (
                  <>
                    <circle cx={TX(Tfin[i])} cy={WY((accels[i] * Tfin[i]) / R)} r={4.5} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
                    <text x={TX(Tfin[i])} y={WY((accels[i] * Tfin[i]) / R) - 9} textAnchor="middle"
                      className="ui text-[9px] font-semibold" fill="#8a6d12">
                      finish
                    </text>
                  </>
                )}
              </g>
            );
          })}
          {/* legend */}
          <g className="ui">
            {[2, 1, 0].map((i, k) => (
              <g key={i}>
                <rect x={pX0 + 12 + k * 92} y={pY1 - 2} width={9} height={9} rx={2} fill={colors[i]} />
                <text x={pX0 + 26 + k * 92} y={pY1 + 6} className="text-[9.5px]" fill="var(--ink-soft)">
                  {names[i]} β={betas[i]}
                </text>
              </g>
            ))}
          </g>
        </svg>
        <ControlBar>
          <WidgetButton onClick={startPause} active={running}>
            {running ? "pause" : t > 0 && t < Tfin[0] ? "resume" : "start race"}
          </WidgetButton>
          <LabeledSlider label="angle θ" value={angle} min={5} max={40} step={1} onChange={setAngle}
            fmt={v => `${v.toFixed(0)}°`} />
          <Readout label="t" value={`${Math.min(t, Tfin[0]).toFixed(2)} s`} />
          {accels.map((a, i) => (
            <Readout key={i} label={`a_${names[i]}`} value={`${a.toFixed(2)} m/s²`} color={colors[i]} />
          ))}
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys5-rolling-sphere-wins" met={sphereWinsMet}>
        Run the race and verify that the sphere wins (crosses the gold finish line first — it gets
        the gold ring and the earliest finish dot on the ω(t) plot). The sphere has the smallest{" "}
        <M>{"\\beta = 2/5"}</M> and thus the largest rolling acceleration.
      </Challenge>
    </>
  );
}

export default function Rotation() {
  return (
    <div>
      <PageHeader
        chapter="Physics 5"
        section="College Physics & Dynamics"
        title="Rotational Motion"
        lede="Rotation is translation's counterpart. Torque drives angular acceleration, moment of inertia resists it, and angular momentum is conserved when the net torque is zero."
      />

      <p>
        Try opening a door by pushing right next to the hinge. Same door, same push — and it
        barely moves. Push at the handle and it swings easily. What changed is not the force
        but its <em>leverage</em>, and the quantity that captures force-with-leverage is{" "}
        <strong>torque</strong>: the turning effectiveness of a force. Everything you learned
        about straight-line motion has a rotational twin. Position becomes angle{" "}
        <M>{"\\theta"}</M>, velocity becomes angular velocity <M>{"\\omega"}</M> (radians per
        second), force becomes torque <M>{"\\tau"}</M>, and mass becomes the{" "}
        <strong>moment of inertia</strong> <M>{"I"}</M>. Newton's second law comes along for
        the ride:
      </p>
      <Eq>{"\\tau = I\\alpha, \\qquad \\tau = F\\,d\\,\\sin\\theta."}</Eq>
      <p>
        Read the second one back: torque is force <M>{"F"}</M>, times the distance{" "}
        <M>{"d"}</M> from the pivot to where the force is applied, times{" "}
        <M>{"\\sin\\theta"}</M> — which keeps only the part of the force that pushes{" "}
        <em>around</em> rather than along the arm. Pull a wrench along its own handle and you
        get nothing (<M>{"\\theta = 0"}</M>); push square-on (<M>{"\\theta = 90°"}</M>) and
        every newton counts.
      </p>

      <p>
        <strong>Try this:</strong> hold the force at 20 N and find <em>three different ways</em>{" "}
        to hit the 2 N·m target in the challenge — long arm and shallow angle, short arm and
        square push, and something in between. Watch the gold dot ride the τ(θ) curve as you
        tilt the force: the curve peaks at 90° and dies at the ends, and the dashed purple
        arrow shows exactly how much of your force is actually turning the beam. Torque trades
        force, distance, and angle freely; that exchange rate is why a long wrench loosens
        what a short one cannot.
      </p>

      <TorqueLeverArm />

      <H2>Moment of inertia depends on mass distribution</H2>
      <p>
        Moment of inertia is the rotational analogue of mass — reluctance to be spun up. But
        unlike mass, it is not a property of the object alone: it depends on <em>where</em> the
        mass sits relative to the axis. Each chunk of mass contributes its mass times the{" "}
        <em>square</em> of its distance from the axis:
      </p>
      <Eq>{"I = \\sum m_i r_i^2."}</Eq>
      <p>
        That square is the whole story. Mass twice as far from the axis is four times harder to
        spin. It is why a figure skater's outstretched arms matter so much, why tightrope
        walkers carry long poles, and why the three shapes below — same mass, same radius —
        resist spinning differently:
      </p>
      <Eq>{"I_{\\text{hoop}} = mR^2, \\quad I_{\\text{disk}} = \\tfrac{1}{2}mR^2, \\quad I_{\\text{sphere}} = \\tfrac{2}{5}mR^2."}</Eq>
      <p>
        <strong>Try this:</strong> the hoop always tops the chart because <em>all</em> its mass
        sits at the full radius <M>{"R"}</M>; the disk averages over radii from 0 to{" "}
        <M>{"R"}</M>, so it comes in at half; the sphere hides even more mass near the axis.
        Now double the radius slider and watch every bar quadruple against the axis — that's
        the <M>{"R^2"}</M> speaking. The challenge below forces you to use it: the gold target
        line sits at 8 kg·m², and the mass budget alone can't reach it.
      </p>

      <MomentOfInertia />

      <H2>Rolling without slipping</H2>
      <p>
        A rolling object must accelerate both its center of mass (translation) and its
        rotation together. For an object with <M>{"I = \\beta m R^2"}</M>, the rolling
        acceleration down a slope is:
      </p>
      <Eq>{"a = \\frac{g\\sin\\theta}{1+\\beta}."}</Eq>
      <p>
        Smaller <M>{"\\beta"}</M> means less rotational inertia, so more acceleration goes
        into translation. The solid sphere (<M>{"\\beta=2/5"}</M>) always beats the hoop{" "}
        (<M>{"\\beta=1"}</M>) down a ramp — regardless of mass or radius.
      </p>

      <p>
        <strong>Try this:</strong> run the race and watch two things at once: on the ramp, the
        strobe dots — the sphere's spread apart fastest because it accelerates hardest — and
        below, the ω(t) lines fanning out with three different slopes (the slopes <em>are</em>{" "}
        the angular accelerations <M>{"a/R"}</M>). Then run it again at a steeper angle — the
        finishing <em>order</em> never changes, only the pace. A giant lead hoop loses to a
        marble-sized glass sphere: the race is decided entirely by shape, because rolling
        without slipping forces every object to spend part of its energy budget on spinning,
        and the hoop's budget line is the worst.
      </p>

      <RollingRace />

      <KeyIdea>
        Rolling without slipping ties translational and rotational motion together through
        the constraint <M>{"v = R\\omega"}</M>. This coupling is why mass distribution
        matters for racing down a slope.
      </KeyIdea>

      <Worked title="Sizing a joint motor's torque">
        <p>
          <strong>Given.</strong> A robot forearm is roughly a uniform rod of mass 3 kg and
          length 0.5 m, rotating about the elbow (for a rod about its end,{" "}
          <M>{"I = \\tfrac13 mL^2"}</M>). The spec calls for accelerating it at{" "}
          <M>{"\\alpha = 8\\ \\text{rad/s}^2"}</M>. What torque must the elbow motor produce?
        </p>
        <p>
          <strong>Set up.</strong>{" "}
          <M>{"I = \\tfrac13 (3)(0.5)^2 = 0.25\\ \\text{kg·m}^2"}</M>.
        </p>
        <p>
          <strong>Solve.</strong> <M>{"\\tau = I\\alpha = 0.25 \\times 8 = 2"}</M> N·m — the
          same torque you produced in the first widget's challenge.
        </p>
        <p>
          <strong>Check.</strong> Gravity check: holding the arm horizontally already takes{" "}
          <M>{"\\tau_g = mg\\tfrac{L}{2} \\approx 7.4"}</M> N·m — more than the acceleration
          torque! Real motor sizing is usually dominated by gravity, a preview of the
          gravity-compensation ideas in Module 10 and MR Chapter 8.
        </p>
      </Worked>

      <H2>Angular momentum: rotation's conserved currency</H2>
      <p>
        Just as force changes momentum, torque changes <strong>angular momentum</strong>{" "}
        <M>{"L = I\\omega"}</M>. And just as before: no external torque, no change. But here
        the conservation law has a twist that linear momentum never shows — a body can change
        its own <M>{"I"}</M> mid-flight. A figure skater pulling her arms in shrinks{" "}
        <M>{"I"}</M>, so <M>{"\\omega"}</M> must jump to keep <M>{"L = I\\omega"}</M> constant:
        she spins faster without anyone touching her. Divers, gymnasts, and falling cats play
        the same trick.
      </p>

      <Quiz
        challengeId="phys5-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: <>Why are door handles mounted as far from the hinge as possible?</>,
            options: [
              { label: "Maximum lever arm — the same force makes the most torque", correct: true },
              { label: "So the door swings faster once open" },
              { label: "To reduce the door's moment of inertia" },
              { label: "Pure convention" },
            ],
            explain:
              "τ = F·d·sinθ. Doubling the distance from the hinge doubles the torque of the same push.",
          },
          {
            prompt: (
              <>A spinning skater pulls her arms in and speeds up. What stayed constant?</>
            ),
            options: [
              { label: "Angular momentum L = Iω", correct: true },
              { label: "Angular velocity ω" },
              { label: "Moment of inertia I" },
              { label: "Rotational kinetic energy" },
            ],
            explain:
              "No external torque acts, so L is fixed: I drops, ω rises. (Her kinetic energy actually increases — her muscles do work pulling the arms in.)",
          },
          {
            prompt: (
              <>
                A huge heavy hoop races a small light solid sphere down the same ramp, both
                rolling without slipping. Who wins?
              </>
            ),
            options: [
              { label: "The sphere — β = 2/5 beats β = 1, size and mass are irrelevant", correct: true },
              { label: "The hoop — heavier means stronger gravity" },
              { label: "They tie — Galileo says everything falls alike" },
              { label: "The sphere, but only if it is heavier" },
            ],
            explain:
              "Rolling acceleration is g·sinθ/(1+β): mass and radius cancel, shape survives. Galileo's tie only holds when nothing has to spin.",
          },
        ]}
      />

      <H2>Where you'll use this in Modern Robotics</H2>
      <p>
        This module is the physical heart of the whole book. A robot is a chain of rotating
        links: torque and moment of inertia return in Chapter 8 as the joint torque vector and
        the mass matrix (built from every link's moments of inertia, and changing as the robot's
        shape changes — the skater effect in industrial form). The lever-arm picture becomes the
        Jacobian-transpose rule of Chapter 5, which converts tip forces into joint torques. And{" "}
        <M>{"\\omega"}</M> gets a serious upgrade in Chapter 3, where angular velocity in 3D
        becomes a vector with its own algebra.
      </p>

      <BookRef>
        Physics track · Module 5 of 10: angular kinematics, torque, moment of inertia,
        rotational kinetic energy, rolling motion, angular momentum. Bridges to MR §3 (angular
        velocity), §5 (statics), §8 (mass matrix).
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
