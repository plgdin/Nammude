import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { useAuth } from '@/features/auth/AuthContext';
import { BranchConfig } from '@/config/tenant.config';
import { formatCurrency } from '@/lib/currency';
import { orderService } from './services/orderService';
import { paymentService } from './services/paymentService';
import { OrderRecord, PaymentRecord, PaymentRefundRecord } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import {
  Search,
  XCircle,
  ReceiptText,
  IndianRupee,
  Loader2,
  RefreshCw,
  Plus,
  AlertTriangle,
  Undo2,
} from 'lucide-react';

type StatusFilter = 'all' | OrderRecord['status'];
type DateRange = 'today' | '7days' | '30days' | 'all';

const STATUS_LABELS: Record<OrderRecord['status'], string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  in_prep: 'In Prep',
  ready: 'Ready',
  served: 'Served',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_VARIANTS: Record<OrderRecord['status'], 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft: 'neutral',
  confirmed: 'info',
  in_prep: 'warning',
  ready: 'success',
  served: 'info',
  completed: 'success',
  cancelled: 'danger',
};

const TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine-in',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
  qr_self_order: 'QR Self-order',
};

const REFUND_ROLES = new Set(['owner', 'general_manager', 'branch_manager', 'platform_admin']);
const CANCEL_ROLES = new Set(['owner', 'general_manager', 'branch_manager', 'cashier', 'platform_admin']);

interface OrderSummary extends OrderRecord {
  payments: PaymentRecord[];
  paid: number;
  refunded: number;
  refundable: number;
}

