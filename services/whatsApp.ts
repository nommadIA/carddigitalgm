import type { AppSettings } from "../lib/settings";
import { buildPixPayload } from "../lib/pix";
import type { OrcItem } from "../services/pdfService"; 

export function buildWhatsappMessage(params: {
  clienteNome: string;
  orcamentoId: string;
  total: number;
  subtotal?: number;
  discount?: number;
  payment_method?: string;
  payment_link?: string;
  installments?: number;
  interest_rate?: number;
  settings: AppSettings;
  items?: OrcItem[]; 
  publicLink?: string;
  delivery_days?: number;
  validity_days?: number;
}) {
  const { 
    clienteNome, orcamentoId, total, subtotal, discount,
    payment_method, payment_link, installments, interest_rate,
    settings, items, publicLink, delivery_days, validity_days 
  } = params;

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

  if (Number(subtotal) > 0 && Number(discount) > 0) {
    lines.push(`Subtotal: R$ ${Number(subtotal).toFixed(2)}`);
    lines.push(`Desconto: -R$ ${Number(discount).toFixed(2)}`);
  }
  lines.push(`*💰 TOTAL GERAL: R$ ${total.toFixed(2)}*`);

  if (delivery_days) {
    lines.push(`🚚 Prazo de Entrega: ${delivery_days} dias úteis`);
  }
  if (validity_days) {
    lines.push(`⏳ Validade do Orçamento: ${validity_days} dias`);
  }

  if (publicLink) lines.push(`🔗 Link do Sistema: ${publicLink}`);

  lines.push("");
  lines.push("--------------------------------");

  if (payment_method === 'CREDIT') {
    lines.push("*💳 Pagamento via Cartão de Crédito*");
    if (installments && installments > 0) {
      const instValue = total / installments;
      lines.push(`Parcelamento: ${installments}x de R$ ${instValue.toFixed(2)}`);
      lines.push(`Total a prazo: R$ ${total.toFixed(2)}`);
    }
    lines.push("");
    if (payment_link) {
      lines.push(`🔗 *Link para pagamento:*`);
      lines.push(payment_link);
    } else {
      lines.push("_Link de pagamento não informado no sistema._");
    }
  } else {
    // PIX DEFAULT
    lines.push("*💳 Pagamento via Pix*");
    if (settings.pix_key) {
      lines.push(`Chave PIX: ${settings.pix_key}`);

      const payload = buildPixPayload({
        pixKey: settings.pix_key,
        merchantName: (settings.company_name || "CardDigital GM").toUpperCase().slice(0, 25),
        merchantCity: "SAO LUIS",
        amount: total,
        txid: orcamentoId.slice(0, 25).replace(/[^a-zA-Z0-9]/g, ''),
        message: "Pagamento Orcamento",
      });

      lines.push("");
      lines.push("👇 *Pix Copia e Cola:*");
      lines.push(payload);
    } else {
      lines.push("_Chave PIX não informada no sistema._");
    }
  }

  return lines.join("\n");
}

export function openWhatsapp(numberE164: string, message: string) {
  const cleanNumber = numberE164.replace(/\D/g, '');
  const event = new CustomEvent('open-whatsapp-picker', {
    detail: { phone: cleanNumber, text: message }
  });
  window.dispatchEvent(event);
}