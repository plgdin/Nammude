import { describe, it, expect } from 'vitest';
import { cashShiftService } from '@/features/financials/services/cashShiftService';

describe('Phase 6: Cash Shift Drawer Reconciliation', () => {
  const branchId = 'test-branch-cash-' + Date.now();
  const orgId = 'test-org-cash-111';

  it('opens a cash shift with a positive opening float', async () => {
    const res = await cashShiftService.openShift({
      organizationId: orgId,
      branchId,
      openingFloat: 250.0,
      notes: 'Initial morning register float',
    });

    expect(res.success).toBe(true);
    expect(res.shiftId).toBeDefined();
    expect(res.shiftNumber).toMatch(/^SHIFT-\d{8}-\d+$/);

    const activeShift = await cashShiftService.getActiveShift(branchId);
    expect(activeShift).not.toBeNull();
    expect(activeShift?.status).toBe('open');
    expect(activeShift?.opening_float).toBe(250.0);
    expect(activeShift?.expected_cash).toBe(250.0);
  });

  it('records cash-in float top-up and cash-out safe drops accurately', async () => {
    const activeShift = await cashShiftService.getActiveShift(branchId);
    expect(activeShift).not.toBeNull();
    const shiftId = activeShift!.id;

    // Record Cash In
    const inRes = await cashShiftService.recordMovement({
      shiftId,
      movementType: 'cash_in',
      amount: 100.0,
      reason: 'Additional change roll from vault',
    });
    expect(inRes.success).toBe(true);

    // Record Safe Drop
    const outRes = await cashShiftService.recordMovement({
      shiftId,
      movementType: 'cash_out',
      amount: 150.0,
      reason: 'Midday cash drop to drop box',
    });
    expect(outRes.success).toBe(true);

    // Record Petty Cash Payout
    const pettyRes = await cashShiftService.recordMovement({
      shiftId,
      movementType: 'petty_expense',
      amount: 25.0,
      reason: 'Emergency purchase of lemons',
    });
    expect(pettyRes.success).toBe(true);

    const movements = await cashShiftService.getShiftMovements(shiftId);
    expect(movements.length).toBe(3);
  });

  it('calculates expected drawer cash and flags variance correctly upon blind close', async () => {
    const activeShift = await cashShiftService.getActiveShift(branchId);
    expect(activeShift).not.toBeNull();
    const shiftId = activeShift!.id;

    // Opening Float: 250.00
    // Cash In: +100.00
    // Cash Out: -150.00
    // Petty Cash: -25.00
    // Sales: 0, Refunds: 0
    // Expected = 250 + 100 - 150 - 25 = 175.00

    // Test Shortage: Cashier counts $170.00 (-5 shortage)
    const closeRes = await cashShiftService.closeShift({
      shiftId,
      actualCash: 170.0,
      notes: 'End of shift handover with $5 minor shortage',
    });

    expect(closeRes.success).toBe(true);
    expect(closeRes.expectedCash).toBe(175.0);
    expect(closeRes.actualCash).toBe(170.0);
    expect(closeRes.variance).toBe(-5.0);
    expect(closeRes.isBalanced).toBe(false);

    // Verify shift is closed and no active shift exists for branch
    const closedShift = await cashShiftService.getActiveShift(branchId);
    expect(closedShift).toBeNull();
  });

  it('rejects further movements or re-closure on an already closed shift', async () => {
    const history = await cashShiftService.getShiftHistory(branchId, 1);
    expect(history.length).toBeGreaterThan(0);
    const closedShiftId = history[0].id;

    await expect(
      cashShiftService.recordMovement({
        shiftId: closedShiftId,
        movementType: 'cash_in',
        amount: 20.0,
        reason: 'Post-close test',
      })
    ).rejects.toThrow();
  });
});
