import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ── Math helpers ──────────────────────────────────────────────────────────────
type Mat3 = number[][];
type Vec3 = number[];

function rodZ(th: number): Mat3 {
  const c = Math.cos(th), s = Math.sin(th);
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}
function mulMM(A: Mat3, B: Mat3): Mat3 {
  const C: Mat3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}
function mulMV(M: Mat3, v: Vec3): Vec3 {
  return [M[0][0]*v[0]+M[0][1]*v[1]+M[0][2]*v[2], M[1][0]*v[0]+M[1][1]*v[1]+M[1][2]*v[2], M[2][0]*v[0]+M[2][1]*v[1]+M[2][2]*v[2]];
}
function addV(a: Vec3, b: Vec3): Vec3 { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
function transposeR(M: Mat3): Mat3 { return [[M[0][0],M[1][0],M[2][0]],[M[0][1],M[1][1],M[2][1]],[M[0][2],M[1][2],M[2][2]]]; }

// Fixed T_bc: 45° rotation about z, offset (1.2, 0.8, 0)
const TBC_R: Mat3 = rodZ(Math.PI / 4);
const TBC_P: Vec3 = [1.2, 0.8, 0];

// ── 3D helpers ────────────────────────────────────────────────────────────────
function arrowMesh(from: THREE.Vector3, to: THREE.Vector3, color: number, r = 0.035): THREE.Group {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  if (len < 0.001) return new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len * 0.80, 10), mat);
  shaft.position.copy(from.clone().lerp(to, 0.40));
  shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 3, len * 0.20, 10), mat);
  cone.position.copy(from.clone().lerp(to, 0.90));
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const g = new THREE.Group();
  g.add(shaft, cone);
  return g;
}

function makeSprite(text: string, color = "#fff"): THREE.Sprite {
  const cv = document.createElement("canvas");
  cv.width = 180; cv.height = 64;
  const ctx = cv.getContext("2d")!;
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 90, 32);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
  sp.scale.set(0.6, 0.22, 1);
  return sp;
}

function dashedLine(p1: THREE.Vector3, p2: THREE.Vector3, color = 0x444466): THREE.Line {
  const g = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color, dashSize: 0.12, gapSize: 0.08 }));
  l.computeLineDistances();
  return l;
}

function drawFrame(
  group: THREE.Group,
  R: Mat3, p: Vec3,
  axLen: number, xCol: number, yCol: number, zCol: number,
  label: string, labelCol: string
) {
  const o = new THREE.Vector3(...p as [number, number, number]);
  const xe = new THREE.Vector3(p[0]+R[0][0]*axLen, p[1]+R[1][0]*axLen, p[2]+R[2][0]*axLen);
  const ye = new THREE.Vector3(p[0]+R[0][1]*axLen, p[1]+R[1][1]*axLen, p[2]+R[2][1]*axLen);
  const ze = new THREE.Vector3(p[0]+R[0][2]*axLen, p[1]+R[1][2]*axLen, p[2]+R[2][2]*axLen);
  group.add(arrowMesh(o, xe, xCol, 0.04));
  group.add(arrowMesh(o, ye, yCol, 0.04));
  group.add(arrowMesh(o, ze, zCol, 0.04));
  const sp = makeSprite(label, labelCol);
  sp.position.set(p[0] - 0.35, p[1] - 0.3, p[2]);
  group.add(sp);
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4 })
  );
  dot.position.copy(o);
  group.add(dot);
}

// ── Matrix cell display ───────────────────────────────────────────────────────
function MatCell({ v, color }: { v: number; color: string }) {
  const s = v.toFixed(2);
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      borderRadius: 3, padding: "3px 1px",
      textAlign: "center", color, fontSize: 10,
      fontFamily: "JetBrains Mono, monospace",
    }}>
      {s === "-0.00" ? "0.00" : s}
    </div>
  );
}

