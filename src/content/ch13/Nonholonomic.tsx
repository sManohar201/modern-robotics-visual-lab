import { useEffect, useRef, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { deg, rad, wrapAngle, clamp } from "../../lib/math/vec";

/* ============================================================
   Page 13.1 — Pfaffian & Nonholonomic Constraints
   A top-down car-like (bicycle model) robot. The user drives it
   with a drive input v and a steering angle psi; the integrated
   kinematics are the simplified car of MR Eq. (13.16)/(13.18):
       phi_dot = (v/L) tan(psi)
       x_dot   = v cos phi
       y_dot   = v sin phi
   The Pfaffian no-side-slip constraint is A(q) q_dot =
       [0  sin phi  -cos phi] q_dot = x_dot sin phi - y_dot cos phi = 0.
   ============================================================ */

// SVG canvas (pixels). y grows downward; we flip when reading out world y.
const PW = 760;
const PH = 420;
const PX_PER_M = 42; // pixels per metre
const WHEELBASE_M = 1.1; // L, metres
const CAR_LEN = 1.7; // drawn body length, metres
const CAR_WID = 0.85; // drawn body width, metres
const STEER_MAX = rad(38);
const DRIVE_SPEED = 2.4; // m/s at full throttle

// the parking slot (centre), heading 0 (facing +x), in world metres
const SLOT = { x: 11.5, y: 2.0, phi: 0 };
const SLOT_LEN = 2.5; // along x
const SLOT_WID = 1.15; // along y
const START = { x: 3.5, y: 5.2, phi: 0 };

// parked cars bracketing the slot (axis-aligned, world metres)
const PARKED = [
  { cx: SLOT.x - SLOT_LEN / 2 - CAR_LEN / 2 - 0.3, cy: SLOT.y, w: CAR_LEN, h: CAR_WID },
  { cx: SLOT.x + SLOT_LEN / 2 + CAR_LEN / 2 + 0.3, cy: SLOT.y, w: CAR_LEN, h: CAR_WID },
];
const CURB_Y = 0.2; // world y of the curb line (cars park against it)

function toPx(x: number, y: number): [number, number] {
  return [x * PX_PER_M, PH - y * PX_PER_M];
}

type Pose = { x: number; y: number; phi: number };

// the four body corners of a car of given length/width centred at pose
function corners(p: Pose, len: number, wid: number): [number, number][] {
  const c = Math.cos(p.phi), s = Math.sin(p.phi);
  const hl = len / 2, hw = wid / 2;
  const local: [number, number][] = [
    [hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw],
  ];
  return local.map(([lx, ly]) => [p.x + lx * c - ly * s, p.y + lx * s + ly * c]);
}

// axis-aligned-box vs oriented car overlap, using point-in-box + a coarse
// edge sampling (good enough to honestly forbid overlapping the parked cars).
function pointInBox(px: number, py: number, b: { cx: number; cy: number; w: number; h: number }) {
  return Math.abs(px - b.cx) <= b.w / 2 && Math.abs(py - b.cy) <= b.h / 2;
}
function carHitsBox(p: Pose, b: { cx: number; cy: number; w: number; h: number }): boolean {
  const cs = corners(p, CAR_LEN, CAR_WID);
  // sample along the car's perimeter so a corner near an edge still trips it
  for (let i = 0; i < 4; i++) {
    const a = cs[i], bb = cs[(i + 1) % 4];
    for (let t = 0; t <= 1; t += 0.2) {
      const x = a[0] + (bb[0] - a[0]) * t;
      const y = a[1] + (bb[1] - a[1]) * t;
      if (pointInBox(x, y, b)) return true;
    }
  }
  // also box corners inside the car (handles the car straddling the box)
  const bc: [number, number][] = [
    [b.cx - b.w / 2, b.cy - b.h / 2], [b.cx + b.w / 2, b.cy - b.h / 2],
    [b.cx + b.w / 2, b.cy + b.h / 2], [b.cx - b.w / 2, b.cy + b.h / 2],
  ];
  const ccs = corners(p, CAR_LEN, CAR_WID);
  const cphi = Math.cos(-p.phi), sphi = Math.sin(-p.phi);
  for (const [bx, by] of bc) {
    const dx = bx - p.x, dy = by - p.y;
    const lx = dx * cphi - dy * sphi;
    const ly = dx * sphi + dy * cphi;
    if (Math.abs(lx) <= CAR_LEN / 2 && Math.abs(ly) <= CAR_WID / 2) return true;
  }
  void ccs;
  return false;
}

export default function Nonholonomic() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 13"
        section="Wheeled Mobile Robots"
        title="Pfaffian & Nonholonomic Constraints"
        lede="A car has three configuration coordinates but only two controls. The missing direction — pure sideways slide — is forbidden at every instant, yet it can still be reached. That gap between instantaneous and reachable motion is the whole story of nonholonomy."
      />

      <p>
        A wheeled chassis in the plane has configuration{" "}
        <M>{"q = (\\phi, x, y)"}</M>: a heading and a position. We track the velocity either as{" "}
        <M>{"\\dot q = (\\dot\\phi, \\dot x, \\dot y)"}</M> or as the body twist{" "}
        <M>{"\\mathcal{V}_b = (\\omega_{bz}, v_{bx}, v_{by})"}</M> expressed in the chassis frame{" "}
        <M>{"\\{b\\}"}</M>. The two are related by a planar rotation:
      </p>
      <Eq>{"\\mathcal{V}_b = \\begin{bmatrix} \\omega_{bz} \\\\ v_{bx} \\\\ v_{by} \\end{bmatrix} = \\begin{bmatrix} 1 & 0 & 0 \\\\ 0 & \\cos\\phi & \\sin\\phi \\\\ 0 & -\\sin\\phi & \\cos\\phi \\end{bmatrix} \\begin{bmatrix} \\dot\\phi \\\\ \\dot x \\\\ \\dot y \\end{bmatrix}."}</Eq>

      <H2>The no-side-slip constraint</H2>
      <p>
        A conventional wheel rolls forward and is optionally steered, but it{" "}
        <strong>cannot slide sideways</strong>. For the chassis this means the body-frame lateral
        velocity must vanish, <M>{"v_{by} = 0"}</M>. Reading off the second row of the rotation
        above, that single scalar condition is a <strong>Pfaffian velocity constraint</strong>{" "}
        <M>{"A(q)\\,\\dot q = 0"}</M>:
      </p>
      <Eq>{"A(q)\\,\\dot q = \\begin{bmatrix} 0 & \\sin\\phi & -\\cos\\phi \\end{bmatrix} \\begin{bmatrix} \\dot\\phi \\\\ \\dot x \\\\ \\dot y \\end{bmatrix} = \\dot x \\sin\\phi - \\dot y \\cos\\phi = 0."}</Eq>
      <p>
        One equation on a three-dimensional velocity removes one instantaneous degree of freedom,
        leaving a two-dimensional set of feasible velocities at every configuration — exactly the
        car's two controls: drive and steer. The drawn red arrow in the widget below is the{" "}
        <em>forbidden</em> direction <M>{"\\hat y_b"}</M>; the green arrow is the actual chassis
        velocity, which always lies along the heading.
      </p>

      <H2>Car (bicycle) kinematics</H2>
      <p>
        Model the car as a bicycle: a fixed rear wheel at the reference point{" "}
        <M>{"(x, y)"}</M> and a virtual steered front wheel a wheelbase <M>{"\\ell"}</M> ahead,
        at steering angle <M>{"\\psi"}</M>. With forward speed <M>{"v"}</M> the simplified
        kinematics are
      </p>
      <Eq>{"\\dot q = \\begin{bmatrix} \\dot\\phi \\\\ \\dot x \\\\ \\dot y \\end{bmatrix} = \\begin{bmatrix} (\\tan\\psi)/\\ell \\\\ \\cos\\phi \\\\ \\sin\\phi \\end{bmatrix} v = \\begin{bmatrix} 0 \\\\ \\cos\\phi \\\\ \\sin\\phi \\end{bmatrix} v + \\begin{bmatrix} 1 \\\\ 0 \\\\ 0 \\end{bmatrix} \\omega,"}</Eq>
      <p>
        writing <M>{"\\omega = (v/\\ell)\\tan\\psi"}</M> for the turn rate. These are the two
        control vector fields <M>{"g_1"}</M> (drive) and <M>{"g_2"}</M> (turn). You can verify by
        substitution that <M>{"\\dot x \\sin\\phi - \\dot y \\cos\\phi = v\\cos\\phi\\sin\\phi - v\\sin\\phi\\cos\\phi = 0"}</M>:
        the kinematics never violate the Pfaffian constraint.
      </p>

      <CarSandbox />

      <H2>Reaching the unreachable: the Lie bracket</H2>
      <p>
        If the car can never move along <M>{"\\hat y_b"}</M>, how does it end up one slot to the
        side? By <em>alternating</em> the two allowed motions. Following <M>{"g_1"}</M> for a short
        time, then <M>{"g_2"}</M>, then <M>{"-g_1"}</M>, then <M>{"-g_2"}</M> does not return to
        the start — it leaves a net displacement in the direction of the{" "}
        <strong>Lie bracket</strong>:
      </p>
      <Eq>{"g_3 = [g_1, g_2] = \\frac{\\partial g_2}{\\partial q}g_1 - \\frac{\\partial g_1}{\\partial q}g_2 = \\begin{bmatrix} 0 \\\\ \\sin\\phi \\\\ -\\cos\\phi \\end{bmatrix}."}</Eq>
      <p>
        That bracket points exactly along the forbidden lateral direction. Because{" "}
        <M>{"\\det[\\,g_1\\;g_2\\;g_3\\,] = 1 \\ne 0"}</M> for all <M>{"\\phi"}</M>, the three
        vector fields span the whole tangent space: the Lie algebra is full rank, so the car is{" "}
        <strong>small-time locally controllable</strong> and can reach any{" "}
        <M>{"(\\phi, x, y)"}</M>. The catch — visible in your own driving — is that bracket motion
        is <em>slow</em>: a wiggle of size <M>{"\\epsilon"}</M> in the controls buys only{" "}
        <M>{"\\epsilon^2"}</M> of sideways travel. Parking is tedious precisely because it lives
        on the Lie bracket.
      </p>

      <ParkingChallenge />

      <KeyIdea>
        The no-side-slip rule is a single Pfaffian constraint{" "}
        <M>{"\\dot x \\sin\\phi - \\dot y \\cos\\phi = 0"}</M> — it shrinks the{" "}
        <em>instantaneous</em> velocity set from 3-D to 2-D, but it is{" "}
        <strong>nonholonomic</strong>: it cannot be integrated into any constraint on{" "}
        <M>{"q"}</M> itself. The full 3-D configuration space stays reachable through Lie-bracket
        maneuvers like parallel parking, just slowly.
      </KeyIdea>

      <Aside>
        Drop the steering rate and you get the canonical model{" "}
        <M>{"\\dot q = g_1(q)\\,v + g_2(q)\\,\\omega"}</M> shared by the unicycle, the
        differential-drive robot, and the car — they differ only in the limits on{" "}
        <M>{"(v, \\omega)"}</M>. A car with a reverse gear has{" "}
        <M>{"\\mathrm{pos}(\\mathcal{U}) = \\mathbb{R}^2"}</M> and is STLC; a forward-only car has
        only <M>{"\\mathrm{span}(\\mathcal{U}) = \\mathbb{R}^2"}</M> and is merely small-time
        locally accessible — it still parks, just never straight backward in a tight spot.
      </Aside>

      <BookRef>Modern Robotics §13.3 — Nonholonomic Wheeled Mobile Robots (Eqs. 13.16–13.18, 13.28); §2.4 — Pfaffian constraints.</BookRef>
    </div>
  );
}

