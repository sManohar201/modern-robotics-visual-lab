import { useRef, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { svgCoords } from "../../lib/svg";

const GOOD = "#2f9e44";
const BAD = "#d9483f";
const CONE_FILL = "#caa53d28";
const CONE_EDGE = "#b08c1d";
const NORMAL_COLOR = "#3b6fd4";
const DIST_COLOR = "#6741d9";

/* ====================================================================== */
/* contact mechanics                                                      */
/* ====================================================================== */

type Vec3 = [number, number, number]; // planar wrench (mz, fx, fy)

/** Cross-style moment of a planar force f at point p about the origin: mz = px*fy - py*fx. */
function wrench(px: number, py: number, fx: number, fy: number): Vec3 {
  return [px * fy - py * fx, fx, fy];
}

const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Positive-span test for force closure of a planar grasp.
 * The contacts yield force closure iff their wrench rays positively span R^3,
 * i.e. for EVERY direction c in R^3 there is some wrench Fi with c·Fi > 0
 * (no closed half-space contains all the wrenches). We test this honestly by
 * sweeping a dense set of unit directions c and checking max_i (c·F̂i) > tol for
 * all of them. The smallest such max over the sphere is the closure margin:
 * positive ⇒ closure, ≤0 ⇒ a disturbance in direction −c cannot be resisted.
 */
function closureMargin(wrenches: Vec3[]): number {
  if (wrenches.length === 0) return -1;
  // normalize each wrench ray (moment is already in consistent length units
  // because contacts live on a body of characteristic size ~1)
  const W = wrenches.map(w => {
    const n = Math.hypot(w[0], w[1], w[2]);
    return (n < 1e-9 ? [0, 0, 0] : [w[0] / n, w[1] / n, w[2] / n]) as Vec3;
  });
  let worst = Infinity;
  // sweep directions on the unit sphere (lat/long grid)
  const NLAT = 18;
  const NLON = 36;
  for (let i = 0; i <= NLAT; i++) {
    const phi = (Math.PI * i) / NLAT - Math.PI / 2;
    const cp = Math.cos(phi);
    for (let j = 0; j < NLON; j++) {
      const lam = (2 * Math.PI * j) / NLON;
      const c: Vec3 = [cp * Math.cos(lam), cp * Math.sin(lam), Math.sin(phi)];
      let best = -Infinity;
      for (const w of W) best = Math.max(best, dot3(c, w));
      worst = Math.min(worst, best);
    }
  }
  return worst;
}

/**
 * Can the composite wrench cone resist an external disturbance wrench `d`?
 * The contacts can apply −d iff −d ∈ pos({Fi}), i.e. ∃ k ≥ 0 with Σ kᵢ Fᵢ = −d.
 * Solved as a small nonnegative least-squares by projected gradient; returns the
 * residual ‖Σ kᵢFᵢ + d‖ (≈0 means the disturbance is resisted).
 */
function disturbanceResidual(wrenches: Vec3[], d: Vec3): number {
  const target: Vec3 = [-d[0], -d[1], -d[2]];
  const m = wrenches.length;
  if (m === 0) return Math.hypot(target[0], target[1], target[2]);
  const k = new Array(m).fill(0);
  const resid = (): Vec3 => {
    const r: Vec3 = [-target[0], -target[1], -target[2]];
    for (let i = 0; i < m; i++) {
      r[0] += k[i] * wrenches[i][0];
      r[1] += k[i] * wrenches[i][1];
      r[2] += k[i] * wrenches[i][2];
    }
    return r; // = Σ kF − target
  };
  let step = 0.05;
  for (let it = 0; it < 400; it++) {
    const r = resid();
    for (let i = 0; i < m; i++) {
      const g = dot3(r, wrenches[i]); // gradient of ½‖r‖² wrt kᵢ
      k[i] = Math.max(0, k[i] - step * g);
    }
    if (it % 80 === 79) step *= 0.6;
  }
  const r = resid();
  return Math.hypot(r[0], r[1], r[2]);
}

/* ====================================================================== */
/* page                                                                   */
/* ====================================================================== */

export default function FormClosure() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 12"
        section="Grasping & Coordinated Manipulation"
        title="Force and Form Closure"
        lede="A grasp succeeds when the fingers can generate a contact force to oppose any disturbance the object might suffer. Geometrically: the contact wrenches must positively span the whole wrench space, so their cone wraps completely around the origin."
      />

      <p>
        Each finger touching the object applies a force constrained to its friction cone. Pick a
        reference frame and a contact force <M>{"f"}</M> at location <M>{"p"}</M> becomes a{" "}
        <strong>wrench</strong> <M>{"F = ([p]f,\\, f)"}</M> — for a planar body, the three numbers
      </p>
      <Eq>{"F = \\begin{pmatrix} m_z \\\\ f_x \\\\ f_y \\end{pmatrix}, \\qquad m_z = p_x f_y - p_y f_x."}</Eq>
      <p>
        The two edges of each planar friction cone give two wrench rays; the wrenches a single
        contact can transmit are their positive span, the <strong>wrench cone</strong>{" "}
        <M>{"\\mathrm{WC}_i = \\mathrm{pos}(\\{F_{i,1}, F_{i,2}\\})"}</M>. Stacking all contacts, the
        total set of wrenches the grasp can apply is the <strong>composite wrench cone</strong>
      </p>
      <Eq>{"\\mathrm{WC} = \\mathrm{pos}\\Big(\\bigcup_i \\mathrm{WC}_i\\Big) = \\Big\\{ \\textstyle\\sum_i k_i F_i \\;\\big|\\; k_i \\ge 0 \\Big\\}."}</Eq>

      <KeyIdea>
        A grasp has <strong>force closure</strong> when its composite wrench cone is all of wrench
        space — for a planar body, <M>{"\\mathrm{pos}(\\{F_i\\}) = \\mathbb{R}^3"}</M>. Then for{" "}
        <em>any</em> disturbance wrench the fingers can produce an equal and opposite reaction, and
        the object is held. Equivalently: the convex hull of the wrench rays contains the origin
        strictly in its interior.
      </KeyIdea>

      <p>
        <strong>Form closure</strong> is the special case where friction is ignored (each contact
        contributes only its inward normal wrench). Because <M>{"\\mathbb{R}^n"}</M> can be positively
        spanned by <M>{"n+1"}</M> vectors but no fewer, a planar body needs at least{" "}
        <strong>four</strong> frictionless contacts, and a spatial body at least{" "}
        <strong>seven</strong> (Theorem 12.6). Friction widens each contact's contribution from a
        single ray into a cone, so <em>force</em> closure can often be achieved with as few as two
        fingers.
      </p>

      <H2>The positive-span test</H2>
      <p>
        Collect the wrench rays as the columns of <M>{"F = [F_1 \\cdots F_j]"}</M>. Closure holds iff
        there is no nonzero direction <M>{"c"}</M> with <M>{"c^\\top F_i \\le 0"}</M> for every
        <M>{"\\,i"}</M> — i.e. no closed half-space of wrench space contains all the rays. If such a{" "}
        <M>{"c"}</M> exists, a disturbance wrench in the <M>{"-c"}</M> direction cannot be resisted
        and the object escapes. The widget below sweeps directions over the wrench sphere and reports
        the <strong>closure margin</strong>: the worst-case best alignment, positive exactly when the
        grasp is closed.
      </p>

      <ClosureWidget />

      <Aside>
        Force closure guarantees the grasp can resist disturbances, but says nothing about how{" "}
        <em>well</em>. A grasp metric — for example the radius of the largest wrench ball centered at
        the origin that still fits inside the composite wrench cone — turns the binary verdict into a
        quality score, letting a planner push contacts toward more robust placements. Spread the
        contacts out and the inscribed ball grows.
      </Aside>

      <p>
        Force closure is the foundation of robotic grasping: a manipulation plan first chooses
        contacts that achieve closure, then commands finger forces inside the friction cones whose
        sum cancels gravity and any expected disturbance. The same positive-span machinery, lifted to
        the six-dimensional wrench space, decides closure for three-dimensional objects.
      </p>

      <BookRef>Modern Robotics §12.1.7 — Form Closure (Thm 12.6, LP test Eq. 12.14); §12.2.2 — Planar Graphical Methods & Force Closure.</BookRef>
    </div>
  );
}

