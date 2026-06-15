/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vitest config lives here so tests reuse the same `@` alias + React plugin.
  // `css: false` skips Tailwind processing in jsdom (renderers use inline styles).
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    css: false,
    include: ["src/**/*.{test,spec}.{js,jsx}"],
  },
  server: {
    port: Number(process.env.PORT) || 5175,
    strictPort: false,
    host: true,
    // Accept any Host header (custom domains / reverse proxies, e.g. locket.mdev).
    // `true` disables Vite's host check entirely. Fine for self-hosted on a
    // trusted network; don't expose the raw dev/preview server to the internet.
    allowedHosts: true,
  },
  // The docker image serves via `vite preview`, which has its own host check —
  // mirror the server setting so production containers accept custom domains too.
  preview: {
    host: true,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
