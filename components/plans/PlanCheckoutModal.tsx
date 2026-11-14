import React, { useState, useEffect, useRef } from "react";
import { X, Check, Copy, ExternalLink, QrCode, CreditCard, ShieldCheck, Sparkles, MessageCircle, AlertCircle } from "lucide-react";
import * as QRCode from "qrcode";
import { PlanId, PLANS_DATA, getStoredPlansConfig, fetchPlansConfigFromCloud, generatePlanPixPayment, setUserSubscription } from "../../lib/subscriptionPlans";
import { openWhatsapp } from "../../services/whatsApp";
import { CURRENCY_FORMATTER } from "../../constants";
import { useAuth } from "../../store/AuthContext";
import { pushToast } from "../../store/toast";
import ModalResizeHandles from "../ui/ModalResizeHandles";
import { useModalResize } from "../../hooks/useModalResize";

interface PlanCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlanId: PlanId;
  onPlanActivated?: () => void;
}

export default function PlanCheckoutModal({
  isOpen,
  onClose,
  selectedPlanId,
  onPlanActivated
}: PlanCheckoutModalProps) {
  const { tenantId, user, isAdmin } = useAuth();
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [activating, setActivating] = useState(false);
  const [config, setConfig] = useState(() => getStoredPlansConfig());

  // Redimensionador de container (Igual ao de Notas)
  const checkoutModalRef = useRef<HTMLDivElement | null>(null);
  const {
    modalCustomSize: checkoutModalSize,
    handleResizeStart: handleCheckoutResizeStart,
    handleResetSize: handleCheckoutResetSize,
  } = useModalResize({
    storageKey: "gm_plan_checkout_modal_size_v1",
    defaultWidth: 500,
    defaultHeight: 640,
    minWidth: 380,
    minHeight: 340,
    modalRef: checkoutModalRef,
  });

  // Atualiza as configurações e links de pagamento sempre que o modal abre
  useEffect(() => {
    if (!isOpen) return;
    const fresh = getStoredPlansConfig();
    setConfig(fresh);

    let isMounted = true;
    fetchPlansConfigFromCloud(tenantId).then((cloud) => {
      if (isMounted && cloud) {
        setConfig(cloud);
      }
    }).catch(() => {});

    const onUpdated = () => {
      setConfig(getStoredPlansConfig());
    };
    window.addEventListener("gm_plans_config_updated", onUpdated);
    window.addEventListener("gm_settings_updated", onUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("gm_plans_config_updated", onUpdated);
      window.removeEventListener("gm_settings_updated", onUpdated);
    };
  }, [isOpen, tenantId]);

  const plan = PLANS_DATA[selectedPlanId] || PLANS_DATA.intermediario;

  // Preço customizado do config se houver
  const effectivePrice = 
    selectedPlanId === "basico" ? config.priceBasico :
    selectedPlanId === "avancado" ? config.priceAvancado :
    config.priceIntermediario;

  const pixPayment = generatePlanPixPayment(selectedPlanId, config);

  // Gera o QR Code Pix em base64
  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(pixPayment.payload, {
      width: 260,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("Erro gerando QR Code Pix:", err));
  }, [isOpen, selectedPlanId, pixPayment.payload]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixPayment.payload);
      setCopied(true);
      pushToast({
        title: "Código Pix Copiado!",
        message: "Cole no app do seu banco para concluir o pagamento.",
        type: "success",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      pushToast({
        title: "Falha ao copiar",
        message: "Selecione o código manualmente.",
        type: "error",
      });
    }
  };

  const handleOpenWhatsappReceipt = async () => {
    try {
      const { recordPaymentActivationRequest } = await import("../../lib/adminUsersService");
      if (user?.email) {
        await recordPaymentActivationRequest({
          email: user.email,
          name: user.full_name || undefined,
          planId: selectedPlanId,
          tenantId: tenantId || undefined,
          gateway: method,
        });
      }
    } catch (e) {
      console.warn("Erro ao registrar solicitacao de ativacao:", e);
    }

    const text = `Olá! Gostaria de confirmar o pagamento da minha assinatura no aplicativo CardDigital GM:\n\n` +
      `📦 *Plano Escolhido:* ${plan.name}\n` +
      `💰 *Valor:* ${CURRENCY_FORMATTER.format(effectivePrice)}\n` +
      `👤 *E-mail da Conta:* ${user?.email || "Meu e-mail"}\n\n` +
      `Estou enviando o comprovante em anexo para ativação imediata!`;
    openWhatsapp(config.whatsappContact || "5598981120686", text);
  };

  const handleAdminImmediateActivation = () => {
    setActivating(true);
    setTimeout(() => {
      setUserSubscription(tenantId, selectedPlanId, 365);
      setActivating(false);
      pushToast({
        title: "Plano Ativado com Sucesso!",
        message: `O plano ${plan.name} foi aplicado à sua conta.`,
        type: "success",
      });
      onPlanActivated?.();
      onClose();
    }, 400);
  };

  const externalLink = 
    selectedPlanId === "basico" ? config.linkBasico :
    selectedPlanId === "avancado" ? config.linkAvancado :
    config.linkIntermediario;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={checkoutModalRef}
        role="dialog"
        aria-modal="true"
        className="w-full rounded-lg p-5 sm:p-6 relative overflow-hidden flex flex-col gap-5 text-[#F2F2F3] border border-[#26262A] bg-[#131315] gm-modal shadow-2xl select-text"
        style={{
          width: checkoutModalSize.width ? `min(${checkoutModalSize.width}px, 94vw)` : "92%",
          maxWidth: checkoutModalSize.width ? `min(${checkoutModalSize.width}px, 94vw)` : "500px",
          height: checkoutModalSize.height ? `min(${checkoutModalSize.height}px, 92vh)` : undefined,
          maxHeight: checkoutModalSize.height ? `min(${checkoutModalSize.height}px, 92vh)` : "90vh",
          overflowY: "auto",
          background: "#131315",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalResizeHandles
          onResizeStart={handleCheckoutResizeStart}
          onResetSize={handleCheckoutResetSize}
          accentColor={plan.accentColor}
        />

        {/* Header do Modal */}
        <div className="flex items-start justify-between gap-4 relative z-10 border-b border-[#26262A] pb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border"
                style={{
                  backgroundColor: `${plan.accentColor}20`,
                  borderColor: `${plan.accentColor}50`,
                  color: plan.accentColor,
                }}
              >
                {plan.badge || "Plano"}
              </span>
              <span className="text-xs text-[#8B8B92] font-semibold">Assinatura Mensal</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              Plano {plan.name}
            </h2>
            <div className="flex items-baseline gap-1 mt-0.5 tabular-nums">
              <span className="text-sm font-bold text-[#CBD5E1]">R$</span>
              <span className="text-3xl font-black text-white tracking-tight">
                {effectivePrice.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-xs text-[#8B8B92] font-semibold">/mês</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-[4px] bg-[#1B1B1E] hover:bg-[#26262A] border border-[#26262A] hover:border-[#3F3F46] text-[#8B8B92] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Seletor de Método de Pagamento */}
        <div className="grid grid-cols-2 gap-2 relative z-10">
          <button
            type="button"
            onClick={() => setMethod("pix")}
            className={`h-10 px-4 rounded-[6px] border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              method === "pix"
                ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400"
                : "bg-[#0B0B0C] border-[#26262A] text-[#8B8B92] hover:bg-[#1B1B1E] hover:text-white"
            }`}
          >
            <QrCode size={16} />
            <span>Pix Instantâneo</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod("card")}
            className={`h-10 px-4 rounded-[6px] border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              method === "card"
                ? "bg-[var(--gm-primary)]/15 border-[var(--gm-primary)]/50 text-[var(--gm-primary)]"
                : "bg-[#0B0B0C] border-[#26262A] text-[#8B8B92] hover:bg-[#1B1B1E] hover:text-white"
            }`}
          >
            <CreditCard size={16} />
            <span>Cartão / Link</span>
          </button>
        </div>

        {/* Conteúdo: PIX */}
        {method === "pix" && (
          <div className="flex flex-col items-center gap-4 relative z-10">
            {qrCodeUrl ? (
              <div className="p-3 bg-white rounded-md border border-[#26262A] flex items-center justify-center">
                <img
                  src={qrCodeUrl}
                  alt="QR Code Pix"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                />
              </div>
            ) : (
              <div className="w-48 h-48 sm:w-52 sm:h-52 bg-[#0B0B0C] rounded-md flex items-center justify-center border border-[#26262A]">
                <span className="text-xs text-[#8B8B92]">Carregando QR Code...</span>
              </div>
            )}

            <div className="w-full flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B8B92] text-center">
                Pix Copia e Cola
              </span>
              <div className="flex items-center gap-2 bg-[#0B0B0C] border border-[#26262A] rounded-[4px] p-1.5 w-full">
                <input
                  type="text"
                  readOnly
                  value={pixPayment.payload}
                  className="bg-transparent border-0 text-xs text-[#CBD5E1] font-mono flex-1 outline-none truncate px-2"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="px-3 py-1.5 rounded-md bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] hover:brightness-110 text-[var(--gm-primary-foreground,#0B0B0C)] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
                >
                  {copied ? <Check size={14} className="text-current" /> : <Copy size={14} className="text-current" />}
                  <span>{copied ? "Copiado!" : "Copiar"}</span>
                </button>
              </div>
            </div>

            {/* Chave e Titular */}
            <div className="w-full p-3 rounded-md bg-[#131315] border border-[#26262A] text-xs flex flex-col gap-1 text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-500">Beneficiário:</span>
                <span className="font-bold text-white">{config.pixReceiverName || "GM EDIFICACAO"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Chave Pix:</span>
                <span className="font-mono text-zinc-200">{config.pixKey}</span>
              </div>
            </div>

            {/* Botão de Enviar Comprovante */}
            <button
              type="button"
              onClick={handleOpenWhatsappReceipt}
              className="w-full py-3.5 px-5 rounded-[6px] bg-[#131315] border border-[#25D366] text-[#25D366] hover:text-white hover:bg-[#25D366] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-150 cursor-pointer shadow-sm active:scale-95"
            >
              <MessageCircle size={18} />
              <span>Já realizei o Pix · Enviar Comprovante no WhatsApp</span>
            </button>
          </div>
        )}

        {/* Conteúdo: CARTÃO / LINK EXTERNO */}
        {method === "card" && (
          <div className="flex flex-col gap-4 relative z-10">
            {externalLink ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Você será redirecionado para o checkout seguro via{" "}
                  <strong className="text-white">Mercado Pago / Stripe</strong> com opção de Cartão de Crédito parcelado ou assinatura automática.
                </p>

                <a
                  href={externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 px-5 rounded-[6px] bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] hover:brightness-110 text-[var(--gm-primary-foreground,#0B0B0C)] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.3),0_4px_14px_rgba(var(--gm-primary-rgb,246,90,26),0.3)] transition-all cursor-pointer active:scale-95"
                >
                  <span>Pagar com Cartão de Crédito</span>
                  <ExternalLink size={16} className="text-current" />
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-4 rounded-md bg-[#0B0B0C] border border-[#26262A] text-center">
                <div className="w-12 h-12 rounded-md bg-[var(--gm-primary,#FE540B)]/10 border border-[var(--gm-primary,#FE540B)]/20 text-[var(--gm-primary,#FE540B)] flex items-center justify-center mx-auto">
                  <CreditCard size={22} />
                </div>
                <h4 className="font-bold text-white text-sm">Pagamento no Cartão via WhatsApp</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  O link de pagamento via Cartão de Crédito (Mercado Pago / Stripe) é gerado individualmente para você. Clique abaixo para solicitar o link direto!
                </p>
                <button
                  type="button"
                  onClick={handleOpenWhatsappReceipt}
                  className="w-full py-3 px-4 rounded-[6px] border border-[#26262A] hover:border-[#3F3F46] bg-[#131315] hover:bg-[#1B1B1E] text-[#F2F2F3] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer mt-1 active:scale-95 shadow-sm"
                >
                  <MessageCircle size={16} className="text-emerald-400" />
                  <span>Solicitar Link de Cartão no WhatsApp</span>
                </button>
              </div>
            )}

            <div className="p-3.5 rounded-md bg-[#131315] border border-[#26262A] flex items-start gap-2.5 text-xs text-zinc-400">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Transação 100% segura e criptografada com liberação imediata do plano após a confirmação.
              </span>
            </div>
          </div>
        )}

        {/* Botão de Ativação Rápida para o Administrador */}
        {isAdmin && (
          <div className="border-t border-[#26262A] pt-4 flex flex-col gap-2 relative z-10">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-[var(--gm-primary,#FE540B)] uppercase tracking-wider">
              <Sparkles size={13} />
              <span>Ação de Administrador Master</span>
            </div>
            <button
              type="button"
              disabled={activating}
              onClick={handleAdminImmediateActivation}
              className="w-full py-3 px-4 rounded-md bg-[var(--gm-btn-bg,var(--gm-primary,#FE540B))] hover:brightness-110 text-[var(--gm-primary-foreground,#0B0B0C)] border border-[var(--gm-btn-border,var(--gm-primary,#FE540B))] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.3),0_4px_14px_rgba(var(--gm-primary-rgb,246,90,26),0.3)]"
            >
              <Check size={15} className="text-current stroke-[3]" />
              <span>{activating ? "Ativando..." : `Ativar ${plan.name} Imediatamente (Modo ADM)`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
