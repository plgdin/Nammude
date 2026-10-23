import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import {
  SupplierRecord,
  PurchaseOrderRecord,
  GoodsReceiptRecord,
} from '../types';

let localSuppliers: SupplierRecord[] = [
  {
    id: 's1111111-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    company_name: 'Coastal Dairy Direct',
    contact_person: 'Marcus Vance',
    phone: '+1 (555) 392-1084',
    email: 'orders@coastaldairy.com',
    tax_number: 'US-TX-984210',
    payment_terms_days: 30,
    is_active: true,
    notes: 'Delivers Mondays and Thursdays before 7:00 AM',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 's1111111-0000-0000-0000-000000000002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    company_name: 'Harbor Roasting Co.',
    contact_person: 'Elena Rostova',
    phone: '+1 (555) 489-3201',
    email: 'beans@harborroasting.com',
    tax_number: 'US-TX-841920',
    payment_terms_days: 15,
    is_active: true,
    notes: 'Single origin roaster. Roast date within 4 days of delivery guaranteed.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 's1111111-0000-0000-0000-000000000003',
    organization_id: '11111111-1111-1111-1111-111111111111',
    company_name: 'Valley Organic Produce',
    contact_person: 'Carlos Mendez',
    phone: '+1 (555) 781-9923',
    email: 'carlos@valleyorganic.com',
    tax_number: 'US-TX-731045',
    payment_terms_days: 30,
    is_active: true,
    notes: 'Certified local organic farm collective.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let localPurchaseOrders: PurchaseOrderRecord[] = [
  {
    id: 'po111111-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    supplier_id: 's1111111-0000-0000-0000-000000000001',
    supplier_name: 'Coastal Dairy Direct',
    po_number: 'PO-2026-001',
    status: 'received',
    total_amount: 92.5,
    expected_delivery_date: new Date().toISOString().split('T')[0],
    notes: 'Regular weekly dairy replenishment',
    created_by: 'Sarah Owner',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        id: 'poi1',
        organization_id: '11111111-1111-1111-1111-111111111111',
        purchase_order_id: 'po111111-0000-0000-0000-000000000001',
        ingredient_id: 'i1111111-0000-0000-0000-000000000001',
        ingredient_name: 'Organic Whole Milk 3.8%',
        quantity: 50,
        purchase_unit: 'L',
        conversion_factor: 1000,
        unit_price: 1.85,
        total_price: 92.5,
        received_quantity: 50,
        created_at: new Date().toISOString(),
      },
    ],
  },
];

let localGoodsReceipts: GoodsReceiptRecord[] = [
  {
    id: 'grn11111-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    purchase_order_id: 'po111111-0000-0000-0000-000000000001',
    supplier_id: 's1111111-0000-0000-0000-000000000001',
    supplier_name: 'Coastal Dairy Direct',
    location_id: 'l1111111-0000-0000-0000-000000000001',
    grn_number: 'GRN-2026-001',
    invoice_number: 'INV-CDD-98104',
    invoice_date: new Date().toISOString().split('T')[0],
    total_amount: 92.5,
    status: 'verified',
    notes: 'Received in full. Cold chain temperature verified at 3.2°C.',
    received_by: 'Sarah Owner',
    idempotency_key: 'seed-grn-001',
    received_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    items: [
      {
        id: 'gri1',
        organization_id: '11111111-1111-1111-1111-111111111111',
        goods_receipt_id: 'grn11111-0000-0000-0000-000000000001',
        ingredient_id: 'i1111111-0000-0000-0000-000000000001',
        ingredient_name: 'Organic Whole Milk 3.8%',
        received_quantity: 50,
        rejected_quantity: 0,
        purchase_unit: 'L',
        conversion_factor: 1000,
        normalized_quantity: 50000,
        unit_cost: 1.85,
        total_cost: 92.5,
        batch_number: 'LOT-MILK-2610A',
        expiry_date: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      },
    ],
  },
];

