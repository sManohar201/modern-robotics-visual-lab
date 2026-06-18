import { useRef, useState } from "react";
import { Line } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Mat3Display } from "../../components/widgets/MatrixDisplay";
import { Scene3D, Triad, AXIS_COLORS } from "../../components/three/Scene3D";
import { rad, deg, wrapAngle, mat3Mul, mat3Det, type Vec3, type Mat3 } from "../../lib/math/vec";
import { rotX, rotY, rotZ } from "../../lib/math/so3";

export default function Representation() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 2"
        section="Configuration Space"
        title="Representing C-space"
        lede="Topology names the shape of C-space. But a shape without coordinates is just a picture — to run algorithms, interpolate paths, and write control laws, we need numbers. How we assign those numbers to configurations is not a neutral choice."
      />

      <p>
        We know, for example, that a revolute joint's configuration lives on a circle{" "}
        <M>{"S^1"}</M>. But when we write code, we must assign a real number to every point on
        that circle. There are many ways to do this, and they differ in important ways. Two
        strategies dominate all of robotics.
      </p>

      <H2>Explicit parametrization: minimal coordinates</H2>
      <p>
        An <strong>explicit parametrization</strong> uses exactly <M>{"n"}</M> coordinates to
        describe an <M>{"n"}</M>-dimensional C-space — one number per degree of freedom, with no
        constraints among the coordinates. These are sometimes called{" "}
        <em>minimal coordinates</em> or <em>generalized coordinates</em>.
      </p>
      <p>
        For a revolute joint, the natural explicit parametrization is the angle{" "}
        <M>{"\\theta \\in [0, 2\\pi)"}</M>. For a planar rigid body, the three numbers{" "}
        <M>{"(x, y, \\theta)"}</M> are an explicit parametrization of <M>{"\\mathbb{R}^2 \\times S^1"}</M>.
        For the unit sphere <M>{"S^2"}</M> (the set of all unit vectors in{" "}
        <M>{"\\mathbb{R}^3"}</M>), the familiar explicit parametrization is latitude and longitude:
      </p>
      <Eq>{"(\\phi, \\lambda) \\in \\left[-\\tfrac{\\pi}{2}, \\tfrac{\\pi}{2}\\right] \\times [0, 2\\pi)"}</Eq>
      <p>
        Two numbers for a 2D space — compact, and directly interpretable.
      </p>

      <H2>The cost of being minimal: coordinate singularities</H2>
      <p>
        At the North Pole of the sphere — <M>{"\\phi = \\pi/2"}</M> — the longitude{" "}
        <M>{"\\lambda"}</M> is undefined. Every choice of <M>{"\\lambda"}</M> gives the same
        physical point. More precisely: the map from coordinates <M>{"(\\phi, \\lambda)"}</M> to
        points on the sphere breaks down at the poles. The Jacobian of the coordinate map becomes
        singular — not rank 2, but rank 1.
      </p>
      <p>
        The consequences for computation are serious. If the configuration lies near a pole, a
        small physical motion produces an enormous change in <M>{"\\lambda"}</M>. Numerical
        integration blows up. Control laws computed in these coordinates give wrong answers. Path
        interpolation produces nonsensical trajectories — a straight line in{" "}
        <M>{"(\\phi, \\lambda)"}</M> space is not a geodesic on the sphere. Feel the failure
        yourself:
      </p>

      <GlobeWidget />

      <p>
        This failure is called a <strong>coordinate singularity</strong>. It is not a physical
        limitation — the sphere has no singular points. A ball resting at the North Pole is
        perfectly well-defined physically; it is only the latitude-longitude{" "}
        <em>representation</em> that fails. A different chart (a different choice of coordinates)
        could cover the poles without singularity — but by a theorem of topology, no single smooth
        chart can cover all of <M>{"S^2"}</M>. At least two overlapping charts are always needed.
        The singularity is a property of the map, not of the space.
      </p>

      <H2>Implicit parametrization: embedded coordinates</H2>
      <p>
        An <strong>implicit parametrization</strong> (or <em>embedded parametrization</em>)
        uses more than <M>{"n"}</M> coordinates, subject to constraints that restrict them to the
        manifold. The coordinates live in a higher-dimensional ambient space; the constraint
        equations carve out the actual C-space as a subset of that space.
      </p>
      <p>
        For the unit sphere <M>{"S^2"}</M>, the implicit parametrization is:
      </p>
      <Eq>{"(x, y, z) \\in \\mathbb{R}^3 \\quad \\text{subject to} \\quad x^2 + y^2 + z^2 = 1"}</Eq>
      <p>
        Three coordinates and one constraint — one more coordinate than the dimension of the
        space. There is no singularity anywhere. At the North Pole, the point is simply{" "}
        <M>{"(0, 0, 1)"}</M> — a perfectly ordinary triple of numbers. Small physical motions
        near the pole correspond to small changes in <M>{"x, y, z"}</M>. The Jacobian of the
        embedding map always has full rank 2 on the sphere. (The widget above shows this too:
        watch the <M>{"(x, y, z)"}</M> readout stay calm while <M>{"\\lambda"}</M> panics.)
      </p>
      <p>
        The price is redundancy: we carry an extra coordinate and must enforce the constraint{" "}
        <M>{"x^2 + y^2 + z^2 = 1"}</M> at every step of a computation. Integration or
        optimization must be projected back onto the constraint surface.
      </p>

      <KeyIdea>
        Explicit (minimal) parametrizations are compact but always singular somewhere on a curved
        space. Implicit (embedded) parametrizations carry extra coordinates and constraints but are
        globally non-singular. The trade-off is compactness versus uniformity.
      </KeyIdea>

      <H2>Euler angles and gimbal lock</H2>
      <p>
        The most practically important example of this trade-off is the orientation of a rigid body
        in 3D — the rotation group <M>{"SO(3)"}</M>. A free rigid body has 3 rotational DOF, so
        an explicit parametrization uses exactly 3 numbers. The most common choices are{" "}
        <em>Euler angles</em>: any sequence of three rotations about body-fixed or space-fixed axes
        that together describe any orientation.
      </p>
      <p>
        The ZYX Euler angles, for instance, describe orientation as a yaw rotation by{" "}
        <M>{"\\alpha"}</M>, followed by pitch by <M>{"\\beta"}</M>, followed by roll by{" "}
        <M>{"\\gamma"}</M>. Any orientation in <M>{"SO(3)"}</M> can be expressed this way —
        except when <M>{"\\beta = \\pm\\pi/2"}</M>. At that configuration, yaw and roll rotate
        about the same physical axis; the third coordinate becomes redundant and one rotational DOF
        effectively disappears from the representation. This is <strong>gimbal lock</strong>.
      </p>

      <GimbalWidget />

      <p>
        Gimbal lock is not a physical limitation — the body can still rotate freely in all three
        directions. It is a singularity of the Euler angle parametrization. And it is unavoidable:{" "}
        <em>every</em> set of three angles fails at some configuration. This follows from a
        topological fact — <M>{"SO(3)"}</M> cannot be covered by a single non-singular chart, just
        as <M>{"S^2"}</M> cannot. The 1969 Apollo 11 mission famously carried a gimbal lock warning
        in its inertial measurement unit; the crew had to manually maneuver to avoid the singular
        orientation.
      </p>

      <H2>Rotation matrices: the implicit choice</H2>
      <p>
        A <strong>rotation matrix</strong> <M>{"R"}</M> is a <M>{"3 \\times 3"}</M> matrix
        satisfying:
      </p>
      <Eq>{"R^\\top R = I, \\quad \\det R = +1"}</Eq>
      <p>
        Nine numbers subject to six independent constraints — net 3 DOF. This is the implicit
        parametrization of <M>{"SO(3)"}</M>. Embedded in{" "}
        <M>{"\\mathbb{R}^{3 \\times 3}"}</M> with constraints carved out by the orthogonality
        equations, the rotation matrix is everywhere non-singular as a representation of
        orientation.
      </p>
      <p>
        At <em>every</em> rotation — including the configurations where Euler angles become
        singular — the rotation matrix is a perfectly ordinary <M>{"3 \\times 3"}</M> array of
        numbers. Infinitesimal rotations correspond to infinitesimal changes in the matrix entries.
        There is no configuration where the representation breaks down. You saw this live in the
        gimbal widget: at lock, the Euler-rate Jacobian determinant hit zero while{" "}
        <M>{"R"}</M> itself sat there unbothered, <M>{"\\det R = 1"}</M>.
      </p>
      <p>
        This is why Modern Robotics uses rotation matrices — and later, <M>{"4 \\times 4"}</M>{" "}
        transformation matrices for full rigid-body poses — rather than Euler angles or quaternions
        as its primary representation. The extra storage cost (9 numbers instead of 3) buys
        something real: freedom from singularities everywhere in the space of orientations.
      </p>

      <Aside>
        Unit quaternions are another implicit representation of <M>{"SO(3)"}</M>: four numbers
        subject to one constraint <M>{"q_0^2 + q_1^2 + q_2^2 + q_3^2 = 1"}</M>, no
        singularities. They are more compact than rotation matrices and are widely used in
        computer graphics and spacecraft control. Modern Robotics discusses them in Appendix B.
        Rotation matrices are preferred in the main text because they compose and transform
        vectors by ordinary matrix multiplication — algebraically transparent.
      </Aside>

      <p>
        The next chapter opens with rotation matrices precisely because of this discussion. Having
        understood why Euler angles fail, the choice of a <M>{"3 \\times 3"}</M> matrix as the
        representation of orientation is not a matter of convention — it is the natural consequence
        of wanting a globally non-singular implicit parametrization of <M>{"SO(3)"}</M>.
      </p>

      <BookRef>Modern Robotics §2.3.2 — Configuration Space Representation; Appendix B — Other Representations of Rotation.</BookRef>
    </div>
  );
}

