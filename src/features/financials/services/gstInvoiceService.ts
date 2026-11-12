// GST (India) invoice + Tally/GSTR export helpers. Pure functions, no I/O.

export interface GstParty {
  name: string;
  gstin?: string | null;
  address?: string | null;
  state?: string | null;
}

export interface GstInvoiceLine {
  description: string;
  hsn?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // percent, e.g. 5 for 5%
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface GstInvoice {
  invoiceNumber: string;
  invoiceDate: string; // ISO date
  supplier: GstParty;
  recipient: GstParty;
  placeOfSupply: string;
  isInterState: boolean;
  lines: GstInvoiceLine[];
  subtotal: number;
  totalTax: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
}

export interface GstInvoiceInput {
  invoiceNumber: string;
  invoiceDate?: string;
  supplier: GstParty;
  recipient: GstParty;
  lines: Array<{
    description: string;
    hsn?: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
}

export function isInterStateSupply(supplierState: string | null | undefined, recipientState: string | null | undefined): boolean {
  const a = (supplierState || '').trim().toLowerCase();
  const b = (recipientState || '').trim().toLowerCase();
  if (!a || !b) return false;
  return a !== b;
}

export function computeLineTax(
  quantity: number,
  unitPrice: number,
  taxRate: number,
  interState: boolean
): { taxableAmount: number; cgst: number; sgst: number; igst: number; total: number } {
  const taxableAmount = round2(quantity * unitPrice);
  const taxAmount = round2(taxableAmount * (taxRate / 100));
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (interState) {
    igst = taxAmount;
  } else {
    cgst = round2(taxAmount / 2);
    sgst = round2(taxAmount - cgst);
  }
  const total = round2(taxableAmount + taxAmount);
  return { taxableAmount, cgst, sgst, igst, total };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildInvoice(input: GstInvoiceInput): GstInvoice {
  const invoiceDate = input.invoiceDate || new Date().toISOString().split('T')[0];
  const interState = isInterStateSupply(input.supplier.state, input.recipient.state);
  const placeOfSupply = input.recipient.state || input.supplier.state || '';

  const lines: GstInvoiceLine[] = input.lines.map((l) => {
    const t = computeLineTax(l.quantity, l.unitPrice, l.taxRate, interState);
    return {
      description: l.description,
      hsn: l.hsn,
      quantity: l.quantity,
      unitPrice: round2(l.unitPrice),
      taxRate: l.taxRate,
      taxableAmount: t.taxableAmount,
      cgst: t.cgst,
      sgst: t.sgst,
      igst: t.igst,
      total: t.total,
    };
  });

  const subtotal = round2(lines.reduce((s, l) => s + l.taxableAmount, 0));
  const cgstTotal = round2(lines.reduce((s, l) => s + l.cgst, 0));
  const sgstTotal = round2(lines.reduce((s, l) => s + l.sgst, 0));
  const igstTotal = round2(lines.reduce((s, l) => s + l.igst, 0));
  const totalTax = round2(cgstTotal + sgstTotal + igstTotal);
  const grandTotal = round2(subtotal + totalTax);

  return {
    invoiceNumber: input.invoiceNumber,
    invoiceDate,
    supplier: input.supplier,
    recipient: input.recipient,
    placeOfSupply,
    isInterState: interState,
    lines,
    subtotal,
    totalTax,
    cgstTotal,
    sgstTotal,
    igstTotal,
    grandTotal,
  };
}

export function buildInvoiceNumber(prefix: string | null | undefined, date: Date = new Date(), seq: number = 1): string {
  const p = (prefix || 'INV').trim();
  const y = date.getFullYear();
  const fyStart = date.getMonth() >= 3 ? y : y - 1; // April start
  const fy = `${String(fyStart).slice(-2)}-${String(fyStart + 1).slice(-2)}`;
  return `${p}/${fy}/${String(seq).padStart(4, '0')}`;
}

export function invoiceToText(inv: GstInvoice, width = 42): string {
  const lines: string[] = [];
  lines.push('TAX INVOICE');
  lines.push(`Invoice No: ${inv.invoiceNumber}`);
  lines.push(`Date: ${inv.invoiceDate}`);
  lines.push(`Place of Supply: ${inv.placeOfSupply}`);
  lines.push(`Supplier: ${inv.supplier.name}${inv.supplier.gstin ? ` (${inv.supplier.gstin})` : ''}`);
  lines.push(`Recipient: ${inv.recipient.name}${inv.recipient.gstin ? ` (${inv.recipient.gstin})` : ''}`);
  lines.push('-'.repeat(width));
  lines.push('Item'.padEnd(width - 20) + 'Taxable'.padStart(10) + 'Total'.padStart(10));
  for (const l of inv.lines) {
    lines.push(l.description.slice(0, width - 20).padEnd(width - 20) + l.taxableAmount.toFixed(2).padStart(10) + l.total.toFixed(2).padStart(10));
  }
  lines.push('-'.repeat(width));
  lines.push('Subtotal'.padEnd(width - 10) + inv.subtotal.toFixed(2).padStart(10));
  if (inv.cgstTotal) lines.push('CGST'.padEnd(width - 10) + inv.cgstTotal.toFixed(2).padStart(10));
  if (inv.sgstTotal) lines.push('SGST'.padEnd(width - 10) + inv.sgstTotal.toFixed(2).padStart(10));
  if (inv.igstTotal) lines.push('IGST'.padEnd(width - 10) + inv.igstTotal.toFixed(2).padStart(10));
  lines.push('TOTAL'.padEnd(width - 10) + inv.grandTotal.toFixed(2).padStart(10));
  return lines.join('\n');
}

export function ordersToGstr1Csv(
  invoices: GstInvoice[]
): string {
  const header = [
    'InvoiceNumber',
    'InvoiceDate',
    'PlaceOfSupply',
    'RecipientGSTIN',
    'InvoiceValue',
    'TaxableValue',
    'CGST',
    'SGST',
    'IGST',
    'TotalTax',
  ].join(',');
  const rows = invoices.map((inv) =>
    [
      csvEscape(inv.invoiceNumber),
      inv.invoiceDate,
      csvEscape(inv.placeOfSupply),
      csvEscape(inv.recipient.gstin || ''),
      inv.grandTotal.toFixed(2),
      inv.subtotal.toFixed(2),
      inv.cgstTotal.toFixed(2),
      inv.sgstTotal.toFixed(2),
      inv.igstTotal.toFixed(2),
      inv.totalTax.toFixed(2),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function invoicesToTallyXml(invoices: GstInvoice[]): string {
  const vouchers = invoices
    .map((inv) => {
      const linesXml = inv.lines
        .map(
          (l) =>
            `      <ALLINVENTORYENTRIES.LIST>\n        <STOCKITEMNAME>${escapeXml(l.description)}</STOCKITEMNAME>\n        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n        <AMOUNT>${l.total.toFixed(2)}</AMOUNT>\n        <BILLEDQTY>${l.quantity}</BILLEDQTY>\n        <RATE>${l.unitPrice.toFixed(2)}</RATE>\n      </ALLINVENTORYENTRIES.LIST>`
        )
        .join('\n');
      return `    <VOUCHER VCHTYPE="Sales" ACTION="Create">\n      <DATE>${inv.invoiceDate.replace(/-/g, '')}</DATE>\n      <VOUCHERNUMBER>${escapeXml(inv.invoiceNumber)}</VOUCHERNUMBER>\n      <PARTYLEDGERNAME>${escapeXml(inv.recipient.name)}</PARTYLEDGERNAME>\n      <GSTIN>${escapeXml(inv.recipient.gstin || '')}</GSTIN>\n      <STATENAME>${escapeXml(inv.placeOfSupply)}</STATENAME>\n${linesXml}\n      <LEDGERENTRIES.LIST>\n        <LEDGERNAME>Sales</LEDGERNAME>\n        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n        <AMOUNT>${inv.grandTotal.toFixed(2)}</AMOUNT>\n      </LEDGERENTRIES.LIST>\n    </VOUCHER>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>Vouchers</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n${vouchers}\n      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
