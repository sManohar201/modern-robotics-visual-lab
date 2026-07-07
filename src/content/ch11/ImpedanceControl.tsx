import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";

// ---- 1-DOF impedance-controlled end-effector pressing a virtual wall ------
// Rendered behavior:  M xddot + B xdot + K (x - x_cmd) = -f_wall
// The wall is a stiff one-sided spring at x = WALL:  f_wall = Kwall*(x-WALL) for x>WALL.
// The "commanded depth" pushes x_cmd past the wall; rendered stiffness K decides how
// hard the contact builds. Low K = gentle contact even at the same depth.
const WALL = 0.0; // wall surface position (m), penetration is x>0
const M_REND = 1.0; // rendered virtual mass (kg)
const KWALL = 4000; // wall stiffness (N/m) — very stiff
const BWALL = 12; // wall damping (N s/m)

const DT = 0.0005;
const STEPS_PER_FRAME = 16;
const WINDOW = 4.0;

const FRAGILE_LIMIT = 8; // N — peak force allowed on the "fragile object"

const GOOD = "var(--good)";
const BAD = "var(--bad)";
const EE_COLOR = "#3b6fd4";
const WALL_COLOR = "#8a6d3b";
const FORCE_COLOR = "#d9483f";

interface Sample { t: number; f: number; }

