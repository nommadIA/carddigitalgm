import { supabase } from "./supabase";

async function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("Timeout")), ms)),
  ]);
}

export async function fetchTenantsSafe(userId: string) {
  try {
    // tenta pegar tenant via memberships (mais seguro)
    const req = supabase
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("user_id", userId);

    const { data, error } = await withTimeout<any>(req as any, 8000).catch((err) => ({
      data: null,
      error: err,
    }));

    if (error) {
      const msg = error?.message || String(error);
      if (!msg.includes("Failed to fetch")) {
        console.warn("Erro ao buscar tenants:", msg);
      }
      return [];
    }

    const ids = (data || []).map((x: any) => x.tenant_id).filter(Boolean);
    return ids;
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (!msg.includes("Failed to fetch")) {
      console.warn("Erro ao buscar tenants:", msg);
    }
    return []; // ✅ nunca trava
  }
}