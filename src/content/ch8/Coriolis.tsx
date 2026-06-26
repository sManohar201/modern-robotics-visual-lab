import { useState, useEffect, useRef } from "react";
import { PageHeader, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad, PosedGroup } from "../../components/three/Scene3D";
import { PointArrow } from "../../components/three/viz3d";
import { type Vec3, deg, vsub, vnorm, vunit, vscale } from "../../lib/math/vec";
import { exp6, screwFromAxisPoint, se3Mul } from "../../lib/math/se3";
import { planar2R_c } from "./dynamics";

const LINK_COLORS = ["#c2571c", "#0b7285"] as const;
const JOINT_COLOR = "#33343d";
const CENT1_COLOR = "#3b6fd4"; // blue — centripetal toward base
const CENT2_COLOR = "#2f9e44"; // green — centripetal toward elbow
const COR_COLOR = "#d9483f"; // red — Coriolis
const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];

const L1 = 1.0;
const L2 = 0.8;
const m2 = 1.0;

export default function Coriolis() {
  const [t1, setT1] = useState(0.0);
  const [t2, setT2] = useState(Math.PI / 2);
  const [td1, setTd1] = useState(1.6);
  const [td2, setTd2] = useState(1.4);
  const [playing, setPlaying] = useState(false);

  // optional sweep: advance the angles at the chosen rates so the arm visibly moves
  const t1Ref = useRef(t1);
  const t2Ref = useRef(t2);
  t1Ref.current = t1;
  t2Ref.current = t2;
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      setT1(wrap(t1Ref.current + td1 * dt));
      setT2(wrap(t2Ref.current + td2 * dt));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, td1, td2]);

  // kinematics
  const c1 = Math.cos(t1), s1 = Math.sin(t1);
  const c12 = Math.cos(t1 + t2), s12 = Math.sin(t1 + t2);
  const S0 = screwFromAxisPoint([0, 0, 1], [0, 0, 0]);
  const S1 = screwFromAxisPoint([0, 0, 1], [L1, 0, 0]);
  const T1 = exp6(S0, t1);
  const T2 = se3Mul(T1, exp6(S1, t2));
  const base: Vec3 = [0, 0, 0];
  const elbow: Vec3 = [L1 * c1, L1 * s1, 0];
  const m2pos: Vec3 = [L1 * c1 + L2 * c12, L1 * s1 + L2 * s12, 0];

  // acceleration decomposition of m2 with theta-double-dot = 0
  // a2 = a_cent1 + a_cent2 + a_cor   (derived in §8.1.2)
  const R1 = vnorm(vsub(m2pos, base)); // distance joint1 -> m2
  const magC1 = td1 * td1 * R1;
  const aCent1 = vscale(vunit(vsub(base, m2pos)), magC1); // toward base
  const magC2 = td2 * td2 * L2;
  const aCent2 = vscale(vunit(vsub(elbow, m2pos)), magC2); // toward elbow
  const u12: Vec3 = [c12, s12, 0]; // elbow -> m2 direction
  const magCor = 2 * L2 * Math.abs(td1 * td2);
  const aCor = vscale(u12, -2 * L2 * td1 * td2); // along -u12 when td1 td2 > 0

  // velocity-product joint torques c(theta, thetadot)
  const cTorq = planar2R_c([t1, t2], [td1, td2], [1, m2], [L1, L2]);

  const accScale = 0.06;
  const bent = Math.abs(Math.sin(t2)) > 0.2;
  const met = magCor > 2.0 && bent;

  return (
    <div>
      <PageHeader
        chapter="Chapter 8"
        section="Dynamics of Open Chains"
        title="Coriolis & Centripetal Forces"
        lede="Joint coordinates do not live in an inertial frame. So even when no joint is accelerating, the masses are: spinning links sling them around in circles and deflect them sideways. These velocity-squared effects are the vector c(θ, θ̇)."
      />

      <p>
        With <M>{"\\ddot{\\theta} = 0"}</M> the joints turn at constant rate, yet the tip mass{" "}
        <M>{"\\mathfrak{m}_2"}</M> still accelerates. Its acceleration splits cleanly into three
        pieces, each quadratic in the joint rates:
      </p>
      <Eq>{"a_2 = \\underbrace{\\dot\\theta_1^2\\,R_1\\,\\hat{u}_{\\to 1}}_{\\text{centripetal about joint 1}} + \\underbrace{\\dot\\theta_2^2\\,L_2\\,\\hat{u}_{\\to 2}}_{\\text{centripetal about joint 2}} + \\underbrace{(-2 L_2\\,\\dot\\theta_1\\dot\\theta_2)\\,\\hat{u}_{12}}_{\\text{Coriolis}}."}</Eq>
      <p>
        The two <strong>centripetal</strong> terms pull <M>{"\\mathfrak{m}_2"}</M> straight toward
        the joint it is circling — without them the mass would fly off on a tangent. The{" "}
        <strong>Coriolis</strong> term needs <em>both</em> joints moving (it carries the product{" "}
        <M>{"\\dot\\theta_1\\dot\\theta_2"}</M>) and vanishes the instant either rate is zero.
        Projected back onto the joints, these become the velocity-product torques{" "}
        <M>{"c(\\theta, \\dot\\theta)"}</M>.
      </p>

      <WidgetShell
        title="Acceleration of the tip mass (θ̈ = 0)"
        onReset={() => {
          setT1(0.0);
          setT2(Math.PI / 2);
          setTd1(1.6);
          setTd2(1.4);
          setPlaying(false);
        }}
        caption={
          <>
            Vectors on <M>{"\\mathfrak{m}_2"}</M>:{" "}
            <span style={{ color: CENT1_COLOR }}>centripetal toward the base</span>,{" "}
            <span style={{ color: CENT2_COLOR }}>centripetal toward the elbow</span>, and the{" "}
            <span style={{ color: COR_COLOR }}>Coriolis</span> vector. Set either rate to zero to
            watch a term collapse. Press play to let the arm sweep at these rates.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={380} camera={[0, 0, 3.4]}>
              <Triad ghost colors={GHOST} scale={0.4} />
              <PosedGroup R={T1.R} p={[T1.p[0], T1.p[1], T1.p[2]]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.06, 0.06, 0.15, 20]} />
                  <meshStandardMaterial color={JOINT_COLOR} />
                </mesh>
                <mesh position={[L1 / 2, 0, 0]}>
                  <boxGeometry args={[L1, 0.08, 0.04]} />
                  <meshStandardMaterial color={LINK_COLORS[0]} />
                </mesh>
              </PosedGroup>
              <mesh position={elbow}>
                <sphereGeometry args={[0.055, 16, 16]} />
                <meshStandardMaterial color={LINK_COLORS[0]} />
              </mesh>
              <PosedGroup R={T2.R} p={[T2.p[0], T2.p[1], T2.p[2]]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.05, 0.05, 0.12, 20]} />
                  <meshStandardMaterial color={JOINT_COLOR} />
                </mesh>
                <mesh position={[L2 / 2, 0, 0]}>
                  <boxGeometry args={[L2, 0.065, 0.03]} />
                  <meshStandardMaterial color={LINK_COLORS[1]} />
                </mesh>
              </PosedGroup>
              <mesh position={m2pos}>
                <sphereGeometry args={[0.08, 18, 18]} />
                <meshStandardMaterial color="#33343d" />
              </mesh>
              <PointArrow at={m2pos} dir={aCent1} length={magC1 * accScale} color={CENT1_COLOR} thickness={0.028} />
              <PointArrow at={m2pos} dir={aCent2} length={magC2 * accScale} color={CENT2_COLOR} thickness={0.028} />
              <PointArrow at={m2pos} dir={aCor} length={magCor * accScale} color={COR_COLOR} thickness={0.03} />
            </Scene3D>
          </div>

          <div className="w-full md:w-[260px] shrink-0 flex flex-col gap-4">
            <div className="flex gap-2">
              <WidgetButton active={playing} onClick={() => setPlaying(p => !p)}>
                {playing ? "Pause" : "Play sweep"}
              </WidgetButton>
            </div>
            <div className="border-t border-[var(--rule)] pt-3 flex flex-col gap-3">
              <LabeledSlider label={<M>{"\\theta_1"}</M>} value={t1} min={-Math.PI} max={Math.PI} onChange={setT1} fmt={v => `${deg(v).toFixed(0)}°`} disabled={playing} />
              <LabeledSlider label={<M>{"\\theta_2"}</M>} value={t2} min={-Math.PI} max={Math.PI} onChange={setT2} fmt={v => `${deg(v).toFixed(0)}°`} disabled={playing} />
              <LabeledSlider label={<M>{"\\dot\\theta_1"}</M>} value={td1} min={-3} max={3} step={0.05} onChange={setTd1} fmt={v => `${v.toFixed(2)}`} />
              <LabeledSlider label={<M>{"\\dot\\theta_2"}</M>} value={td2} min={-3} max={3} step={0.05} onChange={setTd2} fmt={v => `${v.toFixed(2)}`} />
            </div>
            <div className="border-t border-[var(--rule)] pt-3 flex flex-col gap-2">
              <Readout label="centripetal · 1" value={magC1.toFixed(2)} color={CENT1_COLOR} />
              <Readout label="centripetal · 2" value={magC2.toFixed(2)} color={CENT2_COLOR} />
              <Readout label="|Coriolis|" value={magCor.toFixed(2)} color={magCor > 2 ? "var(--good)" : COR_COLOR} />
              <div className="border-t border-[var(--rule)] pt-2 mt-1">
                <Readout label={<M>{"c(\\theta,\\dot\\theta)"}</M>} value={`[${cTorq[0].toFixed(2)}, ${cTorq[1].toFixed(2)}]`} />
              </div>
            </div>
          </div>
        </div>
      </WidgetShell>

      <Challenge id="ch8-coriolis-deflect" met={met}>
        Spin <em>both</em> joints fast enough, with a bent elbow, to drive the Coriolis
        acceleration past <M>{"2\\,\\text{m/s}^2"}</M>. Then zero either rate and watch the red
        vector vanish — Coriolis lives entirely in the cross-term{" "}
        <M>{"\\dot\\theta_1\\dot\\theta_2"}</M>.
      </Challenge>

      <Aside>
        The centripetal terms each create zero torque about the joint they circle (the force
        points through the axis), but they do load the <em>other</em> joints. This is the skater
        effect: as joint 2's motion pulls <M>{"\\mathfrak{m}_2"}</M> inward, the arm's inertia
        about the base drops and joint 1 must apply torque to keep <M>{"\\dot\\theta_1"}</M>{" "}
        constant.
      </Aside>

      <KeyIdea>
        The vector <M>{"c(\\theta, \\dot\\theta)"}</M> is quadratic in velocity: centripetal terms
        carry <M>{"\\dot\\theta_i^2"}</M> and pull masses toward their centers of rotation, while
        Coriolis terms carry <M>{"\\dot\\theta_i\\dot\\theta_j"}</M> and need two joints moving at
        once. Both come for free from the mass matrix via the Christoffel symbols.
      </KeyIdea>

      <BookRef>Modern Robotics §8.1.2 — Coriolis and centripetal terms (Fig. 8.2).</BookRef>
    </div>
  );
}

function wrap(a: number) {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
}
