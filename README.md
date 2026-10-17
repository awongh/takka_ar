# takka_ar

React + TypeScript [model-viewer](https://modelviewer.dev/) hello world. Shows the Astronaut GLB, basic UI controls (auto-rotate, camera, shadow, reset), and markerless AR via the built-in AR button (Quick Look on iOS, Scene Viewer / WebXR on Android).

## Setup

```bash
npm install
```

Use Node 20+ (Vite 8 requires it).

## Develop (localhost)

```bash
npm run dev
```

Open **http://localhost:5173/**

## Test on a phone (Cloudflare tunnel)

1. Keep the Vite server running (`npm run dev`)
2. In another terminal:

```bash
cloudflared tunnel --url http://localhost:5173
```

3. Open the printed `https://….trycloudflare.com` URL on your phone  
4. Tap the AR button to place the astronaut on a real surface

Point the tunnel at **http** (not https://localhost).

## Build static files

```bash
npm run build
npm run preview
```

Output is in `dist/`.

## Device support

- **iOS Safari**: AR via Quick Look (`ar` + USDZ / auto-generated USDZ)
- **Android Chrome**: AR via WebXR or Scene Viewer (`ar-modes`)
- **Desktop**: interactive 3D viewer; use a phone for surface AR
