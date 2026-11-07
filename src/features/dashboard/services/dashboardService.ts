import { financialReportService } from '@/features/financials/services/financialReportService';
import { FinancialReport } from '@/features/financials/types';
import { orderService } from '@/features/pos/services/orderService';
import { paymentService } from '@/features/pos/services/paymentService';
import { menuService } from '@/features/pos/services/menuService';
import { tableService } from '@/features/pos/services/tableService';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { IngredientRecord } from '@/features/inventory/types';
import { documentService } from '@/features/ocr/services/documentService';
import { checklistService } from '@/features/checklists/services/checklistService';
import { OrderRecord, OrderItemRecord } from '@/features/pos/types';

export interface SalesTrendDay {
  day: string;
  date: string;
  netSales: number;
  orderCount: number;
}

export interface TenderMix {
  method: string;
  amount: number;
  percentage: number;
}

export interface BestSeller {
  id: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
}

export interface RecentOrderView {
  id: string;
  orderNumber: string;
  type: string;
  table?: string;
  itemCount: number;
  totalAmount: number;
  status: string;
  timeAgo: string;
}

export interface DashboardData {
  reportToday: FinancialReport;
  salesTrend7Days: SalesTrendDay[];
  tenderMix: TenderMix[];
  averageOrderValue: number;
  lowStockItems: IngredientRecord[];
  pendingOcrCount: number;
  pendingTasksCount: number;
  bestSellers: BestSeller[];
  recentOrders: RecentOrderView[];
}

const money = (value: number) => Number(value.toFixed(2));

const dayLabel = (date: Date, indexFromEnd: number) =>
  indexFromEnd === 0
    ? 'Today'
    : date.toLocaleDateString('en-US', { weekday: 'short' });

const dateLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const toDateString = (date: Date) => date.toISOString().split('T')[0];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine-In',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
  qr_self_order: 'QR Self-Order',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  in_prep: 'In Kitchen',
  ready: 'Ready to Serve',
  served: 'Served',
  completed: 'Completed',
  cancelled: 'Cancelled',
  draft: 'Draft',
};

