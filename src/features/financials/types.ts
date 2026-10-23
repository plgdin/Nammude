export type ExpensePaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'petty_cash' | 'other';
export type ExpensePaymentStatus = 'paid' | 'pending' | 'cancelled';

export interface ExpenseCategory {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ExpenseRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  category_id: string | null;
  category_name: string;
  description: string;
  amount: number;
  currency: string;
  payment_method: ExpensePaymentMethod;
  payment_status: ExpensePaymentStatus;
  payee_name: string | null;
  supplier_id: string | null;
  incurred_date: string;
  paid_date: string | null;
  receipt_url: string | null;
  idempotency_key: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CashShiftStatus = 'open' | 'closed' | 'reconciled';
export type CashShiftMovementType = 'cash_in' | 'cash_out' | 'petty_expense';

export interface CashShiftRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  opened_by: string | null;
  closed_by: string | null;
  shift_number: string;
  opened_at: string;
  closed_at: string | null;
  opening_float: number;
  cash_sales_amount: number;
  cash_refunds_amount: number;
  cash_in_amount: number;
  cash_out_amount: number;
  cash_expenses_amount: number;
  expected_cash: number | null;
  actual_cash: number | null;
  variance: number | null;
  status: CashShiftStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashShiftMovement {
  id: string;
  organization_id: string;
  branch_id: string;
  cash_shift_id: string;
  movement_type: CashShiftMovementType;
  amount: number;
  reason: string;
  performed_by: string | null;
  idempotency_key: string | null;
  created_at: string;
}

export type SupplierPaymentMethod = 'bank_transfer' | 'cheque' | 'cash' | 'card' | 'other';

export interface SupplierPaymentRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  supplier_id: string;
  goods_receipt_id: string | null;
  amount: number;
  payment_method: SupplierPaymentMethod;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  idempotency_key: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RevenueMetrics {
  gross_sales: number;
  discounts: number;
  tax_collected: number;
  net_sales: number;
  total_billed: number;
}

export interface CogsMetrics {
  realized_cogs: number;
  wasted_loss: number;
  food_cost_percentage: number;
}

export interface ProfitabilityMetrics {
  gross_profit: number;
  gross_margin_percentage: number;
  operating_expenses: number;
  net_operating_profit: number;
  net_margin_percentage: number;
}

export interface CashAndCollectionsMetrics {
  real_collections_total: number;
  simulated_collections_total: number;
  refunds_total: number;
  net_collections: number;
  by_payment_method: Record<string, number>;
}

export interface SupplierPayablesMetrics {
  total_invoiced: number;
  total_paid: number;
  outstanding_payable: number;
}

export interface FinancialReport {
  organization_id: string;
  branch_id: string | null;
  start_date: string;
  end_date: string;
  orders_count: number;
  revenue: RevenueMetrics;
  cogs: CogsMetrics;
  profitability: ProfitabilityMetrics;
  cash_and_collections: CashAndCollectionsMetrics;
  operating_expenses_breakdown: Record<string, number>;
  supplier_payables: SupplierPayablesMetrics;
}
