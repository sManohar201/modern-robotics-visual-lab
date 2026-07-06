import { useState, useRef, useEffect, useMemo } from "react";
import { Play, Pause } from "lucide-react";
import { PageHeader, H2, M, Eq, KeyIdea, Worked, BookRef, PhysicsRef } from "../../components/prose";
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

// ------------------------------------------------------------------
// Roller coaster energy visualizer
// ------------------------------------------------------------------
function RollerCoaster() {
  const [h0, setH0] = useState(6);
  const [mass, setMass] = useState(2);
  const [friction, setFriction] = useState(0);
  const [tFrac, setTFrac] = useState(0);
  const [running, setRunning] = useState(false);

  const SM = 15; // px per metre of height

  // Track: sum of Gaussian hills, sampled densely
  const trackPts = useMemo(() => {
    const n = 200;
    return Array.from({ length: n }, (_, i) => {
      const x = i / (n - 1);
      const hill1 = 8 * Math.exp(-((x - 0.32) ** 2) / 0.006);
      const dip = -2 * Math.exp(-((x - 0.55) ** 2) / 0.004);
      const hill2 = 6 * Math.exp(-((x - 0.75) ** 2) / 0.007);
      return { x, h: hill1 + dip + hill2 };
    });
  }, []);

  // cumulative arc length (px) up to each sample
  const cumArc = useMemo(() => {
    const c = [0];
    for (let i = 1; i < trackPts.length; i++) {
      const dx = (trackPts[i].x - trackPts[i - 1].x) * 650;
      const dh = (trackPts[i].h - trackPts[i - 1].h) * SM;
      c.push(c[i - 1] + Math.hypot(dx, dh));
    }
    return c;
  }, [trackPts]);
  const arcLen = cumArc[cumArc.length - 1];

  // first-hill crest
  const crest = useMemo(() => {
    let bi = 0, bh = -1;
    trackPts.forEach((p, i) => {
      if (p.x > 0.2 && p.x < 0.45 && p.h > bh) { bh = p.h; bi = i; }
    });
    return { i: bi, x: trackPts[bi].x, h: bh };
  }, [trackPts]);

  // map tFrac → track index by arc length
  const ballIdx = useMemo(() => {
    const target = tFrac * arcLen;
    for (let i = 1; i < cumArc.length; i++) {
      if (cumArc[i] >= target) return i;
    }
    return trackPts.length - 1;
  }, [tFrac, arcLen, cumArc, trackPts]);

  const ball = trackPts[ballIdx];
  const totalE = mass * G * h0;
  const lossAt = (i: number) => friction * mass * G * cumArc[i] * 0.01;
  const energyLost = lossAt(ballIdx);
  const totalNow = Math.max(0, totalE - energyLost);
  const pe = mass * G * ball.h;
  const ke = Math.max(0, totalNow - pe);
  const speed = Math.sqrt(2 * ke / mass);
  const hCeil = totalNow / (mass * G); // the "energy ceiling": highest reachable track

  // the KE the ball has (or would have) exactly at the first crest
  const keAtCrest = totalE - mass * G * crest.h - lossAt(crest.i);

  useRaf(running, () => {
    setTFrac(prev => {
      const sPx = prev * arcLen;
      if (speed < 0.05 && prev > 0.005) { setRunning(false); return prev; }
      const n = (sPx + Math.max(speed, 0.2) * SM * (1 / 60)) / arcLen;
      if (n >= 1) { setRunning(false); return 1; }
      return n;
    });
  });

  useEffect(() => { setRunning(false); }, [h0, mass, friction]);

  // SVG mapping
  const ox = 60;
  const oy = 300;
  const sx = (xn: number) => ox + xn * 650;
  const sy = (h: number) => oy - h * SM;
  const path = trackPts.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.h).toFixed(1)}`).join(" ");

  // segments of track above the energy ceiling (unreachable) drawn in red
  const overSegs = useMemo(() => {
    const segs: string[] = [];
    let cur: string[] = [];
    trackPts.forEach(p => {
      if (p.h > hCeil + 0.02) {
        cur.push(`${cur.length ? "L" : "M"} ${sx(p.x).toFixed(1)} ${sy(p.h).toFixed(1)}`);
      } else if (cur.length) { segs.push(cur.join(" ")); cur = []; }
    });
    if (cur.length) segs.push(cur.join(" "));
    return segs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackPts, hCeil]);

  const ballX = sx(ball.x);
  const ballY = sy(ball.h);
  // tangent direction for the velocity arrow
  const nb = trackPts[Math.min(ballIdx + 1, trackPts.length - 1)];
  const pb = trackPts[Math.max(ballIdx - 1, 0)];
  const tanLen = Math.hypot((nb.x - pb.x) * 650, (nb.h - pb.h) * SM) || 1;
  const tanX = ((nb.x - pb.x) * 650) / tanLen;
  const tanY = (-(nb.h - pb.h) * SM) / tanLen;
  const vArrow = clamp(speed * 3.5, 0, 62);

  const stalled = !running && tFrac > 0.01 && tFrac < 0.98 && ke < 0.05;

  const clearMet = ballIdx >= crest.i && keAtCrest > 0.1 && friction < 0.05;

  // energy bar card
  const barCardX = 598;
  const barBase = 280;
  const barMaxH = 205;
  const eScale = mass * G * 18; // full-scale = max possible launch energy
  const bars = [
    { label: "E", color: BLUE, v: totalNow },
    { label: "PE", color: RED, v: pe },
    { label: "KE", color: GREEN, v: ke },
  ];

  function launch() {
    if (running) { setRunning(false); return; }
    if (tFrac >= 0.98 || (stalled && tFrac > 0.9)) setTFrac(0);
    setRunning(true);
  }

  return (
    <>
      <WidgetShell
        title="Roller-coaster energy"
        onReset={() => { setH0(6); setMass(2); setFriction(0); setTFrac(0); setRunning(false); }}
        caption="Press play (or drag the position slider) and watch red PE and green KE trade while blue total holds — until friction bleeds it. The dashed blue line is the energy ceiling: the highest track the ball can still reach; track above it glows red as unreachable. The gold dot marks the first crest."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* height axis */}
          <line x1={ox} y1={oy} x2={ox} y2={sy(18)} stroke="#b6b2a4" strokeWidth={1.4} />
          {[0, 5, 10, 15].map(h => (
            <g key={h} className="ui">
              <line x1={ox - 5} y1={sy(h)} x2={ox} y2={sy(h)} stroke="#b6b2a4" />
              <text x={ox - 8} y={sy(h) + 3.5} textAnchor="end" className="fill-[var(--ink-faint)] text-[10px]">{h}</text>
            </g>
          ))}
          <text x={ox - 8} y={sy(18) + 2} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10px]">m</text>
          {/* ground + track */}
          <line x1={ox} y1={oy} x2={ox + 650} y2={oy} stroke="#c4c0b4" strokeWidth={1.5} />
          <path d={path} fill="none" stroke="#8a8a9b" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          {/* unreachable track segments */}
          {overSegs.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={RED} strokeWidth={5} strokeLinecap="round" opacity={0.55} />
          ))}

          {/* launch height marker */}
          <line x1={ox} y1={oy} x2={ox} y2={sy(h0)} stroke={BLUE} strokeWidth={3} />
          <text x={ox + 8} y={sy(h0) + 4} className="ui text-[11px]" fill={BLUE}>h₀ = {h0.toFixed(1)} m</text>

          {/* energy ceiling */}
          {sy(hCeil) > 14 && (
            <>
              <line x1={ox} y1={sy(hCeil)} x2={ox + 650} y2={sy(hCeil)} stroke={BLUE} strokeWidth={1.6} strokeDasharray="7 5" opacity={0.7} />
              <text x={ox + 646} y={sy(hCeil) - 5} textAnchor="end" className="ui text-[10.5px]" fill={BLUE}>
                energy ceiling {hCeil.toFixed(1)} m
              </text>
            </>
          )}

          {/* first-crest gold marker */}
          <line x1={sx(crest.x)} y1={sy(crest.h)} x2={sx(crest.x)} y2={oy} stroke={GOLD} strokeWidth={1.4} strokeDasharray="4 4" opacity={0.8} />
          <circle cx={sx(crest.x)} cy={sy(crest.h)} r={5} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
          <text x={sx(crest.x)} y={sy(crest.h) - 10} textAnchor="middle" className="ui text-[10.5px]" fill="#8a6d12">
            crest {crest.h.toFixed(1)} m
          </text>

          {/* ball + tangent velocity arrow */}
          <circle cx={ballX} cy={ballY - 8} r={10} fill={stalled ? RED : ORANGE} stroke="#fff" strokeWidth={2.5} />
          {vArrow > 5 && (
            <g>
              <defs>
                <marker id="rc-arrow-v" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={PURPLE} />
                </marker>
              </defs>
              <line x1={ballX} y1={ballY - 8} x2={ballX + tanX * vArrow} y2={ballY - 8 + tanY * vArrow}
                stroke={PURPLE} strokeWidth={3} markerEnd="url(#rc-arrow-v)" />
            </g>
          )}
          {stalled && (
            <text x={clamp(ballX, 90, 560)} y={ballY - 26} textAnchor="middle" className="ui text-[11px] font-semibold" fill={RED}>
              out of energy — can't climb higher
            </text>
          )}

          {/* energy bars in a card */}
          <rect x={barCardX} y={38} width={150} height={272} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={barCardX + 75} y={56} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10.5px]">energy (J)</text>
          {[0.25, 0.5, 0.75, 1].map(f => (
            <line key={f} x1={barCardX + 10} y1={barBase - f * barMaxH} x2={barCardX + 140} y2={barBase - f * barMaxH}
              stroke="#eceadf" strokeWidth={1} />
          ))}
          {bars.map((b, i) => {
            const bh = clamp((b.v / eScale) * barMaxH, 0, barMaxH);
            const bx = barCardX + 14 + i * 44;
            return (
              <g key={b.label} className="ui">
                <rect x={bx} y={barBase - barMaxH} width={36} height={barMaxH} fill="#f6f4ee" rx={3} />
                <rect x={bx} y={barBase - bh} width={36} height={bh} rx={3} fill={b.color} opacity={0.72} />
                <text x={bx + 18} y={barBase - bh - 5} textAnchor="middle" className="text-[9.5px]" fill={b.color}>
                  {b.v.toFixed(0)}
                </text>
                <text x={bx + 18} y={barBase + 15} textAnchor="middle" className="text-[10px] font-semibold" fill={b.color}>{b.label}</text>
              </g>
            );
          })}
          <text x={barCardX + 75} y={302} textAnchor="middle" className="ui text-[9.5px]" fill="var(--ink-faint)">
            lost to friction: {energyLost.toFixed(1)} J
          </text>
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={launch} labels={["play", "pause"]} />
          <LabeledSlider label="h₀" value={h0} min={2} max={18} step={0.1} onChange={setH0}
            fmt={v => `${v.toFixed(1)} m`} color={BLUE} />
          <LabeledSlider label="mass" value={mass} min={0.5} max={10} step={0.1} onChange={setMass}
            fmt={v => `${v.toFixed(1)} kg`} />
          <LabeledSlider label="friction" value={friction} min={0} max={0.3} step={0.005} onChange={setFriction}
            fmt={v => v.toFixed(3)} color={ORANGE} />
          <LabeledSlider label="position" value={tFrac} min={0} max={1} step={0.005} onChange={v => { setRunning(false); setTFrac(v); }}
            fmt={v => `${(v * 100).toFixed(0)}%`} />
          <Readout label="KE" value={`${ke.toFixed(1)} J`} color={GREEN} />
          <Readout label="PE" value={`${pe.toFixed(1)} J`} color={RED} />
          <Readout label="v" value={`${speed.toFixed(2)} m/s`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys3-coaster-top" met={clearMet}>
        With zero friction, raise <M>{"h_0"}</M> until the energy ceiling clears the gold crest
        (≈ {crest.h.toFixed(1)} m) — the red "unreachable" tint on the hill must vanish — then
        press play and ride the ball past the crest. Not a joule to spare below{" "}
        <M>{"h_0 = h_{\\text{crest}}"}</M>.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Spring-mass energy exchange
// ------------------------------------------------------------------
function SpringMassEnergy() {
  const [k, setK] = useState(40);
  const [mass, setMass] = useState(1);
  const [x0, setX0] = useState(0.8); // initial displacement
  const [running, setRunning] = useState(false);
  const stateRef = useRef({ x: 0.8, v: 0, t: 0 });
  const histRef = useRef<{ t: number; x: number }[]>([]);
  const [display, setDisplay] = useState({ x: 0.8, v: 0, t: 0 });

  useEffect(() => {
    setRunning(false);
    stateRef.current = { x: x0, v: 0, t: 0 };
    histRef.current = [];
    setDisplay({ x: x0, v: 0, t: 0 });
  }, [x0, k, mass]);

  useRaf(running, dtRaw => {
    const dt = Math.min(dtRaw, 0.02);
    const s = stateRef.current;
    // RK4 on ẍ = -(k/m)x
    const f = (xx: number) => (-k / mass) * xx;
    const k1x = s.v, k1v = f(s.x);
    const k2x = s.v + 0.5 * dt * k1v, k2v = f(s.x + 0.5 * dt * k1x);
    const k3x = s.v + 0.5 * dt * k2v, k3v = f(s.x + 0.5 * dt * k2x);
    const k4x = s.v + dt * k3v, k4v = f(s.x + dt * k3x);
    s.x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    s.v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    s.t += dt;
    histRef.current.push({ t: s.t, x: s.x });
    if (histRef.current.length > 900) histRef.current.shift();
    setDisplay({ ...s });
  });

  const x = display.x;
  const v = display.v;
  const ke = 0.5 * mass * v * v;
  const pe = 0.5 * k * x * x;
  const totalE = 0.5 * k * x0 * x0;
  const omega = Math.sqrt(k / mass);
  const period = 2 * Math.PI / omega;

  // scene (top band)
  const eq = 330;
  const XS = 110; // px per metre of displacement
  const massX = eq + x * XS;

  // x(t) plot (bottom-left)
  const px0 = 70;
  const pw = 430;
  const pMid = 255;
  const pHalf = 66;
  const tWin = 8;
  const tNow = display.t;
  const yOfX = (xx: number) => pMid - (xx / 1.7) * pHalf;
  const mapT = (t: number) => px0 + ((t - (tNow - tWin)) / tWin) * pw;
  const hist = histRef.current;
  const tracePath = hist
    .filter(p => p.t >= tNow - tWin)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${mapT(p.t).toFixed(1)} ${yOfX(p.x).toFixed(1)}`)
    .join(" ");
  const secTicks: number[] = [];
  for (let s = Math.max(0, Math.ceil(tNow - tWin)); s <= Math.floor(tNow); s++) secTicks.push(s);

  // energy bars (right card)
  const cardX = 560;
  const barBase = 296;
  const barMaxH = 212;
  const eScale = Math.max(totalE * 1.12, 1e-6);
  const bars = [
    { label: "PE", color: RED, v: pe },
    { label: "KE", color: GREEN, v: ke },
    { label: "E", color: BLUE, v: totalE },
  ];

  const largePeMet = pe > 15;

  return (
    <>
      <WidgetShell
        title="Spring-mass energy exchange"
        onReset={() => { setRunning(false); setK(40); setMass(1); setX0(0.8); stateRef.current = { x: 0.8, v: 0, t: 0 }; histRef.current = []; setDisplay({ x: 0.8, v: 0, t: 0 }); }}
        caption="Top: the mass on its spring, with its live velocity arrow. Bottom-left: x(t) writes itself as the system runs; the dashed lines are the amplitude ±A — the trace kisses them exactly where all the energy is potential, and crosses zero where it is all kinetic. Right: the energy ledger — PE and KE trade, their sum pinned to the dashed total line."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <defs>
            <marker id="sm-arrow-v" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={BLUE} />
            </marker>
          </defs>
          {/* wall + spring */}
          <line x1={110} y1={58} x2={110} y2={142} stroke="#8a8a9b" strokeWidth={3} />
          {Array.from({ length: 14 }, (_, i) => {
            const t0 = 110 + (i / 14) * (massX - 30 - 110);
            const t1 = 110 + ((i + 1) / 14) * (massX - 30 - 110);
            const y0 = 100 + (i % 2 === 0 ? -13 : 13);
            const y1 = 100 + ((i + 1) % 2 === 0 ? -13 : 13);
            return <line key={i} x1={t0} y1={y0} x2={t1} y2={y1} stroke="#50525e" strokeWidth={2.5} />;
          })}
          {/* mass block */}
          <rect x={massX - 30} y={75} width={60} height={50} rx={5}
            fill={Math.abs(v) > 0.1 ? "#ffe3e0" : "#dbd7c8"} stroke="#50525e" strokeWidth={2} />
          <text x={massX} y={105} textAnchor="middle" className="ui text-[13px] font-semibold" fill="#4b4b5e">{mass} kg</text>
          {/* velocity arrow */}
          {Math.abs(v) > 0.08 && (
            <line x1={massX} y1={62} x2={massX + clamp(v * 16, -85, 85)} y2={62}
              stroke={BLUE} strokeWidth={3} markerEnd="url(#sm-arrow-v)" />
          )}
          {/* equilibrium line */}
          <line x1={eq} y1={55} x2={eq} y2={145} stroke="#bbb" strokeWidth={1.5} strokeDasharray="5 4" />
          <text x={eq + 5} y={52} className="ui text-[11px]" fill="#8a8a9b">eq</text>
          <text x={massX} y={152} textAnchor="middle" className="ui text-[11px]" fill="#8a8a9b">x = {x.toFixed(3)} m</text>

          {/* ---- x(t) plot ---- */}
          <line x1={px0} y1={pMid - pHalf - 12} x2={px0} y2={pMid + pHalf + 12} stroke="#b6b2a4" strokeWidth={1.4} />
          <line x1={px0} y1={pMid} x2={px0 + pw} y2={pMid} stroke="#cfcabc" strokeWidth={1.2} />
          {[-1, 0, 1].map(xx => (
            <g key={xx} className="ui">
              <line x1={px0 - 5} y1={yOfX(xx)} x2={px0} y2={yOfX(xx)} stroke="#b6b2a4" />
              <text x={px0 - 8} y={yOfX(xx) + 3.5} textAnchor="end" className="fill-[var(--ink-faint)] text-[10px]">{xx}</text>
            </g>
          ))}
          <text x={px0 - 8} y={pMid - pHalf - 16} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10px]">x (m)</text>
          {/* one-second ticks */}
          {secTicks.map(s => (
            <g key={s} className="ui">
              <line x1={mapT(s)} y1={pMid + pHalf + 8} x2={mapT(s)} y2={pMid + pHalf + 13} stroke="#b6b2a4" />
              {s % 2 === 0 && (
                <text x={mapT(s)} y={pMid + pHalf + 25} textAnchor="middle" className="fill-[var(--ink-faint)] text-[10px]">{s}</text>
              )}
            </g>
          ))}
          <text x={px0 + pw} y={pMid + pHalf + 25} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10px]">t (s)</text>
          {/* amplitude envelope */}
          <line x1={px0} y1={yOfX(x0)} x2={px0 + pw} y2={yOfX(x0)} stroke="#9e9e9e" strokeWidth={1} strokeDasharray="3 4" opacity={0.8} />
          <line x1={px0} y1={yOfX(-x0)} x2={px0 + pw} y2={yOfX(-x0)} stroke="#9e9e9e" strokeWidth={1} strokeDasharray="3 4" opacity={0.8} />
          <text x={px0 + pw - 4} y={yOfX(x0) - 4} textAnchor="end" className="ui text-[9.5px]" fill="#8a6d12">±A → all PE</text>
          <text x={px0 + pw - 4} y={pMid - 4} textAnchor="end" className="ui text-[9.5px]" fill={GREEN}>x = 0 → all KE</text>
          {hist.length > 1 ? (
            <>
              <path d={tracePath} fill="none" stroke={PURPLE} strokeWidth={2.4} />
              <circle cx={px0 + pw} cy={yOfX(x)} r={4.5} fill={PURPLE} />
            </>
          ) : (
            <text x={px0 + pw / 2} y={pMid - 6} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[11.5px]">
              press play — x(t) traces itself here
            </text>
          )}

          {/* ---- energy bar card ---- */}
          <rect x={cardX} y={40} width={188} height={290} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={cardX + 94} y={60} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10.5px]">energy (J)</text>
          {bars.map((b, i) => {
            const bh = clamp((b.v / eScale) * barMaxH, 0, barMaxH);
            const bx = cardX + 16 + i * 56;
            return (
              <g key={b.label} className="ui">
                <rect x={bx} y={barBase - barMaxH} width={44} height={barMaxH} fill="#f6f4ee" rx={3} />
                <rect x={bx} y={barBase - bh} width={44} height={bh} rx={3} fill={b.color} opacity={0.72} />
                <text x={bx + 22} y={barBase - bh - 5} textAnchor="middle" className="text-[9.5px]" fill={b.color}>
                  {b.v.toFixed(1)}
                </text>
                <text x={bx + 22} y={barBase + 16} textAnchor="middle" className="text-[10px] font-semibold" fill={b.color}>{b.label}</text>
              </g>
            );
          })}
          {/* total-energy line across the bars */}
          <line x1={cardX + 12} y1={barBase - (totalE / eScale) * barMaxH} x2={cardX + 176} y2={barBase - (totalE / eScale) * barMaxH}
            stroke={BLUE} strokeWidth={1.4} strokeDasharray="5 4" />
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={() => setRunning(r => !r)} />
          <LabeledSlider label="k" value={k} min={5} max={200} step={1} onChange={setK}
            fmt={v => `${v.toFixed(0)} N/m`} color={BLUE} />
          <LabeledSlider label="mass" value={mass} min={0.1} max={5} step={0.05} onChange={setMass}
            fmt={v => `${v.toFixed(2)} kg`} />
          <LabeledSlider label="x₀" value={x0} min={0.1} max={1.5} step={0.01} onChange={setX0}
            fmt={v => `${v.toFixed(2)} m`} color={ORANGE} />
          <Readout label="ω₀" value={`${omega.toFixed(2)} rad/s`} color={PURPLE} />
          <Readout label="T" value={`${period.toFixed(2)} s`} />
          <Readout label="KE" value={`${ke.toFixed(2)} J`} color={GREEN} />
          <Readout label="PE" value={`${pe.toFixed(2)} J`} color={RED} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys3-spring-pe20" met={largePeMet}>
        Store at least 15 J of potential energy at the initial displacement. Use the spring
        constant and displacement sliders: <M>{"U = \\tfrac{1}{2}k x_0^2 \\geq 15 \\text{ J}"}</M> —
        the PE bar's number tells you when you're there.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Work integral — area under force-displacement curve
