import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BranchConfig } from '@/config/tenant.config';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { formatCurrency } from '@/lib/currency';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { financialReportService } from './services/financialReportService';
import { expenseService } from './services/expenseService';
import { cashShiftService } from './services/cashShiftService';
import { FinancialReport, ExpenseRecord, CashShiftRecord } from './types';
import { ExpenseModal } from './ExpenseModal';
import { CashShiftModal } from './CashShiftModal';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  Scale,
  ArrowDownRight,
  AlertTriangle,
  Plus,
  RefreshCw,
  Lock,
  Building,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export const FinancialsScreen: React.FC = () => {
  const { selectedBranch } = useOutletContext<{ selectedBranch: BranchConfig }>();
  const { currentOrganization, permittedBranches } = useOrganization();

  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days'>('30days');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(selectedBranch?.id || '');
  const [activeTab, setActiveTab] = useState<'statement' | 'cash_shifts' | 'expenses' | 'tenders_payables'>('statement');

  const [report, setReport] = useState<FinancialReport | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [activeShift, setActiveShift] = useState<CashShiftRecord | null>(null);
  const [shiftHistory, setShiftHistory] = useState<CashShiftRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [cashModalConfig, setCashModalConfig] = useState<{
    isOpen: boolean;
    mode: 'open' | 'movement' | 'close';
  }>({ isOpen: false, mode: 'open' });

  const orgId = currentOrganization?.id || '11111111-1111-1111-1111-111111111111';
  const effectiveBranchId = selectedBranchId || selectedBranch?.id || '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      let start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      if (dateRange === 'today') {
        start = today;
      } else if (dateRange === '7days') {
        start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      }

      const [repData, expData, shiftData, historyData] = await Promise.all([
        financialReportService.getReport({
          organizationId: orgId,
          branchId: effectiveBranchId === 'ALL' ? null : effectiveBranchId,
          startDate: start,
          endDate: today,
        }),
        expenseService.getExpenses({
          organizationId: orgId,
          branchId: effectiveBranchId === 'ALL' ? undefined : effectiveBranchId,
          startDate: start,
          endDate: today,
        }),
        cashShiftService.getActiveShift(effectiveBranchId === 'ALL' ? selectedBranch?.id || '' : effectiveBranchId),
        cashShiftService.getShiftHistory(effectiveBranchId === 'ALL' ? selectedBranch?.id || '' : effectiveBranchId, 10),
      ]);

      setReport(repData);
      setExpenses(expData);
      setActiveShift(shiftData);
      setShiftHistory(historyData);
    } catch (err) {
      console.error('[FinancialsScreen] Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, effectiveBranchId, dateRange, selectedBranch?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancelExpense = async (id: string) => {
    if (confirm('Cancel this recorded expense? This will be recorded as a cancellation rather than deleting historical audit trail.')) {
      await expenseService.cancelExpense(id);
      fetchData();
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-surface-border bg-gradient-to-r from-surface to-surface-elevated p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="info" size="sm">
              Phase 6 Accounting Core
            </Badge>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-medium text-gray-300">
              {currentOrganization?.name || 'Restaurant Organization'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-brand" />
            Financial Management & Reporting
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Accrual Net Sales, Realized Inventory COGS, Cash Drawer Reconciliation & Net Operating Profit.
          </p>
        </div>

        {/* Global Selectors & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-surface-elevated border border-surface-border rounded-xl px-2.5 py-1.5 text-xs text-gray-300">
            <Building className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value={selectedBranch?.id || ''}>{selectedBranch?.name || 'Active Branch'}</option>
              {permittedBranches &&
                permittedBranches
                  .filter((b) => b.id !== selectedBranch?.id)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              <option value="ALL">All Branches (Consolidated)</option>
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center bg-surface-elevated border border-surface-border rounded-xl p-1 text-xs">
            <button
              onClick={() => setDateRange('today')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                dateRange === 'today' ? 'bg-brand text-brand-fg' : 'text-gray-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRange('7days')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                dateRange === '7days' ? 'bg-brand text-brand-fg' : 'text-gray-400 hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateRange('30days')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                dateRange === '30days' ? 'bg-brand text-brand-fg' : 'text-gray-400 hover:text-white'
              }`}
            >
              30 Days
            </button>
          </div>

          <Button variant="secondary" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. Net Sales */}
          <Card className="p-4 bg-surface">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>Net Sales</span>
              <DollarSign className="h-4 w-4 text-brand" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1">
              {formatCurrency(report.revenue.net_sales)}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Gross: {formatCurrency(report.revenue.gross_sales)} (Disc: -{formatCurrency(report.revenue.discounts)})
            </p>
          </Card>

          {/* 2. Realized COGS */}
          <Card className="p-4 bg-surface">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>Realized COGS</span>
              <Scale className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-300 mt-1">
              {formatCurrency(report.cogs.realized_cogs)}
            </p>
            <p className="text-[11px] text-amber-400/80 mt-1">
              Food Cost: {report.cogs.food_cost_percentage}% of Net Sales
            </p>
          </Card>

          {/* 3. Gross Profit */}
          <Card className="p-4 bg-surface">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>Gross Profit</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-300 mt-1">
              {formatCurrency(report.profitability.gross_profit)}
            </p>
            <p className="text-[11px] text-emerald-400/80 mt-1">
              Margin: {report.profitability.gross_margin_percentage}%
            </p>
          </Card>

          {/* 4. Operating Expenses */}
          <Card className="p-4 bg-surface">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>Operating Expenses</span>
              <Receipt className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-purple-300 mt-1">
              {formatCurrency(report.profitability.operating_expenses)}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {Object.keys(report.operating_expenses_breakdown).length} active categories
            </p>
          </Card>

          {/* 5. Net Operating Profit */}
          <Card className="p-4 bg-surface border-brand/40">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>Net Operating Profit</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1">
              {formatCurrency(report.profitability.net_operating_profit)}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              EBITDA Proxy ({report.profitability.net_margin_percentage}%)
            </p>
          </Card>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('statement')}
          className={`flex items-center gap-2 px-3 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'statement'
              ? 'bg-brand/20 text-brand border border-brand/40'
              : 'text-gray-400 hover:text-white hover:bg-surface-elevated'
          }`}
        >
          <Scale className="h-4 w-4" />
          Financial Statement & P&L
        </button>
        <button
          onClick={() => setActiveTab('cash_shifts')}
          className={`flex items-center gap-2 px-3 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'cash_shifts'
              ? 'bg-brand/20 text-brand border border-brand/40'
              : 'text-gray-400 hover:text-white hover:bg-surface-elevated'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Cash Drawer & Shift Reconciliation
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-3 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'bg-brand/20 text-brand border border-brand/40'
              : 'text-gray-400 hover:text-white hover:bg-surface-elevated'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Operating Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('tenders_payables')}
          className={`flex items-center gap-2 px-3 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'tenders_payables'
              ? 'bg-brand/20 text-brand border border-brand/40'
              : 'text-gray-400 hover:text-white hover:bg-surface-elevated'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Tenders & Supplier Payables
        </button>
      </div>

      {/* Tab 1: Financial Statement */}
      {activeTab === 'statement' && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income & Cost Breakdown */}
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Operating Income Statement
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-surface-border text-gray-300">
                  <span>Gross Sales (Menu items priced before discounts)</span>
                  <span className="font-semibold text-white">{formatCurrency(report.revenue.gross_sales)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-border text-gray-400">
                  <span>Less: Promotional Discounts & Comp Reductions</span>
                  <span className="font-semibold text-red-400">-{formatCurrency(report.revenue.discounts)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-surface-border font-bold text-white text-sm bg-surface-elevated px-2 rounded-lg">
                  <span>Net Sales (Recognized Operating Revenue)</span>
                  <span className="text-brand">{formatCurrency(report.revenue.net_sales)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-border text-gray-400">
                  <span>Less: Realized Cost of Goods Sold (COGS)</span>
                  <span className="font-semibold text-amber-400">-{formatCurrency(report.cogs.realized_cogs)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-surface-border font-bold text-emerald-400 text-sm bg-surface-elevated px-2 rounded-lg">
                  <span>Gross Profit</span>
                  <span>{formatCurrency(report.profitability.gross_profit)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-border text-gray-400">
                  <span>Less: Total Operating Expenses (OPEX)</span>
                  <span className="font-semibold text-purple-400">-{formatCurrency(report.profitability.operating_expenses)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-brand font-bold text-white text-base bg-brand/10 px-3 rounded-xl mt-2">
                  <span>Net Operating Profit</span>
                  <span className="text-brand">{formatCurrency(report.profitability.net_operating_profit)}</span>
                </div>
              </div>

              {/* Tax & Balance Note */}
              <div className="mt-3 p-3 rounded-xl bg-surface-elevated border border-surface-border text-[11px] text-gray-400 space-y-1">
                <div className="flex justify-between text-gray-300 font-medium">
                  <span>Tax Collected on behalf of government:</span>
                  <span>{formatCurrency(report.revenue.tax_collected)}</span>
                </div>
                <p className="text-[10px] text-gray-500">
                  * Note: Sales tax collected is held as a pass-through fiduciary balance sheet liability and is strictly excluded from Net Sales and business revenue.
                </p>
              </div>
            </Card>

            {/* OPEX Category Distribution */}
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Operating Expense (OPEX) Distribution
              </h3>
              <div className="space-y-3">
                {Object.entries(report.operating_expenses_breakdown).map(([cat, amt]) => {
                  const pct = report.profitability.operating_expenses > 0
                    ? ((amt / report.profitability.operating_expenses) * 100).toFixed(1)
                    : '0';
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-300 font-medium">{cat}</span>
                        <span className="text-white font-bold">
                          {formatCurrency(amt)} <span className="text-[10px] text-gray-400">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-brand h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Food Cost & Realized Inventory WAC Audit */}
              <div className="mt-4 p-4 rounded-xl border border-surface-border bg-surface-elevated space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-brand" />
                  Phase 5 Perpetual WAC Inventory Ledger Integrity
                </span>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Realized COGS is calculated strictly from confirmed order consumption movements valued at their historical weighted average cost at the exact time of preparation. Unreceived purchase orders and raw inventory purchases are treated as balance sheet assets rather than immediate COGS.
                </p>
                <div className="flex items-center gap-4 text-xs pt-1">
                  <div>
                    <span className="text-gray-400">Ingredient Loss / Waste: </span>
                    <span className="font-semibold text-red-400">{formatCurrency(report.cogs.wasted_loss)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Orders Analyzed: </span>
                    <span className="font-semibold text-white">{report.orders_count}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Cash Shifts & Drawer Reconciliation */}
      {activeTab === 'cash_shifts' && (
        <div className="space-y-6">
          {/* Active Shift Card */}
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase text-gray-400">Active Register Session:</span>
                  {activeShift ? (
                    <Badge variant="success" size="sm">
                      {activeShift.shift_number} (OPEN)
                    </Badge>
                  ) : (
                    <Badge variant="danger" size="sm">
                      NO ACTIVE SHIFT
                    </Badge>
                  )}
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  Cash Register Drawer Management
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Real-time physical float tracking, cash-in drops, petty expenses, and blind shift count reconciliation.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {!activeShift ? (
                  <Button
                    variant="primary"
                    onClick={() => setCashModalConfig({ isOpen: true, mode: 'open' })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Open Cash Shift
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setCashModalConfig({ isOpen: true, mode: 'movement' })}
                    >
                      <ArrowDownRight className="mr-2 h-4 w-4" />
                      Cash In / Out
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setCashModalConfig({ isOpen: true, mode: 'close' })}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Close Shift (Count)
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Shift Breakdown if active */}
            {activeShift && (
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-4">
                <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border">
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Opening Float</span>
                  <p className="text-sm font-bold text-white mt-1">
                    {formatCurrency(activeShift.opening_float)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border">
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Cash Sales</span>
                  <p className="text-sm font-bold text-emerald-400 mt-1">
                    +{formatCurrency(activeShift.cash_sales_amount)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border">
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Cash In (Float Top)</span>
                  <p className="text-sm font-bold text-blue-400 mt-1">
                    +{formatCurrency(activeShift.cash_in_amount)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border">
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Cash Out (Safe Drop)</span>
                  <p className="text-sm font-bold text-red-400 mt-1">
                    -{formatCurrency(activeShift.cash_out_amount)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border">
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Petty Cash Paid</span>
                  <p className="text-sm font-bold text-amber-400 mt-1">
                    -{formatCurrency(activeShift.cash_expenses_amount)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-elevated border border-brand/40">
                  <span className="text-[10px] text-brand uppercase font-mono font-bold">Expected Balance</span>
                  <p className="text-sm font-bold text-white mt-1">
                    {formatCurrency(
                      activeShift.opening_float +
                        activeShift.cash_sales_amount -
                        activeShift.cash_refunds_amount +
                        activeShift.cash_in_amount -
                        activeShift.cash_out_amount -
                        activeShift.cash_expenses_amount
                    )}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Shift History Table */}
          <Card className="p-5">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono mb-3">
              Recent Register Sessions & Reconciliation Variances
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-elevated text-gray-400 uppercase text-[10px] border-b border-surface-border">
                  <tr>
                    <th className="py-2.5 px-3">Shift Number</th>
                    <th className="py-2.5 px-3">Opened</th>
                    <th className="py-2.5 px-3">Float</th>
                    <th className="py-2.5 px-3">Cash Sales</th>
                    <th className="py-2.5 px-3">Net Move</th>
                    <th className="py-2.5 px-3">Expected</th>
                    <th className="py-2.5 px-3">Actual Count</th>
                    <th className="py-2.5 px-3">Variance</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-gray-300">
                  {shiftHistory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-6 text-gray-500">
                        No cash shifts recorded yet.
                      </td>
                    </tr>
                  ) : (
                    shiftHistory.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-elevated/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-white">{s.shift_number}</td>
                        <td className="py-2.5 px-3 text-gray-400">
                          {new Date(s.opened_at).toLocaleDateString()} {new Date(s.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3">{formatCurrency(s.opening_float)}</td>
                        <td className="py-2.5 px-3 text-emerald-400">+{formatCurrency(s.cash_sales_amount)}</td>
                        <td className="py-2.5 px-3">
                          {formatCurrency(s.cash_in_amount - s.cash_out_amount - s.cash_expenses_amount)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {s.expected_cash !== null ? formatCurrency(s.expected_cash) : 'Active'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {s.actual_cash !== null ? formatCurrency(s.actual_cash) : 'Pending'}
                        </td>
                        <td className="py-2.5 px-3 font-bold">
                          {s.variance !== null ? (
                            s.variance === 0 ? (
                              <span className="text-emerald-400">Balanced (0.00)</span>
                            ) : s.variance > 0 ? (
                              <span className="text-blue-400">+{formatCurrency(s.variance)} (Over)</span>
                            ) : (
                              <span className="text-red-400">-{formatCurrency(Math.abs(s.variance))} (Short)</span>
                            )
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={s.status === 'open' ? 'info' : 'success'} size="sm">
                            {s.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Operating Expenses */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Operating Expense Ledger</h3>
              <p className="text-xs text-gray-400">
                Track overhead, supplies, repairs, and utilities. Expenses directly deduct from Gross Profit.
              </p>
            </div>
            <Button variant="primary" onClick={() => setIsExpenseModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Record Expense
            </Button>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-elevated text-gray-400 uppercase text-[10px] border-b border-surface-border">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Payee / Vendor</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-gray-300">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        No expenses found for selected period.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-surface-elevated/50">
                        <td className="py-3 px-4 font-mono text-gray-400">{e.incurred_date}</td>
                        <td className="py-3 px-4">
                          <Badge variant="neutral" size="sm">
                            {e.category_name}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-medium text-white max-w-xs truncate">{e.description}</td>
                        <td className="py-3 px-4 text-gray-400">{e.payee_name || '-'}</td>
                        <td className="py-3 px-4 capitalize font-mono text-gray-300">{e.payment_method}</td>
                        <td className="py-3 px-4 font-bold text-white">{formatCurrency(e.amount)}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={e.payment_status === 'paid' ? 'success' : e.payment_status === 'cancelled' ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {e.payment_status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {e.payment_status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelExpense(e.id)}
                              className="text-[11px] text-red-400 hover:text-red-300 hover:underline"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 4: Tenders & Supplier Payables */}
      {activeTab === 'tenders_payables' && report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Method Breakdown & Simulated Warning */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Actual Tender Collections</span>
              <Badge variant="success" size="sm">Audited</Badge>
            </h3>
            <div className="space-y-3">
              {Object.entries(report.cash_and_collections.by_payment_method).map(([method, amt]) => (
                <div key={method} className="flex justify-between items-center py-2 border-b border-surface-border text-xs">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="capitalize font-medium text-gray-200">{method}</span>
                  </div>
                  <span className="font-bold text-white">{formatCurrency(amt)}</span>
                </div>
              ))}

              <div className="flex justify-between items-center py-2 border-b border-surface-border text-xs text-red-400">
                <span>Customer Refunds Issued</span>
                <span className="font-bold">-{formatCurrency(report.cash_and_collections.refunds_total)}</span>
              </div>

              <div className="flex justify-between items-center py-2.5 font-bold text-white text-sm bg-surface-elevated px-3 rounded-xl">
                <span>Net Actual Cash/Bank Collected</span>
                <span className="text-brand">{formatCurrency(report.cash_and_collections.net_collections)}</span>
              </div>
            </div>

            {/* Simulated Payment Integrity Boundary Box */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/50 text-amber-300 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Simulated Payment Separation (Non-Cash)
              </div>
              <p className="text-[11px] text-amber-400/90 leading-relaxed">
                {formatCurrency(report.cash_and_collections.simulated_collections_total)} was processed via demo simulated gateways. In compliance with internal controls, simulated transactions are strictly quarantined and never counted towards actual cash drawer reconciliations or bank collections.
              </p>
            </div>
          </Card>

          {/* Supplier Payables (Verified GRNs vs Payments) */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Supplier Accounts Payable (A/P)</span>
              <Badge variant="info" size="sm">Phase 5 GRN Invoices</Badge>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-surface-border text-gray-300">
                <span>Verified Goods Receipts (Invoiced Purchases)</span>
                <span className="font-bold text-white">{formatCurrency(report.supplier_payables.total_invoiced)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-border text-gray-400">
                <span>Disbursements / Payments Made to Suppliers</span>
                <span className="font-bold text-emerald-400">-{formatCurrency(report.supplier_payables.total_paid)}</span>
              </div>
              <div className="flex justify-between py-2.5 font-bold text-white text-sm bg-surface-elevated px-3 rounded-xl">
                <span>Outstanding Accounts Payable Liability</span>
                <span className="text-amber-300">{formatCurrency(report.supplier_payables.outstanding_payable)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border text-xs text-gray-400 space-y-1">
              <span className="font-semibold text-gray-300">Liability Recognition Policy:</span>
              <p className="text-[11px] leading-relaxed">
                Purchase orders are not recognized as financial liabilities until a Goods Receipt Note (GRN) has been officially verified by kitchen/inventory receivers. Outstanding balances represent unpaid verified deliveries.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        organizationId={orgId}
        branchId={effectiveBranchId === 'ALL' ? selectedBranch?.id || '' : effectiveBranchId}
        onExpenseRecorded={fetchData}
      />

      {/* Cash Shift Modal */}
      <CashShiftModal
        isOpen={cashModalConfig.isOpen}
        onClose={() => setCashModalConfig({ isOpen: false, mode: 'open' })}
        organizationId={orgId}
        branchId={effectiveBranchId === 'ALL' ? selectedBranch?.id || '' : effectiveBranchId}
        activeShift={activeShift}
        mode={cashModalConfig.mode}
        onShiftUpdated={fetchData}
      />
    </div>
  );
};
