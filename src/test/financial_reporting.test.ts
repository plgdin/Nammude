import { describe, it, expect } from 'vitest';
import { financialReportService } from '@/features/financials/services/financialReportService';

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
    expect(simulated_collections_total).toBeGreaterThan(0);
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
});
