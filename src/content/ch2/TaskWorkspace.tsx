import { useRef, useState } from "react";
import { Line } from "@react-three/drei";
import { DoubleSide } from "three";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D } from "../../components/three/Scene3D";
import { svgCoords } from "../../lib/svg";
import { rad, deg, wrapAngle, type Vec3 } from "../../lib/math/vec";

export default function TaskWorkspace() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 2"
        section="Configuration Space"
        title="Task Space & Workspace"
        lede="A robot's C-space describes the robot. The task space and workspace describe what the robot is for. These are different spaces, and confusing them causes real design errors."
      />

      <p>
        Everything so far has characterized the robot from the inside: how many DOF it has, what
        shape its configuration space is, what constraints it operates under. But a robot exists to
        move things in the world. The relevant question for a task is not "what are the joint
        angles?" but "where is the end-effector, and with what orientation?"
      </p>

      <H2>Task space</H2>
      <p>
        The <strong>task space</strong> is the space in which the task is naturally described — the
        coordinate system that captures exactly what matters for completing the task. Critically,
        the task space is defined by the <em>task</em>, not by the robot.
      </p>
      <p>
        The dimension and topology of the task space depend entirely on what you need the
        end-effector to do:
      </p>
      <p>
        Writing on a whiteboard requires the pen tip to be at a 2D position on the board surface.
        Nothing else — not the orientation of the pen — matters. Task space: <M>{"\\mathbb{R}^2"}</M>.
      </p>
      <p>
        Welding along a seam in 3D requires the torch at a position in space, pointed in the
        correct direction (the direction of the weld). The rotation of the torch about the weld
        axis is irrelevant. Task space: <M>{"\\mathbb{R}^3 \\times S^2"}</M> — position plus a
        direction (5 DOF).
      </p>
      <p>
        Picking up a mug requires the gripper at a 3D position with a specific full orientation.
        All 6 rigid-body DOF matter. Task space:{" "}
        <M>{"\\mathbb{R}^3 \\times S^2 \\times S^1"}</M> — equivalently,{" "}
        <M>{"SE(3)"}</M> (6 DOF).
      </p>
      <p>
        The spray-painting example makes the point most sharply. The nozzle must be positioned in
        3D and aimed at the surface (a direction), but rotating the nozzle about its own spray axis
        distributes paint identically — that rotation is genuinely irrelevant to the task. Specifying
        the full 6-DOF pose for a spray-painting task over-constrains the system: you would be
        asking the robot to control something that doesn't matter. The correct task space is{" "}
        <M>{"\\mathbb{R}^3 \\times S^2"}</M>, not <M>{"\\mathbb{R}^3 \\times S^2 \\times S^1"}</M>.
      </p>

      <H2>The forward kinematics map</H2>
      <p>
        A robot's C-space and its task space are connected by the{" "}
        <strong>forward kinematics map</strong>:
      </p>
      <Eq>{"f : \\mathcal{C} \\to \\mathcal{T}, \\qquad q \\mapsto x"}</Eq>
      <p>
        Given the robot's configuration <M>{"q"}</M> (all joint angles or displacements), the
        forward kinematics map returns the end-effector's task-space description <M>{"x"}</M>.
        Chapters 3 and 4 are entirely devoted to deriving this map for general open-chain robots.
        For now, the key fact is that such a map exists and is smooth.
      </p>
      <p>
        The map <M>{"f"}</M> is generally <em>many-to-one</em>: different configurations{" "}
        <M>{"q"}</M> can produce the same end-effector pose <M>{"x"}</M>. An elbow-up and
        elbow-down configuration of a 6-DOF arm can both position the wrist at the same location
        with the same orientation. This many-to-one nature is the origin of inverse kinematics
        ambiguity — the subject of Chapter 6.
      </p>

      <H2>Workspace</H2>
      <p>
        The <strong>workspace</strong> of a robot is the set of end-effector configurations it can
        achieve — the image of the C-space under the forward kinematics map:
      </p>
      <Eq>{"\\mathcal{W} = \\{ f(q) : q \\in \\mathcal{C} \\} \\subseteq \\mathcal{T}"}</Eq>
      <p>
        The workspace is defined by the <em>robot</em>, not the task. It tells you what the robot
        can reach, regardless of what it is supposed to do. The workspace is always a subset of the
        task space — and often a proper subset, because joint limits, link lengths, and mechanical
        interference prevent the robot from reaching every task-space configuration.
      </p>
      <p>
        Two sub-concepts are useful:
      </p>
      <p>
        The <strong>reachable workspace</strong> is the set of all end-effector positions
        (ignoring orientation) that the robot can reach in at least one configuration.
      </p>
      <p>
        The <strong>dexterous workspace</strong> is the subset of the reachable workspace where
        the end-effector can achieve <em>every</em> orientation. The dexterous workspace is always
        smaller than or equal to the reachable workspace. Many practical robots have a non-trivial
        reachable workspace but a very small (or empty) dexterous workspace.
      </p>
      <p>
        For a planar 2R arm the workspace has a clean closed form: every point at distance{" "}
        <M>{"r"}</M> from the base with{" "}
        <M>{"|l_1 - l_2| \\leq r \\leq l_1 + l_2"}</M> — an <strong>annulus</strong>. Change the
        link lengths and watch the annulus answer:
      </p>

      <Workspace2R />

      <H2>Three-way comparison</H2>
      <p>
        The three spaces characterize three different aspects of a robotic system:
      </p>
      <p>
        The <strong>configuration space</strong> <M>{"\\mathcal{C}"}</M> is the set of all
        possible states of the entire robot — every joint value simultaneously. It depends only on
        the robot's mechanical structure. Planning happens in C-space.
      </p>
      <p>
        The <strong>task space</strong> <M>{"\\mathcal{T}"}</M> is the coordinate system in which
        the task is stated — the output space for the end-effector. It depends only on the task.
        Task specifications are given in task space.
      </p>
      <p>
        The <strong>workspace</strong> <M>{"\\mathcal{W} \\subseteq \\mathcal{T}"}</M> is the
        set of task-space configurations the robot can actually achieve. It depends on both the
        robot and the task space — it is the robot's range in the task's language.
      </p>
      <p>
        A task is feasible if and only if every required task-space configuration lies in the
        workspace. Checking this is often the first step in robot selection for a new application.
      </p>

      <KeyIdea>
        C-space tells you where the robot can be. Task space tells you what the robot needs to do.
        Workspace is the intersection: what the robot can do in the task's language. All three
        are different, and conflating them leads to incorrect DOF counts, wrong controller designs,
        and unreachable motion plans.
      </KeyIdea>

      <H2>SCARA robot</H2>
      <p>
        The SCARA (Selective Compliance Assembly Robot Arm) has the joint arrangement RRRP: three
        revolute joints followed by one prismatic joint. All three revolute joints rotate about
        vertical axes; the prismatic joint moves vertically.
      </p>
      <p>
        Its <strong>C-space</strong> is <M>{"T^3 \\times \\mathbb{R}"}</M>: three revolute joints
        each contributing a circle, plus one prismatic joint contributing a line.
      </p>
      <p>
        Its end-effector can translate freely in <M>{"x, y"}</M> (by the first two joints),
        move up and down in <M>{"z"}</M> (by the prismatic joint), and rotate about the vertical
        axis (by the sum of all three revolute angles). It <em>cannot</em> tilt the end-effector
        — no joint tilts the final link away from vertical. So the <strong>task space</strong> for
        typical SCARA applications is <M>{"\\mathbb{R}^3 \\times S^1"}</M>: three-dimensional
        position plus rotation about the vertical axis (4 DOF).
      </p>
      <p>
        The <strong>workspace</strong> is the set of <M>{"(x, y, z, \\phi)"}</M> positions
        reachable given finite link lengths: in the horizontal plane, an annular region swept
        by the two horizontal links; vertically, the range of the prismatic actuator — the 2R
        annulus from above, extruded into a sleeve. SCARA robots
        are common in electronics assembly precisely because assembly tasks — placing chips on a
        board — live naturally in <M>{"\\mathbb{R}^2 \\times \\mathbb{R} \\times S^1"}</M>, which
        is exactly the SCARA's task space. Drive it — and notice which sliders you{" "}
        <em>don't</em> have:
      </p>

      <ScaraWidget />

      <H2>Redundancy and the extra DOF</H2>
      <p>
        If the dimension of C-space exceeds the dimension of the task space, the robot is{" "}
        <strong>kinematically redundant</strong> for that task. The forward kinematics map
        is then many-to-one in a higher-dimensional sense: there is a whole family of
        configurations — a manifold of configurations — that achieves each task-space point.
      </p>
      <p>
        A 7-DOF arm asked to perform a 6-DOF task has one redundant DOF. At each target
        end-effector pose, a one-parameter family of joint configurations achieves it — the extra
        DOF creates a null space. That null space can be used to optimize a secondary objective:
        avoiding joint limits, avoiding obstacles, minimizing torques, or avoiding singular
        configurations — all while the end-effector stays exactly where the task requires.
      </p>
      <p>
        Redundancy is a feature, not a flaw. The human arm is redundant (7 joints for a 6-DOF
        task); this allows you to reach around obstacles, keep your elbow out of the way, and
        maintain a comfortable posture while holding an object steady. Chapter 5 (velocity
        kinematics) and Chapter 6 (inverse kinematics) develop the tools — the Jacobian and its
        pseudoinverse — for systematically exploiting this redundancy.
      </p>

      <Aside>
        The concept of task space generalizes further. For some tasks, the relevant space is not a
        submanifold of <M>{"SE(3)"}</M> at all. Cooperative manipulation (two robots holding one
        object), whole-body control (humanoids), or multi-fingered grasping all require task spaces
        that combine multiple end-effector poses, contact forces, and object configurations. The
        vocabulary of C-space, task space, and workspace — built in this chapter — extends to all
        of these more complex settings.
      </Aside>

      <p>
        This page closes the foundational chapter. Everything that follows — rotation matrices,
        screw theory, the product of exponentials, the Jacobian, inverse kinematics — is the
        machinery for computing and working in these spaces. The vocabulary introduced here (DOF,
        C-space, topology, constraints, task space, workspace) will appear on every subsequent
        page.
      </p>

      <BookRef>Modern Robotics §2.3.2 — Configuration Space of the Open Chain; §2.3.3 — Configuration and Velocity Constraints.</BookRef>
    </div>
  );
}

