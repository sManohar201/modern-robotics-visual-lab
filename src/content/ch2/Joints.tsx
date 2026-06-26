import { useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Scene3D } from "../../components/three/Scene3D";
import { rad, deg } from "../../lib/math/vec";

export default function Joints() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 2"
        section="Configuration Space"
        title="Robot Joints"
        lede="Every joint is a deal: it grants the links on either side some freedom to move relative to each other, and takes away the rest. Knowing how many freedoms each joint type grants is the entire bookkeeping problem behind Grübler's formula."
      />

      <p>
        A free rigid body in space has 6 degrees of freedom. When two such bodies are connected by
        a joint, the joint <em>removes</em> some of those relative motions while <em>permitting</em>{" "}
        others. Call the number of permitted motions <M>{"f_i"}</M> and the number of forbidden ones{" "}
        <M>{"c_i"}</M>. Because together they account for all the relative freedoms of the pair:
      </p>
      <Eq>{"f_i + c_i = m \\qquad m = 6 \\text{ (spatial)}, \\quad m = 3 \\text{ (planar)}"}</Eq>
      <p>
        This identity is not a separate rule to memorize — it is a tautology. A joint permitting 1
        motion forbids 5. A joint permitting 3 motions forbids 3. The six standard joint types
        differ only in <em>which</em> motions they permit and how many.
      </p>

      <H2>One-DOF joints: R, P, and H</H2>
      <p>
        The three one-DOF joints each allow exactly one relative motion and impose five constraints.
        They differ in the <em>type</em> of motion they permit.
      </p>
      <p>
        The <strong>revolute joint</strong> (R) allows pure rotation about a single fixed axis —
        the classic hinge or pin. One body can spin about the joint axis; all translations and
        rotations about other axes are forbidden. A door hinge, a knee joint, and the pin joints of
        a four-bar linkage are all revolute joints.
      </p>
      <Eq>{"\\text{Revolute:} \\quad f = 1,\\; c = 5 \\qquad \\text{(rotation about one axis)}"}</Eq>
      <p>
        The <strong>prismatic joint</strong> (P) allows pure translation along a single fixed
        direction. One body slides along the other with no rotation of any kind. A piston in a
        cylinder, a drawer, and a linear actuator rail are all prismatic joints.
      </p>
      <Eq>{"\\text{Prismatic:} \\quad f = 1,\\; c = 5 \\qquad \\text{(translation along one axis)}"}</Eq>
      <p>
        The <strong>helical joint</strong> (H) — the screw joint — allows a{" "}
        <em>coupled</em> rotation and translation. Turning the screw by angle{" "}
        <M>{"\\theta"}</M> advances it axially by <M>{"h\\theta"}</M>, where <M>{"h"}</M> is the
        pitch. The rotation and translation are not independent — they are locked together in a
        single degree of freedom. A bolt threading into a nut, or a lead screw, behaves this way.
      </p>
      <Eq>{"\\text{Helical:} \\quad f = 1,\\; c = 5 \\qquad \\text{(rotation and translation coupled by pitch }h\\text{)}"}</Eq>
      <p>
        Note the limiting cases: as <M>{"h \\to 0"}</M>, the helical joint becomes a revolute
        joint (no advance per turn); as <M>{"h \\to \\infty"}</M>, it becomes a prismatic joint
        (pure translation). The helical joint is the general one-DOF joint; R and P are its
        degenerate limits.
      </p>

      <H2>Two-DOF joints: C and U</H2>
      <p>
        Two-DOF joints allow two <em>independent</em> relative motions. Four constraints remain.
      </p>
      <p>
        The <strong>cylindrical joint</strong> (C) allows rotation about{" "}
        <em>and</em> independent translation along the same axis. Unlike the helical joint, the
        spin and slide are uncoupled — you can translate without rotating, or rotate without
        translating. A shaft that can both spin and slide freely inside a sleeve bearing is a
        cylindrical joint. Equivalently, a cylindrical joint is an R joint and a P joint sharing
        the same axis.
      </p>
      <Eq>{"\\text{Cylindrical:} \\quad f = 2,\\; c = 4 \\qquad \\text{(independent rotation + translation, same axis)}"}</Eq>
      <p>
        The <strong>universal joint</strong> (U) — also called a Cardan joint — allows rotation
        about two <em>perpendicular intersecting</em> axes. A drive shaft connecting two shafts at
        an angle uses a universal joint: the shaft can bend in any direction (two rotational DOF),
        but cannot rotate about the joint center's perpendicular axis, nor translate. The universal
        joint cannot transmit rotation about the shaft's own axis independently — that requires a
        third rotational DOF, which belongs to the spherical joint.
      </p>
      <Eq>{"\\text{Universal:} \\quad f = 2,\\; c = 4 \\qquad \\text{(rotation about two perpendicular intersecting axes)}"}</Eq>

      <H2>Three-DOF joints: S</H2>
      <p>
        The <strong>spherical joint</strong> (S) — ball-and-socket — allows rotation about{" "}
        <em>any</em> axis passing through the joint center. The three translational DOF of the
        connected link are fully constrained (the center of the socket is fixed), while all three
        rotational DOF are free. A shoulder joint in the human body is the familiar biological
        version.
      </p>
      <Eq>{"\\text{Spherical:} \\quad f = 3,\\; c = 3 \\qquad \\text{(rotation about any axis through the center)}"}</Eq>
      <p>
        Three is the maximum DOF for a joint that constrains position — since fully freeing all
        three translations would mean the joint exerts no force at all. A joint with{" "}
        <M>{"f = 6"}</M> is simply no joint.
      </p>

      <p>
        Reading about six joints is one thing; <em>driving</em> them is another. Below, the gray
        link is bolted down and the orange link is connected to it by the selected joint. The
        sliders are exactly the joint's freedoms — no more, no fewer. Notice what each joint
        refuses to let you do.
      </p>

      <JointExplorer />

      <KeyIdea>
        The six standard joint types — R, P, H, C, U, S — allow{" "}
        <M>{"f = 1,\\,1,\\,1,\\,2,\\,2,\\,3"}</M> relative motions respectively, and impose{" "}
        <M>{"c = 5,\\,5,\\,5,\\,4,\\,4,\\,3"}</M> constraints. In every case,{" "}
        <M>{"f_i + c_i = 6"}</M> (spatial).
      </KeyIdea>

      <H2>Planar mechanisms: only R and P</H2>
      <p>
        When all bodies are constrained to move in a common plane (<M>{"m = 3"}</M>), the
        counting changes. A free planar rigid body has 3 DOF: two translations in the plane and
        one rotation about the normal. The only joints that make geometric sense in the plane are
        revolute and prismatic, and both give:
      </p>
      <Eq>{"f = 1, \\quad c = 2 \\qquad \\text{(planar R or planar P)}"}</Eq>
      <p>
        A planar R joint pins two points together (removing two translations) while leaving
        rotation free. A planar P joint constrains the perpendicular translation and the rotation
        while leaving one translation free. They provide the same count — what differs is the
        nature of the permitted motion. Helical, cylindrical, universal, and spherical joints have
        no planar counterpart because their second or third DOF lives outside the plane. Flip the
        widget above into <strong>planar</strong> mode and watch four of the six tabs go dark.
      </p>

      <Quiz
        challengeId="ch2-joints-quiz"
        goal={<>Identify all three joints correctly.</>}
        questions={[
          {
            prompt: (
              <>
                A shaft must spin about its axis <em>and</em> slide along that same axis, each
                independently of the other. Which joint?
              </>
            ),
            options: [
              { label: "Helical (H)" },
              { label: "Cylindrical (C)", correct: true },
              { label: "Universal (U)" },
            ],
            explain:
              "Independent spin + slide on one axis is cylindrical. If pitch coupled them, it would be helical.",
          },
          {
            prompt: (
              <>
                As its pitch <M>{"h \\to \\infty"}</M>, the helical joint approaches which joint?
              </>
            ),
            options: [
              { label: "Revolute (R)" },
              { label: "Prismatic (P)", correct: true },
              { label: "Spherical (S)" },
            ],
            explain:
              "Infinite advance per turn means all translation, no visible rotation: prismatic. h → 0 gives revolute.",
          },
          {
            prompt: (
              <>
                In a <em>planar</em> mechanism, how many constraints does a revolute joint impose?
              </>
            ),
            options: [
              { label: "1" },
              { label: "2", correct: true },
              { label: "5" },
            ],
            explain: "f + c = m = 3 in the plane, and f = 1, so c = 2: the pin removes both relative translations.",
          },
        ]}
      />

      <Aside>
        The joint types above describe <strong>lower pairs</strong> — joints where two surfaces
        are in full contact and one surface slides over the other (hinge, slider, etc.). Higher
        pairs, where bodies meet at a point or along a curve (a cam follower, a gear tooth), are
        treated differently and appear in the grasping and manipulation chapters.
      </Aside>

      <p>
        With the freedoms and constraints of each joint now in hand, we can sum them over an
        entire mechanism. That sum is Grübler's formula — the subject of the next page.
      </p>

      <BookRef>Modern Robotics §2.2 — Degrees of Freedom of a Robot.</BookRef>
    </div>
  );
}

