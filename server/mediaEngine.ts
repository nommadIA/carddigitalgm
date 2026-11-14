import { Readable } from "stream";
import type { IncomingMessage, ServerResponse } from "http";
import { spawn, execFile, type ChildProcess } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Ytdl, Client } from "@distube/ytdl-core";

const execFileAsync = promisify(execFile);

export interface ExtractedMediaFormat {
  id: string;
  type: "video" | "audio" | "image";
  quality: string;
  resolution?: string;
  bitrate?: string;
  extension: "mp4" | "webm" | "mp3" | "m4a" | "jpg" | "png";
  label: string;
  badge: string;
  filesizeApprox?: string;
  directUrl: string;
  isPopular?: boolean;
}

export interface ExtractedMediaResponse {
  success: boolean;
  url: string;
  title: string;
  author: string;
  thumbnail: string;
  duration?: string;
  platform: string;
  platformLabel: string;
  detectedMediaKind?: "video" | "audio" | "image";
  formats: ExtractedMediaFormat[];
  error?: string;
}

export interface MediaJobState {
  id: string;
  url: string;
  pageUrl: string;
  type: "video" | "audio" | "image";
  quality: string;
  filename: string;
  status: "extracting" | "downloading" | "merging" | "ready" | "paused" | "error";
  percentage: number;
  downloadedSize: string;
  totalSize: string;
  totalBytes: number;
  transferRate: string;
  statusText: string;
  filePath?: string;
  contentType?: string;
  error?: string;
  needsAuth?: boolean;
  createdAt: number;
  updatedAt: number;
  proc?: ChildProcess | null;
  abortController?: AbortController | null;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MOBILE_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

const YT_DLP_PROJECT_PATH = path.resolve("./bin/yt-dlp");
const YT_DLP_TMP_PATH = "/tmp/gm_yt-dlp_linux";
const JOBS_ROOT = "/tmp/gm_media_jobs";
const COOKIES_FILE_PATH = "/tmp/gm_yt_cookies.txt";
const ENV_COOKIES_FILE_PATH = "/tmp/gm_env_yt_cookies.txt";
const PROXY_FILE_PATH = "/tmp/gm_media_proxy.txt";
const JOBS_MAP = new Map<string, MediaJobState>();

const YTDLP_RELEASE_URL =
  "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";

let ensureBinaryPromise: Promise<string> | null = null;

/**
 * Garante que o binário standalone yt-dlp_linux exista, seja > 10MB (não o zipapp Python 3.10-incompatível)
 * e possua permissão de execução (+x).
 */
export async function ensureYtDlpBinary(): Promise<string> {
  if (ensureBinaryPromise) return ensureBinaryPromise;

  ensureBinaryPromise = (async () => {
    const isValidStandalone = (p: string) => {
      try {
        if (!fs.existsSync(p)) return false;
        const stat = fs.statSync(p);
        // Standalone yt-dlp_linux has ~39MB; Python zipapp is ~3MB
        if (stat.size < 10 * 1024 * 1024) return false;
        fs.chmodSync(p, 0o755);
        return true;
      } catch {
        return false;
      }
    };

    if (isValidStandalone(YT_DLP_PROJECT_PATH)) {
      return YT_DLP_PROJECT_PATH;
    }
    if (isValidStandalone(YT_DLP_TMP_PATH)) {
      return YT_DLP_TMP_PATH;
    }

    // Download yt-dlp_linux to project ./bin/yt-dlp (or /tmp fallback)
    const targetPath = (() => {
      try {
        fs.mkdirSync(path.dirname(YT_DLP_PROJECT_PATH), { recursive: true });
        return YT_DLP_PROJECT_PATH;
      } catch {
        return YT_DLP_TMP_PATH;
      }
    })();

    const tempPath = `${targetPath}.downloading`;
    const res = await fetch(YTDLP_RELEASE_URL, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok || !res.body) {
      throw new Error("Falha ao inicializar binário yt-dlp standalone");
    }

    const arrayBuf = await res.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(arrayBuf));
    fs.chmodSync(tempPath, 0o755);
    fs.renameSync(tempPath, targetPath);
    return targetPath;
  })();

  try {
    return await ensureBinaryPromise;
  } finally {
    ensureBinaryPromise = null;
  }
}

function getFfmpegPath(): string {
  if (fs.existsSync("/usr/bin/ffmpeg")) return "/usr/bin/ffmpeg";
  return "ffmpeg";
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i
  );
  return match ? match[1] : null;
}

function cleanYouTubeUrl(url: string): string {
  const ytId = extractYouTubeId(url);
  if (ytId) {
    return `https://www.youtube.com/watch?v=${ytId}`;
  }
  return url;
}

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

function isPornhubUrl(url: string): boolean {
  return /pornhub\.(?:com|org)/i.test(url);
}

function normalizeTargetUrl(url: string): string {
  let u = cleanYouTubeUrl(url.trim());
  try {
    const parsed = new URL(u);
    if (/^([a-z0-9-]+\.)?pornhub\.(com|org)$/i.test(parsed.hostname)) {
      parsed.hostname = "www.pornhub.com";
      u = parsed.toString();
    }
  } catch {}
  return u;
}

function getActiveCookiesPath(): string | null {
  try {
    if (fs.existsSync(COOKIES_FILE_PATH) && fs.statSync(COOKIES_FILE_PATH).size > 20) {
      return COOKIES_FILE_PATH;
    }
    const envCookies = (process.env.YT_COOKIES || "").trim();
    if (envCookies) {
      const normalized = normalizeCookiesToNetscape(envCookies) || envCookies;
      if (normalized.length > 20) {
        fs.writeFileSync(ENV_COOKIES_FILE_PATH, normalized, "utf8");
        return ENV_COOKIES_FILE_PATH;
      }
    }
  } catch {}
  return null;
}

function getActiveCookiesRaw(): string | null {
  try {
    const envCookies = (process.env.YT_COOKIES || "").trim();
    if (envCookies) return envCookies;
    if (fs.existsSync(COOKIES_FILE_PATH) && fs.statSync(COOKIES_FILE_PATH).size > 20) {
      return fs.readFileSync(COOKIES_FILE_PATH, "utf8");
    }
  } catch {}
  return null;
}

function getActiveProxyUrl(): string | null {
  try {
    if (fs.existsSync(PROXY_FILE_PATH)) {
      const val = fs.readFileSync(PROXY_FILE_PATH, "utf8").trim();
      if (/^(https?|socks4|socks5):\/\//i.test(val)) return val;
    }
    const envProxy = (
      process.env.MEDIA_PROXY_URL ||
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      ""
    ).trim();
    if (/^(https?|socks4|socks5):\/\//i.test(envProxy)) return envProxy;
  } catch {}
  return null;
}

function formatYtDlpError(rawErr: string): { message: string; needsAuth: boolean } {
  const s = rawErr || "";
  if (/Sign in to confirm|not a bot|LOGIN_REQUIRED/i.test(s)) {
    return {
      message:
        "Não foi possível extrair o vídeo do YouTube no momento (conteúdo privado, restrição de idade ou proteção temporária).",
      needsAuth: false,
    };
  }
  if (/This video is unavailable|removed|deleted|Private video|Unsupported URL/i.test(s)) {
    return {
      message: "Este vídeo foi removido, é privado ou está indisponível na plataforma.",
      needsAuth: false,
    };
  }
  const cleanLine = s
    .split(/\r?\n/)
    .filter((l) => l.includes("ERROR:") && !l.includes("Deprecated Feature"))
    .slice(-1)[0]
    ?.replace(/^ERROR:\s*/i, "")
    .replace(/See\s+https?:\/\/\S+.*$/i, "")
    .trim();
  return {
    message: cleanLine || "Não foi possível extrair a mídia original deste link.",
    needsAuth: false,
  };
}

function isAdultDomain(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("pornhub.com") ||
    u.includes("xvideos.com") ||
    u.includes("xnxx.com") ||
    u.includes("spankbang.com") ||
    u.includes("redtube.com") ||
    u.includes("youporn.com") ||
    u.includes("xhamster.com") ||
    u.includes("eporner.com")
  );
}

function detectPlatformServer(url: string): { platform: string; platformLabel: string } {
  const u = url.toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|avif|bmp|svg)(\?|$)/i.test(u)) {
    return { platform: "image", platformLabel: "Imagem Web" };
  }
  if (u.includes("youtube.com") || u.includes("youtu.be")) {
    return { platform: "youtube", platformLabel: "YouTube" };
  }
  if (u.includes("tiktok.com")) {
    return { platform: "tiktok", platformLabel: "TikTok" };
  }
  if (u.includes("kwai.com") || u.includes("kw.ai") || u.includes("kuaishou.com")) {
    return { platform: "kwai", platformLabel: "Kwai" };
  }
  if (u.includes("instagram.com") || u.includes("threads.net")) {
    return { platform: "instagram", platformLabel: "Instagram" };
  }
  if (u.includes("twitter.com") || u.includes("x.com")) {
    return { platform: "twitter", platformLabel: "X (Twitter)" };
  }
  if (u.includes("facebook.com") || u.includes("fb.watch")) {
    return { platform: "facebook", platformLabel: "Facebook" };
  }
  if (u.includes("vimeo.com")) {
    return { platform: "vimeo", platformLabel: "Vimeo" };
  }
  if (u.includes("pinterest.com") || u.includes("pin.it")) {
    return { platform: "pinterest", platformLabel: "Pinterest" };
  }
  if (isAdultDomain(u)) {
    return { platform: "adult", platformLabel: "Mídia Web HD" };
  }
  return { platform: "generic", platformLabel: "Mídia Web" };
}

function getAudioBitrate(quality: string): "128k" | "192k" | "256k" | "320k" {
  const q = (quality || "").toLowerCase();
  if (q.includes("128")) return "128k";
  if (q.includes("192")) return "192k";
  if (q.includes("256")) return "256k";
  return "320k";
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .trim();
}

function resolveAbsoluteUrl(candidate: string, baseUrl: string): string {
  try {
    const cleaned = decodeHtmlEntities(candidate);
    if (!cleaned || cleaned.startsWith("data:") || cleaned.startsWith("blob:")) return "";
    return new URL(cleaned, baseUrl).toString();
  } catch {
    return "";
  }
}

interface ScrapedVideoCandidate {
  url: string;
  quality?: string;
  height?: number;
}

interface ScrapedPageMedia {
  finalUrl: string;
  title?: string;
  author?: string;
  thumbnail?: string;
  duration?: string;
  cookies?: string;
  proxyUsed?: string;
  unavailable?: boolean;
  unavailableReason?: string;
  videoUrls: ScrapedVideoCandidate[];
  imageUrls: string[];
  audioUrls: string[];
}

const PH_SCRAPE_CACHE = new Map<string, { data: ScrapedPageMedia; expiresAt: number }>();
const EXTRACT_CACHE = new Map<string, { data: ExtractedMediaResponse; expiresAt: number }>();
let CACHED_PH_GEO_PROXY: string | null = null;

function setPhScrapeCache(urlKey: string, data: ScrapedPageMedia) {
  if (data.unavailable || (data.videoUrls.length === 0 && !data.thumbnail)) return;
  if (PH_SCRAPE_CACHE.size > 80) {
    const oldest = PH_SCRAPE_CACHE.keys().next().value;
    if (oldest) PH_SCRAPE_CACHE.delete(oldest);
  }
  PH_SCRAPE_CACHE.set(urlKey, {
    data,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
}

function setExtractCache(urlKey: string, data: ExtractedMediaResponse) {
  if (!data.success || data.formats.length === 0) return;
  if (EXTRACT_CACHE.size > 120) {
    const oldest = EXTRACT_CACHE.keys().next().value;
    if (oldest) EXTRACT_CACHE.delete(oldest);
  }
  EXTRACT_CACHE.set(urlKey, {
    data,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
}

function upgradeTwitterPhotoUrl(rawUrl?: string): string {
  if (!rawUrl) return "";
  try {
    const u = new URL(rawUrl);
    if (u.hostname.includes("pbs.twimg.com") && u.pathname.includes("/media/")) {
      u.searchParams.set("name", "4096x4096");
      return u.toString();
    }
  } catch {}
  return rawUrl;
}

function parseQualityHeight(raw?: string | number | null): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const s = String(raw).toLowerCase();
  if (s.includes("4k") || s.includes("2160")) return 2160;
  if (s.includes("1440")) return 1440;
  if (s.includes("1080")) return 1080;
  if (s.includes("720")) return 720;
  if (s.includes("480")) return 480;
  if (s.includes("360")) return 360;
  if (s.includes("240")) return 240;
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n >= 144 && n <= 4320 ? n : undefined;
}

function parseSetCookiesMap(res: Response, existing: Map<string, string>) {
  const getSetCookie = (res.headers as any).getSetCookie;
  const setCookies: string[] = typeof getSetCookie === "function" ? getSetCookie.call(res.headers) : [];
  for (const raw of setCookies) {
    const pair = raw.split(";")[0]?.trim();
    if (!pair) continue;
    const eqIdx = pair.indexOf("=");
    if (eqIdx > 0) {
      existing.set(pair.slice(0, eqIdx).trim(), pair.slice(eqIdx + 1).trim());
    }
  }
}

function serializeCookieMap(map: Map<string, string>): string {
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function fetchUrlViaCurlProxy(
  proxyUrl: string,
  targetUrl: string,
  timeoutMs = 6000,
  signal?: AbortSignal,
  cookieHeader = "age_verified=1; accessAgeDisclaimerPH=1; platform=pc"
): Promise<{ proxyUrl: string; html: string; confirmedUnavailable?: boolean }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("aborted"));

    const child = spawn("curl", [
      "-s",
      "-L",
      "--max-redirs",
      "4",
      "-m",
      String(Math.max(3, Math.ceil(timeoutMs / 1000))),
      "-x",
      proxyUrl,
      "-A",
      USER_AGENT,
      "-H",
      `Cookie: ${cookieHeader}`,
      "-H",
      "Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8",
      "-H",
      "Referer: https://www.pornhub.com/",
      targetUrl,
    ]);

    let out = "";
    let settled = false;

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
      clearTimeout(timer);
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        child.kill("SIGKILL");
      } catch {}
      reject(new Error("aborted"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        child.kill("SIGKILL");
      } catch {}
      reject(new Error("timeout"));
    }, timeoutMs + 800);

    child.stdout?.on("data", (d) => {
      out += d.toString("utf8");
      if (out.length > 2800000) {
        try {
          child.kill("SIGKILL");
        } catch {}
      }
    });

    child.on("close", () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (out.includes("mediaDefinitions")) {
        resolve({ proxyUrl, html: out });
        return;
      }
      if (
        out.includes("pornhub.com") &&
        /video is unavailable|has been removed|Video has been flagged|Video is disabled|Este vídeo não está disponível/i.test(
          out
        )
      ) {
        resolve({ proxyUrl, html: out, confirmedUnavailable: true });
        return;
      }
      reject(new Error("no_media"));
    });

    child.on("error", () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("spawn_err"));
    });
  });
}

