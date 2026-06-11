import type { PointerEvent as ReactPointerEvent } from "react";

/** Pointer event position in SVG viewBox coordinates. */
export function svgCoords(
  e: ReactPointerEvent<SVGElement>,
  svg: SVGSVGElement,
  viewW: number,
  viewH: number,
): [number, number] {
  const r = svg.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * viewW, ((e.clientY - r.top) / r.height) * viewH];
}

/** Intersection of two circles (c1, r1), (c2, r2). `sign` picks one of the two solutions. */
export function circleIntersect(
  c1: [number, number],
  r1: number,
  c2: [number, number],
  r2: number,
  sign: 1 | -1 = 1,
): [number, number] | null {
  const dx = c2[0] - c1[0];
  const dy = c2[1] - c1[1];
  const d = Math.hypot(dx, dy);
  if (d > r1 + r2 || d < Math.abs(r1 - r2) || d < 1e-9) return null;
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const mx = c1[0] + (a * dx) / d;
  const my = c1[1] + (a * dy) / d;
  return [mx + (sign * h * -dy) / d, my + (sign * h * dx) / d];
}
