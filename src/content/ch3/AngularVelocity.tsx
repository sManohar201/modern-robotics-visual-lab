import { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Scene3D, Arrow, Triad, PosedGroup } from "../../components/three/Scene3D";
import { Mat3Display, VecDisplay } from "../../components/widgets/MatrixDisplay";
import {
  type Vec3, type Mat3, mat3Identity, mat3Mul, mat3MulVec, mat3Transpose, mat3Col,
  vcross, vdot, vnorm, vunit, clamp, rad, deg,
} from "../../lib/math/vec";
import { skew, exp3, rotX, rotY, rotZ } from "../../lib/math/so3";

export default function AngularVelocity() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 3"
        section="Rigid-Body Motions"
        title="Angular Velocity & Skew Matrices"
        lede="The derivative of a rotation matrix encodes how fast the body is turning — but only after we introduce the right algebraic object to read it."
      />

      <p>
        The previous page described <em>where</em> a body is, via the rotation matrix{" "}
        <M>{"R"}</M>. Now we ask: <em>how fast is it turning?</em> The answer is the angular
        velocity vector <M>{"\\omega"}</M>, and its relationship to <M>{"R"}</M> and{" "}
        <M>{"\\dot{R}"}</M> passes through an algebraic object called the skew-symmetric matrix.
        That object appears throughout the rest of this book — in exponential coordinates,
        twists, Jacobians, and dynamics — so it is worth understanding carefully.
      </p>

      <H2>Angular velocity</H2>
      <p>
        Imagine a rigid body rotating about a fixed axis <M>{"\\hat{\\omega}"}</M> (a unit vector)
        at an angular speed <M>{"\\dot{\\theta}"}</M> (radians per second). Its{" "}
        <strong>angular velocity</strong> is the single vector
      </p>
      <Eq>{"\\omega = \\hat{\\omega}\\,\\dot{\\theta} \\;\\in\\; \\mathbb{R}^3."}</Eq>
      <p>
        Direction encodes the rotation axis (right-hand rule: curl your fingers in the direction
        of rotation and your thumb points along <M>{"\\omega"}</M>); magnitude encodes speed. When
        the axis itself changes over time, <M>{"\\omega(t)"}</M> varies accordingly.
      </p>
      <p>
        A common misconception: angular velocity is <em>not</em> the derivative of any single
        angle coordinate. For a body in general rotation, <M>{"\\dot{R}"}</M> is a 3×3 matrix
        of nine derivatives, yet the physical angular velocity is only three numbers. Understanding
        how to extract those three numbers from <M>{"\\dot{R}"}</M> is the central goal of this
        page.
      </p>

      <H2>How points on the body move</H2>
      <p>
        Fix a coordinate frame to the world. Consider any point <M>{"p"}</M> that is fixed in
        the rotating body (so it moves in space as the body rotates). Because its distance from
        the rotation axis is fixed, its velocity is purely tangential:
      </p>
      <Eq>{"\\dot{p} = \\omega \\times p."}</Eq>
      <p>
        This follows from the definition of the cross product: <M>{"\\omega \\times p"}</M> has
        magnitude <M>{"|\\omega||p|\\sin\\alpha"}</M> (where <M>{"\\alpha"}</M> is the angle
        between <M>{"\\omega"}</M> and <M>{"p"}</M>) and points perpendicular to both, exactly
        as the right-hand rule for rotation demands. The same <M>{"\\omega"}</M> governs every
        point of the body simultaneously — the rigidity constraint means all points share one
        angular velocity.
      </p>

      <H2>The skew-symmetric matrix <M>{"[\\omega]"}</M></H2>
      <p>
        The cross product <M>{"\\omega \\times p"}</M> is linear in <M>{"p"}</M>: double{" "}
        <M>{"p"}</M> and the cross product doubles; add two vectors and the cross product adds.
        Any linear map on <M>{"\\mathbb{R}^3"}</M> can be written as a 3×3 matrix. The matrix
        that implements <M>{"\\omega \\times (\\cdot)"}</M> is the{" "}
        <strong>skew-symmetric bracket</strong> of <M>{"\\omega"}</M>:
      </p>
      <Eq>{"[\\omega] = \\begin{bmatrix} 0 & -\\omega_3 & \\omega_2 \\\\ \\omega_3 & 0 & -\\omega_1 \\\\ -\\omega_2 & \\omega_1 & 0 \\end{bmatrix}, \\qquad [\\omega]\\, p = \\omega \\times p."}</Eq>
      <p>
        The bracket <M>{"[\\cdot]"}</M> converts a 3-vector into a 3×3 matrix. Its defining
        property is skew-symmetry: <M>{"[\\omega]^\\mathsf{T} = -[\\omega]"}</M> — the matrix is
        antisymmetric about the main diagonal, which is all zeros.
      </p>
      <p>
        The bracket is a bijection: every skew-symmetric matrix corresponds to a unique vector
        in <M>{"\\mathbb{R}^3"}</M>, so no information is lost. The inverse map extracts the
        vector from the matrix by reading off the three independent entries. Check the claim
        with your own numbers:
      </p>

      <SkewDemo />

      <H2>so(3) — the Lie algebra of SO(3)</H2>
      <p>
        The set of all 3×3 real skew-symmetric matrices is called <M>{"\\mathfrak{so}(3)"}</M>{" "}
        (pronounced "little so three") and is the <strong>Lie algebra</strong> of SO(3). The
        geometric picture: SO(3) is a curved surface (a 3-dimensional manifold) in the space of
        all 3×3 matrices, and <M>{"\\mathfrak{so}(3)"}</M> is the flat tangent plane to that
        surface at the identity <M>{"I"}</M>.
      </p>
      <p>
        Just as the tangent line to a curve at a point encodes the instantaneous direction of
        travel, an element of <M>{"\\mathfrak{so}(3)"}</M> encodes the instantaneous rotation
        of the body. The exponential map connects the algebra to the group:
      </p>
      <Eq>{"\\exp : \\mathfrak{so}(3) \\to SO(3), \\qquad [\\hat{\\omega}]\\,\\theta \\;\\mapsto\\; e^{[\\hat{\\omega}]\\theta} \\in SO(3)."}</Eq>
      <p>
        This map — and its inverse, the matrix logarithm — is the subject of the next page on
        exponential coordinates. For now, keep the picture in mind: skew-symmetric matrices
        live in the tangent space, and the exponential lifts them onto the rotation group.
      </p>

      <H2>The conjugation identity</H2>
      <p>
        One identity involving the bracket appears so frequently that it deserves explicit
        statement:
      </p>
      <Eq>{"R\\,[\\omega]\\,R^\\mathsf{T} = [R\\omega]."}</Eq>
      <p>
        In words: conjugating a skew-symmetric matrix by a rotation matrix gives the
        skew-symmetric matrix of the rotated vector. The left side rotates the 3×3 matrix; the
        right side rotates the 3-vector inside the bracket. They are equal.
      </p>
      <p>
        Why does this matter? Whenever a cross product appears in one coordinate frame and must
        be moved to another, this identity allows the rotation to pass through the bracket. It
        appears in every Jacobian derivation, in the velocity kinematics of Chapter 5, and in
        the dynamics equations of Chapter 8.
      </p>
      <Aside>
        Proof in one line: <M>{"R[\\omega]R^\\mathsf{T} v = R(\\omega \\times R^\\mathsf{T}v) = R\\omega \\times RR^\\mathsf{T}v = [R\\omega]v"}</M>,
        using the cross-product identity <M>{"R(a \\times b) = Ra \\times Rb"}</M>.
      </Aside>

      <H2>Space and body angular velocity</H2>
      <p>
        The columns of <M>{"R"}</M> are the body axes expressed in the space frame. Differentiating
        the first column (the body's <span className="cx">x̂</span>-axis):
      </p>
      <Eq>{"\\dot{r}_1 = \\omega_s \\times r_1 = [\\omega_s]\\, r_1."}</Eq>
      <p>
        The same relationship holds for all three columns simultaneously, giving{" "}
        <M>{"\\dot{R} = [\\omega_s]\\, R"}</M>. Rearranging (right-multiplying by{" "}
        <M>{"R^\\mathsf{T}"}</M>, using <M>{"R R^\\mathsf{T} = I"}</M>):
      </p>
      <Eq>{"[\\omega_s] = \\dot{R}\\, R^\\mathsf{T} \\qquad \\text{(space angular velocity).}"}</Eq>
      <p>
        Left-multiplying by <M>{"R^\\mathsf{T}"}</M> instead gives the{" "}
        <strong>body angular velocity</strong>:
      </p>
      <Eq>{"[\\omega_b] = R^\\mathsf{T}\\dot{R} \\qquad \\text{(body angular velocity).}"}</Eq>
      <p>
        Both are skew-symmetric (confirm this: <M>{"(\\dot{R}R^\\mathsf{T})^\\mathsf{T} = R\\dot{R}^\\mathsf{T} = -(\\dot{R}R^\\mathsf{T})"}</M>,
        using <M>{"\\frac{d}{dt}(RR^\\mathsf{T}) = 0"}</M>). The two representations are related by
      </p>
      <Eq>{"\\omega_s = R\\,\\omega_b \\qquad \\Leftrightarrow \\qquad \\omega_b = R^\\mathsf{T}\\omega_s."}</Eq>
      <p>
        <strong>Physical interpretation.</strong> <M>{"\\omega_s"}</M> is the angular velocity
        expressed in the fixed world frame — what a gyroscope bolted to the floor would read.{" "}
        <M>{"\\omega_b"}</M> is the angular velocity expressed in the body's own frame — what an
        inertial measurement unit (IMU) strapped to the robot would measure. Both describe the
        identical physical rotation; they are the same vector in different coordinates.
      </p>

      <SpinningBodyWidget />

      <Quiz
        challengeId="ch3-angvel-quiz"
        goal={<>Lock in the frame bookkeeping — answer from the formulas, peek at the widget if unsure.</>}
        questions={[
          {
            prompt: (
              <>
                An IMU strapped to the spinning body reports angular velocity in its own
                coordinates. That reading is…
              </>
            ),
            options: [
              { label: <M>{"\\omega_b"}</M>, correct: true },
              { label: <M>{"\\omega_s"}</M> },
              { label: "both — they are always equal" },
            ],
            explain: (
              <>
                Onboard sensors measure in body coordinates: <M>{"\\omega_b = R^\\mathsf{T}\\omega_s"}</M>.
              </>
            ),
          },
          {
            prompt: <>The two representations are related by…</>,
            options: [
              { label: <M>{"\\omega_s = R\\,\\omega_b"}</M>, correct: true },
              { label: <M>{"\\omega_s = R^\\mathsf{T}\\omega_b"}</M> },
              { label: <M>{"\\omega_s = -\\omega_b"}</M> },
            ],
            explain: (
              <>
                <M>{"R_{sb}"}</M> converts body coordinates to space coordinates — the subscripts
                cancel: <M>{"\\omega_s = R_{sb}\\,\\omega_b"}</M>.
              </>
            ),
          },
          {
            prompt: (
              <>
                <M>{"\\dot{R}R^\\mathsf{T}"}</M> equals…
              </>
            ),
            options: [
              { label: <M>{"[\\omega_s]"}</M>, correct: true },
              { label: <M>{"[\\omega_b]"}</M> },
              { label: <M>{"I"}</M> },
            ],
            explain: (
              <>
                From <M>{"\\dot{R} = [\\omega_s]R"}</M>: right-multiply by <M>{"R^\\mathsf{T}"}</M>.
                Left-multiplying instead gives <M>{"R^\\mathsf{T}\\dot{R} = [\\omega_b]"}</M>.
              </>
            ),
          },
        ]}
      />

      <KeyIdea>
        <M>{"[\\omega]"}</M> converts cross products to matrix multiplication:{" "}
        <M>{"[\\omega]\\,p = \\omega \\times p"}</M>, with{" "}
        <M>{"[\\omega]^\\mathsf{T} = -[\\omega]"}</M>. From differentiating <M>{"R"}</M>:{" "}
        <M>{"[\\omega_s] = \\dot{R}R^\\mathsf{T}"}</M> (space) and{" "}
        <M>{"[\\omega_b] = R^\\mathsf{T}\\dot{R}"}</M> (body). Same spin, different frames;
        related by <M>{"\\omega_s = R\\,\\omega_b"}</M>.
      </KeyIdea>

      <BookRef>Modern Robotics §3.2.2 — Angular Velocities.</BookRef>
    </div>
  );
}

