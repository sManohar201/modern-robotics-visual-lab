import { useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { type Vec3, deg, wrapAngle } from "../../lib/math/vec";
import { Seg, Joint } from "./viz";
import {
  type V2, fourBarPhi, fourBarPoints,
  fiveBar, fiveBarLeftAligned, fiveBarRightAligned, FB5_L,
} from "./mechanism";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const GROUNDc = "#9b968a";
const CRANKc = "#0b7285";
const COUPLERc = "#6741d9";
const ROCKERc = "#c2571c";
const SINGc = "#d9483f";

const S = 0.55; // display scale for the (large) four-bar
const v3 = (p: V2): Vec3 => [p[0] * S, p[1] * S, 0];

export default function Singularities() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 7"
        section="Kinematics of Closed Chains"
        title="Singularities of Closed Chains"
        lede="Closed chains fail in richer ways than open ones. Three distinct singularity types live here: where the configuration space folds on itself, where the actuators lose their grip, and where the end-effector loses a direction of motion."
      />

      <p>
        Open chains had one notion of singularity: a rank drop of the Jacobian. Closed chains split it
        into <strong>three</strong> independent types, and a single mechanism can show all of them at
        different poses. We meet them through two planar linkages.
      </p>

      <H2>Configuration-space singularities: where the C-space self-intersects</H2>
      <p>
        The four-bar linkage has a one-dimensional configuration space — a curve in the{" "}
        <M>{"\\theta"}</M>–<M>{"\\phi"}</M> plane traced by the loop-closure equation
      </p>
      <Eq>{"\\phi = \\operatorname{atan2}(\\beta,\\alpha) \\pm \\cos^{-1}\\!\\Big(\\tfrac{\\gamma}{\\sqrt{\\alpha^2+\\beta^2}}\\Big)."}</Eq>
      <p>
        Where the two branches meet, the curve crosses itself: these are <strong>bifurcation
        points</strong>. Approaching one, the mechanism faces a choice of which branch to follow —
        the constraint Jacobian has dropped rank. A configuration-space singularity is intrinsic to
        the mechanism: it does not care which joints you actuate or where the tool is.
      </p>

      <FourBarWidget />

      <H2>Actuator & end-effector singularities: the five-bar</H2>
      <p>
        The five-bar linkage has a two-dimensional C-space and two actuated joints (the ones fixed to
        ground). Two more singularity types appear, and unlike the configuration-space kind they{" "}
        <em>do</em> depend on your choices:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[1.02rem]">
        <li>
          An <strong>actuator singularity</strong> occurs when the two actuated joints can no longer
          be controlled independently — locking them fails to rigidify the mechanism. Here it happens
          when the two inner links line up. It is characterised by{" "}
          <M>{"\\operatorname{rank} H_p < p"}</M>, and crucially it depends on <em>which</em> joints
          are actuated — relocating an actuator removes it.
        </li>
        <li>
          An <strong>end-effector singularity</strong> occurs when a leg straightens into an aligned
          2R chain, so the end-effector loses a direction of motion — just like an open-chain
          singularity. It depends on the tool frame but not on the actuator choice.
        </li>
      </ul>

      <FiveBarWidget />

      <KeyIdea>
        Closed-chain singularities come in three kinds. <strong>Configuration-space</strong>
        singularities are self-intersections of the C-space (bifurcation points), independent of
        actuation and tool. <strong>Actuator</strong> singularities (<M>{"\\operatorname{rank}H_p<p"}</M>)
        depend on which joints are driven. <strong>End-effector</strong> singularities depend on the
        tool frame but not the actuators. The configuration-space type is the intersection of all
        actuator singularities over every possible choice of actuated joints.
      </KeyIdea>

      <BookRef>Modern Robotics §7.3 — Singularities of closed chains: configuration-space, actuator, and end-effector types.</BookRef>
    </div>
  );
}

/* ============================ four-bar ============================ */