async function getPornhubGeoProxyCandidates(): Promise<string[]> {
  const candidates: string[] = [];
  const envOrFileProxy = getActiveProxyUrl();
  if (envOrFileProxy) candidates.push(envOrFileProxy);
  if (CACHED_PH_GEO_PROXY) candidates.push(CACHED_PH_GEO_PROXY);

  const [psSsl, s5BR, s5CA, s5DE, s5NL] = await Promise.allSettled([
    fetch(
      "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=4000&country=BR,CA,DE,NL,GB,FR,MX,ES,IT,PL,JP,SG,AU,CH,SE&ssl=yes&anonymity=all",
      { signal: AbortSignal.timeout(3500) }
    ).then((r) => r.text()),
    fetch("https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/countries/BR/data.txt", {
      signal: AbortSignal.timeout(3500),
    }).then((r) => r.text()),
    fetch("https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/countries/CA/data.txt", {
      signal: AbortSignal.timeout(3500),
    }).then((r) => r.text()),
    fetch("https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/countries/DE/data.txt", {
      signal: AbortSignal.timeout(3500),
    }).then((r) => r.text()),
    fetch("https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/countries/NL/data.txt", {
      signal: AbortSignal.timeout(3500),
    }).then((r) => r.text()),
  ]);

  if (psSsl.status === "fulfilled") {
    for (const line of psSsl.value.split(/\r?\n/)) {
      const s = line.trim();
      if (s && /^\d+\.\d+\.\d+\.\d+:\d+$/.test(s)) {
        candidates.push(`http://${s}`);
      }
    }
  }

  for (const res of [s5BR, s5CA, s5DE, s5NL]) {
    if (res.status === "fulfilled") {
      for (const line of res.value.split(/\r?\n/)) {
        const s = line.trim();
        if (s.startsWith("socks5://")) {
          candidates.push(s.replace("socks5://", "socks5h://"));
        }
      }
    }
  }

  return [...new Set(candidates)];
}

/**
 * Desbloqueio automático de região para vídeos do Pornhub que retornam 302 / a partir do IP dos EUA.
 * Busca apenas o HTML leve via nós internacionais paralelos; o download pesado da CDN (phncdn.com) roda direto no servidor.
 */
async function racePornhubGeoUnblock(
  targetUrl: string
): Promise<{ html: string; proxyUrl: string; confirmedUnavailable?: boolean } | null> {
  const candidates = await getPornhubGeoProxyCandidates();
  if (candidates.length === 0) return null;

  // Tenta primeiro proxy em cache / env rapidamente antes da corrida paralela
  const fastFirstCount = CACHED_PH_GEO_PROXY || getActiveProxyUrl() ? 1 : 0;
  if (fastFirstCount > 0) {
    try {
      const quick = await fetchUrlViaCurlProxy(candidates[0], targetUrl, 4500);
      if (quick.html.includes("mediaDefinitions")) {
        CACHED_PH_GEO_PROXY = quick.proxyUrl;
        return { html: quick.html, proxyUrl: quick.proxyUrl };
      }
    } catch {}
  }

  let unavailableConfirmations = 0;
  const pool = candidates.slice(fastFirstCount, 65);

  for (let i = 0; i < pool.length; i += 20) {
    const batch = pool.slice(i, i + 20);
    const ac = new AbortController();
    try {
      const win = await Promise.any(
        batch.map(async (p) => {
          const r = await fetchUrlViaCurlProxy(p, targetUrl, 6000, ac.signal);
          if (r.confirmedUnavailable) {
            unavailableConfirmations++;
            throw new Error("confirmed_unavailable");
          }
          return r;
        })
      );
      ac.abort();
      CACHED_PH_GEO_PROXY = win.proxyUrl;
      return { html: win.html, proxyUrl: win.proxyUrl };
    } catch {
      ac.abort();
      if (unavailableConfirmations >= 2) {
        return { html: "", proxyUrl: "", confirmedUnavailable: true };
      }
    }
  }

  return unavailableConfirmations > 0
    ? { html: "", proxyUrl: "", confirmedUnavailable: true }
    : null;
}

/**
 * Raspador universal de HTML/JSON para plataformas como Kwai, XVideos, XNXX,
 * Pornhub (com sessão etária + /embed/ fallback + desbloqueio geo automático + get_media JSON + HLS por qualidade),
 * Instagram Photo/Reel e qualquer site web com tags <video>, <meta og:video>, JSON-LD etc.
 */
