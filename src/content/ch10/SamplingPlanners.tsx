import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, H2, M, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";

/* ============================================================
 * Page 10.2 — Sampling-Based Planning: PRM & RRT
 * Real RRT tree growth + PRM roadmap, in a 2D C-space with
 * circular obstacles forming a narrow passage.
 * ============================================================ */

const W = 560;
const H = 360;

type Obs = { x: number; y: number; r: number };
// two big circles leaving a narrow vertical passage in the middle
const OBSTACLES: Obs[] = [
  { x: 280, y: 70, r: 110 },
  { x: 280, y: 300, r: 110 },
  { x: 110, y: 200, r: 55 },
  { x: 460, y: 130, r: 50 },
];

const START = { x: 40, y: 200 };
const GOAL = { x: 520, y: 200 };
const GOAL_RADIUS = 26;

type Pt = { x: number; y: number };

function inObstacle(x: number, y: number): boolean {
  if (x < 0 || x > W || y < 0 || y > H) return true;
  for (const o of OBSTACLES) {
    const dx = x - o.x;
    const dy = y - o.y;
    if (dx * dx + dy * dy <= o.r * o.r) return true;
  }
  return false;
}

/** collision-free straight segment test by dense sampling */
function segmentFree(a: Pt, b: Pt): boolean {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(2, Math.ceil(d / 4));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (inObstacle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

/* -------- a tiny seeded RNG so resets are repeatable per run -------- */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface RRTState {
  nodes: Pt[];
  parent: number[];
  rng: () => number;
  done: boolean;
  goalNode: number; // index into nodes, -1 until reached
}

function newRRT(seed: number): RRTState {
  return { nodes: [START], parent: [-1], rng: makeRng(seed), done: false, goalNode: -1 };
}

/** one RRT extension step (mutates a copy) */
function stepRRT(st: RRTState, stepSize: number, goalBias: number): RRTState {
  if (st.done) return st;
  const nodes = st.nodes.slice();
  const parent = st.parent.slice();
  // sample (goal-biased)
  let sx: number, sy: number;
  if (st.rng() < goalBias) {
    sx = GOAL.x;
    sy = GOAL.y;
  } else {
    sx = st.rng() * W;
    sy = st.rng() * H;
  }
  // nearest node
  let near = 0;
  let bestD = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const dx = nodes[i].x - sx;
    const dy = nodes[i].y - sy;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      near = i;
    }
  }
  const nn = nodes[near];
  const d = Math.hypot(sx - nn.x, sy - nn.y);
  if (d < 1e-6) return st;
  const ux = (sx - nn.x) / d;
  const uy = (sy - nn.y) / d;
  const newPt: Pt = { x: nn.x + ux * Math.min(stepSize, d), y: nn.y + uy * Math.min(stepSize, d) };
  if (inObstacle(newPt.x, newPt.y) || !segmentFree(nn, newPt)) return st;
  nodes.push(newPt);
  parent.push(near);
  const idx = nodes.length - 1;
  let done = st.done;
  let goalNode = st.goalNode;
  if (Math.hypot(newPt.x - GOAL.x, newPt.y - GOAL.y) <= GOAL_RADIUS) {
    done = true;
    goalNode = idx;
  }
  return { nodes, parent, rng: st.rng, done, goalNode };
}

function rrtPath(st: RRTState): Pt[] {
  if (st.goalNode < 0) return [];
  const path: Pt[] = [];
  let i = st.goalNode;
  while (i !== -1) {
    path.push(st.nodes[i]);
    i = st.parent[i];
  }
  path.reverse();
  return path;
}

/* ----------------------------- PRM ----------------------------- */
interface PRMResult {
  nodes: Pt[];
  edges: [number, number][];
  path: Pt[];
  found: boolean;
}