// ------------------------------------------------------------------
function WorkIntegral() {
  const [fConst, setFConst] = useState(15);
  const [slope, setSlope] = useState(0);
  const [xMax, setXMax] = useState(4);

  // F(x) = fConst + slope*x
  const work = fConst * xMax + 0.5 * slope * xMax * xMax;

  const plotX = 60;
  const plotY = 26;
  const plotW = 580;
  const plotH = 214;
  const xS = (x: number) => plotX + (x / 6) * plotW;
  const yS = (f: number) => plotY + plotH - ((f + 50) / 155) * plotH;

  const F = (x: number) => fConst + slope * x;
  const nPts = 120;
  const buildArea = (clip: (f: number) => number) => {
    const pts = Array.from({ length: nPts }, (_, i) => {
      const x = (i / (nPts - 1)) * xMax;
      return `L ${xS(x).toFixed(1)} ${yS(clip(F(x))).toFixed(1)}`;
    }).join(" ");
    return `M ${xS(0).toFixed(1)} ${yS(0).toFixed(1)} ${pts} L ${xS(xMax).toFixed(1)} ${yS(0).toFixed(1)} Z`;
  };
  const posArea = buildArea(f => Math.max(f, 0));
  const negArea = buildArea(f => Math.min(f, 0));
  const hasNeg = F(0) < -0.3 || F(xMax) < -0.3;
  const hasPos = F(0) > 0.3 || F(xMax) > 0.3;

  // where the force flips sign
  const xZero = Math.abs(slope) > 1e-6 ? -fConst / slope : Infinity;
  const zeroVisible = xZero > 0.05 && xZero < xMax - 0.05;

  // work gauge under the plot
  const gy = 306;
  const gX = (w: number) => plotX + ((clamp(w, -100, 350) + 100) / 450) * plotW;

  const workMet = Math.abs(work - 50) < 3;

  return (
    <>
      <WidgetShell
        title="Work = area under F–x curve"
        onReset={() => { setFConst(15); setSlope(0); setXMax(4); }}
        caption="The shaded area between the force curve and the axis is the work done: purple counts positive, red (force opposing the motion) counts negative, and the gold marker is where the force flips sign. The gauge underneath accumulates the total — the gold tick at 50 J is the challenge target."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* grid + axes */}
          {[0, 1, 2, 3, 4, 5, 6].map(x => (
            <g key={x} className="ui">
              <line x1={xS(x)} y1={plotY} x2={xS(x)} y2={plotY + plotH} stroke="#eceadf" />
              <text x={xS(x)} y={plotY + plotH + 16} textAnchor="middle" className="fill-[var(--ink-faint)] text-[10.5px]">{x} m</text>
            </g>
          ))}
          {[-40, 0, 40, 80].map(f => (
            <g key={f} className="ui">
              <line x1={plotX - 4} y1={yS(f)} x2={plotX + plotW} y2={yS(f)} stroke="#eceadf" />
              <text x={plotX - 8} y={yS(f) + 3.5} textAnchor="end" className="fill-[var(--ink-faint)] text-[10.5px]">{f} N</text>
            </g>
          ))}
          <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke="#8a8a9b" strokeWidth={1.5} />
          <line x1={plotX} y1={yS(0)} x2={plotX + plotW} y2={yS(0)} stroke="#8a8a9b" strokeWidth={1.5} />
          {/* shaded work areas */}
          {hasPos && <path d={posArea} fill={PURPLE} opacity={0.16} />}
          {hasNeg && <path d={negArea} fill={RED} opacity={0.2} />}
          {/* force line across the full axis */}
          <line x1={xS(0)} y1={yS(F(0))} x2={xS(6)} y2={yS(F(6))} stroke={PURPLE} strokeWidth={3.5} />
          {/* sign-flip marker */}
          {zeroVisible && (
            <>
              <line x1={xS(xZero)} y1={plotY + 6} x2={xS(xZero)} y2={plotY + plotH} stroke={GOLD} strokeWidth={1.8} strokeDasharray="4 4" />
              <circle cx={xS(xZero)} cy={yS(0)} r={5} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
              <text x={xS(xZero)} y={plotY + plotH - 6} textAnchor="middle" className="ui text-[10px]" fill="#8a6d12">
                F = 0 — work flips sign
              </text>
            </>
          )}
          {/* xMax marker */}
          <line x1={xS(xMax)} y1={plotY} x2={xS(xMax)} y2={plotY + plotH} stroke={ORANGE} strokeWidth={2.5} strokeDasharray="7 5" />
          <text x={xS(xMax) + 6} y={plotY + 16} className="ui text-[11.5px]" fill={ORANGE}>stop here</text>
          {/* legend card */}
          <rect x={plotX + plotW - 168} y={plotY + 8} width={160} height={58} rx={8} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={plotX + plotW - 156} y={plotY + 26} className="ui text-[12.5px] font-bold" fill={PURPLE}>W = {work.toFixed(1)} J</text>
          <rect x={plotX + plotW - 156} y={plotY + 34} width={9} height={9} rx={2} fill={PURPLE} opacity={0.5} />
          <text x={plotX + plotW - 142} y={plotY + 42} className="ui text-[10px]" fill="var(--ink-soft)">positive work</text>
          <rect x={plotX + plotW - 156} y={plotY + 48} width={9} height={9} rx={2} fill={RED} opacity={0.5} />
          <text x={plotX + plotW - 142} y={plotY + 56} className="ui text-[10px]" fill="var(--ink-soft)">negative work</text>

          {/* work gauge */}
          <line x1={plotX} y1={gy} x2={plotX + plotW} y2={gy} stroke="#b6b2a4" strokeWidth={1.4} />
          {[-100, 0, 100, 200, 300].map(w => (
            <g key={w} className="ui">
              <line x1={gX(w)} y1={gy} x2={gX(w)} y2={gy + 5} stroke="#b6b2a4" />
              <text x={gX(w)} y={gy + 17} textAnchor="middle" className="fill-[var(--ink-faint)] text-[10px]">{w}</text>
            </g>
          ))}
          <text x={plotX + plotW} y={gy + 17} textAnchor="start" className="ui fill-[var(--ink-faint)] text-[10px]"> J</text>
          <rect
            x={Math.min(gX(0), gX(work))} y={gy - 12}
            width={Math.abs(gX(work) - gX(0))} height={9} rx={2}
            fill={work >= 0 ? PURPLE : RED} opacity={0.65}
          />
          {/* gold target tick at 50 J */}
          <line x1={gX(50)} y1={gy - 18} x2={gX(50)} y2={gy + 5} stroke={GOLD} strokeWidth={2.5} />
          <text x={gX(50)} y={gy - 23} textAnchor="middle" className="ui text-[10px] font-semibold" fill="#8a6d12">target 50 J</text>
        </svg>
        <ControlBar>
          <LabeledSlider label="F₀ (const)" value={fConst} min={0} max={55} step={0.5} onChange={setFConst}
            fmt={v => `${v.toFixed(1)} N`} color={PURPLE} />
          <LabeledSlider label="slope" value={slope} min={-8} max={8} step={0.1} onChange={setSlope}
            fmt={v => `${v.toFixed(1)} N/m`} />
          <LabeledSlider label="x_max" value={xMax} min={0.2} max={6} step={0.05} onChange={setXMax}
            fmt={v => `${v.toFixed(2)} m`} color={ORANGE} />
          <Readout label="Work" value={`${work.toFixed(2)} J`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys3-work-50j" met={workMet}>
        Tune the force profile and displacement to do exactly 50 J of work (±3 J) — park the
        gauge bar on the gold tick. Try both a constant force over a long distance and a
        variable force over a short one.
      </Challenge>
    </>
  );
}

