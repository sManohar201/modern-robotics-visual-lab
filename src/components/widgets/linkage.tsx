// Shared SVG drawing helpers for planar linkage widgets (Grübler page,
// Mechanisms in Practice page).

/** Hatched ground-pin symbol at (x, y). */
export function GroundPin({ x, y }: { x: number; y: number }) {
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

/** A rigid bar between two pin joints. */
export function Link({
  a,
  b,
  color = "#50525e",
  w: width = 7,
}: {
  a: [number, number];
  b: [number, number];
  color?: string;
  w?: number;
}) {
  return (
    <g>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={0.85} />
      <circle cx={a[0]} cy={a[1]} r={5} fill="#fff" stroke="#33343d" strokeWidth={1.8} />
      <circle cx={b[0]} cy={b[1]} r={5} fill="#fff" stroke="#33343d" strokeWidth={1.8} />
    </g>
  );
}

/** Pick the circle-intersection branch nearest to the previous solution. */
export function nearest(
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

/** Live Grübler bookkeeping panel rendered inside an SVG, anchored top-right. */
export function GrublerPanel({
  x,
  y,
  N,
  J,
  sumF,
  note,
}: {
  x: number;
  y: number;
  N: number;
  J: number;
  sumF: number;
  note?: string;
}) {
  const dof = 3 * (N - 1 - J) + sumF;
  return (
    <g fontFamily="Inter, sans-serif" fontSize="12.5">
      <rect x={x} y={y} width={236} height={note ? 104 : 86} rx={10} fill="#f6f4ee" stroke="#e4e1d8" />
      <text x={x + 14} y={y + 22} fill="#8a8a9b" fontWeight={700} fontSize="10.5" letterSpacing="1.5">
        GRÜBLER COUNT (m = 3)
      </text>
      <text x={x + 14} y={y + 44} fill="#4b4b5e">
        N = {N} links · J = {J} joints · Σf = {sumF}
      </text>
      <text x={x + 14} y={y + 68} fill="#1d1d28" fontSize="14">
        3({N}−1−{J}) + {sumF} ={" "}
        <tspan fontWeight={700} fill={dof <= 0 ? "#d9483f" : "#6741d9"}>{dof} dof</tspan>
      </text>
      {note && (
        <text x={x + 14} y={y + 90} fill="#d9483f" fontSize="11.5" fontStyle="italic">
          {note}
        </text>
      )}
    </g>
  );
}
