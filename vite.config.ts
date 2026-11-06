import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { extractMediaEngine, streamMediaDownload } from "./server/mediaEngine";

function idmMediaDownloaderPlugin() {
  return {
    name: "idm-media-downloader",
    configureServer(server: any) {
      server.middlewares.use("/api/media-extract", async (req: any, res: any) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk: any) => {
            body += chunk;
          });
          req.on("end", async () => {
            try {
              const { url } = JSON.parse(body || "{}");
              const result = await extractMediaEngine(url);
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end("Method Not Allowed");
        }
      });

      server.middlewares.use("/api/media-download", async (req: any, res: any) => {
        await streamMediaDownload(req, res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || "";

  return {
    base: "/",
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      allowedHosts: true,
      hmr: false,
    },
    plugins: [react(), tailwindcss(), idmMediaDownloaderPlugin()],
    resolve: {
      alias: {
        "@": path.resolve("."),
      },
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'lucide-react'],
          },
        },
      },
    },
  };
});
