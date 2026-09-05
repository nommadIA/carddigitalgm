import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont, PDFString, PDFName } from "pdf-lib";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { buildPixPayload } from "../lib/pix";
import type { AppSettings } from "../lib/settings";
import { PaymentMethod, Expense } from "../types";
import { CURRENCY_FORMATTER } from "../constants";
import { supabase } from "../lib/supabase"; // ✅ NOVO (fallback signed url)

export type OrcItem = {
  titulo: string;
  qtd: number;
  valor_unit: number;
  width?: number;
  height?: number;
  isPrint?: boolean;
};

export type Orcamento = {
  id: string;
  cliente_nome: string;
  total: number;
  subtotal?: number;
  discount?: number;
  payment_method?: string;
  payment_link?: string;
  paymentMethod?: PaymentMethod;
  installments?: number;
  interestRate?: number;
  deadline?: string;
  dueLabel?: string;
  delivery_days?: number;
  validity_days?: number;
  created_at?: string;
};

export type FinanceReportRow = {
  date: string;
  type: "receita" | "despesa";
  title: string;
  status?: string | null;
  amount: number;
  category?: string | null;
};

async function fetchBytes(url: string) {
  const res = await fetch(url);
  return await res.arrayBuffer();
}

function bytesFromArrayBuffer(ab: ArrayBuffer) {
  return new Uint8Array(ab);
}

function looksLikePNG(b: Uint8Array) {
  return (
    b?.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  );
}

function looksLikeJPG(b: Uint8Array) {
  return b?.length >= 2 && b[0] === 0xff && b[1] === 0xd8;
}

function looksLikeHTML(b: Uint8Array) {
  const head = new TextDecoder().decode(b.slice(0, 64)).toLowerCase();
  return head.includes("<!doctype") || head.includes("<html") || head.includes("access denied");
}

