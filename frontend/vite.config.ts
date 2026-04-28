import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const backendHost = process.env["BACKEND_HOST"] || "localhost";

const config = defineConfig({
  plugins: [
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    viteReact(),
  ],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: `http://${backendHost}:8000`,
        changeOrigin: true,
      },
    },
  },
});

export default config;
