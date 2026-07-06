import { useMemo, useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { SpatialArm, armState } from "../../components/three/SpatialArm";
import { type Vec3, deg } from "../../lib/math/vec";
import {
  PUMA_JOINTS, PUMA_M, pumaPosIk,
  STANFORD_JOINTS, STANFORD_M, stanfordPosIk,
} from "./arm";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const GOLD = "#caa53d";
const SEL = "#6741d9";
const SHOULDER: Vec3 = [0, 0, 1];


function skeleton(joints: typeof PUMA_JOINTS, Mp: typeof PUMA_M, thetas: number[]): Vec3[] {
  const st = armState(joints, Mp, thetas);
  return [...st.pivots, [st.ee.p[0], st.ee.p[1], st.ee.p[2]]];
}

function GhostArm({ pts, color }: { pts: Vec3[]; color: string }) {
  return (
    <>
      <Line points={pts} color={color} lineWidth={2.2} transparent opacity={0.4} />
      {pts.slice(0, -1).map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color={color} transparent opacity={0.45} />
        </mesh>
      ))}
    </>
  );
}

function circle(center: Vec3, r: number, n = 64): Vec3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [center[0] + r * Math.cos(a), center[1] + r * Math.sin(a), center[2]] as Vec3;
  });
}

export default function AnalyticPuma() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 6"
        section="Inverse Kinematics"
        title="Analytic IK: Decoupling the PUMA Wrist"
        lede="When the last three axes meet at a point, the 6R inverse kinematics splits cleanly in two — first place the wrist center with the arm, then orient the tool with the wrist. Position alone already gives four ways to reach a point."
      />

      <p>
        For special geometries the inverse kinematics has a closed form. The classic case is the{" "}
        <strong>PUMA-type 6R arm</strong>: a 2R shoulder and an elbow position the wrist, and a 3R
        orthogonal wrist whose axes intersect at a single point — the <em>wrist center</em> — sets the
        orientation. Because moving the wrist joints does not move that center, the problem{" "}
        <strong>decouples</strong>:
      </p>
      <Eq>{"\\underbrace{(\\theta_1,\\theta_2,\\theta_3)}_{\\text{place wrist center}} \\;\\longrightarrow\\; \\underbrace{(\\theta_4,\\theta_5,\\theta_6)}_{\\text{orient tool}}."}</Eq>
      <p>
        First solve inverse <em>position</em> for the wrist center, then inverse{" "}
        <em>orientation</em> for the tool. Here we focus on the position half — the yaw–pitch–pitch
        arm that carries the wrist — because that is where the geometric multiplicity lives.
      </p>

      <H2>Four ways to reach a point</H2>
      <p>
        The base joint has two choices, <M>{"\\theta_1=\\operatorname{atan2}(p_y,p_x)"}</M> or that
        plus <M>{"\\pi"}</M> (reach forward or fold back), and the elbow has two,{" "}
        <strong>elbow-up</strong> and <strong>elbow-down</strong>. Two times two gives the four
        inverse-position solutions. The elbow angle comes straight from the law of cosines,{" "}
        <M>{"\\cos\\theta_3 = D"}</M> with <M>{"\\theta_3=\\operatorname{atan2}(\\pm\\sqrt{1-D^2},D)"}</M>,
        the <M>{"\\pm"}</M> being exactly elbow-up versus elbow-down.
      </p>
      <p>
        One geometry is special. When the wrist center sits directly above the base, on the{" "}
        <M>{"\\hat z_0"}</M>-axis, <M>{"\\operatorname{atan2}(p_y,p_x)"}</M> is undefined — every base
        angle works and the arm has <strong>infinitely many</strong> solutions. That is the{" "}
        <strong>shoulder singularity</strong>. Move the target through the workspace, step through the
        postures, and drive it onto the axis to watch the count jump to "∞".
      </p>

      <PumaWidget />

      <Aside>
        The orientation half then solves{" "}
        <M>{"\\mathrm{Rot}(\\hat z,\\theta_4)\\mathrm{Rot}(\\hat y,\\theta_5)\\mathrm{Rot}(\\hat x,\\theta_6)=R"}</M>{" "}
        for the leftover rotation <M>{"R = e^{-[\\mathcal S_3]\\theta_3}\\cdots e^{-[\\mathcal S_1]\\theta_1}XM^{-1}"}</M>{" "}
        — exactly the ZYX Euler angles. Each of the four position solutions carries its own wrist
        triple, so a PUMA generically has up to eight full inverse-kinematics solutions.
      </Aside>

      <H2>Swap the elbow for a slide: the Stanford arm</H2>
      <p>
        Replace the revolute elbow with a <strong>prismatic</strong> joint and you get the
        RRPRRP Stanford-type arm. The same decoupling applies; the elbow's "up/down" pair is replaced
        by the single extension distance <M>{"\\theta_3=\\sqrt{r^2+s^2}-a_2"}</M>, leaving two
        solutions from the base flip alone.
      </p>

      <StanfordWidget />

      <KeyIdea>
        A wrist whose three axes meet at a point decouples 6R inverse kinematics into inverse-position
        then inverse-orientation. The PUMA's position problem has four solutions (base flip × elbow
        up/down), degenerating to infinitely many at the shoulder singularity; the Stanford arm trades
        the elbow pair for a prismatic extension.
      </KeyIdea>

      <BookRef>Modern Robotics §6.1 — Analytic Inverse Kinematics (PUMA & Stanford arms).</BookRef>
    </div>
  );
}