async function fetchBytesStrict(url: string) {
  // Removido "no-store" para permitir cache do navegador e aumentar velocidade
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Falha ao baixar timbrado: HTTP ${res.status}`);
  }

  const ab = await res.arrayBuffer();
  const bytes = bytesFromArrayBuffer(ab);

  if (looksLikeHTML(bytes)) {
    throw new Error(
      "Falha ao baixar timbrado: a URL retornou HTML (provável Storage privado / Access denied)."
    );
  }

  return { bytes, contentType: (res.headers.get("content-type") || "").toLowerCase() };
}

function parseSupabaseStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^/?#]+)\/([^?#]+)/i);
  if (match) {
    return {
      bucket: decodeURIComponent(match[1]),
      path: decodeURIComponent(match[2]),
    };
  }
  return null;
}

/* ✅ OTIMIZADO: Extrai o path relativo do Storage para qualquer bucket */
function tryExtractSupabaseStoragePath(url: string, bucket: string): string | null {
  if (!url) return null;
  const parsed = parseSupabaseStorageUrl(url);
  if (parsed && parsed.bucket.toLowerCase() === bucket.toLowerCase()) return parsed.path;
  const parts = url.split(new RegExp(`/public/${bucket}/`, "i"));
  if (parts.length > 1) return parts[1].split("?")[0];
  const signParts = url.split(new RegExp(`/authenticated/${bucket}/`, "i"));
  if (signParts.length > 1) return signParts[1].split("?")[0];
  return null;
}

/* ✅ OTIMIZADO: Retorna os bytes diretamente para evitar múltiplos fetches, suportando qualquer bucket do Supabase */
async function resolveTimbradoBytesWithFallback(originalUrl: string) {
  // 1) tenta download direto por fetch
  try {
    return await fetchBytesStrict(originalUrl);
  } catch (e: any) {
    // 2) se for do Supabase, detecta bucket e caminho dinamicamente
    const sb = parseSupabaseStorageUrl(originalUrl);
    const bucket = sb?.bucket || "timbrados";
    const path = sb?.path || tryExtractSupabaseStoragePath(originalUrl, bucket);

    if (path) {
      try {
        const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(path);
        if (!dlErr && blob && blob.size > 0) {
          const ab = await blob.arrayBuffer();
          const bytes = bytesFromArrayBuffer(ab);
          return { bytes, contentType: blob.type || "image/png" };
        }
      } catch (err) {}

      try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
        if (!error && data?.signedUrl) {
          return await fetchBytesStrict(data.signedUrl);
        }
      } catch (err) {}
    }

    throw e;
  }
}

async function embedBackgroundImage(doc: any, url: string) {
  const { bytes, contentType } = await resolveTimbradoBytesWithFallback(url);

  if (looksLikePNG(bytes)) return await doc.embedPng(bytes);
  if (looksLikeJPG(bytes)) return await doc.embedJpg(bytes);

  if (contentType.includes("png")) return await doc.embedPng(bytes);
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return await doc.embedJpg(bytes);

  throw new Error("Timbrado inválido. Envie PNG ou JPG (evite WEBP).");
}

function sanitizeFilename(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 -]/g, "")
    .trim()
    .toUpperCase();
}

/**
 * ✅ NOVO: Remove emojis e caracteres especiais que o jsPDF (WinAnsi) não consegue codificar.
 * Isso evita o erro: "WinAnsi cannot encode ..."
 */
function stripEmojis(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "") // emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "") // symbols & pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // transport & map symbols
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "") // flags (iOS)
    .replace(/[\u{2600}-\u{26FF}]/gu, "")   // miscellaneous symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, "")   // dingbats
    .replace(/[^\x00-\x7F\u00C0-\u00FF]/g, "") // remove anything non-ASCII/non-Latin1
    .trim();
}

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const sanitized = stripEmojis(text);
  const lines: string[] = [];
  const paragraphs = sanitized.split(/\r?\n/);
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      const width = font.widthOfTextAtSize(test, size);
      if (width <= maxWidth) line = test;
      else {
        if (line) lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function generateOrcamentoPdf(orc: Orcamento, itens: OrcItem[], settings: AppSettings) {
  try {
    const timbradoUrl = settings?.timbrado_url || "";
    if (!timbradoUrl) {
      throw new Error(
        "Nenhum timbrado configurado. Vá em Configurações e envie o timbrado A4 (PNG/JPG)."
      );
    }

    const doc = await PDFDocument.create();
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const bgImage = await embedBackgroundImage(doc, timbradoUrl);

    const W = 595.28;
    const H = 841.89;

    const PX_W = 2480;
    const PX_H = 3508;

    // Margens e limites ajustados para o timbrado (trabalhando no limite)
    const CONTENT_X_PX = 160;
    const CONTENT_TOP_PX = 230; // Descido conforme solicitado (estava 140)
    const CONTENT_W_PX = 2160;
    const CONTENT_H_PX = 2260; // Ajustado para manter o limite inferior proporcional

    const CONTENT_X = (CONTENT_X_PX / PX_W) * W;
    const CONTENT_W = (CONTENT_W_PX / PX_W) * W;
    const CONTENT_RIGHT_X = CONTENT_X + CONTENT_W;

    const CONTENT_TOP_Y = H - (CONTENT_TOP_PX / PX_H) * H;
    const CONTENT_BOTTOM_Y = H - ((CONTENT_TOP_PX + CONTENT_H_PX) / PX_H) * H;

    let cursorY = CONTENT_TOP_Y;
    let page: PDFPage;

    const cText = rgb(0.1, 0.1, 0.1);
    const cGray = rgb(0.3, 0.3, 0.3);
    const cRed = rgb(0.8, 0.1, 0.1);
    const cLine = rgb(0.85, 0.85, 0.85);

    const addPage = () => {
      const p = doc.addPage([W, H]);
      p.drawImage(bgImage, { x: 0, y: 0, width: W, height: H });
      page = p;
      cursorY = CONTENT_TOP_Y;
    };

    const checkSpace = (heightNeeded: number) => {
      if (cursorY - heightNeeded < CONTENT_BOTTOM_Y) addPage();
    };

    addPage();

    const drawLeft = (txt: string, size: number, yPos: number, bold = false, color = cText) => {
      page.drawText(stripEmojis(txt), { x: CONTENT_X, y: yPos, size, font: bold ? fontBold : fontRegular, color });
    };

    const drawRight = (txt: string, size: number, yPos: number, bold = false, color = cText) => {
      const font = bold ? fontBold : fontRegular;
      const sanitized = stripEmojis(txt);
      const w = font.widthOfTextAtSize(sanitized, size);
      page.drawText(sanitized, { x: CONTENT_RIGHT_X - w, y: yPos, size, font, color });
    };

    const hr = (yPos: number) => {
      page.drawLine({
        start: { x: CONTENT_X, y: yPos },
        end: { x: CONTENT_RIGHT_X, y: yPos },
        thickness: 0.8,
        color: cLine,
      });
    };

    // --- CABEÇALHO COMPACTO ---
    checkSpace(50);
    drawLeft(`ORÇAMENTO #${orc.id.slice(0, 8).toUpperCase()}`, 13, cursorY, true);
    cursorY -= 13;

    const dateStr = orc.created_at ? new Date(orc.created_at).toLocaleDateString() : new Date().toLocaleDateString();
    drawLeft(`Cliente: ${orc.cliente_nome}`, 9, cursorY, false, cGray);
    cursorY -= 11;
    drawLeft(`Data: ${dateStr}`, 9, cursorY, false, cGray);

    const prazoTexto = orc.dueLabel || orc.deadline || (orc.delivery_days ? `${orc.delivery_days} dias úteis` : null);
    if (prazoTexto) {
      cursorY -= 11;
      drawLeft(`Entrega: ${prazoTexto}`, 9, cursorY, false, cGray);
    }
    
    if (orc.validity_days) {
      cursorY -= 11;
      drawLeft(`Validade do Orçamento: ${orc.validity_days} dias`, 9, cursorY, false, cGray);
    }

    cursorY -= 11;
    let paymentText = "Forma de Pagamento: ";
    if (orc.payment_method === 'CREDIT') {
      paymentText += "Cartão de Crédito";
      if (orc.installments && orc.installments > 1) {
        paymentText += ` em ${orc.installments}x`;
      }
      if (orc.interestRate && orc.interestRate > 0) {
        paymentText += ` (Juros: ${orc.interestRate}%)`;
      }
    } else {
      paymentText += "PIX";
    }
    drawLeft(paymentText, 9, cursorY, false, cGray);

    cursorY -= 20; // more breathing room after header

    // --- DESCRIÇÃO ---
    checkSpace(25);
    drawLeft("DESCRIÇÃO DOS SERVIÇOS", 10, cursorY, true);
    cursorY -= 15; 
    hr(cursorY);
    cursorY -= 20; // Respiro padrão e maior

    const colDescW = CONTENT_W * 0.72;

    for (const it of itens) {
      let desc = it.titulo;

      let totalItem = 0;
      let areaStr = "";
      if (it.isPrint && it.width && it.height) {
        const area = (it.width * it.height) / 10000;
        totalItem = area * it.valor_unit * it.qtd;
        areaStr = `Medidas: ${it.width}x${it.height}cm | Área: ${area.toFixed(2)}m²`;
      } else {
        totalItem = it.qtd * it.valor_unit;
      }

      const size = 9.5;
      const lines = wrapText(desc, colDescW, fontRegular, size);
      
      const detailsLine = `Qtd: ${it.qtd}  |  V. Unit: ${CURRENCY_FORMATTER.format(it.valor_unit)}${areaStr ? `  |  ${areaStr}` : ""}`;
      
      const blockH = (lines.length * 12) + 40; // Ajustado para englobar os novos respiros

      checkSpace(blockH + 10);

      let yText = cursorY;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isFirstLine = i === 0;
        drawLeft(line, isFirstLine ? 10 : 9, yText, isFirstLine, cText);
        yText -= isFirstLine ? 14 : 12; 
      }

      yText -= 3;
      drawLeft(detailsLine, 8, yText, false, cGray);

      drawRight(CURRENCY_FORMATTER.format(totalItem), 10.5, cursorY, true, cText);

      cursorY = yText - 20; // Espaçamento mais amplo até a linha divisória
      hr(cursorY);
      cursorY -= 20; // E mais espaço pós-linha até o próximo item ou rodapé!
    }

    // --- TOTAIS COMPACTOS + PAGAMENTO ---
    checkSpace(80);
    // Add respiro under the description table before totals
    cursorY -= 5;
    
    // Save Y to draw parallel
    const yStartParallel = cursorY;

    const subtotal = Number(orc.subtotal ?? orc.total ?? 0) || 0;
    const discount = Number(orc.discount ?? 0) || 0;
    const total = Number(orc.total ?? (subtotal - discount)) || 0;

    let yTotals = yStartParallel;
    drawRight(`Subtotal: ${CURRENCY_FORMATTER.format(subtotal)}`, 9.5, yTotals, false, cGray);
    yTotals -= 15;
    if (discount > 0) {
      drawRight(`Desconto: -${CURRENCY_FORMATTER.format(discount)}`, 9.5, yTotals, false, cRed);
      yTotals -= 12;
    }
    drawRight(`Total: ${CURRENCY_FORMATTER.format(total)}`, 11.5, yTotals, true, cText);
    yTotals -= 15;

    let yPayment = yStartParallel;

    // --- PAYMENT LINK OR PIX ---
    if (orc.payment_method === 'CREDIT') {
      const btnW = 200;
      const btnH = 24;
      const btnX = CONTENT_X; // Back to Left Side
      
      // Top of the button aligns with "Subtotal:" height
      const btnY = yPayment - 12; 
      
      page.drawRectangle({
        x: btnX,
        y: btnY,
        width: btnW,
        height: btnH,
        color: rgb(0.95, 0.4, 0.1), // Laranja
        borderColor: rgb(0.95, 0.4, 0.1),
        borderWidth: 1,
      });

      const btnText = orc.payment_link ? "LINK DE PAGAMENTO" : "PAGAMENTO NO CARTÃO DE CRÉDITO";
      const textW = fontBold.widthOfTextAtSize(btnText, 10);
      page.drawText(btnText, {
        x: btnX + (btnW - textW) / 2,
        y: btnY + 8,
        size: 10,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      if (orc.payment_link) {
        const linkAnnotation = doc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [btnX, btnY, btnX + btnW, btnY + btnH],
          Border: [0, 0, 0],
          A: {
            Type: 'Action',
            S: 'URI',
            URI: PDFString.of(orc.payment_link),
          },
        });
        const linkRef = doc.context.register(linkAnnotation);
        page.node.set(PDFName.of('Annots'), doc.context.obj([linkRef]));
      }

      let installmentsText = orc.payment_link ? "pagamento parcelado no crédito" : "Link de pagamento não informado no sistema.";
      if (orc.installments && orc.installments > 0) {
        const instValue = total / orc.installments;
        installmentsText = `${orc.installments}x de ${CURRENCY_FORMATTER.format(instValue)}   Total a prazo: ${CURRENCY_FORMATTER.format(total)}`;
      }

      // Drawing the text aligned to the left side
      page.drawText(installmentsText, {
        x: btnX,
        y: btnY - 16,
        size: 8.5,
        font: fontBold,
        color: cText,
      });

      yPayment = btnY - 30;
    } else if (settings?.pix_key) {
      try {
        const payload = buildPixPayload({
          pixKey: settings.pix_key,
          merchantName: stripEmojis(settings.company_name || "CardDigital GM").slice(0, 25),
          merchantCity: "SAO LUIS",
          amount: total,
          txid: orc.id.slice(0, 25).replace(/[^a-zA-Z0-9]/g, ''),
          message: "Pagamento Orcamento"
        });

        const qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, scale: 5 });
        const qrBytes = await fetchBytes(qrDataUrl);
        const qrPng = await doc.embedPng(qrBytes);

        const qrSize = 85;
        // Start drawing from yPayment
        const pixYStart = yPayment;
        const qrY = pixYStart - qrSize + 5; // Align top of QR with text roughly
        
        const pixX = CONTENT_X; // Back to Left Side

        page.drawImage(qrPng, {
          x: pixX,
          y: qrY,
          width: qrSize,
          height: qrSize,
        });

        page.drawText("PAGAMENTO VIA PIX", { 
          x: pixX, 
          y: pixYStart + 15, 
          size: 9.5, 
          font: fontBold, 
          color: cText 
        });
        
        const textX = pixX + qrSize + 12;
        page.drawText("Chave PIX:", { x: textX, y: pixYStart, size: 8.5, font: fontRegular, color: cGray });
        
        page.drawText(String(settings.pix_key), { x: textX, y: pixYStart - 12, size: 8.5, font: fontBold, color: cText });
        
        page.drawText("Pix Copia e Cola:", { x: textX, y: pixYStart - 30, size: 8.5, font: fontRegular, color: cGray });

        // Quebrar o payload em múltiplas linhas
        const chunkString = (str: string, length: number) => {
          return str.match(new RegExp('.{1,' + length + '}', 'g')) || [];
        };
        const payloadLines = chunkString(payload, 45); 
        
        let py = pixYStart - 42;
        for (const line of payloadLines) {
           page.drawText(line, { x: textX, y: py, size: 7.5, font: fontRegular, color: cText });
           py -= 10;
        }

        yPayment = Math.min(qrY - 10, py - 10);
      } catch (e) {
        console.error("Erro QR PDF", e);
      }
    }

    cursorY = Math.min(yTotals, yPayment) - 20;

    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const safeClient = sanitizeFilename(orc.cliente_nome);
    const safeDesc = itens.length > 0 ? sanitizeFilename(itens[0].titulo).slice(0, 20) : "PROJETO";
    link.download = `ORCAMENTO ${safeClient} - ${safeDesc}.pdf`;
    link.click();
  } catch (err: any) {
    console.error("Erro gerando PDF", err);
    alert("Erro ao gerar PDF: " + (err?.message || "Verifique o timbrado nas configurações."));
  }
}

