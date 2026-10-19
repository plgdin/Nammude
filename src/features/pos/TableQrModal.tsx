import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DiningTableRecord } from './types';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { QrCode, ExternalLink, Copy, Check } from 'lucide-react';

interface TableQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: DiningTableRecord | null;
}

export const TableQrModal: React.FC<TableQrModalProps> = ({ isOpen, onClose, table }) => {
  const { currentOrganization } = useOrganization();
  const [copied, setCopied] = useState(false);

  if (!table || !currentOrganization) return null;

  const origin = window.location.origin;
  const menuUrl = `${origin}/menu?tenant=${currentOrganization.slug}&table=${table.table_number}&token=${table.qr_token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-sm text-center">
        <ModalHeader>
          <ModalTitle>Table {table.table_number} QR Menu</ModalTitle>
          <ModalDescription>
            {table.section} • Capacity {table.capacity} guests
          </ModalDescription>
        </ModalHeader>

        <div className="py-4 flex flex-col items-center gap-4">
          {/* Simulated High-Res QR Visual */}
          <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col items-center">
            <div className="h-44 w-44 bg-gray-900 rounded-xl flex flex-col items-center justify-center p-3 text-white">
              <QrCode className="h-28 w-28 text-white stroke-[1.5]" />
              <span className="text-[10px] font-bold tracking-widest text-brand mt-1 uppercase">
                {currentOrganization.name}
              </span>
              <span className="text-[9px] font-mono text-gray-300">
                Table {table.table_number}
              </span>
            </div>
            <span className="text-[11px] text-gray-500 font-medium mt-2">
              Scan to view digital menu
            </span>
          </div>

          <div className="w-full bg-surface-elevated p-2.5 rounded-lg border border-surface-border text-left">
            <span className="text-[10px] text-gray-400 block font-mono">Public URL:</span>
            <div className="flex items-center justify-between gap-2 mt-1">
              <input
                readOnly
                value={menuUrl}
                className="text-xs text-white bg-transparent font-mono truncate w-full outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="text-gray-400 hover:text-white p-1 rounded transition-colors"
                title="Copy Link"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => window.open(menuUrl, '_blank')}
            className="gap-1.5"
          >
            <span>Open Menu</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
