import { useMemo, useRef, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { svgCoords } from "../../lib/svg";

/* ============================================================
 * Page 10.1 — Grid Search: Dijkstra vs. A*
 * Real 4-connected A* / Dijkstra on a paintable grid, with a
 * tunable heuristic weight on Manhattan distance.
 * ============================================================ */

const COLS = 24;
const ROWS = 16;
const CELL = 28;
const GW = COLS * CELL;
const GH = ROWS * CELL;

type Cell = { c: number; r: number };
const key = (c: number, r: number) => r * COLS + c;

/** A* / Dijkstra result on the grid. heuristicWeight 0 ⇒ Dijkstra. */
interface SearchResult {
  expanded: Uint8Array; // 1 if popped from OPEN (CLOSED set)
  frontier: Uint8Array; // 1 if currently in OPEN at termination (still open)
  path: Cell[]; // start..goal, empty if unreachable
  expandedCount: number;
  found: boolean;
}

function search(
  obstacles: Uint8Array,
  start: Cell,
  goal: Cell,
  weight: number, // 0 = Dijkstra (no heuristic), >0 scales Manhattan h
): SearchResult {
  const N = COLS * ROWS;
  const past = new Float64Array(N).fill(Infinity);
  const parent = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const inOpen = new Uint8Array(N);
  const expanded = new Uint8Array(N);

  const h = (c: number, r: number) => weight * (Math.abs(c - goal.c) + Math.abs(r - goal.r));

  // OPEN is a simple sorted-by-est-total array (small grid; clarity over speed).
  const open: number[] = [];
  const sIdx = key(start.c, start.r);
  past[sIdx] = 0;
  open.push(sIdx);
  inOpen[sIdx] = 1;

  let found = false;
  let expandedCount = 0;
  const nbrs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (open.length > 0) {
    // pop node with minimum est_total_cost = past + h
    let best = 0;
    let bestVal = Infinity;
    for (let i = 0; i < open.length; i++) {
      const n = open[i];
      const c = n % COLS;
      const r = (n / COLS) | 0;
      const est = past[n] + h(c, r);
      if (est < bestVal) {
        bestVal = est;
        best = i;
      }
    }
    const cur = open[best];
    open.splice(best, 1);
    inOpen[cur] = 0;
    if (closed[cur]) continue;
    closed[cur] = 1;
    expanded[cur] = 1;
    expandedCount++;

    const cc = cur % COLS;
    const cr = (cur / COLS) | 0;
    if (cc === goal.c && cr === goal.r) {
      found = true;
      break;
    }
    for (const [dc, dr] of nbrs) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      const ni = key(nc, nr);
      if (obstacles[ni] || closed[ni]) continue;
      const tentative = past[cur] + 1; // unit edge cost
      if (tentative < past[ni]) {
        past[ni] = tentative;
        parent[ni] = cur;
        if (!inOpen[ni]) {
          open.push(ni);
          inOpen[ni] = 1;
        }
      }
    }
  }

  // reconstruct path
  const path: Cell[] = [];
  if (found) {
    let n = key(goal.c, goal.r);
    while (n !== -1) {
      path.push({ c: n % COLS, r: (n / COLS) | 0 });
      n = parent[n];
    }
    path.reverse();
  }

  return { expanded, frontier: inOpen, path, expandedCount, found };
}

type Tool = "wall" | "start" | "goal" | "erase";

