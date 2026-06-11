import { Sphere } from "@react-three/drei";
import { theme } from "../../theme";

interface MathPointProps {
  position: [number, number, number];
  color?: string;
  size?: number;
  glow?: boolean;
}

export function MathPoint({ 
  position, 
  color = theme.accentBody, 
  size = 0.08,
  glow = true 
}: MathPointProps) {
  return (
    <group position={position}>
      <Sphere args={[size, 32, 32]}>
        <meshBasicMaterial color={color} />
      </Sphere>
      {glow && (
        <Sphere args={[size * 1.5, 16, 16]}>
          <meshBasicMaterial color={color} transparent opacity={0.15} />
        </Sphere>
      )}
    </group>
  );
}
