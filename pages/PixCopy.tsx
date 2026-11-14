import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';

export default function PixCopy() {
  const [searchParams] = useSearchParams();
  const payload = searchParams.get('payload');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (payload) {
      navigator.clipboard.writeText(payload).then(() => {
        setCopied(true);
      }).catch(() => {
        // Fallback or ignore
      });
    }
  }, [payload]);

  const handleCopy = () => {
    if (payload) {
      navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!payload) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center p-4 text-[#F2F2F3] relative overflow-hidden">
        <div className="bg-[#131315] p-6 rounded-lg border border-[#26262A] text-center relative z-10 shadow-2xl">
          <p className="text-[#CBD5E1] text-sm font-semibold">Chave PIX não encontrada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C] flex flex-col items-center justify-center p-4 text-[#F2F2F3] relative overflow-hidden selection:bg-[var(--gm-primary)] selection:text-white">
      <div className="bg-[#131315] p-6 sm:p-8 rounded-lg border border-[#26262A] max-w-md w-full text-center space-y-6 shadow-2xl relative z-10">
        <div className="w-14 h-14 bg-[var(--gm-primary)]/15 border border-[var(--gm-primary)]/30 text-[var(--gm-primary)] rounded-md flex items-center justify-center mx-auto">
          {copied ? <Check size={28} /> : <Copy size={28} />}
        </div>
        
        <div>
          <h1 className="text-xl sm:text-2xl font-black mb-2 tracking-tight text-white">Pagamento via PIX</h1>
          <p className="text-[#8B8B92] text-sm font-medium">
            {copied ? "Chave copiada com sucesso! Abra o app do seu banco para pagar." : "Clique no botão abaixo para copiar a chave PIX."}
          </p>
        </div>

        <div className="bg-[#0B0B0C] p-4 rounded-md border border-[#26262A] break-all text-xs text-[#CBD5E1] font-mono text-left select-all">
          {payload}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full h-11 px-4 rounded-[6px] font-bold text-sm bg-[var(--gm-primary)] text-white hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
        >
          {copied ? (
            <>
              <Check size={18} /> Copiado!
            </>
          ) : (
            <>
              <Copy size={18} /> Copiar Chave PIX
            </>
          )}
        </button>
      </div>
    </div>
  );
}
