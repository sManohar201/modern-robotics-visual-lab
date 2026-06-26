import { useEffect, useRef, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad, Arrow, AXIS_COLORS } from "../../components/three/Scene3D";
import { rad, deg, type Vec3, type Mat3 } from "../../lib/math/vec";

/* ============================================================ page ============= */

export default function Quaternions() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 2"
        section="Configuration Space"
        title="Unit Quaternions"
        lede="Four numbers on a sphere in 4D: no singularities, cheaper than a rotation matrix, and the only representation that interpolates orientation gracefully. The price of admission is a half-angle — and a strange double life where every rotation has two names."
      />

      <p>
        The previous page left us with a clean verdict. Euler angles (three numbers) are minimal
        but always singular somewhere — gimbal lock is unavoidable. Rotation matrices (nine numbers)
        are globally non-singular but bulky, carrying six redundant numbers. The{" "}
        <strong>unit quaternion</strong> threads the needle: <em>four</em> numbers, one constraint,
        no singularities anywhere. It is the representation of choice in computer graphics, spacecraft
        attitude control, robotics middleware, and physics engines — anywhere orientations must be
        stored compactly, renormalized cheaply, or blended smoothly.
      </p>

      <H2>Four numbers on a sphere</H2>
      <p>
        A quaternion is a four-component object, written either as a scalar-plus-vector pair or with
        the imaginary units <M>{"i, j, k"}</M>:
      </p>
      <Eq>{"q = q_0 + q_1\\,i + q_2\\,j + q_3\\,k \\;=\\; (q_0,\\; \\mathbf{q}_v), \\qquad \\mathbf{q}_v = (q_1, q_2, q_3)."}</Eq>
      <p>
        To represent a rotation we use only <strong>unit quaternions</strong> — those satisfying a
        single quadratic constraint:
      </p>
      <Eq>{"q_0^2 + q_1^2 + q_2^2 + q_3^2 = 1."}</Eq>
      <p>
        Four numbers minus one constraint equals three degrees of freedom — exactly the dimension of{" "}
        <M>{"SO(3)"}</M>. Geometrically, the constraint says the quaternion lives on the{" "}
        <strong>unit 3-sphere</strong> <M>{"S^3"}</M>, the surface of a ball in four dimensions. This
        is the same kind of <em>implicit</em> (embedded) parametrization as the rotation matrix — extra
        coordinates pinned to a constraint surface — but with the leanest possible overhead: one spare
        coordinate instead of six.
      </p>

      <H2>The half-angle: how a quaternion stores a rotation</H2>
      <p>
        Here is the rule that defines everything. A rotation by angle <M>{"\\theta"}</M> about a unit
        axis <M>{"\\hat{\\omega} = (\\omega_x, \\omega_y, \\omega_z)"}</M> is encoded as:
      </p>
      <Eq>{"q = \\left(\\cos\\tfrac{\\theta}{2},\\;\\; \\hat{\\omega}\\,\\sin\\tfrac{\\theta}{2}\\right) = \\left(\\cos\\tfrac{\\theta}{2},\\; \\omega_x\\sin\\tfrac{\\theta}{2},\\; \\omega_y\\sin\\tfrac{\\theta}{2},\\; \\omega_z\\sin\\tfrac{\\theta}{2}\\right)."}</Eq>
      <p>
        Notice the <strong>half-angle</strong>. The quaternion does not store{" "}
        <M>{"\\theta"}</M> — it stores <M>{"\\theta/2"}</M>. This single fact is the source of the
        quaternion's superpower (singularity-free, smooth blending) and its strangest quirk (the
        double cover, below). The scalar part <M>{"q_0 = \\cos(\\theta/2)"}</M> is a "how much
        rotation" dial; the vector part points along the axis and grows as the rotation increases.
        Drive both directly:
      </p>

      <AxisAngleWidget />

      <p>
        Because <M>{"\\hat{\\omega}"}</M> is a unit vector and{" "}
        <M>{"\\cos^2 + \\sin^2 = 1"}</M>, the unit-norm constraint is satisfied automatically for
        any axis and any angle. There is no axis, no angle, no orientation where the formula breaks
        down — unlike latitude/longitude at the poles, or Euler angles at gimbal lock. Every point of{" "}
        <M>{"S^3"}</M> is an ordinary, well-behaved rotation.
      </p>

      <H2>The double cover: every rotation has two names</H2>
      <p>
        You may have just driven the angle past <M>{"360^\\circ"}</M> and watched something
        unsettling: the body returns to exactly where it started, but the quaternion reads{" "}
        <M>{"(-1, 0, 0, 0)"}</M> — not <M>{"(+1,0,0,0)"}</M>. A full turn does not bring the
        quaternion home; it negates it. Two full turns are needed for the quaternion itself to
        return.
      </p>
      <p>
        <strong>Why the sign flips.</strong> The reason is the half-angle. Replacing{" "}
        <M>{"\\theta"}</M> by <M>{"\\theta + 360^\\circ"}</M> leaves the physical rotation
        unchanged, but it changes the angle the quaternion actually stores,{" "}
        <M>{"\\theta/2"}</M>, by only <M>{"180^\\circ"}</M> — exactly <em>half</em> a cycle. And
        both <M>{"\\cos"}</M> and <M>{"\\sin"}</M> are anti-periodic under a half-cycle shift:{" "}
        <M>{"\\cos(\\alpha + 180^\\circ) = -\\cos\\alpha"}</M> and{" "}
        <M>{"\\sin(\\alpha + 180^\\circ) = -\\sin\\alpha"}</M>. So <em>all four</em> components flip
        sign together, and one extra full turn maps <M>{"q \\mapsto -q"}</M>:
      </p>
      <Eq>{"q(\\theta + 360^\\circ) = \\left(-\\cos\\tfrac\\theta2,\\; -\\hat\\omega\\sin\\tfrac\\theta2\\right) = -q(\\theta)."}</Eq>

      <p>
        Hold the axis fixed and march <M>{"\\theta"}</M> upward, watching <em>two clocks</em> tick
        at different rates. The body's orientation is periodic with period <M>{"360^\\circ"}</M> —
        it looks identical at <M>{"0^\\circ, 360^\\circ, 720^\\circ"}</M>. But the quaternion's
        scalar part <M>{"q_0 = \\cos(\\theta/2)"}</M> is periodic with period{" "}
        <M>{"720^\\circ"}</M> — it only truly returns to <M>{"+1"}</M> after <em>two</em> full
        turns:
      </p>

      <table className="ui my-6 w-full max-w-[560px] text-[13px] border-collapse">
        <thead>
          <tr className="text-left text-[var(--ink-faint)] border-b border-[var(--rule)]">
            <th className="py-1.5 pr-3 font-semibold">θ (physical turn)</th>
            <th className="py-1.5 pr-3 font-semibold">θ/2 (what q stores)</th>
            <th className="py-1.5 pr-3 font-semibold">q₀ = cos(θ/2)</th>
            <th className="py-1.5 pr-3 font-semibold">quaternion</th>
            <th className="py-1.5 font-semibold">body</th>
          </tr>
        </thead>
        <tbody className="mono">
          {[
            ["0°", "0°", "+1", "(+1, 0, 0, 0)", "start", false],
            ["180°", "90°", "0", "(0, …)", "half-turn", false],
            ["360°", "180°", "−1", "(−1, 0, 0, 0)", "back to start", true],
            ["540°", "270°", "0", "(0, …)", "half-turn", false],
            ["720°", "360°", "+1", "(+1, 0, 0, 0)", "back to start", true],
          ].map(([t, h, q0, qq, body, hl]) => (
            <tr
              key={t as string}
              className={`border-b border-[var(--rule)] ${hl ? "bg-[#f4f1fb] font-semibold" : ""}`}
            >
              <td className="py-1.5 pr-3">{t}</td>
              <td className="py-1.5 pr-3">{h}</td>
              <td className="py-1.5 pr-3">{q0}</td>
              <td className="py-1.5 pr-3">{qq}</td>
              <td className="py-1.5">{body}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        The picture below makes the 2-to-1 ratio impossible to miss. As the body spins, the
        quaternion is just a single point riding around a circle at <em>half</em> the angular speed:
        the body laps twice while the quaternion loops once.
      </p>

      <PeriodWidget />

      <p>
        <strong>Why <M>{"-q"}</M> is harmless, not a bug.</strong> A sign flip on your rotation
        sounds alarming — but <M>{"q"}</M> and <M>{"-q"}</M> rotate <em>everything</em> identically.
        Two independent checks, both spelled out below: (1) the matrix <M>{"R(q)"}</M> is{" "}
        <em>quadratic</em> in the components of <M>{"q"}</M>, so the sign cancels in pairs and{" "}
        <M>{"R(-q) = R(q)"}</M> exactly; (2) rotating a vector sandwiches the quaternion twice,{" "}
        <M>{"q\\,v\\,q^{-1}"}</M>, so the two sign flips of <M>{"-q"}</M> cancel. The widget makes
        it concrete: build a body from <M>{"q"}</M> on the left and from <M>{"-q"}</M> on the right.
        Every component is negated, yet the two bodies are pixel-for-pixel the same orientation.
      </p>

      <TwoNamesWidget />

      <p>
        <strong>The topology.</strong> Zoom out from one axis to the whole space of rotations. Every
        unit quaternion is a point of the 3-sphere <M>{"S^3"}</M>; every rotation is a point of{" "}
        <M>{"SO(3)"}</M>; and the map between them is <strong>two-to-one</strong>, sending the
        antipodal pair <M>{"q"}</M> and <M>{"-q"}</M> to the same rotation. So <M>{"S^3"}</M> wraps
        twice around — <em>double-covers</em> — <M>{"SO(3)"}</M>. The notation{" "}
        <M>{"SO(3) \\cong S^3 / \\{\\pm 1\\}"}</M> says exactly this: take the sphere and{" "}
        <em>glue every point to its antipode</em>; what remains is the space of rotations. (This
        antipodal twist is the same reason, from the previous page, that no single chart can cover{" "}
        <M>{"SO(3)"}</M> without a singularity.)
      </p>
      <p>
        <strong>The belt trick.</strong> This is not mere bookkeeping — it is a physical property of
        3D space you can feel with a belt or a mug on your palm. Rotate the end <M>{"360^\\circ"}</M>{" "}
        and the belt is twisted; you cannot remove the twist without untwisting. Rotate a{" "}
        <em>second</em> <M>{"360^\\circ"}</M> (<M>{"720^\\circ"}</M> total) and — surprisingly — you{" "}
        <em>can</em> slide the slack around and undo the twist completely, with the ends never
        turning back. A single full turn is <em>not</em> the identity of the system; two full turns
        are. Objects that behave this way are called <strong>spinors</strong>, and the quaternion is
        precisely the algebra that tracks them — the <M>{"q \\mapsto -q"}</M> flip at{" "}
        <M>{"360^\\circ"}</M> is the twisted belt written in four numbers.
      </p>

      <KeyIdea>
        A unit quaternion stores the <em>half</em>-angle: <M>{"q = (\\cos\\tfrac\\theta2,\\, \\hat\\omega\\sin\\tfrac\\theta2)"}</M>.
        Because of that half, <M>{"q"}</M> and <M>{"-q"}</M> are the same rotation — <M>{"S^3"}</M>{" "}
        double-covers <M>{"SO(3)"}</M>. Any rotation has exactly two quaternion names.
      </KeyIdea>

      <H2>Composing rotations and rotating vectors</H2>
      <p>
        Quaternions compose by the <strong>Hamilton product</strong>. For{" "}
        <M>{"p = (p_0, \\mathbf{p}_v)"}</M> and <M>{"q = (q_0, \\mathbf{q}_v)"}</M>:
      </p>
      <Eq>{"p\\,q = \\big(p_0 q_0 - \\mathbf{p}_v\\!\\cdot\\!\\mathbf{q}_v,\\;\\; p_0\\mathbf{q}_v + q_0\\mathbf{p}_v + \\mathbf{p}_v\\!\\times\\!\\mathbf{q}_v\\big)."}</Eq>
      <p>
        The cross-product term is what makes this <strong>non-commutative</strong>:{" "}
        <M>{"pq \\neq qp"}</M> in general — exactly mirroring the fact that{" "}
        <M>{"R_1 R_2 \\neq R_2 R_1"}</M> for rotation matrices. Rotation is non-commutative in the
        world, so any honest representation of it must be non-commutative too. Composing "first{" "}
        <M>{"q_1"}</M>, then <M>{"q_2"}</M>" is the product <M>{"q_2 q_1"}</M>, just like stacking
        matrices.
      </p>
      <p>
        For a <em>unit</em> quaternion the inverse is simply the <strong>conjugate</strong> — flip
        the sign of the vector part — which costs three negations versus a matrix transpose:
      </p>
      <Eq>{"q^{-1} = q^* = (q_0,\\, -\\mathbf{q}_v) \\qquad (\\text{for } \\|q\\| = 1)."}</Eq>
      <p>
        To rotate an ordinary vector <M>{"\\mathbf{v}"}</M>, promote it to a pure quaternion{" "}
        <M>{"(0, \\mathbf{v})"}</M> and sandwich it:
      </p>
      <Eq>{"(0,\\, \\mathbf{v}') = q\\,(0, \\mathbf{v})\\,q^{-1}."}</Eq>
      <p>
        The sandwich is why the double cover is harmless in practice: <M>{"q"}</M> appears twice, so
        the two sign flips of <M>{"-q"}</M> cancel — <M>{"q"}</M> and <M>{"-q"}</M> rotate every
        vector identically. Composing two quaternions costs 16 multiplications; multiplying two{" "}
        <M>{"3\\times3"}</M> matrices costs 27. Over a long kinematic chain, the savings — and the
        cheap renormalization (just divide by the norm) — add up.
      </p>

      <H2>From quaternion to rotation matrix</H2>
      <p>
        When you do need the matrix — to multiply a list of points, or hand off to the rest of
        Modern Robotics' machinery — the conversion is pure algebra, with no trig at all:
      </p>
      <Eq>{"R(q) = \\begin{bmatrix} 1 - 2(q_2^2 + q_3^2) & 2(q_1 q_2 - q_0 q_3) & 2(q_1 q_3 + q_0 q_2) \\\\ 2(q_1 q_2 + q_0 q_3) & 1 - 2(q_1^2 + q_3^2) & 2(q_2 q_3 - q_0 q_1) \\\\ 2(q_1 q_3 - q_0 q_2) & 2(q_2 q_3 + q_0 q_1) & 1 - 2(q_1^2 + q_2^2) \\end{bmatrix}."}</Eq>
      <p>
        Stare at every term that contains the components: <M>{"q_2^2"}</M>,{" "}
        <M>{"q_1 q_2"}</M>, <M>{"q_0 q_3"}</M>, and so on. Each is a product of{" "}
        <em>exactly two</em> components. There is no lone <M>{"q_i"}</M> standing by itself and no
        triple product — every entry is either a bare constant <M>{"1"}</M> (no{" "}
        <M>{"q"}</M> at all) or <strong>quadratic</strong>: built from pairwise products of the
        components. That single fact is the double cover hiding in plain sight.
      </p>
      <p>
        Watch what the flip <M>{"q \\mapsto -q"}</M> does to any such term. Negate{" "}
        <em>both</em> factors and the two minus signs multiply away:
      </p>
      <Eq>{"(-q_1)(-q_2) = (-1)(-1)\\,q_1 q_2 = q_1 q_2, \\qquad (-q_2)^2 = q_2^2, \\qquad (-q_0)(-q_3) = q_0 q_3."}</Eq>
      <p>
        This is what "the sign cancels in pairs" means: a product of two negatives is positive, so
        every two-factor term is left exactly as it was. The constants <M>{"1"}</M> never involved{" "}
        <M>{"q"}</M> to begin with. Nothing in the matrix changes — therefore:
      </p>
      <Eq>{"R(-q) = R(q)."}</Eq>
      <p>
        The protection is specifically the <em>evenness</em>. Had any entry been{" "}
        <em>linear</em> — a lone <M>{"q_1"}</M>, say — then <M>{"q \\mapsto -q"}</M> would have
        flipped it to <M>{"-q_1"}</M> and the matrix would differ. But this map only ever uses the
        components two at a time, and even powers cannot tell a number from its negative:{" "}
        <M>{"(-x)^2 = x^2"}</M>. The sign information carried by <M>{"\\pm q"}</M> simply has
        nowhere to land. Two antipodal quaternions — every number negated — collapse to one and the
        same rotation. (This is exactly the <M>{"\\|R(q) - R(-q)\\| = 0"}</M> readout you drove to
        zero in the <em>q and −q</em> widget above.)
      </p>

      <H2>SLERP: the reason graphics and aerospace insist on quaternions</H2>
      <p>
        Storage is nice, but the decisive advantage is <strong>interpolation</strong>. To animate a
        camera, plan a smooth reorientation for a satellite, or blend two keyframes, you must move
        continuously from one orientation to another. Interpolating Euler angles produces wobble and
        can pass through gimbal lock; naively averaging rotation matrices produces matrices that are
        no longer rotations.
      </p>
      <p>
        Quaternions live on the sphere <M>{"S^3"}</M>, and the natural path between two points on a
        sphere is the great-circle arc. Tracing that arc at constant speed is{" "}
        <strong>spherical linear interpolation</strong>, or <strong>SLERP</strong>:
      </p>
      <Eq>{"\\mathrm{slerp}(q_a, q_b, t) = \\frac{\\sin\\big((1-t)\\Omega\\big)}{\\sin\\Omega}\\,q_a \\;+\\; \\frac{\\sin(t\\,\\Omega)}{\\sin\\Omega}\\,q_b, \\qquad \\cos\\Omega = q_a\\!\\cdot\\!q_b."}</Eq>
      <p>
        SLERP stays exactly on the unit sphere for every <M>{"t \\in [0,1]"}</M>, and it sweeps the
        orientation at a <em>constant angular velocity</em> — the shortest, smoothest reorientation
        possible. Contrast it with the lazy alternative, a straight-line blend{" "}
        <M>{"(1-t)\\,q_a + t\\,q_b"}</M>: that chord cuts <em>through</em> the sphere, so the
        interpolated quaternion has norm less than one and no longer represents a pure rotation. Feed
        it to <M>{"R(q)"}</M> anyway and the body visibly shrinks and shears mid-blend. Watch both
        side by side:
      </p>

      <SlerpWidget />

      <p>
        The "double cover" matters here too. Before interpolating, you check the sign of{" "}
        <M>{"q_a\\!\\cdot\\!q_b"}</M>; if it is negative, you negate one quaternion so the arc takes
        the <em>short</em> way around rather than the long way. Both end orientations are identical —
        but the path between them is not.
      </p>

      <H2>So why does Modern Robotics still lead with matrices?</H2>
      <p>
        Given all this, you might expect the textbook to be written in quaternions. It is not — and
        deliberately so. Rotation matrices compose and act on vectors by <em>ordinary matrix
        multiplication</em>: <M>{"p_s = R_{sb}\\,p_b"}</M>, <M>{"R_{ac} = R_{ab}R_{bc}"}</M>. The
        algebra is transparent, the columns have direct physical meaning (they are the body axes),
        and they generalize cleanly to the <M>{"4\\times4"}</M> transforms of <M>{"SE(3)"}</M> that
        carry both rotation <em>and</em> translation. Quaternions handle only rotation, and their
        product rule has to be memorized.
      </p>
      <Aside>
        The division of labor in practice: reason and derive with rotation matrices and the screw
        theory of the coming chapters; <em>store, transmit, normalize, and interpolate</em> with
        quaternions. Conversion in either direction is a handful of arithmetic operations, so most
        real systems carry both and use whichever is convenient for the task at hand.
      </Aside>

      <KeyIdea>
        Quaternions are the lean, singularity-free, interpolation-friendly representation of{" "}
        <M>{"SO(3)"}</M>: four numbers on <M>{"S^3"}</M>, half-angle encoding, two names per
        rotation, SLERP for smooth blends. Modern Robotics derives with matrices for algebraic
        transparency, but the two are interchangeable — convert freely.
      </KeyIdea>

      <H2>Go deeper: two superb visual explainers</H2>
      <p>
        The widgets here show <em>what</em> a quaternion does. To really feel the four-dimensional
        geometry behind it — why the half-angle appears, how the double cover looks as motion on{" "}
        <M>{"S^3"}</M> — two resources are worth far more than any paragraph:
      </p>
      <ul className="my-5 space-y-3 text-[1.02rem] leading-relaxed">
        <li>
          <a
            href="https://www.youtube.com/watch?v=zjMuIxRvygQ&t=59s"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2 hover:decoration-[var(--accent)]"
          >
            3Blue1Brown — <em>Quaternions and 3D rotation, explained interactively</em>
          </a>
          <span className="text-[var(--ink-soft)]">
            {" "}— a beautiful animated derivation of how a 4D object can encode a 3D rotation, and
            where that mysterious half-angle comes from.
          </span>
        </li>
        <li>
          <a
            href="https://eater.net/quaternions"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2 hover:decoration-[var(--accent)]"
          >
            eater.net/quaternions
          </a>
          <span className="text-[var(--ink-soft)]">
            {" "}— Ben Eater &amp; Grant Sanderson's companion explorable: drag quaternions around
            yourself and watch the rotation respond in real time. The hands-on counterpart to the
            video.
          </span>
        </li>
      </ul>

      <Aside>
        That said, this is the last you will see of quaternions for a while. From here on, Modern
        Robotics represents all rigid-body motion with two groups: <M>{"SO(3)"}</M> for orientation
        and <M>{"SE(3)"}</M> for full pose (rotation <em>and</em> translation), composed and applied
        by ordinary matrix multiplication. Keep quaternions in your pocket for storage and
        interpolation — but the language of the chapters ahead is matrices.
      </Aside>

      <BookRef>Modern Robotics, Appendix B — Other Representations of Rotation (Unit Quaternions); §3.2.3 for the axis–angle / half-angle relationship.</BookRef>
    </div>
  );
}

/* ===================================================== quaternion math ========= */
// q = [q0, q1, q2, q3] = w + xi + yj + zk. All helpers are local to this page.

type Quat = [number, number, number, number];

function quatFromAxisAngle(axis: Vec3, theta: number): Quat {
  const h = theta / 2;
  const s = Math.sin(h);
  return [Math.cos(h), axis[0] * s, axis[1] * s, axis[2] * s];
}

/** Row-major Mat3 from a quaternion. NOT pre-normalized — feed a non-unit q and
 *  the result is a scaled/sheared matrix (used to visualize a chord blend leaving S³). */
function quatToMat3(q: Quat): Mat3 {
  const [w, x, y, z] = q;
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
    2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
    2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
  ];
}

