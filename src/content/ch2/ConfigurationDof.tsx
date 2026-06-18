import { useRef, useState } from "react";
import { Line, Html } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, Readout, WidgetButton, LabeledSlider } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Scene3D, Triad, AXIS_COLORS } from "../../components/three/Scene3D";
import { svgCoords } from "../../lib/svg";
import {
  deg, wrapAngle, rad,
  type Vec3, vadd, vsub, vscale, vdot, vcross, vunit, vnorm,
} from "../../lib/math/vec";

export default function ConfigurationDof() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 2"
        section="Configuration Space"
        title="Configuration & Degrees of Freedom"
        lede="Before we can make a robot move, we need a precise answer to a deceptively simple question: where is the robot, exactly?"
      />

      <p>
        Take a coin lying flat on a table. Suppose I cover it with my hand and ask you to tell me{" "}
        <em>exactly</em> where every point of the coin is. How many numbers do you need to tell me?
      </p>
      <p>
        Not one number per point — the coin is rigid, so its points can't move independently. The
        answer is <strong>three</strong>: two coordinates for <em>one</em> chosen point of the coin,
        and one angle for how the coin is turned. Those three numbers are a{" "}
        <strong>configuration</strong>: a complete specification of the position of every point of
        the body. The number of independent coordinates you need —{" "}
        <M>{"n = 3"}</M> here — is the body's <strong>degrees of freedom</strong> (dof).
      </p>
      <p>
        Why exactly three? Watch it happen. Build up the body one point at a time, and count the
        freedoms each new point actually adds:
      </p>

      <RigidBodyBuilder />

      <p>
        Point <M>{"A"}</M> can go anywhere: <strong className="cx">2 freedoms</strong>. Point{" "}
        <M>{"B"}</M> must stay at fixed distance <M>{"d_{AB}"}</M> from <M>{"A"}</M> — the rigidity
        of the body is a <em>constraint</em> — so it can only slide around a circle:{" "}
        <strong className="cy">1 freedom</strong>. And point <M>{"C"}</M>? It must keep its
        distance from <em>both</em> <M>{"A"}</M> and <M>{"B"}</M>. Two circles intersect in
        isolated points, so <M>{"C"}</M> has <strong className="cz">0 freedoms</strong> — it is
        already determined. Every further point of the body is determined the same way.
      </p>

      <Eq>{"\\underbrace{2}_{A} + \\underbrace{1}_{B} + \\underbrace{0}_{C} + 0 + \\cdots = 3 \\text{ dof}"}</Eq>

      <KeyIdea>
        Degrees of freedom = (sum of freedoms of the points) − (number of <em>independent</em>{" "}
        constraints). This single counting rule generates almost everything in this chapter.
      </KeyIdea>

      <H2>The same game in three dimensions</H2>
      <p>
        Run the identical argument for a rigid body floating in space. Point <M>{"A"}</M> is free
        in 3-D: <strong>3 freedoms</strong>. Point <M>{"B"}</M> is confined to a <em>sphere</em>{" "}
        around <M>{"A"}</M>: <strong>2 freedoms</strong>. Point <M>{"C"}</M> must keep its distance
        from both, which pins it to a <em>circle</em> (the intersection of two spheres):{" "}
        <strong>1 freedom</strong>. Every point after that is fixed.
      </p>
      <Eq>{"3 + 2 + 1 = 6 \\quad \\text{— a free rigid body in space has 6 dof.}"}</Eq>

      <p>
        The same builder, now in space. There is nothing to drag here — instead each freedom is its
        own slider, so the <em>number of sliders you control</em> is the dof. Add the points one at
        a time and watch the slider count climb 3 → 5 → 6:
      </p>

      <RigidBodyBuilder3D />

      <p>
        This is why "6-DOF" is the magic number in robotics: to put a tool at an arbitrary position{" "}
        <em>and</em> orientation in space, a robot needs at least six degrees of freedom. Three of
        the six are <em>translational</em> (where the body is) and three are <em>rotational</em>{" "}
        (how it is turned).
      </p>

      <H2>From dof to configuration space</H2>
      <p>
        The <M>{"n"}</M> coordinates of a configuration are the components of a single point{" "}
        <M>{"q = (q_1, \\ldots, q_n)"}</M> living in the robot's <strong>configuration space</strong>{" "}
        (C-space) <M>{"\\mathcal{C}"}</M> — the set of <em>all</em> configurations the robot can
        attain. The dimension of this space is the dof. Choosing a configuration means choosing a
        point in <M>{"\\mathcal{C}"}</M>; executing a motion means tracing a path through it.
      </p>
      <p>
        The dimension alone does not completely characterize C-space. A coin's angle lives on a{" "}
        <em>circle</em>, not a line: rotate by <M>{"2\\pi"}</M> and you return to the start. A
        prismatic joint's displacement lives on a <em>line</em>, not a circle. These are both
        one-dimensional, but topologically different — one wraps around, the other does not. For a
        2R robot arm with two revolute joints, the C-space is a two-dimensional torus (a donut),
        not a flat square. The shape of C-space is the subject of the topology page; for now, the
        essential point is that dimension and shape are two separate properties, both of which
        matter for planning and control.
      </p>
      <p>
        The next pages build the machinery for computing dof for complete robot mechanisms: the
        joint types that connect links (and how many freedoms each grants), and Grübler's formula
        for summing everything together.
      </p>

      <Quiz
        challengeId="ch2-dof-quiz"
        goal={<>Answer all three correctly.</>}
        questions={[
          {
            prompt: (
              <>
                How many dof does a <em>point</em> (not a body — just a point) moving in 3-D space
                have?
              </>
            ),
            options: [
              { label: "2" },
              { label: "3", correct: true },
              { label: "6" },
            ],
            explain: "A point has position but no orientation: (x, y, z).",
          },
          {
            prompt: (
              <>
                Two rigid bodies move freely in the <em>plane</em>, then get pinned together by one
                revolute joint. Total dof of the pair?
              </>
            ),
            options: [
              { label: "3" },
              { label: "4", correct: true },
              { label: "6" },
            ],
            explain:
              "3 + 3 = 6 freedoms; a planar revolute joint removes 2 (it pins two points together): 6 − 2 = 4. Or: body one carries 3, the hinge adds 1.",
          },
          {
            prompt: (
              <>
                A rigid body in space is constrained so one of its points must stay on a fixed
                table top (but may slide on it). Its dof?
              </>
            ),
            options: [
              { label: "3" },
              { label: "4" },
              { label: "5", correct: true },
            ],
            explain: "One equation, z_A = 0, removes one freedom: 6 − 1 = 5.",
          },
        ]}
      />

      <BookRef>Modern Robotics §2.1 — Degrees of Freedom of a Rigid Body.</BookRef>
    </div>
  );
}

