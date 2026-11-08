import { describe, it, expect } from 'vitest';
import { menuService } from '@/features/pos/services/menuService';

const orgId = '11111111-1111-1111-1111-111111111111';

describe('Menu Management: categories, items, modifiers', () => {
  it('creates and updates a category', async () => {
    const created = await menuService.createCategory({
      organizationId: orgId,
      name: 'Seasonal Specials',
    });
    expect(created.success).toBe(true);
    expect(created.category?.slug).toBe('seasonal-specials');

    const updated = await menuService.updateCategory(created.category!.id, {
      name: 'Seasonal Specials & Limited',
      display_order: 9,
    });
    expect(updated.success).toBe(true);

    const categories = await menuService.getCategories(orgId);
    const found = categories.find((c) => c.id === created.category!.id);
    expect(found?.name).toBe('Seasonal Specials & Limited');
    expect(found?.display_order).toBe(9);
  });

  it('rejects duplicate category slugs', async () => {
    const first = await menuService.createCategory({
      organizationId: orgId,
      name: 'Desserts Test',
      slug: 'desserts-test',
    });
    expect(first.success).toBe(true);

    const duplicate = await menuService.createCategory({
      organizationId: orgId,
      name: 'Desserts Test Again',
      slug: 'desserts-test',
    });
    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toMatch(/slug already exists/i);
  });

  it('refuses to delete a category that still contains items', async () => {
    const categories = await menuService.getCategories(orgId);
    const withItems = categories[0];
    const result = await menuService.deleteCategory(withItems.id);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/contains menu items/i);
  });

  it('creates, reprices, and deletes a menu item', async () => {
    const categories = await menuService.getCategories(orgId);
    const created = await menuService.createMenuItem({
      organizationId: orgId,
      categoryId: categories[0].id,
      name: 'Test Affogato',
      sku: 'TEST-AFF-001',
      basePrice: 6.5,
      costPrice: 1.2,
    });
    expect(created.success).toBe(true);
    expect(created.item?.base_price).toBe(6.5);

    const updated = await menuService.updateMenuItem(created.item!.id, {
      base_price: 7.0,
    });
    expect(updated.success).toBe(true);

    const items = await menuService.getMenuItems(orgId);
    const found = items.find((i) => i.id === created.item!.id);
    expect(found?.base_price).toBe(7.0);

    const deleted = await menuService.deleteMenuItem(created.item!.id);
    expect(deleted.success).toBe(true);

    const after = await menuService.getMenuItems(orgId);
    expect(after.find((i) => i.id === created.item!.id)).toBeUndefined();
  });

  it('rejects duplicate SKUs', async () => {
    const categories = await menuService.getCategories(orgId);
    const first = await menuService.createMenuItem({
      organizationId: orgId,
      categoryId: categories[0].id,
      name: 'Test SKU Item One',
      sku: 'TEST-DUP-001',
      basePrice: 4.0,
    });
    expect(first.success).toBe(true);

    const duplicate = await menuService.createMenuItem({
      organizationId: orgId,
      categoryId: categories[0].id,
      name: 'Test SKU Item Two',
      sku: 'TEST-DUP-001',
      basePrice: 5.0,
    });
    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toMatch(/SKU already exists/i);
  });

  it('creates modifier groups/options and attaches them to items', async () => {
    const group = await menuService.createModifierGroup({
      organizationId: orgId,
      name: 'Spice Level Test',
      minSelection: 0,
      maxSelection: 2,
    });
    expect(group.success).toBe(true);

    const option = await menuService.createModifier({
      organizationId: orgId,
      groupId: group.group!.id,
      name: 'Extra Hot',
      additionalPrice: 0.5,
    });
    expect(option.success).toBe(true);

    const categories = await menuService.getCategories(orgId);
    const item = await menuService.createMenuItem({
      organizationId: orgId,
      categoryId: categories[0].id,
      name: 'Test Modifier Item',
      sku: 'TEST-MOD-001',
      basePrice: 9.0,
    });
    expect(item.success).toBe(true);

    const linked = await menuService.setItemModifierGroups(item.item!.id, orgId, [group.group!.id]);
    expect(linked.success).toBe(true);

    const groups = await menuService.getModifierGroups(orgId);
    const view = groups.find((g) => g.group.id === group.group!.id);
    expect(view?.modifiers.some((m) => m.name === 'Extra Hot')).toBe(true);

    const items = await menuService.getMenuItems(orgId);
    const found = items.find((i) => i.id === item.item!.id);
    expect(found?.modifier_groups.some((g) => g.group.id === group.group!.id)).toBe(true);
  });

  it('validates modifier group selection ranges', async () => {
    const result = await menuService.createModifierGroup({
      organizationId: orgId,
      name: 'Invalid Range Test',
      minSelection: 3,
      maxSelection: 1,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/max selection/i);
  });
});
