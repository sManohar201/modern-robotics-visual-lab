import { useRef, useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton } from "../../components/widgets/WidgetShell";
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
    Math.abs(wrapAngle(q[0] - TARGET[0])) < rad(15) &&
    Math.abs(wrapAngle(q[1] - TARGET[1])) < rad(15);

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
        Drag the arm and watch its configuration move as a point in the <strong>Flat</strong>{" "}
        view. Then rotate joint 1 <em>past</em> 180° — the point teleports from one edge to
        the other. Switch to the <strong>Torus</strong> tab: same trail, no seam. Both tabs
        share one configuration point; only the picture changes.
      </p>

      <CSpaceExplorer q={q} trail={trail} onChange={update} onReset={reset} />

      <Challenge id="ch2-topo-wrap" met={wrapped} holdMs={100}>
        <strong>Drag the elbow handle</strong> counterclockwise past the pointing-left position
        (θ₁ → ±180°). Watch the red dot in the <strong>Flat</strong> view shoot off the right
        edge and reappear on the left — the arm moved smoothly, only the <em>picture</em> tore.
        The sliders alone cannot do this; you must drag the arm through the seam.
      </Challenge>

      <p>
        <M>{"\\theta_1 = 179^\\circ"}</M> and <M>{"\\theta_1 = -179^\\circ"}</M> are physically{" "}
        <em>neighbors</em>. The square's left and right edges are the same configurations —
        so are its top and bottom. Gluing matching edges gives the honest picture: a{" "}
        <strong>torus</strong> with no seams.
      </p>
      <Eq>{"\\mathcal{C}_{2R} \\;=\\; S^1 \\times S^1 \\;=\\; T^2"}</Eq>

      <Challenge id="ch2-topo-target" met={atTarget}>
        Land the red dot inside the gold target circle at{" "}
        <M>{"(\\theta_1, \\theta_2) = (-170^\\circ,\\,60^\\circ)"}</M>. The target sits near the{" "}
        <em>left</em> edge of the flat square — drag joint 1 nearly all the way left, or cross
        the seam from the right: both are the same physical configuration.
      </Challenge>

      <KeyIdea>
        C-space = dimension <em>plus</em> topology. A revolute joint contributes a circle{" "}
        <M>{"S^1"}</M>, a prismatic joint a line <M>{"\\mathbb{R}"}</M>; the 2R arm's C-space is{" "}
        <M>{"S^1 \\times S^1 = T^2"}</M>, the torus.
      </KeyIdea>

      <H2>The vocabulary of C-space shapes</H2>
      <p>
        The torus <M>{"T^2"}</M> appearing above is one of several standard topological spaces
        that appear repeatedly as C-spaces in robotics. They have standard names and notation,
        and they combine under a product <M>{"\\times"}</M> that means "one copy of each,
        independently."
      </p>
      <p>
        <M>{"\\mathbb{R}^n"}</M> is ordinary <M>{"n"}</M>-dimensional Euclidean space: a flat,
        unbounded space with no periodicity. Prismatic joint displacements live here — there is no
        wrap-around. A point mass moving freely in the plane has C-space <M>{"\\mathbb{R}^2"}</M>.
      </p>
      <p>
        <M>{"S^1"}</M> is the circle: a one-dimensional space that wraps around. A single revolute
        joint's angle lives on <M>{"S^1"}</M>, not on a line — because{" "}
        <M>{"\\theta = 0"}</M> and <M>{"\\theta = 2\\pi"}</M> are the same physical
        configuration.
      </p>
      <p>
        <M>{"S^2"}</M> is the surface of a sphere in 3D: a two-dimensional space with no
        boundary and no flat global chart. The direction a unit vector points lives on{" "}
        <M>{"S^2"}</M>. It is not the same as a flat square — you cannot cover a sphere with a
        single flat map without distortion or cuts.
      </p>
      <p>
        <M>{"T^n = S^1 \\times S^1 \\times \\cdots \\times S^1"}</M> (<M>{"n"}</M> times) is
        the <M>{"n"}</M>-torus: the C-space of <M>{"n"}</M> independent revolute joints. The
        2-torus <M>{"T^2"}</M> is the donut we just saw. The 3-torus <M>{"T^3"}</M> is the
        C-space of a 3R arm — impossible to visualize directly, but well-defined mathematically.
      </p>
      <p>
        A critical non-identity worth memorizing:
      </p>
      <Eq>{"S^1 \\times S^1 = T^2 \\;\\neq\\; S^2"}</Eq>
      <p>
        A torus and a sphere are both two-dimensional surfaces, but they are topologically
        distinct — a torus has a hole, a sphere does not. The C-space of a 2R arm is a torus,
        not a sphere. This matters: a path on a torus can thread through the hole; no path on a
        sphere can. The cleanest way to see the difference is to try to shrink a loop:
      </p>

      <SphereVsTorus />

      <H2>Common C-space topologies</H2>
      <p>
        Given a robot's joint arrangement, its C-space topology follows immediately from the
        joint types: each revolute joint contributes a factor of <M>{"S^1"}</M>, each prismatic
        joint a factor of <M>{"\\mathbb{R}"}</M>, and so on. The table below lists the most
        common cases.
      </p>
      <p>
        A <strong>PR robot</strong> (prismatic then revolute) has C-space{" "}
        <M>{"\\mathbb{R} \\times S^1"}</M>: one slider direction and one angle. A{" "}
        <strong>2R arm</strong> has <M>{"S^1 \\times S^1 = T^2"}</M>. A{" "}
        <strong>3R arm</strong> has <M>{"T^3"}</M>. A <strong>planar rigid body</strong> free to
        slide and rotate has <M>{"\\mathbb{R}^2 \\times S^1"}</M>: two translations on a flat
        plane, plus orientation on a circle. The angle wraps; the position does not.
      </p>
      <p>
        A <strong>spatial rigid body</strong> free in 3D has six DOF, but its C-space is not{" "}
        <M>{"\\mathbb{R}^6"}</M>. Three translational DOF live in{" "}
        <M>{"\\mathbb{R}^3"}</M>. The three rotational DOF live in the rotation group{" "}
        <M>{"SO(3)"}</M> — which has the topology of <M>{"\\mathbb{R}P^3"}</M>, a
        three-dimensional space that is neither a torus nor a sphere. We return to this in Chapter
        3 when we study rotation matrices.
      </p>

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