/* ================= widget: joint explorer ================= */

type JointId = "R" | "P" | "H" | "C" | "U" | "S";

interface Chip {
  label: string;
  free: boolean;
}

const JOINT_INFO: Record<
  JointId,
  { name: string; f: number; planarOk: boolean; chips: Chip[]; planarChips?: Chip[] }
> = {
  R: {
    name: "Revolute",
    f: 1,
    planarOk: true,
    chips: [
      { label: "rot ẑ", free: true },
      { label: "rot x̂", free: false },
      { label: "rot ŷ", free: false },
      { label: "slide x̂", free: false },
      { label: "slide ŷ", free: false },
      { label: "slide ẑ", free: false },
    ],
    planarChips: [
      { label: "rot", free: true },
      { label: "slide x̂", free: false },
      { label: "slide ŷ", free: false },
    ],
  },
  P: {
    name: "Prismatic",
    f: 1,
    planarOk: true,
    chips: [
      { label: "slide x̂", free: true },
      { label: "slide ŷ", free: false },
      { label: "slide ẑ", free: false },
      { label: "rot x̂", free: false },
      { label: "rot ŷ", free: false },
      { label: "rot ẑ", free: false },
    ],
    planarChips: [
      { label: "slide x̂", free: true },
      { label: "slide ŷ", free: false },
      { label: "rot", free: false },
    ],
  },
  H: {
    name: "Helical / Screw",
    f: 1,
    planarOk: false,
    chips: [
      { label: "rot ẑ + slide ẑ, coupled", free: true },
      { label: "rot x̂", free: false },
      { label: "rot ŷ", free: false },
      { label: "slide x̂", free: false },
      { label: "slide ŷ", free: false },
    ],
  },
  C: {
    name: "Cylindrical",
    f: 2,
    planarOk: false,
    chips: [
      { label: "rot ẑ", free: true },
      { label: "slide ẑ", free: true },
      { label: "rot x̂", free: false },
      { label: "rot ŷ", free: false },
      { label: "slide x̂", free: false },
      { label: "slide ŷ", free: false },
    ],
  },
  U: {
    name: "Universal",
    f: 2,
    planarOk: false,
    chips: [
      { label: "rot ẑ", free: true },
      { label: "rot ŷ′", free: true },
      { label: "rot 3rd axis", free: false },
      { label: "slide x̂", free: false },
      { label: "slide ŷ", free: false },
      { label: "slide ẑ", free: false },
    ],
  },
  S: {
    name: "Spherical",
    f: 3,
    planarOk: false,
    chips: [
      { label: "rot x̂", free: true },
      { label: "rot ŷ", free: true },
      { label: "rot ẑ", free: true },
      { label: "slide x̂", free: false },
      { label: "slide ŷ", free: false },
      { label: "slide ẑ", free: false },
    ],
  },
};