async function scrapeWebPageMedia(rawUrl: string): Promise<ScrapedPageMedia> {
  const targetUrl = normalizeTargetUrl(rawUrl);
  const isKwai = /kwai\.com|kw\.ai|kuaishou\.com/i.test(targetUrl);
  const isInstagram = /instagram\.com|threads\.net/i.test(targetUrl);
  const isPinterest = /pinterest\.|pin\.it/i.test(targetUrl);
  const isFacebook = /facebook\.com|fb\.watch/i.test(targetUrl);
  const isPornhub = isPornhubUrl(targetUrl);

  if (isPornhub) {
    const cached = PH_SCRAPE_CACHE.get(targetUrl);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
  }

  const headers: Record<string, string> = {
    "User-Agent": isKwai ? MOBILE_USER_AGENT : USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  };

  const cookieMap = new Map<string, string>();
  if (isPornhub) {
    cookieMap.set("age_verified", "1");
    cookieMap.set("accessAgeDisclaimerPH", "1");
    cookieMap.set("platform", "pc");
    try {
      const initRes = await fetch("https://www.pornhub.com/", {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });
      parseSetCookiesMap(initRes, cookieMap);
      headers["Cookie"] = serializeCookieMap(cookieMap);
      headers["Referer"] = "https://www.pornhub.com/";
    } catch {}
  }

  let res = await fetch(targetUrl, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  parseSetCookiesMap(res, cookieMap);
  let finalUrl = res.url || targetUrl;
  const contentType = (res.headers.get("content-type") || "").toLowerCase();

  // Caso a URL redirecione diretamente para imagem/vídeo/áudio
  if (contentType.startsWith("image/")) {
    return {
      finalUrl,
      title: path.basename(new URL(finalUrl).pathname) || "Imagem Original",
      author: new URL(finalUrl).hostname.replace(/^www\./, ""),
      thumbnail: finalUrl,
      videoUrls: [],
      imageUrls: [finalUrl],
      audioUrls: [],
    };
  }
  if (contentType.startsWith("video/")) {
    return {
      finalUrl,
      title: path.basename(new URL(finalUrl).pathname) || "Vídeo Original",
      author: new URL(finalUrl).hostname.replace(/^www\./, ""),
      videoUrls: [{ url: finalUrl, quality: "original" }],
      imageUrls: [],
      audioUrls: [],
    };
  }
  if (contentType.startsWith("audio/")) {
    return {
      finalUrl,
      title: path.basename(new URL(finalUrl).pathname) || "Áudio Original",
      author: new URL(finalUrl).hostname.replace(/^www\./, ""),
      videoUrls: [],
      imageUrls: [],
      audioUrls: [finalUrl],
    };
  }

  let html = await res.text();
  let proxyUsed: string | undefined;

  // Instagram / Threads: se redirecionou para login ou faltam meta tags, tenta /embed/captioned/ público
  if (isInstagram) {
    const igMatch = targetUrl.match(/instagram\.com\/(?:p|reel|tv|reels)\/([A-Za-z0-9_-]+)/i);
    const looksBlocked =
      /\/accounts\/login/i.test(finalUrl) ||
      (!html.includes("og:video") && !html.includes("og:image") && !html.includes("EmbeddedMediaImage"));
    if (igMatch && looksBlocked) {
      try {
        const embRes = await fetch(`https://www.instagram.com/p/${igMatch[1]}/embed/captioned/`, {
          headers: {
            "User-Agent": USER_AGENT,
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
            Referer: "https://www.instagram.com/",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(10000),
        });
        const embHtml = await embRes.text();
        if (
          embHtml.includes("EmbeddedMediaImage") ||
          embHtml.includes("video_url") ||
          embHtml.includes("playable_url") ||
          embHtml.includes("scontent")
        ) {
          html = `${html}\n${embHtml}`;
        }
      } catch {}
    }
  }

  // Pornhub: se a página principal redirecionar para home (geo/SC/age/deleted), checa /embed/{viewkey} e desbloqueio geo automático
  if (isPornhub) {
    const vkMatch = targetUrl.match(/viewkey=([a-zA-Z0-9]+)/i);
    const redirectedHome =
      /^https?:\/\/[^\/]*pornhub\.(?:com|org)\/?(\?.*)?$/i.test(finalUrl) ||
      (!html.includes("mediaDefinitions") && Boolean(vkMatch));

    let embedBlockedOrUnavailable =
      /video is unavailable|has been removed|Video has been flagged|Video is disabled/i.test(html) &&
      !html.includes("mediaDefinitions");

    if (redirectedHome && vkMatch) {
      try {
        const embedUrl = `https://www.pornhub.com/embed/${vkMatch[1]}`;
        const embRes = await fetch(embedUrl, {
          headers: {
            ...headers,
            Cookie: serializeCookieMap(cookieMap),
            Referer: "https://www.pornhub.com/",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(10000),
        });
        parseSetCookiesMap(embRes, cookieMap);
        const embHtml = await embRes.text();
        if (embHtml.includes("mediaDefinitions") || embHtml.includes(".m3u8")) {
          html = embHtml;
          finalUrl = embedUrl;
          embedBlockedOrUnavailable = false;
        } else if (
          /video is unavailable|has been removed|Video has been flagged|Video is disabled|This video has been removed|Este vídeo não está disponível/i.test(
            embHtml
          )
        ) {
          embedBlockedOrUnavailable = true;
        }
      } catch {}
    }

    // Se ainda sem mediaDefinitions (bloqueio regional nos EUA / SC), executa desbloqueio geo automático via nós externos
    if (!html.includes("mediaDefinitions") && vkMatch) {
      const geo = await racePornhubGeoUnblock(targetUrl);
      if (geo?.html && geo.html.includes("mediaDefinitions")) {
        html = geo.html;
        finalUrl = targetUrl;
        proxyUsed = geo.proxyUrl;
        embedBlockedOrUnavailable = false;
      } else if (embedBlockedOrUnavailable || geo?.confirmedUnavailable) {
        return {
          finalUrl,
          unavailable: true,
          unavailableReason: "Este vídeo foi removido, é privado ou está indisponível na plataforma.",
          videoUrls: [],
          imageUrls: [],
          audioUrls: [],
        };
      }
    } else if (embedBlockedOrUnavailable) {
      return {
        finalUrl,
        unavailable: true,
        unavailableReason: "Este vídeo foi removido, é privado ou está indisponível na plataforma.",
        videoUrls: [],
        imageUrls: [],
        audioUrls: [],
      };
    }
  }

  const videoUrls: ScrapedVideoCandidate[] = [];
  const imageUrls: string[] = [];
  const audioUrls: string[] = [];

  const pushVideo = (raw?: string, quality?: string, height?: number) => {
    if (!raw) return;
    const abs = resolveAbsoluteUrl(raw, finalUrl);
    if (!abs) return;
    // Nunca tratar endpoints JSON do get_media diretamente como arquivo MP4
    if (/pornhub\.[^\/]+\/video\/get_media/i.test(abs)) return;
    const parsedH = height ?? parseQualityHeight(quality);
    if (!videoUrls.some((v) => v.url === abs)) {
      videoUrls.push({ url: abs, quality, height: parsedH });
    }
  };
  const pushImage = (raw?: string) => {
    if (!raw) return;
    const abs = resolveAbsoluteUrl(raw, finalUrl);
    if (!abs) return;
    if (/logo|icon|favicon|avatar|sprite|1x1|150x150|44x44|default-og|static\.cdninstagram\.com\/rsrc/i.test(abs)) return;
    if (!imageUrls.includes(abs)) {
      imageUrls.push(abs);
    }
  };

  // Título
  const titleMatch =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
    html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/html5player\.setVideoTitle\(\s*['"]([^'"]+)['"]\s*\)/i) ||
    html.match(/"video_title"\s*:\s*"([^"]+)"/i) ||
    html.match(/"caption"\s*:\s*"([^"]+)"/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);

  const rawTitle = titleMatch ? decodeHtmlEntities(titleMatch[1]) : "";
  const title = rawTitle && rawTitle.length > 1 ? rawTitle : undefined;

  // Autor
  const authorMatch =
    html.match(/html5player\.setUploaderName\(\s*['"]([^'"]+)['"]\s*\)/i) ||
    html.match(/"userName"\s*:\s*"([^"]+)"/i) ||
    html.match(/"author"\s*:\s*"([^"]+)"/i) ||
    html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const author = authorMatch
    ? decodeHtmlEntities(authorMatch[1])
    : new URL(finalUrl).hostname.replace(/^www\./, "");

  // Duração
  let duration: string | undefined;
  const durSecMatch =
    html.match(/"video_duration"\s*:\s*"?(\d+)"?/i) ||
    html.match(/"duration"\s*:\s*(\d+)/i);
  if (durSecMatch) {
    const secs = parseInt(durSecMatch[1], 10);
    if (secs > 0 && secs < 86400) {
      duration = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    }
  }

  // Pinterest: prioriza originais (https://i.pinimg.com/originals/...) e vídeos (v1.pinimg.com/videos/...)
  if (isPinterest) {
    const pinVideoMatches = html.matchAll(/(https:\/\/v1\.pinimg\.com\/videos\/[^"'\s\\<>)]+\.(?:mp4|m3u8))/gi);
    for (const m of pinVideoMatches) {
      pushVideo(m[1], m[1].includes("720w") ? "720p" : undefined);
    }
    const pinOrigMatches = html.matchAll(/(https:\/\/i\.pinimg\.com\/originals\/[^"'\s\\<>)]+\.(?:jpg|jpeg|png|webp|gif))/gi);
    for (const m of pinOrigMatches) {
      pushImage(m[1]);
    }
  }

  // Instagram / Threads: captura imagens e vídeos do bloco embed/JSON antes das tags genéricas
  if (isInstagram) {
    const embImgMatch = html.match(/<img[^>]+class=["'][^"']*EmbeddedMediaImage[^"']*["'][^>]+src=["']([^"']+)["']/i);
    if (embImgMatch) pushImage(embImgMatch[1]);
    const igPatterns = [
      /"playable_url_quality_hd"\s*:\s*"([^"]+)"/gi,
      /"playable_url"\s*:\s*"([^"]+)"/gi,
      /"video_url"\s*:\s*"([^"]+)"/gi,
    ];
    for (const pat of igPatterns) {
      let m: RegExpExecArray | null;
      while ((m = pat.exec(html)) !== null) {
        pushVideo(m[1]);
      }
    }
    const igImgMatches = html.matchAll(/(https?:\\?\/\\?\/[^"'\s<>)]*scontent[^"'\s<>)]+\.(?:jpg|jpeg|png|webp)[^"'\s<>)]*)/gi);
    for (const m of igImgMatches) {
      pushImage(m[1]);
    }
  }

  // Facebook: campos HD/SD nativos no HTML/JSON
  if (isFacebook) {
    const fbPatterns = [
      /"playable_url_quality_hd"\s*:\s*"([^"]+)"/gi,
      /"browser_native_hd_url"\s*:\s*"([^"]+)"/gi,
      /"hd_src(?:_no_ratelimit)?"\s*:\s*"([^"]+)"/gi,
      /"playable_url"\s*:\s*"([^"]+)"/gi,
      /"browser_native_sd_url"\s*:\s*"([^"]+)"/gi,
      /"sd_src(?:_no_ratelimit)?"\s*:\s*"([^"]+)"/gi,
    ];
    for (const pat of fbPatterns) {
      let m: RegExpExecArray | null;
      while ((m = pat.exec(html)) !== null) {
        pushVideo(m[1]);
      }
    }
  }

  // Meta Images & Thumbnails
  const metaImgPatterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,
    /html5player\.setThumbUrl169\(\s*['"]([^'"]+)['"]\s*\)/gi,
    /html5player\.setThumbUrl\(\s*['"]([^'"]+)['"]\s*\)/gi,
    /"image_url"\s*:\s*"([^"]+)"/gi,
    /"display_url"\s*:\s*"([^"]+)"/gi,
    /"coverUrl"\s*:\s*"([^"]+)"/gi,
    /"photoUrl"\s*:\s*"([^"]+)"/gi,
    /poster=["']([^"']+)["']/gi,
  ];
  for (const pat of metaImgPatterns) {
    let m: RegExpExecArray | null;
    while ((m = pat.exec(html)) !== null) {
      pushImage(m[1]);
    }
  }

  // Pornhub mediaDefinitions (resolve get_media JSON se válido + extrai HLS por resolução)
  if (html.includes("mediaDefinitions")) {
    const start = html.indexOf("mediaDefinitions");
    const startArr = html.indexOf("[", start);
    if (startArr !== -1) {
      let depth = 0;
      let endArr = -1;
      for (let i = startArr; i < html.length; i++) {
        if (html[i] === "[") depth++;
        else if (html[i] === "]") {
          depth--;
          if (depth === 0) {
            endArr = i + 1;
            break;
          }
        }
      }
      if (endArr !== -1) {
        try {
          const rawDefs = JSON.parse(html.slice(startArr, endArr));
          if (Array.isArray(rawDefs)) {
            for (const def of rawDefs) {
              if (!def?.videoUrl || typeof def.videoUrl !== "string") continue;
              if (def.videoUrl.includes("/video/get_media")) {
                // Consulta get_media apenas se retornar JSON real (nunca adiciona HTML)
                try {
                  const gmRes = await fetch(def.videoUrl, {
                    headers: {
                      "User-Agent": USER_AGENT,
                      Cookie: serializeCookieMap(cookieMap),
                      Referer: finalUrl,
                      "X-Requested-With": "XMLHttpRequest",
                      Accept: "application/json, text/javascript, */*; q=0.01",
                    },
                    signal: AbortSignal.timeout(6000),
                  });
                  const gmText = await gmRes.text();
                  if (gmText.trim().startsWith("[") || gmText.trim().startsWith("{")) {
                    const gmJson = JSON.parse(gmText);
                    const arr = Array.isArray(gmJson) ? gmJson : [];
                    for (const mp4Item of arr) {
                      if (mp4Item?.videoUrl) {
                        const qStr = String(mp4Item.quality || "");
                        pushVideo(mp4Item.videoUrl, qStr, parseQualityHeight(qStr));
                      }
                    }
                  }
                } catch {}
              } else {
                const h = parseQualityHeight(def.height || def.quality);
                pushVideo(def.videoUrl, String(def.quality || def.height || ""), h);
              }
            }
          }
        } catch {}
      }
    }
  }

  // XVideos / XNXX html5player
  const xvHigh = html.match(/html5player\.setVideoUrlHigh\(\s*['"]([^'"]+)['"]\s*\)/i);
  if (xvHigh) pushVideo(xvHigh[1], "1080p", 1080);
  const xvHls = html.match(/html5player\.setVideoHLS\(\s*['"]([^'"]+)['"]\s*\)/i);
  if (xvHls) pushVideo(xvHls[1], "hls");
  const xvLow = html.match(/html5player\.setVideoUrlLow\(\s*['"]([^'"]+)['"]\s*\)/i);
  if (xvLow) pushVideo(xvLow[1], "480p", 480);

  // Meta Video & JSON-LD & Kwai / Instagram / Generic video URLs
  const videoPatterns = [
    /<meta[^>]+property=["']og:video(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(?::secure_url|:url)?["']/gi,
    /<meta[^>]+name=["']twitter:player:stream["'][^>]+content=["']([^"']+)["']/gi,
    /<video[^>]+src=["']([^"']+)["']/gi,
    /<source[^>]+src=["']([^"']+)["']/gi,
    /"srcNoMark"\s*:\s*"([^"]+)"/gi,
    /"hdPlayUrl"\s*:\s*"([^"]+)"/gi,
    /"mp4Url"\s*:\s*"([^"]+)"/gi,
    /"playUrl"\s*:\s*"([^"]+)"/gi,
    /"video_url"\s*:\s*"([^"]+)"/gi,
    /"videoUrl"\s*:\s*"([^"]+)"/gi,
    /"contentUrl"\s*:\s*"([^"]+\.(?:mp4|m3u8)[^"]*)"/gi,
    /(https?:\\?\/\\?\/[^"'\s<>)]+\.(?:mp4|m3u8)(?:\?[^"'\s<>)]*)?)/gi,
  ];
  for (const pat of videoPatterns) {
    let m: RegExpExecArray | null;
    while ((m = pat.exec(html)) !== null) {
      pushVideo(m[1]);
    }
  }

  // Fallback <img src> caso nenhuma meta imagem exista
  if (imageUrls.length === 0) {
    const imgTagMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
    for (const m of imgTagMatches) {
      const candidate = m[1];
      if (!/logo|icon|favicon|avatar|sprite|1x1/i.test(candidate)) {
        pushImage(candidate);
      }
    }
  }

  const result: ScrapedPageMedia = {
    finalUrl,
    title,
    author,
    thumbnail: imageUrls[0],
    duration,
    cookies: cookieMap.size > 0 ? serializeCookieMap(cookieMap) : undefined,
    proxyUsed,
    videoUrls,
    imageUrls,
    audioUrls,
  };
  if (isPornhub && videoUrls.length > 0) {
    setPhScrapeCache(targetUrl, result);
  }
  return result;
}

/**
 * Executa yt-dlp -J para obter metadados reais de qualquer plataforma suportada.
 * Inclui fallback automático de player_client para YouTube e impersonate Chrome para sites web/adultos.
 */
async function runYtDlpJson(url: string): Promise<any | null> {
  const ytDlpBin = await ensureYtDlpBinary();
  const cleanUrl = normalizeTargetUrl(url);
  const isYt = isYouTubeUrl(cleanUrl);
  const isAdult = isAdultDomain(cleanUrl);
  const cookiesPath = getActiveCookiesPath();
  const proxyUrl = getActiveProxyUrl();

  const attempt = async (extraArgs: string[], timeoutMs: number, useImpersonate = false) => {
    const args = [
      "--js-runtimes",
      "node:/usr/local/bin/node",
      "--no-playlist",
      "--no-warnings",
      ...(useImpersonate ? ["--impersonate", "chrome"] : ["--user-agent", USER_AGENT]),
      ...(cookiesPath ? ["--cookies", cookiesPath] : []),
      ...(proxyUrl ? ["--proxy", proxyUrl] : []),
      ...extraArgs,
      "-J",
      cleanUrl,
    ];
    const { stdout } = await execFileAsync(ytDlpBin, args, {
      timeout: timeoutMs,
      maxBuffer: 25 * 1024 * 1024,
    });
    return stdout ? JSON.parse(stdout) : null;
  };

  try {
    return await attempt([], 16000, isAdult);
  } catch (err: any) {
    const msg = String(err?.stderr || err?.message || "");
    if (!isAdult && !isYt) {
      try {
        return await attempt([], 16000, true);
      } catch {}
    }
    if (isYt && /Sign in to confirm|bot|cookies/i.test(msg)) {
      try {
        return await attempt(
          ["--extractor-args", "youtube:player_client=android_vr,mweb,tv,ios"],
          16000,
          false
        );
      } catch {}
    }
    return null;
  }
}

function buildFormatsList(params: {
  pageUrl: string;
  directVideoUrl?: string;
  directAudioUrl?: string;
  directImageUrl?: string;
  hasVideo: boolean;
  hasAudio: boolean;
  maxHeight?: number;
}): ExtractedMediaFormat[] {
  const {
    pageUrl,
    directVideoUrl,
    directAudioUrl,
    directImageUrl,
    hasVideo,
    hasAudio,
    maxHeight = 2160,
  } = params;

  const formats: ExtractedMediaFormat[] = [];
  const videoTarget = directVideoUrl || pageUrl;
  const audioTarget = directAudioUrl || directVideoUrl || pageUrl;
  const imageTarget = directImageUrl || pageUrl;

  if (hasVideo) {
    formats.push({
      id: "video_best",
      type: "video",
      quality: "best",
      resolution: "Máxima Resolução Disponível",
      extension: "mp4",
      label: "MP4 · Máxima Automática (Melhor Qualidade)",
      badge: "MAX AUTO",
      filesizeApprox: "~160 MB",
      directUrl: videoTarget,
      isPopular: true,
    });
    if (maxHeight >= 1440) {
      formats.push({
        id: "video_4k",
        type: "video",
        quality: "4k",
        resolution: "3840x2160 4K Ultra HD",
        extension: "mp4",
        label: "MP4 · 4K Ultra HD (Máxima Qualidade)",
        badge: "4K ULTRA HD",
        filesizeApprox: "~140 MB",
        directUrl: videoTarget,
        isPopular: true,
      });
    }
    formats.push(
      {
        id: "video_1080p",
        type: "video",
        quality: "1080p",
        resolution: "1920x1080 Full HD",
        extension: "mp4",
        label: "MP4 · 1080p Full HD (Qualidade Original)",
        badge: "FULL HD",
        filesizeApprox: "~48 MB",
        directUrl: videoTarget,
        isPopular: true,
      },
      {
        id: "video_720p",
        type: "video",
        quality: "720p",
        resolution: "1280x720 HD",
        extension: "mp4",
        label: "MP4 · 720p HD",
        badge: "HD",
        filesizeApprox: "~28 MB",
        directUrl: videoTarget,
      },
      {
        id: "video_480p",
        type: "video",
        quality: "480p",
        resolution: "854x480 SD",
        extension: "mp4",
        label: "MP4 · 480p SD",
        badge: "SD",
        filesizeApprox: "~15 MB",
        directUrl: videoTarget,
      }
    );
  }

  if (hasAudio || hasVideo) {
    formats.push(
      {
        id: "audio_320k",
        type: "audio",
        quality: "320k",
        bitrate: "320 kbps",
        extension: "mp3",
        label: "MP3 · 320 kbps (Áudio HQ)",
        badge: "ÁUDIO HQ",
        filesizeApprox: "~8 MB",
        directUrl: audioTarget,
        isPopular: true,
      },
      {
        id: "audio_256k",
        type: "audio",
        quality: "256k",
        bitrate: "256 kbps",
        extension: "mp3",
        label: "MP3 · 256 kbps (Alta Definição)",
        badge: "ALTA",
        filesizeApprox: "~6.5 MB",
        directUrl: audioTarget,
      },
      {
        id: "audio_192k",
        type: "audio",
        quality: "192k",
        bitrate: "192 kbps",
        extension: "mp3",
        label: "MP3 · 192 kbps (Equilibrado)",
        badge: "PADRÃO",
        filesizeApprox: "~5 MB",
        directUrl: audioTarget,
      },
      {
        id: "audio_128k",
        type: "audio",
        quality: "128k",
        bitrate: "128 kbps",
        extension: "mp3",
        label: "MP3 · 128 kbps (Compacto)",
        badge: "LEVE",
        filesizeApprox: "~3.5 MB",
        directUrl: audioTarget,
      }
    );
  }

  if (directImageUrl) {
    formats.push(
      {
        id: "image_8k",
        type: "image",
        quality: "8k",
        resolution: "7680x4320 8K Ultra Definição",
        extension: "jpg",
        label: "JPG · 8K Ultra Definição",
        badge: "8K ULTRA HD",
        filesizeApprox: "~12 MB",
        directUrl: imageTarget,
        isPopular: true,
      },
      {
        id: "image_4k",
        type: "image",
        quality: "4k",
        resolution: "3840x2160 4K Original",
        extension: "jpg",
        label: "JPG · 4K Original",
        badge: "4K ORIGINAL",
        filesizeApprox: "~5 MB",
        directUrl: imageTarget,
      },
      {
        id: "image_1080p",
        type: "image",
        quality: "1080p",
        resolution: "1920x1080 Full HD",
        extension: "jpg",
        label: "JPG · Full HD Original",
        badge: "FULL HD",
        filesizeApprox: "~2 MB",
        directUrl: imageTarget,
      },
      {
        id: "image_png",
        type: "image",
        quality: "png",
        resolution: "PNG Sem Compressão",
        extension: "png",
        label: "PNG · Qualidade Lossless",
        badge: "PNG",
        filesizeApprox: "~8 MB",
        directUrl: imageTarget,
      }
    );
  }

  return formats;
}

/**
 * MOTOR UNIVERSAL DE EXTRAÇÃO DE METADADOS REAIS
 * Extrai título, autor, miniatura autêntica e formatos disponíveis para qualquer plataforma.
 */
export async function extractMediaEngine(inputUrl: string): Promise<ExtractedMediaResponse> {
  const url = (inputUrl || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return {
      success: false,
      url,
      title: "URL Inválida",
      author: "",
      thumbnail: "",
      platform: "unknown",
      platformLabel: "Desconhecido",
      formats: [],
      error: "Informe uma URL válida começando com http:// ou https://",
    };
  }

  const u = url.toLowerCase();
  const normalizedKey = normalizeTargetUrl(url);
  const cachedExtract = EXTRACT_CACHE.get(normalizedKey);
  if (cachedExtract && cachedExtract.expiresAt > Date.now()) {
    return cachedExtract.data;
  }
  const detected = detectPlatformServer(url);

  // 1. ARQUIVO DIRETO DE IMAGEM (.jpg, .png, .webp, etc.)
  if (detected.platform === "image") {
    const filenameMatch = url.match(/\/([^\/?#]+)\.[a-zA-Z0-9]+(\?|$)/);
    const rawTitle = filenameMatch ? decodeURIComponent(filenameMatch[1]) : "Imagem Original";
    return {
      success: true,
      url,
      title: rawTitle.replace(/[_-]/g, " "),
      author: new URL(url).hostname.replace(/^www\./, ""),
      thumbnail: url,
      platform: "image",
      platformLabel: "Imagem Web",
      detectedMediaKind: "image",
      formats: buildFormatsList({
        pageUrl: url,
        directImageUrl: url,
        hasVideo: false,
        hasAudio: false,
      }),
    };
  }

  // 2. ARQUIVO DIRETO DE VÍDEO OU ÁUDIO (.mp4, .webm, .mp3, etc.)
  if (/\.(mp4|webm|mov|mkv|m3u8|mp3|m4a|wav|aac|ogg)(\?|$)/i.test(url)) {
    const isAudio = /\.(mp3|m4a|wav|aac|ogg)(\?|$)/i.test(url);
    const filenameMatch = url.match(/\/([^\/?#]+)\.[a-zA-Z0-9]+(\?|$)/);
    const rawTitle = filenameMatch ? decodeURIComponent(filenameMatch[1]) : "Mídia Direta";
    return {
      success: true,
      url,
      title: rawTitle.replace(/[_-]/g, " "),
      author: new URL(url).hostname.replace(/^www\./, ""),
      thumbnail: "",
      platform: "generic",
      platformLabel: isAudio ? "Áudio Direto" : "Vídeo Direto",
      detectedMediaKind: isAudio ? "audio" : "video",
      formats: buildFormatsList({
        pageUrl: url,
        directVideoUrl: isAudio ? undefined : url,
        directAudioUrl: url,
        hasVideo: !isAudio,
        hasAudio: true,
      }),
    };
  }

  // 3. TIKTOK (TikWM API rápida — diferencia vídeo vs carrossel de fotos)
  if (u.includes("tiktok.com")) {
    try {
      const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const json: any = await res.json();
        if (json?.data) {
          const d = json.data;
          const normalizeTikWmUrl = (raw?: string) => {
            if (!raw) return "";
            return raw.startsWith("/") ? `https://www.tikwm.com${raw}` : raw;
          };
          const directVideo = normalizeTikWmUrl(d.hdplay || d.play || d.wmplay);
          const directAudio = normalizeTikWmUrl(d.music);
          const cover = normalizeTikWmUrl(d.origin_cover || d.cover);
          const images: string[] = Array.isArray(d.images)
            ? d.images.map((img: string) => normalizeTikWmUrl(img)).filter(Boolean)
            : [];

          if (directVideo || images.length > 0) {
            const isPhotoSlide = !directVideo && images.length > 0;
            const resp: ExtractedMediaResponse = {
              success: true,
              url,
              title: d.title || (isPhotoSlide ? "Fotos do TikTok" : "Vídeo do TikTok"),
              author: d.author?.nickname || d.author?.unique_id || "@tiktok",
              thumbnail: images[0] || cover || "",
              duration: d.duration
                ? `${Math.floor(d.duration / 60)}:${String(d.duration % 60).padStart(2, "0")}`
                : undefined,
              platform: "tiktok",
              platformLabel: "TikTok (Sem Marca)",
              detectedMediaKind: isPhotoSlide ? "image" : "video",
              formats: buildFormatsList({
                pageUrl: url,
                directVideoUrl: directVideo || undefined,
                directAudioUrl: directAudio || undefined,
                directImageUrl: images[0] || cover || undefined,
                hasVideo: Boolean(directVideo),
                hasAudio: Boolean(directAudio || directVideo),
              }),
            };
            setExtractCache(normalizedKey, resp);
            return resp;
          }
        }
      }
    } catch {}
  }

  // 3B. X / TWITTER (api.fxtwitter.com — lê vídeo no maior bitrate e foto em 4K original)
  if (detected.platform === "twitter") {
    const xMatch = url.match(/(?:x\.com|twitter\.com)\/([^\/?#]+)\/status\/(\d+)/i);
    if (xMatch) {
      const apiEndpoints = [
        `https://api.fxtwitter.com/${xMatch[1]}/status/${xMatch[2]}`,
        `https://api.vxtwitter.com/${xMatch[1]}/status/${xMatch[2]}`,
      ];
      for (const apiUrl of apiEndpoints) {
        try {
          const xRes = await fetch(apiUrl, {
            headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
            signal: AbortSignal.timeout(9000),
          });
          if (!xRes.ok) continue;
          const xJson: any = await xRes.json().catch(() => null);
          const tw = xJson?.tweet;
          if (tw) {
            const videos: any[] = Array.isArray(tw?.media?.videos) ? tw.media.videos : [];
            const photos: any[] = Array.isArray(tw?.media?.photos) ? tw.media.photos : [];
            const vxMedia: any[] = Array.isArray(xJson?.media_extended) ? xJson.media_extended : [];
            const vxVideo = vxMedia.find((m) => m.type === "video" || m.type === "gif");
            const vxPhoto = vxMedia.find((m) => m.type === "image");

            const videoVariants = [
              ...(Array.isArray(videos[0]?.formats) ? videos[0].formats : []),
              ...(Array.isArray(videos[0]?.variants) ? videos[0].variants : []),
              ...(videos[0]?.url ? [{ url: videos[0].url, bitrate: 1 }] : []),
              ...(vxVideo?.url ? [{ url: vxVideo.url, bitrate: 1 }] : []),
            ]
              .filter((v) => v?.url && !String(v.url).includes(".m3u8"))
              .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

            const directVideoUrl = videoVariants[0]?.url || videos[0]?.url || vxVideo?.url;
            const rawImageUrl =
              photos[0]?.url ||
              vxPhoto?.url ||
              videos[0]?.thumbnail_url ||
              vxVideo?.thumbnail_url ||
              tw?.author?.avatar_url;
            const directImageUrl = upgradeTwitterPhotoUrl(rawImageUrl);

            const hasVideo = Boolean(directVideoUrl);
            const hasImage = Boolean(directImageUrl);
            if (hasVideo || hasImage) {
              const titleText = String(tw.text || xJson.text || "Post do X (Twitter)")
                .replace(/https?:\/\/t\.co\/\w+/g, "")
                .trim();
              const durSec = videos[0]?.duration || vxVideo?.duration_millis / 1000;
              const resp: ExtractedMediaResponse = {
                success: true,
                url,
                title: titleText || "Post do X (Twitter)",
                author: tw?.author?.screen_name ? `@${tw.author.screen_name}` : tw?.author?.name || "X (Twitter)",
                thumbnail: directImageUrl || "",
                duration:
                  durSec && durSec > 0
                    ? `${Math.floor(durSec / 60)}:${String(Math.floor(durSec % 60)).padStart(2, "0")}`
                    : undefined,
                platform: "twitter",
                platformLabel: "X (Twitter)",
                detectedMediaKind: hasVideo ? "video" : "image",
                formats: buildFormatsList({
                  pageUrl: url,
                  directVideoUrl: directVideoUrl || undefined,
                  directAudioUrl: directVideoUrl || undefined,
                  directImageUrl: directImageUrl || undefined,
                  hasVideo,
                  hasAudio: hasVideo,
                }),
              };
              setExtractCache(normalizedKey, resp);
              return resp;
            }
          }
        } catch {}
      }
    }
  }

  // 4. YOUTUBE (oEmbed + yt-dlp -J)
  if (detected.platform === "youtube") {
    const ytId = extractYouTubeId(url);
    const cleanUrl = cleanYouTubeUrl(url);
    let title = "";
    let author = "";
    let thumbnail = ytId ? `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg` : "";
    let duration: string | undefined;

    // Consulta rápida oEmbed em paralelo com yt-dlp -J
    const [oembedRes, ytdlpData] = await Promise.all([
      (async () => {
        try {
          const r = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`
          );
          if (r.ok) return await r.json();
        } catch {}
        try {
          const r2 = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`);
          if (r2.ok) return await r2.json();
        } catch {}
        return null;
      })(),
      runYtDlpJson(cleanUrl),
    ]);

    if (oembedRes) {
      if (oembedRes.title) title = oembedRes.title;
      if (oembedRes.author_name) author = oembedRes.author_name;
      if (oembedRes.thumbnail_url && !thumbnail) thumbnail = oembedRes.thumbnail_url;
    }

    if (ytdlpData) {
      if (ytdlpData.title) title = ytdlpData.title;
      if (ytdlpData.uploader || ytdlpData.channel) {
        author = ytdlpData.uploader || ytdlpData.channel;
      }
      if (ytdlpData.thumbnail) thumbnail = ytdlpData.thumbnail;
      if (ytdlpData.duration_string) duration = ytdlpData.duration_string;
    }

    // Verifica melhor thumbnail disponível: maxresdefault -> sddefault -> hqdefault
    if (ytId && thumbnail.includes("maxresdefault.jpg")) {
      try {
        const headMax = await fetch(thumbnail, { method: "HEAD", signal: AbortSignal.timeout(3000) });
        if (!headMax.ok) {
          const sdUrl = `https://i.ytimg.com/vi/${ytId}/sddefault.jpg`;
          const headSd = await fetch(sdUrl, { method: "HEAD", signal: AbortSignal.timeout(3000) });
          thumbnail = headSd.ok ? sdUrl : `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
        }
      } catch {
        thumbnail = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
      }
    }

    const resp: ExtractedMediaResponse = {
      success: true,
      url: cleanUrl,
      title: title || "Vídeo do YouTube",
      author: author || "YouTube",
      thumbnail,
      duration,
      platform: "youtube",
      platformLabel: "YouTube",
      detectedMediaKind: "video",
      formats: buildFormatsList({
        pageUrl: cleanUrl,
        directImageUrl: thumbnail || undefined,
        hasVideo: true,
        hasAudio: true,
      }),
    };
    setExtractCache(normalizedKey, resp);
    return resp;
  }

  // 5. TODAS AS OUTRAS PLATAFORMAS VIA YT-DLP -J (Instagram, Facebook, X, XVideos, Pornhub, XNXX, Vimeo, Pinterest, etc.)
  const ytdlpData = await runYtDlpJson(url);
  if (ytdlpData) {
    const entries = Array.isArray(ytdlpData.entries) ? ytdlpData.entries : null;
    const item = entries && entries.length > 0 ? entries[0] : ytdlpData;

    const title = item.title || item.fulltitle || "Mídia Original";
    const author =
      item.uploader || item.channel || item.creator || item.uploader_id || detected.platformLabel;
    const sortedThumbs = Array.isArray(item.thumbnails)
      ? [...item.thumbnails]
          .filter((t: any) => t?.url)
          .sort(
            (a: any, b: any) =>
              ((b.width || 0) * (b.height || 0) || b.preference || 0) -
              ((a.width || 0) * (a.height || 0) || a.preference || 0)
          )
      : [];
    const thumb = sortedThumbs[0]?.url || item.thumbnail || "";
    const duration =
      item.duration_string ||
      (item.duration
        ? `${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, "0")}`
        : undefined);

    const itemFormats: any[] = Array.isArray(item.formats) ? item.formats : [];
    const hasVideo = itemFormats.some((f) => f.vcodec && f.vcodec !== "none") || Boolean(item.duration);
    const hasAudio =
      itemFormats.some((f) => f.acodec && f.acodec !== "none") || hasVideo;

    // Escolhe o stream progressivo de MAIOR resolução e bitrate disponível
    const directProgressive = [...itemFormats]
      .filter(
        (f: any) =>
          f.url &&
          f.ext === "mp4" &&
          f.vcodec !== "none" &&
          f.acodec !== "none"
      )
      .sort((a: any, b: any) => (b.height || 0) - (a.height || 0) || (b.tbr || 0) - (a.tbr || 0))[0]
      ?.url;

    const directImage =
      thumb ||
      (typeof item.url === "string" && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(item.url)
        ? item.url
        : undefined);

    const resp: ExtractedMediaResponse = {
      success: true,
      url,
      title,
      author,
      thumbnail: directImage || "",
      duration,
      platform: detected.platform,
      platformLabel: detected.platformLabel,
      detectedMediaKind: hasVideo ? "video" : hasAudio ? "audio" : "image",
      formats: buildFormatsList({
        pageUrl: url,
        directVideoUrl: directProgressive,
        directImageUrl: directImage || undefined,
        hasVideo,
        hasAudio,
      }),
    };
    setExtractCache(normalizedKey, resp);
    return resp;
  }

  // 6. RASPADOR UNIVERSAL HTML/JSON (Kwai, Pinterest, Instagram Photo/Reel, Facebook, páginas HTML5, sites web caso yt-dlp falhe)
  try {
    const scraped = await scrapeWebPageMedia(url);
    const redirectedToPhHome =
      /^https?:\/\/[^\/]*pornhub\.(?:com|org)\/?(\?.*)?$/i.test(scraped.finalUrl || "") &&
      /viewkey=/i.test(url);

    if (scraped.unavailable || redirectedToPhHome) {
      return {
        success: false,
        url,
        title: "Vídeo indisponível na plataforma",
        author: detected.platformLabel,
        thumbnail: "",
        platform: detected.platform,
        platformLabel: detected.platformLabel,
        formats: [],
        error: scraped.unavailableReason || "Este vídeo foi removido, é privado ou está indisponível na plataforma.",
      };
    }

    const hasVideo = scraped.videoUrls.length > 0;
    const hasAudio = scraped.audioUrls.length > 0;
    const hasImage = scraped.imageUrls.length > 0;

    if (hasVideo || hasAudio || hasImage) {
      const sortedBestVideos = sortVideoCandidatesByQuality(scraped.videoUrls, "best");
      const resp: ExtractedMediaResponse = {
        success: true,
        url: scraped.finalUrl || url,
        title: scraped.title || `Mídia (${detected.platformLabel})`,
        author: scraped.author || detected.platformLabel,
        thumbnail: scraped.imageUrls[0] || scraped.thumbnail || "",
        duration: scraped.duration,
        platform: detected.platform,
        platformLabel: detected.platformLabel,
        detectedMediaKind: hasVideo ? "video" : hasAudio ? "audio" : "image",
        formats: buildFormatsList({
          pageUrl: scraped.finalUrl || url,
          directVideoUrl: sortedBestVideos[0]?.url,
          directAudioUrl: scraped.audioUrls[0] || sortedBestVideos[0]?.url,
          directImageUrl: scraped.imageUrls[0] || scraped.thumbnail,
          hasVideo,
          hasAudio: hasAudio || hasVideo,
        }),
      };
      setExtractCache(normalizedKey, resp);
      return resp;
    }
  } catch {}

  return {
    success: false,
    url,
    title: "Não foi possível extrair mídia deste link",
    author: detected.platformLabel,
    thumbnail: "",
    platform: detected.platform,
    platformLabel: detected.platformLabel,
    formats: [],
    error: "Nenhuma mídia direta encontrada neste endereço (link privado, expirado ou protegido por login).",
  };
}

/**
 * Proxy seguro para miniaturas/imagens (evita bloqueio CORP/CORS/Referer de CDNs como Instagram, TikTok, Kwai, etc.)
 */
export async function proxyMediaThumbnail(req: IncomingMessage, res: ServerResponse) {
  try {
    const parsedUrl = new URL(req.url || "", "http://localhost");
    const targetUrl = parsedUrl.searchParams.get("url") || "";
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      res.statusCode = 400;
      res.end("Missing valid url");
      return;
    }

    const remoteOrigin = new URL(targetUrl).origin;
    const remoteRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: remoteOrigin,
        Accept: "image/*,*/*;q=0.8",
      },
    });

    if (!remoteRes.ok || !remoteRes.body) {
      res.statusCode = 404;
      res.end("Thumbnail unavailable");
      return;
    }

    const ct = remoteRes.headers.get("content-type") || "image/jpeg";
    res.statusCode = 200;
    res.setHeader("Content-Type", ct);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "public, max-age=3600");

    const len = remoteRes.headers.get("content-length");
    if (len) res.setHeader("Content-Length", len);

    const nodeStream = Readable.fromWeb(remoteRes.body as any);
    nodeStream.pipe(res);
  } catch {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end("Proxy error");
    }
  }
}

function parseTargetHeight(quality: string): number {
  const q = (quality || "").toLowerCase();
  if (q === "best" || q === "max" || q === "auto") return 4320;
  if (q.includes("8k") || q.includes("4320")) return 4320;
  if (q.includes("4k") || q.includes("2160")) return 2160;
  if (q.includes("1440")) return 1440;
  if (q.includes("1080")) return 1080;
  if (q.includes("720")) return 720;
  if (q.includes("480")) return 480;
  if (q.includes("360")) return 360;
  return 4320;
}

function buildYtDlpFormatSelector(quality: string, isAudio: boolean): string {
  if (isAudio) {
    return "ba/b";
  }
  const q = (quality || "").toLowerCase();
  if (q === "best" || q === "max" || q === "auto" || q === "") {
    return "bv*+ba/b/best";
  }
  const h = parseTargetHeight(q);
  if (h >= 2160) {
    return "bv*[height<=4320]+ba/b[height<=4320]/bv*+ba/b/best";
  }
  if (h === 1080) {
    return "bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b/best";
  }
  if (h === 720) {
    return "bv*[height<=720]+ba/b[height<=720]/bv*+ba/b/best";
  }
  if (h === 480) {
    return "bv*[height<=480]+ba/b[height<=480]/bv*+ba/b/best";
  }
  return "bv*+ba/b/best";
}

function sortVideoCandidatesByQuality(
  candidates: ScrapedVideoCandidate[],
  targetQuality: string
): ScrapedVideoCandidate[] {
  const targetH = parseTargetHeight(targetQuality);
  return [...candidates].sort((a, b) => {
    const ah = a.height ?? parseQualityHeight(a.quality) ?? 0;
    const bh = b.height ?? parseQualityHeight(b.quality) ?? 0;

    // 1. Preferir resoluções <= targetH em ordem decrescente (ex: pediu MAX/4K -> melhor absoluta > 1080 > 720)
    const aFits = ah > 0 && ah <= targetH ? 1 : 0;
    const bFits = bh > 0 && bh <= targetH ? 1 : 0;
    if (aFits !== bFits) return bFits - aFits;
    if (aFits && bFits && ah !== bh) return bh - ah;

    // 2. Se ambos acima de targetH, preferir a melhor resolução mais próxima do alvo
    if (ah > targetH && bh > targetH && ah !== bh) return ah - bh;

    // 3. Conhecidos antes de desconhecidos
    if ((ah > 0 ? 1 : 0) !== (bh > 0 ? 1 : 0)) return (bh > 0 ? 1 : 0) - (ah > 0 ? 1 : 0);

    // 4. Em mesma altura, preferir MP4 direto antes de HLS
    const aIsHls = a.url.includes(".m3u8") ? 1 : 0;
    const bIsHls = b.url.includes(".m3u8") ? 1 : 0;
    return aIsHls - bIsHls;
  });
}

function formatBytesMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseYtDlpSizeToBytes(valStr: string, unitStr: string): number {
  const val = parseFloat(valStr);
  if (Number.isNaN(val)) return 0;
  const u = unitStr.toLowerCase();
  if (u.startsWith("gib") || u.startsWith("gb")) return Math.round(val * 1024 * 1024 * 1024);
  if (u.startsWith("mib") || u.startsWith("mb")) return Math.round(val * 1024 * 1024);
  if (u.startsWith("kib") || u.startsWith("kb")) return Math.round(val * 1024);
  return Math.round(val);
}

/**
 * Baixa um stream direto HTTP/HTTPS com aceleração multi-conexão (até 6 threads HTTP Range paralelas)
 * para máxima velocidade em CDNs de vídeo/áudio/imagem, com fallback automático para stream contínuo.
 */
async function downloadDirectUrlToFile(
  targetUrl: string,
  destPath: string,
  job: MediaJobState,
  extraHeaders?: Record<string, string>,
  silentProgress = false
): Promise<{ ok: boolean; contentType: string; totalBytes: number; error?: string }> {
  const controller = new AbortController();
  if (!silentProgress) {
    job.abortController = controller;
  }

  try {
    const origin = new URL(targetUrl).origin;
    const reqHeaders = {
      "User-Agent": USER_AGENT,
      Referer: origin,
      ...extraHeaders,
    };

    // Tenta modo multi-conexão paralelo (6 threads) se arquivo >= 3 MB e CDN aceitar Range
    try {
      const headRes = await fetch(targetUrl, {
        method: "HEAD",
        headers: reqHeaders,
        redirect: "follow",
        signal: AbortSignal.timeout(4500),
      });
      const contentLen = parseInt(headRes.headers.get("content-length") || "0", 10) || 0;
      const acceptRanges = (headRes.headers.get("accept-ranges") || "").toLowerCase();
      const headType = (headRes.headers.get("content-type") || "").toLowerCase();

      if (
        headRes.ok &&
        acceptRanges === "bytes" &&
        contentLen >= 3 * 1024 * 1024 &&
        !headType.includes("text/html") &&
        !headType.includes("application/json")
      ) {
        const CHUNK = Math.max(1024 * 1024, Math.min(6 * 1024 * 1024, Math.ceil(contentLen / 6)));
        const ranges: { start: number; end: number }[] = [];
        for (let off = 0; off < contentLen; off += CHUNK) {
          ranges.push({ start: off, end: Math.min(contentLen - 1, off + CHUNK - 1) });
        }

        const fh = await fs.promises.open(destPath, "w+");
        await fh.truncate(contentLen);

        let received = 0;
        let lastReportTime = Date.now();
        let lastBytes = 0;
        let nextIdx = 0;
        let abortedError = "";

        const rangeAbort = new AbortController();
        const onParentAbort = () => rangeAbort.abort();
        controller.signal.addEventListener("abort", onParentAbort, { once: true });

        const worker = async () => {
          while (!rangeAbort.signal.aborted) {
            if ((job.status as string) === "paused") return;
            const i = nextIdx++;
            if (i >= ranges.length) return;
            const r = ranges[i];

            let partOk = false;
            for (let attempt = 0; attempt < 2; attempt++) {
              try {
                const segRes = await fetch(targetUrl, {
                  signal: rangeAbort.signal,
                  headers: {
                    ...reqHeaders,
                    Range: `bytes=${r.start}-${r.end}`,
                  },
                  redirect: "follow",
                });
                if (!segRes.ok || !segRes.body) continue;
                const reader = segRes.body.getReader();
                let writePos = r.start;
                while (true) {
                  if ((job.status as string) === "paused" || rangeAbort.signal.aborted) {
                    rangeAbort.abort();
                    return;
                  }
                  const { done, value } = await reader.read();
                  if (done) break;
                  if (value && value.length > 0 && !rangeAbort.signal.aborted) {
                    await fh.write(value, 0, value.length, writePos);
                    writePos += value.length;
                    received += value.length;
                  }

                  if (!silentProgress && !rangeAbort.signal.aborted) {
                    const now = Date.now();
                    const dt = (now - lastReportTime) / 1000;
                    if (dt >= 0.18) {
                      const speedMb = ((received - lastBytes) / (1024 * 1024)) / (dt || 0.18);
                      lastReportTime = now;
                      lastBytes = received;

                      const pct = Math.min(96, Math.floor((received / contentLen) * 95));
                      job.status = "downloading";
                      job.percentage = pct;
                      job.downloadedSize = formatBytesMB(received);
                      job.totalSize = formatBytesMB(contentLen);
                      job.transferRate = `${Math.max(0.2, speedMb).toFixed(1)} MB/s`;
                      job.statusText = `Baixando em alta velocidade 6-Threads (${job.downloadedSize})...`;
                      job.updatedAt = now;
                    }
                  }
                }
                partOk = true;
                break;
              } catch {
                if ((job.status as string) === "paused" || rangeAbort.signal.aborted) return;
              }
            }
            if (!partOk) {
              abortedError = "Falha parcial em segmento paralelo";
              rangeAbort.abort();
              throw new Error(abortedError);
            }
          }
        };

        const concurrency = Math.min(6, ranges.length);
        const workers = Array.from({ length: concurrency }, () => worker());
        try {
          await Promise.all(workers);
          await fh.close();
          if ((job.status as string) === "paused") {
            return { ok: false, contentType: headType, totalBytes: received, error: "Pausado" };
          }
          const stat = fs.statSync(destPath);
          if (stat.size >= contentLen * 0.98) {
            return { ok: true, contentType: headType, totalBytes: stat.size };
          }
        } catch {
          rangeAbort.abort();
          await Promise.allSettled(workers);
          await fh.close().catch(() => {});
          // Continua para fallback de conexão única abaixo
        } finally {
          controller.signal.removeEventListener("abort", onParentAbort);
        }
      }
    } catch {}

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: reqHeaders,
      redirect: "follow",
    });

    if (!res.ok || !res.body) {
      return { ok: false, contentType: "", totalBytes: 0, error: `HTTP ${res.status}` };
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const contentLength = parseInt(res.headers.get("content-length") || "0", 10) || 0;

    const writeStream = fs.createWriteStream(destPath);
    const reader = res.body.getReader();

    let received = 0;
    let lastReportTime = Date.now();
    let lastBytes = 0;

    while (true) {
      if (job.status === "paused") {
        controller.abort();
        writeStream.close();
        return { ok: false, contentType, totalBytes: received, error: "Pausado" };
      }

      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        writeStream.write(value);
        received += value.length;
      }

      if (!silentProgress) {
        const now = Date.now();
        const dt = (now - lastReportTime) / 1000;
        if (dt >= 0.2) {
          const speedMb = ((received - lastBytes) / (1024 * 1024)) / (dt || 0.2);
          lastReportTime = now;
          lastBytes = received;

          const pct = contentLength > 0 ? Math.min(96, Math.floor((received / contentLength) * 95)) : 45;
          job.status = "downloading";
          job.percentage = pct;
          job.downloadedSize = formatBytesMB(received);
          job.totalSize = contentLength > 0 ? formatBytesMB(contentLength) : formatBytesMB(received);
          job.transferRate = `${Math.max(0.1, speedMb).toFixed(1)} MB/s`;
          job.statusText = `Baixando mídia original no servidor (${job.downloadedSize})...`;
          job.updatedAt = now;
        }
      }
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end(() => resolve());
      writeStream.on("error", reject);
    });

    const stat = fs.statSync(destPath);
    return { ok: stat.size > 0, contentType, totalBytes: stat.size };
  } catch (err: any) {
    return { ok: false, contentType: "", totalBytes: 0, error: err?.message || "Erro no fetch" };
  } finally {
    if (!silentProgress) {
      job.abortController = null;
    }
  }
}

/**
 * Executa ffmpeg para converter/remuxar áudio (MP3), vídeo (HLS -> MP4) ou imagem (WebP/AVIF -> JPG/PNG)
 */
async function runFfmpegProcess(args: string[], job: MediaJobState): Promise<boolean> {
  const ffmpegBin = getFfmpegPath();
  return new Promise<boolean>((resolve) => {
    const proc = spawn(ffmpegBin, args, { stdio: ["ignore", "pipe", "pipe"] });
    job.proc = proc;

    proc.on("close", (code) => {
      job.proc = null;
      resolve(code === 0);
    });
    proc.on("error", () => {
      job.proc = null;
      resolve(false);
    });
  });
}

/**
 * Executa o download real no servidor usando yt-dlp (com 8 fragmentos paralelos, retomada -c e progresso real)
 */
async function runYtDlpDownloadToJob(
  rawTargetUrl: string,
  jobDir: string,
  job: MediaJobState,
  extraClientArgs: string[] = [],
  useImpersonate?: boolean,
  overrideFormat?: string
): Promise<{ ok: boolean; filePath?: string; error?: string; rawError?: string }> {
  const targetUrl = normalizeTargetUrl(rawTargetUrl);
  const ytDlpBin = await ensureYtDlpBinary();
  const ffmpegBin = getFfmpegPath();
  const isAudio = job.type === "audio";
  const formatSelector = overrideFormat || buildYtDlpFormatSelector(job.quality, isAudio);
  const outTemplate = path.join(jobDir, "media.%(ext)s");
  const impersonate = useImpersonate ?? isAdultDomain(targetUrl);
  const cookiesPath = getActiveCookiesPath();
  const proxyUrl = getActiveProxyUrl();
  const targetH = parseTargetHeight(job.quality);
  const sortOrder = isAudio
    ? "abr"
    : targetH >= 4320
    ? "res,fps,vcodec:h264,acodec:m4a"
    : `res:${targetH},fps,vcodec:h264,acodec:m4a`;

  const args = [
    "--js-runtimes",
    "node:/usr/local/bin/node",
    "--ffmpeg-location",
    ffmpegBin,
    "--no-playlist",
    "--no-warnings",
    "--newline",
    "--continue",
    "--concurrent-fragments",
    "8",
    "--http-chunk-size",
    "10M",
    "--buffer-size",
    "64K",
    "--retries",
    "3",
    "--fragment-retries",
    "5",
    "--extractor-retries",
    "3",
    ...(impersonate ? ["--impersonate", "chrome"] : ["--user-agent", USER_AGENT]),
    ...(cookiesPath ? ["--cookies", cookiesPath] : []),
    ...(proxyUrl ? ["--proxy", proxyUrl] : []),
    "-S",
    sortOrder,
    "-f",
    formatSelector,
    ...extraClientArgs,
  ];

  if (isAudio) {
    const bitrate = getAudioBitrate(job.quality).toUpperCase();
    args.push("-x", "--audio-format", "mp3", "--postprocessor-args", `ffmpeg:-b:a ${bitrate}`);
  } else {
    args.push("--merge-output-format", "mp4");
  }

  args.push("-o", outTemplate, targetUrl);

  return new Promise((resolve) => {
    const proc = spawn(ytDlpBin, args);
    job.proc = proc;
    let stderrLog = "";

    const handleLine = (line: string) => {
      // [download]  42.3% of   77.16MiB at   51.84MiB/s ETA 00:01
      const m = line.match(
        /\[download\]\s+(\d+(?:\.\d+)?)%\s+of\s+~?\s*(\d+(?:\.\d+)?)\s*(GiB|MiB|KiB|GB|MB|KB|B)(?:\s+at\s+(\d+(?:\.\d+)?\s*(?:GiB|MiB|KiB|GB|MB|KB|B)\/s))?/i
      );
      if (m) {
        const pct = Math.min(95, Math.floor(parseFloat(m[1]) * 0.92));
        const totalB = parseYtDlpSizeToBytes(m[2], m[3]);
        const downloadedB = Math.round((totalB * parseFloat(m[1])) / 100);
        job.status = "downloading";
        job.percentage = Math.max(job.percentage, pct);
        job.totalSize = totalB > 0 ? formatBytesMB(totalB) : job.totalSize;
        job.downloadedSize = downloadedB > 0 ? formatBytesMB(downloadedB) : job.downloadedSize;
        job.transferRate = m[4] ? m[4].replace(/iB/gi, "B") : job.transferRate;
        job.statusText = `Extraindo e baixando stream original (${Math.round(parseFloat(m[1]))}%)...`;
        job.updatedAt = Date.now();
      } else if (line.includes("[Merger]") || line.includes("[ExtractAudio]")) {
        job.status = "merging";
        job.percentage = 95;
        job.statusText = isAudio
          ? "Convertendo para MP3 HQ no servidor..."
          : "Finalizando e unindo vídeo + áudio MP4...";
        job.updatedAt = Date.now();
      }
    };

    proc.stdout.on("data", (chunk: Buffer) => {
      const lines = chunk.toString("utf8").split(/\r?\n/);
      for (const l of lines) handleLine(l);
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderrLog += text;
      const lines = text.split(/\r?\n/);
      for (const l of lines) handleLine(l);
    });

    proc.on("close", (code) => {
      job.proc = null;
      if (job.status === "paused") {
        resolve({ ok: false, error: "Pausado pelo usuário" });
        return;
      }

      if (code === 0) {
        try {
          const files = fs
            .readdirSync(jobDir)
            .filter((f) => !f.endsWith(".part") && !f.endsWith(".ytdl"));
          const preferred =
            files.find((f) => f.endsWith(isAudio ? ".mp3" : ".mp4")) || files[0];
          if (preferred) {
            const fullPath = path.join(jobDir, preferred);
            const stat = fs.statSync(fullPath);
            if (stat.size > 0) {
              resolve({ ok: true, filePath: fullPath });
              return;
            }
          }
        } catch {}
      }

      const parsedErr = formatYtDlpError(stderrLog);
      resolve({
        ok: false,
        error: parsedErr.message,
        rawError: stderrLog,
      });
    });

    proc.on("error", (err) => {
      job.proc = null;
      resolve({ ok: false, error: err.message, rawError: err.message });
    });
  });
}

/**
 * Valida que um arquivo baixado existe, tem tamanho real (> 8KB) e não é uma página HTML/JSON disfarçada.
 */
function isValidMediaFile(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    if (stat.size < 8192) return false;
    const fd = fs.openSync(filePath, "r");
    const headBuf = Buffer.alloc(64);
    fs.readSync(fd, headBuf, 0, 64, 0);
    fs.closeSync(fd);
    const headStr = headBuf.toString("utf8").trimStart().toLowerCase();
    if (
      headStr.startsWith("<!doctype") ||
      headStr.startsWith("<html") ||
      headStr.startsWith("<head") ||
      headStr.startsWith("{")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Camada B YouTube: Extrator nativo @distube/ytdl-core com PO Token e clientes TV/MWEB/Embed
 */
async function downloadYouTubeViaYtdlCore(
  ytUrl: string,
  jobDir: string,
  job: MediaJobState
): Promise<{ ok: boolean; filePath?: string; contentType?: string }> {
  try {
    const rawCookie = getActiveCookiesRaw();
    const ytdl = new Ytdl({
      cookie: rawCookie || undefined,
      clients: [Client.Tv, Client.Mweb, Client.WebEmbedded, Client.VisionOS],
      timeoutMs: 12000,
    });

    const controller = new AbortController();
    job.abortController = controller;
    const timer = setTimeout(() => controller.abort(), 14000);
    const info = await ytdl.getInfo(ytUrl, { signal: controller.signal }).finally(() => clearTimeout(timer));
    job.abortController = null;

    if ((job.status as string) === "paused") return { ok: false };

    const formats = Array.isArray(info?.formats) ? info.formats : [];
    const targetH = parseTargetHeight(job.quality);

    if (job.type === "audio") {
      const audioFmts = formats
        .filter((f) => f.hasAudio && f.url)
        .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
      const picked = audioFmts[0];
      if (!picked?.url) return { ok: false };

      const rawPath = path.join(jobDir, "ytdl_audio.bin");
      const dl = await downloadDirectUrlToFile(picked.url, rawPath, job);
      if (!dl.ok || !isValidMediaFile(rawPath)) return { ok: false };

      const mp3Path = path.join(jobDir, "ytdl_media.mp3");
      const bitrate = getAudioBitrate(job.quality);
      job.status = "merging";
      job.percentage = 92;
      job.statusText = "Convertendo áudio MP3 em alta definição...";
      const ok = await runFfmpegProcess(
        ["-y", "-i", rawPath, "-vn", "-c:a", "libmp3lame", "-b:a", bitrate, mp3Path],
        job
      );
      if (ok && isValidMediaFile(mp3Path)) {
        try { fs.unlinkSync(rawPath); } catch {}
        return { ok: true, filePath: mp3Path, contentType: "audio/mpeg" };
      }
      return { ok: false };
    }

    // Primeiro ordena adaptive video-only e áudio para garantir máxima resolução (evita prender em combinado 360p!)
    const videoOnly = formats
      .filter((f) => f.hasVideo && !f.hasAudio && f.url)
      .sort((a, b) => {
        const ah = a.height || 0;
        const bh = b.height || 0;
        const aFits = ah <= targetH ? 1 : 0;
        const bFits = bh <= targetH ? 1 : 0;
        if (aFits !== bFits) return bFits - aFits;
        if (aFits && bFits && ah !== bh) return bh - ah;
        return bh - ah;
      });
    const audioOnly = formats
      .filter((f) => !f.hasVideo && f.hasAudio && f.url)
      .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));

    const combined = formats
      .filter((f) => f.hasVideo && f.hasAudio && f.url)
      .sort((a, b) => {
        const ah = a.height || 0;
        const bh = b.height || 0;
        const aFits = ah <= targetH ? 1 : 0;
        const bFits = bh <= targetH ? 1 : 0;
        if (aFits !== bFits) return bFits - aFits;
        return bh - ah;
      });

    const maxAdaptiveH = videoOnly[0]?.height || 0;
    const maxCombinedH = combined[0]?.height || 0;

    // Só usa combinado direto se já igualar a melhor resolução disponível; senão baixa vídeo + áudio em PARALELO!
    if (combined[0]?.url && maxCombinedH >= maxAdaptiveH) {
      const outPath = path.join(jobDir, "ytdl_video.mp4");
      const dl = await downloadDirectUrlToFile(combined[0].url, outPath, job);
      if (dl.ok && isValidMediaFile(outPath)) {
        return { ok: true, filePath: outPath, contentType: "video/mp4" };
      }
    }

    if (videoOnly[0]?.url && audioOnly[0]?.url) {
      const vPath = path.join(jobDir, "ytdl_v.bin");
      const aPath = path.join(jobDir, "ytdl_a.bin");
      const [dlV, dlA] = await Promise.all([
        downloadDirectUrlToFile(videoOnly[0].url, vPath, job),
        downloadDirectUrlToFile(audioOnly[0].url, aPath, job, undefined, true),
      ]);
      if (dlV.ok && dlA.ok && isValidMediaFile(vPath) && isValidMediaFile(aPath)) {
        const mergedPath = path.join(jobDir, "ytdl_merged.mp4");
        job.status = "merging";
        job.percentage = 93;
        job.statusText = "Unindo vídeo e áudio em máxima definição...";
        const ok = await runFfmpegProcess(
          ["-y", "-i", vPath, "-i", aPath, "-c", "copy", "-movflags", "+faststart", mergedPath],
          job
        );
        if (ok && isValidMediaFile(mergedPath)) {
          try { fs.unlinkSync(vPath); fs.unlinkSync(aPath); } catch {}
          return { ok: true, filePath: mergedPath, contentType: "video/mp4" };
        }
      }
    }

    if (combined[0]?.url) {
      const outPath = path.join(jobDir, "ytdl_video.mp4");
      const dl = await downloadDirectUrlToFile(combined[0].url, outPath, job);
      if (dl.ok && isValidMediaFile(outPath)) {
        return { ok: true, filePath: outPath, contentType: "video/mp4" };
      }
    }
    return { ok: false };
  } catch {
    job.abortController = null;
    return { ok: false };
  }
}

/**
 * Camada C1 YouTube: Instância Cobalt configurada via variável de ambiente COBALT_API_URL (silenciosa)
 */
async function downloadYouTubeViaCobaltEnv(
  ytUrl: string,
  jobDir: string,
  job: MediaJobState
): Promise<{ ok: boolean; filePath?: string; contentType?: string }> {
  const cobaltBase = (process.env.COBALT_API_URL || "").trim().replace(/\/+$/, "");
  if (!cobaltBase) return { ok: false };

  try {
    const isAudio = job.type === "audio";
    const targetH = parseTargetHeight(job.quality);
    const vq = targetH >= 2160 ? "2160" : targetH >= 1080 ? "1080" : targetH >= 720 ? "720" : "480";
    const res = await fetch(`${cobaltBase}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        url: ytUrl,
        downloadMode: isAudio ? "audio" : "auto",
        videoQuality: vq,
        audioFormat: "mp3",
        audioBitrate: getAudioBitrate(job.quality).replace("k", ""),
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data: any = await res.json().catch(() => null);
    const dlUrl = data?.url;
    if (!dlUrl || typeof dlUrl !== "string") return { ok: false };

    const outPath = path.join(jobDir, isAudio ? "cobalt.mp3" : "cobalt.mp4");
    const dl = await downloadDirectUrlToFile(dlUrl, outPath, job);
    if (dl.ok && isValidMediaFile(outPath)) {
      return { ok: true, filePath: outPath, contentType: isAudio ? "audio/mpeg" : "video/mp4" };
    }
  } catch {}
  return { ok: false };
}

/**
 * Camada C2 YouTube: Motor automático externo cnvmp3 com cascata de qualidade e verificação binária real
 */
async function downloadYouTubeViaCnvmp3(
  ytUrl: string,
  jobDir: string,
  job: MediaJobState
): Promise<{ ok: boolean; filePath?: string; contentType?: string }> {
  const ytId = extractYouTubeId(ytUrl);
  if (!ytId) return { ok: false };

  const cnvUa = "Mozilla/5.0";
  const isAudio = job.type === "audio";
  const formatValue = isAudio ? 1 : 0;

  const reqBitrate = getAudioBitrate(job.quality);
  // Mapeamento de qualidades com fallback automático para melhor disponível
  const qualityCandidates: number[] = isAudio
    ? reqBitrate === "128k"
      ? [4, 1, 0]
      : reqBitrate === "256k"
      ? [1, 0, 4]
      : reqBitrate === "192k"
      ? [1, 0, 4] // baixa 256k/320k e converte exatamente para 192k via FFmpeg se necessário
      : [0, 1, 4] // 0 = 320kbps, 1 = 256kbps, 4 = 128kbps
    : job.quality.toLowerCase().includes("480")
    ? [480, 720, 360, 1080]
    : job.quality.toLowerCase().includes("720")
    ? [720, 1080, 480, 360]
    : [1080, 720, 480, 360]; // 4K ou 1080p tenta 1080p -> 720p -> 480p -> 360p

  try {
    job.statusText = "Conectando ao resolvedor automático de YouTube...";
    const cookieMap = new Map<string, string>();
    try {
      const initRes = await fetch("https://cnvmp3.com/v55", {
        headers: { "User-Agent": cnvUa },
        signal: AbortSignal.timeout(10000),
      });
      parseSetCookiesMap(initRes, cookieMap);
    } catch {}

    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": cnvUa,
      Origin: "https://cnvmp3.com",
      Referer: "https://cnvmp3.com/v55",
      ...(cookieMap.size > 0 ? { Cookie: serializeCookieMap(cookieMap) } : {}),
    };

    let videoTitle = "YouTube Video";
    try {
      const metaRes = await fetch("https://cnvmp3.com/get_video_data.php", {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify({ url: ytUrl, token: "1234" }),
        signal: AbortSignal.timeout(10000),
      });
      const metaJson: any = await metaRes.json().catch(() => null);
      if (metaJson?.success && metaJson?.title) {
        videoTitle = String(metaJson.title);
      }
    } catch {}

    for (const qVal of qualityCandidates) {
      if ((job.status as string) === "paused") return { ok: false };

      let downloadLink = "";

      // 1. Consulta cache rápido primeiro
      try {
        const dbRes = await fetch("https://cnvmp3.com/check_database.php", {
          method: "POST",
          headers: baseHeaders,
          body: JSON.stringify({
            youtube_id: ytId,
            quality: qVal,
            formatValue,
          }),
          signal: AbortSignal.timeout(8000),
        });
        const dbJson: any = await dbRes.json().catch(() => null);
        if (dbJson?.success && dbJson?.data?.server_path) {
          downloadLink = String(dbJson.data.server_path);
        }
      } catch {}

      // 2. Se não estiver em cache, converte agora
      if (!downloadLink) {
        try {
          job.status = "downloading";
          job.percentage = Math.max(job.percentage, 18);
          job.statusText = isAudio
            ? "Convertendo áudio MP3 em alta qualidade..."
            : `Preparando stream MP4 (${qVal}p / melhor disponível)...`;

          const dlApiRes = await fetch("https://cnvmp3.com/download_video_ucep.php", {
            method: "POST",
            headers: baseHeaders,
            body: JSON.stringify({
              url: ytUrl,
              quality: qVal,
              title: videoTitle,
              formatValue,
            }),
            signal: AbortSignal.timeout(45000),
          });
          const dlJson: any = await dlApiRes.json().catch(() => null);
          if (dlJson?.success && dlJson?.download_link) {
            downloadLink = String(dlJson.download_link);
          }
        } catch {}
      }

      if (!downloadLink) continue;

      const normalizedLink = downloadLink.replace(/ /g, "%20");
      const outPath = path.join(jobDir, isAudio ? `cnv_${qVal}.mp3` : `cnv_${qVal}.mp4`);
      const dl = await downloadDirectUrlToFile(normalizedLink, outPath, job, {
        "User-Agent": cnvUa,
        Referer: "https://cnvmp3.com/",
      });

      if (
        dl.ok &&
        !dl.contentType.includes("text/html") &&
        !dl.contentType.includes("application/json") &&
        isValidMediaFile(outPath)
      ) {
        if (isAudio && reqBitrate === "192k") {
          const transcoded192 = path.join(jobDir, "cnv_192k.mp3");
          const ok192 = await runFfmpegProcess(
            ["-y", "-i", outPath, "-vn", "-c:a", "libmp3lame", "-b:a", "192k", transcoded192],
            job
          );
          if (ok192 && isValidMediaFile(transcoded192)) {
            try { fs.unlinkSync(outPath); } catch {}
            return { ok: true, filePath: transcoded192, contentType: "audio/mpeg" };
          }
        }
        return {
          ok: true,
          filePath: outPath,
          contentType: isAudio ? "audio/mpeg" : "video/mp4",
        };
      }
      try { fs.unlinkSync(outPath); } catch {}
    }

    // Fallback para áudio: se conversão MP3 direta falhar, baixa MP4 leve e extrai MP3 via FFmpeg
    if (isAudio && (job.status as string) !== "paused") {
      for (const mp4Q of [360, 480, 720]) {
        if ((job.status as string) === "paused") return { ok: false };
        let downloadLink = "";
        try {
          const dbRes = await fetch("https://cnvmp3.com/check_database.php", {
            method: "POST",
            headers: baseHeaders,
            body: JSON.stringify({ youtube_id: ytId, quality: mp4Q, formatValue: 0 }),
            signal: AbortSignal.timeout(8000),
          });
          const dbJson: any = await dbRes.json().catch(() => null);
          if (dbJson?.success && dbJson?.data?.server_path) {
            downloadLink = String(dbJson.data.server_path);
          }
        } catch {}

        if (!downloadLink) {
          try {
            const dlApiRes = await fetch("https://cnvmp3.com/download_video_ucep.php", {
              method: "POST",
              headers: baseHeaders,
              body: JSON.stringify({
                url: ytUrl,
                quality: mp4Q,
                title: videoTitle,
                formatValue: 0,
              }),
              signal: AbortSignal.timeout(45000),
            });
            const dlJson: any = await dlApiRes.json().catch(() => null);
            if (dlJson?.success && dlJson?.download_link) {
              downloadLink = String(dlJson.download_link);
            }
          } catch {}
        }

        if (!downloadLink) continue;

        const rawMp4 = path.join(jobDir, `cnv_src_${mp4Q}.mp4`);
        const dl = await downloadDirectUrlToFile(downloadLink.replace(/ /g, "%20"), rawMp4, job, {
          "User-Agent": cnvUa,
          Referer: "https://cnvmp3.com/",
        });

        if (dl.ok && isValidMediaFile(rawMp4)) {
          const mp3Path = path.join(jobDir, `cnv_ext_${mp4Q}.mp3`);
          const bitrate = getAudioBitrate(job.quality);
          job.status = "merging";
          job.percentage = 92;
          job.statusText = "Extraindo áudio MP3 em alta qualidade...";
          const ok = await runFfmpegProcess(
            ["-y", "-i", rawMp4, "-vn", "-c:a", "libmp3lame", "-b:a", bitrate, mp3Path],
            job
          );
          try { fs.unlinkSync(rawMp4); } catch {}
          if (ok && isValidMediaFile(mp3Path)) {
            return { ok: true, filePath: mp3Path, contentType: "audio/mpeg" };
          }
        }
        try { fs.unlinkSync(rawMp4); } catch {}
      }
    }
  } catch {}
  return { ok: false };
}

/**
 * Executa todo o fluxo de extração e download real do job em segundo plano
 */
async function processMediaJob(job: MediaJobState) {
  const jobDir = path.join(JOBS_ROOT, job.id);
  fs.mkdirSync(jobDir, { recursive: true });

  const targetPageUrl = normalizeTargetUrl(job.pageUrl || job.url);
  const directUrlCandidate = job.url;

  try {
    // CASO A: DOWNLOAD DE IMAGEM ORIGINAL (JPG / PNG)
    if (job.type === "image") {
      job.status = "extracting";
      job.percentage = 15;
      job.statusText = "Localizando imagem em alta resolução...";

      let imageUrlToFetch = directUrlCandidate;

      // Se a URL passada for uma página web (e não arquivo de imagem direto), extrai a imagem real da página
      if (!/\.(jpg|jpeg|png|webp|gif|avif|bmp)(\?|$)/i.test(imageUrlToFetch)) {
        const meta = await extractMediaEngine(targetPageUrl);
        const directImgFmt = meta.formats.find(
          (f) => f.type === "image" && f.directUrl && f.directUrl !== targetPageUrl
        )?.directUrl;
        if (directImgFmt && /^https?:\/\//i.test(directImgFmt)) {
          imageUrlToFetch = directImgFmt;
        } else if (meta.thumbnail && /^https?:\/\//i.test(meta.thumbnail)) {
          imageUrlToFetch = meta.thumbnail;
        } else {
          try {
            const scraped = await scrapeWebPageMedia(targetPageUrl);
            if (scraped.imageUrls.length > 0) {
              imageUrlToFetch = scraped.imageUrls[0];
            }
          } catch {}
        }
      }

      const rawImgPath = path.join(jobDir, "raw_img");
      let dl = await downloadDirectUrlToFile(imageUrlToFetch, rawImgPath, job);

      // Se retornou HTML em vez de imagem, tenta raspar a página HTML
      if (!dl.ok || !dl.contentType.startsWith("image/")) {
        const scraped = await scrapeWebPageMedia(targetPageUrl);
        const foundImg = scraped.imageUrls[0];
        if (!foundImg) {
          throw new Error("Nenhuma imagem original encontrada neste link.");
        }
        dl = await downloadDirectUrlToFile(foundImg, rawImgPath, job);
        if (!dl.ok || !dl.contentType.startsWith("image/")) {
          throw new Error("O servidor remoto bloqueou o acesso direto à imagem.");
        }
      }

      const wantPng =
        job.quality.toLowerCase().includes("png") || job.filename.toLowerCase().endsWith(".png");
      const actualSrcPath = rawImgPath;
      const detectedCt = dl.contentType;

      // Se a imagem original já está em JPEG/PNG nativo desejado, entrega imediatamente sem recompressão!
      if ((detectedCt.includes("jpeg") || detectedCt.includes("jpg")) && !wantPng) {
        const finalStat = fs.statSync(actualSrcPath);
        job.filePath = actualSrcPath;
        job.contentType = "image/jpeg";
        job.totalBytes = finalStat.size;
        job.totalSize = formatBytesMB(finalStat.size);
        job.downloadedSize = formatBytesMB(finalStat.size);
        job.percentage = 100;
        job.status = "ready";
        job.statusText = "Imagem original em máxima resolução pronta!";
        job.updatedAt = Date.now();
        return;
      }
      if (detectedCt.includes("png") && wantPng) {
        const finalStat = fs.statSync(actualSrcPath);
        job.filePath = actualSrcPath;
        job.contentType = "image/png";
        job.totalBytes = finalStat.size;
        job.totalSize = formatBytesMB(finalStat.size);
        job.downloadedSize = formatBytesMB(finalStat.size);
        job.percentage = 100;
        job.status = "ready";
        job.statusText = "Imagem PNG original em máxima resolução pronta!";
        job.updatedAt = Date.now();
        return;
      }

      // Converte WebP/AVIF -> JPG/PNG sem perda
      const finalPath = path.join(jobDir, wantPng ? "image.png" : "image.jpg");
      job.status = "merging";
      job.percentage = 85;
      job.statusText = "Convertendo imagem em máxima definição...";

      const ffArgs = wantPng
        ? ["-y", "-i", actualSrcPath, finalPath]
        : ["-y", "-i", actualSrcPath, "-q:v", "1", finalPath];
      const converted = await runFfmpegProcess(ffArgs, job);

      const chosenPath = converted && fs.existsSync(finalPath) ? finalPath : actualSrcPath;
      const finalStat = fs.statSync(chosenPath);

      job.filePath = chosenPath;
      job.contentType = wantPng ? "image/png" : "image/jpeg";
      job.totalBytes = finalStat.size;
      job.totalSize = formatBytesMB(finalStat.size);
      job.downloadedSize = formatBytesMB(finalStat.size);
      job.percentage = 100;
      job.status = "ready";
      job.statusText = "Imagem pronta! Transferindo para o seu dispositivo...";
      job.updatedAt = Date.now();
      return;
    }

    // CASO B: VÍDEO OU ÁUDIO ORIGINAL
    job.status = "extracting";
    job.percentage = 8;
    job.statusText = "Conectando ao motor universal e analisando link...";

    // Resolve stream direto do cache/extrator se caller enviou apenas pageUrl
    let resolvedDirectUrl = directUrlCandidate;
    if (
      resolvedDirectUrl === targetPageUrl &&
      !isYouTubeUrl(targetPageUrl) &&
      !isPornhubUrl(targetPageUrl)
    ) {
      try {
        const cachedMeta = EXTRACT_CACHE.get(targetPageUrl)?.data || (await extractMediaEngine(targetPageUrl));
        if (cachedMeta?.detectedMediaKind === "image" && job.type === "video") {
          job.type = "image";
          job.quality = "8k";
          await processMediaJob(job);
          return;
        }
        const preferredFmt =
          job.type === "audio"
            ? cachedMeta?.formats.find((f) => f.type === "audio" && f.directUrl && f.directUrl !== targetPageUrl)
            : cachedMeta?.formats.find((f) => f.type === "video" && f.directUrl && f.directUrl !== targetPageUrl);
        if (preferredFmt?.directUrl) {
          resolvedDirectUrl = preferredFmt.directUrl;
        }
      } catch {}
    }

    // B1. Se já temos URL direta de CDN (TikTok, X/Twitter, FB, IG, Pinterest, Kwai, .mp4/.mp3 direto) — baixa em 6-Threads!
    const isDirectVideoOrAudioCdn =
      resolvedDirectUrl.includes("tikwm.com") ||
      resolvedDirectUrl.includes("tiktokcdn") ||
      resolvedDirectUrl.includes("video.twimg.com") ||
      resolvedDirectUrl.includes("fbcdn.net") ||
      resolvedDirectUrl.includes("cdninstagram.com") ||
      resolvedDirectUrl.includes("v1.pinimg.com") ||
      resolvedDirectUrl.includes("kwimgs.com") ||
      resolvedDirectUrl.includes("phncdn.com") ||
      resolvedDirectUrl.includes("xvideos-cdn.com") ||
      /\.(mp4|webm|mov|mp3|m4a|wav|aac)(\?|$)/i.test(resolvedDirectUrl);

    if (isDirectVideoOrAudioCdn) {
      const rawPath = path.join(jobDir, "direct_media.bin");
      const dl = await downloadDirectUrlToFile(resolvedDirectUrl, rawPath, job);

      if (
        dl.ok &&
        !dl.contentType.includes("text/html") &&
        !dl.contentType.includes("application/json") &&
        isValidMediaFile(rawPath)
      ) {
        if (job.type === "audio") {
          const mp3Path = path.join(jobDir, "media.mp3");
          const bitrate = getAudioBitrate(job.quality);
          job.status = "merging";
          job.percentage = 92;
          job.statusText = "Extraindo áudio MP3 em alta qualidade...";
          const ok = await runFfmpegProcess(
            ["-y", "-i", rawPath, "-vn", "-c:a", "libmp3lame", "-b:a", bitrate, mp3Path],
            job
          );
          if (ok && isValidMediaFile(mp3Path)) {
            try { fs.unlinkSync(rawPath); } catch {}
            const stat = fs.statSync(mp3Path);
            job.filePath = mp3Path;
            job.contentType = "audio/mpeg";
            job.totalBytes = stat.size;
            job.totalSize = formatBytesMB(stat.size);
            job.downloadedSize = formatBytesMB(stat.size);
            job.percentage = 100;
            job.status = "ready";
            job.statusText = "Áudio MP3 pronto! Salvando...";
            return;
          }
        } else {
          const mp4Path = path.join(jobDir, "media.mp4");
          fs.renameSync(rawPath, mp4Path);
          const stat = fs.statSync(mp4Path);
          job.filePath = mp4Path;
          job.contentType = "video/mp4";
          job.totalBytes = stat.size;
          job.totalSize = formatBytesMB(stat.size);
          job.downloadedSize = formatBytesMB(stat.size);
          job.percentage = 100;
          job.status = "ready";
          job.statusText = "Vídeo pronto! Salvando...";
          return;
        }
      }
    }

    // B2. Motor principal YT-DLP (se Pornhub já estiver em cache geo-desbloqueado, pula direto para B4)
    const phCachedHit = isPornhubUrl(targetPageUrl)
      ? PH_SCRAPE_CACHE.get(targetPageUrl)
      : undefined;
    const hasFreshPhCache = Boolean(phCachedHit && phCachedHit.expiresAt > Date.now());

    let ytRes: { ok: boolean; filePath?: string; error?: string; rawError?: string } = { ok: false };
    if (!hasFreshPhCache) {
      ytRes = await runYtDlpDownloadToJob(targetPageUrl, jobDir, job);

      if (!ytRes.ok && (job.status as string) !== "paused") {
        if (isYouTubeUrl(targetPageUrl)) {
          job.statusText = "Aplicando clientes alternativos de extração...";
          ytRes = await runYtDlpDownloadToJob(targetPageUrl, jobDir, job, [
            "--extractor-args",
            "youtube:player_client=android_vr,mweb,tv,ios",
          ]);
        } else if (!isAdultDomain(targetPageUrl)) {
          job.statusText = "Tentando extração com perfil de navegador Chrome...";
          ytRes = await runYtDlpDownloadToJob(targetPageUrl, jobDir, job, [], true);
        } else if (!isPornhubUrl(targetPageUrl)) {
          // Fallback automático de formato para demais sites adultos caso o seletor rígido falhe
          job.statusText = "Selecionando automaticamente a melhor qualidade disponível...";
          ytRes = await runYtDlpDownloadToJob(
            targetPageUrl,
            jobDir,
            job,
            [],
            true,
            job.type === "audio" ? "ba/b" : "best"
          );
        }
      }
    }

    if (ytRes.ok && ytRes.filePath && isValidMediaFile(ytRes.filePath)) {
      const stat = fs.statSync(ytRes.filePath);
      job.filePath = ytRes.filePath;
      job.contentType = job.type === "audio" ? "audio/mpeg" : "video/mp4";
      job.totalBytes = stat.size;
      job.totalSize = formatBytesMB(stat.size);
      job.downloadedSize = formatBytesMB(stat.size);
      job.percentage = 100;
      job.status = "ready";
      job.statusText = "Mídia original pronta! Salvando...";
      job.updatedAt = Date.now();
      return;
    }

    if ((job.status as string) === "paused") return;

    // B2-YT. CASCATA AUTOMÁTICA ZERO-CONFIG PARA YOUTUBE
    if (isYouTubeUrl(targetPageUrl)) {
      // Camada 2: Extrator nativo @distube/ytdl-core (PO Token + clientes TV/MWEB/Embed)
      job.statusText = "Extraindo stream via cliente nativo automático...";
      const ytdlRes = await downloadYouTubeViaYtdlCore(targetPageUrl, jobDir, job);
      if (ytdlRes.ok && ytdlRes.filePath && isValidMediaFile(ytdlRes.filePath)) {
        const stat = fs.statSync(ytdlRes.filePath);
        job.filePath = ytdlRes.filePath;
        job.contentType = ytdlRes.contentType || (job.type === "audio" ? "audio/mpeg" : "video/mp4");
        job.totalBytes = stat.size;
        job.totalSize = formatBytesMB(stat.size);
        job.downloadedSize = formatBytesMB(stat.size);
        job.percentage = 100;
        job.status = "ready";
        job.statusText = "Mídia original pronta! Salvando...";
        job.updatedAt = Date.now();
        return;
      }
      if ((job.status as string) === "paused") return;

      // Camada 3: Instância Cobalt de ambiente (se presente)
      const cobaltRes = await downloadYouTubeViaCobaltEnv(targetPageUrl, jobDir, job);
      if (cobaltRes.ok && cobaltRes.filePath && isValidMediaFile(cobaltRes.filePath)) {
        const stat = fs.statSync(cobaltRes.filePath);
        job.filePath = cobaltRes.filePath;
        job.contentType = cobaltRes.contentType || (job.type === "audio" ? "audio/mpeg" : "video/mp4");
        job.totalBytes = stat.size;
        job.totalSize = formatBytesMB(stat.size);
        job.downloadedSize = formatBytesMB(stat.size);
        job.percentage = 100;
        job.status = "ready";
        job.statusText = "Mídia original pronta! Salvando...";
        job.updatedAt = Date.now();
        return;
      }
      if ((job.status as string) === "paused") return;

      // Camada 4: Resolvedor automático cnvmp3 (MP4/MP3 com fallback inteligente de resolução)
      const cnvRes = await downloadYouTubeViaCnvmp3(targetPageUrl, jobDir, job);
      if (cnvRes.ok && cnvRes.filePath && isValidMediaFile(cnvRes.filePath)) {
        const stat = fs.statSync(cnvRes.filePath);
        job.filePath = cnvRes.filePath;
        job.contentType = cnvRes.contentType || (job.type === "audio" ? "audio/mpeg" : "video/mp4");
        job.totalBytes = stat.size;
        job.totalSize = formatBytesMB(stat.size);
        job.downloadedSize = formatBytesMB(stat.size);
        job.percentage = 100;
        job.status = "ready";
        job.statusText = "Mídia original pronta! Salvando...";
        job.updatedAt = Date.now();
        return;
      }
      if ((job.status as string) === "paused") return;

      const formatted = formatYtDlpError(ytRes.rawError || ytRes.error || "");
      job.needsAuth = false;
      throw new Error(formatted.message);
    }

    // B3. Fallback TikTok via TikWM (caso link TikTok expirou ou yt-dlp falhou)
    if (targetPageUrl.toLowerCase().includes("tiktok.com")) {
      const meta = await extractMediaEngine(targetPageUrl);
      const vidUrl = meta.formats.find((f) => f.type === "video")?.directUrl;
      if (vidUrl && vidUrl !== targetPageUrl) {
        const rawPath = path.join(jobDir, "tiktok.mp4");
        const dl = await downloadDirectUrlToFile(vidUrl, rawPath, job);
        if (dl.ok && isValidMediaFile(rawPath)) {
          if (job.type === "audio") {
            const mp3Path = path.join(jobDir, "tiktok.mp3");
            const bitrate = getAudioBitrate(job.quality);
            const ok = await runFfmpegProcess(
              ["-y", "-i", rawPath, "-vn", "-c:a", "libmp3lame", "-b:a", bitrate, mp3Path],
              job
            );
            if (ok && isValidMediaFile(mp3Path)) {
              const stat = fs.statSync(mp3Path);
              job.filePath = mp3Path;
              job.contentType = "audio/mpeg";
              job.totalBytes = stat.size;
              job.totalSize = formatBytesMB(stat.size);
              job.downloadedSize = formatBytesMB(stat.size);
              job.percentage = 100;
              job.status = "ready";
              return;
            }
          } else {
            const stat = fs.statSync(rawPath);
            job.filePath = rawPath;
            job.contentType = "video/mp4";
            job.totalBytes = stat.size;
            job.totalSize = formatBytesMB(stat.size);
            job.downloadedSize = formatBytesMB(stat.size);
            job.percentage = 100;
            job.status = "ready";
            return;
          }
        }
      }
    }

    // B4. Fallback Universal HTML Scraper (Kwai, XVideos/Pornhub HLS ordenados por qualidade, /embed/, etc.)
    job.statusText = "Analisando streams alternativos da página para download direto...";
    const scraped = await scrapeWebPageMedia(targetPageUrl);

    if (scraped.unavailable) {
      throw new Error(scraped.unavailableReason || "Este vídeo foi removido ou está indisponível na plataforma.");
    }

    const candidates: string[] = [];
    if (job.type === "audio" && scraped.audioUrls.length > 0) {
      candidates.push(...scraped.audioUrls);
    }
    const sortedVideos = sortVideoCandidatesByQuality(scraped.videoUrls, job.quality);
    for (const v of sortedVideos) {
      if (!candidates.includes(v.url)) candidates.push(v.url);
    }
    if (job.type === "audio") {
      for (const a of scraped.audioUrls) {
        if (!candidates.includes(a)) candidates.push(a);
      }
    }

    const origin = new URL(scraped.finalUrl || targetPageUrl).origin;
    const cookieLine = scraped.cookies ? `Cookie: ${scraped.cookies}\r\n` : "";
    const headerStr = `User-Agent: ${USER_AGENT}\r\nReferer: ${origin}/\r\n${cookieLine}`;

    for (let idx = 0; idx < candidates.length; idx++) {
      if ((job.status as string) === "paused") return;
      const picked = candidates[idx];
      const isHls = picked.includes(".m3u8");
      const finalExt = job.type === "audio" ? "mp3" : "mp4";
      const finalPath = path.join(jobDir, `scraped_${idx}.${finalExt}`);

      if (isHls) {
        // Aceleração HLS 8-Fragments paralelos via yt-dlp primeiro (8x mais rápido que FFmpeg sequencial!)
        job.status = "downloading";
        job.percentage = Math.max(job.percentage, 30);
        job.statusText = "Baixando stream HLS em 8 threads paralelas...";
        const hlsExtraArgs = [
          "--referer",
          `${origin}/`,
          ...(scraped.cookies ? ["--add-header", `Cookie: ${scraped.cookies}`] : []),
        ];
        const fastHls = await runYtDlpDownloadToJob(
          picked,
          jobDir,
          job,
          hlsExtraArgs,
          true,
          job.type === "audio" ? "ba/b" : "bv*+ba/b/best"
        );
        if (fastHls.ok && fastHls.filePath && isValidMediaFile(fastHls.filePath)) {
          const stat = fs.statSync(fastHls.filePath);
          job.filePath = fastHls.filePath;
          job.contentType = job.type === "audio" ? "audio/mpeg" : "video/mp4";
          job.totalBytes = stat.size;
          job.totalSize = formatBytesMB(stat.size);
          job.downloadedSize = formatBytesMB(stat.size);
          job.percentage = 100;
          job.status = "ready";
          job.statusText = "Download concluído! Salvando...";
          return;
        }
      }

      if (isHls || job.type === "audio") {
        job.status = "downloading";
        job.percentage = Math.max(job.percentage, 35);
        job.statusText = "Capturando melhor stream disponível via FFmpeg...";

        const bitrate = getAudioBitrate(job.quality);
        const ffArgs =
          job.type === "audio"
            ? ["-y", "-headers", headerStr, "-i", picked, "-vn", "-c:a", "libmp3lame", "-b:a", bitrate, finalPath]
            : ["-y", "-headers", headerStr, "-i", picked, "-c", "copy", "-bsf:a", "aac_adtstoasc", finalPath];

        const ok = await runFfmpegProcess(ffArgs, job);
        if (ok && isValidMediaFile(finalPath)) {
          const stat = fs.statSync(finalPath);
          job.filePath = finalPath;
          job.contentType = job.type === "audio" ? "audio/mpeg" : "video/mp4";
          job.totalBytes = stat.size;
          job.totalSize = formatBytesMB(stat.size);
          job.downloadedSize = formatBytesMB(stat.size);
          job.percentage = 100;
          job.status = "ready";
          job.statusText = "Download concluído! Salvando...";
          return;
        }
        try { fs.unlinkSync(finalPath); } catch {}
      } else {
        const dl = await downloadDirectUrlToFile(picked, finalPath, job, {
          Referer: `${origin}/`,
          ...(scraped.cookies ? { Cookie: scraped.cookies } : {}),
        });
        if (dl.ok && !dl.contentType.includes("text/html") && isValidMediaFile(finalPath)) {
          job.filePath = finalPath;
          job.contentType = "video/mp4";
          job.totalBytes = dl.totalBytes;
          job.totalSize = formatBytesMB(dl.totalBytes);
          job.downloadedSize = formatBytesMB(dl.totalBytes);
          job.percentage = 100;
          job.status = "ready";
          job.statusText = "Download concluído! Salvando...";
          return;
        }
        try { fs.unlinkSync(finalPath); } catch {}
      }
    }

    // B5. Última camada para Pornhub: se CDN bloqueou download direto no servidor, usa yt-dlp via nó geo-desbloqueado vencedor
    if (isPornhubUrl(targetPageUrl) && scraped.proxyUsed && (job.status as string) !== "paused") {
      job.statusText = "Concluindo transferência via rota internacional automática...";
      const proxiedYtRes = await runYtDlpDownloadToJob(
        targetPageUrl,
        jobDir,
        job,
        ["--proxy", scraped.proxyUsed],
        true,
        job.type === "audio" ? "ba/b" : "best"
      );
      if (proxiedYtRes.ok && proxiedYtRes.filePath && isValidMediaFile(proxiedYtRes.filePath)) {
        const stat = fs.statSync(proxiedYtRes.filePath);
        job.filePath = proxiedYtRes.filePath;
        job.contentType = job.type === "audio" ? "audio/mpeg" : "video/mp4";
        job.totalBytes = stat.size;
        job.totalSize = formatBytesMB(stat.size);
        job.downloadedSize = formatBytesMB(stat.size);
        job.percentage = 100;
        job.status = "ready";
        job.statusText = "Mídia original pronta! Salvando...";
        job.updatedAt = Date.now();
        return;
      }
    }

    throw new Error(
      ytRes.error || "Não foi possível baixar a mídia deste link (conteúdo privado, removido ou indisponível)."
    );
  } catch (err: any) {
    if ((job.status as string) === "paused") return;
    job.status = "error";
    job.needsAuth = false;
    job.error = err?.message || "Erro ao extrair e baixar mídia.";
    job.statusText = job.error!;
    job.updatedAt = Date.now();
  }
}

/**
 * Inicia ou retoma um job de download assíncrono no servidor
 * POST /api/media-job
 */
export async function handleCreateMediaJob(req: IncomingMessage, res: ServerResponse) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", async () => {
    try {
      const payload = JSON.parse(body || "{}");
      const url = (payload.url || "").trim();
      const pageUrl = (payload.pageUrl || url).trim();
      const type: "video" | "audio" | "image" = payload.type || "video";
      const quality = String(payload.quality || "1080p");
      const filename = String(payload.filename || (type === "audio" ? "audio.mp3" : type === "image" ? "imagem.jpg" : "video.mp4"));
      const existingJobId = payload.jobId ? String(payload.jobId) : "";

      if (!url && !pageUrl) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "URL obrigatória" }));
        return;
      }

      // Retoma job pausado existente caso exista no servidor (preservando .part do yt-dlp!)
      const id = existingJobId || crypto.randomBytes(8).toString("hex");
      const job: MediaJobState = {
        id,
        url,
        pageUrl,
        type,
        quality,
        filename,
        status: "extracting",
        percentage: 2,
        downloadedSize: "0.0 MB",
        totalSize: "-- MB",
        totalBytes: 0,
        transferRate: "0.0 MB/s",
        statusText: "Iniciando motor de extração no servidor...",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      JOBS_MAP.set(id, job);
      void processMediaJob(job);

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify({ success: true, jobId: id }));
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: err?.message || "Erro interno" }));
    }
  });
}

