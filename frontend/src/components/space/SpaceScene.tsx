"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { getSpaceScroll, subscribeSpace } from "@/components/space/spaceStage";

/**
 * Home-page story scene. One camera path, scrubbed by scroll progress (0..1):
 * the universe -> the Milky Way -> Earth -> looking up -> the SPHEREx telescope -> into its aperture.
 */

const GALAXY = new THREE.Vector3(0, 0, -120);
const EARTH = new THREE.Vector3(0, 0, -260);
const SCOPE = new THREE.Vector3(14, 4, -238);
/** Direction the telescope aperture points; the camera ends by flying down this axis. */
const AXIS = new THREE.Vector3(0.35, 0.12, 0.93).normalize();
const onAxis = (d: number) => SCOPE.clone().addScaledVector(AXIS, d);

type Key = { at: number; pos: THREE.Vector3; look: THREE.Vector3 };
const KEYS: Key[] = [
  { at: 0, pos: new THREE.Vector3(0, 0, 60), look: GALAXY },
  { at: 0.14, pos: new THREE.Vector3(0, 6, 30), look: GALAXY },
  { at: 0.3, pos: new THREE.Vector3(0, 34, -58), look: GALAXY },
  { at: 0.46, pos: new THREE.Vector3(4, 3, -226), look: EARTH },
  { at: 0.6, pos: new THREE.Vector3(-7, 7, -243), look: new THREE.Vector3(6, 14, -300) },
  { at: 0.74, pos: new THREE.Vector3(27, 6, -238), look: SCOPE },
  { at: 0.86, pos: onAxis(9), look: SCOPE },
  { at: 1, pos: onAxis(0.9), look: SCOPE },
];

const ramp = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));

