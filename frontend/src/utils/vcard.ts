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
  return lines.join('\r\n');
}

/**
 * Saves contact to phone.
 * 
 * - ANDROID: Synchronously launches native Contacts App "Add Contact" screen
 *   using a generic intent. This is 100% direct and has ZERO downloads or popups.
 * - IOS: Navigates to the server vcard endpoint which iOS Safari opens natively
 *   as a contact sheet.
 * - DESKTOP: Triggers standard file download of the .vcf file.
 */
export function saveContactToMobile(card: Partial<DigitalCard>) {
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const name = card.name || 'Sr chains';
  const phone = (card.phone || card.whatsapp || '').trim();
  const email = card.email || '';
  const company = card.company || 'SR Chains';
  const notes = card.bio || '';

  if (isAndroid) {
    // Generic Android Intent to open the Contacts App Add Contact screen directly.
    // Must be 100% synchronous so Chrome does not block the user activation gesture.
    const intentUrl = `intent:#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/contact;S.name=${encodeURIComponent(name)};S.phone=${encodeURIComponent(phone)};S.email=${encodeURIComponent(email)};S.company=${encodeURIComponent(company)};S.notes=${encodeURIComponent(notes)};end;`;
    
    window.location.href = intentUrl;
    return;
  }

  if (isIOS) {
    // iOS Safari opens vcard links directly as a native contact sheet.
    if (card.id) {
      window.location.href = `/api/cards/${card.id}/vcard?t=${Date.now()}`;
    } else {
      const vcard = buildVCard(card);
      const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.location.href = url;
    }
    return;
  }

  // Desktop: Standard file download
  const vcard = buildVCard(card);
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_')}_Contact.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const downloadVCard = saveContactToMobile;
