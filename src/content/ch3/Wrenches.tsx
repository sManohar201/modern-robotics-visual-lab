import { useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Vec6Display } from "../../components/widgets/MatrixDisplay";
import { rad, deg } from "../../lib/math/vec";

export default function Wrenches() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 3"
        section="Rigid-Body Motions"
        title="Wrenches"
        lede="Force and moment together form a wrench — the load dual to the twist — defined so that their inner product is mechanical power."
      />

      <p>
        Twists describe how a body moves. To describe the <em>load</em> applied to a body —
        forces and torques from gravity, motors, contacts — we need an analogous 6-vector. That
        vector is the <strong>wrench</strong>, and its structure is determined not by geometric
        convenience but by a fundamental physical requirement: the power delivered to a body must
        be the same number in every coordinate frame.
      </p>

      <H2>Power as the defining requirement</H2>
      <p>
        The instantaneous mechanical power delivered to a rigid body by a force <M>{"f"}</M>{" "}
        and a torque (moment) <M>{"m"}</M> is
      </p>
      <Eq>{"P = f \\cdot v + m \\cdot \\omega,"}</Eq>
      <p>
        where <M>{"v"}</M> is the velocity of the body's reference point and <M>{"\\omega"}</M>{" "}
        is its angular velocity. Written in terms of the twist{" "}
        <M>{"\\mathcal{V} = (\\omega, v)"}</M>, this is
      </p>
      <Eq>{"P = \\mathcal{V}^\\mathsf{T} \\mathcal{F} = \\omega^\\mathsf{T} m + v^\\mathsf{T} f,"}</Eq>
      <p>
        which requires a 6-vector <M>{"\\mathcal{F} = (m, f)"}</M> with moment first, force
        second. This is the wrench. The ordering is forced by the twist convention{" "}
        <M>{"\\mathcal{V} = (\\omega, v)"}</M>: <M>{"m"}</M> pairs with <M>{"\\omega"}</M> and{" "}
        <M>{"f"}</M> pairs with <M>{"v"}</M>.
      </p>

      <H2>The wrench: moment and force</H2>
      <p>
        A <strong>wrench</strong> is a 6-vector
      </p>
      <Eq>{"\\mathcal{F} = \\begin{bmatrix} m \\\\ f \\end{bmatrix} \\in \\mathbb{R}^6,"}</Eq>
      <p>
        where <M>{"f \\in \\mathbb{R}^3"}</M> is the <strong>resultant force</strong> acting on
        the body and <M>{"m \\in \\mathbb{R}^3"}</M> is the <strong>net moment</strong> (torque)
        about the reference point of the body frame.
      </p>
      <p>
        <strong>Force</strong> is the straightforward component: the total external force on the
        body, summed over all contact and body forces. It does not depend on the choice of
        reference point — the same physical force vector, just expressed in different coordinates.
      </p>
      <p>
        <strong>Moment</strong> is the subtler component: it is the sum of{" "}
        <M>{"r_i \\times f_i"}</M> over all forces, where <M>{"r_i"}</M> is the position of the
        force application point relative to the <em>reference point</em>. Crucially, the moment
        depends on which reference point is chosen. Changing the reference point changes the
        moment, even for the same set of applied forces.
      </p>

      <H2>Why moment is frame-dependent</H2>
      <p>
        Suppose we know the wrench <M>{"\\mathcal{F}_b = (m_b, f_b)"}</M> at reference point{" "}
        <M>{"b"}</M>. If we want the wrench at a different reference point <M>{"a"}</M>, offset
        from <M>{"b"}</M> by position <M>{"p"}</M>:
      </p>
      <Eq>{"m_a = m_b + p \\times f_b."}</Eq>
      <p>
        The force component is unchanged (in the same coordinate frame); the moment gains an
        extra <M>{"p \\times f_b"}</M> — the moment arm contribution. This is the fundamental
        reason why moment depends on the reference point and force does not.
      </p>
      <p>
        A concrete example: holding a wrench (the physical tool) at different points along its
        handle. The force you apply at your hand is the same, but the torque transmitted to the
        bolt changes dramatically depending on how far your grip is from the bolt. Try it:
      </p>

      <SpannerWidget />

      <H2>Wrench transformation between frames</H2>
      <p>
        A wrench expressed in frame <M>{"\\{b\\}"}</M> must be expressible in frame{" "}
        <M>{"\\{a\\}"}</M>. Wrenches do <em>not</em> transform with the adjoint. The correct
        transformation is the <strong>adjoint-transpose</strong>, derived from the requirement
        that power is frame-independent.
      </p>
      <p>
        Since <M>{"P = \\mathcal{V}_a^\\mathsf{T}\\mathcal{F}_a = \\mathcal{V}_b^\\mathsf{T}\\mathcal{F}_b"}</M>{" "}
        for all twists, and <M>{"\\mathcal{V}_a = \\mathrm{Ad}_T\\,\\mathcal{V}_b"}</M>:
      </p>
      <Eq>{"(\\mathrm{Ad}_T\\,\\mathcal{V}_b)^\\mathsf{T}\\mathcal{F}_a = \\mathcal{V}_b^\\mathsf{T}\\mathcal{F}_b \\quad \\Rightarrow \\quad \\mathcal{F}_b = \\mathrm{Ad}_T^\\mathsf{T}\\,\\mathcal{F}_a."}</Eq>
      <p>
        Equivalently, <M>{"\\mathcal{F}_a = \\mathrm{Ad}_T^{-\\mathsf{T}}\\,\\mathcal{F}_b"}</M>.
        Wrenches transform with the <em>inverse transpose</em> of the adjoint matrix. This
        is the hallmark of a covariant (dual) object in differential geometry, as opposed to the
        contravariant (direct) transformation of twists.
      </p>
      <Aside>
        In coordinates, <M>{"\\mathrm{Ad}_T^{-\\mathsf{T}} = \\begin{bmatrix} R & [p]R \\\\ 0 & R \\end{bmatrix}"}</M>
        (compare with <M>{"\\mathrm{Ad}_T = \\begin{bmatrix} R & 0 \\\\ [p]R & R \\end{bmatrix}"}</M>).
        The off-diagonal block moves from the bottom-left to the top-right.
      </Aside>

      <H2>Twist–wrench duality</H2>
      <p>
        The relationship between twists and wrenches is a complete mathematical duality:
      </p>

      <div className="my-6 overflow-x-auto">
        <table className="mx-auto border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--ink-faint)]">
              <th className="px-4 py-2 text-left font-semibold">Property</th>
              <th className="px-4 py-2 text-left font-semibold">Twist <M>{"\\mathcal{V}"}</M></th>
              <th className="px-4 py-2 text-left font-semibold">Wrench <M>{"\\mathcal{F}"}</M></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--ink-faint)] border-opacity-30">
              <td className="px-4 py-2">Top 3 components</td>
              <td className="px-4 py-2">Angular velocity <M>{"\\omega"}</M></td>
              <td className="px-4 py-2">Moment <M>{"m"}</M></td>
            </tr>
            <tr className="border-b border-[var(--ink-faint)] border-opacity-30">
              <td className="px-4 py-2">Bottom 3 components</td>
              <td className="px-4 py-2">Linear velocity <M>{"v"}</M></td>
              <td className="px-4 py-2">Force <M>{"f"}</M></td>
            </tr>
            <tr className="border-b border-[var(--ink-faint)] border-opacity-30">
              <td className="px-4 py-2">Frame change</td>
              <td className="px-4 py-2"><M>{"\\mathrm{Ad}_T"}</M></td>
              <td className="px-4 py-2"><M>{"\\mathrm{Ad}_T^{-\\mathsf{T}}"}</M></td>
            </tr>
            <tr>
              <td className="px-4 py-2">Inner product</td>
              <td className="px-4 py-2" colSpan={2}>
                <M>{"\\mathcal{V}^\\mathsf{T}\\mathcal{F} = \\omega^\\mathsf{T} m + v^\\mathsf{T} f = P"}</M>
                {" "}(power — frame invariant)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        This duality has a direct consequence in Chapter 5. The space Jacobian{" "}
        <M>{"J_s"}</M> maps joint velocities <M>{"\\dot{q}"}</M> to the end-effector space
        twist: <M>{"\\mathcal{V}_s = J_s\\,\\dot{q}"}</M>. Because power must be consistent
        between joint space and task space:
      </p>
      <Eq>{"\\tau^\\mathsf{T}\\dot{q} = \\mathcal{V}_s^\\mathsf{T}\\mathcal{F}_s = (J_s\\dot{q})^\\mathsf{T}\\mathcal{F}_s \\quad \\Rightarrow \\quad \\tau = J_s^\\mathsf{T}\\mathcal{F}_s."}</Eq>
      <p>
        Joint torques equal the Jacobian transpose times the end-effector wrench. This single
        equation summarizes all of robot statics and is the foundation of impedance control.
      </p>

      <Quiz
        challengeId="ch3-wrench-quiz"
        goal={<>Three checks on the duality — each one is a classic exam trap.</>}
        questions={[
          {
            prompt: <>In Lynch &amp; Park's convention, the wrench is…</>,
            options: [
              { label: <><M>{"\\mathcal{F} = (m, f)"}</M> — moment on top</>, correct: true },
              { label: <><M>{"\\mathcal{F} = (f, m)"}</M> — force on top</> },
            ],
            explain: (
              <>
                Moment pairs with <M>{"\\omega"}</M> and force with <M>{"v"}</M>, so that{" "}
                <M>{"\\mathcal{V}^\\mathsf{T}\\mathcal{F}"}</M> is power.
              </>
            ),
          },
          {
            prompt: <>Moving the reference point of a wrench changes…</>,
            options: [
              { label: "only the moment", correct: true },
              { label: "only the force" },
              { label: "both components" },
            ],
            explain: (
              <>
                <M>{"m_a = m_b + p \\times f"}</M>; the force is the same physical vector
                regardless of reference point.
              </>
            ),
          },
          {
            prompt: <>Wrenches change coordinate frames with…</>,
            options: [
              { label: <M>{"\\mathrm{Ad}_T^{-\\mathsf{T}}"}</M>, correct: true },
              { label: <M>{"\\mathrm{Ad}_T"}</M> },
              { label: <M>{"R^\\mathsf{T}"}</M> },
            ],
            explain: (
              <>
                Frame-invariance of power forces the dual (inverse-transpose) transformation —
                twists get <M>{"\\mathrm{Ad}_T"}</M>, wrenches get{" "}
                <M>{"\\mathrm{Ad}_T^{-\\mathsf{T}}"}</M>.
              </>
            ),
          },
        ]}
      />

      <KeyIdea>
        <M>{"\\mathcal{F} = (m, f)"}</M>: moment first, force second — dual to the twist{" "}
        <M>{"(\\omega, v)"}</M>. Their inner product is power: <M>{"P = \\omega^\\mathsf{T}m + v^\\mathsf{T}f"}</M>,
        which is frame-invariant. Wrenches transform with <M>{"\\mathrm{Ad}_T^{-\\mathsf{T}}"}</M>{" "}
        (not <M>{"\\mathrm{Ad}_T"}</M>). The Jacobian transpose law{" "}
        <M>{"\\tau = J^\\mathsf{T}\\mathcal{F}"}</M> follows directly from this duality.
      </KeyIdea>

      <BookRef>Modern Robotics §3.5 — Wrenches.</BookRef>
    </div>
  );
}

