import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";

// ---- single-joint plant (Modern Robotics §11.4.1) -------------------------
// tau = I*thetaddot + m g r cos(theta) + b*thetadot
// We control toward a constant setpoint theta_d with a PID controller.
const I = 0.5; // link inertia about the axis  (kg m^2)
const MASS = 1.0; // link mass (kg)
const R = 0.15; // distance to center of mass (m)
const B = 0.1; // viscous friction (N m s / rad)
const G = 9.81; // gravity (m/s^2)

const GRAV = MASS * G * R; // peak gravity torque magnitude

const DT = 0.002; // integration step (s)
const STEPS_PER_FRAME = 8; // ~ 60 fps * 8 * 2ms ≈ near real-time
const WINDOW = 6.0; // plot window (s)

const GOOD = "var(--good)";
const BAD = "var(--bad)";
const LINK_COLOR = "#3b6fd4";
const PLOT_COLOR = "#d9483f";

interface Sample {
  t: number;
  e: number; // error theta_d - theta
}

export default function PidControl() {
  const [kp, setKp] = useState(8);
  const [ki, setKi] = useState(0);
  const [kd, setKd] = useState(2);
  const [running, setRunning] = useState(false);

  // setpoint and live plant state
  const [thetaD, setThetaD] = useState(0.6);
  const thetaDRef = useRef(thetaD);
  thetaDRef.current = thetaD;

  // live state mirrored to React for rendering
  const [theta, setTheta] = useState(0);
  const stateRef = useRef({ theta: 0, thetadot: 0, eint: 0, t: 0 });
  const histRef = useRef<Sample[]>([{ t: 0, e: thetaD - 0 }]);
  const [, force] = useState(0); // re-render tick

  // metrics derived from the live history
  const [ess, setEss] = useState(Math.abs(thetaD));
  const [overshoot, setOvershoot] = useState(0);

  const gainsRef = useRef({ kp, ki, kd });
  gainsRef.current = { kp, ki, kd };

  const reset = useCallback((newSetpoint?: number) => {
    const sp = newSetpoint ?? thetaDRef.current;
    stateRef.current = { theta: 0, thetadot: 0, eint: 0, t: 0 };
    histRef.current = [{ t: 0, e: sp - 0 }];
    setTheta(0);
    setEss(Math.abs(sp));
    setOvershoot(0);
    force(n => n + 1);
  }, []);

  // integration loop (semi-implicit Euler)
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const frame = () => {
      const st = stateRef.current;
      const { kp: KP, ki: KI, kd: KD } = gainsRef.current;
      const sp = thetaDRef.current;
      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        const e = sp - st.theta;
        const edot = 0 - st.thetadot; // thetadot_d = 0 (setpoint control)
        st.eint += e * DT;
        const tau = KP * e + KI * st.eint + KD * edot;
        // plant: I*thetaddot = tau - g(theta) - b*thetadot
        const grav = GRAV * Math.cos(st.theta);
        const thetaddot = (tau - grav - B * st.thetadot) / I;
        st.thetadot += thetaddot * DT; // semi-implicit
        st.theta += st.thetadot * DT;
        st.t += DT;
      }
      const e = sp - st.theta;
      const hist = histRef.current;
      hist.push({ t: st.t, e });
      while (hist.length > 2 && hist[0].t < st.t - WINDOW) hist.shift();

      setTheta(st.theta);

      // ---- honest metrics over the recent response -----------------------
      // steady-state error: |e| once motion has nearly stopped
      setEss(Math.abs(e));
      // overshoot: how far past the setpoint we went, as a % of the step.
      // step size = sp - theta(0) = sp (we always start at theta=0).
      const step = Math.abs(sp) > 1e-6 ? Math.abs(sp) : 1;
      // most-negative error means we overshot past the setpoint (same sign as step)
      let peakPast = 0;
      for (const s of hist) {
        // overshoot is error of opposite sign to the initial step
        const past = -Math.sign(sp) * s.e;
        if (past > peakPast) peakPast = past;
      }
      setOvershoot((peakPast / step) * 100);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  // challenge predicate: settled to the setpoint, low overshoot, near-zero velocity.
  const settled = Math.abs(stateRef.current.thetadot) < 0.05;
  const challengeMet =
    running && settled && ess < 0.02 && overshoot < 5 && Math.abs(thetaD) > 0.1;

  // ---- pendulum geometry (2D, hanging-ish revolute joint) -----------------
  const PIVX = 120,
    PIVY = 70,
    LEN = 90;
  const tipX = PIVX + LEN * Math.cos(theta);
  const tipY = PIVY - LEN * Math.sin(theta);
  const tgtX = PIVX + LEN * Math.cos(thetaD);
  const tgtY = PIVY - LEN * Math.sin(thetaD);

  return (
    <div>
      <PageHeader
        chapter="Chapter 11"
        section="Robot Control"
        title="Joint-Space PID Control"
        lede="A feedback controller watches the joint error and pushes back. Proportional gain is a virtual spring, derivative a virtual damper, and integral the patient memory that finally cancels gravity's pull."
      />

      <p>
        Imagine you are handed a joystick wired straight to a motor's torque, and given one job:
        swing the link to a marked angle and hold it there. All you can see is the{" "}
        <strong>error</strong> — how far the link still is from the target. What strategy do you
        play? Probably three instincts at once: <em>push harder the farther away you are</em>;{" "}
        <em>ease off when you're closing in fast</em>, so you don't sail past; and{" "}
        <em>if you've been stuck a little short for a while, lean in a bit extra</em> until the
        link finally sits on the mark. Those three instincts, written as math, are P, D, and I —
        the entire controller on this page.
      </p>
      <p>
        First, the arm you're driving. It is a single revolute joint carrying a link in gravity:
        with motor torque <M>{"\\tau"}</M>, the dynamics are the familiar pendulum plus viscous
        friction (Modern Robotics Eq. 11.21):
      </p>
      <Eq>{"\\tau = I\\,\\ddot\\theta + mgr\\cos\\theta + b\\,\\dot\\theta."}</Eq>
      <p>
        Read it back: whatever torque you supply is spent three ways — accelerating the link's
        inertia <M>{"I"}</M>, fighting the gravity torque <M>{"mgr\\cos\\theta"}</M> (largest when
        the link is horizontal, zero when it points straight up or down), and overcoming friction
        that grows with speed. Note the sting in the middle term: to hold still anywhere but
        hanging straight down, the motor must keep paying the gravity torque <em>forever</em>.
      </p>
      <p>
        The controller's job is to drive the actual angle <M>{"\\theta"}</M> to a desired
        setpoint <M>{"\\theta_d"}</M>. We define the error{" "}
        <M>{"\\theta_e = \\theta_d - \\theta"}</M> and feed it through a{" "}
        <strong>proportional–integral–derivative</strong> (PID) law:
      </p>
      <Eq>{"\\tau = K_p\\,\\theta_e + K_i\\!\\int_0^t \\theta_e\\,dt + K_d\\,\\dot\\theta_e."}</Eq>
      <p>
        Read it back term by term. The proportional gain <M>{"K_p"}</M> multiplies the error
        itself: a virtual spring pulling toward the goal, harder the farther away — that is
        "push harder the farther you are." The derivative gain <M>{"K_d"}</M> multiplies the
        error's <em>rate of change</em>: a virtual damper that resists fast approach — "ease off
        when closing quickly." And the integral gain <M>{"K_i"}</M> multiplies the error's
        running total over time: a patient memory that keeps growing while the link sits short,
        until it supplies the standing torque that holds the link against gravity — "lean in if
        you've been short for a while."
      </p>

      <H2>Why P-only control leaves an offset</H2>
      <p>
        With <M>{"K_i = 0"}</M> (PD control), the link comes to rest where the spring torque
        exactly balances gravity: <M>{"K_p\\,\\theta_e = mgr\\cos\\theta"}</M>. That requires a{" "}
        <em>nonzero</em> error — a steady-state offset. Turn <M>{"K_p"}</M> up and the offset shrinks,
        but it never vanishes. The cure is integral action: even with zero position error, the
        integral term keeps a standing torque alive, so the joint can settle exactly on{" "}
        <M>{"\\theta_d"}</M>.
      </p>

      <H2>Tuning the transient</H2>
      <p>
        Here is the payoff of the spring-and-damper picture: on a horizontal joint (where gravity
        drops out), PD control turns the error into <em>exactly</em> the mass–spring–damper
        system you met in physics. <M>{"K_p"}</M> plays the spring constant and{" "}
        <M>{"b + K_d"}</M> plays the damping. Two numbers summarize any such system: its{" "}
        <strong>natural frequency</strong> — how fast it wants to oscillate, written{" "}
        <M>{"\\omega_n"}</M> — and its <strong>damping ratio</strong> — how thoroughly the wobble
        is smothered, written <M>{"\\zeta"}</M>, with <M>{"\\zeta = 1"}</M> the sweet spot: the
        fastest landing that never bounces. For PD setpoint control the error obeys the standard
        second-order form{" "}
        <M>{"\\ddot\\theta_e + 2\\zeta\\omega_n\\dot\\theta_e + \\omega_n^2\\theta_e = 0"}</M> with
      </p>
      <Eq>{"\\omega_n = \\sqrt{K_p/I},\\qquad \\zeta = \\frac{b + K_d}{2\\sqrt{K_p\\,I}}."}</Eq>
      <p>
        Read it back: a stiffer spring (bigger <M>{"K_p"}</M>) makes the joint snappier but, with
        the damping unchanged, <em>less</em> damped — <M>{"K_p"}</M> sits in the denominator of{" "}
        <M>{"\\zeta"}</M>. Too little <M>{"K_d"}</M> (<M>{"\\zeta < 1"}</M>) and the response
        rings past the target and back; at <M>{"\\zeta = 1"}</M> it is critically damped —
        fastest with no overshoot.
      </p>
      <Aside>
        If damped oscillators are new (or rusty), the{" "}
        <a href="#/phys6-oscillations">Physics 6 · Oscillations module</a> shows underdamped,
        critically damped, and overdamped responses side by side, with the same{" "}
        <M>{"\\omega_n"}</M> and <M>{"\\zeta"}</M> vocabulary. This page is the same mathematics
        wearing a robot suit.
      </Aside>

      <p>
        <strong>Try this:</strong> press Run with the defaults (<M>{"K_i = 0"}</M>) and watch the
        link stall just below the target — the steady-state <M>{"|e|"}</M> readout stays red no
        matter how long you wait, because the spring must stay stretched to balance gravity. Now
        raise <M>{"K_i"}</M> to about 10 and watch the link creep the rest of the way onto the
        goal as the integral accumulates. Finally drop <M>{"K_d"}</M> to 0 and hit Restart: the
        link rings back and forth past the target — check that the ζ readout has fallen well
        below 1.
      </p>

      <WidgetShell
        title="Close the loop on one joint"
        onReset={() => {
          setKp(8);
          setKi(0);
          setKd(2);
          setThetaD(0.6);
          setRunning(false);
          reset(0.6);
        }}
        caption={
          <>
            The <span style={{ color: LINK_COLOR }}>blue link</span> is the live joint; the faint
            gray link marks the <strong>setpoint</strong> <M>{"\\theta_d"}</M>. Start with{" "}
            <M>{"K_i = 0"}</M> and watch the link stall short of the target — gravity wins. Raise{" "}
            <M>{"K_i"}</M> and it creeps onto the goal. Lower <M>{"K_d"}</M> to make it ring.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <svg width="100%" viewBox="0 0 240 200" className="bg-[#fcfbf9] border border-gray-200 rounded">
              {/* ground / pivot */}
              <line x1={40} y1={PIVY} x2={200} y2={PIVY} stroke="#e7e4da" strokeWidth={1} />
              {/* setpoint ghost link */}
              <line x1={PIVX} y1={PIVY} x2={tgtX} y2={tgtY} stroke="#bdbab2" strokeWidth={4} strokeLinecap="round" />
              <circle cx={tgtX} cy={tgtY} r={6} fill="none" stroke="#bdbab2" strokeWidth={2} />
              {/* live link */}
              <line x1={PIVX} y1={PIVY} x2={tipX} y2={tipY} stroke={LINK_COLOR} strokeWidth={6} strokeLinecap="round" />
              <circle cx={tipX} cy={tipY} r={8} fill={LINK_COLOR} />
              {/* gravity arrow */}
              <line x1={tipX} y1={tipY} x2={tipX} y2={tipY + 22} stroke="#9a958a" strokeWidth={1.5} markerEnd="url(#pid-grav)" />
              <defs>
                <marker id="pid-grav" markerWidth="8" markerHeight="8" refX="4" refY="6" orient="auto">
                  <path d="M0,0 L4,6 L8,0 Z" fill="#9a958a" />
                </marker>
              </defs>
              <circle cx={PIVX} cy={PIVY} r={5} fill="#33343d" />
            </svg>

            <ErrorPlot hist={histRef.current} tNow={stateRef.current.t} />
          </div>

          <div className="w-full md:w-[260px] shrink-0 flex flex-col gap-3">
            <div className="flex gap-2">
              <WidgetButton active={running} onClick={() => setRunning(r => !r)}>
                {running ? "Pause" : "Run"}
              </WidgetButton>
              <WidgetButton onClick={() => { setRunning(true); reset(); }}>Restart</WidgetButton>
            </div>

            <div className="flex gap-2">
              <WidgetButton onClick={() => { setThetaD(0.6); setRunning(true); reset(0.6); }}>Step → 34°</WidgetButton>
              <WidgetButton onClick={() => { setThetaD(1.2); setRunning(true); reset(1.2); }}>Step → 69°</WidgetButton>
            </div>

            <div className="border-t border-[var(--rule)] pt-2 flex flex-col gap-2">
              <LabeledSlider label={<M>{"K_p"}</M>} value={kp} min={0} max={40} step={0.5} onChange={setKp} fmt={v => v.toFixed(1)} width={120} />
              <LabeledSlider label={<M>{"K_i"}</M>} value={ki} min={0} max={30} step={0.5} onChange={setKi} fmt={v => v.toFixed(1)} width={120} />
              <LabeledSlider label={<M>{"K_d"}</M>} value={kd} min={0} max={10} step={0.1} onChange={setKd} fmt={v => v.toFixed(1)} width={120} />
              <LabeledSlider label={<M>{"\\theta_d"}</M>} value={thetaD} min={-1.4} max={1.4} step={0.05} onChange={v => { setThetaD(v); reset(v); }} fmt={v => `${(v * 180 / Math.PI).toFixed(0)}°`} width={120} />
            </div>

            <div className="border-t border-[var(--rule)] pt-2 flex flex-col gap-1.5">
              <Readout label="θ" value={`${(theta * 180 / Math.PI).toFixed(1)}°`} />
              <Readout label="steady-state |e|" value={`${(ess * 180 / Math.PI).toFixed(2)}°`} color={ess < 0.02 ? GOOD : BAD} />
              <Readout label="overshoot" value={`${overshoot.toFixed(1)}%`} color={overshoot < 5 ? GOOD : BAD} />
              <Readout label="ζ (PD est.)" value={((B + kd) / (2 * Math.sqrt(Math.max(kp, 1e-6) * I))).toFixed(2)} />
            </div>
          </div>
        </div>
      </WidgetShell>

      <Aside>
        Numbers: the simulated link has <M>{"I = 0.5\\,\\text{kg m}^2"}</M>,{" "}
        <M>{"mgr \\approx 1.47\\,\\text{N m}"}</M> of peak gravity torque, and{" "}
        <M>{"b = 0.1"}</M>. The plant ODE is integrated with semi-implicit Euler at{" "}
        <M>{"\\Delta t = 2\\,\\text{ms}"}</M>; every reading below the canvas is measured from the
        live response, not scripted.
      </Aside>

      <Challenge id="ch11-pid-overshoot" met={challengeMet}>
        Drive the link to a setpoint of at least <M>{"\\pm 6^\\circ"}</M> and make it{" "}
        <strong>land cleanly</strong>: steady-state error under <M>{"\\approx 1^\\circ"}</M> (so you
        will need integral action to beat gravity) and overshoot under{" "}
        <strong>5%</strong> (so keep enough <M>{"K_d"}</M>). Both readouts must turn green while the
        joint is at rest.
      </Challenge>

      <H2>Traps</H2>
      <ul>
        <li>
          <strong>More <M>{"K_p"}</M> is not a substitute for <M>{"K_i"}</M>.</strong> Cranking
          the spring shrinks the gravity offset like <M>{"1/K_p"}</M>, but it never reaches zero
          — and the price of a very stiff spring is ringing and overshoot. Only integral action
          removes the offset exactly.
        </li>
        <li>
          <strong>Integral action is slow, and it can wind up.</strong> The integral only grows
          as error <em>persists</em>, so it fixes offsets, not transients. Worse, if the motor
          saturates or the joint is physically blocked, the integral keeps accumulating the whole
          time — and then dumps that stored torque as a huge overshoot when the joint comes free.
          Real controllers clamp the integral ("anti-windup").
        </li>
        <li>
          <strong>The derivative term acts on a measurement.</strong>{" "}
          <M>{"K_d\\,\\dot\\theta_e"}</M> needs the joint velocity, and encoders are noisy —
          differentiating noise produces jittery torque. Real implementations filter the velocity
          signal before feeding it to <M>{"K_d"}</M>.
        </li>
        <li>
          <strong>The <M>{"\\zeta"}</M> formula is exact only for the gravity-free, linearized
          joint.</strong> Gravity's <M>{"\\cos\\theta"}</M> makes the true response depend on the
          setpoint — the same gains land differently at 34° than at 69°. Try both step buttons in
          the widget and compare.
        </li>
      </ul>

      <KeyIdea>
        Proportional gain is a spring, derivative a damper, integral a memory. On a joint fighting
        gravity, P-only control always leaves an offset; only the integral term supplies the
        standing torque needed to settle exactly on target — and derivative gain is what keeps that
        landing free of overshoot.
      </KeyIdea>

      <Quiz
        challengeId="ch11-pid-quiz"
        goal={<>Answer all three correctly.</>}
        questions={[
          {
            prompt: (
              <>
                A PD controller (no integral term) holds a link against gravity. Why does it
                always settle a little short of the setpoint?
              </>
            ),
            options: [
              {
                label:
                  "At rest the spring torque Kp·θe must balance gravity, and that takes a nonzero error",
                correct: true,
              },
              { label: "Friction eats part of the commanded torque, so some error is inevitable" },
              { label: "Kp was simply set too small — a large enough Kp removes the offset entirely" },
            ],
            explain:
              "With θ̇ = 0 the only torque left is Kp·θe, and it must equal mgr·cosθ. Bigger Kp shrinks the required error but can never make it zero.",
          },
          {
            prompt: (
              <>
                Your joint reaches the setpoint but overshoots and rings back and forth several
                times first. Which gain do you reach for?
              </>
            ),
            options: [
              { label: "Raise Kp — more spring pulls it onto the target faster" },
              { label: "Raise Kd — it is the damper, and ringing means ζ < 1", correct: true },
              { label: "Raise Ki — the integral will smooth out the wiggles" },
            ],
            explain:
              "Ringing is underdamping. Kd adds damping and pushes ζ toward 1; more Kp or Ki makes the ringing worse.",
          },
          {
            prompt: <>At steady state, exactly on target, what is the integral term doing?</>,
            options: [
              { label: "Nothing — the error is zero, so all three terms are zero" },
              { label: "Speeding up the response to the next setpoint change" },
              {
                label:
                  "Supplying a constant holding torque it accumulated from past error — that's what cancels gravity",
                correct: true,
              },
            ],
            explain:
              "The P and D terms vanish when the error and velocity are zero, but the integral remembers the past: its accumulated value keeps paying the gravity torque forever.",
          },
        ]}
      />

      <BookRef>Modern Robotics §11.2–11.4 — Error dynamics and PID control (Eqs. 11.8, 11.21, 11.23, 11.30).</BookRef>
    </div>
  );
}

// inline SVG error-vs-time plot, auto-scaled
function ErrorPlot({ hist, tNow }: { hist: Sample[]; tNow: number }) {
  const W = 240,
    H = 96;
  const t0 = Math.max(0, tNow - WINDOW);
  let maxAbs = 0.05;
  for (const s of hist) maxAbs = Math.max(maxAbs, Math.abs(s.e));
  const sx = (t: number) => ((t - t0) / WINDOW) * W;
  const sy = (e: number) => H / 2 - (e / maxAbs) * (H / 2 - 6);

  const pts = hist.map(s => `${sx(s.t).toFixed(1)},${sy(s.e).toFixed(1)}`).join(" L ");

  return (
    <div className="bg-[#fcfbf9] border border-gray-200 rounded p-1.5 flex flex-col items-center">
      <span className="ui text-[10px] font-semibold text-[var(--ink-soft)] self-start ml-1">
        joint error θₑ(t) — converging to zero is the goal
      </span>
      <svg width={W} height={H} className="mt-1">
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#e0ddd3" strokeWidth={1} />
        {hist.length > 1 && <path d={`M ${pts}`} fill="none" stroke={PLOT_COLOR} strokeWidth={1.6} />}
      </svg>
    </div>
  );
}