/* ================= widget: free-driving sandbox (shows the constraint) ================= */

function CarSandbox() {
  const [pose, setPose] = useState<Pose>({ x: 9, y: 5, phi: 0 });
  const [steer, setSteer] = useState(0);
  const [reverse, setReverse] = useState(false);
  const drive = useRef(0); // -1, 0, 1 (throttle held)
  const steerRef = useRef(0);
  const poseRef = useRef<Pose>({ x: 9, y: 5, phi: 0 });
  const revRef = useRef(false);
  steerRef.current = steer;
  revRef.current = reverse;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const throttle = drive.current * (revRef.current ? -1 : 1);
      if (throttle !== 0) {
        const p = poseRef.current;
        const v = throttle * DRIVE_SPEED;
        const nphi = wrapAngle(p.phi + (v / WHEELBASE_M) * Math.tan(steerRef.current) * dt);
        const nx = clamp(p.x + v * Math.cos(p.phi) * dt, 0.8, PW / PX_PER_M - 0.8);
        const ny = clamp(p.y + v * Math.sin(p.phi) * dt, 0.8, PH / PX_PER_M - 0.8);
        const np = { x: nx, y: ny, phi: nphi };
        poseRef.current = np;
        setPose(np);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const reset = () => {
    const p = { x: 9, y: 5, phi: 0 };
    poseRef.current = p;
    setPose(p);
    setSteer(0);
    setReverse(false);
  };

  // body velocity for the readout / arrows
  const v = (drive.current * (reverse ? -1 : 1)) * DRIVE_SPEED;
  const vWorld: [number, number] = [v * Math.cos(pose.phi), v * Math.sin(pose.phi)];
  const sideSlip = vWorld[0] * Math.sin(pose.phi) - vWorld[1] * Math.cos(pose.phi); // == 0

  const cs = corners(pose, CAR_LEN, CAR_WID).map(([x, y]) => toPx(x, y));
  const [cx, cy] = toPx(pose.x, pose.y);

  // heading (forward, green) and forbidden lateral (red) arrows, in px
  const headLen = 1.4 * PX_PER_M;
  const hdx = Math.cos(pose.phi) * headLen, hdy = -Math.sin(pose.phi) * headLen;
  const latLen = 1.0 * PX_PER_M;
  const ldx = -Math.sin(pose.phi) * latLen, ldy = -Math.cos(pose.phi) * latLen;

  return (
    <WidgetShell
      title="Drive the bicycle model — watch the constraint"
      onReset={reset}
      caption={
        <>
          Hold <strong>drive</strong> and set the <strong>steering angle</strong>{" "}
          <M>{"\\psi"}</M>; toggle <strong>reverse</strong> for the other gear. The{" "}
          <span style={{ color: "#2f9e44" }}>green arrow</span> is the chassis velocity (always on
          the heading), the <span style={{ color: "#d9483f" }}>crossed red arrow</span> is the{" "}
          <M>{"\\hat y_b"}</M> direction the no-slip constraint forbids. The body lateral speed{" "}
          <M>{"v_{by}"}</M> stays pinned at zero no matter how you drive.
        </>
      }
    >
      <svg viewBox={`0 0 ${PW} ${PH}`} className="w-full select-none">
        <rect x={0} y={0} width={PW} height={PH} fill="#f7f5ef" />
        {/* light grid */}
        {Array.from({ length: Math.floor(PW / PX_PER_M) + 1 }, (_, i) => (
          <line key={`v${i}`} x1={i * PX_PER_M} y1={0} x2={i * PX_PER_M} y2={PH} stroke="#ece8dc" strokeWidth={1} />
        ))}
        {Array.from({ length: Math.floor(PH / PX_PER_M) + 1 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * PX_PER_M} x2={PW} y2={i * PX_PER_M} stroke="#ece8dc" strokeWidth={1} />
        ))}

        {/* car body */}
        <polygon points={cs.map(p => p.join(",")).join(" ")} fill="#3b6fd4" stroke="#274d96" strokeWidth={2} />
        {/* windshield hint toward front */}
        <circle cx={cx + Math.cos(pose.phi) * 0.45 * PX_PER_M} cy={cy - Math.sin(pose.phi) * 0.45 * PX_PER_M} r={5} fill="#9db8e8" />

        {/* forbidden lateral direction (red, crossed out) */}
        <line x1={cx} y1={cy} x2={cx + ldx} y2={cy + ldy} stroke="#d9483f" strokeWidth={3} />
        <line x1={cx + ldx * 0.55 - 7} y1={cy + ldy * 0.55 - 7} x2={cx + ldx * 0.55 + 7} y2={cy + ldy * 0.55 + 7} stroke="#d9483f" strokeWidth={2.5} />
        <line x1={cx + ldx * 0.55 - 7} y1={cy + ldy * 0.55 + 7} x2={cx + ldx * 0.55 + 7} y2={cy + ldy * 0.55 - 7} stroke="#d9483f" strokeWidth={2.5} />

        {/* heading velocity (green) */}
        <line x1={cx} y1={cy} x2={cx + hdx} y2={cy + hdy} stroke="#2f9e44" strokeWidth={3.5} />
        <polygon
          points={`${cx + hdx},${cy + hdy} ${cx + hdx - 9 * Math.cos(pose.phi - 0.5)},${cy + hdy + 9 * Math.sin(pose.phi - 0.5)} ${cx + hdx - 9 * Math.cos(pose.phi + 0.5)},${cy + hdy + 9 * Math.sin(pose.phi + 0.5)}`}
          fill="#2f9e44"
        />
      </svg>

      <div className="ui flex flex-wrap items-center gap-x-6 gap-y-3 mt-3">
        <WidgetButton onClick={() => {}}>
          <span
            onPointerDown={() => (drive.current = 1)}
            onPointerUp={() => (drive.current = 0)}
            onPointerLeave={() => (drive.current = 0)}
          >
            ▲ drive (hold)
          </span>
        </WidgetButton>
        <WidgetButton active={reverse} onClick={() => setReverse(r => !r)}>reverse: {reverse ? "on" : "off"}</WidgetButton>
        <LabeledSlider label={<M>{"\\psi"}</M>} value={steer} min={-STEER_MAX} max={STEER_MAX} step={rad(1)} onChange={setSteer} fmt={x => `${deg(x).toFixed(0)}°`} width={170} />
        <Readout label={<M>{"v_{by}"}</M>} value={`${sideSlip.toFixed(3)} m/s`} color="var(--good)" />
        <Readout label={<M>{"(\\phi,x,y)"}</M>} value={`(${deg(pose.phi).toFixed(0)}°, ${pose.x.toFixed(1)}, ${pose.y.toFixed(1)})`} />
      </div>
    </WidgetShell>
  );
}