// Relatório de Despesas
export function generateExpensesReportPdf(expenses: Expense[], monthLabel: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const MARGIN = 40;
  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`Relatório - ${stripEmojis(monthLabel)}`, MARGIN, y);
  y += 30;

  doc.setFontSize(10);
  expenses.forEach((ex) => {
    if (y > 800) {
      doc.addPage();
      y = 50;
    }
    const desc = stripEmojis(ex.description);
    doc.text(`${desc} - ${CURRENCY_FORMATTER.format(ex.amount)}`, MARGIN, y);
    y += 15;
  });

  doc.save("despesas.pdf");
}

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export async function generateFinanceReportPdf(params: {
  rows: FinanceReportRow[];
  periodLabel?: string;
  settings: AppSettings;
}) {
  const { rows, periodLabel, settings } = params;

  try {
    const timbradoUrl = settings?.timbrado_url || "";
    if (!timbradoUrl) {
      throw new Error(
        "Nenhum timbrado configurado. Vá em Configurações e envie o timbrado A4 (PNG/JPG)."
      );
    }

    const doc = await PDFDocument.create();
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const bgImage = await embedBackgroundImage(doc, timbradoUrl);

    const W = 595.28;
    const H = 841.89;

    const PX_W = 2480;
    const PX_H = 3508;

    const CONTENT_X_PX = 167;
    const CONTENT_TOP_PX = 167;
    const CONTENT_W_PX = 2146;
    const CONTENT_H_PX = 2146;

    const CONTENT_X = (CONTENT_X_PX / PX_W) * W;
    const CONTENT_W = (CONTENT_W_PX / PX_W) * W;
    const CONTENT_RIGHT_X = CONTENT_X + CONTENT_W;

    const CONTENT_TOP_Y = H - (CONTENT_TOP_PX / PX_H) * H;
    const CONTENT_BOTTOM_Y = H - ((CONTENT_TOP_PX + CONTENT_H_PX) / PX_H) * H;

    let cursorY = CONTENT_TOP_Y;
    let page: PDFPage;

    const cText = rgb(0.12, 0.12, 0.12);
    const cGray = rgb(0.35, 0.35, 0.35);
    const cRed = rgb(0.86, 0.15, 0.16);
    const cGreen = rgb(0.13, 0.77, 0.36);
    const cLine = rgb(0.82, 0.82, 0.82);

    const addPage = () => {
      const p = doc.addPage([W, H]);
      p.drawImage(bgImage, { x: 0, y: 0, width: W, height: H });
      page = p;
      cursorY = CONTENT_TOP_Y;
    };

    const checkSpace = (heightNeeded: number) => {
      if (cursorY - heightNeeded < CONTENT_BOTTOM_Y) addPage();
    };

    addPage();

    const drawLeft = (txt: string, size: number, yPos: number, bold = false, color = cText) => {
      page.drawText(stripEmojis(txt), { x: CONTENT_X, y: yPos, size, font: bold ? fontBold : fontRegular, color });
    };

    const drawRight = (txt: string, size: number, yPos: number, bold = false, color = cText) => {
      const font = bold ? fontBold : fontRegular;
      const sanitized = stripEmojis(txt);
      const w = font.widthOfTextAtSize(sanitized, size);
      page.drawText(sanitized, { x: CONTENT_RIGHT_X - w, y: yPos, size, font, color });
    };

    const hr = (yPos: number) => {
      page.drawLine({
        start: { x: CONTENT_X, y: yPos },
        end: { x: CONTENT_RIGHT_X, y: yPos },
        thickness: 1,
        color: cLine,
      });
    };

    checkSpace(60);
    drawLeft(`RELATÓRIO FINANCEIRO`, 14, cursorY, true);
    cursorY -= 15;

    const dateStr = new Date().toLocaleDateString();
    drawLeft(`Data de Emissão: ${dateStr}`, 9.5, cursorY, false, cGray);
    cursorY -= 12;
    if (periodLabel) {
      drawLeft(`Período: ${stripEmojis(periodLabel)}`, 9.5, cursorY, false, cGray);
      cursorY -= 12;
    }
    cursorY -= 15;

    const receitas = rows.filter(r => r.type === "receita").reduce((a, r) => a + (Number(r.amount) || 0), 0);
    const despesas = rows.filter(r => r.type === "despesa").reduce((a, r) => a + (Number(r.amount) || 0), 0);
    const saldo = receitas - despesas;

    checkSpace(40);
    drawLeft(`Resumo do Período`, 10.5, cursorY, true);
    cursorY -= 10;
    hr(cursorY);
    cursorY -= 14;

    drawLeft(`Total de Receitas:`, 10, cursorY, false, cText);
    drawRight(`${CURRENCY_FORMATTER.format(receitas)}`, 10, cursorY, true, cGreen);
    cursorY -= 14;

    drawLeft(`Total de Despesas:`, 10, cursorY, false, cText);
    drawRight(`-${CURRENCY_FORMATTER.format(despesas)}`, 10, cursorY, true, cRed);
    cursorY -= 14;

    drawLeft(`Saldo Líquido:`, 10, cursorY, true, cText);
    drawRight(`${CURRENCY_FORMATTER.format(saldo)}`, 10, cursorY, true, saldo >= 0 ? cText : cRed);
    cursorY -= 25;

    checkSpace(30);
    drawLeft("DETALHAMENTO DE MOVIMENTAÇÕES", 10.5, cursorY, true);
    cursorY -= 10;
    hr(cursorY);
    cursorY -= 14;

    const colDateX = CONTENT_X;
    const colTypeX = CONTENT_X + 60;
    const colDescX = CONTENT_X + 120;
    const colValueX = CONTENT_RIGHT_X;

    // Header
    page.drawText("Data", { x: colDateX, y: cursorY, size: 9, font: fontBold, color: cGray });
    page.drawText("Tipo", { x: colTypeX, y: cursorY, size: 9, font: fontBold, color: cGray });
    page.drawText("Descrição", { x: colDescX, y: cursorY, size: 9, font: fontBold, color: cGray });
    
    const valHeaderW = fontBold.widthOfTextAtSize("Valor", 9);
    page.drawText("Valor", { x: colValueX - valHeaderW, y: cursorY, size: 9, font: fontBold, color: cGray });
    
    cursorY -= 10;
    hr(cursorY);
    cursorY -= 14;

    const colDescW = CONTENT_W - 120 - 70; // Available width for description

    // Sort rows: Receitas first, then Despesas, then by Date
    const sortedRows = [...rows].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "receita" ? -1 : 1;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    let lastType: string | null = null;
    for (const r of sortedRows) {
      if (r.type !== lastType) {
        lastType = r.type;
        checkSpace(30);
        const headerText = r.type === "receita" ? "GANHOS / RECEITAS" : "DESPESAS / SAÍDAS";
        const headerColor = r.type === "receita" ? cGreen : cRed;
        
        page.drawRectangle({
          x: CONTENT_X,
          y: cursorY - 18,
          width: CONTENT_W,
          height: 18,
          color: headerColor,
          opacity: 0.05
        });
        
        page.drawText(headerText, { 
          x: CONTENT_X + 5, 
          y: cursorY - 12, 
          size: 8, 
          font: fontBold, 
          color: headerColor 
        });
        
        cursorY -= 28;
      }

      const isReceita = r.type === "receita";
      const color = isReceita ? cGreen : cRed;
      const typeStr = isReceita ? "Receita" : "Despesa";
      const valStr = `${isReceita ? '+' : '-'} ${CURRENCY_FORMATTER.format(Number(r.amount) || 0)}`;
      const dateStr = new Date(r.date).toLocaleDateString("pt-BR");

      const size = 9;
      const lines = wrapText(r.title || "-", colDescW, fontRegular, size);
      const blockH = Math.max(18, lines.length * 12);

      checkSpace(blockH + 5);

      page.drawText(dateStr, { x: colDateX, y: cursorY, size, font: fontRegular, color: cText });
      page.drawText(typeStr, { x: colTypeX, y: cursorY, size, font: fontRegular, color: color });

      let yText = cursorY;
      for (const line of lines) {
        page.drawText(line, { x: colDescX, y: yText, size, font: fontRegular, color: cText });
        yText -= 12;
      }

      const valW = fontBold.widthOfTextAtSize(valStr, size);
      page.drawText(valStr, { x: colValueX - valW, y: cursorY, size, font: fontBold, color: color });

      cursorY -= blockH;
      hr(cursorY + 6);
      cursorY -= 10;
    }

    const pdfBytes = await doc.save();
    return new Blob([pdfBytes], { type: "application/pdf" });
  } catch (err: any) {
    console.error("Erro gerando PDF Financeiro", err);
    throw err;
  }
}

export type FullAppSummaryData = {
  settings: AppSettings;
  budgets: any[];
  clients: any[];
  notes: any[];
  expenses: any[];
  marketItems: any[];
};

