import { useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad, Arrow } from "../../components/three/Scene3D";
import { Arm3R, ARM3R_COLORS, arm3RScrews, arm3RHome, arm3RJointsHome } from "../../components/three/Arm3R";
import { SE3Display, Vec6Display } from "../../components/widgets/MatrixDisplay";
import { rad, deg, vnorm, vsub } from "../../lib/math/vec";
import { so3Distance } from "../../lib/math/so3";
import { fkSpace } from "../../lib/math/se3";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const W_COLOR = "#6741d9";
const V_COLOR = "#0b7285";

export default function PoeSpace() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 4"
        section="Forward Kinematics"
        title="Space Form: Product of Exponentials"
        lede="Derive each joint's screw axis from two measurements, multiply the exponentials left to right, append the home pose — and you have the exact end-effector pose."
      />

      <p>
        The previous page introduced the three ingredients: home configuration <M>{"M"}</M>,
        screw axes <M>{"\\mathcal{S}_i"}</M>, and joint values <M>{"\\theta_i"}</M>. This page
        shows how to derive the screw axes from the robot's geometry and then how to assemble
        the forward kinematics formula.
      </p>

      <H2>From joint geometry to screw axis</H2>
      <p>
        Every revolute joint in the robot has two geometric properties: a unit axis direction and
        a point the axis passes through. Both are measured in the world (space) frame with the
        robot at its home configuration. From those two measurements alone you can compute the
        full 6-vector screw axis.
      </p>
      <p>
        Let joint <M>{"i"}</M> be revolute, with unit axis direction{" "}
        <M>{"\\hat{\\omega}_i"}</M> (by the right-hand rule) and a point{" "}
        <M>{"q_i"}</M> anywhere on that axis. The angular velocity part of the screw axis is
        just <M>{"\\hat{\\omega}_i"}</M>. For the linear velocity part, ask: if this joint
        rotates at unit angular speed while all others are locked, what is the instantaneous
        velocity of the point currently at the <em>space-frame origin</em>?
      </p>
      <p>
        A point <M>{"p"}</M> moving due to rotation about an axis through <M>{"q"}</M> has
        velocity <M>{"\\hat{\\omega} \\times (p - q)"}</M>. Setting <M>{"p = 0"}</M>:
      </p>
      <Eq>{"v_i = \\hat{\\omega}_i \\times (0 - q_i) = -\\hat{\\omega}_i \\times q_i."}</Eq>
      <p>
        The complete screw axis is:
      </p>
      <Eq>{"\\mathcal{S}_i = \\begin{bmatrix} \\hat{\\omega}_i \\\\ -\\hat{\\omega}_i \\times q_i \\end{bmatrix} \\qquad \\text{(revolute joint).}"}</Eq>
      <p>
        For a <strong>prismatic joint</strong> translating along direction{" "}
        <M>{"\\hat{d}_i"}</M>: there is no rotation, so <M>{"\\omega_i = 0"}</M> and the
        screw axis is just the translation direction:
      </p>
      <Eq>{"\\mathcal{S}_i = \\begin{bmatrix} 0 \\\\ \\hat{d}_i \\end{bmatrix} \\qquad \\text{(prismatic joint).}"}</Eq>
      <p>
        Two measurements per joint. That is the entire setup cost. No link frames, no DH tables.
      </p>

      <H2>Worked example: the 3R planar arm</H2>
      <p>
        Three revolute joints in the plane, all rotating about <M>{"\\hat{z} = (0,0,1)"}</M>,
        link lengths <M>{"L_1, L_2, L_3"}</M>. The home configuration has all links stretched
        along <M>{"\\hat{x}"}</M>:
      </p>
      <Eq>{"M = \\begin{bmatrix} 1 & 0 & 0 & L_1+L_2+L_3 \\\\ 0 & 1 & 0 & 0 \\\\ 0 & 0 & 1 & 0 \\\\ 0 & 0 & 0 & 1 \\end{bmatrix}."}</Eq>
      <p>
        Now derive each screw axis from its axis direction and a point on that axis (all
        measured in the space frame at home).
      </p>
      <p>
        <strong>Joint 1</strong> — at the base, at the origin: <M>{"q_1 = (0,0,0)"}</M>.
      </p>
      <Eq>{"v_1 = -\\hat{z} \\times (0,0,0) = 0, \\qquad \\mathcal{S}_1 = (0,0,1,\\; 0,0,0)."}</Eq>
      <p>
        The <M>{"v"}</M> component is zero because the axis already passes through the origin,
        so there is no lever arm.
      </p>
      <p>
        <strong>Joint 2</strong> — at the elbow, at <M>{"q_2 = (L_1, 0, 0)"}</M>.
      </p>
      <Eq>{"v_2 = -\\hat{z} \\times (L_1, 0, 0)."}</Eq>
      <p>
        Cross product: <M>{"(0,0,1) \\times (L_1, 0, 0) = (0\\cdot0 - 1\\cdot0,\\; 1\\cdot L_1 - 0\\cdot0,\\; 0\\cdot0 - 0\\cdot L_1) = (0, L_1, 0)"}</M>.
        Negating: <M>{"v_2 = (0, -L_1, 0)"}</M>.
      </p>
      <Eq>{"\\mathcal{S}_2 = (0,0,1,\\; 0,-L_1,0)."}</Eq>
      <p>
        <strong>Joint 3</strong> — at the wrist, at <M>{"q_3 = (L_1 + L_2, 0, 0)"}</M>.
      </p>
      <Eq>{"v_3 = -(0,0,1) \\times (L_1+L_2, 0, 0) = (0, -(L_1+L_2), 0), \\qquad \\mathcal{S}_3 = (0,0,1,\\; 0,-(L_1+L_2),0)."}</Eq>
      <p>
        The pattern: the <M>{"v"}</M> component grows with the joint's distance from the
        origin. Joint 1 is at the origin, so its lever arm is zero. Joint 2 is displaced{" "}
        <M>{"L_1"}</M> along <M>{"\\hat{x}"}</M>; rotating about <M>{"\\hat{z}"}</M> through
        a point displaced along <M>{"\\hat{x}"}</M> creates a velocity component in the{" "}
        <M>{"\\hat{y}"}</M> direction, which appears (negated) as <M>{"v_2"}</M>.
      </p>
      <Aside>
        Sanity check on the cross product: <M>{"\\hat{z} \\times \\hat{x} = \\hat{y}"}</M>{" "}
        (right-hand rule). So <M>{"\\hat{z} \\times (L_1, 0, 0) = L_1 (\\hat{z} \\times \\hat{x}) = L_1 \\hat{y} = (0, L_1, 0)"}</M>.
        Negated: <M>{"v_2 = (0, -L_1, 0)"}</M>. ✓ The formula is just geometry.
      </Aside>

      <ScrewBuilderWidget />

      <H2>The space form formula</H2>
      <p>
        With <M>{"M"}</M> and all <M>{"\\mathcal{S}_i"}</M> in hand, the end-effector pose for
        any joint configuration is:
      </p>
      <Eq>{"\\boxed{\\;T(\\theta) = e^{[\\mathcal{S}_1]\\theta_1}\\, e^{[\\mathcal{S}_2]\\theta_2} \\cdots e^{[\\mathcal{S}_n]\\theta_n}\\, M.\\;}"}</Eq>
      <p>
        Each factor <M>{"e^{[\\mathcal{S}_i]\\theta_i}"}</M> is a 4×4 rigid-body displacement
        matrix — the closed-form exponential from Chapter 3, evaluated at joint{" "}
        <M>{"i"}</M>'s current angle. When <M>{"\\theta_i = 0"}</M>, that factor is the
        identity and the joint contributes nothing.
      </p>
      <p>
        <strong>Reading left to right</strong> (outer to inner): joint 1 is outermost — its
        exponential sits leftmost and acts on the entire structure, sweeping every subsequent
        joint and the end-effector. Joint 2 is inside that, affecting everything from joint 2
        outward. Joint <M>{"n"}</M> is innermost, acting only on <M>{"M"}</M>.
      </p>
      <p>
        <strong>Reading right to left</strong> (inner to outer): start with the home pose{" "}
        <M>{"M"}</M>. Pre-multiply by joint <M>{"n"}</M>'s exponential, then joint{" "}
        <M>{"n-1"}</M>'s, and so on. Each pre-multiplication rotates in the space frame — the
        screw axes are all fixed in space, so this is consistent.
      </p>
      <p>
        Both readings give the same result. The physical story (joint 1 sweeps the whole arm)
        favours left-to-right; the computational story (successive pre-multiplications) favours
        right-to-left. Choose whichever builds your intuition.
      </p>

      <JointByJointWidget />

      <H2>What happens at the boundary cases</H2>
      <p>
        When <em>all</em> joints are zero, every exponential is the identity and{" "}
        <M>{"T(0) = I \\cdot I \\cdots I \\cdot M = M"}</M> — the formula reduces to the home
        configuration, as it must.
      </p>
      <p>
        When only joint <M>{"k"}</M> is non-zero, only the <M>{"k"}</M>-th exponential is
        non-identity. The formula becomes{" "}
        <M>{"T = e^{[\\mathcal{S}_k]\\theta_k} M"}</M> — a single screw displacement of the
        home pose, about the space-frame axis <M>{"\\mathcal{S}_k"}</M>. You can verify this
        visually in the widget: enable one joint at a time and watch the arm sweep a helical arc.
      </p>
      <Aside>
        The formula is <em>exact</em> for all joint values — there is no small-angle
        approximation anywhere. Each exponential is computed from Rodrigues' formula (for
        revolute joints) or the closed-form linear version (for prismatic joints), both of
        which are exact.
      </Aside>

      <KeyIdea>
        To derive <M>{"\\mathcal{S}_i"}</M>: measure axis direction <M>{"\\hat{\\omega}_i"}</M>{" "}
        and any point <M>{"q_i"}</M> on the axis, both at home in the space frame. Then{" "}
        <M>{"\\mathcal{S}_i = (\\hat{\\omega}_i,\\; -\\hat{\\omega}_i \\times q_i)"}</M>. Forward
        kinematics:{" "}
        <M>{"T(\\theta) = e^{[\\mathcal{S}_1]\\theta_1} \\cdots e^{[\\mathcal{S}_n]\\theta_n} M"}</M>.
        Each joint adds one factor; zero angle → identity factor.
      </KeyIdea>

      <BookRef>Modern Robotics §4.1 — Product of Exponentials, Space Form.</BookRef>
    </div>
  );
}

