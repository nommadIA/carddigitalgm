export const APP_NAME = "CardDigital GM";
export const ADMIN_EMAIL = "gmedificacao@gmail.com";

// Lista de e-mails com acesso total administrativo irrestrito
export const ADMIN_EMAILS = [
  "gmedificacao@gmail.com",
  "gmedificação@gmail.com",
  "admin@carddigital.com",
];

export function isUserAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = String(email)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return clean === "gmedificacao@gmail.com" || clean === "admin@carddigital.com";
}

export const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR");

// ✅ Supabase
export const SUPABASE_URL = "https://hbvqfpqnuzvzcvhnickt.supabase.co";

// ✅ Chave (Atualizada para a credencial fornecida)
export const SUPABASE_ANON_KEY: string = "sb_publishable__EGAEM0xJymoanqLzMSlAA_5-Kk6w5q";