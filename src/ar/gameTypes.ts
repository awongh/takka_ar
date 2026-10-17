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

/**
 * Default projectile radius in world units (meters with absolute AR scale).
 * Sized to be obvious next to a ~0.11m animal.
 */
export const DEFAULT_PROJECTILE_SIZE = 0.23;
/** Default projectile speed in world units per second (keep slow enough to see). */
export const DEFAULT_PROJECTILE_SPEED = 1.5;
/** How far in front of the camera the projectile spawns (along look direction). */
export const PROJECTILE_SPAWN_DISTANCE = 1.0;
/** Minimum horizontal distance from the camera to the placed animal, in meters. */
export const ANIMAL_PLACE_DISTANCE = 3.5;
/**
 * How high a vertically held phone is above the real floor, in meters.
 * SLAM starts the world at the phone, so the ground is this far below the
 * camera on the first tracked frame.
 */
export const CAMERA_HEIGHT_ABOVE_FLOOR = 1.45;

export type ProjectileSettings = {
  size: number;
  speed: number;
};

/**
 * Animal height range in world units (meters with absolute AR scale).
 * The max is the previous fixed height, which still reads too large on device.
 */
export const ANIMAL_HEIGHT_MIN = 0.11;
export const ANIMAL_HEIGHT_MAX = 0.7125;
export const DEFAULT_ANIMAL_HEIGHT = ANIMAL_HEIGHT_MAX;

export type GameHudState = {
  phase: GamePhase;
  countdown: number | null;
  selectedAnimal: AnimalId;
  arRunning: boolean;
  canShoot: boolean;
};
