import { useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Scene3D, Triad, PosedGroup } from "../../components/three/Scene3D";
import { SpatialArm, armState } from "../../components/three/SpatialArm";
import { PointArrow, AxisArc, ScrewAxisLine } from "../../components/three/viz3d";
import { type Vec3, type Vec6, rad, deg, vcross, vdot, vunit } from "../../lib/math/vec";
import { jacobianSpace } from "../../lib/math/se3";
import { ARM_JOINTS, ARM_M, ARM_COLORS } from "./arm";

const F_COLOR = "#d9483f";
const GOOD = "#2f9e44";
const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];

/** Joint torques τ_i = J_{s,i} · F_s for a pure tip force f at point p (F_s = (p×f, f)). */
function jointTorques(cols: Vec6[], p: Vec3, f: Vec3): number[] {
  const m = vcross(p, f);
  const Fs: Vec6 = [m[0], m[1], m[2], f[0], f[1], f[2]];
  return cols.map(c => c.reduce((s, x, k) => s + x * Fs[k], 0));
}

export default function Statics() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 5"
        section="Velocity Kinematics & Statics"
        title="Statics: Force Through the Transpose"
        lede="The same Jacobian that maps joint speeds to end-effector velocity also maps end-effector forces to joint torques — through its transpose. No new machinery required."
      />

      <p>
        Hold the arm perfectly still and push on its end-effector. Which motors have to strain, and
        how hard? Two vocabulary reminders before the answer. The push is a{" "}
        <strong>wrench</strong> <M>{"\\mathcal{F}"}</M> — Chapter 3's package of a moment and a
        force in one 6-vector, the force-side twin of a twist. And <M>{"\\tau"}</M> stacks the{" "}
        <strong>joint torques</strong>, one effort number per motor. Conservation of power connects
        them: since power is force times velocity, and at equilibrium no power is stored or lost in
        the arm, the power the motors put in at the joints must equal the power the wrench takes out
        at the tip — for <em>every</em> possible joint motion <M>{"\\dot\\theta"}</M>:
      </p>
      <Eq>{"\\tau^{\\mathsf T}\\dot\\theta = \\mathcal{F}^{\\mathsf T}\\mathcal{V} = \\mathcal{F}^{\\mathsf T} J(\\theta)\\,\\dot\\theta \\quad\\Longrightarrow\\quad \\boxed{\\;\\tau = J^{\\mathsf T}(\\theta)\\,\\mathcal{F}.\\;}"}</Eq>
      <p>
        Read the boxed formula back: the <em>same</em> matrix that turned joint speeds into tip
        velocity now runs in reverse — transposed — turning a tip wrench into joint torques. One
        matrix, both directions, no new machinery. Concretely, each joint torque is one column of
        the Jacobian dotted with the end-effector wrench:{" "}
        <M>{"\\tau_i = J_i \\cdot \\mathcal{F}"}</M>. A joint feels a wrench only to the extent the
        wrench lines up with the motion that joint would create. Push exactly along a joint's axis —
        or aim the force straight through it — and that joint feels nothing.
      </p>

      <H2>Push the tip, read the torques</H2>
      <p>
        For a pure force <M>{"f"}</M> applied at the end-effector point <M>{"p"}</M>, the spatial
        wrench is <M>{"\\mathcal{F}_s = (p\\times f,\\; f)"}</M>, and{" "}
        <M>{"\\tau = J_s^{\\mathsf T}\\mathcal{F}_s"}</M>. The arcs in the widget show each joint's
        torque, sized and signed by its value.
      </p>
      <p>
        <strong>Try this:</strong> sweep the force azimuth slowly through a full circle and watch
        each colored arc grow, shrink, and flip sign — every joint feels the same push differently.
        Then park the azimuth where the orange base-yaw arc vanishes: at that aim the force line
        passes through joint 1's vertical axis, so it has no lever arm there. Finally double{" "}
        <M>{"|f|"}</M> and confirm every torque doubles with it — the map is linear.
      </p>

      <PushWidget />

      <H2>What the joints cannot push — and freely resist</H2>
      <p>
        When <M>{"J^{\\mathsf T}"}</M> has a null space — wrench directions with{" "}
        <M>{"J^{\\mathsf T}\\mathcal{F} = 0"}</M> — the arm produces <em>no</em> joint torque for
        those wrenches. It cannot actively generate force in those directions, but it also resists
        external loads there for free, carried entirely by the structure.
      </p>
      <p>
        The clearest case is a single revolute joint: a motorized door. The motor can only generate a
        force at the knob <em>tangent</em> to the knob's arc of travel. Every other direction —
        pushing the knob toward or away from the hinge, or lifting it — is absorbed by the hinge with
        no motor torque at all. One actuated direction, a five-dimensional space of freely-resisted
        wrenches.
      </p>
      <p>
        <strong>Try this:</strong> set the push direction perpendicular to the door face and watch
        the hinge torque peak — that is the aim that best fights (or helps) the motor. Now rotate
        the push until it points along the door, straight at the hinge: the torque needle falls to
        zero even at full force. Then swing the door open with the angle slider and notice both
        special directions swing with it — the null space is glued to the mechanism, not to the
        room.
      </p>

      <DoorWidget />

      <Aside>
        If an external wrench <M>{"-\\mathcal{F}"}</M> is applied, the joints must supply{" "}
        <M>{"\\tau = J^{\\mathsf T}\\mathcal{F}"}</M> to stay in equilibrium (on top of whatever
        offsets gravity). For a redundant arm (<M>{"n>6"}</M>) embedding the tip in concrete still
        leaves internal motions free, so the static assumption breaks and dynamics are needed.
      </Aside>

      <KeyIdea>
        <M>{"\\tau = J^{\\mathsf T}(\\theta)\\,\\mathcal{F}"}</M>. The Jacobian transpose turns
        end-effector wrenches into joint torques. Wrenches in the null space of{" "}
        <M>{"J^{\\mathsf T}"}</M> cost zero torque — the arm can't push there, but resists there for
        free.
      </KeyIdea>

      <Quiz
        challengeId="ch5-statics-quiz"
        goal={<>Answer all three correctly.</>}
        questions={[
          {
            prompt: (
              <>
                You push on the end-effector with a force whose line of action passes straight
                through joint 2's axis. What torque must joint 2's motor supply to hold still?
              </>
            ),
            options: [
              { label: "Zero — the force has no lever arm about that axis", correct: true },
              { label: "The full force times the arm's length" },
              { label: "It depends on what the other joints are doing" },
            ],
            explain:
              "τᵢ = Jᵢ · 𝓕: a joint feels a wrench only to the extent it lines up with the motion that joint creates. A force through the axis produces no moment about it.",
          },
          {
            prompt: (
              <>
                To compute the joint torques that balance an end-effector wrench, you need…
              </>
            ),
            options: [
              { label: "a brand-new force-analysis matrix, derived separately from the velocity Jacobian" },
              {
                label: "just the transpose of the same Jacobian from the velocity pages: τ = Jᵀ𝓕",
                correct: true,
              },
              { label: "the inverse of the Jacobian, J⁻¹" },
            ],
            explain:
              "Conservation of power forces velocities and forces to share one matrix. Note it's the transpose, not the inverse — τ = Jᵀ𝓕 works even at singularities.",
          },
          {
            prompt: (
              <>
                A wrench <M>{"\\mathcal{F}"}</M> lies in the null space of{" "}
                <M>{"J^{\\mathsf T}"}</M> (that is, <M>{"J^{\\mathsf T}\\mathcal{F} = 0"}</M>).
                What does that mean physically?
              </>
            ),
            options: [
              { label: "The arm accelerates away in that direction" },
              { label: "The motors must all run at maximum torque to resist it" },
              {
                label: "The structure resists it for free — and the arm cannot actively push in that direction either",
                correct: true,
              },
            ],
            explain:
              "Zero torque means the load is carried entirely by the links and bearings — the door pushed toward its hinge. Lost pushing ability and free resistance are the same coin, flip sides.",
          },
        ]}
      />

      <BookRef>Modern Robotics §5.2 — Statics of Open Chains.</BookRef>
    </div>
  );
}

