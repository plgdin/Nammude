export interface StockMovement {
  id: string;
  ingredientId: string;
  type: 'purchase_receipt' | 'sale_consumption' | 'waste' | 'manual_adjustment';
  quantityDelta: number;
  resultingQuantity: number;
  reason: string;
  recordedBy: string;
  timestamp: string;
}

export interface InventoryIngredient {
  id: string;
  sku: string;
  name: string;
  category: 'Dairy & Milks' | 'Coffee & Beans' | 'Produce' | 'Dry Goods & Baking' | 'Proteins';
  currentStock: number;
  unit: 'L' | 'kg' | 'units' | 'bottles';
  unitCost: number;
  reorderLevel: number;
  idealStock: number;
  storageLocation: string;
  supplierName: string;
  supplierContact: string;
  lastRestockDate: string;
  expiryDate?: string;
  isPerishable: boolean;
  status: 'ok' | 'low' | 'critical';
}

export const mockIngredients: InventoryIngredient[] = [
  {
    id: 'ing_whole_milk',
    sku: 'ING-DAI-01',
    name: 'Organic Whole Milk 3.8%',
    category: 'Dairy & Milks',
    currentStock: 14.5,
    unit: 'L',
    unitCost: 1.85,
    reorderLevel: 25.0,
    idealStock: 60.0,
    storageLocation: 'Main Walk-In Cooler',
    supplierName: 'Coastal Dairy Direct',
    supplierContact: 'orders@coastaldairy.com',
    lastRestockDate: '2026-10-17',
    expiryDate: '2026-10-24',
    isPerishable: true,
    status: 'low',
  },
  {
    id: 'ing_oat_milk',
    sku: 'ING-DAI-02',
    name: 'Oatly Barista Edition Oat Milk',
    category: 'Dairy & Milks',
    currentStock: 32.0,
    unit: 'L',
    unitCost: 2.9,
    reorderLevel: 20.0,
    idealStock: 50.0,
    storageLocation: 'Main Walk-In Cooler',
    supplierName: 'Oatly Regional Wholesale',
    supplierContact: '+1 (555) 489-3201',
    lastRestockDate: '2026-10-18',
    expiryDate: '2026-11-15',
    isPerishable: true,
    status: 'ok',
  },
  {
    id: 'ing_espresso_beans',
    sku: 'ING-COF-01',
    name: 'Harbor House Espresso Blend (Guatemala / Ethiopia)',
    category: 'Coffee & Beans',
    currentStock: 6.2,
    unit: 'kg',
    unitCost: 22.5,
    reorderLevel: 10.0,
    idealStock: 25.0,
    storageLocation: 'Bar Storage Dry Bin',
    supplierName: 'Harbor Roasting Co.',
    supplierContact: 'beans@harborroasting.com',
    lastRestockDate: '2026-10-15',
    expiryDate: '2026-12-15',
    isPerishable: false,
    status: 'low',
  },
  {
    id: 'ing_single_origin',
    sku: 'ING-COF-02',
    name: 'Single Origin Filter Beans (Yirgacheffe Washed)',
    category: 'Coffee & Beans',
    currentStock: 11.5,
    unit: 'kg',
    unitCost: 28.0,
    reorderLevel: 8.0,
    idealStock: 18.0,
    storageLocation: 'Bar Storage Dry Bin',
    supplierName: 'Harbor Roasting Co.',
    supplierContact: 'beans@harborroasting.com',
    lastRestockDate: '2026-10-14',
    expiryDate: '2026-12-20',
    isPerishable: false,
    status: 'ok',
  },
  {
    id: 'ing_hass_avocados',
    sku: 'ING-PRD-01',
    name: 'Ripe Hass Avocados (Grade A)',
    category: 'Produce',
    currentStock: 8,
    unit: 'units',
    unitCost: 1.45,
    reorderLevel: 20,
    idealStock: 50,
    storageLocation: 'Prep Kitchen Cool Bin',
    supplierName: 'Valley Organic Produce',
    supplierContact: 'sales@valleyproduce.com',
    lastRestockDate: '2026-10-16',
    expiryDate: '2026-10-21',
    isPerishable: true,
    status: 'critical',
  },
  {
    id: 'ing_pasture_eggs',
    sku: 'ING-PRT-01',
    name: 'Pasture-Raised Organic Eggs (Large)',
    category: 'Proteins',
    currentStock: 72,
    unit: 'units',
    unitCost: 0.38,
    reorderLevel: 48,
    idealStock: 180,
    storageLocation: 'Main Walk-In Cooler',
    supplierName: 'Valley Organic Produce',
    supplierContact: 'sales@valleyproduce.com',
    lastRestockDate: '2026-10-17',
    expiryDate: '2026-11-04',
    isPerishable: true,
    status: 'ok',
  },
  {
    id: 'ing_butter_unsalted',
    sku: 'ING-DAI-03',
    name: 'Unsalted Cultured French Butter 82%',
    category: 'Dairy & Milks',
    currentStock: 5.5,
    unit: 'kg',
    unitCost: 11.2,
    reorderLevel: 5.0,
    idealStock: 15.0,
    storageLocation: 'Bakery Prep Refrigerator',
    supplierName: 'Coastal Dairy Direct',
    supplierContact: 'orders@coastaldairy.com',
    lastRestockDate: '2026-10-12',
    expiryDate: '2026-11-10',
    isPerishable: true,
    status: 'ok',
  },
  {
    id: 'ing_sourdough_loaves',
    sku: 'ING-DRY-01',
    name: 'Country Sourdough Loaves (Pre-baked)',
    category: 'Dry Goods & Baking',
    currentStock: 4,
    unit: 'units',
    unitCost: 3.5,
    reorderLevel: 6,
    idealStock: 16,
    storageLocation: 'Bakery Dry Shelving',
    supplierName: 'Artisanal Hearth Bakers',
    supplierContact: 'hearth@artisanalbreads.com',
    lastRestockDate: '2026-10-18',
    expiryDate: '2026-10-20',
    isPerishable: true,
    status: 'low',
  },
];