export default function GridSearch() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [obstacles, setObstacles] = useState<Uint8Array>(() => {
    // a wall with a gap to make the heuristic interesting
    const o = new Uint8Array(COLS * ROWS);
    for (let r = 0; r < ROWS; r++) {
      if (r === 5 || r === 6 || r === 7) continue; // gap
      o[key(12, r)] = 1;
    }
    return o;
  });
  const [start, setStart] = useState<Cell>({ c: 2, r: 8 });
  const [goal, setGoal] = useState<Cell>({ c: 21, r: 8 });
  const [tool, setTool] = useState<Tool>("wall");
  const [weight, setWeight] = useState(1.0);
  const painting = useRef<0 | 1 | null>(null);

  // both searches recomputed live
  const dijkstra = useMemo(() => search(obstacles, start, goal, 0), [obstacles, start, goal]);
  const astar = useMemo(() => search(obstacles, start, goal, weight), [obstacles, start, goal, weight]);

  const [show, setShow] = useState<"astar" | "dijkstra">("astar");
  const active = show === "astar" ? astar : dijkstra;

  const savings = dijkstra.expandedCount - astar.expandedCount;
  // honest predicate: A* found the goal and explored a meaningful margin fewer cells
  const met = astar.found && dijkstra.found && savings >= 30;

  const cellAt = (e: React.PointerEvent<SVGSVGElement>): Cell | null => {
    if (!svgRef.current) return null;
    const [x, y] = svgCoords(e, svgRef.current, GW, GH);
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    return { c, r };
  };

  const applyTool = (cell: Cell) => {
    const idx = key(cell.c, cell.r);
    if (tool === "start") {
      if (!obstacles[idx] && !(cell.c === goal.c && cell.r === goal.r)) setStart(cell);
      return;
    }
    if (tool === "goal") {
      if (!obstacles[idx] && !(cell.c === start.c && cell.r === start.r)) setGoal(cell);
      return;
    }
    if (cell.c === start.c && cell.r === start.r) return;
    if (cell.c === goal.c && cell.r === goal.r) return;
    const want = tool === "wall" ? 1 : 0;
    if (painting.current === null) painting.current = want as 0 | 1;
    setObstacles(prev => {
      if (prev[idx] === painting.current) return prev;
      const next = prev.slice();
      next[idx] = painting.current!;
      return next;
    });
  };

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    painting.current = null;
    const cell = cellAt(e);
    if (cell) applyTool(cell);
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons === 0) return;
    if (tool === "start" || tool === "goal") {
      const cell = cellAt(e);
      if (cell) applyTool(cell);
      return;
    }
    const cell = cellAt(e);
    if (cell) applyTool(cell);
  };
  const onUp = () => {
    painting.current = null;
  };

  const pathSet = useMemo(() => {
    const s = new Set<number>();
    for (const p of active.path) s.add(key(p.c, p.r));
    return s;
  }, [active.path]);

  return (
    <div>
      <PageHeader
        chapter="Chapter 10"
        section="Motion Planning"
        title="Grid Search: Dijkstra vs. A*"
        lede="Discretize the free space into a grid, then search it. Dijkstra fans out blindly in every direction; A* leans toward the goal with a heuristic. Same optimal path — wildly different effort."
      />

      <p>
        The simplest discretization of a configuration space <M>{"\\mathcal{C}"}</M> is a grid: for
        an <M>{"n"}</M>-dimensional space with <M>{"k"}</M> samples per axis we get{" "}
        <M>{"k^n"}</M> nodes. A grid point is an obstacle if its cell touches any C-obstacle, and
        a planner connects each free cell to its neighbors — here <strong>4-connected</strong> (N,
        S, E, W), each edge with unit cost. The path-planning problem becomes a graph search.
      </p>

      <H2>A* and its heuristic</H2>
      <p>
        A* is a best-first search. It keeps an <code>OPEN</code> list sorted by an estimate of the
        total path cost through each node,
      </p>
      <Eq>{"\\text{est\\_total}(n) = \\underbrace{\\text{past\\_cost}(n)}_{\\text{cost so far}} + \\underbrace{h(n)}_{\\text{heuristic cost-to-go}},"}</Eq>
      <p>
        and always expands the node with the smallest estimate. The cost so far is exact; the
        cost-to-go <M>{"h(n)"}</M> is a guess. For a 4-connected grid the natural guess is the{" "}
        <strong>Manhattan distance</strong> to the goal (diagonals are not allowed):
      </p>
      <Eq>{"h(n) = \\eta\\,\\big(|c_n - c_{\\text{goal}}| + |r_n - r_{\\text{goal}}|\\big)."}</Eq>
      <p>
        If the heuristic <em>never overestimates</em> the true cost-to-go (it is{" "}
        <em>admissible</em>, <M>{"\\eta \\le 1"}</M> here), A* returns a provably shortest path. Set{" "}
        <M>{"\\eta = 0"}</M> and the heuristic vanishes: A* expands the lowest-past-cost node every
        time, which is exactly <strong>Dijkstra's algorithm</strong>. With no look-ahead, Dijkstra
        grows a roughly circular wavefront and visits far more cells.
      </p>

      <WidgetShell
        title="Paint obstacles, move start/goal, tune the heuristic"
        onReset={() => {
          const o = new Uint8Array(COLS * ROWS);
          for (let r = 0; r < ROWS; r++) {
            if (r === 5 || r === 6 || r === 7) continue;
            o[key(12, r)] = 1;
          }
          setObstacles(o);
          setStart({ c: 2, r: 8 });
          setGoal({ c: 21, r: 8 });
          setWeight(1.0);
          setShow("astar");
          setTool("wall");
        }}
        caption={
          <>
            <span style={{ color: "#9aa0ac" }}>Gray</span> = expanded (CLOSED),{" "}
            <span style={{ color: "#5a9bd5" }}>blue</span> = frontier (OPEN at stop),{" "}
            <span style={{ color: "#d9483f" }}>red</span> = final path. The expanded count is the
            real work done. Toggle between A* and Dijkstra on the <em>same</em> map and watch the
            gray flood shrink as <M>{"\\eta"}</M> rises.
          </>
        }
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="ui text-[11px] font-semibold text-[var(--ink-soft)] self-center">tool:</span>
          {(["wall", "erase", "start", "goal"] as const).map(t => (
            <WidgetButton key={t} active={tool === t} onClick={() => setTool(t)}>
              {t}
            </WidgetButton>
          ))}
          <span className="ui text-[11px] font-semibold text-[var(--ink-soft)] self-center ml-3">show:</span>
          <WidgetButton active={show === "astar"} onClick={() => setShow("astar")}>
            A*
          </WidgetButton>
          <WidgetButton active={show === "dijkstra"} onClick={() => setShow("dijkstra")}>
            Dijkstra
          </WidgetButton>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${GW} ${GH}`}
          className="w-full touch-none select-none"
          style={{ background: "#fcfbf9", borderRadius: 6 }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        >
          {/* cells */}
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => {
              const idx = key(c, r);
              let fill = "transparent";
              if (obstacles[idx]) fill = "#3a3d47";
              else if (pathSet.has(idx)) fill = "#d9483f";
              else if (active.frontier[idx]) fill = "#bcd6f0";
              else if (active.expanded[idx]) fill = "#dcdee3";
              return (
                <rect
                  key={idx}
                  x={c * CELL}
                  y={r * CELL}
                  width={CELL}
                  height={CELL}
                  fill={fill}
                  stroke="#ece9e1"
                  strokeWidth={1}
                />
              );
            }),
          )}
          {/* start / goal markers */}
          <circle cx={start.c * CELL + CELL / 2} cy={start.r * CELL + CELL / 2} r={CELL * 0.32} fill="#2f9e44" stroke="#fff" strokeWidth={2} />
          <rect
            x={goal.c * CELL + CELL * 0.18}
            y={goal.r * CELL + CELL * 0.18}
            width={CELL * 0.64}
            height={CELL * 0.64}
            fill="#caa53d"
            stroke="#fff"
            strokeWidth={2}
          />
        </svg>

        <ControlBar>
          <LabeledSlider
            label={<M>{"\\eta"}</M>}
            value={weight}
            min={0}
            max={3}
            step={0.05}
            onChange={setWeight}
            fmt={v => v.toFixed(2)}
            color="#3b6fd4"
            width={170}
          />
          <Readout label="A* expanded" value={`${astar.expandedCount}`} color={astar.found ? "var(--good)" : "var(--bad)"} />
          <Readout label="Dijkstra expanded" value={`${dijkstra.expandedCount}`} />
          <Readout label="saved" value={savings >= 0 ? `${savings} cells` : `${savings}`} color={savings > 0 ? "var(--good)" : undefined} />
          <Readout label="A* path len" value={astar.found ? `${astar.path.length - 1}` : "—"} />
        </ControlBar>
      </WidgetShell>

      <p>
        Crank <M>{"\\eta"}</M> from 0 upward and the A* count plummets while the path length stays
        the same — until <M>{"\\eta > 1"}</M>. Past that the heuristic <em>overestimates</em>:
        the search becomes greedy, expands even fewer cells, and may return a longer-than-optimal
        path. This is <strong>weighted (suboptimal) A*</strong>, a deliberate trade of optimality
        for speed. Watch the "A* path len" readout — it can creep above the shortest length once{" "}
        <M>{"\\eta"}</M> is too large.
      </p>

      <Aside>
        With an 8-connected grid the costs differ: a cardinal step costs 1 and a diagonal step{" "}
        <M>{"\\sqrt{2}"}</M>, so the admissible heuristic switches from Manhattan to{" "}
        <em>octile</em> distance. Using Euclidean distance on a 4-connected grid is still admissible
        (it never overestimates the city-block path) but it is a looser bound, so it guides the
        search less effectively than the matched Manhattan heuristic.
      </Aside>

      <Challenge id="ch10-grid-heuristic" met={met}>
        Make the heuristic earn its keep. With both planners reaching the gold goal, raise{" "}
        <M>{"\\eta"}</M> until <strong>A* expands at least 30 fewer cells than Dijkstra</strong>.
        The shortest-path length should stay put while the gray flood collapses toward a corridor
        aimed at the goal.
      </Challenge>

      <KeyIdea>
        Dijkstra is A* with a blind heuristic (<M>{"h = 0"}</M>): correct but wasteful. An
        admissible heuristic (<M>{"\\eta \\le 1"}</M>) keeps A* optimal while steering it toward the
        goal; an inflated one (<M>{"\\eta > 1"}</M>) buys speed by giving up the optimality
        guarantee. The heuristic changes <em>how much</em> you search, not <em>whether</em> a
        solution exists.
      </KeyIdea>

      <BookRef>Modern Robotics §10.2.4 — Graph Search (A*, Dijkstra) and §10.4 — Grid Methods.</BookRef>
    </div>
  );
}