const quatNorm = (q: Quat) => Math.hypot(q[0], q[1], q[2], q[3]);
const quatDot = (a: Quat, b: Quat) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];

/** Straight-line (chord) blend — leaves the unit sphere unless renormalized. */
const lerpRaw = (a: Quat, b: Quat, t: number): Quat => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
  a[3] + (b[3] - a[3]) * t,
];

/** Constant-speed great-circle interpolation, taking the short way around. */
function slerp(a: Quat, b: Quat, t: number): Quat {
  let bb = b;
  let dot = quatDot(a, b);
  if (dot < 0) {
    bb = [-b[0], -b[1], -b[2], -b[3]];
    dot = -dot;
  }
  if (dot > 0.9995) {
    const r = lerpRaw(a, bb, t);
    const n = quatNorm(r) || 1;
    return [r[0] / n, r[1] / n, r[2] / n, r[3] / n];
  }
  const om = Math.acos(dot);
  const sin = Math.sin(om);
  const wa = Math.sin((1 - t) * om) / sin;
  const wb = Math.sin(t * om) / sin;
  return [a[0] * wa + bb[0] * wb, a[1] * wa + bb[1] * wb, a[2] * wa + bb[2] * wb, a[3] * wa + bb[3] * wb];
}

/* ===================================================== shared 3D body ========= */

