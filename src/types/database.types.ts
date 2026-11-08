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
  | 'waiter'
  | 'kitchen'
  | 'inventory'
  | 'operations'
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
          customer_id: string | null;
          loyalty_points_earned: number;
          loyalty_points_redeemed: number;
          loyalty_discount_amount: number;
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
          customer_id?: string | null;
          loyalty_points_earned?: number;
          loyalty_points_redeemed?: number;
          loyalty_discount_amount?: number;
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
          customer_id?: string | null;
          loyalty_points_earned?: number;
          loyalty_points_redeemed?: number;
          loyalty_discount_amount?: number;
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
      suppliers: {
        Row: {
          id: string;
          organization_id: string;
          company_name: string;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          tax_number: string | null;
          payment_terms_days: number;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_name: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          tax_number?: string | null;
          payment_terms_days?: number;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          company_name?: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          tax_number?: string | null;
          payment_terms_days?: number;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ingredients: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          normalized_name: string;
          sku: string | null;
          category: string;
          base_unit: string;
          purchase_unit: string;
          purchase_unit_factor: number;
          density_g_per_ml: number | null;
          reorder_level: number;
          ideal_stock: number;
          current_cost_price: number;
          preferred_supplier_id: string | null;
          is_perishable: boolean;
          expiry_days: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          sku?: string | null;
          category?: string;
          base_unit: string;
          purchase_unit?: string;
          purchase_unit_factor?: number;
          density_g_per_ml?: number | null;
          reorder_level?: number;
          ideal_stock?: number;
          current_cost_price?: number;
          preferred_supplier_id?: string | null;
          is_perishable?: boolean;
          expiry_days?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          sku?: string | null;
          category?: string;
          base_unit?: string;
          purchase_unit?: string;
          purchase_unit_factor?: number;
          density_g_per_ml?: number | null;
          reorder_level?: number;
          ideal_stock?: number;
          current_cost_price?: number;
          preferred_supplier_id?: string | null;
          is_perishable?: boolean;
          expiry_days?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      stock_locations: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      branch_inventory_stocks: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          ingredient_id: string;
          location_id: string | null;
          current_stock: number;
          last_movement_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          ingredient_id: string;
          location_id?: string | null;
          current_stock?: number;
          last_movement_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          ingredient_id?: string;
          location_id?: string | null;
          current_stock?: number;
          last_movement_at?: string;
          updated_at?: string;
        };
      };
      recipes: {
        Row: {
          id: string;
          organization_id: string;
          menu_item_id: string;
          version: number;
          yield_servings: number;
          preparation_instructions: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          menu_item_id: string;
          version?: number;
          yield_servings?: number;
          preparation_instructions?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          menu_item_id?: string;
          version?: number;
          yield_servings?: number;
          preparation_instructions?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      recipe_ingredients: {
        Row: {
          id: string;
          organization_id: string;
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          unit: string;
          wastage_percentage: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          unit: string;
          wastage_percentage?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          recipe_id?: string;
          ingredient_id?: string;
          quantity?: number;
          unit?: string;
          wastage_percentage?: number;
          created_at?: string;
        };
      };
      stock_movements: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          ingredient_id: string;
          location_id: string | null;
          movement_type: string;
          quantity: number;
          unit: string;
          unit_cost: number;
          total_cost: number;
          resulting_stock: number | null;
          reference_id: string | null;
          reference_type: string | null;
          idempotency_key: string | null;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          ingredient_id: string;
          location_id?: string | null;
          movement_type: string;
          quantity: number;
          unit: string;
          unit_cost?: number;
          total_cost?: number;
          resulting_stock?: number | null;
          reference_id?: string | null;
          reference_type?: string | null;
          idempotency_key?: string | null;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          ingredient_id?: string;
          location_id?: string | null;
          movement_type?: string;
          quantity?: number;
          unit?: string;
          unit_cost?: number;
          total_cost?: number;
          resulting_stock?: number | null;
          reference_id?: string | null;
          reference_type?: string | null;
          idempotency_key?: string | null;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      purchase_orders: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          supplier_id: string;
          po_number: string;
          status: string;
          total_amount: number;
          expected_delivery_date: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          supplier_id: string;
          po_number: string;
          status?: string;
          total_amount?: number;
          expected_delivery_date?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          supplier_id?: string;
          po_number?: string;
          status?: string;
          total_amount?: number;
          expected_delivery_date?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      purchase_order_items: {
        Row: {
          id: string;
          organization_id: string;
          purchase_order_id: string;
          ingredient_id: string;
          quantity: number;
          purchase_unit: string;
          conversion_factor: number;
          unit_price: number;
          total_price: number;
          received_quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          purchase_order_id: string;
          ingredient_id: string;
          quantity: number;
          purchase_unit: string;
          conversion_factor?: number;
          unit_price: number;
          total_price?: number;
          received_quantity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          purchase_order_id?: string;
          ingredient_id?: string;
          quantity?: number;
          purchase_unit?: string;
          conversion_factor?: number;
          unit_price?: number;
          total_price?: number;
          received_quantity?: number;
          created_at?: string;
        };
      };
      goods_receipts: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          purchase_order_id: string | null;
          supplier_id: string;
          location_id: string | null;
          grn_number: string;
          invoice_number: string | null;
          invoice_date: string | null;
          total_amount: number;
          status: string;
          notes: string | null;
          received_by: string | null;
          idempotency_key: string | null;
          received_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          purchase_order_id?: string | null;
          supplier_id: string;
          location_id?: string | null;
          grn_number: string;
          invoice_number?: string | null;
          invoice_date?: string | null;
          total_amount?: number;
          status?: string;
          notes?: string | null;
          received_by?: string | null;
          idempotency_key?: string | null;
          received_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          purchase_order_id?: string | null;
          supplier_id?: string;
          location_id?: string | null;
          grn_number?: string;
          invoice_number?: string | null;
          invoice_date?: string | null;
          total_amount?: number;
          status?: string;
          notes?: string | null;
          received_by?: string | null;
          idempotency_key?: string | null;
          received_at?: string;
          created_at?: string;
        };
      };
      goods_receipt_items: {
        Row: {
          id: string;
          organization_id: string;
          goods_receipt_id: string;
          ingredient_id: string;
          received_quantity: number;
          rejected_quantity: number;
          purchase_unit: string;
          conversion_factor: number;
          normalized_quantity: number;
          unit_cost: number;
          total_cost: number;
          batch_number: string | null;
          expiry_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          goods_receipt_id: string;
          ingredient_id: string;
          received_quantity: number;
          rejected_quantity?: number;
          purchase_unit: string;
          conversion_factor?: number;
          normalized_quantity: number;
          unit_cost: number;
          total_cost?: number;
          batch_number?: string | null;
          expiry_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          goods_receipt_id?: string;
          ingredient_id?: string;
          received_quantity?: number;
          rejected_quantity?: number;
          purchase_unit?: string;
          conversion_factor?: number;
          normalized_quantity?: number;
          unit_cost?: number;
          total_cost?: number;
          batch_number?: string | null;
          expiry_date?: string | null;
          created_at?: string;
        };
      };
      expense_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          category_id: string | null;
          category_name: string;
          description: string;
          amount: number;
          currency: string;
          payment_method: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'petty_cash' | 'other';
          payment_status: 'paid' | 'pending' | 'cancelled';
          payee_name: string | null;
          supplier_id: string | null;
          incurred_date: string;
          paid_date: string | null;
          receipt_url: string | null;
          idempotency_key: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          category_id?: string | null;
          category_name: string;
          description: string;
          amount: number;
          currency?: string;
          payment_method: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'petty_cash' | 'other';
          payment_status?: 'paid' | 'pending' | 'cancelled';
          payee_name?: string | null;
          supplier_id?: string | null;
          incurred_date?: string;
          paid_date?: string | null;
          receipt_url?: string | null;
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          category_id?: string | null;
          category_name?: string;
          description?: string;
          amount?: number;
          currency?: string;
          payment_method?: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'petty_cash' | 'other';
          payment_status?: 'paid' | 'pending' | 'cancelled';
          payee_name?: string | null;
          supplier_id?: string | null;
          incurred_date?: string;
          paid_date?: string | null;
          receipt_url?: string | null;
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cash_shifts: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          opened_by: string | null;
          closed_by: string | null;
          shift_number: string;
          opened_at: string;
          closed_at: string | null;
          opening_float: number;
          cash_sales_amount: number;
          cash_refunds_amount: number;
          cash_in_amount: number;
          cash_out_amount: number;
          cash_expenses_amount: number;
          expected_cash: number | null;
          actual_cash: number | null;
          variance: number | null;
          status: 'open' | 'closed' | 'reconciled';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          opened_by?: string | null;
          closed_by?: string | null;
          shift_number: string;
          opened_at?: string;
          closed_at?: string | null;
          opening_float?: number;
          cash_sales_amount?: number;
          cash_refunds_amount?: number;
          cash_in_amount?: number;
          cash_out_amount?: number;
          cash_expenses_amount?: number;
          expected_cash?: number | null;
          actual_cash?: number | null;
          variance?: number | null;
          status?: 'open' | 'closed' | 'reconciled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          opened_by?: string | null;
          closed_by?: string | null;
          shift_number?: string;
          opened_at?: string;
          closed_at?: string | null;
          opening_float?: number;
          cash_sales_amount?: number;
          cash_refunds_amount?: number;
          cash_in_amount?: number;
          cash_out_amount?: number;
          cash_expenses_amount?: number;
          expected_cash?: number | null;
          actual_cash?: number | null;
          variance?: number | null;
          status?: 'open' | 'closed' | 'reconciled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cash_shift_movements: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          cash_shift_id: string;
          movement_type: 'cash_in' | 'cash_out' | 'petty_expense';
          amount: number;
          reason: string;
          performed_by: string | null;
          idempotency_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          cash_shift_id: string;
          movement_type: 'cash_in' | 'cash_out' | 'petty_expense';
          amount: number;
          reason: string;
          performed_by?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          cash_shift_id?: string;
          movement_type?: 'cash_in' | 'cash_out' | 'petty_expense';
          amount?: number;
          reason?: string;
          performed_by?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
        };
      };
      supplier_payments: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          supplier_id: string;
          goods_receipt_id: string | null;
          amount: number;
          payment_method: 'bank_transfer' | 'cheque' | 'cash' | 'card' | 'other';
          payment_date: string;
          reference_number: string | null;
          notes: string | null;
          idempotency_key: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          supplier_id: string;
          goods_receipt_id?: string | null;
          amount: number;
          payment_method: 'bank_transfer' | 'cheque' | 'cash' | 'card' | 'other';
          payment_date?: string;
          reference_number?: string | null;
          notes?: string | null;
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          supplier_id?: string;
          goods_receipt_id?: string | null;
          amount?: number;
          payment_method?: 'bank_transfer' | 'cheque' | 'cash' | 'card' | 'other';
          payment_date?: string;
          reference_number?: string | null;
          notes?: string | null;
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          document_type: 'supplier_invoice' | 'expense_receipt' | 'goods_receipt_support' | 'operational_doc';
          file_name: string;
          file_path: string;
          file_size_bytes: number;
          mime_type: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
          file_hash: string | null;
          status: 'uploaded' | 'queued' | 'processing' | 'needs_review' | 'verified' | 'rejected' | 'failed';
          rejection_reason: string | null;
          error_message: string | null;
          uploaded_by: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          verified_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          document_type: 'supplier_invoice' | 'expense_receipt' | 'goods_receipt_support' | 'operational_doc';
          file_name: string;
          file_path: string;
          file_size_bytes: number;
          mime_type: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
          file_hash?: string | null;
          status?: 'uploaded' | 'queued' | 'processing' | 'needs_review' | 'verified' | 'rejected' | 'failed';
          rejection_reason?: string | null;
          error_message?: string | null;
          uploaded_by?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          verified_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          document_type?: 'supplier_invoice' | 'expense_receipt' | 'goods_receipt_support' | 'operational_doc';
          file_name?: string;
          file_path?: string;
          file_size_bytes?: number;
          mime_type?: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
          file_hash?: string | null;
          status?: 'uploaded' | 'queued' | 'processing' | 'needs_review' | 'verified' | 'rejected' | 'failed';
          rejection_reason?: string | null;
          error_message?: string | null;
          uploaded_by?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          verified_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_extractions: {
        Row: {
          id: string;
          organization_id: string;
          document_id: string;
          provider: string;
          raw_text: string | null;
          confidence_score: number | null;
          extracted_data: Json;
          corrected_data: Json | null;
          matched_entity_type: 'supplier' | 'expense' | 'purchase_order' | 'goods_receipt' | null;
          matched_entity_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          document_id: string;
          provider?: string;
          raw_text?: string | null;
          confidence_score?: number | null;
          extracted_data?: Json;
          corrected_data?: Json | null;
          matched_entity_type?: 'supplier' | 'expense' | 'purchase_order' | 'goods_receipt' | null;
          matched_entity_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          document_id?: string;
          provider?: string;
          raw_text?: string | null;
          confidence_score?: number | null;
          extracted_data?: Json;
          corrected_data?: Json | null;
          matched_entity_type?: 'supplier' | 'expense' | 'purchase_order' | 'goods_receipt' | null;
          matched_entity_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      checklist_templates: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string | null;
          title: string;
          description: string | null;
          category: 'opening' | 'closing' | 'hygiene_cleaning' | 'equipment_maintenance' | 'food_temperature' | 'cash_handover' | 'stock_count';
          assigned_role: string;
          frequency: 'daily' | 'shift' | 'weekly' | 'adhoc';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id?: string | null;
          title: string;
          description?: string | null;
          category: 'opening' | 'closing' | 'hygiene_cleaning' | 'equipment_maintenance' | 'food_temperature' | 'cash_handover' | 'stock_count';
          assigned_role?: string;
          frequency?: 'daily' | 'shift' | 'weekly' | 'adhoc';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string | null;
          title?: string;
          description?: string | null;
          category?: 'opening' | 'closing' | 'hygiene_cleaning' | 'equipment_maintenance' | 'food_temperature' | 'cash_handover' | 'stock_count';
          assigned_role?: string;
          frequency?: 'daily' | 'shift' | 'weekly' | 'adhoc';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      checklist_template_items: {
        Row: {
          id: string;
          template_id: string;
          item_order: number;
          task_description: string;
          is_required: boolean;
          requires_notes: boolean;
          requires_temperature_reading: boolean;
          min_temperature: number | null;
          max_temperature: number | null;
        };
        Insert: {
          id?: string;
          template_id: string;
          item_order?: number;
          task_description: string;
          is_required?: boolean;
          requires_notes?: boolean;
          requires_temperature_reading?: boolean;
          min_temperature?: number | null;
          max_temperature?: number | null;
        };
        Update: {
          id?: string;
          template_id?: string;
          item_order?: number;
          task_description?: string;
          is_required?: boolean;
          requires_notes?: boolean;
          requires_temperature_reading?: boolean;
          min_temperature?: number | null;
          max_temperature?: number | null;
        };
      };
      checklist_instances: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          template_id: string;
          scheduled_date: string;
          shift_name: string;
          status: 'in_progress' | 'completed' | 'flagged_exceptions';
          started_at: string;
          completed_at: string | null;
          completed_by: string | null;
          total_items: number;
          completed_items: number;
          exception_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id: string;
          template_id: string;
          scheduled_date?: string;
          shift_name?: string;
          status?: 'in_progress' | 'completed' | 'flagged_exceptions';
          started_at?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          total_items?: number;
          completed_items?: number;
          exception_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string;
          template_id?: string;
          scheduled_date?: string;
          shift_name?: string;
          status?: 'in_progress' | 'completed' | 'flagged_exceptions';
          started_at?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          total_items?: number;
          completed_items?: number;
          exception_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      checklist_instance_items: {
        Row: {
          id: string;
          instance_id: string;
          template_item_id: string | null;
          task_description: string;
          is_completed: boolean;
          completed_at: string | null;
          completed_by: string | null;
          notes: string | null;
          temperature_reading: number | null;
          is_exception: boolean;
          exception_reason: string | null;
        };
        Insert: {
          id?: string;
          instance_id: string;
          template_item_id?: string | null;
          task_description: string;
          is_completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          notes?: string | null;
          temperature_reading?: number | null;
          is_exception?: boolean;
          exception_reason?: string | null;
        };
        Update: {
          id?: string;
          instance_id?: string;
          template_item_id?: string | null;
          task_description?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          notes?: string | null;
          temperature_reading?: number | null;
          is_exception?: boolean;
          exception_reason?: string | null;
        };
      };
      subscription_plans: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          price_monthly: number;
          price_annual: number;
          max_branches: number;
          max_staff: number;
          allowed_modules: Json;
          feature_flags: Json;
          trial_period_days: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          price_monthly?: number;
          price_annual?: number;
          max_branches?: number;
          max_staff?: number;
          allowed_modules?: Json;
          feature_flags?: Json;
          trial_period_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          price_monthly?: number;
          price_annual?: number;
          max_branches?: number;
          max_staff?: number;
          allowed_modules?: Json;
          feature_flags?: Json;
          trial_period_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          plan_id: string;
          status: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
          billing_cycle: 'monthly' | 'annual';
          current_period_start: string;
          current_period_end: string;
          trial_ends_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          plan_id: string;
          status?: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
          billing_cycle?: 'monthly' | 'annual';
          current_period_start?: string;
          current_period_end?: string;
          trial_ends_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          plan_id?: string;
          status?: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
          billing_cycle?: 'monthly' | 'annual';
          current_period_start?: string;
          current_period_end?: string;
          trial_ends_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscription_invoices: {
        Row: {
          id: string;
          organization_id: string;
          subscription_id: string;
          invoice_number: string;
          amount: number;
          currency: string;
          status: 'draft' | 'paid' | 'unpaid' | 'void';
          period_start: string;
          period_end: string;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          subscription_id: string;
          invoice_number: string;
          amount: number;
          currency?: string;
          status?: 'draft' | 'paid' | 'unpaid' | 'void';
          period_start: string;
          period_end: string;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          subscription_id?: string;
          invoice_number?: string;
          amount?: number;
          currency?: string;
          status?: 'draft' | 'paid' | 'unpaid' | 'void';
          period_start?: string;
          period_end?: string;
          paid_at?: string | null;
          created_at?: string;
        };
      };
      platform_audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_org_id: string | null;
          details: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_org_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          target_org_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
      };
      organization_onboarding: {
        Row: {
          id: string;
          organization_id: string;
          current_step: number;
          completed_steps: number[];
          is_completed: boolean;
          step_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          current_step?: number;
          completed_steps?: number[];
          is_completed?: boolean;
          step_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          current_step?: number;
          completed_steps?: number[];
          is_completed?: boolean;
          step_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          display_name: string;
          email: string | null;
          phone: string | null;
          notes: string | null;
          tags: Json;
          total_orders_count: number;
          total_spend_amount: number;
          last_order_at: string | null;
          loyalty_points_balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          display_name: string;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          tags?: Json;
          total_orders_count?: number;
          total_spend_amount?: number;
          last_order_at?: string | null;
          loyalty_points_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          display_name?: string;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          tags?: Json;
          total_orders_count?: number;
          total_spend_amount?: number;
          last_order_at?: string | null;
          loyalty_points_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      loyalty_configs: {
        Row: {
          id: string;
          organization_id: string;
          is_enabled: boolean;
          points_per_currency_unit: number;
          currency_value_per_point: number;
          min_redemption_points: number;
          max_redemption_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          is_enabled?: boolean;
          points_per_currency_unit?: number;
          currency_value_per_point?: number;
          min_redemption_points?: number;
          max_redemption_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          is_enabled?: boolean;
          points_per_currency_unit?: number;
          currency_value_per_point?: number;
          min_redemption_points?: number;
          max_redemption_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      customer_loyalty_ledger: {
        Row: {
          id: string;
          customer_id: string;
          organization_id: string;
          order_id: string | null;
          entry_type: 'earn' | 'redeem' | 'reversal' | 'manual_adjustment';
          points: number;
          balance_after: number;
          idempotency_key: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          organization_id: string;
          order_id?: string | null;
          entry_type: 'earn' | 'redeem' | 'reversal' | 'manual_adjustment';
          points: number;
          balance_after: number;
          idempotency_key: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          organization_id?: string;
          order_id?: string | null;
          entry_type?: 'earn' | 'redeem' | 'reversal' | 'manual_adjustment';
          points?: number;
          balance_after?: number;
          idempotency_key?: string;
          notes?: string | null;
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
      consume_order_stock: {
        Args: {
          p_order_id: string;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      reverse_order_stock_consumption: {
        Args: {
          p_order_id: string;
          p_reason?: string | null;
        };
        Returns: Json;
      };
      process_goods_receipt: {
        Args: {
          p_organization_id: string;
          p_branch_id: string;
          p_supplier_id: string;
          p_purchase_order_id: string | null;
          p_location_id: string | null;
          p_grn_number: string;
          p_invoice_number: string | null;
          p_invoice_date: string | null;
          p_items: Json;
          p_idempotency_key?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      record_stock_adjustment: {
        Args: {
          p_organization_id: string;
          p_branch_id: string;
          p_ingredient_id: string;
          p_location_id: string | null;
          p_movement_type: string;
          p_quantity_delta: number;
          p_reason: string;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      open_cash_shift: {
        Args: {
          p_organization_id: string;
          p_branch_id: string;
          p_opening_float: number;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      record_shift_cash_movement: {
        Args: {
          p_shift_id: string;
          p_movement_type: 'cash_in' | 'cash_out' | 'petty_expense';
          p_amount: number;
          p_reason: string;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      close_cash_shift: {
        Args: {
          p_shift_id: string;
          p_actual_cash: number;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      get_financial_report: {
        Args: {
          p_organization_id: string;
          p_branch_id?: string | null;
          p_start_date?: string;
          p_end_date?: string;
        };
        Returns: Json;
      };
      ingest_document: {
        Args: {
          p_organization_id: string;
          p_branch_id: string;
          p_document_type: string;
          p_file_name: string;
          p_file_path: string;
          p_file_size_bytes: number;
          p_mime_type: string;
          p_file_hash?: string | null;
          p_initial_extracted_data?: Json | null;
          p_confidence_score?: number | null;
        };
        Returns: Json;
      };
      review_document: {
        Args: {
          p_document_id: string;
          p_action: 'verify' | 'reject';
          p_corrected_data?: Json | null;
          p_rejection_reason?: string | null;
        };
        Returns: Json;
      };
      instantiate_checklist: {
        Args: {
          p_organization_id: string;
          p_branch_id: string;
          p_template_id: string;
          p_shift_name?: string;
        };
        Returns: Json;
      };
      toggle_checklist_item: {
        Args: {
          p_item_id: string;
          p_is_completed: boolean;
          p_notes?: string | null;
          p_temperature?: number | null;
          p_is_exception?: boolean;
          p_exception_reason?: string | null;
        };
        Returns: Json;
      };
      get_platform_metrics: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      admin_suspend_organization: {
        Args: {
          p_org_id: string;
          p_reason?: string;
        };
        Returns: Json;
      };
      admin_reactivate_organization: {
        Args: {
          p_org_id: string;
          p_reason?: string;
        };
        Returns: Json;
      };
      admin_change_subscription_plan: {
        Args: {
          p_org_id: string;
          p_new_plan_id: string;
          p_reason?: string;
        };
        Returns: Json;
      };
      check_organization_entitlement: {
        Args: {
          p_org_id: string;
          p_feature_key: string;
        };
        Returns: boolean;
      };
      check_organization_branch_limit: {
        Args: {
          p_org_id: string;
        };
        Returns: boolean;
      };
      save_onboarding_step: {
        Args: {
          p_org_id: string;
          p_step: number;
          p_step_data: Json;
          p_mark_completed?: boolean;
        };
        Returns: Json;
      };
      complete_organization_onboarding: {
        Args: {
          p_org_id: string;
        };
        Returns: Json;
      };
      record_loyalty_transaction: {
        Args: {
          p_customer_id: string;
          p_org_id: string;
          p_order_id?: string | null;
          p_entry_type: 'earn' | 'redeem' | 'reversal' | 'manual_adjustment';
          p_points: number;
          p_idempotency_key: string;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      request_subscription_plan_change: {
        Args: {
          p_org_id: string;
          p_new_plan_id: string;
          p_billing_cycle?: 'monthly' | 'annual';
          p_payment_reference?: string | null;
        };
        Returns: Json;
      };
    };
  };
}

