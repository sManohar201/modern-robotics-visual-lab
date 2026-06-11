import { useRef, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { circleIntersect } from "../../lib/svg";
import { rad, deg, wrapAngle } from "../../lib/math/vec";

export default function Grubler() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 2"
        section="Configuration Space"
        title="Grübler's Formula"
        lede="You can count a mechanism's degrees of freedom without solving any equations — just by bookkeeping freedoms granted and freedoms taken away."
      />

      <p>
        The previous page established the counting rule: <em>dof = freedoms of the bodies −
        independent constraints</em>. Now apply it to a whole mechanism. Suppose a planar mechanism
        has <M>{"N"}</M> links — <em>counting the ground as a link</em> — and <M>{"J"}</M> joints,
        where joint <M>{"i"}</M> permits <M>{"f_i"}</M> relative freedoms.
      </p>
      <p>
        The <M>{"N-1"}</M> non-ground links would be free bodies with <M>{"m = 3"}</M> freedoms
        each (use <M>{"m = 6"}</M> for spatial mechanisms). Each joint glues two links together,
        wiping out all <M>{"m"}</M> relative freedoms and then handing back <M>{"f_i"}</M> of them.
        So:
      </p>
      <Eq>{"\\mathrm{dof} \\;=\\; \\underbrace{m(N-1)}_{\\text{freedoms}} \\;-\\; \\underbrace{\\sum_{i=1}^{J}(m - f_i)}_{\\text{constraints}} \\;=\\; m(N-1-J) + \\sum_{i=1}^{J} f_i"}</Eq>
      <p>
        That is <strong>Grübler's formula</strong>. Drive the mechanisms below and watch the
        formula compute itself — the number it produces is exactly the number of sliders you need
        to control the machine.
      </p>

      <LinkagePlayground />

      <KeyIdea>
        Grübler's dof is the number of <em>independent inputs</em> a mechanism needs. One slider
        moves the whole four-bar; the five-bar refuses to be pinned down by fewer than two.
      </KeyIdea>

      <H2>Counting carefully</H2>
      <p>
        Two classic traps. First, <strong>the ground is a link</strong> — forgetting it shifts
        every count by <M>{"m"}</M>. Second, the formula assumes the joint constraints are{" "}
        <em>independent</em>. A parallelogram linkage with an extra parallel link has Grübler
        count <M>{"3(5-1-6)+6 = 0"}</M>, yet it visibly moves: its special geometry makes one
        constraint redundant. Grübler gives a <em>lower bound</em>; degenerate geometry can beat
        it.
      </p>

      <Quiz
        challengeId="ch2-grubler-quiz"
        goal={<>Compute all three dof counts correctly.</>}
        questions={[
          {
            prompt: (
              <>
                A planar 3R serial arm (three links chained to ground by 3 revolute joints). dof?
              </>
            ),
            options: [{ label: "2" }, { label: "3", correct: true }, { label: "4" }],
            explain: "N = 4 (count the ground!), J = 3: 3(4 − 1 − 3) + 3 = 3.",
          },
          {
            prompt: (
              <>
                A planar mechanism with <M>{"N = 6"}</M> links and <M>{"J = 7"}</M> revolute
                joints. dof?
              </>
            ),
            options: [{ label: "0" }, { label: "1", correct: true }, { label: "2" }],
            explain: "3(6 − 1 − 7) + 7 = −6 + 7 = 1.",
          },
          {
            prompt: (
              <>
                The planar 3-RPR parallel robot: a moving platform connected to ground by three
                legs, each leg a Revolute–Prismatic–Revolute chain. dof?
              </>
            ),
            options: [{ label: "2" }, { label: "3", correct: true }, { label: "6" }],
            explain:
              "N = 8 (ground + platform + 2 links per leg), J = 9 joints each with f = 1: 3(8 − 1 − 9) + 9 = 3. The platform moves like a planar rigid body.",
          },
        ]}
      />

      <Aside>
        For spatial mechanisms set <M>{"m = 6"}</M> and use the joint freedoms{" "}
        <M>{"f"}</M>: revolute, prismatic, helical = 1; cylindrical, universal = 2; spherical = 3;
        planar contact = 3. The Stewart–Gough platform (Chapter 7) is the classic exercise:{" "}
        <M>{"6(14-1-18) + 36 = 6"}</M>.
      </Aside>

      <BookRef>Modern Robotics §2.2 — Degrees of Freedom of a Robot (Grübler's formula).</BookRef>
    </div>
  );
}

/* ================= widget: linkage playground ================= */

const W = 760;
const H = 360;

type Mech = "fourbar" | "slidercrank" | "fivebar";

const MECH_INFO: Record<Mech, { label: string; N: number; J: number; sumF: number; pris: number }> = {
  fourbar: { label: "Four-bar", N: 4, J: 4, sumF: 4, pris: 0 },
  slidercrank: { label: "Slider-crank", N: 4, J: 4, sumF: 4, pris: 1 },
  fivebar: { label: "Five-bar", N: 5, J: 5, sumF: 5, pris: 0 },
};