/**
 * Consulta status em tempo real de um job de download
 * GET /api/media-job-status?id=...
 */
export function handleMediaJobStatus(req: IncomingMessage, res: ServerResponse) {
  const parsed = new URL(req.url || "", "http://localhost");
  const id = parsed.searchParams.get("id") || "";
  const job = JOBS_MAP.get(id);

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!job) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Job não encontrado" }));
    return;
  }

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      id: job.id,
      status: job.status,
      percentage: job.percentage,
      downloadedSize: job.downloadedSize,
      totalSize: job.totalSize,
      totalBytes: job.totalBytes,
      transferRate: job.transferRate,
      statusText: job.statusText,
      filename: job.filename,
      error: job.error,
      needsAuth: job.needsAuth || false,
    })
  );
}

/**
 * Converte JSON (Cookie-Editor) ou texto Netscape em arquivo Netscape cookies.txt válido
 */
function normalizeCookiesToNetscape(rawInput: string): string {
  const trimmed = (rawInput || "").trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.cookies) ? parsed.cookies : [];
      if (arr.length > 0) {
        const lines = ["# Netscape HTTP Cookie File"];
        for (const c of arr) {
          if (!c?.domain || !c?.name) continue;
          const domain = String(c.domain);
          const includeSubdomains = domain.startsWith(".") ? "TRUE" : "FALSE";
          const pathVal = String(c.path || "/");
          const secure = c.secure ? "TRUE" : "FALSE";
          const expiry = c.expirationDate ? Math.floor(Number(c.expirationDate)) : Math.floor(Date.now() / 1000) + 31536000;
          lines.push(`${domain}\t${includeSubdomains}\t${pathVal}\t${secure}\t${expiry}\t${c.name}\t${c.value ?? ""}`);
        }
        return lines.length > 1 ? lines.join("\n") + "\n" : "";
      }
    } catch {}
  }

  // Já é texto Netscape ou pares Cookie header
  if (trimmed.includes("\t")) {
    return trimmed.startsWith("# Netscape") ? trimmed : `# Netscape HTTP Cookie File\n${trimmed}\n`;
  }
  return "";
}