/* ================= widget: arm + c-space (flat square & torus) ================= */

// Arm panel (left column)
const AW = 310, AH = 330;
const BASE: [number, number] = [155, 165];
const L1 = 80, L2 = 63;

// Flat-square panel (right column, tab 1)
const SW = 440, SH = 292;
const SQ = { cx: 220, cy: 146, half: 118 };
// tolerance in SVG units: 15° / 180° × half
const SQ_TOL = Math.round((15 / 180) * 118);

// Torus geometry (right column, tab 2)
const R0 = 1.35;
const r0 = 0.55;

function torusPoint(t1: number, t2: number): [number, number, number] {
  return [
    (R0 + r0 * Math.cos(t2)) * Math.cos(t1),
    (R0 + r0 * Math.cos(t2)) * Math.sin(t1),
    r0 * Math.sin(t2),
  ];
}

function CSpaceExplorer({
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
  const [view, setView] = useState<"square" | "torus">("square");
  const armRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<"elbow" | "tip" | null>(null);

  const [t1, t2] = q;
  const localMet =
    Math.abs(wrapAngle(t1 - TARGET[0])) < rad(15) &&
    Math.abs(wrapAngle(t2 - TARGET[1])) < rad(15);
  const elbow: [number, number] = [BASE[0] + L1 * Math.cos(t1), BASE[1] - L1 * Math.sin(t1)];
  const tip: [number, number] = [
    elbow[0] + L2 * Math.cos(t1 + t2),
    elbow[1] - L2 * Math.sin(t1 + t2),
  ];

  // flat-square helpers
  const toPlot = (a1: number, a2: number): [number, number] => [
    SQ.cx + (a1 / Math.PI) * SQ.half,
    SQ.cy - (a2 / Math.PI) * SQ.half,
  ];
  const segments: [number, number][][] = [];
  let cur: [number, number][] = [];
  for (let i = 0; i < trail.length; i++) {
    if (i > 0 && (Math.abs(trail[i][0] - trail[i-1][0]) > 2 || Math.abs(trail[i][1] - trail[i-1][1]) > 2)) {
      if (cur.length > 1) segments.push(cur);
      cur = [];
    }
    cur.push(toPlot(trail[i][0], trail[i][1]));
  }
  if (cur.length > 1) segments.push(cur);
  const pt = toPlot(t1, t2);
  const tg = toPlot(TARGET[0], TARGET[1]);
  const tgGhost = toPlot(TARGET[0] + 2 * Math.PI, TARGET[1]);

  // torus helpers
  const p3d = torusPoint(q[0], q[1]);
  const tg3d = torusPoint(TARGET[0], TARGET[1]);
  const trail3d = trail.map(([a, b]) => torusPoint(a, b));
  const seam1: [number, number, number][] = [];
  const seam2: [number, number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const s = (i / 64) * 2 * Math.PI;
    seam1.push(torusPoint(Math.PI, s));
    seam2.push(torusPoint(s, Math.PI));
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !armRef.current) return;
    const [x, y] = svgCoords(e, armRef.current, AW, AH);
    if (dragging.current === "elbow") {
      onChange(Math.atan2(BASE[1] - y, x - BASE[0]), t2);
    } else {
      onChange(t1, Math.atan2(elbow[1] - y, x - elbow[0]) - t1);
    }
  };

  return (
    <WidgetShell
      title="A 2R arm: flat square vs. torus"
      onReset={onReset}
      caption={
        <>
          Left: drag the elbow (joint 1) or the tip (joint 2). Right — <strong>Flat</strong>:
          the arm as a point in a (θ₁, θ₂) square; edge colors mark which edges are secretly
          the same. <strong>Torus</strong>: the honest C-space after gluing — same point, same
          trail, no seam. Blue circle = where blue edges were glued; green likewise.
        </>
      }
    >
      <div className="flex gap-3 items-start">
        {/* ── left: arm ── */}
        <div style={{ width: AW }} className="flex-none">
          <svg
            ref={armRef}
            viewBox={`0 0 ${AW} ${AH}`}
            className="w-full touch-none select-none"
            onPointerMove={onPointerMove}
            onPointerUp={() => (dragging.current = null)}
            onPointerLeave={() => (dragging.current = null)}
          >
            <circle cx={BASE[0]} cy={BASE[1]} r={L1 + L2} fill="#f1efe7" stroke="#e4e1d8" />
            <line x1={BASE[0]} y1={BASE[1]} x2={elbow[0]} y2={elbow[1]} stroke="#6741d9" strokeWidth={9} strokeLinecap="round" />
            <line x1={elbow[0]} y1={elbow[1]} x2={tip[0]} y2={tip[1]} stroke="#c2571c" strokeWidth={7} strokeLinecap="round" />
            <circle cx={BASE[0]} cy={BASE[1]} r={7} fill="#fff" stroke="#33343d" strokeWidth={2} />
            <g className="cursor-grab" onPointerDown={e => { e.preventDefault(); dragging.current = "elbow"; (e.target as Element).setPointerCapture?.(e.pointerId); }}>
              <circle cx={elbow[0]} cy={elbow[1]} r={15} fill="#6741d922" />
              <circle cx={elbow[0]} cy={elbow[1]} r={6.5} fill="#fff" stroke="#6741d9" strokeWidth={2.5} />
            </g>
            <g className="cursor-grab" onPointerDown={e => { e.preventDefault(); dragging.current = "tip"; (e.target as Element).setPointerCapture?.(e.pointerId); }}>
              <circle cx={tip[0]} cy={tip[1]} r={15} fill="#c2571c22" />
              <circle cx={tip[0]} cy={tip[1]} r={6.5} fill="#fff" stroke="#c2571c" strokeWidth={2.5} />
            </g>
            <text x={BASE[0]} y={AH - 8} fontSize="11" textAnchor="middle" fill="#8a8a9b" fontFamily="Inter,sans-serif">drag elbow or tip</text>
          </svg>
        </div>

        {/* ── right: tabbed view ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="ui flex items-center gap-1.5 mb-2 flex-none">
            <WidgetButton active={view === "square"} onClick={() => setView("square")}>Flat square</WidgetButton>
            <WidgetButton active={view === "torus"} onClick={() => setView("torus")}>Torus</WidgetButton>
            <span className="text-[11px] italic text-[var(--ink-soft)] ml-1.5">same data, different picture</span>
          </div>

          {view === "square" ? (
            <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full select-none">
              <rect x={SQ.cx - SQ.half} y={SQ.cy - SQ.half} width={2 * SQ.half} height={2 * SQ.half} fill="#ffffff" />
              {/* glued edges: left/right = blue (θ₁), top/bottom = green (θ₂) */}
              <line x1={SQ.cx - SQ.half} y1={SQ.cy - SQ.half} x2={SQ.cx - SQ.half} y2={SQ.cy + SQ.half} stroke="#3b6fd4" strokeWidth={3} />
              <line x1={SQ.cx + SQ.half} y1={SQ.cy - SQ.half} x2={SQ.cx + SQ.half} y2={SQ.cy + SQ.half} stroke="#3b6fd4" strokeWidth={3} />
              <line x1={SQ.cx - SQ.half} y1={SQ.cy - SQ.half} x2={SQ.cx + SQ.half} y2={SQ.cy - SQ.half} stroke="#2f9e44" strokeWidth={3} />
              <line x1={SQ.cx - SQ.half} y1={SQ.cy + SQ.half} x2={SQ.cx + SQ.half} y2={SQ.cy + SQ.half} stroke="#2f9e44" strokeWidth={3} />
              {/* axes */}
              <text x={SQ.cx} y={SQ.cy + SQ.half + 22} fontSize="13" textAnchor="middle" fill="#4b4b5e" fontStyle="italic">θ₁</text>
              <text x={SQ.cx - SQ.half - 20} y={SQ.cy + 5} fontSize="13" fill="#4b4b5e" fontStyle="italic">θ₂</text>
              <text x={SQ.cx - SQ.half - 4} y={SQ.cy + SQ.half + 14} fontSize="10" textAnchor="middle" fill="#8a8a9b">−π</text>
              <text x={SQ.cx + SQ.half + 4} y={SQ.cy + SQ.half + 14} fontSize="10" textAnchor="middle" fill="#8a8a9b">π</text>
              {/* trail */}
              {segments.map((seg, i) => (
                <polyline key={i} points={seg.map(p => p.join(",")).join(" ")} fill="none" stroke="#6741d9" strokeWidth={1.6} opacity={0.5} />
              ))}
              {/* target ring + ghost twin across the seam */}
              <circle cx={tg[0]} cy={tg[1]} r={SQ_TOL} fill={localMet ? "#caa53d33" : "none"} stroke="#caa53d" strokeWidth={1.5} strokeDasharray="4 3" />
              <circle cx={tg[0]} cy={tg[1]} r={4} fill="#caa53d" />
              <text x={tg[0] + SQ_TOL + 4} y={tg[1] + 4} fontSize="10" fill="#a08030" fontFamily="Inter,sans-serif">target</text>
              {tgGhost[0] < SQ.cx + SQ.half + 20 && (
                <circle cx={tgGhost[0]} cy={tgGhost[1]} r={SQ_TOL} fill="none" stroke="#caa53d" strokeWidth={1} strokeDasharray="4 3" opacity={0.3} />
              )}
              {/* config point */}
              <circle cx={pt[0]} cy={pt[1]} r={7} fill="#d9483f" stroke="#fff" strokeWidth={2} />
            </svg>
          ) : (
            <Scene3D camera={[2.6, 2.6, 3.4]} height={292}>
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
              <mesh position={p3d}>
                <sphereGeometry args={[0.07, 20, 20]} />
                <meshStandardMaterial color="#d9483f" />
              </mesh>
              <mesh position={tg3d}>
                <sphereGeometry args={[0.055, 20, 20]} />
                <meshStandardMaterial color="#caa53d" emissive="#caa53d" emissiveIntensity={0.4} />
              </mesh>
            </Scene3D>
          )}
        </div>
      </div>

      <ControlBar>
        <LabeledSlider label="θ₁" value={t1} min={-Math.PI} max={Math.PI} onChange={v => onChange(v, t2)} fmt={v => `${deg(v).toFixed(0)}°`} color="#6741d9" width={190} />
        <LabeledSlider label="θ₂" value={t2} min={-Math.PI} max={Math.PI} onChange={v => onChange(t1, v)} fmt={v => `${deg(v).toFixed(0)}°`} color="#c2571c" width={190} />
      </ControlBar>
    </WidgetShell>
  );
}