export const mockStockMovements: StockMovement[] = [
  {
    id: 'mov_101',
    ingredientId: 'ing_whole_milk',
    type: 'sale_consumption',
    quantityDelta: -4.5,
    resultingQuantity: 14.5,
    reason: 'POS Shift Drink Prep Recipes (42 Flat Whites & Lattes)',
    recordedBy: 'POS Auto Deduction',
    timestamp: '2026-10-19T09:30:00Z',
  },
  {
    id: 'mov_102',
    ingredientId: 'ing_hass_avocados',
    type: 'waste',
    quantityDelta: -3,
    resultingQuantity: 8,
    reason: 'Overripe and bruised during morning prep inspection',
    recordedBy: 'Chef Marco S.',
    timestamp: '2026-10-19T07:15:00Z',
  },
  {
    id: 'mov_103',
    ingredientId: 'ing_oat_milk',
    type: 'purchase_receipt',
    quantityDelta: 24,
    resultingQuantity: 32,
    reason: 'Received PO #PO-2026-884 from Oatly Wholesale',
    recordedBy: 'Storekeeper Alan',
    timestamp: '2026-10-18T14:20:00Z',
  },
  {
    id: 'mov_104',
    ingredientId: 'ing_espresso_beans',
    type: 'sale_consumption',
    quantityDelta: -2.8,
    resultingQuantity: 6.2,
    reason: 'Espresso hopper grinder replenishment',
    recordedBy: 'Lead Barista Elena',
    timestamp: '2026-10-18T11:45:00Z',
  },
  {
    id: 'mov_105',
    ingredientId: 'ing_whole_milk',
    type: 'manual_adjustment',
    quantityDelta: -1.0,
    resultingQuantity: 19.0,
    reason: 'Physical count variance audit correction',
    recordedBy: 'Manager Sarah K.',
    timestamp: '2026-10-17T18:00:00Z',
  },
];
