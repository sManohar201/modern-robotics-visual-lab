// Shared "a matrix squashes a circle" explorable. A 2×2 matrix maps the unit
// circle to an ellipse; basis arrows show where the columns land, and (when
// they are real) eigen-lines show the directions the matrix only stretches.
// Used by the math-foundations module and reused by the ch5/ch8 ellipsoid pages.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ControlBar, LabeledSlider, Readout, WidgetButton, WidgetShell } from "./WidgetShell";

export type Mat2 = [number, number, number, number]; // [a, b, c, d] row-major

export interface CircleMapInfo {
  m: Mat2;
  det: number;
  /** singular values, largest first — the ellipse semi-axes */
  sigma: [number, number];
  /** real eigenvalues (largest |λ| first), or null when they are complex */
  eig: [number, number] | null;
}

const AX_X = "#d9483f";
const AX_Y = "#2f9e44";
const ACCENT = "#6741d9";
const GOLD = "#b08c1d";

const W = 760;
const H = 430;
const S = 72; // px per unit
const CX = W / 2;
const CY = H / 2;
const px = (x: number, y: number): [number, number] => [CX + x * S, CY - y * S];

function analyze(m: Mat2): CircleMapInfo {
  const [a, b, c, d] = m;
  const det = a * d - b * c;
  // singular values from eigenvalues of AᵀA (2×2 symmetric, analytic)
  const p = a * a + c * c;
  const q = a * b + c * d;
  const r = b * b + d * d;
  const mean = (p + r) / 2;
  const off = Math.sqrt(Math.max(0, ((p - r) / 2) ** 2 + q * q));
  const sigma: [number, number] = [
    Math.sqrt(Math.max(0, mean + off)),
    Math.sqrt(Math.max(0, mean - off)),
  ];
  // eigenvalues of A itself
  const tr = a + d;
  const disc = tr * tr - 4 * det;
  let eig: [number, number] | null = null;
  if (disc >= 0) {
    const s = Math.sqrt(disc);
    const l1 = (tr + s) / 2;
    const l2 = (tr - s) / 2;
    eig = Math.abs(l1) >= Math.abs(l2) ? [l1, l2] : [l2, l1];
  }
  return { m, det, sigma, eig };
}

/** Unit eigenvector for eigenvalue `l` of [a b; c d], or null if degenerate. */
function eigVec(m: Mat2, l: number): [number, number] | null {
  const [a, b, c, d] = m;
  let v: [number, number];
  if (Math.abs(b) > 1e-9) v = [b, l - a];
  else if (Math.abs(c) > 1e-9) v = [l - d, c];
  else v = Math.abs(l - a) < Math.abs(l - d) ? [1, 0] : [0, 1];
  const n = Math.hypot(v[0], v[1]);
  return n < 1e-9 ? null : [v[0] / n, v[1] / n];
}

function Arrow({
  from,
  to,
  color,
  width = 3,
  dash,
  label,
}: {
  from: [number, number];
  to: [number, number];
  color: string;
  width?: number;
  dash?: string;
  label?: string;
}) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  if (len < 4) return null;
  const ux = dx / len;
  const uy = dy / len;
  const headL = 9;
  const bx = to[0] - ux * headL;
  const by = to[1] - uy * headL;
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeDasharray={dash} />
      <path
        d={`M ${to[0]} ${to[1]} L ${bx - uy * 4.5} ${by + ux * 4.5} L ${bx + uy * 4.5} ${by - ux * 4.5} Z`}
        fill={color}
      />
      {label && (
        <text
          x={to[0] + ux * 14}
          y={to[1] + uy * 14 + 4}
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="12.5"
          fontWeight="700"
          fill={color}
        >
          {label}
        </text>
      )}
    </g>
  );
}

export interface CircleMapPreset {
  label: string;
  m: Mat2;
}

export const CIRCLE_MAP_PRESETS: CircleMapPreset[] = [
  { label: "identity", m: [1, 0, 0, 1] },
  { label: "rotate 30°", m: [0.87, -0.5, 0.5, 0.87] },
  { label: "stretch", m: [1.6, 0, 0, 0.6] },
  { label: "shear", m: [1, 0.8, 0, 1] },
  { label: "symmetric", m: [1.3, 0.5, 0.5, 0.8] },
  { label: "squash flat", m: [1.2, 0.6, 0.6, 0.3] },
];

