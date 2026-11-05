import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Printer, Download, ExternalLink, Copy, Check, Globe } from 'lucide-react';

export interface TableQrItem {
  id: string;
  number: string;
  section: string;
  qrUrl: string;
}

interface Props {
  table: TableQrItem | null;
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  restaurantSlug: string;
  initialDomain?: string;
  onDomainChange?: (newDomain: string) => void;
}

const getSystemOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://tablewise.io';
};

export const TableQrExpandedModal: React.FC<Props> = ({
  table,
  isOpen,
  onClose,
  restaurantName,
  restaurantSlug,
  initialDomain,
  onDomainChange,
}) => {
  const currentOrigin = getSystemOrigin();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [domain, setDomain] = useState<string>(initialDomain || currentOrigin);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDomain(initialDomain || currentOrigin);
  }, [initialDomain, currentOrigin]);

  const cleanDomain = domain.trim().replace(/\/$/, '') || currentOrigin;
  const tableSlug = restaurantSlug || restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'restaurant';
  const tableNum = table ? table.number.replace(/^T/i, '') : '1';
  const websiteMenuUrl = `${cleanDomain}/menu/${tableSlug}?table=${tableNum}`;

  // Generate real QR code image for this website URL
  useEffect(() => {
    if (!table) return;

    QRCode.toDataURL(websiteMenuUrl, {
      width: 600,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR:', err));
  }, [websiteMenuUrl, table]);

  if (!table) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(websiteMenuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `${tableSlug}-table-${table.number}-qr.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDomainUpdate = (newVal: string) => {
    setDomain(newVal);
    if (onDomainChange) {
      onDomainChange(newVal);
    }
  };

  return (
    <>
      {/* ─── Printable Table Tent Stand (Formatted strictly for Print / PDF) ─── */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[99999]">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #tablewise-printable-stand, #tablewise-printable-stand * { visibility: visible !important; }
            #tablewise-printable-stand {
              position: absolute !important;
              left: 50% !important;
              top: 50% !important;
              transform: translate(-50%, -50%) !important;
              width: 380px !important;
              margin: 0 auto !important;
            }
            @page {
              size: auto;
              margin: 12mm;
            }
          }
        `}</style>
        <div
          id="tablewise-printable-stand"
          ref={printRef}
          className="border-2 border-black rounded-3xl p-8 text-center flex flex-col items-center bg-white shadow-none"
        >
          <div className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">
            Welcome to
          </div>
          <h1 className="text-2xl font-black text-black tracking-tight mb-2">
            {restaurantName}
          </h1>

          <div className="my-2 px-5 py-1.5 bg-black text-white rounded-full text-base font-extrabold tracking-wide">
            TABLE {table.number}
          </div>

          <div className="p-3 bg-white border-2 border-black rounded-2xl my-4">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt={`Table ${table.number} QR Code`}
                className="w-56 h-56 object-contain"
              />
            )}
          </div>

          <div className="text-sm font-bold text-black uppercase tracking-wider mb-1">
            Scan to View Menu & Order
          </div>
          <p className="text-xs text-gray-600 max-w-xs leading-relaxed">
            Point your phone camera to browse dishes and order directly to our kitchen.
          </p>

          <div className="mt-5 text-[11px] font-mono text-gray-500 break-all px-2">
            {websiteMenuUrl}
          </div>

          <div className="mt-5 pt-3 border-t border-dashed border-gray-300 w-full flex justify-between text-[10px] text-gray-400 font-mono">
            <span>Section: {table.section}</span>
            <span>Tablewise System</span>
          </div>
        </div>
      </div>

      {/* ─── Interactive Modal View ─── */}
      <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <ModalContent className="max-w-md p-6 bg-surface border border-surface-border rounded-2xl shadow-2xl text-left">
          <ModalHeader className="pb-3 border-b border-surface-border">
            <div className="flex items-center justify-between">
              <div>
                <ModalTitle className="text-lg font-bold text-white flex items-center gap-2">
                  Table {table.number} QR Stand Card
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-brand/20 text-brand border border-brand/30">
                    {table.section}
                  </span>
                </ModalTitle>
                <ModalDescription className="text-xs text-gray-400 mt-0.5">
                  Live website ordering link & printable stand
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>

          <div className="py-4 space-y-4">
            {/* Website Domain Bar */}
            <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-brand" />
                  Website Domain
                </span>
                <span className="text-[10px] text-gray-400">Edit domain if deployed</span>
              </div>
              <input
                type="text"
                value={domain}
                onChange={(e) => handleDomainUpdate(e.target.value)}
                placeholder={currentOrigin}
                className="w-full bg-canvas border border-surface-border rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-brand outline-none"
              />
            </div>

            {/* High-Contrast Phone-Scannable QR Card */}
            <div className="p-5 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                {restaurantName}
              </span>
              <div className="inline-block px-3 py-1 rounded-full bg-black text-white text-xs font-extrabold mb-3">
                TABLE {table.number}
              </div>

              <div className="p-2 bg-white rounded-xl border border-gray-200">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Table ${table.number} QR Code`}
                    className="w-52 h-52 object-contain"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-gray-400 text-xs">
                    Generating scannable QR...
                  </div>
                )}
              </div>

              <p className="text-xs font-bold text-gray-900 mt-3">
                Scan with phone camera
              </p>
              <p className="text-[11px] text-gray-600 max-w-xs mt-0.5">
                Opens digital menu for Table {table.number}
              </p>
            </div>

            {/* Website URL Display & Copy */}
            <div className="bg-canvas p-2.5 rounded-xl border border-surface-border text-xs flex items-center justify-between gap-2">
              <div className="truncate flex-1">
                <span className="text-[10px] text-gray-400 block font-medium">Customer Website Link:</span>
                <span className="text-brand font-mono text-xs truncate block select-all">
                  {websiteMenuUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 p-2 rounded-lg bg-surface-elevated text-gray-300 hover:text-white transition flex items-center gap-1"
                title="Copy link"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[11px] text-emerald-400 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-surface-border flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={handlePrint}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                <Printer className="h-4 w-4" />
                <span>Print Stand (PDF)</span>
              </Button>

              <Button
                variant="secondary"
                onClick={handleDownload}
                className="gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PNG</span>
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={() => window.open(websiteMenuUrl, '_blank')}
              className="gap-1.5 text-xs text-brand hover:text-brand-fg"
            >
              <span>Open Link</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
};
