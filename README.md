# takka_ar

React + TypeScript AR mini-game: place a Quaternius animal on a detected floor plane, shoot a projectile, and explode it on hit.

**AR** uses the [8th Wall Engine Binary](https://www.npmjs.com/package/@8thwall/engine-binary) (SLAM / world tracking) with [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) for the scene and gameplay. Works in **iOS Safari** and **Android** Chrome (HTTPS + camera). Desktop runs an OrbitControls preview of the same shoot/explode loop.

## Setup

```bash
npm install
```

Use Node 20+ (Vite 8 requires it). `npm install` / Vite `buildStart` copies XR engine files into `public/external/`.

## Develop (localhost)

```bash
npm run dev
```

Open **http://localhost:5173/takka_ar/** (base path is `/takka_ar/`).

## Test AR on a phone (Cloudflare tunnel)

1. Keep the Vite server running (`npm run dev`)
2. In another terminal:

```bash
cloudflared tunnel --url http://localhost:5173
```

3. Open `https://….trycloudflare.com/takka_ar/` on the phone  
4. Tap **Start AR**, allow **camera** (and **motion** on iPhone if prompted)  
5. Aim at the floor until the green reticle appears → countdown places the animal → **Shoot**

Point the tunnel at **http** (not https://localhost).

## Play loop

1. Countdown (3–2–1) places the selected animal on the floor (AR) or at the origin (desktop preview)
2. Tap **Shoot** to fire from the camera
3. On hit the animal explodes; after 2 seconds the countdown runs again

## AR startup gates

The AR countdown is owned by the session reducer in `src/ar/arSession.ts`. It stays idle until `canPresent` is true: the camera pipeline has started, the 8th Wall splash has cleared, the page is visible, and the selected animal model has been parsed by `GLTFLoader`. `GameWorld` mounts when the pipeline starts. The countdown does not start at that moment.

The desktop preview does not use this session. Its clock lives in `src/ar/GameWorld.tsx` and does not wait on the camera, the splash, or the model gate.

| Gate | Completes when | Blocks |
| --- | --- | --- |
| XR8 script | `loadXr8()` in `src/ar/bootXr8.ts` records `engine-ready` | `XR8.run`. Preload starts once the device is AR-capable, so Start AR is not also waiting on the script download. |
| Camera permission and pipeline | Browser status moves through `requesting`, `hasStream`, and `hasVideo`. `pipeline-started` fires from `onStart` in `src/ar/EighthWallCanvas.tsx`, which creates the React Three Fiber root (`frameloop: "never"`). | The countdown. `GameWorld` mounts here. `hasVideo` is not its own gate; `onStart` means camera startup finished. |
| 8th Wall loading splash | `#loadBackground` inside `#loadingContainer` (z-index 800) is sampled by `src/ar/loadingOverlay.ts`. `overlayCleared` latches the first time that splash is gone after the pipeline starts, or after the 8 second watchdog. | The countdown, until the first clear. A later fade flicker does not unmount the scene or rewind the clock. |
| Page visible | `visibilitychange` feeds `page-visible`. | The first countdown. A hidden page also pauses an in-progress clock. A single frame gap over 0.5 seconds pauses the clock without resetting it. |
| Selected animal GLTF | The `model` fact records `loading` when the watch subscribes and `ready` when `GLTFLoader` has parsed that file (`src/ar/animalModel.ts`). | The countdown. `canPresent` requires `modelStatus === "ready"`. Changing animal mid-countdown pauses the clock until the new file is ready. A load failure sets `modelError` on the HUD and leaves the AR session mounted. |
| THREE constructor catalogue | `extend(THREE)` in `src/ar/EighthWallCanvas.tsx`, at module load, before `createRoot`. | Mounting any `mesh`, `group`, light, or geometry. This is not a countdown gate. `<Canvas>` registers the catalogue; `createRoot` does not. |

The AR mesh is the parsed scene from that loader, not a `useGLTF` suspense read. The AR root is `frameloop: "never"`, so a suspended load never resumes. The desktop preview still uses `useGLTF`, because its canvas runs the normal render loop.

The AR scene is mounted with `createRoot`, not `<Canvas>`. `<Canvas>` calls `extend(THREE)` on mount, which registers `Mesh`, `Group`, lights, and geometries in a process-global catalogue. `createRoot` does not. `src/ar/EighthWallCanvas.tsx` calls `extend(THREE)` when that module loads, before the root is created. Until that registration runs, React Three Fiber refuses every animal and reticle element (`R3F: Mesh is not part of the THREE namespace`) and the parsed GLTF never appears. Opening the desktop preview first used to cover this up, because its `<Canvas>` filled the same catalogue.

## Stopping AR

Stop AR returns to the landing screen. The XR scripts stay loaded. `releaseXr8Session()` in `src/ar/bootXr8.ts` calls `XR8.stop()` and `XR8.clearCameraPipelineModules()`. `stop()` alone leaves modules registered, and `addCameraPipelineModules` skips a name that is already there. The next Start AR would keep the detached `takka-r3f` module, ignore the new one, and build a fresh Three.js scene with no animal. Start calls the same release before it registers modules, so a session sitting on the landing screen — scripts loaded, pipeline either cleared or still lingering — boots from an empty module list. Parsed animal files stay in memory and upload again to the new WebGL context.

## Build static files

```bash
npm run build
npm run preview
```

Output is in `docs/` (GitHub Pages).

Animal glTF files live in `public/models/animals/`.

## Device support

- **iOS Safari 16.4+**: 8th Wall world tracking (not Quick Look)
- **Android Chrome / Samsung Internet / Edge**: 8th Wall world tracking
- **Desktop**: 3D preview only (no camera SLAM)

## License / attribution

This product includes the XR Engine software developed by Niantic Spatial, Inc.  
Copyright © 2026 Niantic Spatial, Inc.  
License: https://github.com/8thwall/engine/blob/main/LICENSE
