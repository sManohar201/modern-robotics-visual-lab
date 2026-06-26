import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { DoubleSide } from "three";
import { Arrow, PosedGroup } from "./Scene3D";
import {
  type Vec3, vadd, vscale, vsub, vnorm, vcross, vdot, vunit, mat3FromCols,
} from "../../lib/math/vec";

/** An arrow rooted at an arbitrary world point. */
export function PointArrow({
  at,
  dir,
  length,
  color,
  thickness = 0.022,
}: {
  at: Vec3;
  dir: Vec3;
  length: number;
  color: string;
  thickness?: number;
}) {
  if (vnorm(dir) < 1e-9 || length < 1e-4) return null;
  return (
    <group position={at}>
      <Arrow dir={dir} length={length} color={color} thickness={thickness} />
    </group>
  );
}

/** An ellipsoid centred at `center`, principal axes = `axes` (unit), semi-axis lengths = `radii`. */
export function Ellipsoid({
  center,
  axes,
  radii,
  color,
  opacity = 0.22,
  wireframe = false,
}: {
  center: Vec3;
  axes: [Vec3, Vec3, Vec3];
  radii: [number, number, number];
  color: string;
  opacity?: number;
  wireframe?: boolean;
}) {
  // rotation whose columns are the principal axes
  const R = mat3FromCols(vunit(axes[0]), vunit(axes[1]), vunit(axes[2]));
  const r: [number, number, number] = [
    Math.max(1e-3, radii[0]),
    Math.max(1e-3, radii[1]),
    Math.max(1e-3, radii[2]),
  ];
  return (
    <PosedGroup R={R} p={center}>
      <mesh scale={r}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          side={DoubleSide}
          depthWrite={false}
          wireframe={wireframe}
        />
      </mesh>
    </PosedGroup>
  );
}

/** Three principal-axis sticks of an ellipsoid (helps read its orientation). */
export function PrincipalAxes({
  center,
  axes,
  radii,
  color,
}: {
  center: Vec3;
  axes: [Vec3, Vec3, Vec3];
  radii: [number, number, number];
  color: string;
}) {
  return (
    <>
      {axes.map((ax, i) => {
        const u = vunit(ax);
        const a = vadd(center, vscale(u, -radii[i]));
        const b = vadd(center, vscale(u, radii[i]));
        return <Line key={i} points={[a, b]} color={color} lineWidth={1.6} transparent opacity={0.8} />;
      })}
    </>
  );
}

/** A full screw axis: an infinite-ish line through point `q` along `dir`. */
export function ScrewAxisLine({
  q,
  dir,
  color,
  half = 1.7,
  lineWidth = 2.5,
}: {
  q: Vec3;
  dir: Vec3;
  color: string;
  half?: number;
  lineWidth?: number;
}) {
  const u = vunit(dir);
  const a = vadd(q, vscale(u, -half));
  const b = vadd(q, vscale(u, half));
  return (
    <>
      <Line points={[a, b]} color={color} lineWidth={lineWidth} />
      <PointArrow at={b} dir={u} length={0.16} color={color} />
    </>
  );
}

/**
 * A circular arc in the plane perpendicular to `axis`, centred at `center`,
 * sweeping `sweep` radians (sign = direction), with an arrowhead at the end.
 * Used both for rotation-sense indicators and joint-torque magnitudes.
 */
export function AxisArc({
  center,
  axis,
  radius,
  sweep,
  color,
  start = 0,
  lineWidth = 3,
}: {
  center: Vec3;
  axis: Vec3;
  radius: number;
  sweep: number;
  color: string;
  start?: number;
  lineWidth?: number;
}) {
  const { pts, headAt, headDir } = useMemo(() => {
    const u = vunit(axis);
    // an orthonormal basis (e1, e2) spanning the plane ⟂ u
    let ref: Vec3 = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const e1 = vunit(vsub(ref, vscale(u, vdot(ref, u))));
    const e2 = vcross(u, e1);
    const n = Math.max(8, Math.ceil(Math.abs(sweep) / 0.12));
    const pts: Vec3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = start + (sweep * i) / n;
      pts.push(vadd(center, vadd(vscale(e1, radius * Math.cos(t)), vscale(e2, radius * Math.sin(t)))));
    }
    const tEnd = start + sweep;
    // tangent direction at the end (direction of travel)
    const sgn = sweep >= 0 ? 1 : -1;
    const tangent = vscale(
      vadd(vscale(e1, -Math.sin(tEnd)), vscale(e2, Math.cos(tEnd))),
      sgn,
    );
    return { pts, headAt: pts[pts.length - 1], headDir: vunit(tangent) };
  }, [center, axis, radius, sweep, start]);

  if (Math.abs(sweep) < 0.04) return null;
  return (
    <>
      <Line points={pts} color={color} lineWidth={lineWidth} />
      <PointArrow at={headAt} dir={headDir} length={0.14} color={color} />
    </>
  );
}