export async function generateFullAppSummaryPdf(data: FullAppSummaryData) {
  try {
    const { settings, budgets = [], clients = [], notes = [], expenses = [], marketItems = [] } = data;
    const timbradoUrl = settings?.timbrado_url || "";

    const doc = await PDFDocument.create();
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    let bgImage: any = null;
    if (timbradoUrl) {
      try {
        bgImage = await embedBackgroundImage(doc, timbradoUrl);
      } catch (e) {
        console.warn("Timbrado background could not be loaded, proceeding with clean header layout:", e);
      }
    }

    const W = 595.28;
    const H = 841.89;

    const PX_W = 2480;
    const PX_H = 3508;

    const CONTENT_X_PX = 160;
    const CONTENT_TOP_PX = 230;
    const CONTENT_W_PX = 2160;
    const CONTENT_H_PX = 2260;

    const CONTENT_X = (CONTENT_X_PX / PX_W) * W;
    const CONTENT_W = (CONTENT_W_PX / PX_W) * W;
    const CONTENT_RIGHT_X = CONTENT_X + CONTENT_W;

    const CONTENT_TOP_Y = H - (CONTENT_TOP_PX / PX_H) * H;
    const CONTENT_BOTTOM_Y = H - ((CONTENT_TOP_PX + CONTENT_H_PX) / PX_H) * H;

    let cursorY = CONTENT_TOP_Y;
    let page: PDFPage;

    const cText = rgb(0.1, 0.1, 0.1);
    const cGray = rgb(0.35, 0.35, 0.35);
    const cLightGray = rgb(0.6, 0.6, 0.6);
    const cPrimary = rgb(0.95, 0.33, 0.04); // #FE540B
    const cGreen = rgb(0.1, 0.6, 0.3);
    const cRed = rgb(0.8, 0.15, 0.15);

    const addPage = () => {
      const p = doc.addPage([W, H]);
      if (bgImage) {
        p.drawImage(bgImage, { x: 0, y: 0, width: W, height: H });
      } else {
        // Fallback header background strip
        p.drawRectangle({
          x: CONTENT_X,
          y: H - 45,
          width: CONTENT_W,
          height: 2,
          color: cPrimary,
        });
      }
      page = p;
      cursorY = CONTENT_TOP_Y;
    };

    const checkSpace = (heightNeeded: number) => {
      if (cursorY - heightNeeded < CONTENT_BOTTOM_Y) {
        addPage();
      }
    };

    const hr = (y: number) => {
      page.drawLine({
        start: { x: CONTENT_X, y },
        end: { x: CONTENT_RIGHT_X, y },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });
    };

    const drawSectionHeader = (title: string) => {
      checkSpace(32);
      page.drawRectangle({
        x: CONTENT_X,
        y: cursorY - 18,
        width: CONTENT_W,
        height: 18,
        color: cPrimary,
        opacity: 0.08,
      });
      page.drawText(title.toUpperCase(), {
        x: CONTENT_X + 6,
        y: cursorY - 13,
        size: 8.5,
        font: fontBold,
        color: cPrimary,
      });
      cursorY -= 26;
    };

    // Initialize first page
    addPage();

    // MAIN TITLE
    const nowStr = new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const companyTitle = stripEmojis(settings?.company_name || "CardDigital GM").toUpperCase();
    page.drawText("RELATÓRIO DE GESTÃO INTEGRADO", {
      x: CONTENT_X,
      y: cursorY,
      size: 13,
      font: fontBold,
      color: cPrimary,
    });
    cursorY -= 14;

    page.drawText(`${companyTitle} • ${nowStr.toUpperCase()}`, {
      x: CONTENT_X,
      y: cursorY,
      size: 8.5,
      font: fontRegular,
      color: cGray,
    });
    cursorY -= 16;
    hr(cursorY);
    cursorY -= 16;

    // RESUMO DE MÉTRICAS (KPIs)
    const totalOrcamentos = budgets.length;
    const orcamentosAprovados = budgets.filter((b) =>
      String(b.status || "").toUpperCase().includes("APROV")
    );
    const totalValorOrcamentos = budgets.reduce(
      (sum, b) => sum + (Number(b.total_amount || b.total) || 0),
      0
    );
    const totalClientes = clients.length;
    const totalNotas = notes.length;

    const totalDespesas = expenses.reduce(
      (sum, e) => sum + (Number(e.amount || e.valor) || 0),
      0
    );
    const totalMercado = marketItems.reduce(
      (sum, m) => sum + (Number(m.price || m.valor || m.unit_price) || 0),
      0
    );

    drawSectionHeader("1. Resumo Consolidado de Métricas do Sistema");

    // Table of KPIs
    const kpiRow1 = [
      `Total de Orçamentos: ${totalOrcamentos} (${orcamentosAprovados.length} aprovados)`,
      `Valor em Orçamentos: ${CURRENCY_FORMATTER.format(totalValorOrcamentos)}`,
    ];
    const kpiRow2 = [
      `Clientes Cadastrados: ${totalClientes}`,
      `Notas Registradas: ${totalNotas}`,
    ];
    const kpiRow3 = [
      `Total de Despesas: ${CURRENCY_FORMATTER.format(totalDespesas)}`,
      `Itens no Mercado: ${marketItems.length} (${CURRENCY_FORMATTER.format(totalMercado)})`,
    ];

    const drawKpiLine = (leftText: string, rightText: string) => {
      checkSpace(16);
      page.drawText(leftText, { x: CONTENT_X + 5, y: cursorY, size: 8.5, font: fontBold, color: cText });
      const rW = fontBold.widthOfTextAtSize(rightText, 8.5);
      page.drawText(rightText, { x: CONTENT_RIGHT_X - rW - 5, y: cursorY, size: 8.5, font: fontBold, color: cText });
      cursorY -= 14;
    };

    drawKpiLine(kpiRow1[0], kpiRow1[1]);
    drawKpiLine(kpiRow2[0], kpiRow2[1]);
    drawKpiLine(kpiRow3[0], kpiRow3[1]);
    cursorY -= 10;

    // SEÇÃO 2: ORÇAMENTOS
    drawSectionHeader("2. Orçamentos Recentes e Status");
    if (budgets.length === 0) {
      page.drawText("Nenhum orçamento registrado no sistema.", {
        x: CONTENT_X + 5,
        y: cursorY,
        size: 8.5,
        font: fontRegular,
        color: cGray,
      });
      cursorY -= 16;
    } else {
      // Table Header
      checkSpace(18);
      page.drawText("Cliente / Serviço", { x: CONTENT_X + 5, y: cursorY, size: 8, font: fontBold, color: cGray });
      page.drawText("Status", { x: CONTENT_X + 260, y: cursorY, size: 8, font: fontBold, color: cGray });
      const vHeader = "Valor Total";
      const vW = fontBold.widthOfTextAtSize(vHeader, 8);
      page.drawText(vHeader, { x: CONTENT_RIGHT_X - vW - 5, y: cursorY, size: 8, font: fontBold, color: cGray });
      cursorY -= 10;
      hr(cursorY);
      cursorY -= 12;

      for (const b of budgets.slice(0, 15)) {
        checkSpace(18);
        const name = stripEmojis(b.client_name || b.title || "Cliente sem nome").slice(0, 32);
        const service = stripEmojis(b.service_name || b.category || "Serviço").slice(0, 30);
        const st = String(b.status || "Pendente").toUpperCase();
        const val = CURRENCY_FORMATTER.format(Number(b.total_amount || b.total) || 0);

        page.drawText(`${name} (${service})`, { x: CONTENT_X + 5, y: cursorY, size: 8, font: fontRegular, color: cText });
        page.drawText(st, { x: CONTENT_X + 260, y: cursorY, size: 7.5, font: fontBold, color: st.includes("APROV") ? cGreen : cGray });

        const valW = fontBold.widthOfTextAtSize(val, 8);
        page.drawText(val, { x: CONTENT_RIGHT_X - valW - 5, y: cursorY, size: 8, font: fontBold, color: cText });

        cursorY -= 12;
        hr(cursorY + 4);
        cursorY -= 6;
      }
    }
    cursorY -= 10;

    // SEÇÃO 3: CLIENTES
    drawSectionHeader("3. Clientes da Base");
    if (clients.length === 0) {
      page.drawText("Nenhum cliente cadastrado no sistema.", {
        x: CONTENT_X + 5,
        y: cursorY,
        size: 8.5,
        font: fontRegular,
        color: cGray,
      });
      cursorY -= 16;
    } else {
      for (const c of clients.slice(0, 12)) {
        checkSpace(16);
        const name = stripEmojis(c.name || c.cliente_nome || "Cliente").slice(0, 35);
        const phone = c.phone || c.whatsapp || c.telefone || "Sem telefone";
        const docNum = c.document || c.cpf || c.cnpj || "";

        const label = `${name} ${phone ? `• ${phone}` : ""} ${docNum ? `(${docNum})` : ""}`;
        page.drawText(`•  ${label}`, { x: CONTENT_X + 5, y: cursorY, size: 8, font: fontRegular, color: cText });
        cursorY -= 12;
      }
    }
    cursorY -= 10;

    // SEÇÃO 4: NOTAS & ANOTAÇÕES
    drawSectionHeader("4. Notas & Anotações do Sistema");
    if (notes.length === 0) {
      page.drawText("Nenhuma nota cadastrada.", {
        x: CONTENT_X + 5,
        y: cursorY,
        size: 8.5,
        font: fontRegular,
        color: cGray,
      });
      cursorY -= 16;
    } else {
      for (const n of notes.slice(0, 10)) {
        checkSpace(16);
        const title = stripEmojis(n.title || "Sem título").slice(0, 45);
        const category = stripEmojis(n.category || "Geral");
        const dt = n.created_at ? new Date(n.created_at).toLocaleDateString("pt-BR") : "";

        page.drawText(`•  [${category.toUpperCase()}] ${title} ${dt ? `- ${dt}` : ""}`, {
          x: CONTENT_X + 5,
          y: cursorY,
          size: 8,
          font: fontRegular,
          color: cText,
        });
        cursorY -= 12;
      }
    }
    cursorY -= 10;

    // SEÇÃO 5: FINANCEIRO & DESPESAS
    drawSectionHeader("5. Financeiro & Registro de Despesas");
    if (expenses.length === 0) {
      page.drawText("Nenhuma despesa registrada no período.", {
        x: CONTENT_X + 5,
        y: cursorY,
        size: 8.5,
        font: fontRegular,
        color: cGray,
      });
      cursorY -= 16;
    } else {
      for (const e of expenses.slice(0, 10)) {
        checkSpace(16);
        const title = stripEmojis(e.title || e.description || "Despesa").slice(0, 40);
        const category = stripEmojis(e.category || "Geral");
        const val = CURRENCY_FORMATTER.format(Number(e.amount || e.valor) || 0);

        page.drawText(`•  ${title} (${category})`, { x: CONTENT_X + 5, y: cursorY, size: 8, font: fontRegular, color: cText });
        const valW = fontBold.widthOfTextAtSize(val, 8);
        page.drawText(`-${val}`, { x: CONTENT_RIGHT_X - valW - 5, y: cursorY, size: 8, font: fontBold, color: cRed });
        cursorY -= 12;
      }
    }
    cursorY -= 10;

    // SEÇÃO 6: MERCADO / CATÁLOGO
    drawSectionHeader("6. Mercado & Catálogo de Itens");
    if (marketItems.length === 0) {
      page.drawText("Nenhum item cadastrado no Mercado.", {
        x: CONTENT_X + 5,
        y: cursorY,
        size: 8.5,
        font: fontRegular,
        color: cGray,
      });
      cursorY -= 16;
    } else {
      for (const m of marketItems.slice(0, 10)) {
        checkSpace(16);
        const name = stripEmojis(m.title || m.name || m.item_name || "Item Mercado").slice(0, 40);
        const priceVal = Number(m.price || m.unit_price || m.valor) || 0;
        const val = priceVal > 0 ? CURRENCY_FORMATTER.format(priceVal) : "Sob Consulta";

        page.drawText(`•  ${name}`, { x: CONTENT_X + 5, y: cursorY, size: 8, font: fontRegular, color: cText });
        const valW = fontBold.widthOfTextAtSize(val, 8);
        page.drawText(val, { x: CONTENT_RIGHT_X - valW - 5, y: cursorY, size: 8, font: fontBold, color: cText });
        cursorY -= 12;
      }
    }

    // Save and download
    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const safeComp = sanitizeFilename(settings?.company_name || "CARDDIGITAL_GM");
    link.download = `RELATORIO_GERAL_${safeComp}.pdf`;
    link.click();
  } catch (err: any) {
    console.error("Erro ao gerar Relatório Geral Integrado em PDF", err);
    throw err;
  }
}

