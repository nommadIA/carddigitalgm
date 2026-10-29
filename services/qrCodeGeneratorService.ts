import QRCode from "qrcode";
import { jsPDF } from "jspdf";

export type QrModuleShape = "square" | "dots" | "rounded" | "fluid";
export type QrEyeShape = "square" | "rounded" | "circle";

export interface QrCodeOptions {
  text: string;
  fgColor?: string;
  bgColor?: string; // "transparent" or hex color
  moduleShape?: QrModuleShape;
  eyeShape?: QrEyeShape;
  logoUrl?: string | null;
  logoSizePercent?: number; // e.g. 22 (for 22%)
  logoShape?: "circle" | "square";
  margin?: number; // Quiet zone modules (default 3)
  size?: number; // Render resolution (default 1024)
  title?: string; // Título customizado do PDF
  subtitle?: string; // Subtítulo customizado do PDF
  label?: string; // Rótulo do destino/código no PDF
}

/**
 * Cria a matriz 2D de módulos do QRCode usando a biblioteca qrcode
 */
export function getQrMatrix(text: string, errorCorrectionLevel: "L" | "M" | "Q" | "H" = "H") {
  try {
    const qr = QRCode.create(text || "https://carddigitalgm.com", {
      errorCorrectionLevel,
    });
    const size = qr.modules.size;
    const matrix: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        row.push(Boolean(qr.modules.get(r, c)));
      }
      matrix.push(row);
    }
    return { matrix, size, version: qr.version };
  } catch (err) {
    console.error("Erro ao gerar matriz de QR Code:", err);
    // Fallback matriz básica
    return { matrix: [[true]], size: 1, version: 1 };
  }
}

/**
 * Identifica se uma coordenada (r, c) pertence aos 3 olhos de canto (finder patterns)
 */
export function isFinderPattern(r: number, c: number, size: number): boolean {
  // Top-left
  if (r < 7 && c < 7) return true;
  // Top-right
  if (r < 7 && c >= size - 7) return true;
  // Bottom-left
  if (r >= size - 7 && c < 7) return true;
  return false;
}

/**
 * Identifica se uma coordenada pertence à área reservada do logotipo central
 */
export function isLogoArea(r: number, c: number, size: number, logoPercent: number = 22): boolean {
  if (logoPercent <= 0) return false;
  const center = size / 2;
  const halfLogoModules = (size * (logoPercent / 100)) / 2;
  const min = Math.floor(center - halfLogoModules);
  const max = Math.ceil(center + halfLogoModules);
  return r >= min && r < max && c >= min && c < max;
}

/**
 * Renderiza o QR Code em um HTMLCanvasElement em alta resolução
 */