const ACCENT = "#6741d9";
const LINK_FIXED = "#8d8d99";
const LINK_MOVING = "#c2571c";

function FixedLink() {
  return (
    <mesh position={[-0.95, 0, -0.1]}>
      <boxGeometry args={[1.3, 0.26, 0.14]} />
      <meshStandardMaterial color={LINK_FIXED} />
    </mesh>
  );
}

function MovingLink() {
  return (
    <mesh position={[0.95, 0, 0.1]}>
      <boxGeometry args={[1.3, 0.24, 0.14]} />
      <meshStandardMaterial color={LINK_MOVING} />
    </mesh>
  );
}

/** Dashed-look joint axis drawn as a thin solid line. */
function JointAxis({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  return <Line points={[from, to]} color={ACCENT} lineWidth={1.6} transparent opacity={0.8} />;
}

/** Helix decoration for the screw shaft (static; the nut climbs it). */
function ScrewThread() {
  const pts: [number, number, number][] = [];
  const turns = 7;
  for (let i = 0; i <= 280; i++) {
    const t = i / 280; // 0..1 along the shaft
    const a = t * turns * 2 * Math.PI;
    pts.push([0.13 * Math.cos(a), 0.13 * Math.sin(a), -1 + 2 * t]);
  }
  return <Line points={pts} color={ACCENT} lineWidth={1.2} transparent opacity={0.55} />;
}

function JointScene({
  joint,
  th,
  th2,
  th3,
  d,
  pitch,
  planar,
}: {
  joint: JointId;
  th: number;
  th2: number;
  th3: number;
  d: number;
  pitch: number;
  planar: boolean;
}) {
  return (
    <>
      <FixedLink />

      {/* translucent motion plane in planar mode */}
      {planar && (
        <mesh position={[0, 0, -0.25]}>
          <planeGeometry args={[4.6, 4.6]} />
          <meshStandardMaterial color="#3b6fd4" transparent opacity={0.08} depthWrite={false} />
        </mesh>
      )}

      {joint === "R" && (
        <>
          <JointAxis from={[0, 0, -1.1]} to={[0, 0, 1.1]} />
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.55, 24]} />
            <meshStandardMaterial color={ACCENT} />
          </mesh>
          <group rotation={[0, 0, th]}>
            <MovingLink />
          </group>
        </>
      )}

      {joint === "P" && (
        <>
          <JointAxis from={[-2.1, 0, 0]} to={[2.1, 0, 0]} />
          {/* rail, part of the fixed link */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[3.6, 0.14, 0.08]} />
            <meshStandardMaterial color={LINK_FIXED} />
          </mesh>
          <group position={[d, 0, 0]}>
            {/* sleeve riding the rail */}
            <mesh position={[0.35, 0, 0.06]}>
              <boxGeometry args={[0.5, 0.3, 0.22]} />
              <meshStandardMaterial color={ACCENT} />
            </mesh>
            <MovingLink />
          </group>
        </>
      )}

      {joint === "H" && (
        <>
          <JointAxis from={[0, 0, -1.25]} to={[0, 0, 1.25]} />
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 2.2, 20]} />
            <meshStandardMaterial color={LINK_FIXED} />
          </mesh>
          <ScrewThread />
          <group rotation={[0, 0, th]} position={[0, 0, pitch * th]}>
            {/* the nut */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.24, 6]} />
              <meshStandardMaterial color={ACCENT} />
            </mesh>
            <MovingLink />
          </group>
        </>
      )}

      {joint === "C" && (
        <>
          <JointAxis from={[0, 0, -1.25]} to={[0, 0, 1.25]} />
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 2.2, 20]} />
            <meshStandardMaterial color={LINK_FIXED} />
          </mesh>
          <group rotation={[0, 0, th]} position={[0, 0, d]}>
            {/* free sleeve: spins and slides */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.17, 0.17, 0.42, 24]} />
              <meshStandardMaterial color={ACCENT} />
            </mesh>
            <MovingLink />
          </group>
        </>
      )}

      {joint === "U" && (
        <>
          <JointAxis from={[0, 0, -0.9]} to={[0, 0, 0.9]} />
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.7, 16]} />
            <meshStandardMaterial color={ACCENT} />
          </mesh>
          <group rotation={[0, 0, th]}>
            {/* second axis rides on the first rotation */}
            <Line points={[[0, -0.9, 0], [0, 0.9, 0]]} color="#9c7bd9" lineWidth={1.6} transparent opacity={0.8} />
            <mesh rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.7, 16]} />
              <meshStandardMaterial color="#9c7bd9" />
            </mesh>
            <group rotation={[0, th2, 0]}>
              <MovingLink />
            </group>
          </group>
        </>
      )}

      {joint === "S" && (
        <>
          <mesh>
            <sphereGeometry args={[0.2, 24, 24]} />
            <meshStandardMaterial color={ACCENT} />
          </mesh>
          <group rotation={[0, 0, th]}>
            <group rotation={[0, th2, 0]}>
              <group rotation={[th3, 0, 0]}>
                <MovingLink />
              </group>
            </group>
          </group>
        </>
      )}
    </>
  );
}

