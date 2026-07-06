import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Play, Pause } from "lucide-react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";
import { svgCoords } from "../../lib/svg";
import { clamp, deg, rad } from "../../lib/math/vec";

const X_COLOR = "#d9483f"; // x / horizontal
const Y_COLOR = "#2f9e44"; // y / vertical
const V_COLOR = "#6741d9"; // resultant / velocity
const A_COLOR = "#c2571c"; // acceleration / time marker
const BLUE = "#3b6fd4";
const GOLD = "#caa53d";

/**
 * One shared requestAnimationFrame loop. `onFrame` is kept in a ref and
 * refreshed every render, so it always sees the latest state/props without
 * restarting the loop — the effect only re-runs when `running` flips.
 */
function useRaf(running: boolean, onFrame: (dt: number) => void) {
  const cb = useRef(onFrame);
  cb.current = onFrame;
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let id = 0;
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      cb.current(dt);
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [running]);
}

function PlayButton({ running, onClick, labels = ["play", "pause"] }: { running: boolean; onClick: () => void; labels?: [string, string] }) {
  return (
    <WidgetButton onClick={onClick} active={running}>
      <span className="inline-flex items-center gap-1.5">
        {running ? <Pause size={13} /> : <Play size={13} />}
        {running ? labels[1] : labels[0]}
      </span>
    </WidgetButton>
  );
}

