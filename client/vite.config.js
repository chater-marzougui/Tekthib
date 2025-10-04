import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import fs from "fs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared/src/types"),
    },
  },
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "certs/cert.key")),
      cert: fs.readFileSync(path.resolve(__dirname, "certs/cert.crt")),
      ca: fs.readFileSync(path.resolve(__dirname, "certs/ca.crt")),
    },
    port: 5173,
    host: true,
    allowedHosts: true,
    strictPort: true,
  },
});