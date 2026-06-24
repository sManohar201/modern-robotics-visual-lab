import { useEffect, useMemo, useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { SpatialArm, armState } from "../../components/three/SpatialArm";
import { PointArrow, ScrewAxisLine } from "../../components/three/viz3d";
import { Vec6Display } from "../../components/widgets/MatrixDisplay";
import { type Vec3, type Vec6, rad, deg, vadd, vcross, vsub, vnorm, vunit, vscale } from "../../lib/math/vec";
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
        lede="Forward kinematics maps joint angles to a pose. Differentiate it and you get the Jacobian — the matrix whose columns are the end-effector twists produced by each joint, one at a time."
      />

      <p>
        Chapter 4 answered: given joint angles <M>{"\\theta"}</M>, where is the end-effector?
        This chapter asks the time-derivative version: given joint <em>velocities</em>{" "}
        <M>{"\\dot\\theta"}</M>, how is the end-effector moving? A single configuration-dependent
        matrix links the two.
      </p>
      <p>
        For a minimal set of task coordinates <M>{"x(t) = f(\\theta(t))"}</M>, the chain rule gives
      </p>
      <Eq>{"\\dot x = \\frac{\\partial f(\\theta)}{\\partial \\theta}\\, \\dot\\theta = J(\\theta)\\, \\dot\\theta."}</Eq>
      <p>
        The matrix <M>{"J(\\theta)"}</M> is the <strong>Jacobian</strong>: the linear sensitivity
        of end-effector velocity to joint velocity. Most generally the end-effector velocity is a
        six-dimensional twist <M>{"\\mathcal{V}"}</M>, and
      </p>
      <Eq>{"\\mathcal{V} = J(\\theta)\\,\\dot\\theta = J_1(\\theta)\\,\\dot\\theta_1 + \\cdots + J_n(\\theta)\\,\\dot\\theta_n."}</Eq>
      <p>
        Read this column by column. <strong>Column <M>{"i"}</M> is the end-effector twist when
        joint <M>{"i"}</M> moves at unit speed and every other joint is frozen.</strong> The whole
        end-effector velocity is just the weighted sum of those per-joint twists, with the joint
        rates as weights. This single idea generates every Jacobian in the book.
      </p>

      <H2>One joint at a time</H2>
      <p>
        Spin a single revolute joint and freeze the rest: the end-effector sweeps a circle about
        that joint's axis. The instantaneous end-effector twist of that motion — its angular part
        is the joint's axis direction, its linear part the velocity it imparts — is exactly one
        column of the (space) Jacobian. In fact, for the space Jacobian, column <M>{"i"}</M>{" "}
        <em>is</em> the screw axis of joint <M>{"i"}</M> at the current configuration.
      </p>

      <OneJointWidget />

      <H2>Columns add up to the end-effector velocity</H2>
      <p>
        Turn several joints together and the end-effector twist is the sum of the columns scaled by
        each joint rate. If <M>{"J(\\theta)"}</M> is square and full rank you can invert this to
        find the joint rates for a desired twist, <M>{"\\dot\\theta = J^{-1}\\mathcal{V}"}</M> — the
        inverse velocity problem of Chapter 6. Where the columns fail to span the space, no choice
        of <M>{"\\dot\\theta"}</M> can produce certain twists: that is a singularity, the subject of
        a later page.
      </p>

      <SumWidget />

      <H2>The 2R arm, by hand</H2>
      <p>
        The smallest worked example is the planar 2R arm. Differentiating its tip position term by
        term collects into
      </p>
      <Eq>{"\\begin{bmatrix}\\dot x_1\\\\ \\dot x_2\\end{bmatrix} = \\underbrace{\\begin{bmatrix} -L_1 s_1 - L_2 s_{12} & -L_2 s_{12} \\\\ L_1 c_1 + L_2 c_{12} & L_2 c_{12} \\end{bmatrix}}_{J(\\theta)} \\begin{bmatrix}\\dot\\theta_1\\\\ \\dot\\theta_2\\end{bmatrix},"}</Eq>
      <p>
        with <M>{"s_1=\\sin\\theta_1"}</M>, <M>{"c_{12}=\\cos(\\theta_1+\\theta_2)"}</M>. Column 1 is
        the tip velocity from joint 1 alone; column 2 from joint 2 alone — the same rule the 3D
        widgets above make visible, written out in closed form.
      </p>

      <KeyIdea>
        <M>{"\\mathcal{V} = J(\\theta)\\dot\\theta"}</M>. Column <M>{"i"}</M> of the Jacobian is the
        end-effector twist produced by unit speed on joint <M>{"i"}</M> alone — for the space
        Jacobian, the joint's screw axis at the current configuration. The end-effector velocity is
        the rate-weighted sum of the columns.
      </KeyIdea>

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
  const [sel, setSel] = useState(0);
  const [playing, setPlaying] = useState(true);
  const wob = useSpin(playing);

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
    <WidgetShell
      title="Wiggle one joint — watch its Jacobian column"
      onReset={() => {
        setSel(0);
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
