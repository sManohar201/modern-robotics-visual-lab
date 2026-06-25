import { useRef, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { svgCoords } from "../../lib/svg";

const NORMAL_COLOR = "#3b6fd4";
const CONE_FILL = "#caa53d22";
const CONE_EDGE = "#b08c1d";
const GOOD = "#2f9e44";
const BAD = "#d9483f";

/* ====================================================================== */
/* Page                                                                   */
/* ====================================================================== */

export default function FrictionCones() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 12"
        section="Grasping & Coordinated Manipulation"
        title="Contact Friction Cones"
        lede="A dry contact can push, but it can only pull sideways up to a limit set by friction. That limit carves a cone out of the space of forces — and whether a body stays put or slips is entirely a question of whether the needed force lives inside that cone."
      />

      <p>
        When two rigid bodies touch at a point, the contact can transmit a force. That force is not
        free to point anywhere. It must <strong>push</strong> into the body along the contact
        normal — a contact cannot pull — and the <em>tangential</em> (frictional) component is
        bounded by the normal component. The Coulomb model states this as
      </p>
      <Eq>{"f_t \\le \\mu f_n, \\qquad f_n \\ge 0,"}</Eq>
      <p>
        where <M>{"f_n"}</M> is the magnitude of the normal force, <M>{"f_t"}</M> the magnitude of
        the tangential (friction) force, and <M>{"\\mu"}</M> the <strong>friction coefficient</strong>,
        a property of the two materials in contact (typically <M>{"0.1"}</M> to <M>{"1"}</M> for hard
        dry materials). Collecting every force that satisfies this inequality sweeps out the{" "}
        <strong>friction cone</strong>.
      </p>

      <KeyIdea>
        The friction cone is symmetric about the contact normal with half-angle{" "}
        <M>{"\\alpha = \\tan^{-1}\\mu"}</M>, the <strong>friction angle</strong>. A contact force
        anywhere <em>inside</em> the cone can be sustained with no slip; a force on the boundary
        means incipient slip; a force <em>outside</em> the cone is impossible — the contact gives
        way and the bodies slide.
      </KeyIdea>

      <p>
        For a contact normal along <M>{"+\\hat z"}</M> the set of transmissible forces is
      </p>
      <Eq>{"\\sqrt{f_x^2 + f_y^2} \\le \\mu f_z, \\qquad f_z \\ge 0,"}</Eq>
      <p>
        a circular cone in 3D. For <strong>planar</strong> problems — the natural setting for this
        chapter — the cone collapses to a wedge bounded by its two edges, each tilted from the
        normal by the friction angle <M>{"\\alpha"}</M>. No polyhedral approximation is needed: the
        positive span of the two edge rays is the cone exactly.
      </p>

      <ConeWidget />

      <H2>An object resting on an incline</H2>
      <p>
        The cleanest test of the cone is the textbook block on a ramp. A single contact supports the
        block, so static equilibrium forces the reaction force <M>{"\\mathbf f"}</M> to be exactly
        equal and opposite to gravity — it must point straight up with magnitude <M>{"mg"}</M>.
        Resolve that reaction into the surface frame: the angle it makes with the surface{" "}
        <em>normal</em> is precisely the incline angle <M>{"\\theta"}</M>. Hence
      </p>
      <Eq>{"f_t = mg\\sin\\theta, \\quad f_n = mg\\cos\\theta \\;\\Rightarrow\\; \\frac{f_t}{f_n} = \\tan\\theta."}</Eq>
      <p>
        The block sticks when the reaction lies inside the cone, <M>{"\\tan\\theta \\le \\mu"}</M>,
        i.e. when the incline angle does not exceed the friction angle, <M>{"\\theta \\le \\alpha"}</M>.
        At <M>{"\\theta = \\alpha"}</M> the reaction is on the cone edge and the block is on the verge
        of sliding; steeper than that, no contact force can hold it and it slides down. Tilt the ramp
        and tune <M>{"\\mu"}</M>:
      </p>

      <InclineWidget />

      <Aside>
        Notice what is <em>not</em> in the model: the magnitude of the normal force does not appear
        in the slip condition <M>{"\\tan\\theta \\le \\mu"}</M>. A heavier block presses down harder,
        but it also generates proportionally more available friction, so the critical angle is the
        same. Mass cancels — which is why the angle at which things start to slide is a clean way to
        measure <M>{"\\mu"}</M> experimentally.
      </Aside>

      <p>
        This single-contact cone is the atom of everything that follows. Each finger of a grasp
        contributes one friction cone; mapping each cone into wrench space and taking the positive
        span of all of them produces the composite wrench cone that decides whether a grasp holds.
        That is the subject of the next page, force and form closure.
      </p>

      <BookRef>Modern Robotics §12.2.1 — Friction (Coulomb model, Eq. 12.16; friction angle α = tan⁻¹μ).</BookRef>
    </div>
  );
}

