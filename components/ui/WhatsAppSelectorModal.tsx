import React, { useState, useEffect } from 'react';
import { X, Check, Smartphone, Building2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WhatsAppIcon } from './WhatsAppIcon';

interface WhatsAppEventDetail {
  phone: string;
  text: string;
}

export const WhatsAppSelectorModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [text, setText] = useState('');
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<WhatsAppEventDetail>;
      const { phone: p, text: t } = customEvent.detail;
      
      // Check for saved preference
      const savedPreference = localStorage.getItem('whatsapp_selected_app');
      if (savedPreference) {
        executeDirectSend(savedPreference, p, t);
        return;
      }

      setPhone(p || '');
      setText(t || '');
      setIsOpen(true);
    };

    window.addEventListener('open-whatsapp-picker', handleOpen);
    return () => {
      window.removeEventListener('open-whatsapp-picker', handleOpen);
    };
  }, []);

  const getSystemDetails = () => {
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.includes('android');
    const isIOS = /ipad|iphone|ipod/.test(ua);
    const isMobile = isAndroid || isIOS;
    return { isAndroid, isIOS, isMobile };
  };

  const executeDirectSend = (appType: string, pDigits: string, textMsg: string) => {
    const { isAndroid } = getSystemDetails();
    const cleanPhone = pDigits.replace(/\D/g, '');
    const encodedText = encodeURIComponent(textMsg);
    
    let url = '';
    
    if (appType === 'business') {
      if (isAndroid) {
        // Explicit Android package intent targeting WhatsApp Business
        url = `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end;`;
      } else {
        // Universal WhatsApp Business deep link
        url = cleanPhone 
          ? `https://wa.me/${cleanPhone}?text=${encodedText}`
          : `https://wa.me/?text=${encodedText}`;
      }
    } else {
      // Standard WhatsApp
      url = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodedText}`
        : `https://wa.me/?text=${encodedText}`;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSelectApp = (appType: 'personal' | 'business') => {
    if (remember) {
      localStorage.setItem('whatsapp_selected_app', appType);
    }
    executeDirectSend(appType, phone, text);
    setIsOpen(false);
  };

  const handleClearSavedPreference = () => {
    localStorage.removeItem('whatsapp_selected_app');
    alert('Preferência de WhatsApp redefinida! Agora você escolherá o mensageiro a cada envio.');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
          {/* Blur backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/80"
          />

          {/* Dialog popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm overflow-hidden rounded-lg border border-white/10 text-left text-white shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(22, 28, 38, 0.96) 0%, rgba(13, 17, 23, 0.98) 100%)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 10px 50px rgba(0, 0, 0, 0.9), inset 0 0 20px rgba(34, 197, 94, 0.05)',
            }}
          >
            {/* Top Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-white/40 hover:text-white p-1 rounded-full hover:bg-white/5 transition-all z-10"
            >
              <X size={16} />
            </button>

            {/* Content body */}
            <div className="p-6">
              {/* Icon & Title */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--gm-primary)]/10 flex items-center justify-center border border-[var(--gm-primary)]/20 shrink-0">
                  <WhatsAppIcon size={26} className="text-[var(--gm-primary)]" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-white">
                    Enviar Mensagem
                  </h3>
                  <p className="text-base text-slate-300 font-medium">Múltiplos aplicativos detectados</p>
                </div>
              </div>

              {/* Explanatory text */}
              <p className="text-base text-slate-200 leading-relaxed mb-5">
                Detectamos que você pode ter mais de um WhatsApp instalado (como o 
                <strong className="text-emerald-400"> Pessoal</strong> e o 
                <strong className="text-sky-400"> Business</strong>) no seu dispositivo ou PC. Escolha o mensageiro de destino:
              </p>

              {/* Action grid options */}
              <div className="space-y-3">
                {/* 1. Standard WhatsApp option */}
                <button
                  onClick={() => handleSelectApp('personal')}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-white/5 bg-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all shrink-0">
                    <Smartphone size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                      WhatsApp Padrão
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Conta pessoal, contatos gerais ou web app</p>
                  </div>
                </button>

                {/* 2. Business WhatsApp option */}
                <button
                  onClick={() => handleSelectApp('business')}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-white/5 bg-white/5 hover:border-sky-500/30 hover:bg-sky-500/5 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center border border-sky-500/20 group-hover:bg-sky-500/20 transition-all shrink-0">
                    <Building2 size={20} className="text-sky-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors">
                      WhatsApp Business
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Conta comercial de negócios (ideal para orçamentos)</p>
                  </div>
                </button>
              </div>

              {/* Checkbox Remember choice */}
              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <div className="w-4 h-4 rounded border border-white/20 bg-black/40 peer-checked:bg-[var(--gm-primary)] peer-checked:border-[var(--gm-primary)] flex items-center justify-center transition-all">
                      {remember && <Check size={10} className="text-white stroke-[3]" />}
                    </div>
                  </div>
                  <span className="text-xs text-slate-300 font-medium">Lembrar escolha para futuros envios</span>
                </label>
              </div>

              {/* Info footer */}
              <p className="text-xs text-slate-400 leading-snug mt-3.5 flex items-start gap-1.5">
                <HelpCircle size={14} className="shrink-0 mt-0.5 text-slate-400" />
                No PC, se selecionada uma opção, abrirá o aplicativo padrão ou o WhatsApp Web integrado.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
