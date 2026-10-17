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
