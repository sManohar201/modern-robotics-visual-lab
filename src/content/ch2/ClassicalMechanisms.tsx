import { useEffect, useRef, useState, type ReactNode } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D } from "../../components/three/Scene3D";
import { GroundPin, Link, GrublerPanel, nearest } from "../../components/widgets/linkage";
import { svgCoords, circleIntersect } from "../../lib/svg";
import { rad, deg, wrapAngle, vadd, mat3Mul, mat3MulVec, type Vec3, type Mat3 } from "../../lib/math/vec";
import { rotX, rotY, rotZ } from "../../lib/math/so3";

export default function ClassicalMechanisms() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 2"
        section="Configuration Space"
        title="Mechanisms in Practice"
        lede="Grübler's formula does its real work on actual machines. Here we apply it systematically — from the simplest serial chain to the most sophisticated spatial parallel platform — and encounter the two ways the formula can surprise you."
      />

      <p>
        The formula <M>{"\\mathrm{dof} = m(N - 1 - J) + \\sum f_i"}</M> is the same for every
        mechanism. What changes is the architecture — how many links, how many joints, which joint
        types, and whether the chains are open or closed. We work through each family in order of
        increasing complexity.
      </p>

      <H2>The serial chain baseline</H2>
      <p>
        The simplest robot is a serial (open) chain: <M>{"k"}</M> links attached end-to-end to
        ground by <M>{"k"}</M> joints. Ground is link 1, and the chain has <M>{"k"}</M> moving
        links, so <M>{"N = k + 1"}</M>. Every joint connects adjacent links, so <M>{"J = k"}</M>.
        If all joints are revolute (or prismatic) with <M>{"f_i = 1"}</M>:
      </p>
      <Eq>
        {"\\mathrm{dof} = m(N - 1 - J) + \\sum f_i = m(k+1 - 1 - k) + k \\cdot 1 = m \\cdot 0 + k = k"}
      </Eq>
      <p>
        The result is <M>{"k"}</M>, regardless of whether the mechanism is planar or spatial.
        This is the fundamental reason a k-joint serial arm has exactly k degrees of freedom:
        the serial structure makes the formula collapse elegantly. A 6-DOF industrial arm has six
        joints, a 7-DOF human-like arm has seven — no need to subtract or add anything.
      </p>

      <SerialChainExplorer />

      <H2>Closing the loop: the four-bar family</H2>
      <p>
        Attach the last link of the chain back to ground with one more joint and you close a loop.
        The loop adds a new joint without adding a new link, which reduces the DOF count. The
        simplest example is the planar <strong>four-bar linkage</strong>: four links (including
        ground) connected in a closed loop by four revolute joints.
      </p>
      <Eq>{"N = 4, \\quad J = 4, \\quad f_i = 1 \\text{ for all } i, \\quad m = 3"}</Eq>
      <Eq>{"\\mathrm{dof} = 3(4 - 1 - 4) + 4 = -3 + 4 = 1"}</Eq>
      <p>
        The single DOF is why you can drive a four-bar linkage with one motor: the entire
        mechanism is determined by a single input angle.
      </p>
      <p>
        The <strong>slider-crank</strong> replaces one revolute joint with a prismatic joint
        — the slider is now a link moving along a rail, pinned by a translating joint at one end.
        The count is the same: <M>{"N = 4, J = 4"}</M>, with three R joints and one P joint,
        all having <M>{"f_i = 1"}</M>:
      </p>
      <Eq>{"\\mathrm{dof} = 3(4 - 1 - 4) + 4 = 1"}</Eq>
      <p>
        Opening the loop by one more link and one more joint gives the{" "}
        <strong>five-bar linkage</strong>: five links, five revolute joints, forming a single
        closed loop. Now:
      </p>
      <Eq>{"\\mathrm{dof} = 3(5 - 1 - 5) + 5 = -3 + 5 = 2"}</Eq>
      <p>
        Two inputs are required — one for each of the two driving cranks attached to ground. The
        five-bar is a common architecture for parallel planar robots, because the two degrees of
        freedom allow the endpoint to move freely in the plane.
      </p>
      <FiveBarDemo />
      <p>
        The <strong>Stephenson six-bar</strong> and <strong>Watt six-bar</strong> add two more
        links and three more joints, forming two closed loops:
      </p>
      <Eq>{"N = 6, \\quad J = 7: \\quad \\mathrm{dof} = 3(6 - 1 - 7) + 7 = -6 + 7 = 1"}</Eq>
      <p>
        Both six-bar variants give DOF = 1, but they have different loop topologies and produce
        different coupler curves — the Watt and Stephenson chains are <em>not</em> interchangeable
        even though Grübler treats them identically.
      </p>

      <H2>The overlapping-joints trap</H2>
      <p>
        Three links sometimes meet at a single physical point. The temptation is to call that "one
        joint" — but a joint, by definition, connects exactly <em>two</em> links. Three links
        sharing a common pin must be modeled as <em>two</em> separate joints stacked at the same
        location: one joint connects links A and B, a second joint connects links B and C.
      </p>
      <p>
        Getting this wrong shifts both <M>{"N"}</M> and <M>{"J"}</M> by 1 in opposite directions,
        changing the Grübler count by <M>{"m - f_i"}</M> — a significant error. The rule is
        simple but easy to forget under time pressure:
      </p>
      <KeyIdea>
        A joint connects exactly two links. Three links meeting at one point → two joints at that
        point. Count joints by counting <em>pairs</em> of connected links, not physical pins.
      </KeyIdea>

      <H2>When Grübler is wrong: redundant constraints</H2>
      <p>
        The formula assumes every constraint is independent. When the geometry makes one constraint
        a consequence of others — when one equation in the system is linearly dependent on the rest
        — the true DOF exceeds Grübler's prediction.
      </p>
      <p>
        The clearest example is the <strong>parallelogram four-bar linkage</strong>, where the two
        opposite links have equal length and are parallel. A naive Grübler count with an extra
        parallel link added gives:
      </p>
      <Eq>{"N = 5, \\quad J = 6: \\quad \\mathrm{dof} = 3(5 - 1 - 6) + 6 = -6 + 6 = 0"}</Eq>
      <p>
        Zero means rigid — and yet the parallelogram linkage visibly moves, maintaining the
        parallel orientation of the coupler as it traces its path. The special geometry
        makes one of the six constraints redundant: it is automatically satisfied whenever the
        other five are. The mechanism's true DOF is 1. Don't take my word for it — add the link
        yourself:
      </p>

      <ParallelogramDemo />

      <p>
        Redundant constraints arise whenever joints are placed in geometrically special
        configurations. The moment you straighten a crank to dead-center in a slider-crank, or
        align joints along a common axis, constraints that were independent become dependent.
        Grübler always gives a <em>lower bound</em> on the true DOF; the true count is greater
        whenever the constraints are not in general position.
      </p>

      <H2>The Delta robot: visible versus hidden DOF</H2>
      <p>
        The Delta robot is a high-speed spatial parallel mechanism with three identical legs, each
        a kinematic chain connecting a fixed base to a moving platform. Each leg contains a
        parallelogram linkage — which, as we just saw, introduces passive DOF.
      </p>
      <p>
        A careful Grübler count of the full mechanism (accounting for all links and joints) gives:
      </p>
      <Eq>{"\\mathrm{dof} = 15"}</Eq>
      <p>
        Yet the platform's visible motion is only 3 DOF — pure translation, no rotation. Where
        have the other 12 DOF gone? They are real, but <em>internal</em>: the parallelogram links
        in each leg can spin about their own axes freely without moving the platform at all. These
        are torsional freedoms that Grübler counts correctly, but that are irrelevant to the
        platform's motion — they are absorbed internally by the mechanism's structure.
      </p>
      <p>
        The Delta robot is the canonical example of the distinction between a mechanism's total DOF
        and its useful (end-effector) DOF. Grübler counts everything; engineering judgment tells
        you which DOF matter.
      </p>

      <H2>Stewart–Gough platform: full spatial freedom</H2>
      <p>
        The Stewart–Gough platform is a spatial parallel mechanism capable of achieving all six
        rigid-body motions: three translations and three rotations. It consists of a moving
        platform connected to a fixed base by six identical legs. Each leg is a{" "}
        <strong>UPS chain</strong>: a Universal joint at the base, a Prismatic joint (an actuated
        linear actuator), and a Spherical joint at the platform.
      </p>
      <p>
        Count the components carefully:
      </p>
      <p>
        <strong>Links:</strong> the base (1) + the platform (1) + 2 link segments per leg{" "}
        × 6 legs = 14 links total.
      </p>
      <p>
        <strong>Joints:</strong> 6 Universal + 6 Prismatic + 6 Spherical = 18 joints.
      </p>
      <p>
        <strong>Freedoms:</strong>{" "}
        <M>{"\\sum f_i = 6 \\times 2 + 6 \\times 1 + 6 \\times 3 = 12 + 6 + 18 = 36"}</M>.
      </p>
      <p>
        Substituting into Grübler with <M>{"m = 6"}</M>:
      </p>
      <Eq>{"\\mathrm{dof} = 6(14 - 1 - 18) + 36 = 6(-5) + 36 = -30 + 36 = 6"}</Eq>
      <p>
        Six degrees of freedom: the platform can be positioned and oriented arbitrarily (within its
        workspace). By extending or retracting the six linear actuators independently, all six
        rigid-body motions are achievable. This is why the Stewart–Gough platform is used in
        flight simulators (full motion cueing), in precision machine tools, and in hexapod
        positioning stages for optics. Take the controls — six sliders, six rigid-body motions:
      </p>

      <StewartGough />

      <KeyIdea>
        Grübler counts DOF correctly when constraints are independent and all DOF are
        end-effector DOF. Redundant constraints (special geometry) raise the true count above
        Grübler's prediction; internal DOF (like the Delta's torsional freedoms) make the
        useful DOF lower than the total.
      </KeyIdea>

      <Aside>
        The Stewart–Gough platform appears again in Chapter 7 (Kinematics of Closed Chains),
        where we work out its full forward and inverse kinematics. The DOF = 6 result here is
        only the beginning — the inverse kinematics (finding leg lengths for a given platform
        pose) is analytic and clean; the forward kinematics (finding the platform pose from the
        six leg lengths) is a polynomial system with up to 40 solutions.
      </Aside>

      <BookRef>Modern Robotics §2.2 — Degrees of Freedom of a Robot (Grübler's formula and examples).</BookRef>
    </div>
  );
}

