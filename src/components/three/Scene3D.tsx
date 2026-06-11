import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export const AXIS_COLORS = { x: "#d9483f", y: "#2f9e44", z: "#3b6fd4" } as const;
export const FRAME_S = "#50525e";
export const FRAME_B = "#c2571c";

/**
 * Light-paper 3D canvas. Convention note: the math in this app uses z-up
 * (robotics), while three.js is y-up — scenes rotate a parent group so that
 * the math z-axis points up on screen.
 */
export function Scene3D({
  children,
  height = 380,
  camera = [3.2, 2.4, 3.2] as [number, number, number],
}: {
  children: ReactNode;
  height?: number;
  camera?: [number, number, number];
}) {
  return (
    <div style={{ height }} className="rounded-lg overflow-hidden bg-[#f4f2ec] border border-[var(--rule)]">
      <Canvas camera={{ position: camera, fov: 42 }} dpr={[1, 2]}>
        <color attach="background" args={["#f4f2ec"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 8, 5]} intensity={0.8} />
        <gridHelper args={[10, 20, "#d8d4c6", "#e7e4da"]} position={[0, -1.4, 0]} />
        <OrbitControls makeDefault enablePan={false} minDistance={2} maxDistance={12} />
        {/* map math z-up to screen up: rotate world so (x,y,z)_math -> (x,z,-y)_three */}
        <group rotation={[-Math.PI / 2, 0, 0]}>{children}</group>
      </Canvas>
    </div>
  );
}

/** Arrow from origin along `dir` (math coords, z-up handled by Scene3D group). */
export function Arrow({
  dir,
  length = 1,
  color,
  thickness = 0.022,
}: {
  dir: [number, number, number];
  length?: number;
  color: string;
  thickness?: number;
}) {
  const n = Math.hypot(dir[0], dir[1], dir[2]);
  if (n < 1e-9) return null;
  const d: [number, number, number] = [dir[0] / n, dir[1] / n, dir[2] / n];
  // Cylinders extend along local +y; rotate (0,1,0) onto d with a quaternion.
  const from: [number, number, number] = [0, 1, 0];
  const cross: [number, number, number] = [
    from[1] * d[2] - from[2] * d[1],
    from[2] * d[0] - from[0] * d[2],
    from[0] * d[1] - from[1] * d[0],
  ];
  const dot = from[0] * d[0] + from[1] * d[1] + from[2] * d[2];
  const s = Math.sqrt((1 + dot) * 2);
  const q: [number, number, number, number] =
    s < 1e-6
      ? [1, 0, 0, 0] // 180°: rotate about x
      : [cross[0] / s, cross[1] / s, cross[2] / s, s / 2];
  const shaft = length - 0.09;
  return (
    <group quaternion={q}>
      <mesh position={[0, shaft / 2, 0]}>
        <cylinderGeometry args={[thickness, thickness, shaft, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, shaft + 0.045, 0]}>
        <coneGeometry args={[0.05, 0.11, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

/** A coordinate frame triad at `origin` with rotation R (row-major Mat3, math coords). */
export function Triad({
  R = [1, 0, 0, 0, 1, 0, 0, 0, 1],
  origin = [0, 0, 0],
  scale = 1,
  thickness = 0.022,
  colors = [AXIS_COLORS.x, AXIS_COLORS.y, AXIS_COLORS.z],
  ghost = false,
}: {
  R?: number[];
  origin?: [number, number, number];
  scale?: number;
  thickness?: number;
  colors?: [string, string, string];
  ghost?: boolean;
}) {
  const col = (i: number): [number, number, number] => [R[i], R[3 + i], R[6 + i]];
  return (
    <group position={origin}>
      <Arrow dir={col(0)} length={scale} color={colors[0]} thickness={ghost ? thickness * 0.6 : thickness} />
      <Arrow dir={col(1)} length={scale} color={colors[1]} thickness={ghost ? thickness * 0.6 : thickness} />
      <Arrow dir={col(2)} length={scale} color={colors[2]} thickness={ghost ? thickness * 0.6 : thickness} />
      {!ghost && (
        <mesh>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial color="#33343d" />
        </mesh>
      )}
    </group>
  );
}