/* ============================ PUMA widget ============================ */

function PumaWidget() {
  const [az, setAz] = useState(0.5);
  const [reach, setReach] = useState(1.25);
  const [hgt, setHgt] = useState(1.4);
  const [sel, setSel] = useState(0);

  const target: Vec3 = [reach * Math.cos(az), reach * Math.sin(az), hgt];
  const sols = useMemo(() => pumaPosIk(target), [target[0], target[1], target[2]]);
  const dShoulder = Math.hypot(reach, hgt - 1);
  const singular = reach < 0.12 && dShoulder <= 2.0 + 1e-6;
  const idx = Math.min(sel, Math.max(0, sols.length - 1));
  const cur = sols[idx];

  return (
    <>
      <WidgetShell
        title="The four inverse-position solutions"
        onReset={() => { setAz(0.5); setReach(1.25); setHgt(1.4); setSel(0); }}
        caption={
          <>
            The gold dot is the desired wrist center; the purple arm is the selected solution and the
            faint arms are the others. The shoulder sits on the vertical axis (grey). Drag the target
            and step through the postures — generically four, fewer near the workspace boundary, and
            infinitely many when the target lies on the axis.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={400} camera={[3.8, 3.0, 3.8]}>
              <Triad ghost colors={GHOST} scale={0.6} />
              {/* base axis */}
              <Line points={[[0, 0, -0.2], [0, 0, 2.2]]} color="#b9b5a8" lineWidth={1.4} dashed dashSize={0.08} gapSize={0.06} />
              <mesh position={SHOULDER}><sphereGeometry args={[0.05, 14, 14]} /><meshStandardMaterial color="#8d8d99" /></mesh>
              {/* target */}
              <mesh position={target}><sphereGeometry args={[0.085, 18, 18]} /><meshStandardMaterial color={GOLD} /></mesh>
              {/* free-rotation ring at the singularity */}
              {singular && <Line points={circle([0, 0, hgt], 0.5)} color={GOLD} lineWidth={2} />}
              {/* ghosts */}
              {sols.map((s, i) => (i === idx ? null : <GhostArm key={i} pts={skeleton(PUMA_JOINTS, PUMA_M, s)} color="#9a8fb8" />))}
              {/* selected */}
              {cur && <SpatialArm joints={PUMA_JOINTS} M={PUMA_M} thetas={cur} eeTriadScale={0.32} linkColors={[SEL, SEL, SEL]} />}
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2.5 md:w-[230px]">
            <Readout label="# solutions" value={singular ? "∞ (singular)" : String(sols.length)} color={singular ? GOLD : sols.length === 4 ? "var(--good)" : undefined} />
            <Readout label="dist to shoulder" value={dShoulder.toFixed(2)} color={dShoulder > 2 ? "#d9483f" : undefined} />
            {cur && (
              <div className="flex flex-col gap-1">
                <Readout label="θ₁" value={`${deg(cur[0]).toFixed(0)}°`} />
                <Readout label="θ₂" value={`${deg(cur[1]).toFixed(0)}°`} />
                <Readout label="θ₃ (elbow)" value={`${deg(cur[2]).toFixed(0)}°`} color={SEL} />
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {sols.map((_, i) => (
                <WidgetButton key={i} onClick={() => setSel(i)} active={i === idx}>{`#${i + 1}`}</WidgetButton>
              ))}
            </div>
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="azimuth" value={az} min={-Math.PI} max={Math.PI} onChange={setAz} fmt={v => `${deg(v).toFixed(0)}°`} width={150} />
          <LabeledSlider label="reach" value={reach} min={0} max={2.0} onChange={setReach} fmt={v => v.toFixed(2)} width={150} />
          <LabeledSlider label="height" value={hgt} min={-0.4} max={2.6} onChange={setHgt} fmt={v => v.toFixed(2)} width={150} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch6-puma-singularity" met={singular}>
        Drive the target onto the base axis (horizontal <em>reach</em> <M>{"\\to 0"}</M>, staying in
        reach of the shoulder). There the base angle <M>{"\\theta_1"}</M> is undefined and the arm can
        face any direction — the inverse-position solution count jumps to infinity. This is the
        shoulder singularity.
      </Challenge>
    </>
  );
}

/* ========================== Stanford widget ========================== */

function StanfordWidget() {
  const [az, setAz] = useState(0.4);
  const [reach, setReach] = useState(1.2);
  const [hgt, setHgt] = useState(1.5);
  const [sel, setSel] = useState(0);

  const target: Vec3 = [reach * Math.cos(az), reach * Math.sin(az), hgt];
  const sols = useMemo(() => stanfordPosIk(target), [target[0], target[1], target[2]]);
  const idx = Math.min(sel, Math.max(0, sols.length - 1));
  const cur = sols[idx];

  return (
    <WidgetShell
      title="Stanford-type arm: a prismatic elbow"
      onReset={() => { setAz(0.4); setReach(1.2); setHgt(1.5); setSel(0); }}
      caption={
        <>
          Same yaw and shoulder pitch, but the third joint is a sliding rail (its extension is the
          dark segment). The base flip gives the two solutions; the elbow up/down ambiguity is gone
          because the slide can only lengthen.
        </>
      }
    >
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1 min-w-0">
          <Scene3D height={380} camera={[3.8, 3.0, 3.8]}>
            <Triad ghost colors={GHOST} scale={0.6} />
            <Line points={[[0, 0, -0.2], [0, 0, 2.2]]} color="#b9b5a8" lineWidth={1.4} dashed dashSize={0.08} gapSize={0.06} />
            <mesh position={target}><sphereGeometry args={[0.085, 18, 18]} /><meshStandardMaterial color={GOLD} /></mesh>
            {sols.map((s, i) => (i === idx ? null : <GhostArm key={i} pts={skeleton(STANFORD_JOINTS, STANFORD_M, s)} color="#9a8fb8" />))}
            {cur && <SpatialArm joints={STANFORD_JOINTS} M={STANFORD_M} thetas={cur} eeTriadScale={0.32} linkColors={["#0b7285", "#0b7285", "#2f9e44"]} />}
          </Scene3D>
        </div>
        <div className="ui flex flex-col justify-center gap-2.5 md:w-[230px]">
          <Readout label="# solutions" value={String(sols.length)} color={sols.length === 2 ? "var(--good)" : undefined} />
          {cur && (
            <div className="flex flex-col gap-1">
              <Readout label="θ₁" value={`${deg(cur[0]).toFixed(0)}°`} />
              <Readout label="θ₂" value={`${deg(cur[1]).toFixed(0)}°`} />
              <Readout label="extension" value={cur[2].toFixed(2)} color="#2f9e44" />
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {sols.map((_, i) => (
              <WidgetButton key={i} onClick={() => setSel(i)} active={i === idx}>{`#${i + 1}`}</WidgetButton>
            ))}
          </div>
        </div>
      </div>

      <ControlBar>
        <LabeledSlider label="azimuth" value={az} min={-Math.PI} max={Math.PI} onChange={setAz} fmt={v => `${deg(v).toFixed(0)}°`} width={150} />
        <LabeledSlider label="reach" value={reach} min={0.2} max={2.4} onChange={setReach} fmt={v => v.toFixed(2)} width={150} />
        <LabeledSlider label="height" value={hgt} min={-0.4} max={2.8} onChange={setHgt} fmt={v => v.toFixed(2)} width={150} />
      </ControlBar>
    </WidgetShell>
  );
}
