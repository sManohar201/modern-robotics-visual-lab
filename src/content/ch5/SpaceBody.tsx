import { useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { SpatialArm, armState, screwsFromJoints } from "../../components/three/SpatialArm";
import { ScrewAxisLine } from "../../components/three/viz3d";
import { Vec6Display } from "../../components/widgets/MatrixDisplay";
import { type Vec6, rad, deg } from "../../lib/math/vec";
import { jacobianSpace, jacobianBody, adjointApply, se3Inv } from "../../lib/math/se3";
import { ARM_JOINTS, ARM_M, ARM_HOME } from "./arm";

const W_COLOR = "#6741d9";
const V_COLOR = "#0b7285";
const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];

const maxAbsDiff = (a: Vec6, b: Vec6) => Math.max(...a.map((x, i) => Math.abs(x - b[i])));

export default function SpaceBody() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 5"
        section="Velocity Kinematics & Statics"
        title="Space & Body Jacobian"
        lede="The same end-effector velocity can be written in the fixed frame or the end-effector frame. Each gives a Jacobian whose columns are joint screw axes — displaced by the joints before, or after."
      />

      <p>
        A twist can be expressed in the fixed frame <M>{"\\{s\\}"}</M> or the body frame{" "}
        <M>{"\\{b\\}"}</M>, so there are two Jacobians for the same arm:
      </p>
      <Eq>{"\\mathcal{V}_s = J_s(\\theta)\\,\\dot\\theta, \\qquad \\mathcal{V}_b = J_b(\\theta)\\,\\dot\\theta."}</Eq>

      <H2>Space Jacobian: displaced by preceding joints</H2>
      <p>
        Differentiating the space product of exponentials gives a beautifully geometric result. The{" "}
        <M>{"i"}</M>-th column of the space Jacobian is the home screw axis{" "}
        <M>{"\\mathcal{S}_i"}</M> carried forward by the joints that come <em>before</em> it:
      </p>
      <Eq>{"J_{s,i}(\\theta) = \\mathrm{Ad}_{e^{[\\mathcal{S}_1]\\theta_1}\\cdots e^{[\\mathcal{S}_{i-1}]\\theta_{i-1}}}(\\mathcal{S}_i), \\qquad J_{s,1} = \\mathcal{S}_1."}</Eq>
      <p>
        The physical reading (the "frozen rigid body" argument): joints <M>{"i, i+1, \\ldots"}</M>{" "}
        do not move joint <M>{"i"}</M>'s axis relative to <M>{"\\{s\\}"}</M>, so freeze them. Only the
        preceding joints relocate the axis, and the adjoint of their combined motion is exactly what
        transports <M>{"\\mathcal{S}_i"}</M> from home to its current pose. With all preceding joints
        at zero, the column is simply <M>{"\\mathcal{S}_i"}</M> itself.
      </p>

      <FrozenWidget />

      <H2>Body Jacobian: displaced by following joints</H2>
      <p>
        The body Jacobian is the mirror image. Its <M>{"i"}</M>-th column is the body screw axis{" "}
        <M>{"\\mathcal{B}_i"}</M> carried by the joints that come <em>after</em> it:
      </p>
      <Eq>{"J_{b,i}(\\theta) = \\mathrm{Ad}_{e^{-[\\mathcal{B}_n]\\theta_n}\\cdots e^{-[\\mathcal{B}_{i+1}]\\theta_{i+1}}}(\\mathcal{B}_i), \\qquad J_{b,n} = \\mathcal{B}_n."}</Eq>

      <H2>The two are one adjoint apart</H2>
      <p>
        Both describe the same physical motion, so they are related by the adjoint of the
        forward-kinematics pose <M>{"T_{sb} = T(\\theta)"}</M>:
      </p>
      <Eq>{"J_s(\\theta) = [\\mathrm{Ad}_{T_{sb}}]\\,J_b(\\theta), \\qquad J_b(\\theta) = [\\mathrm{Ad}_{T_{bs}}]\\,J_s(\\theta)."}</Eq>
      <p>
        Because the adjoint matrix is always invertible, <M>{"J_s"}</M> and <M>{"J_b"}</M> always
        have the <strong>same rank</strong> — so singularities are a property of the arm, not of which
        Jacobian you happen to use. The widget verifies the adjoint identity to machine precision for
        every posture.
      </p>

      <AdjointWidget />

      <Quiz
        challengeId="ch5-sb-quiz"
        goal={<>Lock in the difference between the two Jacobians.</>}
        questions={[
          {
            prompt: <>Column <M>{"i"}</M> of the <strong>space</strong> Jacobian is the joint screw axis displaced by…</>,
            options: [
              { label: "the joints before joint i", correct: true },
              { label: "the joints after joint i" },
              { label: "all the other joints" },
            ],
            explain: <>Space columns use <M>{"\\mathrm{Ad}"}</M> of the <em>preceding</em> joints; body columns use the <em>following</em> joints.</>,
          },
          {
            prompt: <>Why must <M>{"J_s"}</M> and <M>{"J_b"}</M> always have the same rank?</>,
            options: [
              { label: "they differ by the always-invertible adjoint matrix", correct: true },
              { label: "they have the same number of columns" },
              { label: "rank is independent of the matrix entries" },
            ],
            explain: <>Multiplying by the invertible <M>{"[\\mathrm{Ad}_{T_{sb}}]"}</M> cannot change rank, so singularities coincide.</>,
          },
        ]}
      />

      <Aside>
        <strong>Analytic vs geometric.</strong> If the end-effector is described by a minimal set of
        coordinates <M>{"q"}</M> (say <M>{"x, y, z"}</M> plus three Euler or exponential-coordinate
        angles), then <M>{"\\dot q = J_a(\\theta)\\dot\\theta"}</M> defines the{" "}
        <em>analytic</em> Jacobian. It relates to the geometric body Jacobian through a block matrix
        that converts the angular-velocity part into the chosen angle-rate representation,{" "}
        <M>{"J_a = \\begin{bmatrix} A^{-1}(r) & 0 \\\\ 0 & R \\end{bmatrix} J_b"}</M>. Same
        information, different bookkeeping for the orientation.
      </Aside>

      <KeyIdea>
        Space column = home screw <M>{"\\mathcal{S}_i"}</M> pushed by the <em>preceding</em> joints;
        body column = body screw <M>{"\\mathcal{B}_i"}</M> pushed by the <em>following</em> joints.
        They are linked by <M>{"J_s = [\\mathrm{Ad}_{T_{sb}}] J_b"}</M> and always share the same
        rank.
      </KeyIdea>

      <BookRef>Modern Robotics §5.1.1–5.1.5 — Space Jacobian, Body Jacobian, and their relationship.</BookRef>
    </div>
  );
}

