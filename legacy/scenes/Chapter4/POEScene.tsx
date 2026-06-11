import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const L1 = 1.4, L2 = 1.2, L3 = 1.0;

interface SceneObjects {
  link1: THREE.Mesh;
  link2: THREE.Mesh;
  link3: THREE.Mesh;
  j0: THREE.Mesh;
  j1: THREE.Mesh;
  j2: THREE.Mesh;
  ee: THREE.Mesh;
  s1Arrow: THREE.ArrowHelper;
  s2Arrow: THREE.ArrowHelper;
  s3Arrow: THREE.ArrowHelper;
  s1Label: THREE.Sprite;
  s2Label: THREE.Sprite;
  s3Label: THREE.Sprite;
}

function makeLabelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.font = "bold 22px JetBrains Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 24);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.5, 0.19, 1);
  return sprite;
}

function buildCylinder(len: number, color: string): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0.045, 0.045, len, 12);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25, transparent: true, opacity: 0.9 });
  return new THREE.Mesh(geo, mat);
}

function buildJoint(r: number, color: string, emissive = 0.25): THREE.Mesh {
  const geo = new THREE.SphereGeometry(r, 16, 16);
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: emissive, roughness: 0.2 });
  return new THREE.Mesh(geo, mat);
}

export function POEScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneObjRef = useRef<SceneObjects | null>(null);
  const stateRef = useRef({ t1: 30, t2: 45, t3: -30, step: 3, showScrews: true });
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const [t1, setT1Raw] = useState(30);
  const [t2, setT2Raw] = useState(45);
  const [t3, setT3Raw] = useState(-30);
  const [step, setStepRaw] = useState(3);
  const [showScrews, setShowScrewsRaw] = useState(true);
  const [eeInfo, setEeInfo] = useState({ x: "0.000", y: "0.000", total: "45" });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#090a0f");

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 1.5, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.5, 0);
    controls.maxDistance = 14;
    controls.minDistance = 3;

    scene.add(new THREE.AmbientLight("#ffffff", 0.45));
    const pl = new THREE.PointLight("#b5ff4b", 1.0, 20);
    pl.position.set(2, 4, 4);
    scene.add(pl);
    const pl2 = new THREE.PointLight("#00e5ff", 0.5, 15);
    pl2.position.set(-3, 2, 3);
    scene.add(pl2);

    // Grid
    const grid = new THREE.GridHelper(12, 20, "#1a2030", "#131826");
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.08;
    scene.add(grid);

    // World frame
    scene.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.6, 0xff4444, 0.14, 0.08));
    scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.6, 0x44ff88, 0.14, 0.08));

    // Robot links & joints
    const link1 = buildCylinder(L1, "#2e3556");
    const link2 = buildCylinder(L2, "#2e3556");
    const link3 = buildCylinder(L3, "#2e3556");
    scene.add(link1, link2, link3);

    const j0 = buildJoint(0.1, "#ff3d6e");
    const j1 = buildJoint(0.09, "#b5ff4b");
    const j2 = buildJoint(0.08, "#00e5ff");
    const ee = buildJoint(0.12, "#ffffff", 0.5);
    scene.add(j0, j1, j2, ee);

    // Screw axis arrows
    const s1Arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -0.45), 0.9, 0xff3d6e, 0.18, 0.10);
    const s2Arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -0.35), 0.7, 0xb5ff4b, 0.16, 0.09);
    const s3Arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -0.3), 0.6, 0x00e5ff, 0.14, 0.08);
    scene.add(s1Arrow, s2Arrow, s3Arrow);

    const s1Label = makeLabelSprite("S₁(ẑ)", "#ff3d6e");
    const s2Label = makeLabelSprite("S₂(ẑ)", "#b5ff4b");
    const s3Label = makeLabelSprite("S₃(ẑ)", "#00e5ff");
    scene.add(s1Label, s2Label, s3Label);

    sceneObjRef.current = { link1, link2, link3, j0, j1, j2, ee, s1Arrow, s2Arrow, s3Arrow, s1Label, s2Label, s3Label };

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      const { t1, t2, t3, step, showScrews } = stateRef.current;
      const obj = sceneObjRef.current;
      if (!obj) { renderer.render(scene, camera); return; }

      const r1 = (step >= 1 ? t1 : 0) * Math.PI / 180;
      const r2 = (step >= 2 ? t2 : 0) * Math.PI / 180;
      const r3 = (step >= 3 ? t3 : 0) * Math.PI / 180;

      const c1 = Math.cos(r1), s1 = Math.sin(r1);
      const c12 = Math.cos(r1 + r2), s12 = Math.sin(r1 + r2);
      const c123 = Math.cos(r1 + r2 + r3), s123 = Math.sin(r1 + r2 + r3);

      const p0 = new THREE.Vector3(0, 0, 0);
      const p1 = new THREE.Vector3(L1 * c1, L1 * s1, 0);
      const p2 = new THREE.Vector3(p1.x + L2 * c12, p1.y + L2 * s12, 0);
      const pEE = new THREE.Vector3(p2.x + L3 * c123, p2.y + L3 * s123, 0);

      const positionLink = (link: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) => {
        const mid = from.clone().lerp(to, 0.5);
        const dir = to.clone().sub(from).normalize();
        link.position.copy(mid);
        link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      };

      positionLink(obj.link1, p0, p1);
      positionLink(obj.link2, p1, p2);
      positionLink(obj.link3, p2, pEE);

      obj.j0.position.copy(p0);
      obj.j1.position.copy(p1);
      obj.j2.position.copy(p2);
      obj.ee.position.copy(pEE);

      obj.s1Arrow.position.set(p0.x, p0.y, 0);
      obj.s1Arrow.visible = showScrews;
      obj.s1Label.position.set(p0.x + 0.18, p0.y + 0.52, 0);
      obj.s1Label.visible = showScrews;

      obj.s2Arrow.position.set(p1.x, p1.y, 0);
      obj.s2Arrow.visible = showScrews && step >= 2;
      obj.s2Label.position.set(p1.x + 0.18, p1.y + 0.45, 0);
      obj.s2Label.visible = showScrews && step >= 2;

      obj.s3Arrow.position.set(p2.x, p2.y, 0);
      obj.s3Arrow.visible = showScrews && step >= 3;
      obj.s3Label.position.set(p2.x + 0.18, p2.y + 0.4, 0);
      obj.s3Label.visible = showScrews && step >= 3;

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

  const updateEe = (r1: number, r2: number, r3: number, st: number) => {
    const a1 = (st >= 1 ? r1 : 0) * Math.PI / 180;
    const a2 = (st >= 2 ? r2 : 0) * Math.PI / 180;
    const a3 = (st >= 3 ? r3 : 0) * Math.PI / 180;
    const j1x = L1 * Math.cos(a1), j1y = L1 * Math.sin(a1);
    const j2x = j1x + L2 * Math.cos(a1 + a2), j2y = j1y + L2 * Math.sin(a1 + a2);
    const ex = j2x + L3 * Math.cos(a1 + a2 + a3), ey = j2y + L3 * Math.sin(a1 + a2 + a3);
    setEeInfo({ x: ex.toFixed(3), y: ey.toFixed(3), total: (r1 + r2 + r3).toFixed(0) });
  };

  const setT1 = useCallback((v: number) => {
    stateRef.current.t1 = v; setT1Raw(v);
    updateEe(v, stateRef.current.t2, stateRef.current.t3, stateRef.current.step);
  }, []);
  const setT2 = useCallback((v: number) => {
    stateRef.current.t2 = v; setT2Raw(v);
    updateEe(stateRef.current.t1, v, stateRef.current.t3, stateRef.current.step);
  }, []);
  const setT3 = useCallback((v: number) => {
    stateRef.current.t3 = v; setT3Raw(v);
    updateEe(stateRef.current.t1, stateRef.current.t2, v, stateRef.current.step);
  }, []);
  const setStep = useCallback((v: number) => {
    stateRef.current.step = v; setStepRaw(v);
    updateEe(stateRef.current.t1, stateRef.current.t2, stateRef.current.t3, v);
  }, []);
  const toggleScrews = useCallback(() => {
    stateRef.current.showScrews = !stateRef.current.showScrews;
    setShowScrewsRaw(s => !s);
  }, []);

  const S = {
    panel: {
      width: 280, height: "100%", overflowY: "auto" as const,
      background: "linear-gradient(180deg, rgba(17,20,34,0.98) 0%, rgba(9,10,15,0.98) 100%)",
      borderLeft: "1px solid #20263f", fontFamily: "JetBrains Mono, monospace",
      display: "flex", flexDirection: "column" as const,
    },
    sHead: {
      fontSize: 9, fontFamily: "Syne, sans-serif", fontWeight: 700 as const,
      color: "#5f6b8d", textTransform: "uppercase" as const, letterSpacing: "0.15em", marginBottom: 10,
    },
    label: { display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 },
  };

  const stepDescriptions = [
    "Apply e^[S₁]θ₁: rotate about joint 1 screw axis (world ẑ at base)",
    "Apply e^[S₂]θ₂: second joint contributes; screw axis at p₁",
    "All 3 joints: T = e^[S₁]θ₁ · e^[S₂]θ₂ · e^[S₃]θ₃ · T_M",
  ];

  const joints = [
    { label: "θ₁", val: t1, set: setT1, color: "#ff3d6e", name: "S₁ — base ẑ" },
    { label: "θ₂", val: t2, set: setT2, color: "#b5ff4b", name: "S₂ — joint 1 ẑ" },
    { label: "θ₃", val: t3, set: setT3, color: "#00e5ff", name: "S₃ — joint 2 ẑ" },
  ];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <div ref={mountRef} style={{ flex: 1, position: "relative" }} />

      <div style={S.panel}>
        {/* Header */}
        <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid #20263f" }}>
          <div style={{ fontSize: 13, fontFamily: "Syne, sans-serif", fontWeight: 800, color: "#d2d9ef", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Product of <span style={{ color: "#b5ff4b" }}>Exponentials</span>
          </div>
          <div style={{ fontSize: 9, color: "#5f6b8d", marginTop: 3 }}>3R planar arm — space form T(θ) = ∏ e^[Sᵢ]θᵢ · M</div>
        </div>

        {/* Step selector */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #20263f" }}>
          <div style={S.sHead}>Compose Step by Step</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setStep(n)}
                style={{
                  flex: 1, padding: "8px 4px", fontSize: 9, textTransform: "uppercase",
                  background: step === n ? "rgba(181,255,75,0.1)" : "transparent",
                  border: `1px solid ${step === n ? "#b5ff4b" : "#20263f"}`,
                  color: step === n ? "#b5ff4b" : "#5f6b8d",
                  borderRadius: 4, cursor: "pointer", fontFamily: "JetBrains Mono, monospace",
                }}>
                e^[S{n}]θ{n}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 9, color: "#5f6b8d", lineHeight: 1.7, background: "rgba(181,255,75,0.04)", border: "1px solid #20263f", borderRadius: 6, padding: "8px 10px" }}>
            {stepDescriptions[step - 1]}
          </div>
        </div>

        {/* Joint sliders */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #20263f" }}>
          <div style={S.sHead}>Joint Angles</div>
          {joints.map(({ label, val, set, color, name }) => (
            <div key={label} style={{ marginBottom: 14, opacity: label === "θ₂" && step < 2 ? 0.35 : label === "θ₃" && step < 3 ? 0.35 : 1, transition: "opacity 0.3s" }}>
              <div style={S.label}>
                <span style={{ color: "#d2d9ef" }}>{label} <span style={{ color: "#5f6b8d", fontSize: 8 }}>({name})</span></span>
                <span style={{ color, fontWeight: 600 }}>{val.toFixed(0)}°</span>
              </div>
              <input type="range" min={-150} max={150} step={1} value={val}
                onChange={e => set(Number(e.target.value))}
                style={{ width: "100%", accentColor: color }} />
            </div>
          ))}
        </div>

        {/* Screw axes toggle */}
        <div style={{ padding: "10px 18px", borderBottom: "1px solid #20263f" }}>
          <button onClick={toggleScrews}
            style={{
              width: "100%", padding: 8, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
              background: showScrews ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${showScrews ? "#00e5ff" : "#20263f"}`,
              color: showScrews ? "#00e5ff" : "#5f6b8d",
              borderRadius: 4, cursor: "pointer", fontFamily: "JetBrains Mono, monospace",
            }}>
            {showScrews ? "● Screw Axes Visible" : "○ Show Screw Axes"}
          </button>
        </div>

        {/* FK result */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #20263f" }}>
          <div style={S.sHead}>FK Result — End Effector</div>
          <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 6, padding: 10, border: "1px solid #20263f", fontSize: 10 }}>
            {[["x", eeInfo.x, "#00e5ff"], ["y", eeInfo.y, "#00e5ff"]].map(([k, v, c]) => (
              <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#5f6b8d" }}>{k}:</span>
                <span style={{ color: String(c), fontWeight: 600 }}>{String(v)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #20263f", paddingTop: 6, marginTop: 2 }}>
              <span style={{ color: "#5f6b8d" }}>θ_total:</span>
              <span style={{ color: "#b5ff4b", fontWeight: 600 }}>{eeInfo.total}°</span>
            </div>
          </div>
        </div>

        {/* Concept */}
        <div style={{ padding: "14px 18px" }}>
          <div style={S.sHead}>Space Form PoE</div>
          <div style={{ fontSize: 9, color: "#5f6b8d", lineHeight: 1.7 }}>
            Each joint's contribution is a matrix exponential e^[Sᵢ]θᵢ where Sᵢ is the screw axis expressed in the fixed space frame. The forward kinematics is the left-to-right product: all screw transforms applied in space frame order, then the home configuration M.
          </div>
        </div>
      </div>
    </div>
  );
}
