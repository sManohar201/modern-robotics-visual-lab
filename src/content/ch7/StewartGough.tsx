import { useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { type Vec3, type Mat3, deg, mat3Trace } from "../../lib/math/vec";
import { Joint, Poly, Seg } from "./viz";
import { SG_A, SG_HOME_H, sgPlatformPt, sgLegs, rotZYX } from "./mechanism";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const BASEc = "#9b968a";
const PLATc = "#6741d9";
const LEGc = "#0b7285";

const LEGCOLORS = ["#0b7285", "#1864ab", "#c2571c", "#a61e4d", "#2f9e44", "#9c6b16"];

export default function StewartGough() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 7"
        section="Kinematics of Closed Chains"
        title="The Stewart–Gough Platform"
        lede="Six legs, six actuators, six degrees of freedom: the spatial workhorse of parallel mechanisms. Its inverse kinematics is six independent square roots — which is exactly why it makes such a stiff, fast motion platform and force sensor."
      />

      <p>
        The <strong>Stewart–Gough platform</strong> is the spatial cousin of the 3×RPR: a fixed base
        and a moving platform joined by six legs, each a spherical joint, an actuated prismatic
        slider, and another spherical joint (the <strong>6×SPS</strong> design). Six legs drive all
        six degrees of freedom of the moving platform.
      </p>
      <p>
        The loop closure is the spatial version of before. With <M>{"p\\in\\mathbb R^3"}</M> the
        platform origin and <M>{"R\\in SO(3)"}</M> its orientation, leg <M>{"i"}</M> runs from base
        anchor <M>{"a_i"}</M> to platform anchor <M>{"b_i"}</M>:
      </p>
      <Eq>{"d_i = p + R\\,b_i - a_i, \\qquad s_i = \\lVert d_i\\rVert = \\sqrt{(p + R b_i - a_i)^{\\mathsf T}(p + R b_i - a_i)}."}</Eq>
      <p>
        Given the platform pose <M>{"(R,p)"}</M>, each of the six leg lengths is again an independent,
        single-valued square root — the <strong>inverse kinematics is trivial and unique</strong>.
        Tilt, twist, and slide the platform below; all six actuator lengths update live.
      </p>

      <SgWidget />

      <Aside>
        The forward kinematics — recover <M>{"(R,p)"}</M> from the six lengths — is the hard one: six
        length constraints plus the six independent entries of <M>{"R^{\\mathsf T}R=I"}</M> form a{" "}
        12-equation system whose general solution can have up to <strong>40</strong> real assemblies.
        That asymmetry is the whole personality of a parallel mechanism: easy to <em>command</em>,
        hard to <em>predict</em> from raw joint readings.
      </Aside>

      <KeyIdea>
        The Stewart–Gough platform drives six platform degrees of freedom with six prismatic legs.
        Inverse kinematics is six independent norms <M>{"s_i=\\lVert p+Rb_i-a_i\\rVert"}</M>; the
        forward kinematics is a 12-equation system with up to forty solutions. Its closed-loop
        stiffness is what makes it a precise motion simulator and six-axis force sensor.
      </KeyIdea>

      <BookRef>Modern Robotics §7.1.2 — Inverse and forward kinematics of the Stewart–Gough platform.</BookRef>
    </div>
  );
}

function SgWidget() {
  const [x, setX] = useState(0.0);
  const [y, setY] = useState(0.0);
  const [z, setZ] = useState(SG_HOME_H);
  const [yaw, setYaw] = useState(0.0);
  const [pitch, setPitch] = useState(0.0);
  const [roll, setRoll] = useState(0.0);

  const p: Vec3 = [x, y, z];
  const R: Mat3 = rotZYX(yaw, pitch, roll);
  const legs = sgLegs(p, R);
  const B: Vec3[] = [0, 1, 2, 3, 4, 5].map(i => sgPlatformPt(p, R, i));
  const A3 = SG_A;

  // overall rotation angle of R (deg) — for the tilt challenge
  const tiltAngle = deg(Math.acos(Math.max(-1, Math.min(1, (mat3Trace(R) - 1) / 2))));
  const met = tiltAngle > 15;

  return (
    <>
      <WidgetShell
        title="Six legs, six degrees of freedom — inverse kinematics live"
        onReset={() => { setX(0); setY(0); setZ(SG_HOME_H); setYaw(0); setPitch(0); setRoll(0); }}
        caption={
          <>
            The grey hexagon is the fixed base; the purple hexagon is the moving platform with its body
            frame. The six coloured legs are the actuated prismatic sliders. Translate{" "}
            <M>{"(x,y,z)"}</M> and rotate (yaw–pitch–roll) the platform; every leg length is computed
            directly from the loop-closure norm — no solving, one answer each.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={420} camera={[4.6, 3.6, 4.6]}>
              <Triad ghost colors={GHOST} scale={0.7} />
              {/* base */}
              <Poly pts={A3} color={BASEc} width={2} close />
              {A3.map((a, i) => <Joint key={`a${i}`} p={a} color={BASEc} r={0.07} />)}
              {/* legs */}
              {[0, 1, 2, 3, 4, 5].map(i => (
                <group key={`l${i}`}>
                  <Seg a={A3[i]} b={B[i]} color={LEGCOLORS[i]} width={3.5} />
                  <Joint p={B[i]} color={LEGCOLORS[i]} r={0.06} />
                </group>
              ))}
              {/* platform */}
              <Poly pts={B} color={PLATc} width={2.8} close />
              <Triad origin={p} R={R} scale={0.6} colors={["#c2571c", "#2f9e44", "#3b6fd4"]} />
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-1.5 md:w-[210px]">
            {legs.map((s, i) => (
              <Readout key={i} label={`s${i + 1}`} value={s.toFixed(3)} color={LEGCOLORS[i]} />
            ))}
            <Readout label="tilt angle" value={`${tiltAngle.toFixed(0)}°`} color={met ? "var(--good)" : undefined} />
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="x" value={x} min={-1} max={1} onChange={setX} fmt={v => v.toFixed(2)} width={120} />
          <LabeledSlider label="y" value={y} min={-1} max={1} onChange={setY} fmt={v => v.toFixed(2)} width={120} />
          <LabeledSlider label="z" value={z} min={1.4} max={3.0} onChange={setZ} fmt={v => v.toFixed(2)} width={120} />
        </ControlBar>
        <ControlBar>
          <LabeledSlider label="yaw" value={yaw} min={-0.8} max={0.8} onChange={setYaw} fmt={v => `${deg(v).toFixed(0)}°`} width={120} />
          <LabeledSlider label="pitch" value={pitch} min={-0.6} max={0.6} onChange={setPitch} fmt={v => `${deg(v).toFixed(0)}°`} width={120} />
          <LabeledSlider label="roll" value={roll} min={-0.6} max={0.6} onChange={setRoll} fmt={v => `${deg(v).toFixed(0)}°`} width={120} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch7-sg-tilt" met={met}>
        Tilt the moving platform past <strong>15°</strong> (use pitch and/or roll). Watch all six leg
        lengths respond at once, each still a single unambiguous value — the inverse kinematics never
        stops being a direct computation, no matter how the platform is oriented.
      </Challenge>
    </>
  );
}
