import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function copyEighthWallAssets(): Plugin {
  const copy = () => {
    const mappings: Array<[string, string]> = [
      [
        "node_modules/@8thwall/engine-binary/dist",
        "public/external/xr",
      ],
      [
        "node_modules/@8thwall/xrextras/dist",
        "public/external/xrextras",
      ],
      [
        "node_modules/@8thwall/landing-page/dist",
        "public/external/landing-page",
      ],
    ];
    for (const [from, to] of mappings) {
      const dest = resolve(to);
      mkdirSync(dest, { recursive: true });
      cpSync(resolve(from), dest, { recursive: true });
    }
  };

  return {
    name: "copy-eighth-wall-assets",
    buildStart() {
      copy();
    },
  };
}

// Serve HTTP on localhost. Localhost is a secure context (camera OK).
// For phones, tunnel HTTP with cloudflared (public HTTPS) — see README.
export default defineConfig({
  base: "/takka_ar/",
  plugins: [react(), copyEighthWallAssets()],
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
    // Cloudflare quick tunnels use rotating *.trycloudflare.com hosts
    allowedHosts: [".trycloudflare.com"],
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: [".trycloudflare.com"],
  },
});