function LinkagePlayground() {
  const [mech, setMech] = useState<Mech>("fourbar");
  const [t1, setT1] = useState(rad(-60));
  const [t2, setT2] = useState(rad(-120));
  // four-bar challenge: accumulate crank rotation
  const lastT1 = useRef(t1);
  const [spun, setSpun] = useState(0);
  const prevSol = useRef<[number, number] | null>(null);

  const setCrank = (v: number) => {
    if (mech === "fourbar") {
      setSpun(s => Math.min(7, s + Math.abs(wrapAngle(v - lastT1.current))));
    }
    lastT1.current = v;
    setT1(v);
  };

  const switchMech = (m: Mech) => {
    setMech(m);
    prevSol.current = null;
    const t0 = m === "fivebar" ? rad(-120) : rad(-60);
    setT1(t0);
    lastT1.current = t0;
  };

  const info = MECH_INFO[mech];
  const dof = 3 * (info.N - 1 - info.J) + info.sumF;
  const met = spun >= 2 * Math.PI;

  return (
    <>
      <WidgetShell
        title="Linkage playground — Grübler in action"
        onReset={() => {
          switchMech(mech);
          setSpun(0);
          setT2(rad(-120));
        }}
        caption={
          <>
            The dof Grübler predicts equals the number of input sliders the mechanism needs. Links
            are counted including the fixed ground (hatched).
          </>
        }
      >
        <div className="ui flex gap-2 mb-2">
          {(Object.keys(MECH_INFO) as Mech[]).map(m => (
            <WidgetButton key={m} onClick={() => switchMech(m)} active={mech === m}>
              {MECH_INFO[m].label}
            </WidgetButton>
          ))}
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none">
          {mech === "fourbar" && <FourBar t1={t1} prevSol={prevSol} />}
          {mech === "slidercrank" && <SliderCrank t1={t1} />}
          {mech === "fivebar" && <FiveBar t1={t1} t2={t2} prevSol={prevSol} />}

          {/* Grübler panel */}
          <g fontFamily="Inter, sans-serif" fontSize="12.5">
            <rect x={W - 250} y={14} width={236} height={86} rx={10} fill="#f6f4ee" stroke="#e4e1d8" />
            <text x={W - 236} y={36} fill="#8a8a9b" fontWeight={700} fontSize="10.5" letterSpacing="1.5">
              GRÜBLER COUNT (m = 3)
            </text>
            <text x={W - 236} y={58} fill="#4b4b5e">
              N = {info.N} links · J = {info.J} joints · Σf = {info.sumF}
            </text>
            <text x={W - 236} y={82} fill="#1d1d28" fontSize="14">
              3({info.N}−1−{info.J}) + {info.sumF} ={" "}
              <tspan fontWeight={700} fill="#6741d9">{dof} dof</tspan>
            </text>
          </g>
        </svg>

        <ControlBar>
          <LabeledSlider
            label={<span>θ₁</span>}
            value={t1}
            min={mech === "fivebar" ? rad(-170) : rad(-180)}
            max={mech === "fivebar" ? rad(-10) : rad(180)}
            step={0.01}
            onChange={setCrank}
            fmt={v => `${deg(v).toFixed(0)}°`}
            color="#6741d9"
            width={200}
          />
          {mech === "fivebar" && (
            <LabeledSlider
              label={<span>θ₂</span>}
              value={t2}
              min={rad(-170)}
              max={rad(-10)}
              step={0.01}
              onChange={setT2}
              fmt={v => `${deg(v).toFixed(0)}°`}
              color="#c2571c"
              width={200}
            />
          )}
          {mech === "fourbar" && (
            <Readout label="crank travelled" value={`${Math.min(360, deg(spun)).toFixed(0)}° / 360°`} />
          )}
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch2-grubler-fourbar" met={met} holdMs={100}>
        Drive the four-bar's crank through a <strong>full revolution</strong> with its single
        input. One degree of freedom means this one slider determines the position of every link —
        the coupler and rocker have no say.
      </Challenge>
    </>
  );
}

/* ---- drawing helpers ---- */

function GroundPin({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#50525e" strokeWidth={1.6}>
      <line x1={x - 14} y1={y + 16} x2={x + 14} y2={y + 16} />
      <line x1={x - 9} y1={y + 16} x2={x - 15} y2={y + 25} />
      <line x1={x} y1={y + 16} x2={x - 6} y2={y + 25} />
      <line x1={x + 9} y1={y + 16} x2={x + 3} y2={y + 25} />
      <line x1={x} y1={y} x2={x - 11} y2={y + 16} />
      <line x1={x} y1={y} x2={x + 11} y2={y + 16} />
    </g>
  );
}