export const OrdersScreen: React.FC = () => {
  const { currentOrganization, currentBranch } = useOrganization();
  const { user, activeRole } = useAuth();
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ selectedBranch?: BranchConfig }>();
  const activeBranch = currentBranch || outletContext?.selectedBranch;

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [refunds, setRefunds] = useState<PaymentRefundRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('30days');

  // Action modal state
  const [cancelTarget, setCancelTarget] = useState<OrderRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundTarget, setRefundTarget] = useState<OrderSummary | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canRefund = REFUND_ROLES.has(activeRole || '');
  const canCancel = CANCEL_ROLES.has(activeRole || '');

  const fetchOrders = useCallback(async () => {
    if (!activeBranch?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [orderData, paymentData, refundData] = await Promise.all([
        orderService.getBranchOrders(activeBranch.id),
        paymentService.getBranchPayments(activeBranch.id),
        paymentService.getRefundsForBranch(activeBranch.id),
      ]);
      setOrders(orderData);
      setPayments(paymentData);
      setRefunds(refundData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load orders.');
    } finally {
      setIsLoading(false);
    }
  }, [activeBranch?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const refundsByPayment = useMemo(() => {
    const map = new Map<string, number>();
    for (const refund of refunds) {
      map.set(refund.payment_id, (map.get(refund.payment_id) || 0) + Number(refund.refund_amount));
    }
    return map;
  }, [refunds]);

  const summaries: OrderSummary[] = useMemo(() => {
    return orders.map((order) => {
      const orderPayments = payments.filter(
        (p) => p.order_id === order.id && p.status !== 'failed'
      );
      const paid = orderPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const refunded = orderPayments.reduce(
        (sum, p) => sum + (refundsByPayment.get(p.id) || 0),
        0
      );
      return {
        ...order,
        payments: orderPayments,
        paid: Number(paid.toFixed(2)),
        refunded: Number(refunded.toFixed(2)),
        refundable: Number(Math.max(0, paid - refunded).toFixed(2)),
      };
    });
  }, [orders, payments, refundsByPayment]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      dateRange === 'today'
        ? new Date(new Date().setHours(0, 0, 0, 0)).getTime()
        : dateRange === '7days'
          ? now - 7 * 86400000
          : dateRange === '30days'
            ? now - 30 * 86400000
            : 0;

    return summaries.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesDate = new Date(order.created_at).getTime() >= cutoff;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        order.order_number.toLowerCase().includes(q) ||
        order.order_type.toLowerCase().includes(q) ||
        (order.notes || '').toLowerCase().includes(q);
      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [summaries, statusFilter, dateRange, searchQuery]);

  const stats = useMemo(() => {
    return filtered.reduce(
      (acc, order) => {
        if (order.status !== 'cancelled') {
          acc.collected += order.paid;
          acc.refunded += order.refunded;
        }
        if (order.status === 'cancelled') acc.cancelled += 1;
        return acc;
      },
      { collected: 0, refunded: 0, cancelled: 0 }
    );
  }, [filtered]);

  const openCancel = (order: OrderRecord) => {
    setActionError(null);
    setCancelReason('');
    setCancelTarget(order);
  };

  const openRefund = (order: OrderSummary) => {
    setActionError(null);
    setRefundReason('');
    setRefundAmount(order.refundable.toFixed(2));
    setRefundTarget(order);
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setIsSubmitting(true);
    setActionError(null);
    const result = await orderService.cancelOrder(cancelTarget.id, cancelReason);
    setIsSubmitting(false);
    if (!result.success) {
      setActionError(result.error || 'Unable to cancel order.');
      return;
    }
    setCancelTarget(null);
    setToast(`Order ${cancelTarget.order_number} cancelled and stock restored.`);
    await fetchOrders();
  };

  const handleRefund = async () => {
    if (!refundTarget || !currentOrganization || !activeBranch) return;
    setIsSubmitting(true);
    setActionError(null);
    const result = await paymentService.refundOrder({
      organization_id: currentOrganization.id,
      branch_id: activeBranch.id,
      order_id: refundTarget.id,
      amount: Number(refundAmount),
      reason: refundReason,
      approved_by: user?.id || 'unknown',
      idempotency_key: `refund-${refundTarget.id}-${Date.now()}`,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setActionError(result.error || 'Unable to refund order.');
      return;
    }
    setRefundTarget(null);
    setToast(`Refunded ${formatCurrency(result.refunded_amount)} on ${refundTarget.order_number}.`);
    await fetchOrders();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-surface-border bg-gradient-to-r from-surface to-surface-elevated p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="info" size="sm">Order Management</Badge>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-medium text-gray-300">
              {activeBranch?.name || 'Current branch'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-brand" />
            Orders, Corrections & Refunds
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Search orders, cancel uncompleted tickets, and issue auditable refunds against captured payments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchOrders} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="primary" onClick={() => navigate('/pos')}>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <span className="text-xs text-gray-400">Orders in view</span>
          <p className="text-2xl font-bold text-white mt-1">{filtered.length}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-gray-400">Collected</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(stats.collected)}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-gray-400">Refunded</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(stats.refunded)}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-gray-400">Cancelled</span>
          <p className="text-2xl font-bold text-rose-400 mt-1">{stats.cancelled}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number, type, or notes..."
            className="w-full rounded-xl border border-surface-border bg-surface-elevated pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-xl border border-surface-border bg-surface-elevated px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_prep">In Prep</option>
          <option value="ready">Ready</option>
          <option value="served">Served</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
          className="rounded-xl border border-surface-border bg-surface-elevated px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="today">Today</option>
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/50 px-4 py-3 text-xs text-emerald-300">
          {toast}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-800/60 bg-rose-950/50 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Orders</CardTitle>
          <span className="text-xs text-gray-400">{filtered.length} result(s)</span>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-xs">Loading orders...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <ReceiptText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium text-gray-300">No orders match these filters</p>
              <p className="text-xs mt-1">Try a wider date range or clear the search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-elevated/60 text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-right">Paid</th>
                    <th className="px-4 py-3 font-medium text-right">Refunded</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-elevated/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{order.order_number}</div>
                        <div className="text-[10px] text-gray-500">
                          {new Date(order.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {TYPE_LABELS[order.order_type] || order.order_type}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[order.status]} size="sm">
                          {STATUS_LABELS[order.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400">
                        {formatCurrency(order.paid)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-400">
                        {formatCurrency(order.refunded)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {canCancel && order.status !== 'completed' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => openCancel(order)}
                              className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-2 py-1 text-[10px] font-medium text-gray-300 hover:bg-surface-elevated hover:text-white"
                            >
                              <XCircle className="h-3 w-3" /> Cancel
                            </button>
                          )}
                          {canRefund && order.refundable > 0 && (
                            <button
                              onClick={() => openRefund(order)}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-800/60 bg-amber-950/40 px-2 py-1 text-[10px] font-medium text-amber-300 hover:bg-amber-950/70"
                            >
                              <Undo2 className="h-3 w-3" /> Refund
                            </button>
                          )}
                          {!canCancel && !canRefund && (
                            <span className="text-[10px] text-gray-500">View only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        Cancelling restores stock and reverses loyalty points. Completed orders can only be corrected by an auditable refund.
      </p>

      {/* Cancel modal */}
      <Modal open={!!cancelTarget} onOpenChange={(open) => !open && !isSubmitting && setCancelTarget(null)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Cancel Order {cancelTarget?.order_number}</ModalTitle>
            <ModalDescription>
              This marks the order cancelled, restores consumed ingredients, and reverses any loyalty points.
            </ModalDescription>
          </ModalHeader>

          {actionError && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {actionError}
            </div>
          )}

          <label className="text-xs font-medium text-gray-300">
            Cancellation reason <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="e.g. Customer changed their mind before preparation"
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
          />

          <ModalFooter>
            <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={isSubmitting}>
              Keep Order
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              disabled={isSubmitting || cancelReason.trim().length < 3}
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Refund modal */}
      <Modal open={!!refundTarget} onOpenChange={(open) => !open && !isSubmitting && setRefundTarget(null)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Refund Order {refundTarget?.order_number}</ModalTitle>
            <ModalDescription>
              Refund captured payments. Maximum refundable now:{' '}
              {formatCurrency(refundTarget?.refundable || 0)}.
            </ModalDescription>
          </ModalHeader>

          {actionError && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {actionError}
            </div>
          )}

          <label className="text-xs font-medium text-gray-300">Refund amount</label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              type="number"
              min={0}
              max={refundTarget?.refundable || 0}
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-surface-elevated pl-8 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <label className="text-xs font-medium text-gray-300">
            Refund reason <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            rows={3}
            placeholder="e.g. Wrong item served / customer complaint"
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
          />

          <ModalFooter>
            <Button variant="secondary" onClick={() => setRefundTarget(null)} disabled={isSubmitting}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleRefund}
              disabled={
                isSubmitting ||
                refundReason.trim().length < 3 ||
                Number(refundAmount) <= 0 ||
                Number(refundAmount) > (refundTarget?.refundable || 0)
              }
            >
              {isSubmitting ? 'Processing...' : `Refund ${formatCurrency(Number(refundAmount) || 0)}`}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
