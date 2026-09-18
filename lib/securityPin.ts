// lib/securityPin.ts
// Gerenciador de segurança por código PIN para proteger o dispositivo e credenciais salvas

const PIN_PREFIX = "gm_device_pin_";
const PIN_ENABLED_PREFIX = "gm_pin_enabled_";
const SESSION_UNLOCKED_KEY = "gm_pin_session_unlocked";

function sanitizeEmail(email?: string): string {
  if (!email) return "default";
  return email.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
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
