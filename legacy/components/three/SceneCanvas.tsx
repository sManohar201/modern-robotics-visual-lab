import type { PropsWithChildren } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";

interface SceneCanvasProps extends PropsWithChildren {
  camera?: {
    position: [number, number, number];
    fov: number;
  };
}

export function SceneCanvas({ 
  children, 
  camera = { position: [0, 0, 5], fov: 45 } 
}: SceneCanvasProps) {
  return (
    <div className="absolute inset-0 bg-[#0c0d10]">
      <Canvas 
        camera={camera} 
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={["#0c0d10"]} />
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffb400" />
        <directionalLight position={[-5, 5, 5]} intensity={1} />
        
        <Grid 
          args={[20, 20]} 
          position={[0, 0, -0.05]} 
          cellColor="#1e242b" 
          sectionColor="#24292f" 
          fadeDistance={25} 
          fadeStrength={5}
          infiniteGrid
        />
        
        {children}
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      </Canvas>
    </div>
  );
}
