import { useEffect, useMemo, useState } from "react";
import { Line } from "@react-three/drei";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Arrow, Triad, PosedGroup } from "../../components/three/Scene3D";
import { Vec6Display } from "../../components/widgets/MatrixDisplay";
import { type Vec3, type Vec6, vadd, vcross, vnorm, vsub, rad, deg } from "../../lib/math/vec";
import { rotZ, so3Distance } from "../../lib/math/so3";
import { type SE3, exp6, screwFromAxisPoint, se3Mul, se3Inv, adjointApply } from "../../lib/math/se3";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const W_COLOR = "#6741d9"; // angular component / screw axis
const V_COLOR = "#0b7285"; // linear component

export default function Twists() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 3"
        section="Rigid-Body Motions"
        title="Twists & Screw Motions"
        lede="A rigid body's velocity is six numbers, and any rigid-body displacement — however complex — is equivalent to a single rotation and translation about one axis."
      />

      <p>
        So far, rotation matrices and <M>{"T"}</M> matrices describe{" "}
        <em>configurations</em> — static snapshots of where a body is. Now we describe{" "}
        <em>motion</em>: the velocity of a moving rigid body. A rigid body has 6 DOF, so its
        velocity has 6 components. Packaging them correctly is not just convenience — it reveals
        a deep geometric structure that underlies forward kinematics, the Jacobian, and dynamics.
      </p>

      <H2>Rigid body velocity: the twist</H2>
      <p>
        Any instantaneous motion of a rigid body can be described by two vectors:
      </p>
      <p>
        The <strong>angular velocity</strong> <M>{"\\omega \\in \\mathbb{R}^3"}</M> — how fast
        and about what axis the body is spinning (from the previous page).
      </p>
      <p>
        The <strong>linear velocity</strong> <M>{"v \\in \\mathbb{R}^3"}</M> — the velocity of
        the body frame's origin.
      </p>
      <p>
        Stack them into a single 6-vector called the <strong>twist</strong>:
      </p>
      <Eq>{"\\mathcal{V} = \\begin{bmatrix} \\omega \\\\ v \\end{bmatrix} \\in \\mathbb{R}^6."}</Eq>
      <p>
        Angular velocity comes first. This ordering is a convention, but it is not arbitrary:
        it matches the block structure of the <M>{"T"}</M> matrix (rotation block on top) and
        makes all subsequent formulas — Jacobians, adjoint, dynamics — consistent.
      </p>

      <H2>Chasles-Mozzi theorem: every motion is a screw</H2>
      <p>
        A body simultaneously rotating and translating looks complicated. The Chasles-Mozzi
        theorem says it is not:
      </p>
      <KeyIdea>
        Every rigid body displacement (no matter how it was composed) is equivalent to a rotation
        about some axis combined with a translation <em>along that same axis</em>. This combined
        motion is called a <strong>screw motion</strong>.
      </KeyIdea>
      <p>
        The axis is called the <strong>screw axis</strong>. The ratio of translation to rotation
        is the <strong>pitch</strong> <M>{"h"}</M> (units: distance per radian). Three cases
        cover every possibility:
      </p>
      <p>
        <M>{"h = 0"}</M> — <strong>pure rotation.</strong> No translation along the axis. A door
        swinging on its hinge: the hinge is the screw axis, and the door rotates about it with
        no forward motion along the hinge.
      </p>
      <p>
        <M>{"h \\to \\infty"}</M> — <strong>pure translation.</strong> The angular velocity goes
        to zero, but the product <M>{"h\\omega"}</M> remains finite (the translational component).
        A drawer sliding open: motion along a line with no rotation.
      </p>
      <p>
        <M>{"0 &lt; h &lt; \\infty"}</M> — <strong>helical motion.</strong> Genuine screw:
        rotation and translation are coupled. Tightening a bolt is the everyday example — each
        turn advances the bolt by the thread pitch.
      </p>

      <ScrewPitchWidget />

      <H2>The screw axis</H2>
      <p>
        A screw axis in space is defined by three pieces of data: a unit direction{" "}
        <M>{"\\hat{\\omega}"}</M>, a point <M>{"q"}</M> on the axis, and the pitch{" "}
        <M>{"h"}</M>. Together these determine the unit screw axis:
      </p>
      <Eq>{"\\mathcal{S} = \\begin{bmatrix} \\hat{\\omega} \\\\ v \\end{bmatrix}, \\quad v = -\\hat{\\omega} \\times q + h\\hat{\\omega}."}</Eq>
      <p>
        The term <M>{"-\\hat{\\omega} \\times q"}</M> requires explanation. When a body rotates
        about an axis that does not pass through the world origin, the origin of the body frame
        moves even though the axis does not. The cross product <M>{"\\hat{\\omega} \\times q"}</M>{" "}
        gives the velocity of the world origin due to the rotation; negating it gives the velocity
        component that cancels out so that points on the axis remain stationary. The pitch term{" "}
        <M>{"h\\hat{\\omega}"}</M> adds the translational motion along the axis.
      </p>
      <p>
        Special cases for the joints we met in Chapter 2:
      </p>
      <p>
        <strong>Revolute joint</strong> at position <M>{"q"}</M> along axis{" "}
        <M>{"\\hat{\\omega}"}</M>: pitch <M>{"h = 0"}</M>, so{" "}
        <M>{"v = -\\hat{\\omega} \\times q"}</M>.
      </p>
      <p>
        <strong>Prismatic joint</strong> along direction <M>{"\\hat{d}"}</M>: no rotation, so{" "}
        <M>{"\\omega = 0"}</M> and <M>{"v = \\hat{d}"}</M>. The screw axis points in the direction
        of translation and lies at infinity (no finite <M>{"q"}</M>).
      </p>
      <p>
        <strong>Helical (screw) joint</strong>: <M>{"\\omega = \\hat{\\omega}"}</M>,{" "}
        <M>{"v = -\\hat{\\omega} \\times q + h\\hat{\\omega}"}</M> — the general case.
      </p>

      <ScrewAxisWidget />

      <H2>Space twist and body twist</H2>
      <p>
        Just as angular velocity has two representations — space frame and body frame — a full
        twist has two representations. For the same physical motion:
      </p>
      <p>
        The <strong>space twist</strong> <M>{"\\mathcal{V}_s = (\\omega_s, v_s)"}</M> expresses
        angular velocity in <M>{"\\{s\\}"}</M> and the velocity of the body frame's origin,
        also in <M>{"\\{s\\}"}</M>. This is what a stationary observer measures.
      </p>
      <p>
        The <strong>body twist</strong> <M>{"\\mathcal{V}_b = (\\omega_b, v_b)"}</M> expresses
        angular velocity in <M>{"\\{b\\}"}</M>. The linear component <M>{"v_b"}</M> is not the
        velocity of the body origin — it is the velocity of the point on the body currently
        coincident with the <em>space frame origin</em>, expressed in the body frame.
      </p>
      <p>
        The definition of <M>{"v_b"}</M> is deliberately chosen this way. It makes the
        product-of-exponentials formula in Chapter 4 clean, and it is the convention used
        consistently throughout Lynch &amp; Park.
      </p>
      <Aside>
        Correction to a near-universal misreading: <M>{"v_s"}</M> is likewise <em>not</em> the
        body-origin velocity — it is the velocity of the body-point currently passing through
        the <em>space origin</em>, in space coordinates. The widget below marks both points.
      </Aside>

      <SpaceBodyTwistWidget />

      <H2>The <M>{"[\\mathcal{S}]"}</M> matrix and se(3)</H2>
      <p>
        To use the matrix exponential for rigid-body displacements, we need a matrix
        representation of twists, just as we needed <M>{"[\\hat{\\omega}]"}</M> for angular
        velocity. The <strong>twist matrix</strong> is a 4×4 matrix:
      </p>
      <Eq>{"[\\mathcal{S}] = \\begin{bmatrix} [\\omega] & v \\\\ 0 & 0 \\end{bmatrix} \\in \\mathbb{R}^{4 \\times 4},"}</Eq>
      <p>
        where <M>{"[\\omega]"}</M> is the 3×3 skew-symmetric matrix of the angular velocity
        component, and <M>{"v"}</M> is the 3×1 linear velocity component. The bottom row is all
        zeros (compare with the bottom row of <M>{"T"}</M>, which is <M>{"[0\\;0\\;0\\;1]"}</M>).
      </p>
      <p>
        The set of all such matrices is <M>{"\\mathfrak{se}(3)"}</M>, the <strong>Lie algebra</strong>{" "}
        of <M>{"SE(3)"}</M> — the tangent space to the group at the identity. This mirrors the
        relationship between <M>{"\\mathfrak{so}(3)"}</M> and <M>{"SO(3)"}</M>:
      </p>
      <Eq>{"\\mathfrak{so}(3) \\xrightarrow{\\exp} SO(3), \\qquad \\mathfrak{se}(3) \\xrightarrow{\\exp} SE(3)."}</Eq>

      <H2>Rigid-body displacement: <M>{"T = e^{[\\mathcal{S}]\\theta}"}</M></H2>
      <p>
        The exponential map for rigid-body displacements follows the same logic as for rotations.
        A body following a constant screw motion <M>{"\\mathcal{S}"}</M> for "distance"{" "}
        <M>{"\\theta"}</M> (radians, if <M>{"\\omega \\neq 0"}</M>; metres, if{" "}
        <M>{"\\omega = 0"}</M>) traces a helical path, and its final pose is
      </p>
      <Eq>{"T = e^{[\\mathcal{S}]\\theta}."}</Eq>
      <p>
        The closed form for this exponential (Rodrigues extended to SE(3)) is:
      </p>
      <Eq>{"e^{[\\mathcal{S}]\\theta} = \\begin{bmatrix} e^{[\\hat{\\omega}]\\theta} & G\\theta\\, v \\\\ 0 & 1 \\end{bmatrix},"}</Eq>
      <p>
        where <M>{"G = I\\theta + (1 - \\cos\\theta)[\\hat{\\omega}] + (\\theta - \\sin\\theta)[\\hat{\\omega}]^2"}</M>{" "}
        and <M>{"\\mathcal{S} = (\\hat{\\omega}, v)"}</M>. The top-left block is the familiar
        Rodrigues rotation. For a pure translation (<M>{"\\omega = 0"}</M>), this reduces to{" "}
        <M>{"T = \\begin{bmatrix} I & v\\theta \\\\ 0 & 1 \\end{bmatrix}"}</M> — exactly a
        displacement of <M>{"v\\theta"}</M> with no rotation.
      </p>
      <p>
        This formula is the foundation of the{" "}
        <strong>product of exponentials</strong> approach to forward kinematics in Chapter 4:
        each joint in the chain contributes one exponential factor, and the end-effector pose
        is their product.
      </p>
      <Aside>
        The six parameters <M>{"\\mathcal{S}\\theta \\in \\mathbb{R}^6"}</M> are the{" "}
        <em>exponential coordinates</em> of the rigid-body displacement <M>{"T"}</M>. The
        logarithm map inverts this: given any <M>{"T \\in SE(3)"}</M>, the unique (away from
        singularities) screw axis and angle can be recovered.
      </Aside>

      <H2>The adjoint transformation</H2>
      <p>
        The space and body twists describe the same motion but in different frames. The map
        between them is the <strong>adjoint transformation</strong> of <M>{"T"}</M>:
      </p>
      <Eq>{"\\mathcal{V}_s = \\mathrm{Ad}_T\\, \\mathcal{V}_b, \\qquad \\mathcal{V}_b = \\mathrm{Ad}_{T^{-1}}\\, \\mathcal{V}_s."}</Eq>
      <p>
        Expanding <M>{"T = \\begin{bmatrix} R & p \\\\ 0 & 1 \\end{bmatrix}"}</M>, the 6×6
        adjoint matrix is:
      </p>
      <Eq>{"\\mathrm{Ad}_T = \\begin{bmatrix} R & 0 \\\\ [p]R & R \\end{bmatrix},"}</Eq>
      <p>
        where <M>{"[p]"}</M> is the skew-symmetric matrix of the position vector <M>{"p"}</M>.
        The top-left <M>{"R"}</M> rotates the angular velocity component. The bottom-left{" "}
        <M>{"[p]R"}</M> accounts for the fact that the linear velocity of a point depends on
        both the angular velocity and the lever arm <M>{"p"}</M> to that point. The bottom-right{" "}
        <M>{"R"}</M> rotates the linear velocity component.
      </p>
      <p>
        A useful composition property:{" "}
        <M>{"\\mathrm{Ad}_{T_1 T_2} = \\mathrm{Ad}_{T_1}\\mathrm{Ad}_{T_2}"}</M>. This
        allows adjoint transformations to be composed along a kinematic chain, one frame at a
        time. The "Ad-check" readout in the widget above has been verifying{" "}
        <M>{"\\mathcal{V}_s = \\mathrm{Ad}_T\\,\\mathcal{V}_b"}</M> numerically the whole time.
      </p>

      <KeyIdea>
        Every rigid-body velocity is a twist <M>{"\\mathcal{V} = (\\omega, v) \\in \\mathbb{R}^6"}</M>.
        Every displacement is <M>{"T = e^{[\\mathcal{S}]\\theta}"}</M> — a screw motion along
        axis <M>{"\\mathcal{S}"}</M>. Space and body twists describe the same motion in different
        frames: <M>{"\\mathcal{V}_s = \\mathrm{Ad}_T\\, \\mathcal{V}_b"}</M>.
      </KeyIdea>

      <BookRef>Modern Robotics §3.4.2–3.4.3 — Twists, Screw Motions, and the Adjoint Map.</BookRef>
    </div>
  );
}

