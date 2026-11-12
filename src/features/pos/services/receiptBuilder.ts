// Thermal receipt builder for 58mm (32 cols) / 80mm (42 cols) printers.
// Produces both a plain-text preview and an ESC/POS byte stream.

export type ReceiptPaperWidth = 32 | 42;

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptData {
  storeName: string;
  branchName?: string;
  address?: string;
  gstin?: string;
  fssai?: string;
  orderNumber: string;
  orderType: string;
  tableNumber?: string;
  dateTime: string;
  items: ReceiptLineItem[];
  subtotal: number;
  discount?: number;
  tax: number;
  serviceCharge?: number;
  total: number;
  paid: number;
  method: string;
  change?: number;
  footer?: string;
  // GST breakup (optional)
  cgst?: number;
  sgst?: number;
  igst?: number;
}

function padRight(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n);
  return s + ' '.repeat(n - s.length);
}

function padLeft(s: string, n: number): string {
  if (s.length >= n) return s.slice(-n);
  return ' '.repeat(n - s.length) + s;
}

function center(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n);
  const left = Math.floor((n - s.length) / 2);
  return ' '.repeat(left) + s + ' '.repeat(n - s.length - left);
}

function divider(n: number, ch = '-'): string {
  return ch.repeat(n);
}

function money(n: number): string {
  return n.toFixed(2);
}

export function buildTextReceipt(data: ReceiptData, width: ReceiptPaperWidth = 32): string {
  const lines: string[] = [];
  lines.push(center(data.storeName || 'Restaurant', width));
  if (data.branchName) lines.push(center(data.branchName, width));
  if (data.address) lines.push(center(data.address, width));
  if (data.gstin) lines.push(center(`GSTIN: ${data.gstin}`, width));
  if (data.fssai) lines.push(center(`FSSAI: ${data.fssai}`, width));
  lines.push(divider(width));
  lines.push(`Order: ${data.orderNumber}  ${data.orderType}`);
  if (data.tableNumber) lines.push(`Table: ${data.tableNumber}`);
  lines.push(`Date: ${data.dateTime}`);
  lines.push(divider(width));
  lines.push(padRight('Item', width - 12) + padLeft('Qty', 4) + padLeft('Total', 8));
  for (const it of data.items) {
    const name = it.name.length > width - 12 ? it.name.slice(0, width - 13) + '.' : it.name;
    lines.push(padRight(name, width - 12) + padLeft(String(it.quantity), 4) + padLeft(money(it.lineTotal), 8));
    if (it.quantity > 1) {
      lines.push(padRight(`  @ ${money(it.unitPrice)}`, width));
    }
  }
  lines.push(divider(width));
  lines.push(padRight('Subtotal', width - 10) + padLeft(money(data.subtotal), 10));
  if (data.discount && data.discount > 0) {
    lines.push(padRight('Discount', width - 10) + padLeft(`-${money(data.discount)}`, 10));
  }
  lines.push(padRight('Tax', width - 10) + padLeft(money(data.tax), 10));
  if (data.cgst != null) lines.push(padRight('  CGST', width - 10) + padLeft(money(data.cgst), 10));
  if (data.sgst != null) lines.push(padRight('  SGST', width - 10) + padLeft(money(data.sgst), 10));
  if (data.igst != null) lines.push(padRight('  IGST', width - 10) + padLeft(money(data.igst), 10));
  if (data.serviceCharge && data.serviceCharge > 0) {
    lines.push(padRight('Service Charge', width - 10) + padLeft(money(data.serviceCharge), 10));
  }
  lines.push(divider(width, '='));
  lines.push(padRight('TOTAL', width - 10) + padLeft(money(data.total), 10));
  lines.push(padRight('Paid', width - 10) + padLeft(money(data.paid), 10));
  lines.push(padRight('Method', width - 10) + padLeft(data.method.toUpperCase(), 10));
  if (data.change && data.change > 0) {
    lines.push(padRight('Change', width - 10) + padLeft(money(data.change), 10));
  }
  lines.push(divider(width));
  lines.push(center(data.footer || 'Thank you for dining with us!', width));
  lines.push('');
  return lines.join('\n');
}

