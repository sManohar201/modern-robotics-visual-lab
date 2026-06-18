import { useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad, PosedGroup, AXIS_COLORS } from "../../components/three/Scene3D";
import { SE3Display } from "../../components/widgets/MatrixDisplay";
import { type Vec3, mat3Mul, mat3Det, vnorm, vsub, rad, deg } from "../../lib/math/vec";
import { rotX, rotY, rotZ, so3Distance } from "../../lib/math/so3";
import { type SE3, se3Mul, se3Inv, se3Apply } from "../../lib/math/se3";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];

export default function Se3() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 3"
        section="Rigid-Body Motions"
        title="Homogeneous Transformations & SE(3)"
        lede="Add position to orientation and you get a single 4×4 matrix that represents pose, changes coordinates, and chains frame-to-frame — all with one matrix multiplication."
      />

      <p>
        The rotation matrix <M>{"R"}</M> encodes orientation perfectly. But it says nothing about{" "}
        <em>where</em> the body is. A robot arm's end-effector has a position as well as an
        orientation; a camera has a location in space, not just a pointing direction. To describe
        a full rigid-body pose, we need both <M>{"R"}</M> and a position vector <M>{"p"}</M>.
      </p>
      <p>
        Carrying the pair <M>{"(R, p)"}</M> separately works, but becomes clumsy as soon as we
        want to compose poses. To transform a vector from frame <M>{"\\{c\\}"}</M> to frame{" "}
        <M>{"\\{a\\}"}</M> via an intermediate frame <M>{"\\{b\\}"}</M>, we would need two
        separate matrix multiplications and two vector additions. Chains of four or five frames —
        common in sensor-robot-world setups — become error-prone to manage. There is a cleaner
        approach.
      </p>

      <H2>Homogeneous coordinates: turning affine into linear</H2>
      <p>
        A rigid-body displacement maps a point <M>{"q"}</M> in one frame to a point{" "}
        <M>{"q' = R q + p"}</M> in another. This is an <em>affine</em> map — a rotation plus a
        translation — and it is not a linear map because of the additive <M>{"p"}</M>. Linear maps
        can be composed by matrix multiplication; affine maps cannot (without extra bookkeeping).
      </p>
      <p>
        The fix is a standard trick: append a <M>{"1"}</M> to every point, making it a
        4-dimensional vector <M>{"\\tilde{q} = (q_x, q_y, q_z, 1)^\\mathsf{T}"}</M>. Then the
        affine map becomes a linear one:
      </p>
      <Eq>{"\\begin{bmatrix} R & p \\\\ 0 & 1 \\end{bmatrix} \\begin{bmatrix} q \\\\ 1 \\end{bmatrix} = \\begin{bmatrix} Rq + p \\\\ 1 \\end{bmatrix}."}</Eq>
      <p>
        The bottom row <M>{"[\\,0\\;0\\;0\\;1\\,]"}</M> does nothing to the point — it simply
        preserves the appended <M>{"1"}</M>. Its payoff is that composing two transformations is
        now a single 4×4 matrix multiplication, with no separate vector additions.
      </p>

      <H2>The homogeneous transformation matrix</H2>
      <p>
        A <strong>homogeneous transformation matrix</strong> is a 4×4 matrix of the form
      </p>
      <Eq>{"T = \\begin{bmatrix} R & p \\\\ 0 & 1 \\end{bmatrix} \\;\\in\\; \\mathbb{R}^{4 \\times 4},"}</Eq>
      <p>
        where <M>{"R \\in SO(3)"}</M> and <M>{"p \\in \\mathbb{R}^3"}</M>. Reading the blocks:
      </p>
      <p>
        The <strong>top-left 3×3 block</strong> is the rotation matrix: it encodes how frame{" "}
        <M>{"\\{b\\}"}</M> is oriented relative to frame <M>{"\\{a\\}"}</M>. Its columns are the
        body axes expressed in the reference frame.
      </p>
      <p>
        The <strong>top-right 3×1 column</strong> is the position: it is the origin of frame{" "}
        <M>{"\\{b\\}"}</M> expressed in frame <M>{"\\{a\\}"}</M>. When <M>{"p = 0"}</M>, the two
        frames share an origin and <M>{"T"}</M> reduces to a pure rotation.
      </p>
      <p>
        The <strong>bottom row</strong> is fixed at <M>{"[0\\;0\\;0\\;1]"}</M> for all rigid-body
        transformations. It is bookkeeping, not physics.
      </p>

      <PoseMatrixWidget />

      <H2>SE(3) — the special Euclidean group</H2>
      <p>
        The set of all homogeneous transformation matrices is the{" "}
        <strong>special Euclidean group</strong>:
      </p>
      <Eq>{"SE(3) = \\left\\{ T = \\begin{bmatrix} R & p \\\\ 0 & 1 \\end{bmatrix} :\\; R \\in SO(3),\\; p \\in \\mathbb{R}^3 \\right\\}."}</Eq>
      <p>
        It is a group: the product of two elements of <M>{"SE(3)"}</M> is in <M>{"SE(3)"}</M>;
        the identity is <M>{"\\begin{bmatrix}I & 0 \\\\ 0 & 1\\end{bmatrix}"}</M>; every element
        has an inverse. Like SO(3), it is non-commutative. The dimension is 6 — three for the
        position and three for the orientation — matching the six degrees of freedom of a free
        rigid body in space.
      </p>
      <Aside>
        The 2D analogue is <M>{"SE(2)"}</M>: rigid-body motions in the plane. Its elements are
        3×3 matrices{" "}
        <M>{"T = \\begin{bmatrix} \\cos\\theta & -\\sin\\theta & x \\\\ \\sin\\theta & \\cos\\theta & y \\\\ 0 & 0 & 1 \\end{bmatrix}"}</M>.
        Three parameters (<M>{"x, y, \\theta"}</M>) — exactly the 3 DOF of a planar rigid body
        from Chapter 2.
      </Aside>

      <H2>Three uses of <M>{"T"}</M></H2>
      <p>
        Just as <M>{"R"}</M> served three purposes (represent orientation, change frames, rotate),
        <M>{"T"}</M> serves the same three — now for full pose.
      </p>
      <p>
        <strong>Use 1 — Represent pose.</strong>{" "}
        <M>{"T_{sb}"}</M> encodes the complete pose of frame <M>{"\\{b\\}"}</M> relative to
        frame <M>{"\\{s\\}"}</M>: where its origin is and how it is oriented. Nothing more to
        compute.
      </p>
      <p>
        <strong>Use 2 — Change coordinate frames.</strong> To express a point <M>{"p_b"}</M>{" "}
        (given in frame <M>{"\\{b\\}"}</M>) in frame <M>{"\\{s\\}"}</M>:
      </p>
      <Eq>{"\\begin{bmatrix} p_s \\\\ 1 \\end{bmatrix} = T_{sb} \\begin{bmatrix} p_b \\\\ 1 \\end{bmatrix}, \\qquad p_s = R_{sb}\\, p_b + p_{\\mathrm{org}}."}</Eq>
      <p>
        The subscript cancellation rule carries over exactly from rotation matrices:{" "}
        <M>{"T_{ab}\\, T_{bc} = T_{ac}"}</M>. If the inner subscripts do not cancel, the product
        is meaningless — a built-in sanity check.
      </p>
      <p>
        <strong>Use 3 — Displace a frame.</strong> Apply <M>{"T_{\\mathrm{rel}}"}</M> to an
        existing frame <M>{"T_{sb}"}</M> to get a new pose. Pre-multiplying displaces relative
        to the space frame; post-multiplying displaces relative to the body frame:
      </p>
      <Eq>{"T' = T_{\\mathrm{rel}}\\, T_{sb} \\quad \\text{(space frame)}, \\qquad T' = T_{sb}\\, T_{\\mathrm{rel}} \\quad \\text{(body frame)}."}</Eq>

      <FrameChainingWidget />

      <H2>The inverse</H2>
      <p>
        Given <M>{"T_{sb}"}</M>, its inverse <M>{"T_{bs} = T_{sb}^{-1}"}</M> converts from space
        coordinates to body coordinates. A direct computation gives the closed form:
      </p>
      <Eq>{"T^{-1} = \\begin{bmatrix} R^\\mathsf{T} & -R^\\mathsf{T} p \\\\ 0 & 1 \\end{bmatrix}."}</Eq>
      <p>
        To see why: undoing the transformation <M>{"q' = R q + p"}</M> means first subtracting
        <M>{"p"}</M> and then applying <M>{"R^\\mathsf{T}"}</M>. But subtracting <M>{"p"}</M>{" "}
        must be done in the <em>space</em> frame, and <M>{"R^\\mathsf{T} p"}</M> converts it to
        the body frame, giving the <M>{"-R^\\mathsf{T} p"}</M> term in the top-right block. You
        can verify: <M>{"T \\cdot T^{-1} = I_4"}</M> with a direct multiplication.
      </p>
      <p>
        Notice that this is more expensive than inverting <M>{"R"}</M> alone (which just takes
        a transpose). The position block introduces the extra <M>{"-R^\\mathsf{T} p"}</M> term —
        you must rotate <M>{"p"}</M> as well as negate it. You have already watched this matrix
        being computed live: it is exactly what the <span className="mono">T_bs</span> toggle in
        the pose widget above displays.
      </p>

      <KeyIdea>
        <M>{"T = \\begin{bmatrix}R & p \\\\ 0 & 1\\end{bmatrix}"}</M>: orientation block +
        position column. Subscript cancellation <M>{"T_{ab}T_{bc} = T_{ac}"}</M> and the three
        uses (represent, change frames, displace) carry over from <M>{"R"}</M> with no
        conceptual change. Inverse:{" "}
        <M>{"T^{-1} = \\begin{bmatrix}R^\\mathsf{T} & {-R^\\mathsf{T}p} \\\\ 0 & 1\\end{bmatrix}"}</M>.
      </KeyIdea>

      <BookRef>Modern Robotics §3.4.1 — Homogeneous Transformation Matrices.</BookRef>
    </div>
  );
}