function JointExplorer() {
  const [joint, setJoint] = useState<JointId>("R");
  const [planar, setPlanar] = useState(false);
  const [th, setTh] = useState(rad(40));
  const [th2, setTh2] = useState(rad(25));
  const [th3, setTh3] = useState(rad(0));
  const [d, setD] = useState(0.45);
  const [pitch, setPitch] = useState(0.05);

  const reset = (j: JointId = joint) => {
    setTh(j === "H" ? rad(360) : rad(40));
    setTh2(rad(25));
    setTh3(rad(0));
    setD(0.45);
    setPitch(0.05);
  };

  const switchJoint = (j: JointId) => {
    setJoint(j);
    reset(j);
  };

  const togglePlanar = () => {
    const next = !planar;
    setPlanar(next);
    if (next && !JOINT_INFO[joint].planarOk) switchJoint("R");
  };

  const info = JOINT_INFO[joint];
  const m = planar ? 3 : 6;
  const f = planar && info.planarChips ? 1 : info.f;
  const c = m - f;
  const chips = planar && info.planarChips ? info.planarChips : info.chips;

  // helical coupling challenge: climb the screw using only the rotation slider
  const climbed = joint === "H" && Math.abs(pitch * th) >= 0.6;

  return (
    <>
      <WidgetShell
        title="Joint explorer — six ways to connect two links"
        onReset={() => reset()}
        caption={
          <>
            The <span style={{ color: LINK_FIXED }} className="font-semibold">gray link</span> is
            fixed; the <span style={{ color: LINK_MOVING }} className="font-semibold">orange link</span>{" "}
            moves only as the joint allows. Purple marks the joint and its axis. The sliders{" "}
            <em>are</em> the joint's freedoms <M>{"f"}</M> — everything else is one of the{" "}
            <M>{"c"}</M> constraints. Drag the view to rotate.
          </>
        }
      >
        <div className="ui flex flex-wrap items-center gap-2 mb-3">
          {(Object.keys(JOINT_INFO) as JointId[]).map(j => (
            <WidgetButton
              key={j}
              onClick={() => switchJoint(j)}
              active={joint === j}
              disabled={planar && !JOINT_INFO[j].planarOk}
            >
              {j} · {JOINT_INFO[j].name}
            </WidgetButton>
          ))}
          <span className="flex-1" />
          <WidgetButton onClick={togglePlanar} active={planar}>
            {planar ? "planar (m = 3)" : "spatial (m = 6)"}
          </WidgetButton>
        </div>

        <Scene3D camera={[3.0, 2.2, 3.2]} height={360}>
          <JointScene joint={joint} th={th} th2={th2} th3={th3} d={d} pitch={pitch} planar={planar} />
        </Scene3D>

        <ControlBar>
          {(joint === "R" || joint === "H" || joint === "C") && (
            <LabeledSlider
              label="θ"
              value={th}
              min={joint === "H" ? rad(-720) : rad(-180)}
              max={joint === "H" ? rad(720) : rad(180)}
              onChange={setTh}
              fmt={v => `${deg(v).toFixed(0)}°`}
              color={ACCENT}
              width={joint === "H" ? 220 : 180}
            />
          )}
          {(joint === "P" || joint === "C") && (
            <LabeledSlider
              label="d"
              value={d}
              min={joint === "P" ? -1.4 : -0.9}
              max={joint === "P" ? 1.4 : 0.9}
              onChange={setD}
              fmt={v => v.toFixed(2)}
              color={ACCENT}
              width={180}
            />
          )}
          {joint === "H" && (
            <>
              <LabeledSlider
                label="pitch h"
                value={pitch}
                min={0}
                max={0.06}
                step={0.001}
                onChange={setPitch}
                fmt={v => v.toFixed(3)}
                width={140}
              />
              <Readout label="advance d = hθ" value={(pitch * th).toFixed(2)} color={ACCENT} />
            </>
          )}
          {joint === "U" && (
            <>
              <LabeledSlider label="θ₁" value={th} min={rad(-90)} max={rad(90)} onChange={setTh}
                fmt={v => `${deg(v).toFixed(0)}°`} color={ACCENT} width={170} />
              <LabeledSlider label="θ₂" value={th2} min={rad(-90)} max={rad(90)} onChange={setTh2}
                fmt={v => `${deg(v).toFixed(0)}°`} color="#9c7bd9" width={170} />
            </>
          )}
          {joint === "S" && (
            <>
              <LabeledSlider label="α" value={th} min={rad(-180)} max={rad(180)} onChange={setTh}
                fmt={v => `${deg(v).toFixed(0)}°`} color={ACCENT} width={150} />
              <LabeledSlider label="β" value={th2} min={rad(-90)} max={rad(90)} onChange={setTh2}
                fmt={v => `${deg(v).toFixed(0)}°`} color="#9c7bd9" width={150} />
              <LabeledSlider label="γ" value={th3} min={rad(-180)} max={rad(180)} onChange={setTh3}
                fmt={v => `${deg(v).toFixed(0)}°`} color="#b89ce8" width={150} />
            </>
          )}
        </ControlBar>

        {/* freedoms / constraints chips */}
        <div className="ui flex flex-wrap items-center gap-1.5 mt-3">
          {chips.map(ch => (
            <span
              key={ch.label}
              className={`text-[11.5px] px-2 py-0.5 rounded-full border ${
                ch.free
                  ? "border-[#bfdfc4] bg-[#f0f8f1] text-[#2f9e44]"
                  : "border-[#e8c8c5] bg-[#fbeeed] text-[#d9483f]"
              }`}
            >
              {ch.label}
            </span>
          ))}
          <span className="ml-2 mono text-[12px] text-[var(--ink-soft)]">
            f + c = {f} + {c} = {m}
          </span>
        </div>
      </WidgetShell>

      <Challenge id="ch2-joints-helical" met={climbed}>
        Select the <strong>H</strong> joint and raise the orange link's advance to{" "}
        <M>{"|h\\theta| \\geq 0.6"}</M> — using only the <em>rotation</em> slider (you may pick the
        pitch first). You are commanding a translation you have no slider for: that is what
        "coupled" means. Then drag the pitch to 0 and watch the screw degenerate into a hinge.
      </Challenge>
    </>
  );
}