/* ================= widget: parallel parking challenge ================= */

function ParkingChallenge() {
  const [pose, setPose] = useState<Pose>({ ...START });
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [steer, setSteer] = useState(0);
  const drive = useRef(0);
  const steerRef = useRef(0);
  const poseRef = useRef<Pose>({ ...START });
  steerRef.current = steer;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const step = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      if (drive.current !== 0) {
        const p = poseRef.current;
        const v = drive.current * DRIVE_SPEED;
        const nphi = wrapAngle(p.phi + (v / WHEELBASE_M) * Math.tan(steerRef.current) * dt);
        const nx = clamp(p.x + v * Math.cos(p.phi) * dt, 1.0, PW / PX_PER_M - 1.0);
        const ny = clamp(p.y + v * Math.sin(p.phi) * dt, 1.0, PH / PX_PER_M - 1.0);
        const np = { x: nx, y: ny, phi: nphi };
        poseRef.current = np;
        setPose(np);
        acc += Math.abs(v * dt);
        if (acc > 0.12) {
          acc = 0;
          setTrail(t => (t.length > 700 ? [...t.slice(-700), [nx, ny]] : [...t, [nx, ny]]));
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
      if (e.key === "ArrowLeft") { setSteer(s => clamp(s + rad(4), -STEER_MAX, STEER_MAX)); e.preventDefault(); }
      if (e.key === "ArrowRight") { setSteer(s => clamp(s - rad(4), -STEER_MAX, STEER_MAX)); e.preventDefault(); }
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
    poseRef.current = { ...START };
    setPose({ ...START });
    setTrail([]);
    setSteer(0);
  };

  const hitParked = PARKED.some(b => carHitsBox(pose, b));
  const inSlot =
    Math.abs(pose.x - SLOT.x) < 0.45 &&
    Math.abs(pose.y - SLOT.y) < 0.30 &&
    Math.abs(deg(wrapAngle(pose.phi - SLOT.phi))) < 9;
  const parked = inSlot && !hitParked;

  const cs = corners(pose, CAR_LEN, CAR_WID).map(([x, y]) => toPx(x, y));
  const [cx, cy] = toPx(pose.x, pose.y);

  return (
    <>
      <WidgetShell
        title="Parallel park — a Lie-bracket maneuver"
        onReset={reset}
        caption={
          <>
            Drive with <span className="mono">↑ / ↓</span> (or the hold-buttons) and steer with{" "}
            <span className="mono">← / →</span>. Slide the car into the dashed slot facing right,
            within tolerance, <strong>without touching the parked cars</strong>. There is no
            sideways control — you must wiggle: reverse turning in, counter-steer, ease forward.
          </>
        }
      >
        <svg viewBox={`0 0 ${PW} ${PH}`} className="w-full select-none">
          <rect x={0} y={0} width={PW} height={PH} fill="#f7f5ef" />
          {/* curb line */}
          {(() => { const [, yc] = toPx(0, CURB_Y); return <line x1={0} y1={yc} x2={PW} y2={yc} stroke="#b9b5a8" strokeWidth={4} />; })()}

          {/* slot */}
          {(() => {
            const [sx, sy] = toPx(SLOT.x, SLOT.y);
            const w = SLOT_LEN * PX_PER_M, h = SLOT_WID * PX_PER_M;
            return (
              <>
                <rect
                  x={sx - w / 2} y={sy - h / 2} width={w} height={h} rx={6}
                  fill={parked ? "#e3f3e5" : "#f5efdb"}
                  stroke={parked ? "#2f9e44" : "#cdb96e"} strokeWidth={2} strokeDasharray="7 5"
                />
                <text x={sx} y={sy - h / 2 - 8} textAnchor="middle" fontSize="12" fill="#988a56" fontFamily="Inter, sans-serif">
                  park here, facing →
                </text>
              </>
            );
          })()}

          {/* parked cars */}
          {PARKED.map((b, i) => {
            const [bx, by] = toPx(b.cx, b.cy);
            return (
              <rect key={i} x={bx - (b.w * PX_PER_M) / 2} y={by - (b.h * PX_PER_M) / 2}
                width={b.w * PX_PER_M} height={b.h * PX_PER_M} rx={7} fill="#d6d2c6" stroke="#a8a496" strokeWidth={1.5} />
            );
          })}

          {/* trail */}
          {trail.length > 1 && (
            <polyline points={trail.map(([x, y]) => toPx(x, y).join(",")).join(" ")} fill="none" stroke="#6741d9" strokeWidth={1.5} opacity={0.45} />
          )}

          {/* car */}
          <polygon
            points={cs.map(p => p.join(",")).join(" ")}
            fill={hitParked ? "#d9483f" : "#3b6fd4"}
            stroke={hitParked ? "#a4271f" : "#274d96"} strokeWidth={2}
          />
          <circle cx={cx + Math.cos(pose.phi) * 0.45 * PX_PER_M} cy={cy - Math.sin(pose.phi) * 0.45 * PX_PER_M} r={5} fill="#cfe0f7" />
        </svg>

        <div className="ui flex flex-wrap items-center gap-x-6 gap-y-3 mt-3">
          <WidgetButton onClick={() => {}}>
            <span onPointerDown={() => (drive.current = -1)} onPointerUp={() => (drive.current = 0)} onPointerLeave={() => (drive.current = 0)}>
              ◀ reverse (hold)
            </span>
          </WidgetButton>
          <WidgetButton onClick={() => {}}>
            <span onPointerDown={() => (drive.current = 1)} onPointerUp={() => (drive.current = 0)} onPointerLeave={() => (drive.current = 0)}>
              forward (hold) ▶
            </span>
          </WidgetButton>
          <LabeledSlider label="steer" value={steer} min={-STEER_MAX} max={STEER_MAX} step={rad(1)} onChange={setSteer} fmt={x => `${deg(x).toFixed(0)}°`} width={150} />
          <Readout label="in slot" value={inSlot ? "yes" : "no"} color={inSlot ? "var(--good)" : "var(--ink-faint)"} />
          <Readout label="contact" value={hitParked ? "HIT" : "clear"} color={hitParked ? "var(--bad)" : "var(--good)"} />
        </div>
      </WidgetShell>

      <Challenge id="ch13-parallel-park" met={parked}>
        Park into the dashed slot facing right (position within tolerance, heading within 9°) with{" "}
        <strong>no contact</strong> with the parked cars. You will have translated the car sideways
        out of the lane — a net motion along the forbidden{" "}
        <M>{"\\hat y_b"}</M> direction — entirely through forward/reverse arcs that each respect{" "}
        <M>{"v_{by} = 0"}</M>. That is the Lie bracket <M>{"[g_1, g_2]"}</M> made physical.
      </Challenge>
    </>
  );
}