export type NotePdfItem = {
  id?: string;
  title: string;
  content: string;
  category?: string;
  type?: string;
  status?: string;
  responsible_name?: string;
  delivery_date?: string;
  delivery_time?: string;
  created_at?: string;
  layout_url?: string;
};

function bytesToDataUrl(bytes: Uint8Array, contentType: string = "image/png"): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:${contentType || "image/png"};base64,${base64}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Falha ao ler blob como DataURL"));
    };
    reader.onerror = () => reject(new Error("Erro ao ler blob"));
    reader.readAsDataURL(blob);
  });
}

function imageElementToDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => {
      reject(new Error("Timeout carregamento imagem"));
    }, 4500);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || img.width || 400;
        c.height = img.naturalHeight || img.height || 300;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(c.toDataURL("image/png"));
        } else {
          reject(new Error("Sem contexto 2D"));
        }
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Erro ao carregar imagem"));
    };
    img.src = url;
  });
}

async function convertImageUrlToDataUrl(url: string, defaultBucket = "tenant-assets"): Promise<string> {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:")) return trimmed;

  // 1. Tentar resolver via Supabase Storage
  const sb = parseSupabaseStorageUrl(trimmed);
  const bucket = sb?.bucket || defaultBucket;
  const path = sb?.path || tryExtractSupabaseStoragePath(trimmed, bucket);

  if (path) {
    try {
      const { data: blob, error } = await supabase.storage.from(bucket).download(path);
      if (!error && blob && blob.size > 0) {
        return await blobToDataUrl(blob);
      }
    } catch (e) {}

    try {
      const { data: signed, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 600);
      if (!signErr && signed?.signedUrl) {
        const res = await fetch(signed.signedUrl);
        if (res.ok) {
          const blob = await res.blob();
          if (blob && blob.size > 0) return await blobToDataUrl(blob);
        }
      }
    } catch (e) {}
  }

  // 2. Tentar fetch direto (com CORS)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(trimmed, { mode: "cors", signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) {
        return await blobToDataUrl(blob);
      }
    }
  } catch (e) {}

  // 3. Tentar via HTMLImageElement canvas
  try {
    const dataUrl = await imageElementToDataUrl(trimmed);
    if (dataUrl) return dataUrl;
  } catch (e) {}

  return trimmed;
}

function convertCssColorToHexOrRgb(colorStr: string): string {
  if (!colorStr || typeof colorStr !== "string") return colorStr;
  if (
    !colorStr.includes("oklab") &&
    !colorStr.includes("oklch") &&
    !colorStr.includes("color-mix") &&
    !colorStr.includes("color(")
  ) {
    return colorStr;
  }
  try {
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1e293b";
        ctx.fillStyle = colorStr;
        const res = ctx.fillStyle;
        if (
          res &&
          !res.includes("oklab") &&
          !res.includes("oklch") &&
          !res.includes("color-mix") &&
          !res.includes("color(")
        ) {
          return res;
        }
      }
    }
  } catch (e) {}
  return "#1e293b";
}

export async function generateNotePdfViaPdfLib(note: NotePdfItem, settings: AppSettings) {
  const DEFAULT_TIMBRADO_URL =
    "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/Modelo%20Timbrado/TIMBRADO%20GABARITO.png";
  const timbradoUrl =
    settings?.timbrado_url && settings.timbrado_url.trim() ? settings.timbrado_url : DEFAULT_TIMBRADO_URL;

  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28;
  const H = 841.89;
  const PX_W = 2480;
  const PX_H = 3508;
  const CONTENT_X_PX = 167;
  const CONTENT_TOP_PX = 167;
  const CONTENT_W_PX = 2146;
  const CONTENT_H_PX = 2146;

  const CONTENT_X = (CONTENT_X_PX / PX_W) * W;
  const CONTENT_W = (CONTENT_W_PX / PX_W) * W;
  const CONTENT_RIGHT_X = CONTENT_X + CONTENT_W;
  const CONTENT_TOP_Y = H - (CONTENT_TOP_PX / PX_H) * H;
  const CONTENT_BOTTOM_Y = H - ((CONTENT_TOP_PX + CONTENT_H_PX) / PX_H) * H;

  let bgImage: any = null;
  if (timbradoUrl) {
    try {
      bgImage = await embedBackgroundImage(doc, timbradoUrl);
    } catch (e) {
      console.warn("Aviso ao carregar timbrado no fallback:", e);
    }
  }

  const createPage = () => {
    const p = doc.addPage([W, H]);
    if (bgImage) {
      p.drawImage(bgImage, { x: 0, y: 0, width: W, height: H });
    }
    return p;
  };

  let page = createPage();
  let cursorY = CONTENT_TOP_Y;

  const cText = rgb(0.06, 0.09, 0.16);
  const cGray = rgb(0.28, 0.33, 0.41);
  const cPrimary = rgb(0.92, 0.35, 0.05); // #EA580C
  const cBorder = rgb(0.80, 0.83, 0.88);

  const noteTitle = note.title && note.title.trim() ? note.title.toUpperCase() : "NOTA SEM TÍTULO";
  const dateStr = note.created_at
    ? new Date(note.created_at).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  let deliveryStr = "";
  if (note.delivery_date) {
    const [y, m, d] = note.delivery_date.split("-");
    const dFormatted = y && m && d ? `${d}/${m}/${y}` : note.delivery_date;
    deliveryStr = `${dFormatted}${note.delivery_time ? ` às ${note.delivery_time}` : ""}`;
  }

  // Header Title
  page.drawText(`NOTA: ${stripEmojis(noteTitle)}`, {
    x: CONTENT_X,
    y: cursorY,
    size: 13,
    font: fontBold,
    color: cText,
  });
  cursorY -= 16;

  // Meta bar
  let metaLine = `Criado em: ${dateStr}`;
  if (deliveryStr) metaLine += `  |  Prazo: ${stripEmojis(deliveryStr)}`;
  if (note.responsible_name) metaLine += `  |  Resp: ${stripEmojis(note.responsible_name)}`;
  if (note.category) metaLine += `  |  Cat: ${stripEmojis(note.category)}`;

  page.drawText(metaLine, {
    x: CONTENT_X,
    y: cursorY,
    size: 8.5,
    font: fontRegular,
    color: cGray,
  });

  if (note.status) {
    const stText = `STATUS: ${stripEmojis(note.status.toUpperCase())}`;
    const stW = fontBold.widthOfTextAtSize(stText, 8.5);
    page.drawText(stText, {
      x: CONTENT_RIGHT_X - stW,
      y: cursorY,
      size: 8.5,
      font: fontBold,
      color: cPrimary,
    });
  }

  cursorY -= 8;
  page.drawLine({
    start: { x: CONTENT_X, y: cursorY },
    end: { x: CONTENT_RIGHT_X, y: cursorY },
    thickness: 1,
    color: cBorder,
  });
  cursorY -= 14;

  // 2 - PRIMEIRO OS LAYOUTS
  let layoutUrls: string[] = [];
  if (note.layout_url) {
    const trimmed = note.layout_url.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) layoutUrls.push(...arr.map((s) => String(s).trim()).filter(Boolean));
      } catch (e) {}
    }
    if (layoutUrls.length === 0) {
      layoutUrls.push(...trimmed.split(",").map((s) => s.trim()).filter(Boolean));
    }
  }

  const embeddedLayouts: any[] = [];
  for (const lUrl of layoutUrls.slice(0, 4)) {
    try {
      const { bytes, contentType } = await resolveTimbradoBytesWithFallback(lUrl);
      if (looksLikePNG(bytes) || contentType.includes("png")) {
        const img = await doc.embedPng(bytes);
        embeddedLayouts.push(img);
      } else if (looksLikeJPG(bytes) || contentType.includes("jpeg") || contentType.includes("jpg")) {
        const img = await doc.embedJpg(bytes);
        embeddedLayouts.push(img);
      }
    } catch (err) {
      console.warn("Aviso ao embutir layout no pdf-lib:", err);
    }
  }

  if (embeddedLayouts.length > 0) {
    page.drawText(`LAYOUTS / ANEXOS (${embeddedLayouts.length})`, {
      x: CONTENT_X,
      y: cursorY,
      size: 9.5,
      font: fontBold,
      color: cText,
    });
    cursorY -= 12;

    const count = embeddedLayouts.length;
    if (count === 1) {
      const img = embeddedLayouts[0];
      const maxW = 260;
      const maxH = 110;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = CONTENT_X + (CONTENT_W - drawW) / 2;
      page.drawImage(img, { x: drawX, y: cursorY - drawH, width: drawW, height: drawH });
      cursorY -= drawH + 12;
    } else {
      const cardW = (CONTENT_W - 12 * (count - 1)) / Math.min(count, 3);
      const maxH = 95;
      let curX = CONTENT_X;
      let maxDrawnH = 0;
      for (const img of embeddedLayouts.slice(0, 3)) {
        const scale = Math.min(cardW / img.width, maxH / img.height, 1);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        maxDrawnH = Math.max(maxDrawnH, drawH);
        page.drawImage(img, { x: curX + (cardW - drawW) / 2, y: cursorY - drawH, width: drawW, height: drawH });
        curX += cardW + 12;
      }
      cursorY -= maxDrawnH + 12;
    }
  }

  // 3 - DEPOIS OS TEXTOS
  page.drawText("DESCRIÇÃO DOS SERVIÇOS / DETALHAMENTO", {
    x: CONTENT_X,
    y: cursorY,
    size: 9.5,
    font: fontBold,
    color: cText,
  });
  cursorY -= 14;

  const rawHtml = note.content || "Nenhuma descrição informada.";
  const textWithBreaks = rawHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  const lines = wrapText(textWithBreaks, CONTENT_W, fontRegular, 9);
  for (const line of lines) {
    if (cursorY < CONTENT_BOTTOM_Y + 65) {
      page = createPage();
      cursorY = CONTENT_TOP_Y;
      page.drawText(`NOTA: ${stripEmojis(noteTitle)} (Continuação)`, {
        x: CONTENT_X,
        y: cursorY,
        size: 11,
        font: fontBold,
        color: cText,
      });
      cursorY -= 16;
    }
    if (line.trim() === "") {
      cursorY -= 7;
      continue;
    }
    page.drawText(line, {
      x: CONTENT_X,
      y: cursorY,
      size: 9,
      font: fontRegular,
      color: cText,
    });
    cursorY -= 12.5;
  }

  // Assinaturas no Rodapé
  const sigY = CONTENT_BOTTOM_Y + 25;
  const colW = (CONTENT_W - 40) / 2;
  page.drawLine({
    start: { x: CONTENT_X, y: sigY + 12 },
    end: { x: CONTENT_X + colW, y: sigY + 12 },
    thickness: 1,
    color: cGray,
  });
  const sig1 = "Assinatura do Recebedor";
  const sig1W = fontRegular.widthOfTextAtSize(sig1, 8);
  page.drawText(sig1, {
    x: CONTENT_X + (colW - sig1W) / 2,
    y: sigY,
    size: 8,
    font: fontRegular,
    color: cGray,
  });

  const sig2X = CONTENT_RIGHT_X - colW;
  page.drawLine({
    start: { x: sig2X, y: sigY + 12 },
    end: { x: sig2X + colW, y: sigY + 12 },
    thickness: 1,
    color: cGray,
  });
  const sig2 = "Assinatura do Responsável";
  const sig2W = fontRegular.widthOfTextAtSize(sig2, 8);
  page.drawText(sig2, {
    x: sig2X + (colW - sig2W) / 2,
    y: sigY,
    size: 8,
    font: fontRegular,
    color: cGray,
  });

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const cleanFileName = sanitizeFilename(note.title || "NOTA");
  link.download = `NOTA ${cleanFileName}.pdf`;
  link.click();
}