/* ================= widget: planar rigid body builder ================= */

const W = 760;
const H = 380;
const D_AB = 130; // body dimensions
const C_LOCAL: [number, number] = [62, -78]; // C in body frame (x along AB)

// target region + angle for the challenge
const TARGET = { x: 560, y: 110, w: 110, h: 90, phi: rad(135) };

function RigidBodyBuilder() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [stage, setStage] = useState(1); // 1: only A, 2: A+B, 3: full body
  const [a, setA] = useState<[number, number]>([240, 230]);
  const [phi, setPhi] = useState(rad(-30)); // angle of AB (svg coords, y down)
  const dragging = useRef<"A" | "B" | null>(null);

  const b: [number, number] = [a[0] + D_AB * Math.cos(phi), a[1] + D_AB * Math.sin(phi)];
  // C in world: A + R(phi) * C_LOCAL
  const c: [number, number] = [
    a[0] + C_LOCAL[0] * Math.cos(phi) - C_LOCAL[1] * Math.sin(phi),
    a[1] + C_LOCAL[0] * Math.sin(phi) + C_LOCAL[1] * Math.cos(phi),
  ];

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !svgRef.current) return;
    const [x, y] = svgCoords(e, svgRef.current, W, H);
    if (dragging.current === "A") {
      setA([Math.min(W - 30, Math.max(30, x)), Math.min(H - 30, Math.max(30, y))]);
    } else {
      setPhi(Math.atan2(y - a[1], x - a[0]));
    }
  };

  // challenge: A inside target box, phi ≈ 135° (svg-y-down equivalent: -135°)
  const phiDisplay = -phi; // present y-up angle to the user
  const met =
    stage === 3 &&
    a[0] > TARGET.x && a[0] < TARGET.x + TARGET.w &&
    a[1] > TARGET.y && a[1] < TARGET.y + TARGET.h &&
    Math.abs(deg(wrapAngle(phiDisplay - TARGET.phi))) < 8;

  return (
    <>
      <WidgetShell
        title="Freedoms of a planar rigid body"
        onReset={() => {
          setStage(1);
          setA([240, 230]);
          setPhi(rad(-30));
        }}
        caption={
          <>
            Drag <span className="cx font-semibold">A</span> anywhere (2 freedoms). Drag{" "}
            <span className="cy font-semibold">B</span> — it is chained to its circle around A (1
            freedom). C comes along for free (0 freedoms).
          </>
        }
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={() => (dragging.current = null)}
          onPointerLeave={() => (dragging.current = null)}
        >
          {/* target region (stage 3) */}
          {stage === 3 && (
            <g>
              <rect
                x={TARGET.x} y={TARGET.y} width={TARGET.w} height={TARGET.h}
                rx={10}
                fill={met ? "#e3f3e5" : "#f5efdb"}
                stroke={met ? "#2f9e44" : "#cdb96e"}
                strokeDasharray="6 5"
              />
              <text x={TARGET.x + TARGET.w / 2} y={TARGET.y - 8} textAnchor="middle"
                fontSize="11" fill="#988a56" fontFamily="Inter, sans-serif">
                bring A here, φ ≈ 135°
              </text>
            </g>
          )}

          {/* the body (stage 3) */}
          {stage === 3 && (
            <polygon
              points={`${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]}`}
              fill="#6741d922"
              stroke="#6741d9"
              strokeWidth={1.5}
            />
          )}

          {/* circle constraint for B */}
          {stage >= 2 && (
            <circle cx={a[0]} cy={a[1]} r={D_AB} fill="none" stroke="#2f9e44"
              strokeWidth={1.2} strokeDasharray="5 6" opacity={0.65} />
          )}

          {/* circle constraints for C (shown faintly) */}
          {stage === 3 && (
            <>
              <circle cx={a[0]} cy={a[1]} r={Math.hypot(C_LOCAL[0], C_LOCAL[1])} fill="none"
                stroke="#3b6fd4" strokeWidth={1} strokeDasharray="3 6" opacity={0.4} />
              <circle cx={b[0]} cy={b[1]} r={Math.hypot(C_LOCAL[0] - D_AB, C_LOCAL[1])} fill="none"
                stroke="#3b6fd4" strokeWidth={1} strokeDasharray="3 6" opacity={0.4} />
            </>
          )}

          {/* link A-B */}
          {stage >= 2 && (
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#50525e" strokeWidth={2.5} />
          )}

          {/* points */}
          <g
            onPointerDown={e => {
              e.preventDefault();
              dragging.current = "A";
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
            className="cursor-grab"
          >
            <circle cx={a[0]} cy={a[1]} r={16} fill="#d9483f22" />
            <circle cx={a[0]} cy={a[1]} r={8} fill="#d9483f" />
            <text x={a[0] - 22} y={a[1] - 12} fontSize="15" fontStyle="italic" fill="#d9483f">A</text>
          </g>

          {stage >= 2 && (
            <g
              onPointerDown={e => {
                e.preventDefault();
                dragging.current = "B";
                (e.target as Element).setPointerCapture?.(e.pointerId);
              }}
              className="cursor-grab"
            >
              <circle cx={b[0]} cy={b[1]} r={16} fill="#2f9e4422" />
              <circle cx={b[0]} cy={b[1]} r={8} fill="#2f9e44" />
              <text x={b[0] + 12} y={b[1] - 10} fontSize="15" fontStyle="italic" fill="#2f9e44">B</text>
            </g>
          )}

          {stage === 3 && (
            <g>
              <circle cx={c[0]} cy={c[1]} r={7} fill="#3b6fd4" />
              <text x={c[0] + 11} y={c[1] - 8} fontSize="15" fontStyle="italic" fill="#3b6fd4">C</text>
            </g>
          )}
        </svg>

        <ControlBar>
          <WidgetButton onClick={() => setStage(1)} active={stage === 1}>1 · point A</WidgetButton>
          <WidgetButton onClick={() => setStage(2)} active={stage === 2}>2 · add B</WidgetButton>
          <WidgetButton onClick={() => setStage(3)} active={stage === 3}>3 · full body</WidgetButton>
          <span className="flex-1" />
          <Readout label="x_A" value={a[0].toFixed(0)} color="var(--ax-x)" />
          <Readout label="y_A" value={(H - a[1]).toFixed(0)} color="var(--ax-x)" />
          {stage >= 2 && <Readout label="φ" value={`${deg(wrapAngle(phiDisplay)).toFixed(0)}°`} color="var(--ax-y)" />}
          <Readout label="dof so far" value={stage === 1 ? "2" : "3"} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch2-dof-explore" met={met}>
        Go to stage 3, then steer the body into the dashed region with orientation{" "}
        <M>{"\\varphi \\approx 135^\\circ"}</M> (±8°). Notice you only ever control 3 numbers —
        that <em>is</em> the configuration.
      </Challenge>
    </>
  );
}

/* ================= widget: spatial rigid body builder ================= */

const D_AB3 = 1.4; // |AB|
const ALONG = 0.6; // projection of C onto the AB axis (body constant)
const R_CIRC = 0.8; // radius of C's constraint circle (body constant)
const TARGET3: Vec3 = [-0.45, 0.75, 0.95];
const TARGET_TOL = 0.3;

/** Place the body from its 6 independent freedoms. */
function buildBody(A: Vec3, alpha: number, beta: number, gamma: number) {
  // B lives on the sphere of radius D_AB3 around A — 2 angles pin it down.
  const u: Vec3 = [
    Math.cos(alpha) * Math.sin(beta),
    Math.sin(alpha) * Math.sin(beta),
    Math.cos(beta),
  ];
  const B = vadd(A, vscale(u, D_AB3));
  // C keeps fixed distance from both A and B -> it rides a circle about the AB axis.
  const helper: Vec3 = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const v = vunit(vsub(helper, vscale(u, vdot(helper, u))));
  const w = vcross(u, v);
  const center = vadd(A, vscale(u, ALONG));
  const C = vadd(center, vadd(vscale(v, R_CIRC * Math.cos(gamma)), vscale(w, R_CIRC * Math.sin(gamma))));
  return { u, v, w, B, center, C };
}

/** A thin connecting bar (drei Line) between two points. */
function Bar({ a, b, color }: { a: Vec3; b: Vec3; color: string }) {
  return <Line points={[a, b]} color={color} lineWidth={2.5} />;
}

function Dot({ p, color, r = 0.075, label }: { p: Vec3; color: string; r?: number; label?: string }) {
  return (
    <group position={p}>
      <mesh>
        <sphereGeometry args={[r, 20, 20]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {label && (
        <Html center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <span
            style={{
              font: "italic 600 14px Georgia, serif",
              color,
              transform: "translate(14px,-14px)",
              display: "inline-block",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </Html>
      )}
    </group>
  );
}

function RigidBodyBuilder3D() {
  const [stage, setStage] = useState(1);
  const [A, setA] = useState<Vec3>([0, 0, 0]);
  const [alpha, setAlpha] = useState(rad(35)); // azimuth of AB
  const [beta, setBeta] = useState(rad(65)); // polar angle of AB
  const [gamma, setGamma] = useState(rad(40)); // C around the AB axis

  const { v, w, B, center, C } = buildBody(A, alpha, beta, gamma);

  // C's constraint circle, sampled for drawing
  const circlePts: Vec3[] = [];
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * 2 * Math.PI;
    circlePts.push(vadd(center, vadd(vscale(v, R_CIRC * Math.cos(t)), vscale(w, R_CIRC * Math.sin(t)))));
  }

  const dofSoFar = stage === 1 ? 3 : stage === 2 ? 5 : 6;
  const met = stage === 3 && vnorm(vsub(C, TARGET3)) < TARGET_TOL;

  const reset = () => {
    setStage(1);
    setA([0, 0, 0]);
    setAlpha(rad(35));
    setBeta(rad(65));
    setGamma(rad(40));
  };

  return (
    <>
      <WidgetShell
        title="Freedoms of a rigid body in space"
        onReset={reset}
        caption={
          <>
            <span className="cx font-semibold">A</span> is free in space (3 sliders). <span className="cy font-semibold">B</span> is
            chained to its <em>sphere</em> around A (2 sliders). <span className="cz font-semibold">C</span> is chained to the{" "}
            <em>circle</em> where two spheres meet (1 slider). Drag the view to orbit.
          </>
        }
      >
        <Scene3D height={360} camera={[3.4, 2.6, 3.4]}>
          <Triad ghost colors={["#dcb6b4", "#b8d4bd", "#b4c4dd"]} scale={1.2} />

          {/* B's constraint sphere around A */}
          {stage >= 2 && (
            <mesh position={A}>
              <sphereGeometry args={[D_AB3, 32, 24]} />
              <meshStandardMaterial color="#2f9e44" transparent opacity={0.07} />
              <meshBasicMaterial color="#2f9e44" wireframe transparent opacity={0.12} />
            </mesh>
          )}

          {/* C's constraint circle */}
          {stage === 3 && <Line points={circlePts} color="#3b6fd4" lineWidth={1.5} dashed dashSize={0.12} gapSize={0.08} />}

          {/* the rigid body */}
          {stage === 3 && (
            <>
              <Bar a={A} b={B} color="#50525e" />
              <Bar a={A} b={C} color="#9a93a8" />
              <Bar a={B} b={C} color="#9a93a8" />
              <mesh>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[new Float32Array([...A, ...B, ...C]), 3]}
                  />
                </bufferGeometry>
                <meshBasicMaterial color="#6741d9" transparent opacity={0.16} side={2} />
              </mesh>
            </>
          )}
          {stage === 2 && <Bar a={A} b={B} color="#50525e" />}

          {/* target marker */}
          {stage === 3 && (
            <mesh position={TARGET3}>
              <sphereGeometry args={[TARGET_TOL, 20, 16]} />
              <meshBasicMaterial color={met ? "#2f9e44" : "#cdb96e"} wireframe transparent opacity={met ? 0.5 : 0.3} />
            </mesh>
          )}

          {/* points */}
          <Dot p={A} color={AXIS_COLORS.x} label="A" />
          {stage >= 2 && <Dot p={B} color={AXIS_COLORS.y} label="B" />}
          {stage === 3 && <Dot p={C} color={AXIS_COLORS.z} label="C" />}
        </Scene3D>

        <ControlBar>
          <WidgetButton onClick={() => setStage(1)} active={stage === 1}>1 · point A</WidgetButton>
          <WidgetButton onClick={() => setStage(2)} active={stage === 2}>2 · add B</WidgetButton>
          <WidgetButton onClick={() => setStage(3)} active={stage === 3}>3 · full body</WidgetButton>
          <span className="flex-1" />
          <Readout label="dof so far" value={String(dofSoFar)} />
        </ControlBar>

        <div className="ui mt-3 flex flex-wrap gap-x-8 gap-y-2">
          <LabeledSlider label={<span className="cx">x_A</span>} value={A[0]} min={-1.5} max={1.5}
            onChange={x => setA(([, y, z]) => [x, y, z])} color={AXIS_COLORS.x} />
          <LabeledSlider label={<span className="cx">y_A</span>} value={A[1]} min={-1.5} max={1.5}
            onChange={y => setA(([x, , z]) => [x, y, z])} color={AXIS_COLORS.x} />
          <LabeledSlider label={<span className="cx">z_A</span>} value={A[2]} min={-1.5} max={1.5}
            onChange={z => setA(([x, y]) => [x, y, z])} color={AXIS_COLORS.x} />
          {stage >= 2 && (
            <>
              <LabeledSlider label={<span className="cy">α</span>} value={alpha} min={-Math.PI} max={Math.PI}
                onChange={setAlpha} fmt={a => `${deg(a).toFixed(0)}°`} color={AXIS_COLORS.y} />
              <LabeledSlider label={<span className="cy">β</span>} value={beta} min={0.05} max={Math.PI - 0.05}
                onChange={setBeta} fmt={a => `${deg(a).toFixed(0)}°`} color={AXIS_COLORS.y} />
            </>
          )}
          {stage === 3 && (
            <LabeledSlider label={<span className="cz">γ</span>} value={gamma} min={-Math.PI} max={Math.PI}
              onChange={setGamma} fmt={a => `${deg(a).toFixed(0)}°`} color={AXIS_COLORS.z} />
          )}
        </div>
      </WidgetShell>

      <Challenge id="ch2-dof-3d" met={met}>
        Reach stage 3, then land point <span className="cz font-semibold">C</span> inside the gold
        target sphere. You will need to coordinate all six sliders at once — six numbers, exactly the
        configuration of a rigid body in space.
      </Challenge>
    </>
  );
}
