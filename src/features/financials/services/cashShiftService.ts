import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { CashShiftRecord, CashShiftMovement, CashShiftMovementType } from '../types';

let localShifts: CashShiftRecord[] = [
  {
    id: 's1111111-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    opened_by: null,
    closed_by: null,
    shift_number: 'SHIFT-20261023-101',
    opened_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    closed_at: null,
    opening_float: 250.0,
    cash_sales_amount: 520.0,
    cash_refunds_amount: 0.0,
    cash_in_amount: 50.0,
    cash_out_amount: 0.0,
    cash_expenses_amount: 25.0,
    expected_cash: 795.0,
    actual_cash: null,
    variance: null,
    status: 'open',
    notes: 'Morning shift drawer',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let localMovements: CashShiftMovement[] = [
  {
    id: 'm1111111-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    cash_shift_id: 's1111111-0000-0000-0000-000000000001',
    movement_type: 'cash_in',
    amount: 50.0,
    reason: 'Additional change roll from safe',
    performed_by: null,
    idempotency_key: null,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'm1111111-0000-0000-0000-000000000002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    cash_shift_id: 's1111111-0000-0000-0000-000000000001',
    movement_type: 'petty_expense',
    amount: 25.0,
    reason: 'Emergency ice bag purchase for bar',
    performed_by: null,
    idempotency_key: null,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export const cashShiftService = {
  /**
   * Get active open shift for branch
   */
  async getActiveShift(branchId: string): Promise<CashShiftRecord | null> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await supabase
          .from('cash_shifts')
          .select('*')
          .eq('branch_id', branchId)
          .eq('status', 'open')
          .maybeSingle();

        if (!error && data) {
          return data as CashShiftRecord;
        }
      } catch (err) {
        console.warn('[cashShiftService] Remote active shift fetch failed, falling back:', err);
      }
    }
    return localShifts.find((s) => s.branch_id === branchId && s.status === 'open') || null;
  },

  /**
   * Open a new cash drawer session
   */
  async openShift(params: {
    organizationId: string;
    branchId: string;
    openingFloat: number;
    notes?: string;
  }): Promise<{ success: boolean; shiftId: string; shiftNumber: string; message?: string }> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.rpc as any)('open_cash_shift', {
          p_organization_id: params.organizationId,
          p_branch_id: params.branchId,
          p_opening_float: params.openingFloat,
          p_notes: params.notes || null,
        });

        if (!error && data) {
          const res = data as any;
          return {
            success: true,
            shiftId: res.shift_id,
            shiftNumber: res.shift_number,
            message: res.message,
          };
        }
      } catch (err) {
        console.warn('[cashShiftService] Remote open_cash_shift failed, falling back:', err);
      }
    }

    const existing = localShifts.find((s) => s.branch_id === params.branchId && s.status === 'open');
    if (existing) {
      return {
        success: true,
        shiftId: existing.id,
        shiftNumber: existing.shift_number,
        message: 'An open shift is already active.',
      };
    }

    const seq = localShifts.filter((s) => s.branch_id === params.branchId).length + 101;
    const shiftNumber = `SHIFT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${seq}`;
    const newShift: CashShiftRecord = {
      id: `shift-${Date.now()}`,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      opened_by: null,
      closed_by: null,
      shift_number: shiftNumber,
      opened_at: new Date().toISOString(),
      closed_at: null,
      opening_float: params.openingFloat,
      cash_sales_amount: 0,
      cash_refunds_amount: 0,
      cash_in_amount: 0,
      cash_out_amount: 0,
      cash_expenses_amount: 0,
      expected_cash: params.openingFloat,
      actual_cash: null,
      variance: null,
      status: 'open',
      notes: params.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localShifts.unshift(newShift);

    return {
      success: true,
      shiftId: newShift.id,
      shiftNumber: newShift.shift_number,
    };
  },

  /**
   * Record drawer cash movement (cash-in, cash-out, petty expense)
   */
  async recordMovement(params: {
    shiftId: string;
    movementType: CashShiftMovementType;
    amount: number;
    reason: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; movementId: string }> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.rpc as any)('record_shift_cash_movement', {
          p_shift_id: params.shiftId,
          p_movement_type: params.movementType,
          p_amount: params.amount,
          p_reason: params.reason,
          p_idempotency_key: params.idempotencyKey || null,
        });

        if (!error && data) {
          const res = data as any;
          return { success: true, movementId: res.movement_id };
        }
      } catch (err) {
        console.warn('[cashShiftService] Remote record_shift_cash_movement failed, falling back:', err);
      }
    }

    const shift = localShifts.find((s) => s.id === params.shiftId);
    if (!shift) {
      throw new Error(`Shift ${params.shiftId} not found`);
    }
    if (shift.status !== 'open') {
      throw new Error(`Cannot record cash movement on a closed cash shift (status: ${shift.status})`);
    }

    const mov: CashShiftMovement = {
      id: `mov-${Date.now()}`,
      organization_id: shift.organization_id,
      branch_id: shift.branch_id,
      cash_shift_id: params.shiftId,
      movement_type: params.movementType,
      amount: params.amount,
      reason: params.reason,
      performed_by: null,
      idempotency_key: params.idempotencyKey || null,
      created_at: new Date().toISOString(),
    };
    localMovements.push(mov);

    if (params.movementType === 'cash_in') {
      shift.cash_in_amount += params.amount;
    } else if (params.movementType === 'cash_out') {
      shift.cash_out_amount += params.amount;
    } else if (params.movementType === 'petty_expense') {
      shift.cash_expenses_amount += params.amount;
    }
    shift.updated_at = new Date().toISOString();

    return { success: true, movementId: mov.id };
  },

  /**
   * Close active cash shift with blind count and variance calculation
   */
  async closeShift(params: {
    shiftId: string;
    actualCash: number;
    notes?: string;
  }): Promise<{
    success: boolean;
    expectedCash: number;
    actualCash: number;
    variance: number;
    isBalanced: boolean;
  }> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.rpc as any)('close_cash_shift', {
          p_shift_id: params.shiftId,
          p_actual_cash: params.actualCash,
          p_notes: params.notes || null,
        });

        if (!error && data) {
          const res = data as any;
          return {
            success: true,
            expectedCash: Number(res.expected_cash),
            actualCash: Number(res.actual_cash),
            variance: Number(res.variance),
            isBalanced: Boolean(res.is_balanced),
          };
        }
      } catch (err) {
        console.warn('[cashShiftService] Remote close_cash_shift failed, falling back:', err);
      }
    }

    const shift = localShifts.find((s) => s.id === params.shiftId);
    if (!shift) {
      throw new Error(`Shift ${params.shiftId} not found`);
    }
    if (shift.status !== 'open') {
      throw new Error(`Shift ${params.shiftId} is already closed`);
    }

    // Formula: Opening Float + Cash Sales - Cash Refunds + Cash In - Cash Out - Cash Expenses
    const expected =
      shift.opening_float +
      shift.cash_sales_amount -
      shift.cash_refunds_amount +
      shift.cash_in_amount -
      shift.cash_out_amount -
      shift.cash_expenses_amount;

    const variance = Number((params.actualCash - expected).toFixed(4));

    shift.closed_at = new Date().toISOString();
    shift.actual_cash = params.actualCash;
    shift.expected_cash = Number(expected.toFixed(4));
    shift.variance = variance;
    shift.status = 'closed';
    if (params.notes) shift.notes = params.notes;
    shift.updated_at = new Date().toISOString();

    return {
      success: true,
      expectedCash: shift.expected_cash,
      actualCash: params.actualCash,
      variance,
      isBalanced: variance === 0,
    };
  },

  /**
   * Fetch movements for a shift
   */
  async getShiftMovements(shiftId: string): Promise<CashShiftMovement[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await supabase
          .from('cash_shift_movements')
          .select('*')
          .eq('cash_shift_id', shiftId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          return data as CashShiftMovement[];
        }
      } catch (err) {
        console.warn('[cashShiftService] Remote shift movements fetch failed, falling back:', err);
      }
    }
    return localMovements.filter((m) => m.cash_shift_id === shiftId);
  },

  /**
   * Fetch recent shift history for branch
   */
  async getShiftHistory(branchId: string, limit = 10): Promise<CashShiftRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await supabase
          .from('cash_shifts')
          .select('*')
          .eq('branch_id', branchId)
          .order('opened_at', { ascending: false })
          .limit(limit);

        if (!error && data) {
          return data as CashShiftRecord[];
        }
      } catch (err) {
        console.warn('[cashShiftService] Remote shift history fetch failed, falling back:', err);
      }
    }
    return localShifts.filter((s) => s.branch_id === branchId).slice(0, limit);
  },
};
