
import { supabase } from "../lib/supabase";
import { Client } from "../types";

export async function fetchClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar clientes:', error);
    throw error;
  }

  return data as Client[];
}

export async function insertClient(client: Partial<Client>) {
  const { data, error } = await supabase
    .from('clients')
    .insert([client])
    .select()
    .single();

  if (error) {
    console.error('Erro ao inserir cliente:', error);
    throw error;
  }

  return data;
}

export async function updateClient(id: string, updatedData: Partial<Client>) {
  const { data, error } = await supabase
    .from('clients')
    .update(updatedData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar cliente:', error);
    throw error;
  }

  return data;
}

export async function deleteClient(id: string) {
  const { error } = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar cliente:', error);
    throw error;
  }
}

export async function restoreClient(id: string) {
  const { error } = await supabase
    .from('clients')
    .update({ deleted_at: null })
    .eq('id', id);

  if (error) {
    console.error('Erro ao restaurar cliente:', error);
    throw error;
  }
}