export function CircleMap({
  title = "The matrix machine — circle in, ellipse out",
  initial = [1.4, 0.4, 0.4, 0.9],
  presets = CIRCLE_MAP_PRESETS,
  showEigen = true,
  inputLabel = "unit circle (all inputs of length 1)",
  outputLabel = "its image",
  caption,
  onState,
}: {
  title?: string;
  initial?: Mat2;
  presets?: CircleMapPreset[];
  showEigen?: boolean;
  inputLabel?: string;
  outputLabel?: string;
  caption?: ReactNode;
  onState?: (info: CircleMapInfo) => void;
}) {
  const [m, setM] = useState<Mat2>(initial);
  const info = useMemo(() => analyze(m), [m]);

  useEffect(() => {
    onState?.(info);
  }, [info, onState]);

  const [a, b, c, d] = m;
  const setEntry = (i: number) => (v: number) =>
    setM(prev => prev.map((x, j) => (j === i ? v : x)) as Mat2);

  // image of the unit circle, sampled
  const ellipse = useMemo(() => {
    const pts: string[] = [];
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const t = (2 * Math.PI * i) / N;
      const x = Math.cos(t);
      const y = Math.sin(t);
      const [ex, ey] = [a * x + b * y, c * x + d * y];
      const [sx, sy] = px(ex, ey);
      pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
    }
    return pts.join(" ");
  }, [a, b, c, d]);

  // image of a few grid lines, to show the whole plane deforming
  const gridImages = useMemo(() => {
    const lines: string[] = [];
    const range = [-2, -1, 1, 2];
    const seg = (x0: number, y0: number, x1: number, y1: number) => {
      const pts: string[] = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        const [sx, sy] = px(a * x + b * y, c * x + d * y);
        pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
      }
      return pts.join(" ");
    };
    for (const k of range) {
      lines.push(seg(k, -2.4, k, 2.4));
      lines.push(seg(-2.4, k, 2.4, k));
    }
    return lines;
  }, [a, b, c, d]);

  const e1Tip = px(a, c);
  const e2Tip = px(b, d);
  const origin = px(0, 0);

  const eigLines =
    showEigen && info.eig
      ? info.eig
          .map(l => {
            const v = eigVec(m, l);
            if (!v || Math.abs(l) < 0.02) return null;
            return { l, v };
          })
          .filter((x): x is { l: number; v: [number, number] } => x !== null)
      : [];

  const rank = info.sigma[0] < 0.02 ? 0 : info.sigma[1] < 0.02 ? 1 : 2;

  return (
    <WidgetShell
      title={title}
      onReset={() => setM(initial)}
      caption={
        caption ?? (
          <>
            Dashed gray: the {inputLabel}. Purple: {outputLabel} after the matrix acts. The{" "}
            <span style={{ color: AX_X }}>red</span> and <span style={{ color: AX_Y }}>green</span>{" "}
            arrows are where the two basis arrows land — exactly the two columns of the matrix.
            {showEigen && (
              <> Gold lines (when they exist) are eigen-directions: inputs along them come out merely stretched.</>
            )}
          </>
        )
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg bg-[#fbfaf7] select-none">
        {/* faint fixed axes */}
        <line x1={0} y1={CY} x2={W} y2={CY} stroke="#e3e0d5" strokeWidth={1} />
        <line x1={CX} y1={0} x2={CX} y2={H} stroke="#e3e0d5" strokeWidth={1} />

        {/* deformed grid */}
        {gridImages.map((pts, i) => (
          <polyline key={i} points={pts} fill="none" stroke="#ded8f2" strokeWidth={1} />
        ))}

        {/* input unit circle + ghost basis arrows */}
        <circle cx={CX} cy={CY} r={S} fill="none" stroke="#b8b4a6" strokeWidth={1.5} strokeDasharray="6 5" />
        <Arrow from={origin} to={px(1, 0)} color="#e5b5b1" width={2} dash="4 4" />
        <Arrow from={origin} to={px(0, 1)} color="#b2d8b8" width={2} dash="4 4" />

        {/* eigen-lines */}
        {eigLines.map(({ l, v }, i) => {
          const L = 3.1;
          const p1 = px(-v[0] * L, -v[1] * L);
          const p2 = px(v[0] * L, v[1] * L);
          const lab = px(v[0] * 2.35, v[1] * 2.35);
          return (
            <g key={i}>
              <line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke={GOLD} strokeWidth={1.8} strokeDasharray="10 5" opacity={0.85} />
              <text x={lab[0]} y={lab[1] - 6} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11.5" fontWeight="600" fill={GOLD}>
                ×{l.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* image ellipse */}
        <polyline points={ellipse} fill="none" stroke={ACCENT} strokeWidth={2.5} />

        {/* column arrows */}
        <Arrow from={origin} to={e1Tip} color={AX_X} label="col 1" />
        <Arrow from={origin} to={e2Tip} color={AX_Y} label="col 2" />

        {/* matrix readout */}
        <g fontFamily="ui-monospace, monospace" fontSize="13" fill="#4b4b5e">
          <text x={20} y={30}>
            ⎡ {a.toFixed(2).padStart(5)}  {b.toFixed(2).padStart(5)} ⎤
          </text>
          <text x={20} y={50}>
            ⎣ {c.toFixed(2).padStart(5)}  {d.toFixed(2).padStart(5)} ⎦
          </text>
        </g>
        {showEigen && !info.eig && (
          <text x={W - 20} y={30} textAnchor="end" fontFamily="Inter, sans-serif" fontSize="11.5" fill={GOLD}>
            no real eigen-directions — every input gets turned
          </text>
        )}
      </svg>
      <ControlBar>
        <LabeledSlider label="a" value={a} min={-2} max={2} step={0.01} onChange={setEntry(0)} width={110} color={AX_X} />
        <LabeledSlider label="b" value={b} min={-2} max={2} step={0.01} onChange={setEntry(1)} width={110} color={AX_Y} />
        <LabeledSlider label="c" value={c} min={-2} max={2} step={0.01} onChange={setEntry(2)} width={110} color={AX_X} />
        <LabeledSlider label="d" value={d} min={-2} max={2} step={0.01} onChange={setEntry(3)} width={110} color={AX_Y} />
      </ControlBar>
      <ControlBar>
        {presets.map(p => (
          <WidgetButton key={p.label} onClick={() => setM(p.m)}>
            {p.label}
          </WidgetButton>
        ))}
        <Readout label="det" value={info.det.toFixed(2)} />
        <Readout label="rank" value={String(rank)} />
        <Readout
          label="eigenvalues"
          value={info.eig ? `${info.eig[0].toFixed(2)}, ${info.eig[1].toFixed(2)}` : "complex"}
        />
      </ControlBar>
    </WidgetShell>
  );
}
