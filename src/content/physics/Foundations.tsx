import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Play, Pause } from "lucide-react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { ControlBar, LabeledSlider, Readout, WidgetShell, WidgetButton } from "../../components/widgets/WidgetShell";
import { svgCoords } from "../../lib/svg";
import { clamp, deg, rad } from "../../lib/math/vec";

const X_COLOR = "#d9483f"; // x / horizontal
const Y_COLOR = "#2f9e44"; // y / vertical
const V_COLOR = "#6741d9"; // resultant / velocity
const A_COLOR = "#c2571c"; // acceleration / time marker
const BLUE = "#3b6fd4";
const GOLD = "#caa53d";

/**
 * One shared requestAnimationFrame loop. `onFrame` is kept in a ref and
 * refreshed every render, so it always sees the latest state/props without
 * restarting the loop — the effect only re-runs when `running` flips.
 */
function useRaf(running: boolean, onFrame: (dt: number) => void) {
  const cb = useRef(onFrame);
  cb.current = onFrame;
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let id = 0;
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      cb.current(dt);
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [running]);
}

function PlayButton({ running, onClick, labels = ["play", "pause"] }: { running: boolean; onClick: () => void; labels?: [string, string] }) {
  return (
    <WidgetButton onClick={onClick} active={running}>
      <span className="inline-flex items-center gap-1.5">
        {running ? <Pause size={13} /> : <Play size={13} />}
        {running ? labels[1] : labels[0]}
      </span>
    </WidgetButton>
  );
}

export default function Foundations() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 1"
        section="College Physics & Dynamics"
        title="Foundations of Motion"
        lede="Motion begins with a choice of coordinates. Once position is a vector, velocity and acceleration are just the first two ways that vector changes — and the answer to “how fast?” depends on who is asking."
      />

      <p>
        A physics problem starts the moment we decide what numbers describe the state of the world.
        For a point moving in a plane, the smallest useful description is its position vector{" "}
        <M>{"\\mathbf r = x\\,\\hat{x} + y\\,\\hat{y}"}</M>. The two components are not two separate
        objects — they are the shadows the single geometric arrow casts on the coordinate axes. Spin
        the arrow below and watch those shadows breathe in and out as sine and cosine.
      </p>

      <VectorScope />

      <p>
        Those oscillating shadows are your first glimpse of a pattern that returns everywhere in this
        course: a rotating vector projects onto each axis as a sinusoid. The same picture will reappear
        as oscillations, as alternating current, and as the columns of a rotation matrix in the Modern
        Robotics chapters. For now the lesson is narrower: <em>a vector is one object; its components
        are frame-dependent descriptions of it.</em>
      </p>

      <H2>Velocity and acceleration are rates of change</H2>
      <p>
        Position tells us where the point is. <strong>Velocity</strong> tells us how position changes,{" "}
        <M>{"\\mathbf v = \\dot{\\mathbf r}"}</M>. <strong>Acceleration</strong> tells us how velocity
        changes, <M>{"\\mathbf a = \\dot{\\mathbf v} = \\ddot{\\mathbf r}"}</M>. Under a constant
        acceleration the relationship closes into two familiar formulas:
      </p>

      <Eq>{"x(t) = x_0 + v_0\\,t + \\tfrac{1}{2}a\\,t^2, \\qquad v(t) = v_0 + a\\,t"}</Eq>

      <p>
        Press play and watch one bead obey both at once. The slope of the position curve <em>is</em>{" "}
        the velocity curve; the moment the velocity curve crosses zero is the moment the bead stops
        and turns around.
      </p>

      <KinematicsTrack />

      <KeyIdea>
        The state of a moving particle is position together with velocity. Acceleration is the rule
        that bends the trajectory by continuously rewriting the velocity. When velocity passes through
        zero, position is at a turning point — not at rest forever, just for an instant.
      </KeyIdea>

      <H2>Two-dimensional motion is component-wise motion</H2>
      <p>
        A projectile is the first place where vector thinking truly pays off. With no air resistance,
        gravity pulls only downward, so the horizontal and vertical motions are completely independent.
        The horizontal velocity never changes; the vertical velocity falls steadily under gravity. Two
        one-dimensional problems, glued together by a shared clock:
      </p>

      <Eq>
        {"x(t)=x_0+v_0\\cos\\theta\\,t, \\qquad y(t)=y_0+v_0\\sin\\theta\\,t-\\tfrac{1}{2}g\\,t^2"}
      </Eq>

      <ProjectileLauncher />

      <Aside>
        Notice the red arrow on the ball never changes length, while the green one shrinks, vanishes at
        the peak, then grows downward. That is the independence of the two axes made visible — the
        single most useful idea in introductory kinematics.
      </Aside>

      <H2>Velocity depends on the frame</H2>
      <p>
        Ask “how fast is the boat moving?” and the honest answer is “relative to what?” Velocity is not
        a property of an object alone; it is a relationship between an object and a reference frame.
        Velocities measured in different frames combine by simple vector addition:
      </p>

      <Eq>{"\\mathbf v_{\\text{boat/ground}} = \\mathbf v_{\\text{boat/water}} + \\mathbf v_{\\text{water/ground}}"}</Eq>

      <p>
        A boat that points straight across a flowing river does not arrive straight across — the current
        sweeps it downstream. To land at the dock, the pilot must aim <em>upstream</em>, choosing a
        heading so that the boat-relative-to-water velocity cancels the current exactly along the bank.
        Drag the heading and current, then launch:
      </p>

      <RiverCrossing />

      <Aside>
        This is the first and most important robotics bridge in the course. Every robot lives in nested
        frames — world, base, link, end-effector, sensor — and the rule for changing frames is exactly
        the velocity-addition picture you just steered. Chapters 3–5 of Modern Robotics replace the
        flat <M>{"\\hat{x},\\hat{y}"}</M> plane with rotating frames and the algebra of{" "}
        <M>{"SE(3)"}</M>, but the question never changes: <em>relative to which frame?</em>
      </Aside>

      <BookRef>
        Supplemental physics track · Module 1: vectors and frames, constant-acceleration kinematics,
        projectile motion, and relative motion. Bridges forward to Modern Robotics §3 (rigid-body
        motions) and §5 (velocity kinematics).
      </BookRef>
      <PhysicsRef />
    </div>
  );
}