/** A box + triad posed by an (optionally non-unit) quaternion. */
function QuatBody({ q, color = "#c2571c", opacity = 0.85 }: { q: Quat; color?: string; opacity?: number }) {
  const R = quatToMat3(q);
  return (
    <group
      matrixAutoUpdate={false}
      ref={g => {
        if (g) g.matrix.set(R[0], R[1], R[2], 0, R[3], R[4], R[5], 0, R[6], R[7], R[8], 0, 0, 0, 0, 1);
      }}
    >
      <mesh>
        <boxGeometry args={[1.15, 0.72, 0.4]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.6} />
      </mesh>
      <Triad scale={1.05} thickness={0.026} />
    </group>
  );
}

/* ============================================ widget 1: axis-angle quaternion === */

function AxisAngleWidget() {
  const [az, setAz] = useState(rad(35)); // axis azimuth
  const [el, setEl] = useState(rad(30)); // axis elevation
  const [angle, setAngle] = useState(rad(90)); // rotation angle θ (0..720°)

  const axis: Vec3 = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  const q = quatFromAxisAngle(axis, angle);
  const angleDeg = deg(angle);
  const doubleCover = Math.abs(angleDeg - 360) < 4;

  const reset = () => {
    setAz(rad(35));
    setEl(rad(30));
    setAngle(rad(90));
  };

  return (
    <>
      <WidgetShell
        title="Axis & angle → quaternion (the half-angle live)"
        onReset={reset}
        caption={
          <>
            The <span style={{ color: "#7a7a88" }}>grey arrow</span> is the rotation axis{" "}
            <span className="mono">ω̂</span>; the orange body turns about it by <span className="mono">θ</span>.
            Watch <span className="mono">q₀ = cos(θ/2)</span> and the vector part{" "}
            <span className="mono">ω̂·sin(θ/2)</span> track the sliders. The faint triad is the start
            orientation.
          </>
        }
      >
        <Scene3D camera={[2.8, 2.2, 3.0]} height={360}>
          <Triad ghost colors={["#dcb6b4", "#b8d4bd", "#b4c4dd"]} scale={1.45} />
          <Arrow dir={axis} length={1.7} color="#7a7a88" thickness={0.02} />
          <Arrow dir={[-axis[0], -axis[1], -axis[2]]} length={0.55} color="#bdbdc6" thickness={0.014} />
          <QuatBody q={q} />
        </Scene3D>

        <ControlBar>
          <LabeledSlider label="axis az" value={az} min={rad(-180)} max={rad(180)} onChange={setAz}
            fmt={v => `${deg(v).toFixed(0)}°`} width={150} color="#7a7a88" />
          <LabeledSlider label="axis el" value={el} min={rad(-90)} max={rad(90)} onChange={setEl}
            fmt={v => `${deg(v).toFixed(0)}°`} width={150} color="#7a7a88" />
          <LabeledSlider label="θ" value={angle} min={0} max={rad(720)} onChange={setAngle}
            fmt={v => `${deg(v).toFixed(0)}°`} width={190} color="var(--accent)" />
        </ControlBar>

        <div className="ui flex flex-wrap items-center gap-x-5 gap-y-2.5 mt-4">
          <Readout label={<M>{"q_0 = \\cos(\\theta/2)"}</M>} value={q[0].toFixed(3)} color="var(--accent)" />
          <Readout label={<M>{"q_1"}</M>} value={q[1].toFixed(3)} color={AXIS_COLORS.x} />
          <Readout label={<M>{"q_2"}</M>} value={q[2].toFixed(3)} color={AXIS_COLORS.y} />
          <Readout label={<M>{"q_3"}</M>} value={q[3].toFixed(3)} color={AXIS_COLORS.z} />
          <Readout label={<M>{"\\|q\\|"}</M>} value={quatNorm(q).toFixed(3)} color="#2f9e44" />
        </div>
        {doubleCover && (
          <div className="ui mt-3 text-[12px] font-semibold text-[var(--accent)]">
            DOUBLE COVER — body is back at the start, yet q = (−1, 0, 0, 0). A full turn negated the
            quaternion; it takes 720° to truly come home.
          </div>
        )}
      </WidgetShell>

      <Challenge id="ch2-quat-doublecover" met={doubleCover} holdMs={400}>
        Push <M>{"\\theta"}</M> all the way to <strong>360°</strong>. The body sits exactly where it
        began — identity orientation — but read the quaternion: <M>{"q_0 = \\cos 180^\\circ = -1"}</M>,
        so <M>{"q = (-1,0,0,0) = -1"}</M>, not <M>{"+1"}</M>. You have witnessed the two-to-one
        cover: a single physical turn is not the identity of the quaternion.
      </Challenge>
    </>
  );
}

