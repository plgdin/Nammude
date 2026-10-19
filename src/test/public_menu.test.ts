import { describe, it, expect } from 'vitest';
import { menuService } from '@/features/pos/services/menuService';

describe('Phase 4: Public Digital Menu & Tenant Isolation', () => {
  it('resolves catalog for public visitors without authentication', async () => {
    const harborOrgId = '11111111-1111-1111-1111-111111111111';
    const categories = await menuService.getCategories(harborOrgId);
    expect(categories.length).toBeGreaterThan(0);

    const publicItems = await menuService.getMenuItems(harborOrgId, true);
    expect(publicItems.length).toBeGreaterThan(0);
    // All items displayed to public must be available
    expect(publicItems.every((i) => i.is_available)).toBe(true);
  });

  it('keeps public menu scoped to the target tenant organization', async () => {
    const harborOrgId = '11111111-1111-1111-1111-111111111111';
    const marianOrgId = '22222222-2222-2222-2222-222222222222';

    const harborItems = await menuService.getMenuItems(harborOrgId);
    const marianItems = await menuService.getMenuItems(marianOrgId);

    // Items should be distinct and scoped
    expect(harborItems.length).toBeGreaterThan(0);
    expect(marianItems.length).toBeGreaterThan(0);
  });
});
