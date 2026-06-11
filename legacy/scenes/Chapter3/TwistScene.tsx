import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Mode = "rotate" | "screw" | "translate";

interface Params { wx: number; wy: number; wz: number; qx: number; qy: number; qz: number; h: number; speed: number; }
interface Vis { axis: boolean; vel: boolean; frame: boolean; trail: boolean; grid: boolean; }

const INITIAL_PARAMS: Params = { wx: 0, wy: 1, wz: 0, qx: 2, qy: 0, qz: 0, h: 0.5, speed: 1.0 };
const INITIAL_VIS: Vis = { axis: true, vel: true, frame: true, trail: true, grid: true };

function normalize(v: THREE.Vector3): THREE.Vector3 {
  const len = v.length();
  return len < 1e-8 ? new THREE.Vector3(0, 1, 0) : v.clone().divideScalar(len);
}

export function TwistScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const paramsRef = useRef<Params>(INITIAL_PARAMS);
  const visRef = useRef<Vis>(INITIAL_VIS);
  const modeRef = useRef<Mode>("screw");
  const playingRef = useRef(true);
  const trailRef = useRef<{ positions: Float32Array; index: number; full: boolean } | null>(null);
  const clearTrailRef = useRef<() => void>(() => {});
  const resetBodyRef = useRef<() => void>(() => {});

  const [params, setParams] = useState<Params>(INITIAL_PARAMS);
  const [vis, setVis] = useState<Vis>(INITIAL_VIS);
  const [mode, setMode] = useState<Mode>("screw");
  const [playing, setPlaying] = useState(true);
  const [liveState, setLiveState] = useState({ omegaHat: [0, 1, 0], q: [2, 0, 0], h: 0.5, v: [0, 0, 0], vmag: 0, theta: 0 });

  // Sync params to ref
  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { visRef.current = vis; }, [vis]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c12);
    scene.fog = new THREE.FogExp2(0x0a0c12, 0.035);

    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.01, 200);
    camera.position.set(8, 6, 10);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 40;

    // Lighting
    scene.add(new THREE.AmbientLight(0x101828, 3));
    const dl = new THREE.DirectionalLight(0x4080ff, 1.5);
    dl.position.set(5, 8, 5);
    dl.castShadow = true;
    scene.add(dl);
    const pl = new THREE.PointLight(0x00e5ff, 1.5, 20);
    pl.position.set(-3, 4, -3);
    scene.add(pl);

    // Grid
    const gridHelper = new THREE.GridHelper(20, 40, 0x1a2030, 0x141922);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // World axes (fixed)
    const worldAxes = new THREE.Group();
    [[1,0,0,0xff4444],[0,1,0,0x44ff88],[0,0,1,0x4488ff]].forEach(([x,y,z,c]) => {
      const m = new THREE.LineBasicMaterial({ color: c as number });
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3((x as number)*3,(y as number)*3,(z as number)*3)]);
      worldAxes.add(new THREE.Line(g, m));
    });
    scene.add(worldAxes);

    // Rigid body
    const bodyGroup = new THREE.Group();
    const boxMat = new THREE.MeshPhongMaterial({ color: 0x1a2548, emissive: 0x0a1228, shininess: 80, transparent: true, opacity: 0.92 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 0.6), boxMat);
    box.castShadow = true;
    bodyGroup.add(box);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.4, 0.6)), new THREE.LineBasicMaterial({ color: 0x2a4880 }));
    bodyGroup.add(edges);

    const bodyFrame = new THREE.Group();
    [[1,0,0,0xff5555],[0,1,0,0x55ff88],[0,0,1,0x5588ff]].forEach(([x,y,z,c]) => {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3((x as number)*0.8,(y as number)*0.8,(z as number)*0.8)]);
      bodyFrame.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: c as number, linewidth: 3 })));
    });
    bodyGroup.add(bodyFrame);

    const trackedOffset = new THREE.Vector3(0.7, 0.2, 0.3);
    const pSphere = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshPhongMaterial({ color: 0xb5ff4b, emissive: 0x405010 }));
    pSphere.position.copy(trackedOffset);
    bodyGroup.add(pSphere);
    scene.add(bodyGroup);
    bodyGroup.position.set(2, 0, 0);

    // Screw axis line
    const axisGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-8,0), new THREE.Vector3(0,8,0)]);
    const axisLine = new THREE.Line(axisGeo, new THREE.LineBasicMaterial({ color: 0xff3d6e, transparent: true, opacity: 0.8 }));
    scene.add(axisLine);

    const arrowHelper = new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0), 2, 0xff6b35, 0.35, 0.18);
    scene.add(arrowHelper);

    // Velocity arrow
    const velArrow = new THREE.ArrowHelper(new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,0), 1, 0x00e5ff, 0.3, 0.15);
    scene.add(velArrow);

    // r dashed line
    const rLineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const rLine = new THREE.Line(rLineGeo, new THREE.LineDashedMaterial({ color: 0x334466, dashSize: 0.1, gapSize: 0.08 }));
    rLine.computeLineDistances();
    scene.add(rLine);

    // Trail
    const MAX_TRAIL = 2000;
    const trailPositions = new Float32Array(MAX_TRAIL * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    const trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xb5ff4b, transparent: true, opacity: 0.7 }));
    scene.add(trailLine);
    let trailIndex = 0;
    let trailFull = false;

    trailRef.current = { positions: trailPositions, index: 0, full: false };

    clearTrailRef.current = () => {
      trailIndex = 0; trailFull = false;
      trailPositions.fill(0);
      trailGeo.setDrawRange(0, 0);
      trailGeo.attributes.position.needsUpdate = true;
    };

    resetBodyRef.current = () => {
      const p = paramsRef.current;
      bodyGroup.position.set(p.qx + 2, p.qy, p.qz);
      bodyGroup.quaternion.set(0,0,0,1);
    };

    function updateAxisLine(q: THREE.Vector3, omegaHat: THREE.Vector3) {
      const ext = 10;
      const p1 = q.clone().sub(omegaHat.clone().multiplyScalar(ext));
      const p2 = q.clone().add(omegaHat.clone().multiplyScalar(ext));
      const pos = axisGeo.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(0, p1.x, p1.y, p1.z);
      pos.setXYZ(1, p2.x, p2.y, p2.z);
      pos.needsUpdate = true;
    }

    const clock = new THREE.Clock();
    let totalTheta = 0;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();

      const dt = Math.min(clock.getDelta(), 0.05);
      const p = paramsRef.current;
      const v = visRef.current;
      const m = modeRef.current;

      const omegaRaw = new THREE.Vector3(p.wx, p.wy, p.wz);
      const isPureTranslate = omegaRaw.lengthSq() < 1e-6;
      const omega_hat = isPureTranslate ? new THREE.Vector3(0, 1, 0) : normalize(omegaRaw);
      const q = new THREE.Vector3(p.qx, p.qy, p.qz);

      if (playingRef.current) {
        const dTheta = dt * p.speed * (isPureTranslate ? 0 : 1.5);
        totalTheta += dTheta;

        if (!isPureTranslate) {
          const toQ = q.clone().negate();
          bodyGroup.position.add(toQ);
          const rot = new THREE.Quaternion().setFromAxisAngle(omega_hat, dTheta);
          bodyGroup.position.applyQuaternion(rot);
          bodyGroup.quaternion.premultiply(rot);
          bodyGroup.position.add(q);
          const translation = omega_hat.clone().multiplyScalar(p.h * dTheta);
          bodyGroup.position.add(translation);
        } else {
          const translation = omega_hat.clone().multiplyScalar(p.h * dt * p.speed * 1.5);
          bodyGroup.position.add(translation);
          if (bodyGroup.position.distanceTo(q) > 12) {
            bodyGroup.position.copy(q.clone().add(new THREE.Vector3(2, 0, 0)));
          }
        }

        const wp = new THREE.Vector3();
        pSphere.getWorldPosition(wp);
        const base = trailIndex * 3;
        trailPositions[base] = wp.x; trailPositions[base+1] = wp.y; trailPositions[base+2] = wp.z;
        trailIndex = (trailIndex + 1) % MAX_TRAIL;
        if (trailIndex === 0) trailFull = true;
        trailGeo.setDrawRange(0, trailFull ? MAX_TRAIL : trailIndex);
        trailGeo.attributes.position.needsUpdate = true;
      }

      axisLine.visible = v.axis;
      arrowHelper.visible = v.axis;
      velArrow.visible = v.vel;
      bodyFrame.visible = v.frame;
      trailLine.visible = v.trail;
      gridHelper.visible = v.grid;

      if (v.axis) {
        updateAxisLine(q, omega_hat);
        arrowHelper.position.copy(q);
        arrowHelper.setDirection(omega_hat);
        arrowHelper.setLength(2.2, 0.35, 0.18);
      }

      const pWorld = new THREE.Vector3();
      pSphere.getWorldPosition(pWorld);

      let velocity: THREE.Vector3;
      if (!isPureTranslate) {
        const r = pWorld.clone().sub(q);
        const omega = omega_hat.clone().multiplyScalar(p.speed);
        velocity = new THREE.Vector3().crossVectors(omega, r).add(omega.clone().multiplyScalar(p.h));
      } else {
        velocity = omega_hat.clone().multiplyScalar(p.h * p.speed);
      }

      if (v.vel && velocity.length() > 0.01) {
        velArrow.position.copy(pWorld);
        velArrow.setDirection(velocity.clone().normalize());
        velArrow.setLength(Math.min(velocity.length() * 0.4, 3), 0.28, 0.14);

        const rPos = rLine.geometry.attributes.position as THREE.BufferAttribute;
        rPos.setXYZ(0, q.x, q.y, q.z);
        rPos.setXYZ(1, pWorld.x, pWorld.y, pWorld.z);
        rPos.needsUpdate = true;
        rLine.computeLineDistances();
      }

      // Update live state for UI
      setLiveState({
        omegaHat: [omega_hat.x, omega_hat.y, omega_hat.z],
        q: [q.x, q.y, q.z],
        h: p.h,
        v: [velocity.x, velocity.y, velocity.z],
        vmag: velocity.length(),
        theta: totalTheta % (2 * Math.PI),
      });

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

  const setModeAndReset = useCallback((m: Mode) => {
    setMode(m);
    modeRef.current = m;
    if (m === "rotate") {
      setParams(prev => ({ ...prev, h: 0 }));
    } else if (m === "translate") {
      setParams(prev => ({ ...prev, wx: 0, wy: 0, wz: 0, h: 1 }));
    }
    clearTrailRef.current();
    resetBodyRef.current();
  }, []);

  const updateParam = useCallback(<K extends keyof Params>(key: K, val: number) => {
    setParams(prev => {
      const next = { ...prev, [key]: val };
      paramsRef.current = next;
      return next;
    });
    if (["qx", "qy", "qz", "wx", "wy", "wz"].includes(key)) {
      clearTrailRef.current();
      resetBodyRef.current();
    }
  }, []);

  const toggleVis = useCallback((key: keyof Vis) => {
    setVis(prev => {
      const next = { ...prev, [key]: !prev[key] };
      visRef.current = next;
      return next;
    });
  }, []);

  const s = (x: number) => x.toFixed(2);
  const vec = (v: number[]) => `[${s(v[0])}, ${s(v[1])}, ${s(v[2])}]`;

  const panelStyle: React.CSSProperties = {
    width: 280, height: "100%", overflowY: "auto",
    background: "linear-gradient(180deg, rgba(16,19,30,0.97) 0%, rgba(10,12,18,0.97) 100%)",
    borderLeft: "1px solid #1e2436",
    fontFamily: "JetBrains Mono, monospace",
    display: "flex", flexDirection: "column", flexShrink: 0,
  };

  const sectionStyle: React.CSSProperties = { padding: "14px 18px", borderBottom: "1px solid #1e2436" };
  const secTitle: React.CSSProperties = { fontSize: 9, fontFamily: "Syne, sans-serif", fontWeight: 700, color: "#5f6b8d", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 10 };

  const SliderRow = ({ label, paramKey, min, max, step, color = "#00e5ff" }: { label: string; paramKey: keyof Params; min: number; max: number; step: number; color?: string }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
        <span style={{ color: "#d2d9ef" }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{params[paramKey].toFixed(1)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={params[paramKey]}
        onChange={e => updateParam(paramKey, Number(e.target.value))}
        style={{ width: "100%", accentColor: color }} />
    </div>
  );

  const ToggleRow = ({ label, vkey }: { label: string; vkey: keyof Vis }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontSize: 10, color: "#d2d9ef" }}>{label}</span>
      <button onClick={() => toggleVis(vkey)}
        style={{ width: 32, height: 16, borderRadius: 8, border: "none", cursor: "pointer", background: vis[vkey] ? "rgba(0,229,255,0.2)" : "#1e2436", position: "relative" }}>
        <div style={{ position: "absolute", width: 10, height: 10, borderRadius: 5, background: vis[vkey] ? "#00e5ff" : "#5f6b8d", top: 3, left: vis[vkey] ? 19 : 3, transition: "left 0.2s, background 0.2s" }} />
      </button>
    </div>
  );

  return (
    <div className="w-full h-full flex">
      <div ref={containerRef} className="flex-1" />

      <div style={panelStyle}>
        {/* Header */}
        <div style={{ padding: "18px 18px 12px", borderBottom: "1px solid #1e2436", background: "linear-gradient(135deg, rgba(0,229,255,0.05) 0%, transparent 60%)" }}>
          <div style={{ fontSize: 14, fontFamily: "Syne, sans-serif", fontWeight: 800, color: "#00e5ff", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Screw Motion
          </div>
          <div style={{ fontSize: 9, color: "#5f6b8d", marginTop: 3 }}>SE(3) — Chasles' theorem in action</div>
        </div>

        {/* Mode */}
        <div style={sectionStyle}>
          <div style={secTitle}>Motion Mode</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {(["rotate", "screw", "translate"] as Mode[]).map(m => (
              <button key={m} onClick={() => setModeAndReset(m)}
                style={{
                  padding: "7px 4px", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.04em",
                  background: mode === m ? "rgba(0,229,255,0.1)" : "transparent",
                  border: `1px solid ${mode === m ? "#00e5ff" : "#1e2436"}`,
                  color: mode === m ? "#00e5ff" : "#5f6b8d",
                  borderRadius: 3, cursor: "pointer",
                }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Angular velocity */}
        <div style={sectionStyle}>
          <div style={secTitle}>Angular Velocity ω direction</div>
          <SliderRow label="ωx" paramKey="wx" min={-10} max={10} step={0.1} color="#ff6b35" />
          <SliderRow label="ωy" paramKey="wy" min={-10} max={10} step={0.1} color="#ff6b35" />
          <SliderRow label="ωz" paramKey="wz" min={-10} max={10} step={0.1} color="#ff6b35" />
        </div>

        {/* Axis point q */}
        <div style={sectionStyle}>
          <div style={secTitle}>Axis Point q</div>
          <SliderRow label="qx" paramKey="qx" min={-4} max={4} step={0.1} color="#ff3d6e" />
          <SliderRow label="qy" paramKey="qy" min={-4} max={4} step={0.1} color="#ff3d6e" />
          <SliderRow label="qz" paramKey="qz" min={-4} max={4} step={0.1} color="#ff3d6e" />
        </div>

        {/* Screw params */}
        <div style={sectionStyle}>
          <div style={secTitle}>Screw Parameters</div>
          <SliderRow label="Pitch h" paramKey="h" min={-3} max={3} step={0.05} color="#b5ff4b" />
          <SliderRow label="Speed" paramKey="speed" min={0.1} max={5} step={0.1} />
        </div>

        {/* Toggles */}
        <div style={sectionStyle}>
          <div style={secTitle}>Display Layers</div>
          {(["axis","vel","frame","trail","grid"] as (keyof Vis)[]).map(k => (
            <ToggleRow key={k} vkey={k} label={{ axis: "Screw Axis", vel: "Velocity Vector", frame: "Body Frame", trail: "Trail", grid: "Grid" }[k]!} />
          ))}
        </div>

        {/* Live state */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid #1e2436", fontSize: 9, lineHeight: 1.9 }}>
          <div style={secTitle}>Live State</div>
          {[
            ["ω̂", vec(liveState.omegaHat), "#ff6b35"],
            ["q", vec(liveState.q), "#ff3d6e"],
            ["h", liveState.h.toFixed(2), "#b5ff4b"],
            ["v", vec(liveState.v), "#00e5ff"],
            ["|v|", liveState.vmag.toFixed(3), "#d2d9ef"],
            ["θ", liveState.theta.toFixed(2) + " rad", "#d2d9ef"],
          ].map(([label, val, color]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#5f6b8d" }}>{label} =</span>
              <span style={{ color: color as string, fontSize: 9 }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Play/Clear */}
        <div style={{ padding: "10px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={() => setPlaying(p => !p)}
            style={{
              padding: 9, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
              background: playing ? "rgba(0,229,255,0.08)" : "rgba(255,61,110,0.08)",
              border: `1px solid ${playing ? "#00e5ff" : "#ff3d6e"}`,
              color: playing ? "#00e5ff" : "#ff3d6e",
              cursor: "pointer", borderRadius: 3, fontFamily: "JetBrains Mono, monospace",
            }}>
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <button onClick={() => clearTrailRef.current()}
            style={{
              padding: 9, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
              background: "rgba(181,255,75,0.06)", border: "1px solid #b5ff4b44",
              color: "#b5ff4b", cursor: "pointer", borderRadius: 3, fontFamily: "JetBrains Mono, monospace",
            }}>
            ⌫ Clear Trail
          </button>
          <button onClick={() => resetBodyRef.current()}
            style={{
              padding: 9, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
              background: "rgba(255,255,255,0.04)", border: "1px solid #1e2436",
              color: "#5f6b8d", cursor: "pointer", borderRadius: 3, fontFamily: "JetBrains Mono, monospace",
            }}>
            ↺ Reset Body
          </button>
        </div>
      </div>
    </div>
  );
}

