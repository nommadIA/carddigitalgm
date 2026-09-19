// lib/securityPin.ts
// Gerenciador de segurança por código PIN para proteger o dispositivo e credenciais salvas
import { supabase } from "./supabase";

const PIN_PREFIX = "gm_device_pin_";
const PIN_ENABLED_PREFIX = "gm_pin_enabled_";
const SESSION_UNLOCKED_KEY = "gm_pin_session_unlocked";
const PIN_RESET_TOKEN_PREFIX = "gm_pin_reset_token_";
const PIN_RESET_CODE_PREFIX = "gm_pin_reset_code_";

function sanitizeEmail(email?: string): string {
  if (!email) return "default";
  return email.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

export function maskEmail(email?: string): string {
  if (!email || !email.includes("@")) return "seu e-mail cadastrado";
  const [userPart, domainPart] = email.trim().toLowerCase().split("@");
  if (userPart.length <= 3) {
    return `${userPart.substring(0, 1)}***@${domainPart}`;
  }
  return `${userPart.substring(0, 3)}***@${domainPart}`;
}

export interface PinResetRequestResult {
  success: boolean;
  message: string;
  emergencyCode?: string;
}

/**
 * Dispara o envio do link de redefinição de PIN para o e-mail cadastrado
 */
export async function requestPinResetLink(email: string): Promise<PinResetRequestResult> {
  if (!email || !email.includes("@")) {
    return {
      success: false,
      message: "E-mail inválido ou não informado para redefinição.",
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const token =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

  const emergencyCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // Válido por 15 minutos

  try {
    // Armazena o token e código temporários com validade de 15 minutos
    localStorage.setItem(
      PIN_RESET_TOKEN_PREFIX + sanitizeEmail(cleanEmail),
      JSON.stringify({ token, expiresAt })
    );
    localStorage.setItem(
      PIN_RESET_CODE_PREFIX + sanitizeEmail(cleanEmail),
      JSON.stringify({ code: emergencyCode, expiresAt })
    );

    // Constrói o link direto de redefinição
    const resetUrl = `${window.location.origin}/?reset_pin=true&email=${encodeURIComponent(
      cleanEmail
    )}&token=${token}`;

    // Dispara via Supabase Auth para enviar o e-mail oficial
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: resetUrl,
    });

    if (error) {
      console.warn("Aviso Supabase Auth resetPasswordForEmail:", error.message);
      return {
        success: true,
        message:
          "Solicitação processada! Você pode usar o código de autorização abaixo ou o link de e-mail.",
        emergencyCode,
      };
    }

    return {
      success: true,
      message:
        "Link de redefinição enviado com sucesso para seu e-mail! Verifique sua caixa de entrada ou spam.",
      emergencyCode,
    };
  } catch (err: any) {
    console.error("Erro ao solicitar redefinição de PIN:", err);
    return {
      success: true,
      message: "Código de autorização gerado para esta redefinição.",
      emergencyCode,
    };
  }
}

/**
 * Valida o token recebido pelo link do e-mail
 */
export function verifyPinResetToken(email: string, token: string): boolean {
  try {
    const raw = localStorage.getItem(PIN_RESET_TOKEN_PREFIX + sanitizeEmail(email));
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || data.token !== token) return false;
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(PIN_RESET_TOKEN_PREFIX + sanitizeEmail(email));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida o código numérico de emergência de 6 dígitos
 */
export function verifyEmergencyPinResetCode(email: string, code: string): boolean {
  try {
    const cleanCode = code.trim();
    const raw = localStorage.getItem(PIN_RESET_CODE_PREFIX + sanitizeEmail(email));
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || String(data.code).trim() !== cleanCode) return false;
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(PIN_RESET_CODE_PREFIX + sanitizeEmail(email));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Limpa os dados de recuperação após uso bem-sucedido
 */
export function clearPinResetData(email: string) {
  try {
    localStorage.removeItem(PIN_RESET_TOKEN_PREFIX + sanitizeEmail(email));
    localStorage.removeItem(PIN_RESET_CODE_PREFIX + sanitizeEmail(email));
  } catch {}
}

/**
 * Verifica se a proteção por PIN está habilitada para o usuário/dispositivo
 */
export function isPinSecurityActive(email?: string): boolean {
  try {
    const key = PIN_ENABLED_PREFIX + sanitizeEmail(email);
    const enabled = localStorage.getItem(key);
    const pin = getSecurityPin(email);
    return enabled === "true" && Boolean(pin);
  } catch {
    return false;
  }
}

/**
 * Habilita ou desabilita o PIN para o usuário/dispositivo
 */
export function setPinSecurityActive(enabled: boolean, email?: string) {
  try {
    const key = PIN_ENABLED_PREFIX + sanitizeEmail(email);
    if (enabled) {
      localStorage.setItem(key, "true");
    } else {
      localStorage.setItem(key, "false");
    }
  } catch (e) {
    console.warn("Erro ao definir status do PIN:", e);
  }
}

/**
 * Retorna o PIN armazenado (ou null)
 */
export function getSecurityPin(email?: string): string | null {
  try {
    const key = PIN_PREFIX + sanitizeEmail(email);
    const stored = localStorage.getItem(key);
    if (stored) return stored;

    // Fallback para chave geral caso o email não estivesse vinculado
    return localStorage.getItem(PIN_PREFIX + "default");
  } catch {
    return null;
  }
}

/**
 * Salva o PIN de segurança de 4 dígitos
 */
export function saveSecurityPin(pin: string, email?: string) {
  try {
    const cleanPin = pin.trim();
    const key = PIN_PREFIX + sanitizeEmail(email);
    localStorage.setItem(key, cleanPin);
    // Também salva na chave padrão para caso de verificação preliminar no login
    localStorage.setItem(PIN_PREFIX + "default", cleanPin);
    setPinSecurityActive(true, email);
    setSessionUnlocked(true);
  } catch (e) {
    console.warn("Erro ao salvar PIN:", e);
  }
}

/**
 * Remove o PIN de segurança
 */
export function removeSecurityPin(email?: string) {
  try {
    const key = PIN_PREFIX + sanitizeEmail(email);
    localStorage.removeItem(key);
    localStorage.removeItem(PIN_PREFIX + "default");
    setPinSecurityActive(false, email);
    setSessionUnlocked(false);
  } catch (e) {
    console.warn("Erro ao remover PIN:", e);
  }
}

/**
 * Valida se o PIN digitado confere com o salvo
 */
export function verifySecurityPin(inputPin: string, email?: string): boolean {
  const saved = getSecurityPin(email);
  if (!saved) return false;
  return inputPin.trim() === saved.trim();
}

/**
 * Verifica se a sessão atual (nesta aba/execução) já foi desbloqueada pelo PIN
 * Usamos sessionStorage para que, ao desligar o computador ou fechar o navegador,
 * o bloqueio por PIN volte a ser exigido automaticamente!
 */
export function isSessionUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SESSION_UNLOCKED_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Marca a sessão atual como desbloqueada ou bloqueada
 */
export function setSessionUnlocked(unlocked: boolean) {
  try {
    if (unlocked) {
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, "true");
    } else {
      sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
    }
  } catch (e) {
    console.warn("Erro ao definir sessão de PIN:", e);
  }
}

/**
 * Bloqueia a sessão imediatamente (ex: ao clicar em bloquear ou inatividade)
 */
export function lockSession() {
  setSessionUnlocked(false);
}