function buildPRM(numSamples: number, k: number, seed: number): PRMResult {
  const rng = makeRng(seed);
  const nodes: Pt[] = [START, GOAL];
  let tries = 0;
  while (nodes.length < numSamples + 2 && tries < numSamples * 30) {
    tries++;
    const x = rng() * W;
    const y = rng() * H;
    if (!inObstacle(x, y)) nodes.push({ x, y });
  }
  const n = nodes.length;
  const edges: [number, number][] = [];
  const adj: number[][] = Array.from({ length: n }, () => []);
  const edgeW: Map<string, number> = new Map();
  for (let i = 0; i < n; i++) {
    const order = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      order.push([j, Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)] as [number, number]);
    }
    order.sort((a, b) => a[1] - b[1]);
    let added = 0;
    for (const [j, dist] of order) {
      if (added >= k) break;
      if (segmentFree(nodes[i], nodes[j])) {
        const a = Math.min(i, j);
        const b = Math.max(i, j);
        const ek = `${a}-${b}`;
        if (!edgeW.has(ek)) {
          edgeW.set(ek, dist);
          edges.push([a, b]);
          adj[i].push(j);
          adj[j].push(i);
        }
        added++;
      }
    }
  }
  // Dijkstra from start(0) to goal(1)
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const visited = new Uint8Array(n);
  dist[0] = 0;
  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    let bu = Infinity;
    for (let i = 0; i < n; i++) if (!visited[i] && dist[i] < bu) (bu = dist[i]), (u = i);
    if (u === -1) break;
    visited[u] = 1;
    for (const v of adj[u]) {
      const a = Math.min(u, v);
      const b = Math.max(u, v);
      const w = edgeW.get(`${a}-${b}`)!;
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        prev[v] = u;
      }
    }
  }
  const path: Pt[] = [];
  let found = false;
  if (dist[1] < Infinity) {
    found = true;
    let i = 1;
    while (i !== -1) {
      path.push(nodes[i]);
      i = prev[i];
    }
    path.reverse();
  }
  return { nodes, edges, path, found };
}

