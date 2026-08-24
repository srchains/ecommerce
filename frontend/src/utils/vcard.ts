import type { DigitalCard } from '../types/card';

/** Builds a standard vCard (.vcf) string from a digital card profile. */
export function buildVCard(card: Partial<DigitalCard>): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${card.name || 'Sr chains'}`];

  if (card.company) lines.push(`ORG:${card.company}`);
  if (card.designation) lines.push(`TITLE:${card.designation}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL:${card.phone}`);
  if (card.whatsapp && card.whatsapp !== card.phone) lines.push(`TEL;TYPE=WhatsApp:${card.whatsapp}`);
  if (card.email) lines.push(`EMAIL:${card.email}`);
  if (card.address) lines.push(`ADR;TYPE=WORK:;;${card.address.replace(/\n/g, ' ')}`);
  if (card.website) lines.push(`URL:${card.website}`);
  if (card.bio) lines.push(`NOTE:${card.bio.replace(/\n/g, ' ')}`);

  lines.push('END:VCARD');
  return lines.join('\n');
}

/**
 * Returns an href and optional download attribute for the Save Contact button.
 *
 * MOBILE (Android & iOS):
 *   → Navigates to /api/cards/{id}/vcard which serves Content-Type: text/vcard
 *     with Content-Disposition: inline.
 *   → Android Chrome & iOS Safari treat this as a system intent and open the
 *     NATIVE CONTACTS APP directly in "Add Contact" mode — NO file download popup!
 *
 * DESKTOP:
 *   → Falls back to Blob download with a .vcf filename.
 */
export function getMobileContactData(card: Partial<DigitalCard>): {
  href: string;
  download?: string;
} {
  const isMobile = typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile && card.id) {
    // Server endpoint — returns text/vcard with Content-Disposition: inline
    // This is the ONLY reliable way to open native contacts on Android Chrome without a download popup.
    return { href: `/api/cards/${card.id}/vcard` };
  }

  // Desktop fallback — blob download
  const vcard = buildVCard(card);
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const name = (card.name || 'SR_Chains').replace(/\s+/g, '_');
  return { href: blobUrl, download: `${name}_Contact.vcf` };
}

/** Legacy direct-call fallback (used by desktop admin panel, etc.) */
export function saveContactToMobile(card: DigitalCard) {
  const data = getMobileContactData(card);
  const link = document.createElement('a');
  link.href = data.href;
  if (data.download) link.download = data.download;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const downloadVCard = saveContactToMobile;
