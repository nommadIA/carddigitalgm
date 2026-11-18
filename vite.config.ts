import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import {
  extractMediaEngine,
  streamMediaDownload,
  proxyMediaThumbnail,
  handleCreateMediaJob,
  handleMediaJobStatus,
  handleMediaJobPause,
  handleMediaJobFile,
  handleMediaAuthStatus,
  handleMediaAuthCookies,
  ensureYtDlpBinary,
} from "./server/mediaEngine";

function attachMediaMiddlewares(server: any) {
  void ensureYtDlpBinary().catch(() => {});

  server.middlewares.use("/api/media-auth-status", (req: any, res: any) => {
    handleMediaAuthStatus(req, res);
  });

  server.middlewares.use("/api/media-auth-cookies", (req: any, res: any) => {
    if (req.method === "POST") {
      handleMediaAuthCookies(req, res);
    } else if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.end();
    } else {
      res.statusCode = 405;
      res.end("Method Not Allowed");
    }
  });

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
    } else if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.end();
    } else {
      res.statusCode = 405;
      res.end("Method Not Allowed");
    }
  });

  server.middlewares.use("/api/media-download", async (req: any, res: any) => {
    await streamMediaDownload(req, res);
  });

  server.middlewares.use("/api/media-proxy", async (req: any, res: any) => {
    await proxyMediaThumbnail(req, res);
  });

  server.middlewares.use("/api/media-job-status", (req: any, res: any) => {
    handleMediaJobStatus(req, res);
  });

  server.middlewares.use("/api/media-job-pause", (req: any, res: any) => {
    if (req.method === "POST") {
      handleMediaJobPause(req, res);
    } else {
      res.statusCode = 405;
      res.end("Method Not Allowed");
    }
  });

  server.middlewares.use("/api/media-job-file", (req: any, res: any) => {
    handleMediaJobFile(req, res);
  });

  server.middlewares.use("/api/media-job", async (req: any, res: any) => {
    if (req.method === "POST") {
      await handleCreateMediaJob(req, res);
    } else if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.end();
    } else {
      res.statusCode = 405;
      res.end("Method Not Allowed");
    }
  });
}

function idmMediaDownloaderPlugin() {
  return {
    name: "idm-media-downloader",
    configureServer(server: any) {
      attachMediaMiddlewares(server);
    },
    configurePreviewServer(server: any) {
      attachMediaMiddlewares(server);
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
      watch: {
        ignored: ["**/bin/**", "**/.aistudio/**", "**/*.traineddata", "**/*.sql", "**/*.txt"],
      },
    },
    optimizeDeps: {
      entries: ["index.html"],
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
