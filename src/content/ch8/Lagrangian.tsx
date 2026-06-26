import { useState, useEffect } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, BookRef } from "../../components/prose";
import { WidgetShell, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad, PosedGroup } from "../../components/three/Scene3D";
import { Line } from "@react-three/drei";
import { type Vec3, deg, mat3Identity } from "../../lib/math/vec";
import { exp6, screwFromAxisPoint, se3Mul } from "../../lib/math/se3";
import { planar2R_M, planar2R_c, planar2R_g } from "./dynamics";

const WIRE_COLOR = "#999999";
const BEAD_COLOR = "#d9483f"; // red
const TARGET_COLOR = "#2f9e44"; // green
const LINK_COLORS = ["#c2571c", "#0b7285"] as const;
const JOINT_COLOR = "#33343d";
const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];

export default function Lagrangian() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 8"
        section="Dynamics of Open Chains"
        title="The Lagrangian Formulation"
        lede="Instead of tracking every internal force with Newton's laws, the Lagrangian method writes the whole system's kinetic minus potential energy and differentiates. Out fall the equations of motion — inertia, Coriolis, and gravity all at once."
      />

      <p>
        The first step is to choose <strong>generalized coordinates</strong>{" "}
        <M>{"q \\in \\mathbb{R}^n"}</M> that uniquely describe the configuration. For an open
        chain whose joints are all actuated, the joint vector <M>{"\\theta"}</M> is the natural
        choice, and the <strong>generalized forces</strong> <M>{"\\tau"}</M> are then the joint
        torques (or forces, for a prismatic joint) — dual to <M>{"\\dot{\\theta}"}</M> in the
        sense that <M>{"\\tau^{\\mathsf T}\\dot{\\theta}"}</M> is power.
      </p>
      <p>
        The <strong>Lagrangian</strong> is the system's total kinetic energy{" "}
        <M>{"\\mathcal{K}"}</M> minus its potential energy <M>{"\\mathcal{P}"}</M>,
      </p>
      <Eq>{"\\mathcal{L}(\\theta, \\dot{\\theta}) = \\mathcal{K}(\\theta, \\dot{\\theta}) - \\mathcal{P}(\\theta),"}</Eq>
      <p>and the equations of motion are the <strong>Euler–Lagrange equations</strong>:</p>
      <Eq>{"\\tau_i = \\frac{d}{dt}\\frac{\\partial \\mathcal{L}}{\\partial \\dot{\\theta}_i} - \\frac{\\partial \\mathcal{L}}{\\partial \\theta_i}, \\qquad i = 1, \\dots, n."}</Eq>

      <H2>A one-line warm-up</H2>
      <p>
        Take a particle of mass <M>{"\\mathfrak{m}"}</M> sliding on a vertical line, with height{" "}
        <M>{"x"}</M> as its single coordinate and an external force <M>{"f"}</M> pushing up
        against gravity. Its energies are <M>{"\\mathcal{K} = \\tfrac12 \\mathfrak{m}\\dot{x}^2"}</M>{" "}
        and <M>{"\\mathcal{P} = \\mathfrak{m} g x"}</M>, so
      </p>
      <Eq>{"f = \\frac{d}{dt}\\frac{\\partial \\mathcal{L}}{\\partial \\dot{x}} - \\frac{\\partial \\mathcal{L}}{\\partial x} = \\mathfrak{m}\\ddot{x} + \\mathfrak{m} g,"}</Eq>
      <p>
        which is just Newton's <M>{"f - \\mathfrak{m} g = \\mathfrak{m}\\ddot{x}"}</M>. The method
        is bookkeeping for energy — but on a robot that bookkeeping is far easier than chasing
        constraint forces.
      </p>

      <H2>Where the velocity-product forces come from</H2>
      <p>
        Joint coordinates do not live in an inertial frame, so even with{" "}
        <M>{"\\ddot{\\theta} = 0"}</M> the masses can accelerate. The cleanest illustration is a
        bead free to slide along a wire that is forced to spin at a constant rate{" "}
        <M>{"\\omega"}</M>. The bead's distance <M>{"r"}</M> from the pivot is the generalized
        coordinate. In the horizontal plane there is no potential energy, so
      </p>
      <Eq>{"\\mathcal{L} = \\mathcal{K} = \\tfrac12 \\mathfrak{m}\\,(\\dot{r}^2 + r^2\\omega^2),"}</Eq>
      <p>and with no force along the frictionless wire the Euler–Lagrange equation gives</p>
      <Eq>{"\\frac{d}{dt}(\\mathfrak{m}\\dot{r}) - \\mathfrak{m} r\\omega^2 = 0 \\;\\implies\\; \\ddot{r} = r\\omega^2."}</Eq>
      <p>
        That outward <strong>centrifugal acceleration</strong> grows with distance, so the bead
        races away exponentially: <M>{"r(t) = r(0)\\cosh(\\omega t)"}</M>. Nothing pushed it
        radially — the term fell out of the energy.
      </p>

      <BeadWidget />

      <H2>The full planar 2R chain</H2>
      <p>
        Now the canonical example: two links with point masses{" "}
        <M>{"\\mathfrak{m}_1, \\mathfrak{m}_2"}</M> at their ends, lengths{" "}
        <M>{"L_1, L_2"}</M>, moving in a vertical plane under gravity. Summing the link kinetic
        energies <M>{"\\tfrac12 \\mathfrak{m}_i(\\dot{x}_i^2 + \\dot{y}_i^2)"}</M> and potential
        energies <M>{"\\mathfrak{m}_i g y_i"}</M> and turning the Euler–Lagrange crank collapses
        everything into the standard form
      </p>
      <Eq>{"\\tau = M(\\theta)\\,\\ddot{\\theta} + \\underbrace{c(\\theta, \\dot{\\theta}) + g(\\theta)}_{h(\\theta, \\dot{\\theta})},"}</Eq>
      <p>
        with a symmetric, positive-definite <strong>mass matrix</strong> <M>{"M(\\theta)"}</M>, a
        velocity-product (Coriolis &amp; centripetal) vector <M>{"c(\\theta,\\dot{\\theta})"}</M>{" "}
        quadratic in <M>{"\\dot{\\theta}"}</M>, and a <strong>gravity</strong> vector{" "}
        <M>{"g(\\theta)"}</M>. The next pages take these three terms apart one at a time. Drag the
        arm below and watch all three update live.
      </p>

      <EnergyWidget />

      <KeyIdea>
        The Lagrangian <M>{"\\mathcal{L} = \\mathcal{K} - \\mathcal{P}"}</M> packs all of the
        dynamics into one scalar. Differentiating it produces the inertia term{" "}
        <M>{"M(\\theta)\\ddot{\\theta}"}</M>, the velocity-product term{" "}
        <M>{"c(\\theta,\\dot{\\theta})"}</M>, and the gravity term <M>{"g(\\theta)"}</M> — no
        free-body diagrams required.
      </KeyIdea>

      <BookRef>Modern Robotics §8.1 — Lagrangian Formulation (Eqs. 8.1–8.10).</BookRef>
    </div>
  );
}

