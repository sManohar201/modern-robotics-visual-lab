import { useEffect, useRef, useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D } from "../../components/three/Scene3D";
import { rad, deg, wrapAngle, type Vec3 } from "../../lib/math/vec";

export default function Constraints() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 2"
        section="Configuration Space"
        title="Holonomic & Nonholonomic Constraints"
        lede="A car cannot move sideways. And yet it can end up one lane to the left. Resolving that paradox cleanly splits all constraints into two families."
      />

      <p>
        Some constraints restrict where a system can <em>be</em>. Mesh two gears together and
        their angles are locked to each other forever — knowing one tells you the other. Try it:
      </p>

      <GearPair />

      <p>
        The pair has two coordinates <M>{"(\\theta_1, \\theta_2)"}</M>, but the meshing imposes an
        equation <em>on the configuration itself</em>:
      </p>
      <Eq>{"g(\\theta_1, \\theta_2) \\;=\\; r_1\\theta_1 + r_2\\theta_2 \\;=\\; 0"}</Eq>
      <p>
        Such a constraint — expressible as <M>{"g(q) = 0"}</M> — is called{" "}
        <strong>holonomic</strong>. Each independent holonomic constraint slices the C-space down
        by one dimension: the gear pair's C-space is not the 2-D square but the 1-D line you saw
        being traced. Two coordinates, one dof.
      </p>

      <H2>Holonomic constraints in closed chains</H2>
      <p>
        In a closed-chain mechanism, the loop closure condition is precisely a holonomic
        constraint. Take a planar four-bar linkage with link lengths{" "}
        <M>{"l_1, l_2, l_3, l_4"}</M> and joint angles <M>{"\\theta_1, \\ldots, \\theta_4"}</M>.
        Tracing around the loop, the sum of all link vectors must return to the starting point:
      </p>
      <Eq>
        {"l_1 \\cos\\theta_1 + l_2 \\cos\\theta_2 + l_3 \\cos\\theta_3 - l_4 = 0"}
      </Eq>
      <Eq>
        {"l_1 \\sin\\theta_1 + l_2 \\sin\\theta_2 + l_3 \\sin\\theta_3 = 0"}
      </Eq>
      <p>
        These are two scalar equations in four joint angles — two holonomic constraints of the
        form <M>{"g(\\theta) = 0"}</M>. They reduce the four-angle system from 4 DOF to 2 DOF
        immediately. In practice the ground link fixes <M>{"\\theta_4"}</M>, reducing to 1 input.
        Every closed chain is described this way: the mechanism's configuration space is the
        manifold cut out by the loop closure equations inside the unconstrained joint space.
      </p>
      <p>
        Differentiating <M>{"g(\\theta) = 0"}</M> with respect to time gives the corresponding
        velocity constraint:
      </p>
      <Eq>{"\\frac{\\partial g}{\\partial \\theta}\\,\\dot{\\theta} = 0 \\qquad \\Longrightarrow \\qquad A(\\theta)\\,\\dot{\\theta} = 0"}</Eq>
      <p>
        where <M>{"A(\\theta) = \\partial g / \\partial \\theta"}</M> is the{" "}
        <strong>constraint Jacobian</strong>. This linear constraint on velocity{" "}
        <M>{"\\dot{\\theta}"}</M> is called a <strong>Pfaffian constraint</strong>. It is always
        linear in velocity — even when <M>{"g(\\theta)"}</M> is nonlinear in configuration —
        because differentiation with respect to time is a linear operation. For holonomic
        constraints, the Pfaffian form is always derivable from a configuration constraint. The
        crucial question is whether the reverse is true.
      </p>

      <H2>The car is different</H2>
      <p>
        A car on a parking lot has configuration <M>{"q = (x, y, \\theta)"}</M> — position plus
        heading, 3 coordinates. Its rolling wheels forbid sideways sliding: the velocity
        perpendicular to the heading must vanish,
      </p>
      <Eq>{"\\dot{x}\\,\\sin\\theta \\;-\\; \\dot{y}\\,\\cos\\theta \\;=\\; 0."}</Eq>
      <p>
        Notice what is constrained: not <M>{"q"}</M>, but <M>{"\\dot{q}"}</M>. This is a{" "}
        <strong>Pfaffian velocity constraint</strong> <M>{"A(q)\\dot{q} = 0"}</M>. The crucial
        question is whether it can be integrated into some <M>{"g(q) = 0"}</M> — whether the
        velocity restriction secretly fences off part of C-space. For the car it cannot, and you
        can <em>prove</em> it with your hands: park the car sideways.
      </p>

      <ParkingLot />

      <p>
        You just changed the car's <M>{"y"}</M> without ever once moving in the <M>{"y"}</M>{" "}
        direction the constraint forbids — wiggling through forward/backward arcs instead. A
        constraint like this, which restricts velocities but fences off <em>no</em> part of
        C-space, is called <strong>nonholonomic</strong>. The car's C-space stays fully
        3-dimensional; what shrinks is the menu of instantaneous motions: at every configuration,
        only a 2-D slice of the 3-D velocity space (drive + steer) is available.
      </p>

      <H2>The rolling coin: a complete nonholonomic example</H2>
      <p>
        The rolling coin is the cleanest worked example of a nonholonomic system, and it is worth
        treating fully. A thin coin rolls without slipping on a flat table. Its configuration
        requires four numbers:
      </p>
      <Eq>{"q = (x,\\, y,\\, \\phi,\\, \\theta)"}</Eq>
      <p>
        where <M>{"(x, y)"}</M> is the contact point's position on the table,{" "}
        <M>{"\\phi"}</M> is the heading angle (which direction the coin faces), and{" "}
        <M>{"\\theta"}</M> is the coin's spin angle (how much it has rolled). The C-space is
        four-dimensional: <M>{"\\mathbb{R}^2 \\times T^2"}</M>.
      </p>
      <p>
        Rolling without slipping means the contact point's velocity is exactly that produced by
        rolling. If the coin has radius <M>{"r"}</M>, this gives two scalar constraints on the
        velocities:
      </p>
      <Eq>{"\\dot{x} = r\\,\\dot{\\theta}\\cos\\phi"}</Eq>
      <Eq>{"\\dot{y} = r\\,\\dot{\\theta}\\sin\\phi"}</Eq>
      <p>
        In Pfaffian form <M>{"A(q)\\dot{q} = 0"}</M> with{" "}
        <M>{"\\dot{q} = (\\dot{x},\\,\\dot{y},\\,\\dot{\\phi},\\,\\dot{\\theta})^\\top"}</M>:
      </p>
      <Eq>
        {"\\begin{bmatrix} 1 & 0 & 0 & -r\\cos\\phi \\\\ 0 & 1 & 0 & -r\\sin\\phi \\end{bmatrix} \\begin{pmatrix} \\dot{x} \\\\ \\dot{y} \\\\ \\dot{\\phi} \\\\ \\dot{\\theta} \\end{pmatrix} = \\begin{pmatrix} 0 \\\\ 0 \\end{pmatrix}"}
      </Eq>
      <p>
        Two constraints on four velocity components leave two free velocity directions at each
        configuration: the coin can change its heading <M>{"\\dot{\\phi}"}</M> (steer) and its
        spin rate <M>{"\\dot{\\theta}"}</M> (roll). The contact velocity{" "}
        <M>{"(\\dot{x}, \\dot{y})"}</M> is then determined. So the coin has 2-dimensional
        instantaneous velocity freedom at every configuration, even though its C-space is
        4-dimensional.
      </p>
      <p>
        Are these constraints holonomic? Testing whether the matrix <M>{"A(q)"}</M> is the
        Jacobian of some function <M>{"g(q)"}</M> — the integrability condition — shows that it
        is not. There is no function <M>{"g(x, y, \\phi, \\theta)"}</M> whose zero set is the
        reachable configurations. The constraints are <strong>nonholonomic</strong>.
      </p>
      <p>
        The consequence is the same paradox as the car: the coin can reach every point in its
        4-dimensional C-space. From any starting position, heading, and spin, it can arrive at any
        other position, heading, and spin — it just cannot do it directly. A coin that needs to
        end up one meter to the left can be steered through a sequence of forward arcs: one arc to
        the left, counter-steer, arc back. The net result is lateral displacement achieved entirely
        through forward rolling and steering, with the no-slip constraint respected at every
        instant. Roll it yourself:
      </p>

      <RollingCoin />

      <KeyIdea>
        Holonomic constraints shrink <em>where you can be</em>: C-space loses dimensions.
        Nonholonomic constraints shrink <em>how you can move</em> at each instant — the velocity
        space is restricted — yet every configuration remains reachable through longer, curvier
        routes. For the rolling coin: 4-dimensional C-space, 2-dimensional instantaneous velocity
        space, every configuration reachable.
      </KeyIdea>

      <Aside>
        Counting for the car: 3-D C-space, 1 Pfaffian constraint, so 2-D of feasible velocities —
        matching its two controls (gas and steering). The test for whether a Pfaffian constraint
        integrates to a holonomic one is the Frobenius theorem; in Chapter 13 this becomes the
        foundation of wheeled-robot planning, where maneuvers like your parking wiggle are
        generated systematically (they are <em>Lie brackets</em> of the controls).
      </Aside>

      <BookRef>Modern Robotics §2.4 — Configuration and Velocity Constraints; §2.5 — Task Space and Workspace.</BookRef>
    </div>
  );
}

