import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building,
  Store,
  DollarSign,
  UtensilsCrossed,
  Users,
  CreditCard,
  Rocket,
  Check,
} from 'lucide-react';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { onboardingService } from './services/onboardingService';
import { OnboardingState } from './types';

const STEPS = [
  { id: 1, title: 'Identity', desc: 'Organization name & slug', icon: Building },
  { id: 2, title: 'Contact', desc: 'Business details & phone', icon: Store },
  { id: 3, title: 'Primary Branch', desc: 'Address & location', icon: Store },
  { id: 4, title: 'Regional', desc: 'Currency & timezone', icon: DollarSign },
  { id: 5, title: 'Operations', desc: 'Order types & seating', icon: UtensilsCrossed },
  { id: 6, title: 'Menu Catalog', desc: 'Starter categories', icon: UtensilsCrossed },
  { id: 7, title: 'Staff Roles', desc: 'Invite key team members', icon: Users },
  { id: 8, title: 'Subscription', desc: 'Select plan tier', icon: CreditCard },
  { id: 9, title: 'Review & Launch', desc: 'Activate restaurant', icon: Rocket },
];

export const OnboardingScreen: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id || '11111111-1111-1111-1111-111111111111';

  const [state, setState] = useState<OnboardingState | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const s = await onboardingService.getOnboardingState(orgId);
        setState(s);
        setCurrentStep(s.current_step || 1);
        setFormData(s.step_data || {});
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId]);

  const handleNext = async () => {
    setSaving(true);
    try {
      const updated = await onboardingService.saveStep(orgId, currentStep, formData, true);
      setState(updated);
      if (currentStep < 9) {
        setCurrentStep(currentStep + 1);
      } else {
        await onboardingService.completeOnboarding(orgId);
        setSuccessMsg('Restaurant setup complete! Welcome to your dashboard.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">Loading onboarding state...</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-white">Restaurant Setup Wizard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Complete the 9 guided steps to configure operations, branches, catalog, and subscription.
        </p>

        {/* Step progress bar */}
        <div className="mt-6 flex items-center justify-between overflow-x-auto pb-2 gap-2">
          {STEPS.map((s) => {
            const isCompleted = state?.completed_steps.includes(s.id);
            const isCurrent = currentStep === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={`flex flex-col items-center min-w-[70px] transition text-center ${
                  isCurrent
                    ? 'text-indigo-400 font-bold'
                    : isCompleted
                    ? 'text-emerald-400'
                    : 'text-slate-500'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mb-1 border transition ${
                    isCurrent
                      ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                      : isCompleted
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-800 bg-slate-950 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : s.id}
                </div>
                <span className="text-[11px] truncate max-w-[80px]">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Current Step Content */}
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <span className="text-xs font-semibold uppercase text-indigo-400 tracking-wider">
            Step {currentStep} of 9
          </span>
          <h2 className="text-xl font-bold text-white mt-1">
            {STEPS[currentStep - 1].title} — {STEPS[currentStep - 1].desc}
          </h2>
        </div>

        {/* Step 1: Org Identity */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                Business / Restaurant Name
              </label>
              <input
                type="text"
                value={formData.org_name || ''}
                onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
                placeholder="e.g., Bella Italia Ristorante"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                Workspace URL Slug
              </label>
              <input
                type="text"
                value={formData.org_slug || ''}
                onChange={(e) => setFormData({ ...formData, org_slug: e.target.value.toLowerCase() })}
                placeholder="e.g., bella-italia"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Step 2: Contact */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                Primary Business Email
              </label>
              <input
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="owner@bellaitalia.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                Official Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+1 (555) 019-2834"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Step 3: Primary Branch */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                Branch / Location Name
              </label>
              <input
                type="text"
                value={formData.branch_name || ''}
                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                placeholder="Downtown Main Flagship"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.branch_city || ''}
                  onChange={(e) => setFormData({ ...formData, branch_city: e.target.value })}
                  placeholder="New York"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  Country Code
                </label>
                <input
                  type="text"
                  value={formData.branch_country || 'US'}
                  onChange={(e) => setFormData({ ...formData, branch_country: e.target.value.toUpperCase() })}
                  maxLength={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Regional */}
        {currentStep === 4 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                Currency
              </label>
              <select
                value={formData.currency || 'USD'}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                Timezone
              </label>
              <select
                value={formData.timezone || 'America/New_York'}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="America/New_York">Eastern Time (US)</option>
                <option value="America/Chicago">Central Time (US)</option>
                <option value="America/Los_Angeles">Pacific Time (US)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Central Europe (CET)</option>
                <option value="Asia/Kolkata">India (IST)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 5: Operations */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase">
              Supported Service Channels
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['dine_in', 'takeaway', 'delivery'].map((type) => {
                const selected = (formData.order_types || ['dine_in', 'takeaway']).includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const current = formData.order_types || ['dine_in', 'takeaway'];
                      const next = selected
                        ? current.filter((t: string) => t !== type)
                        : [...current, type];
                      setFormData({ ...formData, order_types: next });
                    }}
                    className={`p-4 rounded-xl border text-sm font-semibold capitalize transition ${
                      selected
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 6: Menu */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Pick starter menu categories. You can fully customize dishes, modifiers, and recipes later.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['Appetizers', 'Main Courses', 'Woodfired Pizza', 'Pasta & Risotto', 'Desserts', 'Beverages', 'Wine & Cocktails'].map(
                (cat) => {
                  const selected = (formData.sample_categories || ['Main Courses', 'Beverages']).includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        const cur = formData.sample_categories || ['Main Courses', 'Beverages'];
                        const next = selected ? cur.filter((c: string) => c !== cat) : [...cur, cat];
                        setFormData({ ...formData, sample_categories: next });
                      }}
                      className={`p-3 rounded-xl border text-xs font-medium transition ${
                        selected
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* Step 7: Staff Roles */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Prepare invitations for your restaurant management and frontline personnel.
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="font-semibold text-slate-200">Owner Account: Active</div>
              <div className="text-slate-500">
                You will be able to send invite tokens to General Managers, Cashiers, Kitchen Staff, and Auditors via the Team Members panel after launch.
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Plan */}
        {currentStep === 8 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'plan-starter', name: 'Starter', price: '$29/mo', desc: '1 branch, 5 staff' },
                { id: 'plan-growth', name: 'Growth', price: '$79/mo', desc: '3 branches, 20 staff, CRM' },
                { id: 'plan-pro', name: 'Professional', price: '$149/mo', desc: '10 branches, 50 staff, Full Suite' },
              ].map((p) => {
                const selected = (formData.selected_plan_id || 'plan-pro') === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setFormData({ ...formData, selected_plan_id: p.id })}
                    className={`p-5 rounded-2xl border cursor-pointer transition ${
                      selected
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-white text-base">{p.name}</div>
                    <div className="text-2xl font-extrabold text-indigo-400 mt-2">{p.price}</div>
                    <p className="text-xs text-slate-400 mt-2">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 9: Review & Launch */}
        {currentStep === 9 && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Restaurant:</span>
                <span className="font-bold text-white">{formData.org_name || 'Bella Italia Bistro'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Primary Branch:</span>
                <span className="font-semibold text-slate-200">{formData.branch_name || 'Main Downtown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Currency & Timezone:</span>
                <span className="font-semibold text-slate-200">{formData.currency || 'USD'} ({formData.timezone || 'UTC'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Selected Plan:</span>
                <span className="font-bold text-indigo-400 capitalize">{(formData.selected_plan_id || 'plan-pro').replace('plan-', '')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          <button
            onClick={handleBack}
            disabled={currentStep === 1 || saving}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-30 text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <button
            onClick={handleNext}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {saving ? (
              'Saving...'
            ) : currentStep === 9 ? (
              <>
                <Rocket className="w-4 h-4" /> Launch Restaurant
              </>
            ) : (
              <>
                Save & Continue <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
export default OnboardingScreen;
