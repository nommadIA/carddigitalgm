import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || "";

  return {
    base: "/",
    server: { host: true },
    plugins: [react(), tailwindcss()],
    define: {
      "process.env.API_KEY": JSON.stringify(geminiKey),
      "process.env.GEMINI_API_KEY": JSON.stringify(geminiKey),
    },
    resolve: {
      alias: {
        "@": path.resolve("."),
      },
    },
  };
});
