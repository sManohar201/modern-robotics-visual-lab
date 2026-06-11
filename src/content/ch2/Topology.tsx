import { useRef, useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D } from "../../components/three/Scene3D";
import { svgCoords } from "../../lib/svg";
import { rad, deg, wrapAngle } from "../../lib/math/vec";

const TARGET: [number, number] = [rad(-170), rad(60)];

export default function Topology() {
  const [q, setQ] = useState<[number, number]>([rad(30), rad(45)]);
  const [trail, setTrail] = useState<[number, number][]>([[rad(30), rad(45)]]);
  const [wrapped, setWrapped] = useState(false);

  const update = (t1: number, t2: number) => {
    const w1 = wrapAngle(t1);
    const w2 = wrapAngle(t2);
    // crossing the right edge: previous θ1 near +π, new θ1 near −π
    if (q[0] > rad(150) && w1 < rad(-150)) setWrapped(true);
    setQ([w1, w2]);
    setTrail(t => {
      const next = [...t, [w1, w2] as [number, number]];
      return next.length > 350 ? next.slice(next.length - 350) : next;
    });
  };

  const reset = () => {
    setQ([rad(30), rad(45)]);
    setTrail([[rad(30), rad(45)]]);
  };

  const atTarget =
    Math.abs(wrapAngle(q[0] - TARGET[0])) < rad(10) &&
    Math.abs(wrapAngle(q[1] - TARGET[1])) < rad(10);

  return (
    <div>
      <PageHeader
        chapter="Chapter 2"
        section="Configuration Space"
        title="The Shape of C-space"
        lede="Two robots can have the same number of degrees of freedom and yet live in completely different worlds. Dimension is not the whole story — C-space has a shape."
      />

      <p>
        Here is a planar 2R arm: two revolute joints, each free to rotate without limits. Its
        configuration is <M>{"q = (\\theta_1, \\theta_2)"}</M>, so its C-space is two-dimensional,
        and it is tempting to picture it as a square: <M>{"\\theta_1"}</M> across,{" "}
        <M>{"\\theta_2"}</M> up, each running from <M>{"-\\pi"}</M> to <M>{"\\pi"}</M>.
      </p>
      <p>
        Drag the arm and watch its configuration move as a single point in that square. Then try
        rotating joint 1 <em>past</em> 180°:
      </p>

      <ArmAndSquare q={q} trail={trail} onChange={update} onReset={reset} />

      <Challenge id="ch2-topo-wrap" met={wrapped} holdMs={100}>
        Rotate joint 1 until the configuration point slides out of the right edge of the square.
        Where does it come back in? Nothing happened to the physical arm — only our{" "}
        <em>picture</em> tore.
      </Challenge>

      <p>
        The point teleports from one edge to the other, but the arm itself moves smoothly —{" "}
        <M>{"\\theta_1 = 179^\\circ"}</M> and <M>{"\\theta_1 = -179^\\circ"}</M> are physically{" "}
        <em>neighbors</em>. The square picture lies: its left and right edges are actually{" "}
        <strong>the same configurations</strong>, and so are its top and bottom edges. The honest
        picture comes from gluing the matching edges together. Gluing left to right rolls the
        square into a cylinder; gluing top to bottom bends the cylinder into a{" "}
        <strong>torus</strong>:
      </p>
      <Eq>{"\\mathcal{C}_{2R} \\;=\\; S^1 \\times S^1 \\;=\\; T^2"}</Eq>

      <TorusView q={q} trail={trail} />

      <p>
        Same point, same trail, no seams — paths that looked torn in the square are smooth circles
        on the torus. The torus is not "where the arm is" in any physical sense; it is the space
        of <em>poses</em>. Every point of the donut's surface is one complete configuration of the
        arm.
      </p>

      <Challenge id="ch2-topo-target" met={atTarget}>
        Reach the ⭐ target at <M>{"(\\theta_1, \\theta_2) = (-170^\\circ, 60^\\circ)"}</M> (within
        10°). If your point sits near the right edge, the shortest route is <em>through the
        seam</em> — on the torus it's just a short hop.
      </Challenge>

      <KeyIdea>
        C-space = dimension <em>plus</em> topology. A revolute joint contributes a circle{" "}
        <M>{"S^1"}</M>, a prismatic joint a line <M>{"\\mathbb{R}"}</M>; the 2R arm's C-space is{" "}
        <M>{"S^1 \\times S^1 = T^2"}</M>, the torus.
      </KeyIdea>

      <H2>Why a planner must care</H2>
      <p>
        Any algorithm that measures distances, interpolates between configurations, or searches
        for paths is silently assuming a shape for C-space. Treat the 2R arm's C-space as a flat
        square and your planner will refuse to cross the seam — taking a 340° detour when a 20°
        move would do, exactly like a flight-planner that refuses to cross the date line. Wrap-around
        bugs in angle interpolation are this page's lesson appearing in production code.
      </p>
      <Aside>
        Some shapes are stranger still. The C-space of a rotating rigid body in 3-D — the rotation
        group <M>{"SO(3)"}</M> of Chapter 3 — is a 3-dimensional space that{" "}
        <em>cannot</em> be covered by any single non-degenerate coordinate chart. That fact has a
        famous symptom: gimbal lock.
      </Aside>

      <BookRef>Modern Robotics §2.3.1 — Configuration Space Topology.</BookRef>
    </div>
  );
}

