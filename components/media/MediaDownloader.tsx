import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  Video,
  Music,
  Clipboard,
  Check,
  Film,
  Trash2,
  Loader2,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Zap,
  Image as ImageIcon,
  HardDriveDownload,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
} from "lucide-react";
import {
  fetchMediaMetadata,
  downloadMediaItem,
  saveBlobToDevice,
  getProxiedThumbnailUrl,
  detectPlatform,
  MediaMetadata,
  MediaFormatOption,
  getPlatformBadge,
  BatchDownloadTask,
} from "../../lib/mediaExtractor";

type MediaSection = "video" | "audio" | "image";

const LEGACY_QUEUE_KEY = "gm_batch_downloads_queue_v2";
const SECTION_QUEUE_KEYS: Record<MediaSection, string> = {
  video: "gm_downloads_queue_video_v3",
  audio: "gm_downloads_queue_audio_v3",
  image: "gm_downloads_queue_image_v3",
};
const SECTION_URLS_KEYS: Record<MediaSection, string> = {
  video: "gm_downloads_urls_video_v1",
  audio: "gm_downloads_urls_audio_v1",
  image: "gm_downloads_urls_image_v1",
};
const SECTION_QUALITY_KEYS: Record<MediaSection, string> = {
  video: "gm_downloads_quality_video_v1",
  audio: "gm_downloads_quality_audio_v1",
  image: "gm_downloads_quality_image_v1",
};

const QUALITY_OPTIONS: Record<
  MediaSection,
  { key: string; label: string; shortDesc: string }[]
> = {
  video: [
    { key: "best", label: "Máxima (Auto)", shortDesc: "Máxima Auto" },
    { key: "4k", label: "4K Ultra HD", shortDesc: "2160p" },
    { key: "1080p", label: "1080p Full HD", shortDesc: "1080p" },
    { key: "720p", label: "720p HD", shortDesc: "720p" },
    { key: "480p", label: "480p SD", shortDesc: "480p" },
  ],
  audio: [
    { key: "320k", label: "320 kbps · Máxima", shortDesc: "320 kbps HQ" },
    { key: "256k", label: "256 kbps · Alta", shortDesc: "256 kbps" },
    { key: "192k", label: "192 kbps · Padrão", shortDesc: "192 kbps" },
    { key: "128k", label: "128 kbps · Leve", shortDesc: "128 kbps" },
  ],
  image: [
    { key: "8k", label: "8K Ultra HD", shortDesc: "8K Master HQ" },
    { key: "4k", label: "4K Original", shortDesc: "4K Original" },
    { key: "1080p", label: "Full HD", shortDesc: "1080p HD" },
    { key: "png", label: "PNG Lossless", shortDesc: "PNG Original" },
  ],
};

function sanitizeQueueItems(items: BatchDownloadTask[]): BatchDownloadTask[] {
  return items.map((item) =>
    item.status === "downloading" || item.status === "extracting"
      ? { ...item, status: "paused", statusText: "Download pausado (restaurado)" }
      : item
  );
}

function loadInitialQueues(): Record<MediaSection, BatchDownloadTask[]> {
  const result: Record<MediaSection, BatchDownloadTask[]> = {
    video: [],
    audio: [],
    image: [],
  };

  try {
    let hasSectionData = false;
    (["video", "audio", "image"] as MediaSection[]).forEach((sec) => {
      const raw = localStorage.getItem(SECTION_QUEUE_KEYS[sec]);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          result[sec] = sanitizeQueueItems(parsed);
          hasSectionData = true;
        }
      }
    });

    if (!hasSectionData) {
      const legacyRaw = localStorage.getItem(LEGACY_QUEUE_KEY);
      if (legacyRaw) {
        const parsed: BatchDownloadTask[] = JSON.parse(legacyRaw);
        if (Array.isArray(parsed)) {
          const clean = sanitizeQueueItems(parsed);
          result.video = clean.filter((t) => t.formatType === "video");
          result.audio = clean.filter((t) => t.formatType === "audio");
          result.image = clean.filter((t) => t.formatType === "image");
        }
      }
    }
  } catch {}

  return result;
}

function loadInitialUrls(): Record<MediaSection, string[]> {
  const result: Record<MediaSection, string[]> = {
    video: [""],
    audio: [""],
    image: [""],
  };
  try {
    (["video", "audio", "image"] as MediaSection[]).forEach((sec) => {
      const raw = localStorage.getItem(SECTION_URLS_KEYS[sec]);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          result[sec] = parsed.map((v) => String(v ?? ""));
        }
      }
    });
  } catch {}
  return result;
}

function loadInitialQualities(): Record<MediaSection, string> {
  const defaults: Record<MediaSection, string> = {
    video: "best",
    audio: "320k",
    image: "8k",
  };
  try {
    (["video", "audio", "image"] as MediaSection[]).forEach((sec) => {
      const saved = localStorage.getItem(SECTION_QUALITY_KEYS[sec]);
      if (saved && QUALITY_OPTIONS[sec].some((o) => o.key === saved)) {
        defaults[sec] = saved;
      }
    });
  } catch {}
  return defaults;
}

function getDetectedKindLabel(meta?: MediaMetadata): string | null {
  if (!meta) return null;
  if (meta.detectedMediaKind === "image") return "Imagem Original";
  if (meta.detectedMediaKind === "audio") return "Áudio Original";
  if (meta.detectedMediaKind === "video") return "Vídeo Original";
  const hasVid = meta.formats.some((f) => f.type === "video");
  const hasAud = meta.formats.some((f) => f.type === "audio");
  const hasImg = meta.formats.some((f) => f.type === "image");
  if (hasVid) return "Vídeo Original";
  if (hasAud) return "Áudio Original";
  if (hasImg) return "Imagem Original";
  return null;
}

function getEffectiveMediaKind(meta?: MediaMetadata): MediaSection | null {
  if (!meta) return null;
  if (meta.detectedMediaKind) return meta.detectedMediaKind;
  if (meta.formats.some((f) => f.type === "video")) return "video";
  if (meta.formats.some((f) => f.type === "audio")) return "audio";
  if (meta.formats.some((f) => f.type === "image")) return "image";
  return null;
}

function formatQualityDisplay(section: MediaSection, quality: string): string {
  const found = QUALITY_OPTIONS[section].find((q) => q.key === quality);
  return found ? found.shortDesc : quality.toUpperCase();
}

