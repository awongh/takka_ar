import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh, MeshBasicMaterial, Texture, WebGLRenderer } from "three";
import {
  CanvasTexture,
  Color,
  PMREMGenerator,
  SRGBColorSpace,
  Vector3,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { TAIL_LENGTH_MAX, type ProjectileSpawn } from "./gameTypes";

const MAX_LIFE = 4;
const EMIT_INTERVAL = 0.018;
/** Pool sized for the longest slider setting so long tails stay dense. */
const TRACER_COUNT = Math.ceil(TAIL_LENGTH_MAX / EMIT_INTERVAL) + 8;
const SURFACE_SIZE = 512;

type SurfaceMaps = {
  colorMap: CanvasTexture;
  roughnessMap: CanvasTexture;
};

let surfaceMaps: SurfaceMaps | null = null;
const envByRenderer = new WeakMap<WebGLRenderer, Texture>();

function goldSurfaceMaps(): SurfaceMaps {
  if (surfaceMaps) {
    return surfaceMaps;
  }

  const flecks = Array.from({ length: 110 }, () => ({
    x: Math.random() * SURFACE_SIZE,
    y: Math.random() * SURFACE_SIZE,
    r: 0.7 + Math.random() * 2.6,
    bright: 0.65 + Math.random() * 0.35,
  }));

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = SURFACE_SIZE;
  colorCanvas.height = SURFACE_SIZE;
  const colorCtx = colorCanvas.getContext("2d");
  if (!colorCtx) {
    throw new Error("Could not paint projectile surface");
  }

  colorCtx.fillStyle = "#e2a01a";
  colorCtx.fillRect(0, 0, SURFACE_SIZE, SURFACE_SIZE);

  for (let i = 0; i < 22; i++) {
    const x = Math.random() * SURFACE_SIZE;
    const y = Math.random() * SURFACE_SIZE;
    const radius = 48 + Math.random() * 110;
    const gradient = colorCtx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(255, 226, 150, 0.42)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    colorCtx.fillStyle = gradient;
    colorCtx.beginPath();
    colorCtx.arc(x, y, radius, 0, Math.PI * 2);
    colorCtx.fill();
  }

  for (const fleck of flecks) {
    colorCtx.fillStyle = `rgba(255, 250, 220, ${fleck.bright})`;
    colorCtx.beginPath();
    colorCtx.arc(fleck.x, fleck.y, fleck.r, 0, Math.PI * 2);
    colorCtx.fill();
  }

  const colorMap = new CanvasTexture(colorCanvas);
  colorMap.colorSpace = SRGBColorSpace;
  colorMap.anisotropy = 8;
  colorMap.needsUpdate = true;

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = SURFACE_SIZE;
  roughCanvas.height = SURFACE_SIZE;
  const roughCtx = roughCanvas.getContext("2d");
  if (!roughCtx) {
    throw new Error("Could not paint projectile roughness");
  }

  // Darker pixels are smoother. The map is the roughness (material.roughness = 1).
  roughCtx.fillStyle = "rgb(120, 120, 120)";
  roughCtx.fillRect(0, 0, SURFACE_SIZE, SURFACE_SIZE);

  for (let i = 0; i < 18; i++) {
    const x = Math.random() * SURFACE_SIZE;
    const y = Math.random() * SURFACE_SIZE;
    const radius = 40 + Math.random() * 80;
    const gradient = roughCtx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(40, 40, 40, 0.85)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    roughCtx.fillStyle = gradient;
    roughCtx.beginPath();
    roughCtx.arc(x, y, radius, 0, Math.PI * 2);
    roughCtx.fill();
  }

  for (const fleck of flecks) {
    roughCtx.fillStyle = "rgb(8, 8, 8)";
    roughCtx.beginPath();
    roughCtx.arc(fleck.x, fleck.y, fleck.r * 1.4, 0, Math.PI * 2);
    roughCtx.fill();
  }

  const roughnessMap = new CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = 8;
  roughnessMap.needsUpdate = true;

  surfaceMaps = { colorMap, roughnessMap };
  return surfaceMaps;
}

/** Studio reflections so the metal reads as shiny without scene-light only. */
function goldEnvMap(renderer: WebGLRenderer): Texture {
  const cached = envByRenderer.get(renderer);
  if (cached) {
    return cached;
  }
  const room = new RoomEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  // Blur the probe so the ball picks up glossy highlights, not a sharp room reflection.
  const texture = pmrem.fromScene(room, 0.18).texture;
  pmrem.dispose();
  room.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) {
      return;
    }
    mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else {
      material.dispose();
    }
  });
  envByRenderer.set(renderer, texture);
  return texture;
}

type TracerParticle = {
  active: boolean;
  age: number;
  life: number;
  pos: Vector3;
  drift: Vector3;
  baseSize: number;
  twinkle: number;
  color: Color;
};

type ProjectileProps = {
  spawn: ProjectileSpawn;
  size: number;
  speed: number;
  gravityRatio: number;
  tailLength: number;
  targetCenter: Vector3 | null;
  targetRadius: number;
  onHit: (position: [number, number, number]) => void;
  onMiss: (id: number) => void;
};