export function handleMediaAuthStatus(_req: IncomingMessage, res: ServerResponse) {
  const cookiesPath = getActiveCookiesPath();
  const proxyUrl = getActiveProxyUrl();
  let cookieLines = 0;
  if (cookiesPath) {
    try {
      const content = fs.readFileSync(cookiesPath, "utf8");
      cookieLines = content.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#")).length;
    } catch {}
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(
    JSON.stringify({
      hasCookies: Boolean(cookiesPath && cookieLines > 0),
      cookieCount: cookieLines,
      hasProxy: Boolean(proxyUrl),
    })
  );
}

export function handleMediaAuthCookies(req: IncomingMessage, res: ServerResponse) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      const payload = JSON.parse(body || "{}");
      if (payload.clear) {
        try { fs.unlinkSync(COOKIES_FILE_PATH); } catch {}
        try { fs.unlinkSync(PROXY_FILE_PATH); } catch {}
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, hasCookies: false, cookieCount: 0 }));
        return;
      }

      if (typeof payload.proxyUrl === "string") {
        const cleanProxy = payload.proxyUrl.trim();
        if (cleanProxy) {
          fs.writeFileSync(PROXY_FILE_PATH, cleanProxy, "utf8");
        } else {
          try { fs.unlinkSync(PROXY_FILE_PATH); } catch {}
        }
      }

      if (typeof payload.cookies === "string" && payload.cookies.trim()) {
        const netscape = normalizeCookiesToNetscape(payload.cookies);
        if (!netscape) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              success: false,
              error: "Formato inválido. Cole o conteúdo exportado em Netscape (.txt) ou JSON (Cookie-Editor).",
            })
          );
          return;
        }
        fs.writeFileSync(COOKIES_FILE_PATH, netscape, "utf8");
        const count = netscape.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#")).length;
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, hasCookies: true, cookieCount: count }));
        return;
      }

      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, hasCookies: Boolean(getActiveCookiesPath()) }));
    } catch (err: any) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: err?.message || "Erro ao salvar configuração" }));
    }
  });
}

