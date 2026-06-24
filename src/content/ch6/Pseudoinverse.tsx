import { useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { SpatialArm, armState } from "../../components/three/SpatialArm";
import { PointArrow, AxisArc } from "../../components/three/viz3d";
import { type Vec3, deg, rad } from "../../lib/math/vec";
import { pinvDamped, matVec, norm } from "../../lib/math/linalg";
import { P2R_JOINTS, P2R_M, planarPointJac } from "./arm";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const GOLD = "#caa53d";
const ACH = "#0b7285";
const RATEc = "#6741d9";
const DQ_CAP = 6; // challenge bound on ‖θ̇‖

export default function Pseudoinverse() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 6"
        section="Inverse Kinematics"
        title="The Pseudoinverse & Damping"
        lede="When the Jacobian isn't square or isn't invertible, J⁻¹ is replaced by the pseudoinverse J†. It always returns an answer — the smallest, or the closest — but near a singularity that answer explodes, unless you damp it."
      />

      <p>
        The Newton step needs to solve <M>{"J\\,\\Delta\\theta = e"}</M>, but <M>{"J"}</M> is rarely a
        nice invertible square. The <strong>Moore–Penrose pseudoinverse</strong> <M>{"J^{\\dagger}"}</M>{" "}
        handles every shape, and for a full-rank Jacobian it has closed forms:
      </p>
      <Eq>{"J^{\\dagger} = J^{\\mathsf T}(JJ^{\\mathsf T})^{-1}\\ \\ (\\text{fat},\\ n>m), \\qquad J^{\\dagger} = (J^{\\mathsf T}J)^{-1}J^{\\mathsf T}\\ \\ (\\text{tall},\\ n<m)."}</Eq>
      <p>
        A <strong>fat</strong> Jacobian (more joints than task coordinates) is a right inverse: among
        the infinitely many <M>{"\\Delta\\theta"}</M> that solve the step exactly, it picks the one of
        smallest norm. A <strong>tall</strong> Jacobian (fewer joints than task coordinates, or a
        singular one) is a left inverse: no exact solution exists, so it returns the least-squares
        closest fit.
      </p>
      <p>
        Either way, as a singularity approaches, <M>{"JJ^{\\mathsf T}"}</M> loses rank and{" "}
        <M>{"J^{\\dagger}"}</M> blows up: a tiny task velocity in the shrinking direction demands
        enormous joint rates. The cure is <strong>damped least squares</strong> — trade a little
        tracking accuracy for a bounded, well-behaved solution:
      </p>
      <Eq>{"\\Delta\\theta = J^{\\mathsf T}\\big(JJ^{\\mathsf T} + \\lambda^2 I\\big)^{-1} e."}</Eq>

      <H2>Watch it blow up — then tame it</H2>
      <p>
        The 2R arm below is commanded to move its tip at unit speed in a fixed direction. As you
        straighten the elbow toward the singularity, the raw pseudoinverse solution{" "}
        <M>{"\\lVert\\dot\\theta\\rVert"}</M> rockets upward. Turn up the damping <M>{"\\lambda"}</M>{" "}
        and it stays finite — the teal arrow (the velocity actually achieved) shrinks a bit, the price
        of staying sane.
      </p>

      <DampWidget />

      <Aside>
        Damping is a continuous knob between two extremes: <M>{"\\lambda = 0"}</M> is the exact
        pseudoinverse (perfect tracking, unbounded near singularities), while large{" "}
        <M>{"\\lambda"}</M> is gentle and robust but sluggish. Practical controllers raise{" "}
        <M>{"\\lambda"}</M> only as the smallest singular value gets small.
      </Aside>

      <DualityQuiz />

      <KeyIdea>
        <M>{"J^{\\dagger}"}</M> generalizes the inverse to any shape: minimum-norm for fat Jacobians,
        least-squares for tall ones. It diverges at singularities; damped least squares{" "}
        <M>{"J^{\\mathsf T}(JJ^{\\mathsf T}+\\lambda^2 I)^{-1}"}</M> keeps the joint rates bounded by
        giving up a little tracking accuracy.
      </KeyIdea>

      <BookRef>Modern Robotics §6.2.2 — Pseudoinverse, and damped least squares.</BookRef>
    </div>
  );
}

