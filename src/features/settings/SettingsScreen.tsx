import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { useAuth } from '@/features/auth/AuthContext';
import { SEED_USERS, SeedUserFixture } from '@/mocks/auth.fixtures';
import { StaffEditModal } from './StaffEditModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Building2,
  Users,
  QrCode,
  Save,
  Plus,
  Trash2,
  Copy,
  Check,
  Palette,
  Globe,
  Clock,
  MapPin,
  Phone,
  Mail,
  Shield,
  Printer,
  Maximize2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { TableQrExpandedModal, TableQrItem } from './TableQrExpandedModal';

/** Real QR Code preview thumbnail */
const QrThumbnail: React.FC<{ url: string; alt: string }> = ({ url, alt }) => {
  const [dataUrl, setDataUrl] = React.useState<string>('');

  React.useEffect(() => {
    QRCode.toDataURL(url, {
      width: 180,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then(setDataUrl)
      .catch(() => {});
  }, [url]);

  if (!dataUrl) {
    return <div className="h-28 w-28 bg-gray-100 rounded-lg animate-pulse" />;
  }

  return <img src={dataUrl} alt={alt} className="h-28 w-28 object-contain rounded-lg" />;
};

type SettingsTab = 'general' | 'staff' | 'qr';

/** Role label map */
const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  owner: 'Owner / Admin',
  general_manager: 'General Manager',
  branch_manager: 'Branch Manager',
  cashier: 'Cashier',
  kitchen: 'Kitchen Staff',
  inventory: 'Inventory Staff',
  auditor: 'Auditor / Accountant',
};

const ROLE_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'neutral'> = {
  platform_admin: 'danger',
  owner: 'success',
  general_manager: 'info',
  branch_manager: 'info',
  cashier: 'warning',
  kitchen: 'warning',
  inventory: 'neutral',
  auditor: 'neutral',
};

export const SettingsScreen: React.FC = () => {
  const { currentOrganization, permittedBranches } = useOrganization();
  const { activeRole } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saved, setSaved] = useState(false);
  const [copiedQr, setCopiedQr] = useState<string | null>(null);
  const [selectedTableForQr, setSelectedTableForQr] = useState<TableQrItem | null>(null);
  const currentOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://tablewise.io';
  const [orderingDomain, setOrderingDomain] = useState(currentOrigin);

  // Mock restaurant settings state
  const [restaurantName, setRestaurantName] = useState(currentOrganization?.name || '');
  const [restaurantSlug, setRestaurantSlug] = useState(currentOrganization?.slug || '');
  const [timezone, setTimezone] = useState(currentOrganization?.timezone || 'Asia/Kolkata');
  const [currency, setCurrency] = useState(currentOrganization?.default_currency || 'INR');
  const [brandColor, setBrandColor] = useState(currentOrganization?.branding?.brandColor || '#2563eb');

  // Staff list state initialized with seed users scoped to current org
  const [staffList, setStaffList] = useState<SeedUserFixture[]>(() =>
    SEED_USERS.filter((u) => u.organizationId === currentOrganization?.id && u.role !== 'platform_admin')
  );

  useEffect(() => {
    setStaffList(
      SEED_USERS.filter((u) => u.organizationId === currentOrganization?.id && u.role !== 'platform_admin')
    );
  }, [currentOrganization?.id]);

  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState<SeedUserFixture | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  const handleOpenAddStaff = () => {
    setSelectedStaffForEdit(null);
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (staff: SeedUserFixture) => {
    setSelectedStaffForEdit(staff);
    setIsStaffModalOpen(true);
  };

  const handleDeleteStaff = (staffId: string) => {
    setStaffList((prev) => prev.filter((s) => s.id !== staffId));
  };

  const handleSaveStaff = (savedStaff: SeedUserFixture) => {
    setStaffList((prev) => {
      const exists = prev.some((s) => s.id === savedStaff.id);
      if (exists) {
        return prev.map((s) => (s.id === savedStaff.id ? savedStaff : s));
      }
      return [savedStaff, ...prev];
    });
  };

  // Table QR data with real website domain URLs
  const mockTables = Array.from({ length: 8 }, (_, i) => ({
    id: `table-${i + 1}`,
    number: `T${i + 1}`,
    section: i < 4 ? 'Indoor' : 'Outdoor',
    qrUrl: `${orderingDomain.replace(/\/$/, '')}/menu/${restaurantSlug || currentOrganization?.slug || 'huddles'}?table=${i + 1}`,
  }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopyQr = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedQr(id);
    setTimeout(() => setCopiedQr(null), 1500);
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Building2 },
    { id: 'staff' as const, label: 'Staff & Roles', icon: Users },
    { id: 'qr' as const, label: 'QR Codes', icon: QrCode },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Restaurant Settings</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage your restaurant profile, staff, and table QR codes
          </p>
        </div>
        <Badge variant="info" size="sm">
          Logged in as {ROLE_LABELS[activeRole || 'owner'] || activeRole}
        </Badge>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-surface-border gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── General Settings Tab ─── */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand" />
                Restaurant Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Restaurant Name</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">URL Slug</label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 bg-surface-active border border-surface-border border-r-0 rounded-l-lg px-3 py-2.5">
                    tablewise.io/
                  </span>
                  <input
                    type="text"
                    value={restaurantSlug}
                    onChange={(e) => setRestaurantSlug(e.target.value)}
                    className="flex-1 bg-surface-elevated border border-surface-border rounded-r-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Chicago">America/Chicago (CST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1">
                  <Palette className="h-3 w-3" /> Brand Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-10 w-14 rounded-lg border border-surface-border cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-gray-300 font-mono">{brandColor}</span>
                </div>
              </div>

              <Button variant="primary" onClick={handleSave} className="w-full mt-2">
                {saved ? <><Check className="mr-2 h-4 w-4" /> Saved!</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
              </Button>
            </CardContent>
          </Card>

          {/* Branch Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand" />
                Branches ({permittedBranches.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {permittedBranches.map((branch) => (
                <div
                  key={branch.id}
                  className="p-3 rounded-xl border border-surface-border bg-surface-elevated/60 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{branch.name}</span>
                    <Badge variant={branch.status === 'active' ? 'success' : 'warning'} size="sm">
                      {branch.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">{branch.address_line1}, {branch.city}</p>
                  <div className="flex items-center gap-4 text-[11px] text-gray-500">
                    {branch.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {branch.phone}
                      </span>
                    )}
                    {branch.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {branch.email}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Tax Rate: {(branch.tax_rate * 100).toFixed(2)}% • Code: {branch.code}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Staff & Roles Tab ─── */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-300">
              Manage staff members and their role-based access permissions.
            </p>
            <Button variant="primary" size="sm" onClick={handleOpenAddStaff}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Staff
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-elevated/60 text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-surface-border">
                    <tr>
                      <th className="py-3.5 px-4">Staff Member</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Branches</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {staffList.map((staff) => (
                      <tr key={staff.id} className="hover:bg-surface-elevated/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20 text-brand font-semibold text-xs border border-brand/30">
                              {staff.fullName[0]}
                            </div>
                            <span className="font-medium text-white">{staff.fullName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-400 text-xs">{staff.email}</td>
                        <td className="py-3.5 px-4">
                          <Badge variant={ROLE_BADGE_VARIANT[staff.role] || 'neutral'} size="sm">
                            {ROLE_LABELS[staff.role] || staff.role}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-gray-400 text-xs">
                          {staff.branchIds.length} branch(es)
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleOpenEditStaff(staff)}
                            >
                              <Shield className="mr-1 h-3 w-3" /> Edit
                            </Button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(staff.id)}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 transition"
                              title="Delete staff member"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {staffList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                          No staff members found for this organization.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Role Permissions Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {Object.entries(ROLE_LABELS).filter(([key]) => key !== 'platform_admin').map(([role, label]) => (
                  <div key={role} className="p-3 rounded-xl border border-surface-border bg-surface-elevated/40">
                    <Badge variant={ROLE_BADGE_VARIANT[role] || 'neutral'} size="sm" className="mb-2">
                      {label}
                    </Badge>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      {role === 'owner' && 'Full access to all modules, settings, and staff management.'}
                      {role === 'general_manager' && 'All operations except restaurant onboarding.'}
                      {role === 'branch_manager' && 'POS, Kitchen, Inventory, Financials, Checklists, CRM.'}
                      {role === 'cashier' && 'Dashboard + POS terminal only.'}
                      {role === 'kitchen' && 'Dashboard + Kitchen KDS display only.'}
                      {role === 'inventory' && 'Dashboard + Inventory management only.'}
                      {role === 'auditor' && 'Dashboard + Financials + OCR Documents.'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── QR Codes Tab ─── */}
      {activeTab === 'qr' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-elevated border border-surface-border">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <QrCode className="h-4 w-4 text-brand" />
                Table Digital Menu QR Codes
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Click any table card to view the expanded, high-res QR code, download PNG, or print ready-to-use table tent stands.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-1.5 bg-canvas px-3 py-1.5 rounded-lg border border-surface-border">
                <span className="text-xs text-gray-400 font-medium">Domain:</span>
                <input
                  type="text"
                  value={orderingDomain}
                  onChange={(e) => setOrderingDomain(e.target.value)}
                  placeholder="https://tablewise.io"
                  className="bg-transparent text-xs text-white font-mono outline-none w-48"
                />
              </div>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-xs">
                <Printer className="h-3.5 w-3.5" />
                Print-ready Stand Cards
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockTables.map((table) => (
              <Card
                key={table.id}
                className="overflow-hidden group hover:border-brand/60 transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedTableForQr(table)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Real Scannable QR Visual */}
                  <div className="relative flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-inner overflow-hidden">
                    <QrThumbnail url={table.qrUrl} alt={`Table ${table.number} QR Code`} />
                    <span className="text-[10px] font-mono font-bold text-gray-700 mt-1">
                      TABLE {table.number}
                    </span>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1.5 p-2 text-center backdrop-blur-[2px]">
                      <Maximize2 className="h-6 w-6 text-brand" />
                      <span className="text-xs font-bold">Expand & Print Stand</span>
                      <span className="text-[10px] text-gray-300">Phone-scannable</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Table {table.number}</p>
                      <p className="text-[11px] text-gray-400">{table.section} Section</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTableForQr(table);
                      }}
                      className="text-xs text-brand hover:text-brand-fg p-1 h-auto flex items-center gap-1"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-surface-border/50">
                    <input
                      readOnly
                      value={table.qrUrl}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-surface-elevated border border-surface-border rounded-lg px-2 py-1.5 text-[10px] text-gray-300 font-mono truncate"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyQr(table.qrUrl, table.id);
                      }}
                      className="p-1.5 rounded-lg border border-surface-border bg-surface-elevated text-gray-300 hover:text-white hover:bg-surface-active transition shrink-0"
                      title="Copy QR URL"
                    >
                      {copiedQr === table.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Expanded Table QR Modal with Print & Download */}
      <TableQrExpandedModal
        isOpen={Boolean(selectedTableForQr)}
        onClose={() => setSelectedTableForQr(null)}
        table={selectedTableForQr}
        restaurantName={restaurantName || currentOrganization?.name || 'Restaurant'}
        restaurantSlug={restaurantSlug || currentOrganization?.slug || 'huddles'}
        initialDomain={orderingDomain}
        onDomainChange={setOrderingDomain}
      />
      {/* Staff Add / Edit Modal */}
      <StaffEditModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staff={selectedStaffForEdit}
        organizationId={currentOrganization?.id || ''}
        organizationName={restaurantName || currentOrganization?.name || 'Restaurant'}
        organizationSlug={restaurantSlug || currentOrganization?.slug || 'restaurant'}
        availableBranches={permittedBranches.map((b) => ({ id: b.id, name: b.name }))}
        onSave={handleSaveStaff}
      />
    </div>
  );
};