/**
 * Pausa um job em andamento (mantendo o diretório e .part para retomada futura)
 * POST /api/media-job-pause
 */
export function handleMediaJobPause(req: IncomingMessage, res: ServerResponse) {
  let body = "";
  req.on("data", (c) => {
    body += c;
  });
  req.on("end", () => {
    try {
      const { id } = JSON.parse(body || "{}");
      const job = JOBS_MAP.get(String(id || ""));
      if (job) {
        job.status = "paused";
        job.transferRate = "0.0 MB/s";
        job.statusText = "Download pausado pelo usuário.";
        if (job.proc) {
          try { job.proc.kill("SIGTERM"); } catch {}
          job.proc = null;
        }
        if (job.abortController) {
          try { job.abortController.abort(); } catch {}
          job.abortController = null;
        }
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true }));
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false }));
    }
  });
}

/**
 * Entrega o arquivo final pronto com suporte completo a Range / Content-Length e HEAD
 * GET/HEAD /api/media-job-file?id=...
 */
export function handleMediaJobFile(req: IncomingMessage, res: ServerResponse) {
  try {
    const parsed = new URL(req.url || "", "http://localhost");
    const id = parsed.searchParams.get("id") || "";
    const job = JOBS_MAP.get(id);

    if (!job || job.status !== "ready" || !job.filePath || !fs.existsSync(job.filePath)) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Arquivo ainda não pronto ou expirado" }));
      return;
    }

    job.updatedAt = Date.now();
    const stat = fs.statSync(job.filePath);
    const total = stat.size;
    const contentType = job.contentType || "application/octet-stream";
    const range = req.headers.range;

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(job.filename)}"`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
    res.setHeader("Cache-Control", "no-cache");

    if (req.method === "HEAD") {
      res.statusCode = 200;
      res.setHeader("Content-Length", String(total));
      res.end();
      return;
    }

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = Math.max(0, parseInt(parts[0], 10) || 0);
      const rawEnd = parts[1] ? parseInt(parts[1], 10) : total - 1;
      const end = Math.min(total - 1, Number.isFinite(rawEnd) ? rawEnd : total - 1);

      if (start >= total || start > end) {
        res.statusCode = 416;
        res.setHeader("Content-Range", `bytes */${total}`);
        res.end();
        return;
      }

      const chunkSize = end - start + 1;
      res.statusCode = 206;
      res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
      res.setHeader("Content-Length", String(chunkSize));

      const stream = fs.createReadStream(job.filePath, { start, end });
      stream.on("error", () => {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end("Erro ao ler segmento do arquivo");
        } else {
          res.destroy();
        }
      });
      stream.pipe(res);
    } else {
      res.statusCode = 200;
      res.setHeader("Content-Length", String(total));
      const stream = fs.createReadStream(job.filePath);
      stream.on("error", () => {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end("Erro ao ler arquivo");
        } else {
          res.destroy();
        }
      });
      stream.pipe(res);
    }

    // Limpa arquivos temporários após 5 minutos de inatividade desde o último chunk
    setTimeout(() => {
      try {
        const current = JOBS_MAP.get(id);
        if (current && Date.now() - current.updatedAt >= 4.5 * 60 * 1000) {
          fs.rmSync(path.join(JOBS_ROOT, id), { recursive: true, force: true });
          JOBS_MAP.delete(id);
        }
      } catch {}
    }, 5 * 60 * 1000);
  } catch (err: any) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err?.message || "Erro interno ao entregar arquivo" }));
    }
  }
}