/* ================= widget: globe / latitude-longitude singularity ================= */

const RG = 1.2; // globe radius

function sphPoint(phi: number, lam: number): Vec3 {
  return [RG * Math.cos(phi) * Math.cos(lam), RG * Math.cos(phi) * Math.sin(lam), RG * Math.sin(phi)];
}

/** Latitude/longitude grid lines on the globe. */
function GlobeGrid() {
  const lines: { pts: Vec3[]; key: string; main?: boolean }[] = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    const pts: Vec3[] = [];
    for (let i = 0; i <= 72; i++) pts.push(sphPoint(rad(lat), (i / 72) * 2 * Math.PI));
    lines.push({ pts, key: `lat${lat}`, main: lat === 0 });
  }
  for (let lon = 0; lon < 180; lon += 15) {
    const pts: Vec3[] = [];
    for (let i = 0; i <= 72; i++) pts.push(sphPoint(-Math.PI + (i / 72) * 2 * Math.PI, rad(lon)));
    lines.push({ pts, key: `lon${lon}`, main: lon === 0 });
  }
  return (
    <>
      {lines.map(l => (
        <Line
          key={l.key}
          points={l.pts}
          color={l.main ? "#8a8a9b" : "#b9b5a8"}
          lineWidth={l.main ? 1.6 : 1}
          transparent
          opacity={l.main ? 0.9 : 0.55}
        />
      ))}
    </>
  );
}

