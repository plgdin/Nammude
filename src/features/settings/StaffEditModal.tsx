import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SeedUserFixture } from '@/mocks/auth.fixtures';
import { Database } from '@/types/database.types';
import { Shield, User, Mail, GitBranch } from 'lucide-react';

type RoleType = Database['public']['Tables']['memberships']['Row']['role'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  staff: SeedUserFixture | null;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  availableBranches?: Array<{ id: string; name: string }>;
  onSave: (savedStaff: SeedUserFixture) => void;
}

const ROLES: Array<{ value: RoleType; label: string; desc: string }> = [
  { value: 'owner', label: 'Owner / Admin', desc: 'Full control of restaurant settings, staff, and menus' },
  { value: 'general_manager', label: 'General Manager', desc: 'All operations except restaurant onboarding' },
  { value: 'branch_manager', label: 'Branch Manager', desc: 'POS, Kitchen, Inventory, Financials, Checklists' },
  { value: 'cashier', label: 'Cashier', desc: 'Dashboard & POS terminal ordering only' },
  { value: 'waiter', label: 'Waiter / Front-of-House', desc: 'Floor tables, orders & KOT dispatch' },
  { value: 'kitchen', label: 'Kitchen Staff', desc: 'Kitchen KDS screen view only' },
  { value: 'inventory', label: 'Inventory Staff', desc: 'Stock levels, purchase orders & recipes' },
  { value: 'operations', label: 'Cleaning / Operations', desc: 'Assigned duties & checklist completion' },
  { value: 'auditor', label: 'Auditor', desc: 'Financial reports, P&L, and OCR receipts' },
];

export const StaffEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  staff,
  organizationId,
  organizationName,
  organizationSlug,
  availableBranches = [],
  onSave,
}) => {
  const isEditing = Boolean(staff);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleType>('cashier');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (staff) {
      setFullName(staff.fullName);
      setEmail(staff.email);
      setRole(staff.role);
      setSelectedBranches(staff.branchIds || []);
    } else {
      setFullName('');
      setEmail('');
      setRole('cashier');
      setSelectedBranches(availableBranches.length > 0 ? [availableBranches[0].id] : []);
    }
    setError('');
  }, [staff, isOpen, availableBranches]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Staff member full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('A valid work email address is required.');
      return;
    }

    const payload: SeedUserFixture = {
      id: staff?.id || `staff-${Date.now()}`,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      role,
      organizationId: organizationId || staff?.organizationId || 'default-org',
      organizationName: organizationName || staff?.organizationName || 'Restaurant',
      organizationSlug: organizationSlug || staff?.organizationSlug || 'restaurant',
      branchIds: selectedBranches.length > 0 ? selectedBranches : (staff?.branchIds || ['default-branch']),
    };

    onSave(payload);
    onClose();
  };

  const toggleBranch = (branchId: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-md bg-surface border border-surface-border text-white p-6 rounded-2xl shadow-2xl">
        <ModalHeader className="pb-2 border-b border-surface-border">
          <ModalTitle className="text-lg font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand" />
            {isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
          </ModalTitle>
          <ModalDescription className="text-xs text-gray-400">
            {isEditing
              ? `Update permissions and branch access for ${staff?.fullName}`
              : 'Add a new team member and assign their system access role.'}
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-gray-400" /> Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Marco Silva"
              required
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand outline-none"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-gray-400" /> Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. marco@restaurant.com"
              required
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand outline-none"
            />
          </div>

          {/* Role */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-gray-400" /> System Role & Permissions
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleType)}
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:border-brand outline-none"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value} className="bg-surface text-white">
                  {r.label} — {r.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Branches (if multiple available) */}
          {availableBranches.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-gray-400" /> Assigned Branch Access
              </label>
              <div className="flex flex-wrap gap-2">
                {availableBranches.map((branch) => {
                  const isChecked = selectedBranches.includes(branch.id);
                  return (
                    <button
                      type="button"
                      key={branch.id}
                      onClick={() => toggleBranch(branch.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition font-medium ${
                        isChecked
                          ? 'bg-brand/20 border-brand text-brand-fg'
                          : 'bg-surface-elevated border-surface-border text-gray-400 hover:text-white'
                      }`}
                    >
                      {branch.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <ModalFooter className="pt-3 border-t border-surface-border flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {isEditing ? 'Save Changes' : 'Create Staff Member'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
