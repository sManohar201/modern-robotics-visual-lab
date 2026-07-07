import { useEffect, useMemo, useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, Worked, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { SpatialArm, armState } from "../../components/three/SpatialArm";
import { PointArrow, ScrewAxisLine } from "../../components/three/viz3d";
import { Vec6Display } from "../../components/widgets/MatrixDisplay";
import { type Vec3, rad, deg, vadd, vcross, vsub, vnorm, vunit, vscale } from "../../lib/math/vec";
import { jacobianSpace } from "../../lib/math/se3";
import { ARM_JOINTS, ARM_M, ARM_COLORS, ARM_HOME, eePointVel } from "./arm";

const W_COLOR = "#6741d9"; // angular part / screw axes
const V_COLOR = "#0b7285"; // linear part / tip velocity
const GOLD = "#caa53d";
const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];

export default function Jacobian() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 5"
        section="Velocity Kinematics & Statics"
        title="The Jacobian: Columns Are Twists"
        lede="Wiggle one joint and the tip moves. The Jacobian is just the table that records — pose by pose — how fast each joint pushes the tip and in which direction. This page builds that table one column at a time."
      />

      <p>
        Stretch your arm straight out and swing only your shoulder. Your fingertip flies — a small
        turn of the shoulder carries it a long way, because the whole arm acts as a long lever. Now
        tuck your fist against your chest and make the <em>same</em> shoulder turn: the fingertip
        barely drifts. Same joint, same joint speed, completely different fingertip velocity. The
        exchange rate between "how fast the joints turn" and "how fast the tip moves" depends on
        the pose of the arm — and that exchange rate is exactly what this chapter computes.
      </p>
      <p>
        Chapter 4 answered the <em>where</em> question: given joint angles <M>{"\\theta"}</M>,
        forward kinematics <M>{"x = f(\\theta)"}</M> tells you where the end-effector is. This
        chapter asks the <em>how fast</em> version: given joint <strong>rates</strong>{" "}
        <M>{"\\dot\\theta"}</M> (the speeds at which the joints are turning, in rad/s), how is the
        end-effector moving?
      </p>

      <H2>A slope, generalized to many knobs</H2>
      <p>
        For a function of one variable, the derivative <M>{"df/dx"}</M> is a <strong>slope</strong>:
        how much the output changes per unit nudge of the input. Forward kinematics is a function
        of <em>several</em> inputs — one knob per joint — so we need the slope idea generalized to
        many knobs. That is all a <strong>partial derivative</strong>{" "}
        <M>{"\\partial f/\\partial \\theta_i"}</M> is: freeze every knob except knob{" "}
        <M>{"i"}</M>, nudge that one, and record how the output responds.
      </p>
      <Aside>
        If partial derivatives are new (or rusty), the{" "}
        <a href="#/math3-calculus">Math 3 · Calculus module</a> builds them from ordinary slopes in
        a few minutes. And because we are about to read a matrix–vector product column by column
        over and over, the <a href="#/math2-linalg">Math 2 · Linear algebra module</a> covers
        exactly that skill.
      </Aside>
      <p>
        Stack those per-knob slopes side by side into one matrix and the chain rule links joint
        rates to tip velocity in a single line:
      </p>
      <Eq>{"\\dot x = \\frac{\\partial f(\\theta)}{\\partial \\theta}\\, \\dot\\theta = J(\\theta)\\, \\dot\\theta."}</Eq>
      <p>
        Read it back: joint rates <M>{"\\dot\\theta"}</M> go in, end-effector velocity{" "}
        <M>{"\\dot x"}</M> comes out, and the matrix in between — the{" "}
        <strong>Jacobian</strong> <M>{"J(\\theta)"}</M> — is the exchange-rate table connecting
        them. It is written <M>{"J(\\theta)"}</M>, not plain <M>{"J"}</M>, because the table is
        recomputed at every pose: that is the outstretched-arm-versus-tucked-fist effect from the
        opening paragraph, now with a name.
      </p>
      <p>
        Most generally the end-effector's motion is a six-dimensional <strong>twist</strong>{" "}
        <M>{"\\mathcal{V} = (\\omega, v)"}</M> — recall from Chapter 3 that a twist packages a
        rigid body's angular velocity <M>{"\\omega"}</M> and linear velocity <M>{"v"}</M> into one
        6-vector. Writing the matrix product out as a sum of columns:
      </p>
      <Eq>{"\\mathcal{V} = J(\\theta)\\,\\dot\\theta = J_1(\\theta)\\,\\dot\\theta_1 + \\cdots + J_n(\\theta)\\,\\dot\\theta_n."}</Eq>
      <p>
        Read this column by column. <strong>Column <M>{"i"}</M> is the end-effector twist when
        joint <M>{"i"}</M> moves at unit speed and every other joint is frozen.</strong> The whole
        end-effector velocity is the weighted sum of those per-joint twists, with the joint rates
        as the weights. This single sentence generates every Jacobian in the book.
      </p>

      <H2>One joint at a time</H2>
      <p>
        Let's see one column in the flesh. Spin a single revolute joint and freeze the rest: the
        end-effector sweeps a circle about that joint's axis. The instantaneous twist of that
        motion — angular part along the joint's axis, linear part the velocity it imparts — is
        exactly one column of the (space) Jacobian. In fact, for the space Jacobian, column{" "}
        <M>{"i"}</M> <em>is</em> the screw axis of joint <M>{"i"}</M> at the current configuration.
      </p>
      <p>
        <strong>Try this:</strong> click <em>joint 1</em> and watch the tip trace a horizontal
        circle about the purple vertical axis. Then click <em>joint 2</em> and <em>joint 3</em>:
        the circle tilts, and it shrinks as the pivot gets closer to the tip. Watch the 6-vector
        readout while a joint wiggles — the column itself does not change (it only depends on the
        joints <em>before</em> it, which are frozen), yet the teal tip-velocity arrow does, because
        the tip point keeps moving around the circle.
      </p>

      <OneJointWidget />

      <KeyIdea>
        Column <M>{"i"}</M> of the Jacobian is the end-effector twist produced by unit speed on
        joint <M>{"i"}</M> alone — for the space Jacobian, the joint's screw axis at the current
        configuration. A column is a <em>velocity</em>, not a position.
      </KeyIdea>

      <H2>Columns add up to the end-effector velocity</H2>
      <p>
        Turn several joints together and the end-effector twist is the sum of the columns scaled by
        each joint rate. That makes steering the tip a mixing problem: to get a desired velocity,
        find the blend of columns that adds up to it. If <M>{"J(\\theta)"}</M> is square and full
        rank you can solve the blend exactly, <M>{"\\dot\\theta = J^{-1}\\mathcal{V}"}</M> — the
        inverse velocity problem of Chapter 6. Where the columns fail to span all directions, some
        tip velocities are simply unreachable: that is a <strong>singularity</strong>, the subject
        of a later page.
      </p>
      <p>
        <strong>Try this:</strong> nudge <M>{"\\dot\\theta_2"}</M> alone and watch the teal sum
        arrow copy the teal column's contribution. Now blend in <M>{"\\dot\\theta_3"}</M> with the
        opposite sign and steer the sum toward the gold target. Once the checkmark lands, drag the
        pose slider <M>{"\\theta_2"}</M> to refold the arm — your winning blend breaks, because the
        columns themselves moved.
      </p>

      <SumWidget />

      <H2>The 2R arm, by hand</H2>
      <p>
        The smallest example you can work on paper is the planar 2R arm (link lengths{" "}
        <M>{"L_1, L_2"}</M>). Differentiating its tip position term by term collects into
      </p>
      <Eq>{"\\begin{bmatrix}\\dot x_1\\\\ \\dot x_2\\end{bmatrix} = \\underbrace{\\begin{bmatrix} -L_1 s_1 - L_2 s_{12} & -L_2 s_{12} \\\\ L_1 c_1 + L_2 c_{12} & L_2 c_{12} \\end{bmatrix}}_{J(\\theta)} \\begin{bmatrix}\\dot\\theta_1\\\\ \\dot\\theta_2\\end{bmatrix},"}</Eq>
      <p>
        with the shorthand <M>{"s_1=\\sin\\theta_1"}</M>,{" "}
        <M>{"c_{12}=\\cos(\\theta_1+\\theta_2)"}</M>. Now read <M>{"J"}</M> column by column, the
        same way the widgets do:
      </p>
      <p>
        <strong>Column 1</strong>, <M>{"(-L_1 s_1 - L_2 s_{12},\\; L_1 c_1 + L_2 c_{12})"}</M>:
        freeze joint 2 and the whole arm is one rigid stick pivoting about joint 1. The tip
        velocity is perpendicular to the line from joint 1 to the tip, with speed equal to the
        length of that line (per unit joint rate — a longer lever moves its endpoint faster).{" "}
        <strong>Column 2</strong>, <M>{"(-L_2 s_{12},\\; L_2 c_{12})"}</M>: freeze joint 1 and only
        the forearm pivots about the elbow — perpendicular to the forearm, speed <M>{"L_2"}</M>.
        Each column is the "wiggle one joint" picture from the first widget, written in
        coordinates.
      </p>

      <Worked title="A 2R Jacobian you can check by eye">
        <p>
          <strong>Given:</strong> <M>{"L_1 = L_2 = 1"}</M>, pose{" "}
          <M>{"\\theta = (90^\\circ, -90^\\circ)"}</M>. Then <M>{"s_1 = 1"}</M>,{" "}
          <M>{"c_1 = 0"}</M>, and since <M>{"\\theta_1 + \\theta_2 = 0"}</M>,{" "}
          <M>{"s_{12} = 0"}</M>, <M>{"c_{12} = 1"}</M>. The upper arm points straight up, the
          forearm points along <M>{"x"}</M>, and the tip sits at <M>{"(1, 1)"}</M>.
        </p>
        <p>
          <strong>Set up:</strong> substitute into the matrix:
        </p>
        <Eq>{"J = \\begin{bmatrix} -1 & 0 \\\\ 1 & 1 \\end{bmatrix}."}</Eq>
        <p>
          <strong>Sanity-check each column.</strong> Column 1 is <M>{"(-1, 1)"}</M>: length{" "}
          <M>{"\\sqrt{2}"}</M>, which is exactly the distance from joint 1 at the origin to the
          tip at <M>{"(1,1)"}</M>, and its direction is perpendicular to that line. ✓ Column 2 is{" "}
          <M>{"(0, 1)"}</M>: the forearm runs along <M>{"x"}</M>, so pivoting the elbow pushes the
          tip along <M>{"y"}</M> at speed <M>{"L_2 = 1"}</M>. ✓
        </p>
        <p>
          <strong>Use it:</strong> with joint rates <M>{"\\dot\\theta = (0.5, 0.5)"}</M> rad/s, the
          tip velocity is the blend{" "}
          <M>{"0.5\\,(-1,1) + 0.5\\,(0,1) = (-0.5, 1)"}</M> — half of column 1 plus half of
          column 2.
        </p>
      </Worked>

      <H2>Traps</H2>
      <ul>
        <li>
          <strong><M>{"J"}</M> is not a constant.</strong> It must be recomputed at every pose — a
          blend of joint rates that produced "straight up" at one pose produces something else
          entirely after the arm refolds. If you earned the challenge above and then broke it by
          moving a pose slider, you have already felt this trap.
        </li>
        <li>
          <strong>A column is a twist, not a place.</strong> Its units are velocity per unit joint
          rate. Nothing in <M>{"J"}</M> tells you where a link <em>is</em>; forward kinematics does
          that.
        </li>
        <li>
          <strong>Current configuration, not home.</strong> For the space Jacobian, column{" "}
          <M>{"i"}</M> is joint <M>{"i"}</M>'s screw axis <em>where the preceding joints have
          carried it</em> — it equals the home-position axis <M>{"\\mathcal{S}_i"}</M> only when
          joints <M>{"1,\\dots,i-1"}</M> are at zero.
        </li>
        <li>
          <strong>Columns index joints; rows index directions.</strong> Column <M>{"i"}</M> answers
          "what does joint <M>{"i"}</M> do?"; row <M>{"k"}</M> answers "which joints contribute to
          velocity component <M>{"k"}</M>?" Mixing these up is the classic exam mistake.
        </li>
      </ul>

      <KeyIdea>
        <M>{"\\mathcal{V} = J(\\theta)\\dot\\theta"}</M>. Column <M>{"i"}</M> of the Jacobian is
        the end-effector twist produced by unit speed on joint <M>{"i"}</M> alone, and the
        end-effector velocity is the rate-weighted sum of the columns — an exchange-rate table
        between joint space and task space, recomputed at every pose.
      </KeyIdea>

      <Quiz
        challengeId="ch5-jacobian-quiz"
        goal={<>Answer all three correctly.</>}
        questions={[
          {
            prompt: (
              <>
                Column 3 of a robot's Jacobian is…
              </>
            ),
            options: [
              { label: "the position of link 3" },
              {
                label: "the end-effector twist when joint 3 runs at unit speed and all other joints are frozen",
                correct: true,
              },
              { label: "the third component of the end-effector velocity" },
            ],
            explain:
              "Columns are per-joint twists. The full end-effector velocity is the joint-rate-weighted sum of the columns.",
          },
          {
            prompt: (
              <>
                Why is the Jacobian written <M>{"J(\\theta)"}</M> rather than plain <M>{"J"}</M>?
              </>
            ),
            options: [
              { label: "Because joint velocities change over time" },
              { label: "It's only notation — the matrix is constant for a given robot" },
              {
                label: "Because refolding the arm changes each joint's leverage on the tip, so the entries depend on the pose",
                correct: true,
              },
            ],
            explain:
              "Outstretched arm: a shoulder turn flings the fingertip. Tucked fist: the same turn barely moves it. Same joint, different column.",
          },
          {
            prompt: (
              <>
                A 2R arm with <M>{"L_1 = L_2 = 1"}</M> is stretched straight along <M>{"x"}</M>{" "}
                (<M>{"\\theta_1 = \\theta_2 = 0"}</M>), so its columns are <M>{"(0, 2)"}</M> and{" "}
                <M>{"(0, 1)"}</M>. Which tip velocity can <em>no</em> choice of joint rates
                produce?
              </>
            ),
            options: [
              { label: "Straight along the arm (the x direction)", correct: true },
              { label: "Perpendicular to the arm (the y direction)" },
              { label: "None — any velocity is reachable" },
            ],
            explain:
              "Both columns point along y, so no blend of them has an x component. That's a singularity — the subject of the next page.",
          },
        ]}
      />

      <BookRef>Modern Robotics §5.1 — Manipulator Jacobian.</BookRef>
    </div>
  );
}