/* ================= widget 1: τ = Jᵀ F ================= */

function PushWidget() {
  const [t1, setT1] = useState(0.5);
  const [t2, setT2] = useState(-0.6);
  const [t3, setT3] = useState(1.1);
  const [faz, setFaz] = useState(rad(90));
  const [fel, setFel] = useState(0);
  const [fmag, setFmag] = useState(1.0);

  const thetas: [number, number, number] = [t1, t2, t3];
  const st = armState(ARM_JOINTS, ARM_M, thetas);
  const cols = jacobianSpace(st.S, thetas);
  const pEE: Vec3 = [st.ee.p[0], st.ee.p[1], st.ee.p[2]];
  const f: Vec3 = [
    fmag * Math.cos(fel) * Math.cos(faz),
    fmag * Math.cos(fel) * Math.sin(faz),
    fmag * Math.sin(fel),
  ];
  const tau = jointTorques(cols, pEE, f);
  const maxTau = Math.max(...tau.map(Math.abs));

  // challenge: straighten the arm and aim the force so all torques nearly vanish
  const met = fmag > 0.6 && maxTau < 0.2;

  return (
    <>
      <WidgetShell
        title="Aim the force, watch the torques"
        onReset={() => {
          setT1(0.5); setT2(-0.6); setT3(1.1);
          setFaz(rad(90)); setFel(0); setFmag(1.0);
        }}
        caption={
          <>
            The red arrow is the tip force <M>{"f"}</M>; the colored arcs at the joints are the
            torques <M>{"\\tau_i = J_{s,i}\\cdot(p\\times f,\\,f)"}</M> needed to hold equilibrium.
            Aim the force through a joint axis and that arc collapses. Straighten the whole arm and
            push along it, and all three vanish at once — the suitcase trick.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={360} camera={[3.8, 2.8, 3.8]}>
              <Triad ghost colors={GHOST} scale={0.6} />
              <SpatialArm joints={ARM_JOINTS} M={ARM_M} thetas={thetas} eeTriadScale={0.28} />
              {/* torque arcs at each joint */}
              {st.pivots.map((p, i) => (
                <AxisArc key={i} center={p} axis={st.axisDirs[i]} radius={0.32} sweep={Math.max(-2.6, Math.min(2.6, tau[i] * 0.9))} color={ARM_COLORS[i]} />
              ))}
              {/* tip force */}
              {fmag > 0.02 && (
                <PointArrow at={pEE} dir={f} length={Math.min(1.3, fmag * 0.7)} color={F_COLOR} thickness={0.026} />
              )}
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2 md:w-[230px]">
            <Readout label="τ₁" value={tau[0].toFixed(2)} color={ARM_COLORS[0]} />
            <Readout label="τ₂" value={tau[1].toFixed(2)} color={ARM_COLORS[1]} />
            <Readout label="τ₃" value={tau[2].toFixed(2)} color={ARM_COLORS[2]} />
            <Readout label="max|τ|" value={maxTau.toFixed(2)} color={maxTau < 0.2 ? GOOD : undefined} />
            <Readout label="|f|" value={fmag.toFixed(2)} color={F_COLOR} />
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="θ₁" value={t1} min={rad(-150)} max={rad(150)} onChange={setT1} fmt={v => `${deg(v).toFixed(0)}°`} width={110} />
          <LabeledSlider label="θ₂" value={t2} min={rad(-150)} max={rad(150)} onChange={setT2} fmt={v => `${deg(v).toFixed(0)}°`} width={110} />
          <LabeledSlider label="θ₃" value={t3} min={rad(-150)} max={rad(150)} onChange={setT3} fmt={v => `${deg(v).toFixed(0)}°`} width={110} />
        </ControlBar>
        <ControlBar>
          <LabeledSlider label="f azim." value={faz} min={rad(-180)} max={rad(180)} onChange={setFaz} fmt={v => `${deg(v).toFixed(0)}°`} color={F_COLOR} width={120} />
          <LabeledSlider label="f elev." value={fel} min={rad(-90)} max={rad(90)} onChange={setFel} fmt={v => `${deg(v).toFixed(0)}°`} color={F_COLOR} width={120} />
          <LabeledSlider label="|f|" value={fmag} min={0} max={1.5} onChange={setFmag} fmt={v => v.toFixed(2)} color={F_COLOR} width={120} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch5-statics-load" met={met}>
        Carry the suitcase the easy way. Straighten the arm (all <M>{"\\theta_i \\to 0"}</M>) and aim
        the force horizontally along it (elevation 0°, azimuth 0°) with <M>{"|f|>0.6"}</M>, until{" "}
        <M>{"\\max|\\tau| < 0.2"}</M>. With the links collinear and the force line piercing every
        joint axis, the structure bears the load and the motors rest.
      </Challenge>
    </>
  );
}

/* ================= widget 2: the rotating door null space ================= */

const DOOR_W = 1.4;
const KNOB: Vec3 = [DOOR_W - 0.12, 0, 0]; // knob near the free edge, in door-local coords

function DoorWidget() {
  const [ang, setAng] = useState(rad(35));
  const [paz, setPaz] = useState(rad(90)); // test push azimuth in the world
  const [pmag, setPmag] = useState(0.9);

  // door rotates about world ẑ through the hinge at origin
  const c = Math.cos(ang), s = Math.sin(ang);
  const knobW: Vec3 = [c * KNOB[0], s * KNOB[0], KNOB[1] + 0.0];
  // tangent (actuatable) direction at the knob = ẑ × r̂
  const rHat = vunit(knobW);
  const tangent = vunit(vcross([0, 0, 1], rHat));
  // user test force (horizontal)
  const f: Vec3 = [pmag * Math.cos(paz), pmag * Math.sin(paz), 0];
  // torque about hinge ẑ = ẑ · (r × f)
  const tau = vdot([0, 0, 1], vcross(knobW, f));
  const met = pmag > 0.5 && Math.abs(tau) < 0.06;

  return (
    <>
      <WidgetShell
        title="The door: one push it makes, five it resists for free"
        onReset={() => {
          setAng(rad(35)); setPaz(rad(90)); setPmag(0.9);
        }}
        caption={
          <>
            The hinge is the vertical axis; green is the only direction the motor can drive the knob
            (tangent to its arc). Your test force is red, and the arc at the hinge is the resulting
            motor torque <M>{"\\tau = \\hat z\\cdot(r\\times f)"}</M>. Push along the door (toward or
            away from the hinge) or straight up and the torque is zero — resisted by the hinge alone.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={340} camera={[3.4, 2.8, 3.4]}>
              <Triad ghost colors={GHOST} scale={0.6} />
              {/* hinge axis */}
              <ScrewAxisLine q={[0, 0, 0]} dir={[0, 0, 1]} color="#9c36b5" half={1.3} />
              {/* door panel */}
              <PosedGroup R={[c, -s, 0, s, c, 0, 0, 0, 1]} p={[0, 0, 0]}>
                <mesh position={[DOOR_W / 2, 0, 0]}>
                  <boxGeometry args={[DOOR_W, 0.05, 1.4]} />
                  <meshStandardMaterial color="#cdbb95" transparent opacity={0.85} />
                </mesh>
                <mesh position={[KNOB[0], 0, 0]}>
                  <sphereGeometry args={[0.07, 16, 16]} />
                  <meshStandardMaterial color="#33343d" />
                </mesh>
              </PosedGroup>
              {/* actuatable (tangent) direction */}
              <PointArrow at={knobW} dir={tangent} length={0.7} color={GOOD} thickness={0.02} />
              {/* test push */}
              {pmag > 0.02 && <PointArrow at={knobW} dir={f} length={Math.min(1.0, pmag * 0.8)} color={F_COLOR} thickness={0.024} />}
              {/* motor torque arc */}
              <AxisArc center={[0, 0, 0]} axis={[0, 0, 1]} radius={0.45} sweep={Math.max(-2.6, Math.min(2.6, tau * 1.2))} color="#9c36b5" />
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2 md:w-[230px]">
            <Readout label="motor torque τ" value={tau.toFixed(2)} color={Math.abs(tau) < 0.06 ? GOOD : undefined} />
            <Readout label="|f|" value={pmag.toFixed(2)} color={F_COLOR} />
            <div className="ui text-[11px] text-[var(--ink-faint)] leading-relaxed">
              green = the one force the motor can make; everything ⟂ to it is resisted by the hinge
              for free.
            </div>
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="door angle" value={ang} min={rad(0)} max={rad(120)} onChange={setAng} fmt={v => `${deg(v).toFixed(0)}°`} color="#9c36b5" width={150} />
          <LabeledSlider label="push dir" value={paz} min={rad(-180)} max={rad(180)} onChange={setPaz} fmt={v => `${deg(v).toFixed(0)}°`} color={F_COLOR} width={150} />
          <LabeledSlider label="|f|" value={pmag} min={0} max={1.2} onChange={setPmag} fmt={v => v.toFixed(2)} color={F_COLOR} width={120} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch5-statics-door" met={met}>
        Find a push the motor doesn't fight. Aim your force along the door — toward or away from the
        hinge, perpendicular to the green tangent — with <M>{"|f|>0.5"}</M> until the hinge torque{" "}
        <M>{"|\\tau| < 0.06"}</M>. That direction lives in the null space of <M>{"J^{\\mathsf T}"}</M>:
        resisted entirely by the structure, free to the actuator.
      </Challenge>
    </>
  );
}
