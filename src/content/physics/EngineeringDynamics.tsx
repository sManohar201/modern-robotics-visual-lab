import { useState, useRef, useEffect, useMemo } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";
import { circleIntersect } from "../../lib/svg";
import { Link, GroundPin, nearest } from "../../components/widgets/linkage";
import { rad } from "../../lib/math/vec";

const W = 760;
const H = 360;
const RED = "#d9483f";
const GREEN = "#2f9e44";
const BLUE = "#3b6fd4";
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";

// ------------------------------------------------------------------
// Four-bar linkage visualizer
// ------------------------------------------------------------------
function FourBarLinkage() {
  const [crankAngle, setCrankAngle] = useState(45);
  const [running, setRunning] = useState(false);
  const rafRef = useRef<number>(0);
  const angleRef = useRef(45);
  const traceRef = useRef<[number, number][]>([]);
  const [snap, setSnap] = useState({ angle: 45, trace: [] as [number, number][] });

  // Four-bar dimensions (Grashof, crank-rocker)
  const A: [number, number] = [180, 260]; // fixed pivot A
  const D: [number, number] = [530, 260]; // fixed pivot D
  const lenAB = 90;  // crank
  const lenBC = 210; // coupler
  const lenCD = 160; // rocker

  function solveAt(ang: number) {
    const th = rad(ang);
    const B: [number, number] = [A[0] + lenAB * Math.cos(th), A[1] - lenAB * Math.sin(th)];
    const sol1 = circleIntersect(B, lenBC, D, lenCD, 1);
    const sol2 = circleIntersect(B, lenBC, D, lenCD, -1);
    const prev = traceRef.current.length > 0 ? traceRef.current[traceRef.current.length - 1] : null;
    const C = nearest(prev, sol1, sol2);
    return { B, C };
  }

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
        if (traceRef.current.length > 500) traceRef.current.shift();
      }
      setSnap({ angle: angleRef.current, trace: [...traceRef.current] });
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);

  const { B, C } = useMemo(() => solveAt(running ? snap.angle : crankAngle), [snap.angle, crankAngle, running]);

  const coupleTrace = snap.trace;
  const tracePath = coupleTrace.length > 1
    ? coupleTrace.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")
    : "";

  const fullRotation = coupleTrace.length > 480;

  return (
    <>
      <WidgetShell
        title="Four-bar linkage"
        onReset={() => {
          setRunning(false); setCrankAngle(45);
          angleRef.current = 45; traceRef.current = [];
          setSnap({ angle: 45, trace: [] });
        }}
        caption="The crank (purple) rotates freely. The coupler (blue) traces a complex curve. The rocker (orange) oscillates."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* coupler trace */}
          {tracePath && <path d={tracePath} fill="none" stroke={BLUE} strokeWidth={1.5} opacity={0.45} strokeLinecap="round" />}

          {/* links */}
          {B && C ? (
            <>
              <Link a={A} b={B} color={PURPLE} w={8} />
              <Link a={B} b={C} color={BLUE} w={7} />
              <Link a={C} b={D} color={ORANGE} w={8} />
              {/* ground link (dashed) */}
              <line x1={A[0]} y1={A[1]} x2={D[0]} y2={D[1]} stroke="#b0aaaa" strokeWidth={5} strokeDasharray="10 6" />
            </>
          ) : (
            <text x={W / 2} y={H / 2} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fill={RED}>
              Linkage cannot be assembled at this angle
            </text>
          )}

          {/* ground pins */}
          <GroundPin x={A[0]} y={A[1]} />
          <GroundPin x={D[0]} y={D[1]} />

          {/* labels */}
          <text x={A[0] - 16} y={A[1] - 30} fontFamily="Inter, sans-serif" fontSize="11.5" fill={PURPLE} fontWeight="700">Crank</text>
          <text x={D[0] + 10} y={D[1] - 30} fontFamily="Inter, sans-serif" fontSize="11.5" fill={ORANGE} fontWeight="700">Rocker</text>
          {B && <text x={B[0] + 10} y={B[1] - 10} fontFamily="Inter, sans-serif" fontSize="11" fill={PURPLE}>B</text>}
          {C && <text x={C[0] + 10} y={C[1] - 10} fontFamily="Inter, sans-serif" fontSize="11" fill={ORANGE}>C</text>}

          {/* crank angle readout */}
          <rect x={16} y={16} width={175} height={42} rx={8} fill="#f4f1fb" stroke="#c4b8ef" />
          <text x={26} y={42} fontFamily="Inter, sans-serif" fontSize="13" fill="#4b4b5e">
            crank θ = {(running ? snap.angle : crankAngle).toFixed(1)}°
          </text>
        </svg>
        <ControlBar>
          {!running && (
            <LabeledSlider label="crank θ" value={crankAngle} min={0} max={359} step={1}
              onChange={v => { setCrankAngle(v); traceRef.current = []; setSnap({ angle: v, trace: [] }); }}
              fmt={v => `${v.toFixed(0)}°`} color={PURPLE} width={200} />
          )}
          <WidgetButton onClick={() => {
            if (!running) { traceRef.current = []; angleRef.current = running ? snap.angle : crankAngle; }
            setRunning(r => !r);
          }} active={running}>
            {running ? "Stop" : "Animate crank"}
          </WidgetButton>
          {B && <Readout label="B" value={`(${B[0].toFixed(0)}, ${B[1].toFixed(0)})`} color={PURPLE} />}
          {C && <Readout label="C (coupler)" value={`(${C[0].toFixed(0)}, ${C[1].toFixed(0)})`} color={ORANGE} />}
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys7-fourbar-trace" met={fullRotation}>
        Animate the crank until the coupler curve closes into a full loop. Press "Animate crank"
        and let it run one complete revolution (360°).
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Instantaneous center of rotation
// ------------------------------------------------------------------
function InstantaneousCenter() {
  const [xWheel, setXWheel] = useState(300);
  const [velX, setVelX] = useState(3);
  const R = 55;

  // For rolling without slipping: ICR is at contact point
  // ω = v/R, vA = ω × rA (from ICR)
  const omega = velX / R;
  const icrX = xWheel;
  const icrY = H / 2 + R;

  // Velocity vectors at various points on the wheel
  const points = [
    { label: "top", dx: 0, dy: -R, desc: "2v" },
    { label: "center", dx: 0, dy: 0, desc: "v" },
    { label: "right", dx: R, dy: 0, desc: "v√2" },
    { label: "left", dx: -R, dy: 0, desc: "v√2" },
    { label: "contact", dx: 0, dy: R, desc: "0" },
  ];
  const velScale = 16;

  return (
    <>
      <WidgetShell
        title="Instantaneous center of rotation (ICR)"
        onReset={() => { setXWheel(300); setVelX(3); }}
        caption="For rolling without slipping, the ICR is always at the contact point. Every point's velocity is ω × r (from ICR)."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* ground */}
          <line x1={40} y1={H / 2 + R} x2={W - 40} y2={H / 2 + R} stroke="#8a8a9b" strokeWidth={2} />
          {[...Array(20)].map((_, i) => (
            <line key={i} x1={50 + i * 36} y1={H / 2 + R} x2={40 + i * 36} y2={H / 2 + R + 12} stroke="#c4c0b4" strokeWidth={1.2} />
          ))}

          {/* wheel */}
          <circle cx={xWheel} cy={H / 2} r={R} fill="none" stroke={BLUE} strokeWidth={3} />
          <circle cx={xWheel} cy={H / 2} r={5} fill={BLUE} />
          {/* spoke */}
          <line x1={xWheel} y1={H / 2} x2={xWheel + R} y2={H / 2} stroke={BLUE} strokeWidth={2} />

          {/* velocity vectors */}
          {points.map(p => {
            const px = xWheel + p.dx;
            const py = H / 2 + p.dy;
            // velocity = omega × r_from_ICR = omega × distance from ICR in x direction (perpendicular)
            const rx = px - icrX;
            const ry = py - icrY;
            const vx = -omega * ry * velScale;
            const vy = omega * rx * velScale;
            const len = Math.hypot(vx, vy);
            if (len < 2) {
              return (
                <g key={p.label}>
                  <circle cx={px} cy={py} r={5} fill={RED} />
                  <text x={px + 8} y={py - 8} fontFamily="Inter, sans-serif" fontSize="10.5" fill={RED}>
                    v=0 (ICR)
                  </text>
                </g>
              );
            }
            return (
              <g key={p.label}>
                <defs>
                  <marker id={`icr-${p.label}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={GREEN} />
                  </marker>
                </defs>
                <line x1={px} y1={py} x2={px + vx} y2={py + vy}
                  stroke={GREEN} strokeWidth={3} markerEnd={`url(#icr-${p.label})`} />
                <circle cx={px} cy={py} r={4} fill={PURPLE} />
                <text x={px + vx + 6} y={py + vy} fontFamily="Inter, sans-serif" fontSize="10.5" fill={GREEN}>
                  {p.desc}
                </text>
              </g>
            );
          })}

          {/* ICR marker */}
          <circle cx={icrX} cy={icrY} r={9} fill={RED} stroke="#fff" strokeWidth={2.5} />
          <text x={icrX + 14} y={icrY + 4} fontFamily="Inter, sans-serif" fontSize="12" fill={RED} fontWeight="700">ICR</text>

          {/* lines from ICR to points */}
          {points.map(p => (
            <line key={p.label} x1={icrX} y1={icrY} x2={xWheel + p.dx} y2={H / 2 + p.dy}
              stroke="#e0dcd0" strokeWidth={1} strokeDasharray="4 3" />
          ))}

          {/* wheel velocity */}
          <defs>
            <marker id="icr-vc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={PURPLE} />
            </marker>
          </defs>
          <line x1={xWheel - 30} y1={H / 2 - R - 30} x2={xWheel - 30 + velX * 18} y2={H / 2 - R - 30}
            stroke={PURPLE} strokeWidth={4} markerEnd="url(#icr-vc)" />
          <text x={xWheel - 30 + velX * 9} y={H / 2 - R - 40} textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="12" fill={PURPLE}>v = {velX} m/s</text>
        </svg>
        <ControlBar>
          <LabeledSlider label="v (m/s)" value={velX} min={-6} max={6} step={0.1} onChange={setVelX}
            fmt={v => `${v.toFixed(1)}`} color={PURPLE} />
          <Readout label="ω" value={`${omega.toFixed(3)} rad/s`} color={BLUE} />
          <Readout label="v_top" value={`${(2 * Math.abs(velX)).toFixed(2)} m/s`} color={GREEN} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys7-icr-verify" met={velX > 3}>
        Set the wheel velocity above 3 m/s and observe that the top of the wheel moves at
        exactly twice that speed. This is the ICR rule: points farther from the ICR move faster.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Rigid body velocity field
// ------------------------------------------------------------------
function RigidBodyVelocity() {
  const [vx, setVx] = useState(2);
  const [vy, setVy] = useState(0);
  const [omega, setOmega] = useState(1.5);

  const cx = W / 2;
  const cy = H / 2;
  // Grid of points
  const pts: { px: number; py: number; tvx: number; tvy: number }[] = [];
  for (let gx = -3; gx <= 3; gx++) {
    for (let gy = -3; gy <= 3; gy++) {
      if (gx === 0 && gy === 0) continue;
      const px = cx + gx * 60;
      const py = cy - gy * 60;
      // body-frame offsets in meters (1 grid square = 1 m, drawn at 60 px/m)
      const rx = gx, ry = gy;
      // v = v_cm + omega × r (2D: omega×r = [-omega*ry, omega*rx])
      const tvx = vx - omega * ry;
      const tvy = vy + omega * rx;
      pts.push({ px, py, tvx, tvy });
    }
  }

  const icrVisible = pts.some(p => Math.hypot(p.tvx, p.tvy) < 0.1);
  const icrMet = icrVisible && Math.hypot(vx, vy) >= 1 && Math.abs(omega) >= 0.5;

  return (
    <>
      <WidgetShell
        title="Rigid body velocity field"
        onReset={() => { setVx(2); setVy(0); setOmega(1.5); }}
        caption="Every point in a rigid body has velocity = translation of CM + rotation about CM. The field is linear."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* body outline */}
          <rect x={cx - 185} y={cy - 185} width={370} height={370} rx={8}
            fill="#f0eee8" stroke="#d6d2c4" strokeWidth={1.5} opacity={0.5} />

          {/* CM marker */}
          <circle cx={cx} cy={cy} r={10} fill={ORANGE} stroke="#fff" strokeWidth={2.5} />
          <text x={cx + 14} y={cy + 5} fontFamily="Inter, sans-serif" fontSize="11" fill={ORANGE} fontWeight="700">CM</text>

          {/* CM velocity */}
          <defs>
            <marker id="rv-cm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={PURPLE} />
            </marker>
          </defs>
          <line x1={cx} y1={cy} x2={cx + vx * 22} y2={cy - vy * 22}
            stroke={PURPLE} strokeWidth={4} markerEnd="url(#rv-cm)" />

          {/* field vectors */}
          {pts.map((p, i) => {
            const scale = 14;
            const len = Math.hypot(p.tvx, p.tvy);
            if (len < 0.05) return (
              <circle key={i} cx={p.px} cy={p.py} r={3} fill={BLUE} />
            );
            return (
              <g key={i}>
                <defs>
                  <marker id={`rv-${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={BLUE} />
                  </marker>
                </defs>
                <line x1={p.px} y1={p.py}
                  x2={p.px + p.tvx * scale} y2={p.py - p.tvy * scale}
                  stroke={BLUE} strokeWidth={2} markerEnd={`url(#rv-${i})`} opacity={0.7} />
                <circle cx={p.px} cy={p.py} r={3} fill={BLUE} opacity={0.5} />
              </g>
            );
          })}
        </svg>
        <ControlBar>
          <LabeledSlider label="v_x" value={vx} min={-4} max={4} step={0.1} onChange={setVx}
            fmt={v => `${v.toFixed(1)} m/s`} color={PURPLE} />
          <LabeledSlider label="v_y" value={vy} min={-4} max={4} step={0.1} onChange={setVy}
            fmt={v => `${v.toFixed(1)} m/s`} color={PURPLE} />
          <LabeledSlider label="ω" value={omega} min={-3} max={3} step={0.05} onChange={setOmega}
            fmt={v => `${v.toFixed(2)} rad/s`} color={ORANGE} />
          <Readout label="v_cm" value={`${Math.hypot(vx, vy).toFixed(2)} m/s`} color={PURPLE} />
          <Readout label="still point" value={icrVisible ? "on grid ✓" : "off grid"} color={icrVisible ? GREEN : "#8a8a9b"} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys7-field-icr" met={icrMet}>
        Make one grid dot's arrow vanish while the body is genuinely moving (
        <M>{"|\\mathbf{v}_{cm}| \\geq 1"}</M> m/s and <M>{"|\\omega| \\geq 0.5"}</M> rad/s).
        That still point is the instantaneous center of rotation: at this instant the whole
        field is a pure rotation about it. Hint: the still point sits at{" "}
        <M>{"(r_x, r_y) = (-v_y/\\omega,\\; v_x/\\omega)"}</M> — pick round numbers.
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
        <M>{"v_x = v_y = 0"}</M> for a pure pinwheel about the center. Now mix them and hunt
        for the challenge: with both knobs nonzero, there is <em>always</em> one point
        somewhere standing perfectly still, and around it the mixed field is again a pure
        pinwheel.
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
        <strong>Try this:</strong> read each green arrow as "distance from the red ICR dot,
        times ω." The contact point (zero distance) doesn't move; the hub (one radius away)
        moves at <M>{"v"}</M>; the top (two radii) at <M>{"2v"}</M>. This surprises almost
        everyone the first time: the top of your car's tires travels at twice your speedometer
        reading.
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
        <strong>Try this:</strong> scrub the crank slider slowly and watch the orange rocker:
        it swings back and forth even though the crank only ever goes forward — a rotation
        converted into an oscillation with zero gears. Then animate and watch the blue coupler
        point draw its strange closed curve. Windshield wipers, bicycle derailleurs, oil-pump
        walking beams, and the legs of many walking toys are all four-bars wearing costumes.
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
