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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <p>Chave PIX não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="bg-slate-900 p-8 rounded-3xl border border-white/10 max-w-md w-full text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 bg-[var(--gm-primary)]/20 text-[var(--gm-primary)] rounded-full flex items-center justify-center mx-auto">
          {copied ? <Check size={32} /> : <Copy size={32} />}
        </div>
        
        <div>
          <h1 className="text-2xl font-black mb-2">Pagamento via PIX</h1>
          <p className="text-slate-400 text-sm">
            {copied ? "Chave copiada com sucesso! Abra o app do seu banco para pagar." : "Clique no botão abaixo para copiar a chave PIX."}
          </p>
        </div>

        <div className="bg-black/50 p-4 rounded-xl border border-white/5 break-all text-xs text-slate-300 font-mono text-left">
          {payload}
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-4 rounded-xl font-bold bg-[var(--gm-primary)] text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
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