export default function ImpedanceControl() {
  const [kRend, setKRend] = useState(150); // rendered stiffness K (N/m)
  const [bRend, setBRend] = useState(20); // rendered damping B (N s/m)
  const [depth, setDepth] = useState(0.05); // commanded position past the wall (m)
  const [running, setRunning] = useState(true);
  const [engaged, setEngaged] = useState(false); // commanded into the wall?

  const kRef = useRef(kRend); kRef.current = kRend;
  const bRef = useRef(bRend); bRef.current = bRend;
  const depthRef = useRef(depth); depthRef.current = depth;
  const engagedRef = useRef(engaged); engagedRef.current = engaged;

  const stateRef = useRef({ x: -0.15, xdot: 0, t: 0 });
  const histRef = useRef<Sample[]>([{ t: 0, f: 0 }]);
  const [x, setX] = useState(-0.15);
  const [force, setForce] = useState(0);
  const [peakForce, setPeakForce] = useState(0);
  const peakRef = useRef(0);
  const [, tick] = useState(0);

  const reset = useCallback(() => {
    stateRef.current = { x: -0.15, xdot: 0, t: 0 };
    histRef.current = [{ t: 0, f: 0 }];
    peakRef.current = 0;
    setX(-0.15);
    setForce(0);
    setPeakForce(0);
    tick(n => n + 1);
  }, []);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const frame = () => {
      const st = stateRef.current;
      const K = kRef.current, B = bRef.current;
      // commanded equilibrium: rest position outside the wall, or pushed in
      const xCmd = engagedRef.current ? WALL + depthRef.current : -0.15;

      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        // contact force from the stiff one-sided wall
        let fWall = 0;
        if (st.x > WALL) {
          fWall = KWALL * (st.x - WALL) + BWALL * st.xdot;
          if (fWall < 0) fWall = 0; // wall only pushes back
        }
        // rendered impedance: M xddot = K(xCmd - x) - B xdot - fWall
        const xddot = (K * (xCmd - st.x) - B * st.xdot - fWall) / M_REND;
        st.xdot += xddot * DT; // semi-implicit Euler
        st.x += st.xdot * DT;
        st.t += DT;
      }

      // measured contact force (what the user/object feels)
      const fContact = st.x > WALL ? KWALL * (st.x - WALL) : 0;
      setX(st.x);
      setForce(fContact);
      if (fContact > peakRef.current) { peakRef.current = fContact; setPeakForce(fContact); }

      const hist = histRef.current;
      hist.push({ t: st.t, f: fContact });
      while (hist.length > 2 && hist[0].t < st.t - WINDOW) hist.shift();

      tick(n => n + 1);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  // challenge: actually touch (force settled > 0) but keep peak under fragile limit
  const inContact = force > 0.2;
  const challengeMet = running && engaged && inContact && peakForce > 0 && peakForce < FRAGILE_LIMIT;

  // ---- SVG layout (world x -> svg) ---------------------------------------
  const VW = 300, VH = 150;
  const scale = 700; // px per meter
  const ox = 160; // svg x of wall surface (world x = 0)
  const sx = (xw: number) => ox + xw * scale;
  const eeX = sx(x);
  const cmdX = sx(engaged ? WALL + depth : -0.15);

  return (
    <div>
      <PageHeader
        chapter="Chapter 11"
        section="Robot Control"
        title="Force & Impedance Control"
        lede="Sometimes the robot should yield, not insist. An impedance controller makes the end-effector behave like a programmable spring–damper, so contact with the world is shaped by software, not by stiff position servos."
      />

      <p>
        Push on a brick wall: it doesn't budge, and every extra millimeter you try to gain costs
        enormous force. Push on a foam mattress: it yields softly. Now push on a friend's
        outstretched arm — relaxed, it gives; tensed, it feels rigid. Same limb, different feel,
        switched on demand. That property has a name: <strong>impedance</strong> — how something
        feels when you push on it; how much force it fights back with per bit of motion you
        impose. A person retunes their arm's impedance with muscle tension. Impedance control
        gives a robot the same knob, in software.
      </p>
      <p>
        Pure motion control deliberately makes the robot feel like the brick wall — high
        impedance, resisting any force that tries to move it. That is exactly wrong for contact
        tasks: press a rigid position-controlled tool into a stiff surface, and a tiny position
        error produces an enormous force. Impedance control instead asks the motors to{" "}
        <em>fake</em> a mass–spring–damper of our choosing, so the relationship between motion
        and force at the end-effector is whatever we program (Modern Robotics Eq. 11.64):
      </p>
      <Eq>{"M\\,\\ddot{x} + B\\,\\dot{x} + K\\,x = f_{\\text{ext}}."}</Eq>
      <p>
        Read it back: an external force <M>{"f_{\\text{ext}}"}</M> pushing on the end-effector
        meets three programmed resistances. The rendered <strong>stiffness</strong> <M>{"K"}</M>{" "}
        fights being <em>displaced</em>; the rendered damping <M>{"B"}</M> fights moving{" "}
        <em>fast</em>; the rendered mass <M>{"M"}</M> fights being <em>shoved into motion</em>.
        Large <M>{"K"}</M> or <M>{"B"}</M> is high impedance — the brick wall. Small everything
        is low impedance — the mattress. A good force controller is low-impedance: small motion
        disturbances then make only small force changes.
      </p>

      <H2>Pressing into a stiff wall</H2>
      <p>
        Model the environment as a very stiff one-sided spring of stiffness{" "}
        <M>{"K_{\\text{wall}}"}</M> sitting at the wall surface, and command the end-effector to
        a position a depth <M>{"d"}</M> <em>past</em> that surface. The tool ends up pinched
        between <em>two springs</em>: the robot's rendered spring stretched behind it (pulling it
        inward toward the command) and the wall's spring compressed in front of it (pushing it
        back out). In steady contact nothing moves, so the same force <M>{"f"}</M> flows through
        both springs:
      </p>
      <Eq>{"f = K\\,\\delta_r = K_{\\text{wall}}\\,\\delta_w,"}</Eq>
      <p>
        where <M>{"\\delta_r"}</M> is how far the rendered spring stays stretched and{" "}
        <M>{"\\delta_w"}</M> how far the wall is dented. And the commanded depth is split between
        those two deflections — whatever the wall doesn't give, the rendered spring must:
      </p>
      <Eq>{"d = \\delta_r + \\delta_w."}</Eq>
      <p>
        Two equations, two unknowns. Substitute <M>{"\\delta_r = f/K"}</M> and{" "}
        <M>{"\\delta_w = f/K_{\\text{wall}}"}</M> into the second and solve for <M>{"f"}</M>:
      </p>
      <Eq>{"f_{\\text{contact}} = \\frac{K\\,K_{\\text{wall}}}{K + K_{\\text{wall}}}\\,d \\;\\xrightarrow[\\;K_{\\text{wall}}\\gg K\\;]{}\\; K\\,d."}</Eq>
      <p>
        Read it back: the fraction is the classic stiffness of two springs in series — always{" "}
        <em>softer</em> than either spring alone (a sanity check you can feel: two slinkies
        end-to-end stretch more easily than one). The softer spring dominates the pair. So
        against a wall much stiffer than the robot, the steady contact force settles at{" "}
        <M>{"K\\,d"}</M> — set entirely by the <strong>rendered</strong> stiffness, not the
        wall's. Render a soft spring and you can press in confidently while the force stays
        gentle.
      </p>

      <p>
        <strong>Try this:</strong> press Engage at the default <M>{"K = 150"}</M>&nbsp;N/m and
        compare the settled contact-force readout with the <M>{"K\\cdot d"}</M> prediction — they
        should agree. Retract, crank <M>{"K"}</M> to 1500, and Engage again: the peak force
        spikes past the fragile-object line on the plot. Now drop <M>{"K"}</M> to about 60, raise{" "}
        <M>{"B"}</M> a little, and re-engage — solid contact, gentle force.
      </p>

      <WidgetShell
        title="Render a virtual spring against a wall"
        onReset={() => {
          setKRend(150);
          setBRend(20);
          setDepth(0.05);
          setEngaged(false);
          setRunning(true);
          reset();
        }}
        caption={
          <>
            The <span style={{ color: EE_COLOR }}>blue end-effector</span> is commanded toward the{" "}
            <span style={{ color: WALL_COLOR }}>brown wall</span>. Press "Engage" to push the
            commanded target a depth <M>{"d"}</M> past the surface, then watch the{" "}
            <span style={{ color: FORCE_COLOR }}>contact force</span> build. Lower the rendered
            stiffness <M>{"K"}</M> for a gentler push at the same depth.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} className="bg-[#fcfbf9] border border-gray-200 rounded">
              {/* wall (hatched region right of surface) */}
              <rect x={ox} y={0} width={VW - ox} height={VH} fill="#efe6d4" />
              <line x1={ox} y1={0} x2={ox} y2={VH} stroke={WALL_COLOR} strokeWidth={3} />
              {[...Array(8)].map((_, i) => (
                <line key={i} x1={ox} y1={i * 20} x2={ox + 14} y2={i * 20 - 14} stroke={WALL_COLOR} strokeWidth={1} opacity={0.5} />
              ))}
              {/* rail */}
              <line x1={20} y1={VH / 2} x2={ox} y2={VH / 2} stroke="#d8d4c8" strokeWidth={2} />
              {/* commanded target ghost */}
              <line x1={cmdX} y1={VH / 2 - 22} x2={cmdX} y2={VH / 2 + 22} stroke="#bdbab2" strokeWidth={1.5} strokeDasharray="3 2" />
              {/* spring from EE to command (visual) */}
              <line x1={eeX} y1={VH / 2} x2={cmdX} y2={VH / 2} stroke="#bdbab2" strokeWidth={1} opacity={0.6} />
              {/* end-effector */}
              <circle cx={eeX} cy={VH / 2} r={11} fill={EE_COLOR} />
              {/* contact force arrow (pushes EE left when in contact) */}
              {force > 0.2 && (
                <>
                  <line x1={eeX} y1={VH / 2} x2={eeX - Math.min(60, force * 6)} y2={VH / 2} stroke={FORCE_COLOR} strokeWidth={3} markerEnd="url(#imp-arr)" />
                  <defs>
                    <marker id="imp-arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                      <path d="M8,0 L0,4 L8,8 Z" fill={FORCE_COLOR} />
                    </marker>
                  </defs>
                </>
              )}
            </svg>

            <ForcePlot hist={histRef.current} tNow={stateRef.current.t} limit={FRAGILE_LIMIT} />
          </div>

          <div className="w-full md:w-[260px] shrink-0 flex flex-col gap-3">
            <div className="flex gap-2">
              <WidgetButton active={running} onClick={() => setRunning(r => !r)}>{running ? "Pause" : "Run"}</WidgetButton>
              <WidgetButton active={engaged} onClick={() => { setEngaged(e => !e); peakRef.current = 0; setPeakForce(0); }}>
                {engaged ? "Retract" : "Engage"}
              </WidgetButton>
            </div>

            <div className="border-t border-[var(--rule)] pt-2 flex flex-col gap-2">
              <LabeledSlider label={<M>{"K"}</M>} value={kRend} min={20} max={1500} step={10} onChange={setKRend} fmt={v => `${v.toFixed(0)} N/m`} width={120} />
              <LabeledSlider label={<M>{"B"}</M>} value={bRend} min={2} max={120} step={2} onChange={setBRend} fmt={v => `${v.toFixed(0)}`} width={120} />
              <LabeledSlider label={<M>{"d"}</M>} value={depth} min={0.005} max={0.12} step={0.005} onChange={setDepth} fmt={v => `${(v * 1000).toFixed(0)} mm`} width={120} />
            </div>

            <div className="border-t border-[var(--rule)] pt-2 flex flex-col gap-1.5">
              <Readout label="contact force" value={`${force.toFixed(1)} N`} color={force > 0.2 && force < FRAGILE_LIMIT ? GOOD : force >= FRAGILE_LIMIT ? BAD : undefined} />
              <Readout label="peak force" value={`${peakForce.toFixed(1)} N`} color={peakForce > 0 && peakForce < FRAGILE_LIMIT ? GOOD : peakForce >= FRAGILE_LIMIT ? BAD : undefined} />
              <Readout label="K·d (predicted)" value={`${(kRend * depth).toFixed(1)} N`} />
            </div>
            <WidgetButton onClick={reset}>Reset state</WidgetButton>
          </div>
        </div>
      </WidgetShell>

      <Aside>
        The wall is a stiff one-sided spring (<M>{"K_{\\text{wall}} = 4000\\,\\text{N/m}"}</M>) with a
        little damping; the end-effector renders <M>{"M\\ddot x + B\\dot x + K(x - x_{\\text{cmd}}) = -f_{\\text{wall}}"}</M>,
        integrated at <M>{"\\Delta t = 0.5\\,\\text{ms}"}</M>. The plotted force is the true contact
        force the object feels — measured live, not faked.
      </Aside>

      <Challenge id="ch11-impedance-soft" met={challengeMet}>
        Imagine the wall is a <strong>fragile object</strong> that cracks above{" "}
        <strong>{FRAGILE_LIMIT}&nbsp;N</strong>. Engage and actually make contact (force above zero),
        but keep the <strong>peak force below {FRAGILE_LIMIT}&nbsp;N</strong>. The trick: render a low
        stiffness <M>{"K"}</M> (and keep enough damping <M>{"B"}</M> to avoid an impact spike) so the
        spring is soft even as you press in.
      </Challenge>

      <H2>Traps</H2>
      <ul>
        <li>
          <strong>High impedance is right for motion; low impedance is right for force.</strong>{" "}
          The two goals are opposed — rigid tracking rejects disturbances but slams into
          surfaces; a soft render touches gently but tracks sloppily. You choose per task, or
          even per <em>direction</em> (stiff along the surface, soft into it — hybrid control).
        </li>
        <li>
          <strong>The impact spike is a velocity-and-damping story, not a stiffness one.</strong>{" "}
          Even a very soft rendered spring slams the wall if the tool flies in fast with tiny{" "}
          <M>{"B"}</M> — the series-spring formula only governs the <em>steady</em> force. Watch
          the transient spike in the plot when you engage with low damping.
        </li>
        <li>
          <strong>Rendered is not real.</strong> The spring–damper is synthesized by motors
          running a control loop. Outside their bandwidth and torque limits — very fast impacts,
          very stiff renders — the illusion breaks and the mechanism's own hardware dynamics show
          through.
        </li>
        <li>
          <strong>You can't out-stiffen the mechanism.</strong> Rendering a huge <M>{"K"}</M>{" "}
          just re-creates the rigid position-controller and its force-spike problem — with the
          added risk of instability against a stiff environment. If you wanted a brick wall, you
          didn't need impedance control.
        </li>
      </ul>

      <KeyIdea>
        Impedance control programs the relationship between motion and force. Against a stiff
        environment the steady contact force is governed by the robot's <em>rendered</em> stiffness,
        not the wall's — so a soft virtual spring lets the robot touch delicate things gently while
        still making solid contact.
      </KeyIdea>

      <Quiz
        challengeId="ch11-imp-quiz"
        goal={<>Answer all three correctly.</>}
        questions={[
          {
            prompt: (
              <>
                A robot renders stiffness <M>{"K"}</M> and is commanded <M>{"d = 10"}</M>&nbsp;mm
                past the surface of a wall far stiffer than <M>{"K"}</M>. The steady contact force
                is about…
              </>
            ),
            options: [
              { label: "K_wall · d — the wall's stiffness is what actually pushes back" },
              { label: "K · d — the robot's rendered stiffness sets it", correct: true },
              { label: "(K + K_wall) · d — the two stiffnesses add" },
            ],
            explain:
              "Springs in series: the softer one dominates. With K_wall ≫ K, the series stiffness K·K_wall/(K+K_wall) ≈ K, so f ≈ K·d.",
          },
          {
            prompt: (
              <>
                You must make contact with a fragile part without cracking it. Do you raise or
                lower the rendered stiffness?
              </>
            ),
            options: [
              { label: "Raise it — a stiff tool is more precise, so it won't overshoot into the part" },
              {
                label:
                  "Lower it — the same commanded depth then produces less force, and position errors cost little force",
                correct: true,
              },
              { label: "Stiffness doesn't matter; only the commanded depth does" },
            ],
            explain:
              "The steady force is ≈ K·d, so soft K means gentle contact even when you deliberately command past the surface — exactly the widget's fragile-object challenge.",
          },
          {
            prompt: <>What does an impedance controller actually program?</>,
            options: [
              { label: "A force setpoint the end-effector will exert no matter what" },
              { label: "A position setpoint the end-effector will reach no matter what" },
              {
                label:
                  "The relationship between motion and force at the end-effector — how it feels to push on it",
                correct: true,
              },
            ],
            explain:
              "Neither pure force nor pure position: impedance control fixes the mass–spring–damper law connecting the two, and contact with the environment decides where along that law the system settles.",
          },
        ]}
      />

      <BookRef>Modern Robotics §11.5 & §11.7 — Force control and impedance control (Eqs. 11.62–11.65).</BookRef>
    </div>
  );
}

