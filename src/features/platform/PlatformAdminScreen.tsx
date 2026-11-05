import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  UserCheck,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Plus,
} from 'lucide-react';
import { platformAdminService } from './services/platformAdminService';
import { PlatformMetrics, PlatformOrganization, PlatformAuditLog } from './types';
import { CreateRestaurantModal } from './components/CreateRestaurantModal';
import { formatCurrency } from '@/lib/currency';

export const PlatformAdminScreen: React.FC = () => {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>([]);
  const [auditLogs, setAuditLogs] = useState<PlatformAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'organizations' | 'logs'>('organizations');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionModal, setActionModal] = useState<{
    type: 'suspend' | 'reactivate' | 'plan';
    org: PlatformOrganization;
  } | null>(null);
  const [actionReason, setActionReason] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan-pro');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, orgs, logs] = await Promise.all([
        platformAdminService.getMetrics(),
        platformAdminService.getOrganizations(),
        platformAdminService.getAuditLogs(),
      ]);
      setMetrics(m);
      setOrganizations(orgs);
      setAuditLogs(logs);
    } catch (err: any) {
      setNotification({ message: err?.message || 'Failed to load platform data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExecuteAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      if (actionModal.type === 'suspend') {
        await platformAdminService.suspendOrganization(
          actionModal.org.id,
          actionReason || 'Administrative suspension'
        );
        setNotification({ message: `Suspended ${actionModal.org.name}`, type: 'success' });
      } else if (actionModal.type === 'reactivate') {
        await platformAdminService.reactivateOrganization(
          actionModal.org.id,
          actionReason || 'Administrative reactivation'
        );
        setNotification({ message: `Reactivated ${actionModal.org.name}`, type: 'success' });
      } else if (actionModal.type === 'plan') {
        await platformAdminService.changePlan(
          actionModal.org.id,
          selectedPlanId,
          selectedPlanId.replace('plan-', ''),
          actionReason || 'Platform administrator override'
        );
        setNotification({ message: `Updated plan for ${actionModal.org.name}`, type: 'success' });
      }
      setActionModal(null);
      setActionReason('');
      await loadData();
    } catch (err: any) {
      setNotification({ message: err?.message || 'Operation failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">SaaS Platform Administration</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Authorized Operator
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              Cross-tenant governance, subscription lifecycles, and tenant enforcement.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition text-sm shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            Add Restaurant
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-medium transition text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
              : 'bg-rose-950/60 border border-rose-800 text-rose-200'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Real Platform Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tenants</span>
            <Building2 className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {metrics?.total_organizations ?? '—'}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span className="text-emerald-400 font-semibold">{metrics?.active_organizations ?? 0} Active</span>
            <span>•</span>
            <span className="text-amber-400 font-semibold">{metrics?.suspended_organizations ?? 0} Suspended</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Subscriptions</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-400">
            {metrics?.active_subscriptions ?? '—'}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span className="text-rose-400 font-semibold">{metrics?.past_due_subscriptions ?? 0} Past Due</span>
            <span>•</span>
            <span>{metrics?.trial_organizations ?? 0} Trialing</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {metrics ? formatCurrency(metrics.verified_revenue_total) : formatCurrency(0)}
          </div>
          <p className="mt-2 text-xs text-slate-400">From verified paid subscription invoices</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Recent Onboardings</span>
            <UserCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-blue-400">
            {metrics?.recent_onboarding_count_30d ?? '—'}
          </div>
          <p className="mt-2 text-xs text-slate-400">Organizations created in past 30 days</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('organizations')}
          className={`pb-3 px-2 border-b-2 transition ${
            activeTab === 'organizations'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Organizations & Subscriptions ({organizations.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-2 border-b-2 transition ${
            activeTab === 'logs'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Administrative Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* Tab: Organizations */}
      {activeTab === 'organizations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search organizations by name or slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-2 px-3 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="trialing">Trialing</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Organization</th>
                    <th className="py-3.5 px-4">Branches</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Current Plan</th>
                    <th className="py-3.5 px-4">Onboarding</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">{org.name}</div>
                        <div className="text-xs text-slate-500 font-mono">slug: {org.slug}</div>
                      </td>
                      <td className="py-4 px-4 font-medium">{org.branches_count} location(s)</td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            org.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : org.status === 'suspended'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {org.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {org.subscription ? (
                          <div>
                            <span className="font-semibold text-indigo-300">
                              {org.subscription.plan_name}
                            </span>
                            <div className="text-xs text-slate-500 capitalize">
                              {org.subscription.billing_cycle} • {org.subscription.status}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">No subscription</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {org.onboarding?.is_completed ? (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Completed
                          </span>
                        ) : (
                          <span className="text-xs text-amber-400 font-medium">
                            Step {org.onboarding?.current_step || 1} / 9
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setActionModal({ type: 'plan', org })}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-indigo-400 hover:bg-slate-700 transition"
                          >
                            Plan
                          </button>
                          {org.status === 'active' ? (
                            <button
                              onClick={() => setActionModal({ type: 'suspend', org })}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-950/60 text-rose-400 border border-rose-900/60 hover:bg-rose-900/80 transition"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => setActionModal({ type: 'reactivate', org })}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 hover:bg-emerald-900/80 transition"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOrgs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                        No organizations found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg p-5">
          <h3 className="text-base font-bold text-white mb-4">Privileged Platform Operations</h3>
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-indigo-300 font-mono text-xs">
                      {log.action}
                    </span>
                    <span className="text-xs text-slate-500">
                      Org ID: {log.target_org_id?.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Details: {JSON.stringify(log.details)}
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-mono whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-sm">
                No administrative actions logged yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              {actionModal.type === 'suspend' && `Suspend ${actionModal.org.name}`}
              {actionModal.type === 'reactivate' && `Reactivate ${actionModal.org.name}`}
              {actionModal.type === 'plan' && `Modify Plan for ${actionModal.org.name}`}
            </h3>

            {actionModal.type === 'plan' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Select Subscription Tier
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="plan-starter">Starter (₹1,999/mo)</option>
                  <option value="plan-growth">Growth (₹4,999/mo)</option>
                  <option value="plan-pro">Professional (₹9,999/mo)</option>
                  <option value="plan-enterprise">Enterprise (₹19,999/mo)</option>
                </select>
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                Audit Reason (Required for Privileged Action)
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Enter regulatory or administrative justification..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 h-24"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setActionModal(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={actionLoading}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
                  actionModal.type === 'suspend'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {actionLoading ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision New Restaurant Modal */}
      <CreateRestaurantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(orgName) => {
          setNotification({ message: `Successfully provisioned ${orgName}`, type: 'success' });
          loadData();
        }}
      />
    </div>
  );
};
export default PlatformAdminScreen;
