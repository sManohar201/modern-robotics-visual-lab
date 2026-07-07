import { useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell } from "../../components/widgets/WidgetShell";

const W = 760;
const H = 360;
const RED = "#d9483f";
const GREEN = "#2f9e44";
const BLUE = "#3b6fd4";
const PURPLE = "#6741d9";
const GOLD = "#caa53d";
const WATER_COLOR = "#3b8fd4";
const g = 9.81;

// ------------------------------------------------------------------
// Pressure-depth visualizer
// ------------------------------------------------------------------
const TANK_DEPTH = 6; // m of fluid in the tank
const P_TARGET = 50; // kPa — challenge target
const ARROW_KPA = 0.8; // px per kPa for pressure arrows
const ARROW_MAX = 110; // px clamp

function PressureDepth() {
  const [rho, setRho] = useState(1000);
  const [depth, setDepth] = useState(3.0);
  const P_gauge = rho * g * depth;
  const P_abs = 101325 + P_gauge;

  const tankX = 96, tankY = 44, tankW = 210, tankH = 280;
  const dToY = (d: number) => tankY + (d / TANK_DEPTH) * tankH;
  const probeY = dToY(depth);

  const arrowLen = (d: number) => Math.min(ARROW_MAX, ((rho * g * d) / 1000) * ARROW_KPA);

  // P(d) plot — depth on x, gauge pressure on y
  const pl = { x0: 420, x1: 726, y0: 300, y1: 60 };
  const yMaxk = (rho * g * TANK_DEPTH) / 1000; // kPa at the bottom
  const mapD = (d: number) => pl.x0 + (d / TANK_DEPTH) * (pl.x1 - pl.x0);
  const mapP = (pk: number) => pl.y0 + (pk / yMaxk) * (pl.y1 - pl.y0);
  const dStar = (P_TARGET * 1000) / (rho * g); // depth where the gold target is crossed

  const deepMet = P_gauge > P_TARGET * 1000;

  return (
    <>
      <WidgetShell
        title="Hydrostatic pressure"
        onReset={() => { setRho(1000); setDepth(3.0); }}
        caption="Left: a 6 m tank with a probe (gold) you lower with the depth slider; purple arrows show the fluid squeezing inward, longer with depth on a fixed 40 px = 50 kPa scale. Right: P = ρgh as an honest plot — the gold horizontal line is the 50 kPa challenge target, and the gold dot on the depth axis marks where your current fluid crosses it."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <defs>
            <marker id="pd-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={PURPLE} />
            </marker>
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a8d4f0" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#1a5fa0" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* tank + water */}
          <rect x={tankX} y={tankY} width={tankW} height={tankH} rx={4} fill="#e8e4d8" stroke="#8a8a9b" strokeWidth={2} />
          <rect x={tankX + 2} y={tankY + 2} width={tankW - 4} height={tankH - 4} rx={3} fill="url(#waterGrad)" />

          {/* depth ruler, 1 m ticks */}
          {Array.from({ length: TANK_DEPTH + 1 }, (_, d) => (
            <g key={d}>
              <line x1={tankX - 8} y1={dToY(d)} x2={tankX} y2={dToY(d)} stroke="#8a8a9b" strokeWidth={1.3} />
              <text x={tankX - 12} y={dToY(d) + 3.5} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9.5px]">{d} m</text>
            </g>
          ))}

          {/* background pressure arrows at fixed depths */}
          {[1.5, 3, 4.5, 6].map(d => (
            <g key={d} opacity={0.45}>
              <line x1={tankX + 2} y1={dToY(d)} x2={tankX + 2 + arrowLen(d)} y2={dToY(d)} stroke={PURPLE} strokeWidth={2} markerEnd="url(#pd-arr)" />
              <line x1={tankX + tankW - 2} y1={dToY(d)} x2={tankX + tankW - 2 - arrowLen(d)} y2={dToY(d)} stroke={PURPLE} strokeWidth={2} markerEnd="url(#pd-arr)" />
            </g>
          ))}

          {/* probe at the chosen depth */}
          <line x1={tankX + 2} y1={probeY} x2={tankX + 2 + arrowLen(depth)} y2={probeY} stroke={PURPLE} strokeWidth={3} markerEnd="url(#pd-arr)" />
          <line x1={tankX + tankW - 2} y1={probeY} x2={tankX + tankW - 2 - arrowLen(depth)} y2={probeY} stroke={PURPLE} strokeWidth={3} markerEnd="url(#pd-arr)" />
          <circle cx={tankX + tankW / 2} cy={probeY} r={8} fill={GOLD} stroke="#fff" strokeWidth={2.5} />
          <text x={tankX + tankW / 2} y={probeY - 13} textAnchor="middle" className="ui text-[10.5px] font-semibold" fill="#8a6d12">
        probe · {depth.toFixed(1)} m
          </text>

          {/* arrow-scale legend */}
          <rect x={14} y={tankY + tankH - 46} width={70} height={46} rx={8} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <line x1={22} y1={tankY + tankH - 28} x2={22 + 50 * ARROW_KPA * 0.8} y2={tankY + tankH - 28} stroke={PURPLE} strokeWidth={2.5} markerEnd="url(#pd-arr)" />
          <text x={24} y={tankY + tankH - 10} className="ui text-[9px] fill-[#8a8a9b]">50 kPa</text>

          {/* readout card */}
          <rect x={14} y={16} width={140} height={88} rx={8} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={26} y={38} className="ui text-[11px] fill-[#4b4b5e]">P_gauge = ρgh</text>
          <text x={26} y={58} className="ui text-[14px] font-bold" fill={deepMet ? "#b08c1d" : PURPLE}>
            {(P_gauge / 1000).toFixed(1)} kPa
          </text>
          <text x={26} y={78} className="ui text-[10.5px] fill-[#8a8a9b]">absolute: {(P_abs / 1000).toFixed(0)} kPa</text>
          <text x={26} y={94} className="ui text-[10.5px] fill-[#8a8a9b]">≈ {(P_abs / 101325).toFixed(2)} atm</text>

          {/* P(d) plot */}
          <line x1={pl.x0} y1={pl.y0} x2={pl.x0} y2={pl.y1 - 8} stroke="#b6b2a4" strokeWidth={1.4} />
          <line x1={pl.x0} y1={pl.y0} x2={pl.x1 + 6} y2={pl.y0} stroke="#b6b2a4" strokeWidth={1.4} />
          {[0, 1, 2, 3, 4, 5, 6].map(d => (
            <g key={d}>
              <line x1={mapD(d)} y1={pl.y0} x2={mapD(d)} y2={pl.y0 + 5} stroke="#b6b2a4" />
              <text x={mapD(d)} y={pl.y0 + 17} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">{d}</text>
            </g>
          ))}
          <text x={(pl.x0 + pl.x1) / 2} y={pl.y0 + 32} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">depth h (m)</text>
          {[0, 0.5, 1].map(f => (
            <g key={f}>
              <line x1={pl.x0 - 5} y1={mapP(f * yMaxk)} x2={pl.x0} y2={mapP(f * yMaxk)} stroke="#b6b2a4" />
              <text x={pl.x0 - 8} y={mapP(f * yMaxk) + 3.5} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9.5px]">{(f * yMaxk).toFixed(0)}</text>
            </g>
          ))}
          <text x={pl.x0 - 30} y={(pl.y0 + pl.y1) / 2} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9.5px]" transform={`rotate(-90 ${pl.x0 - 30} ${(pl.y0 + pl.y1) / 2})`}>
            P_gauge (kPa)
          </text>

          {/* reference: water, when the fluid isn't water */}
          {Math.abs(rho - 1000) > 50 && (rho * g * 0 + (1000 * g * TANK_DEPTH) / 1000) < yMaxk * 1.05 && (
            <path d={`M ${mapD(0)} ${mapP(0)} L ${mapD(TANK_DEPTH)} ${mapP((1000 * g * TANK_DEPTH) / 1000)}`}
              fill="none" stroke="#8a8576" strokeWidth={1.6} strokeDasharray="5 5" />
          )}
          {/* the line itself */}
          <path d={`M ${mapD(0)} ${mapP(0)} L ${mapD(TANK_DEPTH)} ${mapP(yMaxk)}`} fill="none" stroke={BLUE} strokeWidth={2.6} />

          {/* gold 50 kPa target line + crossing depth */}
          {P_TARGET < yMaxk && (
            <>
              <line x1={pl.x0} y1={mapP(P_TARGET)} x2={pl.x1} y2={mapP(P_TARGET)} stroke={GOLD} strokeWidth={1.6} strokeDasharray="5 4" />
              <text x={pl.x1} y={mapP(P_TARGET) - 5} textAnchor="end" className="ui text-[10px]" fill="#8a6d12">50 kPa target</text>
              {dStar <= TANK_DEPTH && (
                <>
                  <circle cx={mapD(dStar)} cy={mapP(P_TARGET)} r={5} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
                  <text x={mapD(dStar)} y={pl.y0 - 6} textAnchor="middle" className="ui text-[9.5px]" fill="#8a6d12">h = {dStar.toFixed(1)} m</text>
                  <line x1={mapD(dStar)} y1={mapP(P_TARGET)} x2={mapD(dStar)} y2={pl.y0} stroke={GOLD} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.7} />
                </>
              )}
            </>
          )}

          {/* live dot at current depth */}
          <circle cx={mapD(depth)} cy={mapP((P_gauge / 1000))} r={5.5} fill={BLUE} stroke="#fff" strokeWidth={2} />

          {/* legend */}
          <g className="ui">
            <line x1={pl.x0 + 12} y1={pl.y1 - 2} x2={pl.x0 + 30} y2={pl.y1 - 2} stroke={BLUE} strokeWidth={2.6} />
            <text x={pl.x0 + 35} y={pl.y1 + 1.5} className="text-[9.5px]" fill="var(--ink-soft)">this fluid (ρ = {rho} kg/m³)</text>
            {Math.abs(rho - 1000) > 50 && (
              <>
                <line x1={pl.x0 + 12} y1={pl.y1 + 12} x2={pl.x0 + 30} y2={pl.y1 + 12} stroke="#8a8576" strokeWidth={1.6} strokeDasharray="4 4" />
                <text x={pl.x0 + 35} y={pl.y1 + 15.5} className="text-[9.5px]" fill="var(--ink-soft)">water, for comparison</text>
              </>
            )}
          </g>
        </svg>
        <ControlBar>
          <LabeledSlider label="depth h" value={depth} min={0.1} max={6} step={0.05} onChange={setDepth}
            fmt={v => `${v.toFixed(2)} m`} color={BLUE} width={200} />
          <LabeledSlider label="ρ (fluid)" value={rho} min={700} max={13600} step={100} onChange={setRho}
            fmt={v => `${v.toFixed(0)} kg/m³`} color={PURPLE} width={200} />
          <Readout label="P_gauge" value={`${(P_gauge / 1000).toFixed(1)} kPa`} color={PURPLE} />
          <Readout label="P_abs" value={`${(P_abs / 1000).toFixed(0)} kPa`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys9-pressure-50kpa" met={deepMet}>
        Push the gauge pressure past <strong>50 kPa</strong> — the gold line in the plot. In
        water that means diving past ~5.1 m; in mercury (ρ = 13,600 kg/m³) the gold crossing
        marker slides to just 0.37 m. Same law <M>{"P = \\rho g h"}</M>, very different fluids.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Buoyancy sandbox
// ------------------------------------------------------------------
function BuoyancySandbox() {
  const [rhoObj, setRhoObj] = useState(1200);
  const [volObj, setVolObj] = useState(0.002);
  const [rhoFluid, setRhoFluid] = useState(1000);

  const massObj = rhoObj * volObj;
  const weightDown = massObj * g;
  const buoyancy = rhoFluid * g * volObj; // fully submerged (max) buoyancy
  const ratio = rhoObj / rhoFluid;
  const sinks = ratio > 1;
  const submergedFrac = sinks ? 1 : Math.min(1, ratio);
  const F_B_actual = rhoFluid * g * volObj * submergedFrac; // equals W when floating
  const netForce = buoyancy - weightDown; // net if fully submerged

  const tankX = 66, tankY = 56, tankW = 250, tankH = 270;
  const waterY = tankY + 42;
  const cube = Math.max(22, Math.cbrt(volObj) * 480);
  const cubeX = tankX + tankW / 2 - cube / 2;
  const cubeTop = sinks ? tankY + tankH - cube - 4 : waterY - (1 - submergedFrac) * cube;

  // shared force-arrow scale: both arrows drawn with the same px-per-N
  const maxF = Math.max(weightDown, sinks ? buoyancy : F_B_actual, 1e-6);
  const pxPerN = 62 / maxF;
  const fbShown = sinks ? buoyancy : F_B_actual;

  // submerged-fraction vs density-ratio plot
  const pl = { x0: 396, x1: 726, y0: 300, y1: 70 };
  const R_MAX = 1.5;
  const mapR = (r: number) => pl.x0 + (r / R_MAX) * (pl.x1 - pl.x0);
  const mapF = (f: number) => pl.y0 + f * (pl.y1 - pl.y0);
  const liveR = Math.min(R_MAX, ratio);

  const floatMet = !sinks && Math.abs(submergedFrac - 0.5) <= 0.03;

  return (
    <>
      <WidgetShell
        title="Buoyancy sandbox"
        onReset={() => { setRhoObj(1200); setVolObj(0.002); setRhoFluid(1000); }}
        caption="Left: the block settles where buoyancy balances weight; the dashed waterline slices it at the submerged fraction, and the green/red arrows share one force scale. Right: the whole law in one plot — submerged fraction equals the density ratio ρ_obj/ρ_fluid up to 1, then everything sinks (red zone). The gold band is the half-submerged challenge target."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <defs>
            <marker id="buy-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={RED} />
            </marker>
            <marker id="buy-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={GREEN} />
            </marker>
          </defs>

          {/* tank + water */}
          <rect x={tankX} y={tankY} width={tankW} height={tankH} rx={4} fill="#e8e4d8" stroke="#8a8a9b" strokeWidth={2} />
          <rect x={tankX + 2} y={waterY} width={tankW - 4} height={tankY + tankH - waterY - 2} rx={3} fill={WATER_COLOR} opacity={0.28} />
          <line x1={tankX} y1={waterY} x2={tankX + tankW} y2={waterY} stroke={WATER_COLOR} strokeWidth={2} />
          <text x={tankX + 8} y={waterY + 16} className="ui text-[10.5px]" fill={WATER_COLOR}>ρ_fluid = {rhoFluid} kg/m³</text>

          {/* object with waterline slice */}
          <rect x={cubeX} y={cubeTop} width={cube} height={cube} rx={4}
            fill={sinks ? RED : GREEN} opacity={0.72} stroke="#fff" strokeWidth={2} />
          {!sinks && submergedFrac < 1 && (
            <line x1={cubeX - 10} y1={waterY} x2={cubeX + cube + 10} y2={waterY} stroke="#1a5fa0" strokeWidth={1.6} strokeDasharray="4 3" />
          )}
          <text x={cubeX + cube / 2} y={cubeTop + cube / 2 + 4} textAnchor="middle" className="ui text-[11px] font-bold fill-white">
            {sinks ? "SINKS" : "FLOATS"}
          </text>

          {/* force arrows on a shared scale, both from the cube center */}
          <line x1={cubeX + cube / 2 - 12} y1={cubeTop + cube / 2} x2={cubeX + cube / 2 - 12} y2={cubeTop + cube / 2 - fbShown * pxPerN}
            stroke={GREEN} strokeWidth={3.5} markerEnd="url(#buy-b)" />
          <text x={cubeX + cube / 2 - 18} y={cubeTop + cube / 2 - fbShown * pxPerN - 6} textAnchor="end" className="ui text-[10.5px]" fill={GREEN}>
            F_B = {fbShown.toFixed(1)} N
          </text>
          <line x1={cubeX + cube / 2 + 12} y1={cubeTop + cube / 2} x2={cubeX + cube / 2 + 12} y2={cubeTop + cube / 2 + weightDown * pxPerN}
            stroke={RED} strokeWidth={3.5} markerEnd="url(#buy-w)" />
          <text x={cubeX + cube / 2 + 18} y={cubeTop + cube / 2 + weightDown * pxPerN + 14} className="ui text-[10.5px]" fill={RED}>
            W = {weightDown.toFixed(1)} N
          </text>

          {/* status card */}
          <rect x={14} y={14} width={166} height={92} rx={8} fill="#ffffff" opacity={0.92} stroke="#d8d4c8" />
          <text x={26} y={36} className="ui text-[12px] font-bold" fill={sinks ? RED : GREEN}>{sinks ? "SINKS" : "FLOATS"}</text>
          <text x={26} y={56} className="ui text-[11px] fill-[#4b4b5e]">submerged: {(submergedFrac * 100).toFixed(0)}%</text>
          <text x={26} y={74} className="ui text-[11px] fill-[#4b4b5e]">ρ_obj/ρ_fluid = {ratio.toFixed(2)}</text>
          <text x={26} y={92} className="ui text-[10px] fill-[#8a8a9b]">
            {sinks ? `net force ${netForce.toFixed(1)} N downward` : "arrows equal — equilibrium"}
          </text>

          {/* fraction-vs-ratio plot */}
          <line x1={pl.x0} y1={pl.y0} x2={pl.x0} y2={pl.y1 - 8} stroke="#b6b2a4" strokeWidth={1.4} />
          <line x1={pl.x0} y1={pl.y0} x2={pl.x1 + 6} y2={pl.y0} stroke="#b6b2a4" strokeWidth={1.4} />
          {[0, 0.5, 1, 1.5].map(r => (
            <g key={r}>
              <line x1={mapR(r)} y1={pl.y0} x2={mapR(r)} y2={pl.y0 + 5} stroke="#b6b2a4" />
              <text x={mapR(r)} y={pl.y0 + 17} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">{r}</text>
            </g>
          ))}
          <text x={(pl.x0 + pl.x1) / 2} y={pl.y0 + 32} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">density ratio ρ_obj / ρ_fluid</text>
          {[0, 0.25, 0.5, 0.75, 1].map(f => (
            <g key={f}>
              <line x1={pl.x0 - 5} y1={mapF(f)} x2={pl.x0} y2={mapF(f)} stroke="#b6b2a4" />
              <text x={pl.x0 - 8} y={mapF(f) + 3.5} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9.5px]">{(f * 100).toFixed(0)}%</text>
            </g>
          ))}
          <text x={pl.x0 - 34} y={(pl.y0 + pl.y1) / 2} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9.5px]" transform={`rotate(-90 ${pl.x0 - 34} ${(pl.y0 + pl.y1) / 2})`}>
            submerged fraction
          </text>

          {/* sink zone */}
          <rect x={mapR(1)} y={pl.y1} width={mapR(R_MAX) - mapR(1)} height={pl.y0 - pl.y1} fill={RED} opacity={0.07} />
          <text x={(mapR(1) + mapR(R_MAX)) / 2} y={pl.y1 + 16} textAnchor="middle" className="ui text-[10px]" fill={RED}>sinks — 100%</text>
          <line x1={mapR(1)} y1={pl.y0} x2={mapR(1)} y2={pl.y1} stroke={RED} strokeWidth={1.3} strokeDasharray="4 3" opacity={0.6} />

          {/* gold half-submerged target band */}
          <rect x={pl.x0} y={mapF(0.53)} width={pl.x1 - pl.x0} height={mapF(0.47) - mapF(0.53)} fill={GOLD} opacity={0.18} />
          <line x1={pl.x0} y1={mapF(0.5)} x2={pl.x1} y2={mapF(0.5)} stroke={GOLD} strokeWidth={1.6} strokeDasharray="5 4" />
          <text x={pl.x1} y={mapF(0.5) - 6} textAnchor="end" className="ui text-[10px]" fill="#8a6d12">target: half submerged</text>

          {/* the law: fraction = ratio, then flat at 1 */}
          <path d={`M ${mapR(0)} ${mapF(0)} L ${mapR(1)} ${mapF(1)} L ${mapR(R_MAX)} ${mapF(1)}`} fill="none" stroke={BLUE} strokeWidth={2.6} />
          {/* live dot */}
          <circle cx={mapR(liveR)} cy={mapF(submergedFrac)} r={6} fill={floatMet ? GOLD : BLUE} stroke="#fff" strokeWidth={2} />
        </svg>
        <ControlBar>
          <LabeledSlider label="ρ_object" value={rhoObj} min={100} max={8000} step={10} onChange={setRhoObj}
            fmt={v => `${v.toFixed(0)} kg/m³`} width={200} />
          <LabeledSlider label="volume V" value={volObj} min={0.0005} max={0.008} step={0.0001} onChange={setVolObj}
            fmt={v => `${(v * 1000).toFixed(1)} L`} />
          <LabeledSlider label="ρ_fluid" value={rhoFluid} min={700} max={13600} step={50} onChange={setRhoFluid}
            fmt={v => `${v.toFixed(0)} kg/m³`} color={WATER_COLOR} />
          <Readout label="F_B" value={`${fbShown.toFixed(1)} N`} color={GREEN} />
          <Readout label="W" value={`${weightDown.toFixed(1)} N`} color={RED} />
          <Readout label="submerged" value={`${(submergedFrac * 100).toFixed(0)} %`} color={BLUE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys9-buoy-float" met={floatMet}>
        The block starts denser than the fluid — it sinks. Trim the densities until it floats{" "}
        <strong>exactly half submerged (50% ± 3%)</strong>, landing the dot in the gold band.
        Since the submerged fraction <em>is</em> the density ratio, you need{" "}
        <M>{"\\rho_{\\text{obj}} \\approx \\tfrac12 \\rho_{\\text{fluid}}"}</M> — note the
        volume slider is powerless to help.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Bernoulli / flow tube
// ------------------------------------------------------------------
const A2 = 0.015; // m² — fixed throat area
const P1 = 200000; // Pa — inlet pressure baseline
const V_AX = 35; // m/s — velocity plot ceiling
const PX_PER_MS = 5; // arrow scale

function FlowTube() {
  const [A1, setA1] = useState(0.04);
  const [v1, setV1] = useState(2);
  const [rho, setRho] = useState(1000);

  const v2 = (A1 * v1) / A2;
  const dP = 0.5 * rho * (v2 * v2 - v1 * v1);
  const P2 = P1 - dP;
  const cavitates = P2 <= 0;

  // tube geometry
  const ox = 54, oy = 108, segW = 200, trans = 52;
  const h1 = Math.max(18, Math.sqrt(A1) * 330); // wall half-height ∝ √A
  const h2 = Math.sqrt(A2) * 330;
  const xThroat0 = ox + segW + trans;
  const xEnd = xThroat0 + segW;

  // velocity profile plot, x-aligned with the tube
  const vp = { y0: 330, y1 : 218 };
  const mapV = (v: number) => vp.y0 + (Math.min(v, V_AX) / V_AX) * (vp.y1 - vp.y0);
  const vProfile = `M ${ox} ${mapV(v1)} L ${ox + segW} ${mapV(v1)} L ${xThroat0} ${mapV(v2)} L ${xEnd} ${mapV(v2)}`;

  // pressure gauges (right card)
  const pg = { x: 545, y0: 320, y1: 60, min: -100, max: 250 }; // kPa
  const mapP = (pk: number) => pg.y0 + ((Math.max(pg.min, Math.min(pg.max, pk)) - pg.min) / (pg.max - pg.min)) * (pg.y1 - pg.y0);
  const P1k = P1 / 1000;
  const P2k = P2 / 1000;

  const fastMet = v2 > 8;

  return (
    <>
      <WidgetShell
        title="Bernoulli and continuity"
        onReset={() => { setA1(0.04); setV1(2); setRho(1000); }}
        caption="Top: the tube — wall height tracks the pipe area, green arrows share one 5 px = 1 m/s scale. Bottom-left: the velocity profile along the pipe with the gold 8 m/s challenge line. Right: pressure gauges for both sections; when the throat pressure dives below the gold 0 kPa line, the fluid cavitates (tears into vapor bubbles)."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <defs>
            <marker id="ft-v" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={GREEN} />
            </marker>
          </defs>

          {/* tube */}
          <rect x={ox} y={oy - h1} width={segW} height={h1 * 2} rx={4} fill={WATER_COLOR} opacity={0.18} stroke={BLUE} strokeWidth={2} />
          <polygon points={`${ox + segW},${oy - h1} ${xThroat0},${oy - h2} ${xThroat0},${oy + h2} ${ox + segW},${oy + h1}`}
            fill={WATER_COLOR} opacity={0.18} stroke={BLUE} strokeWidth={2} />
          <rect x={xThroat0} y={oy - h2} width={segW} height={h2 * 2} rx={4}
            fill={cavitates ? "#f6dede" : WATER_COLOR} opacity={cavitates ? 0.6 : 0.32} stroke={cavitates ? RED : BLUE} strokeWidth={2} />

          {/* velocity arrows on one scale */}
          {[0.12, 0.5].map((f, i) => (
            <line key={`a${i}`} x1={ox + f * segW} y1={oy} x2={ox + f * segW + v1 * PX_PER_MS} y2={oy}
              stroke={GREEN} strokeWidth={3} markerEnd="url(#ft-v)" />
          ))}
          {[0.06, 0.52].map((f, i) => (
            <line key={`b${i}`} x1={xThroat0 + f * segW} y1={oy} x2={Math.min(xThroat0 + f * segW + v2 * PX_PER_MS, xEnd - 4)} y2={oy}
              stroke={GREEN} strokeWidth={3} markerEnd="url(#ft-v)" />
          ))}

          {/* labels */}
          <text x={ox + segW / 2} y={oy - h1 - 12} textAnchor="middle" className="ui text-[11.5px]" fill={BLUE}>
            A₁ = {(A1 * 10000).toFixed(0)} cm² · v₁ = {v1.toFixed(1)} m/s
          </text>
          <text x={xThroat0 + segW / 2} y={oy - h1 - 12} textAnchor="middle" className="ui text-[11.5px]" fill={cavitates ? RED : BLUE}>
            A₂ = {(A2 * 10000).toFixed(0)} cm² · v₂ = {v2.toFixed(1)} m/s
          </text>
          {cavitates && (
            <text x={xThroat0 + segW / 2} y={oy + 4} textAnchor="middle" className="ui text-[11px] font-bold" fill={RED}>CAVITATION</text>
          )}

          {/* arrow-scale legend */}
          <rect x={ox} y={14} width={118} height={30} rx={8} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <line x1={ox + 10} y1={29} x2={ox + 10 + 2 * PX_PER_MS} y2={29} stroke={GREEN} strokeWidth={3} markerEnd="url(#ft-v)" />
          <text x={ox + 26} y={33} className="ui text-[9.5px] fill-[#8a8a9b]">= 2 m/s (all arrows)</text>

          {/* velocity profile plot */}
          <line x1={ox} y1={vp.y0} x2={ox} y2={vp.y1 - 6} stroke="#b6b2a4" strokeWidth={1.4} />
          <line x1={ox} y1={vp.y0} x2={xEnd + 8} y2={vp.y0} stroke="#b6b2a4" strokeWidth={1.4} />
          {[0, 10, 20, 30].map(v => (
            <g key={v}>
              <line x1={ox - 5} y1={mapV(v)} x2={ox} y2={mapV(v)} stroke="#b6b2a4" />
              <text x={ox - 8} y={mapV(v) + 3.5} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9.5px]">{v}</text>
            </g>
          ))}
          <text x={ox - 30} y={(vp.y0 + vp.y1) / 2} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[9.5px]" transform={`rotate(-90 ${ox - 30} ${(vp.y0 + vp.y1) / 2})`}>
            v (m/s)
          </text>
          <text x={xEnd} y={vp.y0 + 14} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10px]">position along pipe →</text>
          {/* gold challenge line */}
          <line x1={ox} y1={mapV(8)} x2={xEnd} y2={mapV(8)} stroke={GOLD} strokeWidth={1.6} strokeDasharray="5 4" />
          <text x={xEnd - 2} y={mapV(8) - 5} textAnchor="end" className="ui text-[10px]" fill="#8a6d12">8 m/s target</text>
          <path d={vProfile} fill="none" stroke={GREEN} strokeWidth={2.6} />
          <circle cx={xEnd - 6} cy={mapV(v2)} r={5} fill={fastMet ? GOLD : GREEN} stroke="#fff" strokeWidth={1.8} />

          {/* pressure gauge card */}
          <rect x={pg.x - 40} y={30} width={232} height={318} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
          <text x={pg.x - 26} y={52} className="ui text-[10.5px] font-bold fill-[#8a8a9b]" letterSpacing="1.2">PRESSURE (kPa)</text>
          {/* axis */}
          <line x1={pg.x} y1={pg.y0} x2={pg.x} y2={pg.y1} stroke="#b6b2a4" strokeWidth={1.3} />
          {[-100, 0, 100, 200].map(p => (
            <g key={p}>
              <line x1={pg.x - 5} y1={mapP(p)} x2={pg.x} y2={mapP(p)} stroke="#b6b2a4" />
              <text x={pg.x - 8} y={mapP(p) + 3.5} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[9.5px]">{p}</text>
            </g>
          ))}
          {/* gold cavitation line at 0 */}
          <line x1={pg.x} y1={mapP(0)} x2={pg.x + 150} y2={mapP(0)} stroke={GOLD} strokeWidth={1.6} strokeDasharray="5 4" />
          <text x={pg.x + 150} y={mapP(0) - 5} textAnchor="end" className="ui text-[9.5px]" fill="#8a6d12">0 — cavitation below</text>
          {/* bars */}
          <rect x={pg.x + 26} y={Math.min(mapP(P1k), mapP(0))} width={38} height={Math.abs(mapP(P1k) - mapP(0))} rx={3} fill={PURPLE} opacity={0.75} />
          <text x={pg.x + 45} y={mapP(P1k) - 7} textAnchor="middle" className="ui text-[10.5px] font-semibold" fill={PURPLE}>{P1k.toFixed(0)}</text>
          <text x={pg.x + 45} y={pg.y0 + 16} textAnchor="middle" className="ui text-[10px] fill-[#4b4b5e]">P₁ (wide)</text>
          <rect x={pg.x + 92} y={Math.min(mapP(P2k), mapP(0))} width={38} height={Math.abs(mapP(P2k) - mapP(0))} rx={3}
            fill={cavitates ? RED : PURPLE} opacity={0.75} />
          <text x={pg.x + 111} y={cavitates ? mapP(Math.max(P2k, pg.min)) + 16 : mapP(P2k) - 7} textAnchor="middle" className="ui text-[10.5px] font-semibold"
            fill={cavitates ? RED : PURPLE}>{P2k.toFixed(0)}</text>
          <text x={pg.x + 111} y={pg.y0 + 16} textAnchor="middle" className="ui text-[10px] fill-[#4b4b5e]">P₂ (throat)</text>
        </svg>
        <ControlBar>
          <LabeledSlider label="A₁" value={A1} min={0.016} max={0.1} step={0.002} onChange={setA1}
            fmt={v => `${(v * 10000).toFixed(0)} cm²`} color={BLUE} />
          <LabeledSlider label="v₁" value={v1} min={0.2} max={5} step={0.05} onChange={setV1}
            fmt={v => `${v.toFixed(2)} m/s`} color={GREEN} />
          <LabeledSlider label="ρ" value={rho} min={700} max={13600} step={100} onChange={setRho}
            fmt={v => `${v.toFixed(0)} kg/m³`} />
          <Readout label="v₂" value={`${v2.toFixed(2)} m/s`} color={GREEN} />
          <Readout label="ΔP" value={`${((P2 - P1) / 1000).toFixed(1)} kPa`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys9-venturi-fast" met={fastMet}>
        Push the throat velocity past <strong>8 m/s</strong> — lift the green profile over the
        gold line. Continuity <M>{"A_1 v_1 = A_2 v_2"}</M> gives you two knobs: widen the inlet
        or speed it up. Then keep going and watch the P₂ gauge dive below zero — real pumps and
        propellers hit this cavitation wall.
      </Challenge>
    </>
  );
}

export default function Fluids() {
  return (
    <div>
      <PageHeader
        chapter="Physics 9"
        section="College Physics & Dynamics"
        title="Fluids and Continuum Preview"
        lede="Fluids transmit forces through pressure and flow. Two elegant laws — hydrostatics and Bernoulli — capture most of what robots encounter in underwater or aerial environments."
      />

      <p>
        Dive to the bottom of a swimming pool and your ears ache. Nothing is touching them —
        except everything: <strong>pressure</strong> is force spread over area (measured in
        pascals, 1 Pa = 1 N/m²), and a fluid at rest pushes with the same pressure in every
        direction at a given point (Pascal's principle). Why does depth matter? Because at
        depth <M>{"h"}</M> you are literally carrying the weight of the water column above
        you:
      </p>
      <Eq>{"P = P_0 + \\rho g h,"}</Eq>
      <p>
        where <M>{"P_0"}</M> is the surface pressure and <M>{"\\rho"}</M> (rho) is the fluid's{" "}
        <strong>density</strong> — mass per unit volume, 1000 kg/m³ for water. Read it back:
        every 10 m of water adds about <M>{"1000 \\times 9.81 \\times 10 \\approx 98"}</M> kPa
        — one whole atmosphere. Your ears report the first meter.
      </p>

      <p>
        <strong>Try this:</strong> lower the gold probe to 5 m in water and watch the purple
        squeeze-arrows lengthen and the dot ride up the P(h) line; then switch the density
        slider to mercury (13,600 kg/m³) and watch the same line pivot steeply — the gold
        crossing marker on the depth axis slides from ~5 m to ~0.4 m. Depth and density are
        the only knobs — the <em>shape</em> of the container never appears in the formula,
        which is why a thin standpipe can burst a barrel (Pascal's famous demonstration).
      </p>

      <PressureDepth />

      <H2>Buoyancy — Archimedes' principle</H2>
      <p>
        Any object submerged in a fluid displaces fluid and experiences an upward buoyant
        force equal to the weight of the displaced fluid:
      </p>
      <Eq>{"F_B = \\rho_{\\text{fluid}}\\, g\\, V_{\\text{displaced}}."}</Eq>
      <p>
        An object floats when <M>{"F_B \\geq W"}</M>, i.e., when its average density is
        less than or equal to the fluid density. At equilibrium, it displaces exactly its
        own weight of fluid.
      </p>
      <p>
        Where does the upward force really come from? From the previous section: pressure
        grows with depth, so the fluid pushes harder on an object's <em>bottom</em> than on
        its top. Buoyancy is not a new force — it is the pressure-depth law applied to both
        ends of an object at once.
      </p>

      <p>
        <strong>Try this:</strong> the block starts at 1200 kg/m³ in water — it sinks. Drag
        its density down and watch it pop up and float with the dashed waterline slicing it:
        the submerged fraction <em>equals</em> the density ratio, and the plot on the right
        shows your dot riding exactly on that line. Then try rescuing the sunken block the
        other way — raise the <em>fluid's</em> density toward mercury and watch even a dense
        block bob up (this is why you float effortlessly in the Dead Sea).
      </p>

      <BuoyancySandbox />

      <Worked title="How much of an iceberg hides underwater?">
        <p>
          <strong>Given.</strong> Ice has density 920 kg/m³; seawater 1025 kg/m³. What
          fraction of an iceberg floats below the surface?
        </p>
        <p>
          <strong>Set up.</strong> Floating equilibrium: weight = buoyancy, so{" "}
          <M>{"\\rho_{\\text{ice}} V g = \\rho_{\\text{sea}} V_{\\text{sub}}\\, g"}</M>.
        </p>
        <p>
          <strong>Solve.</strong>{" "}
          <M>{"V_{\\text{sub}}/V = 920/1025 \\approx 0.90"}</M> — about 90% hides below,
          which is the literal "tip of the iceberg."
        </p>
        <p>
          <strong>Check.</strong> Limits behave: density ratio → 1 means fully submerged but
          weightless in the water; ratio → 0 (a balloon) floats entirely on top. ✓
        </p>
      </Worked>

      <KeyIdea>
        The density ratio determines floating behavior: if <M>{"\\rho_{\\text{obj}} < \\rho_{\\text{fluid}}"}</M>
        the object floats, and the submerged fraction equals the density ratio. A ship
        floats by making its average density (steel + air inside) less than water.
      </KeyIdea>

      <H2>Flow continuity and Bernoulli</H2>
      <p>
        For steady incompressible flow, mass must be conserved: what flows in must flow out.
        This gives the <em>continuity equation</em> <M>{"A_1 v_1 = A_2 v_2"}</M>. Combined
        with energy conservation along a streamline:
      </p>
      <Eq>{"P + \\tfrac{1}{2}\\rho v^2 + \\rho g h = \\text{const}."}</Eq>
      <p>
        Faster flow carries more kinetic energy, so pressure must decrease. A narrow section
        (smaller <M>{"A"}</M>) forces higher velocity and creates a pressure drop — the
        Venturi effect used in carburetors, medical devices, and sensors. (Bernoulli's
        equation is just the conservation-of-energy law from Module 3, written per unit
        volume of fluid: pressure term, kinetic term, gravity term.)
      </p>

      <p>
        <strong>Try this:</strong> raise v₁ and watch the green velocity profile step up in
        the throat to keep <M>{"A v"}</M> constant — the garden-hose-thumb effect. Then watch
        the two pressure gauges: the <em>fast</em> section has the <em>low</em> pressure.
        Push hard enough and P₂ crosses the gold zero line — the fluid literally tears apart
        into vapor bubbles (cavitation), the effect that eats boat propellers.
      </p>

      <FlowTube />

      <Aside>
        Underwater robots face buoyancy forces that must be balanced by thrusters. Aerial
        robots (drones) generate lift by accelerating air downward — Bernoulli in action.
        Drag forces on any robot moving through air or water follow <M>{"F_D = \\tfrac{1}{2}C_D \\rho A v^2"}</M>,
        growing with the square of speed.
      </Aside>

      <Quiz
        challengeId="phys9-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: (
              <>
                A tall thin tube and a wide tank are filled with water to the same height.
                Where is the pressure at the bottom greater?
              </>
            ),
            options: [
              { label: "Equal — pressure depends only on depth and density", correct: true },
              { label: "The wide tank — it holds more water" },
              { label: "The thin tube — the water is more concentrated" },
              { label: "Depends on the container material" },
            ],
            explain:
              "P = P₀ + ρgh has no volume or shape in it. This 'hydrostatic paradox' is why a thin standpipe of water could burst a sturdy barrel.",
          },
          {
            prompt: (
              <>
                A boat carrying a boulder floats in a small pond. The boulder is thrown
                overboard and sinks. The pond's water level…
              </>
            ),
            options: [
              { label: "falls", correct: true },
              { label: "rises" },
              { label: "stays exactly the same" },
              { label: "rises, then falls back" },
            ],
            explain:
              "In the boat, the boulder displaces its weight of water (a large volume). On the bottom, it displaces only its own volume — less. Classic Archimedes brain-teaser.",
          },
          {
            prompt: <>In the narrow section of a Venturi tube, the fluid has…</>,
            options: [
              { label: "higher speed and lower pressure", correct: true },
              { label: "higher speed and higher pressure" },
              { label: "lower speed and lower pressure" },
              { label: "the same speed and pressure as everywhere else" },
            ],
            explain:
              "Continuity forces the speed up; Bernoulli's energy budget then forces the pressure down. Fast = low pressure is the counterintuitive half of fluid dynamics.",
          },
        ]}
      />

      <H2>Where you'll use this in Modern Robotics</H2>
      <p>
        This module is deliberately a preview rather than a dependency: the Modern Robotics
        book stays on dry land. But real robots don't — underwater vehicles must trim
        buoyancy against thruster force, drones live on Bernoulli, and any fast-moving arm
        feels <M>{"v^2"}</M> drag. More deeply, the "continuum" view — treating matter as a
        field with pressure and velocity at every point — is the same mental upgrade you'll
        make in Chapter 3 when a rigid body stops being a thing at a position and becomes a
        whole field of moving points.
      </p>

      <BookRef>
        Physics track · Module 9 of 10: pressure, hydrostatics, buoyancy, Archimedes,
        continuity, Bernoulli equation, drag.
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