export async function generateNotePdf(note: NotePdfItem, settings: AppSettings) {
  let iframe: HTMLIFrameElement | null = null;
  try {
    // 0. Fallback para gabarito oficial de timbrado caso nenhum esteja configurado
    const DEFAULT_TIMBRADO_URL =
      "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/Modelo%20Timbrado/TIMBRADO%20GABARITO.png";
    const timbradoUrl = settings?.timbrado_url && settings.timbrado_url.trim() ? settings.timbrado_url : DEFAULT_TIMBRADO_URL;

    // 1. Converter timbrado para DataURL Base64 para garantir carregamento instantâneo sem CORS
    const timbradoDataUrl = await convertImageUrlToDataUrl(timbradoUrl, "timbrados");

    // 2. Extrair mídias e layouts da nota
    let layoutUrls: string[] = [];
    if (note.layout_url) {
      const trimmed = note.layout_url.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const arr = JSON.parse(trimmed);
          if (Array.isArray(arr)) layoutUrls = arr.map((s) => String(s).trim()).filter(Boolean);
        } catch (e) {}
      }
      if (layoutUrls.length === 0) {
        layoutUrls = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    if (typeof document !== "undefined" && note.content) {
      try {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = note.content;
        const imgElements = tempDiv.getElementsByTagName("img");
        for (let i = 0; i < imgElements.length; i++) {
          const src = imgElements[i].getAttribute("src");
          if (src && !layoutUrls.includes(src)) {
            layoutUrls.push(src);
          }
        }
      } catch (e) {}
    }

    // Converter cada imagem de layout para DataURL Base64 em paralelo
    const convertedLayouts = await Promise.all(
      layoutUrls.map((url) => convertImageUrlToDataUrl(url, "tenant-assets"))
    );
    const layoutDataUrls = convertedLayouts.filter(Boolean);

    // 3. Preparar metadados da Nota
    const noteTitle = note.title && note.title.trim() ? note.title.toUpperCase() : "NOTA SEM TÍTULO";
    const dateStr = note.created_at
      ? new Date(note.created_at).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR");

    let deliveryStr = "";
    if (note.delivery_date) {
      const [y, m, d] = note.delivery_date.split("-");
      const dFormatted = y && m && d ? `${d}/${m}/${y}` : note.delivery_date;
      deliveryStr = `${dFormatted}${note.delivery_time ? ` às ${note.delivery_time}` : ""}`;
    }

    // Remover <img> do texto porque serão exibidas com prioridade nos LAYOUTS no topo
    let cleanContentHtml = note.content && note.content.trim() ? note.content : "<p>Nenhuma descrição informada.</p>";
    cleanContentHtml = cleanContentHtml.replace(/<img[^>]*>/gi, "");
    cleanContentHtml = cleanContentHtml.replace(/(?:oklab|oklch|color-mix|color)\([^)]+\)/gi, (match) => {
      return convertCssColorToHexOrRgb(match);
    });

    // Helper para normalizar e aprimorar formatação de marcadores (highlighters) atrás do texto
    if (typeof document !== "undefined") {
      try {
        const sanitizerDiv = document.createElement("div");
        sanitizerDiv.innerHTML = cleanContentHtml;

        // Estilizar marcadores e spans com background para ficarem perfeitamente centralizados atrás do texto
        const marks = sanitizerDiv.querySelectorAll(
          "mark, [style*='background-color'], [style*='background'], [data-highlight]"
        );
        marks.forEach((node) => {
          const el = node as HTMLElement;
          // Se for elemento vazio ou só espaços em branco (sem texto real e sem imagem)
          const text = (el.textContent || "").replace(/[\s\u00A0\u200B]+/g, "").trim();
          if (!text && !el.querySelector("img, svg")) {
            // Remove o marcador vazio para não criar mancha amarela solta no documento
            el.remove();
            return;
          }

          // Ajustar espaçamento interno para abraçar o texto perfeitamente sem sobras
          if (el.innerHTML.endsWith("&nbsp;")) {
            el.innerHTML = el.innerHTML.replace(/(&nbsp;|\s)+$/, "");
          }
          if (el.innerHTML.startsWith("&nbsp;")) {
            el.innerHTML = el.innerHTML.replace(/^(&nbsp;|\s)+/, "");
          }

          el.style.boxDecorationBreak = "clone";
          (el.style as any).webkitBoxDecorationBreak = "clone";
          el.style.display = "inline-block";
          el.style.verticalAlign = "middle";
          el.style.textAlign = "center";
          el.style.lineHeight = "1.25";
          el.style.position = "relative";
          el.style.zIndex = "1";
          el.style.padding = "2.5px 7px 2.5px 7px";
          el.style.margin = "1px 2px";
          el.style.borderRadius = "4px";
          el.style.fontWeight = el.style.fontWeight || "600";
          el.style.boxSizing = "border-box";

          // Se a cor do texto for muito clara em fundo amarelo/verde/azul claro, garantir legibilidade
          const bg = el.style.backgroundColor || "";
          if (
            bg.includes("254, 240") ||
            bg.includes("253, 224") ||
            bg.includes("fef08a") ||
            bg.includes("fde047") ||
            bg.includes("yellow") ||
            bg.includes("#ff") ||
            bg.includes("255, 255")
          ) {
            if (!el.style.color || el.style.color === "white" || el.style.color.includes("255, 255, 255")) {
              el.style.color = "#0f172a";
            }
          }
        });

        cleanContentHtml = sanitizerDiv.innerHTML;
      } catch (e) {
        console.warn("Aviso ao normalizar estilos de marcadores:", e);
      }
    }

    // Estrutura CSS pura (HEX e RGB, 100% segura contra erros de oklab, suporte a formatações e emojis)
    const baseCss = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      html, body {
        width: 794px;
        height: 1123px;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #ffffff;
      }
      .page-wrapper {
        position: relative !important;
        width: 794px !important;
        height: 1123px !important;
        max-width: 794px !important;
        max-height: 1123px !important;
        overflow: hidden !important;
        background: #ffffff !important;
        color: #0f172a;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      .timbrado-background {
        position: absolute;
        top: 0;
        left: 0;
        width: 794px;
        height: 1123px;
        object-fit: fill;
        z-index: 1;
        pointer-events: none;
      }
      /* Limite da área útil do timbrado: 56px do topo até 790px (altura útil máxima 734px) */
      .page-content {
        position: absolute;
        top: 56px;
        left: 50px;
        right: 50px;
        width: 694px;
        height: 734px;
        max-height: 734px;
        overflow: hidden;
        z-index: 10;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
      }
      .header-section {
        border-bottom: 1.5px solid #cbd5e1;
        padding-bottom: 6px;
        margin-bottom: 8px;
        flex-shrink: 0;
      }
      .header-top-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .note-h1 {
        font-size: 15px;
        font-weight: 800;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        line-height: 1.25;
        flex: 1;
      }
      .page-counter-pill {
        background: #0f172a;
        color: #ffffff;
        font-size: 9px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 4px;
        letter-spacing: 0.5px;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1.2;
        text-align: center;
      }
      .meta-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10px;
        color: #475569;
        font-weight: 600;
        margin-top: 5px;
        flex-wrap: wrap;
        gap: 8px;
      }
      .meta-items {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
      }
      .meta-items span strong {
        color: #0f172a;
        font-weight: 700;
      }
      .meta-status {
        color: #ea580c;
        font-weight: 800;
        text-transform: uppercase;
        font-size: 10px;
        background: #fff7ed;
        border: 1px solid #ffedd5;
        padding: 2.5px 8px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1.2;
        text-align: center;
      }

      /* Cabeçalho compacto para páginas de continuação */
      .continuation-header {
        border-bottom: 1.5px solid #cbd5e1;
        padding-bottom: 6px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }
      .continuation-title {
        font-size: 13px;
        font-weight: 800;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .continuation-tag {
        font-size: 10px;
        color: #64748b;
        font-weight: 600;
        text-transform: none;
      }

      /* Títulos de Seção com indicador visual */
      .section-heading {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10.5px;
        font-weight: 800;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-top: 4px;
        margin-bottom: 6px;
        flex-shrink: 0;
        line-height: 1.2;
      }
      .heading-bar {
        display: inline-block;
        width: 3.5px;
        height: 12px;
        background: #ea580c;
        border-radius: 2px;
        vertical-align: middle;
      }

      /* 2 - PRIMEIRO OS LAYOUTS */
      .layouts-section {
        margin-bottom: 8px;
        flex-shrink: 0;
      }
      .layouts-grid {
        display: grid;
        gap: 8px;
        width: 100%;
      }
      .layouts-grid-1 {
        grid-template-columns: 1fr;
        max-width: 440px;
        margin: 0 auto;
      }
      .layouts-grid-2 {
        grid-template-columns: 1fr 1fr;
      }
      .layouts-grid-3 {
        grid-template-columns: repeat(3, 1fr);
      }
      .layouts-grid-4 {
        grid-template-columns: 1fr 1fr;
      }
      .layout-card {
        position: relative;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #f8fafc;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
      }
      .layout-card.size-single {
        height: 165px;
      }
      .layout-card.size-double {
        height: 135px;
      }
      .layout-card.size-multi {
        height: 115px;
      }
      .layout-card img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 6px;
      }
      .layout-badge {
        position: absolute;
        top: 6px;
        right: 6px;
        background: #0f172a;
        color: #ffffff;
        font-size: 8.5px;
        font-weight: 800;
        padding: 2.5px 6px;
        border-radius: 4px;
        z-index: 5;
        letter-spacing: 0.5px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1.2;
        text-align: center;
      }
      .layout-badge.primary {
        background: #ea580c;
      }

      /* 3 - DEPOIS OS TEXTOS COM FORMATAÇÃO DO EDITOR */
      .text-content-box {
        font-size: 11px;
        line-height: 1.6;
        color: #0f172a;
        word-break: break-word;
        letter-spacing: 0.1px;
        flex: 1;
        min-height: 0;
      }
      .content-item {
        margin-bottom: 3.5px;
        min-height: 16px;
        line-height: 1.5;
        vertical-align: middle;
      }
      .content-item img,
      .content-item svg,
      .content-item span {
        vertical-align: middle;
      }
      .text-content-box p, .text-content-box div {
        margin-bottom: 4px;
        min-height: 16px;
      }
      .text-content-box strong, .text-content-box b {
        font-weight: 700;
        color: #0f172a;
      }
      .text-content-box em, .text-content-box i {
        font-style: italic;
      }
      .text-content-box u {
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .text-content-box s, .text-content-box strike {
        text-decoration: line-through;
        opacity: 0.7;
      }
      .text-content-box ul, .text-content-box ol {
        padding-left: 20px;
        margin-top: 3px;
        margin-bottom: 6px;
      }
      .text-content-box li {
        margin-bottom: 2px;
        line-height: 1.6;
      }

      /* Marcador / Barra de Destaque perfeitamente centralizado vertical e horizontalmente */
      .text-content-box mark,
      .text-content-box span[style*="background"],
      .text-content-box span[style*="background-color"],
      .text-content-box font[style*="background"],
      .text-content-box [data-highlight],
      mark {
        display: inline-block !important;
        vertical-align: middle !important;
        text-align: center !important;
        line-height: 1.25 !important;
        padding: 2.5px 7px 2.5px 7px !important;
        margin: 1px 2px !important;
        border-radius: 4px !important;
        font-weight: 600 !important;
        position: relative !important;
        z-index: 1 !important;
        box-sizing: border-box !important;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }

      /* Demais Destaques (badges, chips, bordas de destaque) com texto centralizado */
      .text-content-box span[style*="border"],
      .text-content-box .badge,
      .text-content-box .tag {
        display: inline-block !important;
        vertical-align: middle !important;
        text-align: center !important;
        line-height: 1.25 !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
        box-sizing: border-box !important;
      }

      /* Assinaturas no Rodapé: situadas exatamente entre 800px e 842px, acima do rodapé timbrado (855px+) */
      .signatures-footer {
        position: absolute;
        top: 800px;
        left: 50px;
        right: 50px;
        width: 694px;
        height: 42px;
        display: flex;
        justify-content: space-between;
        gap: 60px;
        z-index: 20;
      }
      .sig-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .sig-line {
        width: 100%;
        border-top: 1px solid #475569;
      }
      .sig-label {
        font-size: 8.5px;
        color: #475569;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    `;

    // Bloco padrão de assinaturas
    const signaturesHtml = `
      <div class="signatures-footer">
        <div class="sig-col">
          <div class="sig-line"></div>
          <span class="sig-label">Assinatura do Recebedor</span>
        </div>
        <div class="sig-col">
          <div class="sig-line"></div>
          <span class="sig-label">Assinatura do Responsável</span>
        </div>
      </div>
    `;

    // 4. Construir Galeria de Layouts (2 - PRIMEIRO OS LAYOUTS)
    let layoutsSectionHtml = "";
    let layoutsEstimatedH = 0;

    if (layoutDataUrls.length > 0) {
      const count = layoutDataUrls.length;
      let gridClass = "layouts-grid-1";
      let cardClass = "size-single";

      if (count === 1) {
        gridClass = "layouts-grid-1";
        cardClass = "size-single";
        layoutsEstimatedH = 145 + 24 + 10;
      } else if (count === 2) {
        gridClass = "layouts-grid-2";
        cardClass = "size-double";
        layoutsEstimatedH = 120 + 24 + 10;
      } else if (count === 3) {
        gridClass = "layouts-grid-3";
        cardClass = "size-multi";
        layoutsEstimatedH = 100 + 24 + 10;
      } else {
        gridClass = "layouts-grid-4";
        cardClass = "size-multi";
        layoutsEstimatedH = 200 + 24 + 10;
      }

      const cardsHtml = layoutDataUrls
        .slice(0, 4)
        .map(
          (src, i) => `
          <div class="layout-card ${cardClass}">
            <img src="${src}" />
            <span class="layout-badge ${i === 0 ? "primary" : ""}">#${i + 1}</span>
          </div>
        `
        )
        .join("");

      layoutsSectionHtml = `
        <div class="layouts-section">
          <div class="section-heading"><span class="heading-bar"></span>LAYOUTS / ANEXOS (${count})</div>
          <div class="layouts-grid ${gridClass}">
            ${cardsHtml}
          </div>
        </div>
      `;
    }

    // 5. Decomposição de blocos de texto respeitando formatações e quebras do editor
    const splitNoteContentIntoBlocks = (html: string): string[] => {
      if (typeof document === "undefined") return [html];

      const temp = document.createElement("div");
      temp.innerHTML = html;

      const blocks: string[] = [];

      const addBlock = (itemHtml: string) => {
        const trimmed = itemHtml.trim();
        if (!trimmed) {
          blocks.push(`<div style="height: 6px;"></div>`);
          return;
        }
        blocks.push(`<div class="content-item">${trimmed}</div>`);
      };

      const processNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const txt = (node.textContent || "").trim();
          if (txt) {
            addBlock(txt);
          }
          return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (tag === "br") {
          addBlock("");
          return;
        }

        if (tag === "ul" || tag === "ol") {
          const lis = Array.from(el.querySelectorAll(":scope > li"));
          if (lis.length > 0) {
            lis.forEach((li) => {
              blocks.push(
                `<${tag} style="margin: 2px 0; padding-left: 20px;"><li style="margin-bottom: 2px; line-height: 1.6;">${li.innerHTML}</li></${tag}>`
              );
            });
            return;
          }
        }

        if (tag === "table") {
          blocks.push(el.outerHTML);
          return;
        }

        if (el.innerHTML.includes("<br")) {
          const parts = el.innerHTML.split(/<br\s*\/?>/gi);
          parts.forEach((part) => {
            addBlock(part);
          });
          return;
        }

        addBlock(el.outerHTML || el.innerHTML);
      };

      Array.from(temp.childNodes).forEach(processNode);
      return blocks.length > 0 ? blocks : [html];
    };

    const textBlocks = splitNoteContentIntoBlocks(cleanContentHtml);

    // Criar um iframe isolado com folhas de estilo próprias (SEM Tailwind e SEM oklab)
    iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "-9999px";
    iframe.style.width = "794px";
    iframe.style.height = "1123px";
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    const iframeWin = iframe.contentWindow;
    if (!iframeDoc || !iframeWin) {
      throw new Error("Não foi possível inicializar o motor de renderização da Nota.");
    }

    // Interceptar getComputedStyle no iframe para neutralizar qualquer valor de cor com oklab/oklch
    try {
      const origGetComputedStyle = iframeWin.getComputedStyle;
      (iframeWin as any).getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
        const style = origGetComputedStyle.call(iframeWin, elt, pseudoElt);
        return new Proxy(style, {
          get(target: any, prop: string | symbol, receiver: any) {
            const val = Reflect.get(target, prop, receiver);
            if (typeof val === "string") {
              if (
                val.includes("oklab") ||
                val.includes("oklch") ||
                val.includes("color-mix") ||
                val.includes("color(")
              ) {
                return convertCssColorToHexOrRgb(val);
              }
            }
            if (typeof val === "function" && prop === "getPropertyValue") {
              return (propertyName: string) => {
                const res = target.getPropertyValue(propertyName);
                if (
                  typeof res === "string" &&
                  (res.includes("oklab") ||
                    res.includes("oklch") ||
                    res.includes("color-mix") ||
                    res.includes("color("))
                ) {
                  return convertCssColorToHexOrRgb(res);
                }
                return res;
              };
            }
            return val;
          },
        });
      };
    } catch (e) {
      console.warn("Aviso ao proteger getComputedStyle:", e);
    }

    // Medição e paginação precisa diretamente dentro do ambiente isolado do iframe
    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${baseCss}</style>
  </head>
  <body>
    <div class="text-content-box" id="measure-box" style="width: 694px; visibility: hidden; position: absolute; top: 0; left: 0;"></div>
  </body>