/* ================= widget: arm + flat square ================= */

const W = 760;
const H = 360;
const BASE: [number, number] = [180, 185];
const L1 = 95;
const L2 = 75;
// square plot geometry
const SQ = { cx: 555, cy: 180, half: 140 };

function ArmAndSquare({
  q,
  trail,
  onChange,
  onReset,
}: {
  q: [number, number];
  trail: [number, number][];
  onChange: (t1: number, t2: number) => void;
  onReset: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<"elbow" | "tip" | null>(null);

  const [t1, t2] = q;
  // svg y is down; math angles are y-up
  const elbow: [number, number] = [BASE[0] + L1 * Math.cos(t1), BASE[1] - L1 * Math.sin(t1)];
  const tip: [number, number] = [
    elbow[0] + L2 * Math.cos(t1 + t2),
    elbow[1] - L2 * Math.sin(t1 + t2),
  ];

  const toPlot = (a1: number, a2: number): [number, number] => [
    SQ.cx + (a1 / Math.PI) * SQ.half,
    SQ.cy - (a2 / Math.PI) * SQ.half,
  ];

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !svgRef.current) return;
    const [x, y] = svgCoords(e, svgRef.current, W, H);
    if (dragging.current === "elbow") {
      onChange(Math.atan2(BASE[1] - y, x - BASE[0]), t2);
    } else {
      onChange(t1, Math.atan2(elbow[1] - y, x - elbow[0]) - t1);
    }
  };

  // trail polyline segments, broken at wrap jumps
  const segments: [number, number][][] = [];
  let cur: [number, number][] = [];
  for (let i = 0; i < trail.length; i++) {
    if (i > 0 && (Math.abs(trail[i][0] - trail[i - 1][0]) > 2 || Math.abs(trail[i][1] - trail[i - 1][1]) > 2)) {
      if (cur.length > 1) segments.push(cur);
      cur = [];
    }
    cur.push(toPlot(trail[i][0], trail[i][1]));
  }
  if (cur.length > 1) segments.push(cur);

  const pt = toPlot(t1, t2);
  const tg = toPlot(TARGET[0], TARGET[1]);
  const tgGhost = toPlot(TARGET[0] + 2 * Math.PI, TARGET[1]); // same config, other side of seam

  return (
    <WidgetShell
      title="A 2R arm and its configuration point"
      onReset={onReset}
      caption={
        <>
          Left: the physical arm — drag the elbow (joint 1) or the tip (joint 2). Right: the{" "}
          <em>same</em> robot as a single point in the flat (θ₁, θ₂) picture. Edge colors mark
          which edges are secretly glued.
        </>
      }
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={() => (dragging.current = null)}
        onPointerLeave={() => (dragging.current = null)}
      >
        {/* ---- left: arm ---- */}
        <circle cx={BASE[0]} cy={BASE[1]} r={L1 + L2} fill="#f1efe7" stroke="#e4e1d8" />
        <line x1={BASE[0]} y1={BASE[1]} x2={elbow[0]} y2={elbow[1]} stroke="#6741d9" strokeWidth={9} strokeLinecap="round" />
        <line x1={elbow[0]} y1={elbow[1]} x2={tip[0]} y2={tip[1]} stroke="#c2571c" strokeWidth={7} strokeLinecap="round" />
        <circle cx={BASE[0]} cy={BASE[1]} r={7} fill="#fff" stroke="#33343d" strokeWidth={2} />
        <g className="cursor-grab" onPointerDown={e => { e.preventDefault(); dragging.current = "elbow"; }}>
          <circle cx={elbow[0]} cy={elbow[1]} r={15} fill="#6741d922" />
          <circle cx={elbow[0]} cy={elbow[1]} r={6.5} fill="#fff" stroke="#6741d9" strokeWidth={2.5} />
        </g>
        <g className="cursor-grab" onPointerDown={e => { e.preventDefault(); dragging.current = "tip"; }}>
          <circle cx={tip[0]} cy={tip[1]} r={15} fill="#c2571c22" />
          <circle cx={tip[0]} cy={tip[1]} r={6.5} fill="#fff" stroke="#c2571c" strokeWidth={2.5} />
        </g>

        {/* ---- right: flat C-space ---- */}
        <rect
          x={SQ.cx - SQ.half} y={SQ.cy - SQ.half} width={2 * SQ.half} height={2 * SQ.half}
          fill="#ffffff" stroke="none"
        />
        {/* glued edge markers: left/right = blue, top/bottom = green */}
        <line x1={SQ.cx - SQ.half} y1={SQ.cy - SQ.half} x2={SQ.cx - SQ.half} y2={SQ.cy + SQ.half} stroke="#3b6fd4" strokeWidth={3} />
        <line x1={SQ.cx + SQ.half} y1={SQ.cy - SQ.half} x2={SQ.cx + SQ.half} y2={SQ.cy + SQ.half} stroke="#3b6fd4" strokeWidth={3} />
        <line x1={SQ.cx - SQ.half} y1={SQ.cy - SQ.half} x2={SQ.cx + SQ.half} y2={SQ.cy - SQ.half} stroke="#2f9e44" strokeWidth={3} />
        <line x1={SQ.cx - SQ.half} y1={SQ.cy + SQ.half} x2={SQ.cx + SQ.half} y2={SQ.cy + SQ.half} stroke="#2f9e44" strokeWidth={3} />

        {/* axes labels */}
        <text x={SQ.cx} y={SQ.cy + SQ.half + 24} fontSize="13" textAnchor="middle" fill="#4b4b5e" fontStyle="italic">θ₁</text>
        <text x={SQ.cx - SQ.half - 22} y={SQ.cy + 4} fontSize="13" fill="#4b4b5e" fontStyle="italic">θ₂</text>
        <text x={SQ.cx - SQ.half - 6} y={SQ.cy + SQ.half + 16} fontSize="10" textAnchor="middle" fill="#8a8a9b">−π</text>
        <text x={SQ.cx + SQ.half + 6} y={SQ.cy + SQ.half + 16} fontSize="10" textAnchor="middle" fill="#8a8a9b">π</text>

        {/* trail */}
        {segments.map((seg, i) => (
          <polyline key={i} points={seg.map(p => p.join(",")).join(" ")} fill="none" stroke="#6741d9" strokeWidth={1.6} opacity={0.5} />
        ))}

        {/* target star (and its ghost twin across the seam) */}
        <text x={tg[0]} y={tg[1] + 5} fontSize="16" textAnchor="middle">⭐</text>
        {tgGhost[0] < SQ.cx + SQ.half + 20 && (
          <text x={tgGhost[0]} y={tgGhost[1] + 5} fontSize="16" textAnchor="middle" opacity={0.3}>⭐</text>
        )}

        {/* configuration point */}
        <circle cx={pt[0]} cy={pt[1]} r={7} fill="#d9483f" stroke="#fff" strokeWidth={2} />
      </svg>

      <ControlBar>
        <LabeledSlider label="θ₁" value={t1} min={-Math.PI} max={Math.PI} onChange={v => onChange(v, t2)} fmt={v => `${deg(v).toFixed(0)}°`} color="#6741d9" width={190} />
        <LabeledSlider label="θ₂" value={t2} min={-Math.PI} max={Math.PI} onChange={v => onChange(t1, v)} fmt={v => `${deg(v).toFixed(0)}°`} color="#c2571c" width={190} />
      </ControlBar>
    </WidgetShell>
  );
}

