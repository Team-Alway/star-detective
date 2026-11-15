"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

export type NovaMood = "idle" | "happy" | "oops" | "think";

export default function Nova({
  mood = "idle",
  say,
  size = 180,
  className = "",
}: {
  mood?: NovaMood;
  say?: string;
  size?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animState = useRef({
    bounceY: 0,
    shakeX: 0,
    lensScale: 1,
    glowIntensity: 1,
    tiltZ: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(0, 0, 7.5);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xa5b4fc, 2.5);
    dirLight.position.set(4, 5, 5);
    scene.add(dirLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 3, 10);
    rimLight.position.set(-3, -2, 2);
    scene.add(rimLight);

    // ==========================================
    // 3D TELESCOPE MESH (NOVA)
    // ==========================================
    const novaGroup = new THREE.Group();
    scene.add(novaGroup);

    // 1. Telescope Barrel (Main Tube)
    const barrelGeo = new THREE.CylinderGeometry(1.05, 1.15, 2.8, 32);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.8,
    });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2; // Point forward towards viewer
    novaGroup.add(barrel);

    // Gold thermal stripes on tube
    const stripeGeo = new THREE.CylinderGeometry(1.08, 1.08, 0.25, 32);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const stripe1 = new THREE.Mesh(stripeGeo, stripeMat);
    stripe1.rotation.x = Math.PI / 2;
    stripe1.position.z = -0.4;
    novaGroup.add(stripe1);

    const stripe2 = stripe1.clone();
    stripe2.position.z = 0.5;
    novaGroup.add(stripe2);

    // 2. Aperture Hood (Angled Sunshield)
    const hoodGeo = new THREE.CylinderGeometry(1.22, 1.06, 0.7, 32, 1, true);
    const hoodMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.7,
      side: THREE.DoubleSide,
    });
    const hood = new THREE.Mesh(hoodGeo, hoodMat);
    hood.rotation.x = Math.PI / 2;
    hood.position.z = 1.35;
    novaGroup.add(hood);

    // 3. Primary Lens (Big Expressive Eye)
    const lensGeo = new THREE.CircleGeometry(0.98, 32);
    const lensMat = new THREE.MeshBasicMaterial({
      color: 0x0369a1,
    });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.z = 1.36;
    novaGroup.add(lens);

    // Inner Glowing Iris
    const irisGeo = new THREE.CircleGeometry(0.72, 32);
    const irisMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
    });
    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.z = 1.37;
    novaGroup.add(iris);

    // Pupil (Follows mouse cursor)
    const pupilGroup = new THREE.Group();
    pupilGroup.position.z = 1.38;
    novaGroup.add(pupilGroup);

    const pupilGeo = new THREE.CircleGeometry(0.38, 32);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x020617 });
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupilGroup.add(pupil);

    // Eye Glint (Highlights)
    const glint1 = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    glint1.position.set(0.14, 0.14, 0.01);
    pupilGroup.add(glint1);

    const glint2 = new THREE.Mesh(
      new THREE.CircleGeometry(0.06, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    glint2.position.set(-0.12, -0.1, 0.01);
    pupilGroup.add(glint2);

    // 4. Solar Wings (Left & Right Panels)
    const wingGeo = new THREE.BoxGeometry(1.6, 0.8, 0.06);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      metalness: 0.95,
      roughness: 0.1,
    });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-1.85, 0, 0);
    novaGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.85, 0, 0);
    novaGroup.add(rightWing);

    // 5. Antenna / Transceiver on top
    const antBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.7, 12),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 })
    );
    antBase.position.set(0, 1.4, -0.4);
    novaGroup.add(antBase);

    const antDish = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, side: THREE.DoubleSide })
    );
    antDish.rotation.x = -Math.PI / 4;
    antDish.position.set(0, 1.75, -0.4);
    novaGroup.add(antDish);

    // Orbiting Sparkles / Particles around Nova
    const particleCount = 20;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 2.4 + Math.random() * 0.8;
      particlePos[i * 3] = Math.cos(angle) * radius;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
      particlePos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.14,
      transparent: true,
      opacity: 0.85,
    });
    const sparkles = new THREE.Points(particleGeo, particleMat);
    scene.add(sparkles);

    // Mouse Tracking Event
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);
      pointer.current.targetX = Math.max(-1, Math.min(1, dx));
      pointer.current.targetY = Math.max(-1, Math.min(1, dy));
    };
    window.addEventListener("pointermove", onPointerMove);

    // Mood Reactions
    const state = animState.current;
    if (mood === "happy") {
      gsap.fromTo(state, { bounceY: 0 }, { bounceY: 0.7, duration: 0.28, yoyo: true, repeat: 3, ease: "power2.out" });
      gsap.fromTo(state, { lensScale: 1 }, { lensScale: 1.25, duration: 0.22, yoyo: true, repeat: 3 });
      irisMat.color.setHex(0x34d399); // Happy Emerald
    } else if (mood === "oops") {
      gsap.fromTo(state, { shakeX: -0.3 }, { shakeX: 0.3, duration: 0.08, yoyo: true, repeat: 5, ease: "sine.inOut" });
      irisMat.color.setHex(0xf43f5e); // Oops Rose
    } else if (mood === "think") {
      gsap.to(state, { tiltZ: 0.35, duration: 0.4, ease: "power2.out" });
      irisMat.color.setHex(0xa855f7); // Inquisitive Violet
    } else {
      irisMat.color.setHex(0x38bdf8); // Standard Sky Blue
    }

    // Animation Loop
    let clock = new THREE.Clock();
    let frameId = 0;

    const render = () => {
      const elapsed = clock.getElapsedTime();

      // Smooth pointer lerp
      pointer.current.x += (pointer.current.targetX - pointer.current.x) * 0.08;
      pointer.current.y += (pointer.current.targetY - pointer.current.y) * 0.08;

      // Telescope floating & tilt towards pointer
      novaGroup.position.y = Math.sin(elapsed * 2.2) * 0.18 + state.bounceY;
      novaGroup.position.x = state.shakeX;
      novaGroup.rotation.y = pointer.current.x * 0.55;
      novaGroup.rotation.x = -pointer.current.y * 0.45;
      novaGroup.rotation.z = Math.sin(elapsed * 1.5) * 0.05 + state.tiltZ;

      // Pupil follows pointer on the lens face
      pupilGroup.position.x = pointer.current.x * 0.35;
      pupilGroup.position.y = -pointer.current.y * 0.35;
      pupilGroup.scale.setScalar(state.lensScale);

      // Wings gentle fluttering
      leftWing.rotation.y = Math.sin(elapsed * 2) * 0.12;
      rightWing.rotation.y = -Math.sin(elapsed * 2) * 0.12;

      // Particle sparkles rotate
      sparkles.rotation.y = elapsed * 0.35;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      barrelGeo.dispose();
      barrelMat.dispose();
    };
  }, [size, mood]);

  return (
    <div ref={containerRef} className={`relative inline-flex flex-col items-center ${className}`}>
      {say && (
        <div
          role="status"
          className="relative mb-3 max-w-xs rounded-2xl border-2 border-sky-400/50 bg-[#0c1222]/95 px-4 py-2.5 text-center text-sm font-semibold leading-snug text-white shadow-[0_0_24px_rgba(56,189,248,0.35)] backdrop-blur-xl"
        >
          {say}
          {/* Speech bubble tail */}
          <div className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-sky-400/50 bg-[#0c1222]" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="drop-shadow-[0_0_28px_rgba(56,189,248,0.45)] cursor-pointer"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
