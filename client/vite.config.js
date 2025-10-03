import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
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
        host: true,
        allowedHosts: true,
        strictPort: true, // Ensures the port is not changed if it's already in use
    },
});
