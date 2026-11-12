import QRCode from 'qrcode';

export interface UpiPaymentParams {
  /** Virtual Payment Address (e.g. merchant@upi) */
  pa: string;
  /** Payee name */
  pn?: string;
  /** Amount in INR */
  am?: number;
  /** Transaction note */
  tn?: string;
  /** Transaction reference id */
  tr?: string;
  /** Currency code (defaults to INR) */
  cu?: string;
}

/**
 * Build a UPI deep link per the NPCI UPI specification.
 * Returns null when the VPA is missing/invalid.
 */
export function buildUpiUri(params: UpiPaymentParams): string | null {
  const pa = (params.pa || '').trim();
  if (!isValidVpa(pa)) return null;

  const search = new URLSearchParams();
  search.set('pa', pa);
  if (params.pn) search.set('pn', params.pn);
  if (params.am != null && Number.isFinite(params.am) && params.am > 0) {
    search.set('am', params.am.toFixed(2));
  }
  if (params.tn) search.set('tn', params.tn);
  if (params.tr) search.set('tr', params.tr);
  search.set('cu', params.cu || 'INR');
  // Request a collect/payment that the payer approves in their UPI app.
  search.set('mode', '02');

  return `upi://pay?${search.toString()}`;
}

export function isValidVpa(vpa: string): boolean {
  if (!vpa || typeof vpa !== 'string') return false;
  const trimmed = vpa.trim();
  // VPA format: handle@provider, both segments non-empty, no spaces.
  return /^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]{2,}$/.test(trimmed);
}

/**
 * Render a UPI deep link as a PNG data URL suitable for <img src>.
 */
export async function generateUpiQrDataUrl(
  uri: string,
  options?: { width?: number; margin?: number }
): Promise<string> {
  if (!uri) throw new Error('UPI URI is required');
  return QRCode.toDataURL(uri, {
    width: options?.width ?? 220,
    margin: options?.margin ?? 2,
    errorCorrectionLevel: 'M',
  });
}
