import { useEffect, useRef, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Scene3D, Triad, AXIS_COLORS } from "../../components/three/Scene3D";
import { Mat3Display } from "../../components/widgets/MatrixDisplay";
import { type Mat3, mat3Identity, mat3Mul, mat3Det, mat3Col, vdot, rad } from "../../lib/math/vec";
import { rotX, rotY, rotZ } from "../../lib/math/so3";

export default function Rotations() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 3"
        section="Rigid-Body Motions"
        title="Rotation Matrices & SO(3)"
        lede="Nine numbers to describe three degrees of freedom — and every one of the nine has a direct physical meaning you can point at."
      />

      <H2>Two frames</H2>
      <p>
        A <strong>reference frame</strong> is a choice of origin and three mutually perpendicular
        unit vectors — <span className="cx">x̂</span>, <span className="cy">ŷ</span>,{" "}
        <span className="cz">ẑ</span> — obeying the right-hand rule:{" "}
        <M>{"\\hat{x} \\times \\hat{y} = \\hat{z}"}</M>. Every vector we write as{" "}
        <M>{"(a, b, c)"}</M> is measured in some frame; the same physical arrow has different
        numerical components in a different frame.
      </p>
      <p>
        Two frames appear throughout this book. The <strong>space frame</strong>{" "}
        <M>{"\\{s\\}"}</M> is fixed to the world and never moves. The{" "}
        <strong>body frame</strong> <M>{"\\{b\\}"}</M> is attached to the rigid body and moves
        with it. Orientation is inherently relative — "how is the body turned?" only makes sense
        when you specify: turned relative to <em>what?</em> A rotation matrix answers:{" "}
        <em>how is <M>{"\\{b\\}"}</M> oriented, as measured in <M>{"\\{s\\}"}</M>?</em>
      </p>
      <p>
        Attach a frame to a rigid body: three perpendicular unit vectors{" "}
        <span className="cx">x̂</span>, <span className="cy">ŷ</span>,{" "}
        <span className="cz">ẑ</span> riding along with it (the body frame{" "}
        <M>{"\\{b\\}"}</M>). Fix another frame to the world (the space frame{" "}
        <M>{"\\{s\\}"}</M>). The orientation of the body is captured by one question:{" "}
        <em>where do the body's three axes point, measured in the space frame?</em>
      </p>
      <p>
        Each axis is a 3-vector expressed in <M>{"\\{s\\}"}</M>, so the answer is nine numbers.
        Stack them as columns and you have the rotation matrix:
      </p>
      <Eq>{"R_{sb} \\;=\\; \\begin{bmatrix} | & | & | \\\\ \\textcolor{#d9483f}{\\hat{\\mathrm{x}}_b} & \\textcolor{#2f9e44}{\\hat{\\mathrm{y}}_b} & \\textcolor{#3b6fd4}{\\hat{\\mathrm{z}}_b} \\\\ | & | & | \\end{bmatrix}"}</Eq>
      <p>
        The subscript <M>{"sb"}</M> is a reading guide: the right letter (<M>{"b"}</M>) is the
        frame being described; the left letter (<M>{"s"}</M>) is the frame doing the measuring.{" "}
        <M>{"R_{sb}"}</M> is "the body frame, expressed in the space frame." The convention scales
        naturally: <M>{"R_{ab}\\,R_{bc} = R_{ac}"}</M> — inner subscripts cancel like fractions,
        and the result skips directly from <M>{"c"}</M> to <M>{"a"}</M>. If the inner subscripts
        do not match, the product is physically meaningless.
      </p>
      <p>
        That is the whole secret. Rotate the body below and watch the columns <em>be</em> the
        axes:
      </p>

      <RotateAndRead />

      <H2>Why only 3 of the 9 numbers are free</H2>
      <p>
        The columns are not arbitrary: each is a unit vector (3 constraints) and they are mutually
        perpendicular (3 more). Six constraints on nine numbers leave{" "}
        <M>{"9 - 6 = 3"}</M> degrees of freedom — exactly the 3 dof of a rotating body that
        Chapter 2's counting promised. The six constraints pack into one tidy equation,{" "}
        <M>{"R^\\mathsf{T} R = I"}</M>, and the set of all such matrices (with{" "}
        <M>{"\\det R = +1"}</M>) is the <strong>special orthogonal group</strong>:
      </p>
      <Eq>{"SO(3) \\;=\\; \\{ R \\in \\mathbb{R}^{3\\times 3} \\;:\\; R^\\mathsf{T}R = I,\\; \\det R = +1 \\}"}</Eq>
      <p>
        You may have noticed <M>{"\\det R"}</M> frozen at <M>{"+1.00"}</M> in the widget no matter
        what you pressed. The constraint <M>{"R^\\mathsf{T}R = I"}</M> alone allows{" "}
        <M>{"\\det R = \\pm 1"}</M>, but <M>{"-1"}</M> would be a <em>mirror reflection</em> — and
        no sequence of physical rotations ever turns a right hand into a left hand. Rigid bodies
        are stuck in the <M>{"+1"}</M> component.
      </p>
      <p>
        A lovely consequence of <M>{"R^\\mathsf{T}R = I"}</M>: inversion is free,
      </p>
      <Eq>{"R^{-1} = R^\\mathsf{T}, \\qquad R_{bs} = R_{sb}^\\mathsf{T}."}</Eq>
      <p>
        SO(3) is a <em>group</em>: the product of two rotation matrices is a rotation matrix
        (closure); <M>{"I"}</M> is the identity; every element has an inverse. Crucially, it is a{" "}
        <strong>non-commutative</strong> group — <M>{"R_1 R_2 \\neq R_2 R_1"}</M> in general.
        This is physical, not algebraic: rotate a book 90° about <M>{"\\hat{x}"}</M> then 90°
        about <M>{"\\hat{z}"}</M> and compare with the reversed order. They land in different
        places. The next widget demonstrates this.
      </p>
      <p>
        The 2D version is <M>{"SO(2)"}</M> — rotation matrices in the plane:
      </p>
      <Eq>{"R = \\begin{bmatrix} \\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta \\end{bmatrix} \\in SO(2)."}</Eq>
      <p>
        Unlike SO(3), this group <em>is</em> commutative — adding angles always commutes. The
        non-commutativity of rotations is a purely 3D (and higher-dimensional) phenomenon.
      </p>

      <H2>Order matters</H2>
      <p>
        Rotations compose by matrix multiplication, and matrix multiplication does not commute.
        This is physical, not algebraic pedantry — your hand can feel it. Run both sequences:
      </p>

      <OrderMatters />

      <Quiz
        challengeId="ch3-rot-order"
        goal={<>Watch both animations to the end, then answer.</>}
        questions={[
          {
            prompt: (
              <>
                Both bodies performed a 90° rotation about <span className="cx">x̂</span> and a 90°
                rotation about <span className="cz">ẑ</span> — only the order differed. They end
                up…
              </>
            ),
            options: [
              { label: "in the same orientation" },
              { label: "in different orientations", correct: true },
              { label: "mirrored copies of each other" },
            ],
            explain: (
              <>
                Rot(ẑ, 90°)·Rot(x̂, 90°) ≠ Rot(x̂, 90°)·Rot(ẑ, 90°). SO(3) is a non-commutative
                (non-abelian) group.
              </>
            ),
          },
        ]}
      />

      <H2>One matrix, three jobs</H2>
      <p>
        The same matrix <M>{"R_{sb}"}</M> serves three distinct purposes. Keeping them straight
        eliminates most frame-related bugs.
      </p>
      <p>
        <strong>Job 1 — Represent orientation.</strong> The columns of <M>{"R_{sb}"}</M> are
        the body axes expressed in the space frame. There is nothing to compute: if you know
        where the body's <span className="cx">x̂</span>, <span className="cy">ŷ</span>, and{" "}
        <span className="cz">ẑ</span> axes point in the world, you already have the rotation
        matrix.
      </p>
      <p>
        <strong>Job 2 — Change coordinate frames.</strong> A point fixed in the body has body
        coordinates <M>{"p_b"}</M>. To find its space coordinates, pre-multiply by{" "}
        <M>{"R_{sb}"}</M>:
      </p>
      <Eq>{"p_s = R_{sb}\\, p_b."}</Eq>
      <p>
        The subscripts cancel: <M>{"s \\leftarrow \\cancel{b}\\,\\cdot\\,\\cancel{b}"}</M>. The
        physical point has not moved; only its coordinate description has changed. The chain rule
        extends naturally:{" "}
        <M>{"p_s = R_{sa}\\,R_{ab}\\,R_{bc}\\,p_c = R_{sc}\\,p_c"}</M>.
      </p>
      <p>
        <strong>Job 3 — Rotate a vector.</strong> Apply <M>{"R"}</M> to physically rotate a
        vector within a single frame: <M>{"p' = R\\, p"}</M>. Unlike Job 2, the vector itself
        changes direction — the coordinates change because the arrow points somewhere new.
      </p>
      <p>
        Jobs 2 and 3 produce identical arithmetic but mean opposite things. Job 2 re-expresses a
        fixed thing in a new language; Job 3 changes the thing itself. The context — are you
        relabelling, or actually rotating? — determines which job applies.
      </p>
      <p>
        The widget's <em>space / body</em> toggle exposes a fourth use. Applying a rotation
        about a <strong>space-frame axis</strong> means pre-multiplying:{" "}
        <M>{"R \\leftarrow R_{\\mathrm{new}}\\, R"}</M>. Applying the same rotation about the
        body's <strong>own current axis</strong> means post-multiplying:{" "}
        <M>{"R \\leftarrow R\\, R_{\\mathrm{new}}"}</M>. Left side of the product = space frame;
        right side = body frame. Same buttons, fundamentally different trajectories — go back and
        feel the difference.
      </p>

      <KeyIdea>
        <M>{"R_{sb}"}</M>'s columns are the body axes expressed in {"{s}"}. Inverse = transpose.
        Composition is multiplication, order matters: pre-multiply = about space axes,
        post-multiply = about body axes.
      </KeyIdea>

      <BookRef>Modern Robotics §3.2.1 — Rotation Matrices.</BookRef>
    </div>
  );
}

