import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { Database } from '@/types/database.types';
import { SEED_ORGANIZATIONS, SEED_BRANCHES, SEED_USERS } from '@/mocks/auth.fixtures';

export type OrganizationRecord = Database['public']['Tables']['organizations']['Row'];
export type BranchRecord = Database['public']['Tables']['branches']['Row'];
export type MembershipRecord = Database['public']['Tables']['memberships']['Row'];

export interface OrganizationContextType {
  currentOrganization: OrganizationRecord | null;
  currentBranch: BranchRecord | null;
  permittedOrganizations: OrganizationRecord[];
  permittedBranches: BranchRecord[];
  currentMembership: MembershipRecord | null;
  isLoading: boolean;
  switchOrganization: (orgId: string) => void;
  switchBranch: (branchId: string) => void;
  refreshContext: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isMockMode, isAuthenticated } = useAuth();

  const [permittedOrganizations, setPermittedOrganizations] = useState<OrganizationRecord[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationRecord | null>(null);
  const [permittedBranches, setPermittedBranches] = useState<BranchRecord[]>([]);
  const [currentBranch, setCurrentBranch] = useState<BranchRecord | null>(null);
  const [currentMembership, setCurrentMembership] = useState<MembershipRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Apply tenant branding CSS custom properties
  const applyBranding = useCallback((org: OrganizationRecord | null) => {
    if (!org || !org.branding) return;
    const root = document.documentElement;
    const brandColor = org.branding.brandColor || '#2563eb';
    const accentColor = org.branding.accentColor || '#f59e0b';
    root.style.setProperty('--tenant-primary', brandColor);
    root.style.setProperty('--tenant-accent', accentColor);
  }, []);

  // Load organizations and branches for the authenticated user
  const loadContext = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPermittedOrganizations([]);
      setCurrentOrganization(null);
      setPermittedBranches([]);
      setCurrentBranch(null);
      setCurrentMembership(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (env.isConfigured && !isMockMode) {
      try {
        // 1. Fetch memberships from Supabase
        const { data: memberships, error: memErr } = await supabase
          .from('memberships')
          .select('*, organizations(*)')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (memErr) throw memErr;

        const orgs: OrganizationRecord[] = (memberships || [])
          .map((m: any) => m.organizations)
          .filter(Boolean);

        setPermittedOrganizations(orgs);

        if (orgs.length > 0) {
          const activeOrg = orgs[0];
          setCurrentOrganization(activeOrg);
          applyBranding(activeOrg);

          // Find current membership
          const activeMem = (memberships as any[])?.find(
            (m: any) => m.organization_id === activeOrg.id
          );
          if (activeMem) {
            setCurrentMembership(activeMem as MembershipRecord);
          }

          // 2. Fetch branches for the active organization
          const { data: branches, error: branchErr } = await supabase
            .from('branches')
            .select('*')
            .eq('organization_id', activeOrg.id)
            .eq('status', 'active');

          if (branchErr) throw branchErr;

          setPermittedBranches(branches || []);
          if (branches && branches.length > 0) {
            setCurrentBranch(branches[0]);
          }
        }
      } catch (err) {
        console.warn('[OrganizationContext] Failed to load live tenant context:', err);
      }
    } else {
      // Mock / Dev Mode: Resolve from typed SEED data
      const seedUser = SEED_USERS.find((u) => u.id === user.id) || SEED_USERS[0];
      const matchedOrg = SEED_ORGANIZATIONS.find((o) => o.id === seedUser.organizationId) || SEED_ORGANIZATIONS[0];
      const matchedBranches = SEED_BRANCHES.filter((b) => b.organization_id === matchedOrg.id);

      setPermittedOrganizations([matchedOrg]);
      setCurrentOrganization(matchedOrg);
      applyBranding(matchedOrg);

      setPermittedBranches(matchedBranches);
      if (matchedBranches.length > 0) {
        setCurrentBranch(matchedBranches[0]);
      }

      setCurrentMembership({
        id: `mem_${seedUser.id}`,
        organization_id: matchedOrg.id,
        user_id: seedUser.id,
        role: seedUser.role,
        status: 'active',
        permissions: ['*'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    setIsLoading(false);
  }, [isAuthenticated, user, isMockMode, applyBranding]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  // Switch Active Organization (purges previous branch state to prevent leaks)
  const switchOrganization = useCallback(
    async (orgId: string) => {
      const targetOrg = permittedOrganizations.find((o) => o.id === orgId);
      if (!targetOrg) {
        console.warn('[OrganizationContext] Unauthorized organization switch attempt:', orgId);
        return;
      }

      setIsLoading(true);
      setCurrentOrganization(targetOrg);
      applyBranding(targetOrg);

      // Invalidate / reload branches for the new tenant
      if (env.isConfigured && !isMockMode) {
        try {
          const { data: branches } = await supabase
            .from('branches')
            .select('*')
            .eq('organization_id', targetOrg.id)
            .eq('status', 'active');

          setPermittedBranches(branches || []);
          setCurrentBranch(branches && branches.length > 0 ? branches[0] : null);
        } catch (err) {
          console.warn('[OrganizationContext] Error fetching branches on org switch:', err);
        }
      } else {
        const branches = SEED_BRANCHES.filter((b) => b.organization_id === targetOrg.id);
        setPermittedBranches(branches);
        setCurrentBranch(branches.length > 0 ? branches[0] : null);
      }

      setIsLoading(false);
    },
    [permittedOrganizations, isMockMode, applyBranding]
  );

  // Switch Active Branch
  const switchBranch = useCallback(
    (branchId: string) => {
      const targetBranch = permittedBranches.find((b) => b.id === branchId);
      if (targetBranch) {
        setCurrentBranch(targetBranch);
      }
    },
    [permittedBranches]
  );

  const value: OrganizationContextType = {
    currentOrganization,
    currentBranch,
    permittedOrganizations,
    permittedBranches,
    currentMembership,
    isLoading,
    switchOrganization,
    switchBranch,
    refreshContext: loadContext,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
};

export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