export default function Foundations() {
  return (
    <div>
      <PageHeader
        chapter="Physics 1"
        section="College Physics & Dynamics"
        title="Foundations of Motion"
        lede="Motion begins with a choice of coordinates. Once position is a vector, velocity and acceleration are just the first two ways that vector changes — and the answer to “how fast?” depends on who is asking."
      />

      <p>
        A physics problem starts the moment we decide what numbers describe the state of the world.
        For a point moving in a plane, the smallest useful description is its position vector{" "}
        <M>{"\\mathbf r = x\\,\\hat{x} + y\\,\\hat{y}"}</M>. The two components are not two separate
        objects — they are the shadows the single geometric arrow casts on the coordinate axes. Spin
        the arrow below and watch those shadows breathe in and out as sine and cosine.
      </p>

      <p>
        <strong>Try this:</strong> drag the purple tip slowly around one full circle and watch
        the <span className="cx">red</span> shadow act out cosine while the{" "}
        <span className="cy">green</span> one acts out sine. Then press <em>spin</em> and look
        only at the right-hand plot: two perfect waves, a quarter-turn out of step. Finally,
        drag the tip far from the origin and spin again — the waves get taller but never change
        their rhythm. Amplitude and frequency are independent dials.
      </p>

      <VectorScope />

      <p>
        Those oscillating shadows are your first glimpse of a pattern that returns everywhere in this
        course: a rotating vector projects onto each axis as a sinusoid. The same picture will reappear
        as oscillations, as alternating current, and as the columns of a rotation matrix in the Modern
        Robotics chapters. For now the lesson is narrower: <em>a vector is one object; its components
        are frame-dependent descriptions of it.</em>
      </p>
      <Aside>
        If "component," "magnitude," or <M>{"\\arctan"}</M> felt fast just now, the{" "}
        <a href="#/math1-vectors">Math 1 module on vectors</a> builds all of it from scratch —
        this page assumes it.
      </Aside>

      <H2>Velocity and acceleration are rates of change</H2>
      <p>
        Position tells us where the point is. <strong>Velocity</strong> tells us how position changes,{" "}
        <M>{"\\mathbf v = \\dot{\\mathbf r}"}</M>. <strong>Acceleration</strong> tells us how velocity
        changes, <M>{"\\mathbf a = \\dot{\\mathbf v} = \\ddot{\\mathbf r}"}</M>. Under a constant
        acceleration the relationship closes into two familiar formulas:
      </p>

      <Eq>{"x(t) = x_0 + v_0\\,t + \\tfrac{1}{2}a\\,t^2, \\qquad v(t) = v_0 + a\\,t"}</Eq>

      <p>
        Read the first one back: start where you started (<M>{"x_0"}</M>), add the distance your
        starting speed would cover on its own (<M>{"v_0 t"}</M>), then add the extra distance the
        acceleration contributes (<M>{"\\tfrac12 a t^2"}</M> — the ½ appears because the
        acceleration has the whole interval to build up speed, so on average only half of it has
        acted). The second formula is simpler: speed changes by <M>{"a"}</M> every second.
      </p>

      <p>
        <strong>Try this:</strong> press play and watch one bead obey both formulas at once. The
        slope of the position curve <em>is</em> the velocity curve; the moment the velocity curve
        crosses zero is the moment the bead stops and turns around. Then set <M>{"a = 0"}</M> and
        confirm the position graph becomes a straight line — no acceleration, no bending.
      </p>

      <KinematicsTrack />

      <Worked title="Braking distance at highway speed">
        <p>
          <strong>Given.</strong> A car travels at <M>{"v_0 = 20"}</M> m/s (72 km/h) and the
          driver brakes with a steady <M>{"a = -5\\ \\text{m/s}^2"}</M>. How far does the car
          travel before it stops?
        </p>
        <p>
          <strong>Set up.</strong> "Stops" means <M>{"v(t) = 0"}</M>. From{" "}
          <M>{"v = v_0 + at"}</M>, that happens at <M>{"t = -v_0/a = 20/5 = 4"}</M> s.
        </p>
        <p>
          <strong>Solve.</strong> Feed that time into the position formula:{" "}
          <M>{"x = v_0 t + \\tfrac12 a t^2 = 20(4) - \\tfrac12 (5)(4^2) = 80 - 40 = 40"}</M> m.
        </p>
        <p>
          <strong>Check.</strong> While braking, speed falls steadily from 20 to 0, so the{" "}
          <em>average</em> speed is 10 m/s, held for 4 s — also 40 m. ✓ You can replay this in
          the widget at quarter scale: set <M>{"v_0 = 5"}</M>, <M>{"a = -1.25"}</M> and watch the
          bead stop at 10 m.
        </p>
      </Worked>

      <KeyIdea>
        The state of a moving particle is position together with velocity. Acceleration is the rule
        that bends the trajectory by continuously rewriting the velocity. When velocity passes through
        zero, position is at a turning point — not at rest forever, just for an instant.
      </KeyIdea>

      <H2>Two-dimensional motion is component-wise motion</H2>
      <p>
        A projectile is the first place where vector thinking truly pays off. With no air resistance,
        gravity pulls only downward, so the horizontal and vertical motions are completely independent.
        The horizontal velocity never changes; the vertical velocity falls steadily under gravity. Two
        one-dimensional problems, glued together by a shared clock:
      </p>

      <Eq>
        {"x(t)=x_0+v_0\\cos\\theta\\,t, \\qquad y(t)=y_0+v_0\\sin\\theta\\,t-\\tfrac{1}{2}g\\,t^2"}
      </Eq>

      <p>
        <strong>Try this:</strong> keep the speed fixed and sweep the angle from 20° up to 70°.
        The range grows, peaks near 45°, then shrinks again — while the flight time only keeps
        growing. Then pause a flight mid-air and study the two arrows on the ball: the{" "}
        <span className="cx">red</span> horizontal one is identical at every instant of the
        flight; only the <span className="cy">green</span> vertical one changes.
      </p>

      <ProjectileLauncher />

      <Aside>
        Notice the red arrow on the ball never changes length, while the green one shrinks, vanishes at
        the peak, then grows downward. That is the independence of the two axes made visible — the
        single most useful idea in introductory kinematics.
      </Aside>

      <Worked title="A drone drops a parcel">
        <p>
          <strong>Given.</strong> A delivery drone flies level at 12 m/s, 20 m above the ground.
          How far <em>before</em> the target must it release the parcel?
        </p>
        <p>
          <strong>Set up.</strong> At release the parcel has the drone's velocity: 12 m/s
          horizontal, 0 vertical. The two axes separate. Vertical alone decides the fall time:{" "}
          <M>{"20 = \\tfrac12 g t^2"}</M>.
        </p>
        <p>
          <strong>Solve.</strong> <M>{"t = \\sqrt{2(20)/9.81} \\approx 2.02"}</M> s. In that time
          the parcel coasts horizontally <M>{"x = 12 \\times 2.02 \\approx 24"}</M> m. Release 24
          m early.
        </p>
        <p>
          <strong>Check.</strong> Notice the horizontal speed never entered the fall-time
          calculation — a parcel <em>dropped</em> from a hovering drone at 20 m takes the same
          2.02 s to land. That is axis independence doing real work.
        </p>
      </Worked>

      <H2>Velocity depends on the frame</H2>
      <p>
        Ask “how fast is the boat moving?” and the honest answer is “relative to what?” Velocity is not
        a property of an object alone; it is a relationship between an object and a reference frame.
        Velocities measured in different frames combine by simple vector addition:
      </p>

      <Eq>{"\\mathbf v_{\\text{boat/ground}} = \\mathbf v_{\\text{boat/water}} + \\mathbf v_{\\text{water/ground}}"}</Eq>

      <p>
        A boat that points straight across a flowing river does not arrive straight across — the current
        sweeps it downstream. To land at the dock, the pilot must aim <em>upstream</em>, choosing a
        heading so that the boat-relative-to-water velocity cancels the current exactly along the bank.
        Drag the heading and current, then launch:
      </p>

      <RiverCrossing />

      <Worked title="Aiming the ferry">
        <p>
          <strong>Given.</strong> The widget's defaults: current <M>{"u = 1.6"}</M> m/s, boat
          speed <M>{"v_b = 3.2"}</M> m/s relative to the water. What heading reaches the dock
          straight across?
        </p>
        <p>
          <strong>Set up.</strong> The upstream part of the boat's velocity must exactly cancel
          the current: <M>{"v_b \\sin\\phi = u"}</M>.
        </p>
        <p>
          <strong>Solve.</strong>{" "}
          <M>{"\\phi = \\arcsin(1.6/3.2) = \\arcsin(0.5) = 30°"}</M> upstream. The speed actually
          made good across the river is <M>{"v_b\\cos 30° \\approx 2.77"}</M> m/s, so the 10 m
          crossing takes about 3.6 s.
        </p>
        <p>
          <strong>Check.</strong> Dial heading to 30° in the widget and press <em>cross</em> —
          the drift readout should sit at 0.00 m. And note the cost of the current: the crossing
          is slower than the 3.1 s a still-water crossing would take.
        </p>
      </Worked>

      <Aside>
        This is the first and most important robotics bridge in the course. Every robot lives in nested
        frames — world, base, link, end-effector, sensor — and the rule for changing frames is exactly
        the velocity-addition picture you just steered. Chapters 3–5 of Modern Robotics replace the
        flat <M>{"\\hat{x},\\hat{y}"}</M> plane with rotating frames and the algebra of{" "}
        <M>{"SE(3)"}</M>, but the question never changes: <em>relative to which frame?</em>
      </Aside>

      <Quiz
        challengeId="phys1-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: (
              <>
                A ball is thrown straight up. At the very top of its flight, what are its
                velocity and acceleration?
              </>
            ),
            options: [
              { label: "v = 0, a = 9.8 m/s² downward", correct: true },
              { label: "v = 0, a = 0" },
              { label: "both are zero for an instant" },
              { label: "v = 9.8 m/s down, a = 0" },
            ],
            explain:
              "The turning point is where velocity passes through zero — but gravity never pauses. If a were zero there, the ball would stay put.",
          },
          {
            prompt: (
              <>
                One bullet is fired horizontally; an identical one is dropped from the same
                height at the same moment. Ignoring air resistance, which hits the ground first?
              </>
            ),
            options: [
              { label: "They land at the same time", correct: true },
              { label: "The dropped one" },
              { label: "The fired one" },
              { label: "It depends on the bullet's speed" },
            ],
            explain:
              "Vertical motion is independent of horizontal motion. Both start with zero vertical velocity and fall under the same g.",
          },
          {
            prompt: (
              <>
                You walk toward the front of a train at 1 m/s while the train moves at 30 m/s.
                Your velocity relative to the ground is…
              </>
            ),
            options: [
              { label: "31 m/s", correct: true },
              { label: "30 m/s" },
              { label: "1 m/s" },
              { label: "29 m/s" },
            ],
            explain:
              "Velocities in nested frames add: you-relative-to-train plus train-relative-to-ground.",
          },
        ]}
      />

      <H2>Where you'll use this in Modern Robotics</H2>
      <p>
        The rotating arrow of the first widget <em>is</em> a rotation matrix in embryo: in
        Chapter 3 the columns of <M>{"R"}</M> are exactly the shadows that a turned frame's axes
        cast on the fixed one. The bead's position/velocity pair returns as the state{" "}
        <M>{"(\\theta, \\dot\\theta)"}</M> of every joint in Chapters 8–11. And the river
        crossing is the whole of Chapters 3–5 in miniature: a robot lives in nested frames —
        world, base, link, camera — and every velocity must be tagged with the frame it is
        measured in before you are allowed to add it to anything.
      </p>

      <BookRef>
        Physics track · Module 1 of 10: vectors and frames, constant-acceleration kinematics,
        projectile motion, and relative motion. Bridges forward to Modern Robotics §3 (rigid-body
        motions) and §5 (velocity kinematics).
      </BookRef>
      <PhysicsRef />
    </div>
  );
}

