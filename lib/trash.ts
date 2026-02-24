import { supabase } from "./supabase";

type TableName = "clients" | "budgets" | "expenses" | "shopping_items";

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error("Usuário não autenticado");
  return data.user;
}

export async function softDelete(table: TableName, id: string) {
  const user = await requireUser();

  const payload: any = {
    deleted_at: new Date().toISOString(),
  };

  if (table === "expenses") {
    payload.deleted_by = user.id;
  }

  const { error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

export async function restore(table: TableName, id: string) {
  await requireUser();

  const payload: any = {
    deleted_at: null,
  };

  if (table === "expenses") {
    payload.deleted_by = null;
  }

  const { error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

export async function hardDeleteClient(id: string, password: string) {
  await requireUser();

  const { data, error } = await supabase.rpc("hard_delete_client", {
    p_client_id: id,
    p_password: password,
  });

  if (error) throw error;
  if (data !== "ok") throw new Error("Falha ao excluir definitivamente.");
}

export async function hardDeleteBudget(id: string, password: string) {
  await requireUser();

  const { data, error } = await supabase.rpc("hard_delete_budget", {
    p_budget_id: id,
    p_password: password,
  });

  if (error) throw error;
  if (data !== "ok") throw new Error("Falha ao excluir definitivamente.");
}

export async function hardDeleteExpense(id: string, password: string) {
  await requireUser();

  const { data, error } = await supabase.rpc("hard_delete_expense", {
    p_expense_id: id,
    p_password: password,
  });

  if (error) throw error;
  if (data !== "ok") throw new Error("Falha ao excluir definitivamente.");
}

export async function setSecurityPassword(novaSenhaDigitada: string) {
  await requireUser();

  const { error } = await supabase.rpc("set_delete_password", {
    new_pass: novaSenhaDigitada,
  });

  if (error) throw error;
}

// Esvazia TUDO (Backup)
export async function hardDeleteTrash(senhaDigitada: string) {
  await requireUser();

  const { data, error } = await supabase.rpc("hard_delete_trash", {
    pin: senhaDigitada,
  });

  if (error) throw error;
  if (data !== "ok") throw new Error("Erro ao esvaziar lixeira.");
}

// Esvazia só lixeira de clientes
export async function hardDeleteClientsTrash(pass: string) {
  await requireUser();
  const { data, error } = await supabase.rpc("hard_delete_clients_trash", { pin: pass });
  if (error) throw error;
  if (data !== "ok") throw new Error("Erro ao esvaziar lixeira de clientes.");
}

// Esvazia só lixeira de orçamentos
export async function hardDeleteBudgetsTrash(pass: string) {
  await requireUser();
  const { data, error } = await supabase.rpc("hard_delete_budgets_trash", { pin: pass });
  if (error) throw error;
  if (data !== "ok") throw new Error("Erro ao esvaziar lixeira de orçamentos.");
}

// Esvazia só lixeira de despesas
export async function hardDeleteExpensesTrash(pass: string) {
  await requireUser();
  const { data, error } = await supabase.rpc("hard_delete_expenses_trash", { pin: pass });
  if (error) throw error;
  if (data !== "ok") throw new Error("Erro ao esvaziar lixeira de despesas.");
}