/* ====================================================================== */
/* Widget 1: draggable force vector against the friction cone             */
/* ====================================================================== */

const CW = 720;
const CH = 380;
const CONTACT: [number, number] = [360, 300];
const SURFACE_Y = 300;
const RAY_LEN = 260;

function ConeWidget() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mu, setMu] = useState(0.5);
  // force endpoint, measured from contact point in SVG pixels (y up = into body)
  const [force, setForce] = useState<[number, number]>([55, -150]);
  const dragging = useRef(false);

  const alpha = Math.atan(mu); // friction angle, radians

  // force decomposition in the surface frame: normal = +y(up, into body), tangent = +x
  const ft = force[0]; // tangential component (px)
  const fn = -force[1]; // normal component (px); positive = pushing into body
  const mag = Math.hypot(ft, fn);
  const theta = Math.atan2(Math.abs(ft), fn); // angle from normal (only meaningful if fn>0)
  const inside = fn > 0 && Math.abs(ft) <= mu * fn;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !svgRef.current) return;
    const [x, y] = svgCoords(e, svgRef.current, CW, CH);
    setForce([x - CONTACT[0], y - CONTACT[1]]);
  };

  // cone edges (rays from contact, pointing up into body)
  const edgeL: [number, number] = [
    CONTACT[0] - RAY_LEN * Math.sin(alpha),
    CONTACT[1] - RAY_LEN * Math.cos(alpha),
  ];
  const edgeR: [number, number] = [
    CONTACT[0] + RAY_LEN * Math.sin(alpha),
    CONTACT[1] - RAY_LEN * Math.cos(alpha),
  ];
  const normalTip: [number, number] = [CONTACT[0], CONTACT[1] - RAY_LEN];
  const fTip: [number, number] = [CONTACT[0] + force[0], CONTACT[1] + force[1]];
  const fColor = inside ? GOOD : BAD;

  return (
    <>
      <WidgetShell
        title="Drag the contact force — is it inside the cone?"
        onReset={() => {
          setMu(0.5);
          setForce([55, -150]);
        }}
        caption={
          <>
            The gray surface supports a body above it; the contact normal points up. The gold wedge
            is the friction cone with half-angle <span className="mono">α = tan⁻¹μ</span>. Drag the{" "}
            arrow tip: the force turns <span style={{ color: GOOD }}>green</span> when it lies inside
            the cone (no slip) and <span style={{ color: BAD }}>red</span> when it falls outside or
            tries to pull (<span className="mono">f_n &lt; 0</span>) — the contact would slip or
            separate.
          </>
        }
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CW} ${CH}`}
          className="w-full touch-none select-none"
          onPointerMove={onMove}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => (dragging.current = false)}
        >
          <defs>
            <marker id="fc-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
              <path d="M0,0 L7,3 L0,6 Z" fill={fColor} />
            </marker>
            <marker id="fc-narrow" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto">
              <path d="M0,0 L6.5,3 L0,6 Z" fill={NORMAL_COLOR} />
            </marker>
          </defs>

          {/* surface + hatching */}
          <line x1={40} y1={SURFACE_Y} x2={CW - 40} y2={SURFACE_Y} stroke="#33343d" strokeWidth={2.5} />
          {Array.from({ length: 28 }, (_, i) => 60 + i * 22).map(x => (
            <line key={x} x1={x} y1={SURFACE_Y} x2={x - 12} y2={SURFACE_Y + 12} stroke="#9a978c" strokeWidth={1.2} />
          ))}

          {/* friction cone wedge */}
          <path
            d={`M ${CONTACT[0]} ${CONTACT[1]} L ${edgeL[0]} ${edgeL[1]} L ${edgeR[0]} ${edgeR[1]} Z`}
            fill={CONE_FILL}
            stroke="none"
          />
          <line x1={CONTACT[0]} y1={CONTACT[1]} x2={edgeL[0]} y2={edgeL[1]} stroke={CONE_EDGE} strokeWidth={1.6} />
          <line x1={CONTACT[0]} y1={CONTACT[1]} x2={edgeR[0]} y2={edgeR[1]} stroke={CONE_EDGE} strokeWidth={1.6} />

          {/* contact normal (dashed) */}
          <line
            x1={CONTACT[0]}
            y1={CONTACT[1]}
            x2={normalTip[0]}
            y2={normalTip[1]}
            stroke={NORMAL_COLOR}
            strokeWidth={1.6}
            strokeDasharray="5 5"
            markerEnd="url(#fc-narrow)"
          />
          <text x={normalTip[0] + 8} y={normalTip[1] + 4} className="ui" fontSize={13} fill={NORMAL_COLOR}>n̂</text>

          {/* friction angle arc */}
          <path
            d={`M ${CONTACT[0]} ${CONTACT[1] - 70} A 70 70 0 0 0 ${CONTACT[0] - 70 * Math.sin(alpha)} ${CONTACT[1] - 70 * Math.cos(alpha)}`}
            fill="none"
            stroke={CONE_EDGE}
            strokeWidth={1.2}
          />
          <text x={CONTACT[0] - 46} y={CONTACT[1] - 80} className="ui" fontSize={12} fill={CONE_EDGE}>α</text>

          {/* the force vector */}
          <line
            x1={CONTACT[0]}
            y1={CONTACT[1]}
            x2={fTip[0]}
            y2={fTip[1]}
            stroke={fColor}
            strokeWidth={3}
            markerEnd="url(#fc-arrow)"
          />
          <g
            className="cursor-grab"
            onPointerDown={e => {
              e.preventDefault();
              dragging.current = true;
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
          >
            <circle cx={fTip[0]} cy={fTip[1]} r={16} fill={`${fColor}22`} />
            <circle cx={fTip[0]} cy={fTip[1]} r={7} fill="#fff" stroke={fColor} strokeWidth={2.5} />
          </g>

          {/* contact dot */}
          <circle cx={CONTACT[0]} cy={CONTACT[1]} r={5} fill="#33343d" />
        </svg>

        <ControlBar>
          <LabeledSlider
            label="μ"
            value={mu}
            min={0.05}
            max={1.2}
            step={0.01}
            onChange={setMu}
            fmt={v => v.toFixed(2)}
            color={CONE_EDGE}
            width={180}
          />
          <Readout label="α = tan⁻¹μ" value={`${((alpha * 180) / Math.PI).toFixed(1)}°`} color={CONE_EDGE} />
          <Readout label="angle from n̂" value={fn > 0 ? `${((theta * 180) / Math.PI).toFixed(1)}°` : "—"} />
          <Readout label="fₜ / fₙ" value={fn > 0 ? (Math.abs(ft) / fn).toFixed(2) : "pull"} />
          <Readout label="status" value={inside ? "no slip" : fn > 0 ? "SLIP" : "separating"} color={inside ? GOOD : BAD} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch12-cone-aim" met={inside && mag > 30} holdMs={400}>
        Get a feel for the cone: drag the force so it pushes into the body and lands{" "}
        <strong>inside</strong> the gold wedge — the arrow must be green. Then shrink <M>{"\\mu"}</M>{" "}
        and watch the same force pop outside as the cone narrows.
      </Challenge>
    </>
  );
}

/* ====================================================================== */
/* Widget 2: block on an adjustable incline                              */
/* ====================================================================== */

const IW = 720;
const IH = 400;
const PIVOT: [number, number] = [120, 320];
const RAMP_LEN = 480;

function InclineWidget() {
  const [theta, setTheta] = useState(20); // incline angle, degrees
  const [mu, setMu] = useState(0.6);

  const tr = (theta * Math.PI) / 180;
  const alpha = Math.atan(mu);
  const sticks = Math.tan(tr) <= mu + 1e-9; // equilibrium feasible iff reaction inside cone
  const col = sticks ? GOOD : BAD;

  // ramp surface direction (down-slope is +x', up to the right)
  const dir: [number, number] = [Math.cos(tr), -Math.sin(tr)]; // along ramp, going up-right (SVG y down)
  const rampEnd: [number, number] = [PIVOT[0] + RAMP_LEN * dir[0], PIVOT[1] + RAMP_LEN * dir[1]];

  // block sits part-way up the ramp
  const s = 230; // distance along ramp to block centre
  const blockC: [number, number] = [PIVOT[0] + s * dir[0], PIVOT[1] + s * dir[1]];
  // surface normal (pointing away from ramp, up-left in SVG)
  const nrm: [number, number] = [Math.sin(tr), Math.cos(tr)]; // outward normal, SVG y down => points up
  const nrmUp: [number, number] = [-nrm[0], -nrm[1]];
  const blockSize = 46;
  // place block centre slightly off the surface
  const bc: [number, number] = [blockC[0] + nrmUp[0] * (blockSize / 2 + 2), blockC[1] + nrmUp[1] * (blockSize / 2 + 2)];

  // friction cone at the contact (about the outward normal nrmUp)
  const coneLen = 150;
  const rot = (v: [number, number], a: number): [number, number] => [
    v[0] * Math.cos(a) - v[1] * Math.sin(a),
    v[0] * Math.sin(a) + v[1] * Math.cos(a),
  ];
  const eL = rot(nrmUp, alpha);
  const eR = rot(nrmUp, -alpha);
  const coneL: [number, number] = [blockC[0] + eL[0] * coneLen, blockC[1] + eL[1] * coneLen];
  const coneR: [number, number] = [blockC[0] + eR[0] * coneLen, blockC[1] + eR[1] * coneLen];
  const coneN: [number, number] = [blockC[0] + nrmUp[0] * coneLen, blockC[1] + nrmUp[1] * coneLen];

  // required reaction force = straight up (opposes gravity), magnitude mg
  const reactLen = 130;
  const reactTip: [number, number] = [blockC[0], blockC[1] - reactLen];

  // block corners (axis-aligned with the ramp)
  const half = blockSize / 2;
  const tan: [number, number] = dir;
  const corner = (su: number, sv: number): string =>
    `${bc[0] + tan[0] * su * half + nrmUp[0] * sv * half},${bc[1] + tan[1] * su * half + nrmUp[1] * sv * half}`;
  const blockPts = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)].join(" ");

  const met = sticks && theta >= 25;

  return (
    <>
      <WidgetShell
        title="Will the block hold? Tilt the ramp, set the friction"
        onReset={() => {
          setTheta(20);
          setMu(0.6);
        }}
        caption={
          <>
            The required reaction force (the support that balances gravity) points straight up at the
            contact. The block holds exactly when that force lies inside the gold friction cone, i.e.{" "}
            <span className="mono">tan θ ≤ μ</span> (equivalently <span className="mono">θ ≤ α</span>).
            When the ramp is too steep for the friction available, the reaction leaves the cone and
            the block slips.
          </>
        }
      >
        <svg viewBox={`0 0 ${IW} ${IH}`} className="w-full select-none">
          <defs>
            <marker id="inc-react" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
              <path d="M0,0 L7,3 L0,6 Z" fill={col} />
            </marker>
            <marker id="inc-g" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
              <path d="M0,0 L7,3 L0,6 Z" fill="#7a7670" />
            </marker>
          </defs>

          {/* ground reference */}
          <line x1={40} y1={PIVOT[1]} x2={IW - 40} y2={PIVOT[1]} stroke="#d8d4c8" strokeWidth={1.5} strokeDasharray="4 4" />

          {/* ramp */}
          <line x1={PIVOT[0]} y1={PIVOT[1]} x2={rampEnd[0]} y2={rampEnd[1]} stroke="#33343d" strokeWidth={3} strokeLinecap="round" />
          {Array.from({ length: 22 }, (_, i) => i).map(i => {
            const u = 20 + i * 22;
            const px = PIVOT[0] + u * dir[0];
            const py = PIVOT[1] + u * dir[1];
            return <line key={i} x1={px} y1={py} x2={px + nrm[0] * 11} y2={py + nrm[1] * 11} stroke="#9a978c" strokeWidth={1.1} />;
          })}
          <circle cx={PIVOT[0]} cy={PIVOT[1]} r={4} fill="#33343d" />

          {/* angle arc at pivot */}
          <path
            d={`M ${PIVOT[0] + 60} ${PIVOT[1]} A 60 60 0 0 0 ${PIVOT[0] + 60 * Math.cos(tr)} ${PIVOT[1] - 60 * Math.sin(tr)}`}
            fill="none"
            stroke="#7a7670"
            strokeWidth={1.2}
          />
          <text x={PIVOT[0] + 66} y={PIVOT[1] - 14} className="ui" fontSize={12} fill="#7a7670">θ</text>

          {/* friction cone at contact */}
          <path d={`M ${blockC[0]} ${blockC[1]} L ${coneL[0]} ${coneL[1]} L ${coneR[0]} ${coneR[1]} Z`} fill={CONE_FILL} />
          <line x1={blockC[0]} y1={blockC[1]} x2={coneL[0]} y2={coneL[1]} stroke={CONE_EDGE} strokeWidth={1.4} />
          <line x1={blockC[0]} y1={blockC[1]} x2={coneR[0]} y2={coneR[1]} stroke={CONE_EDGE} strokeWidth={1.4} />
          <line x1={blockC[0]} y1={blockC[1]} x2={coneN[0]} y2={coneN[1]} stroke={NORMAL_COLOR} strokeWidth={1.2} strokeDasharray="4 4" />

          {/* block */}
          <polygon points={blockPts} fill={`${col}1a`} stroke={col} strokeWidth={2} />

          {/* gravity arrow */}
          <line x1={bc[0]} y1={bc[1]} x2={bc[0]} y2={bc[1] + 70} stroke="#7a7670" strokeWidth={2.2} markerEnd="url(#inc-g)" />
          <text x={bc[0] + 6} y={bc[1] + 64} className="ui" fontSize={12} fill="#7a7670">mg</text>

          {/* required reaction force (up) */}
          <line x1={blockC[0]} y1={blockC[1]} x2={reactTip[0]} y2={reactTip[1]} stroke={col} strokeWidth={3} markerEnd="url(#inc-react)" />
          <text x={reactTip[0] + 8} y={reactTip[1] + 6} className="ui" fontSize={13} fill={col}>f</text>

          {/* contact dot */}
          <circle cx={blockC[0]} cy={blockC[1]} r={4.5} fill="#33343d" />

          {/* verdict */}
          <text x={IW - 50} y={50} textAnchor="end" className="ui" fontSize={18} fontWeight={700} fill={col}>
            {sticks ? "HOLDS" : "SLIPS"}
          </text>
        </svg>

        <ControlBar>
          <LabeledSlider label="θ" value={theta} min={0} max={70} step={0.5} onChange={setTheta} fmt={v => `${v.toFixed(1)}°`} width={170} />
          <LabeledSlider label="μ" value={mu} min={0.05} max={1.5} step={0.01} onChange={setMu} fmt={v => v.toFixed(2)} color={CONE_EDGE} width={170} />
          <Readout label="α = tan⁻¹μ" value={`${((alpha * 180) / Math.PI).toFixed(1)}°`} color={CONE_EDGE} />
          <Readout label="tan θ" value={Math.tan(tr).toFixed(2)} />
          <Readout label="μ" value={mu.toFixed(2)} />
          <Readout label="verdict" value={sticks ? "in cone" : "out of cone"} color={col} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch12-cone-friction" met={met} holdMs={500}>
        Balance the block on the incline. The reaction force that holds it up must stay inside the
        friction cone — that is, keep <M>{"\\tan\\theta \\le \\mu"}</M>. Find a steep ramp
        (<M>{"\\theta \\ge 25^\\circ"}</M>) and a friction coefficient large enough that the block
        still <strong>HOLDS</strong>; the block and force turn green when it is in true equilibrium
        with no slip.
      </Challenge>
    </>
  );
}
