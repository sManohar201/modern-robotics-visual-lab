import { useState, useRef, useEffect, useMemo } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
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

// ------------------------------------------------------------------
// 2-link arm dynamics visualizer
// ------------------------------------------------------------------
function TwoLinkArmDynamics() {
  const [th1, setTh1] = useState(45);
  const [th2, setTh2] = useState(60);
  const [w1, setW1] = useState(0);
  const [w2, setW2] = useState(0);
  const [L1, setL1] = useState(1.0);
  const [L2, setL2] = useState(0.8);
  const [m1, setM1] = useState(2.0);
  const [m2, setM2] = useState(1.5);
  const [showGravity, setShowGravity] = useState(true);
  const [showCoriolis, setShowCoriolis] = useState(true);
  const [showInertia, setShowInertia] = useState(true);

  const t1 = th1 * Math.PI / 180;
  const t2 = th2 * Math.PI / 180;

  // Mass matrix M(θ)
  const I1 = m1 * L1 * L1 / 3 + m2 * L1 * L1;
  const I12 = m2 * L1 * L2 * Math.cos(t2);
  const I2 = m2 * L2 * L2 / 3;

  const M11 = I1 + I2 + m2 * L1 * L2 * Math.cos(t2) * 2;
  const M12 = I2 + m2 * L1 * L2 * Math.cos(t2);
  const M22 = I2;

  // Coriolis / centrifugal
  const h = -m2 * L1 * L2 * Math.sin(t2);
  const C1 = h * w2 * w1 + h * w2 * w2;
  const C2 = -h * w1 * w1;

  // Gravity torques
  const lc1 = L1 / 2;
  const lc2 = L2 / 2;
  const g1 = m1 * G * lc1 * Math.cos(t1) + m2 * G * (L1 * Math.cos(t1) + lc2 * Math.cos(t1 + t2));
  const g2 = m2 * G * lc2 * Math.cos(t1 + t2);

  // Required torques to hold current position (α=0) and velocities
  const tau1 = (showInertia ? M11 * 0 + M12 * 0 : 0)
    + (showCoriolis ? C1 : 0)
    + (showGravity ? g1 : 0);
  const tau2 = (showInertia ? M12 * 0 + M22 * 0 : 0)
    + (showCoriolis ? C2 : 0)
    + (showGravity ? g2 : 0);

  // SVG geometry
  const pivX = 200, pivY = 260;
  const scl = 130;
  const x1 = pivX + L1 * scl * Math.cos(t1);
  const y1 = pivY - L1 * scl * Math.sin(t1);
  const x2 = x1 + L2 * scl * Math.cos(t1 + t2);
  const y2 = y1 - L2 * scl * Math.sin(t1 + t2);

  // Gravity compensation torques (to hold still: τ = g(θ))
  const gravMet = showGravity && !showCoriolis && Math.abs(tau1) > 0.1;

  function ArmLink({ ax, ay, bx, by, color, w }: { ax: number; ay: number; bx: number; by: number; color: string; w: number }) {
    return (
      <g>
        <line x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth={w} strokeLinecap="round" />
        <circle cx={ax} cy={ay} r={8} fill={color} stroke="#fff" strokeWidth={2} />
        <circle cx={bx} cy={by} r={10} fill={color} stroke="#fff" strokeWidth={2} />
      </g>
    );
  }

  return (
    <>
      <WidgetShell
        title="2-link arm dynamics"
        onReset={() => { setTh1(45); setTh2(60); setW1(0); setW2(0); }}
        caption="The equation of motion M(θ)θ̈ + C(θ,θ̇)θ̇ + g(θ) = τ. At rest (θ̈=θ̇=0), τ = g(θ) alone."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* ground */}
          <line x1={pivX - 30} y1={pivY} x2={pivX + 30} y2={pivY} stroke="#8a8a9b" strokeWidth={3} />
          {[...Array(4)].map((_, i) => (
            <line key={i} x1={pivX - 22 + i * 15} y1={pivY} x2={pivX - 28 + i * 15} y2={pivY + 12} stroke="#c4c0b4" strokeWidth={1.5} />
          ))}

          <ArmLink ax={pivX} ay={pivY} bx={x1} by={y1} color={BLUE} w={14} />
          <ArmLink ax={x1} ay={y1} bx={x2} by={y2} color={ORANGE} w={11} />

          {/* link labels */}
          <text x={(pivX + x1) / 2 - 10} y={(pivY + y1) / 2 - 14} fontFamily="Inter, sans-serif"
            fontSize="11" fill={BLUE} fontWeight="600">L₁={L1}m</text>
          <text x={(x1 + x2) / 2 + 8} y={(y1 + y2) / 2 - 10} fontFamily="Inter, sans-serif"
            fontSize="11" fill={ORANGE} fontWeight="600">L₂={L2}m</text>

          {/* gravity vectors on link CMs */}
          {showGravity && (
            <>
              <defs>
                <marker id="dp-g1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={RED} />
                </marker>
                <marker id="dp-g2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={RED} />
                </marker>
              </defs>
              <line x1={(pivX + x1) / 2} y1={(pivY + y1) / 2}
                x2={(pivX + x1) / 2} y2={(pivY + y1) / 2 + m1 * G * 3}
                stroke={RED} strokeWidth={3} markerEnd="url(#dp-g1)" />
              <line x1={(x1 + x2) / 2} y1={(y1 + y2) / 2}
                x2={(x1 + x2) / 2} y2={(y1 + y2) / 2 + m2 * G * 3}
                stroke={RED} strokeWidth={2.5} markerEnd="url(#dp-g2)" />
            </>
          )}

          {/* angle arcs */}
          <path d={`M ${pivX + 40},${pivY} A 40,40 0 0 0 ${pivX + 40 * Math.cos(t1)},${pivY - 40 * Math.sin(t1)}`}
            fill="none" stroke="#8a8a9b" strokeWidth={1.5} />
          <text x={pivX + 44 * Math.cos(t1 / 2)} y={pivY - 44 * Math.sin(t1 / 2) + 4}
            fontFamily="Inter, sans-serif" fontSize="11" fill="#8a8a9b">θ₁</text>

          {/* torque readout panel */}
          <rect x={W - 265} y={16} width={245} height={H - 32} rx={10} fill="#faf9f5" stroke="#e4e1d8" />
          <text x={W - 252} y={42} fontFamily="Inter, sans-serif" fontSize="10.5" fontWeight="700"
            letterSpacing="1.2" fill="#8a8a9b">DYNAMICS TERMS</text>

          <text x={W - 252} y={64} fontFamily="Inter, sans-serif" fontSize="11" fill={PURPLE} fontWeight="600">
            Mass matrix M(θ)
          </text>
          <text x={W - 252} y={82} fontFamily="Inter, sans-serif" fontSize="11" fill="#4b4b5e">
            M₁₁ = {M11.toFixed(3)} kg·m²
          </text>
          <text x={W - 252} y={100} fontFamily="Inter, sans-serif" fontSize="11" fill="#4b4b5e">
            M₁₂ = {M12.toFixed(3)} kg·m²
          </text>
          <text x={W - 252} y={118} fontFamily="Inter, sans-serif" fontSize="11" fill="#4b4b5e">
            M₂₂ = {M22.toFixed(3)} kg·m²
          </text>

          <text x={W - 252} y={142} fontFamily="Inter, sans-serif" fontSize="11" fill={ORANGE} fontWeight="600">
            Coriolis h(θ,θ̇)
          </text>
          <text x={W - 252} y={160} fontFamily="Inter, sans-serif" fontSize="11" fill="#4b4b5e">
            h = {h.toFixed(4)} N·m·s²
          </text>
          <text x={W - 252} y={178} fontFamily="Inter, sans-serif" fontSize="11" fill="#4b4b5e">
            C₁ = {C1.toFixed(4)}  C₂ = {C2.toFixed(4)}
          </text>

          <text x={W - 252} y={202} fontFamily="Inter, sans-serif" fontSize="11" fill={RED} fontWeight="600">
            Gravity g(θ)
          </text>
          <text x={W - 252} y={220} fontFamily="Inter, sans-serif" fontSize="11" fill="#4b4b5e">
            g₁ = {g1.toFixed(3)} N·m
          </text>
          <text x={W - 252} y={238} fontFamily="Inter, sans-serif" fontSize="11" fill="#4b4b5e">
            g₂ = {g2.toFixed(3)} N·m
          </text>

          <line x1={W - 252} y1={250} x2={W - 32} y2={250} stroke="#e4e1d8" />
          <text x={W - 252} y={270} fontFamily="Inter, sans-serif" fontSize="11.5" fontWeight="700" fill={PURPLE}>
            τ₁ = {tau1.toFixed(3)} N·m
          </text>
          <text x={W - 252} y={290} fontFamily="Inter, sans-serif" fontSize="11.5" fontWeight="700" fill={PURPLE}>
            τ₂ = {tau2.toFixed(3)} N·m
          </text>
          <text x={W - 252} y={312} fontFamily="Inter, sans-serif" fontSize="10" fill="#8a8a9b">
            (to hold this pose, θ̈=θ̇=0)
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="θ₁" value={th1} min={-90} max={175} step={1} onChange={setTh1}
            fmt={v => `${v.toFixed(0)}°`} color={BLUE} />
          <LabeledSlider label="θ₂" value={th2} min={-170} max={170} step={1} onChange={setTh2}
            fmt={v => `${v.toFixed(0)}°`} color={ORANGE} />
          <LabeledSlider label="L₁ (m)" value={L1} min={0.3} max={1.5} step={0.05} onChange={setL1}
            fmt={v => `${v.toFixed(2)}`} />
          <LabeledSlider label="L₂ (m)" value={L2} min={0.3} max={1.5} step={0.05} onChange={setL2}
            fmt={v => `${v.toFixed(2)}`} />
          <LabeledSlider label="m₁ (kg)" value={m1} min={0.1} max={5} step={0.1} onChange={setM1}
            fmt={v => `${v.toFixed(1)}`} color={BLUE} />
          <LabeledSlider label="m₂ (kg)" value={m2} min={0.1} max={5} step={0.1} onChange={setM2}
            fmt={v => `${v.toFixed(1)}`} color={ORANGE} />
          <WidgetButton onClick={() => setShowGravity(v => !v)} active={showGravity}>gravity</WidgetButton>
          <WidgetButton onClick={() => setShowCoriolis(v => !v)} active={showCoriolis}>Coriolis</WidgetButton>
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys10-gravity-comp" met={Math.abs(g1) > 5 && showGravity}>
        Configure the arm so the gravity torque at joint 1 (<M>{"g_1"}</M>) exceeds 5 N·m. This
        happens when the arm is extended horizontally with significant mass. These are the torques
        the actuators must provide for gravity compensation.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Coriolis effect explorer
// ------------------------------------------------------------------
function CoriolisExplorer() {
  const [omega, setOmega] = useState(1.5);
  const [vr, setVr] = useState(2);
  const [mass, setMass] = useState(1);
  const [running, setRunning] = useState(false);
  const stateRef = useRef({ r: 60, phi: 0, rdot: 0, phidot: 0, t: 0 });
  const pathRef = useRef<[number, number][]>([]);
  const rafRef = useRef<number>(0);
  const [snap, setSnap] = useState({ r: 60, phi: 0 });

  function reset() {
    setRunning(false);
    stateRef.current = { r: 60, phi: 0, rdot: vr, phidot: omega, t: 0 };
    pathRef.current = [];
    setSnap({ r: 60, phi: 0 });
  }

  useEffect(() => { reset(); }, [omega, vr, mass]);

  useEffect(() => {
    if (!running) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    function step(now: number) {
      const dt = Math.min((now - last) / 1000, 0.025);
      last = now;
      const s = stateRef.current;
      // In rotating frame: Coriolis = -2ω × v
      // In inertial frame: just straight-line motion projected
      // Simulate straight line in inertial, map to rotating frame
      s.t += dt;
      // Inertial: x = r0*cos(phi0) + vx*t, y = r0*sin(phi0) + vy*t
      const r0 = 60, phi0 = 0;
      const vx = s.rdot * Math.cos(phi0) - r0 * omega * Math.sin(phi0);
      const vy = s.rdot * Math.sin(phi0) + r0 * omega * Math.cos(phi0);
      const xi = r0 * Math.cos(phi0) + vx * s.t;
      const yi = r0 * Math.sin(phi0) + vy * s.t;
      // Rotating frame: rotate by -omega*t
      const angle = -omega * s.t;
      const xr = xi * Math.cos(angle) - yi * Math.sin(angle);
      const yr = xi * Math.sin(angle) + yi * Math.cos(angle);
      s.r = Math.hypot(xr, yr);
      s.phi = Math.atan2(yr, xr);
      pathRef.current.push([xr, yr]);
      if (pathRef.current.length > 500) pathRef.current.shift();
      setSnap({ r: s.r, phi: s.phi });
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, omega, vr]);

  const cx = 220, cy = H / 2;
  const scl = 1.2;
  const path = pathRef.current;
  const tracePath = path.length > 2
    ? path.map((p, i) => `${i === 0 ? "M" : "L"} ${(cx + p[0] * scl).toFixed(1)} ${(cy - p[1] * scl).toFixed(1)}`).join(" ")
    : "";

  const fCoriolis = 2 * mass * omega * vr;

  return (
    <>
      <WidgetShell
        title="Coriolis effect in rotating frame"
        onReset={reset}
        caption="In the rotating frame, a moving object appears to curve. The Coriolis force F = −2mω × v causes this deflection."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* rotating frame disc */}
          <circle cx={cx} cy={cy} r={155} fill="#f4f1fb" stroke="#c4b8ef" strokeWidth={1.5} opacity={0.5} />
          {[0, 60, 120, 180, 240, 300].map(a => (
            <line key={a}
              x1={cx} y1={cy}
              x2={cx + 155 * Math.cos(a * Math.PI / 180)}
              y2={cy - 155 * Math.sin(a * Math.PI / 180)}
              stroke="#d6d0f0" strokeWidth={1} />
          ))}

          {/* inertial straight line */}
          <line x1={cx + 60 * scl} y1={cy}
            x2={cx + (60 + vr * 3) * scl} y2={cy}
            stroke={GREEN} strokeWidth={2} strokeDasharray="8 5" opacity={0.6} />
          <text x={cx + (60 + vr * 1.5) * scl} y={cy - 12}
            textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fill={GREEN}>inertial path</text>

          {/* Coriolis curved trace */}
          {tracePath && <path d={tracePath} fill="none" stroke={PURPLE} strokeWidth={2.5} strokeLinecap="round" />}

          {/* current position */}
          <circle cx={cx + snap.r * scl * Math.cos(snap.phi)}
            cy={cy - snap.r * scl * Math.sin(snap.phi)}
            r={9} fill={ORANGE} stroke="#fff" strokeWidth={2} />

          {/* ω arrow arc */}
          <path d={`M ${cx + 40},${cy} A 40,40 0 0 0 ${cx + 40 * Math.cos(0.8)},${cy - 40 * Math.sin(0.8)}`}
            fill="none" stroke={BLUE} strokeWidth={2.5} />
          <text x={cx + 50} y={cy - 50} fontFamily="Inter, sans-serif" fontSize="12" fill={BLUE} fontWeight="600">ω</text>

          {/* info panel */}
          <rect x={W - 255} y={20} width={235} height={100} rx={8} fill="#faf8f2" stroke="#e4e1d8" />
          <text x={W - 243} y={42} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            ω = {omega.toFixed(2)} rad/s
          </text>
          <text x={W - 243} y={62} fontFamily="Inter, sans-serif" fontSize="12" fill="#4b4b5e">
            v_radial = {vr.toFixed(1)} m/s
          </text>
          <text x={W - 243} y={82} fontFamily="Inter, sans-serif" fontSize="12.5" fontWeight="700" fill={PURPLE}>
            F_Cor = {fCoriolis.toFixed(3)} N
          </text>
          <text x={W - 243} y={100} fontFamily="Inter, sans-serif" fontSize="11" fill="#8a8a9b">
            F = 2mωv
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="ω (frame)" value={omega} min={0.2} max={4} step={0.05} onChange={setOmega}
            fmt={v => `${v.toFixed(2)} rad/s`} color={BLUE} />
          <LabeledSlider label="v_radial" value={vr} min={0.5} max={5} step={0.1} onChange={setVr}
            fmt={v => `${v.toFixed(1)} m/s`} color={PURPLE} />
          <LabeledSlider label="mass" value={mass} min={0.1} max={3} step={0.05} onChange={setMass}
            fmt={v => `${v.toFixed(2)} kg`} />
          <WidgetButton onClick={() => setRunning(r => !r)} active={running}>
            {running ? "Pause" : "Play"}
          </WidgetButton>
          <Readout label="F_Cor" value={`${fCoriolis.toFixed(3)} N`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys10-coriolis-deflect" met={Math.abs(fCoriolis) > 5}>
        Make the Coriolis force exceed 5 N by combining large rotation rate and radial velocity.
        Watch how the path in the rotating frame (purple) curves away from the straight inertial path (green).
      </Challenge>
    </>
  );
}

export default function RoboticsB() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 10"
        section="College Physics & Dynamics"
        title="Dynamics for Robotics"
        lede="Robot dynamics combines Lagrangian mechanics and rigid body inertia into a single equation: M(θ)θ̈ + C(θ,θ̇)θ̇ + g(θ) = τ. Each term has a clear physical interpretation."
      />

      <p>
        A robot arm is a chain of rigid bodies connected by actuated joints. Applying the
        Euler-Lagrange equations to the robot's kinetic and potential energy gives the
        <strong>manipulator equation of motion</strong>:
      </p>
      <Eq>{"M(\\theta)\\ddot{\\theta} + C(\\theta,\\dot{\\theta})\\dot{\\theta} + g(\\theta) = \\tau."}</Eq>
      <p>
        Three terms arise naturally:
        {" "}<strong><M>{"M(\\theta)"}</M></strong> — the configuration-dependent mass matrix (inertia),
        {" "}<strong><M>{"C(\\theta,\\dot\\theta)\\dot\\theta"}</M></strong> — Coriolis and centrifugal
        forces, and
        {" "}<strong><M>{"g(\\theta)"}</M></strong> — gravity compensation torques.
      </p>

      <TwoLinkArmDynamics />

      <H2>The Coriolis effect</H2>
      <p>
        When an object moves inside a rotating reference frame — like a link moving relative
        to the base frame of a spinning robot — it experiences a fictitious Coriolis force:
      </p>
      <Eq>{"\\mathbf{F}_{\\text{Cor}} = -2m\\boldsymbol{\\omega} \\times \\mathbf{v}_{\\text{rel}}."}</Eq>
      <p>
        In robot dynamics the Coriolis matrix <M>{"C(\\theta,\\dot\\theta)"}</M> captures
        these coupling effects between joint velocities. When one joint spins fast while
        another moves, large coupling torques appear.
      </p>

      <CoriolisExplorer />

      <KeyIdea>
        Gravity compensation — commanding <M>{"\\tau = g(\\theta)"}</M> — is the simplest
        model-based controller. It makes the robot "weightless" so the arm floats at any
        configuration. Every more sophisticated controller adds inertia and Coriolis
        compensation on top.
      </KeyIdea>

      <H2>The mass matrix and manipulability</H2>
      <p>
        The mass matrix <M>{"M(\\theta)"}</M> changes with configuration. When the arm is
        outstretched, <M>{"M_{11}"}</M> is large — joint 1 must move the entire extended
        arm. Near the shoulder (small <M>{"\\theta_1"}</M>), <M>{"M_{11}"}</M> is smaller.
        The manipulability ellipsoid from Chapter 5 is the inverse of the generalized
        inertia seen by the task-space force.
      </p>
      <Eq>{"\\Lambda(\\theta) = (J M^{-1} J^T)^{-1} \\quad \\text{(operational space inertia)}."}</Eq>

      <Aside>
        The Chapter 8 manipulator dynamics (Modern Robotics textbook) derives <M>{"M"}</M>,{" "}
        <M>{"C"}</M>, and <M>{"g"}</M> using the spatial momentum formulation and Newton-Euler
        recursion. This page shows the same physics through the Lagrangian lens.
      </Aside>

      <BookRef>
        Robotics bridge: Lagrangian robot dynamics, mass matrix, Coriolis terms, gravity
        compensation, operational-space control.
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
