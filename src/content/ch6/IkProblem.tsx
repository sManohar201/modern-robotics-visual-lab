import { useMemo, useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { SpatialArm, armState } from "../../components/three/SpatialArm";
import { type Vec3, deg } from "../../lib/math/vec";
import { P2R_JOINTS, P2R_M, L2R, ik2R } from "./arm";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const GOLD = "#caa53d";
const BAD = "#d9483f";
const LEFTY = "#0b7285";
const RIGHTY = "#c2571c";
const RIN = Math.abs(L2R[0] - L2R[1]);
const ROUT = L2R[0] + L2R[1];

function skeleton(thetas: number[]): Vec3[] {
  const st = armState(P2R_JOINTS, P2R_M, thetas);
  return [...st.pivots, [st.ee.p[0], st.ee.p[1], st.ee.p[2]]];
}

function circle(r: number, z = 0, n = 96): Vec3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [r * Math.cos(a), r * Math.sin(a), z] as Vec3;
  });
}

/** A dimmed wire arm for the non-selected solution. */
function GhostArm({ thetas, color }: { thetas: number[]; color: string }) {
  const pts = skeleton(thetas);
  return (
    <>
      <Line points={pts} color={color} lineWidth={2.5} transparent opacity={0.55} />
      {pts.slice(0, -1).map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.05, 14, 14]} />
          <meshStandardMaterial color={color} transparent opacity={0.6} />
        </mesh>
      ))}
    </>
  );
}

export default function IkProblem() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 6"
        section="Inverse Kinematics"
        title="The IK Problem: Many Answers, or None"
        lede="Forward kinematics has exactly one answer; inverse kinematics may have several, or none. Even the humble two-link arm already shows the whole story — a reachable workspace, and a fork between elbow-up and elbow-down."
      />

      <p>
        Forward kinematics took joint angles to a unique pose, <M>{"T(\\theta)"}</M>. The inverse
        problem runs the other way: given a desired end-effector configuration{" "}
        <M>{"X \\in SE(3)"}</M>, find every <M>{"\\theta"}</M> with <M>{"T(\\theta) = X"}</M>. Now the
        answer can be a whole <em>set</em> — or empty.
      </p>
      <p>
        Take the planar 2R arm, looking only at the tip position. Its forward kinematics is
      </p>
      <Eq>{"\\begin{bmatrix} x \\\\ y \\end{bmatrix} = \\begin{bmatrix} L_1\\cos\\theta_1 + L_2\\cos(\\theta_1+\\theta_2) \\\\ L_1\\sin\\theta_1 + L_2\\sin(\\theta_1+\\theta_2) \\end{bmatrix}."}</Eq>
      <p>
        The reachable points form an <strong>annulus</strong> with inner radius{" "}
        <M>{"|L_1 - L_2|"}</M> and outer radius <M>{"L_1 + L_2"}</M>. A target in the interior has{" "}
        <strong>two</strong> solutions (elbow-up and elbow-down, a.k.a. lefty and righty); on either
        boundary circle the two collapse to <strong>one</strong>; outside the annulus there are{" "}
        <strong>none</strong>.
      </p>

      <H2>Drag the target through the workspace</H2>
      <p>
        Move the goal around. When it lies inside the annulus the arm shows both ways to reach it;
        on the outer rim the elbow straightens and the two solutions merge; push past the rim and the
        target turns red — unreachable.
      </p>

      <ReachWidget />

      <Aside>
        The geometric solution uses the law of cosines for the interior angle{" "}
        <M>{"\\beta"}</M> and <M>{"\\alpha"}</M>, plus the four-quadrant arctangent{" "}
        <M>{"\\gamma=\\operatorname{atan2}(y,x)"}</M>: the righty solution is{" "}
        <M>{"\\theta_1=\\gamma-\\alpha,\\ \\theta_2=\\pi-\\beta"}</M> and the lefty is{" "}
        <M>{"\\theta_1=\\gamma+\\alpha,\\ \\theta_2=\\beta-\\pi"}</M>.
      </Aside>

      <p>
        Add a third link and the same target in the interior can be reached infinitely many ways: a
        planar 3R arm is <strong>kinematically redundant</strong>, with an extra freedom to spare.
        That surplus is the subject of the velocity and redundancy pages later in this chapter. First,
        though, two ways to actually <em>solve</em> the inverse problem: in closed form for special
        geometries, and numerically for everything else.
      </p>

      <KeyIdea>
        Inverse kinematics maps a pose to a <em>set</em> of joint solutions. For the 2R arm it is
        two inside the workspace annulus, one on a boundary circle, and none outside. Multiplicity and
        non-existence — never present in forward kinematics — are the defining features of IK.
      </KeyIdea>

      <BookRef>Modern Robotics §6 (intro) — Inverse kinematics of a 2R planar open chain.</BookRef>
    </div>
  );
}

