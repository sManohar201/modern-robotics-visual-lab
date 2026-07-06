import { useMemo, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell } from "../../components/widgets/WidgetShell";

const W = 760;
const H = 380;
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";
const RED = "#d9483f";
const GREEN = "#2f9e44";
const GOLD = "#b08c1d";

// ------------------------------------------------------------------
// Widget 1: zoom into a curve until it is straight
// ------------------------------------------------------------------
const xOf = (t: number) => 1.6 * Math.sin(1.1 * t) + 0.5 * t;

function ZoomTangent() {
  const [t0, setT0] = useState(3.2);
  const [zoom, setZoom] = useState(1);

  const hView = 4 / zoom; // visible half-window in t
  const slope = (xOf(t0 + hView) - xOf(t0 - hView)) / (2 * hView);

  const pts = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i <= 140; i++) {
      const t = t0 - hView + (2 * hView * i) / 140;
      out.push([t, xOf(t)]);
    }
    return out;
  }, [t0, hView]);

  // y-window follows the visible samples, padded
  const ys = pts.map(p => p[1]);
  const yMid = (Math.min(...ys) + Math.max(...ys)) / 2;
  const yHalf = Math.max(0.12, (Math.max(...ys) - Math.min(...ys)) / 2) * 1.25;

  const px = (t: number, x: number): [number, number] => [
    ((t - (t0 - hView)) / (2 * hView)) * (W - 90) + 60,
    H / 2 - ((x - yMid) / yHalf) * (H / 2 - 40),
  ];

  const poly = pts.map(([t, x]) => px(t, x).map(v => v.toFixed(1)).join(",")).join(" ");
  const [sx1, sy1] = px(t0 - hView, xOf(t0 - hView));
  const [sx2, sy2] = px(t0 + hView, xOf(t0 + hView));
  const [cx, cy] = px(t0, xOf(t0));

  const met = zoom >= 8 && Math.abs(slope) < 0.05;

  return (
    <>
      <WidgetShell
        title="Zoom until it's straight"
        onReset={() => {
          setT0(3.2);
          setZoom(1);
        }}
        caption={
          <>
            The curve is a cart's position over time. The gold line is a secant across the whole
            visible window; the readout is its slope. Zoom in and the wiggly curve straightens
            into its tangent — the slope readout settles onto the instantaneous velocity.
          </>
        }
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7] select-none">
          <line x1={60} y1={H - 30} x2={W - 30} y2={H - 30} stroke="#c9c5b8" strokeWidth={1.2} />
          <text x={W - 30} y={H - 12} textAnchor="end" fontFamily="Inter, sans-serif" fontSize="11.5" fill="#8a8a9b">
            time t — showing t = {(t0 - hView).toFixed(2)} … {(t0 + hView).toFixed(2)} s
          </text>
          <text x={16} y={24} fontFamily="Inter, sans-serif" fontSize="11.5" fill="#8a8a9b">
            position x(t)
          </text>

          <polyline points={poly} fill="none" stroke={PURPLE} strokeWidth={2.5} />
          <line x1={sx1} y1={sy1} x2={sx2} y2={sy2} stroke={GOLD} strokeWidth={2} strokeDasharray="7 5" />
          <circle cx={cx} cy={cy} r={5.5} fill={PURPLE} stroke="#fff" strokeWidth={2} />
          <text x={cx + 10} y={cy - 10} fontFamily="Inter, sans-serif" fontSize="11.5" fill={PURPLE} fontWeight="600">
            t₀ = {t0.toFixed(2)} s
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="t₀" value={t0} min={0.5} max={7.5} step={0.01} onChange={setT0} fmt={v => `${v.toFixed(2)} s`} width={220} />
          <LabeledSlider label="zoom" value={zoom} min={1} max={32} step={0.5} onChange={setZoom} fmt={v => `×${v.toFixed(1)}`} width={180} />
          <Readout label="slope of gold line" value={`${slope.toFixed(3)} m/s`} color={Math.abs(slope) < 0.05 ? GREEN : undefined} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="math3-flat" met={met}>
        Find a moment when the cart is <em>momentarily still</em>: zoom in at least ×8 and place{" "}
        <M>{"t_0"}</M> where the slope reads within <M>{"\\pm 0.05"}</M> of zero. That flat spot
        is a turnaround — position at a peak, velocity exactly zero.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Widget 2: Riemann rectangles — area under a speed curve