/* ================= widget 1: drag the frame, read the T ================= */

// the inverse-reading game: this is the pose the user must reproduce…
const TGT_SB: SE3 = { R: rotZ(rad(90)), p: [1, 0.5, 0] };
// …but only its inverse is shown.
const TGT_BS = se3Inv(TGT_SB);

function PoseMatrixWidget() {
  const [x, setX] = useState(0.4);
  const [y, setY] = useState(-0.3);
  const [z, setZ] = useState(0.2);
  const [roll, setRoll] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [yaw, setYaw] = useState(rad(30));
  const [showInv, setShowInv] = useState(false);

  const R = mat3Mul(rotZ(yaw), mat3Mul(rotY(pitch), rotX(roll)));
  const p: Vec3 = [x, y, z];
  const T: SE3 = { R, p };
  const disp = showInv ? se3Inv(T) : T;

  const met = so3Distance(R, TGT_SB.R) < rad(10) && vnorm(vsub(p, TGT_SB.p)) < 0.12;

  return (
    <>
      <WidgetShell
        title="Pose the frame, read the matrix"
        onReset={() => {
          setX(0.4); setY(-0.3); setZ(0.2);
          setRoll(0); setPitch(0); setYaw(rad(30));
          setShowInv(false);
        }}
        caption={
          <>
            The R-block columns are colored like the body axes; the gold-tinted column is{" "}
            <M>{"p"}</M> — the body origin in space coordinates. The pale matrix is the
            challenge target: it shows <M>{"T_{bs}"}</M>, not <M>{"T_{sb}"}</M>.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={340}>
              <Triad ghost colors={GHOST} scale={1.3} />
              <PosedGroup R={R} p={[x, y, z]}>
                <mesh>
                  <boxGeometry args={[0.7, 0.5, 0.35]} />
                  <meshStandardMaterial color="#e8e2d2" transparent opacity={0.85} />
                </mesh>
                <Triad scale={0.9} thickness={0.028} />
              </PosedGroup>
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-3 md:w-[320px]">
            <div className="flex items-center gap-2">
              <WidgetButton onClick={() => setShowInv(false)} active={!showInv}>
                <M>{"T_{sb}"}</M>
              </WidgetButton>
              <WidgetButton onClick={() => setShowInv(true)} active={showInv}>
                <M>{"T_{bs} = T_{sb}^{-1}"}</M>
              </WidgetButton>
            </div>
            <SE3Display
              T={disp}
              label={<M>{showInv ? "T_{bs} =" : "T_{sb} ="}</M>}
              colColors={showInv ? undefined : [AXIS_COLORS.x, AXIS_COLORS.y, AXIS_COLORS.z]}
              highlightP
            />
            <Readout label="det R" value={mat3Det(disp.R).toFixed(2)} />
            <div className="border-t border-[var(--rule)] pt-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-[#b08c1d] mb-1.5">
                target T_bs
              </div>
              <SE3Display T={TGT_BS} colColors={GHOST} />
            </div>
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="x" value={x} min={-1.2} max={1.2} onChange={setX} color={AXIS_COLORS.x} width={110} />
          <LabeledSlider label="y" value={y} min={-1.2} max={1.2} onChange={setY} color={AXIS_COLORS.y} width={110} />
          <LabeledSlider label="z" value={z} min={-1.2} max={1.2} onChange={setZ} color={AXIS_COLORS.z} width={110} />
          <LabeledSlider label="roll" value={roll} min={-Math.PI} max={Math.PI} onChange={setRoll}
            fmt={v => `${deg(v).toFixed(0)}°`} width={110} />
          <LabeledSlider label="pitch" value={pitch} min={-Math.PI / 2} max={Math.PI / 2} onChange={setPitch}
            fmt={v => `${deg(v).toFixed(0)}°`} width={110} />
          <LabeledSlider label="yaw" value={yaw} min={-Math.PI} max={Math.PI} onChange={setYaw}
            fmt={v => `${deg(v).toFixed(0)}°`} width={110} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch3-se3-inverse" met={met}>
        The pale matrix in the panel is a target <M>{"T_{bs}"}</M> — the <em>inverse</em> of the
        pose you control. Drive the body until your inverse matches it (within 10° and 0.12
        units). Invert it in your head — <M>{"R_{sb} = R_{bs}^\\mathsf{T}"}</M>,{" "}
        <M>{"p_{sb} = -R_{bs}^\\mathsf{T}\\,p_{bs}"}</M> — or flip the display toggle and match
        the numbers live.
      </Challenge>
    </>
  );
}

/* ================= widget 2: frame chaining ================= */

const TOOL_C: Vec3 = [0.5, 0.3, 0]; // tool tip, fixed in the gripper frame {c}
const CHAIN_TARGET: Vec3 = [1.5, -0.6, 0];

function FrameChainingWidget() {
  const [abX, setAbX] = useState(0.6);
  const [abY, setAbY] = useState(0.3);
  const [abTh, setAbTh] = useState(rad(30));
  const [bcX, setBcX] = useState(0.5);
  const [bcY, setBcY] = useState(-0.2);
  const [bcTh, setBcTh] = useState(rad(-45));

  const Tab: SE3 = { R: rotZ(abTh), p: [abX, abY, 0] };
  const Tbc: SE3 = { R: rotZ(bcTh), p: [bcX, bcY, 0] };
  const Tac = se3Mul(Tab, Tbc);

  const pB = se3Apply(Tbc, TOOL_C);
  const pA = se3Apply(Tab, pB);
  const met = vnorm(vsub(pA, CHAIN_TARGET)) < 0.1;

  return (
    <>
      <WidgetShell
        title="Chaining frames: world · robot · gripper"
        onReset={() => {
          setAbX(0.6); setAbY(0.3); setAbTh(rad(30));
          setBcX(0.5); setBcY(-0.2); setBcTh(rad(-45));
        }}
        caption={
          <>
            Frame sizes shrink down the chain: {"{a}"} (world, pale) → {"{b}"} (robot, orange
            dot) → {"{c}"} (gripper, teal dot). The teal rod is the tool, rigidly attached in{" "}
            {"{c}"}; its tip is the purple ball. All three matrices update as you steer — note
            how <M>{"T_{ac}"}</M> is always exactly <M>{"T_{ab}T_{bc}"}</M>.
          </>
        }
      >
        <Scene3D height={330} camera={[2.6, 2.4, 2.6]}>
          {/* {a} world frame */}
          <Triad ghost colors={GHOST} scale={0.8} />
          {/* {b} robot frame */}
          <PosedGroup R={Tab.R} p={[Tab.p[0], Tab.p[1], Tab.p[2]]}>
            <Triad scale={0.55} thickness={0.024} />
            <mesh>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshStandardMaterial color="#c2571c" />
            </mesh>
          </PosedGroup>
          {/* {c} gripper frame + tool */}
          <PosedGroup R={Tac.R} p={[Tac.p[0], Tac.p[1], Tac.p[2]]}>
            <Triad scale={0.4} thickness={0.022} />
            <mesh>
              <sphereGeometry args={[0.045, 16, 16]} />
              <meshStandardMaterial color="#0b7285" />
            </mesh>
            <Line points={[[0, 0, 0], [TOOL_C[0], TOOL_C[1], TOOL_C[2]]]} color="#0b7285" lineWidth={2.5} />
            <mesh position={TOOL_C}>
              <sphereGeometry args={[0.055, 16, 16]} />
              <meshStandardMaterial color={met ? "#2f9e44" : "#6741d9"} />
            </mesh>
          </PosedGroup>
          {/* gold target ring on the floor plane */}
          <mesh position={CHAIN_TARGET}>
            <torusGeometry args={[0.1, 0.014, 12, 40]} />
            <meshStandardMaterial color="#d4af37" />
          </mesh>
        </Scene3D>

        <div className="ui flex flex-wrap items-center gap-x-5 gap-y-3 mt-3">
          <SE3Display T={Tab} label={<M>{"T_{ab} ="}</M>} highlightP />
          <SE3Display T={Tbc} label={<M>{"T_{bc} ="}</M>} highlightP />
          <SE3Display T={Tac} label={<M>{"T_{ac} ="}</M>} highlightP />
        </div>
        <div className="ui flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5">
          <Readout label="p_c (fixed)" value={`(${TOOL_C[0].toFixed(2)}, ${TOOL_C[1].toFixed(2)})`} color="#0b7285" />
          <Readout label="p_b = T_bc p̃_c" value={`(${pB[0].toFixed(2)}, ${pB[1].toFixed(2)})`} color="#c2571c" />
          <Readout
            label="p_a = T_ab T_bc p̃_c"
            value={`(${pA[0].toFixed(2)}, ${pA[1].toFixed(2)})`}
            color={met ? "var(--good)" : undefined}
          />
        </div>

        <ControlBar>
          <LabeledSlider label="{b} x" value={abX} min={-1.5} max={1.5} onChange={setAbX} color="#c2571c" width={105} />
          <LabeledSlider label="{b} y" value={abY} min={-1.5} max={1.5} onChange={setAbY} color="#c2571c" width={105} />
          <LabeledSlider label="{b} θ" value={abTh} min={-Math.PI} max={Math.PI} onChange={setAbTh}
            fmt={v => `${deg(v).toFixed(0)}°`} color="#c2571c" width={105} />
          <LabeledSlider label="{c} x" value={bcX} min={-1.5} max={1.5} onChange={setBcX} color="#0b7285" width={105} />
          <LabeledSlider label="{c} y" value={bcY} min={-1.5} max={1.5} onChange={setBcY} color="#0b7285" width={105} />
          <LabeledSlider label="{c} θ" value={bcTh} min={-Math.PI} max={Math.PI} onChange={setBcTh}
            fmt={v => `${deg(v).toFixed(0)}°`} color="#0b7285" width={105} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch3-se3-chain" met={met}>
        Land the purple tool tip on the gold ring (within 0.1 units). The tip sits at{" "}
        <span className="mono">p_c = (0.5, 0.3, 0)</span> in the gripper frame; its world
        position is <M>{"p_a = T_{ab}\\,T_{bc}\\,\\tilde{p}_c"}</M>. Watch the inner{" "}
        <M>{"b"}</M>'s cancel as the readouts compute it live.
      </Challenge>
    </>
  );
}