export function Projectile({
  spawn,
  size,
  speed,
  gravityRatio,
  tailLength,
  targetCenter,
  targetRadius,
  onHit,
  onMiss,
}: ProjectileProps) {
  const gl = useThree((state) => state.gl);
  const envMap = useMemo(() => goldEnvMap(gl), [gl]);
  const { colorMap, roughnessMap } = useMemo(() => goldSurfaceMaps(), []);
  const meshRef = useRef<Mesh>(null);
  const tracerRef = useRef<Group>(null);
  const velocity = useRef(
    new Vector3(...spawn.direction).normalize().multiplyScalar(speed),
  );
  const age = useRef(0);
  const emitAcc = useRef(0);
  const alive = useRef(true);
  const back = useRef(new Vector3());
  const scratch = useRef(new Vector3());
  const hitPadding = size * 1.2;

  const tracers = useMemo<TracerParticle[]>(
    () =>
      Array.from({ length: TRACER_COUNT }, () => ({
        active: false,
        age: 0,
        life: tailLength,
        pos: new Vector3(),
        drift: new Vector3(),
        baseSize: size * 0.18,
        twinkle: Math.random() * Math.PI * 2,
        color: new Color(),
      })),
    // Size/tail at spawn lock particle setup; live changes only affect new shots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const emitTracer = (origin: Vector3, vel: Vector3) => {
    const particle = tracers.find((p) => !p.active);
    if (!particle) {
      return;
    }
    back.current.copy(vel).normalize().multiplyScalar(-(size * 0.55));
    particle.active = true;
    particle.age = 0;
    particle.life = tailLength * (0.7 + Math.random() * 0.5);
    particle.pos.copy(origin).add(back.current);
    particle.pos.x += (Math.random() - 0.5) * size * 0.35;
    particle.pos.y += (Math.random() - 0.5) * size * 0.35;
    particle.pos.z += (Math.random() - 0.5) * size * 0.35;
    particle.drift
      .copy(vel)
      .normalize()
      .multiplyScalar(-(0.08 + Math.random() * 0.18))
      .add(
        scratch.current.set(
          (Math.random() - 0.5) * 0.12,
          (Math.random() - 0.5) * 0.12,
          (Math.random() - 0.5) * 0.12,
        ),
      );
    particle.baseSize = size * (0.12 + Math.random() * 0.22);
    particle.twinkle = Math.random() * Math.PI * 2;
    // Gold / white / cool sparkle hues
    const roll = Math.random();
    if (roll < 0.45) {
      particle.color.setHSL(0.12 + Math.random() * 0.05, 0.95, 0.7);
    } else if (roll < 0.75) {
      particle.color.setHSL(0.55 + Math.random() * 0.08, 0.85, 0.78);
    } else {
      particle.color.setRGB(1, 1, 1);
    }
  };

  useFrame((_, delta) => {
    if (!alive.current || !meshRef.current) {
      return;
    }

    const step = Math.min(delta, 0.05);
    age.current += step;

    // Gravity scales with speed so slow shots don't pancake immediately.
    velocity.current.y -= gravityRatio * speed * step;
    meshRef.current.position.addScaledVector(velocity.current, step);

    emitAcc.current += step;
    while (emitAcc.current >= EMIT_INTERVAL) {
      emitAcc.current -= EMIT_INTERVAL;
      emitTracer(meshRef.current.position, velocity.current);
    }

    const trail = tracerRef.current;
    if (trail) {
      for (let i = 0; i < tracers.length; i++) {
        const p = tracers[i];
        const child = trail.children[i] as Mesh | undefined;
        if (!p || !child) {
          continue;
        }
        if (!p.active) {
          child.visible = false;
          continue;
        }
        p.age += step;
        if (p.age >= p.life) {
          p.active = false;
          child.visible = false;
          continue;
        }
        const t = p.age / p.life;
        p.pos.addScaledVector(p.drift, step);
        child.visible = true;
        child.position.copy(p.pos);
        const sparkle =
          0.55 + 0.45 * Math.abs(Math.sin(p.twinkle + age.current * 22));
        child.scale.setScalar(Math.max(0.01, p.baseSize * (1 - t) * sparkle));
        const mat = child.material as MeshBasicMaterial;
        mat.color.copy(p.color);
        mat.transparent = true;
        mat.opacity = (1 - t) * sparkle;
      }
    }

    // Grace period so we never despawn on the spawn frame.
    if (targetCenter && age.current > 0.08) {
      const dist = meshRef.current.position.distanceTo(targetCenter);
      if (dist <= targetRadius + hitPadding) {
        alive.current = false;
        const { x, y, z } = meshRef.current.position;
        onHit([x, y, z]);
        return;
      }
    }

    if (age.current > MAX_LIFE) {
      alive.current = false;
      onMiss(spawn.id);
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        position={spawn.origin}
        frustumCulled={false}
        renderOrder={10}
      >
        <sphereGeometry args={[size, 32, 24]} />
        <meshPhysicalMaterial
          map={colorMap}
          roughnessMap={roughnessMap}
          envMap={envMap}
          color="#ffe7a0"
          metalness={1}
          roughness={1}
          envMapIntensity={1.15}
          clearcoat={0.4}
          clearcoatRoughness={0.22}
          emissive="#c47a10"
          emissiveIntensity={0.08}
          depthTest
          depthWrite
        />
      </mesh>

      <group ref={tracerRef} frustumCulled={false}>
        {tracers.map((_, index) => (
          <mesh
            key={index}
            visible={false}
            frustumCulled={false}
            renderOrder={9}
          >
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0}
              depthWrite={false}
              depthTest
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