// ------------------------------------------------------------------
const vOf = (t: number) => 3 + 2 * Math.sin(t);
const T_END = 6;
const EXACT = 3 * T_END - 2 * Math.cos(T_END) + 2 * Math.cos(0); // ∫₀⁶ (3 + 2 sin t) dt

function RiemannSum() {
  const [n, setN] = useState(6);

  const h = T_END / n;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += vOf(i * h) * h;
  const errPct = (Math.abs(sum - EXACT) / EXACT) * 100;

  const px = (t: number, v: number): [number, number] => [
    (t / T_END) * (W - 100) + 60,
    H - 40 - (v / 5.4) * (H - 80),
  ];

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 160; i++) {
      const t = (T_END * i) / 160;
      pts.push(px(t, vOf(t)).map(v => v.toFixed(1)).join(","));
    }
    return pts.join(" ");
  }, []);

  const met = errPct < 0.5;

  return (
    <>
      <WidgetShell
        title="The odometer: area under the speed curve"
        onReset={() => setN(6)}
        caption={
          <>
            Each rectangle pretends the speed is constant for one sliver of time, so its area is
            "speed × time = distance for that sliver." Adding slivers approximates the true
            distance; more, thinner slivers do better. The limit of this process is the integral.
          </>
        }
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7] select-none">
          <line x1={60} y1={H - 40} x2={W - 40} y2={H - 40} stroke="#c9c5b8" strokeWidth={1.2} />
          <line x1={60} y1={20} x2={60} y2={H - 40} stroke="#c9c5b8" strokeWidth={1.2} />
          <text x={W - 40} y={H - 22} textAnchor="end" fontFamily="Inter, sans-serif" fontSize="11.5" fill="#8a8a9b">
            time t (0 … 6 s)
          </text>
          <text x={16} y={16} fontFamily="Inter, sans-serif" fontSize="11.5" fill="#8a8a9b">
            speed v(t)
          </text>

          {Array.from({ length: n }, (_, i) => {
            const t = i * h;
            const [x0, yTop] = px(t, vOf(t));
            const [x1] = px(t + h, 0);
            return (
              <rect
                key={i}
                x={x0}
                y={yTop}
                width={Math.max(0.5, x1 - x0 - 1)}
                height={H - 40 - yTop}
                fill="#e8e4f9"
                stroke={PURPLE}
                strokeWidth={0.8}
                opacity={0.85}
              />
            );
          })}

          <polyline points={curve} fill="none" stroke={ORANGE} strokeWidth={2.5} />
        </svg>
        <ControlBar>
          <LabeledSlider label="slivers N" value={n} min={1} max={80} step={1} onChange={setN} fmt={v => `${v.toFixed(0)}`} width={240} />
          <Readout label="rectangle total" value={`${sum.toFixed(2)} m`} color={PURPLE} />
          <Readout label="true distance" value={`${EXACT.toFixed(2)} m`} color={ORANGE} />
          <Readout label="error" value={`${errPct.toFixed(2)} %`} color={met ? GREEN : RED} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="math3-accumulate" met={met}>
        Raise the number of slivers until the rectangle total lands within{" "}
        <strong>0.5 %</strong> of the true distance. Notice how quickly "many crude slivers"
        beats "few careful ones" — that convergence is why integrals are computable at all.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Widget 3: partial derivatives — one knob at a time on a 2-link arm
// ------------------------------------------------------------------
const L1 = 1.2;
const L2 = 0.9;