function ForcePlot({ hist, tNow, limit }: { hist: Sample[]; tNow: number; limit: number }) {
  const W = 240, H = 90;
  const t0 = Math.max(0, tNow - WINDOW);
  let maxF = limit * 1.2;
  for (const s of hist) maxF = Math.max(maxF, s.f * 1.1);
  const sx = (t: number) => ((t - t0) / WINDOW) * W;
  const sy = (f: number) => H - 4 - (f / maxF) * (H - 8);
  const pts = hist.map(s => `${sx(s.t).toFixed(1)},${sy(s.f).toFixed(1)}`).join(" L ");
  const limY = sy(limit);

  return (
    <div className="bg-[#fcfbf9] border border-gray-200 rounded p-1.5 flex flex-col items-center">
      <span className="ui text-[10px] font-semibold text-[var(--ink-soft)] self-start ml-1">
        contact force f(t) — dashed line is the fragile-object limit
      </span>
      <svg width={W} height={H} className="mt-1">
        <line x1={0} y1={H - 4} x2={W} y2={H - 4} stroke="#e0ddd3" strokeWidth={1} />
        <line x1={0} y1={limY} x2={W} y2={limY} stroke="#c2571c" strokeWidth={1} strokeDasharray="4 3" />
        {hist.length > 1 && <path d={`M ${pts}`} fill="none" stroke={FORCE_COLOR} strokeWidth={1.6} />}
      </svg>
    </div>
  );
}
