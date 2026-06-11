import { useState } from "react";
import { SceneCanvas } from "../../components/three/SceneCanvas";
import { MathPoint, MathPlane, MathArc } from "../../components/math-visuals";
import { Text } from "@react-three/drei";
import { Vector3 } from "three";
import { theme } from "../../theme";

export function CspaceIntroduction() {
  const [theta1, setTheta1] = useState(0.7);
  const [theta2, setTheta2] = useState(1.1);

  // Geometry constants
  const L1 = 1.2;
  const L2 = 1.0;

  // Compute robot joint positions
  const p1 = new Vector3(L1 * Math.cos(theta1), L1 * Math.sin(theta1), 0);
  const p2 = new Vector3(
    p1.x + L2 * Math.cos(theta1 + theta2),
    p1.y + L2 * Math.sin(theta1 + theta2),
    0
  );

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0c0d10]">
      <SceneCanvas camera={{ position: [0, 0, 6], fov: 40 }}>
        {/* 1. PHYSICAL WORKSPACE (LEFT) */}
        <group position={[-1.8, 0, 0]}>
          <Text position={[0, 2.2, 0]} fontSize={0.12} color={theme.muted} font="monospace" letterSpacing={0.2}>
             PHYSICAL WORKSPACE (W)
          </Text>
          
          <MathPlane size={[4, 4]} color={theme.border} position={[0, 0, -0.01]} rotation={[0, 0, 0]} />
          
          <MathPoint position={[0, 0, 0]} color={theme.muted} size={0.04} glow={false} />
          
          <group rotation={[0, 0, theta1]}>
             <mesh position={[L1/2, 0, 0]}>
                <capsuleGeometry args={[0.05, L1 - 0.1, 16, 16]} />
                <meshBasicMaterial color={theme.accentBody} transparent opacity={0.4} />
             </mesh>
          </group>

          <group position={[p1.x, p1.y, 0]} rotation={[0, 0, theta1 + theta2]}>
             <mesh position={[L2/2, 0, 0]}>
                <capsuleGeometry args={[0.05, L2 - 0.1, 16, 16]} />
                <meshBasicMaterial color={theme.accentBody} transparent opacity={0.25} />
             </mesh>
          </group>

          <MathPoint position={[p1.x, p1.y, 0]} color={theme.accentBody} size={0.06} />
          <MathPoint position={[p2.x, p2.y, 0]} color={theme.accentJoint} size={0.08} />

          <MathArc position={[0, 0, 0.05]} radius={0.3} startAngle={0} endAngle={theta1} color={theme.accentBody} />
          <MathArc position={[p1.x, p1.y, 0.05]} radius={0.25} startAngle={theta1} endAngle={theta1 + theta2} color={theme.accentBody} />
          
          <Text position={[0.4, 0.15, 0.1]} fontSize={0.1} color={theme.accentBody}>θ₁</Text>
          <Text position={[p1.x + 0.35, p1.y + 0.15, 0.1]} fontSize={0.1} color={theme.accentBody}>θ₂</Text>
        </group>

        {/* 2. CONFIGURATION SPACE (RIGHT) */}
        <group position={[1.8, 0, 0]}>
           <Text position={[0, 2.2, 0]} fontSize={0.12} color={theme.muted} font="monospace" letterSpacing={0.2}>
              CONFIGURATION SPACE (𝒞)
           </Text>
           
           <MathPlane size={[Math.PI * 1.2, Math.PI * 1.2]} color={theme.border} position={[0, 0, -0.01]} rotation={[0, 0, 0]} />
           
           <MathPoint 
              position={[theta1, theta2, 0.05]} 
              color={theme.accentBody} 
              size={0.1} 
           />
           
           <Text position={[2, 0, 0.1]} fontSize={0.1} color={theme.muted}>θ₁</Text>
           <Text position={[0, 2, 0.1]} fontSize={0.1} color={theme.muted}>θ₂</Text>

           <Text 
              position={[theta1, theta2 + 0.25, 0.1]} 
              fontSize={0.12} 
              color={theme.accentBody} 
              font="monospace"
           >
              q = ({theta1.toFixed(2)}, {theta2.toFixed(2)})
           </Text>
        </group>
      </SceneCanvas>

      {/* Unified Controls Overlay */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-80 bg-[#14161a]/95 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-2xl z-30 pointer-events-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-[0.2em] text-[#717782]">
              <span>Joint 1 (θ₁)</span>
              <span className="text-[#ffb400] font-mono">{((theta1 * 180) / Math.PI).toFixed(1)}°</span>
            </div>
            <input 
              type="range" 
              min={-Math.PI} 
              max={Math.PI} 
              step={0.01} 
              value={theta1} 
              onChange={(e) => setTheta1(parseFloat(e.target.value))}
              className="w-full accent-[#ffb400]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-[0.2em] text-[#717782]">
              <span>Joint 2 (θ₂)</span>
              <span className="text-[#ffb400] font-mono">{((theta2 * 180) / Math.PI).toFixed(1)}°</span>
            </div>
            <input 
              type="range" 
              min={-Math.PI} 
              max={Math.PI} 
              step={0.01} 
              value={theta2} 
              onChange={(e) => setTheta2(parseFloat(e.target.value))}
              className="w-full accent-[#ffb400]"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center">
           <span className="text-[9px] text-[#717782] text-center uppercase tracking-widest leading-relaxed">
              Drag sliders to observe the <span className="text-[#ffb400]">Mapping Logic</span>
           </span>
        </div>
      </div>
    </div>
  );
}
