import { describe, it, expect } from 'vitest';
import { menuService } from '@/features/pos/services/menuService';

describe('Phase 4: Menu & Catalog Management', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';

  it('loads active menu categories in display order', async () => {
    const categories = await menuService.getCategories(orgId);
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.every((c) => c.is_active)).toBe(true);

    // Verify display order
    for (let i = 0; i < categories.length - 1; i++) {
      expect(categories[i].display_order).toBeLessThanOrEqual(categories[i + 1].display_order);
    }
  });

  it('loads menu items with modifier groups and modifiers', async () => {
    const items = await menuService.getMenuItems(orgId);
    expect(items.length).toBeGreaterThan(0);

    const flatWhite = items.find((i) => i.name.includes('Flat White'));
    expect(flatWhite).toBeDefined();
    expect(flatWhite?.modifier_groups.length).toBeGreaterThan(0);

    const milkGroup = flatWhite?.modifier_groups.find((g) => g.group.name === 'Milk Choice');
    expect(milkGroup).toBeDefined();
    expect(milkGroup?.modifiers.some((m) => m.name === 'Organic Oat Milk')).toBe(true);
  });

  it('allows toggling item availability for staff operations', async () => {
    const items = await menuService.getMenuItems(orgId);
    const targetItem = items[0];

    // Toggle off
    const okOff = await menuService.setItemAvailability(targetItem.id, false);
    expect(okOff).toBe(true);

    const availableItems = await menuService.getMenuItems(orgId, true);
    expect(availableItems.some((i) => i.id === targetItem.id)).toBe(false);

    // Toggle back on
    const okOn = await menuService.setItemAvailability(targetItem.id, true);
    expect(okOn).toBe(true);
  });
});