function glowTexture(rgb: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.3, `rgba(${rgb},0.35)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export default function SpaceScene() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowEnd = window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !lowEnd, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // no WebGL: the CSS gradient fallback stays
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1400);
    const disposables: { dispose(): void }[] = [];
    const loader = new THREE.TextureLoader();
    const tex = (url: string) => {
      const t = loader.load(url, () => need());
      t.colorSpace = THREE.SRGBColorSpace;
      disposables.push(t);
      return t;
    };
    const dot = glowTexture("255,255,255");
    disposables.push(dot);

    /* ---- Stars: a deep volume the camera travels through ---- */
    const starLayers: THREE.Points[] = [];
    const makeStars = (count: number, size: number, color: number) => {
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 700;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 460;
        pos[i * 3 + 2] = -620 + Math.random() * 720;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ size, color, map: dot, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      starLayers.push(pts);
      disposables.push(geo, mat);
    };
    const k = lowEnd ? 0.4 : 1;
    makeStars(Math.round(5200 * k), 1.1, 0xffffff);
    makeStars(Math.round(1600 * k), 2.0, 0xbcd0ff);
    makeStars(Math.round(300 * k), 3.4, 0xffe2c4);

    /* ---- The Milky Way: a procedural spiral of particles ---- */
    const galaxy = new THREE.Group();
    galaxy.position.copy(GALAXY);
    galaxy.rotation.set(1.05, 0, 0.3);
    scene.add(galaxy);
    const gCount = lowEnd ? 14000 : 46000;
    const gPos = new Float32Array(gCount * 3);
    const gCol = new Float32Array(gCount * 3);
    const inner = new THREE.Color(0xffd9a0);
    const outer = new THREE.Color(0x5f7dff);
    const pink = new THREE.Color(0xff8fd0);
    const col = new THREE.Color();
    const R = 72;
    const ARMS = 4;
    for (let i = 0; i < gCount; i++) {
      const r = Math.pow(Math.random(), 1.7) * R;
      const angle = ((i % ARMS) / ARMS) * Math.PI * 2 + r * 0.075;
      const spread = (0.6 + r * 0.11) * Math.pow(Math.random(), 2.2) * (Math.random() < 0.5 ? -1 : 1);
      const spread2 = (0.6 + r * 0.11) * Math.pow(Math.random(), 2.2) * (Math.random() < 0.5 ? -1 : 1);
      const thick = (Math.random() - 0.5) * Math.max(0.6, 7 - r * 0.09) * Math.random();
      gPos[i * 3] = Math.cos(angle) * r + spread;
      gPos[i * 3 + 1] = thick;
      gPos[i * 3 + 2] = Math.sin(angle) * r + spread2;
      col.copy(inner).lerp(outer, Math.min(1, r / (R * 0.75)));
      if (Math.random() < 0.08) col.lerp(pink, 0.7);
      gCol[i * 3] = col.r;
      gCol[i * 3 + 1] = col.g;
      gCol[i * 3 + 2] = col.b;
    }
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute("position", new THREE.BufferAttribute(gPos, 3));
    gGeo.setAttribute("color", new THREE.BufferAttribute(gCol, 3));
    const gMat = new THREE.PointsMaterial({ size: 1.15, map: dot, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    galaxy.add(new THREE.Points(gGeo, gMat));
    const coreTex = glowTexture("255,226,170");
    const coreMat = new THREE.SpriteMaterial({ map: coreTex, blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false });
    const core = new THREE.Sprite(coreMat);
    core.scale.set(46, 46, 1);
    galaxy.add(core);
    disposables.push(gGeo, gMat, coreTex, coreMat);

    /* ---- Earth ---- */
    scene.add(new THREE.AmbientLight(0x7080b0, 0.35));
    const sun = new THREE.DirectionalLight(0xfff1d6, 3.4);
    sun.position.set(0.6, 0.3, 0.7);
    scene.add(sun);

    const earth = new THREE.Group();
    earth.position.copy(EARTH);
    earth.visible = false;
    scene.add(earth);
    const eGeo = new THREE.SphereGeometry(10, lowEnd ? 48 : 96, lowEnd ? 32 : 64);
    const eMat = new THREE.MeshStandardMaterial({ map: tex("/space/earth_tex.jpg"), roughness: 0.9, metalness: 0 });
    const globe = new THREE.Mesh(eGeo, eMat);
    globe.rotation.z = 0.41;
    earth.add(globe);
    const aGeo = new THREE.SphereGeometry(11.4, 64, 48);
    const aMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec3 vN; void main(){ float i = pow(0.74 - dot(vN, vec3(0.0, 0.0, 1.0)), 2.6); gl_FragColor = vec4(0.32, 0.58, 1.0, 1.0) * i; }",
    });
    earth.add(new THREE.Mesh(aGeo, aMat));
    disposables.push(eGeo, eMat, aGeo, aMat);

    /* ---- SPHEREx: stylised model (three nested photon shields around the telescope) ---- */
    const scope = new THREE.Group();
    scope.position.copy(SCOPE);
    scope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), AXIS);
    scope.scale.setScalar(1.5);
    scope.visible = false;
    scene.add(scope);
    const spin = new THREE.Group();
    scope.add(spin);
    const part = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      spin.add(m);
      disposables.push(geo, mat);
      return m;
    };
    const shield = () => new THREE.MeshStandardMaterial({ color: 0xf2f4fa, roughness: 0.35, metalness: 0.55, side: THREE.DoubleSide });
    part(new THREE.CylinderGeometry(2.6, 1.05, 2.6, 64, 1, true), shield(), 0, 1.3, 0);
    part(new THREE.CylinderGeometry(2.2, 0.9, 2.45, 64, 1, true), shield(), 0, 1.28, 0);
    part(new THREE.CylinderGeometry(1.8, 0.75, 2.3, 64, 1, true), shield(), 0, 1.26, 0);
    part(new THREE.CylinderGeometry(0.62, 0.62, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0x20242e, roughness: 0.6, metalness: 0.4 }), 0, 0.9, 0);
    const lens = part(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: 0x7fc8ff }), 0, 1.66, 0);
    lens.rotation.x = -Math.PI / 2;
    const floor = part(new THREE.CircleGeometry(1.06, 48), new THREE.MeshBasicMaterial({ color: 0x05070d }), 0, 0.02, 0);
    floor.rotation.x = -Math.PI / 2;
    part(new THREE.CylinderGeometry(1.05, 1.05, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.4, metalness: 0.7 }), 0, -0.45, 0);
    part(new THREE.BoxGeometry(0.08, 2.5, 2.3), new THREE.MeshStandardMaterial({ color: 0x1b2a6b, roughness: 0.3, metalness: 0.6 }), -1.35, -0.2, 0);

    /* ---- Camera path: a paused timeline, scrubbed by scroll ---- */
    const cam = { x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0 };
    const tl = gsap.timeline({ paused: true });
    KEYS.forEach((key, i) => {
      const v = { x: key.pos.x, y: key.pos.y, z: key.pos.z, lx: key.look.x, ly: key.look.y, lz: key.look.z };
      if (i === 0) Object.assign(cam, v);
      else tl.to(cam, { ...v, duration: key.at - KEYS[i - 1].at, ease: "power1.inOut" }, KEYS[i - 1].at);
    });

    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    let s = getSpaceScroll();
    let raf = 0;
    let visible = !document.hidden;
    const clock = new THREE.Clock();
    const look = new THREE.Vector3();

    function need() {
      if (reduced && !raf && visible) raf = requestAnimationFrame(frame);
    }
    function frame() {
      raf = 0;
      if (!visible) return;
      const t = clock.getElapsedTime();
      const target = getSpaceScroll();
      s = reduced ? target : s + (target - s) * 0.075;
      tl.progress(s);

      // Chapter-driven visibility
      const gFade = ramp(s, 0.04, 0.15) * (1 - ramp(s, 0.33, 0.42));
      gMat.opacity = gFade * 0.95;
      coreMat.opacity = gFade * 0.9;
      galaxy.visible = gFade > 0.001;
      earth.visible = s > 0.34;
      scope.visible = s > 0.5;

      if (!reduced) {
        mouse.sx += (mouse.x - mouse.sx) * 0.04;
        mouse.sy += (mouse.y - mouse.sy) * 0.04;
        galaxy.rotation.y = t * 0.02;
        globe.rotation.y = t * 0.05;
        spin.rotation.y = t * 0.12;
        starLayers.forEach((l, i) => (l.rotation.z = t * 0.002 * (i + 1)));
      }
      const sway = 1 - ramp(s, 0.8, 0.95); // steady the camera for the dive into the aperture
      camera.position.set(cam.x + mouse.sx * 2.2 * sway, cam.y - mouse.sy * 1.4 * sway, cam.z);
      camera.lookAt(look.set(cam.lx, cam.ly, cam.lz));
      renderer.render(scene, camera);
      if (!reduced) raf = requestAnimationFrame(frame);
    }
    const unsub = subscribeSpace(need);
    if (!reduced) raf = requestAnimationFrame(frame);
    else need();

    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      // Keep the subjects in frame on tall phone screens
      camera.fov = camera.aspect < 0.8 ? 78 : 60;
      camera.updateProjectionMatrix();
      need();
    };
    resize();
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX / window.innerWidth - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    const onVis = () => {
      visible = !document.hidden;
      if (visible && !raf) {
        clock.getDelta();
        raf = requestAnimationFrame(frame);
      } else if (!visible && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    window.addEventListener("resize", resize);
    if (!lowEnd && !reduced) window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      visible = false;
      tl.kill();
      unsub();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div aria-hidden className="space-scene">
      <div ref={host} className="space-canvas" />
    </div>
  );
}