/* ================= widget 1: bead on a rotating wire ================= */

function BeadWidget() {
  const [omega, setOmega] = useState(1.1);
  const [r0, setR0] = useState(0.4);
  const [playing, setPlaying] = useState(false);

  const rTarget = 1.5;
  const maxWireLen = 1.8;

  const [r, setR] = useState(r0);
  const [phi, setPhi] = useState(0);
  const [simTime, setSimTime] = useState(0);

  // reset the run whenever the design changes
  useEffect(() => {
    setR(r0);
    setPhi(0);
    setSimTime(0);
    setPlaying(false);
  }, [r0, omega]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.03, (now - last) / 1000);
      last = now;
      setSimTime(t => {
        const nt = t + dt;
        const nr = r0 * Math.cosh(omega * nt); // analytic solution of r'' = r w^2
        if (nr >= maxWireLen) {
          setR(maxWireLen);
          setPhi(omega * nt);
          setPlaying(false);
          return t;
        }
        setR(nr);
        setPhi(omega * nt);
        return nt;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, omega, r0]);

  const beadPos: Vec3 = [r * Math.cos(phi), r * Math.sin(phi), 0];
  const wireEnd: Vec3 = [maxWireLen * Math.cos(phi), maxWireLen * Math.sin(phi), 0];
  const targetPts = Array.from({ length: 49 }, (_, i) => {
    const a = (i / 48) * 2 * Math.PI;
    return [rTarget * Math.cos(a), rTarget * Math.sin(a), 0] as Vec3;
  });

  // time the bead reaches the target ring (analytic): r0 cosh(w t) = rTarget
  const tHit = Math.acosh(rTarget / r0) / omega;
  const met = Math.abs(tHit - 2.0) < 0.08;

  return (
    <>
      <WidgetShell
        title="Bead on a rotating wire"
        onReset={() => {
          setOmega(1.1);
          setR0(0.4);
        }}
        caption={
          <>
            The wire spins at a fixed <M>{"\\omega"}</M>; the bead obeys{" "}
            <M>{"\\ddot{r} = r\\omega^2"}</M> and flies outward. The green ring marks{" "}
            <M>{"r = 1.5\\,\\text{m}"}</M>. The arrival time depends only on your chosen{" "}
            <M>{"\\omega"}</M> and <M>{"r(0)"}</M>.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={360} camera={[0, 0, 3.6]}>
              <Triad ghost colors={GHOST} scale={0.4} />
              <Line points={[[0, 0, 0], wireEnd]} color={WIRE_COLOR} lineWidth={2.5} />
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.1, 16]} />
                <meshStandardMaterial color="#33343d" />
              </mesh>
              <mesh position={beadPos}>
                <sphereGeometry args={[0.06, 20, 20]} />
                <meshStandardMaterial color={BEAD_COLOR} />
              </mesh>
              <Line points={targetPts} color={TARGET_COLOR} lineWidth={2} dashed dashScale={1} />
            </Scene3D>
          </div>

          <div className="w-full md:w-[250px] shrink-0 flex flex-col gap-4">
            <div className="flex gap-2">
              <WidgetButton active={playing} onClick={() => setPlaying(p => !p)}>
                {playing ? "Pause" : "Play"}
              </WidgetButton>
              <WidgetButton
                onClick={() => {
                  setR(r0);
                  setPhi(0);
                  setSimTime(0);
                  setPlaying(false);
                }}
              >
                Restart
              </WidgetButton>
            </div>
            <div className="border-t border-[var(--rule)] pt-3 flex flex-col gap-3">
              <LabeledSlider label={<M>{"\\omega"}</M>} value={omega} min={0.3} max={3.0} step={0.01} onChange={setOmega} fmt={v => `${v.toFixed(2)} rad/s`} />
              <LabeledSlider label={<M>{"r(0)"}</M>} value={r0} min={0.1} max={1.0} step={0.01} onChange={setR0} fmt={v => `${v.toFixed(2)} m`} />
            </div>
            <div className="border-t border-[var(--rule)] pt-3 flex flex-col gap-2">
              <Readout label="sim time" value={`${simTime.toFixed(2)} s`} />
              <Readout label="r" value={`${r.toFixed(2)} m`} />
              <Readout label="arrival time" value={`${tHit.toFixed(2)} s`} color={met ? "var(--good)" : undefined} />
            </div>
          </div>
        </div>
      </WidgetShell>

      <Challenge id="ch8-lagrange-wire" met={met}>
        Tune <M>{"\\omega"}</M> and <M>{"r(0)"}</M> so the bead reaches the green ring (
        <M>{"r = 1.5\\,\\text{m}"}</M>) at exactly <M>{"t = 2.0\\,\\text{s}"}</M> (within{" "}
        <M>{"\\pm 0.08\\,\\text{s}"}</M>), then press play to watch the centrifugal run-away.
      </Challenge>
    </>
  );
}