function MatrixBlock({ R, p, label, labelColor }: { R: Mat3; p: Vec3; label: string; labelColor: string }) {
  // Row-major display
  const rRows = R; // R[i][j] = row i, col j
  const rCols = [rRows[0][0], rRows[0][1], rRows[0][2], rRows[1][0], rRows[1][1], rRows[1][2], rRows[2][0], rRows[2][1], rRows[2][2]];
  const rColors = ["#ff8888","#ff8888","#ff8888","#88ffbb","#88ffbb","#88ffbb","#88aaff","#88aaff","#88aaff"];
  const pColor = labelColor;
  return (
    <div>
      <div style={{ color: labelColor, fontSize: 10, marginBottom: 5, letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2 }}>
        {rCols.map((v, i) => <MatCell key={i} v={v} color={rColors[i]} />)}
        {p.map((v, i) => <MatCell key={"p"+i} v={v} color={pColor} />)}
        {[0, 0, 0].map((_, i) => <MatCell key={"z"+i} v={0} color="#333" />)}
        <MatCell v={1} color="#555" />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function SE3Scene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ theta: 0, px: 0, py: 0, pz: 0, showInverse: false });

  const [theta, setTheta] = useState(0);
  const [px, setPx] = useState(0);
  const [py, setPy] = useState(0);
  const [pz, setPz] = useState(0);
  const [showInverse, setShowInverse] = useState(false);

  const [tsb, setTsb] = useState({ R: [[1,0,0],[0,1,0],[0,0,1]] as Mat3, p: [0,0,0] as Vec3 });
  const [tbc] = useState({ R: TBC_R, p: TBC_P });
  const [tsc, setTsc] = useState({ R: [[1,0,0],[0,1,0],[0,0,1]] as Mat3, p: [0,0,0] as Vec3 });

  const bodyGroupRef = useRef<THREE.Group | null>(null);
  const childGroupRef = useRef<THREE.Group | null>(null);
  const compGroupRef = useRef<THREE.Group | null>(null);

  // Sync state to ref for render loop
  useEffect(() => {
    stateRef.current = { theta, px, py, pz, showInverse };
    const Rsb = rodZ(theta * Math.PI / 180);
    const psb: Vec3 = [px, py, pz];
    const Rsc = mulMM(Rsb, TBC_R);
    const psc = addV(mulMV(Rsb, TBC_P), psb);
    setTsb({ R: Rsb, p: psb });
    setTsc({ R: Rsc, p: psc });
  }, [theta, px, py, pz, showInverse]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090a0f);

    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(5, 4, 6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;

    // Grid
    const gm = new THREE.LineBasicMaterial({ color: 0x1a1a2e });
    for (let i = -5; i <= 5; i++) {
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5, 0, i), new THREE.Vector3(5, 0, i)]), gm));
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i, 0, -5), new THREE.Vector3(i, 0, 5)]), gm));
    }

    // Space frame (fixed, dim)
    scene.add(arrowMesh(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.8, 0, 0), 0x882222, 0.02));
    scene.add(arrowMesh(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.8, 0), 0x228844, 0.02));
    scene.add(arrowMesh(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1.8), 0x224488, 0.02));
    const sLabel = makeSprite("{s}", "#666");
    sLabel.position.set(-0.4, -0.3, -0.3);
    scene.add(sLabel);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7);
    dl.position.set(5, 8, 5);
    scene.add(dl);

    const bodyGroup = new THREE.Group();
    const childGroup = new THREE.Group();
    const compGroup = new THREE.Group();
    scene.add(bodyGroup, childGroup, compGroup);
    bodyGroupRef.current = bodyGroup;
    childGroupRef.current = childGroup;
    compGroupRef.current = compGroup;

    function rebuild() {
      [bodyGroup, childGroup, compGroup].forEach(g => {
        while (g.children.length) g.remove(g.children[0]);
      });

      const { theta: th, px: x, py: y, pz: z, showInverse: inv } = stateRef.current;
      const Rsb = rodZ(th * Math.PI / 180);
      const psb: Vec3 = [x, y, z];
      const Rsc = mulMM(Rsb, TBC_R);
      const psc = addV(mulMV(Rsb, TBC_P), psb);

      drawFrame(bodyGroup, Rsb, psb, 1.4, 0xff4444, 0x44dd88, 0x4488ff, "{b}", "#ffd166");
      drawFrame(childGroup, Rsc, psc, 1.0, 0xff6666, 0x66ee99, 0x6699ff, "{c}", "#06d6a0");

      if (Math.sqrt(x*x+y*y+z*z) > 0.05) {
        const pl = dashedLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, z), 0xffd166);
        bodyGroup.add(pl);
        const lab = makeSprite("p", "#ffd166");
        lab.position.set(x*0.5, y*0.5+0.2, z*0.5);
        bodyGroup.add(lab);
      }

      const bl = dashedLine(new THREE.Vector3(...psb as [number,number,number]), new THREE.Vector3(...psc as [number,number,number]), 0x06d6a0);
      compGroup.add(bl);

      if (inv) {
        const RsbInv = transposeR(Rsb);
        const psbInv = mulMV(RsbInv, [-x, -y, -z]);
        drawFrame(compGroup, RsbInv, psbInv, 1.0, 0xaa3333, 0x33aa66, 0x3344aa, "{s} in {b}", "#a78bfa");
      }
    }

    let lastState = "";
    const animate = () => {
      const id = requestAnimationFrame(animate);
      controls.update();
      const s = stateRef.current;
      const key = `${s.theta},${s.px},${s.py},${s.pz},${s.showInverse}`;
      if (key !== lastState) { rebuild(); lastState = key; }
      renderer.render(scene, camera);
      return id;
    };
    const id = animate();

    const onResize = () => {
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

  const preset = useCallback((th: number, x: number, y: number, z: number) => {
    setTheta(th); setPx(x); setPy(y); setPz(z);
  }, []);

  const panelStyle: React.CSSProperties = {
    width: 320, height: "100%", overflowY: "auto",
    background: "linear-gradient(180deg, rgba(17,20,34,0.98) 0%, rgba(9,10,15,0.98) 100%)",
    borderLeft: "1px solid #20263f",
    fontFamily: "JetBrains Mono, monospace",
    display: "flex", flexDirection: "column",
  };

  const sectionStyle: React.CSSProperties = { padding: "14px 18px", borderBottom: "1px solid #20263f" };
  const secTitle: React.CSSProperties = { fontSize: 9, fontFamily: "Syne, sans-serif", fontWeight: 700, color: "#5f6b8d", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 };
  const sliderRow = (label: string, val: number, set: (v: number) => void, min: number, max: number, step: number, unit: string, color: string) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
        <span style={{ color: "#d2d9ef" }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{unit === "°" ? val.toFixed(0) + "°" : val.toFixed(1)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => set(Number(e.target.value))} style={{ width: "100%", accentColor: color }} />
    </div>
  );

  return (
    <div className="w-full h-full flex">
      <div ref={containerRef} className="flex-1" />

      <div style={panelStyle}>
        {/* Header */}
        <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid #20263f" }}>
          <div style={{ fontSize: 13, fontFamily: "Syne, sans-serif", fontWeight: 800, color: "#d2d9ef", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Transforms <span style={{ color: "#00e5ff" }}>SE(3)</span>
          </div>
          <div style={{ fontSize: 9, color: "#5f6b8d", marginTop: 3 }}>
            Compose T_sb × T_bc → T_sc in real time
          </div>
        </div>

        {/* Controls */}
        <div style={sectionStyle}>
          <div style={secTitle}>T_sb Controls</div>
          {sliderRow("θ (rot about ẑ)", theta, setTheta, -180, 180, 1, "°", "#ff6b6b")}
          {sliderRow("px", px, setPx, -3, 3, 0.1, "", "#ffd166")}
          {sliderRow("py", py, setPy, -3, 3, 0.1, "", "#ffd166")}
          {sliderRow("pz", pz, setPz, -3, 3, 0.1, "", "#ffd166")}
        </div>

        {/* Presets */}
        <div style={sectionStyle}>
          <div style={secTitle}>Presets</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["θ=90, p=(2,1,0)", 90, 2, 1, 0, "#ffd166"], ["θ=45, p=(1,2,1)", 45, 1, 2, 1, "#ff8888"], ["Reset", 0, 0, 0, 0, "#888"]].map(
              ([label, th, x, y, z, c]) => (
                <button key={label as string} onClick={() => preset(th as number, x as number, y as number, z as number)}
                  style={{ background: "rgba(255,255,255,0.05)", color: c as string, border: `1px solid ${c}44`, borderRadius: 6, padding: "5px 10px", fontSize: 10, cursor: "pointer" }}>
                  {label as string}
                </button>
              )
            )}
            <button onClick={() => setShowInverse(v => !v)}
              style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 6, padding: "5px 10px", fontSize: 10, cursor: "pointer" }}>
              {showInverse ? "Hide T⁻¹" : "Show T⁻¹"}
            </button>
          </div>
        </div>

        {/* Matrix displays */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #20263f", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={secTitle}>Live Matrices</div>
          <MatrixBlock R={tsb.R} p={tsb.p} label="T_sb  (space → body)" labelColor="#ffd166" />
          <MatrixBlock R={tbc.R} p={tbc.p} label="T_bc  (body → child) — fixed" labelColor="#06d6a0" />
          <MatrixBlock R={tsc.R} p={tsc.p} label="T_sc = T_sb · T_bc" labelColor="#a78bfa" />
        </div>

        {/* Legend */}
        <div style={{ padding: "12px 18px", fontSize: 9, color: "#5f6b8d", lineHeight: 1.8 }}>
          <div style={{ color: "#ffd166" }}>● {"{b}"} frame (yellow) — moves with T_sb</div>
          <div style={{ color: "#06d6a0" }}>● {"{c}"} frame (teal) — fixed relative to {"{b}"}</div>
          <div style={{ color: "#a78bfa" }}>● {"{s}"} in {"{b}"} (purple) — T_sb inverse (optional)</div>
        </div>
      </div>
    </div>
  );
}
