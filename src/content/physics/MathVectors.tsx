import { useRef, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, Worked, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { ControlBar, LabeledSlider, Readout, WidgetShell } from "../../components/widgets/WidgetShell";
import { svgCoords } from "../../lib/svg";

const W = 760;
const H = 420;
const S = 42; // px per unit
const CX = W / 2;
const CY = H / 2;
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";
const RED = "#d9483f";
const GREEN = "#2f9e44";
const GOLD = "#b08c1d";

const toPx = (x: number, y: number): [number, number] => [CX + x * S, CY - y * S];
const fromPx = (px: number, py: number): [number, number] => [(px - CX) / S, (CY - py) / S];

function GridAxes() {
  const lines = [];
  for (let k = -8; k <= 8; k++) {
    lines.push(
      <line key={`v${k}`} x1={CX + k * S} y1={0} x2={CX + k * S} y2={H} stroke="#eeebe0" strokeWidth={1} />,
      <line key={`h${k}`} x1={0} y1={CY + k * S} x2={W} y2={CY + k * S} stroke="#eeebe0" strokeWidth={1} />,
    );
  }
  return (
    <g>
      {lines}
      <line x1={0} y1={CY} x2={W} y2={CY} stroke="#c9c5b8" strokeWidth={1.5} />
      <line x1={CX} y1={0} x2={CX} y2={H} stroke="#c9c5b8" strokeWidth={1.5} />
      <text x={W - 14} y={CY - 8} textAnchor="end" fontFamily="Inter, sans-serif" fontSize="12" fill="#8a8a9b">
        x
      </text>
      <text x={CX + 10} y={16} fontFamily="Inter, sans-serif" fontSize="12" fill="#8a8a9b">
        y
      </text>
    </g>
  );
}

function VArrow({
  tip,
  color,
  width = 4,
  dash,
  label,
}: {
  tip: [number, number];
  color: string;
  width?: number;
  dash?: string;
  label?: string;
}) {
  const [tx, ty] = toPx(tip[0], tip[1]);
  const dx = tx - CX;
  const dy = ty - CY;
  const len = Math.hypot(dx, dy);
  if (len < 4) return null;
  const ux = dx / len;
  const uy = dy / len;
  const bx = tx - ux * 10;
  const by = ty - uy * 10;
  return (
    <g>
      <line x1={CX} y1={CY} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeDasharray={dash} />
      <path d={`M ${tx} ${ty} L ${bx - uy * 5} ${by + ux * 5} L ${bx + uy * 5} ${by - ux * 5} Z`} fill={color} />
      {label && (
        <text
          x={tx + ux * 16}
          y={ty + uy * 16 + 4}
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="14"
          fontWeight="700"
          fill={color}
        >
          {label}
        </text>
      )}
    </g>
  );
}

// ------------------------------------------------------------------
// Widget 1: anatomy of a single vector — components as shadows
// ------------------------------------------------------------------
function VectorAnatomy() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [v, setV] = useState<[number, number]>([4, 2.5]);
  const dragging = useRef(false);

  const mag = Math.hypot(v[0], v[1]);
  const angDeg = (Math.atan2(v[1], v[0]) * 180) / Math.PI;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !svgRef.current) return;
    const [px, py] = svgCoords(e, svgRef.current, W, H);
    const [x, y] = fromPx(px, py);
    setV([Math.round(x * 20) / 20, Math.round(y * 20) / 20]);
  };

  const [tx, ty] = toPx(v[0], v[1]);
  const target: [number, number] = [-3, 4];
  const [tgx, tgy] = toPx(target[0], target[1]);
  const met = Math.abs(v[0] - target[0]) < 0.15 && Math.abs(v[1] - target[1]) < 0.15;

  return (
    <>
      <WidgetShell
        title="Anatomy of a vector — drag the tip"
        onReset={() => setV([4, 2.5])}
        caption={
          <>
            The dashed drops are the vector's <em>shadows</em> on the two axes — its components.
            Length and angle on one side, components on the other: two descriptions of one arrow.
          </>
        }
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full rounded-lg bg-[#fbfaf7] touch-none select-none"
          onPointerMove={onMove}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => (dragging.current = false)}
        >
          <GridAxes />

          {/* target cross for the challenge */}
          <g stroke={GREEN} strokeWidth={2} opacity={met ? 1 : 0.55}>
            <line x1={tgx - 8} y1={tgy - 8} x2={tgx + 8} y2={tgy + 8} />
            <line x1={tgx - 8} y1={tgy + 8} x2={tgx + 8} y2={tgy - 8} />
          </g>
          <text x={tgx + 12} y={tgy - 10} fontFamily="Inter, sans-serif" fontSize="11" fill={GREEN}>
            target (−3, 4)
          </text>

          {/* component shadows */}
          <line x1={tx} y1={ty} x2={tx} y2={CY} stroke={RED} strokeWidth={2} strokeDasharray="5 4" />
          <line x1={tx} y1={ty} x2={CX} y2={ty} stroke={GREEN} strokeWidth={2} strokeDasharray="5 4" />
          <line x1={CX} y1={CY} x2={tx} y2={CY} stroke={RED} strokeWidth={5} opacity={0.8} />
          <line x1={CX} y1={CY} x2={CX} y2={ty} stroke={GREEN} strokeWidth={5} opacity={0.8} />
          <text x={(CX + tx) / 2} y={CY + (ty > CY ? -8 : 18)} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="600" fill={RED}>
            v<tspan fontSize="9" dy="2">x</tspan> = {v[0].toFixed(2)}
          </text>
          <text x={CX + (tx > CX ? -8 : 8)} y={(CY + ty) / 2} textAnchor={tx > CX ? "end" : "start"} fontFamily="Inter, sans-serif" fontSize="12" fontWeight="600" fill={GREEN}>
            v<tspan fontSize="9" dy="2">y</tspan> = {v[1].toFixed(2)}
          </text>

          <VArrow tip={v} color={PURPLE} label="v" />

          {/* drag handle */}
          <circle
            cx={tx}
            cy={ty}
            r={13}
            fill={PURPLE}
            opacity={0.25}
            className="cursor-grab"
            onPointerDown={e => {
              dragging.current = true;
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
          />
        </svg>
        <ControlBar>
          <Readout label="components (vx, vy)" value={`(${v[0].toFixed(2)}, ${v[1].toFixed(2)})`} color={PURPLE} />
          <Readout label="length |v|" value={mag.toFixed(2)} />
          <Readout label="angle θ from +x" value={`${angDeg.toFixed(1)}°`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="math1-components" met={met}>
        Drag the tip to the green cross at <M>{"(-3, 4)"}</M>. Check the length readout: you have
        built a 3–4–5 right triangle, tilted into the second quadrant — length 5 without measuring.
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
  const theta = (thetaDeg * Math.PI) / 180;

  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
  const v: [number, number] = [x, y];

  const [tx, ty] = toPx(x, y);

  // polar angle arc, drawn from +x axis toward the arrow
  const arcR = 34;
  const a0 = 0;
  const a1 = -theta; // svg y is flipped
  const large = Math.abs(thetaDeg) > 180 ? 1 : 0;
  const sweep = theta >= 0 ? 1 : 0;
  const arcPath = `M ${CX + arcR} ${CY} A ${arcR} ${arcR} 0 ${large} ${sweep} ${CX + arcR * Math.cos(a1)} ${CY + arcR * Math.sin(a1)}`;

  // challenge: land the tip on (-3, 4) using the polar sliders
  const target: [number, number] = [-3, 4];
  const [tgx, tgy] = toPx(target[0], target[1]);
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
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full rounded-lg bg-[#fbfaf7] touch-none select-none"
        >
          <GridAxes />

          {/* target cross */}
          <g stroke={GREEN} strokeWidth={2} opacity={met ? 1 : 0.55}>
            <line x1={tgx - 8} y1={tgy - 8} x2={tgx + 8} y2={tgy + 8} />
            <line x1={tgx - 8} y1={tgy + 8} x2={tgx + 8} y2={tgy - 8} />
          </g>
          <text x={tgx + 12} y={tgy - 10} fontFamily="Inter, sans-serif" fontSize="11" fill={GREEN}>
            target (−3, 4)
          </text>

          {/* radius circle the tip rides on */}
          <circle cx={CX} cy={CY} r={r * S} fill="none" stroke="#e3ddc9" strokeWidth={1.2} strokeDasharray="3 5" />

          {/* Cartesian shadows */}
          <line x1={tx} y1={ty} x2={tx} y2={CY} stroke={RED} strokeWidth={2} strokeDasharray="5 4" />
          <line x1={tx} y1={ty} x2={CX} y2={ty} stroke={GREEN} strokeWidth={2} strokeDasharray="5 4" />
          <line x1={CX} y1={CY} x2={tx} y2={CY} stroke={RED} strokeWidth={5} opacity={0.8} />
          <line x1={CX} y1={CY} x2={CX} y2={ty} stroke={GREEN} strokeWidth={5} opacity={0.8} />

          {/* polar angle arc */}
          <path d={arcPath} fill="none" stroke={GOLD} strokeWidth={2.5} />
          <text
            x={CX + (arcR + 12) * Math.cos(a1 / 2)}
            y={CY + (arcR + 12) * Math.sin(a1 / 2) + 4}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="13"
            fontWeight="700"
            fill={GOLD}
          >
            θ
          </text>

          <VArrow tip={v} color={PURPLE} label="v" />
        </svg>
        <ControlBar>
          <LabeledSlider label="r" value={r} min={0.5} max={8} step={0.05} onChange={setR} color={ORANGE} fmt={n => n.toFixed(2)} />
          <LabeledSlider label="θ" value={thetaDeg} min={-180} max={180} step={0.5} onChange={setThetaDeg} color={GOLD} fmt={n => `${n.toFixed(0)}°`} />
          <Readout label="polar (r, θ)" value={`(${r.toFixed(2)}, ${thetaDeg.toFixed(0)}°)`} color={ORANGE} />
          <Readout label="Cartesian (x, y)" value={`(${x.toFixed(2)}, ${y.toFixed(2)})`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="math1-polar" met={met}>
        Using only the <M>{"r"}</M> and <M>{"\\theta"}</M> dials, land the tip on the green cross at
        Cartesian <M>{"(-3, 4)"}</M>. You will need <M>{"r = 5"}</M> and an angle in the second
        quadrant — proof that the same arrow carries two different-looking addresses.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Widget 3: dot and cross — agreement and turning
// ------------------------------------------------------------------
function DotCross() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [a, setA] = useState<[number, number]>([3.4, 1.2]);
  const [b, setB] = useState<[number, number]>([1.2, 2.8]);
  const dragging = useRef<"a" | "b" | null>(null);

  const dot = a[0] * b[0] + a[1] * b[1];
  const cross = a[0] * b[1] - a[1] * b[0];
  const magA = Math.hypot(a[0], a[1]);
  const magB = Math.hypot(b[0], b[1]);
  const cosT = magA > 1e-6 && magB > 1e-6 ? dot / (magA * magB) : 0;
  const angDeg = (Math.acos(Math.max(-1, Math.min(1, cosT))) * 180) / Math.PI;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !svgRef.current) return;
    const [px, py] = svgCoords(e, svgRef.current, W, H);
    const [x, y] = fromPx(px, py);
    const snapped: [number, number] = [Math.round(x * 20) / 20, Math.round(y * 20) / 20];
    if (dragging.current === "a") setA(snapped);
    else setB(snapped);
  };

  // projection of a onto b
  const proj = magB > 1e-6 ? dot / (magB * magB) : 0;
  const projTip: [number, number] = [b[0] * proj, b[1] * proj];

  const [ax, ay] = toPx(a[0], a[1]);
  const [bx, by] = toPx(b[0], b[1]);
  const [sx, sy] = toPx(a[0] + b[0], a[1] + b[1]);
  const [pjx, pjy] = toPx(projTip[0], projTip[1]);

  const perpMet = Math.abs(dot) < 0.15 && magA >= 2 && magB >= 2;

  const handle = (which: "a" | "b", x: number, y: number, color: string) => (
    <circle
      cx={x}
      cy={y}
      r={13}
      fill={color}
      opacity={0.25}
      className="cursor-grab"
      onPointerDown={e => {
        dragging.current = which;
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }}
    />
  );

  return (
    <>
      <WidgetShell
        title="Two arrows — agreement and turning"
        onReset={() => {
          setA([3.4, 1.2]);
          setB([1.2, 2.8]);
        }}
        caption={
          <>
            Drag both tips. The shaded parallelogram's area is the size of the cross product; the
            gold segment along <span style={{ color: ORANGE }}>b</span> is the shadow of{" "}
            <span style={{ color: PURPLE }}>a</span> — the geometric meaning of the dot product.
          </>
        }
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full rounded-lg bg-[#fbfaf7] touch-none select-none"
          onPointerMove={onMove}
          onPointerUp={() => (dragging.current = null)}
          onPointerLeave={() => (dragging.current = null)}
        >
          <GridAxes />

          {/* parallelogram spanned by a and b */}
          <polygon
            points={`${CX},${CY} ${ax},${ay} ${sx},${sy} ${bx},${by}`}
            fill={cross >= 0 ? "#eef7ef" : "#fbeeed"}
            stroke={cross >= 0 ? "#bfdfc4" : "#eecac6"}
            strokeWidth={1.5}
          />

          {/* projection of a onto b */}
          <line x1={ax} y1={ay} x2={pjx} y2={pjy} stroke="#b8b4a6" strokeWidth={1.5} strokeDasharray="4 4" />
          <line x1={CX} y1={CY} x2={pjx} y2={pjy} stroke={GOLD} strokeWidth={6} opacity={0.85} />

          <VArrow tip={a} color={PURPLE} label="a" />
          <VArrow tip={b} color={ORANGE} label="b" />

          {handle("a", ax, ay, PURPLE)}
          {handle("b", bx, by, ORANGE)}
        </svg>
        <ControlBar>
          <Readout label="a · b (dot)" value={dot.toFixed(2)} color={dot > 0.15 ? GREEN : dot < -0.15 ? RED : GOLD} />
          <Readout label="a × b (cross)" value={cross.toFixed(2)} />
          <Readout label="angle between" value={`${angDeg.toFixed(1)}°`} />
          <Readout label="|a|, |b|" value={`${magA.toFixed(2)}, ${magB.toFixed(2)}`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="math1-perp" met={perpMet}>
        Keep both arrows at length 2 or more and make the dot product (essentially) zero:{" "}
        <M>{"|\\mathbf{a}\\cdot\\mathbf{b}| < 0.15"}</M>. Look at the angle readout when you succeed —
        you have discovered the perpendicularity test.
      </Challenge>
    </>
  );
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
        ever do in this course.
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
        <span className="cy">green</span> one stays positive. Then sweep the tip around a full
        circle at constant length and watch the two shadows trade places — that trade-off{" "}
        <em>is</em> sine and cosine.
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

      <Worked title="Where the dot product comes from — deriving |a||b|cos θ">
        <p>
          Why should the tidy sum <M>{"a_x b_x + a_y b_y"}</M> equal the geometric{" "}
          <M>{"|\\mathbf{a}||\\mathbf{b}|\\cos\\theta"}</M>? Start from the picture and let the{" "}
          <strong>law of cosines</strong> do the work. Place <M>{"\\mathbf{a}"}</M> and{" "}
          <M>{"\\mathbf{b}"}</M> tail-to-tail; the third side of the triangle is{" "}
          <M>{"\\mathbf{b} - \\mathbf{a}"}</M>, and the law of cosines relates the three lengths:
        </p>
        <Eq>{"|\\mathbf{b} - \\mathbf{a}|^2 = |\\mathbf{a}|^2 + |\\mathbf{b}|^2 - 2\\,|\\mathbf{a}||\\mathbf{b}|\\cos\\theta."}</Eq>
        <p>
          Now expand that same left side using <em>components</em>, since{" "}
          <M>{"\\mathbf{b}-\\mathbf{a} = (b_x-a_x,\\,b_y-a_y)"}</M>:
        </p>
        <Eq>{"|\\mathbf{b}-\\mathbf{a}|^2 = (b_x-a_x)^2 + (b_y-a_y)^2 = \\underbrace{(a_x^2+a_y^2)}_{|\\mathbf{a}|^2} + \\underbrace{(b_x^2+b_y^2)}_{|\\mathbf{b}|^2} - 2(a_x b_x + a_y b_y)."}</Eq>
        <p>
          Set the two expressions equal. The <M>{"|\\mathbf{a}|^2"}</M> and{" "}
          <M>{"|\\mathbf{b}|^2"}</M> cancel from both sides, and what is left, after dividing by{" "}
          <M>{"-2"}</M>, is exactly
        </p>
        <Eq>{"a_x b_x + a_y b_y = |\\mathbf{a}||\\mathbf{b}|\\cos\\theta. \\qquad\\blacksquare"}</Eq>
        <p>
          The <em>projection</em> reading falls out for free: group the right side as{" "}
          <M>{"\\big(|\\mathbf{a}|\\cos\\theta\\big)\\,|\\mathbf{b}|"}</M>. The bracket is the length
          of <M>{"\\mathbf{a}"}</M>'s shadow cast straight down onto the line of{" "}
          <M>{"\\mathbf{b}"}</M> — so the dot product is <em>that shadow times the length of{" "}
          <M>{"\\mathbf{b}"}</M></em>, precisely the "length of the shadow" picture you already
          had.
        </p>
      </Worked>

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

      <Worked title="Where the cross product comes from — deriving |a||b|sin θ">
        <p>
          The area of a parallelogram is <em>base × height</em>. Take{" "}
          <M>{"\\mathbf{a}"}</M> as the base, with length <M>{"|\\mathbf{a}|"}</M>. The height is
          how far <M>{"\\mathbf{b}"}</M> rises <em>perpendicular</em> to that base — and since{" "}
          <M>{"\\mathbf{b}"}</M> leaves the base at angle <M>{"\\theta"}</M>, that perpendicular
          rise is <M>{"|\\mathbf{b}|\\sin\\theta"}</M>. Multiply:
        </p>
        <Eq>{"\\text{area} = \\underbrace{|\\mathbf{a}|}_{\\text{base}}\\cdot\\underbrace{|\\mathbf{b}|\\sin\\theta}_{\\text{height}} = |\\mathbf{a}||\\mathbf{b}|\\sin\\theta."}</Eq>
        <p>
          That is the geometric form. To get the component form, notice{" "}
          <M>{"\\sin\\theta = \\cos(90^\\circ - \\theta)"}</M> is the dot product of{" "}
          <M>{"\\mathbf{b}"}</M> with <M>{"\\mathbf{a}"}</M> turned a quarter-turn. Rotating{" "}
          <M>{"\\mathbf{a}=(a_x,a_y)"}</M> by <M>{"90^\\circ"}</M> counter-clockwise gives{" "}
          <M>{"\\mathbf{a}^{\\perp} = (-a_y,\\, a_x)"}</M>, so
        </p>
        <Eq>{"\\mathbf{a}\\times\\mathbf{b} = \\mathbf{a}^{\\perp}\\!\\cdot\\mathbf{b} = (-a_y)(b_x) + (a_x)(b_y) = a_x b_y - a_y b_x. \\qquad\\blacksquare"}</Eq>
        <p>
          The same number written two ways: <M>{"a_x b_y - a_y b_x"}</M> to compute,{" "}
          <M>{"|\\mathbf{a}||\\mathbf{b}|\\sin\\theta"}</M> to picture. (If you have seen
          determinants, this is just <M>{"\\det\\begin{pmatrix} a_x & b_x \\\\ a_y & b_y \\end{pmatrix}"}</M> — the reason a determinant measures area.)
        </p>
      </Worked>

      <p>
        <strong>Where it earns its keep: torque.</strong> Push on a door. The <em>same</em> force
        does far more to swing it when applied at the handle than next to the hinge, and does
        nothing at all if you push straight <em>toward</em> the hinge. That "twisting power" is{" "}
        <strong>torque</strong>, and it is a cross product: <M>{"\\boldsymbol{\\tau} = \\mathbf{r}\\times\\mathbf{F}"}</M>,
        where <M>{"\\mathbf{r}"}</M> is the arrow from the pivot to where the force is applied. Only
        the part of <M>{"\\mathbf{F}"}</M> perpendicular to <M>{"\\mathbf{r}"}</M> turns the door —
        exactly the <M>{"\\sin\\theta"}</M> the cross product measures. So the cross product does
        not give you a force; it gives you what a force <em>accomplishes rotationally</em>, which
        is why it governs torque, angular momentum, and every spinning thing in Chapters 3, 5, and
        12.
      </p>

      <p>
        <strong>Try this</strong> below: make the two arrows perpendicular and watch the dot
        product hit zero while the parallelogram (cross product) is at its fattest. Then drag
        them parallel: the parallelogram collapses to nothing while the dot product peaks. The
        two products are complementary — one's maximum is the other's zero.
      </p>

      <DotCross />

      <KeyIdea>
        Dot product = agreement (zero means perpendicular). Cross product = turning, the area
        of the spanned parallelogram (zero means parallel). Torque — a force's ability to spin
        something — is a cross product, which is why this pair rules Chapters 3, 5, and 12.
      </KeyIdea>

      <Aside>
        In 3D the cross product returns a full vector: same magnitude{" "}
        <M>{"|\\mathbf{a}||\\mathbf{b}|\\sin\\theta"}</M>, pointing perpendicular to both inputs
        along your right thumb when your fingers curl from <M>{"\\mathbf{a}"}</M> to{" "}
        <M>{"\\mathbf{b}"}</M> (the <em>right-hand rule</em>). The plane version above is just
        the z-component of that vector.
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
            prompt: <>The cross product of two parallel vectors is…</>,
            options: [
              { label: "at its maximum" },
              { label: "zero", correct: true },
              { label: "negative" },
              { label: "equal to the dot product" },
            ],
            explain: "Parallel arrows span no parallelogram — no area, no turning.",
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