function ReachWidget() {
  const [reach, setReach] = useState(1.3);
  const [ang, setAng] = useState(0.6);
  const [sel, setSel] = useState<0 | 1>(0);

  const target: Vec3 = [reach * Math.cos(ang), reach * Math.sin(ang), 0];
  const sols = useMemo(() => ik2R(target[0], target[1]), [target[0], target[1]]);
  const reachable = sols.length > 0;
  // single solution ⇔ on a boundary circle ⇔ elbow essentially straight or folded
  const single = reachable && sols.every(s => Math.abs(s[1]) < 0.12 || Math.abs(Math.abs(s[1]) - Math.PI) < 0.12);
  const met = reachable && Math.abs(reach - ROUT) < 0.04; // pushed out to the OUTER rim (arm straight)

  const selSol = sols[sel] ?? sols[0];
  const otherSol = sols[1 - sel];

  return (
    <>
      <WidgetShell
        title="Two solutions, one, or none"
        onReset={() => { setReach(1.3); setAng(0.6); setSel(0); }}
        caption={
          <>
            The gold dot is the target. The solid arm is the selected solution; the faint wire arm is
            the other one. The grey ring is the reachable annulus (inner radius{" "}
            <M>{"|L_1-L_2|=0.4"}</M>, outer <M>{"L_1+L_2=2"}</M>). Slide the target onto the outer rim
            and the two solutions fuse into a single straight-arm posture.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={380} camera={[1.4, 5.0, 3.6]}>
              <Triad ghost colors={GHOST} scale={0.5} />
              {/* workspace annulus */}
              <Line points={circle(ROUT)} color="#9b968a" lineWidth={1.6} />
              <Line points={circle(RIN)} color="#bdb8ab" lineWidth={1.3} dashed dashSize={0.08} gapSize={0.06} />
              {/* target */}
              <mesh position={target}>
                <sphereGeometry args={[0.08, 18, 18]} />
                <meshStandardMaterial color={reachable ? GOLD : BAD} />
              </mesh>
              {reachable && (
                <>
                  <SpatialArm joints={P2R_JOINTS} M={P2R_M} thetas={selSol} eeTriadScale={0} linkColors={[sel === 0 ? LEFTY : RIGHTY, sel === 0 ? LEFTY : RIGHTY]} />
                  {otherSol && <GhostArm thetas={otherSol} color={sel === 0 ? RIGHTY : LEFTY} />}
                </>
              )}
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2.5 md:w-[230px]">
            <Readout
              label="# solutions"
              value={reachable ? (single ? "1 (boundary)" : "2") : "0 (unreachable)"}
              color={reachable ? (single ? GOLD : "var(--good)") : BAD}
            />
            <Readout label="target radius" value={reach.toFixed(2)} />
            {reachable && selSol && (
              <>
                <Readout label="θ₁" value={`${deg(selSol[0]).toFixed(0)}°`} />
                <Readout label="θ₂ (elbow)" value={`${deg(selSol[1]).toFixed(0)}°`} color={selSol[1] >= 0 ? LEFTY : RIGHTY} />
              </>
            )}
            <div className="flex gap-2 mt-1">
              <WidgetButton onClick={() => setSel(0)} active={sel === 0}>solution A</WidgetButton>
              <WidgetButton onClick={() => setSel(1)} active={sel === 1} disabled={!otherSol}>solution B</WidgetButton>
            </div>
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="reach" value={reach} min={0} max={2.3} onChange={setReach} fmt={v => v.toFixed(2)} width={170} />
          <LabeledSlider label="angle" value={ang} min={-Math.PI} max={Math.PI} onChange={setAng} fmt={v => `${deg(v).toFixed(0)}°`} width={170} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch6-ik-boundary" met={met}>
        Push the target out to the workspace boundary (radius <M>{"L_1+L_2=2"}</M>). Right at the rim
        the elbow-up and elbow-down solutions merge into a single straight-arm posture — the only
        place in the interior-or-boundary where IK has exactly one answer.
      </Challenge>
    </>
  );
}
