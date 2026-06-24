import { useState, useRef, useEffect, useMemo } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";
import { clamp } from "../../lib/math/vec";

const W = 760;
const H = 360;
const RED = "#d9483f";
const GREEN = "#2f9e44";
const BLUE = "#3b6fd4";
const PURPLE = "#6741d9";
const ORANGE = "#c2571c";
const G = 9.81;

// ------------------------------------------------------------------
// Roller coaster energy visualizer
// ------------------------------------------------------------------
function RollerCoaster() {
  const [h0, setH0] = useState(14);
  const [mass, setMass] = useState(2);
  const [friction, setFriction] = useState(0);
  const [tFrac, setTFrac] = useState(0);

  // Track: a polynomial path defined by control heights
  // points in (x_norm 0-1, height_m) form — piecewise sinusoidal
  const trackPts = useMemo(() => {
    const n = 200;
    return Array.from({ length: n }, (_, i) => {
      const x = i / (n - 1);
      const hill1 = 8 * Math.exp(-((x - 0.32) ** 2) / 0.006);
      const dip = -2 * Math.exp(-((x - 0.55) ** 2) / 0.004);
      const hill2 = 6 * Math.exp(-((x - 0.75) ** 2) / 0.007);
      return { x, h: hill1 + dip + hill2 };
    });
  }, []);

  // Total arc length
  const arcLen = useMemo(() => {
    let s = 0;
    for (let i = 1; i < trackPts.length; i++) {
      const dx = (trackPts[i].x - trackPts[i - 1].x) * 650;
      const dh = (trackPts[i].h - trackPts[i - 1].h) * 20;
      s += Math.hypot(dx, dh);
    }
    return s;
  }, [trackPts]);

  // Map tFrac → index on track using arc length
  const ballIdx = useMemo(() => {
    const target = tFrac * arcLen;
    let s = 0;
    for (let i = 1; i < trackPts.length; i++) {
      const dx = (trackPts[i].x - trackPts[i - 1].x) * 650;
      const dh = (trackPts[i].h - trackPts[i - 1].h) * 20;
      const ds = Math.hypot(dx, dh);
      if (s + ds >= target) return i;
      s += ds;
    }
    return trackPts.length - 1;
  }, [tFrac, arcLen, trackPts]);

  const ball = trackPts[ballIdx];
  const totalE = mass * G * h0;
  const energyLost = friction * mass * G * tFrac * arcLen * 0.01;
  const pe = mass * G * ball.h;
  const ke = Math.max(0, totalE - pe - energyLost);
  const speed = Math.sqrt(2 * ke / mass);

  // SVG mapping
  const ox = 60;
  const oy = 300;
  const sx = (xn: number) => ox + xn * 650;
  const sy = (h: number) => oy - h * 20;
  const path = trackPts.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.h).toFixed(1)}`).join(" ");

  const ballX = sx(ball.x);
  const ballY = sy(ball.h);
  const reachTop = ke > 0 && ballIdx >= trackPts.length * 0.28 && ballIdx <= trackPts.length * 0.38;
  const hill1H = Math.max(...trackPts.slice(Math.floor(trackPts.length * 0.25), Math.floor(trackPts.length * 0.4)).map(p => p.h));
  const canClear = totalE - energyLost > mass * G * hill1H;

  const clearMet = h0 >= hill1H + 0.3 && Math.abs(friction) < 0.05;

  // Energy bar params
  const barX = W - 130;
  const barMaxH = 160;
  const barW = 36;
  const totalBarH = clamp((totalE / (mass * G * 16)) * barMaxH, 0, barMaxH);
  const peBarH = clamp((pe / (mass * G * 16)) * barMaxH, 0, barMaxH);
  const keBarH = clamp((ke / (mass * G * 16)) * barMaxH, 0, barMaxH);

  return (
    <>
      <WidgetShell
        title="Roller-coaster energy"
        onReset={() => { setH0(14); setMass(2); setFriction(0); setTFrac(0); }}
        caption="Drag the time slider. Green = KE, red = PE, blue = total. Without friction total energy is constant."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* track */}
          <line x1={ox} y1={oy} x2={ox + 650} y2={oy} stroke="#c4c0b4" strokeWidth={1.5} />
          <path d={path} fill="none" stroke="#8a8a9b" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />

          {/* initial height label */}
          <line x1={ox} y1={oy} x2={ox} y2={sy(h0)} stroke={BLUE} strokeWidth={2} strokeDasharray="6 4" />
          <text x={ox + 8} y={sy(h0) + 14} fontFamily="Inter, sans-serif" fontSize="12" fill={BLUE}>
            h₀ = {h0} m
          </text>

          {/* ball */}
          <circle cx={ballX} cy={ballY} r={10} fill={ORANGE} stroke="#fff" strokeWidth={2.5} />

          {/* energy bars */}
          <rect x={barX} y={oy - barMaxH - 10} width={barW * 3 + 12} height={barMaxH + 10}
            rx={6} fill="#f6f4ee" stroke="#e4e1d8" />
          {/* total E bar */}
          <rect x={barX + 4} y={oy - 10 - totalBarH} width={barW} height={totalBarH} rx={3} fill={BLUE} opacity={0.3} />
          <rect x={barX + 4} y={oy - 10 - totalBarH} width={barW} height={totalBarH} rx={3} fill="none" stroke={BLUE} strokeWidth={1.5} />
          {/* PE bar */}
          <rect x={barX + 4 + barW + 4} y={oy - 10 - peBarH} width={barW} height={peBarH} rx={3} fill={RED} opacity={0.7} />
          {/* KE bar */}
          <rect x={barX + 4 + 2 * (barW + 4)} y={oy - 10 - keBarH} width={barW} height={keBarH} rx={3} fill={GREEN} opacity={0.7} />
          <text x={barX + 4 + barW / 2} y={oy + 5} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10" fill={BLUE}>E</text>
          <text x={barX + 4 + barW + 4 + barW / 2} y={oy + 5} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10" fill={RED}>PE</text>
          <text x={barX + 4 + 2 * (barW + 4) + barW / 2} y={oy + 5} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10" fill={GREEN}>KE</text>
        </svg>
        <ControlBar>
          <LabeledSlider label="h₀" value={h0} min={2} max={18} step={0.1} onChange={setH0}
            fmt={v => `${v.toFixed(1)} m`} color={BLUE} />
          <LabeledSlider label="mass" value={mass} min={0.5} max={10} step={0.1} onChange={setMass}
            fmt={v => `${v.toFixed(1)} kg`} />
          <LabeledSlider label="friction" value={friction} min={0} max={0.3} step={0.005} onChange={setFriction}
            fmt={v => v.toFixed(3)} color={ORANGE} />
          <LabeledSlider label="position" value={tFrac} min={0} max={1} step={0.005} onChange={setTFrac}
            fmt={v => `${(v * 100).toFixed(0)}%`} />
          <Readout label="KE" value={`${ke.toFixed(1)} J`} color={GREEN} />
          <Readout label="PE" value={`${pe.toFixed(1)} J`} color={RED} />
          <Readout label="v" value={`${speed.toFixed(2)} m/s`} color={ORANGE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys3-coaster-top" met={clearMet}>
        Set a launch height that lets the ball clear the first hill (height ≈ {hill1H.toFixed(1)} m) with
        zero friction. The ball needs enough energy at the hilltop:{" "}
        <M>{"h_0 > h_{\\text{hill}}"}</M>.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Spring-mass energy exchange
// ------------------------------------------------------------------
function SpringMassEnergy() {
  const [k, setK] = useState(40);
  const [mass, setMass] = useState(1);
  const [x0, setX0] = useState(0.8); // initial displacement
  const [running, setRunning] = useState(false);
  const stateRef = useRef({ x: 0.8, v: 0, t: 0 });
  const rafRef = useRef<number>(0);
  const [display, setDisplay] = useState({ x: 0.8, v: 0, t: 0 });

  useEffect(() => {
    stateRef.current = { x: x0, v: 0, t: 0 };
    setDisplay({ x: x0, v: 0, t: 0 });
  }, [x0, k, mass]);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    let last = performance.now();
    function step(now: number) {
      const dt = Math.min((now - last) / 1000, 0.02);
      last = now;
      const s = stateRef.current;
      // RK4
      const f = (xx: number, _vv: number) => -k / mass * xx;
      const k1x = s.v, k1v = f(s.x, s.v);
      const k2x = s.v + 0.5 * dt * k1v, k2v = f(s.x + 0.5 * dt * k1x, s.v + 0.5 * dt * k1v);
      const k3x = s.v + 0.5 * dt * k2v, k3v = f(s.x + 0.5 * dt * k2x, s.v + 0.5 * dt * k2v);
      const k4x = s.v + dt * k3v, k4v = f(s.x + dt * k3x, s.v + dt * k3v);
      s.x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
      s.v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
      s.t += dt;
      setDisplay({ ...s });
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, k, mass]);

  const x = display.x;
  const v = display.v;
  const ke = 0.5 * mass * v * v;
  const pe = 0.5 * k * x * x;
  const totalE = 0.5 * k * x0 * x0;
  const omega = Math.sqrt(k / mass);
  const period = 2 * Math.PI / omega;

  // SVG: spring + mass horizontal
  const eq = W / 2;
  const massX = eq + x * 140;
  const barMax = 130;

  const largePeMet = pe > 15;

  return (
    <>
      <WidgetShell
        title="Spring-mass energy exchange"
        onReset={() => { setRunning(false); setX0(0.8); stateRef.current = { x: 0.8, v: 0, t: 0 }; setDisplay({ x: 0.8, v: 0, t: 0 }); }}
        caption="KE and PE trade off perfectly. Their sum (total energy) stays constant — watch the bar heights."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* spring wall */}
          <line x1={80} y1={130} x2={80} y2={230} stroke="#8a8a9b" strokeWidth={3} />
          {/* spring coils */}
          {Array.from({ length: 14 }, (_, i) => {
            const t0 = 80 + (i / 14) * (massX - 100 - 80);
            const t1 = 80 + ((i + 1) / 14) * (massX - 100 - 80);
            const y0 = 180 + (i % 2 === 0 ? -14 : 14);
            const y1 = 180 + ((i + 1) % 2 === 0 ? -14 : 14);
            return <line key={i} x1={t0} y1={y0} x2={t1} y2={y1} stroke="#50525e" strokeWidth={2.5} />;
          })}
          {/* mass block */}
          <rect x={massX - 30} y={155} width={60} height={50} rx={5}
            fill={Math.abs(v) > 0.1 ? "#ffe3e0" : "#dbd7c8"} stroke="#50525e" strokeWidth={2} />
          <text x={massX} y={185} textAnchor="middle" fontFamily="Inter, sans-serif"
            fontSize="13" fontWeight="600" fill="#4b4b5e">{mass} kg</text>
          {/* equilibrium line */}
          <line x1={eq} y1={135} x2={eq} y2={225} stroke="#bbb" strokeWidth={1.5} strokeDasharray="5 4" />
          <text x={eq + 4} y={130} fontFamily="Inter, sans-serif" fontSize="11" fill="#8a8a9b">eq</text>

          {/* energy bars on the right */}
          {[
            { label: "PE", color: RED, h: (pe / totalE) * barMax, x: W - 170 },
            { label: "KE", color: GREEN, h: (ke / totalE) * barMax, x: W - 120 },
            { label: "E_total", color: BLUE, h: barMax, x: W - 70 },
          ].map(b => (
            <g key={b.label}>
              <rect x={b.x} y={300 - barMax} width={34} height={barMax} rx={3}
                fill="#f0eee8" stroke="#e4e1d8" />
              <rect x={b.x} y={300 - b.h} width={34} height={b.h} rx={3}
                fill={b.color} opacity={0.75} />
              <text x={b.x + 17} y={314} textAnchor="middle" fontFamily="Inter, sans-serif"
                fontSize="10" fill={b.color}>{b.label}</text>
            </g>
          ))}

          {/* x displacement readout */}
          <text x={massX} y={232} textAnchor="middle" fontFamily="Inter, sans-serif"
            fontSize="11" fill="#8a8a9b">x = {x.toFixed(3)} m</text>
        </svg>
        <ControlBar>
          <LabeledSlider label="k" value={k} min={5} max={200} step={1} onChange={setK}
            fmt={v => `${v.toFixed(0)} N/m`} color={BLUE} />
          <LabeledSlider label="mass" value={mass} min={0.1} max={5} step={0.05} onChange={setMass}
            fmt={v => `${v.toFixed(2)} kg`} />
          <LabeledSlider label="x₀" value={x0} min={0.1} max={1.5} step={0.01} onChange={setX0}
            fmt={v => `${v.toFixed(2)} m`} color={ORANGE} />
          <WidgetButton onClick={() => setRunning(r => !r)} active={running}>
            {running ? "Pause" : "Play"}
          </WidgetButton>
          <Readout label="ω₀" value={`${omega.toFixed(2)} rad/s`} color={PURPLE} />
          <Readout label="T" value={`${period.toFixed(2)} s`} />
          <Readout label="KE" value={`${ke.toFixed(3)} J`} color={GREEN} />
          <Readout label="PE" value={`${pe.toFixed(3)} J`} color={RED} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys3-spring-pe20" met={largePeMet}>
        Store at least 15 J of potential energy at the initial displacement. Use the spring
        constant and displacement sliders: <M>{"U = \\tfrac{1}{2}k x_0^2 \\geq 15 \\text{ J}"}</M>.
      </Challenge>
    </>
  );
}

// ------------------------------------------------------------------
// Work integral — area under force-displacement curve
// ------------------------------------------------------------------
function WorkIntegral() {
  const [fConst, setFConst] = useState(15);
  const [slope, setSlope] = useState(0);
  const [xMax, setXMax] = useState(4);

  // F(x) = fConst + slope*x
  const work = fConst * xMax + 0.5 * slope * xMax * xMax;

  const plotX = 60;
  const plotY = 30;
  const plotW = 580;
  const plotH = 220;
  const xS = (x: number) => plotX + (x / 6) * plotW;
  const yS = (f: number) => plotY + plotH - (f / 60) * plotH;

  const nPts = 80;
  const areaPts = Array.from({ length: nPts }, (_, i) => {
    const x = (i / (nPts - 1)) * xMax;
    return `${xS(x).toFixed(1)},${yS(fConst + slope * x).toFixed(1)}`;
  });
  const areaPath = `M ${xS(0)},${yS(0)} ${areaPts.map((p, i) => (i === 0 ? `L ${p}` : `L ${p}`)).join(" ")} L ${xS(xMax)},${yS(0)} Z`;
  const linePts = Array.from({ length: 2 }, (_, i) => {
    const x = i * 6;
    return `${xS(x)},${yS(fConst + slope * x)}`;
  }).join(" ");

  const workMet = Math.abs(work - 50) < 3;

  return (
    <>
      <WidgetShell
        title="Work = area under F–x curve"
        onReset={() => { setFConst(15); setSlope(0); setXMax(4); }}
        caption="The shaded area between the force curve and the x-axis is the work done. W = ∫F dx."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke="#8a8a9b" strokeWidth={1.5} />
          <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke="#8a8a9b" strokeWidth={1.5} />
          {[0, 1, 2, 3, 4, 5, 6].map(x => (
            <g key={x}>
              <line x1={xS(x)} y1={plotY} x2={xS(x)} y2={plotY + plotH} stroke="#e4e1d8" />
              <text x={xS(x)} y={plotY + plotH + 18} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fill="#8a8a9b">{x} m</text>
            </g>
          ))}
          {[0, 20, 40, 60].map(f => (
            <g key={f}>
              <line x1={plotX - 4} y1={yS(f)} x2={plotX + plotW} y2={yS(f)} stroke="#e4e1d8" />
              <text x={plotX - 8} y={yS(f) + 4} textAnchor="end" fontFamily="Inter, sans-serif" fontSize="11" fill="#8a8a9b">{f}N</text>
            </g>
          ))}
          {/* shaded area */}
          <path d={areaPath} fill={PURPLE} opacity={0.15} />
          {/* force line */}
          <polyline points={linePts} fill="none" stroke={PURPLE} strokeWidth={3.5} />
          {/* xMax marker */}
          <line x1={xS(xMax)} y1={plotY} x2={xS(xMax)} y2={plotY + plotH} stroke={ORANGE} strokeWidth={2.5} strokeDasharray="7 5" />
          <text x={xS(xMax) + 6} y={plotY + 18} fontFamily="Inter, sans-serif" fontSize="12" fill={ORANGE}>x_max</text>
          {/* work label */}
          <text x={plotX + plotW - 10} y={plotY + 20} textAnchor="end"
            fontFamily="Inter, sans-serif" fontSize="14" fontWeight="700" fill={PURPLE}>
            W = {work.toFixed(1)} J
          </text>
        </svg>
        <ControlBar>
          <LabeledSlider label="F₀ (const)" value={fConst} min={0} max={55} step={0.5} onChange={setFConst}
            fmt={v => `${v.toFixed(1)} N`} color={PURPLE} />
          <LabeledSlider label="slope" value={slope} min={-8} max={8} step={0.1} onChange={setSlope}
            fmt={v => `${v.toFixed(1)} N/m`} />
          <LabeledSlider label="x_max" value={xMax} min={0.2} max={6} step={0.05} onChange={setXMax}
            fmt={v => `${v.toFixed(2)} m`} color={ORANGE} />
          <Readout label="Work" value={`${work.toFixed(2)} J`} color={PURPLE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys3-work-50j" met={workMet}>
        Tune the force profile and displacement to do exactly 50 J of work (±3 J). Try both a
        constant force over a long distance and a variable force over a short one.
      </Challenge>
    </>
  );
}

export default function Energy() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 3"
        section="College Physics & Dynamics"
        title="Work, Energy, and Power"
        lede="Energy is the currency of mechanics. Work done by forces converts between kinetic and potential forms — and the total stays constant when friction is absent."
      />

      <p>
        Work is force times displacement along the force direction:{" "}
        <M>{"W = \\int \\mathbf{F}\\cdot d\\mathbf{r}"}</M>. The work-energy theorem says that
        the net work done on an object equals its change in kinetic energy:
      </p>
      <Eq>{"W_{\\text{net}} = \\Delta KE = \\tfrac{1}{2}mv_f^2 - \\tfrac{1}{2}mv_i^2."}</Eq>
      <p>
        Gravity and spring forces are special: they are <em>conservative</em>. The work they do
        depends only on the endpoints, not the path. This allows us to define potential energy
        and write a conservation law:
      </p>
      <Eq>{"E = KE + PE = \\tfrac{1}{2}mv^2 + mgh = \\text{const} \\quad (\\text{no friction})."}</Eq>

      <WorkIntegral />

      <H2>Conservation on a roller coaster</H2>
      <p>
        A roller coaster converts height (potential energy) to speed (kinetic energy) and back.
        Without friction the total stays constant. Every peak the car can reach must have total
        energy above <M>{"mgh_{\\text{peak}}"}</M>. Adding friction drains energy continuously —
        the car slows down and cannot climb as high.
      </p>

      <RollerCoaster />

      <KeyIdea>
        Conservation of energy replaces force analysis for trajectory problems: if you know the
        height and the total mechanical energy, you know the speed — without tracking every force
        along the path.
      </KeyIdea>

      <H2>Spring-mass energy exchange</H2>
      <p>
        A mass on a spring converts kinetic to potential and back with perfect regularity. At the
        equilibrium point <M>{"x=0"}</M>, all energy is kinetic. At maximum displacement{" "}
        <M>{"x = A"}</M>, all energy is potential. The natural frequency depends only on the ratio{" "}
        <M>{"k/m"}:</M>
      </p>
      <Eq>{"\\omega_0 = \\sqrt{\\frac{k}{m}}, \\qquad E = \\tfrac{1}{2}kA^2."}</Eq>

      <SpringMassEnergy />

      <Aside>
        Energy methods appear throughout robotics: potential fields guide motion planners, kinetic
        and potential energy form the Lagrangian for dynamics, and energy-based control (passivity)
        guarantees stability by design.
      </Aside>

      <BookRef>
        Physics track: work, kinetic energy, gravitational PE, elastic PE, work-energy theorem,
        conservation of energy, power.
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