/* ================= widget: 2R reachable workspace ================= */

const WW = 760;
const WH = 400;
const WBASE: [number, number] = [310, 200];

function Workspace2R() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [l1, setL1] = useState(110);
  const [l2, setL2] = useState(70);
  const [q, setQ] = useState<[number, number]>([rad(40), rad(-70)]);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const dragging = useRef<"elbow" | "tip" | null>(null);

  const [t1, t2] = q;
  const elbow: [number, number] = [WBASE[0] + l1 * Math.cos(t1), WBASE[1] - l1 * Math.sin(t1)];
  const tip: [number, number] = [
    elbow[0] + l2 * Math.cos(t1 + t2),
    elbow[1] - l2 * Math.sin(t1 + t2),
  ];

  const rOut = l1 + l2;
  const rIn = Math.abs(l1 - l2);
  const tipR = Math.hypot(tip[0] - WBASE[0], tip[1] - WBASE[1]);

  const update = (n1: number, n2: number) => {
    setQ([n1, n2]);
    setTrail(t => {
      const e: [number, number] = [WBASE[0] + l1 * Math.cos(n1), WBASE[1] - l1 * Math.sin(n1)];
      const p: [number, number] = [e[0] + l2 * Math.cos(n1 + n2), e[1] - l2 * Math.sin(n1 + n2)];
      const next = [...t, p];
      return next.length > 400 ? next.slice(next.length - 400) : next;
    });
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !svgRef.current) return;
    const [x, y] = svgCoords(e, svgRef.current, WW, WH);
    if (dragging.current === "elbow") {
      update(Math.atan2(WBASE[1] - y, x - WBASE[0]), t2);
    } else {
      update(t1, Math.atan2(elbow[1] - y, x - elbow[0]) - t1);
    }
  };

  const met = rIn < 2 && tipR < 12;

  return (
    <>
      <WidgetShell
        title="The 2R arm's reachable workspace — an annulus you can resize"
        onReset={() => {
          setL1(110);
          setL2(70);
          setQ([rad(40), rad(-70)]);
          setTrail([]);
        }}
        caption={
          <>
            The green region is every point the tip can reach:{" "}
            <span className="mono">|l₁−l₂| ≤ r ≤ l₁+l₂</span>. Drag the elbow and tip; resize the
            links and watch the workspace — not the task — change. The hole in the middle is real:
            a too-different pair of links cannot reach its own base.
          </>
        }
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WW} ${WH}`}
          className="w-full touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={() => (dragging.current = null)}
          onPointerLeave={() => (dragging.current = null)}
        >
          {/* annulus: outer circle minus inner hole */}
          <path
            d={`M ${WBASE[0] - rOut} ${WBASE[1]}
                a ${rOut} ${rOut} 0 1 0 ${2 * rOut} 0
                a ${rOut} ${rOut} 0 1 0 ${-2 * rOut} 0 Z
                M ${WBASE[0] - rIn} ${WBASE[1]}
                a ${rIn} ${rIn} 0 1 0 ${2 * rIn} 0
                a ${rIn} ${rIn} 0 1 0 ${-2 * rIn} 0 Z`}
            fill="#2f9e4418"
            fillRule="evenodd"
            stroke="none"
          />
          <circle cx={WBASE[0]} cy={WBASE[1]} r={rOut} fill="none" stroke="#2f9e44" strokeWidth={1.6} opacity={0.7} />
          {rIn > 0.5 && (
            <circle cx={WBASE[0]} cy={WBASE[1]} r={rIn} fill="none" stroke="#2f9e44" strokeWidth={1.6}
              strokeDasharray="5 5" opacity={0.7} />
          )}

          {/* tip trail */}
          {trail.length > 1 && (
            <polyline
              points={trail.map(p => p.join(",")).join(" ")}
              fill="none" stroke="#6741d9" strokeWidth={1.4} opacity={0.4}
            />
          )}

          {/* arm */}
          <line x1={WBASE[0]} y1={WBASE[1]} x2={elbow[0]} y2={elbow[1]} stroke="#6741d9" strokeWidth={9} strokeLinecap="round" />
          <line x1={elbow[0]} y1={elbow[1]} x2={tip[0]} y2={tip[1]} stroke="#c2571c" strokeWidth={7} strokeLinecap="round" />
          <circle cx={WBASE[0]} cy={WBASE[1]} r={7} fill="#fff" stroke="#33343d" strokeWidth={2} />
          <g className="cursor-grab" onPointerDown={e => { e.preventDefault(); dragging.current = "elbow"; (e.target as Element).setPointerCapture?.(e.pointerId); }}>
            <circle cx={elbow[0]} cy={elbow[1]} r={15} fill="#6741d922" />
            <circle cx={elbow[0]} cy={elbow[1]} r={6.5} fill="#fff" stroke="#6741d9" strokeWidth={2.5} />
          </g>
          <g className="cursor-grab" onPointerDown={e => { e.preventDefault(); dragging.current = "tip"; (e.target as Element).setPointerCapture?.(e.pointerId); }}>
            <circle cx={tip[0]} cy={tip[1]} r={15} fill="#c2571c22" />
            <circle cx={tip[0]} cy={tip[1]} r={6.5} fill="#fff" stroke="#c2571c" strokeWidth={2.5} />
          </g>
        </svg>
        <ControlBar>
          <LabeledSlider label="l₁" value={l1} min={40} max={130} step={1} onChange={setL1}
            fmt={v => v.toFixed(0)} color="#6741d9" width={150} />
          <LabeledSlider label="l₂" value={l2} min={40} max={130} step={1} onChange={setL2}
            fmt={v => v.toFixed(0)} color="#c2571c" width={150} />
          <Readout label="reach r ∈" value={`[${rIn.toFixed(0)}, ${rOut.toFixed(0)}]`} color="#2f9e44" />
          <Readout label="tip r" value={tipR.toFixed(0)} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch2-ws-disk" met={met} holdMs={400}>
        Make the workspace hole disappear: set <M>{"l_1 = l_2"}</M>, then fold the arm fully back
        on itself and <strong>touch the base</strong> with the tip. Equal links are the only way a
        2R arm can reach its own shoulder — the annulus closes into a disk exactly when{" "}
        <M>{"|l_1 - l_2| = 0"}</M>.
      </Challenge>
    </>
  );
}

/* ================= widget: SCARA in 3D ================= */

const SC_L1 = 0.9;
const SC_L2 = 0.7;
const SC_ZMIN = -0.6;
const SC_ZMAX = 0.25;
const SC_TARGET = { x: 0.55, y: 0.85, z: -0.25, phi: rad(135) };

function ScaraWidget() {
  const [t1, setT1] = useState(rad(35));
  const [t2, setT2] = useState(rad(45));
  const [t3, setT3] = useState(rad(0));
  const [dz, setDz] = useState(-0.1);

  const x = SC_L1 * Math.cos(t1) + SC_L2 * Math.cos(t1 + t2);
  const y = SC_L1 * Math.sin(t1) + SC_L2 * Math.sin(t1 + t2);
  const phi = wrapAngle(t1 + t2 + t3);

  const rOut = SC_L1 + SC_L2;
  const rIn = Math.abs(SC_L1 - SC_L2);
  const zMid = (SC_ZMIN + SC_ZMAX) / 2;
  const zH = SC_ZMAX - SC_ZMIN;

  const met =
    Math.abs(x - SC_TARGET.x) < 0.07 &&
    Math.abs(y - SC_TARGET.y) < 0.07 &&
    Math.abs(dz - SC_TARGET.z) < 0.07 &&
    Math.abs(deg(wrapAngle(phi - SC_TARGET.phi))) < 8;

  const ring = (r: number, z: number): Vec3[] => {
    const pts: Vec3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * 2 * Math.PI;
      pts.push([r * Math.cos(a), r * Math.sin(a), z]);
    }
    return pts;
  };

  const targetTick: Vec3[] = [
    [SC_TARGET.x, SC_TARGET.y, SC_TARGET.z],
    [SC_TARGET.x + 0.26 * Math.cos(SC_TARGET.phi), SC_TARGET.y + 0.26 * Math.sin(SC_TARGET.phi), SC_TARGET.z],
  ];

  return (
    <>
      <WidgetShell
        title="SCARA — four sliders, and tilt is not among them"
        onReset={() => {
          setT1(rad(35));
          setT2(rad(45));
          setT3(rad(0));
          setDz(-0.1);
        }}
        caption={
          <>
            The green sleeve is the workspace: the 2R annulus extruded over the prismatic stroke.
            The end-effector reaches any <span className="mono">(x, y, z, φ)</span> inside it — but
            there is no slider that tilts the tool, because no joint provides that freedom. Gold
            marks the challenge target pose.
          </>
        }
      >
        <Scene3D camera={[2.8, 2.4, 3.0]} height={400}>
          {/* workspace sleeve */}
          <mesh position={[0, 0, zMid]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[rOut, rOut, zH, 64, 1, true]} />
            <meshStandardMaterial color="#2f9e44" transparent opacity={0.1} side={DoubleSide} depthWrite={false} />
          </mesh>
          {rIn > 0.01 && (
            <mesh position={[0, 0, zMid]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[rIn, rIn, zH, 48, 1, true]} />
              <meshStandardMaterial color="#2f9e44" transparent opacity={0.14} side={DoubleSide} depthWrite={false} />
            </mesh>
          )}
          <Line points={ring(rOut, SC_ZMAX)} color="#2f9e44" lineWidth={1.4} transparent opacity={0.6} />
          <Line points={ring(rOut, SC_ZMIN)} color="#2f9e44" lineWidth={1.4} transparent opacity={0.6} />
          <Line points={ring(rIn, SC_ZMAX)} color="#2f9e44" lineWidth={1.2} transparent opacity={0.5} />
          <Line points={ring(rIn, SC_ZMIN)} color="#2f9e44" lineWidth={1.2} transparent opacity={0.5} />

          {/* target pose: dot + heading tick */}
          <mesh position={[SC_TARGET.x, SC_TARGET.y, SC_TARGET.z]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#caa53d" emissive="#caa53d" emissiveIntensity={met ? 0.8 : 0.35} />
          </mesh>
          <Line points={targetTick} color="#caa53d" lineWidth={2.5} />

          {/* base column */}
          <mesh position={[0, 0, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.14, 0.18, 1.9, 24]} />
            <meshStandardMaterial color="#8d8d99" />
          </mesh>

          {/* link 1 (rotates about base z) */}
          <group rotation={[0, 0, t1]}>
            <mesh position={[SC_L1 / 2, 0, 0.52]}>
              <boxGeometry args={[SC_L1 + 0.16, 0.2, 0.12]} />
              <meshStandardMaterial color="#6741d9" />
            </mesh>
            {/* link 2 */}
            <group position={[SC_L1, 0, 0]} rotation={[0, 0, t2]}>
              <mesh position={[SC_L2 / 2, 0, 0.38]}>
                <boxGeometry args={[SC_L2 + 0.14, 0.17, 0.1]} />
                <meshStandardMaterial color="#c2571c" />
              </mesh>
              {/* wrist: prismatic shaft + tool */}
              <group position={[SC_L2, 0, 0]}>
                <mesh position={[0, 0, (0.38 + dz) / 2]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.045, 0.045, Math.max(0.1, 0.38 - dz), 16]} />
                  <meshStandardMaterial color="#50525e" />
                </mesh>
                {/* tool, carrying the final revolute */}
                <group position={[0, 0, dz]} rotation={[0, 0, t3]}>
                  <mesh>
                    <boxGeometry args={[0.3, 0.09, 0.07]} />
                    <meshStandardMaterial color="#33343d" />
                  </mesh>
                  <Line points={[[0, 0, 0], [0.26, 0, 0]]} color="#6741d9" lineWidth={3} />
                </group>
              </group>
            </group>
          </group>
        </Scene3D>

        <ControlBar>
          <LabeledSlider label="θ₁" value={t1} min={rad(-160)} max={rad(160)} onChange={setT1}
            fmt={v => `${deg(v).toFixed(0)}°`} color="#6741d9" width={140} />
          <LabeledSlider label="θ₂" value={t2} min={rad(-145)} max={rad(145)} onChange={setT2}
            fmt={v => `${deg(v).toFixed(0)}°`} color="#c2571c" width={140} />
          <LabeledSlider label="θ₃" value={t3} min={rad(-180)} max={rad(180)} onChange={setT3}
            fmt={v => `${deg(v).toFixed(0)}°`} color="#33343d" width={140} />
          <LabeledSlider label="d" value={dz} min={SC_ZMIN} max={SC_ZMAX} onChange={setDz}
            fmt={v => v.toFixed(2)} color="#3b6fd4" width={140} />
          <Readout label="(x, y, z, φ)" value={`(${x.toFixed(2)}, ${y.toFixed(2)}, ${dz.toFixed(2)}, ${deg(phi).toFixed(0)}°)`} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch2-ws-scara" met={met}>
        Put the tool on the gold target: position <M>{"(0.55,\\, 0.85,\\, -0.25)"}</M> with
        heading <M>{"\\varphi = 135^\\circ"}</M> (tool line on the gold tick). Four numbers, four
        sliders — the SCARA's task space really is <M>{"\\mathbb{R}^3 \\times S^1"}</M>, and
        assembly tasks ask for nothing more.
      </Challenge>
    </>
  );
}
