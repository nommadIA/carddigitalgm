/**
 * Cache local ultrarrápido para Orçamentos (SWR - Stale-While-Revalidate)
 * Garante que a tela de orçamentos carregue em 0ms e nunca fique em branco
 * mesmo em caso de erro 42501 (permissão do Supabase) ou falha de conexão.
 */

export interface CachedBudget {
  id: string;
  tenant_id?: string;
  client_id?: string;
  client_name?: string;
  service_name?: string;
  total_amount?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  items?: any[];
  [key: string]: any;
}

const CACHE_PREFIX = "gm_budgets_cache_";

function getStorageKey(tenantId?: string | null): string {
  return `${CACHE_PREFIX}${tenantId || "default"}`;
}

export function readBudgetsLocal(tenantId?: string | null): CachedBudget[] | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(getStorageKey(tenantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeBudgetsLocal(budgets: CachedBudget[], tenantId?: string | null): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    if (!Array.isArray(budgets)) return;
    localStorage.setItem(getStorageKey(tenantId), JSON.stringify(budgets));
  } catch (e) {
    console.warn("[BudgetsCache] Falha ao persistir cache local:", e);
  }
}

export function appendOrUpdateBudgetLocal(budget: CachedBudget, tenantId?: string | null): void {
  if (typeof window === "undefined" || !window.localStorage || !budget?.id) return;
  try {
    const current = readBudgetsLocal(tenantId) || [];
    const idx = current.findIndex((b) => b.id === budget.id);
    let updated: CachedBudget[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...updated[idx], ...budget, updated_at: new Date().toISOString() };
    } else {
      updated = [{ ...budget, created_at: budget.created_at || new Date().toISOString() }, ...current];
    }
    writeBudgetsLocal(updated, tenantId);
  } catch {}
}

export function removeBudgetLocal(budgetId: string, tenantId?: string | null, permanent = false): void {
  if (typeof window === "undefined" || !window.localStorage || !budgetId) return;
  try {
    const current = readBudgetsLocal(tenantId) || [];
    let updated: CachedBudget[];
    if (permanent) {
      updated = current.filter((b) => b.id !== budgetId);
    } else {
      updated = current.map((b) => (b.id === budgetId ? { ...b, deleted_at: new Date().toISOString() } : b));
    }
    writeBudgetsLocal(updated, tenantId);
  } catch {}
}