export async function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  options: QrCodeOptions
): Promise<void> {
  const {
    text,
    fgColor = "#FE540B",
    bgColor = "#0C0D12",
    moduleShape = "rounded",
    eyeShape = "rounded",
    logoUrl = null,
    logoSizePercent = 22,
    logoShape = "circle",
    margin = 3,
    size = 1024,
  } = options;

  const { matrix, size: moduleCount } = getQrMatrix(text, logoUrl ? "H" : "M");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, size, size);

  // Fundo
  if (bgColor && bgColor !== "transparent") {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  const totalModules = moduleCount + margin * 2;
  const cellSize = size / totalModules;

  ctx.fillStyle = fgColor;

  // Função auxiliar para desenhar cantos arredondados no canvas
  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  };

  // Renderiza cada módulo de dados (exceto finder patterns que renderizamos com estilo especial)
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      const isFinder = isFinderPattern(r, c, moduleCount);
      const inLogo = logoUrl ? isLogoArea(r, c, moduleCount, logoSizePercent) : false;

      if (inLogo) continue; // Abre espaço para o logotipo

      const x = (c + margin) * cellSize;
      const y = (r + margin) * cellSize;

      if (matrix[r][c]) {
        if (isFinder) {
          // Renderização do finder pattern (olhos) de acordo com eyeShape
          // Apenas preenchemos se não estivermos desenhando o olho como peça única
          ctx.fillStyle = fgColor;
          if (moduleShape === "dots") {
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2 * 0.9, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, cellSize + 0.5, cellSize + 0.5);
          }
        } else {
          // Módulos normais de dados
          ctx.fillStyle = fgColor;
          if (moduleShape === "dots") {
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, y + cellSize / 2, (cellSize / 2) * 0.88, 0, Math.PI * 2);
            ctx.fill();
          } else if (moduleShape === "rounded") {
            drawRoundedRect(x + cellSize * 0.05, y + cellSize * 0.05, cellSize * 0.9, cellSize * 0.9, cellSize * 0.28);
          } else if (moduleShape === "fluid") {
            drawRoundedRect(x, y, cellSize, cellSize, cellSize * 0.45);
          } else {
            // "square" clássico
            ctx.fillRect(x, y, cellSize + 0.5, cellSize + 0.5);
          }
        }
      }
    }
  }

  // Se eyeShape for "rounded" ou "circle", desenha os 3 olhos com acabamento elegante
  if (eyeShape !== "square") {
    const drawEye = (startR: number, startC: number) => {
      const eyeX = (startC + margin) * cellSize;
      const eyeY = (startR + margin) * cellSize;
      const eyeSize = 7 * cellSize;

      // Limpa a área do olho no fundo
      if (bgColor && bgColor !== "transparent") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(eyeX, eyeY, eyeSize, eyeSize);
      } else {
        ctx.clearRect(eyeX, eyeY, eyeSize, eyeSize);
      }

      ctx.fillStyle = fgColor;
      if (eyeShape === "circle") {
        // Anel Externo Circular
        ctx.beginPath();
        ctx.arc(eyeX + eyeSize / 2, eyeY + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Espaço Interno Vazio
        if (bgColor && bgColor !== "transparent") {
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.arc(eyeX + eyeSize / 2, eyeY + eyeSize / 2, (eyeSize / 2) * (5 / 7), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.arc(eyeX + eyeSize / 2, eyeY + eyeSize / 2, (eyeSize / 2) * (5 / 7), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Ponto Central Circular
        ctx.fillStyle = fgColor;
        ctx.beginPath();
        ctx.arc(eyeX + eyeSize / 2, eyeY + eyeSize / 2, (eyeSize / 2) * (3 / 7), 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Squircle Arredondado
        drawRoundedRect(eyeX, eyeY, eyeSize, eyeSize, cellSize * 1.8);

        if (bgColor && bgColor !== "transparent") {
          ctx.fillStyle = bgColor;
          drawRoundedRect(
            eyeX + cellSize,
            eyeY + cellSize,
            eyeSize - cellSize * 2,
            eyeSize - cellSize * 2,
            cellSize * 1.2
          );
        } else {
          ctx.save();
          ctx.globalCompositeOperation = "destination-out";
          drawRoundedRect(
            eyeX + cellSize,
            eyeY + cellSize,
            eyeSize - cellSize * 2,
            eyeSize - cellSize * 2,
            cellSize * 1.2
          );
          ctx.restore();
        }

        ctx.fillStyle = fgColor;
        drawRoundedRect(
          eyeX + cellSize * 2,
          eyeY + cellSize * 2,
          eyeSize - cellSize * 4,
          eyeSize - cellSize * 4,
          cellSize * 0.8
        );
      }
    };

    drawEye(0, 0); // Top-left
    drawEye(0, moduleCount - 7); // Top-right
    drawEye(moduleCount - 7, 0); // Bottom-left
  }

  // Renderiza Logotipo Central se configurado
  if (logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Falha ao carregar logo"));
        img.src = logoUrl;
      });

      const logoPixelSize = (size * (logoSizePercent / 100));
      const logoX = (size - logoPixelSize) / 2;
      const logoY = (size - logoPixelSize) / 2;

      // Fundo de proteção com respiro branco ou escuro atrás da logo
      const pad = logoPixelSize * 0.12;
      const shieldSize = logoPixelSize + pad * 2;
      const shieldX = logoX - pad;
      const shieldY = logoY - pad;

      ctx.save();
      ctx.fillStyle = bgColor === "transparent" || bgColor === "#0C0D12" ? "#0C0D12" : "#FFFFFF";
      ctx.strokeStyle = fgColor;
      ctx.lineWidth = 3;

      if (logoShape === "circle") {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, shieldSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoPixelSize / 2, 0, Math.PI * 2);
        ctx.clip();
      } else {
        drawRoundedRect(shieldX, shieldY, shieldSize, shieldSize, pad * 1.5);
        ctx.strokeRect(shieldX, shieldY, shieldSize, shieldSize);

        drawRoundedRect(logoX, logoY, logoPixelSize, logoPixelSize, pad * 0.8);
        ctx.clip();
      }

      ctx.drawImage(img, logoX, logoY, logoPixelSize, logoPixelSize);
      ctx.restore();
    } catch (err) {
      console.warn("Aviso ao desenhar logo no QR Code:", err);
    }
  }
}