/* ===================================================================== */
/* Widget 1 — rotating vector & its component shadows                    */
/* ===================================================================== */

function VectorScope() {
  const W = 760;
  const H = 360;
  const O: [number, number] = [200, 180];
  const SCALE = 26; // px per unit
  const svgRef = useRef<SVGSVGElement>(null);
  const [tip, setTip] = useState<[number, number]>([O[0] + 3 * SCALE, O[1] - 4 * SCALE]);
  const [spinning, setSpinning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const histRef = useRef<{ t: number; vx: number; vy: number }[]>([]);
  const tRef = useRef(0);
  const [, force] = useState(0);

  const vx = (tip[0] - O[0]) / SCALE;
  const vy = (O[1] - tip[1]) / SCALE;
  const mag = Math.hypot(vx, vy);
  const theta = Math.atan2(vy, vx);

  useRaf(spinning, dt => {
    const w = 0.9; // rad/s
    setTip(([tx, ty]) => {
      const dx = tx - O[0];
      const dy = ty - O[1];
      const c = Math.cos(w * dt);
      const s = Math.sin(w * dt);
      // rotate counter-clockwise in screen space (y is down, so negate)
      const nx = O[0] + dx * c + dy * s;
      const ny = O[1] - dx * s + dy * c;
      const nvx = (nx - O[0]) / SCALE;
      const nvy = (O[1] - ny) / SCALE;
      tRef.current += dt;
      const h = histRef.current;
      h.push({ t: tRef.current, vx: nvx, vy: nvy });
      if (h.length > 700) h.shift();
      return [nx, ny];
    });
    force(n => n + 1);
  });

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    const [x, y] = svgCoords(e, svgRef.current, W, H);
    setTip([clamp(x, O[0] - 5.2 * SCALE, O[0] + 5.2 * SCALE), clamp(y, O[1] - 5.2 * SCALE, O[1] + 5.2 * SCALE)]);
  };

  function reset() {
    setSpinning(false);
    histRef.current = [];
    tRef.current = 0;
    setTip([O[0] + 3 * SCALE, O[1] - 4 * SCALE]);
  }

  // right-hand scrolling plot of the two components
  const plotX = 460;
  const plotW = 280;
  const plotMid = 180;
  const plotHalf = 120;
  const tWin = 7;
  const tNow = tRef.current;
  const vScale = plotHalf / 5.5;
  const hist = histRef.current;
  const mapT = (t: number) => plotX + ((t - (tNow - tWin)) / tWin) * plotW;
  const buildPath = (key: "vx" | "vy") =>
    hist
      .filter(p => p.t >= tNow - tWin)
      .map((p, i) => `${i === 0 ? "M" : "L"} ${mapT(p.t).toFixed(1)} ${(plotMid - p[key] * vScale).toFixed(1)}`)
      .join(" ");

  const targetMet = !spinning && Math.abs(vx - 3) < 0.12 && Math.abs(vy - 4) < 0.12;

  return (
    <>
      <WidgetShell
        title="Vector components — the shadows of one arrow"
        onReset={reset}
        caption="Drag the purple tip, or press spin to rotate the arrow at a constant rate. The red and green shadows are the x- and y-components; on the right they trace out cosine and sine as the arrow turns."
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full touch-none select-none rounded-lg bg-[#fbfaf7]"
          onPointerMove={onMove}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        >
          <ArrowDefs />
          {/* scope grid */}
          <Grid width={420} height={H} origin={O} step={SCALE} />
          {/* magnitude circle preserved while spinning */}
          <circle cx={O[0]} cy={O[1]} r={mag * SCALE} fill="none" stroke="#d9d5ca" strokeWidth={1.2} strokeDasharray="3 5" />
          {/* component shadows */}
          <line x1={O[0]} y1={O[1]} x2={tip[0]} y2={O[1]} stroke={X_COLOR} strokeWidth={4} markerEnd="url(#fd-arrow-x)" />
          <line x1={tip[0]} y1={O[1]} x2={tip[0]} y2={tip[1]} stroke={Y_COLOR} strokeWidth={4} markerEnd="url(#fd-arrow-y)" />
          <line x1={O[0]} y1={tip[1]} x2={tip[0]} y2={tip[1]} stroke="#d9d5ca" strokeWidth={1.4} strokeDasharray="5 5" />
          {/* resultant */}
          <line x1={O[0]} y1={O[1]} x2={tip[0]} y2={tip[1]} stroke={V_COLOR} strokeWidth={5} markerEnd="url(#fd-arrow-v)" />
          <circle
            cx={tip[0]}
            cy={tip[1]}
            r={11}
            className="cursor-grab"
            fill={V_COLOR}
            stroke="#fff"
            strokeWidth={3}
            onPointerDown={e => {
              setSpinning(false);
              setDragging(true);
              (e.currentTarget as SVGCircleElement).setPointerCapture?.(e.pointerId);
            }}
          />
          <text x={tip[0] + 14} y={tip[1] - 10} className="ui fill-[var(--ink-soft)] text-[13px]">r</text>

          {/* divider */}
          <line x1={440} y1={28} x2={440} y2={H - 24} stroke="#e4e1d8" strokeWidth={1.4} />

          {/* component traces */}
          <line x1={plotX} y1={plotMid} x2={plotX + plotW} y2={plotMid} stroke="#cfcabc" strokeWidth={1.2} />
          {/* amplitude envelope */}
          <line x1={plotX} y1={plotMid - mag * vScale} x2={plotX + plotW} y2={plotMid - mag * vScale} stroke="#9e9e9e" strokeWidth={1} strokeDasharray="3 4" opacity={0.7} />
          <line x1={plotX} y1={plotMid + mag * vScale} x2={plotX + plotW} y2={plotMid + mag * vScale} stroke="#9e9e9e" strokeWidth={1} strokeDasharray="3 4" opacity={0.7} />
          <text x={plotX + plotW - 3} y={plotMid - mag * vScale - 4} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10px]">A = {mag.toFixed(2)}</text>
          <text x={plotX + plotW - 3} y={36} textAnchor="end" className="ui text-[11px]" fill={V_COLOR}>θ = {deg(theta).toFixed(0)}°</text>
          {hist.length > 1 && (
            <>
              <path d={buildPath("vx")} fill="none" stroke={X_COLOR} strokeWidth={2.4} />
              <path d={buildPath("vy")} fill="none" stroke={Y_COLOR} strokeWidth={2.4} />
            </>
          )}
          {hist.length <= 1 && (
            <text x={plotX + plotW / 2} y={plotMid} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[12px]">
              press spin to trace the components
            </text>
          )}
          <text x={plotX} y={24} className="ui fill-[var(--ink-faint)] text-[11px]">x-component (cos)</text>
          <text x={plotX} y={H - 10} className="ui fill-[var(--ink-faint)] text-[11px]">y-component (sin) · time →</text>
        </svg>
        <ControlBar>
          <PlayButton running={spinning} onClick={() => setSpinning(s => !s)} labels={["spin", "stop"]} />
          <Readout label="x" value={`${vx.toFixed(2)}`} color={X_COLOR} />
          <Readout label="y" value={`${vy.toFixed(2)}`} color={Y_COLOR} />
          <Readout label="|r|" value={`${mag.toFixed(2)}`} color={V_COLOR} />
          <Readout label="angle" value={`${deg(theta).toFixed(0)}°`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys1-vector-3-4-5" met={targetMet}>
        Stop the spin and drag the tip until the arrow is about <M>{"3\\,\\hat{x} + 4\\,\\hat{y}"}</M>.
        The magnitude readout should lock onto almost exactly <strong>5</strong> — the 3-4-5 triangle.
      </Challenge>
    </>
  );
}

/* ===================================================================== */
/* Widget 2 — animated 1D kinematics with live x(t) and v(t) graphs      */
/* ===================================================================== */

function KinematicsTrack() {
  const W = 760;
  const H = 420;
  const [x0, setX0] = useState(0);
  const [v0, setV0] = useState(3.4);
  const [a, setA] = useState(-1.1);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const tMax = 6;

  useRaf(running, dt => {
    setT(prev => {
      const n = prev + dt;
      return n > tMax ? 0 : n;
    });
  });

  const xOf = (ti: number) => x0 + v0 * ti + 0.5 * a * ti * ti;
  const vOf = (ti: number) => v0 + a * ti;

  // sampled curves
  const N = 160;
  const samples = Array.from({ length: N + 1 }, (_, i) => {
    const ti = (i / N) * tMax;
    return { t: ti, x: xOf(ti), v: vOf(ti) };
  });
  const xs = samples.map(s => s.x);
  const vs = samples.map(s => s.v);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xPad = Math.max(0.5, (xMax - xMin) * 0.12);
  const vAbs = Math.max(1, ...vs.map(Math.abs));

  // layout regions
  const trackY = 56;
  const trackX0 = 70;
  const trackX1 = 690;
  const trackPos = (x: number) => trackX0 + ((x - (xMin - xPad)) / (xMax - xMin + 2 * xPad)) * (trackX1 - trackX0);

  const xPlotY = 96;
  const xPlotH = 150;
  const vPlotY = 270;
  const vPlotH = 120;
  const tToX = (ti: number) => trackX0 + (ti / tMax) * (trackX1 - trackX0);
  const xToScreen = (x: number) => xPlotY + xPlotH - ((x - (xMin - xPad)) / (xMax - xMin + 2 * xPad)) * xPlotH;
  const vToScreen = (v: number) => vPlotY + vPlotH / 2 - (v / vAbs) * (vPlotH / 2 - 6);

  const xPath = samples.map((s, i) => `${i === 0 ? "M" : "L"} ${tToX(s.t).toFixed(1)} ${xToScreen(s.x).toFixed(1)}`).join(" ");
  const vPath = samples.map((s, i) => `${i === 0 ? "M" : "L"} ${tToX(s.t).toFixed(1)} ${vToScreen(s.v).toFixed(1)}`).join(" ");

  const curX = xOf(t);
  const curV = vOf(t);
  const beadX = trackPos(curX);
  const playX = tToX(t);

  const tStop = Math.abs(a) > 1e-6 ? -v0 / a : Infinity;
  const turningVisible = Math.abs(a) > 0.08 && tStop > 0.5 && tStop < tMax - 0.5;

  return (
    <>
      <WidgetShell
        title="Position, velocity, and the turning point"
        onReset={() => { setX0(0); setV0(3.4); setA(-1.1); setT(0); setRunning(false); }}
        caption="Top: the bead on its track, its blue arrow is the live velocity. Middle: position x(t). Bottom: velocity v(t). The playhead ties all three together — watch the velocity hit zero exactly when the bead reverses."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* track */}
          <line x1={trackX0} y1={trackY} x2={trackX1} y2={trackY} stroke="#c4c0b4" strokeWidth={3} strokeLinecap="round" />
          {Array.from(
            { length: Math.floor(xMax + xPad) - Math.ceil(xMin - xPad) + 1 },
            (_, i) => Math.ceil(xMin - xPad) + i
          ).map(tick => (
            <g key={tick}>
              <line
                x1={trackPos(tick)} y1={trackY - (tick === 0 ? 10 : 6)}
                x2={trackPos(tick)} y2={trackY + (tick === 0 ? 10 : 6)}
                stroke="#a8a496" strokeWidth={tick === 0 ? 1.5 : 1.2}
              />
              <text x={trackPos(tick)} y={trackY + 22} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">
                {tick}
              </text>
            </g>
          ))}
          <text x={trackX1 + 8} y={trackY + 5} className="ui fill-[var(--ink-faint)] text-[11px]">m</text>
          {turningVisible && (
            <line x1={trackPos(xOf(tStop))} y1={trackY - 14} x2={trackPos(xOf(tStop))} y2={trackY + 14} stroke={GOLD} strokeWidth={2} strokeDasharray="3 3" />
          )}
          {/* velocity arrow on bead */}
          <line
            x1={beadX}
            y1={trackY}
            x2={beadX + clamp(curV * 26, -90, 90)}
            y2={trackY}
            stroke={BLUE}
            strokeWidth={4}
            markerEnd={Math.abs(curV) > 0.05 ? "url(#fd-arrow-b)" : undefined}
          />
          <circle cx={beadX} cy={trackY} r={11} fill={V_COLOR} stroke="#fff" strokeWidth={3} />

          {/* x(t) plot */}
          <PlotFrame x0={trackX0} y0={xPlotY} w={trackX1 - trackX0} h={xPlotH} label="position x(t)" />
          {/* zero line for x if it's in range */}
          {xMin - xPad < 0 && xMax + xPad > 0 && (
            <line x1={trackX0} y1={xToScreen(0)} x2={trackX1} y2={xToScreen(0)} stroke="#e4e1d8" />
          )}
          <path d={xPath} fill="none" stroke={V_COLOR} strokeWidth={3.5} />
          <circle cx={playX} cy={xToScreen(curX)} r={6} fill={V_COLOR} stroke="#fff" strokeWidth={2} />

          {/* v(t) plot */}
          <PlotFrame x0={trackX0} y0={vPlotY} w={trackX1 - trackX0} h={vPlotH} label="velocity v(t)" />
          <line x1={trackX0} y1={vToScreen(0)} x2={trackX1} y2={vToScreen(0)} stroke="#cfcabc" strokeWidth={1.2} />
          <path d={vPath} fill="none" stroke={BLUE} strokeWidth={3.5} />
          <circle cx={playX} cy={vToScreen(curV)} r={6} fill={BLUE} stroke="#fff" strokeWidth={2} />

          {/* shared playhead */}
          <line x1={playX} y1={xPlotY} x2={playX} y2={vPlotY + vPlotH} stroke={A_COLOR} strokeWidth={1.8} strokeDasharray="5 4" opacity={0.7} />
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={() => setRunning(r => !r)} />
          <LabeledSlider label="x₀" value={x0} min={-4} max={4} step={0.1} onChange={v => { setX0(v); }} fmt={v => `${v.toFixed(1)} m`} />
          <LabeledSlider label="v₀" value={v0} min={-5} max={5} step={0.1} onChange={setV0} fmt={v => `${v.toFixed(1)} m/s`} color={BLUE} />
          <LabeledSlider label="a" value={a} min={-2.5} max={2.5} step={0.05} onChange={setA} fmt={v => `${v.toFixed(2)} m/s²`} width={170} color={A_COLOR} />
          <LabeledSlider label="t" value={t} min={0} max={tMax} step={0.02} onChange={v => { setRunning(false); setT(v); }} fmt={v => `${v.toFixed(2)} s`} />
          <Readout label="x(t)" value={`${curX.toFixed(2)} m`} color={V_COLOR} />
          <Readout label="v(t)" value={`${curV.toFixed(2)} m/s`} color={BLUE} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys1-motion-stop" met={turningVisible}>
        Tune <M>{"v_0"}</M> and <M>{"a"}</M> so the bead clearly stops and reverses on the track —
        the gold tick marks the turning point. You are arranging for{" "}
        <M>{"v(t)=v_0+at"}</M> to cross zero in view, at <M>{"t = -v_0/a"}</M>.
      </Challenge>
    </>
  );
}

