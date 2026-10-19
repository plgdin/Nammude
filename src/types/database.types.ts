export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrganizationStatus = 'active' | 'suspended' | 'trialing' | 'closed';
export type BranchStatus = 'active' | 'temporarily_closed' | 'inactive';
export type MembershipRole =
  | 'platform_admin'
  | 'owner'
  | 'general_manager'
  | 'branch_manager'
  | 'cashier'
  | 'kitchen'
  | 'inventory'
  | 'auditor';
export type MembershipStatus = 'active' | 'invited' | 'suspended' | 'revoked';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: OrganizationStatus;
          default_currency: string;
          currency_symbol: string;
          currency_decimals: number;
          timezone: string;
          branding: {
            brandColor: string;
            accentColor: string;
            logoUrl?: string;
          };
          created_at: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: OrganizationStatus;
          default_currency?: string;
          currency_symbol?: string;
          currency_decimals?: number;
          timezone?: string;
          branding?: Json;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          status?: OrganizationStatus;
          default_currency?: string;
          currency_symbol?: string;
          currency_decimals?: number;
          timezone?: string;
          branding?: Json;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
      };
      branches: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          code: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string | null;
          postal_code: string | null;
          country: string;
          phone: string | null;
          email: string | null;
          tax_rate: number;
          service_charge_rate: number;
          status: BranchStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          code: string;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state?: string | null;
          postal_code?: string | null;
          country?: string;
          phone?: string | null;
          email?: string | null;
          tax_rate?: number;
          service_charge_rate?: number;
          status?: BranchStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          code?: string;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string | null;
          postal_code?: string | null;
          country?: string;
          phone?: string | null;
          email?: string | null;
          tax_rate?: number;
          service_charge_rate?: number;
          status?: BranchStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          phone: string | null;
          is_platform_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: MembershipRole;
          status: MembershipStatus;
          permissions: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: MembershipRole;
          status?: MembershipStatus;
          permissions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: MembershipRole;
          status?: MembershipStatus;
          permissions?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_branch_assignments: {
        Row: {
          id: string;
          organization_id: string;
          membership_id: string;
          branch_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          membership_id: string;
          branch_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          membership_id?: string;
          branch_id?: string;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string | null;
          actor_id: string | null;
          actor_role: string | null;
          action: string;
          entity_name: string;
          entity_id: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id?: string | null;
          actor_id?: string | null;
          actor_role?: string | null;
          action: string;
          entity_name: string;
          entity_id: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string | null;
          actor_id?: string | null;
          actor_role?: string | null;
          action?: string;
          entity_name?: string;
          entity_id?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Functions: {
      is_platform_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_org_member: {
        Args: { target_org_id: string };
        Returns: boolean;
      };
      is_org_owner_or_manager: {
        Args: { target_org_id: string };
        Returns: boolean;
      };
      has_branch_permission: {
        Args: { target_branch_id: string };
        Returns: boolean;
      };
      create_organization_with_owner: {
        Args: {
          p_org_name: string;
          p_org_slug: string;
          p_default_currency: string;
          p_timezone: string;
          p_branch_name: string;
          p_branch_slug: string;
          p_branch_code: string;
          p_branch_address: string;
          p_branch_city: string;
          p_branch_country: string;
        };
        Returns: Json;
      };
    };
  };
}
