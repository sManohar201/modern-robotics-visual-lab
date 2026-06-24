import { useState, useEffect, useRef } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, BookRef } from "../../components/prose";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { Line } from "@react-three/drei";
import { type Vec3 } from "../../lib/math/vec";
import { planar2R_Jv, planar2R_Jdot } from "../ch8/dynamics";

const LINK1_COLOR = "#3b6fd4";
const LINK2_COLOR = "#c2571c";
const PATH_COLOR = "#d9483f";
const TIP_COLOR = "#2f9e44";

const L1 = 1.0;
const L2 = 0.8;
const LL: [number, number] = [L1, L2];

const VEL_LIMIT = 1.5;
const ACC_LIMIT = 2.0;

function fk(t1: number, t2: number): [number, number] {
  return [L1 * Math.cos(t1) + L2 * Math.cos(t1 + t2), L1 * Math.sin(t1) + L2 * Math.sin(t1 + t2)];
}
function ik(x: number, y: number): [number, number] | null {
  const d2 = x * x + y * y;
  let c2 = (d2 - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (c2 > 1 || c2 < -1) return null;
  const s2 = Math.sqrt(1 - c2 * c2); // elbow-up
  const t2 = Math.atan2(s2, c2);
  const t1 = Math.atan2(y, x) - Math.atan2(L2 * s2, L1 + L2 * c2);
  return [t1, t2];
}
function inv2(m: [number, number, number, number]): [number, number, number, number] | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-7) return null;
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det];
}

type Scaling = { s: number; sd: number; sdd: number };
type Profile = "cubic" | "quintic" | "trapezoid";

function scaling(profile: Profile, t: number, T: number): Scaling {
  const x = Math.max(0, Math.min(1, t / T));
  if (profile === "cubic") {
    return {
      s: 3 * x * x - 2 * x * x * x,
      sd: (6 / T) * (x - x * x),
      sdd: (6 / (T * T)) * (1 - 2 * x),
    };
  }
  if (profile === "quintic") {
    return {
      s: 10 * x ** 3 - 15 * x ** 4 + 6 * x ** 5,
      sd: (30 / T) * (x ** 2 - 2 * x ** 3 + x ** 4),
      sdd: (60 / (T * T)) * (x - 3 * x ** 2 + 2 * x ** 3),
    };
  }
  // trapezoid: accel for first quarter, coast half, decel last quarter
  const ta = T / 4;
  const v = 1 / (T - ta); // area of trapezoid = 1
  const a = v / ta;
  if (t <= ta) return { s: 0.5 * a * t * t, sd: a * t, sdd: a };
  if (t <= T - ta) return { s: 0.5 * a * ta * ta + v * (t - ta), sd: v, sdd: 0 };
  const td = T - t;
  return { s: 1 - 0.5 * a * td * td, sd: a * td, sdd: -a };
}

