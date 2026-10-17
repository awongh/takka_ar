import { useCallback, useEffect, useRef, useState } from "react";
import type { AnimalId } from "./animals";
import { EighthWallCanvas } from "./ar/EighthWallCanvas";
import { GameHud } from "./ar/GameHud";
import type { GamePhase, ProjectileSettings } from "./ar/gameTypes";
import {
  DEFAULT_ANIMAL_HEIGHT,
  DEFAULT_GRAVITY_RATIO,
  DEFAULT_PROJECTILE_SIZE,
  DEFAULT_PROJECTILE_SPEED,
  DEFAULT_TAIL_LENGTH,
} from "./ar/gameTypes";
import type { GameWorldHandle } from "./ar/GameWorld";
import { LandingScreen } from "./ar/LandingScreen";
import { PreviewCanvas } from "./ar/PreviewCanvas";
import { isArCapable, isPreviewCapable } from "./arSupport";
import { startBackgroundMusic } from "./audio";

type Gate = "checking" | "ready" | "unsupported";
type Screen = "landing" | "game";

export function App() {
  const [gate, setGate] = useState<Gate>("checking");
  const [screen, setScreen] = useState<Screen>("landing");
  const [arCapable, setArCapable] = useState(false);
  const [mode, setMode] = useState<"preview" | "ar">("preview");
  const [arRunning, setArRunning] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalId>("Fox");
  const [animalHeight, setAnimalHeight] = useState(DEFAULT_ANIMAL_HEIGHT);
  const [projectile, setProjectile] = useState<ProjectileSettings>({
    size: DEFAULT_PROJECTILE_SIZE,
    speed: DEFAULT_PROJECTILE_SPEED,
    gravityRatio: DEFAULT_GRAVITY_RATIO,
    tailLength: DEFAULT_TAIL_LENGTH,
  });
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showFloor, setShowFloor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const worldRef = useRef<GameWorldHandle>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const previewOk = isPreviewCapable();
      const arOk = await isArCapable();
      if (cancelled) {
        return;
      }
      setArCapable(arOk);
      setGate(previewOk ? "ready" : "unsupported");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onPhaseChange = useCallback(
    (nextPhase: GamePhase, nextCountdown: number | null) => {
      setPhase(nextPhase);
      setCountdown(nextCountdown);
    },
    [],
  );

  if (gate === "checking") {
    return (
      <div className="status" role="status">
        Checking AR support…
      </div>
    );
  }

  if (gate === "unsupported") {
    return (
      <div className="status status--warning" role="alert">
        <h1>WebGL not available</h1>
        <p>
          This app needs WebGL for the 3D scene. Try a modern mobile or desktop
          browser.
        </p>
      </div>
    );
  }

  if (screen === "landing") {
    return (
      <LandingScreen
        arCapable={arCapable}
        onStartAr={() => {
          startBackgroundMusic();
          setError(null);
          setPhase("idle");
          setCountdown(null);
          setMode("ar");
          setScreen("game");
        }}
        onStartDemo={() => {
          startBackgroundMusic();
          setError(null);
          setMode("preview");
          setScreen("game");
        }}
      />
    );
  }

  return (
    <div className="app">
      {mode === "ar" ? (
        <EighthWallCanvas
          selectedAnimal={selectedAnimal}
          animalHeight={animalHeight}
          projectile={projectile}
          showFloor={showFloor}
          onPhaseChange={onPhaseChange}
          worldRef={worldRef}
          onRunningChange={setArRunning}
          onError={(message) => {
            setError(message);
            setMode("preview");
          }}
        />
      ) : (
        <PreviewCanvas
          selectedAnimal={selectedAnimal}
          animalHeight={animalHeight}
          projectile={projectile}
          showFloor={showFloor}
          onPhaseChange={onPhaseChange}
          worldRef={worldRef}
        />
      )}

      <GameHud
        mode={mode}
        arCapable={arCapable}
        arRunning={arRunning}
        phase={phase}
        countdown={countdown}
        selectedAnimal={selectedAnimal}
        animalHeight={animalHeight}
        projectile={projectile}
        showFloor={showFloor}
        onSelectAnimal={setSelectedAnimal}
        onAnimalHeightChange={setAnimalHeight}
        onProjectileChange={setProjectile}
        onShowFloorChange={setShowFloor}
        onStartAr={() => {
          startBackgroundMusic();
          setError(null);
          setPhase("idle");
          setCountdown(null);
          setMode("ar");
        }}
        onStopAr={() => {
          setMode("preview");
          setArRunning(false);
        }}
        onShoot={() => worldRef.current?.shoot()}
        error={error}
      />
    </div>
  );
}