/* ================= widget 2: live 2R energy + EOM terms ================= */

function EnergyWidget() {
  const [t1, setT1] = useState(0.6);
  const [t2, setT2] = useState(0.9);
  const [td1, setTd1] = useState(1.2);
  const [td2, setTd2] = useState(-0.8);

  const L1 = 1.0;
  const L2 = 0.8;
  const m1 = 1.0;
  const m2 = 1.0;
  const g = 9.81;

  const theta: [number, number] = [t1, t2];
  const thetadot: [number, number] = [td1, td2];
  const m: [number, number] = [m1, m2];
  const L: [number, number] = [L1, L2];

  const Mmat = planar2R_M(theta, m, L);
  const cVec = planar2R_c(theta, thetadot, m, L);
  const gVec = planar2R_g(theta, m, L, g);

  // K = 1/2 thetadot^T M thetadot
  const K = 0.5 * (Mmat[0] * td1 * td1 + 2 * Mmat[1] * td1 * td2 + Mmat[3] * td2 * td2);
  // P = (m1+m2) g L1 sin t1 + m2 g L2 sin(t1+t2)
  const P = (m1 + m2) * g * L1 * Math.sin(t1) + m2 * g * L2 * Math.sin(t1 + t2);
  const Lag = K - P;

  // kinematics for drawing
  const S0 = screwFromAxisPoint([0, 0, 1], [0, 0, 0]);
  const S1 = screwFromAxisPoint([0, 0, 1], [L1, 0, 0]);
  const T1 = exp6(S0, t1);
  const T2 = se3Mul(T1, exp6(S1, t2));
  const pElbow: Vec3 = [T1.p[0], T1.p[1], 0];
  const eeP = se3Mul(T2, { R: mat3Identity(), p: [L2, 0, 0] }).p;
  const pEE: Vec3 = [eeP[0], eeP[1], 0];

  return (
    <WidgetShell
      title="2R chain — energy and equation-of-motion terms"
      onReset={() => {
        setT1(0.6);
        setT2(0.9);
        setTd1(1.2);
        setTd2(-0.8);
      }}
      caption={
        <>
          With <M>{"L_1 = 1,\\ L_2 = 0.8,\\ \\mathfrak{m}_1 = \\mathfrak{m}_2 = 1"}</M> and{" "}
          gravity along <M>{"-\\hat{y}"}</M>. Drag the angles and joint rates to watch the
          energies and the three dynamics terms <M>{"M\\ddot\\theta,\\ c,\\ g"}</M> respond.
        </>
      }
    >
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1 min-w-0">
          <Scene3D height={340} camera={[0, 0, 3.2]}>
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
            <mesh position={pElbow}>
              <sphereGeometry args={[0.06, 16, 16]} />
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
              <sphereGeometry args={[0.07, 18, 18]} />
              <meshStandardMaterial color={LINK_COLORS[1]} />
            </mesh>
          </Scene3D>
        </div>

        <div className="w-full md:w-[300px] shrink-0 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <LabeledSlider label={<M>{"\\theta_1"}</M>} value={t1} min={-Math.PI} max={Math.PI} onChange={setT1} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
            <LabeledSlider label={<M>{"\\theta_2"}</M>} value={t2} min={-Math.PI} max={Math.PI} onChange={setT2} fmt={v => `${deg(v).toFixed(0)}°`} width={130} />
            <LabeledSlider label={<M>{"\\dot\\theta_1"}</M>} value={td1} min={-3} max={3} step={0.05} onChange={setTd1} fmt={v => `${v.toFixed(2)}`} width={130} />
            <LabeledSlider label={<M>{"\\dot\\theta_2"}</M>} value={td2} min={-3} max={3} step={0.05} onChange={setTd2} fmt={v => `${v.toFixed(2)}`} width={130} />
          </div>

          <div className="border-t border-[var(--rule)] pt-3 grid grid-cols-3 gap-2">
            <Readout label={<M>{"\\mathcal{K}"}</M>} value={K.toFixed(2)} />
            <Readout label={<M>{"\\mathcal{P}"}</M>} value={P.toFixed(2)} />
            <Readout label={<M>{"\\mathcal{L}"}</M>} value={Lag.toFixed(2)} />
          </div>

          <div className="border-t border-[var(--rule)] pt-3 flex flex-col gap-2 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="ui text-[var(--ink-faint)] min-w-[44px]"><M>{"M(\\theta)"}</M></span>
              <Mat2 m={Mmat} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Readout label={<M>{"c_1, c_2"}</M>} value={`${cVec[0].toFixed(2)}, ${cVec[1].toFixed(2)}`} />
              <Readout label={<M>{"g_1, g_2"}</M>} value={`${gVec[0].toFixed(2)}, ${gVec[1].toFixed(2)}`} />
            </div>
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}

function Mat2({ m }: { m: [number, number, number, number] }) {
  return (
    <div className="inline-grid grid-cols-2 gap-x-2 border-l border-r border-[var(--ink-soft)] px-1.5 py-0.5">
      {m.map((x, i) => (
        <span key={i} className="mono text-[12px] text-right min-w-[42px] tabular-nums">
          {x.toFixed(2)}
        </span>
      ))}
    </div>
  );
}