/* ================= widget: serial chain explorer ================= */

const SW = 760;
const SH = 340;
const SBASE: [number, number] = [150, 250];
const SLEN = [88, 80, 72, 64, 58, 52];
const SCOLORS = ["#6741d9", "#c2571c", "#3b6fd4", "#2f9e44", "#9c7bd9", "#b08c1d"];

function SerialChainExplorer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [k, setK] = useState(3);
  const [angles, setAngles] = useState<number[]>([rad(55), rad(-40), rad(-35), rad(30), rad(-40), rad(25)]);
  const dragging = useRef<number | null>(null);

  // joint positions, math angles (y up) drawn into svg (y down)
  const pts: [number, number][] = [SBASE];
  let abs = 0;
  const absArr: number[] = [];
  for (let i = 0; i < k; i++) {
    abs += angles[i];
    absArr.push(abs);
    const prev = pts[i];
    pts.push([prev[0] + SLEN[i] * Math.cos(abs), prev[1] - SLEN[i] * Math.sin(abs)]);
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const i = dragging.current;
    if (i === null || !svgRef.current) return;
    const [x, y] = svgCoords(e, svgRef.current, SW, SH);
    const newAbs = Math.atan2(pts[i][1] - y, x - pts[i][0]);
    const prevAbs = i === 0 ? 0 : absArr[i - 1];
    setAngles(a => a.map((v, j) => (j === i ? wrapAngle(newAbs - prevAbs) : v)));
  };

  return (
    <WidgetShell
      title="Serial chain — the formula collapses to k"
      onReset={() => {
        setK(3);
        setAngles([rad(55), rad(-40), rad(-35), rad(30), rad(-40), rad(25)]);
      }}
      caption={
        <>
          Drag any joint handle. Each revolute joint adds exactly one freedom and the closed-form
          count stays <span className="mono">dof = k</span> no matter how many links you stack on —
          the <span className="mono">m(N−1−J)</span> term is always zero for an open chain.
        </>
      }
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SW} ${SH}`}
        className="w-full touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={() => (dragging.current = null)}
        onPointerLeave={() => (dragging.current = null)}
      >
        <GroundPin x={SBASE[0]} y={SBASE[1]} />
        {pts.slice(0, -1).map((p, i) => (
          <Link key={i} a={p} b={pts[i + 1]} color={SCOLORS[i]} w={7} />
        ))}
        {pts.slice(1).map((p, i) => (
          <g
            key={i}
            className="cursor-grab"
            onPointerDown={e => {
              e.preventDefault();
              dragging.current = i;
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
          >
            <circle cx={p[0]} cy={p[1]} r={15} fill={`${SCOLORS[i]}22`} />
            <circle cx={p[0]} cy={p[1]} r={6} fill="#fff" stroke={SCOLORS[i]} strokeWidth={2.5} />
          </g>
        ))}
        <GrublerPanel x={SW - 250} y={14} N={k + 1} J={k} sumF={k} />
      </svg>
      <ControlBar>
        <LabeledSlider
          label="k joints"
          value={k}
          min={1}
          max={6}
          step={1}
          onChange={v => setK(Math.round(v))}
          fmt={v => v.toFixed(0)}
          color="#6741d9"
          width={180}
        />
        <Readout label="dof" value={`${k}`} color="#6741d9" />
      </ControlBar>
    </WidgetShell>
  );
}

/* ================= widget: parallelogram / redundant constraint ================= */

const PW = 760;
const PH = 340;
const PG1: [number, number] = [230, 270];
const PG2: [number, number] = [450, 270];
const PG3: [number, number] = [340, 270]; // anchor for the redundant link
const PR = 105; // crank length (all three parallel links)

function ParallelogramDemo() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [th, setTh] = useState(rad(-65)); // svg angle (y down)
  const [extra, setExtra] = useState(false);
  const [travel, setTravel] = useState(0);
  const lastTh = useRef(th);
  const dragging = useRef(false);

  const update = (v: number) => {
    if (extra) {
      const delta = Math.abs(wrapAngle(v - lastTh.current));
      setTravel(t => Math.min(rad(75), t + delta));
    }
    lastTh.current = v;
    setTh(v);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !svgRef.current) return;
    const [x, y] = svgCoords(e, svgRef.current, PW, PH);
    update(Math.atan2(y - PG1[1], x - PG1[0]));
  };

  const dir: [number, number] = [PR * Math.cos(th), PR * Math.sin(th)];
  const A = vadd2(PG1, dir);
  const B = vadd2(PG2, dir);
  const C = vadd2(PG3, dir);

  const met = extra && travel >= rad(60);

  return (
    <>
      <WidgetShell
        title="The parallelogram linkage — Grübler says rigid, physics disagrees"
        onReset={() => {
          setTh(rad(-65));
          lastTh.current = rad(-65);
          setExtra(false);
          setTravel(0);
        }}
        caption={
          <>
            All three vertical links have the same length and stay parallel. The fifth link's
            constraint is automatically satisfied whenever the other constraints are — it removes
            nothing. Grübler assumes independence and over-counts.
          </>
        }
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${PW} ${PH}`}
          className="w-full touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => (dragging.current = false)}
        >
          <GroundPin x={PG1[0]} y={PG1[1]} />
          <GroundPin x={PG2[0]} y={PG2[1]} />
          {extra && <GroundPin x={PG3[0]} y={PG3[1]} />}
          {/* coupler */}
          <Link a={A} b={B} color="#9a9a8a" w={8} />
          {/* the two parallelogram cranks */}
          <Link a={PG2} b={B} color="#3b6fd4" />
          <Link a={PG1} b={A} color="#6741d9" w={8} />
          {/* redundant link */}
          {extra && <Link a={PG3} b={C} color="#2f9e44" />}

          {/* drag handle on the input crank */}
          <g
            className="cursor-grab"
            onPointerDown={e => {
              e.preventDefault();
              dragging.current = true;
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
          >
            <circle cx={A[0]} cy={A[1]} r={16} fill="#6741d922" />
            <circle cx={A[0]} cy={A[1]} r={7} fill="#fff" stroke="#6741d9" strokeWidth={2.5} />
          </g>

          <GrublerPanel
            x={PW - 250}
            y={14}
            N={extra ? 5 : 4}
            J={extra ? 6 : 4}
            sumF={extra ? 6 : 4}
            note={extra ? "…yet it still moves. True dof = 1." : undefined}
          />
        </svg>
        <ControlBar>
          <WidgetButton onClick={() => setExtra(x => !x)} active={extra}>
            {extra ? "remove the fifth link" : "add a fifth parallel link"}
          </WidgetButton>
          {extra && <Readout label="crank travelled" value={`${deg(Math.min(travel, rad(60))).toFixed(0)}° / 60°`} />}
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch2-mech-redundant" met={met} holdMs={100}>
        Add the fifth link — Grübler now declares the mechanism a rigid structure (0 dof) — then
        drag the crank through <strong>60°</strong> anyway. The formula isn't broken; its
        assumption is: the new link's constraint is <em>not independent</em> of the existing ones.
      </Challenge>
    </>
  );
}

