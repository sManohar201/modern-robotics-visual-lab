import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Framework = "space" | "body";

interface State {
  theta: [number, number, number];
  dTheta: [number, number, number];
  framework: Framework;
}

// Link lengths
const L1 = 2.5, L2 = 2.0, L3 = 1.5;

function fmtCell(v: number): string {
  const s = v.toFixed(2);
  return s === "-0.00" ? "0.00" : s;
}

function ForwardKinematics(th: [number, number, number]) {
  const p0 = new THREE.Vector3(0, 0, 0);
  const w1 = new THREE.Vector3(0, 1, 0);

  const p1 = new THREE.Vector3(0, L1, 0);
  const m1 = new THREE.Matrix4().makeRotationY(th[0]);
  const w2 = new THREE.Vector3(0, 0, 1).applyMatrix4(m1);

  const p2Local = new THREE.Vector3(0, L2, 0);
  const m2 = m1.clone().multiply(new THREE.Matrix4().makeRotationZ(th[1]));
  const p2 = p2Local.clone().applyMatrix4(m2).add(p1);
  const w3 = new THREE.Vector3(0, 0, 1).applyMatrix4(m2);

  const p3Local = new THREE.Vector3(0, L3, 0);
  const m3 = m2.clone().multiply(new THREE.Matrix4().makeRotationZ(th[2]));
  const pEE = p3Local.clone().applyMatrix4(m3).add(p2);

  return { p0, p1, p2, pEE, w1, w2, w3 };
}