function GlobeDot({
  phi,
  lam,
  onDrag,
}: {
  phi: number;
  lam: number;
  onDrag: (u: Vec3) => void;
}) {
  const dragging = useRef(false);
  const controls = useThree(s => s.controls) as unknown as { enabled: boolean } | null;
  const p = sphPoint(phi, lam);

  const pickSphere = (e: { ray: { origin: { x: number; y: number; z: number }; direction: { x: number; y: number; z: number } } }): Vec3 => {
    // intersect the world-space pointer ray with the globe (centered at origin)
    const o = e.ray.origin;
    const d = e.ray.direction;
    const b = o.x * d.x + o.y * d.y + o.z * d.z;
    const c = o.x * o.x + o.y * o.y + o.z * o.z - RG * RG;
    const disc = b * b - c;
    const t = disc >= 0 ? -b - Math.sqrt(disc) : -b; // miss: take closest point to center
    const h = [o.x + t * d.x, o.y + t * d.y, o.z + t * d.z];
    // world (three, y-up) -> math (z-up): (x, y, z)_math = (x, -z, y)_world
    const m: Vec3 = [h[0], -h[2], h[1]];
    const n = Math.hypot(m[0], m[1], m[2]) || 1;
    return [m[0] / n, m[1] / n, m[2] / n];
  };

  return (
    <mesh
      position={p}
      onPointerDown={e => {
        e.stopPropagation();
        dragging.current = true;
        if (controls) controls.enabled = false;
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }}
      onPointerUp={() => {
        dragging.current = false;
        if (controls) controls.enabled = true;
      }}
      onPointerMove={e => {
        if (!dragging.current) return;
        e.stopPropagation();
        onDrag(pickSphere(e));
      }}
    >
      <sphereGeometry args={[0.09, 20, 20]} />
      <meshStandardMaterial color="#d9483f" />
    </mesh>
  );
}

