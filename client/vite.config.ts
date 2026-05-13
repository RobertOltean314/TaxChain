import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    cors: true,
  },
  resolve: {
    dedupe: ["wagmi", "viem", "@wagmi/core", "@tanstack/react-query"],
  },
});
