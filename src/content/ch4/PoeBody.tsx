import { useEffect, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { Arm3R, ARM3R_COLORS, arm3RScrews, arm3RHome } from "../../components/three/Arm3R";
import { SE3Display, Vec6Display } from "../../components/widgets/MatrixDisplay";
import { rad, deg } from "../../lib/math/vec";
import { se3Inv, adjointApply, fkSpace, fkBody } from "../../lib/math/se3";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const W_COLOR = "#6741d9";
const V_COLOR = "#0b7285";

export default function PoeBody() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 4"
        section="Forward Kinematics"
        title="Body Form, B_i, and URDF"
        lede="The same end-effector pose arises from screw axes expressed in the end-effector frame — and the standard robot description format stores exactly the data needed for both."
      />

      <p>
        The space form <M>{"T(\\theta) = e^{[\\mathcal{S}_1]\\theta_1} \\cdots e^{[\\mathcal{S}_n]\\theta_n} M"}</M>{" "}
        uses screw axes expressed in the world frame, with the robot at home. There is a
        completely equivalent formula that uses screw axes expressed instead in the end-effector
        (body) frame at home. Both formulas produce the same <M>{"T(\\theta)"}</M> — they are
        the same statement in two languages.
      </p>

      <H2>Why you might want body-frame axes</H2>
      <p>
        There are two practical reasons to prefer body-frame screws.
      </p>
      <p>
        <strong>Sensor-attached descriptions.</strong> If a sensor or tool description is given
        relative to the end-effector — as is common when calibrating a camera mounted on the
        wrist — its joint axes are naturally in body coordinates. No conversion needed.
      </p>
      <p>
        <strong>The body Jacobian.</strong> In Chapter 5, the body twist{" "}
        <M>{"\\mathcal{V}_b"}</M> relates to joint velocities through the body Jacobian, whose
        columns are exactly the body screw axes <M>{"\\mathcal{B}_i"}</M> evaluated along the
        kinematic chain. Working in body coordinates from the start avoids a redundant
        transformation step.
      </p>

      <H2>Body screw axes</H2>
      <p>
        The body screw axis <M>{"\\mathcal{B}_i"}</M> of joint <M>{"i"}</M> is its screw axis
        expressed in the end-effector frame <M>{"\\{b\\}"}</M> at the home configuration. The
        relationship to the space axis is:
      </p>
      <Eq>{"\\mathcal{B}_i = \\mathrm{Ad}_{M^{-1}}\\, \\mathcal{S}_i."}</Eq>
      <p>
        Reading this: <M>{"\\mathrm{Ad}_{M^{-1}}"}</M> is the adjoint transformation associated
        with <M>{"M^{-1} = T_{bs}"}</M>, which converts a twist from space coordinates to body
        coordinates. Since <M>{"M"}</M> is the home configuration <M>{"T_{sb}"}</M>, its
        inverse goes from space to body — exactly what we want.
      </p>
      <p>
        Concretely, if <M>{"M = \\begin{bmatrix} R & p \\\\ 0 & 1 \\end{bmatrix}"}</M>, then
        the adjoint of <M>{"M^{-1}"}</M> is the 6×6 matrix:
      </p>
      <Eq>{"\\mathrm{Ad}_{M^{-1}} = \\begin{bmatrix} R^\\mathsf{T} & 0 \\\\ -R^\\mathsf{T}[p] & R^\\mathsf{T} \\end{bmatrix},"}</Eq>
      <p>
        where <M>{"[p]"}</M> is the 3×3 skew-symmetric matrix of the translation vector{" "}
        <M>{"p"}</M> of <M>{"M"}</M>. Applying this to each space axis gives the body axes.
      </p>
      <Aside>
        For the 3R planar arm: <M>{"M"}</M> has <M>{"R = I"}</M> and{" "}
        <M>{"p = (L_1+L_2+L_3,\\, 0,\\, 0)"}</M> (arm fully extended along{" "}
        <M>{"\\hat{x}"}</M>). So <M>{"\\mathrm{Ad}_{M^{-1}} = \\begin{bmatrix} I & 0 \\\\ -[p] & I \\end{bmatrix}"}</M>.
        Applying to <M>{"\\mathcal{S}_1 = (0,0,1,\\, 0,0,0)"}</M>: the top part stays{" "}
        <M>{"(0,0,1)"}</M>; the bottom part becomes{" "}
        <M>{"-[p]\\,(0,0,1)"}</M>. Since{" "}
        <M>{"[p]\\,(0,0,1) = (0,-L,0)"}</M> where <M>{"L = L_1+L_2+L_3"}</M>, the result is{" "}
        <M>{"(0, L, 0)"}</M>. So{" "}
        <M>{"\\mathcal{B}_1 = (0,0,1,\\; 0,\\,L_1+L_2+L_3,\\; 0)"}</M> — a positive{" "}
        <M>{"v"}</M> component, because from the end-effector's perspective joint 1 is far
        behind it (at <M>{"-(L_1+L_2+L_3)"}</M> in body-frame <M>{"\\hat{x}"}</M>), so its
        rotation drives the body in the <M>{"+\\hat{y}"}</M> direction.
      </Aside>

      <H2>The body form formula</H2>
      <p>
        With body axes in hand, the body form of forward kinematics is:
      </p>
      <Eq>{"\\boxed{\\;T(\\theta) = M\\, e^{[\\mathcal{B}_1]\\theta_1}\\, e^{[\\mathcal{B}_2]\\theta_2} \\cdots e^{[\\mathcal{B}_n]\\theta_n}.\\;}"}</Eq>
      <p>
        Compare the two forms side by side:
      </p>
      <Eq>{"\\text{Space:} \\quad T = e^{[\\mathcal{S}_1]\\theta_1} \\cdots e^{[\\mathcal{S}_n]\\theta_n}\\, M."}</Eq>
      <Eq>{"\\text{Body:} \\quad T = M\\, e^{[\\mathcal{B}_1]\\theta_1} \\cdots e^{[\\mathcal{B}_n]\\theta_n}."}</Eq>
      <p>
        Structural differences: (1) <M>{"M"}</M> moves from the right to the left. (2) The
        exponentials appear in the same index order <M>{"1, 2, \\ldots, n"}</M>, but now joint{" "}
        <M>{"1"}</M> is innermost (rightmost) and joint <M>{"n"}</M> is outermost (leftmost
        after <M>{"M"}</M>). (3) The screw axes are body-frame rather than space-frame.
      </p>
      <p>
        The two formulas are provably identical for all <M>{"\\theta"}</M>: substituting{" "}
        <M>{"\\mathcal{B}_i = \\mathrm{Ad}_{M^{-1}} \\mathcal{S}_i"}</M> into the body form
        and using the exponential identity{" "}
        <M>{"e^{[\\mathrm{Ad}_T \\mathcal{S}]\\theta} = T\\,e^{[\\mathcal{S}]\\theta}\\,T^{-1}"}</M>{" "}
        makes each factor telescope, and the product reduces to the space form. The widget below
        confirms this numerically.
      </p>

      <SpaceBodySideBySideWidget />

      <H2>URDF: the standard container for FK data</H2>
      <p>
        In ROS-based systems, robots are described using URDF —{" "}
        <strong>Universal Robot Description Format</strong> — an XML file that lists the robot's
        links and joints. URDF is not a new concept; it is a standardised way to store exactly
        the three FK ingredients.
      </p>
      <p>
        Each <code>{"<joint>"}</code> element carries two critical tags:
      </p>
      <p>
        <code>{"<axis xyz=\"0 0 1\"/>"}</code> — the unit direction of the joint axis in the
        parent link's frame. For a joint rotating about <M>{"\\hat{z}"}</M> this is{" "}
        <code>0 0 1</code>. This encodes <M>{"\\hat{\\omega}_i"}</M>.
      </p>
      <p>
        <code>{"<origin xyz=\"L1 0 0\" rpy=\"0 0 0\"/>"}</code> — the position and orientation
        of this joint relative to the previous joint (or the robot base). The{" "}
        <code>xyz</code> attribute gives the offset vector; tracing the chain of offsets from
        base to each joint gives the point <M>{"q_i"}</M> at home. Together these determine
        <M>{"\\mathcal{S}_i"}</M> (or equivalently <M>{"\\mathcal{B}_i"}</M>) via the formulas
        on the previous page.
      </p>
      <p>
        The chain of joint offsets also determines <M>{"M"}</M>: trace the link lengths and
        orientations from base to end-effector, all at zero joint angles, and compose the
        resulting transformations. A URDF parser does this automatically.
      </p>
      <Aside>
        A URDF also stores mass and inertia for dynamics (Chapter 8), visual and collision
        geometry meshes, and joint limits. For forward kinematics only the joint axis tags and
        the offset chain matter.
      </Aside>

      <H2>The library functions</H2>
      <p>
        The Modern Robotics Python library provides two functions implementing the formulas on
        this and the previous page:
      </p>
      <Eq>{"\\texttt{FKinSpace}(M,\\; \\mathcal{S}_{\\rm list},\\; \\theta_{\\rm list}) \\;\\to\\; T(\\theta)"}</Eq>
      <Eq>{"\\texttt{FKinBody}(M,\\; \\mathcal{B}_{\\rm list},\\; \\theta_{\\rm list}) \\;\\to\\; T(\\theta)"}</Eq>
      <p>
        <code>M</code> is the 4×4 home configuration. <code>Slist</code> (or{" "}
        <code>Blist</code>) is a 6×n matrix whose <em>columns</em> are the screw axes. <code>thetalist</code>{" "}
        is the 1D array of joint values. Both functions loop over joints, compute each
        exponential via the closed-form Rodrigues-extended formula, and multiply them together
        with <M>{"M"}</M> appended at the appropriate end. The result is the 4×4 end-effector
        pose <M>{"T(\\theta)"}</M> in O(n) matrix multiplications — fast even for long chains.
      </p>
      <p>
        Numerically, <code>FKinSpace</code> and <code>FKinBody</code> give identical outputs
        (to floating-point precision) for any valid inputs, confirming the algebraic equivalence.
        The choice between them is purely one of which set of axes is more convenient to
        specify for a given robot.
      </p>

      <KeyIdea>
        Body screw: <M>{"\\mathcal{B}_i = \\mathrm{Ad}_{M^{-1}} \\mathcal{S}_i"}</M> — the
        space axis re-expressed in body coordinates at home. Body form:{" "}
        <M>{"T = M\\, e^{[\\mathcal{B}_1]\\theta_1} \\cdots e^{[\\mathcal{B}_n]\\theta_n}"}</M>{" "}
        — same pose as the space form. URDF stores <M>{"\\hat{\\omega}_i"}</M> and the joint
        offset per joint; axis + offset chain determines both <M>{"M"}</M> and all{" "}
        <M>{"\\mathcal{S}_i"}</M>. <code>FKinSpace</code> and <code>FKinBody</code> implement
        the two formulas.
      </KeyIdea>

      <BookRef>Modern Robotics §4.1 — Product of Exponentials, Body Form; §4.2 — Robot Description.</BookRef>
    </div>
  );
}

