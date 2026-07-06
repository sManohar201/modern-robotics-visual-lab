import { useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell } from "../../components/widgets/WidgetShell";
import { clamp } from "../../lib/math/vec";

const W = 760;
const H = 360;
const RED = "#d9483f";
const GREEN = "#2f9e44";
const BLUE = "#3b6fd4";
const PURPLE = "#6741d9";
const WATER_COLOR = "#3b8fd4";

// ------------------------------------------------------------------
// Pressure-depth visualizer
// ------------------------------------------------------------------
function PressureDepth() {
  const [rho, setRho] = useState(1000);
  const [depth, setDepth] = useState(3.0);
  const g = 9.81;
  const P_gauge = rho * g * depth;
  const P_abs = 101325 + P_gauge;

  const tankX = 150, tankY = 40, tankW = 280, tankH = 280;
  const waterH = Math.min(tankH - 4, tankH * 0.9);


  const deepMet = P_gauge > 50000;

  return (
    <>
      <WidgetShell
        title="Hydrostatic pressure"
        onReset={() => { setRho(1000); setDepth(3.0); }}
        caption="P_gauge = ρgh. Pressure increases linearly with depth. The color gradient shows the pressure field."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* tank */}
          <rect x={tankX} y={tankY} width={tankW} height={tankH} rx={4} fill="#e8e4d8" stroke="#8a8a9b" strokeWidth={2} />
          {/* water gradient */}
          <defs>
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a8d4f0" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1a5fa0" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <rect x={tankX + 2} y={tankY + 2} width={tankW - 4} height={waterH} rx={3}
            fill="url(#waterGrad)" />

          {/* depth marker */}
          <line x1={tankX + tankW + 20} y1={tankY + 2}
            x2={tankX + tankW + 20} y2={tankY + 2 + depth * (waterH / 6)}
            stroke={BLUE} strokeWidth={2.5} />
          <line x1={tankX + tankW + 10} y1={tankY + 2 + depth * (waterH / 6)}
            x2={tankX + tankW + 30} y2={tankY + 2 + depth * (waterH / 6)}
            stroke={BLUE} strokeWidth={2} />
          <text x={tankX + tankW + 36} y={tankY + 8 + depth * (waterH / 6)}
            fontFamily="Inter, sans-serif" fontSize="12" fill={BLUE}>
            d = {depth.toFixed(1)} m
          </text>

          {/* pressure arrows at depth */}
          {[0.25, 0.5, 0.75, 1.0].map((frac, i) => {
            const y = tankY + 2 + frac * waterH;
            const p = rho * g * (frac * 6);
            const arrowL = clamp(p / 20000 * 40, 5, 55);
            return (
              <g key={i}>
                <defs>
                  <marker id={`pw-${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={PURPLE} />
                  </marker>
                </defs>
                <line x1={tankX + 2} y1={y} x2={tankX + 2 + arrowL} y2={y}
                  stroke={PURPLE} strokeWidth={2.5} markerEnd={`url(#pw-${i})`} />
                <line x1={tankX + tankW - 2} y1={y} x2={tankX + tankW - 2 - arrowL} y2={y}
                  stroke={PURPLE} strokeWidth={2.5} markerEnd={`url(#pw-${i})`} />
              </g>
            );
          })}

          {/* pressure vs depth graph */}
          <rect x={490} y={30} width={250} height={H - 60} rx={6} fill="#faf9f6" stroke="#e4e1d8" />
          {Array.from({ length: 7 }, (_, i) => {
            const d = i;
            const p = rho * g * d;
            const gx = 490 + (p / (rho * g * 6)) * 230 + 10;
            const gy = 30 + ((6 - d) / 6) * (H - 60 - 10) + 5;
            return { gx: clamp(gx, 490, 740), gy };
          }).reduce((prev, curr, i) => {
            if (i === 0) return [prev[0], `M ${curr.gx.toFixed(1)} ${curr.gy.toFixed(1)}`];
            return [prev[0], prev[1] + ` L ${curr.gx.toFixed(1)} ${curr.gy.toFixed(1)}`];
          }, ["", ""] as string[]).length > 0 && (
            <path
              d={Array.from({ length: 7 }, (_, i) => {
                const d = i;
                const p = rho * g * d;
                const gx = 500 + (p / (rho * g * 6)) * 220;
                const gy = 30 + ((6 - d) / 6) * (H - 70) + 5;
                return `${i === 0 ? "M" : "L"} ${clamp(gx, 500, 730).toFixed(1)} ${clamp(gy, 35, H - 35).toFixed(1)}`;
              }).join(" ")}
              fill="none" stroke={BLUE} strokeWidth={3}
            />
          )}
          <text x={615} y={50} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fill="#8a8a9b">
            P = ρgh (linear)
          </text>

          {/* readout */}
          <rect x={16} y={16} width={122} height={72} rx={8} fill="#f4f1fb" stroke="#c4b8ef" />
          <text x={26} y={38} fontFamily="Inter, sans-serif" fontSize="11.5" fill="#4b4b5e">
            P_gauge
          </text>
          <text x={26} y={56} fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill={PURPLE}>
            {(P_gauge / 1000).toFixed(2)} kPa
          </text>
          <text x={26} y={76} fontFamily="Inter, sans-serif" fontSize="11" fill="#8a8a9b">
            = {P_gauge.toFixed(0)} Pa
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="depth d" value={depth} min={0.1} max={6} step={0.05} onChange={setDepth}
            fmt={v => `${v.toFixed(2)} m`} color={BLUE} />
          <LabeledSlider label="ρ (fluid)" value={rho} min={700} max={13600} step={100} onChange={setRho}
            fmt={v => `${v.toFixed(0)} kg/m³`} color={PURPLE} />
          <Readout label="P_gauge" value={`${(P_gauge / 1000).toFixed(2)} kPa`} color={PURPLE} />
          <Readout label="P_abs" value={`${(P_abs / 1000).toFixed(1)} kPa`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys9-pressure-50kpa" met={deepMet}>
        Reach a gauge pressure of at least 50 kPa. Try deep water (ρ ≈ 1000 kg/m³) or a denser
        fluid. The formula is <M>{"P = \\rho g h"}</M>.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Buoyancy sandbox
// ------------------------------------------------------------------
function BuoyancySandbox() {
  const [rhoObj, setRhoObj] = useState(600);
  const [volObj, setVolObj] = useState(0.002);
  const [rhoFluid, setRhoFluid] = useState(1000);
  const g = 9.81;

  const massObj = rhoObj * volObj;
  const weightDown = massObj * g;
  const buoyancy = rhoFluid * g * volObj;
  const netForce = buoyancy - weightDown;
  const sinks = netForce < 0;
  const submergedFrac = sinks ? 1 : Math.min(1, rhoObj / rhoFluid);

  const tankX = 200, tankY = 60, tankW = 300, tankH = 230;
  const waterY = tankY + tankH * 0.15;
  const waterH = tankH * 0.85;
  const objSize = Math.cbrt(volObj) * 200;
  const objY = sinks ? tankY + tankH - objSize - 10 : waterY + (1 - submergedFrac) * objSize - objSize / 2 + waterH * 0.3;

  const floatMet = !sinks && submergedFrac < 0.9;

  return (
    <>
      <WidgetShell
        title="Buoyancy sandbox"
        onReset={() => { setRhoObj(600); setVolObj(0.002); setRhoFluid(1000); }}
        caption="An object floats when buoyancy ≥ weight. At equilibrium, it displaces its own weight of fluid."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* tank */}
          <rect x={tankX} y={tankY} width={tankW} height={tankH} rx={4} fill="#e8e4d8" stroke="#8a8a9b" strokeWidth={2} />
          {/* water */}
          <rect x={tankX + 2} y={waterY} width={tankW - 4} height={waterH} rx={3}
            fill={WATER_COLOR} opacity={0.3} />
          {/* water surface line */}
          <line x1={tankX} y1={waterY} x2={tankX + tankW} y2={waterY} stroke={WATER_COLOR} strokeWidth={2} />

          {/* object */}
          <rect x={tankX + tankW / 2 - objSize / 2} y={objY - objSize}
            width={objSize} height={objSize} rx={4}
            fill={sinks ? RED : GREEN} opacity={0.7} stroke="#fff" strokeWidth={2} />
          <text x={tankX + tankW / 2} y={objY - objSize / 2 + 5} textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="11" fill="#fff" fontWeight="700">
            {sinks ? "SINKS" : "FLOATS"}
          </text>

          {/* force arrows */}
          <defs>
            <marker id="buy-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={RED} />
            </marker>
            <marker id="buy-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={GREEN} />
            </marker>
          </defs>
          <line x1={tankX + tankW / 2} y1={objY - objSize}
            x2={tankX + tankW / 2} y2={objY - objSize - buoyancy * 12}
            stroke={GREEN} strokeWidth={4} markerEnd="url(#buy-b)" />
          <text x={tankX + tankW / 2 + 8} y={objY - objSize - buoyancy * 6}
            fontFamily="Inter, sans-serif" fontSize="11" fill={GREEN}>F_B = {buoyancy.toFixed(2)} N</text>
          <line x1={tankX + tankW / 2} y1={objY}
            x2={tankX + tankW / 2} y2={objY + weightDown * 12}
            stroke={RED} strokeWidth={4} markerEnd="url(#buy-w)" />
          <text x={tankX + tankW / 2 + 8} y={objY + weightDown * 6}
            fontFamily="Inter, sans-serif" fontSize="11" fill={RED}>W = {weightDown.toFixed(2)} N</text>

          {/* net force panel */}
          <rect x={16} y={16} width={160} height={80} rx={8}
            fill={sinks ? "#fff0ef" : "#f0f8f1"} stroke={sinks ? "#f7bbb8" : "#bfdfc4"} />
          <text x={26} y={38} fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700"
            fill={sinks ? RED : GREEN}>
            {sinks ? "SINKS" : "FLOATS"}
          </text>
          <text x={26} y={56} fontFamily="Inter, sans-serif" fontSize="11.5" fill="#4b4b5e">
            F_net = {netForce.toFixed(2)} N
          </text>
          <text x={26} y={74} fontFamily="Inter, sans-serif" fontSize="11" fill="#8a8a9b">
            submerged: {(submergedFrac * 100).toFixed(1)}%
          </text>

          {/* fluid label */}
          <text x={tankX + 10} y={waterY + 20} fontFamily="Inter, sans-serif"
            fontSize="11" fill={WATER_COLOR}>ρ_fluid = {rhoFluid} kg/m³</text>
        </svg>
        <ControlBar>
          <LabeledSlider label="ρ_object" value={rhoObj} min={100} max={8000} step={10} onChange={setRhoObj}
            fmt={v => `${v.toFixed(0)} kg/m³`} />
          <LabeledSlider label="volume V" value={volObj} min={0.0001} max={0.01} step={0.0001} onChange={setVolObj}
            fmt={v => `${(v * 1000).toFixed(2)} L`} />
          <LabeledSlider label="ρ_fluid" value={rhoFluid} min={700} max={13600} step={50} onChange={setRhoFluid}
            fmt={v => `${v.toFixed(0)} kg/m³`} color={WATER_COLOR} />
          <Readout label="F_B" value={`${buoyancy.toFixed(2)} N`} color={GREEN} />
          <Readout label="W" value={`${weightDown.toFixed(2)} N`} color={RED} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys9-buoy-float" met={floatMet}>
        Make the object float with less than 90% submerged. Make the object density significantly
        less than the fluid density: <M>{"\\rho_{\\text{obj}} < \\rho_{\\text{fluid}}"}</M>.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Bernoulli / flow tube
// ------------------------------------------------------------------
function FlowTube() {
  const [A1, setA1] = useState(0.04);
  const [v1, setV1] = useState(2);
  const [rho, setRho] = useState(1000);

  // Continuity: A1*v1 = A2*v2 (fixed A2 = 0.015 m²)
  const A2 = 0.015;
  const v2 = A1 * v1 / A2;
  // Bernoulli: P1 + 0.5*rho*v1² = P2 + 0.5*rho*v2²
  const P1 = 200000; // Pa (baseline)
  const dP = 0.5 * rho * (v2 * v2 - v1 * v1);
  const P2 = P1 - dP;

  const ox = 80, oy = H / 2;
  const segW = 240;
  const h1 = 90, h2 = 30;

  const fastMet = v2 > 8;

  return (
    <>
      <WidgetShell
        title="Bernoulli and continuity"
        onReset={() => { setA1(0.04); setV1(2); setRho(1000); }}
        caption="Continuity: A₁v₁ = A₂v₂. Bernoulli: faster flow = lower pressure. The narrow section speeds up and reduces pressure."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* flow tube walls */}
          {/* wide section */}
          <rect x={ox} y={oy - h1} width={segW} height={h1 * 2} rx={4}
            fill={WATER_COLOR} opacity={0.2} stroke={BLUE} strokeWidth={2} />
          {/* transition */}
          <polygon points={`${ox + segW},${oy - h1} ${ox + segW + 60},${oy - h2} ${ox + segW + 60},${oy + h2} ${ox + segW},${oy + h1}`}
            fill={WATER_COLOR} opacity={0.2} stroke={BLUE} strokeWidth={2} />
          {/* narrow section */}
          <rect x={ox + segW + 60} y={oy - h2} width={segW} height={h2 * 2} rx={4}
            fill={WATER_COLOR} opacity={0.35} stroke={BLUE} strokeWidth={2} />

          {/* velocity arrows */}
          {[0.2, 0.5, 0.8].map((f, i) => {
            const x = ox + f * segW;
            const arrow = v1 * 18;
            return (
              <g key={i}>
                <defs>
                  <marker id={`ft-v1-${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={GREEN} />
                  </marker>
                </defs>
                <line x1={x} y1={oy} x2={x + arrow} y2={oy} stroke={GREEN} strokeWidth={3} markerEnd={`url(#ft-v1-${i})`} />
              </g>
            );
          })}
          {[0.2, 0.5, 0.8].map((f, i) => {
            const x = ox + segW + 60 + f * segW;
            const arrow = Math.min(v2 * 18, 160);
            return (
              <g key={i}>
                <defs>
                  <marker id={`ft-v2-${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={GREEN} />
                  </marker>
                </defs>
                <line x1={x} y1={oy} x2={Math.min(x + arrow, ox + 2 * segW + 60)} y2={oy}
                  stroke={GREEN} strokeWidth={3} markerEnd={`url(#ft-v2-${i})`} />
              </g>
            );
          })}

          {/* labels */}
          <text x={ox + segW / 2} y={oy - h1 - 14} textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="12" fill={BLUE}>
            A₁ = {(A1 * 10000).toFixed(0)} cm²   v₁ = {v1.toFixed(1)} m/s
          </text>
          <text x={ox + segW + 60 + segW / 2} y={oy - h2 - 14} textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="12" fill={BLUE}>
            A₂ = {(A2 * 10000).toFixed(0)} cm²   v₂ = {v2.toFixed(2)} m/s
          </text>

          {/* pressure comparison */}
          <rect x={ox} y={oy + h1 + 16} width={segW} height={34} rx={4}
            fill={PURPLE} opacity={P1 / 250000} />
          <text x={ox + segW / 2} y={oy + h1 + 37} textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="12" fill={PURPLE} fontWeight="600">
            P₁ = {(P1 / 1000).toFixed(1)} kPa
          </text>
          <rect x={ox + segW + 60} y={oy + h2 + 16} width={segW} height={34} rx={4}
            fill={PURPLE} opacity={Math.max(0, P2 / 250000)} />
          <text x={ox + segW + 60 + segW / 2} y={oy + h2 + 37} textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="12" fill={PURPLE} fontWeight="600">
            P₂ = {(P2 / 1000).toFixed(1)} kPa
          </text>

          {/* ΔP label */}
          <text x={W / 2} y={H - 16} textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            ΔP = P₂ − P₁ = {((P2 - P1) / 1000).toFixed(2)} kPa  (pressure drop in narrow section)
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="A₁ (m²)" value={A1} min={0.016} max={0.1} step={0.002} onChange={setA1}
            fmt={v => `${(v * 10000).toFixed(0)} cm²`} />
          <LabeledSlider label="v₁ (m/s)" value={v1} min={0.2} max={5} step={0.05} onChange={setV1}
            fmt={v => `${v.toFixed(2)}`} color={GREEN} />
          <LabeledSlider label="ρ (kg/m³)" value={rho} min={700} max={13600} step={100} onChange={setRho}
            fmt={v => `${v.toFixed(0)}`} />
          <Readout label="v₂" value={`${v2.toFixed(3)} m/s`} color={GREEN} />
          <Readout label="ΔP" value={`${((P2 - P1) / 1000).toFixed(2)} kPa`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys9-venturi-fast" met={fastMet}>
        Make the velocity in the narrow section exceed 8 m/s. Use a large area ratio
        (A₁/A₂) and high inlet velocity. This is the Venturi effect.
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
        <strong>Try this:</strong> drag the depth to 5 m in water and note the pressure; then
        switch the density slider to mercury (13,600 kg/m³) and watch the same depth become
        crushing. Depth and density are the only knobs — the <em>shape</em> of the container
        never appears in the formula, which is why a thin standpipe can burst a barrel
        (Pascal's famous demonstration).
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
        <strong>Try this:</strong> set the object's density just below the fluid's and watch
        it float nearly submerged; at exactly half the fluid's density it rides half out of
        the water — the submerged fraction <em>equals</em> the density ratio. Then push the
        density above the fluid's and watch it sink: no shape or size adjustment can save an
        object denser than what it displaces (unless, like a ship, it changes its{" "}
        <em>average</em> density by enclosing air).
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
        <strong>Try this:</strong> squeeze the outlet area smaller and watch the exit speed
        climb to keep <M>{"A v"}</M> constant — the garden-hose-thumb effect. Then check the
        sign of ΔP: the <em>fast</em> section has the <em>low</em> pressure. That inversion
        surprises everyone, and it is what the challenge below asks you to push to the
        extreme.
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