/* ================= widget 1: build S_i from the geometry ================= */

const SB_L3 = 0.3;

function ScrewBuilderWidget() {
  const [sel, setSel] = useState(1);
  const [l1, setL1] = useState(0.7);
  const [l2, setL2] = useState(0.5);

  const q = arm3RJointsHome(l1, l2)[sel];
  const S = arm3RScrews(l1, l2)[sel];
  const qx = q[0];

  return (
    <WidgetShell
      title="Screw axis builder: two measurements per joint"
      onReset={() => {
        setSel(1); setL1(0.7); setL2(0.5);
      }}
      caption={
        <>
          The arm at home, all links along x̂. The purple vertical line is the selected joint's
          axis; the gold dashed segment is the lever arm from the space origin to{" "}
          <M>{"q_i"}</M>. The teal arrow at the origin is <M>{"v_i = -\\hat{z} \\times q_i"}</M>{" "}
          — the velocity of the point at the origin if this joint spins at unit speed. Stretch{" "}
          <M>{"L_1, L_2"}</M> and watch <M>{"v_2, v_3"}</M> grow while <M>{"v_1"}</M> stays
          pinned at zero.
        </>
      }
    >
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1 min-w-0">
          <Scene3D height={320} camera={[2.4, 2.1, 2.4]}>
            <Triad ghost colors={GHOST} scale={0.6} />
            <Arm3R lengths={[l1, l2, SB_L3]} thetas={[0, 0, 0]} />
            {/* selected joint's screw axis */}
            <Line points={[[qx, 0, -0.4], [qx, 0, 1.0]]} color={W_COLOR} lineWidth={3.5} />
            <mesh position={[qx, 0, 1.0]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.05, 0.12, 16]} />
              <meshStandardMaterial color={W_COLOR} />
            </mesh>
            {/* lever arm origin → q_i */}
            {qx > 0.02 && (
              <Line
                points={[[0, 0, 0.16], [qx, 0, 0.16]]}
                color="#b08c1d" lineWidth={2.5} dashed dashSize={0.05} gapSize={0.035}
              />
            )}
            {/* v_i drawn at the space origin */}
            {qx > 0.05 && <Arrow dir={[0, -1, 0]} length={qx} color={V_COLOR} />}
          </Scene3D>
        </div>

        <div className="ui flex flex-col justify-center gap-3 md:w-[300px]">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map(i => (
              <WidgetButton key={i} onClick={() => setSel(i)} active={sel === i}>
                joint {i + 1}
              </WidgetButton>
            ))}
          </div>
          <Vec6Display
            v={S}
            label={<M>{`\\mathcal{S}_{${sel + 1}} =`}</M>}
            topColor={W_COLOR}
            bottomColor={V_COLOR}
          />
          <div className="flex flex-col gap-1.5">
            <Readout label="q on the axis" value={`(${qx.toFixed(2)}, 0, 0)`} color="#b08c1d" />
            <Readout
              label="v = −ẑ × q"
              value={`(0, ${qx > 0 ? "−" : ""}${qx.toFixed(2)}, 0)`}
              color={V_COLOR}
            />
          </div>
        </div>
      </div>

      <ControlBar>
        <LabeledSlider label="L₁" value={l1} min={0.3} max={0.9} onChange={setL1} color={ARM3R_COLORS[0]} width={150} />
        <LabeledSlider label="L₂" value={l2} min={0.3} max={0.9} onChange={setL2} color={ARM3R_COLORS[1]} width={150} />
      </ControlBar>
    </WidgetShell>
  );
}

