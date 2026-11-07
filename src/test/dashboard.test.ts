import { describe, it, expect } from 'vitest';
import { dashboardService } from '@/features/dashboard/services/dashboardService';

const orgId = '11111111-1111-1111-1111-111111111111';
const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('Dashboard: live aggregation', () => {
  it('builds a 7-day sales trend ending today', async () => {
    const data = await dashboardService.getDashboardData({
      organizationId: orgId,
      branchId,
    });

    expect(data.salesTrend7Days).toHaveLength(7);
    expect(data.salesTrend7Days[6].day).toBe('Today');
    for (const day of data.salesTrend7Days) {
      expect(day.netSales).toBeGreaterThanOrEqual(0);
      expect(day.orderCount).toBeGreaterThanOrEqual(0);
    }
    // Today's trend net must match the financial report net sales.
    expect(data.salesTrend7Days[6].netSales).toBe(data.reportToday.revenue.net_sales);
    expect(data.salesTrend7Days[6].orderCount).toBe(data.reportToday.orders_count);
  });

  it('derives KPIs from the financial report', async () => {
    const data = await dashboardService.getDashboardData({
      organizationId: orgId,
      branchId,
    });

    const expectedAov =
      data.reportToday.orders_count > 0
        ? Number((data.reportToday.revenue.net_sales / data.reportToday.orders_count).toFixed(2))
        : 0;
    expect(data.averageOrderValue).toBe(expectedAov);
    expect(data.reportToday.revenue.net_sales).toBeGreaterThanOrEqual(0);
  });

  it('reports low-stock items from inventory service', async () => {
    const data = await dashboardService.getDashboardData({
      organizationId: orgId,
      branchId,
    });
    for (const item of data.lowStockItems) {
      expect(['low', 'critical']).toContain(item.status);
    }
    expect(data.lowStockItems.length).toBeLessThanOrEqual(5);
  });

  it('surfaces pending OCR reviews and staff tasks', async () => {
    const data = await dashboardService.getDashboardData({
      organizationId: orgId,
      branchId,
    });
    expect(data.pendingOcrCount).toBeGreaterThanOrEqual(0);
    expect(data.pendingTasksCount).toBeGreaterThanOrEqual(0);
  });

  it('returns empty arrays for unknown branches instead of mock data', async () => {
    const data = await dashboardService.getDashboardData({
      organizationId: orgId,
      branchId: '00000000-0000-0000-0000-000000000000',
    });
    expect(data.reportToday.orders_count).toBe(0);
    expect(data.reportToday.revenue.net_sales).toBe(0);
    expect(data.recentOrders).toHaveLength(0);
    expect(data.bestSellers).toHaveLength(0);
  });
});
