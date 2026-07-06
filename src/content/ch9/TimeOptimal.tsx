import { useState, useEffect } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Scene3D } from "../../components/three/Scene3D";
import { Line } from "@react-three/drei";
import { type Vec3 } from "../../lib/math/vec";
import { planar2R_M, planar2R_c, planar2R_g } from "../ch8/dynamics";

// Arm dimensions and constants
const L1 = 1.0;
const L2 = 0.8;
const g = 9.81;
const N = 100;
const ds = 1.0 / N;

// Tuned parameters for optimal textbook-style curve representation
const mMasses: [number, number] = [0.5, 0.5];
const LLengths: [number, number] = [L1, L2];
const TORQUE_LIMIT = 18.0; // Max torque (Nm)

// Path configuration theta(s) and derivatives as defined in the screenshot tuning
function getPathTheta(s: number): [number, number] {
  const theta1 = 0.3 + 1.0 * s;
  const theta2 = 0.35 + 0.25 * Math.sin(s * Math.PI) + 0.85 * s;
  return [theta1, theta2];
}

function getPathThetaPrime(s: number): [number, number] {
  const dtheta1 = 1.0;
  const dtheta2 = 0.25 * Math.PI * Math.cos(s * Math.PI) + 0.85;
  return [dtheta1, dtheta2];
}

function getPathThetaDoublePrime(s: number): [number, number] {
  const ddtheta1 = 0.0;
  const ddtheta2 = -0.25 * Math.PI * Math.PI * Math.sin(s * Math.PI);
  return [ddtheta1, ddtheta2];
}

// Forward kinematics
function fk(theta1: number, theta2: number): [number, number] {
  const x = L1 * Math.cos(theta1) + L2 * Math.cos(theta1 + theta2);
  const y = L1 * Math.sin(theta1) + L2 * Math.sin(theta1 + theta2);
  return [x, y];
}

interface GridNode {
  m: [number, number];
  c: [number, number];
  g: [number, number];
  sdLim: number;
}

