import { Grid } from "@react-three/drei";
import { theme } from "../../theme";

interface MathPlaneProps {
  size?: [number, number];
  color?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export function MathPlane({
  size = [10, 10],
  color = theme.border,
  position = [0, 0, 0],
  rotation = [-Math.PI / 2, 0, 0]
}: MathPlaneProps) {
  return (
    <group position={position} rotation={rotation}>
      <Grid
        args={size}
        sectionSize={1}
        sectionThickness={1}
        sectionColor={color}
        cellSize={0.2}
        cellThickness={0.5}
        cellColor={color}
        infiniteGrid={false}
        fadeDistance={20}
        fadeStrength={5}
      />
    </group>
  );
}
