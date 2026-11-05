import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DiningTableRecord } from './types';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { ExternalLink, Copy, Check, Printer } from 'lucide-react';

interface TableQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: DiningTableRecord | null;
}

export const TableQrModal: React.FC<TableQrModalProps> = ({ isOpen, onClose, table }) => {
  const { currentOrganization } = useOrganization();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  if (!table || !currentOrganization) return null;

  const origin = window.location.origin;
  const menuUrl = `${origin}/menu/${currentOrganization.slug}?table=${table.table_number}`;

  useEffect(() => {
    QRCode.toDataURL(menuUrl, {
      width: 400,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Failed to generate QR in TableQrModal:', err));
  }, [menuUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Printable Sheet for POS Stand */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[99999]">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #pos-printable-stand, #pos-printable-stand * { visibility: visible !important; }
            #pos-printable-stand {
              position: absolute !important;
              left: 50% !important;
              top: 50% !important;
              transform: translate(-50%, -50%) !important;
              width: 360px !important;
              margin: 0 auto !important;
            }
          }
        `}</style>
        <div
          id="pos-printable-stand"
          className="border-2 border-black rounded-3xl p-6 text-center flex flex-col items-center bg-white"
        >
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
            {currentOrganization.name}
          </div>
          <div className="px-4 py-1.5 bg-black text-white rounded-full text-sm font-extrabold mb-3">
            TABLE {table.table_number}
          </div>
          <div className="p-3 bg-white border border-gray-200 rounded-2xl">
            {qrDataUrl && <img src={qrDataUrl} alt="Table QR" className="w-52 h-52 object-contain" />}
          </div>
          <p className="text-xs font-bold uppercase mt-3">Scan with Phone Camera</p>
          <p className="text-[11px] text-gray-600 mt-0.5">Browse menu & order directly</p>
        </div>
      </div>

      <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <ModalContent className="max-w-sm text-center">
          <ModalHeader>
            <ModalTitle>Table {table.table_number} QR Menu</ModalTitle>
            <ModalDescription>
              {table.section} • Capacity {table.capacity} guests
            </ModalDescription>
          </ModalHeader>

          <div className="py-4 flex flex-col items-center gap-4">
            {/* Real High-Contrast Scannable QR Visual */}
            <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col items-center">
              <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center p-1">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Table ${table.table_number} QR`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-gray-400">Generating QR...</div>
                )}
              </div>
              <span className="text-[10px] font-bold tracking-widest text-gray-800 mt-2 uppercase">
                {currentOrganization.name} • Table {table.table_number}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                Phone-scannable barcode
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

          <ModalFooter className="flex items-center justify-between gap-2">
            <Button variant="secondary" onClick={handlePrint} className="gap-1.5 text-xs">
              <Printer className="h-3.5 w-3.5" />
              <span>Print PDF</span>
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => window.open(menuUrl, '_blank')}
                className="gap-1.5"
              >
                <span>Open</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
