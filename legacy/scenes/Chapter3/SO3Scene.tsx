import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface Sliders {
  roll: number;
  pitch: number;
  yaw: number;
}

function buildR(roll: number, pitch: number, yaw: number): THREE.Matrix3 {
  // ZYX Euler: R = Rz(yaw) Ry(pitch) Rx(roll)
  const m = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(roll, pitch, yaw, "ZYX")
  );
  const r = new THREE.Matrix3().setFromMatrix4(m);
  return r;
}

function fmtCell(v: number) {
  const s = v.toFixed(2);
  return s === "-0.00" ? "0.00" : s;
}

function MatrixDisplay({ R }: { R: number[] }) {
  const colors = [
    "#ff3d6e", "#ff3d6e", "#ff3d6e",
    "#b5ff4b", "#b5ff4b", "#b5ff4b",
    "#00e5ff", "#00e5ff", "#00e5ff",
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 3,
        background: "rgba(0,0,0,0.25)",
        borderRadius: 6,
        padding: 8,
        border: "1px solid #20263f",
      }}
    >
      {R.map((v, i) => (
        <div
          key={i}
          style={{
            background: "rgba(255,255,255,0.02)",
            borderRadius: 3,
            padding: "4px 2px",
            textAlign: "center",
            color: colors[i],
            fontSize: 10,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {fmtCell(v)}
        </div>
      ))}
    </div>
  );
}

function makeArrow(dir: THREE.Vector3, color: number, len: number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len * 0.82, 10), mat);
  shaft.position.set(0, len * 0.41, 0);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, len * 0.18, 10), mat);
  head.position.set(0, len * 0.91, 0);
  group.add(shaft, head);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return group;
}