/**
 * Endpoint legado/direto (/api/media-download) sem fallback fake.
 * Cria um job interno síncrono e entrega o stream real ou JSON de erro real.
 */
export async function streamMediaDownload(req: IncomingMessage, res: ServerResponse) {
  try {
    const parsedUrl = new URL(req.url || "", "http://localhost");
    const streamUrl = parsedUrl.searchParams.get("url") || "";
    const pageUrl = parsedUrl.searchParams.get("pageUrl") || streamUrl;
    const filename = parsedUrl.searchParams.get("filename") || "media.mp4";
    const typeParam = parsedUrl.searchParams.get("type");
    const quality = parsedUrl.searchParams.get("quality") || "1080p";

    if (!streamUrl) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Parâmetro 'url' obrigatório" }));
      return;
    }

    const isImage =
      typeParam === "image" || /\.(jpg|jpeg|png|webp)$/i.test(filename);
    const isAudio = !isImage && (typeParam === "audio" || filename.endsWith(".mp3"));
    const mediaType: "video" | "audio" | "image" = isImage
      ? "image"
      : isAudio
      ? "audio"
      : "video";

    if (req.method === "HEAD") {
      res.statusCode = 200;
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end();
      return;
    }

    const id = crypto.randomBytes(8).toString("hex");
    const job: MediaJobState = {
      id,
      url: streamUrl,
      pageUrl,
      type: mediaType,
      quality,
      filename,
      status: "extracting",
      percentage: 0,
      downloadedSize: "0.0 MB",
      totalSize: "-- MB",
      totalBytes: 0,
      transferRate: "0.0 MB/s",
      statusText: "Iniciando extração...",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    JOBS_MAP.set(id, job);

    req.on("close", () => {
      if (job.status !== "ready") {
        job.status = "paused";
        try { job.proc?.kill("SIGTERM"); } catch {}
        try { job.abortController?.abort(); } catch {}
      }
    });

    await processMediaJob(job);

    if (job.status === "ready" && job.filePath && fs.existsSync(job.filePath)) {
      const stat = fs.statSync(job.filePath);
      res.statusCode = 200;
      res.setHeader("Content-Type", job.contentType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader("Content-Length", String(stat.size));
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Access-Control-Allow-Origin", "*");
      const readStream = fs.createReadStream(job.filePath);
      readStream.pipe(res);
      readStream.on("close", () => {
        try {
          fs.rmSync(path.join(JOBS_ROOT, id), { recursive: true, force: true });
          JOBS_MAP.delete(id);
        } catch {}
      });
      return;
    }

    if (!res.headersSent) {
      res.statusCode = 422;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: job.error || "Não foi possível baixar esta mídia." }));
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err?.message || "Erro interno ao processar download" }));
    }
  }
}
