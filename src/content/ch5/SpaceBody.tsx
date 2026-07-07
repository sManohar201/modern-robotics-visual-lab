import { useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, Readout } from "../../components/widgets/WidgetShell";
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
        lede="One motion, two descriptions: the room's view of the moving hand, or the hand's own view. Each gives a Jacobian whose columns are joint screw axes — displaced by the joints before, or after."
      />

      <p>
        A drone's motion can be reported two ways: ground radar says "heading north-east at 3 m/s,"
        while the drone's own instruments say "moving nose-first, drifting a little left." Same
        physical motion, different numbers — because each observer measures along their own axes.
        A robot's end-effector velocity has the same double life: you can write its twist{" "}
        <M>{"\\mathcal{V}"}</M> (the angular-plus-linear velocity 6-vector from Chapter 3) in the
        fixed <strong>space frame</strong> <M>{"\\{s\\}"}</M> bolted to the floor, or in the{" "}
        <strong>body frame</strong> <M>{"\\{b\\}"}</M> riding on the end-effector. Each choice
        gives its own Jacobian for the same arm:
      </p>
      <Eq>{"\\mathcal{V}_s = J_s(\\theta)\\,\\dot\\theta, \\qquad \\mathcal{V}_b = J_b(\\theta)\\,\\dot\\theta."}</Eq>
      <p>
        Read it back: the same joint rates <M>{"\\dot\\theta"}</M> go into both, and both outputs
        describe the same motion — <M>{"J_s"}</M> just reports it in floor coordinates and{" "}
        <M>{"J_b"}</M> in hand coordinates. The payoff of this page is that each matrix has a
        column-by-column geometric reading, and that the two are connected by a single
        change-of-frame matrix.
      </p>

      <H2>Space Jacobian: displaced by preceding joints</H2>
      <p>
        Differentiating the space product of exponentials gives a beautifully geometric result. The{" "}
        <M>{"i"}</M>-th column of the space Jacobian is the home screw axis{" "}
        <M>{"\\mathcal{S}_i"}</M> carried forward by the joints that come <em>before</em> it:
      </p>
      <Eq>{"J_{s,i}(\\theta) = \\mathrm{Ad}_{e^{[\\mathcal{S}_1]\\theta_1}\\cdots e^{[\\mathcal{S}_{i-1}]\\theta_{i-1}}}(\\mathcal{S}_i), \\qquad J_{s,1} = \\mathcal{S}_1."}</Eq>
      <p>
        Don't let the notation intimidate — every symbol is a Chapter 3 friend. Recall that{" "}
        <M>{"\\mathrm{Ad}_T"}</M>, the <strong>adjoint</strong>, is the 6×6 change-of-frame machine
        for twists: feed it a screw axis and it returns that axis as seen after the rigid motion{" "}
        <M>{"T"}</M>. So the formula says, in words: <em>take joint <M>{"i"}</M>'s home screw axis
        and carry it along with the motion of joints <M>{"1"}</M> through <M>{"i-1"}</M></em>.
      </p>
      <p>
        Why only the <em>preceding</em> joints? This is the "frozen rigid body" argument. Joint{" "}
        <M>{"i"}</M> spins <em>about</em> its own axis, so it never relocates that axis; and joints{" "}
        <M>{"i+1, i+2, \\ldots"}</M> live further out on the arm, downstream of the axis, so they
        can't move it either. Freeze them all. Only joints <M>{"1 \\ldots i-1"}</M> relocate the
        axis, and the adjoint of their combined motion is exactly what transports{" "}
        <M>{"\\mathcal{S}_i"}</M> from home to its current pose. With all preceding joints at zero,
        the column is simply <M>{"\\mathcal{S}_i"}</M> itself.
      </p>
      <p>
        <strong>Try this:</strong> the purple line is joint 3's live axis and the two 6-vector
        cards compare the live column <M>{"J_{s,3}"}</M> against the home screw{" "}
        <M>{"\\mathcal{S}_3"}</M>. Wiggle <M>{"\\theta_3"}</M> first — the column doesn't budge,
        because a joint never moves its own axis. Now wiggle <M>{"\\theta_1"}</M> or{" "}
        <M>{"\\theta_2"}</M> and watch both the purple line and the column swing. Then drive the
        two preceding joints to zero and watch the difference readout collapse.
      </p>

      <FrozenWidget />

      <H2>Body Jacobian: displaced by following joints</H2>
      <p>
        The body Jacobian is the mirror image. Its <M>{"i"}</M>-th column is the body screw axis{" "}
        <M>{"\\mathcal{B}_i"}</M> carried by the joints that come <em>after</em> it:
      </p>
      <Eq>{"J_{b,i}(\\theta) = \\mathrm{Ad}_{e^{-[\\mathcal{B}_n]\\theta_n}\\cdots e^{-[\\mathcal{B}_{i+1}]\\theta_{i+1}}}(\\mathcal{B}_i), \\qquad J_{b,n} = \\mathcal{B}_n."}</Eq>
      <p>
        Read it back with the frozen-body logic flipped around. In the body frame you sit{" "}
        <em>on the hand</em> and look back down the arm. From that seat, moving joint{" "}
        <M>{"i"}</M> or anything before it just moves the world — it never changes where joint{" "}
        <M>{"i"}</M>'s axis sits <em>relative to you</em>. What does change your view of the axis
        is the joints between it and you: joints <M>{"i+1 \\ldots n"}</M>. Hence the mirror-image
        formula, with the <em>following</em> joints doing the displacing and the last column always
        equal to its home value <M>{"\\mathcal{B}_n"}</M>.
      </p>

      <H2>The two are one adjoint apart</H2>
      <p>
        Both describe the same physical motion, so they are related by the adjoint of the
        forward-kinematics pose <M>{"T_{sb} = T(\\theta)"}</M>:
      </p>
      <Eq>{"J_s(\\theta) = [\\mathrm{Ad}_{T_{sb}}]\\,J_b(\\theta), \\qquad J_b(\\theta) = [\\mathrm{Ad}_{T_{bs}}]\\,J_s(\\theta)."}</Eq>
      <p>
        Because the adjoint matrix is always invertible, <M>{"J_s"}</M> and <M>{"J_b"}</M> always
        have the <strong>same rank</strong> — so singularities are a property of the arm, not of which
        Jacobian you happen to use. (Rank counts a matrix's independent directions; multiplying by
        an invertible matrix can rotate and stretch those directions but never destroy one.)
      </p>
      <p>
        <strong>Try this:</strong> scrub all three sliders and watch the two column stacks. The
        numbers in <M>{"J_s"}</M> and <M>{"J_b"}</M> disagree at every posture — sometimes wildly —
        yet the error readout <M>{"\\lVert J_s - \\mathrm{Ad}_{T_{sb}}J_b\\rVert"}</M> stays pinned
        at zero and the two ranks always match. Park <M>{"\\theta_3"}</M> near 0° (elbow straight)
        and watch <em>both</em> ranks drop to 2 together: the singularity shows up in whichever
        frame you look from.
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
          {
            prompt: <>With <em>every</em> joint at zero (the home posture), column <M>{"i"}</M> of the space Jacobian equals…</>,
            options: [
              { label: "the home screw axis 𝒮ᵢ, unchanged", correct: true },
              { label: "the zero vector" },
              { label: "the body screw axis ℬᵢ" },
            ],
            explain: <>The displacing adjoint is built from the <em>preceding</em> joints' motion; at home they haven't moved, so <M>{"\\mathrm{Ad}"}</M> is the identity and <M>{"J_{s,i} = \\mathcal{S}_i"}</M>.</>,
          },
        ]}
      />

      <H2>Traps</H2>
      <p>
        <strong>Don't mix frames in one equation.</strong> <M>{"J_s"}</M> and <M>{"J_b"}</M> are
        different matrices with different numbers; pairing <M>{"J_s"}</M> with a body twist (or
        feeding <M>{"J_b"}</M>'s output to something expecting space coordinates) silently produces
        garbage. Convert first with the adjoint, then combine.
      </p>
      <p>
        <strong>A joint never displaces its own column.</strong> The space column <M>{"J_{s,i}"}</M>{" "}
        depends only on the joints <em>before</em> joint <M>{"i"}</M>; wiggling <M>{"\\theta_i"}</M>{" "}
        itself leaves it fixed. Mirror-image for the body Jacobian: only the joints <em>after</em>.
      </p>
      <p>
        <strong>Frame-independent facts vs frame-dependent numbers.</strong> Rank, singularities,
        and which physical motions are possible don't care which Jacobian you use. The individual
        matrix entries, and anything read off them entry-by-entry, do.
      </p>

      <Aside>
        Elsewhere you may meet the <em>analytic</em> Jacobian, which differentiates a chosen set of
        pose coordinates (positions plus Euler-style angles) instead of producing a twist. It
        carries the same information as <M>{"J_b"}</M> — a fixed conversion of the angular part
        connects them — just different bookkeeping for orientation. Safe to skip until a specific
        tool hands you one.
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
