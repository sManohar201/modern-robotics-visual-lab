import { useEffect, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { Quiz } from "../../components/widgets/Quiz";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { SE3Display } from "../../components/widgets/MatrixDisplay";
import { rad, deg } from "../../lib/math/vec";
import { rotZ } from "../../lib/math/so3";
import { type SE3 } from "../../lib/math/se3";

export default function FkIntro() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 4"
        section="Forward Kinematics"
        title="Forward Kinematics: The Big Picture"
        lede="Given the joint angles, where is the robot's hand? Forward kinematics answers this — and Chapter 3's entire toolbox collapses into one compact formula."
      />

      <p>
        A robot arm is a chain of joints — revolute or prismatic — each driven by a motor to a
        specific position. The controller knows those joint positions exactly; they are the
        robot's coordinates in <strong>joint space</strong>. But the question that matters for
        manipulation, sensing, and planning is: given those joint positions, what is the{" "}
        <em>pose</em> of the end-effector — its position and orientation in the world?
      </p>
      <p>
        That mapping from joint values to end-effector pose is <strong>forward kinematics</strong>:
      </p>
      <Eq>{"T(\\theta) \\;:\\; \\underbrace{(\\theta_1,\\, \\theta_2,\\, \\ldots,\\, \\theta_n)}_{\\text{joint space}} \\;\\longmapsto\\; \\underbrace{T \\in SE(3)}_{\\text{task space}}."}</Eq>
      <p>
        The output is a 4×4 transformation matrix <M>{"T"}</M> — not just an{" "}
        <M>{"(x, y, z)"}</M> position, but a full rigid-body pose encoding both where the
        end-effector is and how it is oriented. Chapter 3 built exactly the machinery needed to
        compute and work with such matrices; Chapter 4 puts that machinery to its first major use.
      </p>

      <H2>A concrete picture</H2>
      <p>
        Think of a human arm. If someone tells you "shoulder at 30°, elbow at 45°," you can
        visualise exactly where the hand ends up — even without thinking about it consciously.
        That mental prediction is forward kinematics. For a robot with <M>{"n"}</M> joints, you
        do the same calculation, but with the systematic language of <M>{"SE(3)"}</M> instead of
        spatial intuition.
      </p>
      <p>
        Why does the output need to be in <M>{"SE(3)"}</M> rather than just a 3D position?
        Because the hand has an orientation — the direction it is pointing, the roll of the
        wrist. A screwdriver, a welding tip, a camera — all need their full six-degree-of-freedom
        pose specified. The 4×4 matrix <M>{"T"}</M> encodes all six.
      </p>

      <ArmPreviewWidget />

      <H2>The three ingredients</H2>
      <p>
        The product of exponentials formula — the main result of this chapter — needs exactly
        three inputs. Nothing more.
      </p>
      <p>
        <strong>1. The home configuration <M>{"M \\in SE(3)"}</M>.</strong> Freeze the robot with
        all joints at zero. The end-effector has some pose relative to the base frame — that
        pose is <M>{"M"}</M>. You compute it once, from the physical dimensions of the robot.
        It is a constant for the lifetime of the robot.
      </p>
      <p>
        <strong>2. The screw axes <M>{"\\mathcal{S}_1, \\ldots, \\mathcal{S}_n \\in \\mathbb{R}^6"}</M>.</strong>{" "}
        Each joint, while the robot is at its home configuration, defines a screw axis: the
        physical line in space about which (or along which) the joint moves, plus a pitch. These
        are expressed in the world (space) frame, with the robot frozen at home. Like{" "}
        <M>{"M"}</M>, they are fixed robot parameters — they do not change as the joints move.
      </p>
      <p>
        <strong>3. The joint values <M>{"\\theta_1, \\ldots, \\theta_n"}</M>.</strong> These are
        what the controller provides at runtime — the current angle (radians) for each revolute
        joint, or displacement (metres) for each prismatic joint.
      </p>

      <H2>The frozen-robot mental model</H2>
      <p>
        Here is an intuition that makes the product of exponentials formula feel inevitable rather
        than arbitrary.
      </p>
      <p>
        Imagine the robot frozen at home: every joint is at zero, the arm is in its canonical
        stretched-out pose. Now unfreeze the joints one at a time, outermost first:
      </p>
      <p>
        Joint 1 rotates by <M>{"\\theta_1"}</M> about its screw axis <M>{"\\mathcal{S}_1"}</M>{" "}
        — measured in the space frame, at home. Because joint 1 is the base, this rotation sweeps
        the entire robot, carrying every subsequent joint and the end-effector along with it.
        The matrix exponential <M>{"e^{[\\mathcal{S}_1]\\theta_1}"}</M> encodes exactly this
        displacement.
      </p>
      <p>
        Joint 2 then rotates by <M>{"\\theta_2"}</M> about <em>its</em> screw axis{" "}
        <M>{"\\mathcal{S}_2"}</M>. This axis was recorded at the home configuration in space
        coordinates — the matrix exponential handles where the axis actually ends up after joint
        1 has already moved. No manual tracking of intermediate frames is needed.
      </p>
      <p>
        Continue through joint <M>{"n"}</M>. Multiplying all the exponentials together in order
        and appending <M>{"M"}</M> at the right gives the final end-effector pose:
      </p>
      <Eq>{"T(\\theta) = e^{[\\mathcal{S}_1]\\theta_1}\\, e^{[\\mathcal{S}_2]\\theta_2} \\cdots e^{[\\mathcal{S}_n]\\theta_n}\\, M."}</Eq>
      <p>
        This is the <strong>product of exponentials</strong> (PoE) formula — the most important
        equation in the book. The next two pages derive the screw axes, work through a full
        example, and introduce the equivalent body-frame version.
      </p>
      <KeyIdea>
        Three inputs: <M>{"M"}</M> (home pose), <M>{"\\mathcal{S}_i"}</M> (joint screw axes at
        home, in space frame), <M>{"\\theta_i"}</M> (current joint values). The formula is{" "}
        <M>{"T = e^{[\\mathcal{S}_1]\\theta_1} \\cdots e^{[\\mathcal{S}_n]\\theta_n} M"}</M>.
        No intermediate link frames required.
      </KeyIdea>

      <H2>Why not Denavit-Hartenberg?</H2>
      <p>
        The classical alternative is the <strong>Denavit-Hartenberg (DH) convention</strong>:
        attach a coordinate frame to each link, following strict rules about axis alignment,
        then multiply the resulting link-to-link matrices:
      </p>
      <Eq>{"T_{0n} = T_{01}(\\theta_1)\\, T_{12}(\\theta_2) \\cdots T_{n-1,n}(\\theta_n)."}</Eq>
      <p>
        DH works and appears in virtually every pre-2000 robotics text. But attaching frames to
        links requires a ceremony: you must choose frame orientations following the DH rules, a
        process that is error-prone for anything beyond simple serial chains and that produces
        frames with no physical significance — they exist only to make the convention work.
      </p>
      <p>
        The PoE approach requires no link frames. You only need the joint axes — the physical
        lines in space about which each joint moves — and the home configuration. This is
        geometrically direct. It also generalises cleanly to the Jacobian (Chapter 5), the
        dynamics equations (Chapters 8–9), and to kinematic structures that DH handles poorly,
        such as parallel mechanisms.
      </p>
      <Aside>
        DH has four parameters per joint: two offsets and two angles, chosen by convention.
        PoE needs the same information — joint axis direction and a point on the axis — but
        expressed geometrically, without a convention-driven frame assignment.
      </Aside>

      <Quiz
        challengeId="ch4-fk-quiz"
        goal={<>Confirm the three ingredients before moving on.</>}
        questions={[
          {
            prompt: <>The home configuration <M>{"M"}</M> is the end-effector pose when…</>,
            options: [
              { label: "all joint values are zero", correct: true },
              { label: "the arm is at a user-defined reference posture" },
              { label: "the arm reaches the centre of its workspace" },
            ],
            explain: (
              <>
                <M>{"M"}</M> records the end-effector pose (in <M>{"SE(3)"}</M>) when every{" "}
                <M>{"\\theta_i = 0"}</M>. It is a fixed constant computed from the robot's
                geometry.
              </>
            ),
          },
          {
            prompt: (
              <>
                The screw axes <M>{"\\mathcal{S}_i"}</M> are expressed in which frame, and
                measured at which configuration?
              </>
            ),
            options: [
              { label: "space frame, at home (all joints zero)", correct: true },
              { label: "each joint's own frame, updated as the robot moves" },
              { label: "end-effector frame, at home" },
            ],
            explain: (
              <>
                All <M>{"\\mathcal{S}_i"}</M> are space-frame vectors, recorded with the robot
                frozen at home. They are fixed robot parameters — the matrix exponential handles
                the effect of other joints moving.
              </>
            ),
          },
          {
            prompt: <>Forward kinematics maps…</>,
            options: [
              { label: "joint space → task space (T ∈ SE(3))", correct: true },
              { label: "task space → joint space" },
              { label: "joint velocities → end-effector velocity" },
            ],
            explain: (
              <>
                FK takes joint values <M>{"\\theta"}</M> and returns the 4×4 end-effector pose{" "}
                <M>{"T(\\theta) \\in SE(3)"}</M>. Task space → joint space is{" "}
                <em>inverse</em> kinematics (Chapter 6). Velocity mapping is the Jacobian
                (Chapter 5).
              </>
            ),
          },
        ]}
      />

      <BookRef>Modern Robotics §4.1 — Introduction to Forward Kinematics.</BookRef>
    </div>
  );
}