/* ================= widget: sphere vs torus — the hole matters ================= */

function SphereVsTorus() {
  const [t, setT] = useState(0);

  const TR = 0.8; // torus major radius
  const Tr = 0.34; // torus tube radius
  const SR = 0.8; // sphere radius
  const TX = -1.5; // torus center x
  const SX = 1.5; // sphere center x

  // torus loop: a meridian circle threading the hole. The slider slides it
  // around the ring — its radius never changes.
  const a = t * 2 * Math.PI;
  const torusLoop: [number, number, number][] = [];
  for (let i = 0; i <= 48; i++) {
    const s = (i / 48) * 2 * Math.PI;
    const rr = TR + (Tr + 0.018) * Math.cos(s);
    torusLoop.push([TX + rr * Math.cos(a), rr * Math.sin(a), (Tr + 0.018) * Math.sin(s)]);
  }

  // sphere loop: a latitude circle. The same slider walks it up to the pole —
  // it shrinks smoothly to a point.
  const phi = t * rad(88);
  const sphereLoop: [number, number, number][] = [];
  for (let i = 0; i <= 48; i++) {
    const s = (i / 48) * 2 * Math.PI;
    sphereLoop.push([
      SX + (SR + 0.012) * Math.cos(phi) * Math.cos(s),
      (SR + 0.012) * Math.cos(phi) * Math.sin(s),
      (SR + 0.012) * Math.sin(phi),
    ]);
  }

  return (
    <WidgetShell
      title="Same dimension, different shape: shrink the red loop"
      caption={
        <>
          One slider moves both red loops. On the sphere the loop slides to the pole and closes to
          a point — every loop on a sphere can. On the torus the loop threads the hole: it can
          slide around forever, but nothing can make it smaller. That obstruction <em>is</em> the
          topological difference between <span className="mono">T²</span> and{" "}
          <span className="mono">S²</span>.
        </>
      }
    >
      <Scene3D camera={[0, 2.4, 4.6]} height={340}>
        {/* torus */}
        <group position={[TX, 0, 0]}>
          <mesh>
            <torusGeometry args={[TR, Tr, 36, 72]} />
            <meshStandardMaterial color="#cfc9e8" transparent opacity={0.55} roughness={0.7} />
          </mesh>
        </group>
        {/* sphere */}
        <group position={[SX, 0, 0]}>
          <mesh>
            <sphereGeometry args={[SR, 40, 40]} />
            <meshStandardMaterial color="#c9dde8" transparent opacity={0.55} roughness={0.7} />
          </mesh>
        </group>
        <Line points={torusLoop} color="#d9483f" lineWidth={3} />
        <Line points={sphereLoop} color="#d9483f" lineWidth={3} />
      </Scene3D>
      <ControlBar>
        <LabeledSlider
          label="slide / shrink"
          value={t}
          min={0}
          max={1}
          step={0.005}
          onChange={setT}
          fmt={v => `${(v * 100).toFixed(0)}%`}
          color="#d9483f"
          width={260}
        />
      </ControlBar>
    </WidgetShell>
  );
}
