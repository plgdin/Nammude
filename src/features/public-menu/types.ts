import { MenuItemWithModifiers, ModifierRecord } from '@/features/pos/types';

export interface CustomerCartItem {
  id: string; // client uuid
  menuItem: MenuItemWithModifiers;
  quantity: number;
  selectedVariant?: ModifierRecord;
  selectedAddons: ModifierRecord[];
  specialInstructions: string;
  unitPrice: number;
  lineTotal: number;
  isUnavailable?: boolean;
}

export type OrderingScreenState =
  | 'welcome'
  | 'menu'
  | 'item_details'
  | 'basket'
  | 'review'
  | 'confirmation';

export type OrderSubmissionStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'failed';