/* ================= widget 1: one joint, one column ================= */

function useSpin(active: boolean, rate = 0.8, amp = 0.9) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setPhase(p => p + dt * rate);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, rate]);
  return amp * Math.sin(phase);
}

function OneJointWidget() {
  const [sel, setSelRaw] = useState(0);
  const [seen, setSeen] = useState<number[]>([0]);
  const [playing, setPlaying] = useState(true);
  const wob = useSpin(playing);

  const setSel = (i: number) => {
    setSelRaw(i);
    setSeen(s => (s.includes(i) ? s : [...s, i]));
  };

  const base = ARM_HOME;
  const thetas: [number, number, number] = [...base];
  thetas[sel] = base[sel] + wob;

  const st = armState(ARM_JOINTS, ARM_M, thetas);
  const cols = jacobianSpace(st.S, thetas);
  const colSel = cols[sel];
  const wSel: Vec3 = [colSel[0], colSel[1], colSel[2]];
  const pEE: Vec3 = [st.ee.p[0], st.ee.p[1], st.ee.p[2]];
  // velocity of the EE point if this joint spins at unit rate
  const vEE = eePointVel(cols, thetas.map((_, i) => (i === sel ? 1 : 0)), pEE);

  // EE circular trail about the selected joint axis
  const trail = useMemo(() => {
    const pts: Vec3[] = [];
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const th: [number, number, number] = [...base];
      th[sel] = base[sel] + 0.9 * Math.sin((i / n) * 2 * Math.PI);
      const s = armState(ARM_JOINTS, ARM_M, th);
      pts.push([s.ee.p[0], s.ee.p[1], s.ee.p[2]]);
    }
    return pts;
  }, [sel, base]);

  return (
    <>
      <WidgetShell
        title="Wiggle one joint — watch its Jacobian column"
        onReset={() => {
          setSelRaw(0);
          setSeen([0]);
          setPlaying(true);
        }}
        caption={
          <>
            Only the selected joint moves; the rest are frozen. The purple line is that joint's screw
            axis (the angular part of the column), and the teal arrow is the velocity it imparts to the
            end-effector point. The dashed loop is the circle the end-effector traces. The 6-vector is
            that column of the space Jacobian, <M>{"J_{s,i} = (\\omega_i,\\, v_i)"}</M>.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={360} camera={[3.6, 2.8, 3.6]}>
              <Triad ghost colors={GHOST} scale={0.6} />
              <SpatialArm joints={ARM_JOINTS} M={ARM_M} thetas={thetas} eeTriadScale={0.3} />
              {/* selected joint's screw axis = the column's angular part */}
              <ScrewAxisLine q={st.pivots[sel]} dir={st.axisDirs[sel]} color={W_COLOR} half={1.6} />
              {/* EE trail */}
              {trail.length > 1 && (
                <Line points={trail} color={GOLD} lineWidth={1.8} dashed dashSize={0.06} gapSize={0.04} />
              )}
              {/* velocity arrow at the EE */}
              {vnorm(vEE) > 0.05 && (
                <PointArrow at={pEE} dir={vEE} length={Math.min(1.0, vnorm(vEE) * 0.5)} color={V_COLOR} thickness={0.026} />
              )}
            </Scene3D>
          </div>

          <div className="ui flex flex-col justify-center gap-3 md:w-[250px]">
            <div className="flex items-center gap-2">
              {[0, 1, 2].map(i => (
                <WidgetButton key={i} onClick={() => setSel(i)} active={sel === i}>
                  joint {i + 1}
                </WidgetButton>
              ))}
            </div>
            <Vec6Display v={colSel} label={<M>{`J_{s,${sel + 1}} =`}</M>} topColor={W_COLOR} bottomColor={V_COLOR} />
            <div className="flex flex-col gap-1.5">
              <Readout label="axis ω̂" value={`(${wSel.map(x => x.toFixed(1)).join(", ")})`} color={W_COLOR} />
              <Readout label="|v at EE|" value={vnorm(vEE).toFixed(2)} color={V_COLOR} />
            </div>
          </div>
        </div>

        <ControlBar>
          <WidgetButton onClick={() => setPlaying(p => !p)} active={playing}>
            {playing ? "pause" : "play"}
          </WidgetButton>
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch5-jac-tour" met={seen.length === 3}>
        Tour all three columns: click each joint button in turn and compare. Joint 1's axis is
        vertical (<M>{"\\omega = (0,0,1)"}</M>); joints 2 and 3 share an axis <em>direction</em> but
        sit at different points, so their columns — and the circles the tip traces — differ.
      </Challenge>
    </>
  );
}