/* ================= widget: torus ================= */

const R0 = 1.35;
const r0 = 0.55;

function torusPoint(t1: number, t2: number): [number, number, number] {
  return [(R0 + r0 * Math.cos(t2)) * Math.cos(t1), (R0 + r0 * Math.cos(t2)) * Math.sin(t1), r0 * Math.sin(t2)];
}

function TorusView({ q, trail }: { q: [number, number]; trail: [number, number][] }) {
  const p = torusPoint(q[0], q[1]);
  const tg = torusPoint(TARGET[0], TARGET[1]);

  // seams, matching the square's edge colors
  const seam1: [number, number, number][] = []; // θ1 = ±π (blue edges)
  const seam2: [number, number, number][] = []; // θ2 = ±π (green edges)
  for (let i = 0; i <= 64; i++) {
    const s = (i / 64) * 2 * Math.PI;
    seam1.push(torusPoint(Math.PI, s));
    seam2.push(torusPoint(s, Math.PI));
  }

  // trail in 3D (split not needed — the torus has no seam!)
  const trail3d = trail.map(t => torusPoint(t[0], t[1]));

  return (
    <WidgetShell
      title="The same C-space, glued honestly: a torus"
      caption={
        <>
          The blue circle is where the square's blue edges were glued; green likewise. The red
          point and purple trail are the <em>same</em> data as above — drag the arm and watch.
          Rotate the view by dragging.
        </>
      }
    >
      <Scene3D camera={[2.6, 2.6, 3.4]}>
        <mesh>
          <torusGeometry args={[R0, r0, 48, 96]} />
          <meshStandardMaterial color="#cfc9e8" transparent opacity={0.5} roughness={0.7} />
        </mesh>
        <mesh>
          <torusGeometry args={[R0, r0 * 1.001, 24, 48]} />
          <meshStandardMaterial color="#9a91c4" wireframe transparent opacity={0.18} />
        </mesh>
        <Line points={seam1} color="#3b6fd4" lineWidth={2.5} />
        <Line points={seam2} color="#2f9e44" lineWidth={2.5} />
        {trail3d.length > 1 && <Line points={trail3d} color="#6741d9" lineWidth={2} transparent opacity={0.7} />}
        <mesh position={p}>
          <sphereGeometry args={[0.07, 20, 20]} />
          <meshStandardMaterial color="#d9483f" />
        </mesh>
        <mesh position={tg}>
          <sphereGeometry args={[0.055, 20, 20]} />
          <meshStandardMaterial color="#caa53d" emissive="#caa53d" emissiveIntensity={0.4} />
        </mesh>
      </Scene3D>
    </WidgetShell>
  );
}
