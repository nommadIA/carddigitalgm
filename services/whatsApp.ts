import type { AppSettings } from "../lib/settings";
import { buildPixPayload } from "../lib/pix";
import type { OrcItem } from "../services/pdfService"; 

export function buildWhatsappMessage(params: {
  clienteNome: string;
  orcamentoId: string;
  total: number;
  settings: AppSettings;
  items?: OrcItem[]; 
  publicLink?: string;
  delivery_days?: number;
  validity_days?: number;
}) {
  const { clienteNome, orcamentoId, total, settings, items, publicLink, delivery_days, validity_days } = params;

  const lines: string[] = [];
  lines.push(`Olá, ${clienteNome}! 👋`);
  lines.push(`Segue os detalhes do seu orçamento *#${orcamentoId.slice(0,8)}*:`);
  lines.push("");

  // LISTA DE ITENS
  if (items && items.length > 0) {
      lines.push("*📋 Descrição dos Serviços:*");
      items.forEach(it => {
          if (it.isPrint && it.width && it.height) {
              const area = ((it.width * it.height) / 10000).toFixed(2);
              lines.push(`▪️ ${it.titulo} (${it.width}x${it.height}cm - ${area}m²) - x${it.qtd}`);
          } else {
              lines.push(`▪️ ${it.titulo} - x${it.qtd}`);
          }
      });
      lines.push("");
  }

  lines.push(`*💰 TOTAL GERAL: R$ ${total.toFixed(2)}*`);

  if (delivery_days) {
    lines.push(`🚚 Prazo de Entrega: ${delivery_days} dias úteis`);
  }
  if (validity_days) {
    lines.push(`⏳ Validade do Orçamento: ${validity_days} dias`);
  }

  if (publicLink) lines.push(`🔗 Link: ${publicLink}`);

  if (settings.pix_key) {
    lines.push("");
    lines.push("--------------------------------");
    lines.push("*💳 Pagamento via Pix*");
    lines.push(`Chave: ${settings.pix_key}`);

    const payload = buildPixPayload({
      pixKey: settings.pix_key,
      merchantName: (settings.company_name || "CardDigital GM").toUpperCase().slice(0, 25),
      merchantCity: "SAO LUIS",
      amount: total,
      txid: orcamentoId.slice(0, 25).replace(/[^a-zA-Z0-9]/g, ''),
      message: "Pagamento Orcamento",
    });

    lines.push("");
    lines.push("👇 *Copia e Cola:*");
    lines.push(payload);
  }

  return lines.join("\n");
}

export function openWhatsapp(numberE164: string, message: string) {
  const cleanNumber = numberE164.replace(/\D/g, '');
  const text = encodeURIComponent(message);
  window.open(`https://wa.me/${cleanNumber}?text=${text}`, "_blank");
}