/* ================= widget 1: rotate and read ================= */

function RotateAndRead() {
  const [R, setR] = useState<Mat3>(mat3Identity());
  const [bodyAxes, setBodyAxes] = useState(false);

  const apply = (rot: Mat3) => setR(r => (bodyAxes ? mat3Mul(r, rot) : mat3Mul(rot, r)));
  const d = rad(15);

  const zCol = mat3Col(R, 2);
  const met = zCol[2] < -0.97;

  const axisBtn = (label: string, color: string, mk: (t: number) => Mat3) => (
    <span className="inline-flex gap-1">
      <WidgetButton onClick={() => apply(mk(-d))}>
        <span style={{ color }}>−15° {label}</span>
      </WidgetButton>
      <WidgetButton onClick={() => apply(mk(d))}>
        <span style={{ color }}>+15° {label}</span>
      </WidgetButton>
    </span>
  );

  return (
    <>
      <WidgetShell
        title="Rotate the body, read the matrix"
        onReset={() => setR(mat3Identity())}
        caption={
          <>
            The faint triad is the space frame {"{s}"}; the bright one is the body frame {"{b}"}.
            Column colors in the matrix match the body axes. Drag the view to orbit.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={340}>
              <Triad ghost colors={["#dcb6b4", "#b8d4bd", "#b4c4dd"]} scale={1.35} />
              <Triad R={R} scale={1} thickness={0.03} />
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-3 md:w-[290px]">
            <Mat3Display
              m={R}
              label={<M>{"R_{sb} ="}</M>}
              colColors={[AXIS_COLORS.x, AXIS_COLORS.y, AXIS_COLORS.z]}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <Readout label="det R" value={mat3Det(R).toFixed(2)} />
              <Readout label="x̂b·ŷb" value={vdot(mat3Col(R, 0), mat3Col(R, 1)).toFixed(2)} />
              <Readout label="|x̂b|" value={Math.hypot(...mat3Col(R, 0)).toFixed(2)} />
            </div>
          </div>
        </div>

        <ControlBar>
          {axisBtn("x̂", AXIS_COLORS.x, rotX)}
          {axisBtn("ŷ", AXIS_COLORS.y, rotY)}
          {axisBtn("ẑ", AXIS_COLORS.z, rotZ)}
          <span className="flex-1" />
          <WidgetButton onClick={() => setBodyAxes(b => !b)} active={bodyAxes}>
            {bodyAxes ? "rotating about body axes" : "rotating about space axes"}
          </WidgetButton>
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch3-rot-pointdown" met={met}>
        Make the body's <span className="cz">ẑ-axis</span> point straight <em>down</em> — i.e.
        make the third column read <span className="mono">(0, 0, −1)</span>. Read the matrix, not
        the picture, to confirm.
      </Challenge>
    </>
  );
}

/* ================= widget 2: order matters ================= */

function OrderMatters() {
  const [t, setT] = useState(0); // progress 0..2
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT(prev => {
        const next = prev + dt * 0.8;
        if (next >= 2) {
          setPlaying(false);
          return 2;
        }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const a1 = rad(90) * Math.min(1, t); // first rotation progress
  const a2 = rad(90) * Math.max(0, Math.min(1, t - 1)); // second

  // space-frame rotations: pre-multiply
  const Rleft = mat3Mul(rotZ(a2), rotX(a1)); // x̂ first, then ẑ
  const Rright = mat3Mul(rotX(a2), rotZ(a1)); // ẑ first, then x̂

  const phase =
    t === 0 ? "ready" : t < 1 ? "first rotation…" : t < 2 ? "second rotation…" : "done — compare!";

  return (
    <WidgetShell
      title="The same two rotations, in opposite order"
      onReset={() => {
        setT(0);
        setPlaying(false);
      }}
      caption={
        <>
          Left: 90° about <span className="cx">x̂</span>, then 90° about{" "}
          <span className="cz">ẑ</span> (space axes). Right: same rotations, opposite order.
        </>
      }
    >
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <div className="ui text-[11.5px] font-semibold text-[var(--ink-faint)] mb-1.5 text-center">
            Rot(<span className="cz">ẑ</span>,90°) · Rot(<span className="cx">x̂</span>,90°)
          </div>
          <Scene3D height={270} camera={[2.6, 2, 2.6]}>
            <RotatingDie R={Rleft} />
          </Scene3D>
        </div>
        <div className="flex-1 min-w-0">
          <div className="ui text-[11.5px] font-semibold text-[var(--ink-faint)] mb-1.5 text-center">
            Rot(<span className="cx">x̂</span>,90°) · Rot(<span className="cz">ẑ</span>,90°)
          </div>
          <Scene3D height={270} camera={[2.6, 2, 2.6]}>
            <RotatingDie R={Rright} />
          </Scene3D>
        </div>
      </div>
      <ControlBar>
        <WidgetButton onClick={() => { if (t >= 2) setT(0); setPlaying(p => !p); }}>
          {playing ? "pause" : t >= 2 ? "replay" : "play both"}
        </WidgetButton>
        <Readout label="phase" value={phase} />
      </ControlBar>
    </WidgetShell>
  );
}

function RotatingDie({ R }: { R: Mat3 }) {
  // column-major quaternion-free: build three.js matrix from our row-major Mat3
  return (
    <group
      matrixAutoUpdate={false}
      // three.Matrix4.set takes row-major arguments
      ref={g => {
        if (g) g.matrix.set(R[0], R[1], R[2], 0, R[3], R[4], R[5], 0, R[6], R[7], R[8], 0, 0, 0, 0, 1);
      }}
    >
      <mesh>
        <boxGeometry args={[1.1, 1.1, 1.1]} />
        <meshStandardMaterial color="#e8e2d2" transparent opacity={0.85} />
      </mesh>
      <Triad scale={1.15} thickness={0.028} />
    </group>
  );
}