function GlobeWidget() {
  const [q, setQ] = useState<[number, number]>([rad(35), rad(40)]); // (phi, lam)
  const [sens, setSens] = useState(1);
  const prevU = useRef<Vec3 | null>(null);

  const [phi, lam] = q;
  const u: Vec3 = [Math.cos(phi) * Math.cos(lam), Math.cos(phi) * Math.sin(lam), Math.sin(phi)];

  const onDrag = (nu: Vec3) => {
    const nphi = Math.asin(Math.max(-1, Math.min(1, nu[2])));
    const nlam = Math.atan2(nu[1], nu[0]);
    const pu = prevU.current;
    if (pu) {
      const dot = Math.max(-1, Math.min(1, pu[0] * nu[0] + pu[1] * nu[1] + pu[2] * nu[2]));
      const dPhys = Math.acos(dot); // physical motion on the sphere, radians
      const dLam = Math.abs(wrapAngle(nlam - lam));
      if (dPhys > 1e-4) setSens(dLam / dPhys);
    }
    prevU.current = nu;
    setQ([nphi, nlam]);
  };

  const met = sens > 8;

  return (
    <>
      <WidgetShell
        title="Latitude & longitude — a chart that fails at the poles"
        onReset={() => {
          setQ([rad(35), rad(40)]);
          setSens(1);
          prevU.current = null;
        }}
        caption={
          <>
            Drag the red configuration point. Away from the poles, λ tracks your hand calmly.
            Near a pole, tiny physical motions slew λ violently — the readout{" "}
            <span className="mono">|Δλ| / |Δp|</span> is how many degrees of coordinate change you
            pay per degree of actual motion. The embedded <span className="mono">(x, y, z)</span>{" "}
            never panics.
          </>
        }
      >
        <Scene3D camera={[2.4, 2.6, 3.0]} height={380}>
          <mesh>
            <sphereGeometry args={[RG - 0.005, 48, 48]} />
            <meshStandardMaterial color="#efeadf" roughness={0.85} />
          </mesh>
          <GlobeGrid />
          {/* poles */}
          <mesh position={[0, 0, RG]}>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshStandardMaterial color="#6741d9" />
          </mesh>
          <mesh position={[0, 0, -RG]}>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshStandardMaterial color="#6741d9" />
          </mesh>
          <GlobeDot phi={phi} lam={lam} onDrag={onDrag} />
        </Scene3D>
        <ControlBar>
          <Readout label="lat φ" value={`${deg(phi).toFixed(1)}°`} color="#2f9e44" />
          <Readout label="lon λ" value={`${deg(lam).toFixed(1)}°`} color="#d9483f" />
          <Readout label="|Δλ| / |Δp|" value={`${sens.toFixed(1)}×`} color={sens > 4 ? "#d9483f" : undefined} />
          <Readout
            label="(x, y, z)"
            value={`(${u[0].toFixed(2)}, ${u[1].toFixed(2)}, ${u[2].toFixed(2)})`}
          />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch2-rep-pole" met={met} holdMs={300}>
        Drag the point up near the purple pole and circle it slowly. Get the coordinate
        sensitivity <M>{"|\\Delta\\lambda| / |\\Delta p|"}</M> above <strong>8×</strong> — eight
        degrees of longitude change for one degree of physical motion. Your hand is moving smoothly;
        only the <em>chart</em> is screaming.
      </Challenge>
    </>
  );
}

/* ================= widget: gimbal lock ================= */

