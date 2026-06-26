import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";

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
        Pure motion control demands <em>high</em> impedance: the end-effector resists any force that
        tries to move it. That is exactly wrong for contact tasks — pressing too rigidly into a stiff
        surface produces enormous forces from a tiny position error. Impedance control instead asks
        the end-effector to render a target mass–spring–damper relationship between motion and force
        (Modern Robotics Eq. 11.64):
      </p>
      <Eq>{"M\\,\\ddot{x} + B\\,\\dot{x} + K\\,x = f_{\\text{ext}}."}</Eq>
      <p>
        Here <M>{"K"}</M> is the rendered <strong>stiffness</strong>, <M>{"B"}</M> the rendered
        damping, and <M>{"M"}</M> the rendered mass. Loosely, the robot has high impedance if{" "}
        <M>{"K"}</M> or <M>{"B"}</M> is large, and low impedance if both are small. A good force
        controller is low-impedance: small motion disturbances make only small force changes.
      </p>

      <H2>Pressing into a stiff wall</H2>
      <p>
        Model the environment as a very stiff one-sided spring at the wall surface: once the commanded
        position <M>{"x_{\\text{cmd}}"}</M> is driven past the wall, the rendered spring{" "}
        <M>{"K"}</M> pulls the end-effector inward while the wall pushes back. In steady contact the
        two balance, so the contact force is
      </p>
      <Eq>{"f_{\\text{contact}} \\approx \\frac{K\\,K_{\\text{wall}}}{K + K_{\\text{wall}}}\\,d \\;\\xrightarrow[\\;K_{\\text{wall}}\\gg K\\;]{}\\; K\\,d,"}</Eq>
      <p>
        where <M>{"d"}</M> is the commanded penetration depth. The crucial lesson: for a stiff wall
        the steady contact force is set by the <strong>rendered</strong> stiffness{" "}
        <M>{"K"}</M>, not the wall's. Render a soft spring and you can press in confidently while the
        force stays gentle.
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

      <KeyIdea>
        Impedance control programs the relationship between motion and force. Against a stiff
        environment the steady contact force is governed by the robot's <em>rendered</em> stiffness,
        not the wall's — so a soft virtual spring lets the robot touch delicate things gently while
        still making solid contact.
      </KeyIdea>

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