/* ================= widget 1: the bracket is the cross product ================= */

function SkewDemo() {
  const [w, setW] = useState<Vec3>([0.3, 0.25, 0.9]);
  const [p, setP] = useState<Vec3>([0.9, 0.25, 0.4]);

  const W = skew(w);
  const Wp = mat3MulVec(W, p);
  const wxp = vcross(w, p);
  const wn = vnorm(w);

  // the circle p would trace if the body actually rotated about ω
  const circle = useMemo(() => {
    if (vnorm(w) < 0.05 || vnorm(p) < 0.05) return [] as [number, number, number][];
    const axis = vunit(w);
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 72; i++) {
      const q = mat3MulVec(exp3(axis, (i / 72) * 2 * Math.PI), p);
      pts.push([q[0], q[1], q[2]]);
    }
    return pts;
  }, [w[0], w[1], w[2], p[0], p[1], p[2]]); // eslint-disable-line react-hooks/exhaustive-deps

  const setWi = (i: number) => (v: number) =>
    setW(prev => { const n = [...prev] as Vec3; n[i] = v; return n; });
  const setPi = (i: number) => (v: number) =>
    setP(prev => { const n = [...prev] as Vec3; n[i] = v; return n; });

  return (
    <WidgetShell
      title="The bracket is the cross product"
      onReset={() => {
        setW([0.3, 0.25, 0.9]);
        setP([0.9, 0.25, 0.4]);
      }}
      caption={
        <>
          The orange arrow is the velocity <M>{"[\\omega]p"}</M>, drawn at the tip of{" "}
          <M>{"p"}</M> (scaled ×0.55 for legibility). It is always tangent to the dashed circle
          that <M>{"p"}</M> would trace when rotating about the purple <M>{"\\omega"}</M> — and
          the two number columns never disagree.
        </>
      }
    >
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1 min-w-0">
          <Scene3D height={330}>
            {wn > 0.1 && <Arrow dir={w} length={wn * 1.4} color="#6741d9" />}
            {vnorm(p) > 0.1 && <Arrow dir={p} length={vnorm(p)} color="#50525e" thickness={0.018} />}
            {circle.length > 1 && (
              <Line points={circle} color="#b5aa92" lineWidth={1.5} dashed dashSize={0.045} gapSize={0.035} />
            )}
            {vnorm(Wp) > 0.06 && (
              <group position={p}>
                <Arrow dir={Wp} length={vnorm(Wp) * 0.55} color="#c2571c" />
              </group>
            )}
          </Scene3D>
        </div>
        <div className="ui flex flex-col justify-center gap-3 md:w-[300px]">
          <Mat3Display m={W} label={<M>{"[\\omega] ="}</M>} />
          <div className="flex gap-4">
            <VecDisplay v={Wp} label={<M>{"[\\omega]p ="}</M>} color="#c2571c" />
            <VecDisplay v={wxp} label={<M>{"\\omega \\times p ="}</M>} color="#c2571c" />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            <Readout label="ω·([ω]p)" value={vdot(w, Wp).toFixed(2)} />
            <Readout label="p·([ω]p)" value={vdot(p, Wp).toFixed(2)} />
          </div>
        </div>
      </div>

      <ControlBar>
        <LabeledSlider label="ω₁" value={w[0]} min={-1} max={1} onChange={setWi(0)} color="#6741d9" width={100} />
        <LabeledSlider label="ω₂" value={w[1]} min={-1} max={1} onChange={setWi(1)} color="#6741d9" width={100} />
        <LabeledSlider label="ω₃" value={w[2]} min={-1} max={1} onChange={setWi(2)} color="#6741d9" width={100} />
        <LabeledSlider label="p₁" value={p[0]} min={-1} max={1} onChange={setPi(0)} width={100} />
        <LabeledSlider label="p₂" value={p[1]} min={-1} max={1} onChange={setPi(1)} width={100} />
        <LabeledSlider label="p₃" value={p[2]} min={-1} max={1} onChange={setPi(2)} width={100} />
      </ControlBar>
    </WidgetShell>
  );
}