/* ===================================================================== */
/* Widget 3 — projectile launcher (real-time flight)                     */
/* ===================================================================== */

function ProjectileLauncher() {
  const W = 760;
  const H = 360;
  const g = 9.81;
  const [speed, setSpeed] = useState(22);
  const [angle, setAngle] = useState(52);
  const [height, setHeight] = useState(1.5);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);

  const th = rad(angle);
  const vx = speed * Math.cos(th);
  const vy0 = speed * Math.sin(th);
  const flightTime = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * height)) / g;
  const range = vx * flightTime;
  const peak = height + (vy0 * vy0) / (2 * g);

  useRaf(running, dt => {
    setT(prev => {
      const n = prev + dt;
      if (n >= flightTime) {
        setRunning(false);
        return flightTime;
      }
      return n;
    });
  });

  // reset the clock whenever the launch parameters change
  useEffect(() => { setRunning(false); setT(0); }, [speed, angle, height]);

  const origin: [number, number] = [58, 315];
  const scale = Math.min(11, 650 / Math.max(1, range), 250 / Math.max(1, peak));
  const sx = (x: number) => origin[0] + x * scale;
  const sy = (y: number) => origin[1] - y * scale;

  const fullArc = Array.from({ length: 81 }, (_, i) => {
    const ti = (i / 80) * flightTime;
    return [sx(vx * ti), sy(height + vy0 * ti - 0.5 * g * ti * ti)];
  });
  const ghostPath = fullArc.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

  const flown = Array.from({ length: 61 }, (_, i) => (i / 60) * t).map(ti => [sx(vx * ti), sy(height + vy0 * ti - 0.5 * g * ti * ti)]);
  const trailPath = flown.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

  const px = vx * t;
  const py = height + vy0 * t - 0.5 * g * t * t;
  const vyNow = vy0 - g * t;

  const tgt0 = 42;
  const tgt1 = 46;
  const hitTarget = range > tgt0 && range < tgt1 && peak < 18;

  function launch() {
    if (running) { setRunning(false); return; }
    if (t >= flightTime - 1e-3) setT(0);
    setRunning(true);
  }

  return (
    <>
      <WidgetShell
        title="Projectile launcher"
        onReset={() => { setSpeed(22); setAngle(52); setHeight(1.5); setT(0); setRunning(false); }}
        caption="The faint arc is the predicted path; press launch to fly it in real time. Red is the unchanging horizontal velocity, green is the vertical velocity that gravity rewrites every instant."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          <ArrowDefs />
          {/* ground */}
          <line x1={40} y1={origin[1]} x2={730} y2={origin[1]} stroke="#8a8a9b" strokeWidth={1.5} />
          {/* launch platform */}
          {height > 0.05 && <rect x={origin[0] - 14} y={sy(height)} width={16} height={height * scale} fill="#d7d2c4" />}
          {/* target zone */}
          <rect x={sx(tgt0)} y={origin[1] - 30} width={(tgt1 - tgt0) * scale} height={30} fill="#f0f8f1" stroke="#bfdfc4" />
          <text x={sx((tgt0 + tgt1) / 2)} y={origin[1] - 38} textAnchor="middle" className="ui fill-[var(--good)] text-[11px] font-semibold">target</text>
          {/* predicted arc */}
          <path d={ghostPath} fill="none" stroke="#bdb7a6" strokeWidth={1.6} strokeDasharray="4 5" />
          {/* flown trail */}
          {t > 0 && <path d={trailPath} fill="none" stroke={V_COLOR} strokeWidth={3.5} />}
          {/* ball + velocity decomposition */}
          <circle cx={sx(px)} cy={sy(py)} r={8} fill={A_COLOR} stroke="#fff" strokeWidth={2.5} />
          <line x1={sx(px)} y1={sy(py)} x2={sx(px) + vx * 0.5 * scale * 0.5} y2={sy(py)} stroke={X_COLOR} strokeWidth={3.5} markerEnd="url(#fd-arrow-x)" />
          <line x1={sx(px)} y1={sy(py)} x2={sx(px)} y2={sy(py) - vyNow * 0.5 * scale * 0.5} stroke={Y_COLOR} strokeWidth={3.5} markerEnd="url(#fd-arrow-y)" />
          <text x={64} y={36} className="ui fill-[var(--ink-soft)] text-[12.5px]">vₓ constant · v_y bends under gravity</text>
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={launch} labels={["launch", "pause"]} />
          <LabeledSlider label="speed" value={speed} min={8} max={34} step={0.2} onChange={setSpeed} fmt={v => `${v.toFixed(1)} m/s`} width={170} />
          <LabeledSlider label="angle" value={angle} min={8} max={80} step={1} onChange={setAngle} fmt={v => `${v.toFixed(0)}°`} />
          <LabeledSlider label="height" value={height} min={0} max={8} step={0.1} onChange={setHeight} fmt={v => `${v.toFixed(1)} m`} />
          <Readout label="range" value={`${range.toFixed(1)} m`} />
          <Readout label="peak" value={`${peak.toFixed(1)} m`} />
          <Readout label="flight" value={`${flightTime.toFixed(2)} s`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys1-projectile-target" met={hitTarget}>
        Land in the green target zone (range between <strong>42 m and 46 m</strong>) while keeping the
        peak height below <strong>18 m</strong> — a flat, fast shot rather than a high lob.
      </Challenge>
    </>
  );
}

