import { supabase } from "./supabase";

export interface CustomerAddress {
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface Customer {
  id: string;
  auth_user_id?: string | null;
  tenant_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  cpf_cnpj?: string | null;
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerOrderItem {
  id: string;
  name: string;
  price: string | number;
  quantity: number;
  image_url?: string;
  selectedOption?: {
    quantity?: string;
    price?: string;
  };
}

export interface CustomerOrder {
  id: string;
  order_number: number;
  tenant_id: string;
  customer_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  customer_cpf_cnpj?: string | null;
  shipping_address: Record<string, any>;
  items: CustomerOrderItem[];
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  payment_method: string;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  order_status: "aguardando_aprovacao" | "preparando" | "enviado" | "entregue" | "cancelado";
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

const CUSTOMER_LOCAL_STORAGE_KEY = "gm_current_customer";

export function getCachedCustomer(): Customer | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedCustomer(customer: Customer | null): void {
  try {
    if (!customer) {
      localStorage.removeItem(CUSTOMER_LOCAL_STORAGE_KEY);
    } else {
      localStorage.setItem(CUSTOMER_LOCAL_STORAGE_KEY, JSON.stringify(customer));
    }
  } catch {}
}

/**
 * Busca o perfil de cliente associado ao ID do usuário autenticado no Supabase
 */
export async function fetchCustomerProfile(authUserId: string, tenantId = "global"): Promise<Customer | null> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      console.warn("Aviso ao buscar perfil do cliente:", error.message);
      return getCachedCustomer();
    }

    if (data) {
      setCachedCustomer(data);
      return data as Customer;
    }
    return null;
  } catch (err) {
    console.error("Erro ao buscar customer:", err);
    return getCachedCustomer();
  }
}

/**
 * Cadastro de novo cliente
 */
export async function signUpCustomer(params: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  cpf_cnpj?: string;
  address?: CustomerAddress;
  tenant_id?: string;
}): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  try {
    const email = params.email.trim().toLowerCase();
    const tenantId = params.tenant_id || "global";

    // 1. Cadastra o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: params.password,
      options: {
        data: {
          full_name: params.full_name,
          phone: params.phone,
          user_type: "customer",
        },
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    const authUserId = authData.user?.id;

    // 2. Insere na tabela customers
    const customerPayload = {
      auth_user_id: authUserId || null,
      tenant_id: tenantId,
      full_name: params.full_name.trim(),
      email,
      phone: params.phone?.trim() || null,
      cpf_cnpj: params.cpf_cnpj?.trim() || null,
      cep: params.address?.cep?.trim() || null,
      street: params.address?.street?.trim() || null,
      number: params.address?.number?.trim() || null,
      complement: params.address?.complement?.trim() || null,
      neighborhood: params.address?.neighborhood?.trim() || null,
      city: params.address?.city?.trim() || null,
      state: params.address?.state?.trim() || null,
    };

    const { data: customerRecord, error: customerError } = await supabase
      .from("customers")
      .insert(customerPayload)
      .select()
      .single();

    if (customerError) {
      console.warn("Aviso ao inserir registro de cliente:", customerError.message);
      // Se já existia por email, tenta atualizar
      const { data: updatedRecord } = await supabase
        .from("customers")
        .update(customerPayload)
        .eq("email", email)
        .select()
        .maybeSingle();

      const finalCust = updatedRecord || ({ id: authUserId || Date.now().toString(), ...customerPayload } as Customer);
      setCachedCustomer(finalCust);
      return { success: true, customer: finalCust };
    }

    setCachedCustomer(customerRecord as Customer);
    return { success: true, customer: customerRecord as Customer };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro desconhecido ao cadastrar cliente." };
  }
}

/**
 * Login de cliente existente
 */
export async function signInCustomer(
  email: string,
  pass: string,
  tenantId = "global"
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Usuário não encontrado." };
    }

    // Busca o cadastro de cliente na tabela
    let customer = await fetchCustomerProfile(authData.user.id, tenantId);

    // Se não encontrou por auth_user_id, busca por email
    if (!customer) {
      const { data: byEmail } = await supabase
        .from("customers")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (byEmail) {
        // Vincula auth_user_id se estava nulo
        if (!byEmail.auth_user_id) {
          await supabase.from("customers").update({ auth_user_id: authData.user.id }).eq("id", byEmail.id);
        }
        customer = byEmail as Customer;
        setCachedCustomer(customer);
      } else {
        // Cria perfil básico se não existia
        const newCustPayload = {
          auth_user_id: authData.user.id,
          tenant_id: tenantId,
          full_name: authData.user.user_metadata?.full_name || cleanEmail.split("@")[0],
          email: cleanEmail,
          phone: authData.user.user_metadata?.phone || null,
        };
        const { data: created } = await supabase.from("customers").insert(newCustPayload).select().maybeSingle();
        customer = (created || newCustPayload) as Customer;
        setCachedCustomer(customer);
      }
    }

    return { success: true, customer: customer || undefined };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao realizar login." };
  }
}

