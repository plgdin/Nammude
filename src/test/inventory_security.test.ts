import { describe, it, expect } from 'vitest';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { purchasingService } from '@/features/inventory/services/purchasingService';

describe('Phase 5: Multi-Tenant Inventory & Security Isolation', () => {
  const tenantA_OrgId = '11111111-1111-1111-1111-111111111111'; // Harbor Café
  const tenantA_BranchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const tenantB_OrgId = '22222222-2222-2222-2222-222222222222'; // Marian Bistro
  const tenantB_BranchId = '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  it('restricts inventory stock and movements strictly to tenant boundary', async () => {
    const tenantA_Items = await inventoryService.getIngredients(tenantA_BranchId, tenantA_OrgId);
    expect(tenantA_Items.length).toBeGreaterThan(0);

    // Verify all items belong to Tenant A
    for (const item of tenantA_Items) {
      expect(item.organization_id).toBe(tenantA_OrgId);
      expect(item.organization_id).not.toBe(tenantB_OrgId);
    }
  });

  it('prevents cross-tenant supplier leakage', async () => {
    const tenantA_Suppliers = await purchasingService.getSuppliers(tenantA_OrgId);
    for (const supplier of tenantA_Suppliers) {
      expect(supplier.organization_id).toBe(tenantA_OrgId);
      expect(supplier.organization_id).not.toBe(tenantB_OrgId);
    }
  });

  it('prevents cross-tenant purchase orders', async () => {
    const tenantA_POs = await purchasingService.getPurchaseOrders(tenantA_BranchId);
    for (const po of tenantA_POs) {
      expect(po.organization_id).toBe(tenantA_OrgId);
      expect(po.branch_id).toBe(tenantA_BranchId);
      expect(po.branch_id).not.toBe(tenantB_BranchId);
    }
  });
});