// ESC/POS command helpers
const ESC = 0x1b;
const GS = 0x1d;

function cmd(...bytes: number[]): number[] {
  return bytes;
}

export function buildEscPos(data: ReceiptData, width: ReceiptPaperWidth = 42): Uint8Array {
  const out: number[] = [];
  // Initialize
  out.push(...cmd(ESC, 0x40));
  // Center alignment
  out.push(...cmd(ESC, 0x61, 0x01));
  out.push(...encode(data.storeName || 'Restaurant'));
  out.push(0x0a);
  if (data.branchName) {
    out.push(...encode(data.branchName));
    out.push(0x0a);
  }
  if (data.gstin) {
    out.push(...encode(`GSTIN: ${data.gstin}`));
    out.push(0x0a);
  }
  // Left align
  out.push(...cmd(ESC, 0x61, 0x00));
  out.push(...encode('-'.repeat(width)));
  out.push(0x0a);
  out.push(...encode(`Order: ${data.orderNumber}  ${data.orderType}`));
  out.push(0x0a);
  if (data.tableNumber) {
    out.push(...encode(`Table: ${data.tableNumber}`));
    out.push(0x0a);
  }
  out.push(...encode(`Date: ${data.dateTime}`));
  out.push(0x0a);
  out.push(...encode('-'.repeat(width)));
  out.push(0x0a);
  for (const it of data.items) {
    const line = `${it.name.slice(0, width - 12).padEnd(width - 12)}${String(it.quantity).padStart(4)}${it.lineTotal.toFixed(2).padStart(8)}`;
    out.push(...encode(line));
    out.push(0x0a);
  }
  out.push(...encode('-'.repeat(width)));
  out.push(0x0a);
  out.push(...encode(`Subtotal`.padEnd(width - 10) + data.subtotal.toFixed(2).padStart(10)));
  out.push(0x0a);
  if (data.discount && data.discount > 0) {
    out.push(...encode(`Discount`.padEnd(width - 10) + (`-${data.discount.toFixed(2)}`).padStart(10)));
    out.push(0x0a);
  }
  out.push(...encode(`Tax`.padEnd(width - 10) + data.tax.toFixed(2).padStart(10)));
  out.push(0x0a);
  out.push(...encode('='.repeat(width)));
  out.push(0x0a);
  // Bold total
  out.push(...cmd(ESC, 0x45, 0x01));
  out.push(...encode(`TOTAL`.padEnd(width - 10) + data.total.toFixed(2).padStart(10)));
  out.push(0x0a);
  out.push(...cmd(ESC, 0x45, 0x00));
  out.push(...encode(`Paid`.padEnd(width - 10) + data.paid.toFixed(2).padStart(10)));
  out.push(0x0a);
  out.push(...encode(`Method`.padEnd(width - 10) + data.method.toUpperCase().padStart(10)));
  out.push(0x0a);
  if (data.change && data.change > 0) {
    out.push(...encode(`Change`.padEnd(width - 10) + data.change.toFixed(2).padStart(10)));
    out.push(0x0a);
  }
  out.push(...encode('-'.repeat(width)));
  out.push(0x0a);
  out.push(...cmd(ESC, 0x61, 0x01));
  out.push(...encode(data.footer || 'Thank you for dining with us!'));
  out.push(0x0a, 0x0a, 0x0a);
  // Cut
  out.push(...cmd(GS, 0x56, 0x00));
  return new Uint8Array(out);
}

function encode(s: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    bytes.push(code < 256 ? code : 0x3f);
  }
  return bytes;
}

export function downloadEscPos(data: ReceiptData, filename = 'receipt.bin'): void {
  const bytes = buildEscPos(data, 42);
  const blob = new Blob([bytes as any], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
