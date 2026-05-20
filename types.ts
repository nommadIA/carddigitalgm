
export interface UserProfile {
  id: string;
  email: string;
  avatar_url?: string;
  full_name?: string;
  is_admin: boolean;
  role?: string;
}

export interface Tenant {
  id: string;
  name: string;
  role: string;
}

export interface Client {
  id: string;
  tenant_id: string; 
  name: string;
  whatsapp: string;
  email: string;
  address?: string | null;
  cpf_cnpj?: string | null;
  phone?: string | null;
  instagram?: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export type ServiceType = 'AGENCIA' | 'IMPRESSAO';

export interface BudgetItem {
  id: string;
  description: string;
  serviceType: ServiceType;
  quantity: number;
  unitPrice: number;
  total: number;
  width?: number;
  height?: number;
}

export type BudgetStatus = 'AGUARDANDO' | 'APROVADO' | 'PRODUCAO' | 'CONCLUIDO' | 'CANCELADO';

export type PaymentMethod = 'PIX' | 'CREDIT';

export interface Budget {
  id: string;
  tenant_id: string; 
  clientId: string;
  clientName: string;
  items: BudgetItem[];
  status: BudgetStatus;
  createdAt: string;
  dueDate?: string;
  
  subtotal: number;
  discount: number;
  discountType?: 'fixed' | 'percent';
  interestRate: number;
  paymentMethod: PaymentMethod;
  payment_link?: string | null;
  installments: number;
  totalAmount: number;
  
  // Prazo
  deadline?: string; 
  dueDays?: number;
  due_days?: number;
  dueLabel?: string;
  delivery_days?: number;
  validity_days?: number;

  deletedAt?: string | null;
}

export interface Expense {
  id: string;
  tenant_id: string;
  description: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  createdAt: string;
  deletedAt?: string | null;
}

// --- MARKET TYPES ---

export interface ShoppingItem {
  id: string;
  tenant_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  is_checked: boolean;
  bought_at?: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface MarketWallet {
  tenant_id: string;
  balance: number;
  updated_at: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  items: Budget[];
}

export interface BudgetAlarm {
  id: string;
  budgetId: string;
  type?: 'BUDGET' | 'EXPENSE' | 'NOTE';
  clientName: string;
  time: string;
  active: boolean;
  deliveryDays?: number;

  // compat antigo
  triggered: boolean;

  // ✅ novo (recorrência diária)
  lastTriggeredOn?: string | null;
}

export interface MonthlyReport {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export interface AppSettings {
  id?: string;
  tenant_id?: string | null;
  owner?: string | null;

  company_name?: string | null;
  pix_key?: string | null;
  pix_type?: string | null;

  brand_primary?: string | null;
  brand_accent?: string | null;
  brand_bg?: string | null;
  font_family?: string | null;

  avatar_url?: string | null;
  company_logo_url?: string | null;
  company_logo_scale?: number;
  timbrado_url?: string | null;

  theme_presets?: any[] | null;

  app_background_url?: string | null;
  app_background_fit?: string | null;
  app_background_opacity?: number | null;
  app_background_pos_x?: string;
  app_background_pos_y?: string;
  app_background_scale?: number;
  app_background_blur?: number;

  app_scale?: number | null;

  // New Alarm Settings
  budget_approved_reminder_enabled?: boolean | null;
  budget_approved_reminder_times?: string[] | null;

  created_at?: string;
  updated_at?: string;
}

export interface Note {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  reminder_time: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
