import { useRef, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, Readout, WidgetButton } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { svgCoords } from "../../lib/svg";
import { deg, wrapAngle, rad } from "../../lib/math/vec";

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
        This is why "6-DOF" is the magic number in robotics: to put a tool at an arbitrary position{" "}
        <em>and</em> orientation in space, a robot needs at least six degrees of freedom. Three of
        the six are <em>translational</em> (where the body is) and three are <em>rotational</em>{" "}
        (how it is turned).
      </p>

      <H2>Joints are constraint machines</H2>
      <p>
        A robot is a collection of rigid links glued together by joints, and{" "}
        <strong>every joint removes freedoms</strong>. A revolute (hinge) joint between two spatial
        bodies lets exactly 1 relative motion survive out of 6 — it <em>provides</em>{" "}
        <M>{"f = 1"}</M> freedom and <em>removes</em> <M>{"6 - f = 5"}</M>. A spherical
        (ball-and-socket) joint provides <M>{"f = 3"}</M>. This bookkeeping is the engine behind
        Grübler's formula on the next page.
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

      <H2>From dof to C-space</H2>
      <p>
        The <M>{"n"}</M> numbers of a configuration are coordinates of a single point{" "}
        <M>{"q = (q_1, \\ldots, q_n)"}</M> living in the <strong>configuration space</strong>{" "}
        (C-space) <M>{"\\mathcal{C}"}</M> — the set of <em>all</em> configurations the robot can
        attain. One point of C-space ↔ one complete physical pose of the whole machine. The dof is
        simply the <em>dimension</em> of this space.
      </p>
      <Aside>
        The dimension is not the whole story — C-space also has a <em>shape</em>. The coin's angle
        coordinate lives on a circle, not a line: turn it by <M>{"2\\pi"}</M> and you are back
        where you started. The shape of C-space is the subject of the{" "}
        <a href="#/ch2-topology" className="text-[var(--accent)] underline">
          topology page
        </a>
        .
      </Aside>

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