/**
 * Logout do cliente
 */
export async function signOutCustomer(): Promise<void> {
  try {
    setCachedCustomer(null);
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Erro no logout do cliente:", err);
  }
}

/**
 * Atualizar dados do cliente
 */
export async function updateCustomerProfile(
  customerId: string,
  updates: Partial<Customer>
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    setCachedCustomer(data as Customer);
    return { success: true, customer: data as Customer };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar dados." };
  }
}

/**
 * Salvar pedido no Supabase
 */
export async function saveCustomerOrder(orderPayload: {
  tenant_id: string;
  customer_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  customer_cpf_cnpj?: string | null;
  shipping_address: Record<string, any>;
  items: CustomerOrderItem[];
  subtotal: number;
  shipping_fee?: number;
  discount?: number;
  total: number;
  payment_method: string;
  notes?: string;
}): Promise<{ success: boolean; order?: CustomerOrder; error?: string }> {
  try {
    const payload = {
      tenant_id: orderPayload.tenant_id || "global",
      customer_id: orderPayload.customer_id || null,
      customer_name: orderPayload.customer_name.trim(),
      customer_email: orderPayload.customer_email.trim().toLowerCase(),
      customer_phone: orderPayload.customer_phone || null,
      customer_cpf_cnpj: orderPayload.customer_cpf_cnpj || null,
      shipping_address: orderPayload.shipping_address || {},
      items: orderPayload.items || [],
      subtotal: orderPayload.subtotal || 0,
      shipping_fee: orderPayload.shipping_fee || 0,
      discount: orderPayload.discount || 0,
      total: orderPayload.total || 0,
      payment_method: orderPayload.payment_method || "pix",
      payment_status: "pending",
      order_status: "aguardando_aprovacao",
      notes: orderPayload.notes || null,
    };

    const { data, error } = await supabase
      .from("customer_orders")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn("Erro ao salvar pedido no Supabase:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, order: data as CustomerOrder };
  } catch (err: any) {
    console.error("Falha ao salvar customer order:", err);
    return { success: false, error: err?.message || "Erro desconhecido ao salvar pedido." };
  }
}

/**
 * Buscar histórico de pedidos do cliente
 */
export async function fetchCustomerOrders(customerId: string): Promise<CustomerOrder[]> {
  try {
    const { data, error } = await supabase
      .from("customer_orders")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Erro ao carregar pedidos do cliente:", error.message);
      return [];
    }

    return (data || []) as CustomerOrder[];
  } catch (err) {
    console.error("Erro ao listar pedidos:", err);
    return [];
  }
}

/**
 * Buscar todos os pedidos da loja (para o Administrador / Lojista)
 */
export async function fetchAllStoreOrders(tenantId = "global"): Promise<CustomerOrder[]> {
  try {
    let query = supabase
      .from("customer_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (tenantId && tenantId !== "global") {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.eq.global`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Erro ao buscar todos os pedidos da loja:", error.message);
      return [];
    }

    return (data || []) as CustomerOrder[];
  } catch (err) {
    console.error("Falha ao carregar pedidos da loja:", err);
    return [];
  }
}

/**
 * Atualizar status do pedido (preparando, enviado, entregue, cancelado)
 */
export async function updateOrderStatus(
  orderId: string, 
  status: "aguardando_aprovacao" | "preparando" | "enviado" | "entregue" | "cancelado"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("customer_orders")
      .update({
        order_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar status do pedido." };
  }
}

/**
 * Atualizar status do pagamento (pending, paid, failed, refunded)
 */
export async function updateOrderPaymentStatus(
  orderId: string, 
  paymentStatus: "pending" | "paid" | "failed" | "refunded"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: orderErr } = await supabase
      .from("customer_orders")
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (orderErr) return { success: false, error: orderErr.message };

    // Atualiza também na tabela order_payments se existir
    await supabase
      .from("order_payments")
      .update({
        status: paymentStatus === "paid" ? "approved" : paymentStatus === "pending" ? "pending" : "rejected",
        paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar status de pagamento." };
  }
}

/**
 * Buscar todos os clientes cadastrados no site (para o Administrador)
 */
export async function fetchAllCustomers(tenantId = "global"): Promise<Customer[]> {
  try {
    let query = supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (tenantId && tenantId !== "global") {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.eq.global`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Erro ao buscar clientes:", error.message);
      return [];
    }
    return (data || []) as Customer[];
  } catch (err) {
    console.error("Falha ao buscar clientes:", err);
    return [];
  }
}

/**
 * Consulta CEP na API ViaCEP
 */
export async function lookupViaCep(cep: string): Promise<CustomerAddress | null> {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.erro) return null;

    return {
      cep: cleanCep,
      street: json.logradouro || "",
      neighborhood: json.bairro || "",
      city: json.localidade || "",
      state: json.uf || "",
    };
  } catch {
    return null;
  }
}