function Link({ a, b, color = "#50525e", w: width = 7 }: { a: [number, number]; b: [number, number]; color?: string; w?: number }) {
  return (
    <g>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={0.85} />
      <circle cx={a[0]} cy={a[1]} r={5} fill="#fff" stroke="#33343d" strokeWidth={1.8} />
      <circle cx={b[0]} cy={b[1]} r={5} fill="#fff" stroke="#33343d" strokeWidth={1.8} />
    </g>
  );
}

function nearest(
  prev: [number, number] | null,
  s1: [number, number] | null,
  s2: [number, number] | null,
): [number, number] | null {
  if (!s1 && !s2) return null;
  if (!s1) return s2;
  if (!s2) return s1;
  if (!prev) return s1;
  const d1 = (s1[0] - prev[0]) ** 2 + (s1[1] - prev[1]) ** 2;
  const d2 = (s2[0] - prev[0]) ** 2 + (s2[1] - prev[1]) ** 2;
  return d1 <= d2 ? s1 : s2;
}

function FourBar({ t1, prevSol }: { t1: number; prevSol: React.MutableRefObject<[number, number] | null> }) {
  const O2: [number, number] = [200, 290];
  const O4: [number, number] = [440, 290];
  const rCrank = 60, rCoupler = 180, rRocker = 160;
  const E: [number, number] = [O2[0] + rCrank * Math.cos(t1), O2[1] + rCrank * Math.sin(t1)];
  const sol = nearest(
    prevSol.current ?? [440, 80], // seed with a high point: start on the upper assembly branch
    circleIntersect(E, rCoupler, O4, rRocker, 1),
    circleIntersect(E, rCoupler, O4, rRocker, -1),
  );
  if (sol) prevSol.current = sol;
  const B = sol ?? prevSol.current ?? O4;
  return (
    <g>
      <GroundPin x={O2[0]} y={O2[1]} />
      <GroundPin x={O4[0]} y={O4[1]} />
      <Link a={E} b={B} color="#9a9a8a" />
      <Link a={O4} b={B} color="#3b6fd4" />
      <Link a={O2} b={E} color="#6741d9" w={8} />
      <text x={O2[0] - 5} y={O2[1] + 44} fontSize="11.5" fill="#8a8a9b" fontFamily="Inter, sans-serif">ground link</text>
    </g>
  );
}

function SliderCrank({ t1 }: { t1: number }) {
  const O: [number, number] = [200, 200];
  const r = 70, rod = 200;
  const E: [number, number] = [O[0] + r * Math.cos(t1), O[1] + r * Math.sin(t1)];
  const dx = Math.sqrt(Math.max(0, rod * rod - (E[1] - O[1]) ** 2));
  const P: [number, number] = [E[0] + dx, O[1]];
  return (
    <g>
      <GroundPin x={O[0]} y={O[1]} />
      {/* rail */}
      <line x1={330} y1={O[1] + 17} x2={700} y2={O[1] + 17} stroke="#b9b5a8" strokeWidth={2} strokeDasharray="7 5" />
      <line x1={330} y1={O[1] - 17} x2={700} y2={O[1] - 17} stroke="#b9b5a8" strokeWidth={2} strokeDasharray="7 5" />
      <rect x={P[0] - 34} y={O[1] - 15} width={68} height={30} rx={6} fill="#3b6fd4" opacity={0.85} />
      <Link a={E} b={P} color="#9a9a8a" />
      <Link a={O} b={E} color="#6741d9" w={8} />
      <text x={560} y={O[1] - 26} fontSize="11.5" fill="#8a8a9b" fontFamily="Inter, sans-serif">prismatic joint (f = 1)</text>
    </g>
  );
}

function FiveBar({ t1, t2, prevSol }: { t1: number; t2: number; prevSol: React.MutableRefObject<[number, number] | null> }) {
  const G1: [number, number] = [240, 300];
  const G2: [number, number] = [440, 300];
  const prox = 90, dist = 200;
  const E1: [number, number] = [G1[0] + prox * Math.cos(t1), G1[1] + prox * Math.sin(t1)];
  const E2: [number, number] = [G2[0] + prox * Math.cos(t2), G2[1] + prox * Math.sin(t2)];
  const sol = nearest(
    prevSol.current ?? [340, 80], // seed with a high point: start on the upper assembly branch
    circleIntersect(E1, dist, E2, dist, 1),
    circleIntersect(E1, dist, E2, dist, -1),
  );
  if (sol) prevSol.current = sol;
  const apex = sol ?? prevSol.current ?? [340, 120];
  return (
    <g>
      <GroundPin x={G1[0]} y={G1[1]} />
      <GroundPin x={G2[0]} y={G2[1]} />
      <Link a={E1} b={apex} color="#9a9a8a" />
      <Link a={E2} b={apex} color="#9a9a8a" />
      <Link a={G1} b={E1} color="#6741d9" w={8} />
      <Link a={G2} b={E2} color="#c2571c" w={8} />
      <circle cx={apex[0]} cy={apex[1]} r={8} fill="#2f9e44" />
    </g>
  );
}
