import { Line } from "@react-three/drei";
import { Vector3 } from "three";
import { useMemo } from "react";
import { theme } from "../../theme";

interface MathArcProps {
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  segments?: number;
  color?: string;
  width?: number;
  position?: [number, number, number] | Vector3;
}

export function MathArc({
  radius = 0.5,
  startAngle = 0,
  endAngle = Math.PI / 2,
  segments = 32,
  color = theme.accentBody,
  width = 2,
  position = [0, 0, 0]
}: MathArcProps) {
  const points = useMemo(() => {
    const pts = [];
    const delta = (endAngle - startAngle) / segments;
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + i * delta;
      pts.push(new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
    }
    return pts;
  }, [radius, startAngle, endAngle, segments]);

  const finalPos = position instanceof Vector3 ? position : new Vector3(...position);

  return (
    <group position={finalPos}>
      <Line points={points} color={color} lineWidth={width} />
    </group>
  );
}