export const dashboardService = {
  async getDashboardData(params: {
    organizationId: string;
    branchId: string;
  }): Promise<DashboardData> {
    const today = new Date();
    const todayStr = toDateString(today);
    const weekStart = toDateString(new Date(today.getTime() - 6 * 86400000));

    const [reportToday, weekOrders, todayPayments, ingredients, documents, checklistInstances] =
      await Promise.all([
        financialReportService.getReport({
          organizationId: params.organizationId,
          branchId: params.branchId,
          startDate: todayStr,
          endDate: todayStr,
        }),
        orderService.getOrdersForReport({
          organizationId: params.organizationId,
          branchId: params.branchId,
          startDate: weekStart,
          endDate: todayStr,
        }),
        paymentService.getPaymentsForReport({
          organizationId: params.organizationId,
          branchId: params.branchId,
          startDate: todayStr,
          endDate: todayStr,
        }),
        inventoryService.getIngredients(params.branchId, params.organizationId),
        documentService
          .getDocuments({ organizationId: params.organizationId, branchId: params.branchId })
          .catch(() => []),
        checklistService.getInstances(params.branchId, todayStr).catch(() => []),
      ]);

    const recognized = weekOrders.filter(
      (o) => o.status !== 'cancelled' && o.status !== 'draft'
    );

    // 7-day trend from recognized orders (net = subtotal - discount).
    const salesTrend7Days: SalesTrendDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today.getTime() - i * 86400000);
      const dayStr = toDateString(day);
      const dayOrders = recognized.filter((o) => o.created_at.slice(0, 10) === dayStr);
      const net = money(
        dayOrders.reduce((sum, o) => sum + Number(o.subtotal_amount) - Number(o.discount_amount), 0)
      );
      salesTrend7Days.push({
        day: dayLabel(day, i),
        date: dateLabel(day),
        netSales: net,
        orderCount: dayOrders.length,
      });
    }

    // Tender mix from today's captured real payments (simulated quarantined).
    const captured = todayPayments.filter(
      (p) => p.status === 'completed' || p.status === 'refunded'
    );
    const realPayments = captured.filter((p) => !/^SIM-/i.test(p.reference_number || ''));
    const tenderTotals = new Map<string, number>();
    for (const payment of realPayments) {
      tenderTotals.set(
        payment.payment_method,
        (tenderTotals.get(payment.payment_method) || 0) + Number(payment.amount)
      );
    }
    const tenderTotal = [...tenderTotals.values()].reduce((sum, v) => sum + v, 0);
    const tenderMix: TenderMix[] = [...tenderTotals.entries()]
      .map(([method, amount]) => ({
        method,
        amount: money(amount),
        percentage: tenderTotal > 0 ? Number(((amount / tenderTotal) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const ordersCount = reportToday.orders_count;
    const averageOrderValue =
      ordersCount > 0 ? money(reportToday.revenue.net_sales / ordersCount) : 0;

    const lowStockItems = ingredients
      .filter((i) => i.status === 'critical' || i.status === 'low')
      .slice(0, 5);

    const pendingOcrCount = documents.filter((d) =>
      ['uploaded', 'queued', 'processing', 'needs_review'].includes(d.status)
    ).length;

    const pendingTasksCount = checklistInstances.filter(
      (c) => c.status !== 'completed'
    ).length;

    // Recent orders today + item counts + table labels.
    const todayOrders = recognized
      .filter((o) => o.created_at.slice(0, 10) === todayStr)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const [todayItems, tables, menuItems, categories] = await Promise.all([
      orderService.getOrderItemsForOrders(todayOrders.map((o) => o.id)),
      tableService.getTablesByBranch(params.branchId).catch(() => []),
      menuService.getMenuItems(params.organizationId).catch(() => []),
      menuService.getCategories(params.organizationId).catch(() => []),
    ]);

    const itemCountByOrder = new Map<string, number>();
    for (const item of todayItems) {
      itemCountByOrder.set(
        item.order_id,
        (itemCountByOrder.get(item.order_id) || 0) + Number(item.quantity)
      );
    }
    const tableNumberById = new Map(tables.map((t) => [t.id, t.table_number]));

    const recentOrders: RecentOrderView[] = todayOrders.slice(0, 5).map((o: OrderRecord) => ({
      id: o.id,
      orderNumber: o.order_number,
      type: ORDER_TYPE_LABELS[o.order_type] || o.order_type,
      table: o.table_id ? tableNumberById.get(o.table_id) : undefined,
      itemCount: itemCountByOrder.get(o.id) || 0,
      totalAmount: Number(o.total_amount),
      status: ORDER_STATUS_LABELS[o.status] || o.status,
      timeAgo: timeAgo(o.created_at),
    }));

    // Best sellers from today's line items.
    const menuById = new Map(menuItems.map((m) => [m.id, m]));
    const categoryById = new Map(categories.map((c) => [c.id, c.name]));
    const sellerMap = new Map<string, BestSeller & { key: string }>();
    for (const item of todayItems as OrderItemRecord[]) {
      const menu = menuById.get(item.menu_item_id);
      const name = menu?.name || item.item_name || item.menu_item_id;
      const category = menu ? categoryById.get(menu.category_id) || 'Menu' : 'Menu';
      const existing = sellerMap.get(item.menu_item_id);
      if (existing) {
        existing.unitsSold += Number(item.quantity);
        existing.revenue = money(existing.revenue + Number(item.total_price));
      } else {
        sellerMap.set(item.menu_item_id, {
          key: item.menu_item_id,
          id: item.menu_item_id,
          name,
          category,
          unitsSold: Number(item.quantity),
          revenue: money(Number(item.total_price)),
        });
      }
    }
    const bestSellers = [...sellerMap.values()]
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5)
      .map(({ key: _key, ...rest }) => rest);

    return {
      reportToday,
      salesTrend7Days,
      tenderMix,
      averageOrderValue,
      lowStockItems,
      pendingOcrCount,
      pendingTasksCount,
      bestSellers,
      recentOrders,
    };
  },
};