/* ================= widget 2: spinning body, two readouts ================= */

function SpinningBodyWidget() {
  const [az, setAz] = useState(rad(-35));
  const [el, setEl] = useState(rad(20));
  const [speed, setSpeed] = useState(1.2);
  const [playing, setPlaying] = useState(true);
  const [R, setR] = useState<Mat3>(mat3Identity());

  const what: Vec3 = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  const axRef = useRef<Vec3>(what);
  const spdRef = useRef(speed);
  axRef.current = what;
  spdRef.current = speed;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setR(r => mat3Mul(exp3(axRef.current, spdRef.current * dt), r));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const ws: Vec3 = [what[0] * speed, what[1] * speed, what[2] * speed];
  const wb = mat3MulVec(mat3Transpose(R), ws);
  const zb = mat3Col(R, 2);
  const cosAlign = clamp(vdot(zb, what), -1, 1);
  const alignDeg = deg(Math.acos(cosAlign));
  const met = playing && speed > 0.1 && cosAlign > 0.99;

  const nudge = (mk: (t: number) => Mat3, s: number) => setR(r => mat3Mul(mk(s), r));
  const nudgeBtns = (label: string, color: string, mk: (t: number) => Mat3) => (
    <span className="inline-flex gap-1">
      <WidgetButton onClick={() => nudge(mk, rad(-15))}>
        <span style={{ color }}>−{label}</span>
      </WidgetButton>
      <WidgetButton onClick={() => nudge(mk, rad(15))}>
        <span style={{ color }}>+{label}</span>
      </WidgetButton>
    </span>
  );

  return (
    <>
      <WidgetShell
        title="One spin, two descriptions"
        onReset={() => {
          setAz(rad(-35));
          setEl(rad(20));
          setSpeed(1.2);
          setR(mat3Identity());
          setPlaying(true);
        }}
        caption={
          <>
            The purple arrow is the spin axis, fixed in space; the body turns about it
            continuously. <M>{"\\omega_s"}</M> comes straight from the sliders;{" "}
            <M>{"\\omega_b = R^\\mathsf{T}\\omega_s"}</M> is the same arrow in body coordinates.
            Nudge the body and watch <M>{"\\omega_b"}</M> jump while <M>{"\\omega_s"}</M> ignores
            you.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={350}>
              <Arrow dir={what} length={1.6} color="#6741d9" />
              <Line
                points={[[0, 0, 0], [-1.6 * what[0], -1.6 * what[1], -1.6 * what[2]]]}
                color="#6741d9"
                lineWidth={1.5}
                transparent
                opacity={0.35}
              />
              <PosedGroup R={R}>
                <mesh>
                  <boxGeometry args={[0.85, 0.6, 0.4]} />
                  <meshStandardMaterial color="#e8e2d2" transparent opacity={0.85} />
                </mesh>
                <Triad scale={1.05} thickness={0.028} />
              </PosedGroup>
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-3 md:w-[270px]">
            <div className="flex gap-4">
              <VecDisplay v={ws} label={<M>{"\\omega_s ="}</M>} color="#6741d9" />
              <VecDisplay v={wb} label={<M>{"\\omega_b ="}</M>} color="#c2571c" />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <Readout
                label="∠(ẑ_b, ω̂)"
                value={`${alignDeg.toFixed(1)}°`}
                color={cosAlign > 0.99 ? "var(--good)" : undefined}
              />
              <Readout label="|ω|" value={speed.toFixed(2)} />
            </div>
          </div>
        </div>

        <ControlBar>
          <WidgetButton onClick={() => setPlaying(pl => !pl)} active={playing}>
            {playing ? "pause" : "spin"}
          </WidgetButton>
          <LabeledSlider label="axis azim." value={az} min={-Math.PI} max={Math.PI} onChange={setAz}
            fmt={v => `${deg(v).toFixed(0)}°`} color="#6741d9" width={130} />
          <LabeledSlider label="axis elev." value={el} min={-Math.PI / 2} max={Math.PI / 2} onChange={setEl}
            fmt={v => `${deg(v).toFixed(0)}°`} color="#6741d9" width={130} />
          <LabeledSlider label="speed" value={speed} min={0} max={3} onChange={setSpeed} width={110} />
          <span className="text-[12px] text-[var(--ink-faint)]">nudge body:</span>
          {nudgeBtns("x̂", "#d9483f", rotX)}
          {nudgeBtns("ŷ", "#2f9e44", rotY)}
          {nudgeBtns("ẑ", "#3b6fd4", rotZ)}
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch3-angvel-body" met={met}>
        Make the body feel the spin about <em>its own</em> <span className="cz">ẑ</span>-axis:
        get <M>{"\\omega_b"}</M> to read <span className="mono">(0, 0, |ω|)</span> — i.e. drive
        the ∠(ẑ_b, ω̂) readout under 8° while spinning. Steer the axis sliders onto the body's
        blue arrow, or nudge the body onto the axis. Notice that once aligned it <em>stays</em>{" "}
        aligned: a body spinning about its own ẑ keeps that axis fixed, so an onboard IMU reads
        a constant <M>{"\\omega_b"}</M>.
      </Challenge>
    </>
  );
}
