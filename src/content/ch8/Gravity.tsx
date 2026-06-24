import { useState, useEffect, useRef } from "react";
import { PageHeader, M, Eq, KeyIdea, BookRef } from "../../components/prose";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad, PosedGroup } from "../../components/three/Scene3D";
import { PointArrow } from "../../components/three/viz3d";
import { Line } from "@react-three/drei";
import { type Vec3, deg, mat3Identity } from "../../lib/math/vec";
import { exp6, screwFromAxisPoint, se3Mul } from "../../lib/math/se3";
import { planar2R_M, planar2R_c, planar2R_g } from "./dynamics";

const LINK_COLORS = ["#c2571c", "#0b7285"] as const;
const JOINT_COLOR = "#33343d";
const GRAV_COLOR = "#d9483f"; // red — gravity
const COMP_COLOR = "#2f9e44"; // green — compensation
const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];

const L1 = 1.0;
const L2 = 0.8;
const m1 = 1.0;
const m2 = 1.0;
const g = 9.81;
const m: [number, number] = [m1, m2];
const L: [number, number] = [L1, L2];

const TARGET1 = 0.5236; // 30 deg
const TARGET2 = 1.0472; // 60 deg

export default function Gravity() {
  const [compOn, setCompOn] = useState(true);
  const [t1, setT1] = useState(TARGET1);
  const [t2, setT2] = useState(TARGET2);

  // simulation state lives in refs so the rAF loop never restarts mid-fall
  const sim = useRef({ t1, t2, td1: 0, td2: 0 });

  useEffect(() => {
    if (compOn) {
      // compensation holds the arm exactly where the sliders put it
      sim.current.td1 = 0;
      sim.current.td2 = 0;
      return;
    }
    // release: start falling from the current pose, at rest
    sim.current = { t1, t2, td1: 0, td2: 0 };
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.025, (now - last) / 1000);
      last = now;
      const s = sim.current;
      const th: [number, number] = [s.t1, s.t2];
      const thd: [number, number] = [s.td1, s.td2];
      const Mm = planar2R_M(th, m, L);
      const cv = planar2R_c(th, thd, m, L);
      const gv = planar2R_g(th, m, L, g);
      const damp = 1.2;
      // tau_applied = 0 (no compensation); net = -c - g - damping*thetadot
      const net1 = -cv[0] - gv[0] - damp * s.td1;
      const net2 = -cv[1] - gv[1] - damp * s.td2;
      const [M11, M12, , M22] = Mm;
      const det = M11 * M22 - M12 * M12;
      const a1 = (M22 * net1 - M12 * net2) / det;
      const a2 = (-M12 * net1 + M11 * net2) / det;
      // semi-implicit Euler
      s.td1 += a1 * dt;
      s.td2 += a2 * dt;
      s.t1 += s.td1 * dt;
      s.t2 += s.td2 * dt;
      setT1(s.t1);
      setT2(s.t2);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compOn]);

  const theta: [number, number] = [t1, t2];
  const gTorq = planar2R_g(theta, m, L, g);
  const P = (m1 + m2) * g * L1 * Math.sin(t1) + m2 * g * L2 * Math.sin(t1 + t2);

  // kinematics
  const S0 = screwFromAxisPoint([0, 0, 1], [0, 0, 0]);
  const S1 = screwFromAxisPoint([0, 0, 1], [L1, 0, 0]);
  const T1 = exp6(S0, t1);
  const T2 = se3Mul(T1, exp6(S1, t2));
  const pElbow: Vec3 = [T1.p[0], T1.p[1], 0];
  const eeP = se3Mul(T2, { R: mat3Identity(), p: [L2, 0, 0] }).p;
  const pEE: Vec3 = [eeP[0], eeP[1], 0];
  const c1 = se3Mul(T1, { R: mat3Identity(), p: [L1 / 2, 0, 0] }).p;
  const c2 = se3Mul(T2, { R: mat3Identity(), p: [L2 / 2, 0, 0] }).p;
  const pC1: Vec3 = [c1[0], c1[1], 0];
  const pC2: Vec3 = [c2[0], c2[1], 0];

  // target ghost pose
  const Tg1 = exp6(S0, TARGET1);
  const Tg2 = se3Mul(Tg1, exp6(S1, TARGET2));
  const gElbow: Vec3 = [Tg1.p[0], Tg1.p[1], 0];
  const gEEraw = se3Mul(Tg2, { R: mat3Identity(), p: [L2, 0, 0] }).p;
  const gEE: Vec3 = [gEEraw[0], gEEraw[1], 0];

  const fScale = 0.07;
  const met = compOn && Math.abs(t1 - TARGET1) < 0.14 && Math.abs(t2 - TARGET2) < 0.14;

  return (
    <div>
      <PageHeader
        chapter="Chapter 8"
        section="Dynamics of Open Chains"
        title="Gravity Compensation"
        lede="Gravity pulls on every link, producing posture-dependent torques the motors must constantly fight. Feed those exact torques forward and the robot goes weightless — it holds any pose, and a person can guide it with a fingertip."
      />

      <p>
        The gravitational torques are the gradient of the potential energy{" "}
        <M>{"\\mathcal{P}(\\theta)"}</M>:
      </p>
      <Eq>{"g(\\theta) = \\frac{\\partial \\mathcal{P}}{\\partial \\theta}, \\qquad \\mathcal{P}(\\theta) = (\\mathfrak{m}_1 + \\mathfrak{m}_2) g L_1 \\sin\\theta_1 + \\mathfrak{m}_2 g L_2 \\sin(\\theta_1 + \\theta_2)."}</Eq>
      <p>
        These are the only velocity-independent torques in the dynamics{" "}
        <M>{"\\tau = M(\\theta)\\ddot\\theta + c(\\theta,\\dot\\theta) + g(\\theta)"}</M>, so they
        are what a stationary arm needs just to keep from sagging.{" "}
        <strong>Gravity compensation</strong> commands the feedforward torque{" "}
        <M>{"\\tau = g(\\theta)"}</M>: the gravity terms cancel and the arm behaves as if it were
        in orbit — it stays wherever you leave it. Switch it off and the only equilibrium left is
        hanging straight down (<M>{"\\theta_1 = -90^\\circ,\\ \\theta_2 = 0^\\circ"}</M>).
      </p>

      <WidgetShell
        title="Compensation on/off"
        onReset={() => {
          setCompOn(true);
          setT1(TARGET1);
          setT2(TARGET2);
        }}
        caption={
          <>
            <span style={{ color: GRAV_COLOR }}>Red</span> arrows are gravity on each link's
            center of mass; <span style={{ color: COMP_COLOR }}>green</span> arrows are the
            feedforward compensation. With compensation on, drag the arm anywhere and it floats.
            Turn it off to watch it fall and settle. The faint arm marks the challenge target.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={380} camera={[0, 0, 3.4]}>
              <Triad ghost colors={GHOST} scale={0.4} />

              {/* target ghost arm */}
              <Line points={[[0, 0, 0], gElbow]} color="#b9b5a8" lineWidth={3} dashed dashSize={0.08} gapSize={0.05} />
              <Line points={[gElbow, gEE]} color="#b9b5a8" lineWidth={3} dashed dashSize={0.08} gapSize={0.05} />
              <mesh position={gEE}>
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial color="#b9b5a8" transparent opacity={0.8} />
              </mesh>

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
              <mesh position={pElbow}>
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
              <mesh position={pEE}>
                <sphereGeometry args={[0.06, 18, 18]} />
                <meshStandardMaterial color={LINK_COLORS[1]} />
              </mesh>

              <PointArrow at={pC1} dir={[0, -1, 0]} length={m1 * g * fScale} color={GRAV_COLOR} thickness={0.024} />
              <PointArrow at={pC2} dir={[0, -1, 0]} length={m2 * g * fScale} color={GRAV_COLOR} thickness={0.024} />
              {compOn && (
                <>
                  <PointArrow at={pC1} dir={[0, 1, 0]} length={m1 * g * fScale} color={COMP_COLOR} thickness={0.02} />
                  <PointArrow at={pC2} dir={[0, 1, 0]} length={m2 * g * fScale} color={COMP_COLOR} thickness={0.02} />
                </>
              )}
            </Scene3D>
          </div>

          <div className="w-full md:w-[250px] shrink-0 flex flex-col gap-4">
            <div className="flex gap-2">
              <WidgetButton active={compOn} onClick={() => setCompOn(true)}>compensation on</WidgetButton>
              <WidgetButton active={!compOn} onClick={() => setCompOn(false)}>off</WidgetButton>
            </div>
            <div className="border-t border-[var(--rule)] pt-3 flex flex-col gap-3">
              <LabeledSlider label={<M>{"\\theta_1"}</M>} value={t1} min={-Math.PI} max={Math.PI} onChange={setT1} fmt={v => `${deg(v).toFixed(0)}°`} disabled={!compOn} />
              <LabeledSlider label={<M>{"\\theta_2"}</M>} value={t2} min={-Math.PI} max={Math.PI} onChange={setT2} fmt={v => `${deg(v).toFixed(0)}°`} disabled={!compOn} />
            </div>
            <div className="border-t border-[var(--rule)] pt-3 flex flex-col gap-2">
              <Readout label={<M>{"\\tau_{g,1}"}</M>} value={gTorq[0].toFixed(2)} color={COMP_COLOR} />
              <Readout label={<M>{"\\tau_{g,2}"}</M>} value={gTorq[1].toFixed(2)} color={COMP_COLOR} />
              <Readout label={<M>{"\\mathcal{P}(\\theta)"}</M>} value={P.toFixed(2)} />
            </div>
          </div>
        </div>
      </WidgetShell>

      <Challenge id="ch8-gravity-compensation" met={met}>
        With compensation <strong>on</strong>, drive the arm onto the faint target pose (
        <M>{"\\theta_1 \\approx 30^\\circ,\\ \\theta_2 \\approx 60^\\circ"}</M>) and let it float
        there — the green feedforward exactly cancels the red gravity load. Then flip it off and
        watch the same pose collapse.
      </Challenge>

      <KeyIdea>
        Gravity torque <M>{"g(\\theta) = \\partial \\mathcal{P}/\\partial\\theta"}</M> is the
        configuration-dependent load a still arm must hold. Commanding{" "}
        <M>{"\\tau = g(\\theta)"}</M> as feedforward makes the manipulator weightless at every
        pose — the foundation of hand-guiding and of model-based control.
      </KeyIdea>

      <BookRef>Modern Robotics §8.1.2 — Potential energy and gravity.</BookRef>
    </div>
  );
}
