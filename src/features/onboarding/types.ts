export interface OnboardingState {
  organization_id: string;
  current_step: number; // 1 to 9
  completed_steps: number[];
  is_completed: boolean;
  step_data: {
    // Step 1: Org identity
    org_name?: string;
    org_slug?: string;
    // Step 2: Contact
    contact_email?: string;
    contact_phone?: string;
    business_type?: string;
    // Step 3: Primary branch
    branch_name?: string;
    branch_slug?: string;
    branch_address?: string;
    branch_city?: string;
    branch_country?: string;
    // Step 4: Regional
    currency?: string;
    timezone?: string;
    tax_rate?: number;
    // Step 5: Operations
    order_types?: string[]; // dine_in, takeaway, delivery
    table_count?: number;
    // Step 6: Menu
    sample_categories?: string[];
    // Step 7: Staff invites
    staff_invites?: Array<{ email: string; role: string }>;
    // Step 8: Plan
    selected_plan_id?: string;
    billing_cycle?: 'monthly' | 'annual';
  };
}