/* ===================================================================== */
/* Widget 1 — rotating vector & its component shadows                    */
/* ===================================================================== */

function VectorScope() {
  const W = 760;
  const H = 360;
  const O: [number, number] = [200, 180];
  const SCALE = 26; // px per unit
  const START: [number, number] = [O[0] + 4.4 * SCALE, O[1] - 1.6 * SCALE]; // NOT (3,4): the challenge must be earned
  const svgRef = useRef<SVGSVGElement>(null);
  const [tip, setTip] = useState<[number, number]>(START);
  const [spinning, setSpinning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const histRef = useRef<{ t: number; vx: number; vy: number }[]>([]);
  const tRef = useRef(0);
  const [, force] = useState(0);

  const vx = (tip[0] - O[0]) / SCALE;
  const vy = (O[1] - tip[1]) / SCALE;
  const mag = Math.hypot(vx, vy);
  const theta = Math.atan2(vy, vx);

  const push = (t: number, pvx: number, pvy: number) => {
    const h = histRef.current;
    h.push({ t, vx: pvx, vy: pvy });
    if (h.length > 700) h.shift();
  };

  // the strip chart traces while spinning AND while dragging — it is never dead
  useRaf(spinning || dragging, dt => {
    tRef.current += dt;
    if (spinning) {
      const w = 0.9; // rad/s
      setTip(([tx, ty]) => {
        const dx = tx - O[0];
        const dy = ty - O[1];
        const c = Math.cos(w * dt);
        const s = Math.sin(w * dt);
        // rotate counter-clockwise in screen space (y is down, so negate)
        const nx = O[0] + dx * c + dy * s;
        const ny = O[1] - dx * s + dy * c;
        push(tRef.current, (nx - O[0]) / SCALE, (O[1] - ny) / SCALE);
        return [nx, ny];
      });
    } else {
      push(tRef.current, vx, vy);
    }
    force(n => n + 1);
  });

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    const [x, y] = svgCoords(e, svgRef.current, W, H);
    setTip([clamp(x, O[0] - 5.2 * SCALE, O[0] + 5.2 * SCALE), clamp(y, O[1] - 5.2 * SCALE, O[1] + 5.2 * SCALE)]);
  };

  function reset() {
    setSpinning(false);
    histRef.current = [];
    tRef.current = 0;
    setTip(START);
  }

  // right-hand scrolling plot of the two components
  const plotX = 460;
  const plotW = 280;
  const plotMid = 180;
  const plotHalf = 120;
  const tWin = 7;
  const tNow = tRef.current;
  const vScale = plotHalf / 5.5;
  const hist = histRef.current;
  const mapT = (t: number) => plotX + ((t - (tNow - tWin)) / tWin) * plotW;
  const buildPath = (key: "vx" | "vy") =>
    hist
      .filter(p => p.t >= tNow - tWin)
      .map((p, i) => `${i === 0 ? "M" : "L"} ${mapT(p.t).toFixed(1)} ${(plotMid - p[key] * vScale).toFixed(1)}`)
      .join(" ");

  const targetMet = !spinning && Math.abs(vx - 3) < 0.12 && Math.abs(vy - 4) < 0.12;

  return (
    <>
      <WidgetShell
        title="Vector components — the shadows of one arrow"
        onReset={reset}
        caption="Drag the purple tip, or press spin to rotate the arrow at a constant rate. The red and green shadows are the x- and y-components; on the right they trace out cosine and sine as the arrow turns."
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full touch-none select-none rounded-lg bg-[#fbfaf7]"
          onPointerMove={onMove}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        >
          <ArrowDefs />
          {/* scope grid */}
          <Grid width={420} height={H} origin={O} step={SCALE} />
          {/* axis numbers */}
          {[-4, -2, 2, 4].map(u => (
            <g key={u} className="ui">
              <text x={O[0] + u * SCALE} y={O[1] + 15} textAnchor="middle" className="fill-[var(--ink-faint)] text-[9.5px]">{u}</text>
              <text x={O[0] - 7} y={O[1] - u * SCALE + 3.5} textAnchor="end" className="fill-[var(--ink-faint)] text-[9.5px]">{u}</text>
            </g>
          ))}
          {/* magnitude circle preserved while spinning */}
          <circle cx={O[0]} cy={O[1]} r={mag * SCALE} fill="none" stroke="#d9d5ca" strokeWidth={1.2} strokeDasharray="3 5" />
          {/* angle arc at the origin */}
          {mag > 0.6 && Math.abs(theta) > 0.06 && (
            <g>
              <path
                d={`M ${O[0] + 27} ${O[1]} A 27 27 0 0 ${theta >= 0 ? 0 : 1} ${(O[0] + 27 * Math.cos(theta)).toFixed(1)} ${(O[1] - 27 * Math.sin(theta)).toFixed(1)}`}
                fill="none" stroke={V_COLOR} strokeWidth={1.6} opacity={0.65}
              />
              <text
                x={O[0] + 43 * Math.cos(theta / 2)}
                y={O[1] - 43 * Math.sin(theta / 2) + 4}
                textAnchor="middle" className="ui text-[11px]" fill={V_COLOR}
              >θ</text>
            </g>
          )}
          {/* component shadows */}
          <line x1={O[0]} y1={O[1]} x2={tip[0]} y2={O[1]} stroke={X_COLOR} strokeWidth={4} markerEnd="url(#fd-arrow-x)" />
          <line x1={tip[0]} y1={O[1]} x2={tip[0]} y2={tip[1]} stroke={Y_COLOR} strokeWidth={4} markerEnd="url(#fd-arrow-y)" />
          <line x1={O[0]} y1={tip[1]} x2={tip[0]} y2={tip[1]} stroke="#d9d5ca" strokeWidth={1.4} strokeDasharray="5 5" />
          {/* resultant */}
          <line x1={O[0]} y1={O[1]} x2={tip[0]} y2={tip[1]} stroke={V_COLOR} strokeWidth={5} markerEnd="url(#fd-arrow-v)" />
          <circle
            cx={tip[0]}
            cy={tip[1]}
            r={11}
            className="cursor-grab"
            fill={V_COLOR}
            stroke="#fff"
            strokeWidth={3}
            onPointerDown={e => {
              setSpinning(false);
              setDragging(true);
              (e.currentTarget as SVGCircleElement).setPointerCapture?.(e.pointerId);
            }}
          />
          <text x={tip[0] + 14} y={tip[1] - 10} className="ui fill-[var(--ink-soft)] text-[13px]">r</text>

          {/* divider */}
          <line x1={440} y1={28} x2={440} y2={H - 24} stroke="#e4e1d8" strokeWidth={1.4} />

          {/* component traces */}
          <line x1={plotX} y1={plotMid} x2={plotX + plotW} y2={plotMid} stroke="#cfcabc" strokeWidth={1.2} />
          {/* amplitude envelope */}
          <line x1={plotX} y1={plotMid - mag * vScale} x2={plotX + plotW} y2={plotMid - mag * vScale} stroke="#9e9e9e" strokeWidth={1} strokeDasharray="3 4" opacity={0.7} />
          <line x1={plotX} y1={plotMid + mag * vScale} x2={plotX + plotW} y2={plotMid + mag * vScale} stroke="#9e9e9e" strokeWidth={1} strokeDasharray="3 4" opacity={0.7} />
          <text x={plotX + plotW - 3} y={plotMid - mag * vScale - 4} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10px]">A = {mag.toFixed(2)}</text>
          <text x={plotX + plotW - 3} y={36} textAnchor="end" className="ui text-[11px]" fill={V_COLOR}>θ = {deg(theta).toFixed(0)}°</text>
          {/* legend */}
          <g className="ui">
            <rect x={plotX} y={28} width={9} height={9} rx={2} fill={X_COLOR} />
            <text x={plotX + 14} y={36} className="text-[11px]" fill="var(--ink-soft)">x = |r| cos θ</text>
            <rect x={plotX + 106} y={28} width={9} height={9} rx={2} fill={Y_COLOR} />
            <text x={plotX + 120} y={36} className="text-[11px]" fill="var(--ink-soft)">y = |r| sin θ</text>
          </g>
          {hist.length > 1 && (
            <>
              <path d={buildPath("vx")} fill="none" stroke={X_COLOR} strokeWidth={2.4} />
              <path d={buildPath("vy")} fill="none" stroke={Y_COLOR} strokeWidth={2.4} />
              {/* live level dots at the right edge tie chart to arrow */}
              <circle cx={plotX + plotW} cy={plotMid - vx * vScale} r={4} fill={X_COLOR} />
              <circle cx={plotX + plotW} cy={plotMid - vy * vScale} r={4} fill={Y_COLOR} />
            </>
          )}
          {hist.length <= 1 && (
            <text x={plotX + plotW / 2} y={plotMid - 14} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[12px]">
              drag the tip or press spin —
            </text>
          )}
          {hist.length <= 1 && (
            <text x={plotX + plotW / 2} y={plotMid + 6} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[12px]">
              x and y trace themselves here
            </text>
          )}
          <text x={plotX + plotW - 3} y={H - 10} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[11px]">time →</text>
        </svg>
        <ControlBar>
          <PlayButton running={spinning} onClick={() => setSpinning(s => !s)} labels={["spin", "stop"]} />
          <Readout label="x" value={`${vx.toFixed(2)}`} color={X_COLOR} />
          <Readout label="y" value={`${vy.toFixed(2)}`} color={Y_COLOR} />
          <Readout label="|r|" value={`${mag.toFixed(2)}`} color={V_COLOR} />
          <Readout label="angle" value={`${deg(theta).toFixed(0)}°`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys1-vector-3-4-5" met={targetMet}>
        Stop the spin and drag the tip until the arrow is about <M>{"3\\,\\hat{x} + 4\\,\\hat{y}"}</M>.
        The magnitude readout should lock onto almost exactly <strong>5</strong> — the 3-4-5 triangle.
      </Challenge>
    </>
  );
}

/* ===================================================================== */
/* Widget 2 — animated 1D kinematics with live x(t) and v(t) graphs      */
/* ===================================================================== */

function KinematicsTrack() {
  const W = 760;
  const H = 420;
  const [x0, setX0] = useState(0);
  const [v0, setV0] = useState(3.4);
  const [a, setA] = useState(-1.1);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const tMax = 6;

  useRaf(running, dt => {
    setT(prev => {
      const n = prev + dt;
      return n > tMax ? 0 : n;
    });
  });

  const xOf = (ti: number) => x0 + v0 * ti + 0.5 * a * ti * ti;
  const vOf = (ti: number) => v0 + a * ti;

  // sampled curves
  const N = 160;
  const samples = Array.from({ length: N + 1 }, (_, i) => {
    const ti = (i / N) * tMax;
    return { t: ti, x: xOf(ti), v: vOf(ti) };
  });
  const xs = samples.map(s => s.x);
  const vs = samples.map(s => s.v);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xPad = Math.max(0.5, (xMax - xMin) * 0.12);
  const vAbs = Math.max(1, ...vs.map(Math.abs));

  // layout regions
  const trackY = 56;
  const trackX0 = 70;
  const trackX1 = 690;
  const trackPos = (x: number) => trackX0 + ((x - (xMin - xPad)) / (xMax - xMin + 2 * xPad)) * (trackX1 - trackX0);

  const xPlotY = 96;
  const xPlotH = 150;
  const vPlotY = 270;
  const vPlotH = 120;
  const tToX = (ti: number) => trackX0 + (ti / tMax) * (trackX1 - trackX0);
  const xToScreen = (x: number) => xPlotY + xPlotH - ((x - (xMin - xPad)) / (xMax - xMin + 2 * xPad)) * xPlotH;
  const vToScreen = (v: number) => vPlotY + vPlotH / 2 - (v / vAbs) * (vPlotH / 2 - 6);

  const xPath = samples.map((s, i) => `${i === 0 ? "M" : "L"} ${tToX(s.t).toFixed(1)} ${xToScreen(s.x).toFixed(1)}`).join(" ");
  const vPath = samples.map((s, i) => `${i === 0 ? "M" : "L"} ${tToX(s.t).toFixed(1)} ${vToScreen(s.v).toFixed(1)}`).join(" ");

  const curX = xOf(t);
  const curV = vOf(t);
  const beadX = trackPos(curX);
  const playX = tToX(t);

  const tStop = Math.abs(a) > 1e-6 ? -v0 / a : Infinity;
  const turningVisible = Math.abs(a) > 0.08 && tStop > 0.5 && tStop < tMax - 0.5;
  // the challenge is earned by carrying the bead THROUGH the turning point, not by page defaults
  const turnReached = turningVisible && t >= tStop - 0.02;

  // shaded area under v(t) from 0 to the playhead = distance covered so far
  const areaSamples = samples.filter(s => s.t <= t);
  const areaPath =
    areaSamples.length > 1
      ? `M ${tToX(0).toFixed(1)} ${vToScreen(0).toFixed(1)} ` +
        areaSamples.map(s => `L ${tToX(s.t).toFixed(1)} ${vToScreen(s.v).toFixed(1)}`).join(" ") +
        ` L ${tToX(areaSamples[areaSamples.length - 1].t).toFixed(1)} ${vToScreen(0).toFixed(1)} Z`
      : "";

  return (
    <>
      <WidgetShell
        title="Position, velocity, and the turning point"
        onReset={() => { setX0(0); setV0(3.4); setA(-1.1); setT(0); setRunning(false); }}
        caption="Top: the bead on its track — blue arrow is the live velocity, orange is the fixed acceleration. Middle: position x(t). Bottom: velocity v(t); the shaded area under it is the distance covered so far. The gold dashed line is the turning point, where v crosses zero and the bead reverses."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* track */}
          <line x1={trackX0} y1={trackY} x2={trackX1} y2={trackY} stroke="#c4c0b4" strokeWidth={3} strokeLinecap="round" />
          {Array.from(
            { length: Math.floor(xMax + xPad) - Math.ceil(xMin - xPad) + 1 },
            (_, i) => Math.ceil(xMin - xPad) + i
          ).map(tick => (
            <g key={tick}>
              <line
                x1={trackPos(tick)} y1={trackY - (tick === 0 ? 10 : 6)}
                x2={trackPos(tick)} y2={trackY + (tick === 0 ? 10 : 6)}
                stroke="#a8a496" strokeWidth={tick === 0 ? 1.5 : 1.2}
              />
              <text x={trackPos(tick)} y={trackY + 22} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">
                {tick}
              </text>
            </g>
          ))}
          <text x={trackX1 + 8} y={trackY + 5} className="ui fill-[var(--ink-faint)] text-[11px]">m</text>
          {turningVisible && (
            <line x1={trackPos(xOf(tStop))} y1={trackY - 14} x2={trackPos(xOf(tStop))} y2={trackY + 14} stroke={GOLD} strokeWidth={2} strokeDasharray="3 3" />
          )}
          {/* acceleration arrow above the bead — constant, unlike the velocity */}
          {Math.abs(a) > 0.05 && (
            <>
              <line
                x1={beadX} y1={trackY - 22}
                x2={beadX + clamp(a * 30, -80, 80)} y2={trackY - 22}
                stroke={A_COLOR} strokeWidth={3} markerEnd="url(#fd-arrow-a)"
              />
              <text
                x={beadX + clamp(a * 30, -80, 80) + (a > 0 ? 8 : -8)} y={trackY - 18}
                textAnchor={a > 0 ? "start" : "end"} className="ui text-[10.5px]" fill={A_COLOR}
              >a</text>
            </>
          )}
          {/* velocity arrow on bead */}
          <line
            x1={beadX}
            y1={trackY}
            x2={beadX + clamp(curV * 26, -90, 90)}
            y2={trackY}
            stroke={BLUE}
            strokeWidth={4}
            markerEnd={Math.abs(curV) > 0.05 ? "url(#fd-arrow-b)" : undefined}
          />
          <circle cx={beadX} cy={trackY} r={11} fill={V_COLOR} stroke="#fff" strokeWidth={3} />

          {/* x(t) plot */}
          <PlotFrame x0={trackX0} y0={xPlotY} w={trackX1 - trackX0} h={xPlotH} label="position x(t)" />
          {/* zero line for x if it's in range */}
          {xMin - xPad < 0 && xMax + xPad > 0 && (
            <line x1={trackX0} y1={xToScreen(0)} x2={trackX1} y2={xToScreen(0)} stroke="#e4e1d8" />
          )}
          <path d={xPath} fill="none" stroke={V_COLOR} strokeWidth={3.5} />

          {/* v(t) plot */}
          <PlotFrame x0={trackX0} y0={vPlotY} w={trackX1 - trackX0} h={vPlotH} label="velocity v(t)" />
          {areaPath && <path d={areaPath} fill={BLUE} opacity={0.13} stroke="none" />}
          <line x1={trackX0} y1={vToScreen(0)} x2={trackX1} y2={vToScreen(0)} stroke="#cfcabc" strokeWidth={1.2} />
          <path d={vPath} fill="none" stroke={BLUE} strokeWidth={3.5} />

          {/* time axis ticks under the v(t) plot */}
          {Array.from({ length: tMax + 1 }, (_, i) => i).map(ti => (
            <g key={ti}>
              <line x1={tToX(ti)} y1={vPlotY + vPlotH} x2={tToX(ti)} y2={vPlotY + vPlotH + 5} stroke="#b6b2a4" />
              <text x={tToX(ti)} y={vPlotY + vPlotH + 17} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">{ti}</text>
            </g>
          ))}
          <text x={trackX1 + 8} y={vPlotY + vPlotH + 17} className="ui fill-[var(--ink-faint)] text-[10px]">s</text>

          {/* turning point marked on the graphs themselves */}
          {turningVisible && (
            <>
              <line x1={tToX(tStop)} y1={xPlotY} x2={tToX(tStop)} y2={vPlotY + vPlotH} stroke={GOLD} strokeWidth={1.6} strokeDasharray="4 4" />
              <circle cx={tToX(tStop)} cy={xToScreen(xOf(tStop))} r={4.5} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
              <circle cx={tToX(tStop)} cy={vToScreen(0)} r={4.5} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
              <text
                x={tToX(tStop) + (tStop < tMax * 0.7 ? 7 : -7)} y={vPlotY + 14}
                textAnchor={tStop < tMax * 0.7 ? "start" : "end"}
                className="ui text-[10.5px]" fill="#8a6d12"
              >v = 0 here</text>
            </>
          )}

          {/* shared playhead + live dots drawn above everything */}
          <line x1={playX} y1={xPlotY} x2={playX} y2={vPlotY + vPlotH} stroke={A_COLOR} strokeWidth={1.8} strokeDasharray="5 4" opacity={0.7} />
          <circle cx={playX} cy={xToScreen(curX)} r={6} fill={V_COLOR} stroke="#fff" strokeWidth={2} />
          <circle cx={playX} cy={vToScreen(curV)} r={6} fill={BLUE} stroke="#fff" strokeWidth={2} />
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={() => setRunning(r => !r)} />
          <LabeledSlider label="x₀" value={x0} min={-4} max={4} step={0.1} onChange={v => { setX0(v); }} fmt={v => `${v.toFixed(1)} m`} />
          <LabeledSlider label="v₀" value={v0} min={-5} max={5} step={0.1} onChange={setV0} fmt={v => `${v.toFixed(1)} m/s`} color={BLUE} />
          <LabeledSlider label="a" value={a} min={-2.5} max={2.5} step={0.05} onChange={setA} fmt={v => `${v.toFixed(2)} m/s²`} width={170} color={A_COLOR} />
          <LabeledSlider label="t" value={t} min={0} max={tMax} step={0.02} onChange={v => { setRunning(false); setT(v); }} fmt={v => `${v.toFixed(2)} s`} />
          <Readout label="x(t)" value={`${curX.toFixed(2)} m`} color={V_COLOR} />
          <Readout label="v(t)" value={`${curV.toFixed(2)} m/s`} color={BLUE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys1-motion-stop" met={turnReached}>
        Press play (or drag the <M>{"t"}</M> slider) and carry the bead <em>through</em> its
        turning point — the gold line marks where <M>{"v(t)=v_0+at"}</M> crosses zero, at{" "}
        <M>{"t=-v_0/a"}</M>. Watch closely: the bead pauses for exactly one instant as the
        velocity curve touches the axis.
      </Challenge>
    </>
  );
}

/* ===================================================================== */
/* Widget 3 — projectile launcher (real-time flight)                     */
/* ===================================================================== */

function ProjectileLauncher() {
  const W = 760;
  const H = 360;
  const g = 9.81;
  const [speed, setSpeed] = useState(22);
  const [angle, setAngle] = useState(52);
  const [height, setHeight] = useState(1.5);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);

  const th = rad(angle);
  const vx = speed * Math.cos(th);
  const vy0 = speed * Math.sin(th);
  const flightTime = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * height)) / g;
  const range = vx * flightTime;
  const peak = height + (vy0 * vy0) / (2 * g);

  useRaf(running, dt => {
    setT(prev => {
      const n = prev + dt;
      if (n >= flightTime) {
        setRunning(false);
        return flightTime;
      }
      return n;
    });
  });

  // reset the clock whenever the launch parameters change
  useEffect(() => { setRunning(false); setT(0); }, [speed, angle, height]);

  const origin: [number, number] = [58, 315];
  const scale = Math.min(11, 650 / Math.max(1, range), 250 / Math.max(1, peak));
  const sx = (x: number) => origin[0] + x * scale;
  const sy = (y: number) => origin[1] - y * scale;

  const fullArc = Array.from({ length: 81 }, (_, i) => {
    const ti = (i / 80) * flightTime;
    return [sx(vx * ti), sy(height + vy0 * ti - 0.5 * g * ti * ti)];
  });
  const ghostPath = fullArc.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

  const flown = Array.from({ length: 61 }, (_, i) => (i / 60) * t).map(ti => [sx(vx * ti), sy(height + vy0 * ti - 0.5 * g * ti * ti)]);
  const trailPath = flown.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

  // strobe dots every 0.3 s — equal horizontal spacing proves vx never changes
  const strobe: [number, number][] = [];
  for (let ti = 0.3; ti < t; ti += 0.3) strobe.push([sx(vx * ti), sy(height + vy0 * ti - 0.5 * g * ti * ti)]);

  const tPeak = vy0 > 0 ? vy0 / g : 0;
  const xPeak = vx * tPeak;

  const px = vx * t;
  const py = height + vy0 * t - 0.5 * g * t * t;
  const vyNow = vy0 - g * t;

  const tgt0 = 42;
  const tgt1 = 46;
  const hitTarget = range > tgt0 && range < tgt1 && peak < 18;

  function launch() {
    if (running) { setRunning(false); return; }
    if (t >= flightTime - 1e-3) setT(0);
    setRunning(true);
  }

  return (
    <>
      <WidgetShell
        title="Projectile launcher"
        onReset={() => { setSpeed(22); setAngle(52); setHeight(1.5); setT(0); setRunning(false); }}
        caption="The faint arc is the predicted path; press launch to fly it in real time. Red is the unchanging horizontal velocity, green is the vertical velocity that gravity rewrites every instant. The trail dots are stamped at equal time steps — their equal horizontal spacing is visible proof that vₓ never changes."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <ArrowDefs />
          {/* ground */}
          <line x1={40} y1={origin[1]} x2={730} y2={origin[1]} stroke="#8a8a9b" strokeWidth={1.5} />
          {/* distance scale on the ground */}
          {Array.from({ length: 8 }, (_, i) => (i + 1) * 10)
            .filter(d => sx(d) < 726)
            .map(d => (
              <g key={d}>
                <line x1={sx(d)} y1={origin[1]} x2={sx(d)} y2={origin[1] + 6} stroke="#a8a496" strokeWidth={1.2} />
                <text x={sx(d)} y={origin[1] + 19} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">{d} m</text>
              </g>
            ))}
          {/* launch platform */}
          {height > 0.05 && <rect x={origin[0] - 14} y={sy(height)} width={16} height={height * scale} fill="#d7d2c4" />}
          {/* target zone */}
          <rect x={sx(tgt0)} y={origin[1] - 30} width={(tgt1 - tgt0) * scale} height={30} fill="#f0f8f1" stroke="#bfdfc4" />
          <text x={sx((tgt0 + tgt1) / 2)} y={origin[1] - 38} textAnchor="middle" className="ui fill-[var(--good)] text-[11px] font-semibold">target</text>
          {/* predicted arc */}
          <path d={ghostPath} fill="none" stroke="#bdb7a6" strokeWidth={1.6} strokeDasharray="4 5" />
          {/* peak marker */}
          {vy0 > 0 && (
            <>
              <line x1={sx(xPeak)} y1={sy(peak)} x2={sx(xPeak)} y2={origin[1]} stroke={GOLD} strokeWidth={1.2} strokeDasharray="3 4" opacity={0.8} />
              <circle cx={sx(xPeak)} cy={sy(peak)} r={3.5} fill={GOLD} />
              <text x={sx(xPeak)} y={sy(peak) - 9} textAnchor="middle" className="ui text-[10.5px]" fill="#8a6d12">
                peak {peak.toFixed(1)} m
              </text>
            </>
          )}
          {/* flown trail + equal-time strobe dots */}
          {t > 0 && <path d={trailPath} fill="none" stroke={V_COLOR} strokeWidth={3.5} />}
          {strobe.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={2.8} fill={V_COLOR} opacity={0.55} />
          ))}
          {/* ball + velocity decomposition */}
          <circle cx={sx(px)} cy={sy(py)} r={8} fill={A_COLOR} stroke="#fff" strokeWidth={2.5} />
          <line x1={sx(px)} y1={sy(py)} x2={sx(px) + vx * 0.25 * scale} y2={sy(py) - vyNow * 0.25 * scale} stroke={V_COLOR} strokeWidth={2.5} opacity={0.75} markerEnd="url(#fd-arrow-v)" />
          <line x1={sx(px)} y1={sy(py)} x2={sx(px) + vx * 0.25 * scale} y2={sy(py)} stroke={X_COLOR} strokeWidth={3.5} markerEnd="url(#fd-arrow-x)" />
          <line x1={sx(px)} y1={sy(py)} x2={sx(px)} y2={sy(py) - vyNow * 0.25 * scale} stroke={Y_COLOR} strokeWidth={3.5} markerEnd="url(#fd-arrow-y)" />
          <text x={64} y={36} className="ui fill-[var(--ink-soft)] text-[12.5px]">vₓ constant · v_y bends under gravity</text>
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={launch} labels={["launch", "pause"]} />
          <LabeledSlider label="speed" value={speed} min={8} max={34} step={0.2} onChange={setSpeed} fmt={v => `${v.toFixed(1)} m/s`} width={170} />
          <LabeledSlider label="angle" value={angle} min={8} max={80} step={1} onChange={setAngle} fmt={v => `${v.toFixed(0)}°`} />
          <LabeledSlider label="height" value={height} min={0} max={8} step={0.1} onChange={setHeight} fmt={v => `${v.toFixed(1)} m`} />
          <Readout label="t" value={`${t.toFixed(2)} s`} color={A_COLOR} />
          <Readout label="range" value={`${range.toFixed(1)} m`} />
          <Readout label="peak" value={`${peak.toFixed(1)} m`} />
          <Readout label="flight" value={`${flightTime.toFixed(2)} s`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys1-projectile-target" met={hitTarget}>
        Land in the green target zone (range between <strong>42 m and 46 m</strong>) while keeping the
        peak height below <strong>18 m</strong> — a flat, fast shot rather than a high lob.
      </Challenge>
    </>
  );
}