export default function PointToPoint() {
  const [T, setT] = useState(2.0);
  const [profile, setProfile] = useState<Profile>("cubic");
  const [space, setSpace] = useState<"joint" | "task">("joint");
  const [thetaStart, setThetaStart] = useState<[number, number]>([0.2, 0.4]);
  const [thetaEnd, setThetaEnd] = useState<[number, number]>([1.3, 1.0]);

  const [playing, setPlaying] = useState(false);
  const [simT, setSimT] = useState(0);
  const tRef = useRef(0);

  const pStart = fk(thetaStart[0], thetaStart[1]);
  const pEnd = fk(thetaEnd[0], thetaEnd[1]);

  // state q, qd, qdd at scaling s along the chosen path
  function evalState(sc: Scaling): { q: [number, number]; qd: [number, number]; qdd: [number, number] } {
    if (space === "joint") {
      const d0 = thetaEnd[0] - thetaStart[0];
      const d1 = thetaEnd[1] - thetaStart[1];
      return {
        q: [thetaStart[0] + sc.s * d0, thetaStart[1] + sc.s * d1],
        qd: [sc.sd * d0, sc.sd * d1],
        qdd: [sc.sdd * d0, sc.sdd * d1],
      };
    }
    // task space: straight line in (x,y)
    const dx = pEnd[0] - pStart[0];
    const dy = pEnd[1] - pStart[1];
    const x = pStart[0] + sc.s * dx;
    const y = pStart[1] + sc.s * dy;
    const q = ik(x, y);
    if (!q) return { q: thetaStart, qd: [0, 0], qdd: [0, 0] };
    const xd: [number, number] = [sc.sd * dx, sc.sd * dy];
    const xdd: [number, number] = [sc.sdd * dx, sc.sdd * dy]; // x linear in s
    const J = planar2R_Jv(q, LL);
    const Jinv = inv2(J);
    if (!Jinv) return { q, qd: [0, 0], qdd: [0, 0] };
    const qd: [number, number] = [Jinv[0] * xd[0] + Jinv[1] * xd[1], Jinv[2] * xd[0] + Jinv[3] * xd[1]];
    const Jd = planar2R_Jdot(q, qd, LL);
    // qdd = Jinv (xdd - Jd qd)
    const r0 = xdd[0] - (Jd[0] * qd[0] + Jd[1] * qd[1]);
    const r1 = xdd[1] - (Jd[2] * qd[0] + Jd[3] * qd[1]);
    const qdd: [number, number] = [Jinv[0] * r0 + Jinv[1] * r1, Jinv[2] * r0 + Jinv[3] * r1];
    return { q, qd, qdd };
  }

  const [theta, setTheta] = useState<[number, number]>(thetaStart);
  useEffect(() => {
    setTheta(evalState(scaling(profile, 0, T)).q);
    setSimT(0);
    tRef.current = 0;
    setPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [T, profile, space, thetaStart, thetaEnd]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.03, (now - last) / 1000);
      last = now;
      tRef.current += dt;
      if (tRef.current >= T) {
        tRef.current = T;
        setTheta(evalState(scaling(profile, T, T)).q);
        setSimT(T);
        setPlaying(false);
        return;
      }
      setTheta(evalState(scaling(profile, tRef.current, T)).q);
      setSimT(tRef.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, T, profile, space, thetaStart, thetaEnd]);

  // traced path
  const tracePts: Vec3[] = [];
  for (let i = 0; i <= 60; i++) {
    const st = evalState(scaling(profile, (i / 60) * T, T));
    const p = fk(st.q[0], st.q[1]);
    tracePts.push([p[0], p[1], 0]);
  }

  // arm geometry
  const joint0: Vec3 = [0, 0, 0];
  const joint1: Vec3 = [L1 * Math.cos(theta[0]), L1 * Math.sin(theta[0]), 0];
  const hand = fk(theta[0], theta[1]);
  const joint2: Vec3 = [hand[0], hand[1], 0];

  // peak velocity / acceleration over the trajectory (numeric, both spaces)
  let maxVel = 0;
  let maxAcc = 0;
  const NS = 120;
  for (let i = 0; i <= NS; i++) {
    const st = evalState(scaling(profile, (i / NS) * T, T));
    maxVel = Math.max(maxVel, Math.abs(st.qd[0]), Math.abs(st.qd[1]));
    maxAcc = Math.max(maxAcc, Math.abs(st.qdd[0]), Math.abs(st.qdd[1]));
  }
  const limitMet = maxVel <= VEL_LIMIT && maxAcc <= ACC_LIMIT;

  return (
    <div>
      <PageHeader
        chapter="Chapter 9"
        section="Trajectory Generation"
        title="Point-to-Point Trajectories"
        lede="A trajectory is a path plus a clock. Pick the geometric path θ(s), then a time scaling s(t) that says how fast to run along it. The path sets where the robot goes; the time scaling decides how hard the motors work."
      />

      <p>
        Separating the two lets us reuse one path under many speed profiles. The chain rule ties
        them together:
      </p>
      <Eq>{"\\dot\\theta = \\frac{d\\theta}{ds}\\dot{s}, \\qquad \\ddot\\theta = \\frac{d\\theta}{ds}\\ddot{s} + \\frac{d^2\\theta}{ds^2}\\dot{s}^2."}</Eq>
      <p>
        A straight line in <strong>joint space</strong>,{" "}
        <M>{"\\theta(s) = \\theta_{\\text{start}} + s(\\theta_{\\text{end}} - \\theta_{\\text{start}})"}</M>,
        is trivial to plan and always stays within joint limits — but the tip swings along a
        curve. A straight line in <strong>task space</strong> keeps the fingertip on a ruled line,
        at the cost of inverse kinematics at every instant and the risk of passing near a
        singularity, where joint velocities blow up.
      </p>

      <H2>Three time scalings</H2>
      <p>
        The <strong>cubic</strong> <M>{"s(t) = 3(t/T)^2 - 2(t/T)^3"}</M> starts and stops at rest
        but with a jump in acceleration — infinite jerk. The <strong>quintic</strong> adds
        zero-acceleration endpoints for smoother starts (at a higher peak speed). The{" "}
        <strong>trapezoid</strong> accelerates hard, coasts at constant speed, then decelerates —
        the standard single-motor profile. Peak rates for a unit move:
      </p>
      <Eq>{"\\dot{s}_{\\max}^{\\text{cubic}} = \\frac{3}{2T}, \\quad \\dot{s}_{\\max}^{\\text{quintic}} = \\frac{15}{8T}, \\qquad \\ddot{s}_{\\max}^{\\text{cubic}} = \\frac{6}{T^2}."}</Eq>

      <WidgetShell
        title="Plan a point-to-point move"
        onReset={() => {
          setT(2.0);
          setProfile("cubic");
          setSpace("joint");
          setThetaStart([0.2, 0.4]);
          setThetaEnd([1.3, 1.0]);
        }}
        caption={
          <>
            The <span style={{ color: PATH_COLOR }}>red curve</span> is the path the tip traces.
            Switch between joint- and task-space straight lines and compare the three speed
            profiles. The plots below show each joint's position, velocity, and acceleration.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={340} camera={[0, 0, 2.6]}>
              <Triad ghost scale={0.3} />
              <Line points={tracePts} color={PATH_COLOR} lineWidth={2} />
              <Line points={[joint0, joint1]} color={LINK1_COLOR} lineWidth={5} />
              <Line points={[joint1, joint2]} color={LINK2_COLOR} lineWidth={4.5} />
              <mesh position={joint0}><sphereGeometry args={[0.06, 16, 16]} /><meshStandardMaterial color="#33343d" /></mesh>
              <mesh position={joint1}><sphereGeometry args={[0.05, 16, 16]} /><meshStandardMaterial color="#33343d" /></mesh>
              <mesh position={joint2}><sphereGeometry args={[0.05, 16, 16]} /><meshStandardMaterial color={TIP_COLOR} /></mesh>
            </Scene3D>
          </div>

          <div className="w-full md:w-[280px] shrink-0 flex flex-col gap-3">
            <div className="flex gap-2">
              <WidgetButton active={playing} onClick={() => setPlaying(p => !p)}>{playing ? "Pause" : "Play"}</WidgetButton>
              <WidgetButton onClick={() => { tRef.current = 0; setSimT(0); setPlaying(false); setTheta(evalState(scaling(profile, 0, T)).q); }}>Reset</WidgetButton>
            </div>

            <div className="flex gap-1.5 text-[11px]">
              <span className="ui font-semibold text-[var(--ink-soft)] self-center">path:</span>
              {(["joint", "task"] as const).map(sp => (
                <button key={sp} onClick={() => setSpace(sp)} className={`px-2 py-0.5 rounded ${space === sp ? "bg-[var(--accent)] text-white" : "bg-gray-200"}`}>{sp}</button>
              ))}
            </div>
            <div className="flex gap-1.5 text-[11px]">
              <span className="ui font-semibold text-[var(--ink-soft)] self-center">scaling:</span>
              {(["cubic", "quintic", "trapezoid"] as const).map(p => (
                <button key={p} onClick={() => setProfile(p)} className={`px-1.5 py-0.5 rounded capitalize ${profile === p ? "bg-[var(--accent)] text-white" : "bg-gray-200"}`}>{p}</button>
              ))}
            </div>

            <div className="border-t border-[var(--rule)] pt-2 flex flex-col gap-2">
              <LabeledSlider label="T" value={T} min={0.5} max={4} step={0.1} onChange={setT} fmt={v => `${v.toFixed(1)} s`} width={130} />
              <LabeledSlider label="θ₁(0)" value={thetaStart[0]} min={-1.4} max={1.6} step={0.05} onChange={v => setThetaStart([v, thetaStart[1]])} fmt={v => `${(v * 180 / Math.PI).toFixed(0)}°`} width={130} />
              <LabeledSlider label="θ₂(0)" value={thetaStart[1]} min={0.1} max={1.8} step={0.05} onChange={v => setThetaStart([thetaStart[0], v])} fmt={v => `${(v * 180 / Math.PI).toFixed(0)}°`} width={130} />
              <LabeledSlider label="θ₁(T)" value={thetaEnd[0]} min={-1.4} max={2.2} step={0.05} onChange={v => setThetaEnd([v, thetaEnd[1]])} fmt={v => `${(v * 180 / Math.PI).toFixed(0)}°`} width={130} />
              <LabeledSlider label="θ₂(T)" value={thetaEnd[1]} min={0.1} max={1.8} step={0.05} onChange={v => setThetaEnd([thetaEnd[0], v])} fmt={v => `${(v * 180 / Math.PI).toFixed(0)}°`} width={130} />
            </div>

            <div className="border-t border-[var(--rule)] pt-2 flex flex-col gap-1.5">
              <Readout label="t" value={`${simT.toFixed(2)} s`} />
              <Readout label="max |θ̇|" value={`${maxVel.toFixed(2)} rad/s`} color={maxVel <= VEL_LIMIT ? "var(--good)" : "var(--bad)"} />
              <Readout label="max |θ̈|" value={`${maxAcc.toFixed(2)} rad/s²`} color={maxAcc <= ACC_LIMIT ? "var(--good)" : "var(--bad)"} />
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-[var(--rule)] pt-3">
          <div className="ui text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)] mb-2">
            joint profiles — <span style={{ color: LINK1_COLOR }}>θ₁</span>,{" "}
            <span style={{ color: LINK2_COLOR }}>θ₂</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Plot title="position θ(t)" T={T} fn={t => { const st = evalState(scaling(profile, t, T)); return [st.q[0], st.q[1]]; }} scale={26} />
            <Plot title="velocity θ̇(t)" T={T} fn={t => { const st = evalState(scaling(profile, t, T)); return [st.qd[0], st.qd[1]]; }} scale={18} zero />
            <Plot title="acceleration θ̈(t)" T={T} fn={t => { const st = evalState(scaling(profile, t, T)); return [st.qdd[0], st.qdd[1]]; }} scale={8} zero />
          </div>
        </div>
      </WidgetShell>

      <Challenge id="ch9-trajectory-limits" met={limitMet}>
        Design a move that respects the actuators: max joint speed{" "}
        <M>{"\\le 1.5\\,\\text{rad/s}"}</M> and max joint acceleration{" "}
        <M>{"\\le 2.0\\,\\text{rad/s}^2"}</M>. Stretch the duration <M>{"T"}</M> and try the
        smoother scalings — both readouts must turn green.
      </Challenge>

      <KeyIdea>
        The path fixes geometry; the time scaling fixes effort. Cubic scalings have infinite jerk
        at the ends; quintic scalings smooth that out; trapezoids hit hard velocity/acceleration
        limits head-on. Slowing the move (larger <M>{"T"}</M>) shrinks every peak quadratically.
      </KeyIdea>

      <BookRef>Modern Robotics §9.2 — Point-to-Point Trajectories (Eqs. 9.3–9.24).</BookRef>
    </div>
  );
}

function Plot({ title, T, fn, scale, zero = false }: { title: string; T: number; fn: (t: number) => [number, number]; scale: number; zero?: boolean }) {
  const W = 220, H = 80;
  const path = (idx: 0 | 1, color: string) => {
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * T;
      const y = H / 2 - fn(t)[idx] * scale;
      pts.push(`${(i / 60) * W},${Math.max(2, Math.min(H - 2, y))}`);
    }
    return <path d={`M ${pts.join(" L ")}`} fill="none" stroke={color} strokeWidth={1.5} />;
  };
  return (
    <div className="bg-[#fcfbf9] border border-gray-200 rounded p-1.5 flex flex-col items-center">
      <span className="ui text-[10px] font-semibold text-[var(--ink-soft)]">{title}</span>
      <svg width={W} height={H} className="mt-1">
        {zero && <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#e7e4da" strokeWidth={1} />}
        {path(0, LINK1_COLOR)}
        {path(1, LINK2_COLOR)}
      </svg>
    </div>
  );
}
