import type { AnimalId } from "../animals";
import { ANIMALS, animalLabel } from "../animals";
import type { GamePhase } from "./gameTypes";

type GameHudProps = {
  mode: "preview" | "ar";
  arCapable: boolean;
  arRunning: boolean;
  phase: GamePhase;
  countdown: number | null;
  selectedAnimal: AnimalId;
  onSelectAnimal: (id: AnimalId) => void;
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
  onSelectAnimal,
  onStartAr,
  onStopAr,
  onShoot,
  error,
}: GameHudProps) {
  const canShoot = phase === "live";

  return (
    <div className="hud">
      <div className="hud-top">
        <label className="hud-field">
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

        {arCapable ? (
          mode === "ar" ? (
            <button type="button" className="button button--ghost" onClick={onStopAr}>
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
      </div>

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
