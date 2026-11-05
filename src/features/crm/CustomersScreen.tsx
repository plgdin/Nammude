import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Award,
  IndianRupee,
  Phone,
  Mail,
  Edit2,
  Trash2,
  X,
  History,
  Star,
  Settings,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { crmService } from './services/crmService';
import { loyaltyService } from '@/features/loyalty/services/loyaltyService';
import { Customer } from './types';
import { LoyaltyConfig, LoyaltyLedgerEntry } from '@/features/loyalty/types';

export const CustomersScreen: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id || '11111111-1111-1111-1111-111111111111';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'spend' | 'orders' | 'recent'>('spend');

  // Customer Edit/Create Modal
  const [customerModal, setCustomerModal] = useState<{
    isOpen: boolean;
    customer?: Customer;
  }>({ isOpen: false });
  const [formData, setFormData] = useState<{
    display_name: string;
    email: string;
    phone: string;
    notes: string;
    tags: string;
  }>({ display_name: '', email: '', phone: '', notes: '', tags: '' });

  // Detail / Loyalty Ledger Modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerLedger, setCustomerLedger] = useState<LoyaltyLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState<boolean>(false);

  // Loyalty Config Modal
  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);
  const [configForm, setConfigForm] = useState<Partial<LoyaltyConfig>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [custs, cfg] = await Promise.all([
        crmService.getCustomers(orgId, { search, tag: selectedTag, sortBy }),
        loyaltyService.getLoyaltyConfig(orgId),
      ]);
      setCustomers(custs);
      setLoyaltyConfig(cfg);
      setConfigForm(cfg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, search, selectedTag, sortBy]);

  const handleOpenCreate = () => {
    setFormData({ display_name: '', email: '', phone: '', notes: '', tags: '' });
    setCustomerModal({ isOpen: true });
  };

  const handleOpenEdit = (c: Customer) => {
    setFormData({
      display_name: c.display_name,
      email: c.email || '',
      phone: c.phone || '',
      notes: c.notes || '',
      tags: c.tags.join(', '),
    });
    setCustomerModal({ isOpen: true, customer: c });
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.display_name.trim()) return;

    const tagsArray = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (customerModal.customer) {
      await crmService.updateCustomer(orgId, customerModal.customer.id, {
        display_name: formData.display_name,
        email: formData.email || null,
        phone: formData.phone || null,
        notes: formData.notes || null,
        tags: tagsArray,
      });
    } else {
      await crmService.createCustomer(orgId, {
        display_name: formData.display_name,
        email: formData.email || null,
        phone: formData.phone || null,
        notes: formData.notes || null,
        tags: tagsArray,
      });
    }

    setCustomerModal({ isOpen: false });
    await loadData();
  };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer record?')) {
      await crmService.deleteCustomer(orgId, id);
      await loadData();
    }
  };

  const handleViewLedger = async (c: Customer) => {
    setSelectedCustomer(c);
    setLedgerLoading(true);
    try {
      const entries = await loyaltyService.getLedger(orgId, c.id);
      setCustomerLedger(entries);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleSaveLoyaltyConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await loyaltyService.updateLoyaltyConfig(orgId, configForm);
    setConfigModalOpen(false);
    await loadData();
  };

  // Metrics
  const totalCustomers = customers.length;
  const totalSpend = customers.reduce((sum, c) => sum + c.total_spend_amount, 0);
  const totalPoints = customers.reduce((sum, c) => sum + c.loyalty_points_balance, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Customer CRM & Loyalty</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Guest order history, preferences, spending profiles, and auditable points ledger.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfigModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-sm font-semibold transition"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            Loyalty Rules
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Guests</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{totalCustomers}</div>
          <p className="mt-1 text-xs text-slate-500">With verified email or phone</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total CRM Spend</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {formatCurrency(totalSpend)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Across all completed dining orders</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Loyalty Points</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            {totalPoints.toLocaleString()} pts
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {loyaltyConfig?.is_enabled ? 'Earn rate: 1 pt / ₹1' : 'Loyalty currently paused'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search guests by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-2 px-3 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Tags</option>
            <option value="VIP">VIP</option>
            <option value="Regular">Regular</option>
            <option value="Dinner">Dinner</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-2 px-3 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="spend">Sort: Highest Spend</option>
            <option value="orders">Sort: Most Orders</option>
            <option value="recent">Sort: Most Recent Visit</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Tags</th>
                <th className="py-3.5 px-4">Orders & Spend</th>
                <th className="py-3.5 px-4">Loyalty Balance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-4 px-4">
                    <div className="font-semibold text-white">{c.display_name}</div>
                    {c.notes && (
                      <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                        {c.notes}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-400 space-y-0.5">
                    {c.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{c.email}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-white">
                      {formatCurrency(c.total_spend_amount)}
                    </div>
                    <div className="text-xs text-slate-500">{c.total_orders_count} orders</div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {c.loyalty_points_balance} pts
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewLedger(c)}
                        title="View Points Ledger"
                        className="p-1.5 rounded-lg bg-slate-800 text-amber-400 hover:bg-slate-700 transition"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Customer"
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(c.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-950 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                    Loading customer profiles...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                    No customers found. Add your first guest above!
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Create/Edit Modal */}
      {customerModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {customerModal.customer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button
                onClick={() => setCustomerModal({ isOpen: false })}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Full Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="e.g. Leonardo Romano"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="guest@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="VIP, Frequent, Wine Club"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Preferences / Dietary Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Allergies, table preferences, favorite drinks..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomerModal({ isOpen: false })}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Points Ledger Slideout / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Loyalty History</h3>
                <p className="text-xs text-slate-400">
                  {selectedCustomer.display_name} • Balance: {selectedCustomer.loyalty_points_balance} pts
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {ledgerLoading ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Loading ledger transactions...
                </div>
              ) : customerLedger.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No loyalty points ledger entries found for this customer.
                </div>
              ) : (
                customerLedger.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold capitalize px-2 py-0.5 rounded text-[10px] ${
                            entry.entry_type === 'earn'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : entry.entry_type === 'redeem'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {entry.entry_type}
                        </span>
                        <span className="text-slate-400">{entry.notes}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {new Date(entry.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-bold ${
                          entry.points > 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {entry.points > 0 ? `+${entry.points}` : entry.points} pts
                      </span>
                      <div className="text-[11px] text-slate-500">
                        Balance: {entry.balance_after}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loyalty Configuration Modal */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Loyalty Rules & Earn Rates</h3>
              <button
                onClick={() => setConfigModalOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLoyaltyConfig} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-sm font-semibold text-white">Enable Loyalty Program</span>
                <input
                  type="checkbox"
                  checked={configForm.is_enabled ?? true}
                  onChange={(e) => setConfigForm({ ...configForm, is_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Points Earned per ₹1 Spent
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={configForm.points_per_currency_unit ?? 1.0}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      points_per_currency_unit: parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Redemption Value per Point (₹)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={configForm.currency_value_per_point ?? 0.01}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      currency_value_per_point: parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Default 0.01 means 100 points = ₹1.00</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Minimum Points to Redeem
                </label>
                <input
                  type="number"
                  min="0"
                  value={configForm.min_redemption_points ?? 50}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      min_redemption_points: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
                >
                  Save Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomersScreen;
