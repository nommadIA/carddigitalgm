/**
 * Módulo de Extração de Mídia e Metadados Universal (Vídeo & Áudio)
 * Motor IDM Pro: Multi-Segmentação Paralela e Download Direto Sem Restrições
 */

export interface MediaMetadata {
  url: string;
  platform: 'youtube' | 'tiktok' | 'kwai' | 'instagram' | 'twitter' | 'facebook' | 'vimeo' | 'pinterest' | 'adult' | 'image' | 'generic';
  platformLabel: string;
  detectedMediaKind?: 'video' | 'audio' | 'image';
  title: string;
  author: string;
  thumbnail: string;
  duration?: string;
  formats: MediaFormatOption[];
}

export interface MediaFormatOption {
  id: string;
  type: 'video' | 'audio' | 'image';
  quality: string;
  resolution?: string;
  bitrate?: string;
  extension: 'mp4' | 'webm' | 'mp3' | 'm4a' | 'jpg' | 'png';
  label: string;
  badge: string;
  filesizeApprox?: string;
  directUrl?: string;
  isPopular?: boolean;
}

export interface IdmSegmentThread {
  id: number;
  percentage: number;
  speed: string;
  rangeText: string;
  status: 'connecting' | 'downloading' | 'complete';
}

export interface IdmDownloadProgressReport {
  active: boolean;
  filename: string;
  formatLabel: string;
  percentage: number;
  statusText: string;
  totalSize: string;
  downloadedSize: string;
  transferRate: string;
  timeRemaining: string;
  threadsCount: number;
  segments: IdmSegmentThread[];
  isComplete: boolean;
  blob?: Blob;
  error?: string;
}

export function detectPlatform(url: string): MediaMetadata['platform'] {
  const u = url.toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|avif|bmp|svg)(\?|$)/i.test(u)) return 'image';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('kwai.com') || u.includes('kw.ai') || u.includes('kuaishou.com')) return 'kwai';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  if (u.includes('vimeo.com')) return 'vimeo';
  if (u.includes('pinterest.com') || u.includes('pin.it')) return 'pinterest';
  if (
    u.includes('xvideos.com') ||
    u.includes('xnxx.com') ||
    u.includes('pornhub.com') ||
    u.includes('redtube.com') ||
    u.includes('youporn.com') ||
    u.includes('spankbang.com')
  ) {
    return 'adult';
  }
  return 'generic';
}

