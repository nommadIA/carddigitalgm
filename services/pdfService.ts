import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

/* ✅ OTIMIZADO: Extrai o path relativo do Storage */
function tryExtractSupabaseStoragePath(url: string, bucket: string): string | null {
  if (!url) return null;
  // Exemplo: https://.../storage/v1/object/public/timbrados/tenant_id/file.png
  const parts = url.split(`/public/${bucket}/`);
  if (parts.length > 1) return parts[1];
  
  const signParts = url.split(`/authenticated/${bucket}/`);
  if (signParts.length > 1) return signParts[1];
  
  return null;
}

/* ✅ OTIMIZADO: Retorna os bytes diretamente para evitar múltiplos fetches */
async function resolveTimbradoBytesWithFallback(originalUrl: string) {
  // 1) tenta direto
  try {
    return await fetchBytesStrict(originalUrl);
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (!msg.toLowerCase().includes("html")) throw e;

    // 2) tenta assinar via Supabase (bucket "timbrados")
    const path = tryExtractSupabaseStoragePath(originalUrl, "timbrados");
    if (!path) {
      throw new Error(
        "Timbrado inacessível. Reenvie o timbrado nas Configurações (PNG/JPG) para gerar um link válido."
      );
    }

    const { data, error } = await supabase.storage.from("timbrados").createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) {
      throw new Error("Não foi possível assinar o timbrado. Verifique permissões do Storage.");
    }

    return await fetchBytesStrict(data.signedUrl);
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
    cursorY -= 18;

    // --- DESCRIÇÃO ---
    checkSpace(25);
    drawLeft("DESCRIÇÃO DOS SERVIÇOS", 10, cursorY, true);
    cursorY -= 8;
    hr(cursorY);
    cursorY -= 12;

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
      
      const blockH = (lines.length * 12) + 14;

      checkSpace(blockH + 10);

      let yText = cursorY;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isFirstLine = i === 0;
        drawLeft(line, isFirstLine ? 10 : 9, yText, isFirstLine, cText);
        yText -= isFirstLine ? 12 : 11;
      }

      yText -= 1;
      drawLeft(detailsLine, 8, yText, false, cGray);

      drawRight(CURRENCY_FORMATTER.format(totalItem), 10.5, cursorY, true, cText);

      cursorY -= blockH;
      hr(cursorY + 5);
      cursorY -= 8;
    }

    // --- TOTAIS COMPACTOS ---
    checkSpace(50);
    const subtotal = Number(orc.subtotal ?? orc.total ?? 0) || 0;
    const discount = Number(orc.discount ?? 0) || 0;
    const total = Number(orc.total ?? (subtotal - discount)) || 0;

    drawRight(`Subtotal: ${CURRENCY_FORMATTER.format(subtotal)}`, 9.5, cursorY, false, cGray);
    cursorY -= 12;
    if (discount > 0) {
      drawRight(`Desconto: -${CURRENCY_FORMATTER.format(discount)}`, 9.5, cursorY, false, cRed);
      cursorY -= 12;
    }
    drawRight(`Total: ${CURRENCY_FORMATTER.format(total)}`, 11.5, cursorY, true, cText);
    cursorY -= 15;

    // --- PIX QR COMPACTO ---
    if (settings?.pix_key) {
      checkSpace(110); // Reduzido de 140 para 110
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

        const qrSize = 85; // QR um pouco menor para caber melhor
        const qrY = cursorY - 95;
        page.drawImage(qrPng, {
          x: CONTENT_X,
          y: qrY,
          width: qrSize,
          height: qrSize,
        });

        drawLeft("PAGAMENTO VIA PIX", 9.5, cursorY - 6, true, cText);
        
        const textX = CONTENT_X + qrSize + 12;
        page.drawText("Chave:", { x: textX, y: cursorY - 20, size: 8.5, font: fontRegular, color: cGray });
        page.drawText(String(settings.pix_key), { x: textX, y: cursorY - 32, size: 8.5, font: fontBold, color: cText });
        page.drawText("Copia e Cola:", { x: textX, y: cursorY - 46, size: 8.5, font: fontRegular, color: cGray });

        const clipLines = wrapText(payload, CONTENT_W - (qrSize + 12), fontRegular, 7.5);
        let yClip = cursorY - 58;
        for (const l of clipLines.slice(0, 5)) {
          page.drawText(l, { x: textX, y: yClip, size: 7.5, font: fontRegular, color: cGray });
          yClip -= 9;
        }

        cursorY -= 105;
      } catch (e) {
        console.error("Erro QR PDF", e);
      }
    }

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