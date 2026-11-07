import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { FinancialReport } from '../types';
import { orderService } from '@/features/pos/services/orderService';
import { paymentService } from '@/features/pos/services/paymentService';
import { expenseService } from './expenseService';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { purchasingService } from '@/features/inventory/services/purchasingService';

const money = (value: number) => Number(value.toFixed(2));

const percent = (part: number, whole: number) =>
  whole > 0 ? Number(((part / whole) * 100).toFixed(2)) : 0;

/** Payments recorded through the local simulated gateway are quarantined from real collections. */
const isSimulatedPayment = (payment: { reference_number?: string | null }) =>
  /^SIM-/i.test(payment.reference_number || '');

export const financialReportService = {
  /**
   * Corrected COGS Engine: Strictly deducts stock reversals for cancelled orders.
   * Only returns attributable to order cancellations (reference_type = 'order_reversal')
   * are subtracted from gross sale consumptions.
   */
  calculateRealizedCOGS(
    movements: Array<{
      movement_type: string;
      reference_type?: string | null;
      total_cost: number;
    }>
  ): number {
    let cogs = 0.0;
    for (const mov of movements) {
      if (mov.movement_type === 'sale_consumption') {
        cogs += mov.total_cost;
      } else if (mov.movement_type === 'return' && mov.reference_type === 'order_reversal') {
        cogs -= mov.total_cost;
      }
    }
    return Math.max(0, money(cogs));
  },

  /**
   * Corrected Supplier AP Engine: Accumulates all eligible verified liabilities
   * and disbursements up to the target end date (cumulative as of date),
   * preventing prior-period liabilities from being discarded by report window start date.
   */
  calculateCumulativeSupplierAP(
    receipts: Array<{ total_amount: number; status: string; received_at: string }>,
    payments: Array<{ amount: number; payment_date: string }>,
    asOfDate: string
  ): {
    cumulativeInvoiced: number;
    cumulativePaid: number;
    outstandingPayable: number;
  } {
    const endTarget = asOfDate.split('T')[0];

    const cumInvoiced = receipts
      .filter((r) => r.status === 'verified' && r.received_at.split('T')[0] <= endTarget)
      .reduce((sum, r) => sum + r.total_amount, 0);

    const cumPaid = payments
      .filter((p) => p.payment_date.split('T')[0] <= endTarget)
      .reduce((sum, p) => sum + p.amount, 0);

    const outstanding = Math.max(0, money(cumInvoiced - cumPaid));

    return {
      cumulativeInvoiced: money(cumInvoiced),
      cumulativePaid: money(cumPaid),
      outstandingPayable: outstanding,
    };
  },

  /**
   * Build the report from authoritative source records:
   * orders (revenue), stock movements (COGS/waste), expenses (OPEX),
   * payments + refunds (collections), verified GRNs + supplier payments (AP).
   * No invented totals: an empty window reports zeros.
   */
  async getReport(params: {
    organizationId: string;
    branchId?: string | null;
    startDate?: string;
    endDate?: string;
  }): Promise<FinancialReport> {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const start = params.startDate || thirtyDaysAgo;
    const end = params.endDate || today;

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.rpc as any)('get_financial_report', {
          p_organization_id: params.organizationId,
          p_branch_id: params.branchId || null,
          p_start_date: start,
          p_end_date: end,
        });

        if (!error && data) {
          return data as unknown as FinancialReport;
        }
      } catch (err) {
        console.warn('[financialReportService] Remote RPC failed, aggregating source records:', err);
      }
    }

    const [orders, payments, refunds, expenses, movements, receipts, supplierPayments] =
      await Promise.all([
        orderService.getOrdersForReport({
          organizationId: params.organizationId,
          branchId: params.branchId || null,
          startDate: start,
          endDate: end,
        }),
        paymentService.getPaymentsForReport({
          organizationId: params.organizationId,
          branchId: params.branchId || null,
          startDate: start,
          endDate: end,
        }),
        paymentService.getRefundsForReport({
          organizationId: params.organizationId,
          startDate: start,
          endDate: end,
        }),
        expenseService.getExpenses({
          organizationId: params.organizationId,
          branchId: params.branchId || undefined,
          startDate: start,
          endDate: end,
        }),
        inventoryService.getMovementsForReport({
          organizationId: params.organizationId,
          branchId: params.branchId || null,
          startDate: start,
          endDate: end,
        }),
        purchasingService.getGoodsReceiptsForReport({
          organizationId: params.organizationId,
          branchId: params.branchId || null,
          asOfDate: end,
        }),
        purchasingService.getSupplierPaymentsForReport({
          organizationId: params.organizationId,
          branchId: params.branchId || null,
          asOfDate: end,
        }),
      ]);

    // --- Revenue (cancelled and draft orders are not recognized sales) ---
    const recognizedOrders = orders.filter(
      (o) => o.status !== 'cancelled' && o.status !== 'draft'
    );

    const grossSales = money(recognizedOrders.reduce((sum, o) => sum + Number(o.subtotal_amount), 0));
    const discounts = money(recognizedOrders.reduce((sum, o) => sum + Number(o.discount_amount), 0));
    const taxCollected = money(recognizedOrders.reduce((sum, o) => sum + Number(o.tax_amount), 0));
    const serviceCharges = money(
      recognizedOrders.reduce((sum, o) => sum + Number(o.service_charge_amount), 0)
    );
    const netSales = money(grossSales - discounts);
    const totalBilled = money(netSales + taxCollected + serviceCharges);

    // --- COGS / waste from the perpetual stock ledger ---
    const realizedCogs = this.calculateRealizedCOGS(movements);
    const wastedLoss = money(
      movements
        .filter((m) => m.movement_type === 'waste')
        .reduce((sum, m) => sum + Number(m.total_cost), 0)
    );
    const grossProfit = money(netSales - realizedCogs);
    const grossMarginPct = percent(grossProfit, netSales);
    const foodCostPct = percent(realizedCogs, netSales);

    // --- Operating expenses (cancelled expenses excluded) ---
    const activeExpenses = expenses.filter((e) => e.payment_status !== 'cancelled');
    const opex = money(activeExpenses.reduce((sum, e) => sum + Number(e.amount), 0));
    const operatingExpensesBreakdown: Record<string, number> = {};
    for (const expense of activeExpenses) {
      operatingExpensesBreakdown[expense.category_name] =
        money((operatingExpensesBreakdown[expense.category_name] || 0) + Number(expense.amount));
    }
    const netOperatingProfit = money(grossProfit - opex);
    const netMarginPct = percent(netOperatingProfit, netSales);

    // --- Collections: real vs simulated gateway, net of real refunds ---
    const capturedPayments = payments.filter(
      (p) => p.status === 'completed' || p.status === 'refunded'
    );
    const realPayments = capturedPayments.filter((p) => !isSimulatedPayment(p));
    const simulatedPayments = capturedPayments.filter((p) => isSimulatedPayment(p));

    const realCollections = money(realPayments.reduce((sum, p) => sum + Number(p.amount), 0));
    const simulatedCollections = money(
      simulatedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    );

    const simulatedPaymentIds = new Set(simulatedPayments.map((p) => p.id));
    const refundsTotal = money(
      refunds
        .filter((r) => !simulatedPaymentIds.has(r.payment_id))
        .reduce((sum, r) => sum + Number(r.refund_amount), 0)
    );

    const byPaymentMethod: Record<string, number> = {};
    for (const payment of realPayments) {
      byPaymentMethod[payment.payment_method] = money(
        (byPaymentMethod[payment.payment_method] || 0) + Number(payment.amount)
      );
    }

    // --- Supplier payables: verified GRNs cumulative vs disbursements ---
    const ap = this.calculateCumulativeSupplierAP(receipts, supplierPayments, end);

    return {
      organization_id: params.organizationId,
      branch_id: params.branchId || null,
      start_date: start,
      end_date: end,
      orders_count: recognizedOrders.length,
      revenue: {
        gross_sales: grossSales,
        discounts,
        tax_collected: taxCollected,
        net_sales: netSales,
        total_billed: totalBilled,
      },
      cogs: {
        realized_cogs: realizedCogs,
        wasted_loss: wastedLoss,
        food_cost_percentage: foodCostPct,
      },
      profitability: {
        gross_profit: grossProfit,
        gross_margin_percentage: grossMarginPct,
        operating_expenses: opex,
        net_operating_profit: netOperatingProfit,
        net_margin_percentage: netMarginPct,
      },
      cash_and_collections: {
        real_collections_total: realCollections,
        simulated_collections_total: simulatedCollections,
        refunds_total: refundsTotal,
        net_collections: money(realCollections - refundsTotal),
        by_payment_method: byPaymentMethod,
      },
      operating_expenses_breakdown: operatingExpensesBreakdown,
      supplier_payables: {
        total_invoiced: ap.cumulativeInvoiced,
        total_paid: ap.cumulativePaid,
        outstanding_payable: ap.outstandingPayable,
      },
    };
  },
};
