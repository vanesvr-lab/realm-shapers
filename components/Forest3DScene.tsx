"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useAnimations,
  useGLTF,
  Sky,
  Cloud,
} from "@react-three/drei";
import * as THREE from "three";

const KIT = "/3d/kit";

type Platform = { x: number; y: number; z: number; model: string };

const PLATFORMS: Platform[] = [
  // Start (grass single tall, easy to land on)
  { x: 0, y: 0, z: 0, model: `${KIT}/platforms/3D/glTF/Cube_Grass_Center_Tall.gltf` },
  { x: 3, y: 0, z: 0, model: `${KIT}/platforms/3D/glTF/Cube_Grass_Side_Tall.gltf` },
  { x: 6, y: 0.5, z: -1, model: `${KIT}/platforms/3D/glTF/Cube_Grass_Center_Tall.gltf` },
  { x: 9, y: 1, z: -2, model: `${KIT}/platforms/3D/glTF/Cube_Grass_Side_Tall.gltf` },
  { x: 12, y: 1.5, z: -1, model: `${KIT}/platforms/3D/glTF/Cube_Grass_Center_Tall.gltf` },
  { x: 12, y: 1.5, z: 1, model: `${KIT}/platforms/3D/glTF/Cube_Grass_Center_Tall.gltf` },
  { x: 15, y: 2, z: 0, model: `${KIT}/platforms/3D/glTF/Cube_Grass_Center_Tall.gltf` },
  { x: 18, y: 2.5, z: 0, model: `${KIT}/platforms/3D/glTF/Cube_Grass_Side_Tall.gltf` },
];

const NATURE = [
  { x: 0, y: 1.05, z: -1.2, model: `${KIT}/nature/glTF/Tree.gltf`, scale: 0.9 },
  { x: 6, y: 1.55, z: 0.8, model: `${KIT}/nature/glTF/Bush.gltf`, scale: 1 },
  { x: 12, y: 2.55, z: -0.2, model: `${KIT}/nature/glTF/Rock_1.gltf`, scale: 0.8 },
  { x: 15, y: 3.05, z: -0.9, model: `${KIT}/nature/glTF/Tree_Fruit.gltf`, scale: 0.85 },
];

type Hotspot = {
  id: string;
  x: number;
  y: number;
  z: number;
  message: string;
};

const HOTSPOTS: Hotspot[] = [
  {
    id: "gem_1",
    x: 6,
    y: 2.0,
    z: -1,
    message:
      "You found a sparkling gem! In v2, gems will tie into your story choices.",
  },
  {
    id: "gem_2",
    x: 12,
    y: 3.0,
    z: 1,
    message:
      "A glowing rune hums softly. In v2, runes will unlock secret scenes.",
  },
  {
    id: "gem_3",
    x: 18,
    y: 4.0,
    z: 0,
    message:
      "You reached the summit star! In v2, summits will end your story with a reward.",
  },
];

const SPEED = 4;
const GRAVITY = 16;
const JUMP_VELOCITY = 7;

export default function Forest3DScene({
  onHotspot,
  onMoveStateChange,
}: {
  onHotspot: (msg: string) => void;
  onMoveStateChange?: (moving: boolean) => void;
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [-4, 5, 8], fov: 55 }}
      style={{ width: "100%", height: "100%", background: "linear-gradient(#bae6fd, #fef3c7)" }}
    >
      <Sky distance={450000} sunPosition={[10, 20, 5]} inclination={0.5} azimuth={0.25} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 12, 5]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Cloud position={[8, 12, -10]} opacity={0.6} speed={0.2} />
      <Cloud position={[20, 14, -15]} opacity={0.5} speed={0.15} />

      {PLATFORMS.map((p, i) => (
        <PlatformModel key={i} platform={p} />
      ))}
      {NATURE.map((n, i) => (
        <NatureModel key={i} item={n} />
      ))}
      {HOTSPOTS.map((h) => (
        <HotspotMarker key={h.id} hotspot={h} />
      ))}

      <PlayerCharacter onHotspot={onHotspot} onMoveStateChange={onMoveStateChange} />

      <OrbitControls
        target={[8, 2, 0]}
        enablePan={false}
        minDistance={6}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}

function PlatformModel({ platform }: { platform: Platform }) {
  const { scene } = useGLTF(platform.model);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    cloned.traverse((o: THREE.Object3D) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [cloned]);
  return <primitive object={cloned} position={[platform.x, platform.y, platform.z]} />;
}

function NatureModel({ item }: { item: { x: number; y: number; z: number; model: string; scale: number } }) {
  const { scene } = useGLTF(item.model);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    cloned.traverse((o: THREE.Object3D) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [cloned]);
  return <primitive object={cloned} position={[item.x, item.y, item.z]} scale={item.scale} />;
}

function HotspotMarker({ hotspot }: { hotspot: Hotspot }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = hotspot.y + 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
      meshRef.current.rotation.y = state.clock.elapsedTime;
    }
  });
  return (
    <mesh ref={meshRef} position={[hotspot.x, hotspot.y + 0.3, hotspot.z]} castShadow>
      <octahedronGeometry args={[0.25, 0]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#f59e0b"
        emissiveIntensity={0.8}
        metalness={0.7}
        roughness={0.2}
      />
    </mesh>
  );
}

