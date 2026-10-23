import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { ExpenseCategory, ExpenseRecord, ExpensePaymentMethod, ExpensePaymentStatus } from '../types';

let localCategories: ExpenseCategory[] = [
  {
    id: 'c1111111-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Utilities & Power',
    description: 'Electricity, gas, water, internet',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c1111111-0000-0000-0000-000000000002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Kitchen Supplies & Disposables',
    description: 'Paper cups, napkins, cleaning chemicals, gloves',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c1111111-0000-0000-0000-000000000003',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Repairs & Maintenance',
    description: 'Equipment repair, refrigeration servicing',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c1111111-0000-0000-0000-000000000004',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Marketing & Local Ads',
    description: 'Flyers, local events, social ads',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c1111111-0000-0000-0000-000000000005',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Staff Welfare & Meals',
    description: 'Shift meals, water cooler, first aid',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

let localExpenses: ExpenseRecord[] = [
  {
    id: 'e1111111-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    category_id: 'c1111111-0000-0000-0000-000000000002',
    category_name: 'Kitchen Supplies & Disposables',
    description: 'Biodegradable coffee cups and lids (Case of 1000)',
    amount: 145.5,
    currency: 'USD',
    payment_method: 'card',
    payment_status: 'paid',
    payee_name: 'EcoPack Distribution Inc.',
    supplier_id: null,
    incurred_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    paid_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    receipt_url: null,
    idempotency_key: 'EXP-MOCK-001',
    created_by: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'e1111111-0000-0000-0000-000000000002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    category_id: 'c1111111-0000-0000-0000-000000000003',
    category_name: 'Repairs & Maintenance',
    description: 'Espresso grouphead gasket replacement & deep descale',
    amount: 85.0,
    currency: 'USD',
    payment_method: 'cash',
    payment_status: 'paid',
    payee_name: 'Metro Espresso Techs',
    supplier_id: null,
    incurred_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    paid_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    receipt_url: null,
    idempotency_key: 'EXP-MOCK-002',
    created_by: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const expenseService = {
  /**
   * Get active expense categories
   */
  async getCategories(organizationId: string): Promise<ExpenseCategory[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await supabase
          .from('expense_categories')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          return data as ExpenseCategory[];
        }
      } catch (err) {
        console.warn('[expenseService] Remote categories fetch failed, falling back:', err);
      }
    }
    return localCategories.filter((c) => c.organization_id === organizationId || true);
  },

  /**
   * Create new category
   */
  async createCategory(
    organizationId: string,
    name: string,
    description?: string
  ): Promise<ExpenseCategory> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.from('expense_categories') as any)
          .insert({
            organization_id: organizationId,
            name,
            description: description || null,
            is_active: true,
          })
          .select()
          .single();

        if (!error && data) {
          return data as ExpenseCategory;
        }
      } catch (err) {
        console.warn('[expenseService] Remote category creation failed, falling back:', err);
      }
    }

    const newCat: ExpenseCategory = {
      id: `cat-${Date.now()}`,
      organization_id: organizationId,
      name,
      description: description || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    localCategories.push(newCat);
    return newCat;
  },

  /**
   * Get operating expenses for branch / org
   */
  async getExpenses(params: {
    organizationId: string;
    branchId?: string;
    startDate?: string;
    endDate?: string;
    status?: ExpensePaymentStatus;
  }): Promise<ExpenseRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        let query = supabase
          .from('expenses')
          .select('*')
          .eq('organization_id', params.organizationId)
          .order('incurred_date', { ascending: false });

        if (params.branchId) {
          query = query.eq('branch_id', params.branchId);
        }
        if (params.status) {
          query = query.eq('payment_status', params.status);
        }
        if (params.startDate) {
          query = query.gte('incurred_date', params.startDate);
        }
        if (params.endDate) {
          query = query.lte('incurred_date', params.endDate);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data as ExpenseRecord[];
        }
      } catch (err) {
        console.warn('[expenseService] Remote expenses fetch failed, falling back:', err);
      }
    }

    return localExpenses.filter((e) => {
      if (params.branchId && e.branch_id !== params.branchId) return false;
      if (params.status && e.payment_status !== params.status) return false;
      if (params.startDate && e.incurred_date < params.startDate) return false;
      if (params.endDate && e.incurred_date > params.endDate) return false;
      return true;
    });
  },

  /**
   * Record a new operating expense
   */
  async recordExpense(params: {
    organizationId: string;
    branchId: string;
    categoryId?: string | null;
    categoryName: string;
    description: string;
    amount: number;
    currency?: string;
    paymentMethod: ExpensePaymentMethod;
    paymentStatus?: ExpensePaymentStatus;
    payeeName?: string | null;
    incurredDate?: string;
    receiptUrl?: string | null;
    idempotencyKey?: string | null;
  }): Promise<ExpenseRecord> {
    const incurred = params.incurredDate || new Date().toISOString().split('T')[0];
    const status = params.paymentStatus || 'paid';
    const currency = params.currency || 'USD';

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.from('expenses') as any)
          .insert({
            organization_id: params.organizationId,
            branch_id: params.branchId,
            category_id: params.categoryId || null,
            category_name: params.categoryName,
            description: params.description,
            amount: params.amount,
            currency,
            payment_method: params.paymentMethod,
            payment_status: status,
            payee_name: params.payeeName || null,
            incurred_date: incurred,
            paid_date: status === 'paid' ? incurred : null,
            receipt_url: params.receiptUrl || null,
            idempotency_key: params.idempotencyKey || null,
          })
          .select()
          .single();

        if (!error && data) {
          return data as ExpenseRecord;
        }
      } catch (err) {
        console.warn('[expenseService] Remote expense record failed, falling back:', err);
      }
    }

    const newExpense: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      category_id: params.categoryId || null,
      category_name: params.categoryName,
      description: params.description,
      amount: params.amount,
      currency,
      payment_method: params.paymentMethod,
      payment_status: status,
      payee_name: params.payeeName || null,
      supplier_id: null,
      incurred_date: incurred,
      paid_date: status === 'paid' ? incurred : null,
      receipt_url: params.receiptUrl || null,
      idempotency_key: params.idempotencyKey || null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localExpenses.unshift(newExpense);
    return newExpense;
  },

  /**
   * Cancel an expense (controlled reversal rather than silent deletion)
   */
  async cancelExpense(expenseId: string): Promise<boolean> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { error } = await (supabase.from('expenses') as any)
          .update({ payment_status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', expenseId);

        if (!error) return true;
      } catch (err) {
        console.warn('[expenseService] Remote cancel expense failed, falling back:', err);
      }
    }

    const item = localExpenses.find((e) => e.id === expenseId);
    if (item) {
      item.payment_status = 'cancelled';
      item.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  },
};
