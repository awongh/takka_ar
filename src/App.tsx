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
import { loadXr8 } from "./ar/bootXr8";
import { LandingScreen } from "./ar/LandingScreen";
import { PreviewCanvas } from "./ar/PreviewCanvas";
import { isArCapable, isPreviewCapable } from "./arSupport";

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
  const [modelError, setModelError] = useState<string | null>(null);
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
      // Warm the XR scripts while the landing screen is up so Start AR can
      // call XR8.run without waiting on the download first.
      if (arOk) {
        void loadXr8().catch(() => {
          // Surface the error when the user actually starts AR.
        });
      }
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

  // Landing and the desktop-preview HUD both enter through here. The engine
  // may already be loaded, and the previous pipeline may already be cleared.
  const beginAr = useCallback(() => {
    setError(null);
    setModelError(null);
    setPhase("idle");
    setCountdown(null);
    setArRunning(false);
    setMode("ar");
    setScreen("game");
  }, []);

  // Stop unmounts the AR canvas (which releases the XR pipeline) and shows
  // the landing screen. `mode` stays on preview so a game shell, if it were
  // still mounted, would not immediately open another camera session.
  const leaveAr = useCallback(() => {
    setScreen("landing");
    setMode("preview");
    setArRunning(false);
    setPhase("idle");
    setCountdown(null);
    setError(null);
    setModelError(null);
  }, []);

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
        onStartAr={beginAr}
        onStartDemo={() => {
          setError(null);
          setModelError(null);
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
          onModelError={setModelError}
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
        onStartAr={beginAr}
        onStopAr={leaveAr}
        onShoot={() => worldRef.current?.shoot()}
        error={error ?? modelError}
      />
    </div>
  );
}