/* ================= widget 2: sum of columns + target challenge ================= */

// target end-effector point velocity to hit (drawn as a gold arrow at the EE)
const TARGET_VEL: Vec3 = [0, 0, 1]; // straight up

function SumWidget() {
  const [t1, setT1] = useState(ARM_HOME[0]);
  const [t2, setT2] = useState(ARM_HOME[1]);
  const [t3, setT3] = useState(ARM_HOME[2]);
  const [d1, setD1] = useState(0.0);
  const [d2, setD2] = useState(0.0);
  const [d3, setD3] = useState(0.0);

  const thetas: [number, number, number] = [t1, t2, t3];
  const rates = [d1, d2, d3];
  const st = armState(ARM_JOINTS, ARM_M, thetas);
  const cols = jacobianSpace(st.S, thetas);
  const pEE: Vec3 = [st.ee.p[0], st.ee.p[1], st.ee.p[2]];
  const vEE = eePointVel(cols, rates, pEE);

  // challenge: EE point velocity aligned with TARGET_VEL with real speed
  const speed = vnorm(vEE);
  const align = speed > 1e-6 ? vnorm(vsub(vunit(vEE), TARGET_VEL)) : 9;
  const met = speed > 0.5 && align < 0.18;

  // per-column contribution arrows at the EE (scaled by rate)
  const contribs: { dir: Vec3; color: string }[] = cols.map((c, i) => {
    const w: Vec3 = [c[0], c[1], c[2]];
    const v: Vec3 = [c[3], c[4], c[5]];
    const vp = vscale(vadd(v, vcross(w, pEE)), rates[i]);
    return { dir: vp, color: ARM_COLORS[i] };
  });

  return (
    <>
      <WidgetShell
        title="Add the columns to steer the end-effector"
        onReset={() => {
          setT1(ARM_HOME[0]); setT2(ARM_HOME[1]); setT3(ARM_HOME[2]);
          setD1(0); setD2(0); setD3(0);
        }}
        caption={
          <>
            Each colored arrow is one joint's contribution{" "}
            <M>{"\\dot\\theta_i\\, (v_i + \\omega_i\\times p)"}</M> to the end-effector point velocity;
            the teal arrow is their sum. The gold arrow is the target velocity. You are solving{" "}
            <M>{"J\\dot\\theta = \\mathcal{V}"}</M> by hand — refold the arm and the required mix of
            columns changes.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={360} camera={[3.6, 2.8, 3.6]}>
              <Triad ghost colors={GHOST} scale={0.6} />
              <SpatialArm joints={ARM_JOINTS} M={ARM_M} thetas={thetas} eeTriadScale={0.3} />
              {/* target velocity */}
              <PointArrow at={pEE} dir={TARGET_VEL} length={0.8} color={GOLD} thickness={0.02} />
              {/* per-column contributions */}
              {contribs.map((c, i) =>
                vnorm(c.dir) > 0.04 ? (
                  <PointArrow key={i} at={pEE} dir={c.dir} length={Math.min(0.9, vnorm(c.dir) * 0.5)} color={c.color} thickness={0.018} />
                ) : null,
              )}
              {/* resultant */}
              {speed > 0.05 && (
                <PointArrow at={pEE} dir={vEE} length={Math.min(1.1, speed * 0.5)} color={V_COLOR} thickness={0.028} />
              )}
            </Scene3D>
          </div>

          <div className="ui flex flex-col justify-center gap-3 md:w-[250px]">
            <div className="flex flex-col gap-1.5">
              <Readout label="‖v_EE‖" value={speed.toFixed(2)} color={V_COLOR} />
              <Readout label="aim error" value={align > 5 ? "—" : align.toFixed(2)} color={align < 0.18 ? "var(--good)" : undefined} />
            </div>
            <div className="ui text-[11px] text-[var(--ink-faint)] leading-relaxed">
              joint-rate sliders set <M>{"\\dot\\theta"}</M>; pose sliders refold the arm.
            </div>
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="θ̇₁" value={d1} min={-1.5} max={1.5} onChange={setD1} fmt={v => v.toFixed(2)} color={ARM_COLORS[0]} width={120} />
          <LabeledSlider label="θ̇₂" value={d2} min={-1.5} max={1.5} onChange={setD2} fmt={v => v.toFixed(2)} color={ARM_COLORS[1]} width={120} />
          <LabeledSlider label="θ̇₃" value={d3} min={-1.5} max={1.5} onChange={setD3} fmt={v => v.toFixed(2)} color={ARM_COLORS[2]} width={120} />
        </ControlBar>
        <ControlBar>
          <LabeledSlider label="θ₁" value={t1} min={rad(-180)} max={rad(180)} onChange={setT1} fmt={v => `${deg(v).toFixed(0)}°`} width={110} />
          <LabeledSlider label="θ₂" value={t2} min={rad(-150)} max={rad(150)} onChange={setT2} fmt={v => `${deg(v).toFixed(0)}°`} width={110} />
          <LabeledSlider label="θ₃" value={t3} min={rad(-150)} max={rad(150)} onChange={setT3} fmt={v => `${deg(v).toFixed(0)}°`} width={110} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch5-jac-columns" met={met}>
        Drive the end-effector straight up: set the joint rates so the teal velocity arrow lines up
        with the gold target <M>{"(0,0,1)"}</M> at a real speed (<M>{"\\lVert v\\rVert > 0.5"}</M>).
        Each column pushes the tip a different way — blend them. Then refold the arm and watch the
        winning combination change, because <M>{"J"}</M> depends on <M>{"\\theta"}</M>.
      </Challenge>
    </>
  );
}