/* ================= widget: gear pair ================= */

const GW = 760;
const GH = 280;

function GearPair() {
  const [t1, setT1] = useState(0);
  const r1 = 60;
  const r2 = 95;
  const t2 = -(r1 / r2) * t1;
  const c1: [number, number] = [170, 140];
  const c2: [number, number] = [170 + r1 + r2 + 2, 140];

  // C-space plot
  const P = { cx: 570, cy: 140, half: 105 };
  const lim = rad(540);
  const px = P.cx + (t1 / lim) * P.half;
  const py = P.cy - (t2 / lim) * P.half;

  const spokes = (c: [number, number], r: number, t: number, n: number, color: string) =>
    Array.from({ length: n }, (_, i) => {
      const a = t + (i * 2 * Math.PI) / n;
      return (
        <line key={i} x1={c[0]} y1={c[1]} x2={c[0] + r * Math.cos(a)} y2={c[1] - r * Math.sin(a)}
          stroke={color} strokeWidth={i === 0 ? 3.5 : 1.2} opacity={i === 0 ? 1 : 0.4} />
      );
    });

  return (
    <WidgetShell
      title="A holonomic constraint: meshed gears"
      onReset={() => setT1(0)}
      caption={
        <>
          Two coordinates, but only one freedom: the configuration is pinned to the line{" "}
          <span className="mono">r₁θ₁ + r₂θ₂ = 0</span> in the (θ₁, θ₂) plane. The thick spoke
          marks each gear's zero direction.
        </>
      }
    >
      <svg viewBox={`0 0 ${GW} ${GH}`} className="w-full select-none">
        <circle cx={c1[0]} cy={c1[1]} r={r1} fill="#ece7f9" stroke="#6741d9" strokeWidth={2} />
        <circle cx={c2[0]} cy={c2[1]} r={r2} fill="#fbeede" stroke="#c2571c" strokeWidth={2} />
        {spokes(c1, r1, t1, 8, "#6741d9")}
        {spokes(c2, r2, t2, 12, "#c2571c")}
        <circle cx={c1[0]} cy={c1[1]} r={5} fill="#33343d" />
        <circle cx={c2[0]} cy={c2[1]} r={5} fill="#33343d" />

        {/* C-space plot */}
        <rect x={P.cx - P.half} y={P.cy - P.half} width={2 * P.half} height={2 * P.half} fill="#fff" stroke="#e4e1d8" />
        <text x={P.cx} y={P.cy + P.half + 22} fontSize="12.5" textAnchor="middle" fill="#4b4b5e" fontStyle="italic">θ₁</text>
        <text x={P.cx - P.half - 20} y={P.cy + 4} fontSize="12.5" fill="#4b4b5e" fontStyle="italic">θ₂</text>
        {/* the 1-D C-space: line θ2 = -(r1/r2)θ1 */}
        <line
          x1={P.cx - P.half} y1={P.cy - (P.half * r1) / r2}
          x2={P.cx + P.half} y2={P.cy + (P.half * r1) / r2}
          stroke="#2f9e44" strokeWidth={2.5}
        />
        <text x={P.cx + 8} y={P.cy - P.half + 16} fontSize="11" fill="#2f9e44" fontFamily="Inter, sans-serif">
          the actual C-space (1-D)
        </text>
        <circle cx={px} cy={py} r={6.5} fill="#d9483f" stroke="#fff" strokeWidth={2} />
      </svg>
      <ControlBar>
        <LabeledSlider label="θ₁" value={t1} min={-rad(540)} max={rad(540)} onChange={setT1}
          fmt={v => `${deg(v).toFixed(0)}°`} color="#6741d9" width={230} />
        <Readout label="θ₂ (forced)" value={`${deg(t2).toFixed(0)}°`} color="#c2571c" />
      </ControlBar>
    </WidgetShell>
  );
}

