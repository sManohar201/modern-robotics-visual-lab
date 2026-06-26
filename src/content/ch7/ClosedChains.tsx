import { useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { type Vec3, deg } from "../../lib/math/vec";
import { Seg, Joint, Poly, Leg } from "./viz";
import { RPR_A, rprPlatformPt, rprLegs } from "./mechanism";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const BASEc = "#9b968a";
const PLATc = "#6741d9";
const LEGc = ["#0b7285", "#c2571c", "#2f9e44"];
const FRAMEb = "#c2571c";

export default function ClosedChains() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 7"
        section="Kinematics of Closed Chains"
        title="Closed Chains & the IK/FK Flip"
        lede="A chain with a loop in it is a closed chain. For the parallel mechanisms built from them, the kinematics turns inside out: the inverse problem becomes the easy one, and the forward problem the hard one — exactly the reverse of a serial arm."
      />

      <p>
        Every robot so far has been an <em>open</em> chain — one unbroken path from base to tool. Join
        the links into a loop and you get a <strong>closed chain</strong>. The most useful kind is a{" "}
        <strong>parallel mechanism</strong>: a fixed platform and a moving platform joined by several{" "}
        <em>legs</em>, each a short open chain. Think of the Stewart–Gough motion platform or the
        fast Delta robot.
      </p>
      <p>
        Two features make closed chains harder to analyze than open ones: <strong>not every joint is
        actuated</strong> (the legs carry passive joints too), and the joint variables must satisfy{" "}
        <strong>loop-closure constraints</strong>. One consequence is a clean reversal of difficulty:
      </p>
      <Eq>{"\\text{serial: FK easy, IK hard} \\qquad\\Longleftrightarrow\\qquad \\text{parallel: IK easy, FK hard.}"}</Eq>

      <H2>The 3×RPR platform: inverse kinematics is one square root</H2>
      <p>
        Take the planar <strong>3×RPR</strong> mechanism: a moving triangle joined to ground by three
        legs, each a passive revolute, an actuated <strong>prismatic</strong> slider, and another
        passive revolute. Place the platform with frame <M>{"\\{b\\}"}</M> at position{" "}
        <M>{"p=(p_x,p_y)"}</M> and orientation <M>{"\\phi"}</M>. Each leg vector closes its loop as
      </p>
      <Eq>{"d_i = p + R_{sb}\\,b_i - a_i,\\qquad R_{sb}=\\begin{bmatrix}\\cos\\phi & -\\sin\\phi\\\\ \\sin\\phi & \\cos\\phi\\end{bmatrix},"}</Eq>
      <p>
        where <M>{"a_i"}</M> are the fixed base anchors and <M>{"b_i"}</M> the platform anchors. The
        leg length is then immediate — just the norm:
      </p>
      <Eq>{"s_i^2 = \\big(p_x + b_{ix}\\cos\\phi - b_{iy}\\sin\\phi - a_{ix}\\big)^2 + \\big(p_y + b_{ix}\\sin\\phi + b_{iy}\\cos\\phi - a_{iy}\\big)^2."}</Eq>
      <p>
        Given the pose, the three actuator lengths drop out directly. <strong>That is the entire
        inverse kinematics.</strong> No multiplicity, no iteration. Drag the platform and watch the
        three legs report their lengths instantly.
      </p>

      <RprInverseWidget />

      <Aside>
        Contrast this with a serial arm, where inverse kinematics meant law-of-cosines branches,
        elbow-up/down forks, and whole unreachable regions. Here the inverse map is a closed-form
        formula valued in a single answer per leg. The price is paid on the <em>forward</em> side, the
        subject of the next page.
      </Aside>

      <KeyIdea>
        A closed chain contains a loop; a parallel mechanism is a closed chain of two platforms joined
        by legs. Because the legs impose loop-closure constraints and only some joints are actuated,
        the difficulty flips: for parallel mechanisms the inverse kinematics is a direct formula,
        while the forward kinematics is the hard, multi-valued problem.
      </KeyIdea>

      <BookRef>Modern Robotics §7.1, §7.1.1 — Inverse and forward kinematics; the 3×RPR planar parallel mechanism.</BookRef>
    </div>
  );
}

function RprInverseWidget() {
  const [px, setPx] = useState(0.0);
  const [py, setPy] = useState(0.0);
  const [phi, setPhi] = useState(0.0);

  const legs = rprLegs(px, py, phi);
  const B: Vec3[] = [0, 1, 2].map(i => rprPlatformPt(px, py, phi, i));
  const A3: Vec3[] = RPR_A.map(a => [a[0], a[1], 0]);
  const center: Vec3 = [px, py, 0];

  const spread = Math.max(...legs) - Math.min(...legs);
  const met = Math.hypot(px, py) < 0.06; // platform centered ⇒ all three legs equal (symmetry)

  return (
    <>
      <WidgetShell
        title="Inverse kinematics of the 3×RPR — instant and unique"
        onReset={() => { setPx(0); setPy(0); setPhi(0); }}
        caption={
          <>
            The grey triangle is the fixed base (anchors <M>{"a_i"}</M>); the purple triangle is the
            moving platform (anchors <M>{"b_i"}</M>) with its body frame. The three coloured legs are
            the actuated prismatic sliders. Move and rotate the platform — each leg length is read off
            directly from the loop-closure formula, with no solving required.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={380} camera={[0.6, 5.4, 3.0]}>
              <Triad ghost colors={GHOST} scale={0.5} />
              {/* fixed base triangle + anchors */}
              <Poly pts={A3} color={BASEc} width={1.8} close />
              {A3.map((a, i) => <Joint key={`a${i}`} p={a} color={BASEc} r={0.07} />)}
              {/* legs */}
              {[0, 1, 2].map(i => <Leg key={`l${i}`} a={A3[i]} b={B[i]} color={LEGc[i]} width={3.5} />)}
              {/* moving platform */}
              <Poly pts={B} color={PLATc} width={2.6} close />
              <Triad origin={center} R={[Math.cos(phi), -Math.sin(phi), 0, Math.sin(phi), Math.cos(phi), 0, 0, 0, 1]} scale={0.5} colors={[FRAMEb, "#2f9e44", "#3b6fd4"]} />
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2.5 md:w-[220px]">
            <Readout label="s₁" value={legs[0].toFixed(3)} color={LEGc[0]} />
            <Readout label="s₂" value={legs[1].toFixed(3)} color={LEGc[1]} />
            <Readout label="s₃" value={legs[2].toFixed(3)} color={LEGc[2]} />
            <Readout label="spread max−min" value={spread.toFixed(3)} color={spread < 0.05 ? "var(--good)" : undefined} />
            <Readout label="φ" value={`${deg(phi).toFixed(0)}°`} />
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="pₓ" value={px} min={-1.2} max={1.2} onChange={setPx} fmt={v => v.toFixed(2)} width={150} />
          <LabeledSlider label="p_y" value={py} min={-1.2} max={1.2} onChange={setPy} fmt={v => v.toFixed(2)} width={150} />
          <LabeledSlider label="φ" value={phi} min={-Math.PI} max={Math.PI} onChange={setPhi} fmt={v => `${deg(v).toFixed(0)}°`} width={150} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch7-rpr-inverse" met={met}>
        Center the platform over the base (<M>{"p_x,p_y \\to 0"}</M>). By the threefold symmetry of
        this layout all three legs then have equal length for <em>any</em> orientation{" "}
        <M>{"\\phi"}</M> — drive the spread below 0.05. Notice you computed those lengths with no
        iteration at all: the inverse kinematics is just the loop-closure norm.
      </Challenge>
    </>
  );
}