function PartialKnobs() {
  const [t1d, setT1d] = useState(50); // degrees
  const [t2d, setT2d] = useState(60);

  const t1 = (t1d * Math.PI) / 180;
  const t2 = (t2d * Math.PI) / 180;

  const ex = L1 * Math.cos(t1);
  const ey = L1 * Math.sin(t1);
  const tx = ex + L2 * Math.cos(t1 + t2);
  const ty = ey + L2 * Math.sin(t1 + t2);

  // effect of wiggling each knob alone: velocity of the tip per unit joint speed
  const j1: [number, number] = [-ty, tx]; // rotate about base
  const j2: [number, number] = [-(ty - ey), tx - ex]; // rotate about elbow

  const S = 120;
  const OX = 250;
  const OY = 280;
  const toPx = (x: number, y: number): [number, number] => [OX + x * S, OY - y * S];
  const [bx, by] = toPx(0, 0);
  const [exp, eyp] = toPx(ex, ey);
  const [txp, typ] = toPx(tx, ty);

  const AS = 90; // arrow px per unit
  const arrow = (from: [number, number], v: [number, number], color: string, label: string) => {
    const to: [number, number] = [from[0] + v[0] * AS, from[1] - v[1] * AS];
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = Math.hypot(dx, dy);
    if (len < 3) return null;
    const ux = dx / len;
    const uy = dy / len;
    return (
      <g key={label}>
        <line x1={from[0]} y1={from[1]} x2={to[0] - ux * 8} y2={to[1] - uy * 8} stroke={color} strokeWidth={3} />
        <path
          d={`M ${to[0]} ${to[1]} L ${to[0] - ux * 9 - uy * 4.5} ${to[1] - uy * 9 + ux * 4.5} L ${to[0] - ux * 9 + uy * 4.5} ${to[1] - uy * 9 - ux * 4.5} Z`}
          fill={color}
        />
        <text x={to[0] + ux * 14} y={to[1] + uy * 14 + 4} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="600" fill={color}>
          {label}
        </text>
      </g>
    );
  };

  const dxdt2 = -(ty - ey); // ∂x/∂θ₂ = −L₂ sin(θ₁+θ₂)
  const met = Math.abs(dxdt2) < 0.06 && Math.abs(t2d) > 20;

  return (
    <>
      <WidgetShell
        title="One knob at a time — a two-joint arm"
        onReset={() => {
          setT1d(50);
          setT2d(60);
        }}
        caption={
          <>
            The tip's position depends on <em>both</em> joint angles. The{" "}
            <span style={{ color: PURPLE }}>purple</span> arrow shows how the tip would move if
            you wiggled only the shoulder; the <span style={{ color: ORANGE }}>orange</span>{" "}
            arrow, only the elbow. Their horizontal parts are the two partial derivatives of the
            tip's x-coordinate.
          </>
        }
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7] select-none">
          {/* ground + vertical reference through tip */}
          <line x1={40} y1={OY} x2={W - 40} y2={OY} stroke="#e3e0d5" strokeWidth={1.2} />
          <line x1={txp} y1={30} x2={txp} y2={H - 20} stroke="#eeebe0" strokeWidth={1.2} strokeDasharray="4 5" />

          {/* links */}
          <line x1={bx} y1={by} x2={exp} y2={eyp} stroke="#50525e" strokeWidth={9} strokeLinecap="round" />
          <line x1={exp} y1={eyp} x2={txp} y2={typ} stroke="#7b7d8a" strokeWidth={7} strokeLinecap="round" />
          <circle cx={bx} cy={by} r={8} fill="#2b2c33" />
          <circle cx={exp} cy={eyp} r={6.5} fill="#2b2c33" />
          <circle cx={txp} cy={typ} r={6} fill={GOLD} stroke="#fff" strokeWidth={2} />

          {arrow([txp, typ], j1, PURPLE, "wiggle θ₁")}
          {arrow([txp, typ], j2, ORANGE, "wiggle θ₂")}

          <text x={txp + 12} y={typ + 20} fontFamily="Inter, sans-serif" fontSize="11.5" fill="#8a8a9b">
            tip ({tx.toFixed(2)}, {ty.toFixed(2)})
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="θ₁" value={t1d} min={0} max={180} step={0.5} onChange={setT1d} fmt={v => `${v.toFixed(0)}°`} color={PURPLE} width={190} />
          <LabeledSlider label="θ₂" value={t2d} min={-150} max={150} step={0.5} onChange={setT2d} fmt={v => `${v.toFixed(0)}°`} color={ORANGE} width={190} />
          <Readout label="∂x/∂θ₁" value={(-ty).toFixed(2)} color={PURPLE} />
          <Readout label="∂x/∂θ₂" value={dxdt2.toFixed(2)} color={met ? GREEN : ORANGE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="math3-partial" met={met}>
        Pose the arm (keeping a real bend, <M>{"|\\theta_2| > 20^\\circ"}</M>) so that wiggling
        the <em>elbow</em> moves the tip straight up and down: <M>{"|\\partial x/\\partial\\theta_2| < 0.06"}</M>.
        The orange arrow should stand vertical — the elbow has momentarily lost all influence on
        the tip's horizontal position.
      </Challenge>
    </>
  );
}