/* ===================================================================== */
/* Widget 4 — relative motion: crossing a flowing river                  */
/* ===================================================================== */

function RiverCrossing() {
  const W = 760;
  const H = 360;
  const D = 10; // river width (m)
  const [vb, setVb] = useState(3.2); // boat speed relative to water
  const [headingDeg, setHeadingDeg] = useState(0); // + aims upstream (against current)
  const [u, setU] = useState(1.6); // current speed (downstream, +x)
  const [ts, setTs] = useState(0); // elapsed sim time
  const [running, setRunning] = useState(false);

  const phi = rad(headingDeg);
  // boat velocity relative to water: across = vb cos, upstream = vb sin
  const vAcross = vb * Math.cos(phi);
  const vGroundX = u - vb * Math.sin(phi); // net downstream drift
  const crossTime = vAcross > 1e-3 ? D / vAcross : Infinity;

  useRaf(running, dt => {
    setTs(prev => {
      const n = prev + dt;
      if (vAcross <= 1e-3 || n >= crossTime) {
        setRunning(false);
        return Math.min(n, crossTime);
      }
      return n;
    });
  });

  useEffect(() => { setRunning(false); setTs(0); }, [vb, headingDeg, u]);

  // world → screen. x downstream, y across (0 near bank, D far bank).
  const nearY = 312;
  const farY = 60;
  const cx = 380; // screen x for world x = 0 (the dock column)
  const pxPerM = (nearY - farY) / D; // vertical
  const wx = (x: number) => cx + x * pxPerM;
  const wy = (y: number) => nearY - y * pxPerM;

  const Y = Math.min(vAcross * ts, D);
  const X = vGroundX * ts;
  const driftFinal = Number.isFinite(crossTime) ? vGroundX * crossTime : NaN; // where it lands at far bank

  // heading direction (where the bow points), for the boat glyph + still-water ghost
  const headDir = Math.atan2(vAcross, -vb * Math.sin(phi)); // screen-ish angle of water-relative velocity
  const groundAng = Math.atan2(vAcross, vGroundX);

  const landed = vAcross > 1e-3 && Y >= D - 1e-3;
  const aimedAtDock = Number.isFinite(driftFinal) && Math.abs(driftFinal) < 0.3;
  // the checkmark requires actually making the crossing, not just dialing the sliders
  const dockMet = landed && Math.abs(X) < 0.3;

  // velocity triangle inset, in its own card at bottom-right of the water
  const triO: [number, number] = [654, 292];
  const triScale = 11;

  function launch() {
    if (running) { setRunning(false); return; }
    if (Y >= D - 1e-3) setTs(0);
    setRunning(true);
  }

  return (
    <>
      <WidgetShell
        title="Crossing the river — velocity is relative to a frame"
        onReset={() => { setVb(3.2); setHeadingDeg(0); setU(1.6); setTs(0); setRunning(false); }}
        caption="The boat moves at its set speed relative to the water; the current adds on top. Solid purple is the path over the ground; the dashed grey arrow is where the bow points. The × on the far bank predicts your landing spot and updates live as you aim — put it on the dock, then press cross."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#eef4f7]">
          <ArrowDefs />
          {/* banks */}
          <rect x={0} y={farY - 28} width={W} height={28} fill="#cdbfa3" />
          <rect x={0} y={nearY} width={W} height={H - nearY} fill="#cdbfa3" />
          {/* current arrows — they drift downstream while the boat crosses */}
          {Array.from({ length: 6 }, (_, i) => {
            const yy = farY + 36 + i * ((nearY - farY - 60) / 5);
            const len = clamp(u * 16, 6, 70);
            const xoff = ((ts * u * pxPerM) % 56) * (i % 2 === 0 ? 1 : 0.6);
            return (
              <g key={i} opacity={0.5}>
                <line x1={90 + xoff} y1={yy} x2={90 + xoff + len} y2={yy} stroke={BLUE} strokeWidth={2} markerEnd="url(#fd-arrow-b)" />
              </g>
            );
          })}
          <text x={100} y={farY + 20} className="ui fill-[#2c5a78] text-[11px]">current u = {u.toFixed(1)} m/s →</text>

          {/* dock target on far bank */}
          <line x1={cx} y1={nearY} x2={cx} y2={farY} stroke="#ffffff" strokeWidth={1} strokeDasharray="2 8" opacity={0.6} />
          <rect x={cx - 16} y={farY - 12} width={32} height={12} fill={GOLD} opacity={aimedAtDock ? 0.95 : 0.55} />
          <text x={cx} y={farY - 16} textAnchor="middle" className="ui fill-[#8a6d12] text-[11px] font-semibold">dock</text>

          {/* predicted ground path + landing marker — updates live with the sliders */}
          {Number.isFinite(driftFinal) && (
            <>
              <line
                x1={wx(X)} y1={wy(Y)}
                x2={clamp(wx(driftFinal), 24, 736)} y2={wy(D)}
                stroke={V_COLOR} strokeWidth={1.6} strokeDasharray="4 5" opacity={0.45}
              />
              <g transform={`translate(${clamp(wx(driftFinal), 24, 736)}, ${farY})`}>
                <line x1={-5} y1={-5} x2={5} y2={5} stroke={aimedAtDock ? "#2f9e44" : "#c2571c"} strokeWidth={2.5} />
                <line x1={-5} y1={5} x2={5} y2={-5} stroke={aimedAtDock ? "#2f9e44" : "#c2571c"} strokeWidth={2.5} />
              </g>
              {!landed && (
                <text
                  x={clamp(wx(driftFinal), 40, 720)} y={farY + 16}
                  textAnchor="middle" className="ui text-[10px]"
                  fill={aimedAtDock ? "#2f9e44" : "#c2571c"}
                >lands here</text>
              )}
            </>
          )}

          {/* ground track */}
          {ts > 0 && <line x1={wx(0)} y1={wy(0)} x2={wx(X)} y2={wy(Y)} stroke={V_COLOR} strokeWidth={3} />}
          {/* still-water heading ghost (where bow points) */}
          <line
            x1={wx(X)} y1={wy(Y)}
            x2={wx(X) - vb * Math.sin(phi) * pxPerM * 0.9}
            y2={wy(Y) - vAcross * pxPerM * 0.9}
            stroke="#8a8576" strokeWidth={2} strokeDasharray="5 5" markerEnd="url(#fd-arrow-g)"
          />

          {/* boat */}
          <g transform={`translate(${wx(X)}, ${wy(Y)}) rotate(${90 - deg(headDir)})`}>
            <path d="M 0 -12 L 7 8 L -7 8 Z" fill="#7a3b12" stroke="#fff" strokeWidth={1.5} />
          </g>
          {/* ground-velocity arrow from boat */}
          {ts > 0 && !landed && (
            <line
              x1={wx(X)} y1={wy(Y)}
              x2={wx(X) + Math.cos(groundAng) * 36}
              y2={wy(Y) - Math.sin(groundAng) * 36}
              stroke={V_COLOR} strokeWidth={3} markerEnd="url(#fd-arrow-v)"
            />
          )}

          {/* velocity triangle in its own card, clear of the banks */}
          <g>
            <rect x={566} y={172} width={182} height={136} rx={9} fill="#ffffff" opacity={0.9} stroke="#d8d4c8" />
            <text x={657} y={190} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10.5px]">velocity triangle</text>
            {/* boat rel water (blue) */}
            <line x1={triO[0]} y1={triO[1]} x2={triO[0] - vb * Math.sin(phi) * triScale} y2={triO[1] - vAcross * triScale} stroke={BLUE} strokeWidth={2.5} markerEnd="url(#fd-arrow-b)" />
            <text
              x={triO[0] - vb * Math.sin(phi) * triScale / 2 - 6}
              y={triO[1] - vAcross * triScale / 2}
              textAnchor="end" dominantBaseline="middle"
              className="ui text-[9px]" fill={BLUE}
            >boat/water</text>
            {/* current (red) appended */}
            <line x1={triO[0] - vb * Math.sin(phi) * triScale} y1={triO[1] - vAcross * triScale} x2={triO[0] - vb * Math.sin(phi) * triScale + u * triScale} y2={triO[1] - vAcross * triScale} stroke={X_COLOR} strokeWidth={2.5} markerEnd="url(#fd-arrow-x)" />
            <text
              x={triO[0] - vb * Math.sin(phi) * triScale + u * triScale / 2}
              y={triO[1] - vAcross * triScale - 7}
              textAnchor="middle"
              className="ui text-[9px]" fill={X_COLOR}
            >current</text>
            {/* resultant ground (purple) */}
            <line x1={triO[0]} y1={triO[1]} x2={triO[0] + vGroundX * triScale} y2={triO[1] - vAcross * triScale} stroke={V_COLOR} strokeWidth={2.5} markerEnd="url(#fd-arrow-v)" />
            <text
              x={triO[0] + vGroundX * triScale / 2 + 6}
              y={triO[1] - vAcross * triScale / 2}
              textAnchor="start" dominantBaseline="middle"
              className="ui text-[9px]" fill={V_COLOR}
            >ground</text>
          </g>

          {landed && (
            <text x={wx(X)} y={farY - 30} textAnchor="middle" className="ui text-[12px] font-semibold" fill={dockMet ? "#2f9e44" : "#c2571c"}>
              {dockMet ? "reached the dock" : `drifted ${driftFinal.toFixed(1)} m`}
            </text>
          )}
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={launch} labels={["cross", "pause"]} />
          <LabeledSlider label="boat" value={vb} min={1} max={5} step={0.1} onChange={setVb} fmt={v => `${v.toFixed(1)} m/s`} color={BLUE} />
          <LabeledSlider label="heading" value={headingDeg} min={-60} max={60} step={1} onChange={setHeadingDeg} fmt={v => `${v.toFixed(0)}° up`} width={170} />
          <LabeledSlider label="current" value={u} min={0} max={4} step={0.1} onChange={setU} fmt={v => `${v.toFixed(1)} m/s`} color={X_COLOR} />
          <Readout label="predicted drift" value={Number.isFinite(driftFinal) ? `${driftFinal.toFixed(2)} m` : "—"} color={V_COLOR} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys1-relative-cross" met={dockMet}>
        Reach the gold dock straight across — aim, then <em>press cross</em> to prove it. Point
        the bow <em>upstream</em> until the "lands here" marker sits on the dock: that is{" "}
        <M>{"v_b\\sin\\phi = u"}</M>, i.e. <M>{"\\phi = \\arcsin(u/v_b)"}</M>. (You need{" "}
        <M>{"v_b > u"}</M> for any heading to work.)
      </Challenge>
    </>
  );
}

