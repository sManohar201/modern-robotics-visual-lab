import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const L1 = 1.4, L2 = 1.1;

// ── 2D C-Space canvas drawing ────────────────────────────────────────────────

function drawCspace(
  canvas: HTMLCanvasElement,
  t1: number,
  t2: number,
  history: [number, number][]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const pad = 36;
  const plotW = W - pad * 2, plotH = H - pad * 2;

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = "#0a0c14";
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = "#20263f";
  ctx.lineWidth = 1;
  ctx.strokeRect(pad, pad, plotW, plotH);

  // Map angle [-π, π] to pixel
  const toX = (t: number) => pad + ((t + Math.PI) / (2 * Math.PI)) * plotW;
  const toY = (t: number) => pad + (1 - (t + Math.PI) / (2 * Math.PI)) * plotH;

  // Grid lines
  ctx.strokeStyle = "#1a2030";
  ctx.lineWidth = 0.5;
  const gridLines = [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI];
  for (const v of gridLines) {
    const x = toX(v);
    ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, pad + plotH); ctx.stroke();
    const y = toY(v);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + plotW, y); ctx.stroke();
  }

  // Axis labels
  ctx.fillStyle = "#5f6b8d";
  ctx.font = "10px JetBrains Mono, monospace";
  ctx.textAlign = "center";
  [[-Math.PI, "-π"], [-Math.PI / 2, "-π/2"], [0, "0"], [Math.PI / 2, "π/2"], [Math.PI, "π"]].forEach(
    ([v, lbl]) => {
      ctx.fillText(String(lbl), toX(v as number), pad + plotH + 14);
    }
  );
  ctx.textAlign = "right";
  [[-Math.PI, "-π"], [-Math.PI / 2, "-π/2"], [0, "0"], [Math.PI / 2, "π/2"], [Math.PI, "π"]].forEach(
    ([v, lbl]) => {
      ctx.fillText(String(lbl), pad - 5, toY(v as number) + 3);
    }
  );

  // Axis title labels
  ctx.fillStyle = "#5f6b8d";
  ctx.font = "bold 10px JetBrains Mono, monospace";
  ctx.textAlign = "center";
  ctx.fillText("θ₁", pad + plotW / 2, H - 4);
  ctx.save();
  ctx.translate(10, pad + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("θ₂", 0, 0);
  ctx.restore();

  // History trail
  if (history.length > 1) {
    ctx.beginPath();
    ctx.moveTo(toX(history[0][0]), toY(history[0][1]));
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(toX(history[i][0]), toY(history[i][1]));
    }
    ctx.strokeStyle = "rgba(0, 229, 255, 0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Crosshair lines
  ctx.strokeStyle = "rgba(0, 229, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(toX(t1), pad); ctx.lineTo(toX(t1), pad + plotH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad, toY(t2)); ctx.lineTo(pad + plotW, toY(t2)); ctx.stroke();
  ctx.setLineDash([]);

  // Configuration point glow
  const cx = toX(t1), cy = toY(t2);
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
  grad.addColorStop(0, "rgba(0, 229, 255, 0.5)");
  grad.addColorStop(1, "rgba(0, 229, 255, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#00e5ff";
  ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
}

// ── Main scene component ─────────────────────────────────────────────────────

export function CspaceScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ t1: 0.7, t2: 1.1 });
  const historyRef = useRef<[number, number][]>([[0.7, 1.1]]);

  const [t1, setT1Raw] = useState(0.7);
  const [t2, setT2Raw] = useState(1.1);
  const [eePos, setEePos] = useState({ x: 0, y: 0 });

  // Three.js refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const link1Ref = useRef<THREE.Mesh | null>(null);
  const link2Ref = useRef<THREE.Mesh | null>(null);
  const joint1Ref = useRef<THREE.Mesh | null>(null);
  const eeRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#090a0f");

    // Camera
    const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 7);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.maxDistance = 14;
    controls.minDistance = 3;

    // Lights
    scene.add(new THREE.AmbientLight("#ffffff", 0.4));
    const pLight = new THREE.PointLight("#00e5ff", 1.2, 20);
    pLight.position.set(0, 3, 4);
    scene.add(pLight);

    // Grid floor
    const grid = new THREE.GridHelper(8, 16, "#1a2030", "#141826");
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.08;
    scene.add(grid);

    // World frame arrows
    const addArrow = (dir: THREE.Vector3, color: number) => {
      const arr = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), 0.5, color, 0.12, 0.07);
      scene.add(arr);
    };
    addArrow(new THREE.Vector3(1, 0, 0), 0xff4444);
    addArrow(new THREE.Vector3(0, 1, 0), 0x44ff88);
    addArrow(new THREE.Vector3(0, 0, 1), 0x4488ff);

    // Base joint
    const baseGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: "#5f6b8d", roughness: 0.4, metalness: 0.3 });
    scene.add(new THREE.Mesh(baseGeo, baseMat));

    // Link 1
    const link1Geo = new THREE.CylinderGeometry(0.05, 0.05, L1, 12);
    const link1Mat = new THREE.MeshStandardMaterial({
      color: "#00e5ff", roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.85,
    });
    const link1 = new THREE.Mesh(link1Geo, link1Mat);
    scene.add(link1);
    link1Ref.current = link1;

    // Joint 1 sphere
    const j1Geo = new THREE.SphereGeometry(0.09, 16, 16);
    const j1Mat = new THREE.MeshStandardMaterial({ color: "#00e5ff", emissive: "#00e5ff", emissiveIntensity: 0.3, roughness: 0.2 });
    const joint1 = new THREE.Mesh(j1Geo, j1Mat);
    scene.add(joint1);
    joint1Ref.current = joint1;

    // Link 2
    const link2Geo = new THREE.CylinderGeometry(0.04, 0.04, L2, 12);
    const link2Mat = new THREE.MeshStandardMaterial({
      color: "#b5ff4b", roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.75,
    });
    const link2 = new THREE.Mesh(link2Geo, link2Mat);
    scene.add(link2);
    link2Ref.current = link2;

    // End effector
    const eeGeo = new THREE.SphereGeometry(0.13, 20, 20);
    const eeMat = new THREE.MeshStandardMaterial({
      color: "#b5ff4b", emissive: "#b5ff4b", emissiveIntensity: 0.4, roughness: 0.15,
    });
    const ee = new THREE.Mesh(eeGeo, eeMat);
    scene.add(ee);
    eeRef.current = ee;

    // Workspace reachability ring
    const wsGeo = new THREE.TorusGeometry(L1 + L2, 0.012, 8, 80);
    const wsMat = new THREE.MeshBasicMaterial({ color: "#20263f", transparent: true, opacity: 0.5 });
    const wsRing = new THREE.Mesh(wsGeo, wsMat);
    wsRing.rotation.x = Math.PI / 2;
    scene.add(wsRing);

    const wsInnerGeo = new THREE.TorusGeometry(Math.abs(L1 - L2), 0.008, 8, 64);
    const wsInner = new THREE.Mesh(wsInnerGeo, new THREE.MeshBasicMaterial({ color: "#20263f", transparent: true, opacity: 0.4 }));
    wsInner.rotation.x = Math.PI / 2;
    scene.add(wsInner);

    // Resize handler
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // Animation loop
    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();

      const { t1, t2 } = stateRef.current;
      const j1x = L1 * Math.cos(t1), j1y = L1 * Math.sin(t1);
      const eex = j1x + L2 * Math.cos(t1 + t2), eey = j1y + L2 * Math.sin(t1 + t2);

      // Link 1: from (0,0) to (j1x, j1y) — center at midpoint, rotate
      if (link1Ref.current) {
        link1Ref.current.position.set(j1x / 2, j1y / 2, 0);
        link1Ref.current.rotation.z = t1;
        // Cylinder is along Y by default — we rotated it so it's along the link direction
        link1Ref.current.rotation.z = t1 + Math.PI / 2;
        link1Ref.current.position.set(j1x / 2, j1y / 2, 0);
      }

      // Link 2: from (j1x,j1y) to (eex,eey)
      if (link2Ref.current) {
        link2Ref.current.position.set((j1x + eex) / 2, (j1y + eey) / 2, 0);
        link2Ref.current.rotation.z = (t1 + t2) + Math.PI / 2;
      }

      if (joint1Ref.current) joint1Ref.current.position.set(j1x, j1y, 0);
      if (eeRef.current) eeRef.current.position.set(eex, eey, 0.06);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // Sync sliders → stateRef + C-space canvas + FK display
  const setT1 = useCallback((v: number) => {
    stateRef.current.t1 = v;
    setT1Raw(v);
    const { t2 } = stateRef.current;
    const j1x = L1 * Math.cos(v), j1y = L1 * Math.sin(v);
    const eex = j1x + L2 * Math.cos(v + t2), eey = j1y + L2 * Math.sin(v + t2);
    setEePos({ x: parseFloat(eex.toFixed(3)), y: parseFloat(eey.toFixed(3)) });
    const hist = historyRef.current;
    hist.push([v, t2]);
    if (hist.length > 80) hist.shift();
    if (canvasRef.current) drawCspace(canvasRef.current, v, t2, hist);
  }, []);

  const setT2 = useCallback((v: number) => {
    stateRef.current.t2 = v;
    setT2Raw(v);
    const { t1 } = stateRef.current;
    const j1x = L1 * Math.cos(t1), j1y = L1 * Math.sin(t1);
    const eex = j1x + L2 * Math.cos(t1 + v), eey = j1y + L2 * Math.sin(t1 + v);
    setEePos({ x: parseFloat(eex.toFixed(3)), y: parseFloat(eey.toFixed(3)) });
    const hist = historyRef.current;
    hist.push([t1, v]);
    if (hist.length > 80) hist.shift();
    if (canvasRef.current) drawCspace(canvasRef.current, t1, v, hist);
  }, []);

  // Initial draw
  useEffect(() => {
    if (canvasRef.current) {
      drawCspace(canvasRef.current, t1, t2, historyRef.current);
      const j1x = L1 * Math.cos(t1), j1y = L1 * Math.sin(t1);
      const eex = j1x + L2 * Math.cos(t1 + t2), eey = j1y + L2 * Math.sin(t1 + t2);
      setEePos({ x: parseFloat(eex.toFixed(3)), y: parseFloat(eey.toFixed(3)) });
    }
  }, []);

  const S = {
    panel: {
      width: 280, height: "100%", overflowY: "auto" as const,
      background: "linear-gradient(180deg, rgba(17,20,34,0.98) 0%, rgba(9,10,15,0.98) 100%)",
      borderLeft: "1px solid #20263f",
      fontFamily: "JetBrains Mono, monospace",
      display: "flex", flexDirection: "column" as const,
    },
    sectionHead: {
      fontSize: 9, fontFamily: "Syne, sans-serif", fontWeight: 700 as const,
      color: "#5f6b8d", textTransform: "uppercase" as const, letterSpacing: "0.15em", marginBottom: 12,
    },
    label: { display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 },
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      {/* 3D viewport */}
      <div ref={mountRef} style={{ flex: 1, position: "relative" }} />

      {/* Right control panel */}
      <div style={S.panel}>
        {/* Header */}
        <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid #20263f" }}>
          <div style={{ fontSize: 13, fontFamily: "Syne, sans-serif", fontWeight: 800, color: "#d2d9ef", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Configuration <span style={{ color: "#00e5ff" }}>Space</span>
          </div>
          <div style={{ fontSize: 9, color: "#5f6b8d", marginTop: 3 }}>2R planar robot · C-space = T²</div>
        </div>

        {/* Sliders */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #20263f" }}>
          <div style={S.sectionHead}>Joint Angles</div>
          {[
            { label: "θ₁ (Joint 1)", val: t1, set: setT1, color: "#00e5ff" },
            { label: "θ₂ (Joint 2)", val: t2, set: setT2, color: "#b5ff4b" },
          ].map(({ label, val, set, color }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={S.label}>
                <span style={{ color: "#d2d9ef" }}>{label}</span>
                <span style={{ color, fontWeight: 600 }}>{((val * 180) / Math.PI).toFixed(1)}°</span>
              </div>
              <input
                type="range" min={-Math.PI} max={Math.PI} step={0.02} value={val}
                onChange={e => set(Number(e.target.value))}
                style={{ width: "100%", accentColor: color }}
              />
            </div>
          ))}
        </div>

        {/* C-space canvas */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #20263f" }}>
          <div style={S.sectionHead}>C-Space  q = (θ₁, θ₂)</div>
          <canvas
            ref={canvasRef}
            width={244}
            height={220}
            style={{ width: "100%", borderRadius: 8, border: "1px solid #20263f", display: "block" }}
          />
          <div style={{ marginTop: 8, fontSize: 9, color: "#5f6b8d", lineHeight: 1.6 }}>
            Each point on this square is one robot pose. Moving along θ₁ or θ₂ wraps around (torus topology T²).
          </div>
        </div>

        {/* FK result */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #20263f" }}>
          <div style={S.sectionHead}>End Effector Position</div>
          <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 6, padding: 10, border: "1px solid #20263f", fontSize: 10 }}>
            {[["x", eePos.x, "#00e5ff"], ["y", eePos.y, "#b5ff4b"]].map(([k, v, c]) => (
              <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#5f6b8d" }}>{k}:</span>
                <span style={{ color: String(c), fontWeight: 600 }}>{String(v)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #20263f", paddingTop: 6, marginTop: 2 }}>
              <span style={{ color: "#5f6b8d" }}>‖p‖:</span>
              <span style={{ color: "#ff3d6e", fontWeight: 600 }}>
                {Math.sqrt(eePos.x ** 2 + eePos.y ** 2).toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* Concept note */}
        <div style={{ padding: "14px 18px" }}>
          <div style={S.sectionHead}>Key Concept</div>
          <div style={{ fontSize: 9, color: "#5f6b8d", lineHeight: 1.7 }}>
            The 2R robot has 2 DOF. Its C-space is a torus T² = S¹ × S¹ — a 2D square where opposite edges identify (both joints wrap −π to π). Every point in the square maps to exactly one robot configuration in physical space.
          </div>
        </div>
      </div>
    </div>
  );
}
