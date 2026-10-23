export type ChecklistCategory =
  | 'opening'
  | 'closing'
  | 'hygiene_cleaning'
  | 'equipment_maintenance'
  | 'food_temperature'
  | 'cash_handover'
  | 'stock_count';

export type ChecklistFrequency = 'daily' | 'shift' | 'weekly' | 'adhoc';

export interface ChecklistTemplateItem {
  id: string;
  template_id: string;
  item_order: number;
  task_description: string;
  is_required: boolean;
  requires_notes: boolean;
  requires_temperature_reading: boolean;
  min_temperature: number | null;
  max_temperature: number | null;
}

export interface ChecklistTemplate {
  id: string;
  organization_id: string;
  branch_id: string | null;
  title: string;
  description: string | null;
  category: ChecklistCategory;
  assigned_role: string;
  frequency: ChecklistFrequency;
  is_active: boolean;
  items?: ChecklistTemplateItem[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistInstanceItem {
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
}

export interface ChecklistInstance {
  id: string;
  organization_id: string;
  branch_id: string;
  template_id: string;
  template_title?: string;
  category?: ChecklistCategory;
  scheduled_date: string;
  shift_name: string;
  status: 'in_progress' | 'completed' | 'flagged_exceptions';
  started_at: string;
  completed_at: string | null;
  completed_by: string | null;
  total_items: number;
  completed_items: number;
  exception_notes: string | null;
  items?: ChecklistInstanceItem[];
  created_at: string;
  updated_at: string;
}