function GimbalRing({ radius, color, tube = 0.035 }: { radius: number; color: string; tube?: number }) {
  return (
    <mesh>
      <torusGeometry args={[radius, tube, 16, 80]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}

function GimbalWidget() {
  const [alpha, setAlpha] = useState(rad(25));
  const [beta, setBeta] = useState(rad(20));
  const [gamma, setGamma] = useState(rad(15));

  const R: Mat3 = mat3Mul(rotZ(alpha), mat3Mul(rotY(beta), rotX(gamma)));
  const detJ = Math.cos(beta); // Euler-rate Jacobian determinant for ZYX
  const locked = Math.abs(detJ) < 0.07; // within ~4° of β = ±90°

  return (
    <>
      <WidgetShell
        title="Three nested rings — watch two of them become one"
        onReset={() => {
          setAlpha(rad(25));
          setBeta(rad(20));
          setGamma(rad(15));
        }}
        caption={
          <>
            ZYX Euler angles as a physical gimbal: the <span className="cz font-semibold">blue ring</span>{" "}
            yaws about ẑ, the <span className="cy font-semibold">green ring</span> pitches about the
            carried ŷ′, the <span className="cx font-semibold">red ring</span> rolls about the
            twice-carried x̂″. Push β to ±90° and the red ring falls into the blue ring's plane —
            two of your three knobs now do the same thing.
          </>
        }
      >
        <Scene3D camera={[2.6, 2.2, 3.2]} height={380}>
          {/* outer ring: yaw about z. Torus symmetry axis is local z — already correct. */}
          <group rotation={[0, 0, alpha]}>
            <GimbalRing radius={1.25} color={AXIS_COLORS.z} />
            {/* middle ring: pitch about carried y' */}
            <group rotation={[0, beta, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.0, 0.035, 16, 80]} />
                <meshStandardMaterial color={AXIS_COLORS.y} roughness={0.5} />
              </mesh>
              {/* inner ring: roll about twice-carried x'' */}
              <group rotation={[gamma, 0, 0]}>
                <mesh rotation={[0, Math.PI / 2, 0]}>
                  <torusGeometry args={[0.75, 0.035, 16, 80]} />
                  <meshStandardMaterial color={AXIS_COLORS.x} roughness={0.5} />
                </mesh>
                {/* the body carried by the gimbal */}
                <Triad scale={0.55} thickness={0.03} />
                <mesh>
                  <boxGeometry args={[0.42, 0.28, 0.18]} />
                  <meshStandardMaterial color="#c2571c" roughness={0.6} />
                </mesh>
              </group>
            </group>
          </group>
        </Scene3D>

        <ControlBar>
          <LabeledSlider label="α yaw" value={alpha} min={rad(-180)} max={rad(180)} onChange={setAlpha}
            fmt={v => `${deg(v).toFixed(0)}°`} color={AXIS_COLORS.z} width={160} />
          <LabeledSlider label="β pitch" value={beta} min={rad(-90)} max={rad(90)} onChange={setBeta}
            fmt={v => `${deg(v).toFixed(0)}°`} color={AXIS_COLORS.y} width={160} />
          <LabeledSlider label="γ roll" value={gamma} min={rad(-180)} max={rad(180)} onChange={setGamma}
            fmt={v => `${deg(v).toFixed(0)}°`} color={AXIS_COLORS.x} width={160} />
        </ControlBar>

        <div className="ui flex flex-wrap items-center gap-x-6 gap-y-3 mt-4">
          <Mat3Display m={R} label={<M>{"R ="}</M>} digits={2} />
          <div className="flex flex-col gap-1.5">
            <Readout label="det R (the physics)" value={mat3Det(R).toFixed(3)} color="#2f9e44" />
            <Readout
              label="det J(β) = cos β (the chart)"
              value={detJ.toFixed(3)}
              color={locked ? "#d9483f" : undefined}
            />
            {locked && (
              <span className="text-[12px] font-semibold text-[#d9483f]">
                GIMBAL LOCK — the chart just lost a dimension
              </span>
            )}
          </div>
        </div>
      </WidgetShell>

      <Challenge id="ch2-rep-gimbal" met={locked} holdMs={400}>
        Drive <M>{"\\beta"}</M> to <M>{"\\pm 90^\\circ"}</M>. The red and blue rings become
        coplanar, and the Euler-rate Jacobian determinant <M>{"\\cos\\beta"}</M> hits zero: yawing
        and rolling are now the <em>same</em> motion, so no combination of your three sliders can
        produce the lost rotation — instantaneously, the chart is down to 2 DOF. Meanwhile{" "}
        <M>{"\\det R = 1"}</M>, utterly indifferent.
      </Challenge>
    </>
  );
}
