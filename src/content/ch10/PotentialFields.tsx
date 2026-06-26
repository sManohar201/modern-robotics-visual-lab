import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { svgCoords } from "../../lib/svg";

/* ============================================================
 * Page 10.3 — Virtual Potential Fields
 * Real U_att (quadratic) + U_rep (range-limited 1/d) gradients,
 * gradient-descent of a point robot, with a draggable obstacle
 * arrangement that produces a genuine local minimum.
 * ============================================================ */

const W = 540;
const H = 360;

const GOAL = { x: 480, y: 180 };

type Obs = { x: number; y: number; r: number };

const D_RANGE = 90; // range of influence for repulsion (book's d_range)

interface Force {
  fx: number;
  fy: number;
}

/** Attractive force toward goal: F = k_att (q_goal - q). */
function attractive(x: number, y: number, kAtt: number): Force {
  return { fx: kAtt * (GOAL.x - x), fy: kAtt * (GOAL.y - y) };
}

/**
 * Range-limited repulsive force from one obstacle, from the book's U_rep:
 *   U = (k/2)(1/d - 1/d_range)^2  for d < d_range, where d is distance to surface.
 *   F = -dU/dq = k (1/d - 1/d_range)(1/d^2)(unit vector away from obstacle).
 */
function repulsive(x: number, y: number, o: Obs, kRep: number): Force {
  const dx = x - o.x;
  const dy = y - o.y;
  const dc = Math.hypot(dx, dy);
  const d = dc - o.r; // distance to obstacle surface
  if (d >= D_RANGE) return { fx: 0, fy: 0 };
  const dd = Math.max(d, 4); // clamp near boundary to bound the force
  const mag = kRep * (1 / dd - 1 / D_RANGE) * (1 / (dd * dd));
  const ux = dx / (dc || 1);
  const uy = dy / (dc || 1);
  return { fx: mag * ux, fy: mag * uy };
}

function totalForce(x: number, y: number, obs: Obs[], kAtt: number, kRep: number): Force {
  let f = attractive(x, y, kAtt);
  for (const o of obs) {
    const r = repulsive(x, y, o, kRep);
    f = { fx: f.fx + r.fx, fy: f.fy + r.fy };
  }
  return f;
}

function inObstacle(x: number, y: number, obs: Obs[]): boolean {
  for (const o of obs) if (Math.hypot(x - o.x, y - o.y) <= o.r) return true;
  return false;
}

const START = { x: 60, y: 180 };

