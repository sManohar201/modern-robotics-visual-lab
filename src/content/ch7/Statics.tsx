import { useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Scene3D, Triad, Arrow } from "../../components/three/Scene3D";
import { Vec6Display } from "../../components/widgets/MatrixDisplay";
import { type Vec3, type Mat3, mat3Identity } from "../../lib/math/vec";
import { Joint, Poly, Seg } from "./viz";
import { SG_A, SG_HOME_H, sgPlatformPt, sgLegDir, sgResultantWrench } from "./mechanism";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const BASEc = "#9b968a";
const PLATc = "#6741d9";
const FORCEc = "#d9483f";
const NETc = "#1864ab";
const LEGCOLORS = ["#0b7285", "#1864ab", "#c2571c", "#a61e4d", "#2f9e44", "#9c6b16"];

export default function Statics() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 7"
        section="Kinematics of Closed Chains"
        title="Statics & the Constraint Jacobian"
        lede="The same force-through-the-transpose duality from open chains works for closed ones — and on the Stewart–Gough platform it hands you the Jacobian almost for free, because every leg force points straight down its own leg."
      />

      <p>
        Differential kinematics of a closed chain has an extra character compared with an open chain:
        only the <strong>actuated</strong> joints can be driven; the <strong>passive</strong> joint
        velocities follow from the loop constraints. Writing the loop closure in differential form and
        splitting joints into actuated <M>{"q_a"}</M> and passive <M>{"q_p"}</M>,
      </p>
      <Eq>{"H_a\\,\\dot q_a + H_p\\,\\dot q_p = 0 \\;\\Longrightarrow\\; \\dot q_p = -H_p^{-1} H_a\\,\\dot q_a,"}</Eq>
      <p>
        provided the <strong>constraint Jacobian</strong> block <M>{"H_p"}</M> is invertible. Feed the
        passive rates back into any one leg's forward kinematics and you get the platform twist{" "}
        <M>{"\\mathcal V = J(q)\\,\\dot q_a"}</M>. (When <M>{"H_p"}</M> drops rank, the passive rates
        are undetermined — an <em>actuator singularity</em>, the next page.)
      </p>

      <H2>The Stewart–Gough shortcut: statics gives the Jacobian</H2>
      <p>
        For the Stewart–Gough platform there is a beautiful shortcut. Each leg is capped by spherical
        joints, which transmit <strong>no torque</strong> — so the force from leg <M>{"i"}</M> must
        point along the leg, <M>{"f_i=\\hat n_i\\tau_i"}</M>. Its moment about the base origin is{" "}
        <M>{"m_i=q_i\\times f_i"}</M> with <M>{"q_i"}</M> the fixed base anchor. Summing the six leg
        wrenches gives the platform wrench directly:
      </p>
      <Eq>{"\\mathcal F_s = \\sum_{i=1}^{6}\\begin{bmatrix} q_i\\times\\hat n_i\\\\ \\hat n_i\\end{bmatrix}\\tau_i = J_s^{-\\mathsf T}\\,\\tau."}</Eq>
      <p>
        Read off the columns and you have the inverse Jacobian <M>{"J_s^{-1}"}</M> with no
        differentiation at all — the static duality <M>{"\\tau = J^{\\mathsf T}\\mathcal F"}</M> doing
        the work. Push on the legs below and watch the six wrenches combine.
      </p>

      <StaticsWidget />

      <Aside>
        This is the same conservation-of-power identity <M>{"\\tau=J^{\\mathsf T}\\mathcal F"}</M> used
        for open chains in Chapter 5, only read in reverse: there we mapped a tip wrench to joint
        torques; here we assemble known leg forces into the platform wrench, and the matrix that
        appears is <M>{"J_s^{-\\mathsf T}"}</M>. When that matrix loses rank, the platform can resist a
        wrench with no leg effort — a singularity.
      </Aside>

      <KeyIdea>
        Closed-chain velocity analysis splits joints into actuated and passive and uses the constraint
        Jacobian: <M>{"\\dot q_p=-H_p^{-1}H_a\\dot q_a"}</M>. For the Stewart–Gough platform the
        spherical end-caps force every leg force along its leg, so the static relation{" "}
        <M>{"\\mathcal F_s=J_s^{-\\mathsf T}\\tau"}</M> hands you the inverse Jacobian columns{" "}
        <M>{"[q_i\\times\\hat n_i;\\ \\hat n_i]"}</M> with no differentiation.
      </KeyIdea>

      <BookRef>Modern Robotics §7.2, §7.2.1–7.2.2 — Differential kinematics; the constraint Jacobian and the Stewart–Gough static analysis.</BookRef>
    </div>
  );
}

