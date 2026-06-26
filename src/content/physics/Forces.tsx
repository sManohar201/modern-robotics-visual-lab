import { useState, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";
import { svgCoords } from "../../lib/svg";
import { clamp, deg, rad } from "../../lib/math/vec";

const W = 760;
const H = 360;
const RED = "#d9483f";
const GREEN = "#2f9e44";
const BLUE = "#3b6fd4";
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";
const G = 9.81;

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
          fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600">{label}</text>
      )}
    </g>
  );
}

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

  const cx = W / 2;
  const cy = H / 2 + 10;
  const bw = 80;
  const bh = 60;
  const arrowScale = 2.8;

  const netMet = Math.abs(accel - 3) < 0.12 && isSliding;

  return (
    <>
      <WidgetShell
        title="Free-body diagram"
        onReset={() => { setMass(5); setApplied(12); setMu(0.3); }}
        caption="Arrows show all forces acting on the block. The net horizontal force determines acceleration."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* ground */}
          <line x1={60} y1={cy + bh / 2 + 1} x2={700} y2={cy + bh / 2 + 1} stroke="#8a8a9b" strokeWidth={2} />
          {[...Array(18)].map((_, i) => (
            <line key={i} x1={78 + i * 36} y1={cy + bh / 2 + 1} x2={68 + i * 36} y2={cy + bh / 2 + 13} stroke="#c4c0b4" strokeWidth={1.3} />
          ))}
          {/* block */}
          <rect x={cx - bw / 2} y={cy - bh / 2} width={bw} height={bh}
            rx={4} fill="#dbd7c8" stroke="#50525e" strokeWidth={2} />
          <text x={cx} y={cy + 5} textAnchor="middle" fontFamily="Inter, sans-serif"
            fontSize="13" fill="#4b4b5e" fontWeight="600">{mass} kg</text>

          {/* weight arrow (down) */}
          <Arrow x1={cx} y1={cy + bh / 2} x2={cx} y2={cy + bh / 2 + weight * arrowScale * 0.25}
            color={RED} id="fbw" label="W" labelOffset={[8, 0]} />
          {/* normal force (up) */}
          <Arrow x1={cx} y1={cy - bh / 2} x2={cx} y2={cy - bh / 2 - normal * arrowScale * 0.25}
            color={GREEN} id="fbn" label="N" labelOffset={[8, -4]} />
          {/* applied force (right) */}
          {Math.abs(applied) > 0.5 && (
            <Arrow
              x1={applied > 0 ? cx + bw / 2 : cx - bw / 2}
              y1={cy}
              x2={(applied > 0 ? cx + bw / 2 : cx - bw / 2) + applied * arrowScale * 0.6}
              y2={cy}
              color={PURPLE} id="fbf" label="F" labelOffset={applied > 0 ? [8, -4] : [-22, -4]} />
          )}
          {/* friction (opposing direction) */}
          {Math.abs(friction) > 0.5 && (
            <Arrow
              x1={applied > 0 ? cx - bw / 2 : cx + bw / 2}
              y1={cy - 16}
              x2={(applied > 0 ? cx - bw / 2 : cx + bw / 2) - friction * arrowScale * 0.6}
              y2={cy - 16}
              color={ORANGE} id="fbfr" label="f" labelOffset={applied > 0 ? [-18, -4] : [8, -4]} />
          )}

          {/* status */}
          <rect x={W - 220} y={18} width={200} height={isSliding ? 68 : 56} rx={8}
            fill={isSliding ? "#fff7f0" : "#f0f8f1"} stroke={isSliding ? "#f0b982" : "#bfdfc4"} />
          <text x={W - 120} y={40} textAnchor="middle" fontFamily="Inter, sans-serif"
            fontSize="11" fontWeight="700" letterSpacing="1.2"
            fill={isSliding ? "#c2571c" : "#2f9e44"}>
            {isSliding ? "SLIDING" : "STATIC"}
          </text>
          <text x={W - 120} y={58} textAnchor="middle" fontFamily="Inter, sans-serif"
            fontSize="13" fill="#1d1d28">
            a = {accel.toFixed(2)} m/s²
          </text>
          {isSliding && (
            <text x={W - 120} y={76} textAnchor="middle" fontFamily="Inter, sans-serif"
              fontSize="11.5" fill="#4b4b5e">
              f = μₖN = {friction.toFixed(1)} N
            </text>
          )}
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
        <M>{"3 \\text{ m/s}^2"}</M> (within 0.12). The block must be sliding.
      </Challenge>
    </>
  );
}

