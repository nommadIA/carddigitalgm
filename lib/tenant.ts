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

    const { data, error } = await withTimeout<any>(req as any, 8000);

    if (error) {
      console.error("Erro ao buscar tenants:", error);
      return [];
    }

    const ids = (data || []).map((x: any) => x.tenant_id).filter(Boolean);
    return ids;
  } catch (e: any) {
    console.error("Erro ao buscar tenants:", e?.message || e);
    return []; // ✅ nunca trava
  }
}