/* ============================ widget: period mismatch (body 2×, quaternion 1×) === */

/** The quaternion's great circle in the (q0, q3) plane, with a dot at angle θ/2. */
function QuatCircle({ half }: { half: number }) {
  const S = 240;
  const cx = S / 2;
  const cy = S / 2;
  const r = 84;
  // dot position (q0 along +x, q3 along +y/up)
  const px = cx + r * Math.cos(half);
  const py = cy - r * Math.sin(half);
  // swept trail from 0 to half
  const steps = Math.max(2, Math.ceil((half / (2 * Math.PI)) * 160));
  const trail: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (half * i) / steps;
    trail.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy - r * Math.sin(a)).toFixed(1)}`);
  }
  return (
    <div className="rounded-lg bg-[#f4f2ec] border border-[var(--rule)] flex items-center justify-center" style={{ height: 260 }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ maxHeight: 240 }}>
        {/* axes */}
        <line x1={cx - r - 18} y1={cy} x2={cx + r + 18} y2={cy} stroke="#cfcabb" strokeWidth={1} />
        <line x1={cx} y1={cy - r - 18} x2={cx} y2={cy + r + 18} stroke="#cfcabb" strokeWidth={1} />
        {/* unit circle */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#b9b5a8" strokeWidth={1.4} />
        {/* swept trail */}
        <polyline points={trail.join(" ")} fill="none" stroke="var(--accent)" strokeWidth={2.4} opacity={0.55} />
        {/* +1 / -1 markers */}
        <circle cx={cx + r} cy={cy} r={3.5} fill="#2f9e44" />
        <text x={cx + r - 2} y={cy - 9} fontSize={11} fill="#2f9e44" textAnchor="middle">+1 identity</text>
        <circle cx={cx - r} cy={cy} r={3.5} fill="#6741d9" />
        <text x={cx - r + 4} y={cy - 9} fontSize={11} fill="#6741d9" textAnchor="middle">−1</text>
        {/* radius + moving dot */}
        <line x1={cx} y1={cy} x2={px} y2={py} stroke="var(--accent)" strokeWidth={1.6} />
        <circle cx={px} cy={py} r={6} fill="var(--accent)" />
        {/* axis labels */}
        <text x={cx + r + 14} y={cy + 13} fontSize={11} fill="#9a9586">q₀</text>
        <text x={cx + 7} y={cy - r - 8} fontSize={11} fill="#3b6fd4">q₃</text>
      </svg>
    </div>
  );
}

function PeriodWidget() {
  const [angle, setAngle] = useState(0); // θ in radians, 0..720°
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setAngle(prev => {
        const next = prev + dt * rad(150);
        if (next >= rad(720)) {
          setPlaying(false);
          return rad(720);
        }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const q = quatFromAxisAngle([0, 0, 1], angle);
  const bodyRevs = deg(angle) / 360;
  const quatLoops = deg(angle) / 720;
  const reached = angle >= rad(715);

  return (
    <>
      <WidgetShell
        title="Two clocks: the body laps twice, the quaternion once"
        onReset={() => {
          setAngle(0);
          setPlaying(false);
        }}
        caption={
          <>
            A pure rotation about <span className="cz">ẑ</span>. Left: the body, periodic every{" "}
            <span className="mono">360°</span>. Right: the quaternion <M>{"(\\cos\\tfrac\\theta2, \\sin\\tfrac\\theta2)"}</M>{" "}
            riding its great circle at <em>half</em> the speed — one loop for every two body
            revolutions. It passes through <span style={{ color: "#6741d9" }}>−1</span> at exactly{" "}
            <span className="mono">θ = 360°</span>.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 min-w-0">
            <div className="ui text-[11.5px] font-semibold text-[var(--ink-faint)] mb-1.5 text-center">
              body — orientation
            </div>
            <Scene3D height={260} camera={[2.6, 2, 2.8]}>
              <Triad ghost colors={["#dcb6b4", "#b8d4bd", "#b4c4dd"]} scale={1.4} />
              <Arrow dir={[0, 0, 1]} length={1.7} color="#7a7a88" thickness={0.018} />
              <QuatBody q={q} />
            </Scene3D>
          </div>
          <div className="flex-1 min-w-0">
            <div className="ui text-[11.5px] font-semibold text-[var(--ink-faint)] mb-1.5 text-center">
              quaternion — on its circle in S³
            </div>
            <QuatCircle half={angle / 2} />
          </div>
        </div>

        <ControlBar>
          <WidgetButton onClick={() => { if (angle >= rad(720)) setAngle(0); setPlaying(p => !p); }}>
            {playing ? "pause" : angle >= rad(720) ? "replay" : "play"}
          </WidgetButton>
          <LabeledSlider label="θ" value={angle} min={0} max={rad(720)} onChange={v => { setPlaying(false); setAngle(v); }}
            fmt={v => `${deg(v).toFixed(0)}°`} width={220} color="var(--accent)" />
        </ControlBar>

        <div className="ui flex flex-wrap items-center gap-x-5 gap-y-2.5 mt-3">
          <Readout label="θ / 2" value={`${(deg(angle) / 2).toFixed(0)}°`} />
          <Readout label={<M>{"q_0"}</M>} value={q[0].toFixed(3)} color="var(--accent)" />
          <Readout label={<M>{"q_3"}</M>} value={q[3].toFixed(3)} color={AXIS_COLORS.z} />
          <Readout label="body revolutions" value={bodyRevs.toFixed(2)} color="#2f9e44" />
          <Readout label="quaternion loops" value={quatLoops.toFixed(2)} color="#6741d9" />
        </div>
      </WidgetShell>

      <Challenge id="ch2-quat-spinor" met={reached} holdMs={300}>
        Let it run all the way to <M>{"\\theta = 720^\\circ"}</M>. At the end the counters read{" "}
        <strong>body revolutions ≈ 2.00</strong> but <strong>quaternion loops ≈ 1.00</strong> — the
        body went around twice for every one trip of the quaternion. <em>That</em> 2-to-1 ratio is
        the double cover, made of motion.
      </Challenge>
    </>
  );
}

/* ============================ widget: q and -q are the same rotation =========== */

function TwoNamesWidget() {
  const [az, setAz] = useState(rad(35));
  const [angle, setAngle] = useState(rad(110));
  const el = rad(28);

  const axis: Vec3 = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  const q = quatFromAxisAngle(axis, angle);
  const nq: Quat = [-q[0], -q[1], -q[2], -q[3]];

  const Rq = quatToMat3(q);
  const Rnq = quatToMat3(nq);
  const frob = Math.sqrt(Rq.reduce((s, v, i) => s + (v - Rnq[i]) ** 2, 0));

  const compRow = (vals: Quat) => (
    <div className="ui flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2">
      <Readout label={<M>{"q_0"}</M>} value={vals[0].toFixed(2)} color="var(--accent)" />
      <Readout label={<M>{"q_1"}</M>} value={vals[1].toFixed(2)} color={AXIS_COLORS.x} />
      <Readout label={<M>{"q_2"}</M>} value={vals[2].toFixed(2)} color={AXIS_COLORS.y} />
      <Readout label={<M>{"q_3"}</M>} value={vals[3].toFixed(2)} color={AXIS_COLORS.z} />
    </div>
  );

  return (
    <WidgetShell
      title="q and −q: opposite numbers, identical body"
      onReset={() => {
        setAz(rad(35));
        setAngle(rad(110));
      }}
      caption={
        <>
          Steer the orientation with the sliders. The two panels are built from <M>{"q"}</M> and
          its antipode <M>{"-q"}</M> — every component is the exact negative — yet the bodies never
          differ. The proof is the readout <M>{"\\|R(q) - R(-q)\\|"}</M>, pinned at zero.
        </>
      }
    >
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <div className="ui text-[11.5px] font-semibold text-[var(--ink-faint)] mb-1.5 text-center">
            built from <span className="mono">q</span>
          </div>
          <Scene3D height={250} camera={[2.6, 2, 2.8]}>
            <Triad ghost colors={["#dcb6b4", "#b8d4bd", "#b4c4dd"]} scale={1.4} />
            <QuatBody q={q} color="#2f7d44" />
          </Scene3D>
          {compRow(q)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="ui text-[11.5px] font-semibold text-[var(--ink-faint)] mb-1.5 text-center">
            built from <span className="mono">−q</span>
          </div>
          <Scene3D height={250} camera={[2.6, 2, 2.8]}>
            <Triad ghost colors={["#dcb6b4", "#b8d4bd", "#b4c4dd"]} scale={1.4} />
            <QuatBody q={nq} color="#c2571c" />
          </Scene3D>
          {compRow(nq)}
        </div>
      </div>

      <ControlBar>
        <LabeledSlider label="θ" value={angle} min={0} max={rad(360)} onChange={setAngle}
          fmt={v => `${deg(v).toFixed(0)}°`} width={180} color="var(--accent)" />
        <LabeledSlider label="axis az" value={az} min={rad(-180)} max={rad(180)} onChange={setAz}
          fmt={v => `${deg(v).toFixed(0)}°`} width={160} color="#7a7a88" />
        <Readout label={<M>{"\\|R(q) - R(-q)\\|"}</M>} value={frob.toFixed(3)} color="#2f9e44" />
      </ControlBar>
    </WidgetShell>
  );
}

/* ===================================================== widget 2: SLERP ========= */

const Q_START: Quat = [1, 0, 0, 0];
const Q_END: Quat = quatFromAxisAngle(
  ((): Vec3 => {
    const a: Vec3 = [0.4, 0.55, 0.73];
    const n = Math.hypot(a[0], a[1], a[2]);
    return [a[0] / n, a[1] / n, a[2] / n];
  })(),
  rad(150),
);

function SlerpWidget() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT(prev => {
        const next = prev + dt * 0.45;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const qSlerp = slerp(Q_START, Q_END, t);
  const qLerp = lerpRaw(Q_START, Q_END, t); // NOT renormalized — leaves the sphere on purpose

  const startR = quatToMat3(Q_START);
  const endR = quatToMat3(Q_END);

  return (
    <>
      <WidgetShell
        title="SLERP vs. a straight-line blend"
        onReset={() => {
          setT(0);
          setPlaying(false);
        }}
        caption={
          <>
            Both panels interpolate the same start (faint) and end (faint) orientations as{" "}
            <span className="mono">t</span> runs 0 → 1. Left: SLERP rides the great circle of{" "}
            <M>{"S^3"}</M> — always a unit quaternion, always a rigid body. Right: the chord blend{" "}
            <M>{"(1-t)q_a + t\\,q_b"}</M> dips inside the sphere, so <M>{"\\|q\\| < 1"}</M> and the
            body shrinks and shears mid-motion.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 min-w-0">
            <div className="ui text-[11.5px] font-semibold text-[var(--ink-faint)] mb-1.5 text-center">
              SLERP — on the sphere
            </div>
            <Scene3D height={260} camera={[2.6, 2, 2.8]}>
              <Triad R={startR} ghost colors={["#dcb6b4", "#b8d4bd", "#b4c4dd"]} scale={1.3} />
              <Triad R={endR} ghost colors={["#dcb6b4", "#b8d4bd", "#b4c4dd"]} scale={1.3} />
              <QuatBody q={qSlerp} color="#2f7d44" />
            </Scene3D>
            <div className="ui mt-2 text-center">
              <Readout label={<M>{"\\|q\\|"}</M>} value={quatNorm(qSlerp).toFixed(3)} color="#2f9e44" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="ui text-[11.5px] font-semibold text-[var(--ink-faint)] mb-1.5 text-center">
              chord blend — leaves the sphere
            </div>
            <Scene3D height={260} camera={[2.6, 2, 2.8]}>
              <Triad R={startR} ghost colors={["#dcb6b4", "#b8d4bd", "#b4c4dd"]} scale={1.3} />
              <Triad R={endR} ghost colors={["#dcb6b4", "#b8d4bd", "#b4c4dd"]} scale={1.3} />
              <QuatBody q={qLerp} color="#c2571c" />
            </Scene3D>
            <div className="ui mt-2 text-center">
              <Readout
                label={<M>{"\\|q\\|"}</M>}
                value={quatNorm(qLerp).toFixed(3)}
                color={quatNorm(qLerp) < 0.97 ? "#d9483f" : "#2f9e44"}
              />
            </div>
          </div>
        </div>

        <ControlBar>
          <WidgetButton onClick={() => { if (t >= 1) setT(0); setPlaying(p => !p); }}>
            {playing ? "pause" : t >= 1 ? "replay" : "play"}
          </WidgetButton>
          <LabeledSlider label="t" value={t} min={0} max={1} onChange={v => { setPlaying(false); setT(v); }}
            fmt={v => v.toFixed(2)} width={220} color="var(--accent)" />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch2-quat-slerp" met={t > 0.985} holdMs={300}>
        Run the interpolation to <M>{"t = 1"}</M> (press <strong>play</strong>, or drag the slider
        home). Keep an eye on the two <M>{"\\|q\\|"}</M> readouts on the way: SLERP holds at{" "}
        <strong>1.000</strong> the whole trip, while the chord blend sags toward{" "}
        <span className="mono">~0.79</span> at the midpoint — that dip is the body leaving the space
        of rotations.
      </Challenge>
    </>
  );
}
