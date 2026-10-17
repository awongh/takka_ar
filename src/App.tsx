import "@google/model-viewer";
import { useEffect, useRef, useState } from "react";
import type { ModelViewerElement } from "@google/model-viewer";
import { isArCapable } from "./arSupport";

const ANIMALS = [
  "Alpaca",
  "Bull",
  "Cow",
  "Deer",
  "Donkey",
  "Fox",
  "Horse",
  "Horse_White",
  "Husky",
  "ShibaInu",
  "Stag",
  "Wolf",
] as const;

type AnimalId = (typeof ANIMALS)[number];

function animalSrc(id: AnimalId): string {
  return `${import.meta.env.BASE_URL}models/animals/${id}.gltf`;
}

function animalLabel(id: AnimalId): string {
  return id.replaceAll("_", " ");
}

type ArGate = "checking" | "supported" | "unsupported";

export function App() {
  const viewerRef = useRef<ModelViewerElement>(null);
  const [arGate, setArGate] = useState<ArGate>("checking");
  const [controlsVisible, setControlsVisible] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cameraControls, setCameraControls] = useState(true);
  const [shadowIntensity, setShadowIntensity] = useState(1);
  const [showAnimal, setShowAnimal] = useState(true);
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalId>("Fox");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supported = await isArCapable();
      if (!cancelled) {
        setArGate(supported ? "supported" : "unsupported");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showAnimal) {
      return;
    }
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }
    const onLoad = () => {
      void viewer.updateFraming();
    };
    viewer.addEventListener("load", onLoad);
    return () => viewer.removeEventListener("load", onLoad);
  }, [showAnimal, selectedAnimal]);

  function resetCamera() {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }
    viewer.cameraOrbit = "auto auto auto";
    viewer.fieldOfView = "auto";
    void viewer.updateFraming();
  }

  if (arGate === "checking") {
    return (
      <div className="status" role="status">
        Checking AR support…
      </div>
    );
  }

  if (arGate === "unsupported") {
    return (
      <div className="status status--warning" role="alert">
        <h1>AR not available</h1>
        <p>
          This app is AR-only and needs a phone that can place models in the
          real world (iOS Safari Quick Look, or Android Chrome with Scene Viewer
          / WebXR).
        </p>
        <p>Open this page on a compatible phone to continue.</p>
      </div>
    );
  }

  return (
    <div className="app">
      {showAnimal ? (
        <model-viewer
          ref={viewerRef}
          src={animalSrc(selectedAnimal)}
          alt={`A 3D model of a ${animalLabel(selectedAnimal)}`}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls={cameraControls || undefined}
          auto-rotate={autoRotate || undefined}
          autoplay
          animation-name="Idle"
          shadow-intensity={shadowIntensity}
          touch-action="pan-y"
        />
      ) : null}

      <button
        type="button"
        className="controls-toggle"
        aria-expanded={controlsVisible}
        aria-controls="model-controls"
        onClick={() => setControlsVisible((visible) => !visible)}
      >
        {controlsVisible ? "Hide controls" : "Show controls"}
      </button>

      {controlsVisible ? (
        <aside
          id="model-controls"
          className="controls"
          aria-label="Model controls"
        >
          <h1>Controls</h1>

          <label className="control">
            <input
              type="checkbox"
              checked={showAnimal}
              onChange={(event) => setShowAnimal(event.target.checked)}
            />
            Show animal
          </label>

          <label className="control control--stack">
            <span>Animal</span>
            <select
              value={selectedAnimal}
              onChange={(event) =>
                setSelectedAnimal(event.target.value as AnimalId)
              }
            >
              {ANIMALS.map((id) => (
                <option key={id} value={id}>
                  {animalLabel(id)}
                </option>
              ))}
            </select>
          </label>

          <label className="control">
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(event) => setAutoRotate(event.target.checked)}
            />
            Auto-rotate
          </label>

          <label className="control">
            <input
              type="checkbox"
              checked={cameraControls}
              onChange={(event) => setCameraControls(event.target.checked)}
            />
            Camera controls
          </label>

          <label className="control control--stack">
            <span>Shadow intensity ({shadowIntensity.toFixed(1)})</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={shadowIntensity}
              onChange={(event) =>
                setShadowIntensity(Number(event.target.value))
              }
            />
          </label>

          <button type="button" className="button" onClick={resetCamera}>
            Reset camera
          </button>

          <p className="hint">
            Use the AR button on the model to place it on a surface.
          </p>
        </aside>
      ) : null}
    </div>
  );
}