function FourBarWidget() {
  const [theta, setTheta] = useState(1.2);
  const [branch, setBranch] = useState<0 | 1>(0);

  const phis = fourBarPhi(theta);
  const feasible = phis.length === 2;
  const dPhi = feasible ? Math.abs(wrapAngle(phis[0] - phis[1])) : 9;
  const atBifurcation = feasible && dPhi < 0.12;
  const pts = fourBarPoints(theta, branch);

  return (
    <>
      <WidgetShell
        title="Four-bar linkage and its C-space curve"
        onReset={() => { setTheta(1.2); setBranch(0); }}
        caption={
          <>
            Left: the four-bar at input angle <M>{"\\theta"}</M> — input crank (teal), coupler
            (purple), output crank (orange), ground (grey). Right: its configuration space, the set of
            consistent <M>{"(\\theta,\\phi)"}</M> pairs. The two branches meet at the red{" "}
            <strong>bifurcation points</strong>; the gold dot is the current state. Drive <M>{"\\theta"}</M>{" "}
            toward a crossing and the two output solutions collapse into one.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={340} camera={[1.1, 6.4, 3.2]}>
              <Triad ghost colors={GHOST} scale={0.4} />
              {pts && (
                <>
                  <Seg a={v3(pts.O0)} b={v3(pts.O1)} color={GROUNDc} width={2} />
                  <Seg a={v3(pts.O0)} b={v3(pts.P)} color={CRANKc} width={4} />
                  <Seg a={v3(pts.P)} b={v3(pts.Q)} color={atBifurcation ? SINGc : COUPLERc} width={4} />
                  <Seg a={v3(pts.O1)} b={v3(pts.Q)} color={ROCKERc} width={4} />
                  <Joint p={v3(pts.O0)} color={GROUNDc} r={0.08} />
                  <Joint p={v3(pts.O1)} color={GROUNDc} r={0.08} />
                  <Joint p={v3(pts.P)} color="#33343d" r={0.07} />
                  <Joint p={v3(pts.Q)} color="#33343d" r={0.07} />
                </>
              )}
            </Scene3D>
          </div>
          <div className="md:w-[300px] flex flex-col items-center justify-center gap-2">
            <CSpacePlot theta={theta} phis={phis} />
            <div className="ui flex flex-col gap-1.5 items-center">
              <Readout label="Δφ between branches" value={feasible ? dPhi.toFixed(2) : "—"} color={atBifurcation ? SINGc : undefined} />
              <Readout label="status" value={atBifurcation ? "bifurcation!" : feasible ? "two branches" : "infeasible"} color={atBifurcation ? SINGc : undefined} />
              <div className="flex gap-2 mt-1">
                <WidgetButton onClick={() => setBranch(0)} active={branch === 0}>branch +</WidgetButton>
                <WidgetButton onClick={() => setBranch(1)} active={branch === 1}>branch −</WidgetButton>
              </div>
            </div>
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="θ" value={theta} min={0} max={2 * Math.PI} onChange={setTheta} fmt={v => `${deg(v).toFixed(0)}°`} width={260} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch7-fourbar-bifurcation" met={atBifurcation}>
        Slide <M>{"\\theta"}</M> to a <strong>bifurcation point</strong> (near{" "}
        <M>{"\\theta=0^\\circ"}</M> or <M>{"180^\\circ"}</M>), where the two output branches merge and{" "}
        <M>{"\\Delta\\phi\\to 0"}</M>. That merge is a configuration-space singularity — the constraint
        Jacobian has lost rank and the linkage can switch branches.
      </Challenge>
    </>
  );
}

/** SVG plot of the four-bar C-space: both φ branches over θ, with bifurcations. */
function CSpacePlot({ theta, phis }: { theta: number; phis: number[] }) {
  const W = 280, H = 240, pad = 30;
  const x = (t: number) => pad + (t / (2 * Math.PI)) * (W - 2 * pad);
  const wrap2pi = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const y = (p: number) => pad + (1 - wrap2pi(p) / (2 * Math.PI)) * (H - 2 * pad);

  const samples = Array.from({ length: 241 }, (_, i) => (i * 2 * Math.PI) / 240);
  const dots: { cx: number; cy: number; b: number }[] = [];
  for (const t of samples) {
    const ph = fourBarPhi(t);
    ph.forEach((p, b) => dots.push({ cx: x(t), cy: y(p), b }));
  }
  // bifurcations at theta = 0 and pi for this parallelogram linkage
  const bif = [0, Math.PI].map(t => {
    const ph = fourBarPhi(t);
    return ph.length ? { cx: x(t), cy: y(ph[0]) } : null;
  }).filter(Boolean) as { cx: number; cy: number }[];

  return (
    <svg width={W} height={H} className="rounded-lg bg-[#f4f2ec] border border-[var(--rule)]">
      {/* axes */}
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#c9c4b6" strokeWidth={1} />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#c9c4b6" strokeWidth={1} />
      <text x={W / 2} y={H - 6} fontSize="11" fill="#8a8a9b" textAnchor="middle" fontFamily="Inter, sans-serif">θ</text>
      <text x={10} y={H / 2} fontSize="11" fill="#8a8a9b" textAnchor="middle" fontFamily="Inter, sans-serif">φ</text>
      {/* curve */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={1.5} fill={d.b === 0 ? "#0b7285" : "#c2571c"} opacity={0.7} />
      ))}
      {/* bifurcation markers */}
      {bif.map((b, i) => (
        <circle key={`b${i}`} cx={b.cx} cy={b.cy} r={5} fill="none" stroke={SINGc} strokeWidth={2} />
      ))}
      {/* current state */}
      {phis.map((p, i) => (
        <circle key={`c${i}`} cx={x(theta)} cy={y(p)} r={4} fill="#caa53d" stroke="#7a6516" strokeWidth={1} />
      ))}
    </svg>
  );
}

/* ============================ five-bar ============================ */