export function SO3Scene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<Sliders>({ roll: 0, pitch: 0, yaw: 0 });
  const bodyGroupRef = useRef<THREE.Group | null>(null);

  const [sliders, setSliders] = useState<Sliders>({ roll: 0, pitch: 0.5, yaw: 0.8 });
  const [rEntries, setREntries] = useState<number[]>([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const [det, setDet] = useState("1.000");
  const [ortho, setOrtho] = useState("0.000");

  // Mirror slider state to ref for animation loop access
  useEffect(() => {
    stateRef.current = sliders;
    const R3 = buildR(sliders.roll, sliders.pitch, sliders.yaw);
    const e = R3.elements;
    // Matrix3 elements are column-major: [c0r0, c0r1, c0r2, c1r0 ...]
    // We want row-major for display
    const rowMajor = [e[0], e[3], e[6], e[1], e[4], e[7], e[2], e[5], e[8]];
    setREntries(rowMajor);

    const M4 = new THREE.Matrix4().setFromMatrix3(R3);
    const det3 = M4.determinant();
    setDet(det3.toFixed(3));

    // Check RᵀR ≈ I: max off-diagonal of (RᵀR - I)
    const RtR = new THREE.Matrix3().multiplyMatrices(
      new THREE.Matrix3().copy(R3).transpose(),
      R3
    );
    const re = RtR.elements;
    const offDiag = Math.max(
      Math.abs(re[1]), Math.abs(re[2]), Math.abs(re[3]),
      Math.abs(re[5]), Math.abs(re[6]), Math.abs(re[7])
    );
    setOrtho(offDiag.toFixed(4));
  }, [sliders]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090a0f);

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(4, 3, 5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dl = new THREE.DirectionalLight(0xffffff, 0.9);
    dl.position.set(5, 8, 5);
    scene.add(dl);

    // Grid
    const grid = new THREE.GridHelper(12, 24, 0x20263f, 0x131726);
    grid.position.y = -0.01;
    scene.add(grid);

    // Space frame {s} — fixed, dim
    function addAxis(scene: THREE.Scene, dir: THREE.Vector3, color: number, len: number) {
      const arr = makeArrow(dir, color, len);
      scene.add(arr);
    }
    addAxis(scene, new THREE.Vector3(1, 0, 0), 0x441111, 1.2);
    addAxis(scene, new THREE.Vector3(0, 1, 0), 0x114411, 1.2);
    addAxis(scene, new THREE.Vector3(0, 0, 1), 0x111144, 1.2);

    // Body frame {b} — colored, rotates
    const bodyGroup = new THREE.Group();
    scene.add(bodyGroup);
    bodyGroupRef.current = bodyGroup;

    const xArr = makeArrow(new THREE.Vector3(1, 0, 0), 0xff3d6e, 1.8);
    const yArr = makeArrow(new THREE.Vector3(1, 0, 0), 0xb5ff4b, 1.8);
    const zArr = makeArrow(new THREE.Vector3(1, 0, 0), 0x00e5ff, 1.8);
    yArr.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0));
    zArr.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1));
    xArr.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
    bodyGroup.add(xArr, yArr, zArr);

    // Box to represent rigid body
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x1a2548,
      emissive: 0x0a1020,
      transparent: true,
      opacity: 0.6,
      roughness: 0.4,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), boxMat);
    box.castShadow = true;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.8, 0.3, 0.5)),
      new THREE.LineBasicMaterial({ color: 0x2a4880 })
    );
    bodyGroup.add(box, edges);

    // Origin dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4 })
    );
    bodyGroup.add(dot);

    // Animation loop
    const animate = () => {
      const id = requestAnimationFrame(animate);
      controls.update();

      const { roll, pitch, yaw } = stateRef.current;
      const euler = new THREE.Euler(roll, pitch, yaw, "ZYX");
      bodyGroup.setRotationFromEuler(euler);

      renderer.render(scene, camera);
      return id;
    };
    const id = animate();

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  const updateSlider = useCallback((key: keyof Sliders, val: number) => {
    setSliders(prev => ({ ...prev, [key]: val }));
  }, []);

  return (
    <div className="w-full h-full flex">
      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative" />

      {/* Control panel */}
      <div
        style={{
          width: 280,
          height: "100%",
          background: "linear-gradient(180deg, rgba(17,20,34,0.98) 0%, rgba(9,10,15,0.98) 100%)",
          borderLeft: "1px solid #20263f",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid #20263f" }}>
          <div style={{ fontSize: 13, fontFamily: "Syne, sans-serif", fontWeight: 800, color: "#d2d9ef", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Rotation <span style={{ color: "#ff3d6e" }}>SO(3)</span>
          </div>
          <div style={{ fontSize: 9, color: "#5f6b8d", marginTop: 3 }}>
            ZYX Euler — Body frame {"{b}"} relative to {"{s}"}
          </div>
        </div>

        {/* Rotation axes color legend */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid #20263f" }}>
          {[["x̂_b (col 1)", "#ff3d6e"], ["ŷ_b (col 2)", "#b5ff4b"], ["ẑ_b (col 3)", "#00e5ff"]].map(([label, color]) => (
            <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: color as string, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "#d2d9ef" }}>{label as string}</span>
            </div>
          ))}
        </div>

        {/* Euler sliders */}
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #20263f" }}>
          <div style={{ fontSize: 9, fontFamily: "Syne, sans-serif", fontWeight: 700, color: "#5f6b8d", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>
            Euler Angles (ZYX)
          </div>

          {(["roll", "pitch", "yaw"] as const).map(key => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: "#d2d9ef" }}>{key.charAt(0).toUpperCase() + key.slice(1)} ({key === "roll" ? "Rx" : key === "pitch" ? "Ry" : "Rz"})</span>
                <span style={{ color: "#00e5ff", fontWeight: 600 }}>
                  {((sliders[key] * 180) / Math.PI).toFixed(0)}°
                </span>
              </div>
              <input
                type="range"
                min={-Math.PI}
                max={Math.PI}
                step={0.01}
                value={sliders[key]}
                onChange={e => updateSlider(key, Number(e.target.value))}
                style={{ width: "100%", accentColor: "#00e5ff" }}
              />
            </div>
          ))}
        </div>

        {/* R matrix */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #20263f" }}>
          <div style={{ fontSize: 9, fontFamily: "Syne, sans-serif", fontWeight: 700, color: "#5f6b8d", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>
            Rotation Matrix R ∈ SO(3)
          </div>
          <MatrixDisplay R={rEntries} />
          <div style={{ marginTop: 8, fontSize: 9, color: "#5f6b8d", lineHeight: 1.7 }}>
            Cols: <span style={{ color: "#ff3d6e" }}>x̂_b</span> | <span style={{ color: "#b5ff4b" }}>ŷ_b</span> | <span style={{ color: "#00e5ff" }}>ẑ_b</span> in space frame
          </div>
        </div>

        {/* Verification */}
        <div style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 9, fontFamily: "Syne, sans-serif", fontWeight: 700, color: "#5f6b8d", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>
            SO(3) Properties
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "5px 0", borderBottom: "1px solid #20263f" }}>
            <span style={{ color: "#d2d9ef" }}>det(R)</span>
            <span style={{ color: Number(det) > 0.99 ? "#b5ff4b" : "#ff3d6e", fontWeight: 600 }}>{det}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "5px 0", borderBottom: "1px solid #20263f" }}>
            <span style={{ color: "#d2d9ef" }}>‖RᵀR − I‖_∞</span>
            <span style={{ color: "#b5ff4b", fontWeight: 600 }}>{ortho}</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 9, color: "#5f6b8d", lineHeight: 1.7 }}>
            det = +1 confirms proper rotation (no reflection). RᵀR ≈ I confirms orthonormality.
          </div>
        </div>
      </div>
    </div>
  );
}