export default function TimeOptimal() {
  const [playing, setPlaying] = useState(false);
  const [, setSimTime] = useState(0.0);
  const [switchS, setSwitchS] = useState(0.50); // initial manual switching point

  // Parameters for rendering
  const [currentS, setCurrentS] = useState(0.0);
  const [currentSDot, setCurrentSDot] = useState(0.0);

  // Cache path derivatives and bounds along the grid to speed up calculations
  const [gridData, setGridData] = useState<GridNode[]>([]);

  // bounds function from screenshot: compact, robust, automatically handles mi signs
  const getBounds = (nd: GridNode, sd: number) => {
    const s2 = sd * sd;
    let L = -1e9;
    let U = 1e9;
    for (let i = 0; i < 2; i++) {
      const mi = nd.m[i];
      const ci = nd.c[i];
      const gi = nd.g[i];
      if (Math.abs(mi) < 1e-9) continue;
      const lo = (-TORQUE_LIMIT - ci * s2 - gi) / mi;
      const hi = (TORQUE_LIMIT - ci * s2 - gi) / mi;
      L = Math.max(L, Math.min(lo, hi));
      U = Math.min(U, Math.max(lo, hi));
    }
    return { L, U };
  };

  // Calculate grid bounds
  useEffect(() => {
    const data: GridNode[] = [];
    for (let i = 0; i <= N; i++) {
      const sVal = i / N;
      const th = getPathTheta(sVal);
      const thP = getPathThetaPrime(sVal);
      const thDP = getPathThetaDoublePrime(sVal);

      // Mass matrix M(theta)
      const M_mat = planar2R_M(th, mMasses, LLengths);
      const M11 = M_mat[0];
      const M12 = M_mat[1];
      const M21 = M_mat[2];
      const M22 = M_mat[3];

      // m(s) = M(theta) * theta'
      const m: [number, number] = [
        M11 * thP[0] + M12 * thP[1],
        M21 * thP[0] + M22 * thP[1]
      ];

      // c(s) = M(theta)*theta'' + planar2R_c(theta, theta')
      const c_cor = planar2R_c(th, thP, mMasses, LLengths);
      const c: [number, number] = [
        M11 * thDP[0] + M12 * thDP[1] + c_cor[0],
        M21 * thDP[0] + M22 * thDP[1] + c_cor[1]
      ];

      // g(s) = planar2R_g(theta)
      const gVec = planar2R_g(th, mMasses, LLengths, g);

      // Bisection to find sdLim
      let lo = 0;
      let hi = 25;
      const dummyNode = { m, c, g: gVec, sdLim: 0 };
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2;
        const b = getBounds(dummyNode, mid);
        if (b.L > b.U) {
          hi = mid;
        } else {
          lo = mid;
        }
      }

      data.push({ m, c, g: gVec, sdLim: lo });
    }
    setGridData(data);
  }, []);

  // Solve trajectories using single-pass forward solver with switch point ks
  const solveTrajectories = () => {
    if (gridData.length === 0) return { curve: [], feasible: false, T_total: 0, finalSd: 0 };

    const curve: [number, number][] = [[0, 0]];
    let v = 0.05; // small positive initial velocity to avoid boundary divisions
    let feasible = true;
    const ks = Math.round(switchS * N);

    for (let i = 0; i < N; i++) {
      const sd = Math.sqrt(Math.max(0, v));
      const b = getBounds(gridData[i], sd);
      if (b.L > b.U) {
        feasible = false;
        break;
      }

      const acc = i < ks ? b.U : b.L;
      v += 2 * acc * ds;
      
      const last = i === N - 1;
      if (v < -1e-9 && !last) {
        feasible = false;
        break;
      }

      const sn = Math.sqrt(Math.max(0, v));
      if (!last && sn > gridData[i + 1].sdLim + 1e-3) {
        feasible = false;
      }

      curve.push([(i + 1) / N, sn]);
    }

    if (curve.length <= N) {
      feasible = false;
    }

    const finalSd = curve.length ? curve[curve.length - 1][1] : 0;

    // Calculate total duration: T = sum( ds / s_dot )
    let T_total = 0;
    for (let i = 0; i < curve.length - 1; i++) {
      const sDotAvg = 0.5 * (curve[i][1] + curve[i + 1][1]);
      if (sDotAvg > 1e-3) {
        T_total += ds / sDotAvg;
      }
    }

    return { curve, feasible, T_total, finalSd };
  };

  const traj = solveTrajectories();

  // Find optimal switch automatically (search across grid steps to find minimum landing velocity)
  const solveOptimally = () => {
    if (gridData.length === 0) return;

    let bestK = -1;
    let bestLand = 999;

    for (let k = 0; k <= N; k++) {
      let v = 0.05;
      let ok = true;
      for (let i = 0; i < N; i++) {
        const sd = Math.sqrt(Math.max(0, v));
        const b = getBounds(gridData[i], sd);
        if (b.L > b.U) { ok = false; break; }
        const acc = i < k ? b.U : b.L;
        v += 2 * acc * ds;
        const last = i === N - 1;
        if (v < -1e-9 && !last) { ok = false; break; }
        const sn = Math.sqrt(Math.max(0, v));
        if (!last && sn > gridData[i + 1].sdLim + 1e-3) { ok = false; break; }
      }
      if (ok) {
        const finalV = Math.sqrt(Math.max(0, v));
        if (finalV < bestLand) {
          bestLand = finalV;
          bestK = k;
        }
      }
    }

    if (bestK !== -1) {
      setSwitchS(bestK / N);
    }
  };

  // Reset when settings change
  useEffect(() => {
    setSimTime(0.0);
    setCurrentS(0.0);
    setCurrentSDot(0.0);
    setPlaying(false);
  }, [switchS]);

  // Simulation physics update step
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.02, (now - last) / 1000);
      last = now;

      setSimTime(t => {
        const nextT = t + dt;
        
        let sAccum = 0.0;
        let tAccum = 0.0;

        for (let i = 0; i < traj.curve.length - 1; i++) {
          const sDotAvg = 0.5 * (traj.curve[i][1] + traj.curve[i + 1][1]);
          const dtStep = ds / sDotAvg;

          if (tAccum + dtStep >= nextT) {
            const ratio = (nextT - tAccum) / dtStep;
            sAccum = traj.curve[i][0] + ratio * ds;
            setCurrentS(sAccum);
            setCurrentSDot(sDotAvg);
            break;
          }
          tAccum += dtStep;
        }

        if (nextT >= traj.T_total) {
          setPlaying(false);
          setCurrentS(1.0);
          setCurrentSDot(0.0);
          return traj.T_total;
        }
        return nextT;
      });

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, traj.curve, traj.T_total]);

  // Render 3D arm coordinates
  const currentTheta = getPathTheta(currentS);
  const joint0: Vec3 = [0, 0, 0];
  const joint1: Vec3 = [L1 * Math.cos(currentTheta[0]), L1 * Math.sin(currentTheta[0]), 0];
  const hand = fk(currentTheta[0], currentTheta[1]);
  const joint2: Vec3 = [hand[0], hand[1], 0];

  // Traced path points for R3F
  const pathPts: Vec3[] = [];
  for (let i = 0; i <= N; i++) {
    const th = getPathTheta(i / N);
    const pos = fk(th[0], th[1]);
    pathPts.push([pos[0] - 0.5, pos[1] - 0.4, 0]);
  }

  // Generate SVG path for limit curve and actual trajectory
  const renderPhasePlaneSVG = () => {
    if (gridData.length === 0) return null;

    const width = 360;
    const height = 200;

    // Velocity limit goes up to 13.2 rad/s, let's scale Y by 15.0
    const scaleY = height / 15.0;

    // Shading inadmissible area (above limit curve)
    const shadePts: string[] = [];
    shadePts.push(`0,${height}`);
    for (let i = 0; i <= N; i++) {
      const xVal = (i / N) * width;
      const yVal = height - gridData[i].sdLim * scaleY;
      shadePts.push(`${xVal},${yVal}`);
    }
    shadePts.push(`${width},${height}`);
    shadePts.push(`0,${height}`);

    // Limit curve line
    const limitLinePts = gridData.map((gd, i) => {
      const xVal = (i / N) * width;
      const yVal = height - gd.sdLim * scaleY;
      return `${xVal},${yVal}`;
    });

    // Actual scaling path
    const actualPathPts = traj.curve.map(pt => {
      const xVal = pt[0] * width;
      const yVal = height - pt[1] * scaleY;
      return `${xVal},${yVal}`;
    });

    // Current state dot
    const curX = currentS * width;
    const curY = height - currentSDot * scaleY;

    // Color indicating state: Green = lands at rest, Orange = overshoots, Red = stalls/infeasible
    const isLanded = traj.feasible && traj.finalSd < 0.15;
    let pathColor = "#d9483f"; // Red (Stall)
    if (traj.feasible) {
      pathColor = isLanded ? "#51cf66" : "#f59f00"; // Green (Landed) vs Orange (Overshoot)
    }

    return (
      <svg width={width} height={height} className="border border-gray-300 rounded bg-[#fdfcfb]">
        {/* Grids */}
        {Array.from({ length: 6 }, (_, i) => (
          <line
            key={i}
            x1={0}
            y1={(i / 5) * height}
            x2={width}
            y2={(i / 5) * height}
            stroke="#f0ece4"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line
            key={i}
            x1={(i / 5) * width}
            y1={0}
            x2={(i / 5) * width}
            y2={height}
            stroke="#f0ece4"
            strokeWidth={1}
          />
        ))}

        {/* Inadmissible region shading */}
        <polygon points={shadePts.join(" ")} fill="#e9ecef" opacity={0.7} />

        {/* Velocity Limit Curve */}
        <path d={`M ${limitLinePts.join(" L ")}`} fill="none" stroke="#adb5bd" strokeWidth={2} strokeDasharray="3 3" />

        {/* Trajectory */}
        {actualPathPts.length > 0 && (
          <path
            d={`M ${actualPathPts.join(" L ")}`}
            fill="none"
            stroke={pathColor}
            strokeWidth={2.5}
          />
        )}

        {/* Current State Marker */}
        {playing && <circle cx={curX} cy={curY} r={5} fill="#FF6B6B" />}

        {/* Switch Line */}
        <line
          x1={switchS * width}
          y1={0}
          x2={switchS * width}
          y2={height}
          stroke="#3b6fd4"
          strokeWidth={1.5}
          strokeDasharray="2 2"
        />

        {/* Label readouts */}
        <text x={10} y={20} fill="#adb5bd" fontSize={9} fontWeight="bold">
          VELOCITY LIMIT CURVE (L=U)
        </text>
        <text x={switchS * width + 5} y={15} fill="#3b6fd4" fontSize={9} fontWeight="bold">
          s* = {switchS.toFixed(2)}
        </text>
      </svg>
    );
  };

  // Challenge condition: must be feasible AND land cleanly at rest (final velocity < 0.15)
  const isCorrect = traj.feasible && traj.finalSd < 0.15;

  return (
    <div>
      <PageHeader
        chapter="Chapter 9"
        section="Trajectory Generation"
        title="Time-Optimal Time Scaling"
        lede="The path is fixed; only the speed along it is yours to choose. To traverse it in minimum time, floor the accelerator, then floor the brakes — the entire art is knowing when to switch."
      />

      <p>
        Here is the whole problem in one drive. You must take a car down a fixed road as fast as
        possible, starting and ending at rest. Your engine has a maximum push and your brakes a
        maximum grip, and somewhere along the road there's a curve you cannot take at full speed.
        Intuition says: floor the gas as long as you dare, then slam the brakes so you arrive
        exactly at rest. Brake too early and you crawl to the finish; too late and you fly past it
        (or off the curve). Minimum time comes from maximum effort with <em>one perfectly timed
        switch</em> — engineers call this a <strong>bang-bang</strong> strategy, because the command
        slams from one extreme to the other.
      </p>

      <H2>Warm-up: one car, one road, one switch</H2>
      <p>
        To see the structure, we draw the drive in the <strong>phase plane</strong>: a map whose
        horizontal axis is <em>where you are</em> along the road (<M>{"s"}</M>, from 0 to 1) and
        whose vertical axis is <em>how fast you are going</em> (<M>{"\\dot s"}</M>). Any way of
        driving the road is a curve on this map, from the bottom-left corner (start, at rest) to
        the bottom-right (finish, at rest). The dangerous curve in the road appears as a grey
        ceiling — the <strong>velocity limit curve</strong> — dipping down where the road demands
        slowness. Touch the ceiling and you have left the road.
      </p>
      <p>
        <strong>Try this:</strong> in this toy the brakes are 1.5× stronger than the engine, so the
        switch does <em>not</em> belong at the halfway point — you can afford to accelerate longer
        than you brake. Slide <M>{"s^*"}</M> and watch the three failure/success modes: too early
        (the car stalls short of the finish), too late (it crosses the finish still moving — or
        clips the grey ceiling), and just right (a clean tent-shaped curve landing at rest).
      </p>

      <CarOnHillWidget />

      <H2>Now the real thing: a robot arm on its path</H2>
      <p>
        A robot following a fixed path is exactly the same problem wearing more notation. The
        "road" is the geometric path <M>{"\\theta(s)"}</M> through joint space; the "engine and
        brakes" are the joint torque limits. The complication is that a robot's effective strength
        changes with its shape — its full dynamics are
      </p>
      <Eq>{"M(\\theta)\\ddot{\\theta} + c(\\theta, \\dot{\\theta}) + g(\\theta) = \\tau."}</Eq>

      <p>
        But because the path is fixed, the only freedom left is the single number <M>{"s(t)"}</M> —
        how far along we are. Substituting <M>{"\\theta(s)"}</M> into the dynamics condenses them to
        one vector equation in that one variable:
      </p>
      <Eq>{"m(s)\\ddot{s} + c(s)\\dot{s}^2 + g(s) = \\tau."}</Eq>
      <p>
        Read it back: <M>{"m(s)"}</M> is how heavy the robot feels against progress along the path
        at this point, <M>{"c(s)\\dot s^2"}</M> is the velocity-dependent (centripetal/Coriolis)
        load, and <M>{"g(s)"}</M> is gravity's toll. Pushing each joint torque to its limit and
        solving for <M>{"\\ddot s"}</M> gives, at every state, a strongest allowed push{" "}
        <M>{"U(s,\\dot s)"}</M> and a hardest allowed braking <M>{"L(s,\\dot s)"}</M>:{" "}
        <M>{"L(s, \\dot{s}) \\le \\ddot{s} \\le U(s, \\dot{s})"}</M>. Go fast enough and the two
        collide (<M>{"L > U"}</M>) — no torque within limits can hold the arm on the path. Those
        states are the region above the <strong>velocity limit curve</strong>, the robot's version
        of the toy's grey ceiling, now bumpy because <M>{"m, c, g"}</M> all change along the path.
      </p>
      <p>
        <strong>Try this:</strong> drag <M>{"s^*"}</M> around and reproduce the same three regimes
        you saw in the warm-up — stall (red), overshoot (orange), clean landing (green). Then press{" "}
        <em>Auto-Solve Optimally</em> and note where the optimizer puts the switch relative to the
        dip in the limit curve.
      </p>

      <WidgetShell
        title="Phase-Plane Bang-Bang Trajectory Solver"
        onReset={() => {
          setSwitchS(0.50);
          setPlaying(false);
          setSimTime(0.0);
          setCurrentS(0.0);
          setCurrentSDot(0.0);
        }}
        caption={
          <>
            The dashed curve in the phase plane represents the velocity limit curve (shaded area is inadmissible). Adjust the switching point <M>{"s^*"}</M> to achieve minimum time without crossing the boundary.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-3">
              {renderPhasePlaneSVG()}
              
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                2R Robotic Arm tracing the path (s = {currentS.toFixed(2)})
              </div>
              
              <Scene3D height={180} camera={[0, 0, 2.2]}>
                {/* Visual Path trace */}
                <Line points={pathPts} color="#ced4da" lineWidth={1.5} />

                {/* Arm Render */}
                <Line points={[joint0, joint1]} color="#3b6fd4" lineWidth={5.0} />
                <Line points={[joint1, joint2]} color="#c2571c" lineWidth={4.5} />

                {/* Joints */}
                <mesh position={joint0}>
                  <sphereGeometry args={[0.05, 12, 12]} />
                  <meshStandardMaterial color="#212529" />
                </mesh>
                <mesh position={joint1}>
                  <sphereGeometry args={[0.04, 12, 12]} />
                  <meshStandardMaterial color="#212529" />
                </mesh>
                <mesh position={joint2}>
                  <sphereGeometry args={[0.03, 12, 12]} />
                  <meshStandardMaterial color="#51cf66" />
                </mesh>
              </Scene3D>
            </div>
          </div>

          <div className="w-full md:w-[280px] shrink-0 flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <WidgetButton disabled={!traj.feasible || isNaN(traj.T_total)} active={playing} onClick={() => setPlaying(!playing)}>
                  {playing ? "Pause" : "Play"}
                </WidgetButton>
                <WidgetButton
                  onClick={() => {
                    setSimTime(0.0);
                    setPlaying(false);
                    setCurrentS(0.0);
                    setCurrentSDot(0.0);
                  }}
                >
                  Reset
                </WidgetButton>
              </div>

              <div className="border-t border-[var(--rule)] pt-3">
                <WidgetButton onClick={solveOptimally}>Auto-Solve Optimally</WidgetButton>
              </div>

              <div className="border-t border-[var(--rule)] pt-3 flex flex-col gap-3">
                <LabeledSlider
                  label="s*"
                  value={switchS}
                  min={0.10}
                  max={0.90}
                  step={0.01}
                  onChange={setSwitchS}
                  fmt={v => v.toFixed(2)}
                  width={140}
                />
              </div>

              <div className="border-t border-[var(--rule)] pt-3 flex flex-col gap-1.5 text-[12px]">
                <Readout label="Path parameter s" value={currentS.toFixed(2)} />
                <Readout label="Velocity s_dot" value={`${currentSDot.toFixed(2)} rad/s`} />
                <Readout
                  label="Trajectory State"
                  value={!traj.feasible ? "Stalls (Red)" : (isCorrect ? "Lands at Rest (Green)" : "Overshoots (Orange)")}
                  color={!traj.feasible ? "var(--bad)" : (isCorrect ? "var(--good)" : "#f59f00")}
                />
                <Readout label="Landing Velocity" value={`${traj.finalSd.toFixed(2)} rad/s`} />
                <Readout label="Total Duration T" value={traj.feasible ? `${traj.T_total.toFixed(2)} s` : "N/A"} />
              </div>
            </div>
          </div>
        </div>
      </WidgetShell>

      <Challenge id="ch9-time-optimal-scaling" met={isCorrect}>
        Adjust the switching parameter <M>{"s^*"}</M> to achieve a perfect rest-to-rest landing (the trajectory path turns green, with a landing velocity <M>{"\\le 0.15\\,\\text{rad/s}"}</M>).
      </Challenge>

      <KeyIdea>
        Time-optimal time scaling is a bang-bang trajectory: the robot operates at maximum acceleration until a switching point, and then switches to maximum deceleration. Switching too early causes the robot to stall, while switching too late leads to overshooting the target velocity.
      </KeyIdea>

      <Aside>
        On rougher paths the optimal solution can need <em>several</em> switches, and can even ride
        along the velocity limit curve for a stretch — imagine a road with two tight curves in a
        row. The one-switch picture on this page is the atom from which those solutions are built.
      </Aside>

      <Quiz
        challengeId="ch9-timeopt-quiz"
        goal={<>Confirm the phase-plane picture.</>}
        questions={[
          {
            prompt: <>In the phase plane of this page, what does a single point represent?</>,
            options: [
              { label: <>A state: where along the path the robot is, and how fast it is moving along it</>, correct: true },
              { label: <>A joint angle pair (θ₁, θ₂)</> },
              { label: <>A position of the end-effector in space</> },
            ],
            explain: <>The whole trick of time scaling is collapsing an n-joint robot to two numbers, s and ṡ, because the path pins everything else down.</>,
          },
          {
            prompt: <>Why is the region above the velocity limit curve forbidden?</>,
            options: [
              { label: <>Moving that fast, no torque within the motor limits can keep the robot on the path</>, correct: true },
              { label: <>The robot's software refuses to go faster</> },
              { label: <>The end-effector would leave the workspace</> },
            ],
            explain: <>Above the curve the required-torque interval is empty: L &gt; U. It's not a rule, it's physics — like a car that simply cannot hold a hairpin at 200 km/h.</>,
          },
          {
            prompt: <>You switch from full acceleration to full braking slightly too <em>early</em>. What happens?</>,
            options: [
              { label: <>The robot comes to rest before the end of the path — it stalls short</>, correct: true },
              { label: <>It overshoots the goal at nonzero speed</> },
              { label: <>It violates the velocity limit curve</> },
            ],
            explain: <>Braking removes speed at a fixed maximum rate; start too soon and you run out of speed before you run out of path. Too late gives the opposite failure.</>,
          },
        ]}
      />

      <BookRef>Modern Robotics §9.4 — Time-Optimal Time Scaling.</BookRef>
    </div>
  );
}

/* =============== warm-up: 1-DOF car on a hilly road =============== */

const CAR_A = 2.0; // engine accel limit
const CAR_B = 3.0; // brake decel limit (stronger: optimal switch at B/(A+B) = 0.6)
const carVLim = (s: number) => 2.6 - 1.4 * Math.exp(-((s - 0.8) ** 2) / 0.012);

function CarOnHillWidget() {
  const [sw, setSw] = useState(0.4);

  // integrate the bang-bang profile: v dv = a ds  ⇒  v² accumulates 2a·ds
  const NSTEP = 400;
  const pts: [number, number][] = [[0, 0]];
  let v2 = 0;
  let stalledAt: number | null = null;
  let hitLimit = false;
  for (let i = 0; i < NSTEP; i++) {
    const s = (i + 0.5) / NSTEP;
    const a = s < sw ? CAR_A : -CAR_B;
    v2 += (2 * a) / NSTEP;
    if (v2 <= 0 && s < 1 - 1e-9) { stalledAt = s; v2 = 0; break; }
    const v = Math.sqrt(Math.max(0, v2));
    if (v > carVLim((i + 1) / NSTEP)) hitLimit = true;
    pts.push([(i + 1) / NSTEP, v]);
  }
  const vEnd = stalledAt === null ? Math.sqrt(Math.max(0, v2)) : 0;
  const landed = stalledAt === null && !hitLimit && vEnd < 0.12;
  const status = hitLimit ? "leaves the road!" : stalledAt !== null ? `stalls at s = ${stalledAt.toFixed(2)}` : landed ? "clean landing at rest" : `crosses finish at ${vEnd.toFixed(2)}`;
  const color = landed ? "#2f9e44" : hitLimit || stalledAt !== null ? "#d9483f" : "#f59f00";

  // drawing
  const W = 620, H = 300, padL = 46, padB = 34, padT = 16, padR = 14;
  const sx = (s: number) => padL + s * (W - padL - padR);
  const sy = (v: number) => H - padB - (v / 3.0) * (H - padB - padT);
  const limPts = Array.from({ length: 121 }, (_, i) => {
    const s = i / 120;
    return `${sx(s).toFixed(1)},${sy(carVLim(s)).toFixed(1)}`;
  });
  const shade = `${sx(0)},${sy(3)} ${limPts.join(" ")} ${sx(1)},${sy(3)}`;
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`).join(" ");

  return (
    <>
      <WidgetShell
        title="One switch, three outcomes — the car in its phase plane"
        onReset={() => setSw(0.4)}
        caption="Horizontal: position along the road. Vertical: speed. Grey region: speeds the road cannot tolerate (the velocity limit curve is its lower edge). The car accelerates flat-out until s*, then brakes flat-out. Land in the bottom-right corner."
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7]">
          {/* axes */}
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#b6b2a4" strokeWidth={1.4} />
          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#b6b2a4" strokeWidth={1.4} />
          {[0, 0.25, 0.5, 0.75, 1].map(s => (
            <g key={s}>
              <line x1={sx(s)} y1={H - padB} x2={sx(s)} y2={H - padB + 5} stroke="#b6b2a4" />
              <text x={sx(s)} y={H - padB + 18} textAnchor="middle" className="ui fill-[var(--ink-faint)] text-[10px]">{s}</text>
            </g>
          ))}
          <text x={W - padR} y={H - 6} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[11px]">position s →</text>
          <text x={padL - 8} y={sy(1)} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10px]">1</text>
          <text x={padL - 8} y={sy(2)} textAnchor="end" className="ui fill-[var(--ink-faint)] text-[10px]">2</text>
          <text x={14} y={padT + 10} className="ui fill-[var(--ink-faint)] text-[11px]">ṡ</text>
          {/* forbidden region */}
          <polygon points={shade} fill="#e9ecef" opacity={0.8} />
          <polyline points={limPts.join(" ")} fill="none" stroke="#adb5bd" strokeWidth={2} strokeDasharray="4 4" />
          <text x={sx(0.8)} y={sy(carVLim(0.8)) - 8} textAnchor="middle" className="ui text-[10px] font-semibold fill-[#868e96]">tight curve — slow down</text>
          {/* switch line */}
          <line x1={sx(sw)} y1={padT} x2={sx(sw)} y2={H - padB} stroke="#3b6fd4" strokeWidth={1.5} strokeDasharray="3 4" />
          <text x={sx(sw) + 5} y={padT + 12} className="ui text-[10px] font-semibold" fill="#3b6fd4">s* = {sw.toFixed(2)}</text>
          <text x={sx(Math.max(0.03, sw / 2))} y={H - padB - 8} textAnchor="middle" className="ui text-[10px]" fill="#2f9e44">gas ⟶</text>
          <text x={sx(Math.min(0.97, sw + (1 - sw) / 2))} y={H - padB - 8} textAnchor="middle" className="ui text-[10px]" fill="#d9483f">⟵ brake</text>
          {/* trajectory */}
          <path d={path} fill="none" stroke={color} strokeWidth={3} />
          {/* start & goal markers */}
          <circle cx={sx(0)} cy={sy(0)} r={5} fill="#33343d" />
          <circle cx={sx(1)} cy={sy(0)} r={6.5} fill="none" stroke="#2f9e44" strokeWidth={2.5} />
        </svg>
        <ControlBar>
          <LabeledSlider label="switch s*" value={sw} min={0.1} max={0.9} step={0.01} onChange={setSw} fmt={v => v.toFixed(2)} width={220} />
          <Readout label="outcome" value={status} color={color} />
          <Readout label="engine / brake" value={`${CAR_A.toFixed(1)} / ${CAR_B.toFixed(1)}`} />
        </ControlBar>
      </WidgetShell>
      <Challenge id="ch9-car-switch" met={landed}>
        Land the car exactly at rest on the finish line without touching the grey ceiling. The
        brakes are 1.5× stronger than the engine, so the answer is <em>not</em> halfway — you can
        afford to keep accelerating until braking distance just fits in what's left:{" "}
        <M>{"s^* = B/(A+B)"}</M>.
      </Challenge>
    </>
  );
}
