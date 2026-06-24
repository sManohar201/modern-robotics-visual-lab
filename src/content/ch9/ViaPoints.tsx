import { useState, useEffect, useRef } from "react";
import { PageHeader, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D } from "../../components/three/Scene3D";
import { PointArrow } from "../../components/three/viz3d";
import { Line } from "@react-three/drei";
import { type Vec3 } from "../../lib/math/vec";

const OFFSET = 0.6; // recenters the (0..1.2) workspace on the origin
const BLUE = "#3b6fd4";
const ORANGE = "#c2571c";
const BEAD = "#d9483f";
const VEL = "#2f9e44";

interface Cubic { a0: number; a1: number; a2: number; a3: number; }
// solves a single cubic segment from (x0,v0) to (x1,v1) over duration dT (Eqs. 9.26–9.29)
function solveCubic(x0: number, v0: number, x1: number, v1: number, dT: number): Cubic {
  return {
    a0: x0,
    a1: v0,
    a2: (3 * (x1 - x0) - (2 * v0 + v1) * dT) / (dT * dT),
    a3: (2 * (x0 - x1) + (v0 + v1) * dT) / (dT * dT * dT),
  };
}

const T1 = 0;
const T4 = 3.5;

export default function ViaPoints() {
  const [T2, setT2] = useState(1.0);
  const [T3, setT3] = useState(2.2);
  const [P2, setP2] = useState<[number, number]>([0.0, 1.2]);
  const [P3, setP3] = useState<[number, number]>([1.2, 1.2]);
  const [V2, setV2] = useState<[number, number]>([1.5, 0.0]);
  const [V3, setV3] = useState<[number, number]>([0.0, -1.5]);
  const [autoSmooth, setAutoSmooth] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [simT, setSimT] = useState(0);
  const tRef = useRef(0);

  const P1: [number, number] = [0, 0];
  const P4: [number, number] = [1.2, 0];
  const V1: [number, number] = [0, 0];
  const V4: [number, number] = [0, 0];

  // auto-smooth heuristic: via velocity = average of incoming/outgoing secants
  const eV2: [number, number] = autoSmooth
    ? [0.5 * ((P3[0] - P2[0]) / (T3 - T2) + (P2[0] - P1[0]) / (T2 - T1)),
       0.5 * ((P3[1] - P2[1]) / (T3 - T2) + (P2[1] - P1[1]) / (T2 - T1))]
    : V2;
  const eV3: [number, number] = autoSmooth
    ? [0.5 * ((P4[0] - P3[0]) / (T4 - T3) + (P3[0] - P2[0]) / (T3 - T2)),
       0.5 * ((P4[1] - P3[1]) / (T4 - T3) + (P3[1] - P2[1]) / (T3 - T2))]
    : V3;

  const dT1 = T2 - T1, dT2 = T3 - T2, dT3 = T4 - T3;
  const xC = [solveCubic(P1[0], V1[0], P2[0], eV2[0], dT1), solveCubic(P2[0], eV2[0], P3[0], eV3[0], dT2), solveCubic(P3[0], eV3[0], P4[0], V4[0], dT3)];
  const yC = [solveCubic(P1[1], V1[1], P2[1], eV2[1], dT1), solveCubic(P2[1], eV2[1], P3[1], eV3[1], dT2), solveCubic(P3[1], eV3[1], P4[1], V4[1], dT3)];

  function state(t: number) {
    const tt = Math.max(T1, Math.min(T4, t));
    let seg = 0, dt = tt - T1;
    if (tt > T3) { seg = 2; dt = tt - T3; } else if (tt > T2) { seg = 1; dt = tt - T2; }
    const ev = (c: Cubic) => ({
      p: c.a0 + c.a1 * dt + c.a2 * dt * dt + c.a3 * dt * dt * dt,
      v: c.a1 + 2 * c.a2 * dt + 3 * c.a3 * dt * dt,
      a: 2 * c.a2 + 6 * c.a3 * dt,
    });
    const x = ev(xC[seg]), y = ev(yC[seg]);
    return { pos: [x.p, y.p] as [number, number], vel: [x.v, y.v] as [number, number], acc: [x.a, y.a] as [number, number] };
  }

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.03, (now - last) / 1000);
      last = now;
      tRef.current += dt;
      if (tRef.current >= T4) { tRef.current = T4; setSimT(T4); setPlaying(false); return; }
      setSimT(tRef.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const w = (p: [number, number]): Vec3 => [p[0] - OFFSET, p[1] - OFFSET, 0];
  const trace: Vec3[] = [];
  for (let i = 0; i <= 90; i++) trace.push(w(state(T1 + (i / 90) * (T4 - T1)).pos));
  const cur = state(simT);

  // peak acceleration magnitude over the whole motion
  let maxAcc = 0;
  for (let i = 0; i <= 120; i++) {
    const a = state(T1 + (i / 120) * (T4 - T1)).acc;
    maxAcc = Math.max(maxAcc, Math.hypot(a[0], a[1]));
  }
  const met = maxAcc <= 4.0;

  return (
    <div>
      <PageHeader
        chapter="Chapter 9"
        section="Trajectory Generation"
        title="Via-Point Trajectories"
        lede="Sometimes the robot must thread through a series of intermediate points at set times. Instead of planning a path and then a time scaling, we interpolate each coordinate directly with a chain of cubic polynomials."
      />

      <p>
        Treat each coordinate on its own. Between consecutive via points{" "}
        <M>{"j"}</M> and <M>{"j+1"}</M>, a cubic segment is pinned by four conditions — the
        position and velocity at each end:
      </p>
      <Eq>{"\\beta_j(T_j + \\Delta t) = a_{j0} + a_{j1}\\Delta t + a_{j2}\\Delta t^2 + a_{j3}\\Delta t^3."}</Eq>
      <p>
        Matching positions and velocities at every via makes the trajectory{" "}
        <strong>continuous in velocity</strong>. But two cubics meeting at a via generally have{" "}
        <em>different</em> second derivatives there, so the <strong>acceleration jumps</strong> —
        you can see the steps in the acceleration plot below. Specifying via accelerations too
        would require fifth-order segments.
      </p>

      <WidgetShell
        title="Cubic via-point spline editor"
        onReset={() => {
          setT2(1.0); setT3(2.2);
          setP2([0, 1.2]); setP3([1.2, 1.2]);
          setV2([1.5, 0]); setV3([0, -1.5]);
          setAutoSmooth(false);
          setSimT(0); tRef.current = 0; setPlaying(false);
        }}
        caption={
          <>
            The <span style={{ color: BEAD }}>red bead</span> threads the vias; the{" "}
            <span style={{ color: VEL }}>green arrows</span> are the via velocities you set. Drag
            the via positions, arrival times, and velocity tangents — or let the auto-smooth
            heuristic choose the tangents — and watch the acceleration steps move.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={340} camera={[0, 0, 2.4]}>
              <Line points={trace} color="#bbb" lineWidth={2} />
              {[P1, P4].map((p, i) => (
                <mesh key={i} position={w(p)}><sphereGeometry args={[0.04, 16, 16]} /><meshStandardMaterial color="#495057" /></mesh>
              ))}
              <mesh position={w(P2)}><sphereGeometry args={[0.05, 16, 16]} /><meshStandardMaterial color={BLUE} /></mesh>
              <mesh position={w(P3)}><sphereGeometry args={[0.05, 16, 16]} /><meshStandardMaterial color={ORANGE} /></mesh>
              <mesh position={w(cur.pos)}><sphereGeometry args={[0.07, 20, 20]} /><meshStandardMaterial color={BEAD} /></mesh>
              <PointArrow at={w(P2)} dir={[eV2[0], eV2[1], 0]} length={Math.hypot(eV2[0], eV2[1]) * 0.18} color={VEL} thickness={0.022} />
              <PointArrow at={w(P3)} dir={[eV3[0], eV3[1], 0]} length={Math.hypot(eV3[0], eV3[1]) * 0.18} color={VEL} thickness={0.022} />
            </Scene3D>
          </div>

          <div className="w-full md:w-[280px] shrink-0 flex flex-col gap-3">
            <div className="flex gap-2">
              <WidgetButton active={playing} onClick={() => setPlaying(p => !p)}>{playing ? "Pause" : "Play"}</WidgetButton>
              <WidgetButton onClick={() => { tRef.current = 0; setSimT(0); setPlaying(false); }}>Reset</WidgetButton>
            </div>
            <div className="flex justify-between items-center text-[12px] border-t border-[var(--rule)] pt-2">
              <span className="ui font-semibold text-[var(--ink-soft)]">via velocities:</span>
              <button onClick={() => setAutoSmooth(a => !a)} className={`px-2 py-0.5 rounded text-[11px] ${autoSmooth ? "bg-[var(--accent)] text-white" : "bg-gray-200"}`}>
                {autoSmooth ? "auto-smooth" : "manual"}
              </button>
            </div>

            <div className="border-t border-[var(--rule)] pt-2 flex flex-col gap-2">
              <LabeledSlider label="T₂" value={T2} min={0.3} max={T3 - 0.3} step={0.05} onChange={v => setT2(Math.min(v, T3 - 0.3))} fmt={v => `${v.toFixed(2)} s`} width={130} />
              <LabeledSlider label="T₃" value={T3} min={T2 + 0.3} max={3.2} step={0.05} onChange={v => setT3(Math.max(v, T2 + 0.3))} fmt={v => `${v.toFixed(2)} s`} width={130} />
              <LabeledSlider label="x₂" value={P2[0]} min={-0.5} max={1.5} step={0.05} onChange={v => setP2([v, P2[1]])} width={130} />
              <LabeledSlider label="y₂" value={P2[1]} min={0.1} max={1.6} step={0.05} onChange={v => setP2([P2[0], v])} width={130} />
              <LabeledSlider label="x₃" value={P3[0]} min={0.0} max={1.8} step={0.05} onChange={v => setP3([v, P3[1]])} width={130} />
              <LabeledSlider label="y₃" value={P3[1]} min={0.1} max={1.6} step={0.05} onChange={v => setP3([P3[0], v])} width={130} />
              {!autoSmooth && (
                <>
                  <div className="ui text-[10px] font-bold tracking-wider text-[var(--ink-faint)] uppercase pt-1">via velocities</div>
                  <LabeledSlider label="ẋ₂" value={V2[0]} min={-3} max={3} step={0.1} onChange={v => setV2([v, V2[1]])} width={130} />
                  <LabeledSlider label="ẏ₂" value={V2[1]} min={-3} max={3} step={0.1} onChange={v => setV2([V2[0], v])} width={130} />
                  <LabeledSlider label="ẋ₃" value={V3[0]} min={-3} max={3} step={0.1} onChange={v => setV3([v, V3[1]])} width={130} />
                  <LabeledSlider label="ẏ₃" value={V3[1]} min={-3} max={3} step={0.1} onChange={v => setV3([V3[0], v])} width={130} />
                </>
              )}
            </div>
            <div className="border-t border-[var(--rule)] pt-2 flex flex-col gap-1.5">
              <Readout label="t" value={`${simT.toFixed(2)} s`} />
              <Readout label="peak |a|" value={`${maxAcc.toFixed(2)}`} color={met ? "var(--good)" : "var(--bad)"} />
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-[var(--rule)] pt-3">
          <div className="ui text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)] mb-2">
            time histories — <span style={{ color: BLUE }}>x</span>,{" "}
            <span style={{ color: ORANGE }}>y</span> (dashed lines = via times, where acceleration jumps)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Plot title="position" fn={t => state(t).pos} scale={26} vias={[T2, T3]} />
            <Plot title="velocity" fn={t => state(t).vel} scale={13} zero vias={[T2, T3]} />
            <Plot title="acceleration" fn={t => state(t).acc} scale={5} zero vias={[T2, T3]} />
          </div>
        </div>
      </WidgetShell>

      <Challenge id="ch9-via-points-accel" met={met}>
        Tame the motion: bring the peak acceleration magnitude below{" "}
        <M>{"4.0\\,\\text{units/s}^2"}</M>. Spreading the arrival times, easing the via velocities,
        or switching on auto-smooth all soften the corners — but the acceleration steps never
        fully vanish with cubics.
      </Challenge>

      <Aside>
        With only a start and end point and zero end velocities, this reduces exactly to the cubic
        point-to-point time scaling of the previous page. B-spline interpolation is a popular
        alternative: it stays inside the convex hull of the vias (respecting obstacles) but does
        not pass exactly through them.
      </Aside>

      <KeyIdea>
        Piecewise cubics match position and velocity at every via, so velocity is continuous but
        acceleration generally is not — it steps at each via point. Continuous acceleration
        requires fifth-order segments and specified via accelerations.
      </KeyIdea>

      <BookRef>Modern Robotics §9.3 — Polynomial Via Point Trajectories (Eqs. 9.25–9.29).</BookRef>
    </div>
  );
}

function Plot({ title, fn, scale, zero = false, vias }: { title: string; fn: (t: number) => [number, number]; scale: number; zero?: boolean; vias: number[] }) {
  const W = 220, H = 80;
  const line = (idx: 0 | 1, color: string) => {
    const pts: string[] = [];
    for (let i = 0; i <= 80; i++) {
      const t = T1 + (i / 80) * (T4 - T1);
      const y = H / 2 - fn(t)[idx] * scale;
      pts.push(`${(i / 80) * W},${Math.max(2, Math.min(H - 2, y))}`);
    }
    return <path d={`M ${pts.join(" L ")}`} fill="none" stroke={color} strokeWidth={1.5} />;
  };
  return (
    <div className="bg-[#fcfbf9] border border-gray-200 rounded p-1.5 flex flex-col items-center">
      <span className="ui text-[10px] font-semibold text-[var(--ink-soft)]">{title}</span>
      <svg width={W} height={H} className="mt-1">
        {zero && <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#e7e4da" strokeWidth={1} />}
        {vias.map((tv, i) => (
          <line key={i} x1={(tv / T4) * W} y1={0} x2={(tv / T4) * W} y2={H} stroke="#d9d4c6" strokeWidth={1} strokeDasharray="2 2" />
        ))}
        {line(0, BLUE)}
        {line(1, ORANGE)}
      </svg>
    </div>
  );
}