</html>`);
    iframeDoc.close();

    const measureBox = iframeDoc.getElementById("measure-box") as HTMLElement;

    // Alturas disponíveis:
    // Altura útil total: 734px
    // Página 1: Cabeçalho (~64px) + Separador + Layouts (se houver) + Título do texto (~24px) + margem de segurança (16px)
    const MAX_PAGE1_TEXT_H = Math.max(734 - 64 - layoutsEstimatedH - 24 - 16, 100);
    // Páginas de continuação: Cabeçalho continuação (~38px) + Título do texto (~24px) + margem de segurança (16px)
    const MAX_CONT_TEXT_H = 734 - 38 - 24 - 16;

    const contentPages: string[][] = [[]];
    let currentPageIdx = 0;
    let currentAccumulatedH = 0;
    let currentLimit = MAX_PAGE1_TEXT_H;

    for (const block of textBlocks) {
      measureBox.innerHTML = block;
      const bH = Math.max(measureBox.offsetHeight, 16);

      if (currentAccumulatedH + bH > currentLimit && contentPages[currentPageIdx].length > 0) {
        currentPageIdx++;
        contentPages.push([]);
        currentAccumulatedH = 0;
        currentLimit = MAX_CONT_TEXT_H;
      }

      contentPages[currentPageIdx].push(block);
      currentAccumulatedH += bH;
    }

    const totalPages = contentPages.length;

    // Inicializar jsPDF
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfW = 210;
    const pdfH = 297;

    // RENDERIZAR CADA PÁGINA ISOLADAMENTE NO IFRAME (evita sobreposição, scroll bleed e múltiplos cabeçalhos)
    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      const pageBlocks = contentPages[pIdx];
      const pageNum = pIdx + 1;
      const isFirstPage = pIdx === 0;

      let pageHeaderHtml = "";
      if (isFirstPage) {
        pageHeaderHtml = `
          <div class="header-section">
            <div class="header-top-row">
              <h1 class="note-h1">NOTA: ${noteTitle}</h1>
              ${totalPages > 1 ? `<span class="page-counter-pill">PÁGINA 1 DE ${totalPages}</span>` : ""}
            </div>
            <div class="meta-bar">
              <div class="meta-items">
                <span>Criado em: <strong>${dateStr}</strong></span>
                ${deliveryStr ? `<span>Prazo: <strong>${deliveryStr}</strong></span>` : ""}
                ${note.responsible_name ? `<span>Resp: <strong>${note.responsible_name}</strong></span>` : ""}
                ${note.category ? `<span>Cat: <strong>${note.category}</strong></span>` : ""}
              </div>
              ${note.status ? `<div class="meta-status">STATUS: ${note.status.toUpperCase()}</div>` : ""}
            </div>
          </div>
        `;
      } else {
        pageHeaderHtml = `
          <div class="continuation-header">
            <div class="continuation-title">
              <span>NOTA: ${noteTitle}</span>
              <span class="continuation-tag">(Continuação)</span>
            </div>
            <span class="page-counter-pill">PÁGINA ${pageNum} DE ${totalPages}</span>
          </div>
        `;
      }

      // 2 - PRIMEIRO OS LAYOUTS (apenas na página 1, logo abaixo do cabeçalho)
      const pageLayoutsHtml = isFirstPage ? layoutsSectionHtml : "";

      // 3 - DEPOIS OS TEXTOS
      const textHeading = isFirstPage
        ? `<div class="section-heading"><span class="heading-bar"></span>DESCRIÇÃO DOS SERVIÇOS / DETALHAMENTO</div>`
        : `<div class="section-heading"><span class="heading-bar"></span>DESCRIÇÃO DOS SERVIÇOS (CONTINUAÇÃO)</div>`;

      const singlePageHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      ${baseCss}
    </style>
  </head>
  <body style="margin: 0; padding: 0; background: #ffffff; width: 794px; height: 1123px; overflow: hidden;">
    <div class="page-wrapper" id="pdf-single-page">
      <img class="timbrado-background" src="${timbradoDataUrl}" />
      <div class="page-content">
        ${pageHeaderHtml}
        ${pageLayoutsHtml}
        ${textHeading}
        <div class="text-content-box">
          ${pageBlocks.join("")}
        </div>
      </div>
      ${signaturesHtml}
    </div>
  </body>
</html>`;

      iframeDoc.open();
      iframeDoc.write(singlePageHtml);
      iframeDoc.close();

      // Aguardar renderização e carregamento de imagens desta página específica
      const pageImages = Array.from(iframeDoc.querySelectorAll("img"));
      if (pageImages.length > 0) {
        await Promise.all(
          pageImages.map((img) => {
            if (img.complete) return Promise.resolve(null);
            return new Promise((resolve) => {
              img.onload = () => resolve(null);
              img.onerror = () => resolve(null);
            });
          })
        );
      }
      await new Promise((res) => setTimeout(res, 80));

      const pageEl = iframeDoc.getElementById("pdf-single-page") || iframeDoc.body;
      const canvas = await (html2canvas as any)(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        window: iframeWin,
        document: iframeDoc,
        onclone: (clonedDoc: Document) => {
          // Remover quaisquer tags de estilo com oklab e neutralizar propriedades de cor
          const styles = Array.from(clonedDoc.querySelectorAll("style, link[rel='stylesheet']"));
          styles.forEach((s) => {
            if (s.textContent && (s.textContent.includes("oklab") || s.textContent.includes("oklch") || s.textContent.includes("color-mix"))) {
              s.textContent = s.textContent.replace(/(?:oklab|oklch|color-mix|color)\([^)]+\)/gi, "#1e293b");
            }
          });
          const allEls = Array.from(clonedDoc.querySelectorAll("*"));
          allEls.forEach((el: any) => {
            if (el.getAttribute) {
              const st = el.getAttribute("style");
              if (st && (st.includes("oklab") || st.includes("oklch") || st.includes("color-mix") || st.includes("color("))) {
                el.setAttribute("style", st.replace(/(?:oklab|oklch|color-mix|color)\([^)]+\)/gi, "#1e293b"));
              }
            }
          });

          // Garantir centralização matemática exata de todos os marcadores e destaques no documento clonado
          const allMarks = Array.from(
            clonedDoc.querySelectorAll("mark, [style*='background-color'], [style*='background'], [data-highlight]")
          );
          allMarks.forEach((node: any) => {
            const el = node as HTMLElement;
            if (
              el.tagName === "BODY" ||
              el.classList.contains("page-wrapper") ||
              el.classList.contains("page-content") ||
              el.classList.contains("header-section") ||
              el.classList.contains("continuation-header") ||
              el.classList.contains("signatures-footer") ||
              el.classList.contains("layouts-section") ||
              el.classList.contains("layouts-grid")
            ) {
              return;
            }

            const txt = (el.textContent || "").replace(/[\s\u00A0\u200B]+/g, "").trim();
            if (!txt && !el.querySelector("img, svg")) {
              el.remove();
              return;
            }

            el.style.display = "inline-block";
            el.style.verticalAlign = "middle";
            el.style.textAlign = "center";
            el.style.lineHeight = "1.25";
            el.style.padding = "2.5px 7px 2.5px 7px";
            el.style.margin = "1px 2px";
            el.style.borderRadius = "4px";
            el.style.boxSizing = "border-box";
          });
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      if (pIdx > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH, undefined, "FAST");
    }

    // Download do arquivo PDF
    const cleanFileName = sanitizeFilename(note.title || "NOTA");
    pdf.save(`NOTA ${cleanFileName}.pdf`);
  } catch (err: any) {
    console.warn("Tentando fallback via pdf-lib para Nota devido ao erro:", err);
    try {
      // Fallback seguro 100% livre de DOM/Canvas com pdf-lib
      await generateNotePdfViaPdfLib(note, settings);
    } catch (fallbackErr: any) {
      console.error("Erro gerando PDF da Nota", fallbackErr);
      alert("Erro ao gerar PDF: " + (fallbackErr?.message || err?.message || "Verifique o timbrado nas configurações."));
    }
  } finally {
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