/* ====================================================================== */
/* widget: polygon + draggable finger contacts + disturbance             */
/* ====================================================================== */

const VW = 740;
const VH = 460;
const CENTER: [number, number] = [300, 230];
const SCALE = 150; // body model units → px

// square object with side 2 (model units), centered at origin → corners ±1
const POLY: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

type Contact = { edge: number; t: number }; // edge index, param 0..1 along edge

function edgePoint(edge: number, t: number): { p: [number, number]; n: [number, number] } {
  const a = POLY[edge];
  const b = POLY[(edge + 1) % POLY.length];
  const p: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  // edge direction
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  // inward normal: for CCW polygon, inward normal of edge (dx,dy) is (dy,-dx)... check sign by pointing to center(origin)
  let nx = dy / len;
  let ny = -dx / len;
  // ensure it points inward (toward origin = -p direction)
  if (nx * p[0] + ny * p[1] > 0) {
    nx = -nx;
    ny = -ny;
  }
  return { p, n: [nx, ny] };
}

// model coords → svg px (model y up → svg y down)
const toSvg = (m: [number, number]): [number, number] => [CENTER[0] + m[0] * SCALE, CENTER[1] - m[1] * SCALE];

function ClosureWidget() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mu, setMu] = useState(0.4);
  const [contacts, setContacts] = useState<Contact[]>([
    { edge: 0, t: 0.5 },
    { edge: 2, t: 0.5 },
  ]);
  const [dist, setDist] = useState<Vec3>([0, 1.2, 0]); // disturbance wrench (mz, fx, fy)
  const dragging = useRef<number | null>(null);
  const dragDist = useRef(false);

  const alpha = Math.atan(mu);

  // build all cone-edge wrenches
  const allWrenches: Vec3[] = [];
  const drawData = contacts.map(c => {
    const { p, n } = edgePoint(c.edge, c.t);
    // cone edges = inward normal rotated by ±alpha
    const rot = (a: number): [number, number] => [
      n[0] * Math.cos(a) - n[1] * Math.sin(a),
      n[0] * Math.sin(a) + n[1] * Math.cos(a),
    ];
    const e1 = rot(alpha);
    const e2 = rot(-alpha);
    allWrenches.push(wrench(p[0], p[1], e1[0], e1[1]));
    allWrenches.push(wrench(p[0], p[1], e2[0], e2[1]));
    return { p, n, e1, e2 };
  });

  const margin = closureMargin(allWrenches);
  const closed = margin > 0.04;
  const resid = disturbanceResidual(allWrenches, dist);
  const resisted = resid < 0.06;

  const addContact = () => {
    if (contacts.length >= 4) return;
    setContacts([...contacts, { edge: contacts.length % 4, t: 0.35 }]);
  };
  const removeContact = () => {
    if (contacts.length <= 1) return;
    setContacts(contacts.slice(0, -1));
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const [x, y] = svgCoords(e, svgRef.current, VW, VH);
    if (dragDist.current) {
      // disturbance handle near body center: force part from offset; moment from slider
      const fx = (x - CENTER[0]) / 90;
      const fy = -(y - CENTER[1]) / 90;
      setDist([dist[0], fx, fy]);
      return;
    }
    if (dragging.current === null) return;
    // snap pointer to nearest point on the polygon boundary
    const mx = (x - CENTER[0]) / SCALE;
    const my = -(y - CENTER[1]) / SCALE;
    let best = { edge: 0, t: 0.5, d: Infinity };
    for (let edge = 0; edge < POLY.length; edge++) {
      const a = POLY[edge];
      const b = POLY[(edge + 1) % POLY.length];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len2 = dx * dx + dy * dy;
      let t = ((mx - a[0]) * dx + (my - a[1]) * dy) / len2;
      t = Math.max(0.04, Math.min(0.96, t));
      const cx = a[0] + dx * t;
      const cy = a[1] + dy * t;
      const d = Math.hypot(mx - cx, my - cy);
      if (d < best.d) best = { edge, t, d };
    }
    const next = contacts.slice();
    next[dragging.current] = { edge: best.edge, t: best.t };
    setContacts(next);
  };

  // disturbance force arrow drawn from the body center
  const dForceTip: [number, number] = [CENTER[0] + dist[1] * 90, CENTER[1] - dist[2] * 90];

  const polySvg = POLY.map(toSvg).map(p => p.join(",")).join(" ");
  const coneLenPx = 95;

  const met = closed && resisted && Math.hypot(dist[1], dist[2]) + Math.abs(dist[0]) > 0.6;

  return (
    <>
      <WidgetShell
        title="Place finger contacts — do they positively span the wrench space?"
        onReset={() => {
          setMu(0.4);
          setContacts([
            { edge: 0, t: 0.5 },
            { edge: 2, t: 0.5 },
          ]);
          setDist([0, 1.2, 0]);
        }}
        caption={
          <>
            Drag each finger along the object's edges; the gold wedge at every contact is its friction
            cone about the inward <span style={{ color: NORMAL_COLOR }}>normal</span>. The verdict tests
            whether the cone-edge wrenches positively span <span className="mono">ℝ³</span> (force
            closure). Drag the <span style={{ color: DIST_COLOR }}>purple</span> disturbance force and
            set its moment; it is <span style={{ color: GOOD }}>resisted</span> only when the grasp can
            generate an opposing wrench.
          </>
        }
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full touch-none select-none"
          onPointerMove={onMove}
          onPointerUp={() => {
            dragging.current = null;
            dragDist.current = false;
          }}
          onPointerLeave={() => {
            dragging.current = null;
            dragDist.current = false;
          }}
        >
          <defs>
            <marker id="cl-n" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto">
              <path d="M0,0 L6.5,3 L0,6 Z" fill={NORMAL_COLOR} />
            </marker>
            <marker id="cl-d" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
              <path d="M0,0 L7,3 L0,6 Z" fill={resisted ? GOOD : DIST_COLOR} />
            </marker>
          </defs>

          {/* body */}
          <polygon points={polySvg} fill="#f0ece1" stroke="#8a8579" strokeWidth={2} />
          <circle cx={CENTER[0]} cy={CENTER[1]} r={3} fill="#8a8579" />

          {/* contacts: cones + normals + handles */}
          {drawData.map((d, i) => {
            const pp = toSvg(d.p);
            const nTip: [number, number] = [pp[0] + d.n[0] * 70, pp[1] - d.n[1] * 70];
            const c1: [number, number] = [pp[0] + d.e1[0] * coneLenPx, pp[1] - d.e1[1] * coneLenPx];
            const c2: [number, number] = [pp[0] + d.e2[0] * coneLenPx, pp[1] - d.e2[1] * coneLenPx];
            return (
              <g key={i}>
                <path d={`M ${pp[0]} ${pp[1]} L ${c1[0]} ${c1[1]} L ${c2[0]} ${c2[1]} Z`} fill={CONE_FILL} />
                <line x1={pp[0]} y1={pp[1]} x2={c1[0]} y2={c1[1]} stroke={CONE_EDGE} strokeWidth={1.3} />
                <line x1={pp[0]} y1={pp[1]} x2={c2[0]} y2={c2[1]} stroke={CONE_EDGE} strokeWidth={1.3} />
                <line x1={pp[0]} y1={pp[1]} x2={nTip[0]} y2={nTip[1]} stroke={NORMAL_COLOR} strokeWidth={1.4} strokeDasharray="4 4" markerEnd="url(#cl-n)" />
                <g
                  className="cursor-grab"
                  onPointerDown={e => {
                    e.preventDefault();
                    dragging.current = i;
                    (e.target as Element).setPointerCapture?.(e.pointerId);
                  }}
                >
                  <circle cx={pp[0]} cy={pp[1]} r={15} fill="#c2571c22" />
                  <circle cx={pp[0]} cy={pp[1]} r={7.5} fill="#fff" stroke="#c2571c" strokeWidth={2.5} />
                  <text x={pp[0]} y={pp[1] + 4} textAnchor="middle" className="ui" fontSize={10} fill="#c2571c">{i + 1}</text>
                </g>
              </g>
            );
          })}

          {/* disturbance wrench */}
          <line
            x1={CENTER[0]}
            y1={CENTER[1]}
            x2={dForceTip[0]}
            y2={dForceTip[1]}
            stroke={resisted ? GOOD : DIST_COLOR}
            strokeWidth={3}
            markerEnd="url(#cl-d)"
          />
          {Math.abs(dist[0]) > 0.05 && (
            <path
              d={`M ${CENTER[0] + 34} ${CENTER[1]} A 34 34 0 ${dist[0] > 0 ? "0 0" : "0 1"} ${CENTER[0] + 34 * Math.cos(dist[0])} ${CENTER[1] - 34 * Math.sin(dist[0])}`}
              fill="none"
              stroke={DIST_COLOR}
              strokeWidth={2}
            />
          )}
          <g
            className="cursor-grab"
            onPointerDown={e => {
              e.preventDefault();
              dragDist.current = true;
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
          >
            <circle cx={dForceTip[0]} cy={dForceTip[1]} r={14} fill={`${DIST_COLOR}22`} />
            <circle cx={dForceTip[0]} cy={dForceTip[1]} r={6.5} fill="#fff" stroke={DIST_COLOR} strokeWidth={2.5} />
          </g>

          {/* verdict */}
          <text x={VW - 230} y={40} className="ui" fontSize={13} fontWeight={700} fill={closed ? GOOD : BAD}>
            {closed ? "FORCE CLOSURE ✓" : "no closure"}
          </text>
          <text x={VW - 230} y={64} className="ui" fontSize={12} fill={resisted ? GOOD : BAD}>
            disturbance: {resisted ? "resisted" : "escapes"}
          </text>
        </svg>

        <ControlBar>
          <button
            onClick={addContact}
            className="ui text-[12px] px-2.5 py-1 rounded border border-[var(--rule)] bg-white hover:border-[var(--ink-faint)]"
          >
            + finger
          </button>
          <button
            onClick={removeContact}
            className="ui text-[12px] px-2.5 py-1 rounded border border-[var(--rule)] bg-white hover:border-[var(--ink-faint)]"
          >
            − finger
          </button>
          <LabeledSlider label="μ" value={mu} min={0} max={1.2} step={0.01} onChange={setMu} fmt={v => v.toFixed(2)} color={CONE_EDGE} width={150} />
          <LabeledSlider label="dist. mz" value={dist[0]} min={-1.5} max={1.5} step={0.05} onChange={v => setDist([v, dist[1], dist[2]])} fmt={v => v.toFixed(2)} color={DIST_COLOR} width={150} />
          <Readout label="contacts" value={`${contacts.length}`} />
          <Readout label="closure margin" value={margin.toFixed(3)} color={closed ? GOOD : BAD} />
          <Readout label="dist. residual" value={resid.toFixed(3)} color={resisted ? GOOD : BAD} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch12-grasp-closure" met={met} holdMs={500}>
        Build a force-closure grasp that resists a real disturbance. Place fingers (raise{" "}
        <M>{"\\mu"}</M> and/or add a third or fourth finger) until the verdict reads{" "}
        <strong>FORCE CLOSURE</strong>, then drag the purple disturbance wrench (give it some force{" "}
        <em>and</em> a moment) and confirm it stays <span style={{ color: GOOD }}>resisted</span>.
        A closed grasp resists every disturbance — the closure margin must stay positive.
      </Challenge>
    </>
  );
}
