import { Line } from "@react-three/drei";
import { Vector3, Quaternion } from "three";
import { useMemo } from "react";
import { theme } from "../../theme";

interface MathVectorProps {
  start?: [number, number, number];
  end: [number, number, number];
  color?: string;
  width?: number;
  label?: string;
}

export function MathVector({ 
  start = [0, 0, 0], 
  end, 
  color = theme.accentBody, 
  width = 2.5
}: MathVectorProps) {
  const s = useMemo(() => new Vector3(...start), [start]);
  const e = useMemo(() => new Vector3(...end), [end]);
  const direction = useMemo(() => new Vector3().subVectors(e, s), [s, e]);
  const length = direction.length();

  const rotation = useMemo(() => {
    if (length < 0.001) return new Quaternion();
    const q = new Quaternion();
    q.setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize());
    return q;
  }, [direction, length]);

  if (length < 0.001) return null;

  return (
    <group>
      {/* Main Vector Line */}
      <Line points={[s, e]} color={color} lineWidth={width} />
      
      {/* Arrowhead (Cone) */}
      <mesh position={e} quaternion={rotation}>
        <coneGeometry args={[0.06, 0.18, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Subtle Glow Trail */}
      <Line 
        points={[s, e]} 
        color={color} 
        lineWidth={width * 3} 
        transparent 
        opacity={0.1} 
      />
    </group>
  );
}
