import React, { useState } from 'react';
import { MenuItem, MenuItemModifier } from '@/mocks/menu.data';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/currency';

interface ModifierModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: MenuItem, selectedModifiers: MenuItemModifier[], instructions: string) => void;
}

export const ModifierModal: React.FC<ModifierModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selectedModifiers, setSelectedModifiers] = useState<MenuItemModifier[]>([]);
  const [instructions, setInstructions] = useState('');

  if (!item) return null;

  const handleToggleModifier = (modifier: MenuItemModifier, isRequiredGroup: boolean) => {
    if (isRequiredGroup) {
      // Replace existing in group
      setSelectedModifiers((prev) => [
        ...prev.filter((m) => !item.modifierGroups?.find((g) => g.required)?.options.some((o) => o.id === m.id)),
        modifier,
      ]);
    } else {
      // Toggle
      setSelectedModifiers((prev) =>
        prev.some((m) => m.id === modifier.id)
          ? prev.filter((m) => m.id !== modifier.id)
          : [...prev, modifier]
      );
    }
  };

  const calculateTotal = () => {
    const modTotal = selectedModifiers.reduce((acc, m) => acc + m.additionalPrice, 0);
    return item.price + modTotal;
  };

  const handleConfirm = () => {
    onConfirm(item, selectedModifiers, instructions);
    setSelectedModifiers([]);
    setInstructions('');
    onClose();
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>{item.name}</ModalTitle>
          <ModalDescription>Customize modifiers and preparation notes</ModalDescription>
        </ModalHeader>

        <div className="space-y-4 py-2">
          {item.modifierGroups?.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                  {group.name}
                </span>
                {group.required && (
                  <span className="text-[10px] text-amber-400 font-medium">Required</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.options.map((opt) => {
                  const isSelected = selectedModifiers.some((m) => m.id === opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleToggleModifier(opt, group.required)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-xs font-medium transition-all min-h-[44px] ${
                        isSelected
                          ? 'border-brand bg-brand/15 text-white'
                          : 'border-surface-border bg-surface-elevated text-gray-300 hover:bg-surface-active'
                      }`}
                    >
                      <span>{opt.name}</span>
                      <span className="text-gray-400">
                        {opt.additionalPrice > 0 ? `+${formatCurrency(opt.additionalPrice)}` : 'Free'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Special Preparation Instructions */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-medium text-gray-300">
              Kitchen / Barista Special Note
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Extra hot, no lid, syrup on side"
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            Add to Order • {formatCurrency(calculateTotal())}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
