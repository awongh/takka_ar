import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Serve HTTP on localhost. Localhost is a secure context (WebXR/camera OK).
// For phones, tunnel HTTP with cloudflared (public HTTPS) — see README.
export default defineConfig({
  plugins: [react()],
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
