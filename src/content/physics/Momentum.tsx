import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { PageHeader, H2, M, Eq, KeyIdea, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";

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

/** Pick a friendly tick step so axis numbers stay round. */
function niceStep(max: number) {
  const raw = Math.max(max, 1e-9) / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const m = n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10;
  return m * pow;
}

function ArrowDefsM() {
  const m = (id: string, color: string) => (
    <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
    </marker>
  );
  return (
    <defs>
      {m("mp-arr-p", PURPLE)}
      {m("mp-arr-o", ORANGE)}
      {m("mp-arr-gold", GOLD)}
    </defs>
  );
}

// ------------------------------------------------------------------
// 1D Collision Sandbox — animated, with CM tracker and labeled bars
// ------------------------------------------------------------------
function Collision1D() {
  const HC = 480;
  const [m1, setM1] = useState(3);
  const [m2, setM2] = useState(5);
  const [v1i, setV1i] = useState(4);
  const [v2i, setV2i] = useState(-1);
  const [e, setE] = useState(0.7); // restitution: 0 = stick, 1 = elastic
  const [running, setRunning] = useState(false);

  // block half-widths in meters (grow with mass so heft is visible)
  const hw1 = 0.3 + 0.05 * m1;
  const hw2 = 0.3 + 0.05 * m2;
  const X1_0 = -3.9;
  const X2_0 = 2.9;
  const [sim, setSim] = useState({ x1: X1_0, x2: X2_0, t: 0, collided: false, xc: 0, done: false });

  // Collision outcome: conservation of momentum + restitution
  const v1f = ((m1 - e * m2) * v1i + (1 + e) * m2 * v2i) / (m1 + m2);
  const v2f = ((m2 - e * m1) * v2i + (1 + e) * m1 * v1i) / (m1 + m2);

  const p1b = m1 * v1i;
  const p2b = m2 * v2i;
  const pT = p1b + p2b;
  const p1a = m1 * v1f;
  const p2a = m2 * v2f;
  const pTa = p1a + p2a;
  const keB = 0.5 * m1 * v1i * v1i + 0.5 * m2 * v2i * v2i;
  const keA = 0.5 * m1 * v1f * v1f + 0.5 * m2 * v2f * v2f;
  const lost = Math.max(0, keB - keA);
  const lostPct = keB > 1e-6 ? (100 * lost) / keB : 0;
  const vcm = pT / (m1 + m2); // constant through the collision

  // any slider change re-arms the experiment
  useEffect(() => {
    setRunning(false);
    setSim({ x1: X1_0, x2: X2_0, t: 0, collided: false, xc: 0, done: false });
  }, [m1, m2, v1i, v2i, e]);

  useRaf(running, dt => {
    setSim(s => {
      if (s.done) return s;
      const u1 = s.collided ? v1f : v1i;
      const u2 = s.collided ? v2f : v2i;
      let x1 = s.x1 + u1 * dt;
      let x2 = s.x2 + u2 * dt;
      let collided = s.collided;
      let xc = s.xc;
      if (!collided && x2 - x1 <= hw1 + hw2) {
        collided = true;
        xc = (x1 + hw1 + (x2 - hw2)) / 2; // contact point
        x1 = xc - hw1;
        x2 = xc + hw2;
      }
      const t = s.t + dt;
      const gone = (x: number) => x < -8.4 || x > 8.4;
      const w1 = collided ? v1f : v1i;
      const w2 = collided ? v2f : v2i;
      const done = t > 9 || ((gone(x1) || Math.abs(w1) < 0.02) && (gone(x2) || Math.abs(w2) < 0.02));
      return { x1, x2, t, collided, xc, done };
    });
  });

  useEffect(() => {
    if (sim.done) setRunning(false);
  }, [sim.done]);

  function launch() {
    if (running) { setRunning(false); return; }
    if (sim.done || sim.collided) setSim({ x1: X1_0, x2: X2_0, t: 0, collided: false, xc: 0, done: false });
    setRunning(true);
  }

  // ---- geometry -------------------------------------------------
  const X = (x: number) => 380 + x * 44; // world m → px
  const trackY = 168;
  const v1 = sim.collided ? v1f : v1i;
  const v2 = sim.collided ? v2f : v2i;
  const xcm = (m1 * sim.x1 + m2 * sim.x2) / (m1 + m2);

  // the checkmark requires actually running the elastic equal-mass collision
  const elasticStopMet = sim.collided && e > 0.95 && Math.abs(m1 - m2) < 0.1 && Math.abs(v1f) < 0.1;

  // ---- momentum bar chart scales --------------------------------
  const maxAbs = Math.max(1e-6, Math.abs(p1b), Math.abs(p2b), Math.abs(pT), Math.abs(p1a), Math.abs(p2a));
  const pY0 = 366;
  const pScale = 86 / (maxAbs * 1.05);
  const pStep = niceStep(maxAbs);
  const pBars = [
    { x: 96, v: p1b, c: PURPLE },
    { x: 140, v: p2b, c: ORANGE },
    { x: 184, v: pT, c: GOLD },
    { x: 252, v: p1a, c: PURPLE },
    { x: 296, v: p2a, c: ORANGE },
    { x: 340, v: pTa, c: GOLD },
  ];
  const pTicks: number[] = [];
  for (let k = pStep; k <= maxAbs * 1.05; k += pStep) pTicks.push(k);
  const fmtP = (v: number) => (Math.abs(v) < 10 ? v.toFixed(1) : v.toFixed(0));

  // ---- KE bar chart scales --------------------------------------
  const maxK = Math.max(1e-6, keB, keA);
  const kYb = 440;
  const kScale = 168 / (maxK * 1.05);
  const kStep = niceStep(maxK);
  const kTicks: number[] = [];
  for (let k = kStep; k <= maxK * 1.05; k += kStep) kTicks.push(k);
  const fmtT = (v: number) => (v < 10 && pStep < 1 ? v.toFixed(1) : v.toFixed(0));

  const arrow = (x: number, y: number, vel: number, color: string, marker: string) => {
    if (Math.abs(vel) < 0.05) return null;
    const x2 = x + vel * 16;
    return (
      <g>
        <line x1={x} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={4} markerEnd={`url(#${marker})`} />
        <text x={(x + x2) / 2} y={y - 8} textAnchor="middle" className="ui text-[11px] font-semibold" fill={color}>
          {vel.toFixed(2)} m/s
        </text>
      </g>
    );
  };

  return (
    <>
      <WidgetShell
        title="1D collision sandbox"
        onReset={() => { setM1(3); setM2(5); setV1i(4); setV2i(-1); setE(0.7); setRunning(false); setSim({ x1: X1_0, x2: X2_0, t: 0, collided: false, xc: 0, done: false }); }}
        caption="Press play to run the collision. Velocity arrows scale with speed; the gold ◆ is the center of mass, which sails at one constant velocity straight through the impact. Below, the momentum bars (left) balance exactly before and after — that is the conservation law — while the kinetic-energy bars (right) reveal the loss whenever e < 1."
      >
        <svg viewBox={`0 0 ${W} ${HC}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <ArrowDefsM />

          {/* phase banner */}
          <text x={380} y={30} textAnchor="middle" className="ui text-[12px] font-semibold" fill={sim.collided ? "#8a6d12" : "#8a8a9b"}>
            {sim.collided ? `after impact · e = ${e.toFixed(2)}` : "before impact"}
          </text>

          {/* impact marker (appears at the moment of collision) */}
          {sim.collided && (
            <g>
              <line x1={X(sim.xc)} y1={56} x2={X(sim.xc)} y2={trackY + 8} stroke={GOLD} strokeWidth={1.8} strokeDasharray="4 4" />
              <text x={X(sim.xc)} y={50} textAnchor="middle" className="ui text-[10.5px] font-semibold" fill="#8a6d12">impact</text>
            </g>
          )}

          {/* velocity arrows on separate lines so labels never collide */}
          {arrow(X(sim.x2), 76, v2, ORANGE, "mp-arr-o")}
          {arrow(X(sim.x1), 104, v1, PURPLE, "mp-arr-p")}

          {/* blocks */}
          <rect x={X(sim.x1) - hw1 * 44} y={trackY - 48} width={2 * hw1 * 44} height={48} rx={5} fill="#e8e4f9" stroke={PURPLE} strokeWidth={2.5} />
          <text x={X(sim.x1)} y={trackY - 27} textAnchor="middle" className="ui text-[12.5px] font-bold" fill={PURPLE}>m₁</text>
          <text x={X(sim.x1)} y={trackY - 11} textAnchor="middle" className="ui text-[9.5px]" fill={PURPLE}>{m1.toFixed(1)} kg</text>
          <rect x={X(sim.x2) - hw2 * 44} y={trackY - 48} width={2 * hw2 * 44} height={48} rx={5} fill="#fff3e0" stroke={ORANGE} strokeWidth={2.5} />
          <text x={X(sim.x2)} y={trackY - 27} textAnchor="middle" className="ui text-[12.5px] font-bold" fill={ORANGE}>m₂</text>
          <text x={X(sim.x2)} y={trackY - 11} textAnchor="middle" className="ui text-[9.5px]" fill={ORANGE}>{m2.toFixed(1)} kg</text>

          {/* track with numbered meter ticks */}
          <line x1={40} y1={trackY} x2={720} y2={trackY} stroke="#c4c0b4" strokeWidth={2} strokeLinecap="round" />
          {[-6, -4, -2, 0, 2, 4, 6].map(tk => (
            <g key={tk}>
              <line x1={X(tk)} y1={trackY - 4} x2={X(tk)} y2={trackY + 5} stroke="#a8a496" strokeWidth={tk === 0 ? 1.6 : 1.1} />
              <text x={X(tk)} y={trackY + 19} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">{tk}</text>
            </g>
          ))}
          <text x={728} y={trackY + 19} className="ui fill-[var(--ink-faint)] text-[10px]">m</text>

          {/* center of mass — the calm gold diamond below the mayhem */}
          <line x1={X(xcm)} y1={trackY + 6} x2={X(xcm)} y2={trackY + 30} stroke={GOLD} strokeWidth={1.2} strokeDasharray="3 3" />
          <g transform={`translate(${X(xcm)}, ${trackY + 37})`}>
            <path d="M 0 -7 L 7 0 L 0 7 L -7 0 Z" fill={GOLD} stroke="#fff" strokeWidth={1.5} />
          </g>
          {Math.abs(vcm) > 0.05 && (
            <line x1={X(xcm)} y1={trackY + 37} x2={X(xcm) + vcm * 16} y2={trackY + 37} stroke={GOLD} strokeWidth={3} markerEnd="url(#mp-arr-gold)" />
          )}
          <text x={X(xcm)} y={trackY + 58} textAnchor="middle" className="ui text-[10px] font-semibold" fill="#8a6d12">
            CM · v = {vcm.toFixed(2)} m/s (constant)
          </text>

          {/* ---------- momentum bars (white card) ---------- */}
          <rect x={36} y={232} width={352} height={234} rx={9} fill="#ffffff" opacity={0.92} stroke="#d8d4c8" />
          <text x={48} y={252} className="ui fill-[var(--ink-faint)] text-[11px]">momentum (kg·m/s)</text>
          <g className="ui">
            <rect x={252} y={244} width={8} height={8} rx={2} fill={PURPLE} />
            <text x={264} y={252} className="text-[9.5px]" fill="var(--ink-soft)">p₁</text>
            <rect x={286} y={244} width={8} height={8} rx={2} fill={ORANGE} />
            <text x={298} y={252} className="text-[9.5px]" fill="var(--ink-soft)">p₂</text>
            <rect x={320} y={244} width={8} height={8} rx={2} fill={GOLD} />
            <text x={332} y={252} className="text-[9.5px]" fill="var(--ink-soft)">Σp</text>
          </g>
          {/* group labels, gold "now" underline follows the animation */}
          <text x={140} y={272} textAnchor="middle" className="ui text-[11px] font-semibold" fill={!sim.collided ? "#8a6d12" : "var(--ink-faint)"}>before</text>
          <text x={296} y={272} textAnchor="middle" className="ui text-[11px] font-semibold" fill={sim.collided ? "#8a6d12" : "var(--ink-faint)"}>after</text>
          <rect x={sim.collided ? 274 : 118} y={276} width={44} height={2.5} rx={1} fill={GOLD} />
          {/* gridlines with numbers */}
          {pTicks.map(k => (
            <g key={k}>
              <line x1={60} y1={pY0 - k * pScale} x2={376} y2={pY0 - k * pScale} stroke="#eceadf" strokeDasharray="3 4" />
              <line x1={60} y1={pY0 + k * pScale} x2={376} y2={pY0 + k * pScale} stroke="#eceadf" strokeDasharray="3 4" />
              <text x={56} y={pY0 - k * pScale + 3} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9px]">{fmtT(k)}</text>
              <text x={56} y={pY0 + k * pScale + 3} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9px]">−{fmtT(k)}</text>
            </g>
          ))}
          <line x1={60} y1={pY0} x2={376} y2={pY0} stroke="#cfcabc" strokeWidth={1.2} />
          <text x={56} y={pY0 + 3} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9px]">0</text>
          {/* conservation tie line across both Σp bars */}
          <line x1={162} y1={pY0 - pT * pScale} x2={362} y2={pY0 - pT * pScale} stroke={GOLD} strokeWidth={1.4} strokeDasharray="5 4" opacity={0.8} />
          <text x={218} y={pY0 - pT * pScale + (pT >= 0 ? -6 : 13)} textAnchor="middle" className="ui text-[9.5px] font-semibold" fill="#8a6d12">
            Σp = {pT.toFixed(1)}
          </text>
          {pBars.map((b, i) => {
            const h = Math.abs(b.v) * pScale;
            const y = b.v >= 0 ? pY0 - h : pY0;
            const labelY = b.v >= 0 ? pY0 - h - 5 : Math.min(pY0 + h + 11, 462);
            return (
              <g key={i}>
                <rect x={b.x - 15} y={y} width={30} height={Math.max(h, 0.5)} rx={2.5} fill={b.c} opacity={0.3} stroke={b.c} strokeWidth={1.4} />
                <text x={b.x} y={labelY} textAnchor="middle" className="ui text-[9.5px] font-bold" fill={b.c}>{fmtP(b.v)}</text>
              </g>
            );
          })}

          {/* ---------- kinetic energy bars (white card) ---------- */}
          <rect x={400} y={232} width={324} height={234} rx={9} fill="#ffffff" opacity={0.92} stroke="#d8d4c8" />
          <text x={412} y={252} className="ui fill-[var(--ink-faint)] text-[11px]">kinetic energy (J)</text>
          {kTicks.map(k => (
            <g key={k}>
              <line x1={450} y1={kYb - k * kScale} x2={712} y2={kYb - k * kScale} stroke="#eceadf" strokeDasharray="3 4" />
              <text x={446} y={kYb - k * kScale + 3} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9px]">
                {k < 10 && kStep < 1 ? k.toFixed(1) : k.toFixed(0)}
              </text>
            </g>
          ))}
          <line x1={450} y1={kYb} x2={712} y2={kYb} stroke="#cfcabc" strokeWidth={1.2} />
          {/* before / after bars */}
          <rect x={490} y={kYb - keB * kScale} width={60} height={Math.max(keB * kScale, 0.5)} rx={3} fill={BLUE} opacity={0.3} stroke={BLUE} strokeWidth={1.5} />
          <rect x={610} y={kYb - keA * kScale} width={60} height={Math.max(keA * kScale, 0.5)} rx={3} fill={BLUE} opacity={0.3} stroke={BLUE} strokeWidth={1.5} />
          {/* the loss, made visible on the after bar */}
          <line x1={484} y1={kYb - keB * kScale} x2={676} y2={kYb - keB * kScale} stroke="#9e9e9e" strokeWidth={1} strokeDasharray="4 4" />
          {lost > 0.02 && (
            <>
              <rect x={610} y={kYb - keB * kScale} width={60} height={lost * kScale} fill={RED} opacity={0.14} stroke={RED} strokeWidth={1} strokeDasharray="3 3" />
              <text
                x={712}
                y={Math.min(Math.max(kYb - keB * kScale + (lost * kScale) / 2 + 3, 268), 430)}
                textAnchor="end" className="ui text-[10.5px] font-semibold" fill={RED}
              >
                −{lost.toFixed(1)} J ({lostPct.toFixed(0)}%)
              </text>
            </>
          )}
          {lost <= 0.02 && (
            <text x={712} y={270} textAnchor="end" className="ui text-[10.5px] font-semibold" fill={GREEN}>no KE lost (elastic)</text>
          )}
          <text x={520} y={kYb - keB * kScale - 6} textAnchor="middle" className="ui text-[10px] font-bold" fill={BLUE}>{keB.toFixed(1)}</text>
          <text x={640} y={kYb - keA * kScale - 6} textAnchor="middle" className="ui text-[10px] font-bold" fill={BLUE}>{keA.toFixed(1)}</text>
          <text x={520} y={456} textAnchor="middle" className="ui text-[11px] font-semibold" fill={!sim.collided ? "#8a6d12" : "var(--ink-faint)"}>before</text>
          <text x={640} y={456} textAnchor="middle" className="ui text-[11px] font-semibold" fill={sim.collided ? "#8a6d12" : "var(--ink-faint)"}>after</text>
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={launch} labels={["play", "pause"]} />
          <LabeledSlider label="m₁" value={m1} min={0.5} max={10} step={0.1} onChange={setM1} fmt={v => `${v.toFixed(1)} kg`} color={PURPLE} width={120} />
          <LabeledSlider label="m₂" value={m2} min={0.5} max={10} step={0.1} onChange={setM2} fmt={v => `${v.toFixed(1)} kg`} color={ORANGE} width={120} />
          <LabeledSlider label="v₁ᵢ" value={v1i} min={-8} max={8} step={0.1} onChange={setV1i} fmt={v => `${v.toFixed(1)} m/s`} color={PURPLE} width={120} />
          <LabeledSlider label="v₂ᵢ" value={v2i} min={-8} max={8} step={0.1} onChange={setV2i} fmt={v => `${v.toFixed(1)} m/s`} color={ORANGE} width={120} />
          <LabeledSlider label="e" value={e} min={0} max={1} step={0.01} onChange={setE} fmt={v => v.toFixed(2)} width={120} />
          <Readout label="Σp" value={`${pT.toFixed(1)} kg·m/s`} color={GOLD} />
          <Readout label="KE lost" value={`${lost.toFixed(1)} J`} color={RED} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys4-elastic-stop" met={elasticStopMet}>
        Set equal masses (<M>{"m_1 = m_2"}</M>) and restitution <M>{"e=1"}</M> (elastic), then{" "}
        <em>press play and run the collision</em>. Block 1 should come to a complete stop —
        momentum transfers perfectly to block 2.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Center of mass tracker — now on a real coordinate grid in meters
// ------------------------------------------------------------------
function CenterOfMass() {
  const HC = 380;
  const [m1, setM1] = useState(2);
  const [m2, setM2] = useState(5);
  const [m3, setM3] = useState(3);

  // fixed particle positions (meters)
  const P: [number, number][] = [
    [1.2, 0.9],
    [5.6, 3.4],
    [8.6, 1.4],
  ];
  const masses = [m1, m2, m3];
  const colors = [PURPLE, ORANGE, BLUE];
  const Mtot = m1 + m2 + m3;
  const xcm = (m1 * P[0][0] + m2 * P[1][0] + m3 * P[2][0]) / Mtot;
  const ycm = (m1 * P[0][1] + m2 * P[1][1] + m3 * P[2][1]) / Mtot;

  // world → screen
  const X = (x: number) => 70 + x * 62;
  const Y = (y: number) => 330 - y * 62;

  // target (meters): default masses put the CM at (5.62, 2.30) — you must re-weight
  const TX = 4.4;
  const TY = 2.0;
  const TH = 0.35;
  const cmMet = Math.abs(xcm - TX) < TH && Math.abs(ycm - TY) < TH;

  return (
    <>
      <WidgetShell
        title="Center of mass"
        onReset={() => { setM1(2); setM2(5); setM3(3); }}
        caption="The center of mass (★) is the mass-weighted average position, plotted on a real grid in meters. Each dashed tether is labeled with that particle's share of the total mass — its voting power over where the star sits."
      >
        <svg viewBox={`0 0 ${W} ${HC}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* grid */}
          {Array.from({ length: 11 }, (_, i) => i).map(gx => (
            <line key={`gx${gx}`} x1={X(gx)} y1={Y(4.5)} x2={X(gx)} y2={330} stroke="#ece8dd" />
          ))}
          {Array.from({ length: 5 }, (_, i) => i).map(gy => (
            <line key={`gy${gy}`} x1={70} y1={Y(gy)} x2={690} y2={Y(gy)} stroke="#ece8dd" />
          ))}
          {/* axes with numbered ticks */}
          <line x1={70} y1={330} x2={690} y2={330} stroke="#8a8a9b" strokeWidth={1.5} />
          <line x1={70} y1={Y(4.5)} x2={70} y2={330} stroke="#8a8a9b" strokeWidth={1.5} />
          {Array.from({ length: 11 }, (_, i) => i).map(gx => (
            <text key={`tx${gx}`} x={X(gx)} y={346} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9.5px]">{gx}</text>
          ))}
          {Array.from({ length: 5 }, (_, i) => i).map(gy => (
            <text key={`ty${gy}`} x={60} y={Y(gy) + 3.5} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9.5px]">{gy}</text>
          ))}
          <text x={704} y={346} className="ui fill-[var(--ink-faint)] text-[10px]">x (m)</text>
          <text x={52} y={Y(4.5) - 6} className="ui fill-[var(--ink-faint)] text-[10px]">y (m)</text>

          {/* target zone */}
          <rect x={X(TX - TH)} y={Y(TY + TH)} width={2 * TH * 62} height={2 * TH * 62} rx={5}
            fill={cmMet ? "#f0f8f1" : "none"} stroke="#bfdfc4" strokeWidth={2} strokeDasharray="6 3" />
          <text x={X(TX)} y={Y(TY - TH) + 14} textAnchor="middle" className="ui text-[10px] font-semibold" fill={GREEN}>target</text>

          {/* tethers labeled with each particle's weight share */}
          {P.map(([px, py], i) => {
            const mx = (X(px) + X(xcm)) / 2;
            const my = (Y(py) + Y(ycm)) / 2;
            return (
              <g key={i}>
                <line x1={X(px)} y1={Y(py)} x2={X(xcm)} y2={Y(ycm)} stroke="#d6d2c4" strokeWidth={1.5} strokeDasharray="6 4" />
                <text x={mx} y={my - 6} textAnchor="middle" className="ui text-[9.5px] font-semibold" fill={colors[i]}>
                  {((100 * masses[i]) / Mtot).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* particles */}
          {P.map(([px, py], i) => {
            const r = 11 + masses[i] * 1.6;
            return (
              <g key={i}>
                <circle cx={X(px)} cy={Y(py)} r={r} fill={colors[i]} opacity={0.75} stroke="#fff" strokeWidth={2} />
                <text x={X(px)} y={Y(py) + 4} textAnchor="middle" className="ui text-[12px] font-bold" fill="#fff">
                  {["m₁", "m₂", "m₃"][i]}
                </text>
                <text x={X(px)} y={Y(py) + r + 14} textAnchor="middle" className="ui text-[10.5px]" fill={colors[i]}>
                  {masses[i].toFixed(1)} kg
                </text>
              </g>
            );
          })}

          {/* center of mass */}
          <circle cx={X(xcm)} cy={Y(ycm)} r={14} fill={GOLD} stroke="#fff" strokeWidth={3} />
          <text x={X(xcm)} y={Y(ycm) + 5} textAnchor="middle" className="ui text-[15px] font-bold" fill="#fff">★</text>

          {/* live readout card */}
          <rect x={556} y={22} width={186} height={62} rx={9} fill="#ffffff" opacity={0.92} stroke="#d8d4c8" />
          <text x={568} y={42} className="ui text-[11px] font-semibold" fill="#8a6d12">
            CM = ({xcm.toFixed(2)}, {ycm.toFixed(2)}) m
          </text>
          <text x={568} y={60} className="ui fill-[var(--ink-faint)] text-[10.5px]">
            r̄ = Σmᵢrᵢ / Σmᵢ
          </text>
          <text x={568} y={76} className="ui fill-[var(--ink-faint)] text-[10.5px]">
            M = {Mtot.toFixed(1)} kg
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="m₁" value={m1} min={0.5} max={15} step={0.1} onChange={setM1} fmt={v => `${v.toFixed(1)} kg`} color={PURPLE} />
          <LabeledSlider label="m₂" value={m2} min={0.5} max={15} step={0.1} onChange={setM2} fmt={v => `${v.toFixed(1)} kg`} color={ORANGE} />
          <LabeledSlider label="m₃" value={m3} min={0.5} max={15} step={0.1} onChange={setM3} fmt={v => `${v.toFixed(1)} kg`} color={BLUE} />
          <Readout label="x̄" value={`${xcm.toFixed(2)} m`} color={GOLD} />
          <Readout label="ȳ" value={`${ycm.toFixed(2)} m`} color={GOLD} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys4-cm-target" met={cmMet}>
        Move the center of mass (★) into the dashed green target box by adjusting the three masses.
        You cannot move the particles — only re-weight them.
      </Challenge>
    </>
  );
}

export default function Momentum() {
  return (
    <div>
      <PageHeader
        chapter="Physics 4"
        section="College Physics & Dynamics"
        title="Momentum and Collisions"
        lede="Momentum is conserved whenever net external force is zero. Collisions are the clearest test — two objects exchange momentum in an instant, and the total never changes."
      />

      <p>
        Why is it worse to be hit by a truck than by a bicycle at the same speed? Why does a
        rifle kick backward when it fires forward? Both questions are about the same quantity:{" "}
        <strong>momentum</strong>, <M>{"\\mathbf{p} = m\\mathbf{v}"}</M> — "amount of motion,"
        mass times velocity, with a direction. Newton actually wrote his second law about it:{" "}
        <M>{"\\mathbf{F} = \\dot{\\mathbf{p}}"}</M>, force is the rate at which momentum
        changes. Flip that around and you get one of the most powerful bargains in physics: if
        no net external force acts on a system, its total momentum cannot change —{" "}
        <em>ever</em>, no matter how violently the pieces inside interact:
      </p>
      <Eq>{"\\sum \\mathbf{F}_{\\text{ext}} = 0 \\implies \\mathbf{p}_{\\text{total}} = \\text{const}."}</Eq>
      <p>
        That is why the rifle kicks: bullet and rifle start with zero total momentum, so when
        the bullet carries momentum forward, the rifle must carry an equal amount backward.
        And it is why collisions are momentum's home turf: during the crash, the forces
        between the two objects are enormous but <em>internal</em> — they cancel in the total —
        while external forces (gravity, friction) barely act in the few milliseconds available.
        So momentum is conserved through a collision <strong>even when energy is not</strong>.
      </p>

      <H2>1D collision types</H2>
      <p>
        What <em>does</em> distinguish collisions is how much bounce they have. Drop a steel
        ball bearing on a tile floor and it rebounds almost to your hand; drop a lump of clay
        and it lands with a thud and stays. Physics grades this on a scale from 0 to 1 called
        the <strong>coefficient of restitution</strong> <M>{"e"}</M>: the relative speed of
        separation after the collision, divided by the relative speed of approach before it,
      </p>
      <Eq>{"e = \\frac{\\text{speed apart after}}{\\text{speed together before}} = -\\frac{v_{2f}-v_{1f}}{v_{2i}-v_{1i}}."}</Eq>
      <p>
        <M>{"e=1"}</M> is a perfectly <strong>elastic</strong> collision — full bounce, kinetic
        energy preserved (steel balls, billiards, nearly). <M>{"e=0"}</M> is perfectly{" "}
        <strong>inelastic</strong> — no bounce at all, the objects stick together and the
        missing kinetic energy has become heat, sound, and dents (the clay). Real collisions
        sit in between. Given <M>{"e"}</M>, conservation of momentum pins down both final
        velocities:
      </p>
      <Eq>{"v_{1f} = \\frac{m_1-em_2}{m_1+m_2}v_{1i} + \\frac{(1+e)m_2}{m_1+m_2}v_{2i}, \\qquad v_{2f} = \\frac{(1+e)m_1}{m_1+m_2}v_{1i} + \\frac{m_2-em_1}{m_1+m_2}v_{2i}."}</Eq>

      <p>
        <strong>Try this:</strong> press play and watch the gold center-of-mass marker: it
        sails through the crash at one constant velocity, whatever you do to <M>{"e"}</M>.
        Then check the bars while you experiment: the two gold Σp bars match in{" "}
        <em>every single configuration</em> you can build — that's the conservation law —
        while the kinetic-energy bar drops whenever <M>{"e < 1"}</M>. Set <M>{"e = 0"}</M> and
        confirm the blocks leave stuck together at the same velocity. Finally send a light
        block at a heavy one and watch it bounce straight back.
      </p>

      <Collision1D />

      <KeyIdea>
        For an elastic collision between equal masses, the velocities are exchanged: the first
        object stops and the second takes its velocity. This is the billiard-ball rule.
      </KeyIdea>

      <Worked title="Two railway cars couple together">
        <p>
          <strong>Given.</strong> A 10-tonne railway car rolling at 2 m/s bumps into a
          stationary 10-tonne car and the coupler locks (<M>{"e = 0"}</M>). Final speed? Energy
          lost?
        </p>
        <p>
          <strong>Set up.</strong> Momentum before = momentum after:{" "}
          <M>{"(10{,}000)(2) + 0 = (20{,}000)\\,v_f"}</M>.
        </p>
        <p>
          <strong>Solve.</strong> <M>{"v_f = 1"}</M> m/s. Kinetic energy before:{" "}
          <M>{"\\tfrac12(10{,}000)(2^2) = 20"}</M> kJ. After:{" "}
          <M>{"\\tfrac12(20{,}000)(1^2) = 10"}</M> kJ. Exactly half the energy became clank,
          heat, and deformation — yet momentum is conserved to the gram-meter-per-second.
        </p>
        <p>
          <strong>Check.</strong> Rebuild it in the sandbox: equal masses,{" "}
          <M>{"v_{1i} = 2"}</M>, <M>{"v_{2i} = 0"}</M>, <M>{"e = 0"}</M>. Both readouts should
          confirm the arithmetic.
        </p>
      </Worked>

      <H2>Impulse: spreading the blow</H2>
      <p>
        A collision changes momentum, and the change must be delivered by a force acting over
        time. That delivery is called <strong>impulse</strong>:
      </p>
      <Eq>{"J = \\int F\\,dt = \\Delta p."}</Eq>
      <p>
        Read it back: the same momentum change can come from a huge force over a brief instant
        or a gentle force over a long stretch. That freedom is the physics behind every
        cushion in your life: airbags, bent knees when you land a jump, the give in a catcher's
        mitt. You cannot negotiate away the <M>{"\\Delta p"}</M> — but you can stretch the{" "}
        <M>{"dt"}</M> and shrink the peak <M>{"F"}</M>.
      </p>

      <Worked title="Why you bend your knees">
        <p>
          <strong>Given.</strong> A 60 kg person lands from a 1 m drop, arriving at{" "}
          <M>{"v = \\sqrt{2g(1)} \\approx 4.4"}</M> m/s. Compare stiff-legged stopping (0.02 s)
          with bent-knee stopping (0.2 s).
        </p>
        <p>
          <strong>Set up.</strong> Either way, <M>{"\\Delta p = 60 \\times 4.4 = 264"}</M>{" "}
          kg·m/s must be absorbed: <M>{"F_{\\text{avg}} = \\Delta p / \\Delta t"}</M>.
        </p>
        <p>
          <strong>Solve.</strong> Stiff: <M>{"264/0.02 = 13{,}200"}</M> N — about 22× body
          weight, broken-bone territory. Bent knees: <M>{"264/0.2 = 1{,}320"}</M> N — just over
          2× body weight. Ten times the stopping time, one-tenth the force.
        </p>
        <p>
          <strong>Check.</strong> Same momentum change in both cases — only the delivery
          schedule differed. ✓
        </p>
      </Worked>

      <H2>Center of mass</H2>
      <p>
        The center of mass of a system is the mass-weighted average position. Under Newton's
        laws, it moves as if all the mass were concentrated there and all external forces
        acted on it. For a robot, the center of mass determines balance and stability.
      </p>
      <Eq>{"\\mathbf{r}_{\\text{cm}} = \\frac{\\sum m_i \\mathbf{r}_i}{\\sum m_i}."}</Eq>

      <p>
        <strong>Try this:</strong> crank one mass up and watch the star slide toward it — the
        average is weighted by mass, so the heavy particle "votes" harder about where the
        center is. Notice the star never leaves the triangle formed by the three particles,
        and to hit the challenge target you must reason about which particle to re-weight,
        not just fiddle.
      </p>

      <CenterOfMass />

      <Quiz
        challengeId="phys4-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: (
              <>
                An astronaut floating motionless in space throws a wrench forward. What happens
                to the astronaut?
              </>
            ),
            options: [
              { label: "Drifts backward, keeping total momentum zero", correct: true },
              { label: "Stays put — the wrench is too light to matter" },
              { label: "Drifts forward after the wrench" },
              { label: "Spins in place" },
            ],
            explain:
              "Total momentum starts at zero and no external force acts, so it stays zero: wrench momentum forward must be balanced by astronaut momentum backward. This is also how rockets work.",
          },
          {
            prompt: (
              <>
                In a perfectly inelastic collision (<M>{"e=0"}</M>), which statement is true?
              </>
            ),
            options: [
              { label: "Momentum is conserved but kinetic energy is not", correct: true },
              { label: "Kinetic energy is conserved but momentum is not" },
              { label: "Both are conserved" },
              { label: "Neither is conserved" },
            ],
            explain:
              "Momentum conservation needs only 'no external force' — it survives any collision. The missing kinetic energy became heat and deformation.",
          },
          {
            prompt: (
              <>
                An airbag saves you in a crash by changing… (your momentum change is fixed by
                the crash)
              </>
            ),
            options: [
              { label: "the stopping time — longer Δt means smaller peak force", correct: true },
              { label: "your momentum — it absorbs it so you don't have to" },
              { label: "your mass, briefly" },
              { label: "the direction of the impulse" },
            ],
            explain:
              "J = FΔt = Δp. The Δp is non-negotiable; the airbag stretches Δt from milliseconds to tenths of a second, dividing the peak force accordingly.",
          },
        ]}
      />

      <H2>Where you'll use this in Modern Robotics</H2>
      <p>
        The center of mass is the star of robot dynamics: Chapter 8 writes every link's
        equations about its center of mass, and legged robots live or die by keeping the
        center of mass over the feet. Impulse thinking governs robot impacts — striking,
        catching, hammering — and the momentum of a whole arm is packaged, link by link, into
        the spatial-momentum bookkeeping behind the mass matrix. The rule "internal forces
        cancel, only external forces move the total" is also why a robot cannot lift itself by
        its own bootstraps, however cleverly its joints push on each other.
      </p>

      <BookRef>
        Physics track · Module 4 of 10: linear momentum, impulse, elastic and inelastic
        collisions, center of mass. Bridges to MR §8 (dynamics) and §11 (impact-aware control).
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
