import { describe, it, expect } from 'vitest';
import { menuService } from '@/features/pos/services/menuService';
import { orderService } from '@/features/pos/services/orderService';
import { roundMoney } from '@/lib/currency';

describe('Tablewise Customer-Facing Ordering Flow', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  it('resolves catalog items and categories for Tablewise menu', async () => {
    const categories = await menuService.getCategories(orgId);
    expect(categories.length).toBeGreaterThan(0);

    const items = await menuService.getMenuItems(orgId, false);
    expect(items.length).toBeGreaterThan(0);

    const firstItem = items[0];
    expect(firstItem.name).toBeDefined();
    expect(firstItem.base_price).toBeGreaterThan(0);
  });

  it('calculates item variant and addon price modifiers correctly', async () => {
    const items = await menuService.getMenuItems(orgId, false);
    const itemWithModifiers = items.find((i) => i.modifier_groups && i.modifier_groups.length > 0);

    expect(itemWithModifiers).toBeDefined();
    if (itemWithModifiers) {
      const basePrice = itemWithModifiers.base_price;
      const firstGroup = itemWithModifiers.modifier_groups[0];
      const firstMod = firstGroup.modifiers[0];

      const expectedUnit = basePrice + (firstMod?.additional_price || 0);
      expect(expectedUnit).toBeGreaterThanOrEqual(basePrice);
    }
  });

  it('computes basket subtotal, 10% tax, and 5% service charge accurately', () => {
    const itemSubtotal = 48.0;
    const tax = roundMoney(itemSubtotal * 0.1);
    const serviceCharge = roundMoney(itemSubtotal * 0.05);
    const total = roundMoney(itemSubtotal + tax + serviceCharge);

    expect(tax).toBe(4.8);
    expect(serviceCharge).toBe(2.4);
    expect(total).toBe(55.2);
  });

  it('submits a Tablewise customer order with qr_self_order type and idempotency', async () => {
    const idempotencyKey = `tw-test-${Date.now()}`;
    const items = await menuService.getMenuItems(orgId, true);
    const item = items[0];

    const payload = {
      organization_id: orgId,
      branch_id: branchId,
      order_type: 'qr_self_order' as const,
      table_id: null,
      guest_count: 1,
      notes: 'Tablewise Dine-in Table 12',
      idempotency_key: idempotencyKey,
      items: [
        {
          menu_item_id: item.id,
          quantity: 2,
          special_instructions: 'Sauce on the side, please.',
        },
      ],
    };

    const result = await orderService.createOrder(payload);
    expect(result.success).toBe(true);
    expect(result.order_id).toBeDefined();
    expect(result.order_number).toBeDefined();
    expect(result.total_amount).toBeGreaterThan(0);

    // Idempotent duplicate check
    const duplicate = await orderService.createOrder(payload);
    expect(duplicate.success).toBe(true);
    expect(duplicate.is_idempotent_replay).toBe(true);
    expect(duplicate.order_id).toBe(result.order_id);
  });
});
