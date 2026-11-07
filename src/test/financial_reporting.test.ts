import { describe, it, expect } from 'vitest';
import { financialReportService } from '@/features/financials/services/financialReportService';
import { orderService } from '@/features/pos/services/orderService';
import { paymentService } from '@/features/pos/services/paymentService';

const orgId = '11111111-1111-1111-1111-111111111111';
const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const seedOrderId = '88888888-1111-0000-0000-000000000001';

describe('Phase 6: Financial Reporting & COGS Integrity', () => {
  it('calculates Net Sales correctly by deducting discounts from Gross Sales', async () => {
    const report = await financialReportService.getReport({
      organizationId: '11111111-1111-1111-1111-111111111111',
    });

    const { gross_sales, discounts, net_sales } = report.revenue;
    expect(gross_sales).toBeGreaterThan(0);
    expect(discounts).toBeGreaterThanOrEqual(0);
    expect(net_sales).toBe(gross_sales - discounts);
  });

  it('strictly excludes sales tax collected from recognized Net Sales revenue', async () => {
    const report = await financialReportService.getReport({
      organizationId: '11111111-1111-1111-1111-111111111111',
    });

    const { net_sales, tax_collected, total_billed } = report.revenue;
    // Total billed to customers = Net Sales + Tax liability
    expect(total_billed).toBe(net_sales + tax_collected);
    // Net sales does not include tax
    expect(net_sales).toBeLessThan(total_billed);
  });

  it('calculates Gross Profit and Realized COGS from stock movements, not purchases', async () => {
    const report = await financialReportService.getReport({
      organizationId: '11111111-1111-1111-1111-111111111111',
    });

    const { net_sales } = report.revenue;
    const { realized_cogs, food_cost_percentage } = report.cogs;
    const { gross_profit, gross_margin_percentage } = report.profitability;

    expect(realized_cogs).toBeGreaterThan(0);
    expect(gross_profit).toBe(net_sales - realized_cogs);
    expect(gross_margin_percentage).toBe(Number(((gross_profit / net_sales) * 100).toFixed(2)));
    expect(food_cost_percentage).toBe(Number(((realized_cogs / net_sales) * 100).toFixed(2)));
  });

  it('calculates Net Operating Profit by deducting Operating Expenses from Gross Profit', async () => {
    const report = await financialReportService.getReport({
      organizationId: '11111111-1111-1111-1111-111111111111',
    });

    const { gross_profit, operating_expenses, net_operating_profit, net_margin_percentage } =
      report.profitability;
    const { net_sales } = report.revenue;

    expect(operating_expenses).toBeGreaterThan(0);
    expect(net_operating_profit).toBe(gross_profit - operating_expenses);
    expect(net_margin_percentage).toBe(
      Number(((net_operating_profit / net_sales) * 100).toFixed(2))
    );
  });

  it('strictly quarantines simulated payments from audited real cash and bank collections', async () => {
    const report = await financialReportService.getReport({
      organizationId: '11111111-1111-1111-1111-111111111111',
    });

    const {
      real_collections_total,
      simulated_collections_total,
      refunds_total,
      net_collections,
    } = report.cash_and_collections;

    expect(real_collections_total).toBeGreaterThan(0);
    expect(simulated_collections_total).toBeGreaterThanOrEqual(0);
    // Net collections strictly counts real collections minus refunds, never inflating with simulated test payments
    expect(net_collections).toBe(real_collections_total - refunds_total);
  });

  it('derives Supplier Accounts Payable strictly from verified GRNs vs payments made', async () => {
    const report = await financialReportService.getReport({
      organizationId: '11111111-1111-1111-1111-111111111111',
    });

    const { total_invoiced, total_paid, outstanding_payable } = report.supplier_payables;
    expect(total_invoiced).toBeGreaterThan(0);
    expect(total_paid).toBeGreaterThan(0);
    expect(outstanding_payable).toBe(total_invoiced - total_paid);
  });

  it('reports zeros for an empty historical window instead of invented totals', async () => {
    const report = await financialReportService.getReport({
      organizationId: orgId,
      branchId,
      startDate: '2020-01-01',
      endDate: '2020-01-02',
    });

    expect(report.orders_count).toBe(0);
    expect(report.revenue.gross_sales).toBe(0);
    expect(report.revenue.net_sales).toBe(0);
    expect(report.cogs.realized_cogs).toBe(0);
    expect(report.profitability.operating_expenses).toBe(0);
    expect(report.cash_and_collections.real_collections_total).toBe(0);
    expect(report.cash_and_collections.refunds_total).toBe(0);
    expect(report.supplier_payables.total_invoiced).toBe(0);
  });

  it('excludes cancelled orders from recognized revenue', async () => {
    const baseline = await financialReportService.getReport({ organizationId: orgId });

    const created = await orderService.createOrder({
      organization_id: orgId,
      branch_id: branchId,
      order_type: 'takeaway',
      idempotency_key: 'finance-cancel-revenue-1',
      items: [{ menu_item_id: 'menu-item-1', quantity: 2 }],
    });
    expect(created.success).toBe(true);

    const withOrder = await financialReportService.getReport({ organizationId: orgId });
    expect(withOrder.revenue.gross_sales).toBeGreaterThan(baseline.revenue.gross_sales);
    expect(withOrder.orders_count).toBe(baseline.orders_count + 1);

    const cancelled = await orderService.cancelOrder(created.order_id, 'Customer cancelled before prep');
    expect(cancelled.success).toBe(true);

    const afterCancel = await financialReportService.getReport({ organizationId: orgId });
    expect(afterCancel.revenue.gross_sales).toBe(baseline.revenue.gross_sales);
    expect(afterCancel.orders_count).toBe(baseline.orders_count);
  });

  it('quarantines simulated gateway payments from real collections', async () => {
    const baseline = await financialReportService.getReport({ organizationId: orgId });

    const recorded = await paymentService.recordPayment({
      organization_id: orgId,
      branch_id: branchId,
      order_id: seedOrderId,
      payment_method: 'card',
      amount: 33,
      idempotency_key: 'finance-simulated-payment-1',
    });
    expect(recorded.success).toBe(true);

    const after = await financialReportService.getReport({ organizationId: orgId });
    expect(after.cash_and_collections.simulated_collections_total).toBe(
      baseline.cash_and_collections.simulated_collections_total + 33
    );
    expect(after.cash_and_collections.real_collections_total).toBe(
      baseline.cash_and_collections.real_collections_total
    );
    expect(after.cash_and_collections.net_collections).toBe(
      baseline.cash_and_collections.net_collections
    );
  });

  it('deducts real refunds from net collections', async () => {
    const baseline = await financialReportService.getReport({ organizationId: orgId });

    const refund = await paymentService.refundOrder({
      organization_id: orgId,
      branch_id: branchId,
      order_id: seedOrderId,
      amount: 5,
      reason: 'Financial report refund verification',
      approved_by: 'owner-1',
      idempotency_key: 'finance-refund-1',
    });
    expect(refund.success).toBe(true);
    expect(refund.refunded_amount).toBe(5);

    const after = await financialReportService.getReport({ organizationId: orgId });
    expect(after.cash_and_collections.refunds_total).toBe(
      baseline.cash_and_collections.refunds_total + 5
    );
    expect(after.cash_and_collections.net_collections).toBe(
      Number(
        (
          after.cash_and_collections.real_collections_total -
          after.cash_and_collections.refunds_total
        ).toFixed(2)
      )
    );
  });
});