/* ================= widget 2: joint-by-joint product + match challenge ================= */

const JL: [number, number, number] = [0.7, 0.5, 0.3];
const JL_S = arm3RScrews(JL[0], JL[1]);
const JL_M = arm3RHome(JL[0], JL[1], JL[2]);
// goal pose, reachable at θ* = (60°, −75°, 45°)
const JL_TGT = fkSpace(JL_M, JL_S, [rad(60), rad(-75), rad(45)]);

function FactorChip({
  on,
  onClick,
  math,
  color,
}: {
  on: boolean;
  onClick: () => void;
  math: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      title={on ? "click to disable this joint (factor becomes I)" : "click to enable this joint"}
      className={`px-2.5 py-1 rounded-md border text-[13.5px] transition-colors ${
        on ? "bg-white" : "bg-[#f3f1ea] text-[var(--ink-faint)]"
      }`}
      style={{ borderColor: on ? color : "var(--rule)" }}
    >
      <M>{on ? math : "I"}</M>
    </button>
  );
}

function JointByJointWidget() {
  const [t1, setT1] = useState(0);
  const [t2, setT2] = useState(0);
  const [t3, setT3] = useState(0);
  const [en, setEn] = useState<[boolean, boolean, boolean]>([true, false, false]);

  const eff = [en[0] ? t1 : 0, en[1] ? t2 : 0, en[2] ? t3 : 0];
  const T = fkSpace(JL_M, JL_S, eff);
  const rotErr = so3Distance(T.R, JL_TGT.R);
  const posErr = vnorm(vsub(T.p, JL_TGT.p));
  const met = en[0] && en[1] && en[2] && rotErr < rad(10) && posErr < 0.12;

  const toggle = (i: number) =>
    setEn(e => e.map((x, j) => (j === i ? !x : x)) as [boolean, boolean, boolean]);

  return (
    <>
      <WidgetShell
        title="Build the product one joint at a time"
        onReset={() => {
          setT1(0); setT2(0); setT3(0); setEn([true, false, false]);
        }}
        caption={
          <>
            Click a factor in the product to switch its joint on or off — a disabled joint's
            exponential is the identity, exactly as if <M>{"\\theta_i = 0"}</M>. The pale triad
            is the goal pose. Note that joint 1 sweeps everything downstream of it, while joint
            3 moves only the end-effector.
          </>
        }
      >
        <div className="ui flex flex-wrap items-center gap-1.5 mb-3 text-[14px]">
          <M>{"T(\\theta) \\,= "}</M>
          <FactorChip on={en[0]} onClick={() => toggle(0)} math={"e^{[\\mathcal{S}_1]\\theta_1}"} color={ARM3R_COLORS[0]} />
          <span className="text-[var(--ink-faint)]">·</span>
          <FactorChip on={en[1]} onClick={() => toggle(1)} math={"e^{[\\mathcal{S}_2]\\theta_2}"} color={ARM3R_COLORS[1]} />
          <span className="text-[var(--ink-faint)]">·</span>
          <FactorChip on={en[2]} onClick={() => toggle(2)} math={"e^{[\\mathcal{S}_3]\\theta_3}"} color={ARM3R_COLORS[2]} />
          <span className="text-[var(--ink-faint)]">·</span>
          <span className="px-2.5 py-1 rounded-md border border-[#e3d9b8] bg-[#fbf7e8] text-[13.5px]">
            <M>{"M"}</M>
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={330} camera={[2.4, 2.1, 2.4]}>
              <Triad ghost colors={GHOST} scale={0.55} />
              <Arm3R lengths={JL} thetas={[eff[0], eff[1], eff[2]]} />
              {/* goal pose */}
              <Triad ghost colors={GHOST} origin={[JL_TGT.p[0], JL_TGT.p[1], JL_TGT.p[2]]} R={JL_TGT.R} scale={0.42} />
              <mesh position={[JL_TGT.p[0], JL_TGT.p[1], JL_TGT.p[2]]}>
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshStandardMaterial color={met ? "#2f9e44" : "#d4af37"} />
              </mesh>
            </Scene3D>
          </div>

          <div className="ui flex flex-col justify-center gap-3 md:w-[300px]">
            <SE3Display T={T} label={<M>{"T(\\theta) ="}</M>} highlightP />
            <div className="flex flex-col gap-1.5">
              <Readout
                label="rotation error"
                value={`${deg(rotErr).toFixed(1)}°`}
                color={rotErr < rad(10) ? "var(--good)" : undefined}
              />
              <Readout
                label="position error"
                value={posErr.toFixed(3)}
                color={posErr < 0.12 ? "var(--good)" : undefined}
              />
            </div>
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="θ₁" value={t1} min={-Math.PI} max={Math.PI} onChange={setT1}
            fmt={v => `${deg(v).toFixed(0)}°`} color={ARM3R_COLORS[0]} width={130} />
          <LabeledSlider label="θ₂" value={t2} min={-Math.PI} max={Math.PI} onChange={setT2}
            fmt={v => `${deg(v).toFixed(0)}°`} color={ARM3R_COLORS[1]} width={130} />
          <LabeledSlider label="θ₃" value={t3} min={-Math.PI} max={Math.PI} onChange={setT3}
            fmt={v => `${deg(v).toFixed(0)}°`} color={ARM3R_COLORS[2]} width={130} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch4-poe-space-match" met={met}>
        Find <M>{"(\\theta_1, \\theta_2, \\theta_3)"}</M> that lands the end-effector on the
        pale goal frame (rotation within 10°, position within 0.12). Strategy: enable joints
        one at a time. Joint 1 alone points the chain in roughly the right direction; joints 2
        and 3 fold the arm onto the goal. Watch each enabled factor join the product above the
        scene.
      </Challenge>
    </>
  );
}
