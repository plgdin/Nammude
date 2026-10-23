import { describe, it, expect } from 'vitest';
import { checklistService } from '@/features/checklists/services/checklistService';

describe('Phase 7: Staff Operations & Operational Checklists', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const userId = 'u1111111-0000-0000-0000-000000000001';

  describe('Workstream D: Templates & Daily Shift Instantiation', () => {
    it('retrieves active checklist templates scoped to organization', async () => {
      const templates = await checklistService.getTemplates(orgId);
      expect(templates.length).toBeGreaterThan(0);

      const opening = templates.find((t) => t.category === 'opening');
      expect(opening).toBeDefined();
      expect(opening?.items?.length ?? 0).toBeGreaterThan(0);

      const tempCheck = templates.find((t) => t.category === 'food_temperature');
      expect(tempCheck).toBeDefined();
      expect(tempCheck?.title).toContain('Walk-In Cooler');
    });

    it('instantiates a daily operational checklist from template', async () => {
      const templates = await checklistService.getTemplates(orgId);
      const openingTmpl = templates.find((t) => t.category === 'opening')!;

      const instRes = await checklistService.instantiateChecklist({
        organizationId: orgId,
        branchId,
        templateId: openingTmpl.id,
        shiftName: 'Morning Opening',
        assignedUserId: userId,
      });

      expect(instRes.success).toBe(true);
      expect(instRes.instance).toBeDefined();
      expect(instRes.instance?.status).toBe('in_progress');
      expect(instRes.instance?.total_items).toBe(openingTmpl.items?.length ?? 0);
      expect(instRes.instance?.completed_items).toBe(0);
      expect(instRes.instance?.items?.length).toBe(openingTmpl.items?.length ?? 0);
    });
  });

  describe('Workstream D: Task Completion, Progress, & Temperature Verification', () => {
    it('toggles item completion and updates progress counter', async () => {
      const templates = await checklistService.getTemplates(orgId);
      const openingTmpl = templates.find((t) => t.category === 'opening')!;

      const instRes = await checklistService.instantiateChecklist({
        organizationId: orgId,
        branchId,
        templateId: openingTmpl.id,
        shiftName: 'Breakfast Prep',
      });

      const instance = instRes.instance!;
      const firstItem = instance.items![0];

      // Mark first item complete
      const toggleRes = await checklistService.toggleItem({
        instanceId: instance.id,
        itemId: firstItem.id,
        isCompleted: true,
        notes: 'Register float confirmed at $250.00 cash.',
        userId,
      });

      expect(toggleRes.success).toBe(true);
      expect(toggleRes.instance?.completed_items).toBe(1);

      const updatedItem = toggleRes.instance?.items?.find((i) => i.id === firstItem.id);
      expect(updatedItem?.is_completed).toBe(true);
      expect(updatedItem?.notes).toBe('Register float confirmed at $250.00 cash.');
      expect(updatedItem?.completed_at).toBeDefined();
    });

    it('validates food temperature bounds and flags exceptions automatically', async () => {
      const templates = await checklistService.getTemplates(orgId);
      const tempTmpl = templates.find((t) => t.category === 'food_temperature')!;

      const instRes = await checklistService.instantiateChecklist({
        organizationId: orgId,
        branchId,
        templateId: tempTmpl.id,
        shiftName: 'Lunch Rush Audit',
      });

      const instance = instRes.instance!;
      // Find walk-in cooler item (safe bounds 33°F - 40°F)
      const coolerItem = (instance.items || []).find((i) =>
        i.task_description.toLowerCase().includes('walk-in')
      )!;

      // Submit out-of-spec unsafe temperature reading: 46°F (too warm)
      const unsafeReadingRes = await checklistService.toggleItem({
        instanceId: instance.id,
        itemId: coolerItem.id,
        isCompleted: true,
        temperatureReading: 46.0,
        isException: true,
        exceptionReason: 'Cooler defrost cycle stuck, temperature reached 46°F. Technician called.',
        userId,
      });

      expect(unsafeReadingRes.success).toBe(true);
      const updatedCooler = unsafeReadingRes.instance?.items?.find((i) => i.id === coolerItem.id);
      expect(updatedCooler?.temperature_reading).toBe(46.0);
      expect(updatedCooler?.is_exception).toBe(true);
      expect(updatedCooler?.exception_reason).toContain('defrost cycle stuck');
    });

    it('enforces completion rules: instance cannot complete with pending required items', async () => {
      const templates = await checklistService.getTemplates(orgId);
      const openingTmpl = templates.find((t) => t.category === 'opening')!;

      const instRes = await checklistService.instantiateChecklist({
        organizationId: orgId,
        branchId,
        templateId: openingTmpl.id,
        shiftName: 'Evening Shift Check',
      });

      const instance = instRes.instance!;

      // Complete only 1 item out of required items
      await checklistService.toggleItem({
        instanceId: instance.id,
        itemId: instance.items![0].id,
        isCompleted: true,
        userId,
      });

      // Attempt to finalize incomplete checklist without exception override
      const completeRes = await checklistService.completeInstance({
        instanceId: instance.id,
        userId,
      });

      expect(completeRes.success).toBe(false);
      expect(completeRes.error).toContain('Cannot complete checklist with incomplete required tasks');
    });

    it('finalizes completed checklist and records responsible staff and timestamp', async () => {
      const templates = await checklistService.getTemplates(orgId);
      const openingTmpl = templates.find((t) => t.category === 'opening')!;

      const instRes = await checklistService.instantiateChecklist({
        organizationId: orgId,
        branchId,
        templateId: openingTmpl.id,
        shiftName: 'Full Completion Shift',
      });

      const instance = instRes.instance!;

      // Complete all items
      for (const item of (instance.items || [])) {
        await checklistService.toggleItem({
          instanceId: instance.id,
          itemId: item.id,
          isCompleted: true,
          userId,
        });
      }

      // Now complete instance
      const completeRes = await checklistService.completeInstance({
        instanceId: instance.id,
        userId,
      });

      expect(completeRes.success).toBe(true);
      expect(completeRes.instance?.status).toBe('completed');
      expect(completeRes.instance?.completed_at).toBeDefined();
      expect(completeRes.instance?.completed_by).toBe(userId);
    });
  });
});
