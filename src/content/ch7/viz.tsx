// Small shared 3D primitives for the Chapter 7 closed-chain widgets.
import { Line } from "@react-three/drei";
import type { Vec3 } from "../../lib/math/vec";

/** A line segment (math coords; Scene3D handles z-up). */
export function Seg({ a, b, color, width = 2, opacity = 1, dashed = false }: {
  a: Vec3; b: Vec3; color: string; width?: number; opacity?: number; dashed?: boolean;
}) {
  return <Line points={[a, b]} color={color} lineWidth={width} transparent={opacity < 1} opacity={opacity} dashed={dashed} dashSize={0.1} gapSize={0.07} />;
}

/** A small joint marker. */
export function Joint({ p, color = "#33343d", r = 0.06, opacity = 1 }: { p: Vec3; color?: string; r?: number; opacity?: number }) {
  return (
    <mesh position={p}>
      <sphereGeometry args={[r, 16, 16]} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

/** A polyline / polygon through points (optionally closed). */
export function Poly({ pts, color, width = 2, opacity = 1, close = false }: {
  pts: Vec3[]; color: string; width?: number; opacity?: number; close?: boolean;
}) {
  const p = close && pts.length > 1 ? [...pts, pts[0]] : pts;
  return <Line points={p} color={color} lineWidth={width} transparent={opacity < 1} opacity={opacity} />;
}

/** A prismatic leg: a segment with joint markers at both ends. */
export function Leg({ a, b, color, width = 3, opacity = 1, jointColor }: {
  a: Vec3; b: Vec3; color: string; width?: number; opacity?: number; jointColor?: string;
}) {
  return (
    <>
      <Seg a={a} b={b} color={color} width={width} opacity={opacity} />
      <Joint p={a} color={jointColor ?? color} r={0.055} opacity={opacity} />
      <Joint p={b} color={jointColor ?? color} r={0.055} opacity={opacity} />
    </>
  );
}
