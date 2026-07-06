import { useState, useRef, useEffect } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";
import { rad } from "../../lib/math/vec";

const W = 760;
const H = 360;
const RED = "#d9483f";
const GREEN = "#2f9e44";
const BLUE = "#3b6fd4";
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";

// ------------------------------------------------------------------
// Torque and lever arm
// ------------------------------------------------------------------
function TorqueLeverArm() {
  const [pivotFrac, setPivotFrac] = useState(0.5);
  const [force, setForce] = useState(20);
  const [angle, setAngle] = useState(90);

  const barX0 = 100;
  const barX1 = 660;
  const barY = H / 2;
  const barL = barX1 - barX0;
  const pivotX = barX0 + pivotFrac * barL;
  const forceApplyX = barX1; // force applied at right end

  const d = forceApplyX - pivotX; // lever arm (distance pivot to force)
  const th = rad(angle);
  const torque = force * d * Math.sin(th) / 100; // scale for display

  const fvx = Math.cos(rad(angle - 90)) * force * 1.8;
  const fvy = -Math.sin(rad(angle - 90)) * force * 1.8;

  const torqueMet = Math.abs(torque - 2) < 0.15;

  return (
    <>
      <WidgetShell
        title="Torque and lever arm"
        onReset={() => { setPivotFrac(0.5); setForce(20); setAngle(90); }}
        caption="τ = r × F = F·d·sin θ  where d is the distance from pivot to the line of force action."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* bar */}
          <rect x={barX0} y={barY - 10} width={barL} height={20} rx={5}
            fill="#d6d2c4" stroke="#8a8a9b" strokeWidth={2} />

          {/* pivot triangle */}
          <polygon points={`${pivotX},${barY + 10} ${pivotX - 18},${barY + 36} ${pivotX + 18},${barY + 36}`}
            fill="#50525e" />
          <line x1={pivotX - 24} y1={barY + 37} x2={pivotX + 24} y2={barY + 37} stroke="#50525e" strokeWidth={2} />

          {/* lever arm arrow (pivot to force application) */}
          <line x1={pivotX} y1={barY - 28} x2={forceApplyX} y2={barY - 28}
            stroke={BLUE} strokeWidth={2} strokeDasharray="6 4" />
          <text x={(pivotX + forceApplyX) / 2} y={barY - 34} textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="12" fill={BLUE}>
            d = {(d / 100).toFixed(2)} m
          </text>

          {/* force arrow */}
          <defs>
            <marker id="torq-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={RED} />
            </marker>
          </defs>
          <line x1={forceApplyX} y1={barY}
            x2={forceApplyX + fvx} y2={barY + fvy}
            stroke={RED} strokeWidth={4.5} markerEnd="url(#torq-arrow)" />
          <text x={forceApplyX + fvx + (fvx > 0 ? 8 : -8)} y={barY + fvy - 6}
            textAnchor={fvx > 0 ? "start" : "end"}
            fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600" fill={RED}>
            F={force} N
          </text>

          {/* perpendicular component line */}
          <line x1={forceApplyX} y1={barY} x2={forceApplyX} y2={barY + fvy}
            stroke={PURPLE} strokeWidth={2} strokeDasharray="5 4" opacity={0.7} />

          {/* torque readout */}
          <rect x={16} y={16} width={220} height={58} rx={8} fill="#f4f1fb" stroke="#c4b8ef" />
          <text x={26} y={38} fontFamily="Inter, sans-serif" fontSize="13" fill="#4b4b5e">
            τ = F·d·sin θ
          </text>
          <text x={26} y={60} fontFamily="Inter, sans-serif" fontSize="15" fontWeight="700" fill={PURPLE}>
            τ = {torque.toFixed(3)} N·m
          </text>

          {/* torque arc indicator */}
          {torque > 0.01 && (
            <path d={`M ${pivotX + 30},${barY} A 30,30 0 0 0 ${pivotX + 30 * Math.cos(Math.PI / 2)},${barY - 30 * Math.sin(Math.PI / 2)}`}
              fill="none" stroke={PURPLE} strokeWidth={3} strokeDasharray="5 3" />
          )}
        </svg>
        <ControlBar>
          <LabeledSlider label="pivot position" value={pivotFrac} min={0.05} max={0.95} step={0.01}
            onChange={setPivotFrac} fmt={v => `${(v * 100).toFixed(0)}%`} />
          <LabeledSlider label="force F" value={force} min={1} max={50} step={0.5} onChange={setForce}
            fmt={v => `${v.toFixed(1)} N`} color={RED} />
          <LabeledSlider label="angle θ" value={angle} min={10} max={170} step={1} onChange={setAngle}
            fmt={v => `${v.toFixed(0)}°`} color={BLUE} />
          <Readout label="d" value={`${(d / 100).toFixed(2)} m`} color={BLUE} />
          <Readout label="τ" value={`${torque.toFixed(3)} N·m`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys5-torque-2nm" met={torqueMet}>
        Achieve exactly <M>{"2 \\pm 0.15 \\text{ N·m}"}</M> of torque. Try different combinations of force,
        lever-arm length, and angle. A perpendicular force (90°) gives maximum torque for a given distance.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Moment of inertia comparison
// ------------------------------------------------------------------
function MomentOfInertia() {
  const [mass, setMass] = useState(2);
  const [radius, setRadius] = useState(1);

  const ringI = mass * radius * radius;
  const inertiaMet = Math.abs(ringI - 8) < 0.15 && mass <= 4.05;

  const shapes = [
    { label: "Ring / Hoop", formula: "I = mR²", I: mass * radius * radius, color: RED, desc: "All mass at rim" },
    { label: "Solid Disk", formula: "I = ½mR²", I: 0.5 * mass * radius * radius, color: GREEN, desc: "Uniform disk" },
    { label: "Solid Sphere", formula: "I = ⅖mR²", I: 0.4 * mass * radius * radius, color: BLUE, desc: "Uniform sphere" },
    { label: "Point mass (axis)", formula: "I = mR²", I: mass * radius * radius, color: ORANGE, desc: "If all at edge" },
  ];
  const maxI = shapes[0].I;

  return (
    <>
      <WidgetShell
        title="Moment of inertia — shape comparison"
        onReset={() => { setMass(2); setRadius(1); }}
        caption="Same mass and radius — the shape distribution changes how hard it is to start spinning."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {shapes.map((sh, i) => {
            const bx = 80 + i * 168;
            const by = H - 70;
            const barH = maxI > 0 ? (sh.I / (maxI * 1.1)) * 210 : 0;
            const r = 28;
            return (
              <g key={sh.label}>
                {/* bar */}
                <rect x={bx} y={by - barH} width={100} height={barH} rx={4}
                  fill={sh.color} opacity={0.25} stroke={sh.color} strokeWidth={1.5} />
                {/* I value */}
                <text x={bx + 50} y={by - barH - 8} textAnchor="middle"
                  fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill={sh.color}>
                  {sh.I.toFixed(3)}
                </text>
                <text x={bx + 50} y={by - barH - 22} textAnchor="middle"
                  fontFamily="Inter, sans-serif" fontSize="10" fill={sh.color}>
                  kg·m²
                </text>
                {/* shape illustration */}
                {i === 0 && <circle cx={bx + 50} cy={100} r={r} fill="none" stroke={sh.color} strokeWidth={6} />}
                {i === 1 && <circle cx={bx + 50} cy={100} r={r} fill={sh.color} opacity={0.3} stroke={sh.color} strokeWidth={2.5} />}
                {i === 2 && <circle cx={bx + 50} cy={100} r={r} fill={sh.color} opacity={0.5} stroke={sh.color} strokeWidth={2} />}
                {i === 3 && (
                  <>
                    <line x1={bx + 50} y1={100} x2={bx + 50 + r} y2={100} stroke={sh.color} strokeWidth={2} strokeDasharray="4 3" />
                    <circle cx={bx + 50 + r} cy={100} r={7} fill={sh.color} />
                  </>
                )}
                {/* label */}
                <text x={bx + 50} y={by + 16} textAnchor="middle"
                  fontFamily="Inter, sans-serif" fontSize="11" fontWeight="700" fill={sh.color}>
                  {sh.label}
                </text>
                <text x={bx + 50} y={by + 30} textAnchor="middle"
                  fontFamily="Inter, sans-serif" fontSize="10.5" fill="#8a8a9b">
                  {sh.formula}
                </text>
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
        Give the <em>ring</em> a moment of inertia of exactly <M>{"8 \\text{ kg·m}^2"}</M>{" "}
        (±0.15) using <strong>at most 4 kg</strong> of mass. Mass alone won't get you there —
        you'll have to exploit the fact that radius enters as <M>{"R^2"}</M>.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Rolling race
// ------------------------------------------------------------------
function RollingRace() {
  const [angle, setAngle] = useState(20);
  const [running, setRunning] = useState(false);
  const [positions, setPositions] = useState([0, 0, 0]);
  const rafRef = useRef<number>(0);
  const stateRef = useRef({ positions: [0, 0, 0], t: 0 });
  const DIST = 420;

  // Objects: [hoop, disk, sphere], inertia factors β so I = β·m·R²
  const betas = [1, 0.5, 0.4];
  const colors = [RED, GREEN, BLUE];
  const g = 9.81;
  const th = rad(angle);
  // Rolling acceleration: a = g·sinθ / (1 + β)
  const accels = betas.map(b => g * Math.sin(th) / (1 + b));

  useEffect(() => {
    stateRef.current = { positions: [0, 0, 0], t: 0 };
    setPositions([0, 0, 0]);
  }, [angle]);

  useEffect(() => {
    if (!running) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    function step(now: number) {
      const dt = Math.min((now - last) / 1000, 0.03);
      last = now;
      const s = stateRef.current;
      s.t += dt;
      s.positions = s.positions.map((p, i) => Math.min(p + accels[i] * s.t * dt * 60, DIST));
      if (s.positions.every(p => p >= DIST)) { setRunning(false); }
      setPositions([...s.positions]);
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, accels]);

  // SVG incline
  const ox = 60;
  const oy = 310;
  const incL = 540;
  const cos = Math.cos(th);
  const sin = Math.sin(th);

  const sphereWinsMet = positions[2] >= DIST && positions[2] > positions[1] && positions[2] > positions[0];

  return (
    <>
      <WidgetShell
        title="Rolling race — moment of inertia and speed"
        onReset={() => { setRunning(false); stateRef.current = { positions: [0, 0, 0], t: 0 }; setPositions([0, 0, 0]); }}
        caption="All three have the same mass and radius. The one with less rotational inertia (smaller β) accelerates faster."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* incline */}
          <polygon points={`${ox},${oy} ${ox + incL * cos},${oy} ${ox + incL * cos},${oy - incL * sin}`}
            fill="#ece8dd" stroke="#8a8a9b" strokeWidth={1.5} />
          {[...Array(10)].map((_, i) => (
            <line key={i} x1={ox + i * 55} y1={oy} x2={ox + i * 55 - 10} y2={oy + 12} stroke="#c4c0b4" strokeWidth={1.2} />
          ))}

          {/* rolling objects */}
          {positions.map((p, i) => {
            const r = 18 - i * 2;
            // lane offset perpendicular to slope
            const offx = [-25, 0, 25][i];
            const rx = ox + p * cos + offx * (-sin);
            const ry = oy - p * sin + offx * cos - r;
            return (
              <g key={i}>
                <circle cx={rx} cy={ry} r={r}
                  fill={colors[i]} opacity={0.8} stroke="#fff" strokeWidth={2} />
                {i === 0 && <circle cx={rx} cy={ry} r={r - 5} fill="none" stroke="#fff" strokeWidth={2} opacity={0.5} />}
              </g>
            );
          })}

          {/* lane labels */}
          {[RED, GREEN, BLUE].map((c, i) => (
            <text key={i} x={ox + DIST * cos + ([-30, 0, 30][i]) * (-sin) + 10} y={oy - DIST * sin + ([-30, 0, 30][i]) * cos - 12}
              fontFamily="Inter, sans-serif" fontSize="10.5" fill={c} fontWeight="700">
              {["Hoop", "Disk", "Sphere"][i]}
            </text>
          ))}

          {/* finish line */}
          <line x1={ox + DIST * cos - 20 * sin} y1={oy - DIST * sin - 20 * cos}
            x2={ox + DIST * cos + 20 * sin} y2={oy - DIST * sin + 20 * cos}
            stroke="#caa53d" strokeWidth={3} strokeDasharray="8 4" />
        </svg>
        <ControlBar>
          <LabeledSlider label="angle" value={angle} min={5} max={60} step={1} onChange={setAngle}
            fmt={v => `${v.toFixed(0)}°`} />
          <WidgetButton onClick={() => {
            stateRef.current = { positions: [0, 0, 0], t: 0 };
            setPositions([0, 0, 0]);
            setRunning(true);
          }} active={running}>
            {running ? "Racing…" : "Start race"}
          </WidgetButton>
          {accels.map((a, i) => (
            <Readout key={i} label={["a_hoop", "a_disk", "a_sphere"][i]}
              value={`${a.toFixed(3)} m/s²`} color={colors[i]} />
          ))}
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys5-rolling-sphere-wins" met={sphereWinsMet}>
        Run the race and verify that the sphere wins (reaches the finish line first). The sphere
        has the smallest <M>{"\\beta = 2/5"}</M> and thus the largest rolling acceleration.
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
        square push, and something in between. Torque trades force, distance, and angle freely;
        that exchange rate is why a long wrench loosens what a short one cannot.
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
        Now double the radius slider and watch every bar quadruple — that's the <M>{"R^2"}</M>{" "}
        speaking. The challenge below forces you to use it.
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
        <strong>Try this:</strong> run the race, then run it again at a steeper angle — the
        finishing <em>order</em> never changes, only the pace. A giant lead hoop loses to a
        marble-sized glass sphere. The race is decided entirely by shape, because rolling
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
