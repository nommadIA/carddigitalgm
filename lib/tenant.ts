import { supabase } from "./supabase";

async function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("Timeout")), ms)),
  ]);
}

export async function fetchTenantsSafe(userId: string) {
  try {
    // 1) Primeiro tenta via RPC get_my_tenants (executa com SECURITY DEFINER no banco)
    const { data: rpcData, error: rpcError } = await withTimeout<any>(
      supabase.rpc("get_my_tenants") as any,
      4000
    ).catch(() => ({ data: null, error: null }));

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      const ids = rpcData.map((x: any) => x.tenant_id).filter(Boolean);
      if (ids.length > 0) return ids;
    }

    // 2) Fallback para tenant em localStorage
    const cached = typeof localStorage !== "undefined" ? localStorage.getItem("tenant_id") : null;
    if (cached) return [cached];

    return [];
  } catch {
    return []; // nunca trava o app nem emite warnings desnecessários
  }
}