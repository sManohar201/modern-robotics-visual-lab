import { useEffect, useRef, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { deg, wrapAngle, clamp } from "../../lib/math/vec";

/* ============================================================
   Page 13.2 — Omnidirectional vs. Differential Drive
   Two robots, real forward kinematics from MR §13.2/§13.3.

   Differential drive (MR Eq. 13.15), wheel radius r, half-track d:
       phi_dot = r (u_R - u_L) / (2d)
       v_bx    = r (u_R + u_L) / 2
       v_by    = 0                      <-- cannot strafe
   Equivalently the body twist V_b = (omega, v_bx, 0) with
       v = r(u_L+u_R)/2,  omega = r(u_R-u_L)/(2d).

   Mecanum (MR Eq. 13.10), wheel radius r, half-length l, half-width w:
       u = (1/r) H0 V_b,  H0 = [[-(l+w),1,-1],
                                [ (l+w),1, 1],
                                [ (l+w),1,-1],
                                [-(l+w),1, 1]]
   The body can realise ANY V_b = (omega, v_bx, v_by): full 3-DOF.
   We DRIVE the body from a commanded twist (omega, vx, vy); for the
   diff-drive we honestly project away v_by (it physically cannot do it).
   ============================================================ */

const SVGW = 360;
const SVGH = 320;
const PPM = 30; // pixels per metre
const R = 0.06; // wheel radius (m)
const D = 0.18; // diff-drive half-track (m)
const L = 0.18; // mecanum half-length (m)
const W = 0.18; // mecanum half-width (m)
const BODY = 0.6; // drawn chassis half-size (m) for visuals

type Pose = { x: number; y: number; phi: number };
type Twist = { w: number; vx: number; vy: number }; // body twist (omega_bz, v_bx, v_by)

// ---- forward kinematics: body twist -> wheel speeds ----
function diffWheels(t: Twist): { uL: number; uR: number } {
  // v = r(uL+uR)/2 , omega = r(uR-uL)/(2d)  =>  invert
  const uL = (t.vx - t.w * D) / R;
  const uR = (t.vx + t.w * D) / R;
  return { uL, uR };
}
function mecanumWheels(t: Twist): number[] {
  const lw = L + W;
  // u_i = (1/r) [ row ] . (omega, vx, vy)
  const rows = [
    [-lw, 1, -1],
    [lw, 1, 1],
    [lw, 1, -1],
    [-lw, 1, 1],
  ];
  return rows.map(rw => (rw[0] * t.w + rw[1] * t.vx + rw[2] * t.vy) / R);
}

// diff-drive can only realise the heading component of a commanded twist:
// project v_by away (it is physically forbidden by no-side-slip).
function diffRealizable(cmd: Twist): Twist {
  return { w: cmd.w, vx: cmd.vx, vy: 0 };
}
const mecanumRealizable = (cmd: Twist): Twist => cmd; // full 3-DOF

// integrate a body twist into world pose for dt seconds (planar, midpoint)
function integrate(p: Pose, t: Twist, dt: number): Pose {
  const c = Math.cos(p.phi), s = Math.sin(p.phi);
  // body-frame velocity rotated into the world frame
  const xdot = c * t.vx - s * t.vy;
  const ydot = s * t.vx + c * t.vy;
  return {
    x: p.x + xdot * dt,
    y: p.y + ydot * dt,
    phi: wrapAngle(p.phi + t.w * dt),
  };
}

function toPx(x: number, y: number): [number, number] {
  return [SVGW / 2 + x * PPM, SVGH / 2 - y * PPM];
}

export default function DriveKinematics() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 13"
        section="Wheeled Mobile Robots"
        title="Omnidirectional vs. Differential Drive"
        lede="Two robots, the same wheel motors, completely different abilities. One can slide straight sideways; the other can only ever drive along its nose. The difference is a single number attached to a 3×3 matrix."
      />

      <p>
        Push your office chair. It glides in any direction you push — sideways into the desk gap,
        diagonally toward the window, spinning as it goes. Now think about your car. It has plenty
        of engine, but it <em>cannot</em> slide sideways into a parking spot; the only way in is
        the familiar back-and-forth shuffle. Both machines roll on wheels. What separates them is
        not power or wheel count — it is what directions the wheels <em>allow</em>, and this
        lesson pins that difference down to one matrix.
      </p>

      <p>
        Recall from the previous lesson that a planar chassis's motion at any instant is its{" "}
        <strong>body twist</strong> — the triple{" "}
        <M>{"\\mathcal{V}_b = (\\omega_{bz}, v_{bx}, v_{by})"}</M> of turn rate, forward speed,
        and sideways speed, all measured in the robot's own frame. Every wheeled base connects the
        wheel driving speeds <M>{"u"}</M> to that twist through one kinematic matrix, and because
        it is written in the body frame it does not care which way the robot happens to be facing:
      </p>
      <Eq>{"u = H(0)\\,\\mathcal{V}_b, \\qquad H(0) \\in \\mathbb{R}^{m \\times 3}."}</Eq>
      <p>
        Read it back: pick any chassis motion you would like — some mix of turning, driving, and
        strafing — and <M>{"H(0)"}</M> tells you what each of the <M>{"m"}</M> wheels would have
        to spin at to produce it. If <em>every</em> twist yields a valid wheel-speed assignment,
        the robot can move any way it likes. If some twist yields no consistent assignment, that
        motion is simply unavailable — no controller can summon it.
      </p>

      <p>
        Which case you are in is decided by the <strong>rank</strong> of <M>{"H(0)"}</M> — the
        number of genuinely independent motion directions the matrix can account for, out of the 3
        it has columns for. Rank 3 means every body twist, including pure sideways motion{" "}
        <M>{"v_{by}"}</M>, has a wheel-speed solution. Rank 2 means one whole direction of motion
        has been silently deleted: for a normal wheel, that deleted direction is sliding along the
        axle, and the resulting rule <M>{"v_{by} = 0"}</M> is exactly the no-side-slip constraint.
      </p>

      <Aside>
        Rank is the "how many directions survive the matrix" number from linear algebra — the same
        idea as counting how flat a matrix squashes its input space. If it feels slippery, the{" "}
        <a href="#/math2-linalg">Math 2 · Linear algebra module</a> builds it with a picture, and
        the <a href="#/ch13-nonholonomic">previous lesson</a> introduces the constraint vocabulary
        used here.
      </Aside>

      <p>
        A velocity rule like <M>{"v_{by} = 0"}</M> that cannot be re-expressed as a fence in
        position space is called a <strong>nonholonomic constraint</strong>: it forbids certain{" "}
        <em>velocities</em> without shrinking the set of poses the robot can eventually reach.
        Your car is the everyday example — it can occupy any parking spot on the street, it just
        cannot travel there sideways.
      </p>

      <KeyIdea>
        One matrix, one question: does <M>{"u = H(0)\\mathcal{V}_b"}</M> have a wheel-speed answer
        for <em>every</em> body twist? Rank 3 — yes, the robot is omnidirectional. Rank 2 — no,
        one velocity direction is forbidden, and the robot is nonholonomic.
      </KeyIdea>

      <H2>Differential drive: forward + turn only</H2>
      <p>
        A diff-drive robot has two independently driven wheels of radius <M>{"r"}</M> a distance{" "}
        <M>{"2d"}</M> apart, plus a passive caster to keep it from tipping. Two motors give two
        knobs: spin the wheels together and it drives; spin them against each other and it turns
        in place. Writing that down (MR Eq. 13.15, wheel-angle rows dropped):
      </p>
      <Eq>{"\\begin{bmatrix} \\dot\\phi \\\\ \\dot x \\\\ \\dot y \\end{bmatrix} = \\begin{bmatrix} -r/2d & r/2d \\\\ \\tfrac{r}{2}\\cos\\phi & \\tfrac{r}{2}\\cos\\phi \\\\ \\tfrac{r}{2}\\sin\\phi & \\tfrac{r}{2}\\sin\\phi \\end{bmatrix} \\begin{bmatrix} u_L \\\\ u_R \\end{bmatrix},"}</Eq>
      <p>
        Read it back: in body coordinates this is just <M>{"v = \\tfrac{r}{2}(u_L + u_R)"}</M>{" "}
        forward and <M>{"\\omega = \\tfrac{r}{2d}(u_R - u_L)"}</M> turn — the sum of the wheel
        speeds drives, the difference steers. Nothing in the equation ever produces a sideways
        component: <M>{"v_{by} \\equiv 0"}</M> no matter what you feed the motors. The two
        controls only ever address heading and forward speed; a sideways slide is not hard for
        this robot, it is <em>unrepresentable</em>.
      </p>

      <H2>Mecanum: instantaneous omnidirectional motion</H2>
      <p>
        Now replace the wheels with four <strong>mecanum wheels</strong> — wheels whose rims carry
        free-spinning rollers mounted at <M>{"\\gamma = \\pm45^\\circ"}</M>, so each wheel can
        passively glide along its roller direction while it actively drives. With chassis
        half-length <M>{"\\ell"}</M> and half-width <M>{"w"}</M>, the kinematic matrix becomes
        (MR Eq. 13.10):
      </p>
      <Eq>{"u = \\frac{1}{r}\\begin{bmatrix} -\\ell-w & 1 & -1 \\\\ \\ell+w & 1 & 1 \\\\ \\ell+w & 1 & -1 \\\\ -\\ell-w & 1 & 1 \\end{bmatrix} \\begin{bmatrix} \\omega_{bz} \\\\ v_{bx} \\\\ v_{by} \\end{bmatrix}."}</Eq>
      <p>
        Read it back column by column. To go forward (middle column), all four wheels spin the
        same way. To strafe along <M>{"+\\hat y_b"}</M> (right column), wheels 1 and 3 drive
        backward while 2 and 4 drive forward — the drive components cancel, the roller glide adds
        up sideways. To spin in place (left column), the diagonal pairs oppose. This matrix has
        rank 3: all three twist components get their own independent wheel pattern, so you can mix
        any <M>{"\\mathcal{V}_b"}</M> you want — the chassis is just as happy sideways as forward,
        and there is no forbidden-velocity (nonholonomic) constraint at all.
      </p>

      <p>
        <strong>Try this:</strong> in the sandbox below, first press <strong>Go</strong> with the
        target straight ahead — both robots reach it and look equally capable. Then reset, drag
        the <strong>strafe</strong> slider to put the target 3 m straight to the side, and press
        Go again. Watch the green mecanum robot slide over with its nose still pointing forward,
        while the blue diff-drive has to spin, drive the long way, and spin back. Compare the
        wheel-speed readouts while the mecanum strafes: opposite signs on the diagonal pairs, the
        pattern from the matrix's third column.
      </p>

      <Sandbox />

      <KeyIdea>
        Diff-drive: <M>{"H(0)"}</M> effectively rank 2, so <M>{"v_{by} = 0"}</M> is forced — a
        nonholonomic robot that must turn-and-drive to translate sideways. Mecanum:{" "}
        <M>{"H(0)"}</M> rank 3, so <M>{"u = H(0)\\mathcal{V}_b"}</M> inverts for every twist — an
        omnidirectional robot that strafes instantly while holding its heading. Same motors, same
        twist command; one robot tracks it exactly, the other cannot.
      </KeyIdea>

      <H2>Traps</H2>
      <ul>
        <li>
          <strong>Nonholonomic does not mean unreachable.</strong> The diff-drive can park at{" "}
          <em>every</em> pose the mecanum can — the constraint forbids velocity directions, not
          destinations. What it costs is the path: turn, drive, turn again.
        </li>
        <li>
          <strong>More wheels is not more freedom.</strong> The mecanum robot has 4 wheels but
          still only 3 degrees of freedom — rank is a property of wheel <em>geometry</em>, not
          motor count. Four ordinary fixed wheels would give you rank 2 (or worse, a robot that
          fights itself).
        </li>
        <li>
          <strong>Four equations, three unknowns.</strong> For the mecanum robot,{" "}
          <M>{"u = H(0)\\mathcal{V}_b"}</M> assigns all four wheel speeds from just three twist
          numbers — so the wheel speeds are not independent. Command four arbitrary speeds that
          break the pattern and the wheels fight; the rollers skid to absorb the disagreement.
        </li>
        <li>
          <strong>Omnidirectional is not free.</strong> Mecanum rollers trade efficiency and grip
          for the extra freedom — real omnidirectional bases are happiest on smooth, clean indoor
          floors, which is why your car still has normal wheels.
        </li>
      </ul>

      <Aside>
        Omnidirectionality is purely a wheel-geometry property: <M>{"H(0)"}</M> must be rank 3. If
        you built a robot whose omniwheels all shared one driving and one sliding direction,{" "}
        <M>{"H(0)"}</M> would collapse to rank 2 and you would be back to a nonholonomic base. The
        feasible body twists are bounded by the per-wheel speed limits{" "}
        <M>{"|u_i| \\le u_{\\max}"}</M>, carving out a convex polyhedron in twist space.
      </Aside>

      <Quiz
        challengeId="ch13-drive-quiz"
        goal={<>Answer all three questions correctly.</>}
        questions={[
          {
            prompt: (
              <>
                A wheeled base has <M>{"\\operatorname{rank} H(0) = 2"}</M>. What does that mean
                physically?
              </>
            ),
            options: [
              { label: "It can only reach poses in a 2-D subset of the plane" },
              {
                label: "One whole direction of body velocity has no wheel-speed solution — it cannot strafe",
                correct: true,
              },
              { label: "It has exactly two wheels" },
            ],
            explain: (
              <>
                Rank counts independent velocity directions the wheels can realise. Rank 2 deletes
                one of the three twist components — for ordinary wheels, the sideways one. It says
                nothing about wheel count, and (because the constraint is nonholonomic) nothing
                about which poses are reachable.
              </>
            ),
          },
          {
            prompt: (
              <>
                Because of its no-side-slip constraint, is there a parking spot the diff-drive
                robot can never occupy but the mecanum robot can?
              </>
            ),
            options: [
              { label: "Yes — spots that require sideways entry are unreachable" },
              {
                label: "No — the constraint limits velocities, not reachable poses; only the path is longer",
                correct: true,
              },
              { label: "Yes — the diff-drive can only reach poses on its current heading line" },
            ],
            explain: (
              <>
                That is the defining property of a nonholonomic constraint: it forbids certain
                instantaneous motions while leaving the full pose space reachable through
                manoeuvres — exactly the parallel-parking shuffle.
              </>
            ),
          },
          {
            prompt: (
              <>
                The mecanum robot's <M>{"H(0)"}</M> is 4×3. If you commanded four arbitrary,
                independent wheel speeds, what would happen?
              </>
            ),
            options: [
              { label: "The robot would gain a fourth degree of freedom" },
              { label: "Nothing special — any four speeds map to some twist exactly" },
              {
                label: "In general the four speeds are inconsistent; the rollers skid to absorb the disagreement",
                correct: true,
              },
            ],
            explain: (
              <>
                Only wheel-speed vectors lying in the 3-D column space of <M>{"H(0)"}</M>{" "}
                correspond to a rigid chassis motion. A 4th independent command has nowhere to go —
                the wheels fight and the free rollers slip.
              </>
            ),
          },
        ]}
      />

      <BookRef>Modern Robotics §13.2 — Omnidirectional Wheeled Mobile Robots (Eqs. 13.7–13.10); §13.3.1.2 — The Differential-Drive Robot (Eq. 13.15).</BookRef>
    </div>
  );
}

