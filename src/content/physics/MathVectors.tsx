import { useMemo, useRef, useState } from "react";
import { Line, Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";
import { Scene3D, Arrow, AXIS_COLORS } from "../../components/three/Scene3D";
import { AxisArc } from "../../components/three/viz3d";
import { type Vec3, vadd, vscale, vsub, vnorm, vunit, vdot, rad, deg } from "../../lib/math/vec";

// ------------------------------------------------------------------
// Shared 3D helpers — all vectors live in the math xy-plane (z = 0),
// rendered inside Scene3D's z-up group. World = math * K so typical
// arrows sit comfortably in the camera's view.
// ------------------------------------------------------------------
const K = 0.42; // world units per math unit
const GLIM = 5; // grid half-extent, math units
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";
const RED = AXIS_COLORS.x; // #d9483f
const GREEN = AXIS_COLORS.y; // #2f9e44
const BLUE = AXIS_COLORS.z; // #3b6fd4
const GOLD = "#b08c1d";

const w = (v: Vec3): Vec3 => [v[0] * K, v[1] * K, v[2] * K];

/** Intersect the pointer ray with the math z=0 plane (= three world Y=0). */
function pickPlane(e: {
  ray: { origin: { x: number; y: number; z: number }; direction: { x: number; y: number; z: number } };
}): Vec3 {
  const o = e.ray.origin;
  const d = e.ray.direction;
  const t = Math.abs(d.y) > 1e-6 ? -o.y / d.y : 0;
  const hx = o.x + t * d.x;
  const hz = o.z + t * d.z;
  // world (three, y-up) -> math (z-up), then undo the K scale
  return [hx / K, -hz / K, 0];
}

const snap = (v: Vec3): Vec3 => [
  Math.max(-GLIM, Math.min(GLIM, Math.round(v[0] * 20) / 20)),
  Math.max(-GLIM, Math.min(GLIM, Math.round(v[1] * 20) / 20)),
  0,
];

/** Faint grid + red x-axis / green y-axis in the working plane. */
function PlaneAxes() {
  const grid = [];
  for (let k = -GLIM; k <= GLIM; k++) {
    grid.push(
      <Line key={`gx${k}`} points={[w([k, -GLIM, 0]), w([k, GLIM, 0])]} color="#e3ded0" lineWidth={1} />,
      <Line key={`gy${k}`} points={[w([-GLIM, k, 0]), w([GLIM, k, 0])]} color="#e3ded0" lineWidth={1} />,
    );
  }
  return (
    <group>
      {grid}
      <Line points={[w([-GLIM, 0, 0]), w([GLIM, 0, 0])]} color={RED} lineWidth={1.8} transparent opacity={0.6} />
      <Line points={[w([0, -GLIM, 0]), w([0, GLIM, 0])]} color={GREEN} lineWidth={1.8} transparent opacity={0.6} />
      <AxisLabel at={[GLIM + 0.35, 0, 0]} text="x" color={RED} />
      <AxisLabel at={[0, GLIM + 0.35, 0]} text="y" color={GREEN} />
    </group>
  );
}

/** Bold non-italic axis label pinned to an axis tip. */
function AxisLabel({ at, text, color }: { at: Vec3; text: string; color: string }) {
  return (
    <Html position={w(at)} center distanceFactor={9} style={{ pointerEvents: "none" }}>
      <span style={{ font: "700 14px Inter, sans-serif", color, whiteSpace: "nowrap" }}>{text}</span>
    </Html>
  );
}

/** A draggable tip handle in the z=0 plane. */
function DragTip({ p, color, onDrag }: { p: Vec3; color: string; onDrag: (m: Vec3) => void }) {
  const dragging = useRef(false);
  const controls = useThree(s => s.controls) as unknown as { enabled: boolean } | null;
  return (
    <mesh
      position={w(p)}
      onPointerDown={e => {
        e.stopPropagation();
        dragging.current = true;
        if (controls) controls.enabled = false;
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }}
      onPointerUp={() => {
        dragging.current = false;
        if (controls) controls.enabled = true;
      }}
      onPointerMove={e => {
        if (!dragging.current) return;
        e.stopPropagation();
        onDrag(pickPlane(e));
      }}
    >
      <sphereGeometry args={[0.12, 20, 20]} />
      <meshStandardMaterial color={color} transparent opacity={0.5} />
    </mesh>
  );
}

/** Small italic label pinned to a world point. */
function Tag({ at, text, color }: { at: Vec3; text: string; color: string }) {
  return (
    <Html position={w(at)} center distanceFactor={9} style={{ pointerEvents: "none" }}>
      <span
        style={{
          font: "italic 700 15px Georgia, serif",
          color,
          transform: "translate(12px,-12px)",
          display: "inline-block",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
    </Html>
  );
}

/** A small wireframe target sphere at a math point. */
function Target({ at, met }: { at: Vec3; met: boolean }) {
  return (
    <mesh position={w(at)}>
      <sphereGeometry args={[0.13, 18, 14]} />
      <meshBasicMaterial color={met ? GREEN : "#cdb96e"} wireframe transparent opacity={met ? 0.55 : 0.35} />
    </mesh>
  );
}

/** Component shadows of a single vector onto the two axes. */
function Shadows({ v }: { v: Vec3 }) {
  const tip = w(v);
  const px = w([v[0], 0, 0]);
  const py = w([0, v[1], 0]);
  return (
    <group>
      <Line points={[[0, 0, 0], px]} color={RED} lineWidth={4.5} />
      <Line points={[[0, 0, 0], py]} color={GREEN} lineWidth={4.5} />
      <Line points={[tip, px]} color={RED} lineWidth={1.4} dashed dashSize={0.1} gapSize={0.07} />
      <Line points={[tip, py]} color={GREEN} lineWidth={1.4} dashed dashSize={0.1} gapSize={0.07} />
    </group>
  );
}

// ------------------------------------------------------------------
// Widget 1: anatomy of a single vector — components as shadows
// ------------------------------------------------------------------
function VectorAnatomy() {
  const [v, setV] = useState<Vec3>([4, 2.5, 0]);
  const mag = vnorm(v);
  const angDeg = deg(Math.atan2(v[1], v[0]));
  const target: Vec3 = [-3, 4, 0];
  const met = Math.abs(v[0] - target[0]) < 0.15 && Math.abs(v[1] - target[1]) < 0.15;

  return (
    <>
      <WidgetShell
        title="Anatomy of a vector — drag the tip"
        onReset={() => setV([4, 2.5, 0])}
        caption={
          <>
            The dashed drops are the vector's <em>shadows</em> on the two axes — its components.
            Drag the purple ball in the plane; <em>orbit</em> the scene (drag the background) to
            confirm the arrow really is flat. Length and angle on one side, components on the other:
            two descriptions of one arrow.
          </>
        }
      >
        <Scene3D camera={[3.4, 3.0, 4.4]} height={400} floor={false}>
          <PlaneAxes />
          <Target at={target} met={met} />
          <Shadows v={v} />
          <Arrow dir={v} length={mag * K} color={PURPLE} thickness={0.028} />
          <Tag at={v} text="v" color={PURPLE} />
          <DragTip p={v} color={PURPLE} onDrag={m => setV(snap(m))} />
        </Scene3D>
        <ControlBar>
          <Readout label="components (vx, vy)" value={`(${v[0].toFixed(2)}, ${v[1].toFixed(2)})`} color={PURPLE} />
          <Readout label="length |v|" value={mag.toFixed(2)} />
          <Readout label="angle θ from +x" value={`${angDeg.toFixed(1)}°`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="math1-components" met={met}>
        Drag the tip to the target at <M>{"(-3, 4)"}</M>. Check the length readout: you have built a
        3–4–5 right triangle, tilted into the second quadrant — length 5 without measuring.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Widget 2: Cartesian vs polar — two names for one arrow
// ------------------------------------------------------------------
function PolarCartesian() {
  const [r, setR] = useState(5);
  const [thetaDeg, setThetaDeg] = useState(53.13);
  const theta = rad(thetaDeg);
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
  const v: Vec3 = [x, y, 0];

  const target: Vec3 = [-3, 4, 0];
  const met = Math.abs(x - target[0]) < 0.12 && Math.abs(y - target[1]) < 0.12;

  return (
    <>
      <WidgetShell
        title="Cartesian vs polar — turn the two dials"
        onReset={() => {
          setR(5);
          setThetaDeg(53.13);
        }}
        caption={
          <>
            The <span style={{ color: PURPLE }}>arrow</span> never changes what it <em>is</em> — only
            how you name it. Polar names it by <span style={{ color: ORANGE }}>reach</span> and{" "}
            <span style={{ color: GOLD }}>heading</span>; Cartesian names it by its{" "}
            <span className="cx">east</span>/<span className="cy">north</span> shadows. Move either
            dial and watch both readouts update together.
          </>
        }
      >
        <Scene3D camera={[3.4, 3.0, 4.4]} height={400} floor={false}>
          <PlaneAxes />
          <Target at={target} met={met} />
          {/* radius circle the tip rides on */}
          <Line
            points={Array.from({ length: 97 }, (_, i) => w([r * Math.cos((i / 96) * 2 * Math.PI), r * Math.sin((i / 96) * 2 * Math.PI), 0]))}
            color="#d8c98f"
            lineWidth={1.2}
            dashed
            dashSize={0.12}
            gapSize={0.1}
          />
          {/* polar angle arc from +x to the arrow */}
          <AxisArc center={[0, 0, 0]} axis={[0, 0, 1]} radius={0.6} sweep={theta} color={GOLD} lineWidth={3} />
          <Shadows v={v} />
          <Arrow dir={v} length={r * K} color={PURPLE} thickness={0.028} />
          <Tag at={v} text="v" color={PURPLE} />
        </Scene3D>
        <ControlBar>
          <LabeledSlider label="r" value={r} min={0.5} max={GLIM} step={0.05} onChange={setR} color={ORANGE} fmt={n => n.toFixed(2)} />
          <LabeledSlider label="θ" value={thetaDeg} min={-180} max={180} step={0.5} onChange={setThetaDeg} color={GOLD} fmt={n => `${n.toFixed(0)}°`} />
          <Readout label="polar (r, θ)" value={`(${r.toFixed(2)}, ${thetaDeg.toFixed(0)}°)`} color={ORANGE} />
          <Readout label="Cartesian (x, y)" value={`(${x.toFixed(2)}, ${y.toFixed(2)})`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="math1-polar" met={met}>
        Using only the <M>{"r"}</M> and <M>{"\\theta"}</M> dials, land the tip on the target at
        Cartesian <M>{"(-3, 4)"}</M>. You will need <M>{"r = 5"}</M> and an angle in the second
        quadrant — proof that the same arrow carries two different-looking addresses.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Widget 3: projection — the shadow, the height, and the right triangle
// ------------------------------------------------------------------
/** Translucent triangle through three math points. */
function TriangleFill({ p, q, r, color }: { p: Vec3; q: Vec3; r: Vec3; color: string }) {
  const arr = useMemo(() => new Float32Array([...w(p), ...w(q), ...w(r)]), [p, q, r]);
  return (
    <mesh>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[arr, 3]} />
      </bufferGeometry>
      <meshBasicMaterial color={color} transparent opacity={0.13} side={2} />
    </mesh>
  );
}

/** A little square marking a right angle at `at`, along directions d1 and d2. */
function RightAngleMark({ at, d1, d2, size = 0.32 }: { at: Vec3; d1: Vec3; d2: Vec3; size?: number }) {
  if (vnorm(d1) < 1e-6 || vnorm(d2) < 1e-6) return null;
  const u1 = vunit(d1);
  const u2 = vunit(d2);
  const p1 = vadd(at, vscale(u1, size));
  const p2 = vadd(at, vadd(vscale(u1, size), vscale(u2, size)));
  const p3 = vadd(at, vscale(u2, size));
  return <Line points={[w(p1), w(p2), w(p3)]} color="#8a8a9b" lineWidth={1.6} />;
}

function Projection() {
  const [a, setA] = useState<Vec3>([3.2, 2.6, 0]);
  const [b, setB] = useState<Vec3>([4.2, 0.6, 0]);

  const magA = vnorm(a);
  const magB = vnorm(b);
  const dot = vdot(a, b);
  const cosT = magA > 1e-6 && magB > 1e-6 ? dot / (magA * magB) : 0;
  const theta = Math.acos(Math.max(-1, Math.min(1, cosT)));
  const shadowLen = magA * Math.cos(theta); // |a| cos θ
  const heightLen = magA * Math.sin(theta); // |a| sin θ
  const proj = magB > 1e-6 ? dot / (magB * magB) : 0;
  const projTip = vscale(b, proj);
  const ub = magB > 1e-6 ? vunit(b) : ([1, 0, 0] as Vec3);

  const met = magA >= 2 && Math.abs(deg(theta) - 45) < 1.5;

  return (
    <>
      <WidgetShell
        title="The shadow — where cos θ and sin θ live"
        onReset={() => {
          setA([3.2, 2.6, 0]);
          setB([4.2, 0.6, 0]);
        }}
        caption={
          <>
            Drag <span style={{ color: PURPLE }}>a</span>. A light shines straight down onto the line
            of <span style={{ color: ORANGE }}>b</span>: the <span style={{ color: GOLD }}>gold</span>{" "}
            segment is <span style={{ color: PURPLE }}>a</span>'s <em>shadow</em>, length{" "}
            <M>{"|a|\\cos\\theta"}</M>. The <span style={{ color: BLUE }}>blue</span> ray from the tip
            down to that shadow is the <em>height</em>, length <M>{"|a|\\sin\\theta"}</M>. Together
            with <span style={{ color: PURPLE }}>a</span> they form one right triangle — cosine is the
            side along b, sine the side perpendicular to it. The little square marks the right angle.
          </>
        }
      >
        <Scene3D camera={[3.4, 3.0, 4.4]} height={420} floor={false}>
          <PlaneAxes />
          {/* the line of b — the "ground" the shadow falls on */}
          <Line points={[w(vscale(ub, -GLIM)), w(vscale(ub, GLIM))]} color="#e7cf9a" lineWidth={1.3} />
          {/* the right triangle: origin -> foot of shadow -> tip of a */}
          <TriangleFill p={[0, 0, 0]} q={projTip} r={a} color={GOLD} />
          {/* angle wedge between a and b */}
          <AxisArc
            center={[0, 0, 0]}
            axis={[0, 0, 1]}
            radius={0.62}
            start={Math.atan2(a[1], a[0])}
            sweep={normAngle(Math.atan2(b[1], b[0]) - Math.atan2(a[1], a[0]))}
            color="#8a8a9b"
            lineWidth={2.5}
          />
          {/* shadow (cos) and height (sin) */}
          <Line points={[[0, 0, 0], w(projTip)]} color={GOLD} lineWidth={7} />
          <Line points={[w(a), w(projTip)]} color={BLUE} lineWidth={2.6} dashed dashSize={0.13} gapSize={0.09} />
          <RightAngleMark at={projTip} d1={vsub([0, 0, 0], projTip)} d2={vsub(a, projTip)} />

          <Arrow dir={a} length={magA * K} color={PURPLE} thickness={0.03} />
          <Arrow dir={b} length={magB * K} color={ORANGE} thickness={0.026} />
          <Tag at={a} text="a" color={PURPLE} />
          <Tag at={b} text="b" color={ORANGE} />
          <Tag at={vscale(projTip, 0.5)} text="|a|cos θ" color={GOLD} />
          <Tag at={vscale(vadd(a, projTip), 0.5)} text="|a|sin θ" color={BLUE} />

          <DragTip p={a} color={PURPLE} onDrag={m => setA(snap(m))} />
          <DragTip p={b} color={ORANGE} onDrag={m => setB(snap(m))} />
        </Scene3D>
        <ControlBar>
          <Readout label="angle θ" value={`${deg(theta).toFixed(1)}°`} />
          <Readout label="|a|" value={magA.toFixed(2)} color={PURPLE} />
          <Readout label="shadow = |a|cos θ" value={shadowLen.toFixed(2)} color={GOLD} />
          <Readout label="height = |a|sin θ" value={heightLen.toFixed(2)} color={BLUE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="math1-shadow" met={met}>
        Keep <M>{"\\mathbf{a}"}</M> at length 2 or more and rotate it until its{" "}
        <span style={{ color: GOLD }}>shadow</span> and its <span style={{ color: BLUE }}>height</span>{" "}
        are equal. They match at exactly <M>{"\\theta = 45^\\circ"}</M> — the one angle where{" "}
        <M>{"\\cos\\theta = \\sin\\theta"}</M>, so the part of <M>{"\\mathbf{a}"}</M> along{" "}
        <M>{"\\mathbf{b}"}</M> equals the part standing perpendicular to it.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Widget 4: dot and cross — agreement, turning, and why order flips
// ------------------------------------------------------------------
function Parallelogram({ a, b, positive }: { a: Vec3; b: Vec3; positive: boolean }) {
  const arr = useMemo(() => {
    const O: Vec3 = [0, 0, 0];
    const A = w(a);
    const AB = w(vadd(a, b));
    const B = w(b);
    return new Float32Array([...O, ...A, ...AB, ...O, ...AB, ...B]);
  }, [a, b]);
  return (
    <mesh>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[arr, 3]} />
      </bufferGeometry>
      <meshBasicMaterial color={positive ? GREEN : RED} transparent opacity={0.15} side={2} />
    </mesh>
  );
}

function DotCross() {
  const [a, setA] = useState<Vec3>([3.4, 1.2, 0]);
  const [b, setB] = useState<Vec3>([1.2, 2.8, 0]);
  const [order, setOrder] = useState<"ab" | "ba">("ab");

  const dot = vdot(a, b);
  const crossAB = a[0] * b[1] - a[1] * b[0];
  const magA = vnorm(a);
  const magB = vnorm(b);
  const cosT = magA > 1e-6 && magB > 1e-6 ? dot / (magA * magB) : 0;
  const angDeg = deg(Math.acos(Math.max(-1, Math.min(1, cosT))));

  // projection (shadow) of a onto b — the cosine piece
  const proj = magB > 1e-6 ? dot / (magB * magB) : 0;
  const projTip = vscale(b, proj);

  // signed cross for the chosen order, drawn as a real vertical vector
  const signed = order === "ab" ? crossAB : -crossAB;
  const lenZ = Math.min(3, Math.abs(crossAB) * K * 0.55);
  const zdir: Vec3 = [0, 0, signed >= 0 ? 1 : -1];

  const perpMet = Math.abs(dot) < 0.15 && magA >= 2 && magB >= 2;

  return (
    <>
      <WidgetShell
        title="Two arrows — agreement and turning"
        onReset={() => {
          setA([3.4, 1.2, 0]);
          setB([1.2, 2.8, 0]);
          setOrder("ab");
        }}
        caption={
          <>
            Drag both tips in the plane. The <span style={{ color: GOLD }}>gold</span> segment along{" "}
            <span style={{ color: ORANGE }}>b</span> is <span style={{ color: PURPLE }}>a</span>'s
            shadow — length <M>{"|a|\\cos\\theta"}</M>, the dot product. The dashed rise is the
            height <M>{"|a|\\sin\\theta"}</M>; base <M>{"\\times"}</M> height fills the parallelogram,
            whose area is the cross product. The <span style={{ color: BLUE }}>blue</span> arrow is
            that cross product as a real 3-D vector — hit <em>swap</em> and watch it flip.
          </>
        }
      >
        <Scene3D camera={[3.2, 3.2, 4.6]} height={420} floor={false}>
          <PlaneAxes />
          <Parallelogram a={a} b={b} positive={crossAB >= 0} />

          {/* angle wedge between a and b */}
          <AxisArc
            center={[0, 0, 0]}
            axis={[0, 0, 1]}
            radius={0.55}
            start={Math.atan2(a[1], a[0])}
            sweep={normAngle(Math.atan2(b[1], b[0]) - Math.atan2(a[1], a[0]))}
            color="#8a8a9b"
            lineWidth={2.5}
          />

          {/* a's shadow on b (cosine) + the perpendicular height (sine) */}
          <Line points={[[0, 0, 0], w(projTip)]} color={GOLD} lineWidth={6} />
          <Line points={[w(a), w(projTip)]} color="#9a93a8" lineWidth={1.6} dashed dashSize={0.1} gapSize={0.07} />

          <Arrow dir={a} length={magA * K} color={PURPLE} thickness={0.028} />
          <Arrow dir={b} length={magB * K} color={ORANGE} thickness={0.028} />
          <Tag at={a} text="a" color={PURPLE} />
          <Tag at={b} text="b" color={ORANGE} />

          {/* the cross product as a vertical vector */}
          {lenZ > 0.03 && <Arrow dir={zdir} length={lenZ} color={BLUE} thickness={0.03} />}
          {lenZ > 0.03 && (
            <Tag at={[0, 0, (signed >= 0 ? lenZ : -lenZ) / K]} text={order === "ab" ? "a × b" : "b × a"} color={BLUE} />
          )}

          <DragTip p={a} color={PURPLE} onDrag={m => setA(snap(m))} />
          <DragTip p={b} color={ORANGE} onDrag={m => setB(snap(m))} />
        </Scene3D>
        <ControlBar>
          <WidgetButton active={order === "ab"} onClick={() => setOrder("ab")}>
            show a × b
          </WidgetButton>
          <WidgetButton active={order === "ba"} onClick={() => setOrder("ba")}>
            swap to b × a
          </WidgetButton>
          <Readout label="a · b (dot)" value={dot.toFixed(2)} color={dot > 0.15 ? GREEN : dot < -0.15 ? RED : GOLD} />
          <Readout label="a × b" value={crossAB.toFixed(2)} color={BLUE} />
          <Readout label="b × a" value={(-crossAB).toFixed(2)} color={BLUE} />
          <Readout label="angle between" value={`${angDeg.toFixed(1)}°`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="math1-perp" met={perpMet}>
        Keep both arrows at length 2 or more and make the dot product (essentially) zero:{" "}
        <M>{"|\\mathbf{a}\\cdot\\mathbf{b}| < 0.15"}</M>. The gold shadow shrinks to nothing while the
        parallelogram is at its fattest — you have found the perpendicularity test, the exact opposite
        of where the cross product vanishes.
      </Challenge>
    </>
  );
}

/** Wrap an angle difference into (−π, π]. */
function normAngle(x: number): number {
  let a = x;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

export default function MathVectors() {
  return (
    <div>
      <PageHeader
        chapter="Math 1"
        section="College Physics & Dynamics"
        title="Vectors: Numbers That Point"
        lede="Almost every quantity in robotics — a velocity, a force, a direction to a target — is an arrow, not a plain number. Learn to read arrows and the rest of this course opens up."
      />

      <p>
        Suppose you are standing in a city of square blocks and I say: <em>"the café is 5 blocks
        away."</em> Can you find it? No — it could be anywhere on a circle around you. But if I
        say <em>"3 blocks east, then 4 blocks north,"</em> you walk straight to it. Some
        quantities need a <strong>direction</strong> as well as a size, and a single number
        cannot hold both.
      </p>
      <p>
        A quantity with only a size — temperature, mass, price — is called a{" "}
        <strong>scalar</strong>. A quantity with size <em>and</em> direction is a{" "}
        <strong>vector</strong>, and we draw it as an arrow. The arrow's length is the size (its{" "}
        <strong>magnitude</strong>), and where it points is the direction. Velocity is a vector
        (60 km/h <em>northbound</em>); so is force (a 10 N push <em>downward</em>); so is the
        instruction "3 east, 4 north."
      </p>

      <H2>Components: a vector's shadows</H2>
      <p>
        The pair of numbers <M>{"(3, 4)"}</M> — how far east, how far north — are called the
        vector's <strong>components</strong>, and describing an arrow this way is the{" "}
        <strong>Cartesian</strong> representation (after René Descartes, who first pinned points to
        a grid of perpendicular axes). Think of the components as shadows: shine a light from above
        and the arrow casts a shadow of length 3 on the east–west axis; shine from the side and
        it casts 4 on the north–south axis. The two shadows pin the arrow down completely.
      </p>
      <p>
        Going back and forth between the two descriptions — (length, angle) on one hand,
        components on the other — is what sine and cosine are <em>for</em>. If the arrow has
        length <M>{"|\\mathbf{v}|"}</M> and points at angle <M>{"\\theta"}</M> above the x-axis:
      </p>
      <Eq>{"v_x = |\\mathbf{v}|\\cos\\theta, \\qquad v_y = |\\mathbf{v}|\\sin\\theta,"}</Eq>
      <p>
        and to go the other way, Pythagoras recovers the length while the components' ratio
        recovers the angle:
      </p>
      <Eq>{"|\\mathbf{v}| = \\sqrt{v_x^2 + v_y^2}, \\qquad \\theta = \\operatorname{atan2}(v_y,\\, v_x)."}</Eq>
      <p>
        Read those slowly once: cosine answers <em>"how much of the arrow points along x?"</em>{" "}
        and sine answers <em>"how much points along y?"</em> That is all sine and cosine will
        ever do in this course — and, as you will see below, it is <em>also</em> all they do
        inside the dot and cross products.
      </p>
      <Aside>
        <M>{"\\operatorname{atan2}(v_y, v_x)"}</M> is the two-argument arctangent every robotics
        library provides: like <M>{"\\tan^{-1}(v_y/v_x)"}</M>, but it looks at the signs of both
        components so it can tell all four quadrants apart, and it survives{" "}
        <M>{"v_x = 0"}</M>. You will meet it again in inverse kinematics (Chapter 6).
      </Aside>

      <p>
        <strong>Try this</strong> in the widget below: drag the tip so the arrow points steeply
        up-left and watch the <span className="cx">red</span> shadow go negative while the{" "}
        <span className="cy">green</span> one stays positive. Then orbit the camera and confirm the
        arrow lies flat in the floor plane — everything on this page happens in that plane until the
        cross product lifts us out of it.
      </p>

      <VectorAnatomy />

      <KeyIdea>
        A vector is completely described by its shadows on the axes. Sine and cosine convert
        (length, angle) into shadows; Pythagoras and <M>{"\\operatorname{atan2}"}</M> convert
        back. Nothing about arrows is harder than this round trip.
      </KeyIdea>

      <H2>Two names for one arrow: Cartesian and polar</H2>
      <p>
        We have quietly been using <em>two</em> ways to write the same arrow, and it is worth
        naming them, because robotics switches between them constantly.
      </p>
      <ul>
        <li>
          <strong>Cartesian</strong> <M>{"(v_x, v_y)"}</M> — the two shadows, "go this far east
          and this far north." Best for <em>adding</em> arrows and for feeding a computer, because
          each axis is handled independently.
        </li>
        <li>
          <strong>Polar</strong> <M>{"(r, \\theta)"}</M> — a reach <M>{"r = |\\mathbf{v}|"}</M> and
          a heading <M>{"\\theta"}</M>, "point this way and walk this far." Best when you care
          about <em>how far</em> and <em>which direction</em> on their own — a range sensor's
          reading, a wheel's speed and steering angle, a joint's turn.
        </li>
      </ul>
      <p>
        They are the same arrow in two costumes, and the conversion is the sine/cosine round trip
        you just met:
      </p>
      <Eq>{"\\underbrace{v_x = r\\cos\\theta,\\quad v_y = r\\sin\\theta}_{\\text{polar}\\,\\to\\,\\text{Cartesian}} \\qquad\\qquad \\underbrace{r = \\sqrt{v_x^2 + v_y^2},\\quad \\theta = \\operatorname{atan2}(v_y, v_x)}_{\\text{Cartesian}\\,\\to\\,\\text{polar}}"}</Eq>
      <p>
        In the widget below, the two <em>dials</em> are the polar numbers — turn <M>{"r"}</M> and{" "}
        <M>{"\\theta"}</M> directly — while the readout on the right shows the Cartesian shadows
        those dials produce. Notice you can never move the arrow without <em>both</em> descriptions
        changing in lock-step: they are welded together.
      </p>

      <PolarCartesian />

      <KeyIdea>
        Cartesian = shadows <M>{"(v_x, v_y)"}</M>, the language of adding and of computers. Polar =
        reach and heading <M>{"(r, \\theta)"}</M>, the language of sensors and steering. Same arrow;
        sine and cosine are the translators between the two dictionaries.
      </KeyIdea>

      <H2>Operations on vectors</H2>
      <p>
        Arrows come with their own arithmetic. Four operations cover almost everything you will do
        before you meet the two <em>products</em> further down.
      </p>
      <p>
        <strong>Addition — combining trips.</strong> Walk 3 east, 4 north — then walk 2 east, 1
        south. Where are you? 5 east, 3 north: the trips add <em>shadow by shadow</em>.
        Geometrically you laid the second arrow's tail on the first arrow's tip ("tip-to-tail");
        algebraically you just added components:
      </p>
      <Eq>{"\\mathbf{a} + \\mathbf{b} = (a_x + b_x,\\; a_y + b_y)."}</Eq>
      <p>
        Robots add vectors constantly: the velocity of a hand is the velocity from the shoulder
        joint <em>plus</em> the velocity from the elbow joint. Whenever effects combine, arrows
        add.
      </p>
      <p>
        <strong>Subtraction — the arrow from here to there.</strong> The difference{" "}
        <M>{"\\mathbf{b} - \\mathbf{a}"}</M> is the arrow that points <em>from</em> the tip of{" "}
        <M>{"\\mathbf{a}"}</M> <em>to</em> the tip of <M>{"\\mathbf{b}"}</M> — exactly what you add
        to <M>{"\\mathbf{a}"}</M> to reach <M>{"\\mathbf{b}"}</M>. This is the single most-used
        operation in robotics: if the gripper is at <M>{"\\mathbf{p}"}</M> and the target is at{" "}
        <M>{"\\mathbf{q}"}</M>, then <M>{"\\mathbf{q} - \\mathbf{p}"}</M> is the direction to
        move and its length is the distance still to go.
      </p>
      <Eq>{"\\mathbf{b} - \\mathbf{a} = (b_x - a_x,\\; b_y - a_y)."}</Eq>
      <p>
        <strong>Scaling — same direction, new length.</strong> Multiplying by a plain number{" "}
        <M>{"s"}</M> stretches the arrow: <M>{"s\\mathbf{a} = (s\\,a_x,\\; s\\,a_y)"}</M>. A factor
        of 2 doubles its length, <M>{"\\tfrac12"}</M> halves it, and a <em>negative</em> factor
        also flips it to point the opposite way — so <M>{"-\\mathbf{a}"}</M> is <M>{"\\mathbf{a}"}</M>{" "}
        reversed. (Subtraction is really just <M>{"\\mathbf{b} + (-\\mathbf{a})"}</M>.)
      </p>
      <p>
        <strong>Normalizing — keep the direction, throw away the length.</strong> Divide an arrow
        by its own length and you get a <strong>unit vector</strong> — length exactly 1, pointing
        the same way:
      </p>
      <Eq>{"\\hat{\\mathbf{a}} = \\frac{\\mathbf{a}}{|\\mathbf{a}|}."}</Eq>
      <p>
        A unit vector is <em>pure direction</em>. Robotics leans on them everywhere: the direction
        a camera faces, the axis a joint spins about, the outward normal of a surface a finger
        presses on. Whenever you want "which way" without "how much," you normalize.
      </p>

      <H2>The dot product: how much do two arrows agree?</H2>
      <p>
        Now for the two ways of <em>multiplying</em> arrows. The first, the{" "}
        <strong>dot product</strong>, produces a plain number that measures agreement:
      </p>
      <Eq>{"\\mathbf{a}\\cdot\\mathbf{b} = a_x b_x + a_y b_y = |\\mathbf{a}|\\,|\\mathbf{b}|\\cos\\theta,"}</Eq>
      <p>
        where <M>{"\\theta"}</M> is the angle between them. Read the right-hand form: it is the
        length of <M>{"\\mathbf{a}"}</M>'s shadow <em>on</em> <M>{"\\mathbf{b}"}</M>, times the
        length of <M>{"\\mathbf{b}"}</M>. The sign is the whole story:{" "}
        <strong>positive</strong> means the arrows lean the same way, <strong>zero</strong> means
        they are exactly perpendicular, <strong>negative</strong> means they oppose each other.
      </p>

      <Worked title="Where cos θ comes from — the shadow, not the law of cosines">
        <p>
          The usual "derivation" of <M>{"|\\mathbf{a}||\\mathbf{b}|\\cos\\theta"}</M> quotes the law
          of cosines — but that law <em>already contains</em> a cosine, so it never tells you where
          the cosine was born. Let us build it from nothing but a right triangle.
        </p>
        <p>
          Stand <M>{"\\mathbf{a}"}</M> and <M>{"\\mathbf{b}"}</M> tail-to-tail and drop a
          perpendicular from the tip of <M>{"\\mathbf{a}"}</M> straight down onto the line carrying{" "}
          <M>{"\\mathbf{b}"}</M>. That splits <M>{"\\mathbf{a}"}</M> into two pieces at a right
          angle: a piece <em>lying along</em> <M>{"\\mathbf{b}"}</M>, and a leftover piece{" "}
          <em>perpendicular</em> to it. Look at the triangle you just made — hypotenuse{" "}
          <M>{"|\\mathbf{a}|"}</M>, enclosed angle <M>{"\\theta"}</M>. By the <em>definition</em> of
          cosine, adjacent over hypotenuse, the along-<M>{"\\mathbf{b}"}</M> piece has length
        </p>
        <Eq>{"\\text{(shadow of }\\mathbf{a}\\text{ on }\\mathbf{b}) = |\\mathbf{a}|\\cos\\theta."}</Eq>
        <p>
          <em>That</em> is where the cosine comes from — not a theorem, but the ratio of sides in a
          right triangle. Cosine measures the fraction of <M>{"\\mathbf{a}"}</M> that survives the
          projection onto <M>{"\\mathbf{b}"}</M>. Now simply <em>define</em> the dot product as "how
          long is <M>{"\\mathbf{b}"}</M>, times how much of <M>{"\\mathbf{a}"}</M> runs along it":
        </p>
        <Eq>{"\\mathbf{a}\\cdot\\mathbf{b} = |\\mathbf{b}|\\cdot\\big(|\\mathbf{a}|\\cos\\theta\\big) = |\\mathbf{a}||\\mathbf{b}|\\cos\\theta."}</Eq>
        <p>
          It is symmetric — projecting <M>{"\\mathbf{b}"}</M> onto <M>{"\\mathbf{a}"}</M> instead
          gives <M>{"|\\mathbf{a}|\\cdot|\\mathbf{b}|\\cos\\theta"}</M>, the same number, which is
          why <M>{"\\mathbf{a}\\cdot\\mathbf{b} = \\mathbf{b}\\cdot\\mathbf{a}"}</M>.
        </p>
        <p>
          To recover the tidy component sum, use one fact: a shadow of a <em>sum</em> is the sum of
          the shadows, so the dot product distributes across addition. Write each arrow in the
          perpendicular unit vectors <M>{"\\hat{\\mathbf{x}}, \\hat{\\mathbf{y}}"}</M> and expand,
          using <M>{"\\hat{\\mathbf{x}}\\cdot\\hat{\\mathbf{x}} = \\hat{\\mathbf{y}}\\cdot\\hat{\\mathbf{y}} = 1"}</M>{" "}
          (an arrow's full shadow on itself) and <M>{"\\hat{\\mathbf{x}}\\cdot\\hat{\\mathbf{y}} = 0"}</M>{" "}
          (perpendicular axes cast no shadow on each other):
        </p>
        <Eq>{"\\mathbf{a}\\cdot\\mathbf{b} = (a_x\\hat{\\mathbf{x}} + a_y\\hat{\\mathbf{y}})\\cdot(b_x\\hat{\\mathbf{x}} + b_y\\hat{\\mathbf{y}}) = a_x b_x + a_y b_y. \\qquad\\blacksquare"}</Eq>
        <p>
          Two faces of one number: <M>{"a_x b_x + a_y b_y"}</M> to compute,{" "}
          <M>{"|\\mathbf{a}||\\mathbf{b}|\\cos\\theta"}</M> to picture. (The law-of-cosines route
          reaches the same place — expand <M>{"|\\mathbf{b}-\\mathbf{a}|^2"}</M> two ways and the
          cross-term is <M>{"-2(a_x b_x + a_y b_y) = -2|\\mathbf{a}||\\mathbf{b}|\\cos\\theta"}</M> —
          but now you can see that its cosine was this same shadow all along.)
        </p>
      </Worked>

      <p>
        See it happen. In the widget below, a light shines perpendicular onto the line of{" "}
        <M>{"\\mathbf{b}"}</M> and <M>{"\\mathbf{a}"}</M> casts a <span style={{ color: GOLD }}>gold
        shadow</span> of length <M>{"|\\mathbf{a}|\\cos\\theta"}</M>. Drag <M>{"\\mathbf{a}"}</M>{" "}
        upright and the shadow shrinks; lay it along <M>{"\\mathbf{b}"}</M> and the shadow grows to
        the full length of <M>{"\\mathbf{a}"}</M>. The <span style={{ color: BLUE }}>blue height</span>{" "}
        is the leftover perpendicular piece, <M>{"|\\mathbf{a}|\\sin\\theta"}</M> — the same right
        triangle, seen live.
      </p>

      <Projection />

      <p>
        This one operation shows up everywhere in robotics. Mechanical power is{" "}
        <M>{"\\mathbf{F}\\cdot\\mathbf{v}"}</M> — a force only does work to the extent it agrees
        with the motion. And "is this direction reachable?", "is this force useful?", "are these
        two axes independent?" all reduce to dot products.
      </p>

      <H2>The cross product: how much do they turn?</H2>
      <p>
        The second product measures the opposite thing — not agreement but{" "}
        <strong>turning</strong>. In the plane, the <strong>cross product</strong> of two arrows
        is the single number
      </p>
      <Eq>{"\\mathbf{a}\\times\\mathbf{b} = a_x b_y - a_y b_x = |\\mathbf{a}|\\,|\\mathbf{b}|\\sin\\theta,"}</Eq>
      <p>
        which is exactly the (signed) area of the parallelogram the two arrows span. It is
        largest when they are perpendicular, and <em>zero when they are parallel</em> — two
        arrows pointing the same way span no area and produce no turning. The sign says which
        way you would rotate to get from <M>{"\\mathbf{a}"}</M> to <M>{"\\mathbf{b}"}</M>:
        positive counterclockwise, negative clockwise.
      </p>

      <KeyIdea>
        <strong>So what does the cross product actually give you?</strong> Not an angle, and not a
        force — it gives <em>turning effect</em>. The dot product answers "how much of{" "}
        <M>{"\\mathbf{a}"}</M> pushes <em>along</em> <M>{"\\mathbf{b}"}</M>?"; the cross product
        answers the opposite question, "how much of <M>{"\\mathbf{a}"}</M> acts{" "}
        <em>sideways</em> to <M>{"\\mathbf{b}"}</M>, twisting around it?" Its size is the leverage
        (the parallelogram's area); its sign is the direction of the twist. A big number means the
        arrows are strongly perpendicular — maximum turning; zero means they line up — no turning
        at all.
      </KeyIdea>

      <Worked title="Where sin θ comes from — the height, and why order flips the sign">
        <p>
          Go back to the exact same right triangle. Dropping the perpendicular from{" "}
          <M>{"\\mathbf{a}"}</M>'s tip onto <M>{"\\mathbf{b}"}</M> gave us the along-piece{" "}
          <M>{"|\\mathbf{a}|\\cos\\theta"}</M>. The <em>leftover</em> perpendicular piece is the
          other side of that triangle, and by the definition of sine, opposite over hypotenuse, its
          length is
        </p>
        <Eq>{"\\text{(height of }\\mathbf{a}\\text{ above }\\mathbf{b}) = |\\mathbf{a}|\\sin\\theta."}</Eq>
        <p>
          So sine and cosine are twins born of one triangle: cosine is the part of{" "}
          <M>{"\\mathbf{a}"}</M> that lies <em>along</em> <M>{"\\mathbf{b}"}</M>, sine is the part
          that stands <em>perpendicular</em> to it. The area of a parallelogram is{" "}
          <em>base × height</em>. Take <M>{"\\mathbf{b}"}</M> as the base, length{" "}
          <M>{"|\\mathbf{b}|"}</M>; the height is precisely that perpendicular rise{" "}
          <M>{"|\\mathbf{a}|\\sin\\theta"}</M>. Multiply:
        </p>
        <Eq>{"\\text{area} = \\underbrace{|\\mathbf{b}|}_{\\text{base}}\\cdot\\underbrace{|\\mathbf{a}|\\sin\\theta}_{\\text{height}} = |\\mathbf{a}||\\mathbf{b}|\\sin\\theta."}</Eq>
        <p>
          For the component form, notice the height is what you get by measuring{" "}
          <M>{"\\mathbf{b}"}</M> against <M>{"\\mathbf{a}"}</M> turned a quarter-turn. Rotating{" "}
          <M>{"\\mathbf{a}=(a_x,a_y)"}</M> by <M>{"90^\\circ"}</M> counter-clockwise gives{" "}
          <M>{"\\mathbf{a}^{\\perp} = (-a_y,\\, a_x)"}</M>, so the cross product is just a dot
          product with the turned arrow:
        </p>
        <Eq>{"\\mathbf{a}\\times\\mathbf{b} = \\mathbf{a}^{\\perp}\\!\\cdot\\mathbf{b} = (-a_y)(b_x) + (a_x)(b_y) = a_x b_y - a_y b_x. \\qquad\\blacksquare"}</Eq>
        <p>
          <strong>Why order matters.</strong> Swap to <M>{"\\mathbf{b}\\times\\mathbf{a}"}</M>. The
          parallelogram is the very same set of points, so its <em>area</em> — the size{" "}
          <M>{"|\\mathbf{a}||\\mathbf{b}|\\sin\\theta"}</M> — does not change at all. What changes is
          the <em>sign</em>. Cosine is <em>even</em> (<M>{"\\cos(-\\theta)=\\cos\\theta"}</M>), so
          the dot product forgets order: <M>{"\\mathbf{a}\\cdot\\mathbf{b} = \\mathbf{b}\\cdot\\mathbf{a}"}</M>.
          But sine is <em>odd</em> (<M>{"\\sin(-\\theta)=-\\sin\\theta"}</M>): sweeping{" "}
          <M>{"\\mathbf{a}\\to\\mathbf{b}"}</M> turns through <M>{"+\\theta"}</M>, while{" "}
          <M>{"\\mathbf{b}\\to\\mathbf{a}"}</M> turns through <M>{"-\\theta"}</M> the other way. So
        </p>
        <Eq>{"\\mathbf{b}\\times\\mathbf{a} = -\\,\\mathbf{a}\\times\\mathbf{b}."}</Eq>
        <p>
          The cross product does not just record <em>how much</em> two arrows span — it records{" "}
          <em>which way you turned</em> to sweep the first onto the second. In 3-D that "which way"
          becomes a direction in space: point your right hand's fingers along the first arrow and
          curl them toward the second; your thumb is the cross product. Curl{" "}
          <M>{"\\mathbf{a}\\to\\mathbf{b}"}</M> and the thumb points up; curl{" "}
          <M>{"\\mathbf{b}\\to\\mathbf{a}"}</M> and it points down — same parallelogram, opposite
          face. In the widget below, hit <em>swap</em> and watch the blue arrow flip while the
          shaded area holds perfectly still.
        </p>
      </Worked>

      <p>
        <strong>Where it earns its keep: torque.</strong> Push on a door. The <em>same</em> force
        does far more to swing it when applied at the handle than next to the hinge, and does
        nothing at all if you push straight <em>toward</em> the hinge. That "twisting power" is{" "}
        <strong>torque</strong>, and it is a cross product: <M>{"\\boldsymbol{\\tau} = \\mathbf{r}\\times\\mathbf{F}"}</M>,
        where <M>{"\\mathbf{r}"}</M> is the arrow from the pivot to where the force is applied. Only
        the part of <M>{"\\mathbf{F}"}</M> perpendicular to <M>{"\\mathbf{r}"}</M> turns the door —
        exactly the <M>{"\\sin\\theta"}</M> the cross product measures. And because order flips the
        sign, <M>{"\\mathbf{r}\\times\\mathbf{F}"}</M> already encodes <em>which way</em> the door
        swings. So the cross product does not give you a force; it gives you what a force{" "}
        <em>accomplishes rotationally</em>, which is why it governs torque, angular momentum, and
        every spinning thing in Chapters 3, 5, and 12.
      </p>

      <p>
        <strong>Try this</strong> below: make the two arrows perpendicular and watch the gold
        shadow (dot product) collapse to nothing while the parallelogram is at its fattest. Then
        drag them parallel: the parallelogram collapses while the shadow is longest. The two
        products are complementary — one's maximum is the other's zero. Finally, hit <em>swap</em>{" "}
        and watch <M>{"\\mathbf{b}\\times\\mathbf{a}"}</M> point the opposite way.
      </p>

      <DotCross />

      <KeyIdea>
        Dot product = agreement, an even function that forgets order (zero means perpendicular).
        Cross product = turning, the signed area of the spanned parallelogram, an odd function that
        remembers order (<M>{"\\mathbf{b}\\times\\mathbf{a} = -\\mathbf{a}\\times\\mathbf{b}"}</M>;
        zero means parallel). Torque — a force's ability to spin something — is a cross product,
        which is why this pair rules Chapters 3, 5, and 12.
      </KeyIdea>

      <Aside>
        In 3D the cross product returns a full vector: same magnitude{" "}
        <M>{"|\\mathbf{a}||\\mathbf{b}|\\sin\\theta"}</M>, pointing perpendicular to both inputs
        along your right thumb when your fingers curl from <M>{"\\mathbf{a}"}</M> to{" "}
        <M>{"\\mathbf{b}"}</M> (the <em>right-hand rule</em>). The blue arrow in the widget is exactly
        that vector; the planar number <M>{"a_x b_y - a_y b_x"}</M> is just its z-component.
      </Aside>

      <H2>Three classic traps</H2>
      <p>
        <strong>Trap 1: magnitudes don't add.</strong> Walking 3 east then 4 north covers 7
        blocks of pavement but leaves you only 5 from the start. Only the <em>components</em>{" "}
        add; the lengths do not (unless the arrows are parallel).
      </p>
      <p>
        <strong>Trap 2: measure the angle from the right axis.</strong>{" "}
        <M>{"v_x = |\\mathbf{v}|\\cos\\theta"}</M> holds when <M>{"\\theta"}</M> is measured from
        the x-axis. Measure from the y-axis and sine and cosine silently swap — the single most
        common sign error in mechanics homework.
      </p>
      <p>
        <strong>Trap 3: degrees vs radians.</strong> Humans quote degrees; every formula and
        every robotics library uses <strong>radians</strong> (<M>{"180^\\circ = \\pi"}</M> rad).
        Feed degrees to a sine function expecting radians and nothing errors — the answers are
        just wrong. Check this first when a computation misbehaves.
      </p>

      <Quiz
        challengeId="math1-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: (
              <>
                Two forces act on a crate and their dot product is exactly zero. The forces are…
              </>
            ),
            options: [
              { label: "perpendicular", correct: true },
              { label: "parallel" },
              { label: "equal in size" },
              { label: "both zero" },
            ],
            explain: "Zero dot product means zero agreement: the arrows meet at 90°.",
          },
          {
            prompt: (
              <>
                You walk 3 km east, then 4 km north. How far are you from where you started?
              </>
            ),
            options: [
              { label: "7 km" },
              { label: "5 km", correct: true },
              { label: "12 km" },
              { label: "cannot tell" },
            ],
            explain: "Straight-line distance is the magnitude: √(3² + 4²) = 5. Trap 1 avoided.",
          },
          {
            prompt: <>Compared with <M>{"\\mathbf{a}\\times\\mathbf{b}"}</M>, the cross product <M>{"\\mathbf{b}\\times\\mathbf{a}"}</M> is…</>,
            options: [
              { label: "the same number" },
              { label: "the negative — same size, opposite sign", correct: true },
              { label: "always zero" },
              { label: "the dot product" },
            ],
            explain: "sin θ is odd, so swapping the order flips the sign: b×a = −(a×b). Same parallelogram, opposite turning sense.",
          },
        ]}
      />

      <BookRef>
        Math foundations · Module 1 — vectors return as velocities and forces (this physics
        track), rotation-matrix columns (Ch 3), Jacobian columns (Ch 5), and friction-cone rays
        (Ch 12).
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