/* ===================================================================== */
/* Widget 4 — relative motion: crossing a flowing river                  */
/* ===================================================================== */

function RiverCrossing() {
  const W = 760;
  const H = 360;
  const D = 10; // river width (m)
  const [vb, setVb] = useState(3.2); // boat speed relative to water
  const [headingDeg, setHeadingDeg] = useState(0); // + aims upstream (against current)
  const [u, setU] = useState(1.6); // current speed (downstream, +x)
  const [ts, setTs] = useState(0); // elapsed sim time
  const [running, setRunning] = useState(false);

  const phi = rad(headingDeg);
  // boat velocity relative to water: across = vb cos, upstream = vb sin
  const vAcross = vb * Math.cos(phi);
  const vGroundX = u - vb * Math.sin(phi); // net downstream drift
  const crossTime = vAcross > 1e-3 ? D / vAcross : Infinity;

  useRaf(running, dt => {
    setTs(prev => {
      const n = prev + dt;
      if (vAcross <= 1e-3 || n >= crossTime) {
        setRunning(false);
        return Math.min(n, crossTime);
      }
      return n;
    });
  });

  useEffect(() => { setRunning(false); setTs(0); }, [vb, headingDeg, u]);

  // world → screen. x downstream, y across (0 near bank, D far bank).
  const nearY = 312;
  const farY = 60;
  const cx = 380; // screen x for world x = 0 (the dock column)
  const pxPerM = (nearY - farY) / D; // vertical
  const wx = (x: number) => cx + x * pxPerM;
  const wy = (y: number) => nearY - y * pxPerM;

  const Y = Math.min(vAcross * ts, D);
  const X = vGroundX * ts;
  const driftFinal = vGroundX * crossTime; // where it lands at far bank

  // heading direction (where the bow points), for the boat glyph + still-water ghost
  const headDir = Math.atan2(vAcross, -vb * Math.sin(phi)); // screen-ish angle of water-relative velocity
  const groundAng = Math.atan2(vAcross, vGroundX);

  const landed = vAcross > 1e-3 && Y >= D - 1e-3;
  const dockMet = vb > u + 0.05 && Math.abs(driftFinal) < 0.3;

  // velocity triangle inset (top-right)
  const triO: [number, number] = [600, 90];
  const triScale = 14;

  function launch() {
    if (running) { setRunning(false); return; }
    if (Y >= D - 1e-3) setTs(0);
    setRunning(true);
  }

  return (
    <>
      <WidgetShell
        title="Crossing the river — velocity is relative to a frame"
        onReset={() => { setVb(3.2); setHeadingDeg(0); setU(1.6); setTs(0); setRunning(false); }}
        caption="The boat moves at its set speed relative to the water; the current adds on top. Solid purple is the path over the ground; the dashed grey line is where the bow points. Aim upstream to cancel the drift and reach the dock."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#eef4f7]">
          <ArrowDefs />
          {/* banks */}
          <rect x={0} y={farY - 28} width={W} height={28} fill="#cdbfa3" />
          <rect x={0} y={nearY} width={W} height={H - nearY} fill="#cdbfa3" />
          {/* current arrows */}
          {Array.from({ length: 6 }, (_, i) => {
            const yy = farY + 36 + i * ((nearY - farY - 60) / 5);
            const len = clamp(u * 16, 6, 70);
            return (
              <g key={i} opacity={0.5}>
                <line x1={90} y1={yy} x2={90 + len} y2={yy} stroke={BLUE} strokeWidth={2} markerEnd="url(#fd-arrow-b)" />
              </g>
            );
          })}
          <text x={100} y={farY + 20} className="ui fill-[#2c5a78] text-[11px]">current u = {u.toFixed(1)} m/s →</text>

          {/* dock target on far bank */}
          <line x1={cx} y1={nearY} x2={cx} y2={farY} stroke="#ffffff" strokeWidth={1} strokeDasharray="2 8" opacity={0.6} />
          <rect x={cx - 16} y={farY - 12} width={32} height={12} fill={GOLD} opacity={dockMet ? 0.95 : 0.55} />
          <text x={cx} y={farY - 16} textAnchor="middle" className="ui fill-[#8a6d12] text-[11px] font-semibold">dock</text>

          {/* ground track */}
          {ts > 0 && <line x1={wx(0)} y1={wy(0)} x2={wx(X)} y2={wy(Y)} stroke={V_COLOR} strokeWidth={3} />}
          {/* still-water heading ghost (where bow points) */}
          <line
            x1={wx(0)} y1={wy(0)}
            x2={wx(0) + Math.cos(headDir + 0) * 0}
            y2={wy(0)}
            stroke="none"
          />
          <line
            x1={wx(X)} y1={wy(Y)}
            x2={wx(X) - vb * Math.sin(phi) * pxPerM * 0.9}
            y2={wy(Y) - vAcross * pxPerM * 0.9}
            stroke="#8a8576" strokeWidth={2} strokeDasharray="5 5" markerEnd="url(#fd-arrow-g)"
          />

          {/* boat */}
          <g transform={`translate(${wx(X)}, ${wy(Y)}) rotate(${90 - deg(headDir)})`}>
            <path d="M 0 -12 L 7 8 L -7 8 Z" fill="#7a3b12" stroke="#fff" strokeWidth={1.5} />
          </g>
          {/* ground-velocity arrow from boat */}
          {ts > 0 && !landed && (
            <line
              x1={wx(X)} y1={wy(Y)}
              x2={wx(X) + Math.cos(groundAng) * 36}
              y2={wy(Y) - Math.sin(groundAng) * 36}
              stroke={V_COLOR} strokeWidth={3} markerEnd="url(#fd-arrow-v)"
            />
          )}

          {/* velocity triangle inset */}
          <g>
            {/* title floated above the highest vertex */}
            <text
              x={triO[0] + vGroundX * triScale / 2}
              y={Math.max(14, triO[1] - vAcross * triScale - 10)}
              textAnchor="middle"
              className="ui fill-[var(--ink-faint)] text-[10.5px]"
            >velocity triangle</text>
            {/* boat rel water (blue) */}
            <line x1={triO[0]} y1={triO[1]} x2={triO[0] - vb * Math.sin(phi) * triScale} y2={triO[1] - vAcross * triScale} stroke={BLUE} strokeWidth={2.5} markerEnd="url(#fd-arrow-b)" />
            <text
              x={triO[0] - vb * Math.sin(phi) * triScale / 2 - 6}
              y={triO[1] - vAcross * triScale / 2}
              textAnchor="end" dominantBaseline="middle"
              className="ui text-[9px]" fill={BLUE}
            >boat/water</text>
            {/* current (red) appended */}
            <line x1={triO[0] - vb * Math.sin(phi) * triScale} y1={triO[1] - vAcross * triScale} x2={triO[0] - vb * Math.sin(phi) * triScale + u * triScale} y2={triO[1] - vAcross * triScale} stroke={X_COLOR} strokeWidth={2.5} markerEnd="url(#fd-arrow-x)" />
            <text
              x={triO[0] - vb * Math.sin(phi) * triScale + u * triScale / 2}
              y={Math.max(12, triO[1] - vAcross * triScale - 7)}
              textAnchor="middle"
              className="ui text-[9px]" fill={X_COLOR}
            >current</text>
            {/* resultant ground (purple) */}
            <line x1={triO[0]} y1={triO[1]} x2={triO[0] + vGroundX * triScale} y2={triO[1] - vAcross * triScale} stroke={V_COLOR} strokeWidth={2.5} markerEnd="url(#fd-arrow-v)" />
            <text
              x={triO[0] + vGroundX * triScale / 2 + 6}
              y={triO[1] - vAcross * triScale / 2}
              textAnchor="start" dominantBaseline="middle"
              className="ui text-[9px]" fill={V_COLOR}
            >ground</text>
          </g>

          {landed && (
            <text x={wx(X)} y={farY - 30} textAnchor="middle" className="ui text-[12px] font-semibold" fill={dockMet ? "#2f9e44" : "#c2571c"}>
              {dockMet ? "reached the dock" : `drifted ${driftFinal.toFixed(1)} m`}
            </text>
          )}
        </svg>
        <ControlBar>
          <PlayButton running={running} onClick={launch} labels={["cross", "pause"]} />
          <LabeledSlider label="boat" value={vb} min={1} max={5} step={0.1} onChange={setVb} fmt={v => `${v.toFixed(1)} m/s`} color={BLUE} />
          <LabeledSlider label="heading" value={headingDeg} min={-60} max={60} step={1} onChange={setHeadingDeg} fmt={v => `${v.toFixed(0)}° up`} width={170} />
          <LabeledSlider label="current" value={u} min={0} max={4} step={0.1} onChange={setU} fmt={v => `${v.toFixed(1)} m/s`} color={X_COLOR} />
          <Readout label="drift at bank" value={`${driftFinal.toFixed(2)} m`} color={V_COLOR} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="phys1-relative-cross" met={dockMet}>
        Reach the gold dock straight across. With the current pushing downstream, point the bow{" "}
        <em>upstream</em> until the heading exactly cancels it: <M>{"v_b\\sin\\phi = u"}</M>, i.e.{" "}
        <M>{"\\phi = \\arcsin(u/v_b)"}</M>. (You need <M>{"v_b > u"}</M> for any heading to work.)
      </Challenge>
    </>
  );
}