/* ================= widget: side-by-side tracking sandbox ================= */

const TARGET = { x: 3.6, y: 0 }; // pure sideways move from origin (impossible to reach directly for diff-drive)
const GAIN_LIN = 1.6;
const GAIN_ANG = 2.2;
const U_MAX = 30; // wheel speed limit (rad/s), for the readout/clamp
const HOLD_HEADING = 0; // commanded heading throughout

function Sandbox() {
  const [diff, setDiff] = useState<Pose>({ x: 0, y: 0, phi: 0 });
  const [meca, setMeca] = useState<Pose>({ x: 0, y: 0, phi: 0 });
  const [running, setRunning] = useState(false);
  const [tgt, setTgt] = useState({ ...TARGET });
  const [diffErr, setDiffErr] = useState(0);
  const [mecaErr, setMecaErr] = useState(0);

  const diffRef = useRef<Pose>({ x: 0, y: 0, phi: 0 });
  const mecaRef = useRef<Pose>({ x: 0, y: 0, phi: 0 });
  const tgtRef = useRef({ ...TARGET });
  tgtRef.current = tgt;

  // controller: drive each robot toward (tgt, heading 0) with a P law on the
  // body twist, then pass through each robot's realizable-twist projection.
  function controlTwist(p: Pose): Twist {
    const t = tgtRef.current;
    const ex = t.x - p.x, ey = t.y - p.y; // world error
    const c = Math.cos(p.phi), s = Math.sin(p.phi);
    // rotate world error into the body frame
    const bx = c * ex + s * ey;
    const by = -s * ex + c * ey;
    const ePhi = wrapAngle(HOLD_HEADING - p.phi);
    return {
      w: clamp(GAIN_ANG * ePhi, -4, 4),
      vx: clamp(GAIN_LIN * bx, -2.2, 2.2),
      vy: clamp(GAIN_LIN * by, -2.2, 2.2),
    };
  }

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;

      // ---- diff-drive ----
      {
        const p = diffRef.current;
        // diff-drive cannot strafe. Use a unicycle-style law: turn toward the
        // target, drive along the nose; once arrived, rotate to heading 0.
        const t = tgtRef.current;
        const heading = Math.atan2(t.y - p.y, t.x - p.x);
        const dist = Math.hypot(t.x - p.x, t.y - p.y);
        let twist: Twist;
        if (dist > 0.05) {
          const eH = wrapAngle(heading - p.phi);
          twist = { w: clamp(GAIN_ANG * eH, -4, 4), vx: clamp(GAIN_LIN * dist * Math.cos(eH), -2.2, 2.2), vy: 0 };
        } else {
          // arrived in position: rotate back to commanded heading 0
          twist = { w: clamp(GAIN_ANG * wrapAngle(HOLD_HEADING - p.phi), -4, 4), vx: 0, vy: 0 };
        }
        const np = integrate(p, twist, dt);
        diffRef.current = np;
        setDiff(np);
        setDiffErr(Math.hypot(t.x - np.x, t.y - np.y) + Math.abs(wrapAngle(HOLD_HEADING - np.phi)) * 0.3);
      }

      // ---- mecanum ----
      {
        const p = mecaRef.current;
        const cmd = controlTwist(p);
        const real = mecanumRealizable(cmd);
        const np = integrate(p, real, dt);
        mecaRef.current = np;
        setMeca(np);
        const t = tgtRef.current;
        setMecaErr(Math.hypot(t.x - np.x, t.y - np.y) + Math.abs(wrapAngle(HOLD_HEADING - np.phi)) * 0.3);
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const reset = () => {
    const z = { x: 0, y: 0, phi: 0 };
    diffRef.current = { ...z };
    mecaRef.current = { ...z };
    setDiff({ ...z });
    setMeca({ ...z });
    setDiffErr(Math.hypot(tgt.x, tgt.y));
    setMecaErr(Math.hypot(tgt.x, tgt.y));
    setRunning(false);
  };

  // wheel readouts at the current commanded twist of the mecanum robot
  const mWheels = mecanumWheels(mecanumRealizable(controlTwist(mecaRef.current)));
  const dWheels = diffWheels(diffRealizable(controlTwist(diffRef.current)));

  // CHALLENGE: target is a pure-sideways move (heading held at 0). The mecanum
  // robot reaches it with tiny final error AND keeps its heading; the diff-drive
  // robot, asked to hold heading 0, cannot end up sideways without turning.
  // Honest predicate: mecanum is within tolerance of the strafed target while
  // holding heading, demonstrating omnidirectional tracking.
  const tgtIsLateral = Math.abs(tgt.y) > 1.2; // requires real sideways travel
  const mecaTracked =
    Math.hypot(tgt.x - meca.x, tgt.y - meca.y) < 0.25 &&
    Math.abs(deg(wrapAngle(meca.phi - HOLD_HEADING))) < 8;
  const omniMet = tgtIsLateral && mecaTracked;

  return (
    <>
      <WidgetShell
        title="Track a target — diff-drive vs. mecanum"
        onReset={reset}
        caption={
          <>
            Both robots are commanded to reach the <span style={{ color: "#d9483f" }}>red target</span>{" "}
            <em>while keeping heading fixed at 0°</em>. Drag the <strong>strafe</strong> slider to
            place the target straight to the side. Press <strong>Go</strong>: the{" "}
            <span style={{ color: "#1f9e7a" }}>mecanum</span> robot slides over directly; the{" "}
            <span style={{ color: "#3b6fd4" }}>diff-drive</span> robot must spin to face it, drive,
            and spin back — it cannot hold heading and strafe at once.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4">
          <RobotPanel title="Differential drive" pose={diff} tgt={tgt} accent="#3b6fd4" canStrafe={false} />
          <RobotPanel title="Mecanum (omnidirectional)" pose={meca} tgt={tgt} accent="#1f9e7a" canStrafe={true} />
        </div>

        <div className="ui flex flex-wrap items-center gap-x-6 gap-y-3 mt-3">
          <WidgetButton active={running} onClick={() => setRunning(r => !r)}>{running ? "Pause" : "Go"}</WidgetButton>
          <WidgetButton onClick={reset}>Reset poses</WidgetButton>
          <LabeledSlider
            label="strafe yₜ"
            value={tgt.y}
            min={-3.6} max={3.6} step={0.1}
            onChange={v => { setTgt(t => ({ ...t, y: v })); }}
            fmt={v => `${v.toFixed(1)} m`} width={170}
          />
          <LabeledSlider
            label="ahead xₜ"
            value={tgt.x}
            min={-3.6} max={3.6} step={0.1}
            onChange={v => { setTgt(t => ({ ...t, x: v })); }}
            fmt={v => `${v.toFixed(1)} m`} width={150}
          />
        </div>

        <div className="ui flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 border-t border-[var(--rule)] pt-3">
          <Readout label="diff error" value={`${diffErr.toFixed(2)}`} color={diffErr < 0.25 ? "var(--good)" : "var(--bad)"} />
          <Readout label="mecanum error" value={`${mecaErr.toFixed(2)}`} color={mecaErr < 0.25 ? "var(--good)" : "var(--bad)"} />
          <Readout label="(uL,uR)" value={`(${clamp(dWheels.uL, -U_MAX, U_MAX).toFixed(0)}, ${clamp(dWheels.uR, -U_MAX, U_MAX).toFixed(0)})`} />
          <Readout label="mec u₁..₄" value={mWheels.map(u => clamp(u, -U_MAX, U_MAX).toFixed(0)).join(", ")} />
        </div>
      </WidgetShell>

      <Challenge id="ch13-omni-tracking" met={omniMet}>
        Set the target well to the side (<M>{"|y_t| > 1.2\\,\\text{m}"}</M>) and press Go. Guide the{" "}
        <strong>mecanum</strong> robot onto the target while it holds heading 0° (final error{" "}
        <M>{"< 0.25"}</M>) — a clean sideways translation the diff-drive simply cannot perform
        without turning. That is the payoff of a rank-3 <M>{"H(0)"}</M>.
      </Challenge>
    </>
  );
}

/* ================= one robot panel ================= */

function RobotPanel({ title, pose, tgt, accent, canStrafe }: {
  title: string; pose: Pose; tgt: { x: number; y: number }; accent: string; canStrafe: boolean;
}) {
  const [cx, cy] = toPx(pose.x, pose.y);
  const [tx, ty] = toPx(tgt.x, tgt.y);
  const c = Math.cos(pose.phi), s = Math.sin(pose.phi);
  const hb = BODY / 2;
  const local: [number, number][] = [[hb, hb], [hb, -hb], [-hb, -hb], [-hb, hb]];
  const body = local.map(([lx, ly]) => toPx(pose.x + (lx * c - ly * s), pose.y + (lx * s + ly * c)));
  // heading arrow
  const [hx, hy] = toPx(pose.x + Math.cos(pose.phi) * 0.55, pose.y + Math.sin(pose.phi) * 0.55);

  return (
    <div className="flex-1 min-w-0">
      <div className="ui text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)] mb-1 text-center">{title}</div>
      <svg viewBox={`0 0 ${SVGW} ${SVGH}`} className="w-full" style={{ background: "#f7f5ef", borderRadius: 8 }}>
        {/* grid */}
        {Array.from({ length: 13 }, (_, i) => {
          const gx = (i - 6) * PPM + SVGW / 2;
          const gy = (i - 6) * PPM + SVGH / 2;
          return <g key={i}>
            <line x1={gx} y1={0} x2={gx} y2={SVGH} stroke="#ece8dc" strokeWidth={1} />
            <line x1={0} y1={gy} x2={SVGW} y2={gy} stroke="#ece8dc" strokeWidth={1} />
          </g>;
        })}
        {/* axes through origin */}
        <line x1={0} y1={SVGH / 2} x2={SVGW} y2={SVGH / 2} stroke="#d8d2c2" strokeWidth={1.5} />
        <line x1={SVGW / 2} y1={0} x2={SVGW / 2} y2={SVGH} stroke="#d8d2c2" strokeWidth={1.5} />

        {/* target */}
        <circle cx={tx} cy={ty} r={9} fill="none" stroke="#d9483f" strokeWidth={2.5} />
        <line x1={tx - 6} y1={ty} x2={tx + 6} y2={ty} stroke="#d9483f" strokeWidth={2} />
        <line x1={tx} y1={ty - 6} x2={tx} y2={ty + 6} stroke="#d9483f" strokeWidth={2} />
        {/* desired heading tick at target (facing +x) */}
        <line x1={tx} y1={ty} x2={tx + 18} y2={ty} stroke="#d9483f" strokeWidth={1.5} strokeDasharray="3 3" />

        {/* robot body */}
        <polygon points={body.map(p => p.join(",")).join(" ")} fill={accent} stroke="#222" strokeWidth={1.5} opacity={0.92} />
        {/* heading arrow */}
        <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="#fff" strokeWidth={2.5} />
        {/* strafe capability glyph */}
        {canStrafe && (
          <g opacity={0.85}>
            <line x1={cx - Math.sin(pose.phi) * 16} y1={cy - Math.cos(pose.phi) * 16} x2={cx + Math.sin(pose.phi) * 16} y2={cy + Math.cos(pose.phi) * 16} stroke="#fff" strokeWidth={1.5} strokeDasharray="2 2" />
          </g>
        )}
      </svg>
    </div>
  );
}
