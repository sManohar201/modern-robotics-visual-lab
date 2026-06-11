import { useMemo, useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad, AXIS_COLORS } from "../../components/three/Scene3D";
import { Mat3Display } from "../../components/widgets/MatrixDisplay";
import { type Vec3, mat3Col, rad, deg, vunit } from "../../lib/math/vec";
import { exp3, so3Distance } from "../../lib/math/so3";

// the challenge target: 120° about (1,1,1)/√3 — cyclically permutes the axes
const TARGET_AXIS = vunit([1, 1, 1]);
const TARGET = exp3(TARGET_AXIS, rad(120));

export default function ExpCoords() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 3"
        section="Rigid-Body Motions"
        title="Exponential Coordinates of Rotation"
        lede="Every orientation, no matter how it was reached, is a single rotation about a single axis. Three numbers — an axis scaled by an angle — are enough."
      />

      <p>
        On the previous page you composed many small rotations into elaborate orientations. Here
        is the astonishing cleanup, due to Euler: <em>whatever</em> orientation{" "}
        <M>{"R \\in SO(3)"}</M> your body ended in, there exists one unit axis{" "}
        <M>{"\\hat\\omega"}</M> and one angle <M>{"\\theta"}</M> such that a single turn of{" "}
        <M>{"\\theta"}</M> about <M>{"\\hat\\omega"}</M> produces <M>{"R"}</M> exactly.
      </p>
      <p>
        That gives a minimal, 3-number description of orientation: the vector{" "}
        <M>{"\\hat\\omega\\theta \\in \\mathbb{R}^3"}</M>, called the{" "}
        <strong>exponential coordinates</strong> of <M>{"R"}</M>. Steer the axis, sweep the angle:
      </p>

      <AxisAngleWidget />

      <H2>Why "exponential"?</H2>
      <p>
        Spin the body about <M>{"\\hat\\omega"}</M> at unit speed. A point at <M>{"p(t)"}</M>{" "}
        moves with velocity <M>{"\\dot p = \\hat\\omega \\times p"}</M>. Cross products are linear
        maps, so define the <strong>skew-symmetric matrix</strong>
      </p>
      <Eq>{"[\\hat\\omega] = \\begin{bmatrix} 0 & -\\hat\\omega_3 & \\hat\\omega_2 \\\\ \\hat\\omega_3 & 0 & -\\hat\\omega_1 \\\\ -\\hat\\omega_2 & \\hat\\omega_1 & 0 \\end{bmatrix}, \\qquad [\\hat\\omega]\\,p = \\hat\\omega \\times p,"}</Eq>
      <p>
        and the motion becomes the linear ODE <M>{"\\dot p = [\\hat\\omega]\\, p"}</M> — the
        matrix cousin of <M>{"\\dot x = ax"}</M>, whose solution is an exponential. After time{" "}
        <M>{"\\theta"}</M>:
      </p>
      <Eq>{"p(\\theta) = e^{[\\hat\\omega]\\theta} p(0), \\qquad R = e^{[\\hat\\omega]\\theta}."}</Eq>
      <p>
        The series <M>{"e^{[\\hat\\omega]\\theta} = I + [\\hat\\omega]\\theta + \\tfrac{1}{2!}[\\hat\\omega]^2\\theta^2 + \\cdots"}</M>{" "}
        collapses, because powers of <M>{"[\\hat\\omega]"}</M> repeat with period two
        (<M>{"[\\hat\\omega]^3 = -[\\hat\\omega]"}</M>), into the closed form you were just
        driving:
      </p>
      <Eq>{"\\boxed{\\,R = e^{[\\hat\\omega]\\theta} = I + \\sin\\theta\\,[\\hat\\omega] + (1 - \\cos\\theta)\\,[\\hat\\omega]^2\\,}"}</Eq>
      <p>
        — <strong>Rodrigues' formula</strong>. It is exact for every <M>{"\\theta"}</M>, no
        small-angle approximation anywhere. The three terms have geometry: the <M>{"I"}</M> term
        keeps the component of a vector along the axis; the <M>{"\\sin\\theta\\,[\\hat\\omega]"}</M>{" "}
        term swings it sideways; the <M>{"(1-\\cos\\theta)[\\hat\\omega]^2"}</M> term pulls it
        around the circle. That circle is exactly the trace your widget drew.
      </p>

      <H2>Coming back: the logarithm</H2>
      <p>
        The inverse map — recovering <M>{"(\\hat\\omega, \\theta)"}</M> from a matrix — is the{" "}
        <strong>matrix logarithm</strong>. From Rodrigues' formula,{" "}
        <M>{"\\operatorname{tr} R = 1 + 2\\cos\\theta"}</M> gives the angle, and the skew part{" "}
        <M>{"(R - R^\\mathsf{T})/2 = \\sin\\theta\\, [\\hat\\omega]"}</M> gives the axis. You used
        the log without knowing it: the "distance to target" readout above is{" "}
        <M>{"\\theta"}</M> of <M>{"\\log(R^\\mathsf{T} R_{\\mathrm{goal}})"}</M> — the angle of
        the single rotation still separating you from the goal.
      </p>
      <Aside>
        Exponential coordinates live in a solid ball of radius <M>{"\\pi"}</M> in{" "}
        <M>{"\\mathbb{R}^3"}</M>: direction = axis, length = angle. The only ambiguity sits on the
        boundary, where <M>{"\\hat\\omega\\pi"}</M> and <M>{"-\\hat\\omega\\pi"}</M> are the same
        rotation. Every 3-parameter description of <M>{"SO(3)"}</M> must fail <em>somewhere</em> —
        Euler angles fail at gimbal lock; exponential coordinates fail only on that sphere, far
        from the identity, which is why they are the workhorse of this book.
      </Aside>

      <KeyIdea>
        <M>{"R = e^{[\\hat\\omega]\\theta}"}</M>: orientation as a <em>completed velocity</em> —
        spin about <M>{"\\hat\\omega"}</M> for angle <M>{"\\theta"}</M>. Rodrigues' formula makes
        it computable; the matrix log inverts it. This exp/log pair is the template for all of
        SE(3) and the product of exponentials.
      </KeyIdea>

      <BookRef>Modern Robotics §3.2.3 — Exponential Coordinate Representation of Rotation.</BookRef>
    </div>
  );
}