function InclineBlock() {
  const [angle, setAngle] = useState(25);
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

  // SVG geometry for incline
  const ox = 90;
  const oy = 305;
  const L = 540;
  const bx = ox + L * 0.48;
  const by = oy - L * 0.48 * Math.tan(th);
  const scale = 2.4;

  // block corners (rotated)
  const bw2 = 32;
  const bh2 = 24;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const corners = [
    [-bw2, -bh2], [bw2, -bh2], [bw2, bh2], [-bw2, bh2]
  ].map(([lx, ly]) => [
    bx + lx * cos - ly * (-sin),
    by + lx * sin + ly * (-cos),
  ]);
  const poly = corners.map(p => p.join(",")).join(" ");

  const slipMet = Math.abs(angle - critAngle) < 1.2;

  return (
    <>
      <WidgetShell
        title="Block on incline"
        onReset={() => { setAngle(25); setMass(4); setMuS(0.45); }}
        caption="The weight vector decomposes into components parallel and perpendicular to the slope. The block slides when W∥ > μN."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* incline triangle */}
          <polygon points={`${ox},${oy} ${ox + L},${oy} ${ox + L},${oy - L * Math.tan(th)}`}
            fill="#ece8dd" stroke="#8a8a9b" strokeWidth={1.5} />
          {/* ground hatches */}
          {[...Array(14)].map((_, i) => (
            <line key={i} x1={ox + i * 40} y1={oy} x2={ox + i * 40 - 10} y2={oy + 12} stroke="#c4c0b4" strokeWidth={1.2} />
          ))}
          {/* angle arc */}
          <path d={`M ${ox + 50},${oy} A 50,50 0 0 0 ${ox + 50 * Math.cos(th)},${oy - 50 * Math.sin(th)}`}
            fill="none" stroke="#8a8a9b" strokeWidth={1.5} />
          <text x={ox + 38} y={oy - 10} fontFamily="Inter, sans-serif" fontSize="12" fill="#50525e">{angle}°</text>

          {/* block */}
          <polygon points={poly} fill={sliding ? "#ffe3e0" : "#dbd7c8"} stroke="#50525e" strokeWidth={2} />

          {/* weight (down) */}
          <Arrow x1={bx} y1={by} x2={bx} y2={by + weight * scale * 0.22}
            color={RED} id="incw" label="W" labelOffset={[6, 0]} />
          {/* normal (perp to slope) */}
          <Arrow x1={bx} y1={by} x2={bx - normal * scale * 0.22 * sin} y2={by - normal * scale * 0.22 * cos}
            color={GREEN} id="incn" label="N" labelOffset={[6, -4]} />
          {/* W∥ component (along slope, down) */}
          <Arrow x1={bx} y1={by} x2={bx + Wpar * scale * 0.22 * cos} y2={by + Wpar * scale * 0.22 * sin}
            color={ORANGE} id="incwp" label="W∥" labelOffset={[6, 0]} />
          {/* friction (up slope) */}
          {friction > 0.5 && (
            <Arrow x1={bx} y1={by} x2={bx - friction * scale * 0.22 * cos} y2={by - friction * scale * 0.22 * sin}
              color={PURPLE} id="incfr" label="f" labelOffset={[-20, -4]} />
          )}

          {/* status panel */}
          <rect x={18} y={18} width={200} height={76} rx={8} fill={sliding ? "#fff0ef" : "#f0f8f1"} stroke={sliding ? "#f7bbb8" : "#bfdfc4"} />
          <text x={26} y={38} fontFamily="Inter, sans-serif" fontSize="10.5" fontWeight="700"
            letterSpacing="1.2" fill={sliding ? "#d9483f" : "#2f9e44"}>
            {sliding ? "SLIDING  a = " + accel.toFixed(2) + " m/s²" : "STATIC  a = 0"}
          </text>
          <text x={26} y={56} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            W∥ = {Wpar.toFixed(1)} N  f_max = {frictionMax.toFixed(1)} N
          </text>
          <text x={26} y={74} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            Critical angle: {critAngle.toFixed(1)}°  (tan θ = μₛ)
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="angle θ" value={angle} min={0} max={70} step={1} onChange={setAngle}
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
        Find the angle where the block <em>just barely</em> starts to slide. At this critical angle,{" "}
        <M>{"\\tan\\theta = \\mu_s"}</M> — you should be within ±1° of the critical angle shown.
      </Challenge>
    </>
  );
}