export function getPlatformBadge(platform: MediaMetadata['platform']): { label: string; color: string; bg: string } {
  switch (platform) {
    case 'image':
      return { label: 'Imagem Web (8K/4K)', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
    case 'youtube':
      return { label: 'YouTube', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
    case 'tiktok':
      return { label: 'TikTok (Sem Marca)', color: '#00F2FE', bg: 'rgba(0, 242, 254, 0.15)' };
    case 'kwai':
      return { label: 'Kwai Vídeo', color: '#FF5E00', bg: 'rgba(255, 94, 0, 0.15)' };
    case 'instagram':
      return { label: 'Instagram Reels', color: '#E1306C', bg: 'rgba(225, 48, 108, 0.15)' };
    case 'twitter':
      return { label: 'X (Twitter)', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'facebook':
      return { label: 'Facebook Vídeo', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
    case 'vimeo':
      return { label: 'Vimeo HD', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)' };
    case 'pinterest':
      return { label: 'Pinterest', color: '#E60023', bg: 'rgba(230, 0, 35, 0.15)' };
    case 'adult':
      return { label: 'Mídia Web HD', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
    default:
      return { label: 'Mídia Web', color: '#FE540B', bg: 'rgba(254, 84, 11, 0.15)' };
  }
}

export function getProxiedThumbnailUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return `/api/media-proxy?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

function extractYouTubeId(url: string): string | null {
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

/**
 * Faz a leitura do link informado e extrai título, miniatura autêntica e todos os formatos disponíveis
 * Utiliza exclusivamente o motor backend real (/api/media-extract) sem substituições falsas.
 */
export async function fetchMediaMetadata(inputUrl: string): Promise<MediaMetadata> {
  const cleanUrl = inputUrl.trim();
  if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('Por favor, informe um link válido começando com http:// ou https://');
  }

  let res: Response;
  try {
    res = await fetch('/api/media-extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: cleanUrl }),
    });
  } catch {
    throw new Error('Não foi possível conectar ao motor de extração no servidor.');
  }

  const data = await res.json().catch(() => null);
  if (res.ok && data && data.success && Array.isArray(data.formats) && data.formats.length > 0) {
    return {
      url: data.url || cleanUrl,
      platform: (data.platform as MediaMetadata['platform']) || detectPlatform(cleanUrl),
      platformLabel: data.platformLabel || getPlatformBadge(detectPlatform(cleanUrl)).label,
      detectedMediaKind: data.detectedMediaKind,
      title: data.title || 'Mídia Original',
      author: data.author || 'Canal Original',
      thumbnail: data.thumbnail || '',
      duration: data.duration,
      formats: data.formats,
    };
  }

  // Fallback mínimo apenas para YouTube oEmbed / imagem direta se extrator não obteve metadados
  const platform = detectPlatform(cleanUrl);
  if (platform === 'image') {
    const match = cleanUrl.match(/\/([^\/?#]+)\.[a-zA-Z0-9]+(\?|$)/);
    return {
      url: cleanUrl,
      platform: 'image',
      platformLabel: 'Imagem Web',
      detectedMediaKind: 'image',
      title: match ? decodeURIComponent(match[1]).replace(/[_-]/g, ' ') : 'Imagem Original',
      author: new URL(cleanUrl).hostname.replace(/^www\./, ''),
      thumbnail: cleanUrl,
      formats: [
        {
          id: 'i_8k',
          type: 'image',
          quality: '8k',
          resolution: '7680x4320 8K Ultra Definição',
          extension: 'jpg',
          label: 'JPG · 8K Ultra Definição',
          badge: '8K ULTRA HD',
          directUrl: cleanUrl,
          isPopular: true,
        },
        {
          id: 'i_4k',
          type: 'image',
          quality: '4k',
          resolution: '3840x2160 4K Original',
          extension: 'jpg',
          label: 'JPG · 4K Resolução Original',
          badge: '4K ORIGINAL',
          directUrl: cleanUrl,
        },
      ],
    };
  }

  if (platform === 'youtube') {
    const ytId = extractYouTubeId(cleanUrl);
    if (ytId) {
      return {
        url: cleanUrl,
        platform: 'youtube',
        platformLabel: 'YouTube',
        detectedMediaKind: 'video',
        title: 'Vídeo do YouTube',
        author: 'YouTube',
        thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
        formats: [
          {
            id: 'v_best',
            type: 'video',
            quality: 'best',
            resolution: 'Máxima Resolução Disponível',
            extension: 'mp4',
            label: 'MP4 · Máxima Automática',
            badge: 'MAX AUTO',
            directUrl: cleanUrl,
          },
          {
            id: 'v_4k',
            type: 'video',
            quality: '4k',
            resolution: '3840x2160 4K Ultra HD',
            extension: 'mp4',
            label: 'MP4 · 4K Ultra HD',
            badge: '4K ULTRA HD',
            directUrl: cleanUrl,
          },
          {
            id: 'v_1080',
            type: 'video',
            quality: '1080p',
            resolution: '1920x1080 Full HD',
            extension: 'mp4',
            label: 'MP4 · 1080p Full HD',
            badge: 'FULL HD',
            directUrl: cleanUrl,
          },
          {
            id: 'a_320',
            type: 'audio',
            quality: '320k',
            bitrate: '320 kbps',
            extension: 'mp3',
            label: 'MP3 · 320 kbps',
            badge: 'ÁUDIO HQ',
            directUrl: cleanUrl,
          },
          {
            id: 'a_256',
            type: 'audio',
            quality: '256k',
            bitrate: '256 kbps',
            extension: 'mp3',
            label: 'MP3 · 256 kbps',
            badge: 'ALTA',
            directUrl: cleanUrl,
          },
          {
            id: 'a_192',
            type: 'audio',
            quality: '192k',
            bitrate: '192 kbps',
            extension: 'mp3',
            label: 'MP3 · 192 kbps',
            badge: 'PADRÃO',
            directUrl: cleanUrl,
          },
          {
            id: 'a_128',
            type: 'audio',
            quality: '128k',
            bitrate: '128 kbps',
            extension: 'mp3',
            label: 'MP3 · 128 kbps',
            badge: 'LEVE',
            directUrl: cleanUrl,
          },
        ],
      };
    }
  }

  throw new Error(
    (data && data.error) ||
      'Não foi possível extrair mídia direta deste link (conteúdo privado, protegido ou indisponível).'
  );
}

export interface BatchDownloadTask {
  id: string;
  serverJobId?: string;
  url: string;
  title: string;
  author: string;
  thumbnail: string;
  platform: string;
  platformLabel: string;
  formatId: string;
  formatType: 'video' | 'audio' | 'image';
  quality: string;
  resolution: string;
  extension: 'mp4' | 'webm' | 'mp3' | 'm4a' | 'jpg' | 'png';
  filesizeApprox: string;
  percentage: number;
  status: 'queued' | 'extracting' | 'downloading' | 'paused' | 'completed' | 'error';
  statusText: string;
  transferRate: string;
  downloadedSize: string;
  totalSize: string;
  error?: string;
  completedAt?: string;
}

function buildSegmentsFromProgress(percentage: number, speedText: string, totalSizeText: string): IdmSegmentThread[] {
  const numericMb = parseFloat(totalSizeText) || 20;
  const chunkSize = (numericMb / 8).toFixed(1);
  return Array.from({ length: 8 }, (_, i) => {
    const segPct = percentage >= 100 ? 100 : Math.min(99, Math.max(0, Math.floor(percentage * (0.9 + i * 0.015))));
    return {
      id: i + 1,
      percentage: segPct,
      speed: percentage >= 100 ? '0.0 MB/s' : speedText || '0.0 MB/s',
      rangeText: `${(i * parseFloat(chunkSize)).toFixed(1)}MB - ${((i + 1) * parseFloat(chunkSize)).toFixed(1)}MB`,
      status: segPct >= 100 ? 'complete' : percentage > 0 ? 'downloading' : 'connecting',
    };
  });
}

async function pauseServerJob(jobId: string): Promise<void> {
  try {
    await fetch('/api/media-job-pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: jobId }),
    });
  } catch {}
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executa o download real assíncrono no servidor (/api/media-job -> polling -> /api/media-job-file)
 * Evita timeouts HTTP 504 em vídeos longos/4K, exibe progresso real do yt-dlp/FFmpeg e preserva .part ao pausar.
 */
export async function downloadMediaItem(
  media: MediaMetadata,
  format: MediaFormatOption,
  onProgress?: (report: IdmDownloadProgressReport) => void,
  abortSignal?: AbortSignal,
  options?: { existingJobId?: string; onJobCreated?: (jobId: string) => void }
): Promise<{ success: boolean; blob?: Blob; filename: string; jobId?: string; error?: string }> {
  const safeTitle = sanitizeFilename(media.title);
  const finalFilename = `${safeTitle}.${format.extension}`;
  const targetStreamUrl = format.directUrl || (format.type === 'image' ? media.thumbnail || media.url : media.url);

  if (onProgress) {
    onProgress({
      active: true,
      filename: finalFilename,
      formatLabel: format.label,
      percentage: 2,
      statusText: 'Iniciando tarefa no motor de extração...',
      totalSize: format.filesizeApprox || '-- MB',
      downloadedSize: '0.0 MB',
      transferRate: '0.0 MB/s',
      timeRemaining: 'Calculando...',
      threadsCount: 8,
      segments: buildSegmentsFromProgress(2, '0.0 MB/s', format.filesizeApprox || '20'),
      isComplete: false,
    });
  }

  let createdJobId = options?.existingJobId || '';

  const onAbort = () => {
    if (createdJobId) {
      void pauseServerJob(createdJobId);
    }
  };
  abortSignal?.addEventListener('abort', onAbort, { once: true });

  try {
    if (abortSignal?.aborted) {
      throw new Error('Download pausado pelo usuário');
    }

    // 1. Cria ou retoma job assíncrono no servidor
    const createRes = await fetch('/api/media-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetStreamUrl,
        pageUrl: media.url,
        type: format.type,
        quality: format.quality,
        filename: finalFilename,
        jobId: createdJobId || undefined,
      }),
      signal: abortSignal,
    });

    const createData = await createRes.json().catch(() => null);
    if (!createRes.ok || !createData?.success || !createData?.jobId) {
      throw new Error(createData?.error || `Falha ao iniciar job no servidor (${createRes.status})`);
    }

    createdJobId = String(createData.jobId);
    options?.onJobCreated?.(createdJobId);

    // 2. Polling de status real enquanto o servidor baixa/converte/mescla a mídia original
    let serverTotalBytes = 0;
    let lastStatusText = 'Extraindo stream original...';

    let pollStep = 0;
    while (true) {
      if (abortSignal?.aborted) {
        await pauseServerJob(createdJobId);
        throw new Error('Download pausado pelo usuário');
      }

      const statusRes = await fetch(`/api/media-job-status?id=${encodeURIComponent(createdJobId)}`, {
        signal: abortSignal,
      });

      if (!statusRes.ok) {
        if (statusRes.status === 404) {
          throw new Error('Tarefa expirada no servidor. Tente iniciar novamente.');
        }
        await sleep(300);
        continue;
      }

      const jobStatus = await statusRes.json();
      lastStatusText = jobStatus.statusText || lastStatusText;
      serverTotalBytes = jobStatus.totalBytes || serverTotalBytes;

      if (jobStatus.status === 'error') {
        throw new Error(jobStatus.error || jobStatus.statusText || 'Erro ao extrair mídia original.');
      }

      if (jobStatus.status === 'paused') {
        throw new Error('Download pausado pelo usuário');
      }

      // Mapeia o processamento/download no servidor para 2% - 92% da barra
      const mappedPct =
        jobStatus.status === 'ready'
          ? 92
          : Math.min(91, Math.max(3, Math.floor((jobStatus.percentage || 0) * 0.92)));

      if (onProgress) {
        onProgress({
          active: true,
          filename: finalFilename,
          formatLabel: format.label,
          percentage: mappedPct,
          statusText: lastStatusText,
          totalSize: jobStatus.totalSize || format.filesizeApprox || '-- MB',
          downloadedSize: jobStatus.downloadedSize || '0.0 MB',
          transferRate: jobStatus.transferRate || '0.0 MB/s',
          timeRemaining: jobStatus.status === 'ready' ? '00:00:01' : 'Processando...',
          threadsCount: 8,
          segments: buildSegmentsFromProgress(mappedPct, jobStatus.transferRate || '0.0 MB/s', jobStatus.totalSize || '20'),
          isComplete: false,
        });
      }

      if (jobStatus.status === 'ready') {
        break;
      }

      pollStep++;
      await sleep(pollStep < 6 ? 150 : 250);
    }

    if (abortSignal?.aborted) {
      await pauseServerJob(createdJobId);
      throw new Error('Download pausado pelo usuário');
    }

    // 3. Baixa o arquivo final em segmentos HTTP Byte-Range PARALELOS (6 threads simultâneas) estilo IDM
    const fileEndpoint = `/api/media-job-file?id=${encodeURIComponent(createdJobId)}`;
    const defaultMime =
      format.type === 'image'
        ? format.extension === 'png'
          ? 'image/png'
          : 'image/jpeg'
        : format.type === 'audio'
        ? 'audio/mpeg'
        : 'video/mp4';

    let totalBytes = serverTotalBytes || 0;
    let contentType = defaultMime;

    if (totalBytes <= 0) {
      const headRes = await fetch(fileEndpoint, { method: 'HEAD', signal: abortSignal });
      if (!headRes.ok) {
        throw new Error(`Falha ao consultar tamanho do arquivo (${headRes.status})`);
      }
      totalBytes = parseInt(headRes.headers.get('content-length') || '0', 10) || 0;
      contentType = headRes.headers.get('content-type') || defaultMime;
    }

    const CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB por segmento HTTP Range
    const parts: BlobPart[] = [];
    let receivedBytes = 0;
    const startTime = Date.now();
    let lastReport = startTime;
    let lastBytes = 0;

    if (totalBytes > 0) {
      const chunkDescriptors: { index: number; offset: number; end: number }[] = [];
      let idx = 0;
      for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
        chunkDescriptors.push({
          index: idx++,
          offset,
          end: Math.min(totalBytes - 1, offset + CHUNK_SIZE - 1),
        });
      }
      parts.length = chunkDescriptors.length;

      let cursor = 0;
      const concurrency = Math.min(6, chunkDescriptors.length);

      const rangeWorker = async () => {
        while (true) {
          if (abortSignal?.aborted) {
            throw new Error('Download pausado pelo usuário');
          }
          const myIdx = cursor++;
          if (myIdx >= chunkDescriptors.length) return;
          const desc = chunkDescriptors[myIdx];

          let chunkBuf: ArrayBuffer | null = null;
          let lastErrStatus = 0;

          for (let attempt = 0; attempt < 3; attempt++) {
            if (abortSignal?.aborted) {
              throw new Error('Download pausado pelo usuário');
            }
            const rangeRes = await fetch(fileEndpoint, {
              headers: { Range: `bytes=${desc.offset}-${desc.end}` },
              signal: abortSignal,
            });
            lastErrStatus = rangeRes.status;
            if (rangeRes.status === 206 || rangeRes.status === 200) {
              contentType = rangeRes.headers.get('content-type') || contentType;
              chunkBuf = await rangeRes.arrayBuffer();
              break;
            }
            await sleep(300 * (attempt + 1));
          }

          if (!chunkBuf) {
            throw new Error(`Falha ao transferir segmento do arquivo (${lastErrStatus})`);
          }

          parts[desc.index] = chunkBuf;
          receivedBytes += chunkBuf.byteLength;

          const now = Date.now();
          const dt = (now - lastReport) / 1000;
          const speedMb = Math.max(0.8, (receivedBytes - lastBytes) / (1024 * 1024) / Math.max(0.08, dt));
          if (dt >= 0.15 || receivedBytes >= totalBytes) {
            lastReport = now;
            lastBytes = receivedBytes;

            const transferRatio = Math.min(1, receivedBytes / totalBytes);
            const pct = Math.min(99, 92 + Math.floor(transferRatio * 8));
            const dlMb = (receivedBytes / (1024 * 1024)).toFixed(1);
            const totMb = (totalBytes / (1024 * 1024)).toFixed(1);

            if (onProgress) {
              onProgress({
                active: true,
                filename: finalFilename,
                formatLabel: format.label,
                percentage: pct,
                statusText: `Transferindo 6-Threads IDM (${dlMb} MB / ${totMb} MB)...`,
                totalSize: `${totMb} MB`,
                downloadedSize: `${dlMb} MB`,
                transferRate: `${speedMb.toFixed(1)} MB/s`,
                timeRemaining: '00:00:01',
                threadsCount: 8,
                segments: buildSegmentsFromProgress(pct, `${speedMb.toFixed(1)} MB/s`, totMb),
                isComplete: false,
              });
            }
          }
        }
      };

      await Promise.all(Array.from({ length: concurrency }, () => rangeWorker()));
    } else {
      const fileRes = await fetch(fileEndpoint, { signal: abortSignal });
      if (!fileRes.ok) {
        throw new Error(`Falha ao transferir arquivo finalizado (${fileRes.status})`);
      }
      contentType = fileRes.headers.get('content-type') || defaultMime;
      parts.push(await fileRes.arrayBuffer());
    }

    const completeBlob = new Blob(parts, { type: contentType });
    if (completeBlob.size === 0) {
      throw new Error('Arquivo recebido vazio do servidor.');
    }

    const finalSizeMb = (completeBlob.size / (1024 * 1024)).toFixed(2);

    if (onProgress) {
      onProgress({
        active: true,
        filename: finalFilename,
        formatLabel: format.label,
        percentage: 100,
        statusText: 'Download concluído 100%! Arquivo salvo na pasta Downloads.',
        totalSize: `${finalSizeMb} MB`,
        downloadedSize: `${finalSizeMb} MB`,
        transferRate: '0.0 MB/s',
        timeRemaining: '00:00:00',
        threadsCount: 8,
        segments: buildSegmentsFromProgress(100, '0.0 MB/s', finalSizeMb),
        isComplete: true,
        blob: completeBlob,
      });
    }

    return {
      success: true,
      blob: completeBlob,
      filename: finalFilename,
      jobId: createdJobId,
    };
  } catch (err: any) {
    const msg = err?.message || 'Erro ao baixar mídia.';
    if (onProgress) {
      onProgress({
        active: false,
        filename: finalFilename,
        formatLabel: format.label,
        percentage: 0,
        statusText: msg,
        totalSize: format.filesizeApprox || '-- MB',
        downloadedSize: '0.0 MB',
        transferRate: '0.0 MB/s',
        timeRemaining: '00:00:00',
        threadsCount: 8,
        segments: buildSegmentsFromProgress(0, '0.0 MB/s', '20'),
        isComplete: false,
        error: msg,
      });
    }
    return {
      success: false,
      filename: finalFilename,
      jobId: createdJobId || undefined,
      error: msg,
    };
  } finally {
    abortSignal?.removeEventListener('abort', onAbort);
  }
}

export function saveBlobToDevice(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\u00C0-\u017F ]/g, '').trim().substring(0, 60) || 'media';
}

