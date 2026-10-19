import React from 'react';
import { InventoryIngredient, StockMovement } from '@/mocks/inventory.data';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/currency';
import { History, Truck, MapPin } from 'lucide-react';

interface IngredientDetailModalProps {
  ingredient: InventoryIngredient | null;
  movements: StockMovement[];
  isOpen: boolean;
  onClose: () => void;
  onOpenAdjustment: (ingredient: InventoryIngredient) => void;
}

export const IngredientDetailModal: React.FC<IngredientDetailModalProps> = ({
  ingredient,
  movements,
  isOpen,
  onClose,
  onOpenAdjustment,
}) => {
  if (!ingredient) return null;

  const itemMovements = movements.filter((m) => m.ingredientId === ingredient.id);

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-xl">
        <ModalHeader>
          <div className="flex items-center justify-between">
            <ModalTitle>{ingredient.name}</ModalTitle>
            <Badge
              variant={
                ingredient.status === 'critical'
                  ? 'danger'
                  : ingredient.status === 'low'
                  ? 'warning'
                  : 'success'
              }
              size="sm"
            >
              {ingredient.status.toUpperCase()}
            </Badge>
          </div>
          <ModalDescription className="font-mono text-xs">
            SKU: {ingredient.sku} • Category: {ingredient.category}
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Key Stock Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl border border-surface-border bg-surface-elevated text-center">
              <span className="text-gray-400 block text-[11px]">Current Stock</span>
              <span className="text-lg font-bold text-white mt-0.5 block">
                {ingredient.currentStock} {ingredient.unit}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-surface-border bg-surface-elevated text-center">
              <span className="text-gray-400 block text-[11px]">Reorder Threshold</span>
              <span className="text-lg font-bold text-amber-400 mt-0.5 block">
                {ingredient.reorderLevel} {ingredient.unit}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-surface-border bg-surface-elevated text-center">
              <span className="text-gray-400 block text-[11px]">Unit Cost</span>
              <span className="text-lg font-bold text-white mt-0.5 block">
                {formatCurrency(ingredient.unitCost)} / {ingredient.unit}
              </span>
            </div>
          </div>

          {/* Logistics & Supplier Information */}
          <div className="p-3.5 rounded-xl border border-surface-border bg-surface-elevated/70 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-blue-400" />
              Supplier & Location Metadata
            </h4>
            <div className="grid grid-cols-2 gap-2 text-gray-300">
              <div>
                <span className="text-gray-500 block text-[10px]">Primary Supplier:</span>
                <span className="font-medium text-white">{ingredient.supplierName}</span>
                <span className="text-gray-400 block text-[11px]">{ingredient.supplierContact}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">Storage Bin:</span>
                <span className="font-medium text-white flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-amber-400" />
                  {ingredient.storageLocation}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">Last Restocked:</span>
                <span className="text-gray-300">{ingredient.lastRestockDate}</span>
              </div>
              {ingredient.expiryDate && (
                <div>
                  <span className="text-gray-500 block text-[10px]">Active Batch Expiry:</span>
                  <span className="text-amber-400 font-semibold">{ingredient.expiryDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Movement Audit Trail */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <History className="h-4 w-4 text-gray-400" />
              Recent Stock Movements (Audit Trail)
            </h4>

            {itemMovements.length === 0 ? (
              <p className="text-gray-500 italic p-3 text-center bg-surface-elevated rounded-lg">
                No recent movements logged for this ingredient today.
              </p>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {itemMovements.map((mov) => (
                  <div
                    key={mov.id}
                    className="p-2.5 rounded-lg border border-surface-border bg-surface-elevated flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">{mov.reason}</p>
                      <p className="text-[10px] text-gray-400">
                        {mov.recordedBy} • {new Date(mov.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-bold block ${
                          mov.quantityDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {mov.quantityDelta > 0 ? `+${mov.quantityDelta}` : mov.quantityDelta}{' '}
                        {ingredient.unit}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Bal: {mov.resultingQuantity} {ingredient.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              onOpenAdjustment(ingredient);
            }}
          >
            Adjust Stock Count
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