function FiveBarWidget() {
  const [a1, setA1] = useState(0.93);
  const [b1, setB1] = useState(1.3);
  const [branch, setBranch] = useState<0 | 1>(0);

  const fb = fiveBar(a1, b1, branch);
  const feasible = fb !== null;

  // actuator singularity: the two inner links E1→C and E2→C are colinear.
  let innerCross = 9, leftAl = 9, rightAl = 9;
  if (fb) {
    const v1: V2 = [fb.C[0] - fb.E1[0], fb.C[1] - fb.E1[1]];
    const v2: V2 = [fb.E2[0] - fb.C[0], fb.E2[1] - fb.C[1]];
    innerCross = Math.abs(v1[0] * v2[1] - v1[1] * v2[0]);
    leftAl = fiveBarLeftAligned(fb);
    rightAl = fiveBarRightAligned(fb);
  }
  const actuatorSing = feasible && innerCross < 0.04;
  const eeSing = feasible && (leftAl < 0.04 || rightAl < 0.04);
  const met = actuatorSing || eeSing;

  const legColor = (aligned: boolean) => (aligned ? SINGc : CRANKc);

  return (
    <>
      <WidgetShell
        title="Five-bar: actuator and end-effector singularities"
        onReset={() => { setA1(0.93); setB1(1.3); setBranch(0); }}
        caption={
          <>
            Two ground-fixed actuated joints (grey pins) drive four unit links meeting at the central
            joint <M>{"C"}</M> (the end-effector). When the two <em>inner</em> links align, the
            actuators lose independent control — an <strong>actuator singularity</strong>. When one
            leg straightens fully (proximal + distal colinear), the tool loses a motion direction — an{" "}
            <strong>end-effector singularity</strong>. Links turn red as they align.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={360} camera={[0.8, 5.6, 3.0]}>
              <Triad ghost colors={GHOST} scale={0.4} />
              {fb && (
                <>
                  {/* ground link */}
                  <Seg a={[fb.G0[0], fb.G0[1], 0]} b={[fb.G1[0], fb.G1[1], 0]} color={GROUNDc} width={2} />
                  {/* left leg: G0->E1 (proximal, actuated), E1->C (distal) */}
                  <Seg a={[fb.G0[0], fb.G0[1], 0]} b={[fb.E1[0], fb.E1[1], 0]} color={legColor(eeSing && leftAl < 0.04)} width={4} />
                  <Seg a={[fb.E1[0], fb.E1[1], 0]} b={[fb.C[0], fb.C[1], 0]} color={legColor(actuatorSing || (eeSing && leftAl < 0.04))} width={4} />
                  {/* right leg: G1->E2 (proximal, actuated), E2->C (distal) */}
                  <Seg a={[fb.G1[0], fb.G1[1], 0]} b={[fb.E2[0], fb.E2[1], 0]} color={legColor(eeSing && rightAl < 0.04)} width={4} />
                  <Seg a={[fb.E2[0], fb.E2[1], 0]} b={[fb.C[0], fb.C[1], 0]} color={legColor(actuatorSing || (eeSing && rightAl < 0.04))} width={4} />
                  {/* joints */}
                  <Joint p={[fb.G0[0], fb.G0[1], 0]} color={GROUNDc} r={0.08} />
                  <Joint p={[fb.G1[0], fb.G1[1], 0]} color={GROUNDc} r={0.08} />
                  <Joint p={[fb.E1[0], fb.E1[1], 0]} color="#33343d" r={0.06} />
                  <Joint p={[fb.E2[0], fb.E2[1], 0]} color="#33343d" r={0.06} />
                  <Joint p={[fb.C[0], fb.C[1], 0]} color={COUPLERc} r={0.08} />
                </>
              )}
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2 md:w-[230px]">
            <Readout label="inner-link alignment" value={feasible ? innerCross.toFixed(3) : "—"} color={actuatorSing ? SINGc : undefined} />
            <Readout label="actuator singularity" value={actuatorSing ? "YES" : "no"} color={actuatorSing ? SINGc : "var(--ink-faint)"} />
            <Readout label="end-effector singularity" value={eeSing ? "YES" : "no"} color={eeSing ? SINGc : "var(--ink-faint)"} />
            <div className="flex gap-2 mt-1">
              <WidgetButton onClick={() => setBranch(0)} active={branch === 0}>up</WidgetButton>
              <WidgetButton onClick={() => setBranch(1)} active={branch === 1}>down</WidgetButton>
            </div>
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="θ₁ (left)" value={a1} min={0.2} max={Math.PI - 0.2} onChange={setA1} fmt={v => `${deg(v).toFixed(0)}°`} width={180} />
          <LabeledSlider label="θ₂ (right)" value={b1} min={0.2} max={Math.PI - 0.2} onChange={setB1} fmt={v => `${deg(v).toFixed(0)}°`} width={180} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch7-fivebar-singularity" met={met}>
        Drive the five-bar into a singularity — line up the two inner links for an{" "}
        <strong>actuator singularity</strong> (try <M>{"\\theta_1\\approx 53^\\circ"}</M>,{" "}
        <M>{"\\theta_2\\approx 20^\\circ"}</M>), or straighten one leg for an{" "}
        <strong>end-effector singularity</strong>. The aligned links flash red. Relocating an actuator
        would remove the actuator type but never the end-effector one.
      </Challenge>
    </>
  );
}