/* ================= widget 1: frozen-body construction ================= */

function FrozenWidget() {
  const [t1, setT1] = useState(rad(40));
  const [t2, setT2] = useState(rad(-30));
  const [t3, setT3] = useState(rad(40));

  const thetas: [number, number, number] = [t1, t2, t3];
  const st = armState(ARM_JOINTS, ARM_M, thetas);
  const Shome = screwsFromJoints(ARM_JOINTS);
  const cols = jacobianSpace(st.S, thetas);
  const col3 = cols[2];
  const diff = maxAbsDiff(col3, Shome[2]);
  const met = diff < 0.06; // J_s,3 == S_3 exactly when joints 1,2 are at zero

  return (
    <>
      <WidgetShell
        title="Preceding joints displace the column"
        onReset={() => {
          setT1(rad(40)); setT2(rad(-30)); setT3(rad(40));
        }}
        caption={
          <>
            The purple line is joint 3's screw axis — the angular part of <M>{"J_{s,3}"}</M>. Joint 3
            itself (and nothing after it) leaves the axis where it is; only joints 1 and 2 relocate it.
            When both are at zero, the live column <M>{"J_{s,3}"}</M> equals the home screw{" "}
            <M>{"\\mathcal{S}_3"}</M> exactly.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={350} camera={[3.6, 2.8, 3.6]}>
              <Triad ghost colors={GHOST} scale={0.6} />
              <SpatialArm joints={ARM_JOINTS} M={ARM_M} thetas={thetas} eeTriadScale={0.3} />
              <ScrewAxisLine q={st.pivots[2]} dir={st.axisDirs[2]} color={W_COLOR} half={1.5} />
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-3 md:w-[250px]">
            <Vec6Display v={col3} label={<M>{"J_{s,3} ="}</M>} topColor={W_COLOR} bottomColor={V_COLOR} />
            <Vec6Display v={Shome[2]} label={<M>{"\\mathcal{S}_3 ="}</M>} topColor={W_COLOR} bottomColor={V_COLOR} />
            <Readout label="‖J_s,3 − S₃‖" value={diff.toFixed(2)} color={met ? "var(--good)" : undefined} />
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="θ₁" value={t1} min={rad(-180)} max={rad(180)} onChange={setT1} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
          <LabeledSlider label="θ₂" value={t2} min={rad(-150)} max={rad(150)} onChange={setT2} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
          <LabeledSlider label="θ₃" value={t3} min={rad(-150)} max={rad(150)} onChange={setT3} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch5-sb-frozen" met={met}>
        Expose joint 3's home screw axis: zero the two joints <em>before</em> it (<M>{"\\theta_1, \\theta_2 \\to 0"}</M>)
        and watch <M>{"J_{s,3}"}</M> snap to <M>{"\\mathcal{S}_3"}</M>. Joint 3's own angle can be
        anything — it never displaces its own axis. That is the whole content of the adjoint formula.
      </Challenge>
    </>
  );
}

/* ================= widget 2: J_s = Ad_Tsb J_b verification ================= */

function rank3of6(cols: Vec6[]): number {
  // 3 columns → rank = 3 iff det(JᵀJ) is non-trivial
  const g = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      g[i][j] = cols[i].reduce((s, x, k) => s + x * cols[j][k], 0);
  const det =
    g[0][0] * (g[1][1] * g[2][2] - g[1][2] * g[2][1]) -
    g[0][1] * (g[1][0] * g[2][2] - g[1][2] * g[2][0]) +
    g[0][2] * (g[1][0] * g[2][1] - g[1][1] * g[2][0]);
  return det > 1e-4 ? 3 : 2;
}

function AdjointWidget() {
  const [t1, setT1] = useState(ARM_HOME[0]);
  const [t2, setT2] = useState(ARM_HOME[1]);
  const [t3, setT3] = useState(ARM_HOME[2]);

  const thetas: [number, number, number] = [t1, t2, t3];
  const S = screwsFromJoints(ARM_JOINTS);
  const B = S.map(s => adjointApply(se3Inv(ARM_M), s));
  const st = armState(ARM_JOINTS, ARM_M, thetas);
  const Js = jacobianSpace(S, thetas);
  const Jb = jacobianBody(B, thetas);
  // reconstruct J_s from J_b via the adjoint of T_sb
  const JsFromJb = Jb.map(c => adjointApply(st.ee, c));
  const err = Math.max(...Js.map((c, i) => maxAbsDiff(c, JsFromJb[i])));
  const rs = rank3of6(Js);
  const rb = rank3of6(Jb);

  return (
    <WidgetShell
      title="Same motion, two coordinate frames"
      onReset={() => {
        setT1(ARM_HOME[0]); setT2(ARM_HOME[1]); setT3(ARM_HOME[2]);
      }}
      caption={
        <>
          The three space columns and the three body columns look completely different, yet{" "}
          <M>{"[\\mathrm{Ad}_{T_{sb}}]J_b"}</M> reproduces <M>{"J_s"}</M> to machine precision at
          every posture, and their ranks always agree. Drive the arm and the error readout never
          budges from zero.
        </>
      }
    >
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1 min-w-0">
          <Scene3D height={320} camera={[3.6, 2.8, 3.6]}>
            <Triad ghost colors={GHOST} scale={0.6} />
            <SpatialArm joints={ARM_JOINTS} M={ARM_M} thetas={thetas} eeTriadScale={0.36} />
          </Scene3D>
        </div>
        <div className="ui flex flex-col justify-center gap-2.5 md:w-[280px]">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">space columns J_s</div>
          <div className="flex gap-2">
            {Js.map((c, i) => <Vec6Display key={i} v={c} topColor={W_COLOR} bottomColor={V_COLOR} />)}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-soft)] mt-1">body columns J_b</div>
          <div className="flex gap-2">
            {Jb.map((c, i) => <Vec6Display key={i} v={c} topColor={W_COLOR} bottomColor={V_COLOR} />)}
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <Readout label="‖J_s − Ad_Tsb J_b‖" value={err < 1e-9 ? "0" : err.toExponential(1)} color="var(--good)" />
            <Readout label="rank" value={`J_s: ${rs}   J_b: ${rb}`} color={rs === rb ? "var(--good)" : "#c92a2a"} />
          </div>
        </div>
      </div>

      <ControlBar>
        <LabeledSlider label="θ₁" value={t1} min={rad(-180)} max={rad(180)} onChange={setT1} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
        <LabeledSlider label="θ₂" value={t2} min={rad(-150)} max={rad(150)} onChange={setT2} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
        <LabeledSlider label="θ₃" value={t3} min={rad(-150)} max={rad(150)} onChange={setT3} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
      </ControlBar>
    </WidgetShell>
  );
}
