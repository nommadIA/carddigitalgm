import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { buildPixPayload } from "../../lib/pix";
import { copyText } from "../../lib/clipboard";
import type { AppSettings } from "../../lib/settings";
import { X, Check, Copy } from "lucide-react";

export default function PixModal({
  open,
  onClose,
  total,
  orcamentoId,
  settings,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  orcamentoId: string;
  settings: AppSettings | null;
}) {
  const [qr, setQr] = useState<string>("");
  const [payload, setPayload] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !settings) return;

    if (!settings.pix_key) {
      setQr("");
      setPayload("");
      return;
    }

    try {
        const pl = buildPixPayload({
        pixKey: settings.pix_key,
        merchantName: settings.company_name || "GM PRO",
        merchantCity: "SAO LUIS",
        amount: total,
        txid: orcamentoId.slice(0, 25).replace(/[^a-zA-Z0-9]/g, ''),
        message: "Pagamento de orcamento",
        });

        setPayload(pl);
        QRCode.toDataURL(pl, { margin: 2, scale: 10 }).then(setQr);
    } catch (e) {
        console.error("Erro ao gerar Pix", e);
    }
  }, [open, total, orcamentoId, settings]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !settings) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="gm-modal bg-[#131315] rounded-lg w-full max-w-sm p-6 shadow-2xl border border-[#26262A]"
      >
        <div className="flex items-center justify-between mb-5 border-b border-[#26262A] pb-3.5">
          <h3 className="text-[#F2F2F3] font-bold text-xl tracking-tight">Pagamento Pix</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] hover:border-[#3F3F46] text-[#8B8B92] hover:text-[#F2F2F3] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {!settings.pix_key ? (
          <div className="text-center py-6">
            <p className="text-[#F2F2F3] font-bold text-base mb-1.5">Chave Pix não configurada.</p>
            <p className="text-[13px] text-[#8B8B92]">Vá em Configurações para adicionar sua chave.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center bg-white p-4 rounded-md border border-[#26262A]">
              {qr ? (
                <img
                  src={qr}
                  alt="QR Pix"
                  className="w-full h-auto max-w-[210px]"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-600 font-bold text-sm">
                  Gerando QR...
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              <p className="text-[#8B8B92] text-xs font-bold uppercase tracking-wider">Valor a Pagar</p>
              <p className="text-3xl font-black text-white mt-0.5 tabular-nums">R$ {total.toFixed(2)}</p>
            </div>

            <button
              type="button"
              className={`w-full h-11 mt-5 rounded-[6px] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                copied
                  ? "bg-emerald-600 text-white border border-emerald-500"
                  : "bg-[var(--gm-primary,#F65A1A)] hover:brightness-110 text-[#0B0B0C] border border-[var(--gm-primary,#F65A1A)]"
              }`}
              onClick={async () => {
                if (!payload) return;
                const ok = await copyText(payload);
                if (ok) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } else {
                  alert("Erro ao copiar. Tente manualmente abaixo.");
                }
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? "Copiado!" : "Copiar 'Copia e Cola'"}</span>
            </button>

            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8B8B92] mb-1.5 text-center">Código do Pagamento</p>
              <div className="text-[11px] text-[#8B8B92] break-all bg-[#0B0B0C] border border-[#26262A] rounded-[4px] p-2.5 font-mono leading-snug">
                {payload}
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}