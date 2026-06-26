import { useMemo, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef } from "../../components/prose";
import { WidgetShell, ControlBar, LabeledSlider, WidgetButton, Readout } from "../../components/widgets/WidgetShell";
import { Challenge } from "../../components/widgets/Challenge";
import { Scene3D, Triad } from "../../components/three/Scene3D";
import { type Vec3, deg } from "../../lib/math/vec";
import { Joint, Poly, Leg } from "./viz";
import { RPR_A, rprPlatformPt, rprForward } from "./mechanism";

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
      <p>
        The standard trick is the <strong>tangent half-angle substitution</strong>{" "}
        <M>{"t=\\tan(\\phi/2)"}</M>, with <M>{"\\cos\\phi=\\tfrac{1-t^2}{1+t^2}"}</M> and{" "}
        <M>{"\\sin\\phi=\\tfrac{2t}{1+t^2}"}</M>. After elimination the three equations collapse to a
        single <strong>sixth-order polynomial</strong> in <M>{"t"}</M>:
      </p>
      <Eq>{"c_6 t^6 + c_5 t^5 + \\cdots + c_1 t + c_0 = 0."}</Eq>
      <p>
        A degree-six polynomial can have up to six real roots, so the 3×RPR admits{" "}
        <strong>up to six forward-kinematics solutions</strong> — six distinct platform poses, all
        consistent with the very same leg lengths. Each is a different <em>assembly mode</em>. Set the
        legs below and step through every pose the solver finds.
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

      <BookRef>Modern Robotics §7.1.1–7.1.2 — Forward kinematics of the 3×RPR (up to six solutions) and the Stewart–Gough platform (up to forty).</BookRef>
    </div>
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