/* ===================================================================== */
/* shared SVG bits                                                       */
/* ===================================================================== */

function PlotFrame({ x0, y0, w, h, label }: { x0: number; y0: number; w: number; h: number; label: string }) {
  return (
    <g>
      <line x1={x0} y1={y0} x2={x0} y2={y0 + h} stroke="#b6b2a4" strokeWidth={1.4} />
      <line x1={x0} y1={y0 + h} x2={x0 + w} y2={y0 + h} stroke="#b6b2a4" strokeWidth={1.4} />
      <text x={x0 + w - 4} y={y0 + 16} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[12px]">{label}</text>
    </g>
  );
}

function Grid({ width, height, origin, step }: { width: number; height: number; origin: [number, number]; step: number }) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let x = origin[0] % step; x <= width; x += step) xs.push(x);
  for (let y = origin[1] % step; y <= height; y += step) ys.push(y);
  return (
    <g>
      {xs.map(x => <line key={`x${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#ece8dd" />)}
      {ys.map(y => <line key={`y${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#ece8dd" />)}
      <line x1={0} y1={origin[1]} x2={width} y2={origin[1]} stroke="#8a8a9b" strokeWidth={1.5} />
      <line x1={origin[0]} y1={0} x2={origin[0]} y2={height} stroke="#8a8a9b" strokeWidth={1.5} />
    </g>
  );
}

function ArrowDefs() {
  const m = (id: string, color: string) => (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
    </marker>
  );
  return (
    <defs>
      {m("fd-arrow-x", X_COLOR)}
      {m("fd-arrow-y", Y_COLOR)}
      {m("fd-arrow-v", V_COLOR)}
      {m("fd-arrow-b", BLUE)}
      {m("fd-arrow-g", "#8a8576")}
    </defs>
  );
}