function StaticsWidget() {
  const [tau, setTau] = useState<number[]>([1, 1, 1, 1, 1, 1]);
  const setI = (i: number, v: number) => setTau(t => t.map((x, k) => (k === i ? v : x)));

  // Level home pose (focus on the force composition).
  const p: Vec3 = [0, 0, SG_HOME_H];
  const R: Mat3 = mat3Identity();
  const B: Vec3[] = [0, 1, 2, 3, 4, 5].map(i => sgPlatformPt(p, R, i));
  const dirs: Vec3[] = [0, 1, 2, 3, 4, 5].map(i => sgLegDir(p, R, i));
  const Fs = sgResultantWrench(p, R, tau);

  const mNorm = Math.hypot(Fs[0], Fs[1], Fs[2]);
  const fNorm = Math.hypot(Fs[3], Fs[4], Fs[5]);
  const met = mNorm < 0.25 && fNorm > 2.0; // near-pure force ⇒ symmetric (equal) leg efforts

  return (
    <>
      <WidgetShell
        title="Six leg forces compose into one platform wrench"
        onReset={() => setTau([1, 1, 1, 1, 1, 1])}
        caption={
          <>
            Each red arrow is a leg force <M>{"\\hat n_i\\tau_i"}</M> directed along its leg; the blue
            arrow is the resultant force part of <M>{"\\mathcal F_s=J_s^{-\\mathsf T}\\tau"}</M> on the
            platform. The wrench vector at right stacks moment (top) over force (bottom). Equal efforts
            give a clean vertical push; unbalance them and a net moment appears.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={400} camera={[4.6, 3.6, 4.6]}>
              <Triad ghost colors={GHOST} scale={0.7} />
              <Poly pts={SG_A} color={BASEc} width={2} close />
              {SG_A.map((a, i) => <Joint key={`a${i}`} p={a} color={BASEc} r={0.06} />)}
              {[0, 1, 2, 3, 4, 5].map(i => (
                <group key={`l${i}`}>
                  <Seg a={SG_A[i]} b={B[i]} color={LEGCOLORS[i]} width={2.5} opacity={0.55} />
                  {/* leg force arrow, anchored mid-leg, scaled by τ */}
                  <group position={[(SG_A[i][0] + B[i][0]) / 2, (SG_A[i][1] + B[i][1]) / 2, (SG_A[i][2] + B[i][2]) / 2]}>
                    <Arrow dir={dirs[i]} length={0.12 + 0.32 * Math.abs(tau[i])} color={FORCEc} thickness={0.02} />
                  </group>
                </group>
              ))}
              <Poly pts={B} color={PLATc} width={2.8} close />
              {/* resultant force at platform center */}
              <group position={p}>
                <Arrow dir={[Fs[3], Fs[4], Fs[5]]} length={0.2 + 0.12 * fNorm} color={NETc} thickness={0.03} />
              </group>
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2 md:w-[230px]">
            <Vec6Display v={Fs} label={<M>{"\\mathcal F_s"}</M>} topColor="#a61e4d" bottomColor={NETc} digits={2} />
            <Readout label="‖moment‖" value={mNorm.toFixed(2)} color={mNorm < 0.25 ? "var(--good)" : "#a61e4d"} />
            <Readout label="‖force‖" value={fNorm.toFixed(2)} color={NETc} />
          </div>
        </div>

        <ControlBar>
          {[0, 1, 2].map(i => (
            <LabeledSlider key={i} label={`τ${i + 1}`} value={tau[i]} min={-2} max={2} onChange={v => setI(i, v)} fmt={v => v.toFixed(1)} width={110} color={LEGCOLORS[i]} />
          ))}
        </ControlBar>
        <ControlBar>
          {[3, 4, 5].map(i => (
            <LabeledSlider key={i} label={`τ${i + 1}`} value={tau[i]} min={-2} max={2} onChange={v => setI(i, v)} fmt={v => v.toFixed(1)} width={110} color={LEGCOLORS[i]} />
          ))}
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch7-statics-pure-force" met={met}>
        Make the platform feel a near-pure vertical <strong>force</strong> with almost no moment
        (drive <M>{"\\lVert\\text{moment}\\rVert<0.25"}</M> while keeping the force strong). The clean
        way is symmetry: push all six legs equally, and their moments about the center cancel — exactly
        the column structure of <M>{"J_s^{-\\mathsf T}"}</M> at work.
      </Challenge>

      <Quiz
        challengeId="ch7-statics-quiz"
        goal={<>Pin down the constraint-Jacobian logic.</>}
        questions={[
          {
            prompt: <>The passive joint rates of a closed chain are recovered from <M>{"\\dot q_p=-H_p^{-1}H_a\\dot q_a"}</M> only when…</>,
            options: [
              { label: <><M>{"H_p"}</M> is invertible</>, correct: true },
              { label: <><M>{"H_a"}</M> is square</> },
              { label: <>all joints are actuated</> },
            ],
            explain: <>If <M>{"H_p"}</M> loses rank the passive rates are undetermined — that is an actuator singularity.</>,
          },
          {
            prompt: <>The Stewart–Gough static map <M>{"\\mathcal F_s=J_s^{-\\mathsf T}\\tau"}</M> has columns <M>{"[q_i\\times\\hat n_i;\\ \\hat n_i]"}</M> because…</>,
            options: [
              { label: <>spherical end-joints carry no torque, so each leg force lies along the leg</>, correct: true },
              { label: <>the legs are massless</> },
              { label: <>the platform is rigid</> },
            ],
            explain: <>A force along the unit leg direction <M>{"\\hat n_i"}</M> applied at anchor <M>{"q_i"}</M> is exactly the screw/wrench <M>{"[q_i\\times\\hat n_i;\\ \\hat n_i]"}</M>.</>,
          },
        ]}
      />
    </>
  );
}
