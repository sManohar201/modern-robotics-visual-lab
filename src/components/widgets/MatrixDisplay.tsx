import type { ReactNode } from "react";
import type { Mat3 } from "../../lib/math/vec";

/**
 * Live numeric matrix with optional per-column colors — the bridge between a
 * 3D scene and the algebra. Values update as the user drags.
 */
export function Mat3Display({
  m,
  label,
  colColors,
  highlightCol,
  digits = 2,
}: {
  m: Mat3;
  label?: ReactNode;
  colColors?: [string, string, string];
  highlightCol?: number;
  digits?: number;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      {label && <span className="text-[15px]">{label}</span>}
      <div className="flex items-stretch">
        <Bracket side="left" />
        <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 px-1.5 py-1">
          {[0, 1, 2].map(r =>
            [0, 1, 2].map(c => (
              <span
                key={`${r}-${c}`}
                className={`mono text-[13.5px] text-right min-w-[48px] tabular-nums rounded px-0.5 transition-colors ${
                  highlightCol === c ? "bg-[#fdf3d7]" : ""
                }`}
                style={{ color: colColors ? colColors[c] : "var(--ink)" }}
              >
                {fmt(m[3 * r + c], digits)}
              </span>
            )),
          )}
        </div>
        <Bracket side="right" />
      </div>
    </div>
  );
}

export function VecDisplay({
  v,
  label,
  color,
  digits = 2,
}: {
  v: number[];
  label?: ReactNode;
  color?: string;
  digits?: number;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      {label && <span className="text-[15px]">{label}</span>}
      <div className="flex items-stretch">
        <Bracket side="left" />
        <div className="flex flex-col gap-y-0.5 px-1.5 py-1">
          {v.map((x, i) => (
            <span
              key={i}
              className="mono text-[13.5px] text-right min-w-[48px] tabular-nums"
              style={{ color: color ?? "var(--ink)" }}
            >
              {fmt(x, digits)}
            </span>
          ))}
        </div>
        <Bracket side="right" />
      </div>
    </div>
  );
}

function fmt(x: number, digits: number) {
  const v = Object.is(x, -0) || Math.abs(x) < 0.5 * 10 ** -digits ? 0 : x;
  const s = v.toFixed(digits);
  return v >= 0 ? ` ${s}` : s; // figure space aligns signs
}

function Bracket({ side }: { side: "left" | "right" }) {
  const b = "2px solid var(--ink-soft)";
  return (
    <div
      className="w-[7px]"
      style={{
        borderTop: b,
        borderBottom: b,
        borderLeft: side === "left" ? b : undefined,
        borderRight: side === "right" ? b : undefined,
      }}
    />
  );
}