function PlayerCharacter({
  onHotspot,
  onMoveStateChange,
}: {
  onHotspot: (msg: string) => void;
  onMoveStateChange?: (moving: boolean) => void;
}) {
  const { scene, animations } = useGLTF(`${KIT}/character/glTF/Character.gltf`);
  const group = useRef<THREE.Group>(null);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const { actions, names } = useAnimations(animations, cloned);
  const { camera } = useThree();
  const triggered = useRef<Set<string>>(new Set());

  const keys = useRef({ forward: false, back: false, left: false, right: false, jump: false });
  const velocity = useRef(new THREE.Vector3());
  const grounded = useRef(true);
  const heading = useRef(0);
  const lastAnim = useRef<string>("");

  // Setup shadows
  useEffect(() => {
    cloned.traverse((o: THREE.Object3D) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [cloned]);

  // Pick the idle animation by default
  useEffect(() => {
    const idleName =
      names.find((n) => n === "Idle") ?? names.find((n) => n.toLowerCase().includes("idle")) ?? names[0];
    if (idleName && actions[idleName]) {
      actions[idleName]?.reset().fadeIn(0.2).play();
      lastAnim.current = idleName;
    }
    return () => {
      if (lastAnim.current && actions[lastAnim.current]) {
        actions[lastAnim.current]?.fadeOut(0.2);
      }
    };
  }, [actions, names]);

  // Keyboard listeners
  useEffect(() => {
    function handleKey(e: KeyboardEvent, down: boolean) {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          keys.current.forward = down;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          keys.current.back = down;
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          keys.current.left = down;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          keys.current.right = down;
          break;
        case " ":
          keys.current.jump = down;
          if (down) e.preventDefault();
          break;
      }
    }
    const downHandler = (e: KeyboardEvent) => handleKey(e, true);
    const upHandler = (e: KeyboardEvent) => handleKey(e, false);
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, []);

  useFrame((state, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 1 / 30);

    // Compute movement direction relative to the camera yaw
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    cameraDir.y = 0;
    cameraDir.normalize();
    const cameraSide = new THREE.Vector3().crossVectors(cameraDir, new THREE.Vector3(0, 1, 0));

    const move = new THREE.Vector3();
    if (keys.current.forward) move.add(cameraDir);
    if (keys.current.back) move.sub(cameraDir);
    if (keys.current.right) move.add(cameraSide);
    if (keys.current.left) move.sub(cameraSide);
    const isMoving = move.lengthSq() > 0;
    if (isMoving) move.normalize();

    velocity.current.x = move.x * SPEED;
    velocity.current.z = move.z * SPEED;

    if (keys.current.jump && grounded.current) {
      velocity.current.y = JUMP_VELOCITY;
      grounded.current = false;
    }

    velocity.current.y -= GRAVITY * dt;

    group.current.position.x += velocity.current.x * dt;
    group.current.position.y += velocity.current.y * dt;
    group.current.position.z += velocity.current.z * dt;

    // Simple platform support: snap onto the highest platform top within reach
    const px = group.current.position.x;
    const pz = group.current.position.z;
    let topY = 0;
    for (const plat of PLATFORMS) {
      const dx = Math.abs(plat.x - px);
      const dz = Math.abs(plat.z - pz);
      if (dx < 1.1 && dz < 1.1) {
        const surface = plat.y + 1.0; // tall cubes are ~1 unit on top of base position
        if (surface > topY) topY = surface;
      }
    }
    if (group.current.position.y <= topY) {
      group.current.position.y = topY;
      velocity.current.y = 0;
      grounded.current = true;
    }

    // Reset if fallen way below
    if (group.current.position.y < -10) {
      group.current.position.set(0, 1.0, 0);
      velocity.current.set(0, 0, 0);
    }

    // Face heading
    if (isMoving) {
      const target = Math.atan2(velocity.current.x, velocity.current.z);
      const diff = wrapAngle(target - heading.current);
      heading.current += diff * Math.min(1, dt * 10);
      group.current.rotation.y = heading.current;
    }

    // Hotspot detection
    for (const h of HOTSPOTS) {
      if (triggered.current.has(h.id)) continue;
      const dx = h.x - group.current.position.x;
      const dy = (h.y + 0.5) - group.current.position.y;
      const dz = h.z - group.current.position.z;
      if (dx * dx + dy * dy + dz * dz < 1.2) {
        triggered.current.add(h.id);
        onHotspot(h.message);
      }
    }

    // Animation switching
    const desiredAnim = !grounded.current
      ? names.find((n) => n === "Jump") ?? names.find((n) => n.toLowerCase().includes("jump"))
      : isMoving
        ? names.find((n) => n === "Walk") ?? names.find((n) => n.toLowerCase() === "walk")
        : names.find((n) => n === "Idle") ?? names.find((n) => n.toLowerCase() === "idle");

    if (desiredAnim && desiredAnim !== lastAnim.current) {
      const prev = actions[lastAnim.current];
      const next = actions[desiredAnim];
      if (prev) prev.fadeOut(0.15);
      if (next) next.reset().fadeIn(0.15).play();
      lastAnim.current = desiredAnim;
      onMoveStateChange?.(isMoving);
    }
  });

  return (
    <group ref={group} position={[0, 1.0, 0]} scale={0.7}>
      <primitive object={cloned} />
    </group>
  );
}

function wrapAngle(a: number) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

useGLTF.preload(`${KIT}/character/glTF/Character.gltf`);
PLATFORMS.forEach((p) => useGLTF.preload(p.model));
NATURE.forEach((n) => useGLTF.preload(n.model));