/**
 * Gera o arquivo SVG do QR Code vetorial puro
 */
export function generateQrCodeSvg(options: QrCodeOptions): string {
  const {
    text,
    fgColor = "#FE540B",
    bgColor = "#0C0D12",
    moduleShape = "rounded",
    margin = 3,
  } = options;

  const { matrix, size: moduleCount } = getQrMatrix(text, options.logoUrl ? "H" : "M");
  const totalModules = moduleCount + margin * 2;
  const viewBoxSize = totalModules * 10;
  const cellSize = 10;

  let shapesSvg = "";

  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        if (options.logoUrl && isLogoArea(r, c, moduleCount, options.logoSizePercent || 22)) {
          continue;
        }

        const x = (c + margin) * cellSize;
        const y = (r + margin) * cellSize;

        if (moduleShape === "dots") {
          shapesSvg += `<circle cx="${x + cellSize / 2}" cy="${y + cellSize / 2}" r="${cellSize * 0.45}" fill="${fgColor}" />\n`;
        } else if (moduleShape === "rounded") {
          shapesSvg += `<rect x="${x + 0.5}" y="${y + 0.5}" width="${cellSize - 1}" height="${cellSize - 1}" rx="${cellSize * 0.28}" fill="${fgColor}" />\n`;
        } else {
          shapesSvg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fgColor}" />\n`;
        }
      }
    }
  }

  const bgRect =
    bgColor && bgColor !== "transparent"
      ? `<rect width="100%" height="100%" fill="${bgColor}" />\n`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${viewBoxSize}" height="${viewBoxSize}">
  ${bgRect}
  <g fill="${fgColor}">
    ${shapesSvg}
  </g>
</svg>`;
}

/**
 * Gera código PostScript EPSF-3.0 Vetorial puro para Illustrator, Corel e Gráfica
 */
export function generateQrCodeEps(options: QrCodeOptions): string {
  const {
    text,
    fgColor = "#FE540B",
    bgColor = "#0C0D12",
    moduleShape = "square",
    margin = 3,
  } = options;

  const { matrix, size: moduleCount } = getQrMatrix(text, options.logoUrl ? "H" : "M");
  const totalModules = moduleCount + margin * 2;
  const epsDim = totalModules * 12; // Dimensões em pontos PostScript (72 pts = 1 pol)
  const cellDim = 12;

  // Converte cores Hex para valores RGB (0 a 1) do PostScript
  const hexToPsRgb = (hex: string) => {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
  };

  const fgRgb = hexToPsRgb(fgColor);
  let epsContent = "";

  // PostScript mede Y de baixo para cima
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        if (options.logoUrl && isLogoArea(r, c, moduleCount, options.logoSizePercent || 22)) {
          continue;
        }
        const x = (c + margin) * cellDim;
        const y = epsDim - (r + margin + 1) * cellDim;

        if (moduleShape === "dots") {
          const cx = x + cellDim / 2;
          const cy = y + cellDim / 2;
          const radius = (cellDim * 0.45).toFixed(2);
          epsContent += `${cx} ${cy} ${radius} 0 360 arc fill\n`;
        } else {
          epsContent += `${x} ${y} ${cellDim} ${cellDim} rectfill\n`;
        }
      }
    }
  }

  return `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 ${epsDim} ${epsDim}
%%Title: CardDigital GM QR Code Vetorial
%%Creator: CardDigital GM Forge System
%%Pages: 1
%%DocumentData: Clean7Bit
%%LanguageLevel: 2
%%EndComments

%%BeginProlog
/rectfill { newpath 4 2 roll moveto 1 index 0 rlineto 0 exch rlineto neg 0 rlineto closepath fill } bind def
%%EndProlog

