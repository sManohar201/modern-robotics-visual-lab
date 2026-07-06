import { useMemo, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { type Vec3, deg } from "../../lib/math/vec";
import { Joint, Poly, Leg } from "./viz";
import { RPR_A, RPR_B, rprPlatformPt, rprForward, circInt, type V2 } from "./mechanism";

const GHOST: [string, string, string] = ["#dcb6b4", "#b8d4bd", "#b4c4dd"];
const BASEc = "#9b968a";
const SELc = "#6741d9";
const GHOSTp = "#b3a4d6";
const LEGc = ["#0b7285", "#c2571c", "#2f9e44"];

function platformPoly(px: number, py: number, phi: number): Vec3[] {
  return [0, 1, 2].map(i => rprPlatformPt(px, py, phi, i));
}

export default function ForwardAssemblies() {
  return (
    <div>
      <PageHeader
        chapter="Chapter 7"
        section="Kinematics of Closed Chains"
        title="Forward Kinematics: Many Assemblies"
        lede="Hand the 3×RPR a set of leg lengths and ask where the platform goes. Now the easy direction is gone: the same three sliders can lock the mechanism into several entirely different shapes — up to six of them."
      />

      <p>
        The inverse map was a formula. The <strong>forward</strong> map — find{" "}
        <M>{"(p_x,p_y,\\phi)"}</M> from the leg lengths <M>{"(s_1,s_2,s_3)"}</M> — inverts three
        coupled quadratic constraints at once:
      </p>
      <Eq>{"s_i^2 = \\big(p_x + b_{ix}\\cos\\phi - b_{iy}\\sin\\phi - a_{ix}\\big)^2 + \\big(p_y + b_{ix}\\sin\\phi + b_{iy}\\cos\\phi - a_{iy}\\big)^2,\\quad i=1,2,3."}</Eq>
      <H2>Count the answers before any algebra</H2>
      <p>
        You can see <em>why</em> there are several answers with no equations at all. Freeze legs 1
        and 2 at their commanded lengths and ignore leg 3 for a moment. What is left is a four-bar
        linkage, and it can still swing: as it does, the platform's third anchor point{" "}
        <M>{"b_3"}</M> sweeps out a closed curve — its <strong>coupler curve</strong>, every point
        the mechanism can put <M>{"b_3"}</M> while legs 1 and 2 keep their lengths. Now bring leg 3
        back. Its demand is a circle: <M>{"b_3"}</M> must sit at distance <M>{"s_3"}</M> from the
        base anchor <M>{"a_3"}</M>. So the forward-kinematics solutions are exactly the{" "}
        <strong>intersections of a curve with a circle</strong> — and a wavy closed curve can cross
        a circle two, four, or six times.
      </p>
      <p>
        <strong>Try this:</strong> slide <M>{"s_3"}</M> slowly and watch the orange circle grow
        through the teal curve — red intersection dots appear and vanish <em>in pairs</em>. Then
        shrink <M>{"s_3"}</M> until the circle misses the curve entirely: zero intersections means
        those three leg lengths cannot be assembled at all. Right at the moment a pair is born or
        dies, the circle is tangent to the curve — hold that thought for the singularities page.
      </p>

      <CouplerCurveWidget />

      <H2>The algebra agrees: one sixth-order polynomial</H2>
      <p>
        The picture promised "up to six"; the algebra delivers exactly that. The standard trick is
        the <strong>tangent half-angle substitution</strong> <M>{"t=\\tan(\\phi/2)"}</M>, with{" "}
        <M>{"\\cos\\phi=\\tfrac{1-t^2}{1+t^2}"}</M> and <M>{"\\sin\\phi=\\tfrac{2t}{1+t^2}"}</M>.
        This turns the sines and cosines into plain fractions, and after eliminating{" "}
        <M>{"p_x,p_y"}</M> the three loop equations collapse to a single{" "}
        <strong>sixth-order polynomial</strong> in <M>{"t"}</M>:
      </p>
      <Eq>{"c_6 t^6 + c_5 t^5 + \\cdots + c_1 t + c_0 = 0."}</Eq>
      <p>
        A degree-six polynomial can have up to six real roots — one for each time the coupler curve
        crosses the circle. Each root is a different <em>assembly mode</em>: a distinct platform
        pose, all consistent with the very same leg lengths.
      </p>
      <p>
        <strong>Try this:</strong> in the 3-D view below, set the legs quite unequal and step
        through the numbered poses with the buttons. Watch the faint ghost triangles: the mechanism
        genuinely can be snapped together in each of those shapes, and its sliders cannot tell them
        apart.
      </p>

      <AssemblyWidget />

      <Aside>
        Showing that all six algebraic roots are physically realizable takes extra checking, and the
        count depends on the geometry and the chosen lengths — many configurations yield two or four.
        The spatial Stewart–Gough platform is the dramatic version of the same phenomenon: its general
        6–6 form can have as many as <strong>40</strong> forward-kinematics solutions.
      </Aside>

      <KeyIdea>
        Parallel forward kinematics is the hard direction. For the 3×RPR a tangent half-angle
        substitution reduces the loop-closure equations to one sixth-order polynomial, so a single set
        of leg lengths can place the platform in up to six different assembly modes — the multiplicity
        that inverse kinematics never had.
      </KeyIdea>

      <Quiz
        challengeId="ch7-fk-quiz"
        goal={<>Make the multiplicity story stick.</>}
        questions={[
          {
            prompt: <>Why can one set of leg lengths correspond to several platform poses?</>,
            options: [
              { label: <>The loop equations are quadratic — geometrically, a curve can cross a circle several times</>, correct: true },
              { label: <>Sensor noise makes the lengths ambiguous</> },
              { label: <>It can't; the forward kinematics is unique like the inverse</> },
            ],
            explain: <>Squared distances are quadratics. Three coupled quadratics reduce to a degree-six polynomial, and each real root is an intersection of the coupler curve with leg 3's circle.</>,
          },
          {
            prompt: <>As you lengthen <M>{"s_3"}</M>, assembly modes appear and disappear <em>in pairs</em>. Why?</>,
            options: [
              { label: <>Intersections of a circle and a closed curve are created or destroyed at tangencies, two at a time</>, correct: true },
              { label: <>The solver only finds even numbers of solutions</> },
              { label: <>Because the polynomial has even degree, it must have an even number of complex roots… so real ones come singly</> },
            ],
            explain: <>Push a circle through a closed curve: first it touches (tangency, one double solution), then it crosses (two). Real polynomial roots enter and leave through such double points.</>,
          },
          {
            prompt: <>An "assembly mode" is best described as…</>,
            options: [
              { label: <>a distinct way the mechanism can be put together that produces the same actuator readings</>, correct: true },
              { label: <>a failure state where the mechanism jams</> },
              { label: <>the pose the controller chooses automatically</> },
            ],
            explain: <>The sliders read (s₁,s₂,s₃) identically in every mode — which is exactly why forward kinematics from joint readings alone is genuinely ambiguous.</>,
          },
        ]}
      />

      <BookRef>Modern Robotics §7.1.1–7.1.2 — Forward kinematics of the 3×RPR (up to six solutions) and the Stewart–Gough platform (up to forty).</BookRef>
    </div>
  );
}

/**
 * Coupler-curve × circle intersection view: legs 1 & 2 frozen turn the 3×RPR
 * into a four-bar whose third platform anchor b3 sweeps a closed curve; leg 3
 * demands b3 lie on a circle. Forward-kinematics solutions = intersections.
 */
function CouplerCurveWidget() {
  const [s1, setS1] = useState(1.0);
  const [s2, setS2] = useState(2.0);
  const [s3, setS3] = useState(2.8);

  const sols = useMemo(() => rprForward([s1, s2, s3]), [s1, s2, s3]);
  const n = sols.length;

  const W = 620, H = 480;
  const SC = 36;
  const cx = W / 2, cy = H / 2 + 14;
  const sx = (x: number) => cx + x * SC;
  const sy = (y: number) => cy - y * SC;

  const a1 = RPR_A[0], a2 = RPR_A[1], a3 = RPR_A[2];
  const L12 = Math.hypot(RPR_B[1][0] - RPR_B[0][0], RPR_B[1][1] - RPR_B[0][1]);
  const bodyAng = Math.atan2(RPR_B[1][1] - RPR_B[0][1], RPR_B[1][0] - RPR_B[0][0]);
  const d31: V2 = [RPR_B[2][0] - RPR_B[0][0], RPR_B[2][1] - RPR_B[0][1]];

  // b3's coupler curve, both circle-intersection branches of the frozen four-bar
  const curvePaths = useMemo(() => {
    const out: string[] = [];
    for (const k of [0, 1]) {
      let d = "";
      let pen = false;
      for (let i = 0; i <= 480; i++) {
        const th = (i / 480) * 2 * Math.PI;
        const b1: V2 = [a1[0] + s1 * Math.cos(th), a1[1] + s1 * Math.sin(th)];
        const pts = circInt(a2, s2, b1, L12);
        if (pts.length < 2) { pen = false; continue; }
        const b2 = pts[k];
        const del = Math.atan2(b2[1] - b1[1], b2[0] - b1[0]) - bodyAng;
        const c = Math.cos(del), s = Math.sin(del);
        const b3: V2 = [b1[0] + c * d31[0] - s * d31[1], b1[1] + s * d31[0] + c * d31[1]];
        d += `${pen ? "L" : "M"} ${sx(b3[0]).toFixed(1)} ${sy(b3[1]).toFixed(1)} `;
        pen = true;
      }
      out.push(d);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s1, s2]);

  // the actual FK solutions, marked at their b3 positions — the intersections
  const solPts = sols.map(q => rprPlatformPt(q.px, q.py, q.phi, 2));

  const met = n === 0;

  return (
    <>
      <WidgetShell
        title="The assembly-mode counter — curve meets circle"
        onReset={() => { setS1(1.0); setS2(2.0); setS3(2.8); }}
        caption={
          <>
            Teal: everywhere the platform anchor <M>{"b_3"}</M> can go while legs 1 and 2 hold
            their lengths (the coupler curve, both folds of the frozen four-bar). Orange: leg 3's
            demand, the circle <M>{"\\lVert b_3-a_3\\rVert = s_3"}</M>. Red dots: the intersections
            — each one is a complete forward-kinematics solution.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <svg viewBox={`0 0 ${W} ${H}`} className="block w-full max-w-[620px] rounded-lg bg-[#fbfaf7]">
            {/* base triangle + anchors */}
            <polygon
              points={[a1, a2, a3].map(a => `${sx(a[0])},${sy(a[1])}`).join(" ")}
              fill="none" stroke="#c9c4b6" strokeWidth={1.5} strokeDasharray="4 4"
            />
            {[a1, a2, a3].map((a, i) => (
              <g key={i}>
                <circle cx={sx(a[0])} cy={sy(a[1])} r={5.5} fill={BASEc} />
                <text x={sx(a[0]) + 10} y={sy(a[1]) + 4} className="ui fill-[var(--ink-faint)] text-[12px]">a{i + 1}</text>
              </g>
            ))}
            {/* leg-3 circle */}
            <circle cx={sx(a3[0])} cy={sy(a3[1])} r={s3 * SC} fill="none" stroke="#c2571c" strokeWidth={2.2} strokeDasharray="7 5" />
            {/* coupler curve (two folds) */}
            {curvePaths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="#0b7285" strokeWidth={2.4} opacity={i === 0 ? 0.9 : 0.55} />
            ))}
            {/* intersections = assembly modes */}
            {solPts.map((p, i) => (
              <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={6} fill="#d9483f" stroke="#fff" strokeWidth={2} />
            ))}
            {n === 0 && (
              <text x={W / 2} y={34} textAnchor="middle" className="ui text-[13px] font-semibold" fill="#d9483f">
                circle misses the curve — these leg lengths cannot assemble
              </text>
            )}
          </svg>
          <div className="ui flex flex-col justify-center gap-2.5 md:w-[210px]">
            <Readout label="intersections = modes" value={String(n)} color={n === 0 ? "#d9483f" : n >= 4 ? "var(--good)" : undefined} />
            <Readout label="s₃ circle radius" value={s3.toFixed(2)} color="#c2571c" />
          </div>
        </div>
        <ControlBar>
          <LabeledSlider label="s₁" value={s1} min={1.0} max={3.2} onChange={setS1} fmt={v => v.toFixed(2)} width={150} color={LEGc[0]} />
          <LabeledSlider label="s₂" value={s2} min={1.0} max={3.2} onChange={setS2} fmt={v => v.toFixed(2)} width={150} color={LEGc[1]} />
          <LabeledSlider label="s₃" value={s3} min={1.0} max={3.2} onChange={setS3} fmt={v => v.toFixed(2)} width={150} color={LEGc[2]} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch7-fk-vanish" met={met}>
        Make the forward kinematics <strong>impossible</strong>: tune the lengths until the orange
        circle misses the teal curve entirely and the mode count reads 0. On the way there, watch
        the red dots die in pairs — each pair merges at a tangency, the geometric fingerprint of a
        singularity.
      </Challenge>
    </>
  );
}

function AssemblyWidget() {
  const [s1, setS1] = useState(1.0);
  const [s2, setS2] = useState(2.0);
  const [s3, setS3] = useState(2.8);
  const [sel, setSel] = useState(0);

  const sols = useMemo(() => rprForward([s1, s2, s3]), [s1, s2, s3]);
  const n = sols.length;
  const idx = Math.min(sel, Math.max(0, n - 1));
  const cur = sols[idx];

  const A3: Vec3[] = RPR_A.map(a => [a[0], a[1], 0]);
  const met = n >= 4;

  return (
    <>
      <WidgetShell
        title="Same legs, several platforms"
        onReset={() => { setS1(1.0); setS2(2.0); setS3(2.8); setSel(0); }}
        caption={
          <>
            The grey triangle is the fixed base. Faint purple triangles are the alternative assembly
            modes for the chosen leg lengths; the solid purple platform is the selected one, drawn with
            its actual legs. Slide the three lengths and the number of consistent poses changes — the
            mechanism really can snap into any of them.
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 min-w-0">
            <Scene3D height={400} camera={[0.6, 5.4, 3.0]}>
              <Triad ghost colors={GHOST} scale={0.5} />
              <Poly pts={A3} color={BASEc} width={1.8} close />
              {A3.map((a, i) => <Joint key={`a${i}`} p={a} color={BASEc} r={0.07} />)}
              {/* ghost assembly modes */}
              {sols.map((q, i) => i === idx ? null : (
                <Poly key={`g${i}`} pts={platformPoly(q.px, q.py, q.phi)} color={GHOSTp} width={1.8} opacity={0.5} close />
              ))}
              {/* selected assembly with its legs */}
              {cur && (
                <>
                  {[0, 1, 2].map(i => <Leg key={`l${i}`} a={A3[i]} b={rprPlatformPt(cur.px, cur.py, cur.phi, i)} color={LEGc[i]} width={3.5} />)}
                  <Poly pts={platformPoly(cur.px, cur.py, cur.phi)} color={SELc} width={2.8} close />
                  <Joint p={[cur.px, cur.py, 0]} color={SELc} r={0.06} />
                </>
              )}
            </Scene3D>
          </div>
          <div className="ui flex flex-col justify-center gap-2.5 md:w-[220px]">
            <Readout label="# assembly modes" value={String(n)} color={n >= 4 ? "var(--good)" : n === 0 ? "#d9483f" : undefined} />
            {cur && (
              <>
                <Readout label="pₓ" value={cur.px.toFixed(2)} />
                <Readout label="p_y" value={cur.py.toFixed(2)} />
                <Readout label="φ" value={`${deg(cur.phi).toFixed(0)}°`} color={SELc} />
              </>
            )}
            {n === 0 && <Readout label="status" value="infeasible" color="#d9483f" />}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {sols.map((_, i) => (
                <WidgetButton key={i} onClick={() => setSel(i)} active={i === idx}>{`#${i + 1}`}</WidgetButton>
              ))}
            </div>
          </div>
        </div>

        <ControlBar>
          <LabeledSlider label="s₁" value={s1} min={1.0} max={3.2} onChange={v => { setS1(v); setSel(0); }} fmt={v => v.toFixed(2)} width={150} color={LEGc[0]} />
          <LabeledSlider label="s₂" value={s2} min={1.0} max={3.2} onChange={v => { setS2(v); setSel(0); }} fmt={v => v.toFixed(2)} width={150} color={LEGc[1]} />
          <LabeledSlider label="s₃" value={s3} min={1.0} max={3.2} onChange={v => { setS3(v); setSel(0); }} fmt={v => v.toFixed(2)} width={150} color={LEGc[2]} />
        </ControlBar>
      </WidgetShell>

      <Challenge id="ch7-rpr-fk-modes" met={met}>
        Find leg lengths that give the platform <strong>four or more</strong> assembly modes at once
        (try making the three lengths quite unequal — e.g. one short and two long). This is the
        multiplicity that the sixth-order polynomial allows and that the inverse kinematics never
        showed.
      </Challenge>
    </>
  );
}
