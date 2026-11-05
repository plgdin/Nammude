import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Building2, Store, Mail, Lock, ShieldCheck, CheckCircle2, Copy, Check } from 'lucide-react';
import { platformAdminService } from '../services/platformAdminService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orgName: string) => void;
}

export const CreateRestaurantModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('Huddles@2026');
  const [branchName, setBranchName] = useState('Main Branch');
  const [planId, setPlanId] = useState('plan-pro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    pass: string;
    slug: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-]+/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Restaurant name is required');
      return;
    }
    if (!slug.trim()) {
      setError('Subdomain slug is required');
      return;
    }
    if (!ownerEmail.trim()) {
      setError('Owner email is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await platformAdminService.createOrganization({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        currency: 'INR',
        planId,
        planName: planId === 'plan-enterprise' ? 'Enterprise' : planId === 'plan-starter' ? 'Starter' : 'Professional',
        ownerEmail: ownerEmail.trim(),
        ownerPassword,
        ownerName: ownerName.trim() || `${name} Admin`,
        branchName: branchName.trim() || 'Main Branch',
      });

      setCreatedCredentials({
        name: name.trim(),
        email: ownerEmail.trim(),
        pass: ownerPassword,
        slug: slug.trim().toLowerCase(),
      });
      onSuccess(name.trim());
    } catch (err: any) {
      setError(err?.message || 'Failed to create restaurant organization');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Restaurant: ${createdCredentials.name}\nWebsite Link: ${window.location.origin}/menu/${createdCredentials.slug}\nAdmin Login: ${createdCredentials.email}\nPassword: ${createdCredentials.pass}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetAndClose = () => {
    setName('');
    setSlug('');
    setOwnerName('');
    setOwnerEmail('');
    setOwnerPassword('Huddles@2026');
    setCreatedCredentials(null);
    onClose();
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && handleResetAndClose()}>
      <ModalContent className="max-w-lg bg-surface border border-surface-border text-white p-6 rounded-2xl shadow-2xl">
        <ModalHeader className="pb-3 border-b border-surface-border">
          <ModalTitle className="text-lg font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-400" />
            Add New Restaurant Tenant
          </ModalTitle>
          <ModalDescription className="text-xs text-gray-400">
            Provision a new restaurant on Tablewise SaaS with instant owner credentials.
          </ModalDescription>
        </ModalHeader>

        {createdCredentials ? (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Restaurant Successfully Provisioned!
              </div>
              <p className="text-xs text-emerald-300">
                Share these login credentials with the restaurant owner. They can immediately log in and manage staff, menus, and tables.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-surface-border space-y-2 text-xs font-mono">
              <div>
                <span className="text-gray-400">Restaurant:</span> <span className="text-white font-bold">{createdCredentials.name}</span>
              </div>
              <div>
                <span className="text-gray-400">Admin Email:</span> <span className="text-indigo-300 font-bold">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-gray-400">Temporary Password:</span> <span className="text-amber-300 font-bold">{createdCredentials.pass}</span>
              </div>
              <div>
                <span className="text-gray-400">Ordering Link:</span> <span className="text-emerald-400">{window.location.origin}/menu/{createdCredentials.slug}</span>
              </div>
            </div>

            <ModalFooter className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCopyCredentials}>
                {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                {copied ? 'Copied Details' : 'Copy Credentials'}
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleResetAndClose}>
                Done
              </Button>
            </ModalFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-3">
            {error && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300">
                {error}
              </div>
            )}

            {/* Restaurant Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-gray-400" /> Restaurant Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Huddles"
                  required
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  Subdomain Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. huddles"
                  required
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Owner Admin Credentials */}
            <div className="p-3.5 rounded-xl bg-surface-elevated/80 border border-surface-border space-y-3">
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Restaurant Owner Login Credentials
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Owner Email
                  </label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="e.g. admin@huddles.com"
                    required
                    className="w-full bg-canvas border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Temp Password
                  </label>
                  <input
                    type="text"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="e.g. Huddles@2026"
                    required
                    className="w-full bg-canvas border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Plan & Primary Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Primary Branch</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Main Branch"
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Subscription Plan</label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                >
                  <option value="plan-starter">Starter (₹1,999/mo)</option>
                  <option value="plan-pro">Professional (₹4,999/mo)</option>
                  <option value="plan-enterprise">Enterprise (Custom)</option>
                </select>
              </div>
            </div>

            <ModalFooter className="pt-3 border-t border-surface-border flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleResetAndClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500">
                {loading ? 'Creating Restaurant...' : 'Create Restaurant'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
};