/* ===================================================================== */
/* shared SVG bits                                                       */
/* ===================================================================== */

function PlotFrame({ x0, y0, w, h, label }: { x0: number; y0: number; w: number; h: number; label: string }) {
  return (
    <g>
      <line x1={x0} y1={y0} x2={x0} y2={y0 + h} stroke="#b6b2a4" strokeWidth={1.4} />
      <line x1={x0} y1={y0 + h} x2={x0 + w} y2={y0 + h} stroke="#b6b2a4" strokeWidth={1.4} />
      <text x={x0 + w - 4} y={y0 + 16} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[12px]">{label}</text>
    </g>
  );
}

function Grid({ width, height, origin, step }: { width: number; height: number; origin: [number, number]; step: number }) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let x = origin[0] % step; x <= width; x += step) xs.push(x);
  for (let y = origin[1] % step; y <= height; y += step) ys.push(y);
  return (
    <g>
      {xs.map(x => <line key={`x${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#ece8dd" />)}
      {ys.map(y => <line key={`y${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#ece8dd" />)}
      <line x1={0} y1={origin[1]} x2={width} y2={origin[1]} stroke="#8a8a9b" strokeWidth={1.5} />
      <line x1={origin[0]} y1={0} x2={origin[0]} y2={height} stroke="#8a8a9b" strokeWidth={1.5} />
    </g>
  );
}

function ArrowDefs() {
  const m = (id: string, color: string) => (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
    </marker>
  );
  return (
    <defs>
      {m("fd-arrow-x", X_COLOR)}
      {m("fd-arrow-y", Y_COLOR)}
      {m("fd-arrow-v", V_COLOR)}
      {m("fd-arrow-b", BLUE)}
      {m("fd-arrow-a", A_COLOR)}
      {m("fd-arrow-g", "#8a8576")}
    </defs>
  );
}