export default function PotentialFields() {
  const svgRef = useRef<SVGSVGElement>(null);
  // default layout: a "trap" — two obstacles flanking the line to the goal create a local min
  const [obs, setObs] = useState<Obs[]>([
    { x: 250, y: 120, r: 46 },
    { x: 250, y: 240, r: 46 },
  ]);
  const [kAtt, setKAtt] = useState(0.012);
  const [kRep, setKRep] = useState(900000);
  const [perturb, setPerturb] = useState(0);

  const [robot, setRobot] = useState({ x: START.x, y: START.y });
  const [running, setRunning] = useState(false);
  const robotRef = useRef(robot);
  robotRef.current = robot;
  const stuckRef = useRef(0);
  const [reached, setReached] = useState(false);
  const dragging = useRef<number | null>(null);

  // gradient descent (q̇ = F(q)) loop
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const tick = () => {
      const r = robotRef.current;
      const f = totalForce(r.x, r.y, obs, kAtt, kRep);
      // small random perturbation to escape local minima (scaled by slider)
      const px = (Math.random() - 0.5) * perturb;
      const py = (Math.random() - 0.5) * perturb;
      const dt = 0.9;
      let nx = r.x + (f.fx + px) * dt;
      let ny = r.y + (f.fy + py) * dt;
      nx = Math.max(2, Math.min(W - 2, nx));
      ny = Math.max(2, Math.min(H - 2, ny));
      const moved = Math.hypot(nx - r.x, ny - r.y);
      const next = { x: nx, y: ny };
      robotRef.current = next;
      setRobot(next);
      if (Math.hypot(nx - GOAL.x, ny - GOAL.y) < 12) {
        setReached(true);
        setRunning(false);
        return;
      }
      // detect stuck (local minimum): tiny motion for many frames
      if (moved < 0.15) stuckRef.current++;
      else stuckRef.current = Math.max(0, stuckRef.current - 1);
      if (stuckRef.current > 120) {
        setRunning(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, obs, kAtt, kRep, perturb]);

  const resetRobot = () => {
    setRobot({ x: START.x, y: START.y });
    robotRef.current = { x: START.x, y: START.y };
    stuckRef.current = 0;
    setReached(false);
    setRunning(false);
  };

  // force-field arrow grid
  const arrows = useMemo(() => {
    const out: { x: number; y: number; ax: number; ay: number }[] = [];
    const step = 36;
    for (let x = step / 2; x < W; x += step) {
      for (let y = step / 2; y < H; y += step) {
        if (inObstacle(x, y, obs)) continue;
        const f = totalForce(x, y, obs, kAtt, kRep);
        const m = Math.hypot(f.fx, f.fy) || 1;
        const len = Math.min(15, m * 0.9);
        out.push({ x, y, ax: (f.fx / m) * len, ay: (f.fy / m) * len });
      }
    }
    return out;
  }, [obs, kAtt, kRep]);

  // current force magnitude at the robot (for the "stuck" diagnostic)
  const fHere = totalForce(robot.x, robot.y, obs, kAtt, kRep);
  const fMag = Math.hypot(fHere.fx, fHere.fy);
  const distGoal = Math.hypot(robot.x - GOAL.x, robot.y - GOAL.y);

  const met = reached;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragging.current === null || !svgRef.current) return;
    const [x, y] = svgCoords(e, svgRef.current, W, H);
    setObs(prev => prev.map((o, i) => (i === dragging.current ? { ...o, x: Math.max(o.r, Math.min(W - o.r, x)), y: Math.max(o.r, Math.min(H - o.r, y)) } : o)));
  };

  return (
    <div>
      <PageHeader
        chapter="Chapter 10"
        section="Motion Planning"
        title="Virtual Potential Fields"
        lede="Pretend the goal is a valley and every obstacle a hill. Let the robot roll downhill along the negative gradient. It is fast, reactive, and runs online — but the landscape can trap it in a local minimum short of the goal."
      />

      <p>
        A potential field <M>{"\\mathcal{P}(q)"}</M> over the configuration space induces a force{" "}
        <M>{"F = -\\partial \\mathcal{P}/\\partial q"}</M> that drives the robot from high to low
        potential — exactly like a ball rolling under gravity. Assign the goal a low potential and
        obstacles a high one, and the negative gradient simultaneously pulls toward the goal and
        pushes off obstacles. Because the gradient is cheap to evaluate, the whole thing runs as
        reactive control, no plan stored in advance.
      </p>

      <H2>The two potentials</H2>
      <p>
        The goal is a quadratic <em>bowl</em> with its bottom at <M>{"q_{\\text{goal}}"}</M>:
      </p>
      <Eq>{"\\mathcal{P}_{\\text{goal}}(q) = \\tfrac12 (q - q_{\\text{goal}})^{\\mathsf T} K (q - q_{\\text{goal}}), \\qquad F_{\\text{goal}} = K(q_{\\text{goal}} - q)."}</Eq>
      <p>
        The attractive force grows linearly with distance — a spring to the goal. Each obstacle gets
        a repulsive potential that blows up as the robot nears its surface. To keep distant
        obstacles from meddling, we cap the range of influence at <M>{"d_{\\text{range}}"}</M>:
      </p>
      <Eq>{"U_B(q) = \\begin{cases} \\dfrac{k}{2}\\left(\\dfrac{1}{d(q,B)} - \\dfrac{1}{d_{\\text{range}}}\\right)^{2} & d < d_{\\text{range}} \\\\[1.2em] 0 & d \\ge d_{\\text{range}} \\end{cases}"}</Eq>
      <p>
        with the corresponding force pointing directly away from the obstacle,{" "}
        <M>{"F_B = k\\left(\\tfrac{1}{d} - \\tfrac{1}{d_{\\text{range}}}\\right)\\tfrac{1}{d^{2}}\\,\\hat{n}"}</M>.
        The total field sums the attractive bowl and every repulsive bump:{" "}
        <M>{"F(q) = F_{\\text{goal}}(q) + \\sum_i F_{B_i}(q)"}</M>. Treating that force as a
        commanded velocity, <M>{"\\dot q = F(q)"}</M>, slides the robot downhill without oscillation.
      </p>

      <WidgetShell
        title="Roll the robot downhill — and watch it get stuck"
        onReset={() => {
          setObs([
            { x: 250, y: 120, r: 46 },
            { x: 250, y: 240, r: 46 },
          ]);
          setKAtt(0.012);
          setKRep(900000);
          setPerturb(0);
          resetRobot();
        }}
        caption={
          <>
            Arrows show the <span style={{ color: "#7a8190" }}>force field</span> on a grid. Drag the
            two <span style={{ color: "#3a3d47" }}>obstacles</span>; press <em>Release</em> to let
            the <span style={{ color: "#2f9e44" }}>green robot</span> follow{" "}
            <M>{"\\dot q = F(q)"}</M> toward the <span style={{ color: "#caa53d" }}>gold goal</span>.
            The default layout is a trap: the two repulsive bumps cancel the pull right between them.
          </>
        }
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          style={{ background: "#fcfbf9", borderRadius: 6 }}
          onPointerMove={onMove}
          onPointerUp={() => (dragging.current = null)}
          onPointerLeave={() => (dragging.current = null)}
        >
          <defs>
            <marker id="pf-arrow" markerWidth="5" markerHeight="5" refX="3.5" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4 Z" fill="#7a8190" />
            </marker>
          </defs>

          {/* force field */}
          {arrows.map((a, i) => (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={a.x + a.ax}
              y2={a.y + a.ay}
              stroke="#7a8190"
              strokeWidth={1}
              opacity={0.6}
              markerEnd="url(#pf-arrow)"
            />
          ))}

          {/* obstacles (range of influence ring + body) */}
          {obs.map((o, i) => (
            <g key={i} className="cursor-grab" onPointerDown={e => { e.preventDefault(); dragging.current = i; (e.target as Element).setPointerCapture?.(e.pointerId); }}>
              <circle cx={o.x} cy={o.y} r={o.r + D_RANGE} fill="none" stroke="#d9483f" strokeWidth={0.8} strokeDasharray="3 4" opacity={0.35} />
              <circle cx={o.x} cy={o.y} r={o.r} fill="#3a3d47" stroke="#fff" strokeWidth={2} />
            </g>
          ))}

          {/* goal */}
          <circle cx={GOAL.x} cy={GOAL.y} r={12} fill="#caa53d22" stroke="#caa53d" strokeWidth={1.5} />
          <path d={`M${GOAL.x - 7},${GOAL.y} L${GOAL.x + 7},${GOAL.y} M${GOAL.x},${GOAL.y - 7} L${GOAL.x},${GOAL.y + 7}`} stroke="#caa53d" strokeWidth={2.5} />

          {/* robot */}
          <circle cx={robot.x} cy={robot.y} r={7} fill={reached ? "#2f9e44" : "#2f9e44"} stroke="#fff" strokeWidth={2} />
          <circle cx={START.x} cy={START.y} r={4} fill="none" stroke="#2f9e44" strokeWidth={1.5} opacity={0.5} />
        </svg>

        <div className="flex gap-2 mt-3 mb-1">
          <WidgetButton active={running} onClick={() => { if (reached) resetRobot(); setRunning(r => !r); }}>
            {running ? "Pause" : reached ? "Run again" : "Release"}
          </WidgetButton>
          <WidgetButton onClick={resetRobot}>Reset robot</WidgetButton>
        </div>

        <ControlBar>
          <LabeledSlider label={<M>{"k_{\\text{att}}"}</M>} value={kAtt} min={0.004} max={0.05} step={0.001} onChange={setKAtt} fmt={v => v.toFixed(3)} color="#3b6fd4" width={150} />
          <LabeledSlider label={<M>{"k_{\\text{rep}}"}</M>} value={kRep} min={100000} max={2000000} step={50000} onChange={setKRep} fmt={v => `${(v / 1e6).toFixed(2)}M`} color="#c2571c" width={150} />
          <LabeledSlider label="perturb" value={perturb} min={0} max={6} step={0.2} onChange={setPerturb} fmt={v => v.toFixed(1)} color="#6741d9" width={130} />
          <Readout label="‖F‖ here" value={fMag.toFixed(2)} color={fMag < 0.2 ? "var(--bad)" : undefined} />
          <Readout label="dist to goal" value={distGoal.toFixed(0)} color={reached ? "var(--good)" : undefined} />
        </ControlBar>
      </WidgetShell>

      <p>
        With the default layout the robot slides into the gap, the two repulsive forces cancel the
        leftover attraction, and <M>{"\\|F\\|"}</M> drops near zero — a genuine{" "}
        <strong>local minimum</strong> where attractive and repulsive forces balance but the robot
        is nowhere near the goal. Three honest ways out: (1) lower <M>{"k_{\\text{rep}}"}</M> (or
        raise <M>{"k_{\\text{att}}"}</M>) so the pull dominates and squeezes through; (2) drag an
        obstacle aside to widen the corridor; or (3) add a <strong>perturbation</strong> — a dash of
        noise that kicks the robot off the saddle so descent can continue.
      </p>

      <Aside>
        The sum of attractive and repulsive potentials need not have its minimum exactly at{" "}
        <M>{"q_{\\text{goal}}"}</M>, and saddle points appear near obstacles. Saddles are harmless —
        a tiny nudge escapes them — but true local minima trap whole basins of initial conditions.
        The fix that <em>guarantees</em> a single minimum is a <strong>navigation function</strong>{" "}
        (Rimon–Koditschek): a specially shaped potential whose only minimum is the goal. The
        breadth-first <em>wavefront planner</em> achieves the same on a grid.
      </Aside>

      <Challenge id="ch10-potential-escape" met={met}>
        Get the robot all the way to the gold goal. Starting from the trap layout, change the gains
        (more attraction or less repulsion), spread the obstacles, or dial in some{" "}
        <strong>perturbation</strong> — then <em>Release</em> and reach the cross. Escaping the
        local minimum is the whole point.
      </Challenge>

      <KeyIdea>
        Potential fields turn planning into following <M>{"\\dot q = F(q)"}</M> downhill: a fast,
        reactive controller with no stored plan. The price is local minima where the forces cancel
        short of the goal. Perturbations, gain tuning, navigation functions, or a wavefront
        potential are the standard escapes.
      </KeyIdea>

      <BookRef>Modern Robotics §10.6 — Virtual Potential Fields (Eqs. 10.3 and the range-limited repulsive potential).</BookRef>
    </div>
  );
}
