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
  ShieldCheck,
  X,
  Sparkles,
} from "lucide-react";
import {
  fetchMediaMetadata,
  downloadMediaItem,
  saveBlobToDevice,
  MediaMetadata,
  MediaFormatOption,
  getPlatformBadge,
  BatchDownloadTask,
} from "../../lib/mediaExtractor";

const STORAGE_QUEUE_KEY = "gm_batch_downloads_queue_v2";

export const MediaDownloader: React.FC = () => {
  // 1. Múltiplos Campos de Links (Downloads em Massa: 1 campo para 1 vídeo)
  const [urlList, setUrlList] = useState<string[]>([""]);

  // 2. Seleção de Formato e Resolução
  const [selectedType, setSelectedType] = useState<"video" | "audio" | "image">("video");
  const [selectedQuality, setSelectedQuality] = useState<string>("1080p");

  // 3. Fila de Downloads Persistente (Estilo Torrent / IDM)
  const [queue, setQueue] = useState<BatchDownloadTask[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_QUEUE_KEY);
      if (stored) {
        const parsed: BatchDownloadTask[] = JSON.parse(stored);
        // Se fechou o app enquanto baixava, restaura como pausado para permitir retomar
        return parsed.map((item) =>
          item.status === "downloading" || item.status === "extracting"
            ? { ...item, status: "paused", statusText: "Download pausado (restaurado)" }
            : item
        );
      }
    } catch {}
    return [];
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Referências para controle de abort e blobs em memória
  const activeControllers = useRef<Map<string, AbortController>>(new Map());
  const activeBlobs = useRef<Map<string, Blob>>(new Map());

  // Salva a fila no localStorage a cada atualização
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queue));
    } catch {}
  }, [queue]);

  // Limpa toast após 5s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Altera resolução padrão ao trocar tipo de mídia
  useEffect(() => {
    if (selectedType === "video" && !["4k", "1080p", "720p", "480p"].includes(selectedQuality)) {
      setSelectedQuality("1080p");
    } else if (selectedType === "audio" && !["320k", "128k"].includes(selectedQuality)) {
      setSelectedQuality("320k");
    } else if (selectedType === "image" && !["8k", "4k", "1080p"].includes(selectedQuality)) {
      setSelectedQuality("8k");
    }
  }, [selectedType]);

  // --- Manipulação dos Campos de Links ---
  const handleUpdateLink = (index: number, value: string) => {
    setUrlList((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleAddLinkRow = () => {
    setUrlList((prev) => [...prev, ""]);
  };

  const handleRemoveLinkRow = (index: number) => {
    if (urlList.length <= 1) {
      setUrlList([""]);
      return;
    }
    setUrlList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAllFields = () => {
    setUrlList([""]);
  };

  const handlePasteClipboardAll = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          // Extrai URLs do texto colado (suporta múltiplas URLs por linha)
          const urls = text
            .split(/[\r\n\s]+/)
            .map((u) => u.trim())
            .filter((u) => u.startsWith("http://") || u.startsWith("https://"));

          if (urls.length > 0) {
            setUrlList(urls);
            setToastMessage(`${urls.length} link(s) colado(s) com sucesso da área de transferência!`);
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

  // Contagem de links válidos inseridos
  const validLinks = urlList.map((u) => u.trim()).filter((u) => u.startsWith("http"));

  // --- Iniciar Processamento dos Downloads em Massa ---
  const handleStartBatchDownloads = async () => {
    if (validLinks.length === 0) {
      setToastMessage("Insira pelo menos um link válido para iniciar o download.");
      return;
    }

    const newTasks: BatchDownloadTask[] = validLinks.map((url, i) => {
      const ext =
        selectedType === "image"
          ? "jpg"
          : selectedType === "audio"
          ? "mp3"
          : "mp4";

      const qualityLabel =
        selectedQuality === "4k"
          ? "4K Ultra HD"
          : selectedQuality === "8k"
          ? "8K Master HQ"
          : selectedQuality === "320k"
          ? "320 kbps HQ"
          : selectedQuality === "128k"
          ? "128 kbps"
          : selectedQuality.toUpperCase();

      return {
        id: `${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        url,
        title: "Identificando mídia original...",
        author: "Carregando...",
        thumbnail: "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=600&auto=format&fit=crop",
        platform: "web",
        platformLabel: "Mídia Web",
        formatId: `${selectedType}_${selectedQuality}`,
        formatType: selectedType,
        quality: selectedQuality,
        resolution: qualityLabel,
        extension: ext,
        filesizeApprox: selectedType === "image" ? "~8.2 MB" : selectedType === "audio" ? "~8.2 MB" : selectedQuality === "4k" ? "~142.8 MB" : "~48.5 MB",
        percentage: 0,
        status: "queued",
        statusText: "Aguardando início do stream...",
        transferRate: "0.0 MB/s",
        downloadedSize: "0.0 MB",
        totalSize: selectedQuality === "4k" ? "142.8 MB" : "48.5 MB",
      };
    });

    // Acrescenta novas tarefas no topo da fila
    setQueue((prev) => [...newTasks, ...prev]);

    // Limpa campos após enfileirar
    setUrlList([""]);
    setToastMessage(`${newTasks.length} download(s) adicionado(s) ao Gerenciador de Downloads!`);

    // Inicia a execução dos itens enfileirados
    for (const task of newTasks) {
      executeTaskDownload(task);
    }
  };

  // --- Motor de Download Individual com Suporte a Pausa & Retomada ---
  const executeTaskDownload = async (task: BatchDownloadTask) => {
    // Cria AbortController para permitir pausar a qualquer momento
    const controller = new AbortController();
    activeControllers.current.set(task.id, controller);

    updateTask(task.id, {
      status: "extracting",
      statusText: "Consultando metadados e streams originais...",
    });

    try {
      // 1. Extrai metadados originais (título, autor, miniatura autêntica)
      let meta: MediaMetadata;
      try {
        meta = await fetchMediaMetadata(task.url);
      } catch {
        meta = {
          url: task.url,
          platform: "generic",
          platformLabel: "Mídia Web",
          title: `Vídeo da Web (${task.url.slice(0, 32)})`,
          author: "Canal Original",
          thumbnail: "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=600&auto=format&fit=crop",
          formats: [],
        };
      }

      if (controller.signal.aborted) return;

      // 2. Identifica o melhor formato para o tipo e qualidade selecionados
      const matchingFormat = meta.formats.find(
        (f) => f.type === task.formatType && (f.quality.toLowerCase().includes(task.quality) || f.id.includes(task.quality))
      ) || meta.formats.find((f) => f.type === task.formatType) || {
        id: task.formatId,
        type: task.formatType,
        quality: task.quality,
        resolution: task.resolution,
        extension: task.extension,
        label: `${task.extension.toUpperCase()} · ${task.resolution}`,
        badge: task.resolution,
        filesizeApprox: task.filesizeApprox,
        directUrl: task.url,
      };

      const finalTitle = meta.title || "Mídia Original Baixada";
      const finalThumb = meta.thumbnail || task.thumbnail;
      const platformBadge = getPlatformBadge(meta.platform);

      updateTask(task.id, {
        title: finalTitle,
        author: meta.author,
        thumbnail: finalThumb,
        platform: meta.platform,
        platformLabel: platformBadge.label,
        status: "downloading",
        statusText: "Estabelecendo conexões com o servidor...",
      });

      // 3. Executa o streaming com callback de progresso em tempo real
      const result = await downloadMediaItem(
        meta,
        matchingFormat as MediaFormatOption,
        (report) => {
          if (controller.signal.aborted) return;
          updateTask(task.id, {
            percentage: report.percentage,
            transferRate: report.transferRate,
            downloadedSize: report.downloadedSize,
            totalSize: report.totalSize,
            statusText: report.statusText,
          });
        },
        controller.signal
      );

      if (result.success && result.blob) {
        // Armazena o blob para permitir baixar novamente
        activeBlobs.current.set(task.id, result.blob);

        // Salva automaticamente o arquivo no dispositivo
        saveBlobToDevice(result.blob, result.filename);

        updateTask(task.id, {
          status: "completed",
          percentage: 100,
          statusText: "Download concluído 100%! Salvo na sua pasta Downloads.",
          transferRate: "0.0 MB/s",
          completedAt: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        });
      }
    } catch (err: any) {
      if (controller.signal.aborted || err?.message?.includes("pausado")) {
        updateTask(task.id, {
          status: "paused",
          statusText: "Download pausado pelo usuário.",
          transferRate: "0.0 MB/s",
        });
      } else {
        updateTask(task.id, {
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

  const updateTask = (id: string, updates: Partial<BatchDownloadTask>) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // --- Pausar Download Individual ---
  const handlePauseTask = (id: string) => {
    const controller = activeControllers.current.get(id);
    if (controller) {
      controller.abort();
      activeControllers.current.delete(id);
    }
    updateTask(id, {
      status: "paused",
      statusText: "Download pausado pelo usuário.",
      transferRate: "0.0 MB/s",
    });
  };

  // --- Retomar Download Individual ---
  const handleResumeTask = (task: BatchDownloadTask) => {
    executeTaskDownload(task);
  };

  // --- Salvar Mídia Já Baixada Novamente no Dispositivo ---
  const handleSaveAgain = (task: BatchDownloadTask) => {
    const blob = activeBlobs.current.get(task.id);
    const safeName = `${task.title.slice(0, 45).replace(/[^a-zA-Z0-9_\-\u00C0-\u017F ]/g, "").trim()}.${task.extension}`;

    if (blob) {
      saveBlobToDevice(blob, safeName);
      setToastMessage(`Arquivo "${safeName}" salvo com sucesso na sua pasta Downloads!`);
    } else {
      // Se fechou e reabriu o app e o blob não está na RAM, faz o download direto
      executeTaskDownload(task);
    }
  };

  // --- Remover Item da Fila ---
  const handleRemoveTask = (id: string) => {
    const controller = activeControllers.current.get(id);
    if (controller) {
      controller.abort();
      activeControllers.current.delete(id);
    }
    activeBlobs.current.delete(id);
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // --- Limpar Concluídos ---
  const handleClearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== "completed"));
  };

  // --- Pausar Todos os Downloads ---
  const handlePauseAll = () => {
    queue.forEach((item) => {
      if (item.status === "downloading" || item.status === "extracting") {
        handlePauseTask(item.id);
      }
    });
  };

  // --- Retomar Todos os Downloads ---
  const handleResumeAll = () => {
    queue.forEach((item) => {
      if (item.status === "paused" || item.status === "queued") {
        executeTaskDownload(item);
      }
    });
  };

  // Estatísticas da Fila
  const totalCount = queue.length;
  const completedCount = queue.filter((t) => t.status === "completed").length;
  const downloadingCount = queue.filter((t) => t.status === "downloading" || t.status === "extracting").length;
  const pausedCount = queue.filter((t) => t.status === "paused").length;

  return (
    <div className="forge-spec relative overflow-hidden w-full transition-all duration-200 border border-[#27272A] bg-[#0C0D0F] rounded-xl shadow-2xl">
      {/* 1. BARRA SUPERIOR FORGE SPEC */}
      <div className="forge-spec__bar bg-[#121316] border-b border-[#26262A] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-5 h-5 rounded-[4px] bg-[var(--gm-primary,#FE540B)]/20 border border-[var(--gm-primary,#FE540B)]/40 text-[var(--gm-primary,#FE540B)] text-[11px] font-mono font-bold flex items-center justify-center">
            01
          </span>
          <span className="text-xs font-mono font-bold uppercase text-[#F2F2F3] tracking-wider flex items-center gap-1.5">
            <span>MOTOR UNIVERSAL DE DOWNLOAD</span>
            <span className="text-zinc-600 hidden sm:inline">/</span>
            <span className="text-[var(--gm-primary,#FE540B)] font-mono hidden sm:inline">IDM PRO ACCELERATOR</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-[4px] bg-emerald-500/10 border border-emerald-500/30 text-[10.5px] font-mono font-semibold text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            MOTOR IDM ATIVO // 8 THREADS
          </span>
        </div>
      </div>

      {/* 2. CORPO PRINCIPAL */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Toast Notificação de Sucesso */}
        {toastMessage && (
          <div className="w-full px-4 py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-[13px] font-medium flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Badges de Plataformas Desbloqueadas (Sem menção a sites adultos) */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5 select-none text-xs font-mono">
          <span className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider flex items-center gap-1 mr-1">
            <Zap size={13} className="text-[var(--gm-primary,#FE540B)]" />
            <span className="font-bold text-zinc-300">DESBLOQUEIO TOTAL:</span>
          </span>
          {[
            { name: "YouTube (Desbloqueado)", dot: "#EF4444" },
            { name: "TikTok (Sem Marca)", dot: "#00F2FE" },
            { name: "Kwai", dot: "#FF5E00" },
            { name: "Instagram Reels", dot: "#E1306C" },
            { name: "Facebook", dot: "#3B82F6" },
            { name: "X (Twitter)", dot: "#38BDF8" },
            { name: "Qualquer Vídeo Web", dot: "#10B981" },
          ].map((p) => (
            <span
              key={p.name}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#121316] border border-[#232326] text-[11px] font-mono text-zinc-300"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.dot }} />
              {p.name}
            </span>
          ))}
        </div>

        {/* SEÇÃO DE LINKS PARA DOWNLOAD (1 CAMPO PARA 1 VÍDEO // DOWNLOADS EM MASSA) */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#0E0F12] border border-[#242529] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#202126] pb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-zinc-200 tracking-wider">
              <span className="text-[var(--gm-primary,#FE540B)]">//</span>
              <span>LINKS PARA DOWNLOAD ({validLinks.length} LINK{validLinks.length === 1 ? " VÁLIDO" : "S VÁLIDOS"}):</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePasteClipboardAll}
                className="h-8 px-3 rounded-[5px] bg-[#18181D] hover:bg-[#222228] border border-[#2E2F35] text-zinc-200 hover:text-white text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Colar links da área de transferência (suporta múltiplos)"
              >
                <Clipboard size={12} className="text-[var(--gm-primary,#FE540B)]" />
                <span>Colar da Área de Transferência</span>
              </button>

              <button
                type="button"
                onClick={handleClearAllFields}
                className="h-8 px-2.5 rounded-[5px] bg-[#18181D] hover:bg-rose-500/15 border border-[#2E2F35] hover:border-rose-500/40 text-zinc-400 hover:text-rose-300 text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Limpar todos os campos"
              >
                <Trash2 size={12} />
                <span>Limpar Campos</span>
              </button>
            </div>
          </div>

          {/* Lista de Campos: 1 campo para 1 vídeo */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {urlList.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2 group">
                <div className="w-8 h-11 rounded-lg bg-[#141518] border border-[#26262B] text-zinc-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
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
                    placeholder="https://www.instagram.com/reel/... ou YouTube, TikTok, Kwai, etc..."
                    className="w-full h-11 pl-3.5 pr-20 bg-[#111215] border border-[#27272A] hover:border-[#383A42] focus:border-[var(--gm-primary,#FE540B)] focus:outline-none rounded-lg text-[#F2F2F3] text-xs sm:text-[13px] font-mono tracking-tight transition-all shadow-inner"
                  />

                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {url && (
                      <button
                        type="button"
                        onClick={() => handleUpdateLink(idx, "")}
                        className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer text-xs"
                        title="Limpar campo"
                      >
                        ✕
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handlePasteSingleRow(idx)}
                      className="px-2 py-1 rounded bg-[#1B1C20] hover:bg-[#25262C] border border-[#2E2F36] text-[10.5px] font-mono font-semibold text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      title="Colar neste campo"
                    >
                      <Clipboard size={11} className="text-[var(--gm-primary,#FE540B)]" />
                      <span>Colar</span>
                    </button>
                  </div>
                </div>

                {urlList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLinkRow(idx)}
                    className="w-10 h-11 rounded-lg bg-[#15161A] hover:bg-rose-500/15 border border-[#27272C] hover:border-rose-500/40 text-zinc-500 hover:text-rose-400 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                    title="Remover este campo"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Botão de Acrescentar Novo Campo de Link */}
          <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#202126]">
            <button
              type="button"
              onClick={handleAddLinkRow}
              className="h-10 px-4 rounded-lg bg-[#15161A] hover:bg-[#1E1F25] border border-[#2B2C33] hover:border-[var(--gm-primary,#FE540B)]/50 text-xs font-mono font-bold text-zinc-200 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group"
            >
              <Plus size={14} className="text-[var(--gm-primary,#FE540B)] group-hover:rotate-90 transition-transform duration-200" />
              <span>+ Acrescentar Novo Link</span>
            </button>

            <span className="text-[11px] font-mono text-zinc-400">
              Adicione quantos links precisar • Suporte a downloads simultâneos
            </span>
          </div>

          {/* Barra de Seleção de Formato e Resoluções (4K Vídeo, 8K Imagem, Áudio HQ) */}
          <div className="pt-2 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-t border-[#202126]">
            {/* Seletor de Tipo */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedType("video")}
                className={`h-10 px-4 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border ${
                  selectedType === "video"
                    ? "bg-[var(--gm-primary,#FE540B)] text-[var(--gm-primary-foreground,#0b0b0c)] border-[var(--gm-primary,#FE540B)] shadow-[0_2px_12px_rgba(var(--gm-primary-rgb,254,84,11),0.3)] font-black"
                    : "bg-[#141518] text-zinc-400 border-[#26262B] hover:text-white hover:bg-[#1C1D22]"
                }`}
              >
                <Video size={14} />
                <span>Vídeo MP4</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("audio")}
                className={`h-10 px-4 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border ${
                  selectedType === "audio"
                    ? "bg-[var(--gm-primary,#FE540B)] text-[var(--gm-primary-foreground,#0b0b0c)] border-[var(--gm-primary,#FE540B)] shadow-[0_2px_12px_rgba(var(--gm-primary-rgb,254,84,11),0.3)] font-black"
                    : "bg-[#141518] text-zinc-400 border-[#26262B] hover:text-white hover:bg-[#1C1D22]"
                }`}
              >
                <Music size={14} />
                <span>Áudio MP3 HQ</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType("image")}
                className={`h-10 px-4 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border ${
                  selectedType === "image"
                    ? "bg-[var(--gm-primary,#FE540B)] text-[var(--gm-primary-foreground,#0b0b0c)] border-[var(--gm-primary,#FE540B)] shadow-[0_2px_12px_rgba(var(--gm-primary-rgb,254,84,11),0.3)] font-black"
                    : "bg-[#141518] text-zinc-400 border-[#26262B] hover:text-white hover:bg-[#1C1D22]"
                }`}
              >
                <ImageIcon size={14} />
                <span>Imagem (8K/4K/HD)</span>
              </button>

              {/* Seletor Dinâmico de Resolução */}
              <div className="flex items-center gap-1 pl-1 border-l border-[#24252B] ml-1">
                {selectedType === "video" && (
                  <>
                    {[
                      { key: "4k", label: "4K Ultra HD" },
                      { key: "1080p", label: "1080p Full HD" },
                      { key: "720p", label: "720p" },
                      { key: "480p", label: "480p" },
                    ].map((q) => (
                      <button
                        key={q.key}
                        type="button"
                        onClick={() => setSelectedQuality(q.key)}
                        className={`h-9 px-2.5 rounded-[5px] text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                          selectedQuality === q.key
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                            : "bg-[#16171B] text-zinc-400 border-[#27272D] hover:text-white"
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </>
                )}

                {selectedType === "audio" && (
                  <>
                    {[
                      { key: "320k", label: "320 kbps (HQ)" },
                      { key: "128k", label: "128 kbps (Leve)" },
                    ].map((q) => (
                      <button
                        key={q.key}
                        type="button"
                        onClick={() => setSelectedQuality(q.key)}
                        className={`h-9 px-3 rounded-[5px] text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                          selectedQuality === q.key
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                            : "bg-[#16171B] text-zinc-400 border-[#27272D] hover:text-white"
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </>
                )}

                {selectedType === "image" && (
                  <>
                    {[
                      { key: "8k", label: "8K Ultra HD" },
                      { key: "4k", label: "4K Original" },
                      { key: "1080p", label: "Full HD" },
                    ].map((q) => (
                      <button
                        key={q.key}
                        type="button"
                        onClick={() => setSelectedQuality(q.key)}
                        className={`h-9 px-3 rounded-[5px] text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                          selectedQuality === q.key
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                            : "bg-[#16171B] text-zinc-400 border-[#27272D] hover:text-white"
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* BOTÃO MESTRE: INICIAR DOWNLOADS NO SERVIDOR */}
            <button
              type="button"
              onClick={handleStartBatchDownloads}
              disabled={validLinks.length === 0}
              className="h-12 px-7 rounded-lg bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] hover:brightness-110 text-[var(--gm-primary-foreground,#0B0B0C)] border border-[var(--gm-btn-border,var(--gm-primary,#FE540B))] text-xs sm:text-[13px] font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_4px_20px_rgba(var(--gm-primary-rgb,254,84,11),0.35)] transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <HardDriveDownload size={18} />
              <span>INICIAR DOWNLOADS NO SERVIDOR ({validLinks.length})</span>
            </button>
          </div>
        </div>

        {/* 3. GERENCIADOR DE DOWNLOADS [ESTILO TORRENT / IDM] */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#0E0F12] border border-[#242529] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#202126] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[var(--gm-primary,#FE540B)]/20 border border-[var(--gm-primary,#FE540B)]/40 text-[var(--gm-primary,#FE540B)] flex items-center justify-center">
                <HardDriveDownload size={18} />
              </div>
              <div>
                <div className="text-xs font-mono font-bold uppercase text-white tracking-wider flex items-center gap-2">
                  <span>GERENCIADOR DE DOWNLOADS</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ESTILO TORRENT / IDM
                  </span>
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  Segundo plano contínuo // Controle individual de pausa e retomada
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="h-8 px-3 rounded-[5px] bg-[#18181D] hover:bg-[#222228] border border-[#2E2F35] text-zinc-300 hover:text-white text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 size={12} />
                  <span>Limpar Concluídos ({completedCount})</span>
                </button>
              )}

              {queue.length > 0 && (
                <>
                  {downloadingCount > 0 ? (
                    <button
                      type="button"
                      onClick={handlePauseAll}
                      className="h-8 px-3 rounded-[5px] bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Pause size={12} />
                      <span>Pausar Todos</span>
                    </button>
                  ) : pausedCount > 0 ? (
                    <button
                      type="button"
                      onClick={handleResumeAll}
                      className="h-8 px-3 rounded-[5px] bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Play size={12} />
                      <span>Retomar Todos</span>
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Contadores da Fila */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            <span className="px-2.5 py-1 rounded-[4px] bg-[#15161A] border border-[#24252B] text-zinc-300 font-semibold">
              Total: <strong className="text-white">{totalCount}</strong>
            </span>
            {completedCount > 0 && (
              <span className="px-2.5 py-1 rounded-[4px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1.5">
                <Check size={12} />
                Concluídos: <strong>{completedCount}</strong>
              </span>
            )}
            {downloadingCount > 0 && (
              <span className="px-2.5 py-1 rounded-[4px] bg-sky-500/15 border border-sky-500/30 text-sky-300 font-semibold flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                Baixando: <strong>{downloadingCount}</strong>
              </span>
            )}
            {pausedCount > 0 && (
              <span className="px-2.5 py-1 rounded-[4px] bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold flex items-center gap-1.5">
                <Pause size={12} />
                Pausados: <strong>{pausedCount}</strong>
              </span>
            )}
          </div>

          {/* Lista de Itens do Gerenciador */}
          {queue.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[#26262C] rounded-lg text-zinc-500 font-mono text-xs space-y-1">
              <div>Nenhum download ativo ou na fila no momento.</div>
              <div className="text-[11px] text-zinc-600">
                Cole links no campo acima e clique em &ldquo;Iniciar Downloads no Servidor&rdquo;.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((task) => {
                const isDownloading = task.status === "downloading" || task.status === "extracting";
                const isCompleted = task.status === "completed";
                const isPaused = task.status === "paused";
                const isError = task.status === "error";

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all space-y-3 ${
                      isCompleted
                        ? "bg-[#101713] border-emerald-500/40"
                        : isDownloading
                        ? "bg-[#101318] border-sky-500/40 shadow-lg"
                        : isPaused
                        ? "bg-[#161410] border-amber-500/40"
                        : "bg-[#121316] border-[#242529]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {/* Miniatura Original e Informações */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative w-16 h-12 rounded-lg bg-black border border-white/10 overflow-hidden shrink-0 shadow">
                          <img
                            src={task.thumbnail}
                            alt={task.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=400&auto=format&fit=crop";
                            }}
                          />
                          <div className="absolute top-1 left-1 px-1 py-0.2 rounded-[2px] bg-black/80 text-[8.5px] font-mono font-bold text-white uppercase">
                            {task.formatType === "video" ? "MP4" : task.formatType === "audio" ? "MP3" : "JPG"}
                          </div>
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="font-bold text-sm text-zinc-100 truncate">
                            {task.title}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 truncate pt-0.5">
                            <span className="text-[var(--gm-primary,#FE540B)] font-bold">
                              {task.platformLabel}
                            </span>
                            <span>•</span>
                            <span className="text-zinc-300 font-semibold">{task.resolution}</span>
                            <span>•</span>
                            <span className="truncate max-w-[200px] text-zinc-500">{task.url}</span>
                            {task.transferRate && task.transferRate !== "0.0 MB/s" && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400 font-bold">{task.transferRate}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações do Item */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {isDownloading && (
                          <button
                            type="button"
                            onClick={() => handlePauseTask(task.id)}
                            className="h-9 px-3 rounded-[5px] bg-[#1C1D22] hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border border-[#2B2C33] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Pausar download"
                          >
                            <Pause size={13} />
                            <span>Pausar</span>
                          </button>
                        )}

                        {isPaused && (
                          <button
                            type="button"
                            onClick={() => handleResumeTask(task)}
                            className="h-9 px-3 rounded-[5px] bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95"
                            title="Retomar download"
                          >
                            <Play size={13} />
                            <span>Retomar</span>
                          </button>
                        )}

                        {isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleSaveAgain(task)}
                            className="h-9 px-3.5 rounded-[5px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                            title="Salvar novamente na pasta Downloads"
                          >
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            <span>SALVO (BAIXAR DE NOVO)</span>
                          </button>
                        )}

                        {isError && (
                          <button
                            type="button"
                            onClick={() => executeTaskDownload(task)}
                            className="h-9 px-3 rounded-[5px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <RotateCcw size={12} />
                            <span>Tentar de Novo</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveTask(task.id)}
                          className="w-9 h-9 rounded-[5px] bg-[#18191E] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-[#292A31] hover:border-rose-500/40 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title="Remover da lista"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Barra de Animação com Porcentagem e Status */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-400 truncate max-w-[75%]">
                          {task.statusText}
                        </span>
                        <span className={`font-bold text-sm ${
                          isCompleted ? "text-emerald-400" : isPaused ? "text-amber-400" : "text-[var(--gm-primary,#FE540B)]"
                        }`}>
                          {task.percentage}%
                        </span>
                      </div>

                      {/* Barra Estilo Torrent com Listras Animadas */}
                      <div className="w-full h-3 rounded-full bg-[#18181D] border border-[#292A32] overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-200 relative overflow-hidden ${
                            isCompleted
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                              : isPaused
                              ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                              : "bg-gradient-to-r from-[var(--gm-primary,#FE540B)] via-amber-400 to-emerald-400 shadow-[0_0_12px_rgba(var(--gm-primary-rgb,254,84,11),0.5)]"
                          }`}
                          style={{ width: `${task.percentage}%` }}
                        >
                          {/* Listras em movimento contínuo durante o download */}
                          {isDownloading && (
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:16px_16px] animate-[progress-bar-stripes_1s_linear_infinite]" />
                          )}
                        </div>
                      </div>

                      {/* Mensagem de sucesso quando concluído 100% */}
                      {isCompleted && (
                        <div className="pt-0.5 flex items-center justify-between text-[11px] font-mono text-emerald-400 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Check size={12} className="stroke-[3]" />
                            <span>Arquivo salvo com sucesso na sua pasta Downloads!</span>
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-[10px] font-bold">
                            CONCLUÍDO 100%
                          </span>
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
    </div>
  );
};
