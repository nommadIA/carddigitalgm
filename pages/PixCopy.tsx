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
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-none" />
        <div className="fora apple-glass-card p-6 rounded-2xl border border-white/10 text-center relative z-10 backdrop-blur-xl">
          <p className="text-slate-300 font-semibold">Chave PIX não encontrada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-4 text-white relative overflow-hidden selection:bg-[var(--gm-primary)] selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] bg-gradient-to-br from-[var(--gm-primary)]/20 via-orange-600/10 to-transparent rounded-full blur-3xl opacity-80 pointer-events-none" />
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] pointer-events-none" />

      <div className="fora apple-glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-md w-full text-center space-y-6 shadow-2xl backdrop-blur-2xl relative z-10">
        <div className="w-16 h-16 bg-[var(--gm-primary)]/20 border border-[var(--gm-primary)]/35 text-[var(--gm-primary)] rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          {copied ? <Check size={32} /> : <Copy size={32} />}
        </div>
        
        <div>
          <h1 className="text-2xl font-black mb-2 tracking-tight text-white">Pagamento via PIX</h1>
          <p className="text-slate-300 text-sm font-medium">
            {copied ? "Chave copiada com sucesso! Abra o app do seu banco para pagar." : "Clique no botão abaixo para copiar a chave PIX."}
          </p>
        </div>

        <div className="bg-black/50 p-4 rounded-xl border border-white/10 break-all text-xs text-slate-200 font-mono text-left select-all backdrop-blur-md">
          {payload}
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-4 rounded-xl font-bold bg-[var(--gm-primary)] text-white hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={20} /> Copiado!
            </>
          ) : (
            <>
              <Copy size={20} /> Copiar Chave PIX
            </>
          )}
        </button>
      </div>
    </div>
  );
}
