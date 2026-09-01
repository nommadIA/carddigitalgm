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

async function convertImageUrlToDataUrl(url: string, bucketHint?: string): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  try {
    const { bytes, contentType } = await resolveTimbradoBytesWithFallback(url);
    if (bytes && bytes.length > 0) {
      return bytesToDataUrl(bytes, contentType);
    }
  } catch (e) {
    console.warn("Falha convertImageUrlToDataUrl:", url, e);
  }
  return url;
}

export async function generateNotePdf(note: NotePdfItem, settings: AppSettings) {
  let iframe: HTMLIFrameElement | null = null;
  try {
    const timbradoUrl = settings?.timbrado_url || "";
    if (!timbradoUrl) {
      throw new Error(
        "Nenhum timbrado configurado. Vá em Configurações e envie o timbrado A4 (PNG/JPG)."
      );
    }

    // 1. Converter timbrado para DataURL Base64 para garantir carregamento instantâneo sem CORS
    const timbradoDataUrl = await convertImageUrlToDataUrl(timbradoUrl, "timbrados");

    // 2. Extrair mídias e layouts da nota na mesma ordem
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

    if (typeof document !== "undefined") {
      try {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = note.content || "";
        const imgElements = tempDiv.getElementsByTagName("img");
        for (let i = 0; i < imgElements.length; i++) {
          const src = imgElements[i].getAttribute("src");
          if (src && !layoutUrls.includes(src)) {
            layoutUrls.push(src);
          }
        }
      } catch (e) {}
    }

    // Converter cada imagem de layout para DataURL Base64 na ordem original
    const layoutDataUrls: string[] = [];
    for (const url of layoutUrls) {
      const dUrl = await convertImageUrlToDataUrl(url, "note_assets");
      if (dUrl) layoutDataUrls.push(dUrl);
    }

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

    const cleanContentHtml = note.content && note.content.trim() ? note.content : "<p>Nenhuma descrição informada.</p>";

    // Estrutura CSS pura (HEX e RGB, 100% segura contra erros de oklab)
    const baseCss = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body, .page-wrapper {
        background: #ffffff;
        color: #1e293b;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      .timbrado-background {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: fill;
        z-index: 1;
        pointer-events: none;
      }
      .page-content {
        position: absolute;
        top: 56px;
        left: 50px;
        right: 50px;
        bottom: 0px;
        z-index: 10;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
      }
      .header-section {
        border-bottom: 1px solid #cbd5e1;
        padding-bottom: 8px;
        margin-bottom: 10px;
      }
      .note-h1 {
        font-size: 15px;
        font-weight: 800;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        line-height: 1.3;
      }
      .meta-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10.5px;
        color: #475569;
        font-weight: 600;
        margin-top: 4px;
      }
      .meta-items {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .meta-status {
        color: #ea580c;
        font-weight: 800;
        text-transform: uppercase;
        font-size: 11px;
      }
      .section-heading {
        font-size: 11px;
        font-weight: 800;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }
      .text-content-box {
        font-size: 11px;
        line-height: 1.5;
        color: #1e293b;
        word-break: break-word;
        margin-bottom: 10px;
      }
      .text-content-box p { margin-bottom: 4px; }
      .text-content-box ul, .text-content-box ol { padding-left: 18px; margin-bottom: 4px; }
      .text-content-box li { margin-bottom: 2px; }
      .text-content-box strong, .text-content-box b { font-weight: 700; color: #0f172a; }
      .text-content-box em, .text-content-box i { font-style: italic; }
      .text-content-box u { text-decoration: underline; }
      .text-content-box s { text-decoration: line-through; }
      .text-content-box mark { background-color: #fef08a; padding: 1px 3px; border-radius: 2px; }
      
      /* Grid de Mídias lado a lado na mesma ordem */
      .media-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        width: 100%;
        margin-top: 4px;
        margin-bottom: 10px;
      }
      .media-card {
        position: relative;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #f8fafc;
        height: 145px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .media-card img {
        max-width: 95%;
        max-height: 95%;
        object-fit: contain;
      }
      .media-badge {
        position: absolute;
        top: 6px;
        right: 6px;
        background: #1e293b;
        color: #ffffff;
        font-size: 9.5px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 4px;
        z-index: 5;
      }
      .media-badge.first {
        background: #ff6900;
      }

      /* Linha de Assinaturas exatamente acima do Rodapé / QR Code */
      .signatures-footer {
        position: absolute;
        bottom: 270px;
        left: 50px;
        right: 50px;
        display: flex;
        justify-content: space-between;
        gap: 36px;
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
        font-size: 9.5px;
        color: #475569;
        font-weight: 600;
      }
    `;

    // Montar as mídias em cards de 2 colunas lado a lado
    const mediaCardsHtml = layoutDataUrls
      .map(
        (src, idx) => `
        <div class="media-card">
          <img src="${src}" />
          <div class="media-badge ${idx === 0 ? "first" : ""}">${idx + 1}</div>
        </div>
      `
      )
      .join("");

    // Montar cabeçalho completo
    const headerHtml = `
      <div class="header-section">
        <h1 class="note-h1">NOTA: ${noteTitle}</h1>
        <div class="meta-bar">
          <div class="meta-items">
            <span>Criado em: <strong>${dateStr}</strong></span>
            ${deliveryStr ? `<span>Prazo: <strong>${deliveryStr}</strong></span>` : ""}
            ${note.responsible_name ? `<span>Responsável: <strong>${note.responsible_name}</strong></span>` : ""}
            ${note.category ? `<span>Categoria: <strong>${note.category}</strong></span>` : ""}
          </div>
          ${note.status ? `<div class="meta-status">STATUS: ${note.status.toUpperCase()}</div>` : ""}
        </div>
      </div>
    `;

    // Montar bloco de assinaturas
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

    // Medição em elemento invisível temporário
    const measureDiv = document.createElement("div");
    measureDiv.style.position = "fixed";
    measureDiv.style.left = "-9999px";
    measureDiv.style.top = "-9999px";
    measureDiv.style.width = "694px";
    measureDiv.style.visibility = "hidden";
    measureDiv.innerHTML = `
      <style>${baseCss}</style>
      ${headerHtml}
      <div class="section-heading">DESCRIÇÃO DOS SERVIÇOS / DETALHAMENTO</div>
      <div class="text-content-box">${cleanContentHtml}</div>
      ${layoutDataUrls.length > 0 ? `<div class="section-heading" style="margin-top: 8px;">MÍDIAS E LAYOUTS</div><div class="media-grid">${mediaCardsHtml}</div>` : ""}
    `;
    document.body.appendChild(measureDiv);
    const measureHeight = measureDiv.offsetHeight;
    document.body.removeChild(measureDiv);

    const MAX_PAGE_CONTENT_H = 475; // Altura máxima permitida para o conteúdo antes da linha de assinatura
    const pageHtmlSnippets: string[] = [];

    if (measureHeight <= MAX_PAGE_CONTENT_H) {
      // Coube em 1 única página
      pageHtmlSnippets.push(`
        <img class="timbrado-background" src="${timbradoDataUrl}" />
        <div class="page-content">
          ${headerHtml}
          <div class="section-heading">DESCRIÇÃO DOS SERVIÇOS / DETALHAMENTO</div>
          <div class="text-content-box">${cleanContentHtml}</div>
          ${
            layoutDataUrls.length > 0
              ? `<div class="section-heading" style="margin-top: 8px;">MÍDIAS E LAYOUTS</div><div class="media-grid">${mediaCardsHtml}</div>`
              : ""
          }
        </div>
        ${signaturesHtml}
      `);
    } else {
      // Divide em páginas
      // Página 1: Cabeçalho + Texto formatado
      pageHtmlSnippets.push(`
        <img class="timbrado-background" src="${timbradoDataUrl}" />
        <div class="page-content">
          ${headerHtml}
          <div class="section-heading">DESCRIÇÃO DOS SERVIÇOS / DETALHAMENTO</div>
          <div class="text-content-box">${cleanContentHtml}</div>
        </div>
        ${signaturesHtml}
      `);

      // Páginas subsequentes: Mídias em pares lado a lado (até 4 por página)
      if (layoutDataUrls.length > 0) {
        const chunkSize = 4;
        for (let i = 0; i < layoutDataUrls.length; i += chunkSize) {
          const chunkUrls = layoutDataUrls.slice(i, i + chunkSize);
          const chunkCardsHtml = chunkUrls
            .map(
              (src, idx) => `
              <div class="media-card" style="height: 180px;">
                <img src="${src}" />
                <div class="media-badge ${i + idx === 0 ? "first" : ""}">${i + idx + 1}</div>
              </div>
            `
            )
            .join("");

          pageHtmlSnippets.push(`
            <img class="timbrado-background" src="${timbradoDataUrl}" />
            <div class="page-content">
              <div class="section-heading" style="margin-top: 6px;">MÍDIAS E LAYOUTS (CONTINUAÇÃO)</div>
              <div class="media-grid">${chunkCardsHtml}</div>
            </div>
            ${signaturesHtml}
          `);
        }
      }
    }

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

    const fullIframeHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      ${baseCss}
    </style>
  </head>
  <body style="margin: 0; padding: 0; background: #ffffff;">
    <div id="pages-root">
      ${pageHtmlSnippets
        .map(
          (snippet, idx) => `
        <div class="page-wrapper" id="pdf-page-${idx}" style="position: relative; width: 794px; height: 1123px; background: #ffffff; overflow: hidden; margin-bottom: 20px;">
          ${snippet}
        </div>
      `
        )
        .join("")}
    </div>
  </body>
</html>`;

    iframeDoc.open();
    iframeDoc.write(fullIframeHtml);
    iframeDoc.close();

    // Aguardar imagens e renderização no iframe
    await new Promise((res) => setTimeout(res, 120));

    // Garantir que todas as imagens no iframe foram carregadas
    const allImages = Array.from(iframeDoc.querySelectorAll("img"));
    if (allImages.length > 0) {
      await Promise.all(
        allImages.map((img) => {
          if (img.complete) return Promise.resolve(null);
          return new Promise((resolve) => {
            img.onload = () => resolve(null);
            img.onerror = () => resolve(null);
          });
        })
      );
    }

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfW = 210;
    const pdfH = 297;

    const pageElements = Array.from(iframeDoc.querySelectorAll(".page-wrapper")) as HTMLElement[];
    for (let pIdx = 0; pIdx < pageElements.length; pIdx++) {
      const pageEl = pageElements[pIdx];
      const canvas = await (html2canvas as any)(pageEl, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        window: iframeWin,
        document: iframeDoc,
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
    console.error("Erro gerando PDF da Nota", err);
    alert("Erro ao gerar PDF: " + (err?.message || "Verifique o timbrado nas configurações."));
  } finally {
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