export default function MathCalculus() {
  return (
    <div>
      <PageHeader
        chapter="Math 3"
        section="College Physics & Dynamics"
        title="Calculus: Rates and Accumulation"
        lede="A speedometer and an odometer answer two different questions about the same trip. Calculus is nothing more than making both questions precise — and robotics asks them constantly."
      />

      <p>
        Look at a car's dashboard. The <strong>odometer</strong> answers "how far, in total?" —
        it accumulates. The <strong>speedometer</strong> answers "how fast, right now?" — it
        reads an instant. Each can be reconstructed from the other: log the speedometer over a
        trip and you can work out the distance; log the odometer and you can work out the speed
        at every moment. Calculus is the pair of tools that does this reconstruction, and its
        two halves — the <strong>derivative</strong> and the <strong>integral</strong> — are
        exactly the speedometer question and the odometer question.
      </p>

      <H2>The derivative: zoom until it's straight</H2>
      <p>
        "How fast right now?" is a slippery question. Speed is distance over time, but at a
        single instant no time passes and no distance is covered — <M>{"0/0"}</M>. The escape is
        one of the great ideas in mathematics: <em>zoom in</em>. Almost every curve, magnified
        enough around a point, becomes indistinguishable from a straight line. A straight line
        has an unambiguous slope — and <em>that</em> slope, the slope the curve settles on as
        you zoom, is the derivative:
      </p>
      <Eq>{"\\frac{dx}{dt} \\;=\\; \\lim_{\\Delta t \\to 0} \\frac{x(t + \\Delta t) - x(t)}{\\Delta t}."}</Eq>
      <p>
        Read it back: take the average speed over a shrinking window <M>{"\\Delta t"}</M> (that
        fraction is just "distance covered over time taken"), and follow where the average
        heads as the window closes. That destination is the instantaneous rate.
      </p>
      <p>
        <strong>Try this</strong> below: park <M>{"t_0"}</M> anywhere and crank the zoom. Watch
        the wiggly purple curve straighten until it lies on top of the gold secant line — at
        that point the "average over the window" and "rate at the instant" have become the same
        thing. That is the limit happening in front of you.
      </p>

      <ZoomTangent />

      <p>
        Notation you will see constantly: <M>{"\\frac{dx}{dt}"}</M> and <M>{"\\dot{x}"}</M> mean
        the same thing — the dot is just shorthand for "derivative with respect to time," and
        robotics uses it everywhere. When you meet <M>{"\\dot{\\theta}"}</M> in Chapter 3, read
        it instantly as "joint speed": the rate at which the angle <M>{"\\theta"}</M> is
        changing. A second dot, <M>{"\\ddot{x}"}</M>, means the rate of change <em>of the
        rate of change</em> — acceleration.
      </p>

      <KeyIdea>
        The derivative is the slope after zooming in: the instantaneous rate of change.
        Velocity is the derivative of position; acceleration is the derivative of velocity;{" "}
        <M>{"\\dot{\\theta}"}</M> is the derivative of a joint angle. One idea, many costumes.
      </KeyIdea>

      <H2>The integral: adding up slivers</H2>
      <p>
        Now the odometer question. You have a record of the speed <M>{"v(t)"}</M> at every
        moment — how far did the car go? Over a short sliver of time <M>{"\\Delta t"}</M> the
        speed barely changes, so that sliver contributes distance{" "}
        <M>{"\\approx v \\cdot \\Delta t"}</M>. Add up all the slivers. On a graph of{" "}
        <M>{"v(t)"}</M>, each sliver's contribution <M>{"v \\cdot \\Delta t"}</M> is a skinny
        rectangle — height times width — so the total distance is <em>the area under the
        speed curve</em>:
      </p>
      <Eq>{"\\text{distance} \\;=\\; \\int_0^T v(t)\\, dt \\;=\\; \\text{area under } v(t)."}</Eq>
      <p>
        The elongated S (<M>{"\\int"}</M>) literally stands for "sum" — an infinite sum of
        infinitely thin slivers. And the two halves of calculus undo each other: differentiate
        the odometer reading and you get the speedometer; integrate the speedometer and you get
        the odometer. That two-way street is the <em>fundamental theorem of calculus</em> — the
        whole subject in one sentence.
      </p>

      <RiemannSum />

      <H2>Many knobs: the partial derivative</H2>
      <p>
        So far our function had one input. But a robot arm's tip position depends on{" "}
        <em>every</em> joint angle at once — a function with several knobs. How do you even ask
        "what's the rate of change?" when there are many things that could change?
      </p>
      <p>
        Answer: <strong>wiggle one knob at a time</strong>. Freeze every input except one, ask
        the ordinary one-variable question, and write it with a curly{" "}
        <M>{"\\partial"}</M> instead of <M>{"d"}</M> as a reminder that other knobs exist and
        are being held still:
      </p>
      <Eq>{"\\frac{\\partial x}{\\partial \\theta_2} \\;=\\; \\text{how fast } x \\text{ changes when } \\theta_2 \\text{ alone wiggles.}"}</Eq>
      <p>
        <strong>Try this</strong> below: move each slider in turn and watch "its" arrow at the
        tip. The purple arrow is the tip motion produced by the shoulder alone; the orange, by
        the elbow alone. Move <em>both</em> sliders and the tip motion is the two arrows added
        — vectors from Module 1, rates from this module, all in one picture.
      </p>

      <PartialKnobs />

      <KeyIdea>
        A partial derivative is an ordinary derivative with all other knobs frozen. The table
        collecting <em>every</em> partial of <em>every</em> output — "each joint's arrow at the
        tip" — is a matrix called the <strong>Jacobian</strong>, the star of Chapter 5. In the
        widget above you have already computed one column by feel.
      </KeyIdea>

      <H2>Two classic traps</H2>
      <p>
        <strong>Trap 1: value and slope are different animals.</strong> At the top of a hill the
        height is at its largest but the slope is <em>zero</em> — that is exactly what the first
        challenge had you find. "Large <M>{"x"}</M>" tells you nothing about{" "}
        <M>{"\\dot{x}"}</M>, and vice versa.
      </p>
      <p>
        <strong>Trap 2: radians only.</strong> The clean rule "the derivative of{" "}
        <M>{"\\sin\\theta"}</M> is <M>{"\\cos\\theta"}</M>" holds only when angles are in
        radians. In degrees an ugly factor of <M>{"\\pi/180"}</M> appears in every derivative.
        This — not tradition — is why mathematics and robotics measure angles in radians.
      </p>

      <Quiz
        challengeId="math3-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: (
              <>
                A ball is thrown straight up. At the very top of its flight, its velocity{" "}
                <M>{"\\dot{h}"}</M> is…
              </>
            ),
            options: [
              { label: "zero", correct: true },
              { label: "at its maximum" },
              { label: "equal to g" },
              { label: "undefined" },
            ],
            explain: "Height is momentarily flat at the peak — maximum value, zero slope.",
          },
          {
            prompt: <>The area under a robot joint's speed curve between two instants equals…</>,
            options: [
              { label: "the total angle swept", correct: true },
              { label: "the joint's acceleration" },
              { label: "the peak speed" },
              { label: "the applied torque" },
            ],
            explain: "Integrating a rate accumulates the quantity: speed slivers add up to angle.",
          },
          {
            prompt: (
              <>
                <M>{"\\partial y / \\partial \\theta_3"}</M> for a 6-joint robot means the change
                in <M>{"y"}</M> when…
              </>
            ),
            options: [
              { label: "only joint 3 wiggles; the rest are frozen", correct: true },
              { label: "all six joints wiggle together" },
              { label: "joint 3 is frozen and the rest wiggle" },
              { label: "y is held constant" },
            ],
            explain: "The curly ∂ is the one-knob-at-a-time derivative.",
          },
        ]}
      />

      <BookRef>
        Math foundations · Module 3 — derivatives become twists and joint rates (Ch 3, 5); the
        one-knob arrows you built are Jacobian columns (Ch 5); integrals accumulate trajectories
        (Ch 9) and energy (Ch 8).
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