export const MediaDownloader: React.FC = () => {
  // Painel recolhível: clicar em "Motor Universal de Download" expande os botões VÍDEO, ÁUDIO e IMAGEM
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<MediaSection>("video");

  // Estado separado por seção (Links, Qualidades, Filas persistentes)
  const [urlsBySection, setUrlsBySection] = useState<Record<MediaSection, string[]>>(loadInitialUrls);
  const [qualityBySection, setQualityBySection] = useState<Record<MediaSection, string>>(loadInitialQualities);
  const [queuesBySection, setQueuesBySection] = useState<Record<MediaSection, BatchDownloadTask[]>>(loadInitialQueues);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const activeControllers = useRef<Map<string, AbortController>>(new Map());
  const activeBlobs = useRef<Map<string, Blob>>(new Map());

  // Cache de miniaturas e metadados detectados automaticamente por URL
  const [linkPreviews, setLinkPreviews] = useState<
    Record<string, { loading: boolean; metadata?: MediaMetadata; error?: string }>
  >({});
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});

  // Persiste filas, links e qualidades separados por seção no localStorage
  useEffect(() => {
    try {
      (["video", "audio", "image"] as MediaSection[]).forEach((sec) => {
        localStorage.setItem(SECTION_QUEUE_KEYS[sec], JSON.stringify(queuesBySection[sec]));
      });
    } catch {}
  }, [queuesBySection]);

  useEffect(() => {
    try {
      (["video", "audio", "image"] as MediaSection[]).forEach((sec) => {
        localStorage.setItem(SECTION_URLS_KEYS[sec], JSON.stringify(urlsBySection[sec]));
      });
    } catch {}
  }, [urlsBySection]);

  useEffect(() => {
    try {
      (["video", "audio", "image"] as MediaSection[]).forEach((sec) => {
        localStorage.setItem(SECTION_QUALITY_KEYS[sec], qualityBySection[sec]);
      });
    } catch {}
  }, [qualityBySection]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const currentUrlList = urlsBySection[activeSection];
  const currentQuality = qualityBySection[activeSection];
  const currentQueue = queuesBySection[activeSection];

  // Auto-leitura dos links inseridos na seção ativa (identifica automaticamente se é vídeo ou imagem + miniatura real)
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    currentUrlList.forEach((url) => {
      const cleanUrl = url.trim();
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) return;
      if (linkPreviews[cleanUrl]) return;

      const timer = setTimeout(() => {
        setLinkPreviews((prev) => {
          if (prev[cleanUrl]) return prev;
          return { ...prev, [cleanUrl]: { loading: true } };
        });

        fetchMediaMetadata(cleanUrl)
          .then((meta) => {
            setLinkPreviews((prev) => ({
              ...prev,
              [cleanUrl]: { loading: false, metadata: meta },
            }));
          })
          .catch((err: any) => {
            setLinkPreviews((prev) => ({
              ...prev,
              [cleanUrl]: {
                loading: false,
                error: err?.message || "Não foi possível extrair prévia deste link.",
              },
            }));
          });
      }, 320);

      timers.push(timer);
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [currentUrlList, linkPreviews]);

  // --- Manipulação dos links dentro da seção ativa ---
  const setSectionUrls = (sec: MediaSection, updater: (prev: string[]) => string[]) => {
    setUrlsBySection((prev) => ({
      ...prev,
      [sec]: updater(prev[sec]),
    }));
  };

  const handleUpdateLink = (index: number, value: string) => {
    setSectionUrls(activeSection, (prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddLinkRow = () => {
    setSectionUrls(activeSection, (prev) => [...prev, ""]);
  };

  const handleRemoveLinkRow = (index: number) => {
    setSectionUrls(activeSection, (prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleClearSectionFields = () => {
    setSectionUrls(activeSection, () => [""]);
  };

  const handlePasteClipboardAll = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const urls = text
            .split(/[\r\n\s]+/)
            .map((u) => u.trim())
            .filter((u) => u.startsWith("http://") || u.startsWith("https://"));

          if (urls.length > 0) {
            setSectionUrls(activeSection, () => urls);
            setToastMessage(
              `${urls.length} link(s) colado(s) na seção ${activeSection.toUpperCase()}!`
            );
          } else {
            handleUpdateLink(0, text.trim());
          }
        }
      }
    } catch {}
  };

  const handlePasteSingleRow = async (index: number) => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          handleUpdateLink(index, text.trim());
        }
      }
    } catch {}
  };

  // Move um link detectado para a seção correta (ex.: foto colada na seção Vídeo -> seção Imagem)
  const handleMoveLinkToSection = (url: string, targetSection: MediaSection, rowIndex: number) => {
    setUrlsBySection((prev) => {
      const sourceFiltered = prev[activeSection].filter((_, i) => i !== rowIndex);
      const nextSource = sourceFiltered.length > 0 ? sourceFiltered : [""];
      const existingTarget = prev[targetSection].filter((u) => u.trim() !== "");
      const nextTarget = existingTarget.includes(url) ? existingTarget : [...existingTarget, url];
      return {
        ...prev,
        [activeSection]: nextSource,
        [targetSection]: nextTarget.length > 0 ? nextTarget : [""],
      };
    });
    setActiveSection(targetSection);
    setToastMessage(`Link movido para a seção ${targetSection.toUpperCase()} automaticamente.`);
  };

  const updateTask = (sec: MediaSection, id: string, updates: Partial<BatchDownloadTask>) => {
    setQueuesBySection((prev) => ({
      ...prev,
      [sec]: prev[sec].map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  };

  const resolveTaskSectionAndQuality = (
    requestedSection: MediaSection,
    url: string,
    previewMeta?: MediaMetadata
  ): { targetSection: MediaSection; targetQuality: string } => {
    const effective = getEffectiveMediaKind(previewMeta);
    // Se post é somente imagem e o usuário clicou baixar em vídeo/áudio, registra na seção IMAGEM automaticamente
    if (effective === "image" && requestedSection !== "image") {
      return {
        targetSection: "image",
        targetQuality: qualityBySection.image,
      };
    }
    return {
      targetSection: requestedSection,
      targetQuality: qualityBySection[requestedSection],
    };
  };

  const createTaskObject = (
    sec: MediaSection,
    quality: string,
    url: string,
    indexSuffix: string,
    previewMeta?: MediaMetadata
  ): BatchDownloadTask => {
    const ext: BatchDownloadTask["extension"] =
      sec === "image"
        ? quality === "png"
          ? "png"
          : "jpg"
        : sec === "audio"
        ? "mp3"
        : "mp4";

    const detectedPlat = previewMeta?.platform || detectPlatform(url);
    const platBadge = getPlatformBadge(detectedPlat);

    return {
      id: `${Date.now()}_${indexSuffix}_${Math.random().toString(36).substring(2, 6)}`,
      url,
      title: previewMeta?.title || "Identificando mídia original...",
      author: previewMeta?.author || "Carregando...",
      thumbnail: previewMeta?.thumbnail || "",
      platform: detectedPlat,
      platformLabel: previewMeta?.platformLabel || platBadge.label,
      formatId: `${sec}_${quality}`,
      formatType: sec,
      quality,
      resolution: formatQualityDisplay(sec, quality),
      extension: ext,
      filesizeApprox: "-- MB",
      percentage: 0,
      status: "queued",
      statusText: "Iniciando download do link...",
      transferRate: "0.0 MB/s",
      downloadedSize: "0.0 MB",
      totalSize: "-- MB",
    };
  };

  // --- Baixar Item Único Diretamente da Prévia ---
  const handleDownloadSingleItem = (url: string, metaOverride?: MediaMetadata) => {
    const previewMeta = metaOverride || linkPreviews[url]?.metadata;
    const { targetSection, targetQuality } = resolveTaskSectionAndQuality(
      activeSection,
      url,
      previewMeta
    );

    const singleTask = createTaskObject(targetSection, targetQuality, url, "single", previewMeta);

    setQueuesBySection((prev) => ({
      ...prev,
      [targetSection]: [singleTask, ...prev[targetSection]],
    }));

    if (targetSection !== activeSection) {
      setActiveSection(targetSection);
      setToastMessage(
        `Mídia identificada como ${targetSection.toUpperCase()} e iniciada na seção correspondente.`
      );
    } else {
      setToastMessage(
        `Download de "${singleTask.title.slice(0, 34)}" registrado em ${targetSection.toUpperCase()}!`
      );
    }

    executeTaskDownload(targetSection, singleTask);
  };

  // --- Iniciar Processamento em Massa da Seção Atual ---
  const handleStartBatchDownloads = async () => {
    const validLinks = currentUrlList.map((u) => u.trim()).filter((u) => u.startsWith("http"));
    if (validLinks.length === 0) {
      setToastMessage("Insira pelo menos um link válido para iniciar o download.");
      return;
    }

    const bucketTasks: Record<MediaSection, BatchDownloadTask[]> = {
      video: [],
      audio: [],
      image: [],
    };

    validLinks.forEach((url, i) => {
      const previewMeta = linkPreviews[url]?.metadata;
      const { targetSection, targetQuality } = resolveTaskSectionAndQuality(
        activeSection,
        url,
        previewMeta
      );
      const task = createTaskObject(targetSection, targetQuality, url, String(i), previewMeta);
      bucketTasks[targetSection].push(task);
    });

    setQueuesBySection((prev) => ({
      video: [...bucketTasks.video, ...prev.video],
      audio: [...bucketTasks.audio, ...prev.audio],
      image: [...bucketTasks.image, ...prev.image],
    }));

    // Limpa apenas os campos da seção atual
    setSectionUrls(activeSection, () => [""]);

    const totalAdded =
      bucketTasks.video.length + bucketTasks.audio.length + bucketTasks.image.length;
    setToastMessage(`${totalAdded} download(s) iniciado(s) e registrado(s) por seção!`);

    (["video", "audio", "image"] as MediaSection[]).forEach((sec) => {
      for (const task of bucketTasks[sec]) {
        executeTaskDownload(sec, task);
      }
    });
  };

  // --- Motor de Download Individual com Suporte a Pausa & Retomada (Início Imediato!) ---
  const executeTaskDownload = async (sec: MediaSection, task: BatchDownloadTask) => {
    const controller = new AbortController();
    activeControllers.current.set(task.id, controller);

    updateTask(sec, task.id, {
      status: "extracting",
      error: undefined,
      statusText: "Iniciando extração paralela na máxima resolução...",
    });

    try {
      const detectedPlat = detectPlatform(task.url);
      let meta: MediaMetadata | undefined = linkPreviews[task.url]?.metadata;
      if (!meta) {
        meta = {
          url: task.url,
          platform: detectedPlat,
          platformLabel: getPlatformBadge(detectedPlat).label,
          title:
            task.title !== "Identificando mídia original..."
              ? task.title
              : `Mídia (${getPlatformBadge(detectedPlat).label})`,
          author:
            task.author !== "Carregando..."
              ? task.author
              : getPlatformBadge(detectedPlat).label,
          thumbnail: task.thumbnail || "",
          formats: [],
        };

        // Busca título e miniatura reais em paralelo sem travar o início do download
        void fetchMediaMetadata(task.url)
          .then((resolved) => {
            if (!controller.signal.aborted && resolved) {
              setLinkPreviews((prev) => ({
                ...prev,
                [task.url]: { loading: false, metadata: resolved },
              }));
              updateTask(sec, task.id, {
                title: resolved.title || task.title,
                author: resolved.author || task.author,
                thumbnail: resolved.thumbnail || task.thumbnail,
                platform: resolved.platform || detectedPlat,
                platformLabel: getPlatformBadge(resolved.platform || detectedPlat).label,
              });
            }
          })
          .catch(() => {});
      }

      if (controller.signal.aborted) return;

      // Auto-ajuste se a detecção revelou post somente de imagem ao tentar baixar vídeo
      let effectiveType = task.formatType;
      let effectiveQuality = task.quality;
      let effectiveExtension = task.extension;
      let effectiveResolution = task.resolution;

      const detectedKind = getEffectiveMediaKind(meta);
      if (detectedKind === "image" && task.formatType !== "image") {
        effectiveType = "image";
        effectiveQuality = qualityBySection.image || "8k";
        effectiveExtension = effectiveQuality === "png" ? "png" : "jpg";
        effectiveResolution = formatQualityDisplay("image", effectiveQuality);
      }

      const matchingFormat =
        meta.formats.find(
          (f) =>
            f.type === effectiveType &&
            (f.quality.toLowerCase() === effectiveQuality.toLowerCase() ||
              f.quality.toLowerCase().includes(effectiveQuality.toLowerCase()) ||
              f.id.includes(effectiveQuality.toLowerCase()))
        ) ||
        meta.formats.find((f) => f.type === effectiveType) || {
          id: `${effectiveType}_${effectiveQuality}`,
          type: effectiveType,
          quality: effectiveQuality,
          resolution: effectiveResolution,
          extension: effectiveExtension,
          label: `${effectiveExtension.toUpperCase()} · ${effectiveResolution}`,
          badge: effectiveResolution,
          filesizeApprox: task.filesizeApprox,
          directUrl: task.url,
        };

      const finalTitle = meta.title || task.title || "Mídia Original";
      const finalThumb = meta.thumbnail || task.thumbnail || "";
      const platformBadge = getPlatformBadge(meta.platform);

      updateTask(sec, task.id, {
        title: finalTitle,
        author: meta.author,
        thumbnail: finalThumb,
        platform: meta.platform,
        platformLabel: platformBadge.label,
        formatType: effectiveType,
        quality: effectiveQuality,
        extension: effectiveExtension,
        resolution: effectiveResolution,
        status: "downloading",
        statusText: "Conectando ao motor de download no servidor...",
      });

      const result = await downloadMediaItem(
        meta,
        matchingFormat as MediaFormatOption,
        (report) => {
          if (controller.signal.aborted) return;
          updateTask(sec, task.id, {
            percentage: report.percentage,
            transferRate: report.transferRate,
            downloadedSize: report.downloadedSize,
            totalSize: report.totalSize,
            statusText: report.statusText,
          });
        },
        controller.signal,
        {
          existingJobId: task.serverJobId,
          onJobCreated: (serverJobId) => {
            updateTask(sec, task.id, { serverJobId });
          },
        }
      );

      if (result.success && result.blob) {
        activeBlobs.current.set(task.id, result.blob);
        saveBlobToDevice(result.blob, result.filename);

        updateTask(sec, task.id, {
          serverJobId: result.jobId || task.serverJobId,
          status: "completed",
          percentage: 100,
          statusText: "Download concluído 100%! Salvo na sua pasta Downloads.",
          transferRate: "0.0 MB/s",
          completedAt: new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      } else if (controller.signal.aborted || result.error?.includes("pausado")) {
        updateTask(sec, task.id, {
          serverJobId: result.jobId || task.serverJobId,
          status: "paused",
          statusText: "Download pausado pelo usuário.",
          transferRate: "0.0 MB/s",
        });
      } else {
        updateTask(sec, task.id, {
          serverJobId: result.jobId || task.serverJobId,
          status: "error",
          statusText: result.error || "Não foi possível extrair/baixar este link.",
          error: result.error || "Falha no download",
          transferRate: "0.0 MB/s",
        });
      }
    } catch (err: any) {
      if (controller.signal.aborted || err?.message?.includes("pausado")) {
        updateTask(sec, task.id, {
          status: "paused",
          statusText: "Download pausado pelo usuário.",
          transferRate: "0.0 MB/s",
        });
      } else {
        updateTask(sec, task.id, {
          status: "error",
          statusText: err?.message || "Erro durante o stream da mídia.",
          error: err?.message,
          transferRate: "0.0 MB/s",
        });
      }
    } finally {
      activeControllers.current.delete(task.id);
    }
  };

  // --- Controles da Fila da Seção Atual ---
  const handlePauseTask = (sec: MediaSection, id: string) => {
    const controller = activeControllers.current.get(id);
    if (controller) {
      controller.abort();
      activeControllers.current.delete(id);
    }
    const task = queuesBySection[sec].find((t) => t.id === id);
    if (task?.serverJobId) {
      fetch("/api/media-job-pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.serverJobId }),
      }).catch(() => {});
    }
    updateTask(sec, id, {
      status: "paused",
      statusText: "Download pausado pelo usuário.",
      transferRate: "0.0 MB/s",
    });
  };

  const handleSaveAgain = (sec: MediaSection, task: BatchDownloadTask) => {
    const blob = activeBlobs.current.get(task.id);
    const safeName = `${task.title
      .slice(0, 45)
      .replace(/[^a-zA-Z0-9_\-\u00C0-\u017F ]/g, "")
      .trim()}.${task.extension}`;

    if (blob) {
      saveBlobToDevice(blob, safeName);
      setToastMessage(`Arquivo "${safeName}" salvo com sucesso na sua pasta Downloads!`);
    } else {
      executeTaskDownload(sec, task);
    }
  };

  const handleRemoveTask = (sec: MediaSection, id: string) => {
    const controller = activeControllers.current.get(id);
    if (controller) {
      controller.abort();
      activeControllers.current.delete(id);
    }
    activeBlobs.current.delete(id);
    setQueuesBySection((prev) => ({
      ...prev,
      [sec]: prev[sec].filter((item) => item.id !== id),
    }));
  };

  const handleClearCompleted = (sec: MediaSection) => {
    setQueuesBySection((prev) => ({
      ...prev,
      [sec]: prev[sec].filter((item) => item.status !== "completed"),
    }));
  };

  const handlePauseAll = (sec: MediaSection) => {
    queuesBySection[sec].forEach((item) => {
      if (item.status === "downloading" || item.status === "extracting") {
        handlePauseTask(sec, item.id);
      }
    });
  };

  const handleResumeAll = (sec: MediaSection) => {
    queuesBySection[sec].forEach((item) => {
      if (item.status === "paused" || item.status === "queued") {
        executeTaskDownload(sec, item);
      }
    });
  };

  // Totais por seção e da seção ativa
  const validLinks = currentUrlList.map((u) => u.trim()).filter((u) => u.startsWith("http"));
  const totalCount = currentQueue.length;
  const completedCount = currentQueue.filter((t) => t.status === "completed").length;
  const downloadingCount = currentQueue.filter(
    (t) => t.status === "downloading" || t.status === "extracting"
  ).length;
  const pausedCount = currentQueue.filter((t) => t.status === "paused").length;

  const allActiveDownloads =
    queuesBySection.video.filter((t) => t.status === "downloading" || t.status === "extracting").length +
    queuesBySection.audio.filter((t) => t.status === "downloading" || t.status === "extracting").length +
    queuesBySection.image.filter((t) => t.status === "downloading" || t.status === "extracting").length;

  const renderSectionIcon = (sec: MediaSection, isSelected: boolean) => {
    const cls = isSelected ? "text-white shrink-0" : "shrink-0";
    if (sec === "video") return <Video size={16} className={cls} />;
    if (sec === "audio") return <Music size={16} className={cls} />;
    return <ImageIcon size={16} className={cls} />;
  };

  const sectionMeta: Record<
    MediaSection,
    {
      label: string;
      shortDesc: string;
      placeholder: string;
      emptyText: string;
    }
  > = {
    video: {
      label: "VÍDEO",
      shortDesc: "MP4 · 4K, 1080p, 720p, 480p",
      placeholder: "Cole o link do vídeo ou reels aqui (YouTube, Instagram, TikTok, Kwai, X, Facebook...)",
      emptyText: "Nenhum download de vídeo registrado nesta seção.",
    },
    audio: {
      label: "ÁUDIO",
      shortDesc: "Extrair MP3 · 320, 256, 192, 128 kbps",
      placeholder: "Cole o link do vídeo ou música para extrair o áudio em MP3...",
      emptyText: "Nenhuma extração de áudio registrada nesta seção.",
    },
    image: {
      label: "IMAGEM",
      shortDesc: "JPG / PNG · 8K, 4K, Full HD, PNG",
      placeholder: "Cole o link do post com foto (Instagram, X, Pinterest, TikTok ou URL de imagem)...",
      emptyText: "Nenhum download de imagem registrado nesta seção.",
    },
  };

  return (
    <div className="forge-spec relative overflow-hidden w-full transition-colors border border-[#26262A] bg-[#0B0B0C] rounded-lg">
      {/* 1. CABEÇALHO CLICÁVEL: CLICOU -> EXPANDE / RECOLHE AS SEÇÕES VÍDEO, ÁUDIO, IMAGEM */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        data-align="between"
        className="w-full text-left forge-spec__bar bg-[#131315] hover:bg-[#1B1B1E] border-b border-[#26262A] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 active:scale-[0.99] transition-[background-color,transform] duration-150 cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-[4px] bg-[var(--gm-primary,#FE540B)]/15 border border-[var(--gm-primary,#FE540B)]/35 text-[var(--gm-primary,#FE540B)] flex items-center justify-center shrink-0">
            <HardDriveDownload size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-semibold text-[#F2F2F3] tracking-tight flex items-center gap-2 flex-wrap">
              <span>Motor Universal de Download</span>
              <span className="text-[#8B8B92] hidden sm:inline">·</span>
              <span className="text-[var(--gm-primary,#FE540B)] font-mono text-xs hidden sm:inline whitespace-nowrap">
                Redes Sociais & Web
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#8B8B92] tabular-nums mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Vídeo ({queuesBySection.video.length})</span>
              <span aria-hidden="true">·</span>
              <span>Áudio ({queuesBySection.audio.length})</span>
              <span aria-hidden="true">·</span>
              <span>Imagem ({queuesBySection.image.length})</span>
              {allActiveDownloads > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-sky-400 font-semibold">
                    {allActiveDownloads} em andamento
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[11px] font-mono text-[#8B8B92] hidden md:inline whitespace-nowrap">
            {isExpanded ? "Recolher seções" : "Clique para abrir Vídeo · Áudio · Imagem"}
          </span>
          <div className="w-7 h-7 rounded-[4px] bg-[#1B1B1E] border border-[#26262A] text-[#CBD5E1] flex items-center justify-center">
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </div>
      </button>

      {/* 2. CORPO EXPANDIDO: BOTÕES DE SEÇÃO (VÍDEO | ÁUDIO | IMAGEM) + ÁREA SEPARADA */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-5 animate-fadeIn">
          {/* BOTÕES DAS 3 SEÇÕES SEPARADAS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["video", "audio", "image"] as MediaSection[]).map((sec) => {
              const isSelected = activeSection === sec;
              const info = sectionMeta[sec];
              const count = queuesBySection[sec].length;
              const activeInSec = queuesBySection[sec].filter(
                (t) => t.status === "downloading" || t.status === "extracting"
              ).length;

              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setActiveSection(sec)}
                  aria-pressed={isSelected}
                  data-selected={isSelected}
                  data-align="between"
                  className={`p-3.5 rounded-[6px] border text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-[#131315] border-[var(--gm-primary,#FE540B)]"
                      : "bg-[#131315] border-[#26262A] hover:border-[#3F3F46] hover:bg-[#1B1B1E]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-[4px] flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-[var(--gm-primary,#FE540B)] text-white border-[var(--gm-primary,#FE540B)]"
                          : "bg-[#1B1B1E] text-[#8B8B92] border-[#26262A]"
                      }`}
                    >
                      {renderSectionIcon(sec, isSelected)}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs sm:text-sm font-mono font-bold tracking-wider ${
                          isSelected ? "text-white" : "text-[#F2F2F3]"
                        }`}
                      >
                        {info.label}
                      </div>
                      <div className="text-[11px] font-mono text-[#8B8B92] truncate">
                        {info.shortDesc}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <div
                      className={`text-sm font-bold ${
                        isSelected ? "text-[var(--gm-primary,#FE540B)]" : "text-[#F2F2F3]"
                      }`}
                    >
                      {count}
                    </div>
                    <div className="text-[11px] text-[#8B8B92]">
                      {activeInSec > 0 ? `${activeInSec} ativo` : count === 1 ? "item" : "itens"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Toast Notificação */}
          {toastMessage && (
            <div className="w-full px-4 py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-[13px] font-medium flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Plataformas Suportadas */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400 select-none">
            <span className="text-zinc-200 font-semibold flex items-center gap-1.5 mr-1 whitespace-nowrap">
              <Zap size={13} className="text-[var(--gm-primary,#FE540B)] shrink-0" />
              <span>Leitura automática (Imagem ou Vídeo):</span>
            </span>
            <span>YouTube</span>
            <span aria-hidden="true">·</span>
            <span>Instagram</span>
            <span aria-hidden="true">·</span>
            <span>TikTok (Vídeo e Fotos)</span>
            <span aria-hidden="true">·</span>
            <span>X (Twitter)</span>
            <span aria-hidden="true">·</span>
            <span>Pinterest</span>
            <span aria-hidden="true">·</span>
            <span>Facebook</span>
            <span aria-hidden="true">·</span>
            <span>Kwai</span>
            <span aria-hidden="true">·</span>
            <span>Qualquer Site</span>
          </div>

          {/* ÁREA DE LINKS DA SEÇÃO SELECIONADA */}
          <div className="p-4 sm:p-5 rounded-lg bg-[#131315] border border-[#26262A] space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#26262A] pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#F2F2F3] tracking-wide flex-wrap">
                <span className="text-[var(--gm-primary,#FE540B)] font-mono uppercase">
                  Seção {sectionMeta[activeSection].label}
                </span>
                <span className="text-[#8B8B92]">·</span>
                <span>Links para Download</span>
                <span className="text-[#8B8B92]">·</span>
                <span className="font-mono tabular-nums text-[var(--gm-primary,#FE540B)]">
                  {validLinks.length} {validLinks.length === 1 ? "link válido" : "links válidos"}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePasteClipboardAll}
                  className="h-8 px-3 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] text-[#F2F2F3] text-[11px] font-mono font-semibold flex items-center justify-center gap-1.5 transition-[background-color,transform] duration-150 cursor-pointer active:scale-[0.96] whitespace-nowrap shrink-0"
                  title="Colar links da área de transferência"
                >
                  <Clipboard size={12} className="text-[var(--gm-primary,#FE540B)]" />
                  <span>Colar da Área de Transferência</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearSectionFields}
                  className="h-8 px-2.5 rounded-[6px] bg-[#1B1B1E] hover:bg-rose-500/15 border border-[#26262A] hover:border-rose-500/40 text-[#8B8B92] hover:text-rose-300 text-[11px] font-mono font-semibold flex items-center justify-center gap-1.5 transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] cursor-pointer whitespace-nowrap shrink-0"
                  title="Limpar campos desta seção"
                >
                  <Trash2 size={12} />
                  <span>Limpar Campos</span>
                </button>
              </div>
            </div>

            {/* Campos de Link desta Seção */}
            <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
              {currentUrlList.map((url, idx) => {
                const cleanUrl = url.trim();
                const hasHttp = cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://");
                const preview = hasHttp ? linkPreviews[cleanUrl] : null;
                const detectedKind = getDetectedKindLabel(preview?.metadata);
                const effectiveKind = getEffectiveMediaKind(preview?.metadata);
                const isImageOnlyInNonImageSection =
                  effectiveKind === "image" && activeSection !== "image";
                const isVideoInImageSection =
                  effectiveKind === "video" && activeSection === "image";

                return (
                  <div
                    key={`${activeSection}_${idx}`}
                    className="p-3 rounded-md bg-[#0B0B0C] border border-[#26262A] space-y-2.5 transition-colors hover:border-[#3F3F46]"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-10 rounded-[4px] bg-[#1B1B1E] border border-[#26262A] text-[#8B8B92] font-mono text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </div>

                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => handleUpdateLink(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleStartBatchDownloads();
                          }}
                          placeholder={sectionMeta[activeSection].placeholder}
                          className="w-full h-10 pl-3.5 pr-24 bg-[#131315] border border-[#26262A] hover:border-[#3F3F46] focus:border-[var(--gm-primary,#FE540B)] focus:outline-none rounded-[4px] text-[#F2F2F3] text-xs sm:text-[13px] font-mono tracking-tight transition-colors"
                        />

                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {url && (
                            <button
                              type="button"
                              onClick={() => handleUpdateLink(idx, "")}
                              className="w-7 h-7 text-[#8B8B92] hover:text-white rounded-[4px] hover:bg-[#1B1B1E] active:scale-[0.95] transition-[background-color,color,transform] duration-150 cursor-pointer text-xs flex items-center justify-center"
                              title="Limpar campo"
                            >
                              ✕
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePasteSingleRow(idx)}
                            className="px-2 py-1 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] text-[11px] font-mono font-semibold text-[#CBD5E1] hover:text-white flex items-center justify-center gap-1 cursor-pointer active:scale-[0.96] transition-[background-color,color,transform] duration-150"
                            title="Colar neste campo"
                          >
                            <Clipboard size={11} className="text-[var(--gm-primary,#FE540B)]" />
                            <span>Colar</span>
                          </button>
                        </div>
                      </div>

                      {currentUrlList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLinkRow(idx)}
                          className="w-10 h-10 rounded-[6px] bg-[#1B1B1E] hover:bg-rose-500/15 border border-[#26262A] hover:border-rose-500/40 text-[#8B8B92] hover:text-rose-400 flex items-center justify-center shrink-0 active:scale-[0.95] transition-[background-color,border-color,color,transform] duration-150 cursor-pointer"
                          title="Remover este campo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Prévia com Detecção Automática de Tipo (Vídeo vs Imagem) */}
                    {hasHttp && (
                      <div className="p-3 rounded-md bg-[#131315] border border-[#26262A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="relative w-24 h-16 rounded-[4px] bg-[#0B0B0C] border border-[#26262A] overflow-hidden shrink-0 flex items-center justify-center">
                            {preview?.loading ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0B0C] gap-1">
                                <Loader2 size={18} className="animate-spin text-[var(--gm-primary,#FE540B)]" />
                                <span className="text-[11px] font-mono text-[#8B8B92] uppercase">Lendo</span>
                              </div>
                            ) : preview?.metadata?.thumbnail && !brokenThumbs[`prev_${cleanUrl}`] ? (
                              <img
                                src={getProxiedThumbnailUrl(preview.metadata.thumbnail)}
                                alt={preview.metadata.title || "Miniatura Original"}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                                onError={() => {
                                  setBrokenThumbs((prev) => ({ ...prev, [`prev_${cleanUrl}`]: true }));
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0B0C] text-[#8B8B92] gap-1">
                                {effectiveKind === "image" || activeSection === "image" ? (
                                  <ImageIcon size={18} />
                                ) : activeSection === "audio" ? (
                                  <Music size={18} />
                                ) : (
                                  <Film size={18} />
                                )}
                              </div>
                            )}
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-[4px] bg-black/85 text-[11px] font-mono font-bold text-white uppercase border border-[#26262A] leading-none">
                              {effectiveKind === "image"
                                ? "FOTO"
                                : effectiveKind === "audio"
                                ? "ÁUDIO"
                                : effectiveKind === "video"
                                ? "VÍDEO"
                                : "PRÉVIA"}
                            </div>
                          </div>

                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="font-bold text-xs sm:text-sm text-zinc-100 truncate">
                              {preview?.loading
                                ? "Analisando mídia (vídeo / imagem) e carregando prévia..."
                                : preview?.metadata?.title ||
                                  (preview?.error ? "Mídia não extraída automaticamente" : "Mídia Original Detectada")}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 mt-1 flex-wrap">
                              <span className="text-[var(--gm-primary,#FE540B)] font-semibold whitespace-nowrap">
                                {preview?.metadata
                                  ? preview.metadata.platformLabel ||
                                    getPlatformBadge(preview.metadata.platform).label
                                  : getPlatformBadge(detectPlatform(cleanUrl)).label}
                              </span>
                              {detectedKind && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span
                                    className={`font-semibold whitespace-nowrap ${
                                      effectiveKind === "image" ? "text-violet-400" : "text-sky-400"
                                    }`}
                                  >
                                    {detectedKind}
                                  </span>
                                </>
                              )}
                              {preview?.metadata?.author && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-zinc-300 truncate font-medium max-w-[160px]">
                                    {preview.metadata.author}
                                  </span>
                                </>
                              )}
                              {preview?.metadata?.duration && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-zinc-300 font-medium tabular-nums">
                                    {preview.metadata.duration}
                                  </span>
                                </>
                              )}
                              <span aria-hidden="true">·</span>
                              {preview?.error ? (
                                <span className="text-amber-400 font-medium truncate">{preview.error}</span>
                              ) : (
                                <span className="text-emerald-400 font-medium whitespace-nowrap">
                                  {activeSection === "audio" && effectiveKind !== "image"
                                    ? `Extrair Áudio (${formatQualityDisplay("audio", currentQuality)})`
                                    : "Pronto para Download"}
                                </span>
                              )}
                            </div>

                            {(isImageOnlyInNonImageSection || isVideoInImageSection) && (
                              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                {isImageOnlyInNonImageSection && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveLinkToSection(cleanUrl, "image", idx)}
                                    className="text-[11px] font-mono text-violet-300 hover:text-violet-200 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                                  >
                                    <ArrowRightLeft size={11} />
                                    <span>Post de foto detectado · Mover para Seção IMAGEM</span>
                                  </button>
                                )}
                                {isVideoInImageSection && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveLinkToSection(cleanUrl, "video", idx)}
                                    className="text-[11px] font-mono text-sky-300 hover:text-sky-200 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                                  >
                                    <ArrowRightLeft size={11} />
                                    <span>Vídeo detectado · Mover para Seção VÍDEO</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadSingleItem(cleanUrl, preview?.metadata)}
                          className="h-9 px-4 rounded-[6px] bg-[var(--gm-primary,#FE540B)] hover:brightness-110 text-[#0B0B0C] text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 transition-transform active:scale-95 cursor-pointer self-stretch sm:self-center whitespace-nowrap"
                          title="Baixar este item individualmente agora"
                        >
                          <Download size={14} strokeWidth={2.5} />
                          <span>
                            {isImageOnlyInNonImageSection
                              ? "Baixar Imagem"
                              : activeSection === "audio"
                              ? "Extrair Áudio"
                              : "Baixar Agora"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Acrescentar Novo Campo */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#26262A]">
              <button
                type="button"
                onClick={handleAddLinkRow}
                className="h-10 px-4 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] hover:border-[var(--gm-primary,#FE540B)]/50 text-xs font-mono font-bold text-[#F2F2F3] hover:text-white flex items-center justify-center gap-2 active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 cursor-pointer group whitespace-nowrap shrink-0"
              >
                <Plus size={14} className="text-[var(--gm-primary,#FE540B)] group-hover:rotate-90 transition-transform duration-200" />
                <span>+ Acrescentar Novo Link</span>
              </button>

              <span className="text-[11px] font-mono text-[#8B8B92]">
                Tudo colado e baixado aqui fica registrado exclusivamente na seção {sectionMeta[activeSection].label}
              </span>
            </div>

            {/* Seletor de Qualidade Exclusivo da Seção + Botão Iniciar */}
            <div className="pt-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-t border-[#26262A]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-mono text-[#8B8B92] uppercase tracking-wider mr-1.5 whitespace-nowrap">
                  {activeSection === "audio"
                    ? "Qualidade do Áudio:"
                    : activeSection === "image"
                    ? "Qualidade da Imagem:"
                    : "Resolução do Vídeo:"}
                </span>

                {QUALITY_OPTIONS[activeSection].map((q) => (
                  <button
                    key={q.key}
                    type="button"
                    aria-pressed={currentQuality === q.key}
                    data-selected={currentQuality === q.key}
                    onClick={() =>
                      setQualityBySection((prev) => ({
                        ...prev,
                        [activeSection]: q.key,
                      }))
                    }
                    className={`h-9 px-3 rounded-[6px] text-[11px] font-mono font-bold inline-flex items-center justify-center active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 cursor-pointer border whitespace-nowrap ${
                      currentQuality === q.key
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        : "bg-[#1B1B1E] text-[#8B8B92] border-[#26262A] hover:text-white hover:border-[#3F3F46]"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleStartBatchDownloads}
                disabled={validLinks.length === 0}
                className="h-11 px-6 rounded-[6px] bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] hover:brightness-110 text-[var(--gm-primary-foreground,#0B0B0C)] border border-[var(--gm-btn-border,var(--gm-primary,#FE540B))] text-xs sm:text-[13px] font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer transition-[filter,transform] duration-150 active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
              >
                <HardDriveDownload size={17} />
                <span>
                  {activeSection === "audio"
                    ? `EXTRAIR ÁUDIO (${validLinks.length})`
                    : activeSection === "image"
                    ? `BAIXAR IMAGENS (${validLinks.length})`
                    : `INICIAR DOWNLOADS (${validLinks.length})`}
                </span>
              </button>
            </div>
          </div>

          {/* 3. HISTÓRICO / FILA SEPARADA DA SEÇÃO ATIVA */}
          <div className="p-4 sm:p-5 rounded-lg bg-[#131315] border border-[#26262A] space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#26262A] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[4px] bg-[var(--gm-primary,#FE540B)]/15 border border-[var(--gm-primary,#FE540B)]/40 text-[var(--gm-primary,#FE540B)] flex items-center justify-center shrink-0">
                  {renderSectionIcon(activeSection, false)}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-white tracking-tight flex items-center gap-2 flex-wrap">
                    <span>Registros · Seção {sectionMeta[activeSection].label}</span>
                    <span className="text-[#8B8B92] text-xs font-mono">· Fila Persistente</span>
                  </div>
                  <div className="text-[11px] font-mono text-[#8B8B92] tabular-nums">
                    Total: {totalCount}
                    {completedCount > 0 && ` · Concluídos: ${completedCount}`}
                    {downloadingCount > 0 && ` · Baixando: ${downloadingCount}`}
                    {pausedCount > 0 && ` · Pausados: ${pausedCount}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {completedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleClearCompleted(activeSection)}
                    className="h-8 px-3 rounded-[6px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] text-[#CBD5E1] hover:text-white text-[11px] font-mono flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.96] transition-[background-color,color,transform] duration-150 whitespace-nowrap shrink-0"
                  >
                    <Trash2 size={12} />
                    <span>Limpar Concluídos ({completedCount})</span>
                  </button>
                )}

                {currentQueue.length > 0 && (
                  <>
                    {downloadingCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => handlePauseAll(activeSection)}
                        className="h-8 px-3 rounded-[6px] bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-mono flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.96] transition-[background-color,transform] duration-150 whitespace-nowrap shrink-0"
                      >
                        <Pause size={12} />
                        <span>Pausar Todos</span>
                      </button>
                    ) : pausedCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleResumeAll(activeSection)}
                        className="h-8 px-3 rounded-[6px] bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.96] transition-[background-color,transform] duration-150 whitespace-nowrap shrink-0"
                      >
                        <Play size={12} />
                        <span>Retomar Todos</span>
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {currentQueue.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#26262A] rounded-md text-[#8B8B92] font-mono text-xs space-y-1">
                <div>{sectionMeta[activeSection].emptyText}</div>
                <div className="text-[11px] text-[#8B8B92]">
                  Cole um link acima nesta seção para baixar e manter o histórico separado das demais seções.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {currentQueue.map((task) => {
                  const isDownloading = task.status === "downloading" || task.status === "extracting";
                  const isCompleted = task.status === "completed";
                  const isPaused = task.status === "paused";
                  const isError = task.status === "error";

                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 sm:p-4 rounded-md border transition-colors space-y-3 ${
                        isCompleted
                          ? "bg-[#101713] border-emerald-500/40"
                          : isDownloading
                          ? "bg-[#101318] border-sky-500/40"
                          : isPaused
                          ? "bg-[#161410] border-amber-500/40"
                          : "bg-[#0B0B0C] border-[#26262A]"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="relative w-24 h-16 sm:w-28 sm:h-20 rounded-[4px] bg-[#0B0B0C] border border-[#26262A] overflow-hidden shrink-0 flex items-center justify-center">
                            {task.thumbnail && !brokenThumbs[`task_${task.id}`] ? (
                              <img
                                src={getProxiedThumbnailUrl(task.thumbnail)}
                                alt={task.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                                onError={() => {
                                  setBrokenThumbs((prev) => ({ ...prev, [`task_${task.id}`]: true }));
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0B0C] text-[#8B8B92]">
                                {task.formatType === "audio" ? (
                                  <Music size={20} />
                                ) : task.formatType === "image" ? (
                                  <ImageIcon size={20} />
                                ) : (
                                  <Film size={20} />
                                )}
                              </div>
                            )}
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-[4px] bg-black/85 text-[11px] font-mono font-bold text-white uppercase border border-[#26262A] leading-none">
                              {task.extension.toUpperCase()}
                            </div>
                            {task.resolution && (
                              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-[4px] bg-[var(--gm-primary,#FE540B)] text-[#0B0B0C] text-[11px] font-mono font-black uppercase leading-none">
                                {task.quality.toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="font-bold text-sm text-[#F2F2F3] truncate">
                              {task.title}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] font-mono text-[#8B8B92] truncate pt-1">
                              <span className="text-[var(--gm-primary,#FE540B)] font-semibold whitespace-nowrap">
                                {task.platformLabel}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#F2F2F3] font-semibold whitespace-nowrap">
                                {task.resolution}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-[200px] text-[#8B8B92]">{task.url}</span>
                              {task.transferRate && task.transferRate !== "0.0 MB/s" && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-emerald-400 font-bold tabular-nums whitespace-nowrap">
                                    {task.transferRate}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {isDownloading && (
                            <button
                              type="button"
                              onClick={() => handlePauseTask(activeSection, task.id)}
                              className="h-10 px-4 rounded-[6px] bg-[#1B1B1E] hover:bg-amber-500/20 text-[#CBD5E1] hover:text-amber-300 border border-[#26262A] text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.96] transition-[background-color,color,transform] duration-150 whitespace-nowrap shrink-0"
                              title="Pausar download"
                            >
                              <Pause size={14} className="shrink-0" />
                              <span>Pausar</span>
                            </button>
                          )}

                          {isPaused && (
                            <button
                              type="button"
                              onClick={() => executeTaskDownload(activeSection, task)}
                              className="h-10 px-4 rounded-[6px] bg-emerald-500 hover:bg-emerald-600 text-[#0B0B0C] text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-[background-color,transform] duration-150 active:scale-[0.96] whitespace-nowrap shrink-0"
                              title="Retomar download"
                            >
                              <Play size={14} className="shrink-0" />
                              <span>Retomar</span>
                            </button>
                          )}

                          {isCompleted && (
                            <button
                              type="button"
                              onClick={() => handleSaveAgain(activeSection, task)}
                              className="h-10 px-4 rounded-[6px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-[background-color,transform] duration-150 active:scale-[0.96] whitespace-nowrap shrink-0"
                              title="Salvar novamente na pasta Downloads"
                            >
                              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                              <span>SALVO (BAIXAR DE NOVO)</span>
                            </button>
                          )}

                          {isError && (
                            <button
                              type="button"
                              onClick={() => executeTaskDownload(activeSection, task)}
                              className="h-10 px-3.5 rounded-[6px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.96] transition-[background-color,transform] duration-150 whitespace-nowrap shrink-0"
                            >
                              <RotateCcw size={13} className="shrink-0" />
                              <span>Tentar de Novo</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveTask(activeSection, task.id)}
                            className="w-10 h-10 rounded-[6px] bg-[#1B1B1E] hover:bg-rose-500/20 text-[#8B8B92] hover:text-rose-400 border border-[#26262A] hover:border-rose-500/40 flex items-center justify-center active:scale-[0.95] transition-[background-color,border-color,color,transform] duration-150 cursor-pointer shrink-0"
                            title="Remover da lista"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Progresso */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span
                            className={`truncate max-w-[75%] ${
                              isError ? "text-rose-400 font-semibold" : "text-[#8B8B92]"
                            }`}
                          >
                            {task.statusText}
                          </span>
                          <span
                            className={`font-bold text-sm tabular-nums ${
                              isCompleted
                                ? "text-emerald-400"
                                : isPaused
                                ? "text-amber-400"
                                : isError
                                ? "text-rose-400"
                                : "text-[var(--gm-primary,#FE540B)]"
                            }`}
                          >
                            {task.percentage}%
                          </span>
                        </div>

                        <div className="w-full h-3 rounded-full bg-[#1B1B1E] border border-[#26262A] overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-200 relative overflow-hidden ${
                              isCompleted
                                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                : isPaused
                                ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                : "bg-gradient-to-r from-[var(--gm-primary,#FE540B)] via-amber-400 to-emerald-400"
                            }`}
                            style={{ width: `${task.percentage}%` }}
                          >
                            {isDownloading && (
                              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:16px_16px] animate-[progress-bar-stripes_1s_linear_infinite]" />
                            )}
                          </div>
                        </div>

                        {isCompleted && (
                          <div className="pt-0.5 flex items-center justify-between text-[11px] font-mono text-emerald-400 font-semibold">
                            <span className="flex items-center gap-1.5">
                              <Check size={12} className="stroke-[3]" />
                              <span>Arquivo salvo com sucesso na sua pasta Downloads!</span>
                            </span>
                            <span className="text-[11px] font-bold">CONCLUÍDO 100%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