export default function Energy() {
  return (
    <div>
      <PageHeader
        chapter="Physics 3"
        section="College Physics & Dynamics"
        title="Work, Energy, and Power"
        lede="Energy is the currency of mechanics. Work done by forces converts between kinetic and potential forms — and the total stays constant when friction is absent."
      />

      <p>
        Lift a heavy box onto a shelf and something about the world has changed: the box can now
        do things it couldn't before — fall, crush, drive a pulley. You paid for that ability
        with effort, and physics tracks the payment exactly. <strong>Work</strong> is the
        payment: force times the distance moved <em>along the force's direction</em>. Push hard
        on a wall that doesn't move and you do zero work, however tired you get; carry a
        suitcase horizontally at constant speed and gravity does zero work on it, because the
        motion is perpendicular to the pull. When the force varies along the way, add up the
        little payments:
      </p>
      <Eq>{"W = \\int \\mathbf{F}\\cdot d\\mathbf{r}."}</Eq>
      <p>
        Read it back: chop the path into slivers, multiply the force by each sliver of
        displacement (the dot product keeps only the part of the force pointing along the
        motion), and accumulate. That is exactly the integral-as-accumulation idea from the{" "}
        <a href="#/math3-calculus">Math 3 module</a>, and the widget below draws it: work is
        literally the <em>area</em> under the force–distance curve. The unit is the{" "}
        <strong>joule</strong> (J) — one newton pushing through one meter.
      </p>

      <p>
        <strong>Try this:</strong> set the slope to zero and check that the area is just a
        rectangle, <M>{"W = F x"}</M>. Then tilt the force line and watch the area become a
        trapezoid — the formula changes, the <em>idea</em> (area = work) doesn't. Finally drag
        the slope negative until the line dives below the axis: past the gold marker the force
        opposes the motion, the shading turns red, and the gauge starts giving work back. A
        spring is the tilted case: its force grows linearly, which is where the{" "}
        <M>{"\\tfrac12 k x^2"}</M> you'll meet below comes from.
      </p>

      <WorkIntegral />

      <p>
        Why care about this bookkeeping? Because of the <strong>work–energy theorem</strong>:
        the net work done on an object shows up, to the joule, as a change in its energy of
        motion — its <strong>kinetic energy</strong> <M>{"\\tfrac12 mv^2"}</M>:
      </p>
      <Eq>{"W_{\\text{net}} = \\Delta KE = \\tfrac{1}{2}mv_f^2 - \\tfrac{1}{2}mv_i^2."}</Eq>
      <p>
        Gravity and spring forces are special: they are <em>conservative</em>, meaning the work
        they do depends only on where you start and end, never on the route taken. Carry a
        brick up a spiral staircase or hoist it straight up — gravity's bill is identical. That
        path-blindness lets us pre-compute gravity's work as a stored balance called{" "}
        <strong>potential energy</strong> (<M>{"mgh"}</M> for gravity), and turn all of
        mechanics into one conservation law:
      </p>
      <Eq>{"E = KE + PE = \\tfrac{1}{2}mv^2 + mgh = \\text{const} \\quad (\\text{no friction})."}</Eq>

      <H2>Conservation on a roller coaster</H2>
      <p>
        A roller coaster converts height (potential energy) to speed (kinetic energy) and back.
        Without friction the total stays constant. Every peak the car can reach must have total
        energy above <M>{"mgh_{\\text{peak}}"}</M> — the widget draws that boundary as a dashed
        "energy ceiling" line. Adding friction drains energy continuously — the ceiling sinks
        as the car travels, and hills that were clearable stop being so.
      </p>

      <p>
        <strong>Try this:</strong> with friction at zero, press play (or drag the position
        slider) and watch the red and green bars trade places while the blue total never moves —
        that <em>is</em> the conservation law. Change the mass and notice the speed readout at
        any point doesn't change: mass appears in both KE and PE and cancels. Then add a little
        friction and ride again — now the blue bar bleeds away and the energy ceiling sinks
        visibly as the ball climbs.
      </p>

      <RollerCoaster />

      <Worked title="How fast at the bottom of the dip?">
        <p>
          <strong>Given.</strong> The cart starts from rest at <M>{"h_0 = 14"}</M> m,
          frictionless. How fast is it moving where the track dips to <M>{"h = 2"}</M> m?
        </p>
        <p>
          <strong>Set up.</strong> Energy at the start = energy at the dip:{" "}
          <M>{"mgh_0 = mgh + \\tfrac12 mv^2"}</M>. The mass cancels immediately.
        </p>
        <p>
          <strong>Solve.</strong>{" "}
          <M>{"v = \\sqrt{2g(h_0 - h)} = \\sqrt{2(9.81)(12)} \\approx 15.3"}</M> m/s — about 55
          km/h, and we never asked what shape the track is.
        </p>
        <p>
          <strong>Check.</strong> A force-based solution would need the track's slope at every
          point to resolve <M>{"mg\\sin\\theta"}</M> along it — pages of work for the same
          number. That shortcut is the whole sales pitch for energy methods.
        </p>
      </Worked>

      <KeyIdea>
        Conservation of energy replaces force analysis for trajectory problems: if you know the
        height and the total mechanical energy, you know the speed — without tracking every force
        along the path.
      </KeyIdea>

      <H2>Spring-mass energy exchange</H2>
      <p>
        A mass on a spring converts kinetic to potential and back with perfect regularity. At the
        equilibrium point <M>{"x=0"}</M>, all energy is kinetic. At maximum displacement{" "}
        <M>{"x = A"}</M>, all energy is potential. The natural frequency depends only on the ratio{" "}
        <M>{"k/m"}</M>:
      </p>
      <Eq>{"\\omega_0 = \\sqrt{\\frac{k}{m}}, \\qquad E = \\tfrac{1}{2}kA^2."}</Eq>

      <p>
        <strong>Try this:</strong> press play and watch the bars slosh — all red at the
        extremes, all green through the middle, blue constant throughout — while the{" "}
        <M>{"x(t)"}</M> trace kisses the dashed amplitude lines at exactly the all-red moments.
        Then stiffen the spring (raise <M>{"k"}</M>) and watch the oscillation quicken; add mass
        and watch it slow. The frequency readout follows <M>{"\\sqrt{k/m}"}</M> exactly. This
        little system is the seed of the entire Oscillations module.
      </p>

      <SpringMassEnergy />

      <H2>Power: how fast the energy flows</H2>
      <p>
        Two motors lift the same crate to the same shelf — same work — but one does it in a
        second and the other takes a minute. The difference is <strong>power</strong>, the{" "}
        <em>rate</em> of doing work:
      </p>
      <Eq>{"P = \\frac{dW}{dt} = \\mathbf{F}\\cdot\\mathbf{v},"}</Eq>
      <p>
        measured in <strong>watts</strong> (1 W = 1 J/s). The second form is the useful one for
        machines: force times speed. It encodes a trade-off every cyclist knows — at a fixed
        power budget, you can have force or speed but not both, which is exactly why gearboxes
        exist, on bicycles and on robot joints alike.
      </p>

      <Worked title="Sizing a motor for a lift">
        <p>
          <strong>Given.</strong> A robot must raise a 10 kg payload at a steady 0.5 m/s. What
          motor power does the lift need (ignoring losses)?
        </p>
        <p>
          <strong>Set up.</strong> At constant speed the motor's force just balances gravity:{" "}
          <M>{"F = mg = 98.1"}</M> N.
        </p>
        <p>
          <strong>Solve.</strong> <M>{"P = Fv = 98.1 \\times 0.5 \\approx 49"}</M> W.
        </p>
        <p>
          <strong>Check.</strong> Cross-check with energy: each second the payload gains{" "}
          <M>{"mg \\Delta h = 98.1 \\times 0.5 \\approx 49"}</M> J of potential energy — and 49
          J per second is 49 W. Same number, two roads. ✓
        </p>
      </Worked>

      <Quiz
        challengeId="phys3-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: (
              <>
                You carry a 20 kg suitcase 100 m down a level sidewalk at constant speed. How
                much work does gravity do on it?
              </>
            ),
            options: [
              { label: "Zero — the motion is perpendicular to the pull", correct: true },
              { label: "About 19,600 J" },
              { label: "About 2,000 J" },
              { label: "It depends on how fast you walk" },
            ],
            explain:
              "Work counts only displacement along the force. Gravity pulls down; the suitcase moves sideways. (Your muscles get tired for biological reasons, not because mechanical work is being done on the suitcase.)",
          },
          {
            prompt: <>Doubling a car's speed multiplies its kinetic energy by…</>,
            options: [
              { label: "4", correct: true },
              { label: "2" },
              { label: "8" },
              { label: "√2" },
            ],
            explain:
              "KE grows with v² — the reason stopping distances quadruple when speed doubles, and why speed limits matter more than they feel like they should.",
          },
          {
            prompt: (
              <>
                Two frictionless slides start at the same height: one steep and straight, one
                long and winding. A child leaves the bottom of each. Who is moving faster?
              </>
            ),
            options: [
              { label: "Same speed — conservative forces don't care about the path", correct: true },
              { label: "The steep slide" },
              { label: "The winding slide" },
              { label: "Impossible to tell without the slide shapes" },
            ],
            explain:
              "Both convert the same mgh into ½mv². The steep slide gets there sooner (more power), but arrival speed is fixed by energy alone.",
          },
        ]}
      />

      <H2>Where you'll use this in Modern Robotics</H2>
      <p>
        Energy is the quiet workhorse of the second half of the book. The Lagrangian method of
        Chapter 8 builds a robot's <em>entire</em> equation of motion out of two scalars —
        kinetic minus potential energy. Potential fields in Chapter 10 steer robots by letting
        them "roll downhill" on an artificial energy landscape. And{" "}
        <M>{"P = \\mathbf{F}\\cdot\\mathbf{v}"}</M> becomes the power-conservation argument{" "}
        <M>{"\\tau^T\\dot\\theta = \\mathcal{F}^T\\mathcal{V}"}</M> that Chapter 5 uses to get
        robot statics almost for free.
      </p>

      <BookRef>
        Physics track · Module 3 of 10: work, kinetic energy, gravitational and elastic PE,
        work-energy theorem, conservation of energy, power. Bridges to MR §5 (statics), §8
        (Lagrangian dynamics), §10 (potential fields).
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
