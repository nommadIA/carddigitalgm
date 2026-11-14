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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm overflow-hidden rounded-lg border border-[#26262A] bg-[#131315] text-left text-[#F2F2F3] shadow-2xl gm-modal"
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar"
              className="absolute right-4 top-4 w-9 h-9 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] hover:border-[#3F3F46] text-[#8B8B92] hover:text-[#F2F2F3] flex items-center justify-center transition-colors z-10 cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 pr-10">
                <div className="w-11 h-11 rounded-md bg-[var(--gm-primary)]/10 flex items-center justify-center border border-[var(--gm-primary)]/25 shrink-0">
                  <WhatsAppIcon size={24} className="text-[var(--gm-primary)]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-[#F2F2F3]">
                    Enviar Mensagem
                  </h3>
                  <p className="text-[13px] text-[#8B8B92] font-medium">Múltiplos aplicativos detectados</p>
                </div>
              </div>

              <p className="text-sm text-[#CBD5E1] leading-relaxed mb-5">
                Detectamos que você pode ter mais de um WhatsApp instalado (
                <strong className="text-emerald-400">Pessoal</strong> e{' '}
                <strong className="text-sky-400">Business</strong>). Escolha o mensageiro de destino:
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectApp('personal')}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-md border border-[#26262A] bg-[#0B0B0C] hover:border-emerald-500/40 hover:bg-[#1B1B1E] transition-colors text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-[4px] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25 shrink-0">
                    <Smartphone size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#F2F2F3] group-hover:text-emerald-400 transition-colors">
                      WhatsApp Padrão
                    </h4>
                    <p className="text-xs text-[#8B8B92] mt-0.5">Conta pessoal, contatos gerais ou web app</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectApp('business')}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-md border border-[#26262A] bg-[#0B0B0C] hover:border-sky-500/40 hover:bg-[#1B1B1E] transition-colors text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-[4px] bg-sky-500/10 flex items-center justify-center border border-sky-500/25 shrink-0">
                    <Building2 size={18} className="text-sky-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#F2F2F3] group-hover:text-sky-400 transition-colors">
                      WhatsApp Business
                    </h4>
                    <p className="text-xs text-[#8B8B92] mt-0.5">Conta comercial de negócios (ideal para orçamentos)</p>
                  </div>
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-[#26262A] flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <div className="w-4 h-4 rounded-[3px] border border-[#3F3F46] bg-[#0B0B0C] peer-checked:bg-[var(--gm-primary)] peer-checked:border-[var(--gm-primary)] flex items-center justify-center transition-colors">
                      {remember && <Check size={11} className="text-[#0B0B0C] stroke-[3]" />}
                    </div>
                  </div>
                  <span className="text-xs text-[#CBD5E1] font-medium">Lembrar escolha para futuros envios</span>
                </label>
              </div>

              <p className="text-xs text-[#8B8B92] leading-snug mt-3.5 flex items-start gap-1.5">
                <HelpCircle size={14} className="shrink-0 mt-0.5 text-[#8B8B92]" />
                No PC, abrirá o aplicativo padrão ou o WhatsApp Web integrado.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