/* ================= widget: axis-angle ================= */

function AxisAngleWidget() {
  const [az, setAz] = useState(rad(35)); // axis azimuth
  const [el, setEl] = useState(rad(30)); // axis elevation
  const [theta, setTheta] = useState(rad(50));

  const what: Vec3 = [
    Math.cos(el) * Math.cos(az),
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
  ];
  const R = useMemo(() => exp3(what, theta), [what[0], what[1], what[2], theta]); // eslint-disable-line react-hooks/exhaustive-deps

  // trace of the body x̂ tip from 0 to theta
  const tracePts = useMemo(() => {
    const pts: [number, number, number][] = [];
    const n = Math.max(2, Math.ceil(Math.abs(theta) / 0.05));
    for (let i = 0; i <= n; i++) {
      const Ri = exp3(what, (theta * i) / n);
      const c = mat3Col(Ri, 0);
      pts.push([c[0] * 1.0, c[1] * 1.0, c[2] * 1.0]);
    }
    return pts;
  }, [what[0], what[1], what[2], theta]); // eslint-disable-line react-hooks/exhaustive-deps

  const dist = so3Distance(R, TARGET);
  const met = dist < rad(10);

  return (
    <>
      <WidgetShell
        title="One axis, one angle, any orientation"
        onReset={() => {
          setAz(rad(35));
          setEl(rad(30));
          setTheta(rad(50));
        }}
        caption={
          <>
            The purple arrow is <M>{"\\hat\\omega"}</M>. The faint pale triad is the goal
            orientation for the challenge; the dotted curve is the path the body's{" "}
            <span className="cx">x̂</span> tip actually travels — a circle about the axis.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={360}>
              {/* axis (drawn both directions) */}
              <Line
                points={[
                  [-1.8 * what[0], -1.8 * what[1], -1.8 * what[2]],
                  [1.8 * what[0], 1.8 * what[1], 1.8 * what[2]],
                ]}
                color="#6741d9"
                lineWidth={3}
              />
              <mesh position={[1.8 * what[0], 1.8 * what[1], 1.8 * what[2]]}>
                <coneGeometry args={[0.055, 0.13, 14]} />
                <meshStandardMaterial color="#6741d9" />
              </mesh>
              {/* goal */}
              <Triad ghost R={TARGET} colors={["#dcb6b4", "#b8d4bd", "#b4c4dd"]} scale={1.3} />
              {/* body */}
              <Triad R={R} thickness={0.03} />
              {/* trace */}
              {tracePts.length > 1 && (
                <Line points={tracePts} color={AXIS_COLORS.x} lineWidth={2} dashed dashSize={0.04} gapSize={0.03} />
              )}
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-3 md:w-[290px]">
            <Mat3Display
              m={R}
              label={<M>{"e^{[\\hat\\omega]\\theta} ="}</M>}
              colColors={[AXIS_COLORS.x, AXIS_COLORS.y, AXIS_COLORS.z]}
            />
            <Readout label="ω̂" value={`(${what.map(v => v.toFixed(2)).join(", ")})`} color="#6741d9" />
            <Readout label="distance to goal" value={`${deg(dist).toFixed(1)}°`} color={met ? "var(--good)" : undefined} />
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="axis azim." value={az} min={-Math.PI} max={Math.PI} onChange={setAz}
            fmt={v => `${deg(v).toFixed(0)}°`} color="#6741d9" width={150} />
          <LabeledSlider label="axis elev." value={el} min={-Math.PI / 2} max={Math.PI / 2} onChange={setEl}
            fmt={v => `${deg(v).toFixed(0)}°`} color="#6741d9" width={150} />
          <LabeledSlider label="θ" value={theta} min={-Math.PI} max={Math.PI} onChange={setTheta}
            fmt={v => `${deg(v).toFixed(0)}°`} width={170} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch3-exp-match" met={met}>
        Find <M>{"(\\hat\\omega, \\theta)"}</M> that reaches the pale goal frame (within 10°). Hint:
        the goal sends <span className="cx">x̂</span>→<span className="cy">ŷ</span>→
        <span className="cz">ẑ</span>→<span className="cx">x̂</span> — a cyclic permutation. What
        axis treats all three the same way?
      </Challenge>
    </>
  );
}
