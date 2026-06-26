import { useState, useRef, useEffect } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";

const W = 760;
const H = 360;
const RED = "#d9483f";
const GREEN = "#2f9e44";
const BLUE = "#3b6fd4";
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";

// ------------------------------------------------------------------
// 1D Collision Sandbox
// ------------------------------------------------------------------
function Collision1D() {
  const [m1, setM1] = useState(3);
  const [m2, setM2] = useState(3);
  const [v1i, setV1i] = useState(4);
  const [v2i, setV2i] = useState(-1);
  const [e, setE] = useState(1); // coefficient of restitution 0=perfectly inelastic, 1=elastic

  // Collision equations: conservation of momentum + restitution
  const v1f = ((m1 - e * m2) * v1i + (1 + e) * m2 * v2i) / (m1 + m2);
  const v2f = ((m2 - e * m1) * v2i + (1 + e) * m1 * v1i) / (m1 + m2);

  const p_before = m1 * v1i + m2 * v2i;
  const p_after = m1 * v1f + m2 * v2f;
  const ke_before = 0.5 * m1 * v1i * v1i + 0.5 * m2 * v2i * v2i;
  const ke_after = 0.5 * m1 * v1f * v1f + 0.5 * m2 * v2f * v2f;

  const [phase, setPhase] = useState<"before" | "after">("before");

  const velScale = 18;
  const cx = W / 2;
  const cy = H / 2;

  // Block positions
  const b1x = phase === "before" ? cx - 130 : cx - 130 + v1f * 60;
  const b2x = phase === "before" ? cx + 90 : cx + 90 + v2f * 60;
  const b1w = Math.max(40, m1 * 12);
  const b2w = Math.max(40, m2 * 12);

  const v1 = phase === "before" ? v1i : v1f;
  const v2 = phase === "before" ? v2i : v2f;

  const elasticStopMet = e > 0.95 && Math.abs(m1 - m2) < 0.05 && Math.abs(v1f) < 0.1 && phase === "after";

  function Arrow({ x, y, vel, color, label }: { x: number; y: number; vel: number; color: string; label: string }) {
    if (Math.abs(vel) < 0.1) return null;
    const len = vel * velScale;
    const x2 = x + len;
    const flip = vel < 0;
    return (
      <g>
        <defs>
          <marker id={`arr-${label}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        </defs>
        <line x1={x} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={4}
          markerEnd={`url(#arr-${label})`} />
        <text x={(x + x2) / 2} y={y - 10} textAnchor="middle"
          fontFamily="Inter, sans-serif" fontSize="12" fill={color} fontWeight="600">
          {vel.toFixed(2)} m/s
        </text>
      </g>
    );
  }

  return (
    <>
      <WidgetShell
        title="1D collision sandbox"
        onReset={() => { setM1(3); setM2(3); setV1i(4); setV2i(-1); setE(1); setPhase("before"); }}
        caption="Toggle before/after to see how momenta and kinetic energies change. Momentum is always conserved."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* ground */}
          <line x1={60} y1={cy + 45} x2={700} y2={cy + 45} stroke="#c4c0b4" strokeWidth={1.5} />

          {/* block 1 */}
          <rect x={b1x - b1w / 2} y={cy - 30} width={b1w} height={50} rx={5}
            fill="#e8e4f9" stroke={PURPLE} strokeWidth={2.5} />
          <text x={b1x} y={cy - 4} textAnchor="middle" fontFamily="Inter, sans-serif"
            fontSize="13" fontWeight="700" fill={PURPLE}>m₁={m1}</text>
          <Arrow x={b1x} y={cy - 42} vel={v1} color={PURPLE} label="v1" />

          {/* block 2 */}
          <rect x={b2x - b2w / 2} y={cy - 30} width={b2w} height={50} rx={5}
            fill="#fff3e0" stroke={ORANGE} strokeWidth={2.5} />
          <text x={b2x} y={cy - 4} textAnchor="middle" fontFamily="Inter, sans-serif"
            fontSize="13" fontWeight="700" fill={ORANGE}>m₂={m2}</text>
          <Arrow x={b2x} y={cy - 42} vel={v2} color={ORANGE} label="v2" />

          {/* readouts */}
          <rect x={16} y={16} width={218} height={90} rx={8} fill="#f4f1fb" stroke="#c4b8ef" />
          <text x={26} y={36} fontFamily="Inter, sans-serif" fontSize="11.5" fill="#4b4b5e">
            p_before = {p_before.toFixed(2)} kg·m/s
          </text>
          <text x={26} y={54} fontFamily="Inter, sans-serif" fontSize="11.5" fill="#4b4b5e">
            p_after  = {p_after.toFixed(2)} kg·m/s
          </text>
          <text x={26} y={72} fontFamily="Inter, sans-serif" fontSize="11.5" fill="#4b4b5e">
            KE_before = {ke_before.toFixed(2)} J
          </text>
          <text x={26} y={90} fontFamily="Inter, sans-serif" fontSize="11.5"
            fill={e < 1 ? RED : GREEN}>
            KE_after  = {ke_after.toFixed(2)} J {e < 1 ? "↓" : ""}
          </text>

          <text x={W / 2} y={H - 20} textAnchor="middle" fontFamily="Inter, sans-serif"
            fontSize="12" fill="#8a8a9b">
            {phase === "before" ? "BEFORE collision" : "AFTER collision"}
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="m₁" value={m1} min={0.5} max={10} step={0.1} onChange={setM1}
            fmt={v => `${v.toFixed(1)} kg`} color={PURPLE} />
          <LabeledSlider label="m₂" value={m2} min={0.5} max={10} step={0.1} onChange={setM2}
            fmt={v => `${v.toFixed(1)} kg`} color={ORANGE} />
          <LabeledSlider label="v₁ᵢ" value={v1i} min={-8} max={8} step={0.1} onChange={setV1i}
            fmt={v => `${v.toFixed(1)} m/s`} color={PURPLE} />
          <LabeledSlider label="v₂ᵢ" value={v2i} min={-8} max={8} step={0.1} onChange={setV2i}
            fmt={v => `${v.toFixed(1)} m/s`} color={ORANGE} />
          <LabeledSlider label="e (restitution)" value={e} min={0} max={1} step={0.01} onChange={setE}
            fmt={v => v.toFixed(2)} width={130} />
          <WidgetButton onClick={() => setPhase(p => p === "before" ? "after" : "before")} active={phase === "after"}>
            {phase === "before" ? "Show after →" : "← Show before"}
          </WidgetButton>
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys4-elastic-stop" met={elasticStopMet}>
        Set equal masses (<M>{"m_1 = m_2"}</M>) and restitution <M>{"e=1"}</M> (elastic). After the
        collision block 1 should come to a complete stop — momentum transfers perfectly to block 2.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Center of mass tracker
// ------------------------------------------------------------------
function CenterOfMass() {
  const [m1, setM1] = useState(2);
  const [m2, setM2] = useState(5);
  const [m3, setM3] = useState(3);

  // Fixed positions
  const x1 = 120, y1 = 240;
  const x2 = 420, y2 = 140;
  const x3 = 600, y3 = 280;

  const M = m1 + m2 + m3;
  const xcm = (m1 * x1 + m2 * x2 + m3 * x3) / M;
  const ycm = (m1 * y1 + m2 * y2 + m3 * y3) / M;

  const cmMet = Math.abs(xcm - 350) < 20 && Math.abs(ycm - 220) < 20;

  function Mass({ x, y, mass, color, label }: { x: number; y: number; mass: number; color: string; label: string }) {
    const r = 12 + mass * 3;
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill={color} opacity={0.75} stroke="#fff" strokeWidth={2} />
        <text x={x} y={y + 4} textAnchor="middle" fontFamily="Inter, sans-serif"
          fontSize="12" fontWeight="700" fill="#fff">{label}</text>
        <text x={x} y={y + r + 16} textAnchor="middle" fontFamily="Inter, sans-serif"
          fontSize="11" fill={color}>{mass} kg</text>
      </g>
    );
  }

  return (
    <>
      <WidgetShell
        title="Center of mass"
        onReset={() => { setM1(2); setM2(5); setM3(3); }}
        caption="The center of mass (★) is the mass-weighted average position. Adjust masses and watch it move."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* lines to CM */}
          {[[x1, y1], [x2, y2], [x3, y3]].map(([x, y], i) => (
            <line key={i} x1={x} y1={y} x2={xcm} y2={ycm}
              stroke="#d6d2c4" strokeWidth={1.5} strokeDasharray="6 4" />
          ))}

          <Mass x={x1} y={y1} mass={m1} color={PURPLE} label="m₁" />
          <Mass x={x2} y={y2} mass={m2} color={ORANGE} label="m₂" />
          <Mass x={x3} y={y3} mass={m3} color={BLUE} label="m₃" />

          {/* center of mass */}
          <circle cx={xcm} cy={ycm} r={14} fill="#caa53d" stroke="#fff" strokeWidth={3} />
          <text x={xcm} y={ycm + 5} textAnchor="middle" fontFamily="Inter, sans-serif"
            fontSize="16" fill="#fff" fontWeight="700">★</text>
          <text x={xcm + 18} y={ycm - 8} fontFamily="Inter, sans-serif"
            fontSize="12" fill="#caa53d" fontWeight="600">CM</text>

          {/* formula */}
          <text x={W - 16} y={24} textAnchor="end" fontFamily="Inter, sans-serif"
            fontSize="12" fill="#8a8a9b">
            x_cm = Σmᵢxᵢ / Σmᵢ = {xcm.toFixed(1)} px
          </text>
          <text x={W - 16} y={42} textAnchor="end" fontFamily="Inter, sans-serif"
            fontSize="12" fill="#8a8a9b">
            y_cm = {ycm.toFixed(1)} px   M = {M.toFixed(1)} kg
          </text>

          {/* target zone */}
          <rect x={330} y={200} width={40} height={40} rx={5}
            fill="none" stroke="#bfdfc4" strokeWidth={2} strokeDasharray="6 3" />
          <text x={350} y={258} textAnchor="middle" fontFamily="Inter, sans-serif"
            fontSize="10" fill={GREEN}>target</text>
        </svg>
        <ControlBar>
          <LabeledSlider label="m₁" value={m1} min={0.5} max={15} step={0.1} onChange={setM1}
            fmt={v => `${v.toFixed(1)} kg`} color={PURPLE} />
          <LabeledSlider label="m₂" value={m2} min={0.5} max={15} step={0.1} onChange={setM2}
            fmt={v => `${v.toFixed(1)} kg`} color={ORANGE} />
          <LabeledSlider label="m₃" value={m3} min={0.5} max={15} step={0.1} onChange={setM3}
            fmt={v => `${v.toFixed(1)} kg`} color={BLUE} />
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
        chapter="Chapter 4"
        section="College Physics & Dynamics"
        title="Momentum and Collisions"
        lede="Momentum is conserved whenever net external force is zero. Collisions are the clearest test — two objects exchange momentum in an instant, and the total never changes."
      />

      <p>
        Linear momentum of an object is <M>{"\\mathbf{p} = m\\mathbf{v}"}</M>. Newton's second
        law in its general form says{" "}
        <M>{"\\mathbf{F} = \\dot{\\mathbf{p}}"}</M>: force is the rate of change of momentum.
        If the net external force is zero, <M>{"\\mathbf{p}"}</M> is constant:
      </p>
      <Eq>{"\\sum \\mathbf{F}_{\\text{ext}} = 0 \\implies \\mathbf{p}_{\\text{total}} = \\text{const}."}</Eq>
      <p>
        During a collision, the internal forces between the objects are huge and brief. The
        external forces (gravity, friction) are comparatively negligible during that short
        interval, so momentum is conserved in the collision even when energy is not.
      </p>

      <H2>1D collision types</H2>
      <p>
        The collision outcome is determined by the <em>coefficient of restitution</em>{" "}
        <M>{"e = -\\frac{v_{2f}-v_{1f}}{v_{2i}-v_{1i}}"}</M>. When <M>{"e=1"}</M> the collision
        is elastic (kinetic energy preserved); when <M>{"e=0"}</M> the objects stick together
        (perfectly inelastic).
      </p>
      <Eq>{"v_{1f} = \\frac{m_1-em_2}{m_1+m_2}v_{1i} + \\frac{(1+e)m_2}{m_1+m_2}v_{2i}, \\qquad v_{2f} = \\frac{(1+e)m_1}{m_1+m_2}v_{1i} + \\frac{m_2-em_1}{m_1+m_2}v_{2i}."}</Eq>

      <Collision1D />

      <KeyIdea>
        For an elastic collision between equal masses, the velocities are exchanged: the first
        object stops and the second takes its velocity. This is the billiard-ball rule.
      </KeyIdea>

      <H2>Center of mass</H2>
      <p>
        The center of mass of a system is the mass-weighted average position. Under Newton's
        laws, it moves as if all the mass were concentrated there and all external forces
        acted on it. For a robot, the center of mass determines balance and stability.
      </p>
      <Eq>{"\\mathbf{r}_{\\text{cm}} = \\frac{\\sum m_i \\mathbf{r}_i}{\\sum m_i}."}</Eq>

      <CenterOfMass />

      <Aside>
        Impulse <M>{"J = \\int F\\,dt = \\Delta p"}</M> is what a force delivers in a short
        burst. Robot impacts — catching a thrown object, striking a surface — are analyzed
        using impulse. The larger the impact duration, the smaller the peak force for the
        same momentum change.
      </Aside>

      <BookRef>
        Physics track: linear momentum, impulse, elastic and inelastic collisions, center of
        mass.
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