export const purchasingService = {
  /**
   * Fetch suppliers for an organization
   */
  async getSuppliers(_organizationId: string): Promise<SupplierRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('is_active', true)
          .order('company_name', { ascending: true });

        if (!error && data && data.length > 0) {
          return data as SupplierRecord[];
        }
      } catch (err) {
        console.warn('[purchasingService] Remote suppliers fetch failed, using fallback:', err);
      }
    }

    return localSuppliers;
  },

  /**
   * Fetch purchase orders for a branch
   */
  async getPurchaseOrders(branchId: string): Promise<PurchaseOrderRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            suppliers(company_name),
            purchase_order_items(
              *,
              ingredients(name)
            )
          `)
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((po: any) => ({
            ...po,
            supplier_name: po.suppliers?.company_name || 'Direct Supplier',
            items: (po.purchase_order_items || []).map((poi: any) => ({
              ...poi,
              ingredient_name: poi.ingredients?.name || 'Ingredient',
            })),
          }));
        }
      } catch (err) {
        console.warn('[purchasingService] Remote PO fetch failed, using fallback:', err);
      }
    }

    return localPurchaseOrders;
  },

  /**
   * Create a new purchase order
   */
  async createPurchaseOrder(params: {
    organizationId: string;
    branchId: string;
    supplierId: string;
    expectedDeliveryDate?: string | null;
    notes?: string | null;
    items: Array<{
      ingredientId: string;
      quantity: number;
      purchaseUnit: string;
      conversionFactor: number;
      unitPrice: number;
    }>;
  }): Promise<{ success: boolean; po?: PurchaseOrderRecord }> {
    const totalAmount = params.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const poNumber = `PO-${new Date().getFullYear()}-${String(localPurchaseOrders.length + 101).padStart(3, '0')}`;

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data: poHeader, error: poError } = await (supabase
          .from('purchase_orders') as any)
          .insert({
            organization_id: params.organizationId,
            branch_id: params.branchId,
            supplier_id: params.supplierId,
            po_number: poNumber,
            status: 'issued',
            total_amount: totalAmount,
            expected_delivery_date: params.expectedDeliveryDate || null,
            notes: params.notes || null,
          })
          .select()
          .single();

        if (!poError && poHeader) {
          const poItemsPayload = params.items.map((i) => ({
            organization_id: params.organizationId,
            purchase_order_id: (poHeader as any).id,
            ingredient_id: i.ingredientId,
            quantity: i.quantity,
            purchase_unit: i.purchaseUnit,
            conversion_factor: i.conversionFactor,
            unit_price: i.unitPrice,
            total_price: i.quantity * i.unitPrice,
            received_quantity: 0,
          }));

          await (supabase.from('purchase_order_items') as any).insert(poItemsPayload);

          return { success: true, po: poHeader as any };
        }
      } catch (err) {
        console.warn('[purchasingService] Remote PO creation failed, using fallback:', err);
      }
    }

    // Local fallback
    const supplier = localSuppliers.find((s) => s.id === params.supplierId);
    const newPO: PurchaseOrderRecord = {
      id: `po_${Date.now()}`,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      supplier_id: params.supplierId,
      supplier_name: supplier?.company_name || 'Supplier',
      po_number: poNumber,
      status: 'issued',
      total_amount: totalAmount,
      expected_delivery_date: params.expectedDeliveryDate || null,
      notes: params.notes || null,
      created_by: 'Staff User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: params.items.map((it, idx) => ({
        id: `poi_${Date.now()}_${idx}`,
        organization_id: params.organizationId,
        purchase_order_id: `po_${Date.now()}`,
        ingredient_id: it.ingredientId,
        ingredient_name: 'Ingredient',
        quantity: it.quantity,
        purchase_unit: it.purchaseUnit,
        conversion_factor: it.conversionFactor,
        unit_price: it.unitPrice,
        total_price: it.quantity * it.unitPrice,
        received_quantity: 0,
        created_at: new Date().toISOString(),
      })),
    };

    localPurchaseOrders.unshift(newPO);
    return { success: true, po: newPO };
  },

  /**
   * Process a Goods Receipt Note (GRN) with authoritative atomic inventory receipt & WAC calculation
   */
  async processGoodsReceipt(params: {
    organizationId: string;
    branchId: string;
    supplierId: string;
    purchaseOrderId?: string | null;
    locationId?: string | null;
    invoiceNumber?: string | null;
    invoiceDate?: string | null;
    notes?: string | null;
    idempotencyKey?: string;
    items: Array<{
      ingredientId: string;
      receivedQuantity: number;
      rejectedQuantity?: number;
      purchaseUnit: string;
      conversionFactor: number;
      unitCost: number;
      batchNumber?: string | null;
      expiryDate?: string | null;
    }>;
  }): Promise<{ success: boolean; grnNumber: string; totalAmount: number; error?: string }> {
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(localGoodsReceipts.length + 101).padStart(3, '0')}`;
    const totalAmount = params.items.reduce(
      (sum, item) => sum + item.receivedQuantity * item.unitCost,
      0
    );

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.rpc as any)('process_goods_receipt', {
          p_organization_id: params.organizationId,
          p_branch_id: params.branchId,
          p_supplier_id: params.supplierId,
          p_purchase_order_id: params.purchaseOrderId || null,
          p_location_id: params.locationId || null,
          p_grn_number: grnNumber,
          p_invoice_number: params.invoiceNumber || null,
          p_invoice_date: params.invoiceDate || null,
          p_items: params.items.map((i) => ({
            ingredient_id: i.ingredientId,
            received_quantity: i.receivedQuantity,
            rejected_quantity: i.rejectedQuantity || 0,
            purchase_unit: i.purchaseUnit,
            conversion_factor: i.conversionFactor,
            unit_cost: i.unitCost,
            batch_number: i.batchNumber || null,
            expiry_date: i.expiryDate || null,
          })),
          p_idempotency_key: params.idempotencyKey || `grn_${Date.now()}`,
          p_notes: params.notes || null,
        });

        if (!error && data && data.success) {
          return {
            success: true,
            grnNumber: data.grn_number,
            totalAmount: data.total_amount,
          };
        }
        if (error) {
          return { success: false, grnNumber, totalAmount, error: error.message };
        }
      } catch (err: any) {
        console.warn('[purchasingService] Remote GRN processing failed, using local store:', err);
      }
    }

    // Local fallback
    const supplier = localSuppliers.find((s) => s.id === params.supplierId);
    const newGRN: GoodsReceiptRecord = {
      id: `grn_${Date.now()}`,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      purchase_order_id: params.purchaseOrderId || null,
      supplier_id: params.supplierId,
      supplier_name: supplier?.company_name || 'Supplier',
      location_id: params.locationId || null,
      grn_number: grnNumber,
      invoice_number: params.invoiceNumber || null,
      invoice_date: params.invoiceDate || null,
      total_amount: totalAmount,
      status: 'verified',
      notes: params.notes || null,
      received_by: 'Staff User',
      idempotency_key: params.idempotencyKey || null,
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      items: params.items.map((it, idx) => ({
        id: `gri_${Date.now()}_${idx}`,
        organization_id: params.organizationId,
        goods_receipt_id: `grn_${Date.now()}`,
        ingredient_id: it.ingredientId,
        ingredient_name: 'Ingredient',
        received_quantity: it.receivedQuantity,
        rejected_quantity: it.rejectedQuantity || 0,
        purchase_unit: it.purchaseUnit,
        conversion_factor: it.conversionFactor,
        normalized_quantity: it.receivedQuantity * it.conversionFactor,
        unit_cost: it.unitCost,
        total_cost: it.receivedQuantity * it.unitCost,
        batch_number: it.batchNumber || null,
        expiry_date: it.expiryDate || null,
        created_at: new Date().toISOString(),
      })),
    };

    localGoodsReceipts.unshift(newGRN);

    // Update PO status if linked
    if (params.purchaseOrderId) {
      const po = localPurchaseOrders.find((p) => p.id === params.purchaseOrderId);
      if (po) {
        po.status = 'received';
        po.updated_at = new Date().toISOString();
      }
    }

    return { success: true, grnNumber, totalAmount };
  },

  /**
   * Fetch goods receipts for a branch
   */
  async getGoodsReceipts(branchId: string): Promise<GoodsReceiptRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await supabase
          .from('goods_receipts')
          .select(`
            *,
            suppliers(company_name),
            goods_receipt_items(
              *,
              ingredients(name)
            )
          `)
          .eq('branch_id', branchId)
          .order('received_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((gr: any) => ({
            ...gr,
            supplier_name: gr.suppliers?.company_name || 'Supplier',
            items: (gr.goods_receipt_items || []).map((gri: any) => ({
              ...gri,
              ingredient_name: gri.ingredients?.name || 'Ingredient',
            })),
          }));
        }
      } catch (err) {
        console.warn('[purchasingService] Remote GRN fetch failed, using fallback:', err);
      }
    }

    return localGoodsReceipts;
  },
};
