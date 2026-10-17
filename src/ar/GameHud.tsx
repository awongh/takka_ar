import { useState } from "react";
import type { AnimalId } from "../animals";
import { ANIMALS, animalLabel } from "../animals";
import type { GamePhase, ProjectileSettings } from "./gameTypes";
import { ANIMAL_HEIGHT_MAX, ANIMAL_HEIGHT_MIN } from "./gameTypes";

type GameHudProps = {
  mode: "preview" | "ar";
  arCapable: boolean;
  arRunning: boolean;
  phase: GamePhase;
  countdown: number | null;
  selectedAnimal: AnimalId;
  animalHeight: number;
  projectile: ProjectileSettings;
  showFloor: boolean;
  onSelectAnimal: (id: AnimalId) => void;
  onAnimalHeightChange: (height: number) => void;
  onProjectileChange: (next: ProjectileSettings) => void;
  onShowFloorChange: (visible: boolean) => void;
  onStartAr: () => void;
  onStopAr: () => void;
  onShoot: () => void;
  error: string | null;
};

export function GameHud({
  mode,
  arCapable,
  arRunning,
  phase,
  countdown,
  selectedAnimal,
  animalHeight,
  projectile,
  showFloor,
  onSelectAnimal,
  onAnimalHeightChange,
  onProjectileChange,
  onShowFloorChange,
  onStartAr,
  onStopAr,
  onShoot,
  error,
}: GameHudProps) {
  const [controlsVisible, setControlsVisible] = useState(false);
  const canShoot = phase === "live";

  return (
    <div className="hud">
      <div className="hud-top">
        {arCapable ? (
          mode === "ar" ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={onStopAr}
            >
              Stop AR
            </button>
          ) : (
            <button type="button" className="button" onClick={onStartAr}>
              {arRunning ? "Starting…" : "Start AR"}
            </button>
          )
        ) : (
          <p className="hud-note">Desktop preview — open on a phone for AR</p>
        )}

        <button
          type="button"
          className="controls-toggle"
          aria-expanded={controlsVisible}
          aria-controls="game-controls"
          onClick={() => setControlsVisible((visible) => !visible)}
        >
          {controlsVisible ? "Hide controls" : "Show controls"}
        </button>
      </div>

      {controlsVisible ? (
        <aside
          id="game-controls"
          className="controls"
          aria-label="Game controls"
        >
          <h1>Controls</h1>

          <label className="control control--stack">
            <span>Animal</span>
            <select
              value={selectedAnimal}
              onChange={(event) =>
                onSelectAnimal(event.target.value as AnimalId)
              }
            >
              {ANIMALS.map((id) => (
                <option key={id} value={id}>
                  {animalLabel(id)}
                </option>
              ))}
            </select>
          </label>

          <label className="control control--stack">
            <span>Animal size ({animalHeight.toFixed(3)} m)</span>
            <input
              type="range"
              min={ANIMAL_HEIGHT_MIN}
              max={ANIMAL_HEIGHT_MAX}
              step={0.0025}
              value={animalHeight}
              onChange={(event) =>
                onAnimalHeightChange(Number(event.target.value))
              }
            />
          </label>

          <label className="control">
            <input
              type="checkbox"
              checked={showFloor}
              onChange={(event) => onShowFloorChange(event.target.checked)}
            />
            Show floor
          </label>

          <label className="control control--stack">
            <span>Projectile size ({projectile.size.toFixed(3)} m)</span>
            <input
              type="range"
              min={0.07}
              max={0.39}
              step={0.01}
              value={projectile.size}
              onChange={(event) =>
                onProjectileChange({
                  ...projectile,
                  size: Number(event.target.value),
                })
              }
            />
          </label>

          <label className="control control--stack">
            <span>Projectile speed ({projectile.speed.toFixed(1)} m/s)</span>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.1}
              value={projectile.speed}
              onChange={(event) =>
                onProjectileChange({
                  ...projectile,
                  speed: Number(event.target.value),
                })
              }
            />
          </label>
        </aside>
      ) : null}

      {countdown !== null ? (
        <div className="countdown" aria-live="assertive">
          {countdown}
        </div>
      ) : null}

      {phase === "cooldown" ? (
        <p className="hud-banner" aria-live="polite">
          Next animal in 2s…
        </p>
      ) : null}

      {error ? (
        <p className="hud-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="shoot"
        disabled={!canShoot}
        onClick={onShoot}
      >
        Shoot
      </button>

      <p className="attribution">
        Powered by 8th Wall / Niantic Spatial. This product includes the XR
        Engine software developed by Niantic Spatial, Inc. Copyright © 2026
        Niantic Spatial, Inc.{" "}
        <a
          href="https://github.com/8thwall/engine/blob/main/LICENSE"
          target="_blank"
          rel="noreferrer"
        >
          License
        </a>
      </p>
    </div>
  );
}