export default function SamplingPlanners() {
  const [mode, setMode] = useState<"rrt" | "prm">("rrt");
  const [stepSize, setStepSize] = useState(22);
  const [goalBias, setGoalBias] = useState(0.05);
  const [running, setRunning] = useState(false);
  const [seed, setSeed] = useState(7);
  const [rrt, setRrt] = useState<RRTState>(() => newRRT(7));

  // PRM params
  const [prmSamples, setPrmSamples] = useState(140);
  const [prmK, setPrmK] = useState(6);
  const prm = useMemo<PRMResult>(() => buildPRM(prmSamples, prmK, seed), [prmSamples, prmK, seed]);

  const stateRef = useRef(rrt);
  stateRef.current = rrt;

  // RRT animation loop
  useEffect(() => {
    if (!running || mode !== "rrt") return;
    let raf = 0;
    const tick = () => {
      let st = stateRef.current;
      // a few extensions per frame for snappier growth
      for (let i = 0; i < 4 && !st.done; i++) {
        st = stepRRT(st, stepSize, goalBias);
      }
      stateRef.current = st;
      setRrt(st);
      if (st.done || st.nodes.length > 4000) {
        setRunning(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, mode, stepSize, goalBias]);

  const resetRRT = (s = seed) => {
    const st = newRRT(s);
    stateRef.current = st;
    setRrt(st);
    setRunning(false);
  };

  const path = mode === "rrt" ? rrtPath(rrt) : prm.path;
  const reached = mode === "rrt" ? rrt.done : prm.found;
  const met = reached && path.length > 1;

  return (
    <div>
      <PageHeader
        chapter="Chapter 10"
        section="Motion Planning"
        title="Sampling-Based Planning: PRM & RRT"
        lede="Grids choke in high dimensions. Sampling planners throw random points into the free space instead, wiring them into a tree or a roadmap. They give up grid-optimality for the ability to find a path fast — even through a narrow gap."
      />

      <p>
        A grid with <M>{"k"}</M> points per axis needs <M>{"k^n"}</M> nodes — a million at{" "}
        <M>{"k=100,\\,n=3"}</M>, a hundred trillion at <M>{"n=7"}</M>. Sampling methods sidestep
        this curse of dimensionality. They rely on four ingredients: a <strong>sampler</strong>
        that draws a configuration from <M>{"\\mathcal{C}"}</M>, a <strong>collision check</strong>{" "}
        deciding if a sample or motion is in <M>{"\\mathcal{C}_{\\text{free}}"}</M>, a{" "}
        <strong>nearest-neighbor</strong> query, and a <strong>local planner</strong> that tries to
        connect toward the sample. Most are <em>probabilistically complete</em>: the chance of
        finding a solution, if one exists, tends to 1 as samples <M>{"\\to \\infty"}</M>.
      </p>

      <H2>RRT: a tree that pulls itself open</H2>
      <p>
        A Rapidly-exploring Random Tree grows one tree from <M>{"x_{\\text{start}}"}</M>. Each
        iteration:
      </p>
      <ol className="list-decimal ml-6 my-3 text-[var(--ink-soft)] leading-relaxed space-y-1">
        <li>
          sample <M>{"x_{\\text{samp}}"}</M> almost uniformly (with a small bias toward the goal);
        </li>
        <li>
          find the nearest tree node <M>{"x_{\\text{nearest}}"}</M> by Euclidean distance;
        </li>
        <li>
          step a short distance <M>{"d"}</M> from <M>{"x_{\\text{nearest}}"}</M> toward the sample
          to get <M>{"x_{\\text{new}}"}</M>;
        </li>
        <li>if the segment is collision-free, add <M>{"x_{\\text{new}}"}</M> to the tree.</li>
      </ol>
      <p>
        Because nearly-uniform samples land most often in large empty regions, they "pull" the tree
        outward — it rapidly explores <M>{"\\mathcal{C}_{\\text{free}}"}</M> rather than meandering.
        The narrow passage between the two big circles is the classic hard case: the sliver of free
        space the tree must thread is tiny, so only a well-chosen step size and a bit of goal bias
        get through reliably.
      </p>

      <WidgetShell
        title="Grow an RRT (or build a PRM) through the narrow passage"
        onReset={() => {
          setMode("rrt");
          setStepSize(22);
          setGoalBias(0.05);
          setSeed(7);
          resetRRT(7);
          setPrmSamples(140);
          setPrmK(6);
        }}
        caption={
          <>
            <span style={{ color: "#2f9e44" }}>Green</span> is start,{" "}
            <span style={{ color: "#caa53d" }}>gold</span> the goal region. In RRT the gray tree
            grows live; the <span style={{ color: "#d9483f" }}>red</span> path appears when a node
            lands in the goal disk. PRM samples the whole space first, connects{" "}
            <M>{"k"}</M>-nearest neighbors, then searches the roadmap.
          </>
        }
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <WidgetButton active={mode === "rrt"} onClick={() => setMode("rrt")}>
            RRT
          </WidgetButton>
          <WidgetButton active={mode === "prm"} onClick={() => setMode("prm")}>
            PRM
          </WidgetButton>
          {mode === "rrt" && (
            <>
              <WidgetButton active={running} onClick={() => setRunning(r => !r)} disabled={rrt.done}>
                {running ? "Pause" : rrt.done ? "Reached" : "Grow"}
              </WidgetButton>
              <WidgetButton onClick={() => resetRRT()}>Clear tree</WidgetButton>
              <WidgetButton
                onClick={() => {
                  const s = (seed + 1) % 99991;
                  setSeed(s);
                  resetRRT(s);
                }}
              >
                New seed
              </WidgetButton>
            </>
          )}
          {mode === "prm" && (
            <WidgetButton onClick={() => setSeed(s => (s + 1) % 99991)}>Resample</WidgetButton>
          )}
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ background: "#fcfbf9", borderRadius: 6 }}>
          {/* obstacles */}
          {OBSTACLES.map((o, i) => (
            <circle key={i} cx={o.x} cy={o.y} r={o.r} fill="#3a3d4722" stroke="#3a3d47" strokeWidth={1.5} />
          ))}

          {mode === "rrt" ? (
            <>
              {/* tree edges */}
              {rrt.nodes.map((p, i) => {
                const par = rrt.parent[i];
                if (par < 0) return null;
                const q = rrt.nodes[par];
                return <line key={i} x1={q.x} y1={q.y} x2={p.x} y2={p.y} stroke="#9aa0ac" strokeWidth={1} />;
              })}
              {rrt.nodes.map((p, i) => (
                <circle key={`n${i}`} cx={p.x} cy={p.y} r={1.6} fill="#6b7280" />
              ))}
            </>
          ) : (
            <>
              {/* PRM edges */}
              {prm.edges.map(([a, b], i) => (
                <line
                  key={i}
                  x1={prm.nodes[a].x}
                  y1={prm.nodes[a].y}
                  x2={prm.nodes[b].x}
                  y2={prm.nodes[b].y}
                  stroke="#c7cdd6"
                  strokeWidth={0.8}
                />
              ))}
              {prm.nodes.map((p, i) => (
                <circle key={`p${i}`} cx={p.x} cy={p.y} r={2} fill="#6b7280" />
              ))}
            </>
          )}

          {/* solution path */}
          {path.length > 1 && (
            <polyline points={path.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#d9483f" strokeWidth={3} />
          )}

          {/* goal region + start */}
          <circle cx={GOAL.x} cy={GOAL.y} r={GOAL_RADIUS} fill="#caa53d22" stroke="#caa53d" strokeWidth={1.5} />
          <rect x={GOAL.x - 6} y={GOAL.y - 6} width={12} height={12} fill="#caa53d" stroke="#fff" strokeWidth={1.5} />
          <circle cx={START.x} cy={START.y} r={7} fill="#2f9e44" stroke="#fff" strokeWidth={2} />
        </svg>

        <ControlBar>
          {mode === "rrt" ? (
            <>
              <LabeledSlider label="step d" value={stepSize} min={6} max={50} step={1} onChange={v => { setStepSize(v); }} fmt={v => v.toFixed(0)} color="#3b6fd4" width={150} />
              <LabeledSlider label="goal bias" value={goalBias} min={0} max={0.4} step={0.01} onChange={setGoalBias} fmt={v => `${(v * 100).toFixed(0)}%`} color="#c2571c" width={150} />
              <Readout label="nodes" value={`${rrt.nodes.length}`} />
              <Readout label="status" value={rrt.done ? "reached goal" : "searching"} color={rrt.done ? "var(--good)" : undefined} />
            </>
          ) : (
            <>
              <LabeledSlider label="samples N" value={prmSamples} min={40} max={300} step={10} onChange={setPrmSamples} fmt={v => v.toFixed(0)} color="#3b6fd4" width={150} />
              <LabeledSlider label="neighbors k" value={prmK} min={2} max={12} step={1} onChange={setPrmK} fmt={v => v.toFixed(0)} color="#c2571c" width={150} />
              <Readout label="roadmap edges" value={`${prm.edges.length}`} />
              <Readout label="status" value={prm.found ? "path found" : "disconnected"} color={prm.found ? "var(--good)" : "var(--bad)"} />
            </>
          )}
        </ControlBar>
      </WidgetShell>

      <H2>PRM: a reusable roadmap</H2>
      <p>
        A Probabilistic RoadMap is a <em>multi-query</em> planner. It scatters{" "}
        <M>{"N"}</M> collision-free samples across <M>{"\\mathcal{C}_{\\text{free}}"}</M>, connects
        each to its <M>{"k"}</M> nearest neighbors with collision-free straight edges, and stores the
        result as an undirected graph. Any later <M>{"(q_{\\text{start}}, q_{\\text{goal}})"}</M>{" "}
        query is answered by attaching both endpoints to the roadmap and running A* (here, Dijkstra)
        over it. Too few samples or too small a <M>{"k"}</M> and the roadmap is{" "}
        <em>disconnected</em> across the passage — increase either and an edge bridges the gap.
      </p>

      <Aside>
        Both planners are <em>satisficing</em>, not optimal: the first path found is rarely the
        shortest, and RRT paths in particular look jagged. <strong>RRT*</strong> rewires the tree as
        it grows so the cost to every node stays minimal, and its solution converges to the optimum
        as samples increase. A smoothing pass (shortcutting collision-free segments) is the cheap
        practical fix for the jaggedness.
      </Aside>

      <Challenge id="ch10-rrt-connect" met={met}>
        Thread the narrow passage. In RRT mode, tune the <strong>step size</strong> and{" "}
        <strong>goal bias</strong>, then press <em>Grow</em> until a red path reaches the gold goal
        region. (A PRM that finds a path through the gap also counts.) A modest step size and a few
        percent of goal bias get through the sliver most reliably.
      </Challenge>

      <KeyIdea>
        Sampling planners trade the grid's resolution-optimality for scalability and speed. RRT is a
        single-query tree that explores by being pulled toward uniform samples; PRM is a
        multi-query roadmap built once and searched many times. Narrow passages are the universal
        stress test — they shrink the lucky-sample volume to near zero.
      </KeyIdea>

      <BookRef>Modern Robotics §10.5 — Sampling Methods: the RRT algorithm (Alg. 10.3) and the PRM (Alg. 10.4).</BookRef>
    </div>
  );
}
