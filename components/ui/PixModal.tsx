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

  if (!open || !settings) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/75 flex items-center justify-center p-4 animate-fade-in">
      <div className="fora rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-white/10">
        <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-3">
          <h3 className="text-white font-extrabold text-2xl sm:text-3xl tracking-tight">Pagamento Pix</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {!settings.pix_key ? (
          <div className="text-center py-6">
            <p className="text-slate-100 font-bold text-lg mb-2">Chave Pix não configurada.</p>
            <p className="text-base text-slate-300">Vá em Configurações para adicionar sua chave.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl shadow-inner">
              {qr ? (
                <img
                  src={qr}
                  alt="QR Pix"
                  className="w-full h-auto max-w-[220px]"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-600 font-bold">
                    Gerando QR...
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
               <p className="text-slate-300 text-sm font-extrabold uppercase tracking-wide">Valor a Pagar</p>
               <p className="text-3xl font-black text-white mt-0.5">R$ {total.toFixed(2)}</p>
            </div>

            <button
              type="button"
              className={`w-full mt-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${copied ? 'bg-green-600 text-white' : 'btn-primary'}`}
              onClick={async () => {
                if (!payload) return;
                const ok = await copyText(payload);
                if(ok) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                } else {
                    alert("Erro ao copiar. Tente manualmente abaixo.");
                }
              }}
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
              {copied ? "Copiado!" : "Copiar 'Copia e Cola'"}
            </button>

            <div className="mt-4">
               <p className="text-xs text-slate-500 mb-1 text-center">Código do Pagamento:</p>
               <div className="text-[10px] text-slate-400 break-all bg-black/30 border border-white/5 rounded-lg p-2 font-mono leading-tight">
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