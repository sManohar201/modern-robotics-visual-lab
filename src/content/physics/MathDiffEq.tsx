import { useMemo, useRef, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell } from "../../components/widgets/WidgetShell";
import { svgCoords } from "../../lib/svg";

const W = 760;
const H = 380;
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";
const RED = "#d9483f";
const GREEN = "#2f9e44";

// ------------------------------------------------------------------
// Widget 1: ẋ = a·x — scrub time, watch exponential growth/decay
// ------------------------------------------------------------------
function FlowLine() {
  const [a, setA] = useState(0.6);
  const [x0, setX0] = useState(1.5);
  const [t, setT] = useState(0);

  const T_MAX = 4;
  const xNow = x0 * Math.exp(a * t);

  const px = (tt: number, x: number): [number, number] => [
    60 + (tt / T_MAX) * (W - 100),
    H / 2 - (x / 4.2) * (H / 2 - 30),
  ];

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 160; i++) {
      const tt = (T_MAX * i) / 160;
      const x = x0 * Math.exp(a * tt);
      if (Math.abs(x) > 4.2) break;
      pts.push(px(tt, x).map(v => v.toFixed(1)).join(","));
    }
    return pts.join(" ");
  }, [a, x0]);

  const [dx, dy] = px(t, Math.max(-4.2, Math.min(4.2, xNow)));
  const met = a <= -0.7 && Math.abs(x0) >= 1 && Math.abs(xNow) < 0.05 * Math.abs(x0);

  return (
    <>
      <WidgetShell
        title="One rule, one story: ẋ = a·x"
        onReset={() => {
          setA(0.6);
          setX0(1.5);
          setT(0);
        }}
        caption={
          <>
            The rule says: the current rate of change equals <em>a</em> times the current value.
            The story that obeys the rule is the exponential curve. Positive <em>a</em>:
            runaway growth. Negative <em>a</em>: decay toward zero. Scrub time to live it.
          </>
        }
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7] select-none">
          <line x1={60} y1={H / 2} x2={W - 40} y2={H / 2} stroke="#c9c5b8" strokeWidth={1.2} />
          <line x1={60} y1={20} x2={60} y2={H - 20} stroke="#c9c5b8" strokeWidth={1.2} />
          <text x={W - 40} y={H / 2 + 18} textAnchor="end" fontFamily="Inter, sans-serif" fontSize="11.5" fill="#8a8a9b">
            time t
          </text>
          <text x={16} y={24} fontFamily="Inter, sans-serif" fontSize="11.5" fill="#8a8a9b">
            x(t)
          </text>

          <polyline points={curve} fill="none" stroke={PURPLE} strokeWidth={2.5} />
          <line x1={dx} y1={H / 2} x2={dx} y2={dy} stroke="#d6d2c4" strokeWidth={1.2} strokeDasharray="4 4" />
          <circle cx={dx} cy={dy} r={7} fill={PURPLE} stroke="#fff" strokeWidth={2.5} />
        </svg>
        <ControlBar>
          <LabeledSlider label="a" value={a} min={-1.5} max={1.5} step={0.01} onChange={setA} width={160} />
          <LabeledSlider label="x(0)" value={x0} min={-3} max={3} step={0.05} onChange={setX0} width={140} />
          <LabeledSlider label="t" value={t} min={0} max={T_MAX} step={0.01} onChange={setT} fmt={v => `${v.toFixed(2)} s`} width={180} />
          <Readout label="x(t) = x(0)·e^(a·t)" value={xNow.toFixed(3)} color={met ? GREEN : PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="math4-decay" met={met}>
        Make the state die out: choose a decay rate <M>{"a \\le -0.7"}</M>, start from{" "}
        <M>{"|x(0)| \\ge 1"}</M>, then scrub time forward until <M>{"x(t)"}</M> is within 5 % of
        zero. Every stable control system in Chapter 11 is engineered to make its <em>error</em>{" "}
        behave exactly like this curve.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Widget 2: ẋ = A·x in 2D — vector field + click-to-drop trajectories
// ------------------------------------------------------------------
function PhasePortrait() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [omega, setOmega] = useState(1.0);
  const [damp, setDamp] = useState(0.15);
  const [start, setStart] = useState<[number, number] | null>([1.8, 0]);

  // A = [ -b  -ω ;  ω  -b ]  — spin ω plus uniform decay b
  const S = 78;
  const CX = W / 2;
  const CY = H / 2;
  const toPx = (x: number, y: number): [number, number] => [CX + x * S, CY - y * S];
  const fromPx = (p: number, q: number): [number, number] => [(p - CX) / S, (CY - q) / S];

  const f = (v: [number, number]): [number, number] => [
    -damp * v[0] - omega * v[1],
    omega * v[0] - damp * v[1],
  ];

  // vector field glyphs
  const field = useMemo(() => {
    const glyphs: { x: number; y: number; u: number; v: number }[] = [];
    for (let gx = -4.4; gx <= 4.4; gx += 0.8) {
      for (let gy = -2.1; gy <= 2.1; gy += 0.7) {
        const [u, v] = f([gx, gy]);
        const n = Math.hypot(u, v);
        if (n < 1e-6) continue;
        glyphs.push({ x: gx, y: gy, u: u / n, v: v / n });
      }
    }
    return glyphs;
  }, [omega, damp]);

  // RK4 trajectory from the dropped start
  const traj = useMemo(() => {
    if (!start) return "";
    let v: [number, number] = start;
    const pts: string[] = [toPx(v[0], v[1]).map(n => n.toFixed(1)).join(",")];
    const dt = 0.02;
    for (let i = 0; i < 700; i++) {
      const k1 = f(v);
      const k2 = f([v[0] + (dt / 2) * k1[0], v[1] + (dt / 2) * k1[1]]);
      const k3 = f([v[0] + (dt / 2) * k2[0], v[1] + (dt / 2) * k2[1]]);
      const k4 = f([v[0] + dt * k3[0], v[1] + dt * k3[1]]);
      v = [
        v[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
        v[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      ];
      if (Math.hypot(v[0], v[1]) > 6) break;
      pts.push(toPx(v[0], v[1]).map(n => n.toFixed(1)).join(","));
    }
    return pts.join(" ");
  }, [start, omega, damp]);

  const orbitMet = !!start && Math.abs(damp) < 0.03 && omega >= 0.5;

  return (
    <>
      <WidgetShell
        title="The matrix version: ẋ = A·x"
        onReset={() => {
          setOmega(1.0);
          setDamp(0.15);
          setStart([1.8, 0]);
        }}
        caption={
          <>
            The state is now a 2D point and the matrix{" "}
            <span className="mono">A = [−b −ω; ω −b]</span> assigns every point a velocity arrow
            (gray). Click anywhere to drop a starting point; the purple path follows the arrows.
            Spin ω circles the state around; damping b pulls it inward or pushes it outward.
          </>
        }
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full rounded-lg bg-[#fbfaf7] touch-none select-none cursor-crosshair"
          onPointerDown={e => {
            if (!svgRef.current) return;
            const [p, q] = svgCoords(e, svgRef.current, W, H);
            setStart(fromPx(p, q));
          }}
        >
          <line x1={0} y1={CY} x2={W} y2={CY} stroke="#e3e0d5" strokeWidth={1} />
          <line x1={CX} y1={0} x2={CX} y2={H} stroke="#e3e0d5" strokeWidth={1} />

          {field.map((g, i) => {
            const [x1, y1] = toPx(g.x, g.y);
            const [x2, y2] = toPx(g.x + g.u * 0.28, g.y + g.v * 0.28);
            return (
              <g key={i} opacity={0.7}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#b8b4a6" strokeWidth={1.3} />
                <circle cx={x2} cy={y2} r={1.6} fill="#b8b4a6" />
              </g>
            );
          })}

          {traj && <polyline points={traj} fill="none" stroke={PURPLE} strokeWidth={2.2} />}
          {start && (
            <circle cx={toPx(start[0], start[1])[0]} cy={toPx(start[0], start[1])[1]} r={6} fill={ORANGE} stroke="#fff" strokeWidth={2} />
          )}
        </svg>
        <ControlBar>
          <LabeledSlider label="spin ω" value={omega} min={0} max={2} step={0.01} onChange={setOmega} width={180} />
          <LabeledSlider label="damping b" value={damp} min={-0.3} max={0.8} step={0.005} onChange={setDamp} width={180} />
          <Readout
            label="behavior"
            value={
              Math.abs(damp) < 0.03
                ? omega > 0.05
                  ? "pure orbit"
                  : "frozen"
                : damp > 0
                  ? omega > 0.05
                    ? "spiral in"
                    : "straight decay"
                  : "spiral out"
            }
            color={damp > 0.03 ? GREEN : damp < -0.03 ? RED : ORANGE}
          />
        </ControlBar>
      </WidgetShell>
      <Challenge id="math4-orbit" met={orbitMet}>
        Produce a <em>closed orbit</em>: set damping to zero (within ±0.03), keep{" "}
        <M>{"\\omega \\ge 0.5"}</M>, and drop a point. The path should circle forever without
        spiraling — pure rotation. Hold that picture: it is exactly what a spinning rigid body's
        orientation does in Chapter 3.
      </Challenge>
    </>
  );
}

export default function MathDiffEq() {
  return (
    <div>
      <PageHeader
        chapter="Math 4"
        section="College Physics & Dynamics"
        title="Equations of Change"
        lede="Nature never hands you the answer — it hands you a rule for how things change, and you must unroll the story yourself. Learning to read these rules unlocks the single most-used formula in Modern Robotics."
      />

      <p>
        A bank account with 5 % interest doesn't know its future balance. It only knows a rule:{" "}
        <em>every year, grow by 5 % of whatever you currently hold</em>. A hot coffee doesn't
        know when it will reach room temperature; it obeys <em>cool at a rate proportional to
        how hot you still are</em>. Physics is written the same way: laws specify{" "}
        <strong>rates of change</strong>, not outcomes. An equation whose unknown is a whole
        story <M>{"x(t)"}</M>, and which constrains that story through its derivative, is called
        a <strong>differential equation</strong>.
      </p>

      <H2>The simplest rule in the world</H2>
      <p>
        Both examples above are the same equation. Using the dot notation from Module 3
        (<M>{"\\dot{x}"}</M> = rate of change of <M>{"x"}</M>):
      </p>
      <Eq>{"\\dot{x} = a\\,x."}</Eq>
      <p>
        Read it back: "the rate of change of <M>{"x"}</M> is proportional to{" "}
        <M>{"x"}</M> itself." Big balance, big interest payments. Barely-warm coffee, slow
        cooling. Which function tells that story? You need a curve whose slope at every point
        is <M>{"a"}</M> times its height. There is essentially one such function — the
        exponential:
      </p>
      <Eq>{"x(t) = x(0)\\, e^{a t},"}</Eq>
      <p>
        where <M>{"e \\approx 2.718"}</M> is the natural growth base — the number engineered so
        that <M>{"e^{t}"}</M> is its <em>own</em> rate of change. The sign of <M>{"a"}</M>{" "}
        decides everything: <M>{"a > 0"}</M> means runaway growth (interest, feedback squeal),{" "}
        <M>{"a < 0"}</M> means decay to zero (cooling, friction, a well-tuned robot's error),
        and the size of <M>{"|a|"}</M> sets how fast.
      </p>

      <FlowLine />

      <KeyIdea>
        Whenever the rate of change of a quantity is proportional to the quantity itself, the
        story is exponential: <M>{"\\dot{x} = ax \\;\\Rightarrow\\; x(t) = x(0)e^{at}"}</M>.
        This one solved equation is the seed for everything below.
      </KeyIdea>

      <H2>Two variables at once: the matrix version</H2>
      <p>
        Real systems rarely have a single number for a state. A pendulum has an angle{" "}
        <em>and</em> a swing rate; a point on a spinning wheel has an x <em>and</em> a y. Stack
        the numbers into a vector <M>{"\\mathbf{x}"}</M>, and let the rule be a matrix — the
        arrow-machine from Module 2 — acting on the current state:
      </p>
      <Eq>{"\\dot{\\mathbf{x}} = A\\,\\mathbf{x}."}</Eq>
      <p>
        Read it back exactly as before: <em>the velocity of the state is the machine{" "}
        <M>{"A"}</M> applied to the state</em>. Geometrically, <M>{"A"}</M> pins a little
        velocity arrow to every point of the plane — a <strong>vector field</strong> — and the
        system simply drifts along the arrows, like a leaf on a stream.
      </p>
      <p>
        <strong>Try this</strong> below: set damping to zero and spin up ω — the arrows form a
        whirlpool and dropped points orbit in circles. Add positive damping and every arrow
        tilts slightly inward: dropped points spiral home. Make damping negative and the spiral
        runs outward — instability. You are watching the eigen-story of Module 2 play out in
        time.
      </p>

      <PhasePortrait />

      <H2>The matrix exponential: the same formula, matrix-sized</H2>
      <p>
        Here is the beautiful part. The scalar equation had solution{" "}
        <M>{"x(t) = x(0)e^{at}"}</M>. The matrix equation has <em>the very same solution</em>,
        with the exponential upgraded to accept a matrix:
      </p>
      <Eq>{"\\mathbf{x}(t) = e^{A t}\\,\\mathbf{x}(0)."}</Eq>
      <p>
        What kind of object is <M>{"e^{At}"}</M>? It is itself a matrix — a machine. Feed it the
        starting state and it returns the state <M>{"t"}</M> seconds later. Think of it as the{" "}
        <strong>fast-forward button</strong>: <M>{"e^{A\\cdot 2}"}</M> advances the world by two
        seconds in a single matrix multiply, no step-by-step simulation required. In the widget
        above, the machine <M>{"e^{At}"}</M> is "shrink by <M>{"e^{-bt}"}</M> while rotating by
        angle <M>{"\\omega t"}</M>" — decay and spin, packaged into one matrix.
      </p>
      <Aside>
        Where does <M>{"e^{At}"}</M> come from? The same place <M>{"e^x"}</M> does — its power
        series, <M>{"e^{At} = I + At + \\tfrac{(At)^2}{2!} + \\tfrac{(At)^3}{3!} + \\cdots"}</M>{" "}
        — which needs nothing but matrix multiplication and addition. You will never compute
        one by hand in this course; what matters is knowing what the object <em>does</em>.
      </Aside>
      <p>
        And now the payoff, the reason this module exists. In Chapter 3 you will meet a rigid
        body spinning at a constant rate. Its orientation obeys exactly{" "}
        <M>{"\\dot{R} = [\\omega]\\,R"}</M> — a matrix differential equation — so its solution
        is a matrix exponential, and <em>that</em> is why rotation matrices in{" "}
        <em>Modern Robotics</em> are written <M>{"e^{[\\hat{\\omega}]\\theta}"}</M>. When you
        see that formula, don't see alien notation. See this module: "spin at a steady rate,
        fast-forwarded by <M>{"\\theta"}</M>."
      </p>

      <KeyIdea>
        <M>{"e^{At}"}</M> is the fast-forward machine for the rule{" "}
        <M>{"\\dot{\\mathbf{x}} = A\\mathbf{x}"}</M>. Rotation matrices, twists, and screws in
        Chapters 3–6 are all this one idea wearing different hats.
      </KeyIdea>

      <H2>Two classic traps</H2>
      <p>
        <strong>Trap 1: <M>{"e^{At}"}</M> is not element-wise.</strong> You do <em>not</em> get{" "}
        <M>{"e^{At}"}</M> by exponentiating each entry of <M>{"At"}</M> separately. It is
        defined through repeated <em>matrix</em> multiplication (the series above), and the
        off-diagonal entries interact. Element-wise exponentiation gives garbage — a classic
        programming bug.
      </p>
      <p>
        <strong>Trap 2: decay never crosses zero.</strong> With <M>{"a < 0"}</M> the state
        approaches zero but never passes it — halving forever, like the bouncing ball that never
        quite stops. If a simulation of pure decay <em>oscillates</em> below zero, the time step
        is too coarse, not the mathematics wrong. (True oscillation needs the matrix version
        with spin.)
      </p>

      <Quiz
        challengeId="math4-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: (
              <>
                A system obeys <M>{"\\dot{x} = -2x"}</M> with <M>{"x(0) = 5"}</M>. As time
                passes, <M>{"x"}</M>…
              </>
            ),
            options: [
              { label: "decays smoothly toward 0", correct: true },
              { label: "grows without bound" },
              { label: "oscillates around 0" },
              { label: "stays at 5" },
            ],
            explain: "Negative a means decay: x(t) = 5e^(−2t) slides to zero and never crosses it.",
          },
          {
            prompt: (
              <>
                In the phase portrait, you set damping to zero and spin to <M>{"\\omega = 1"}</M>.
                Trajectories are…
              </>
            ),
            options: [
              { label: "perfect circles", correct: true },
              { label: "spirals into the origin" },
              { label: "straight lines" },
              { label: "parabolas" },
            ],
            explain: "Pure rotation preserves length — the state orbits forever. That's e^(At) as a spinning machine.",
          },
          {
            prompt: <>The matrix <M>{"e^{At}"}</M> is best described as…</>,
            options: [
              { label: "the machine that advances the state by time t", correct: true },
              { label: "the matrix At with each entry exponentiated" },
              { label: "the inverse of A" },
              { label: "a scalar" },
            ],
            explain: "It's the fast-forward button — and never element-wise (Trap 1).",
          },
        ]}
      />

      <BookRef>
        Math foundations · Module 4 — the rotation matrices of Ch 3 are matrix exponentials of
        spin; twists exponentiate to whole-body motions (Ch 3–6); stable error decay is the
        design goal of every controller in Ch 11.
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
