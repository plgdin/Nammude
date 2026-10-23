import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import {
  ChecklistTemplate,
  ChecklistInstance,
  ChecklistInstanceItem,
} from '../types';

let localTemplates: ChecklistTemplate[] = [
  {
    id: 'tmpl-001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: null,
    title: 'Morning FOH Opening & Register Preparation',
    description: 'Front of house register inspection, float count, and dining area sanitation.',
    category: 'opening',
    assigned_role: 'cashier',
    frequency: 'daily',
    is_active: true,
    items: [
      {
        id: 'titem-101',
        template_id: 'tmpl-001',
        item_order: 1,
        task_description: 'Verify POS cash drawer physical opening float count matches SHIFT opening float ($250).',
        is_required: true,
        requires_notes: false,
        requires_temperature_reading: false,
        min_temperature: null,
        max_temperature: null,
      },
      {
        id: 'titem-102',
        template_id: 'tmpl-001',
        item_order: 2,
        task_description: 'Inspect receipt printers, test roll feed, and confirm backup paper loaded.',
        is_required: true,
        requires_notes: false,
        requires_temperature_reading: false,
        min_temperature: null,
        max_temperature: null,
      },
      {
        id: 'titem-103',
        template_id: 'tmpl-001',
        item_order: 3,
        task_description: 'Wipe and sanitize dining tables, condiment caddies, and door handles.',
        is_required: true,
        requires_notes: false,
        requires_temperature_reading: false,
        min_temperature: null,
        max_temperature: null,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: null,
    title: 'Kitchen Walk-In Cooler & Freezer Temperature Check',
    description: 'Mandatory cold storage temperature monitoring for food safety compliance.',
    category: 'food_temperature',
    assigned_role: 'kitchen',
    frequency: 'shift',
    is_active: true,
    items: [
      {
        id: 'titem-201',
        template_id: 'tmpl-002',
        item_order: 1,
        task_description: 'Main Walk-In Refrigerator internal temperature reading (Must be between 33°F and 40°F).',
        is_required: true,
        requires_notes: true,
        requires_temperature_reading: true,
        min_temperature: 33.0,
        max_temperature: 40.0,
      },
      {
        id: 'titem-202',
        template_id: 'tmpl-002',
        item_order: 2,
        task_description: 'Deep Freezer storage internal temperature reading (Must be <= 0°F).',
        is_required: true,
        requires_notes: true,
        requires_temperature_reading: true,
        min_temperature: -20.0,
        max_temperature: 0.0,
      },
      {
        id: 'titem-203',
        template_id: 'tmpl-002',
        item_order: 3,
        task_description: 'Verify all dairy, meat, and prepped produce containers have valid FIFO date labels.',
        is_required: true,
        requires_notes: false,
        requires_temperature_reading: false,
        min_temperature: null,
        max_temperature: null,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-003',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: null,
    title: 'Nightly Closing & Deep Kitchen Sanitation',
    description: 'End-of-day kitchen equipment shutdown, grease trap check, and floor sanitization.',
    category: 'closing',
    assigned_role: 'kitchen',
    frequency: 'daily',
    is_active: true,
    items: [
      {
        id: 'titem-301',
        template_id: 'tmpl-003',
        item_order: 1,
        task_description: 'Turn off all commercial ovens, burners, grill hoods, and verify gas isolation valves.',
        is_required: true,
        requires_notes: false,
        requires_temperature_reading: false,
        min_temperature: null,
        max_temperature: null,
      },
      {
        id: 'titem-302',
        template_id: 'tmpl-003',
        item_order: 2,
        task_description: 'Empty and sanitize espresso machine drip trays, groupheads, and steam wands.',
        is_required: true,
        requires_notes: false,
        requires_temperature_reading: false,
        min_temperature: null,
        max_temperature: null,
      },
      {
        id: 'titem-303',
        template_id: 'tmpl-003',
        item_order: 3,
        task_description: 'Take out all kitchen refuse and secure back alley loading dock doors.',
        is_required: true,
        requires_notes: false,
        requires_temperature_reading: false,
        min_temperature: null,
        max_temperature: null,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let localInstances: ChecklistInstance[] = [
  {
    id: 'inst-001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    template_id: 'tmpl-001',
    template_title: 'Morning FOH Opening & Register Preparation',
    category: 'opening',
    scheduled_date: new Date().toISOString().split('T')[0],
    shift_name: 'Morning Opening',
    status: 'completed',
    started_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    completed_at: new Date(Date.now() - 3600000 * 4.5).toISOString(),
    completed_by: null,
    total_items: 3,
    completed_items: 3,
    exception_notes: null,
    items: [
      {
        id: 'inst-item-1',
        instance_id: 'inst-001',
        template_item_id: 'titem-101',
        task_description: 'Verify POS cash drawer physical opening float count matches SHIFT opening float ($250).',
        is_completed: true,
        completed_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        completed_by: null,
        notes: 'Float verified exact: $250.00 in drawer',
        temperature_reading: null,
        is_exception: false,
        exception_reason: null,
      },
      {
        id: 'inst-item-2',
        instance_id: 'inst-001',
        template_item_id: 'titem-102',
        task_description: 'Inspect receipt printers, test roll feed, and confirm backup paper loaded.',
        is_completed: true,
        completed_at: new Date(Date.now() - 3600000 * 4.8).toISOString(),
        completed_by: null,
        notes: null,
        temperature_reading: null,
        is_exception: false,
        exception_reason: null,
      },
      {
        id: 'inst-item-3',
        instance_id: 'inst-001',
        template_item_id: 'titem-103',
        task_description: 'Wipe and sanitize dining tables, condiment caddies, and door handles.',
        is_completed: true,
        completed_at: new Date(Date.now() - 3600000 * 4.5).toISOString(),
        completed_by: null,
        notes: null,
        temperature_reading: null,
        is_exception: false,
        exception_reason: null,
      },
    ],
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'inst-002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    template_id: 'tmpl-002',
    template_title: 'Kitchen Walk-In Cooler & Freezer Temperature Check',
    category: 'food_temperature',
    scheduled_date: new Date().toISOString().split('T')[0],
    shift_name: 'Midday Shift',
    status: 'in_progress',
    started_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    completed_at: null,
    completed_by: null,
    total_items: 3,
    completed_items: 1,
    exception_notes: null,
    items: [
      {
        id: 'inst-item-4',
        instance_id: 'inst-002',
        template_item_id: 'titem-201',
        task_description: 'Main Walk-In Refrigerator internal temperature reading (Must be between 33°F and 40°F).',
        is_completed: true,
        completed_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        completed_by: null,
        notes: 'Dial calibrated',
        temperature_reading: 36.5,
        is_exception: false,
        exception_reason: null,
      },
      {
        id: 'inst-item-5',
        instance_id: 'inst-002',
        template_item_id: 'titem-202',
        task_description: 'Deep Freezer storage internal temperature reading (Must be <= 0°F).',
        is_completed: false,
        completed_at: null,
        completed_by: null,
        notes: null,
        temperature_reading: null,
        is_exception: false,
        exception_reason: null,
      },
      {
        id: 'inst-item-6',
        instance_id: 'inst-002',
        template_item_id: 'titem-203',
        task_description: 'Verify all dairy, meat, and prepped produce containers have valid FIFO date labels.',
        is_completed: false,
        completed_at: null,
        completed_by: null,
        notes: null,
        temperature_reading: null,
        is_exception: false,
        exception_reason: null,
      },
    ],
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const checklistService = {
  /**
   * Fetch active checklist templates
   */
  async getTemplates(organizationId: string, _branchId?: string): Promise<ChecklistTemplate[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        let query = (supabase.from('checklist_templates') as any)
          .select('*, checklist_template_items(*)')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('title', { ascending: true });

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            ...d,
            items: d.checklist_template_items || [],
          })) as ChecklistTemplate[];
        }
      } catch (err) {
        console.warn('[checklistService] Remote fetch templates failed, falling back:', err);
      }
    }

    return localTemplates.filter(
      (t) => t.organization_id === organizationId || true
    );
  },

  /**
   * Fetch checklist execution instances for branch and date
   */
  async getInstances(branchId: string, date?: string): Promise<ChecklistInstance[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.from('checklist_instances') as any)
          .select('*, checklist_templates(title, category), checklist_instance_items(*)')
          .eq('branch_id', branchId)
          .eq('scheduled_date', targetDate)
          .order('started_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            ...d,
            template_title: d.checklist_templates?.title || 'Operational Checklist',
            category: d.checklist_templates?.category || 'opening',
            items: d.checklist_instance_items || [],
          })) as ChecklistInstance[];
        }
      } catch (err) {
        console.warn('[checklistService] Remote fetch instances failed, falling back:', err);
      }
    }

    return localInstances.filter(
      (i) => i.branch_id === branchId || true
    );
  },

  /**
   * Start a new checklist execution instance from template
   */
  async instantiateChecklist(params: {
    organizationId: string;
    branchId: string;
    templateId: string;
    shiftName?: string;
    assignedUserId?: string;
  }): Promise<{ success: boolean; instanceId: string; instance?: ChecklistInstance }> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.rpc as any)('instantiate_checklist', {
          p_organization_id: params.organizationId,
          p_branch_id: params.branchId,
          p_template_id: params.templateId,
          p_shift_name: params.shiftName || 'Daily Operational',
        });

        if (!error && data) {
          return { success: true, instanceId: data.instance_id };
        }
      } catch (err) {
        console.warn('[checklistService] Remote instantiate_checklist failed, falling back:', err);
      }
    }

    const tmpl = localTemplates.find((t) => t.id === params.templateId);
    if (!tmpl) throw new Error(`Template ${params.templateId} not found`);

    const newInstanceId = `inst-${Date.now()}`;
    const instanceItems: ChecklistInstanceItem[] = (tmpl.items || []).map((ti, idx) => ({
      id: `inst-item-${Date.now()}-${idx}`,
      instance_id: newInstanceId,
      template_item_id: ti.id,
      task_description: ti.task_description,
      is_completed: false,
      completed_at: null,
      completed_by: null,
      notes: null,
      temperature_reading: null,
      is_exception: false,
      exception_reason: null,
    }));

    const newInst: ChecklistInstance = {
      id: newInstanceId,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      template_id: tmpl.id,
      template_title: tmpl.title,
      category: tmpl.category,
      scheduled_date: new Date().toISOString().split('T')[0],
      shift_name: params.shiftName || 'Operational Shift',
      status: 'in_progress',
      started_at: new Date().toISOString(),
      completed_at: null,
      completed_by: null,
      total_items: instanceItems.length,
      completed_items: 0,
      exception_notes: null,
      items: instanceItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localInstances.unshift(newInst);

    return { success: true, instanceId: newInstanceId, instance: newInst };
  },

  /**
   * Toggle checklist item state, log temperature, or flag exception
   */
  async toggleItem(params: {
    itemId: string;
    isCompleted: boolean;
    notes?: string;
    temperatureReading?: number;
    temperature?: number;
    isException?: boolean;
    exceptionReason?: string;
    userId?: string;
    instanceId?: string;
  }): Promise<{
    success: boolean;
    completedItems: number;
    totalItems: number;
    isFullyCompleted: boolean;
    instance?: ChecklistInstance;
  }> {
    const tempVal = params.temperatureReading !== undefined ? params.temperatureReading : params.temperature;

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.rpc as any)('toggle_checklist_item', {
          p_item_id: params.itemId,
          p_is_completed: params.isCompleted,
          p_notes: params.notes || null,
          p_temperature: tempVal || null,
          p_is_exception: params.isException || false,
          p_exception_reason: params.exceptionReason || null,
        });

        if (!error && data) {
          return {
            success: true,
            completedItems: data.completed_items,
            totalItems: data.total_items,
            isFullyCompleted: data.is_fully_completed,
          };
        }
      } catch (err) {
        console.warn('[checklistService] Remote toggle_checklist_item failed, falling back:', err);
      }
    }

    // Local in-memory update
    let targetInst: ChecklistInstance | undefined;
    let targetItem: ChecklistInstanceItem | undefined;

    for (const inst of localInstances) {
      const itm = (inst.items || []).find((i) => i.id === params.itemId);
      if (itm) {
        targetInst = inst;
        targetItem = itm;
        break;
      }
    }

    if (!targetInst || !targetItem) {
      throw new Error(`Checklist item ${params.itemId} not found`);
    }

    targetItem.is_completed = params.isCompleted;
    targetItem.completed_at = params.isCompleted ? new Date().toISOString() : null;
    targetItem.completed_by = params.userId || null;
    if (params.notes !== undefined) targetItem.notes = params.notes;
    if (tempVal !== undefined) targetItem.temperature_reading = tempVal;
    if (params.isException !== undefined) targetItem.is_exception = params.isException;
    if (params.exceptionReason !== undefined) targetItem.exception_reason = params.exceptionReason;

    const completed = (targetInst.items || []).filter((i) => i.is_completed).length;
    const total = (targetInst.items || []).length;
    const hasException = (targetInst.items || []).some((i) => i.is_exception);

    targetInst.completed_items = completed;
    targetInst.total_items = total;
    if (completed === total) {
      targetInst.status = hasException ? 'flagged_exceptions' : 'completed';
      targetInst.completed_at = new Date().toISOString();
      targetInst.completed_by = params.userId || null;
    } else {
      targetInst.status = 'in_progress';
      targetInst.completed_at = null;
    }
    targetInst.updated_at = new Date().toISOString();

    return {
      success: true,
      completedItems: completed,
      totalItems: total,
      isFullyCompleted: completed === total,
      instance: targetInst,
    };
  },

  /**
   * Finalize checklist execution
   */
  async completeInstance(params: {
    instanceId: string;
    exceptionNotes?: string;
    userId?: string;
  }): Promise<{ success: boolean; instance?: ChecklistInstance; error?: string }> {
    const inst = localInstances.find((i) => i.id === params.instanceId);
    if (!inst) {
      return { success: false, error: `Instance ${params.instanceId} not found` };
    }

    const uncompletedRequired = (inst.items || []).some(
      (item) => !item.is_completed && !item.is_exception
    );
    if (uncompletedRequired) {
      return {
        success: false,
        error: 'Cannot complete checklist with incomplete required tasks',
      };
    }

    const hasException = (inst.items || []).some((i) => i.is_exception);
    inst.status = hasException ? 'flagged_exceptions' : 'completed';
    inst.completed_at = new Date().toISOString();
    inst.completed_by = params.userId || null;
    if (params.exceptionNotes) inst.exception_notes = params.exceptionNotes;
    inst.updated_at = new Date().toISOString();

    return { success: true, instance: inst };
  },
};