/* ================= widget: the spanner ================= */

const SC = 230; // px per metre
const BOLT_X = 90;
const BOLT_Y = 196;
const HANDLE_LEN = 2.5; // m

function SpannerWidget() {
  const [grip, setGrip] = useState(1.0); // m from bolt
  const [alpha, setAlpha] = useState(rad(90)); // force direction from handle axis
  const [refS, setRefS] = useState(0); // reference point along handle, m

  const fx = Math.cos(alpha);
  const fy = Math.sin(alpha);
  const mBolt = grip * fy; // (grip, 0) × (fx, fy), z-component
  const pxf = -refS * fy; // p × f with p = bolt − ref = (−refS, 0)
  const mRef = mBolt + pxf;
  const met = Math.abs(mBolt) >= 2;

  const gx = BOLT_X + grip * SC;
  const rx = BOLT_X + refS * SC;
  const AL = 78; // force arrow length, px

  return (
    <>
      <WidgetShell
        title="Torque = force × lever arm — measured from where?"
        onReset={() => {
          setGrip(1.0);
          setAlpha(rad(90));
          setRefS(0);
        }}
        caption={
          <>
            A 1 N push (red) on a long spanner. The wrench readout{" "}
            <M>{"\\mathcal{F} = (m, f)"}</M> is taken about the purple reference diamond — slide
            it along the handle and watch the moment change by exactly{" "}
            <M>{"p \\times f"}</M> while the force never moves. With the reference at the grip
            itself, the moment vanishes: a force through the reference point has no lever arm.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <svg viewBox="0 0 760 300" className="w-full rounded-lg border border-[var(--rule)] bg-[#f4f2ec]">
              {/* handle */}
              <rect x={BOLT_X} y={BOLT_Y - 7} width={HANDLE_LEN * SC} height={14} rx={7} fill="#c9c4b4" />
              {/* bolt */}
              <polygon
                points={`${BOLT_X + 16},${BOLT_Y} ${BOLT_X + 8},${BOLT_Y + 13.9} ${BOLT_X - 8},${BOLT_Y + 13.9} ${BOLT_X - 16},${BOLT_Y} ${BOLT_X - 8},${BOLT_Y - 13.9} ${BOLT_X + 8},${BOLT_Y - 13.9}`}
                fill="#7d7666"
              />
              <circle cx={BOLT_X} cy={BOLT_Y} r={5} fill="#33343d" />
              {/* lever arm from reference to grip */}
              {Math.abs(grip - refS) > 0.04 && (
                <>
                  <line
                    x1={rx} y1={BOLT_Y + 26} x2={gx} y2={BOLT_Y + 26}
                    stroke="#6741d9" strokeWidth={1.5} strokeDasharray="5 4"
                  />
                  <line x1={rx} y1={BOLT_Y + 20} x2={rx} y2={BOLT_Y + 32} stroke="#6741d9" strokeWidth={1.5} />
                  <line x1={gx} y1={BOLT_Y + 20} x2={gx} y2={BOLT_Y + 32} stroke="#6741d9" strokeWidth={1.5} />
                  <text
                    x={(rx + gx) / 2} y={BOLT_Y + 44} textAnchor="middle"
                    fontSize={11.5} fill="#6741d9" fontFamily="ui-monospace, monospace"
                  >
                    arm = {(grip - refS).toFixed(2)} m
                  </text>
                </>
              )}
              {/* moment arc at reference point */}
              {Math.abs(mRef) > 0.04 && (
                <g opacity={Math.min(1, 0.25 + Math.abs(mRef) / 2)}>
                  <path
                    d={
                      mRef > 0
                        ? `M ${rx + 26} ${BOLT_Y} A 26 26 0 1 1 ${rx} ${BOLT_Y - 26}`
                        : `M ${rx} ${BOLT_Y - 26} A 26 26 0 1 1 ${rx + 26} ${BOLT_Y}`
                    }
                    fill="none" stroke="#6741d9" strokeWidth={3}
                    markerEnd="url(#wrencharrow-p)"
                  />
                </g>
              )}
              {/* reference diamond */}
              <polygon
                points={`${rx},${BOLT_Y - 10} ${rx + 10},${BOLT_Y} ${rx},${BOLT_Y + 10} ${rx - 10},${BOLT_Y}`}
                fill="#6741d9"
              />
              {/* grip + force arrow */}
              <circle cx={gx} cy={BOLT_Y} r={8} fill="#fff" stroke="#d9483f" strokeWidth={2.5} />
              <line
                x1={gx} y1={BOLT_Y}
                x2={gx + AL * fx} y2={BOLT_Y - AL * fy}
                stroke="#d9483f" strokeWidth={3.5}
                markerEnd="url(#wrencharrow-f)"
              />
              <text
                x={gx + (AL + 22) * fx} y={BOLT_Y - (AL + 22) * fy + 4}
                textAnchor="middle" fontSize={12.5} fill="#d9483f" fontWeight={600} fontFamily="ui-sans-serif, sans-serif"
              >
                f (1 N)
              </text>
              <defs>
                <marker id="wrencharrow-f" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto">
                  <path d="M0,0 L8,4.5 L0,9 Z" fill="#d9483f" />
                </marker>
                <marker id="wrencharrow-p" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto">
                  <path d="M0,0 L8,4.5 L0,9 Z" fill="#6741d9" />
                </marker>
              </defs>
            </svg>
          </div>
          <div className="ui flex flex-col justify-center gap-3 md:w-[250px]">
            <Vec6Display
              v={[0, 0, mRef, fx, fy, 0]}
              label={<M>{"\\mathcal{F} ="}</M>}
              topColor="#6741d9"
              bottomColor="#d9483f"
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <Readout
                label="m about bolt"
                value={`${mBolt.toFixed(2)} N·m`}
                color={met ? "var(--good)" : undefined}
              />
              <Readout label="p × f" value={`${pxf.toFixed(2)}`} color="#6741d9" />
              <Readout label="m about ◆" value={`${mRef.toFixed(2)} N·m`} color="#6741d9" />
              <Readout
                label="P at θ̇ = 1 rad/s"
                value={`${mBolt.toFixed(2)} W`}
                color={met ? "var(--good)" : undefined}
              />
            </div>
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="grip r" value={grip} min={0.15} max={HANDLE_LEN} onChange={setGrip}
            fmt={v => `${v.toFixed(2)} m`} color="#d9483f" width={170} />
          <LabeledSlider label="force angle" value={alpha} min={-Math.PI} max={Math.PI} onChange={setAlpha}
            fmt={v => `${deg(v).toFixed(0)}°`} color="#d9483f" width={170} />
          <LabeledSlider label="reference ◆" value={refS} min={0} max={HANDLE_LEN} onChange={setRefS}
            fmt={v => `${v.toFixed(2)} m`} color="#6741d9" width={170} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch3-wrench-power" met={met}>
        The bolt is turning at <M>{"\\dot\\theta = 1"}</M> rad/s. Using only your 1 N push,
        deliver at least <strong>2 W</strong> of power — that is, 2 N·m about the bolt
        (<M>{"P = \\omega^\\mathsf{T} m"}</M>). Slide the grip out and find the angle that
        wastes none of the force.
      </Challenge>
    </>
  );
}
