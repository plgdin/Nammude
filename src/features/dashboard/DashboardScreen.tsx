import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { mockDashboardData } from '@/mocks/dashboard.data';
import { mockIngredients } from '@/mocks/inventory.data';
import { BranchConfig } from '@/config/tenant.config';
import { formatCurrency, formatNumber } from '@/lib/currency';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SalesTrendChart } from './SalesTrendChart';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  UtensilsCrossed,
  Boxes,
  Clock,
  ReceiptText,
} from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { selectedBranch } = useOutletContext<{ selectedBranch: BranchConfig }>();
  const data = mockDashboardData;

  const lowStockItems = mockIngredients.filter(
    (item) => item.status === 'critical' || item.status === 'low'
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Quick Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-surface-border bg-gradient-to-r from-surface to-surface-elevated p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="info" size="sm">
              {data.reportingPeriod}
            </Badge>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-medium text-gray-300">
              Active Location: {selectedBranch.name}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
            Store Performance Overview
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time sales, payment tenders, and kitchen operational throughput.
          </p>
        </div>

        {/* Quick Launch Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            onClick={() => navigate('/pos')}
            className="flex-1 sm:flex-initial"
          >
            <UtensilsCrossed className="mr-2 h-4 w-4" />
            Launch POS
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/inventory')}
            className="flex-1 sm:flex-initial"
          >
            <Boxes className="mr-2 h-4 w-4" />
            Stock ({lowStockItems.length})
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/financials')}
            className="flex-1 sm:flex-initial"
          >
            <ReceiptText className="mr-2 h-4 w-4" />
            Financials
          </Button>
        </div>
      </div>

      {/* Primary KPI Metric Cards (Grid 1 to 4 cols) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Net Revenue */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Net Revenue</span>
            <div className="h-8 w-8 rounded-lg bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-bold text-white">
              {formatCurrency(data.netRevenue)}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Gross: {formatCurrency(data.grossSales)} • Disc: -{formatCurrency(data.discounts)}
            </p>
          </div>
        </Card>

        {/* Order Volume & AOV */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Orders & AOV</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-bold text-white">
              {data.ordersCount} <span className="text-xs font-normal text-gray-400">tickets</span>
            </p>
            <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Avg Order Value: {formatCurrency(data.averageOrderValue)}
            </p>
          </div>
        </Card>

        {/* Payments Collected */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Payments Collected</span>
            <div className="h-8 w-8 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-bold text-white">
              {formatCurrency(data.paymentsCollectedTotal)}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Incl. {formatCurrency(data.taxCollected)} Sales Tax (8.25%)
            </p>
          </div>
        </Card>

        {/* Operating Expenses */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Daily OPEX</span>
            <div className="h-8 w-8 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-bold text-white">
              {formatCurrency(data.operatingExpensesToday)}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Petty cash receipts & logistics
            </p>
          </div>
        </Card>
      </div>

      {/* Middle Section: Sales Velocity Chart & Tender Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Velocity Chart (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Trend & Order Volume</CardTitle>
            <p className="text-xs text-gray-400">
              Rolling 7-day revenue performance across {selectedBranch.name}
            </p>
          </CardHeader>
          <CardContent>
            <SalesTrendChart data={data.salesTrend7Days} />
          </CardContent>
        </Card>

        {/* Payment Methods & Tender Mix (1 col) */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Tender Mix</CardTitle>
            <p className="text-xs text-gray-400">Verified shift settlement breakdown</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.paymentsByMethod.map((tender) => (
              <div key={tender.method} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-gray-200">{tender.method}</span>
                  <span className="text-gray-400">
                    {formatCurrency(tender.amount)} ({tender.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-active overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all"
                    style={{ width: `${tender.percentage}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="mt-6 pt-4 border-t border-surface-border">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Total Reconciled</span>
                <span className="font-semibold text-white">
                  {formatCurrency(data.paymentsCollectedTotal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lower Section: Stock Alerts & Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Alerts (1 col) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Stock & Expiry Alerts</CardTitle>
              <p className="text-xs text-gray-400">Ingredients requiring replenishment</p>
            </div>
            <Badge variant="warning" size="sm">
              {lowStockItems.length} Warnings
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-surface-border bg-surface-elevated/60"
              >
                <div>
                  <p className="text-xs font-medium text-white truncate max-w-[180px]">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {item.currentStock} {item.unit} remaining (Reorder at {item.reorderLevel})
                  </p>
                </div>
                <Badge
                  variant={item.status === 'critical' ? 'danger' : 'warning'}
                  size="sm"
                >
                  {item.status.toUpperCase()}
                </Badge>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => navigate('/inventory')}
            >
              Open Inventory Console <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>

        {/* Best Sellers (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Selling Menu Items</CardTitle>
            <p className="text-xs text-gray-400">Highest volume items sold today</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-border text-gray-400 pb-2">
                    <th className="py-2 font-medium">Item</th>
                    <th className="py-2 font-medium">Category</th>
                    <th className="py-2 font-medium text-right">Units Sold</th>
                    <th className="py-2 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {data.bestSellers.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-surface-elevated/40 transition-colors">
                      <td className="py-2.5 font-medium text-white flex items-center gap-2">
                        <span className="text-gray-500 font-mono text-[11px]">{idx + 1}.</span>
                        {item.name}
                      </td>
                      <td className="py-2.5 text-gray-400">{item.category}</td>
                      <td className="py-2.5 text-right font-medium text-gray-200">
                        {formatNumber(item.unitsSold)}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-white">
                        {formatCurrency(item.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Stream */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders Stream</CardTitle>
            <p className="text-xs text-gray-400">Live order activity at {selectedBranch.name}</p>
          </div>
          <Badge variant="neutral" size="sm">
            Live Stream
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-border text-gray-400 pb-2">
                  <th className="py-2 font-medium">Order</th>
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 font-medium">Table</th>
                  <th className="py-2 font-medium">Items</th>
                  <th className="py-2 font-medium text-right">Total</th>
                  <th className="py-2 font-medium text-center">Status</th>
                  <th className="py-2 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data.recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="py-3 font-semibold text-white">{ord.orderNumber}</td>
                    <td className="py-3 text-gray-300">{ord.type}</td>
                    <td className="py-3 text-gray-300">{ord.table || '-'}</td>
                    <td className="py-3 text-gray-400">{ord.itemCount} items</td>
                    <td className="py-3 text-right font-semibold text-white">
                      {formatCurrency(ord.totalAmount)}
                    </td>
                    <td className="py-3 text-center">
                      <Badge
                        variant={
                          ord.status === 'Completed'
                            ? 'success'
                            : ord.status === 'In Kitchen'
                            ? 'warning'
                            : 'info'
                        }
                        size="sm"
                      >
                        {ord.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right text-gray-400 flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />
                      {ord.timeAgo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