/* ================= widget: feel the FK mapping ================= */

const L1 = 1;
const L2 = 1;
const SC = 92; // px per metre
const CX = 235;
const CY = 215;
const sx = (x: number) => CX + x * SC;
const sy = (y: number) => CY - y * SC;

function ArmPreviewWidget() {
  const [t1, setT1] = useState(rad(30));
  const [t2, setT2] = useState(rad(45));
  const [trail, setTrail] = useState<[number, number][]>([]);

  const e1: [number, number] = [L1 * Math.cos(t1), L1 * Math.sin(t1)];
  const phi = t1 + t2;
  const ee: [number, number] = [e1[0] + L2 * Math.cos(phi), e1[1] + L2 * Math.sin(phi)];
  const T: SE3 = { R: rotZ(phi), p: [ee[0], ee[1], 0] };
  const atHome = t1 === 0 && t2 === 0;

  useEffect(() => {
    setTrail(tr => [...tr.slice(-119), ee]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t1, t2]);

  return (
    <WidgetShell
      title="Turn the knobs, read the pose"
      onReset={() => {
        setT1(rad(30)); setT2(rad(45)); setTrail([]);
      }}
      caption={
        <>
          A planar 2R arm with <M>{"L_1 = L_2 = 1"}</M>. The matrix is the forward kinematics
          output: the red and green ticks at the hand are the body x̂ and ŷ axes — the columns
          of the R block — and the gold column is the hand's position. Press <em>home</em> to
          see <M>{"T(0) = M"}</M>, the home configuration.
        </>
      }
    >
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <svg viewBox="0 0 470 420" className="flex-1 min-w-0 max-w-[470px] rounded-lg bg-[#f4f2ec] border border-[var(--rule)]">
          {/* reach boundary */}
          <circle cx={CX} cy={CY} r={2 * SC} fill="none" stroke="#d8d4c6" strokeDasharray="5 5" />
          <text x={CX + 2 * SC - 4} y={CY - 8} fontSize="10.5" fill="#a8a496" textAnchor="end" fontStyle="italic">
            reach = L₁+L₂
          </text>
          {/* end-effector trail */}
          {trail.length > 1 && (
            <polyline
              points={trail.map(p => `${sx(p[0])},${sy(p[1])}`).join(" ")}
              fill="none" stroke="#6741d9" strokeOpacity="0.22" strokeWidth="2"
            />
          )}
          {/* base */}
          <line x1={CX - 22} y1={CY + 14} x2={CX + 22} y2={CY + 14} stroke="#9a968a" strokeWidth="3" />
          {/* links */}
          <line x1={sx(0)} y1={sy(0)} x2={sx(e1[0])} y2={sy(e1[1])} stroke="#c2571c" strokeWidth="9" strokeLinecap="round" />
          <line x1={sx(e1[0])} y1={sy(e1[1])} x2={sx(ee[0])} y2={sy(ee[1])} stroke="#0b7285" strokeWidth="8" strokeLinecap="round" />
          {/* joints */}
          <circle cx={sx(0)} cy={sy(0)} r="8" fill="#fff" stroke="#33343d" strokeWidth="2.5" />
          <circle cx={sx(e1[0])} cy={sy(e1[1])} r="7" fill="#fff" stroke="#33343d" strokeWidth="2.5" />
          {/* body frame at the hand: x̂_b, ŷ_b */}
          <line x1={sx(ee[0])} y1={sy(ee[1])}
            x2={sx(ee[0] + 0.3 * Math.cos(phi))} y2={sy(ee[1] + 0.3 * Math.sin(phi))}
            stroke="#d9483f" strokeWidth="3" />
          <line x1={sx(ee[0])} y1={sy(ee[1])}
            x2={sx(ee[0] - 0.3 * Math.sin(phi))} y2={sy(ee[1] + 0.3 * Math.cos(phi))}
            stroke="#2f9e44" strokeWidth="3" />
          <circle cx={sx(ee[0])} cy={sy(ee[1])} r="5" fill="#33343d" />
          {/* joint labels */}
          <text x={sx(0) - 14} y={sy(0) + 22} fontSize="12" fill="#c2571c" fontWeight="600">θ₁</text>
          <text x={sx(e1[0]) - 14} y={sy(e1[1]) + 22} fontSize="12" fill="#0b7285" fontWeight="600">θ₂</text>
        </svg>

        <div className="ui flex flex-col gap-3 md:w-[330px]">
          <div
            className={`rounded-lg p-2 -m-2 transition-colors duration-500 ${atHome ? "bg-[#fdf3d7]" : ""}`}
          >
            <SE3Display T={T} label={<M>{atHome ? "T(0) = M =" : "T(\\theta) ="}</M>} highlightP />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            <Readout label="x" value={ee[0].toFixed(2)} />
            <Readout label="y" value={ee[1].toFixed(2)} />
            <Readout label="φ" value={`${deg(phi).toFixed(0)}°`} />
          </div>
          <div>
            <WidgetButton onClick={() => { setT1(0); setT2(0); }} active={atHome}>
              home (θ = 0)
            </WidgetButton>
          </div>
        </div>
      </div>

      <ControlBar>
        <LabeledSlider label="θ₁" value={t1} min={-Math.PI} max={Math.PI} onChange={setT1}
          fmt={v => `${deg(v).toFixed(0)}°`} color="#c2571c" width={170} />
        <LabeledSlider label="θ₂" value={t2} min={-Math.PI} max={Math.PI} onChange={setT2}
          fmt={v => `${deg(v).toFixed(0)}°`} color="#0b7285" width={170} />
      </ControlBar>
    </WidgetShell>
  );
}