function ConnectedMasses() {
  const [m1, setM1] = useState(3);
  const [m2, setM2] = useState(5);
  const [friction, setFriction] = useState(0);

  const accel = ((m2 - m1) * G - friction * m1 * G) / (m1 + m2);
  const tension = m1 * (G + accel) + friction * m1 * G;
  const ratio = m2 / m1;

  const accelMet = Math.abs(Math.abs(accel) - 2) < 0.15;

  // SVG geometry
  const tableY = 200;
  const pulleyX = 520;
  const pulleyY = tableY - 2;
  const block1X = 200;
  const block2Y = pulleyY + 120;

  return (
    <>
      <WidgetShell
        title="Atwood / pulley system"
        onReset={() => { setM1(3); setM2(5); setFriction(0); }}
        caption="m₁ slides on the table while m₂ hangs. The pulley reverses the direction of force."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* table */}
          <rect x={80} y={tableY} width={480} height={16} rx={3} fill="#d6d2c4" stroke="#9a9585" strokeWidth={1.5} />
          {/* m1 block on table */}
          <rect x={block1X - 30} y={tableY - 46} width={60} height={46} rx={4}
            fill="#dbd7c8" stroke="#50525e" strokeWidth={2} />
          <text x={block1X} y={tableY - 16} textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600" fill="#4b4b5e">{m1} kg</text>
          {/* tension string on table */}
          <line x1={block1X + 30} y1={tableY - 23} x2={pulleyX} y2={tableY - 23}
            stroke="#50525e" strokeWidth={2.5} />
          {/* pulley circle */}
          <circle cx={pulleyX} cy={pulleyY - 20} r={20} fill="#f6f4ee" stroke="#50525e" strokeWidth={2.5} />
          <circle cx={pulleyX} cy={pulleyY - 20} r={6} fill="#50525e" />
          {/* string over pulley to m2 */}
          <line x1={pulleyX} y1={tableY - 40} x2={pulleyX} y2={block2Y - 46}
            stroke="#50525e" strokeWidth={2.5} />
          {/* m2 block hanging */}
          <rect x={pulleyX - 28} y={block2Y - 46} width={56} height={46} rx={4}
            fill="#dbd7c8" stroke="#50525e" strokeWidth={2} />
          <text x={pulleyX} y={block2Y - 16} textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600" fill="#4b4b5e">{m2} kg</text>

          {/* tension arrows */}
          <Arrow x1={block1X + 30} y1={tableY - 23} x2={block1X + 30 + 55} y2={tableY - 23}
            color={BLUE} id="pT1" label="T" labelOffset={[6, -6]} />
          <Arrow x1={pulleyX} y1={block2Y - 46} x2={pulleyX} y2={block2Y - 46 - 55}
            color={BLUE} id="pT2" />
          {/* weight of m2 */}
          <Arrow x1={pulleyX} y1={block2Y} x2={pulleyX} y2={block2Y + 50}
            color={RED} id="pW2" label="m₂g" labelOffset={[8, 0]} />

          {/* readout */}
          <rect x={18} y={18} width={195} height={72} rx={8} fill="#f4f1fb" stroke="#c4b8ef" />
          <text x={28} y={38} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            a = {accel.toFixed(3)} m/s²
          </text>
          <text x={28} y={56} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            T = {tension.toFixed(1)} N
          </text>
          <text x={28} y={74} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            m₂/m₁ = {ratio.toFixed(2)}
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="m₁ (table)" value={m1} min={0.5} max={15} step={0.1} onChange={setM1}
            fmt={v => `${v.toFixed(1)} kg`} color={GREEN} />
          <LabeledSlider label="m₂ (hang)" value={m2} min={0.5} max={15} step={0.1} onChange={setM2}
            fmt={v => `${v.toFixed(1)} kg`} color={RED} />
          <LabeledSlider label="μ (table)" value={friction} min={0} max={0.5} step={0.01} onChange={setFriction}
            fmt={v => v.toFixed(2)} color={ORANGE} />
          <Readout label="a" value={`${accel.toFixed(3)} m/s²`} color={PURPLE} />
          <Readout label="T" value={`${tension.toFixed(1)} N`} color={BLUE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys2-pulley-accel2" met={accelMet}>
        Adjust the masses and friction so the system accelerates at exactly{" "}
        <M>{"2 \\text{ m/s}^2"}</M> (within 0.15). You must do this with both masses between 1–15 kg.
      </Challenge>
    </>
  );
}

export default function Forces() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 2"
        section="College Physics & Dynamics"
        title="Forces and Newtonian Mechanics"
        lede="A force is an interaction that changes an object's momentum. Newton's second law — net force equals mass times acceleration — is the engine of classical mechanics."
      />

      <p>
        Every force in mechanics has a physical origin: gravity between masses, contact
        between surfaces, tension in a rope, drag from a fluid. The free-body diagram (FBD)
        is the bookkeeping tool that isolates a single object and draws every force acting
        on it as an arrow. The sum of those arrows is <M>{"\\sum F = ma"}</M>.
      </p>

      <Eq>{"\\sum \\mathbf{F} = m\\mathbf{a}"}</Eq>

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

      <InclineBlock />

      <KeyIdea>
        The critical angle for slip is <M>{"\\theta_c = \\arctan(\\mu_s)"}</M> — independent
        of mass. Heavier blocks push harder on the slope but also require more friction force
        to stay still. The two effects cancel.
      </KeyIdea>

      <H2>Connected bodies and pulleys</H2>
      <p>
        When two masses are linked by a rope over a frictionless pulley, they form a single
        system. A single unknown acceleration <M>{"a"}</M> and one unknown tension <M>{"T"}
        </M> satisfy two equations — one per object — giving:
      </p>
      <Eq>{"a = \\frac{(m_2 - m_1)g}{m_1 + m_2}, \\qquad T = \\frac{2m_1 m_2 g}{m_1 + m_2}."}</Eq>

      <ConnectedMasses />

      <Aside>
        In robotics, Newton's second law applies to every link and joint. Actuator torques
        must overcome inertia, gravity, and friction simultaneously. The free-body diagram
        for a robot link is the same idea scaled up to six degrees of freedom.
      </Aside>

      <BookRef>
        Physics track: Newton's laws, friction, normal forces, connected bodies, Atwood machine.
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