function DampWidget() {
  const [t1, setT1] = useState(rad(35));
  const [t2, setT2] = useState(rad(55));
  const [dir, setDir] = useState(0); // commanded velocity direction
  const [lam, setLam] = useState(0.0);

  const thetas: [number, number] = [t1, t2];
  const st = armState(P2R_JOINTS, P2R_M, thetas);
  const pEE: Vec3 = [st.ee.p[0], st.ee.p[1], st.ee.p[2]];
  const Vd: number[] = [Math.cos(dir), Math.sin(dir)]; // unit commanded tip velocity
  const J = planarPointJac(P2R_JOINTS, P2R_M, thetas); // 2×2

  const dqRaw = matVec(pinvDamped(J, 0), Vd);
  const dqDls = matVec(pinvDamped(J, lam), Vd);
  const achieved = matVec(J, dqDls); // velocity actually produced under damping
  const nRaw = norm(dqRaw), nDls = norm(dqDls);

  const nearSingular = Math.abs(t2) < 0.1 || Math.abs(Math.abs(t2) - Math.PI) < 0.1;
  const met = nearSingular && lam > 0.05 && nDls < DQ_CAP;

  return (
    <>
      <WidgetShell
        title="Raw pseudoinverse vs damped least squares"
        onReset={() => { setT1(rad(35)); setT2(rad(55)); setDir(0); setLam(0); }}
        caption={
          <>
            Gold is the commanded unit tip velocity; teal is what the <em>damped</em> solution
            actually delivers. Purple arcs are the joint rates it asks for. Straighten the elbow
            (<M>{"\\theta_2\\to 0"}</M>) with <M>{"\\lambda=0"}</M> and ‖θ̇‖ explodes; raise{" "}
            <M>{"\\lambda"}</M> and it stays bounded while the teal arrow falls short of gold.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={380} camera={[1.4, 5.0, 3.6]}>
              <Triad ghost colors={GHOST} scale={0.5} />
              <SpatialArm joints={P2R_JOINTS} M={P2R_M} thetas={thetas} eeTriadScale={0} linkColors={["#7a6f53", "#7a6f53"]} />
              {/* commanded vs achieved tip velocity */}
              <PointArrow at={pEE} dir={[Vd[0], Vd[1], 0]} length={0.9} color={GOLD} thickness={0.02} />
              {norm(achieved) > 0.03 && (
                <PointArrow at={pEE} dir={[achieved[0], achieved[1], 0]} length={0.9 * norm(achieved)} color={ACH} thickness={0.028} />
              )}
              {/* joint-rate arcs (damped) */}
              <AxisArc center={st.pivots[0]} axis={[0, 0, 1]} radius={0.34} sweep={Math.max(-2.5, Math.min(2.5, dqDls[0]))} color={RATEc} />
              <AxisArc center={st.pivots[1]} axis={[0, 0, 1]} radius={0.28} sweep={Math.max(-2.5, Math.min(2.5, dqDls[1]))} color={RATEc} />
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2 md:w-[250px]">
            <Readout label="‖θ̇‖ raw (λ=0)" value={nRaw >= 100 ? nRaw.toFixed(0) : nRaw.toFixed(2)} color={nRaw > DQ_CAP ? "#d9483f" : undefined} />
            <Readout label="‖θ̇‖ damped" value={nDls.toFixed(2)} color={nDls < DQ_CAP ? "var(--good)" : "#d9483f"} />
            <Readout label="tracking ‖achieved‖" value={norm(achieved).toFixed(2)} color={ACH} />
            <Readout label="rank" value={nearSingular ? "1 (singular)" : "2 (full)"} color={nearSingular ? "#d9483f" : undefined} />
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="θ₁" value={t1} min={rad(-180)} max={rad(180)} onChange={setT1} fmt={v => `${deg(v).toFixed(0)}°`} width={120} />
          <LabeledSlider label="θ₂" value={t2} min={rad(-170)} max={rad(170)} onChange={setT2} fmt={v => `${deg(v).toFixed(0)}°`} width={120} />
          <LabeledSlider label="cmd dir" value={dir} min={-Math.PI} max={Math.PI} onChange={setDir} fmt={v => `${deg(v).toFixed(0)}°`} width={120} />
          <LabeledSlider label="λ" value={lam} min={0} max={0.6} onChange={setLam} fmt={v => v.toFixed(2)} width={120} color={RATEc} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch6-pinv-damp" met={met}>
        Park the arm at the singularity — straighten the elbow until <M>{"\\theta_2 \\approx 0"}</M> —
        and keep the joint rates sane. With <M>{"\\lambda = 0"}</M> the raw ‖θ̇‖ diverges; add damping{" "}
        (<M>{"\\lambda > 0.05"}</M>) until the damped <M>{"\\lVert\\dot\\theta\\rVert"}</M> drops below{" "}
        {DQ_CAP}. You will see the achieved velocity (teal) fall short of the command (gold) — the
        accuracy you trade for stability.
      </Challenge>
    </>
  );
}

function DualityQuiz() {
  return (
    <Quiz
      challengeId="ch6-pinv-quiz"
      goal={<>Pin down what the pseudoinverse returns.</>}
      questions={[
        {
          prompt: <>A redundant arm (more joints than task dimensions) has a <em>fat</em> Jacobian. Its pseudoinverse <M>{"J^{\\dagger}=J^{\\mathsf T}(JJ^{\\mathsf T})^{-1}"}</M> returns the <M>{"\\Delta\\theta"}</M> that…</>,
          options: [
            { label: "solves the step exactly with smallest ‖Δθ‖", correct: true },
            { label: "is the least-squares closest fit" },
            { label: "is always zero" },
          ],
          explain: <>A right inverse: <M>{"JJ^{\\dagger}=I"}</M>, so the step is met exactly; among the infinitely many such solutions it picks the minimum-norm one.</>,
        },
        {
          prompt: <>When the arm is at a singularity, what goes wrong with the undamped pseudoinverse?</>,
          options: [
            { label: "JJᵀ loses rank, so J† and the joint rates blow up", correct: true },
            { label: "it returns the wrong sign" },
            { label: "nothing — it is always well-behaved" },
          ],
          explain: <>The shrinking singular value sits in a denominator; damping <M>{"+\\lambda^2 I"}</M> keeps it bounded.</>,
        },
      ]}
    />
  );
}
