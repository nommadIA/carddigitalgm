import { supabase } from "./supabase";

export type FinanceReport = {
  id: string;
  tenant_id: string;
  created_by: string | null;
  title: string;
  month_ref: string | null;
  period_start: string | null;
  period_end: string | null;
  totals: any;
  items: any;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function createFinanceReport(payload: Partial<FinanceReport>) {
  const { data, error } = await supabase
    .from("finance_reports")
    .insert(payload)
    .select("*"); // retorna array

  if (error) {
    console.error("createFinanceReport error:", error);
    throw error;
  }
  return data?.[0] as FinanceReport;
}

export async function listFinanceReports(tenantId: string, mode: "active" | "archived" | "trash") {
  let q = supabase
    .from("finance_reports")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (mode === "active") q = q.is("archived_at", null).is("deleted_at", null);
  if (mode === "archived") q = q.not("archived_at", "is", null).is("deleted_at", null);
  if (mode === "trash") q = q.not("deleted_at", "is", null);

  const { data, error } = await q;

  if (error) {
    console.error("listFinanceReports error:", error);
    throw error;
  }
  return (data ?? []) as FinanceReport[];
}

export async function archiveFinanceReport(id: string) {
  const { error } = await supabase
    .from("finance_reports")
    .update({ archived_at: new Date().toISOString(), deleted_at: null })
    .eq("id", id);

  if (error) throw error;
}

export async function unarchiveFinanceReport(id: string) {
  const { error } = await supabase
    .from("finance_reports")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) throw error;
}

export async function trashFinanceReport(id: string) {
  const { error } = await supabase
    .from("finance_reports")
    .update({ deleted_at: new Date().toISOString(), archived_at: null })
    .eq("id", id);

  if (error) throw error;
}

export async function restoreFinanceReport(id: string) {
  const { error } = await supabase
    .from("finance_reports")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteFinanceReportForever(id: string, tenantId: string) {
  const { error } = await supabase
    .from("finance_reports")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) throw error;
}