export function JacobianScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<State>({ theta: [Math.PI/6, Math.PI/4, -Math.PI/3], dTheta: [1.0, 0.5, 0.0], framework: "space" });

  const [theta, setTheta] = useState<[number, number, number]>([30, 45, -60]);
  const [dTheta, setDTheta] = useState<[number, number, number]>([1.0, 0.5, 0.0]);
  const [framework, setFramework] = useState<Framework>("space");
  const [jacobian, setJacobian] = useState<number[][]>([[0,0,0],[0,0,0],[0,0,0]]);
  const [velocity, setVelocity] = useState({ x: 0, y: 0, z: 0 });
  const [mu, setMu] = useState(0);

  // Sync to ref
  useEffect(() => {
    stateRef.current = {
      theta: [theta[0]*Math.PI/180, theta[1]*Math.PI/180, theta[2]*Math.PI/180],
      dTheta,
      framework,
    };
  }, [theta, dTheta, framework]);

  // Compute Jacobian for UI display
  useEffect(() => {
    const th: [number, number, number] = [theta[0]*Math.PI/180, theta[1]*Math.PI/180, theta[2]*Math.PI/180];
    const fk = ForwardKinematics(th);

    const v1s = new THREE.Vector3().crossVectors(fk.w1, new THREE.Vector3().subVectors(fk.pEE, fk.p0));
    const v2s = new THREE.Vector3().crossVectors(fk.w2, new THREE.Vector3().subVectors(fk.pEE, fk.p1));
    const v3s = new THREE.Vector3().crossVectors(fk.w3, new THREE.Vector3().subVectors(fk.pEE, fk.p2));

    let JActive: number[][];
    let vEE = new THREE.Vector3();

    if (framework === "space") {
      JActive = [
        [v1s.x, v2s.x, v3s.x],
        [v1s.y, v2s.y, v3s.y],
        [v1s.z, v2s.z, v3s.z],
      ];
      vEE.addScaledVector(v1s, dTheta[0]).addScaledVector(v2s, dTheta[1]).addScaledVector(v3s, dTheta[2]);
    } else {
      // Approximate body Jacobian via inverse rotation of EE
      const m1 = new THREE.Matrix4().makeRotationY(th[0]);
      const m2 = m1.clone().multiply(new THREE.Matrix4().makeRotationZ(th[1]));
      const m3 = m2.clone().multiply(new THREE.Matrix4().makeRotationZ(th[2]));
      const q = new THREE.Quaternion();
      m3.decompose(new THREE.Vector3(), q, new THREE.Vector3());
      const invRot = q.clone().invert();
      const v1b = v1s.clone().applyQuaternion(invRot);
      const v2b = v2s.clone().applyQuaternion(invRot);
      const v3b = v3s.clone().applyQuaternion(invRot);
      JActive = [
        [v1b.x, v2b.x, v3b.x],
        [v1b.y, v2b.y, v3b.y],
        [v1b.z, v2b.z, v3b.z],
      ];
      vEE.addScaledVector(v1b, dTheta[0]).addScaledVector(v2b, dTheta[1]).addScaledVector(v3b, dTheta[2]);
    }

    // Manipulability: sqrt(det(J Jᵀ))
    const A = [[0,0,0],[0,0,0],[0,0,0]];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      A[r][c] = JActive[r][0]*JActive[c][0] + JActive[r][1]*JActive[c][1] + JActive[r][2]*JActive[c][2];
    }
    const det = A[0][0]*(A[1][1]*A[2][2]-A[1][2]*A[2][1]) - A[0][1]*(A[1][0]*A[2][2]-A[1][2]*A[2][0]) + A[0][2]*(A[1][0]*A[2][1]-A[1][1]*A[2][0]);

    setJacobian(JActive);
    setVelocity({ x: vEE.x, y: vEE.y, z: vEE.z });
    setMu(Math.sqrt(Math.abs(det)));
  }, [theta, dTheta, framework]);

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

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(6, 5, 7);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(5, 10, 7);
    scene.add(dl);

    const grid = new THREE.GridHelper(16, 32, 0x20263f, 0x131726);
    grid.position.y = -0.01;
    scene.add(grid);

    // Space frame
    function createFrame(scale: number): THREE.Group {
      const group = new THREE.Group();
      [[1,0,0,0xff3d6e],[0,1,0,0xb5ff4b],[0,0,1,0x00e5ff]].forEach(([x,y,z,c]) => {
        const arr = new THREE.ArrowHelper(new THREE.Vector3(x as number,y as number,z as number), new THREE.Vector3(0,0,0), scale, c as number, scale*0.2, scale*0.1);
        group.add(arr);
      });
      return group;
    }
    scene.add(createFrame(1.2));

    // Materials
    const linkMat = new THREE.MeshStandardMaterial({ color: 0x2e3556, roughness: 0.4, metalness: 0.2 });
    const jointMat = new THREE.MeshStandardMaterial({ color: 0xb5ff4b, roughness: 0.3, emissive: 0xb5ff4b, emissiveIntensity: 0.1 });

    // Robot structure
    const basePivot = new THREE.Group();
    scene.add(basePivot);

    const link1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, L1, 16), linkMat);
    link1.position.y = L1 / 2;
    basePivot.add(link1);

    const joint2Group = new THREE.Group();
    joint2Group.position.y = L1;
    basePivot.add(joint2Group);
    joint2Group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 16).rotateX(Math.PI/2), jointMat));

    const link2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, L2, 16), linkMat);
    link2.position.y = L2 / 2;
    joint2Group.add(link2);

    const joint3Group = new THREE.Group();
    joint3Group.position.y = L2;
    joint2Group.add(joint3Group);
    joint3Group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 16).rotateX(Math.PI/2), jointMat));

    const link3 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, L3, 16), linkMat);
    link3.position.y = L3 / 2;
    joint3Group.add(link3);

    const eeGroup = new THREE.Group();
    eeGroup.position.y = L3;
    joint3Group.add(eeGroup);
    eeGroup.add(createFrame(0.8));

    // Velocity arrow
    const velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.01, 0x00e5ff, 0.2, 0.1);
    scene.add(velArrow);

    // Manipulability ellipsoid
    const ellipsoid = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.15, depthWrite: false })
    );
    scene.add(ellipsoid);

    function updateScene() {
      const s = stateRef.current;
      const fk = ForwardKinematics(s.theta);

      basePivot.rotation.y = s.theta[0];
      joint2Group.rotation.z = s.theta[1];
      joint3Group.rotation.z = s.theta[2];

      const v1s = new THREE.Vector3().crossVectors(fk.w1, new THREE.Vector3().subVectors(fk.pEE, fk.p0));
      const v2s = new THREE.Vector3().crossVectors(fk.w2, new THREE.Vector3().subVectors(fk.pEE, fk.p1));
      const v3s = new THREE.Vector3().crossVectors(fk.w3, new THREE.Vector3().subVectors(fk.pEE, fk.p2));

      let vEE = new THREE.Vector3();
      let JActive: THREE.Vector3[];

      if (s.framework === "space") {
        JActive = [v1s, v2s, v3s];
        vEE.addScaledVector(v1s, s.dTheta[0]).addScaledVector(v2s, s.dTheta[1]).addScaledVector(v3s, s.dTheta[2]);
        ellipsoid.rotation.set(0, 0, 0);
      } else {
        const q = new THREE.Quaternion();
        eeGroup.getWorldQuaternion(q);
        const inv = q.clone().invert();
        const v1b = v1s.clone().applyQuaternion(inv);
        const v2b = v2s.clone().applyQuaternion(inv);
        const v3b = v3s.clone().applyQuaternion(inv);
        JActive = [v1b, v2b, v3b];
        vEE.addScaledVector(v1b, s.dTheta[0]).addScaledVector(v2b, s.dTheta[1]).addScaledVector(v3b, s.dTheta[2]);
        ellipsoid.quaternion.copy(q);
      }

      // Velocity arrow
      velArrow.position.copy(fk.pEE);
      if (vEE.length() > 0.001) {
        velArrow.setDirection(vEE.clone().normalize());
        velArrow.setLength(vEE.length() * 0.8, 0.15, 0.06);
        velArrow.visible = true;
      } else {
        velArrow.visible = false;
      }

      // Ellipsoid
      const J: number[][] = JActive.map(v => [v.x, v.y, v.z]);
      const A = [[0,0,0],[0,0,0],[0,0,0]];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        A[r][c] = J[0][r]*J[0][c] + J[1][r]*J[1][c] + J[2][r]*J[2][c];
      }
      ellipsoid.position.copy(fk.pEE);
      ellipsoid.scale.set(
        Math.sqrt(Math.max(0.01, A[0][0])),
        Math.sqrt(Math.max(0.01, A[1][1])),
        Math.sqrt(Math.max(0.01, A[2][2]))
      );
    }

    let lastKey = "";
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      const s = stateRef.current;
      const key = `${s.theta.join(",")},${s.dTheta.join(",")},${s.framework}`;
      if (key !== lastKey) { updateScene(); lastKey = key; }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  const setTh = useCallback((i: 0|1|2, v: number) => {
    setTheta(prev => { const n = [...prev] as [number,number,number]; n[i] = v; return n; });
  }, []);
  const setDTh = useCallback((i: 0|1|2, v: number) => {
    setDTheta(prev => { const n = [...prev] as [number,number,number]; n[i] = v; return n; });
  }, []);

  const panelStyle: React.CSSProperties = {
    width: 300, height: "100%", overflowY: "auto",
    background: "linear-gradient(180deg, rgba(17,20,34,0.98) 0%, rgba(9,10,15,0.98) 100%)",
    borderLeft: "1px solid #20263f",
    fontFamily: "JetBrains Mono, monospace",
    display: "flex", flexDirection: "column",
  };
  const sectionStyle: React.CSSProperties = { padding: "14px 18px", borderBottom: "1px solid #20263f" };
  const secTitle: React.CSSProperties = { fontSize: 9, fontFamily: "Syne, sans-serif", fontWeight: 700, color: "#5f6b8d", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 };

  return (
    <div className="w-full h-full flex">
      <div ref={containerRef} className="flex-1" />

      <div style={panelStyle}>
        {/* Header */}
        <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid #20263f" }}>
          <div style={{ fontSize: 13, fontFamily: "Syne, sans-serif", fontWeight: 800, color: "#d2d9ef", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Jacobian <span style={{ color: "#b5ff4b" }}>&amp;</span> Ellipsoid
          </div>
          <div style={{ fontSize: 9, color: "#5f6b8d", marginTop: 3 }}>
            Modern Robotics Ch 5 — 3-DOF robot arm
          </div>
        </div>

        {/* Framework selector */}
        <div style={sectionStyle}>
          <div style={secTitle}>Jacobian Framework</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(["space","body"] as Framework[]).map(f => (
              <button key={f} onClick={() => setFramework(f)}
                style={{
                  background: framework === f ? "rgba(0,229,255,0.05)" : "transparent",
                  border: `1px solid ${framework === f ? "#00e5ff" : "#20263f"}`,
                  color: framework === f ? "#00e5ff" : "#5f6b8d",
                  padding: 8, fontSize: 10, cursor: "pointer", textTransform: "uppercase",
                  fontFamily: "JetBrains Mono, monospace", borderRadius: 4,
                }}>
                {f === "space" ? "Space (Js)" : "Body (Jb)"}
              </button>
            ))}
          </div>
        </div>

        {/* Joint angles */}
        <div style={sectionStyle}>
          <div style={secTitle}>Joint Configurations θ</div>
          {([0,1,2] as const).map(i => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: "#d2d9ef" }}>Joint {i+1} θ{i+1}</span>
                <span style={{ color: "#b5ff4b", fontWeight: 600 }}>{theta[i].toFixed(0)}°</span>
              </div>
              <input type="range" min={i === 0 ? -180 : -150} max={i === 0 ? 180 : 150} step={1} value={theta[i]}
                onChange={e => setTh(i, Number(e.target.value))}
                style={{ width: "100%", accentColor: "#b5ff4b" }} />
            </div>
          ))}
        </div>

        {/* Joint rates */}
        <div style={sectionStyle}>
          <div style={secTitle}>Joint Rates θ̇ (rad/s)</div>
          {([0,1] as const).map(i => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: "#d2d9ef" }}>dθ{i+1}/dt</span>
                <span style={{ color: "#d2d9ef", fontWeight: 600 }}>{dTheta[i].toFixed(2)} r/s</span>
              </div>
              <input type="range" min={-2} max={2} step={0.1} value={dTheta[i]}
                onChange={e => setDTh(i, Number(e.target.value))}
                style={{ width: "100%", accentColor: "#00e5ff" }} />
            </div>
          ))}
        </div>

        {/* Jacobian matrix */}
        <div style={sectionStyle}>
          <div style={secTitle}>Linear Jacobian Jv (3×3)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3, background: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 4, border: "1px solid #20263f" }}>
            {jacobian.flat().map((v, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 3, padding: "4px 2px", textAlign: "center", color: "#d2d9ef", fontSize: 9 }}>
                {fmtCell(v)}
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div style={{ padding: "14px 18px" }}>
          <div style={secTitle}>End-Effector Linear Velocity</div>
          {[["vx", velocity.x, "#ff3d6e"], ["vy", velocity.y, "#ff3d6e"], ["vz", velocity.z, "#ff3d6e"]].map(([l, v, c]) => (
            <div key={l as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "4px 0", borderBottom: "1px solid #20263f20" }}>
              <span style={{ color: "#d2d9ef" }}>{l as string}:</span>
              <span style={{ color: c as string, fontWeight: 600 }}>{(v as number).toFixed(3)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "8px 0 0", borderTop: "1px dashed #20263f", marginTop: 4 }}>
            <span style={{ color: "#d2d9ef" }}>Manipulability μ:</span>
            <span style={{ color: "#b5ff4b", fontWeight: 600 }}>{mu.toFixed(4)}</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 9, color: "#5f6b8d", lineHeight: 1.7 }}>
            μ = √det(Jv Jvᵀ). Near zero = near singularity. Cyan ellipsoid shows velocity capability.
          </div>
        </div>
      </div>
    </div>
  );
}