/* ================= widget: parallel parking ================= */

const PW = 760;
const PH = 400;
const WHEELBASE = 40;
const START = { x: 240, y: 280, th: 0 };
const SLOT = { x: 560, y: 96, th: 0 };

function ParkingLot() {
  const [pose, setPose] = useState(START);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [steer, setSteer] = useState(0);
  const drive = useRef(0); // -1, 0, 1
  const steerRef = useRef(0);
  const poseRef = useRef(START);
  steerRef.current = steer;

  // simulation loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (drive.current !== 0) {
        const sp = 95; // px/s
        const p = poseRef.current;
        const v = drive.current * sp * dt;
        const nx = p.x + v * Math.cos(p.th);
        const ny = p.y + v * Math.sin(p.th);
        const nth = p.th + (v / WHEELBASE) * Math.tan(steerRef.current);
        const np = {
          x: Math.min(PW - 30, Math.max(30, nx)),
          y: Math.min(PH - 30, Math.max(30, ny)),
          th: wrapAngle(nth),
        };
        poseRef.current = np;
        setPose(np);
        acc += Math.abs(v);
        if (acc > 6) {
          acc = 0;
          setTrail(t => (t.length > 600 ? [...t.slice(-600), [np.x, np.y]] : [...t, [np.x, np.y]]));
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { drive.current = 1; e.preventDefault(); }
      if (e.key === "ArrowDown") { drive.current = -1; e.preventDefault(); }
      if (e.key === "ArrowLeft") { setSteer(s => Math.max(-rad(35), s - rad(5))); e.preventDefault(); }
      if (e.key === "ArrowRight") { setSteer(s => Math.min(rad(35), s + rad(5))); e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") drive.current = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const reset = () => {
    poseRef.current = START;
    setPose(START);
    setTrail([]);
    setSteer(0);
  };

  const parked =
    Math.abs(pose.x - SLOT.x) < 16 &&
    Math.abs(pose.y - SLOT.y) < 12 &&
    Math.abs(deg(wrapAngle(pose.th - SLOT.th))) < 10;

  return (
    <>
      <WidgetShell
        title="Parallel parking — beating a constraint you can never violate"
        onReset={reset}
        caption={
          <>
            Drive with the buttons (hold) or arrow keys; steer with the slider or ←/→. The red
            crossed arrow is the direction the rolling constraint forbids — the direction you must
            somehow travel.
          </>
        }
      >
        <svg viewBox={`0 0 ${PW} ${PH}`} className="w-full select-none">
          {/* curb + parked cars defining the slot */}
          <line x1={0} y1={60} x2={PW} y2={60} stroke="#b9b5a8" strokeWidth={3} />
          <rect x={SLOT.x - 155} y={SLOT.y - 22} width={95} height={44} rx={8} fill="#d6d2c6" />
          <rect x={SLOT.x + 60} y={SLOT.y - 22} width={95} height={44} rx={8} fill="#d6d2c6" />
          <rect
            x={SLOT.x - 50} y={SLOT.y - 26} width={100} height={52} rx={8}
            fill={parked ? "#e3f3e5" : "#f5efdb"}
            stroke={parked ? "#2f9e44" : "#cdb96e"} strokeDasharray="6 5"
          />
          <text x={SLOT.x} y={SLOT.y - 34} textAnchor="middle" fontSize="11.5" fill="#988a56" fontFamily="Inter, sans-serif">
            park here, facing →
          </text>

          {/* trail */}
          {trail.length > 1 && (
            <polyline points={trail.map(p => p.join(",")).join(" ")} fill="none" stroke="#6741d9" strokeWidth={1.5} opacity={0.45} />
          )}

          {/* car */}
          <g transform={`translate(${pose.x} ${pose.y}) rotate(${deg(pose.th)})`}>
            {/* forbidden lateral direction */}
            <g opacity={0.9}>
              <line x1={0} y1={-18} x2={0} y2={-44} stroke="#d9483f" strokeWidth={2.5} />
              <polygon points="0,-52 -5,-42 5,-42" fill="#d9483f" />
              <line x1={-7} y1={-33} x2={7} y2={-19} stroke="#d9483f" strokeWidth={2.5} />
              <line x1={-7} y1={-19} x2={7} y2={-33} stroke="#d9483f" strokeWidth={2.5} />
            </g>
            <rect x={-30} y={-15} width={60} height={30} rx={7} fill="#3b6fd4" />
            <rect x={6} y={-12} width={16} height={24} rx={4} fill="#9db8e8" />
            {/* wheels: rear fixed, front steered */}
            <rect x={-26} y={-19} width={14} height={6} rx={2} fill="#33343d" />
            <rect x={-26} y={13} width={14} height={6} rx={2} fill="#33343d" />
            <g transform={`translate(19 -16) rotate(${deg(steer)})`}>
              <rect x={-7} y={-3} width={14} height={6} rx={2} fill="#33343d" />
            </g>
            <g transform={`translate(19 16) rotate(${deg(steer)})`}>
              <rect x={-7} y={-3} width={14} height={6} rx={2} fill="#33343d" />
            </g>
          </g>
        </svg>

        <ControlBar>
          <WidgetButton onClick={() => {}}>
            <span
              onPointerDown={() => (drive.current = -1)}
              onPointerUp={() => (drive.current = 0)}
              onPointerLeave={() => (drive.current = 0)}
            >
              ◀ reverse (hold)
            </span>
          </WidgetButton>
          <WidgetButton onClick={() => {}}>
            <span
              onPointerDown={() => (drive.current = 1)}
              onPointerUp={() => (drive.current = 0)}
              onPointerLeave={() => (drive.current = 0)}
            >
              forward (hold) ▶
            </span>
          </WidgetButton>
          <LabeledSlider label="steer" value={steer} min={-rad(35)} max={rad(35)} onChange={setSteer}
            fmt={v => `${deg(v).toFixed(0)}°`} width={150} />
          <Readout label="(x, y, θ)" value={`(${pose.x.toFixed(0)}, ${(PH - pose.y).toFixed(0)}, ${deg(-pose.th).toFixed(0)}°)`} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch2-park" met={parked}>
        Parallel-park into the dashed slot (within tolerance, heading within 10°). You'll need the
        classic wiggle: reverse while steering, counter-steer, pull forward. Every move respects
        the no-sideways rule, yet the net effect is exactly a sideways displacement.
      </Challenge>
    </>
  );
}

/* ================= widget: rolling coin ================= */

const CR = 0.32; // coin radius
const CPLANE = -0.7; // table height (math z)
const CSTART = { x: -0.5, y: -0.4, phi: 0, th: 0 };
const CLIM = 1.7; // table half-extent

function RollingCoin() {
  const [pose, setPose] = useState(CSTART);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const roll = useRef(0); // -1, 0, 1
  const steer = useRef(0); // -1, 0, 1
  const poseRef = useRef(CSTART);

  // simulation loop: integrate the Pfaffian-feasible velocities only
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (roll.current !== 0 || steer.current !== 0) {
        const p = poseRef.current;
        const dth = roll.current * 4.2 * dt; // spin rate
        const nphi = wrapAngle(p.phi + steer.current * 2.0 * dt);
        const nx = Math.min(CLIM, Math.max(-CLIM, p.x + CR * dth * Math.cos(nphi)));
        const ny = Math.min(CLIM, Math.max(-CLIM, p.y + CR * dth * Math.sin(nphi)));
        const np = { x: nx, y: ny, phi: nphi, th: p.th + dth };
        poseRef.current = np;
        setPose(np);
        acc += Math.abs(CR * dth) + Math.abs(steer.current * 2.0 * dt) * 0.02;
        if (acc > 0.045) {
          acc = 0;
          setTrail(t => (t.length > 500 ? [...t.slice(-500), [np.x, np.y]] : [...t, [np.x, np.y]]));
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // keyboard: W/S roll, A/D steer (arrows belong to the parking widget above)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w") roll.current = 1;
      if (k === "s") roll.current = -1;
      if (k === "a") steer.current = 1;
      if (k === "d") steer.current = -1;
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "s") roll.current = 0;
      if (k === "a" || k === "d") steer.current = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const reset = () => {
    poseRef.current = CSTART;
    setPose(CSTART);
    setTrail([]);
  };

  const parked =
    Math.abs(pose.x - CSTART.x) < 0.13 &&
    Math.abs(pose.y - CSTART.y) < 0.13 &&
    Math.abs(deg(wrapAngle(pose.phi - Math.PI))) < 15;

  const trail3d: Vec3[] = trail.map(p => [p[0], p[1], CPLANE + 0.005]);
  const headingTick: Vec3[] = [
    [pose.x, pose.y, CPLANE + 0.01],
    [pose.x + 0.45 * Math.cos(pose.phi), pose.y + 0.45 * Math.sin(pose.phi), CPLANE + 0.01],
  ];
  const startRing: Vec3[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    startRing.push([CSTART.x + 0.15 * Math.cos(a), CSTART.y + 0.15 * Math.sin(a), CPLANE + 0.008]);
  }
  const goalTick: Vec3[] = [
    [CSTART.x, CSTART.y, CPLANE + 0.008],
    [CSTART.x - 0.3, CSTART.y, CPLANE + 0.008], // reversed heading: -x
  ];

  return (
    <>
      <WidgetShell
        title="The rolling coin — 2 controls exploring a 4-D C-space"
        onReset={reset}
        caption={
          <>
            Hold the buttons, or use <span className="mono">W/S</span> to roll and{" "}
            <span className="mono">A/D</span> to steer. The contact point can never slide sideways
            — every velocity obeys both Pfaffian constraints — yet position, heading{" "}
            <em>and</em> spin are all yours to choose. Drag the view to orbit.
          </>
        }
      >
        <Scene3D camera={[2.6, 2.3, 3.0]} height={400}>
          {/* table */}
          <mesh position={[0, 0, CPLANE - 0.01]}>
            <planeGeometry args={[2 * CLIM + 0.6, 2 * CLIM + 0.6]} />
            <meshStandardMaterial color="#eae6da" />
          </mesh>

          {/* start / goal marker (gold): return here, heading reversed */}
          <Line points={startRing} color="#caa53d" lineWidth={2.5} />
          <Line points={goalTick} color="#caa53d" lineWidth={3} />

          {/* trail of the contact point */}
          {trail3d.length > 1 && <Line points={trail3d} color="#6741d9" lineWidth={2} transparent opacity={0.6} />}

          {/* heading arrow on the table */}
          <Line points={headingTick} color="#6741d9" lineWidth={2.5} />

          {/* the coin: heading group, then spin about the rolling axis (local y) */}
          <group position={[pose.x, pose.y, CPLANE + CR]} rotation={[0, 0, pose.phi]}>
            <group rotation={[0, pose.th, 0]}>
              <mesh>
                <cylinderGeometry args={[CR, CR, 0.045, 48]} />
                <meshStandardMaterial color="#c2571c" metalness={0.35} roughness={0.4} />
              </mesh>
              {/* spin marker: a radius line + rim dot, so θ is visible */}
              <Line points={[[0, 0.026, 0], [CR * 0.92, 0.026, 0]]} color="#fbf7e8" lineWidth={2.5} />
              <mesh position={[CR * 0.82, 0.03, 0]}>
                <sphereGeometry args={[0.035, 12, 12]} />
                <meshStandardMaterial color="#d9483f" />
              </mesh>
            </group>
          </group>
        </Scene3D>

        <ControlBar>
          <WidgetButton onClick={() => {}}>
            <span
              onPointerDown={() => (roll.current = 1)}
              onPointerUp={() => (roll.current = 0)}
              onPointerLeave={() => (roll.current = 0)}
            >
              roll ▲ (hold)
            </span>
          </WidgetButton>
          <WidgetButton onClick={() => {}}>
            <span
              onPointerDown={() => (roll.current = -1)}
              onPointerUp={() => (roll.current = 0)}
              onPointerLeave={() => (roll.current = 0)}
            >
              roll ▼ (hold)
            </span>
          </WidgetButton>
          <WidgetButton onClick={() => {}}>
            <span
              onPointerDown={() => (steer.current = 1)}
              onPointerUp={() => (steer.current = 0)}
              onPointerLeave={() => (steer.current = 0)}
            >
              ↺ steer
            </span>
          </WidgetButton>
          <WidgetButton onClick={() => {}}>
            <span
              onPointerDown={() => (steer.current = -1)}
              onPointerUp={() => (steer.current = 0)}
              onPointerLeave={() => (steer.current = 0)}
            >
              steer ↻
            </span>
          </WidgetButton>
          <Readout
            label="(x, y, φ, θ)"
            value={`(${pose.x.toFixed(2)}, ${pose.y.toFixed(2)}, ${deg(pose.phi).toFixed(0)}°, ${deg(pose.th).toFixed(0)}°)`}
          />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch2-coin-park" met={parked}>
        Take the coin for a loop, then bring its contact point back inside the gold ring —{" "}
        <strong>facing the opposite way</strong> (heading within 15° of 180°). You will have changed{" "}
        <M>{"\\phi"}</M> by π and returned <M>{"(x, y)"}</M> to the start using only the two
        velocity directions the constraints allow: full reachability, zero constraint violations.
      </Challenge>
    </>
  );
}