function vadd2(a: [number, number], b: [number, number]): [number, number] {
  return [a[0] + b[0], a[1] + b[1]];
}

/* ================= widget: five-bar slider-crank variant ================= */

const FBW = 760;
const FBH = 340;
const FBG1: [number, number] = [200, 282];   // left revolute ground pivot
const FB_RAIL_Y = 282;                        // slider rail y
const FB_RAIL_X0 = 310;                       // rail left bound
const FB_RAIL_X1 = 590;                       // rail right bound — chosen so |E1–S| < 2×FB_DIST always
const FB_PROX = 90;                           // crank length
const FB_DIST = 250;                          // coupler lengths — long enough to always intersect
const FB_SLIDER_INIT = 450;
const FB_TARGET: [number, number] = [420, 85];
const FB_TOL = 22;

function FiveBarDemo() {
  const [t1, setT1] = useState(rad(-105));
  const [sliderX, setSliderX] = useState(FB_SLIDER_INIT);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const prevApex = useRef<[number, number] | null>(null);

  const E1: [number, number] = [FBG1[0] + FB_PROX * Math.cos(t1), FBG1[1] + FB_PROX * Math.sin(t1)];
  const S: [number, number] = [sliderX, FB_RAIL_Y];

  const sol = nearest(
    prevApex.current ?? [358, 99],
    circleIntersect(E1, FB_DIST, S, FB_DIST, 1),
    circleIntersect(E1, FB_DIST, S, FB_DIST, -1),
  );
  if (sol) prevApex.current = sol;
  const apex: [number, number] = sol ?? prevApex.current ?? [358, 99];

  const apexRef = useRef<[number, number]>(apex);
  apexRef.current = apex;

  useEffect(() => {
    setTrail(tr => [...tr.slice(-299), apexRef.current]);
  }, [t1, sliderX]);

  const met = Math.hypot(apex[0] - FB_TARGET[0], apex[1] - FB_TARGET[1]) < FB_TOL;

  return (
    <>
      <WidgetShell
        title="Five-bar (slider-crank variant) — 1R + 1P inputs, 2 DOF"
        onReset={() => { setT1(rad(-105)); setSliderX(FB_SLIDER_INIT); setTrail([]); prevApex.current = [358, 99]; }}
        caption={
          <>
            One revolute crank (θ₁) and one prismatic slider (d) drive a free endpoint — the same
            2 DOF as the two-crank version, but with mixed joint types. The trail shows the
            reachable workspace; you need both inputs to steer the endpoint anywhere in it.
          </>
        }
      >
        <svg viewBox={`0 0 ${FBW} ${FBH}`} className="w-full select-none">
          {/* endpoint trail */}
          {trail.length > 1 && (
            <path
              d={trail.reduce((acc, [x, y], i) => {
                if (i === 0) return `M${x.toFixed(1)},${y.toFixed(1)}`;
                const [px, py] = trail[i - 1];
                return `${acc}${Math.hypot(x - px, y - py) > 30 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
              }, "")}
              fill="none"
              stroke="#6741d944"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* slider rail */}
          <line x1={FB_RAIL_X0} y1={FB_RAIL_Y - 17} x2={FB_RAIL_X1} y2={FB_RAIL_Y - 17} stroke="#b9b5a8" strokeWidth={2} strokeDasharray="7 5" />
          <line x1={FB_RAIL_X0} y1={FB_RAIL_Y + 17} x2={FB_RAIL_X1} y2={FB_RAIL_Y + 17} stroke="#b9b5a8" strokeWidth={2} strokeDasharray="7 5" />
          <text x={FB_RAIL_X1 - 80} y={FB_RAIL_Y - 24} fontSize="11" fill="#8a8a9b" fontFamily="Inter,sans-serif">prismatic (f = 1)</text>

          {/* target zone */}
          <circle cx={FB_TARGET[0]} cy={FB_TARGET[1]} r={FB_TOL} fill={met ? "#2f9e4422" : "none"} stroke="#caa53d" strokeWidth={1.5} strokeDasharray="5 3" />
          <circle cx={FB_TARGET[0]} cy={FB_TARGET[1]} r={4} fill="#caa53d" />
          <text x={FB_TARGET[0] + 14} y={FB_TARGET[1] + 4} fontSize="11" fill="#a08030" fontFamily="Inter,sans-serif">target</text>

          {/* mechanism */}
          <GroundPin x={FBG1[0]} y={FBG1[1]} />
          <Link a={FBG1} b={E1} color="#6741d9" w={8} />
          <Link a={E1} b={apex} color="#9a9a8a" />
          <Link a={S} b={apex} color="#9a9a8a" />

          {/* slider block */}
          <rect x={S[0] - 26} y={FB_RAIL_Y - 15} width={52} height={30} rx={6} fill="#c2571c" opacity={0.88} />
          <circle cx={S[0]} cy={S[1]} r={6} fill="#fff" stroke="#c2571c" strokeWidth={2} />

          {/* joint at crank tip */}
          <circle cx={E1[0]} cy={E1[1]} r={6} fill="#fff" stroke="#6741d9" strokeWidth={2.5} />

          {/* endpoint dot */}
          <circle cx={apex[0]} cy={apex[1]} r={9} fill={met ? "#2f9e44" : "#2f9e4488"} />
          <circle cx={apex[0]} cy={apex[1]} r={5} fill={met ? "#fff" : "#2f9e44"} />

          <GrublerPanel x={FBW - 250} y={14} N={5} J={5} sumF={5} note="4R + 1P joints" />
        </svg>

        <ControlBar>
          <LabeledSlider
            label={<span>θ₁</span>}
            value={t1}
            min={rad(-170)} max={rad(-10)} step={0.01}
            onChange={setT1}
            fmt={v => `${deg(v).toFixed(0)}°`}
            color="#6741d9" width={200}
          />
          <LabeledSlider
            label="d"
            value={sliderX}
            min={FB_RAIL_X0 + 20} max={FB_RAIL_X1 - 20} step={1}
            onChange={setSliderX}
            fmt={v => `${(v - FB_RAIL_X0).toFixed(0)} px`}
            color="#c2571c" width={200}
          />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch2-mech-fivebar" met={met}>
        Steer the green endpoint into the gold circle using both inputs. The crank rotates the
        left arm; the slider translates the right pivot — two completely different joint types,
        same DOF count: <M>{"3(5-1-5)+5=2"}</M>.
      </Challenge>
    </>
  );
}

/* ================= widget: Stewart-Gough platform ================= */

const BASE_Z = -1.1;
const BASE_R = 1.25;
const PLAT_R = 0.85;
const PLAT_Z0 = 0.1; // nominal platform height (math z)

// 6-6 anchor arrangement: base pairs near 0/120/240, platform pairs near 60/180/300
const BASE_ANGLES = [-25, 25, 95, 145, 215, 265].map(rad);
const PLAT_ANGLES = [312, 48, 72, 168, 192, 288].map(rad); // paired with base anchor i

const SG_TARGET = { x: 0.22, y: -0.18, z: 0.3, roll: rad(8), pitch: rad(-6), yaw: rad(12) };

function sgR(roll: number, pitchA: number, yaw: number): Mat3 {
  return mat3Mul(rotZ(yaw), mat3Mul(rotY(pitchA), rotX(roll)));
}

function platAnchors(R: Mat3, p: Vec3): Vec3[] {
  return PLAT_ANGLES.map(a => {
    const local: Vec3 = [PLAT_R * Math.cos(a), PLAT_R * Math.sin(a), 0];
    return vadd(p, mat3MulVec(R, local));
  });
}

const baseAnchors: Vec3[] = BASE_ANGLES.map(a => [BASE_R * Math.cos(a), BASE_R * Math.sin(a), BASE_Z]);

function PosedGroup({ R, p, children }: { R: Mat3; p: Vec3; children: ReactNode }) {
  return (
    <group
      ref={g => {
        if (!g) return;
        g.matrixAutoUpdate = false;
        g.matrix.set(
          R[0], R[1], R[2], p[0],
          R[3], R[4], R[5], p[1],
          R[6], R[7], R[8], p[2],
          0, 0, 0, 1,
        );
      }}
    >
      {children}
    </group>
  );
}

type SgHighlight = "U" | "P" | "S" | null;

function StewartGough() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);
  const [roll, setRoll] = useState(0);
  const [pitchA, setPitchA] = useState(0);
  const [yaw, setYaw] = useState(0);
  const [hl, setHl] = useState<SgHighlight>(null);

  const R = sgR(roll, pitchA, yaw);
  const p: Vec3 = [x, y, PLAT_Z0 + z];
  const tops = platAnchors(R, p);

  const Rt = sgR(SG_TARGET.roll, SG_TARGET.pitch, SG_TARGET.yaw);
  const pt: Vec3 = [SG_TARGET.x, SG_TARGET.y, PLAT_Z0 + SG_TARGET.z];

  const lens = tops.map((t, i) => Math.hypot(t[0] - baseAnchors[i][0], t[1] - baseAnchors[i][1], t[2] - baseAnchors[i][2]));
  const lmin = Math.min(...lens);
  const lmax = Math.max(...lens);

  const met =
    Math.abs(x - SG_TARGET.x) < 0.06 &&
    Math.abs(y - SG_TARGET.y) < 0.06 &&
    Math.abs(z - SG_TARGET.z) < 0.06 &&
    Math.abs(roll - SG_TARGET.roll) < rad(3.5) &&
    Math.abs(pitchA - SG_TARGET.pitch) < rad(3.5) &&
    Math.abs(yaw - SG_TARGET.yaw) < rad(3.5);

  const reset = () => {
    setX(0); setY(0); setZ(0); setRoll(0); setPitchA(0); setYaw(0);
  };

  const grey = "#8d8d99";
  const uCol = hl === "U" ? "#6741d9" : "#50525e";
  const pCol = hl === "P" ? "#6741d9" : grey;
  const sCol = hl === "S" ? "#6741d9" : "#c2571c";

  return (
    <>
      <WidgetShell
        title="Stewart–Gough platform — six sliders, six rigid-body freedoms"
        onReset={reset}
        caption={
          <>
            Each leg is a <strong>U</strong>(base)–<strong>P</strong>(actuator)–<strong>S</strong>(platform)
            chain; click the joint buttons to highlight each family in the scene. The gold ghost is
            the target pose for the challenge. Drag the view to orbit.
          </>
        }
      >
        <div className="ui flex flex-wrap items-center gap-2 mb-3 text-[12.5px]">
          <WidgetButton onClick={() => setHl(hl === "U" ? null : "U")} active={hl === "U"}>
            6 × U (f = 2) → 12
          </WidgetButton>
          <WidgetButton onClick={() => setHl(hl === "P" ? null : "P")} active={hl === "P"}>
            6 × P (f = 1) → 6
          </WidgetButton>
          <WidgetButton onClick={() => setHl(hl === "S" ? null : "S")} active={hl === "S"}>
            6 × S (f = 3) → 18
          </WidgetButton>
          <span className="mono text-[12px] text-[var(--ink-soft)] ml-2">
            6(14−1−18) + 36 = <span className="font-bold text-[#6741d9]">6 dof</span>
          </span>
        </div>

        <Scene3D camera={[3.4, 2.0, 3.4]} height={400}>
          {/* base */}
          <mesh position={[0, 0, BASE_Z - 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.45, 1.45, 0.07, 48]} />
            <meshStandardMaterial color="#b9b5a8" />
          </mesh>

          {/* target ghost platform */}
          <PosedGroup R={Rt} p={pt}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[PLAT_R + 0.1, PLAT_R + 0.1, 0.04, 36]} />
              <meshStandardMaterial color="#caa53d" wireframe transparent opacity={met ? 0.85 : 0.4} />
            </mesh>
          </PosedGroup>

          {/* legs */}
          {baseAnchors.map((b, i) => {
            const t = tops[i];
            const mid: Vec3 = [(b[0] + t[0]) / 2, (b[1] + t[1]) / 2, (b[2] + t[2]) / 2];
            return (
              <group key={i}>
                <Line points={[b, mid]} color={pCol} lineWidth={5} />
                <Line points={[mid, t]} color={hl === "P" ? "#6741d9" : "#6b6b78"} lineWidth={2.5} />
                {/* U joint at base */}
                <mesh position={b}>
                  <sphereGeometry args={[hl === "U" ? 0.085 : 0.06, 16, 16]} />
                  <meshStandardMaterial color={uCol} />
                </mesh>
                {/* P joint marker at mid-leg */}
                <mesh position={mid}>
                  <sphereGeometry args={[hl === "P" ? 0.07 : 0.045, 16, 16]} />
                  <meshStandardMaterial color={hl === "P" ? "#6741d9" : "#84848f"} />
                </mesh>
                {/* S joint at platform */}
                <mesh position={t}>
                  <sphereGeometry args={[hl === "S" ? 0.08 : 0.055, 16, 16]} />
                  <meshStandardMaterial color={sCol} />
                </mesh>
              </group>
            );
          })}

          {/* platform */}
          <PosedGroup R={R} p={p}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[PLAT_R + 0.08, PLAT_R + 0.08, 0.06, 36]} />
              <meshStandardMaterial color="#c2571c" transparent opacity={0.92} />
            </mesh>
          </PosedGroup>
        </Scene3D>

        <ControlBar>
          <LabeledSlider label="x" value={x} min={-0.4} max={0.4} onChange={setX} fmt={v => v.toFixed(2)} color="#d9483f" width={120} />
          <LabeledSlider label="y" value={y} min={-0.4} max={0.4} onChange={setY} fmt={v => v.toFixed(2)} color="#2f9e44" width={120} />
          <LabeledSlider label="z" value={z} min={-0.3} max={0.5} onChange={setZ} fmt={v => v.toFixed(2)} color="#3b6fd4" width={120} />
          <LabeledSlider label="roll" value={roll} min={rad(-20)} max={rad(20)} onChange={setRoll} fmt={v => `${deg(v).toFixed(0)}°`} color="#d9483f" width={120} />
          <LabeledSlider label="pitch" value={pitchA} min={rad(-20)} max={rad(20)} onChange={setPitchA} fmt={v => `${deg(v).toFixed(0)}°`} color="#2f9e44" width={120} />
          <LabeledSlider label="yaw" value={yaw} min={rad(-20)} max={rad(20)} onChange={setYaw} fmt={v => `${deg(v).toFixed(0)}°`} color="#3b6fd4" width={120} />
          <Readout label="leg lengths" value={`${lmin.toFixed(2)} – ${lmax.toFixed(2)}`} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch2-mech-sg" met={met}>
        Fly the platform onto the gold ghost pose. It takes <em>all six</em> sliders — position{" "}
        <M>{"(0.22, -0.18, 0.30)"}</M> and orientation (roll 8°, pitch −6°, yaw 12°). Six
        independent inputs for six DOF: Grübler's count is the number of actuators the machine
        needs.
      </Challenge>
    </>
  );
}
