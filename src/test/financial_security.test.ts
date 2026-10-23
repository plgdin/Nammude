import { describe, it, expect } from 'vitest';
import { expenseService } from '@/features/financials/services/expenseService';

describe('Phase 6: Expense Management & Audit Trails', () => {
  const orgA = 'test-org-exp-A';
  const branchA = 'test-branch-exp-A1';

  it('records operating expense with required audit metadata', async () => {
    const expense = await expenseService.recordExpense({
      organizationId: orgA,
      branchId: branchA,
      categoryName: 'Kitchen Supplies',
      description: 'Case of food-grade parchment paper',
      amount: 45.99,
      paymentMethod: 'card',
      paymentStatus: 'paid',
      payeeName: 'Restaurant Supply Warehouse',
      idempotencyKey: 'idemp-exp-' + Date.now(),
    });

    expect(expense.id).toBeDefined();
    expect(expense.organization_id).toBe(orgA);
    expect(expense.branch_id).toBe(branchA);
    expect(expense.amount).toBe(45.99);
    expect(expense.payment_status).toBe('paid');
    expect(expense.created_at).toBeDefined();
  });

  it('cancels expense without destroying historical audit record', async () => {
    const expense = await expenseService.recordExpense({
      organizationId: orgA,
      branchId: branchA,
      categoryName: 'Utilities',
      description: 'Duplicate water bill payment',
      amount: 110.0,
      paymentMethod: 'bank_transfer',
      paymentStatus: 'paid',
    });

    const success = await expenseService.cancelExpense(expense.id);
    expect(success).toBe(true);

    const cancelledList = await expenseService.getExpenses({
      organizationId: orgA,
      status: 'cancelled',
    });

    const found = cancelledList.find((e) => e.id === expense.id);
    expect(found).toBeDefined();
    expect(found?.payment_status).toBe('cancelled');
  });

  it('filters expenses correctly by branch and date range', async () => {
    const today = new Date().toISOString().split('T')[0];
    const results = await expenseService.getExpenses({
      organizationId: orgA,
      branchId: branchA,
      startDate: today,
      endDate: today,
    });

    for (const item of results) {
      expect(item.branch_id).toBe(branchA);
      expect(item.incurred_date).toBe(today);
    }
  });
});
