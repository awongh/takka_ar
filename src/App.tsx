import "@google/model-viewer";
import { useRef, useState } from "react";
import type { ModelViewerElement } from "@google/model-viewer";

const MODEL_SRC =
  "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
const MODEL_IOS_SRC =
  "https://modelviewer.dev/shared-assets/models/Astronaut.usdz";

export function App() {
  const viewerRef = useRef<ModelViewerElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cameraControls, setCameraControls] = useState(true);
  const [shadowIntensity, setShadowIntensity] = useState(1);

  function resetCamera() {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }
    viewer.cameraOrbit = "auto auto auto";
    viewer.fieldOfView = "auto";
    void viewer.updateFraming();
  }

  return (
    <div className="app">
      <model-viewer
        ref={viewerRef}
        src={MODEL_SRC}
        ios-src={MODEL_IOS_SRC}
        alt="A 3D model of an astronaut"
        ar
        ar-modes="webxr scene-viewer quick-look"
        camera-controls={cameraControls || undefined}
        auto-rotate={autoRotate || undefined}
        shadow-intensity={shadowIntensity}
        touch-action="pan-y"
      />

      <aside className="controls" aria-label="Model controls">
        <h1>Controls</h1>

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
          On a phone, use the AR button on the model to place it on a surface.
        </p>
      </aside>
    </div>
  );
}
