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
 * Returns the exact href URL for direct browser navigation.
 * Using a direct <a> link is highly recommended as browsers (Chrome, Safari)
 * require direct user gesture navigation on <a> tags to launch external intents.
 */
export function getContactHref(card: Partial<DigitalCard>): string {
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

  const name = card.name || 'Sr chains';
  const phone = (card.phone || card.whatsapp || '').trim();
  const email = card.email || '';
  const company = card.company || 'SR Chains';
  const notes = card.bio || '';

  if (isAndroid) {
    // Generic Android Intent to open the Contacts App Add Contact screen directly.
    return `intent://contacts/edit/#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/contact;S.name=${encodeURIComponent(name)};S.phone=${encodeURIComponent(phone)};S.email=${encodeURIComponent(email)};S.company=${encodeURIComponent(company)};S.notes=${encodeURIComponent(notes)};end`;
  }

  if (card.id) {
    // Serves inline/attachment from server, native contact sheet on iOS Safari
    return `/api/cards/${card.id}/vcard?t=${Date.now()}`;
  }

  // Fallback data URI for unsaved/local preview cards
  const vcard = buildVCard(card);
  return `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;
}

/** Legacy fallback function */
export function saveContactToMobile(card: Partial<DigitalCard>) {
  const url = getContactHref(card);
  const a = document.createElement('a');
  a.href = url;
  if (!url.startsWith('intent:')) {
    a.download = `${(card.name || 'SR_Chains').replace(/\s+/g, '_')}_Contact.vcf`;
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const downloadVCard = saveContactToMobile;
