import { useCallback, useEffect, useRef, useState } from "react";
import type { AnimalId } from "./animals";
import { EighthWallCanvas } from "./ar/EighthWallCanvas";
import { GameHud } from "./ar/GameHud";
import type { GamePhase } from "./ar/gameTypes";
import type { GameWorldHandle } from "./ar/GameWorld";
import { PreviewCanvas } from "./ar/PreviewCanvas";
import { isArCapable, isPreviewCapable } from "./arSupport";

type Gate = "checking" | "ready" | "unsupported";

export function App() {
  const [gate, setGate] = useState<Gate>("checking");
  const [arCapable, setArCapable] = useState(false);
  const [mode, setMode] = useState<"preview" | "ar">("preview");
  const [arRunning, setArRunning] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalId>("Fox");
  const [phase, setPhase] = useState<GamePhase>("countdown");
  const [countdown, setCountdown] = useState<number | null>(3);
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

  return (
    <div className="app">
      {mode === "ar" ? (
        <EighthWallCanvas
          selectedAnimal={selectedAnimal}
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
        onSelectAnimal={setSelectedAnimal}
        onStartAr={() => {
          setError(null);
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
