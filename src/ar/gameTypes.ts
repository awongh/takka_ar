import type { AnimalId } from "../animals";

export type PlacePose = {
  x: number;
  y: number;
  z: number;
};

export type ProjectileSpawn = {
  id: number;
  origin: [number, number, number];
  direction: [number, number, number];
};

export type ExplosionSpawn = {
  id: number;
  position: [number, number, number];
};

export type GamePhase = "idle" | "countdown" | "live" | "cooldown";

export type GameHudState = {
  phase: GamePhase;
  countdown: number | null;
  selectedAnimal: AnimalId;
  arRunning: boolean;
  canShoot: boolean;
};