%%Page: 1 1
gsave
${
  bgColor && bgColor !== "transparent"
    ? `${hexToPsRgb(bgColor)} setrgbcolor\n0 0 ${epsDim} ${epsDim} rectfill\n`
    : ""
}
${fgRgb} setrgbcolor
${epsContent}
grestore
showpage
%%Trailer
%%EOF`;
}

/**
 * Função utilitária para acionar o download de um arquivo no navegador
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exporta como PNG
 */
export async function downloadQrAsPng(options: QrCodeOptions, filename: string = "qrcode-carddigital.png") {
  const canvas = document.createElement("canvas");
  await renderQrToCanvas(canvas, { ...options, size: 2048 });
  canvas.toBlob((blob) => {
    if (blob) triggerFileDownload(blob, filename);
  }, "image/png");
}

/**
 * Exporta como JPG (sempre com fundo sólido de alto contraste)
 */
export async function downloadQrAsJpg(options: QrCodeOptions, filename: string = "qrcode-carddigital.jpg") {
  const canvas = document.createElement("canvas");
  const bg = options.bgColor && options.bgColor !== "transparent" ? options.bgColor : "#0C0D12";
  await renderQrToCanvas(canvas, { ...options, bgColor: bg, size: 2048 });
  canvas.toBlob((blob) => {
    if (blob) triggerFileDownload(blob, filename);
  }, "image/jpeg", 0.95);
}

/**
 * Exporta como SVG (vetorial puro)
 */
export function downloadQrAsSvg(options: QrCodeOptions, filename: string = "qrcode-carddigital.svg") {
  const svgString = generateQrCodeSvg(options);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  triggerFileDownload(blob, filename);
}

/**
 * Exporta como EPS (vetorial PostScript EPSF-3.0 profissional para gráfica)
 */
export function downloadQrAsEps(options: QrCodeOptions, filename: string = "qrcode-carddigital.eps") {
  const epsString = generateQrCodeEps(options);
  const blob = new Blob([epsString], { type: "application/postscript;charset=utf-8" });
  triggerFileDownload(blob, filename);
}

/**
 * Exporta como PDF de Alta Qualidade (A4 centralizado pronto para impressão ou corte)
 */
export async function downloadQrAsPdf(options: QrCodeOptions, filename: string = "qrcode-carddigital.pdf") {
  const canvas = document.createElement("canvas");
  const bg = options.bgColor && options.bgColor !== "transparent" ? options.bgColor : "#0C0D12";
  await renderQrToCanvas(canvas, { ...options, bgColor: bg, size: 1600 });
  const imgData = canvas.toDataURL("image/png");

  // Cria documento PDF no padrão A4 (210 x 297 mm)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Fundo do documento
  doc.setFillColor(12, 13, 18);
  doc.rect(0, 0, 210, 297, "F");

  // Cabeçalho da página
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(options.title || "CardDigital GM", 105, 36, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 183, 194);
  doc.text(options.subtitle || "QR Code Inteligente Oficial de Alta Definição", 105, 44, { align: "center" });

  // Insere a imagem do QR Code perfeitamente centralizada
  const qrSizeMm = 120;
  const qrX = (210 - qrSizeMm) / 2;
  const qrY = 60;

  // Moldura decorativa
  doc.setDrawColor(254, 84, 11);
  doc.setLineWidth(0.8);
  doc.roundedRect(qrX - 4, qrY - 4, qrSizeMm + 8, qrSizeMm + 8, 4, 4, "S");

  doc.addImage(imgData, "PNG", qrX, qrY, qrSizeMm, qrSizeMm);

  // Informações do link na base
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(options.label || "DESTINO DO LINK:", 105, qrY + qrSizeMm + 18, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(254, 84, 11);
  const truncatedText = options.text.length > 70 ? options.text.substring(0, 68) + "..." : options.text;
  doc.text(truncatedText, 105, qrY + qrSizeMm + 24, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(140, 145, 160);
  doc.text("Aponte a câmera do seu smartphone para escanear instantaneamente.", 105, qrY + qrSizeMm + 32, { align: "center" });
  doc.text("Gerado pelo CardDigital GM Forge System", 105, 280, { align: "center" });

  doc.save(filename);
}

/**
 * Encurtador Inteligente de Link para reduzir a densidade de módulos do QR Code
 */
export async function shortenUrlSmart(longUrl: string): Promise<{ shortUrl: string; reduced: boolean }> {
  const trimmed = longUrl.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return { shortUrl: trimmed, reduced: false };
  }

  // Se já for curto (< 32 caracteres), não há necessidade de encurtar
  if (trimmed.length <= 32) {
    return { shortUrl: trimmed, reduced: false };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(trimmed)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const short = await res.text();
      if (short && short.startsWith("http")) {
        return { shortUrl: short.trim(), reduced: true };
      }
    }
  } catch (err) {
    console.warn("Aviso ao encurtar link:", err);
  }

  return { shortUrl: trimmed, reduced: false };
}