/* ================= shared bits ================= */

function ScrewBody({ T, scale = 0.55 }: { T: SE3; scale?: number }) {
  return (
    <PosedGroup R={T.R} p={[T.p[0], T.p[1], T.p[2]]}>
      <mesh>
        <boxGeometry args={[0.42, 0.3, 0.2]} />
        <meshStandardMaterial color="#e8e2d2" transparent opacity={0.85} />
      </mesh>
      <Triad scale={scale} thickness={0.024} />
    </PosedGroup>
  );
}

function useTrace(S: Vec6, theta: number) {
  return useMemo(() => {
    const pts: [number, number, number][] = [];
    const n = Math.max(2, Math.ceil(Math.abs(theta) / 0.06));
    for (let i = 0; i <= n; i++) {
      const { p } = exp6(S, (theta * i) / n);
      pts.push([p[0], p[1], p[2]]);
    }
    return pts;
  }, [S[0], S[1], S[2], S[3], S[4], S[5], theta]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ================= widget 1: vary the pitch ================= */

const PITCH_Q: Vec3 = [0.55, 0, 0];
const PITCH_MAX = 4 * Math.PI;

function ScrewPitchWidget() {
  const [h, setH] = useState(0.12);
  const [pureT, setPureT] = useState(false);
  const [theta, setTheta] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setTheta(t => {
        const next = t + dt * 1.4;
        if (next >= PITCH_MAX) {
          setPlaying(false);
          return PITCH_MAX;
        }
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const S: Vec6 = pureT ? [0, 0, 0, 0, 0, 0.12] : screwFromAxisPoint([0, 0, 1], PITCH_Q, h);
  const T = exp6(S, theta);
  const trace = useTrace(S, theta);

  return (
    <WidgetShell
      title="One axis, every kind of motion"
      onReset={() => {
        setH(0.12);
        setPureT(false);
        setTheta(0);
        setPlaying(true);
      }}
      caption={
        <>
          At <M>{"h = 0"}</M> the body circles the purple axis in place; raising the pitch coils
          the dotted path into a helix; the pure-translation limit slides without turning at all.
          The trail is the body origin's path under <M>{"T(\\theta) = e^{[\\mathcal{S}]\\theta}"}</M>.
        </>
      }
    >
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1 min-w-0">
          <Scene3D height={330}>
            {!pureT && (
              <>
                <Line
                  points={[[PITCH_Q[0], PITCH_Q[1], -1.3], [PITCH_Q[0], PITCH_Q[1], 1.7]]}
                  color={W_COLOR}
                  lineWidth={2.5}
                />
                <mesh position={[PITCH_Q[0], PITCH_Q[1], 1.7]}>
                  <coneGeometry args={[0.05, 0.12, 14]} />
                  <meshStandardMaterial color={W_COLOR} />
                </mesh>
              </>
            )}
            {pureT && <Arrow dir={[0, 0, 1]} length={1.7} color={W_COLOR} />}
            {trace.length > 1 && (
              <Line points={trace} color="#c2571c" lineWidth={2} dashed dashSize={0.04} gapSize={0.03} />
            )}
            <ScrewBody T={T} />
          </Scene3D>
        </div>
        <div className="ui flex flex-col justify-center gap-3 md:w-[210px]">
          <Readout label="pitch h" value={pureT ? "∞" : h.toFixed(2)} color={W_COLOR} />
          <Readout
            label="θ"
            value={pureT ? `${(0.12 * theta).toFixed(2)} m` : `${deg(theta).toFixed(0)}°`}
          />
          <Readout label="rise per turn" value={pureT ? "—" : `${(2 * Math.PI * h).toFixed(2)}`} />
        </div>
      </div>

      <ControlBar>
        <WidgetButton
          onClick={() => {
            if (theta >= PITCH_MAX) setTheta(0);
            setPlaying(p => !p);
          }}
        >
          {playing ? "pause" : theta >= PITCH_MAX ? "replay" : "play"}
        </WidgetButton>
        <WidgetButton
          onClick={() => {
            setTheta(0);
            setPlaying(true);
          }}
        >
          restart
        </WidgetButton>
        {!pureT && (
          <LabeledSlider label="pitch h" value={h} min={0} max={0.4} onChange={setH} color={W_COLOR} width={160} />
        )}
        <WidgetButton
          active={pureT}
          onClick={() => {
            setPureT(t => !t);
            setTheta(0);
            setPlaying(true);
          }}
        >
          h → ∞ (pure translation)
        </WidgetButton>
      </ControlBar>
    </WidgetShell>
  );
}

/* ================= widget 2: build S from (ω̂, q, h) ================= */

// challenge target: 90° about a vertical axis through (0, 1, 0) with pitch ≈ 0.32
const SCREW_TGT: SE3 = { R: rotZ(rad(90)), p: [1, 1, 0.5] };

function ScrewAxisWidget() {
  const [az, setAz] = useState(rad(20));
  const [el, setEl] = useState(rad(35));
  const [qx, setQx] = useState(-0.4);
  const [qy, setQy] = useState(0.4);
  const [h, setH] = useState(0.05);
  const [theta, setTheta] = useState(rad(45));

  const what: Vec3 = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  const q: Vec3 = [qx, qy, 0];
  const S = screwFromAxisPoint(what, q, h);
  const T = exp6(S, theta);
  const trace = useTrace(S, theta);

  const rotErr = so3Distance(T.R, SCREW_TGT.R);
  const posErr = vnorm(vsub(T.p, SCREW_TGT.p));
  const met = rotErr < rad(10) && posErr < 0.12;

  return (
    <>
      <WidgetShell
        title="Screw axis explorer"
        onReset={() => {
          setAz(rad(20));
          setEl(rad(35));
          setQx(-0.4);
          setQy(0.4);
          setH(0.05);
          setTheta(rad(45));
        }}
        caption={
          <>
            The purple line is the screw axis: direction <M>{"\\hat\\omega"}</M> from the
            azimuth/elevation sliders, passing through the marked point{" "}
            <M>{"q = (q_x, q_y, 0)"}</M> in the ground plane. The 6-vector readout is{" "}
            <M>{"\\mathcal{S} = (\\hat\\omega,\\; -\\hat\\omega \\times q + h\\hat\\omega)"}</M>,
            recomputed live. The pale frame is the challenge target.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={360} camera={[3.4, 2.6, 3.4]}>
              <Line
                points={[
                  [q[0] - 1.9 * what[0], q[1] - 1.9 * what[1], -1.9 * what[2]],
                  [q[0] + 1.9 * what[0], q[1] + 1.9 * what[1], 1.9 * what[2]],
                ]}
                color={W_COLOR}
                lineWidth={2.5}
              />
              <mesh position={q}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshStandardMaterial color={W_COLOR} />
              </mesh>
              <Triad ghost R={SCREW_TGT.R} origin={[SCREW_TGT.p[0], SCREW_TGT.p[1], SCREW_TGT.p[2]]} colors={GHOST} scale={0.7} />
              {trace.length > 1 && (
                <Line points={trace} color="#c2571c" lineWidth={2} dashed dashSize={0.04} gapSize={0.03} />
              )}
              <ScrewBody T={T} />
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-3 md:w-[250px]">
            <Vec6Display
              v={S}
              label={<M>{"\\mathcal{S} ="}</M>}
              topColor={W_COLOR}
              bottomColor={V_COLOR}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <Readout
                label="rot err"
                value={`${deg(rotErr).toFixed(1)}°`}
                color={rotErr < rad(10) ? "var(--good)" : undefined}
              />
              <Readout
                label="pos err"
                value={posErr.toFixed(2)}
                color={posErr < 0.12 ? "var(--good)" : undefined}
              />
            </div>
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="axis azim." value={az} min={-Math.PI} max={Math.PI} onChange={setAz}
            fmt={v => `${deg(v).toFixed(0)}°`} color={W_COLOR} width={120} />
          <LabeledSlider label="axis elev." value={el} min={-Math.PI / 2} max={Math.PI / 2} onChange={setEl}
            fmt={v => `${deg(v).toFixed(0)}°`} color={W_COLOR} width={120} />
          <LabeledSlider label="qₓ" value={qx} min={-1.2} max={1.2} onChange={setQx} width={110} />
          <LabeledSlider label="q_y" value={qy} min={-1.2} max={1.2} onChange={setQy} width={110} />
          <LabeledSlider label="pitch h" value={h} min={0} max={0.45} onChange={setH} color={W_COLOR} width={120} />
          <LabeledSlider label="θ" value={theta} min={-Math.PI} max={Math.PI} onChange={setTheta}
            fmt={v => `${deg(v).toFixed(0)}°`} width={140} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch3-twist-screw" met={met}>
        Land the moving frame on the pale target (rotation within 10°, position within 0.12).
        Hint: read the target like a logarithm — its rotation block is a 90° turn about{" "}
        <span className="cz">ẑ</span>, so the axis must be vertical. Then hunt for where that
        axis pierces the ground plane, and how much pitch is needed to climb 0.5 in a quarter
        turn.
      </Challenge>
    </>
  );
}

/* ================= widget 3: space twist vs body twist ================= */

const SBT_S = screwFromAxisPoint([0, 0, 1], [0.5, 0, 0], 0); // revolute screw, axis offset from origin
const SBT_RATE = 0.9;

function SpaceBodyTwistWidget() {
  const [mx, setMx] = useState(0.7);
  const [my, setMy] = useState(-0.45);
  const [myaw, setMyaw] = useState(rad(50));
  const [theta, setTheta] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setTheta(t => (t + dt * SBT_RATE) % (2 * Math.PI));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const M0: SE3 = { R: rotZ(myaw), p: [mx, my, 0] };
  const T = se3Mul(exp6(SBT_S, theta), M0);

  const Vs = SBT_S.map(x => x * SBT_RATE) as Vec6;
  const Vb = adjointApply(se3Inv(T), Vs);
  const back = adjointApply(T, Vb);
  const checkErr = Math.max(...back.map((x, i) => Math.abs(x - Vs[i])));

  const ws: Vec3 = [Vs[0], Vs[1], Vs[2]];
  const vs: Vec3 = [Vs[3], Vs[4], Vs[5]];
  const velBodyOrigin = vadd(vcross(ws, T.p), vs);

  return (
    <WidgetShell
      title="Same motion, two twists"
      onReset={() => {
        setMx(0.7);
        setMy(-0.45);
        setMyaw(rad(50));
        setTheta(0);
        setPlaying(true);
      }}
      caption={
        <>
          The body rides a fixed revolute screw (purple). The teal arrow at the dark space-origin
          marker is <M>{"v_s"}</M>: the velocity of whichever body-point is passing through the
          origin right now. The orange arrow is the body origin's own velocity — clearly not the
          same thing. Move the start-pose sliders: <M>{"\\mathcal{V}_b"}</M> changes (it depends
          on where the body frame sits) while <M>{"\\mathcal{V}_s"}</M> does not, yet the two are
          always related by <M>{"\\mathcal{V}_s = \\mathrm{Ad}_T\\,\\mathcal{V}_b"}</M> — the
          adjoint map defined below.
        </>
      }
    >
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1 min-w-0">
          <Scene3D height={350}>
            {/* screw axis */}
            <Line points={[[0.5, 0, -1.3], [0.5, 0, 1.6]]} color={W_COLOR} lineWidth={2.5} />
            {/* space origin marker + v_s arrow */}
            <mesh>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshStandardMaterial color="#33343d" />
            </mesh>
            {vnorm(vs) > 0.05 && <Arrow dir={vs} length={vnorm(vs) * 0.9} color={V_COLOR} />}
            {/* body origin velocity arrow */}
            {vnorm(velBodyOrigin) > 0.05 && (
              <group position={[T.p[0], T.p[1], T.p[2]]}>
                <Arrow dir={velBodyOrigin} length={vnorm(velBodyOrigin) * 0.9} color="#c2571c" />
              </group>
            )}
            <ScrewBody T={T} scale={0.5} />
          </Scene3D>
        </div>
        <div className="ui flex flex-col justify-center gap-3 md:w-[270px]">
          <div className="flex gap-4">
            <Vec6Display v={Vs} label={<M>{"\\mathcal{V}_s ="}</M>} topColor={W_COLOR} bottomColor={V_COLOR} />
            <Vec6Display v={Vb} label={<M>{"\\mathcal{V}_b ="}</M>} topColor={W_COLOR} bottomColor={V_COLOR} />
          </div>
          <Readout
            label="‖V_s − Ad_T V_b‖"
            value={checkErr.toFixed(2)}
            color="var(--good)"
          />
        </div>
      </div>

      <ControlBar>
        <WidgetButton onClick={() => setPlaying(p => !p)} active={playing}>
          {playing ? "pause" : "play"}
        </WidgetButton>
        <LabeledSlider label="start x" value={mx} min={-1} max={1} onChange={setMx} width={120} />
        <LabeledSlider label="start y" value={my} min={-1} max={1} onChange={setMy} width={120} />
        <LabeledSlider label="start yaw" value={myaw} min={-Math.PI} max={Math.PI} onChange={setMyaw}
          fmt={v => `${deg(v).toFixed(0)}°`} width={120} />
      </ControlBar>
    </WidgetShell>
  );
}
