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
      menu_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          icon: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          icon?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          icon?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      menu_items: {
        Row: {
          id: string;
          organization_id: string;
          category_id: string;
          name: string;
          slug: string;
          sku: string;
          description: string | null;
          base_price: number;
          cost_price: number;
          tax_rate: number;
          is_available: boolean;
          display_order: number;
          image_url: string | null;
          kitchen_station: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          category_id: string;
          name: string;
          slug: string;
          sku: string;
          description?: string | null;
          base_price: number;
          cost_price?: number;
          tax_rate?: number;
          is_available?: boolean;
          display_order?: number;
          image_url?: string | null;
          kitchen_station?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          sku?: string;
          description?: string | null;
          base_price?: number;
          cost_price?: number;
          tax_rate?: number;
          is_available?: boolean;
          display_order?: number;
          image_url?: string | null;
          kitchen_station?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      modifier_groups: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          min_selection: number;
          max_selection: number;
          is_required: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          min_selection?: number;
          max_selection?: number;
          is_required?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          min_selection?: number;
          max_selection?: number;
          is_required?: boolean;
          display_order?: number;
          created_at?: string;
        };
      };
      modifiers: {
        Row: {
          id: string;
          organization_id: string;
          group_id: string;
          name: string;
          additional_price: number;
          cost_price: number;
          is_available: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          group_id: string;
          name: string;
          additional_price?: number;
          cost_price?: number;
          is_available?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          group_id?: string;
          name?: string;
          additional_price?: number;
          cost_price?: number;
          is_available?: boolean;
          display_order?: number;
          created_at?: string;
        };
      };
      menu_item_modifier_groups: {
        Row: {
          id: string;
          organization_id: string;
          menu_item_id: string;
          modifier_group_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          menu_item_id: string;
          modifier_group_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          menu_item_id?: string;
          modifier_group_id?: string;
          created_at?: string;
        };
      };
      dining_tables: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          table_number: string;
          section: string;
          capacity: number;
          current_status: 'vacant' | 'occupied' | 'billed' | 'reserved' | 'cleaning';
          qr_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          table_number: string;
          section?: string;
          capacity?: number;
          current_status?: 'vacant' | 'occupied' | 'billed' | 'reserved' | 'cleaning';
          qr_token?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          table_number?: string;
          section?: string;
          capacity?: number;
          current_status?: 'vacant' | 'occupied' | 'billed' | 'reserved' | 'cleaning';
          qr_token?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          table_id: string | null;
          order_number: string;
          order_type: 'dine_in' | 'takeaway' | 'delivery' | 'qr_self_order';
          status: 'draft' | 'confirmed' | 'in_prep' | 'ready' | 'served' | 'completed' | 'cancelled';
          guest_count: number;
          subtotal_amount: number;
          discount_amount: number;
          discount_percent: number;
          discount_reason: string | null;
          tax_amount: number;
          service_charge_amount: number;
          total_amount: number;
          paid_amount: number;
          cashier_user_id: string | null;
          notes: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          table_id?: string | null;
          order_number: string;
          order_type: 'dine_in' | 'takeaway' | 'delivery' | 'qr_self_order';
          status?: 'draft' | 'confirmed' | 'in_prep' | 'ready' | 'served' | 'completed' | 'cancelled';
          guest_count?: number;
          subtotal_amount?: number;
          discount_amount?: number;
          discount_percent?: number;
          discount_reason?: string | null;
          tax_amount?: number;
          service_charge_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          cashier_user_id?: string | null;
          notes?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          table_id?: string | null;
          order_number?: string;
          order_type?: 'dine_in' | 'takeaway' | 'delivery' | 'qr_self_order';
          status?: 'draft' | 'confirmed' | 'in_prep' | 'ready' | 'served' | 'completed' | 'cancelled';
          guest_count?: number;
          subtotal_amount?: number;
          discount_amount?: number;
          discount_percent?: number;
          discount_reason?: string | null;
          tax_amount?: number;
          service_charge_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          cashier_user_id?: string | null;
          notes?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          organization_id: string;
          order_id: string;
          menu_item_id: string;
          item_name: string;
          unit_price: number;
          quantity: number;
          discount_amount: number;
          tax_amount: number;
          total_price: number;
          selected_modifiers: Json;
          special_instructions: string | null;
          status: 'pending' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'served' | 'cancelled';
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          order_id: string;
          menu_item_id: string;
          item_name: string;
          unit_price: number;
          quantity: number;
          discount_amount?: number;
          tax_amount?: number;
          total_price: number;
          selected_modifiers?: Json;
          special_instructions?: string | null;
          status?: 'pending' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'served' | 'cancelled';
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          order_id?: string;
          menu_item_id?: string;
          item_name?: string;
          unit_price?: number;
          quantity?: number;
          discount_amount?: number;
          tax_amount?: number;
          total_price?: number;
          selected_modifiers?: Json;
          special_instructions?: string | null;
          status?: 'pending' | 'sent_to_kitchen' | 'preparing' | 'ready' | 'served' | 'cancelled';
          created_at?: string;
        };
      };
      kot_tickets: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          order_id: string;
          kot_number: string;
          station: string;
          status: 'queued' | 'in_progress' | 'ready' | 'bumped';
          items_snapshot: Json;
          created_at: string;
          updated_at: string;
          bumped_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          order_id: string;
          kot_number: string;
          station?: string;
          status?: 'queued' | 'in_progress' | 'ready' | 'bumped';
          items_snapshot?: Json;
          created_at?: string;
          updated_at?: string;
          bumped_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          order_id?: string;
          kot_number?: string;
          station?: string;
          status?: 'queued' | 'in_progress' | 'ready' | 'bumped';
          items_snapshot?: Json;
          created_at?: string;
          updated_at?: string;
          bumped_at?: string | null;
        };
      };
      payments: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          order_id: string;
          payment_method: 'cash' | 'card' | 'upi_qr' | 'wallet' | 'account';
          amount: number;
          tip_amount: number;
          reference_number: string | null;
          status: 'pending' | 'completed' | 'failed' | 'refunded';
          idempotency_key: string;
          settled_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          order_id: string;
          payment_method: 'cash' | 'card' | 'upi_qr' | 'wallet' | 'account';
          amount: number;
          tip_amount?: number;
          reference_number?: string | null;
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          idempotency_key: string;
          settled_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          order_id?: string;
          payment_method?: 'cash' | 'card' | 'upi_qr' | 'wallet' | 'account';
          amount?: number;
          tip_amount?: number;
          reference_number?: string | null;
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          idempotency_key?: string;
          settled_by?: string | null;
          created_at?: string;
        };
      };
      payment_refunds: {
        Row: {
          id: string;
          organization_id: string;
          payment_id: string;
          refund_amount: number;
          reason: string;
          approved_by: string;
          idempotency_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          payment_id: string;
          refund_amount: number;
          reason: string;
          approved_by: string;
          idempotency_key: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          payment_id?: string;
          refund_amount?: number;
          reason?: string;
          approved_by?: string;
          idempotency_key?: string;
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
      create_order_transactional: {
        Args: {
          p_organization_id: string;
          p_branch_id: string;
          p_order_type: string;
          p_table_id: string | null;
          p_guest_count: number;
          p_discount_percent: number;
          p_discount_reason: string | null;
          p_notes: string | null;
          p_idempotency_key: string | null;
          p_items: Json;
        };
        Returns: Json;
      };
    };
  };
}