/* ================= widget: space form vs body form ================= */

function SpaceBodySideBySideWidget() {
  const [t1, setT1] = useState(rad(30));
  const [t2, setT2] = useState(rad(45));
  const [t3, setT3] = useState(rad(-30));
  const [l1, setL1] = useState(0.7);
  const [l2, setL2] = useState(0.5);
  const [l3, setL3] = useState(0.3);
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [wrong, setWrong] = useState(false);

  const S = arm3RScrews(l1, l2);
  const Mh = arm3RHome(l1, l2, l3); // home configuration ("M" shadows the math component)
  const B = S.map(s => adjointApply(se3Inv(Mh), s));
  const thetas = [t1, t2, t3];
  const Tspace = fkSpace(Mh, S, thetas);
  const Tbody = fkBody(Mh, B, thetas);
  const maxDiff = Math.max(
    ...Tspace.R.map((x, i) => Math.abs(x - Tbody.R[i])),
    ...Tspace.p.map((x, i) => Math.abs(x - Tbody.p[i])),
  );

  // changing the geometry invalidates a previously verified prediction
  useEffect(() => {
    setRevealed(false);
    setWrong(false);
  }, [l1, l2, l3]);

  const check = () => {
    const g = parseFloat(guess);
    if (Number.isFinite(g) && Math.abs(g - (l1 + l2 + l3)) < 0.05) {
      setRevealed(true);
      setWrong(false);
    } else {
      setWrong(true);
    }
  };

  return (
    <>
      <WidgetShell
        title="Two formulas, one pose"
        onReset={() => {
          setT1(rad(30)); setT2(rad(45)); setT3(rad(-30));
          setL1(0.7); setL2(0.5); setL3(0.3);
          setGuess(""); setRevealed(false); setWrong(false);
        }}
        caption={
          <>
            The same arm computed two ways. The screw-axis lists look completely different —
            compare <M>{"\\mathcal{S}_3"}</M>'s big lever arm with <M>{"\\mathcal{B}_3"}</M>'s
            small one — yet the two transforms agree to machine precision for every slider
            position. <M>{"\\mathcal{B}_1"}</M> stays hidden until you predict its{" "}
            <M>{"v_y"}</M> entry.
          </>
        }
      >
        <Scene3D height={280} camera={[2.4, 2.1, 2.4]}>
          <Triad ghost colors={GHOST} scale={0.55} />
          <Arm3R lengths={[l1, l2, l3]} thetas={[t1, t2, t3]} />
        </Scene3D>

        <ControlBar>
          <LabeledSlider label="θ₁" value={t1} min={-Math.PI} max={Math.PI} onChange={setT1}
            fmt={v => `${deg(v).toFixed(0)}°`} color={ARM3R_COLORS[0]} width={110} />
          <LabeledSlider label="θ₂" value={t2} min={-Math.PI} max={Math.PI} onChange={setT2}
            fmt={v => `${deg(v).toFixed(0)}°`} color={ARM3R_COLORS[1]} width={110} />
          <LabeledSlider label="θ₃" value={t3} min={-Math.PI} max={Math.PI} onChange={setT3}
            fmt={v => `${deg(v).toFixed(0)}°`} color={ARM3R_COLORS[2]} width={110} />
          <LabeledSlider label="L₁" value={l1} min={0.3} max={0.9} onChange={setL1} width={90} />
          <LabeledSlider label="L₂" value={l2} min={0.3} max={0.9} onChange={setL2} width={90} />
          <LabeledSlider label="L₃" value={l3} min={0.2} max={0.6} onChange={setL3} width={90} />
        </ControlBar>

        <div className="ui flex flex-wrap gap-x-8 gap-y-4 mt-4">
          {/* space form */}
          <div className="flex flex-col gap-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
              Space form &nbsp;<M>{"T = e^{[\\mathcal{S}_1]\\theta_1} e^{[\\mathcal{S}_2]\\theta_2} e^{[\\mathcal{S}_3]\\theta_3} M"}</M>
            </div>
            <SE3Display T={Tspace} highlightP />
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {B.map((_, i) => (
                <Vec6Display
                  key={i}
                  v={S[i]}
                  label={<M>{`\\mathcal{S}_{${i + 1}}`}</M>}
                  topColor={W_COLOR}
                  bottomColor={V_COLOR}
                />
              ))}
            </div>
          </div>

          {/* body form */}
          <div className="flex flex-col gap-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
              Body form &nbsp;<M>{"T = M e^{[\\mathcal{B}_1]\\theta_1} e^{[\\mathcal{B}_2]\\theta_2} e^{[\\mathcal{B}_3]\\theta_3}"}</M>
            </div>
            <SE3Display T={Tbody} highlightP />
            <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
              {revealed ? (
                <Vec6Display
                  v={B[0]}
                  label={<M>{"\\mathcal{B}_1"}</M>}
                  topColor={W_COLOR}
                  bottomColor={V_COLOR}
                />
              ) : (
                <div className="rounded-md border border-dashed border-[#b08c1d] bg-[#fbf7e8] px-2.5 py-2 max-w-[235px]">
                  <div className="text-[13px] mb-1">
                    <M>{"\\mathcal{B}_1 = (0,\\,0,\\,1,\\;\\, 0,\\,?,\\,0)"}</M>
                  </div>
                  <div className="text-[11.5px] text-[var(--ink-faint)] mb-1.5">
                    predict the v<sub>y</sub> entry, then check:
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      value={guess}
                      onChange={e => {
                        setGuess(e.target.value);
                        setWrong(false);
                      }}
                      placeholder="?"
                      className="mono w-[64px] border border-[var(--rule)] rounded px-1.5 py-1 text-[12.5px] bg-white"
                    />
                    <WidgetButton onClick={check}>check</WidgetButton>
                  </div>
                  {wrong && (
                    <div className="text-[11.5px] text-[#c92a2a] mt-1.5">
                      not quite — apply <M>{"\\mathrm{Ad}_{M^{-1}}"}</M> to{" "}
                      <M>{"\\mathcal{S}_1 = (0,0,1,\\,0,0,0)"}</M>
                    </div>
                  )}
                </div>
              )}
              {[1, 2].map(i => (
                <Vec6Display
                  key={i}
                  v={B[i]}
                  label={<M>{`\\mathcal{B}_{${i + 1}}`}</M>}
                  topColor={W_COLOR}
                  bottomColor={V_COLOR}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="ui mt-3">
          <Readout
            label="max |T_space − T_body|"
            value={maxDiff < 1e-12 ? "0" : maxDiff.toExponential(1)}
            color="var(--good)"
          />
        </div>
      </WidgetShell>

      <Challenge id="ch4-poe-body-match" met={revealed}>
        <M>{"\\mathcal{B}_1"}</M> is hidden behind a prediction. Joint 1 sits at the space
        origin, so <M>{"\\mathcal{S}_1"}</M> has <M>{"v = 0"}</M> — but seen from the
        end-effector, joint 1 is far behind. Work out the <M>{"v_y"}</M> entry of{" "}
        <M>{"\\mathcal{B}_1 = \\mathrm{Ad}_{M^{-1}}\\mathcal{S}_1"}</M> from the current link
        lengths (the Aside above walks through it) and type it in. Then drag the sliders and
        confirm the two transforms never disagree.
      </Challenge>
    </>
  );
}
