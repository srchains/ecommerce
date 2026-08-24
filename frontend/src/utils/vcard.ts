import type { DigitalCard } from '../types/card';

/** Builds a standard vCard (.vcf) string from a digital card profile. */
export function buildVCard(card: DigitalCard): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${card.name}`];

  if (card.company) lines.push(`ORG:${card.company}`);
  if (card.designation) lines.push(`TITLE:${card.designation}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL:${card.phone}`);
  if (card.whatsapp && card.whatsapp !== card.phone) lines.push(`TEL;TYPE=WhatsApp:${card.whatsapp}`);
  if (card.email) lines.push(`EMAIL:${card.email}`);
  if (card.address) lines.push(`ADR;TYPE=WORK:;;${card.address.replace(/\n/g, ' ')}`);
  if (card.website) lines.push(`URL:${card.website}`);

  const cardUrl = `${window.location.origin}/?card=${encodeURIComponent(card.id || '')}`;
  lines.push(`URL:${cardUrl}`);

  if (card.bio) lines.push(`NOTE:${card.bio.replace(/\n/g, ' ')}`);

  lines.push('END:VCARD');
  return lines.join('\n');
}

/** Opens native mobile contacts prompt directly without file download popups. */
export function saveContactToMobile(card: DigitalCard) {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const name = card.name || 'Sr chains';
  const phone = (card.phone || card.whatsapp || '').trim();
  const company = [card.designation, card.company || 'SR Chains'].filter(Boolean).join(' at ');
  const email = card.email || '';
  const notes = card.bio || '';

  if (isAndroid) {
    // 1. Android Chrome Native Intent: Directly launches Android Contacts app 'Add Contact' Activity
    // Pre-fills Name, Mobile Number, Company, and Email with ZERO file download dialogs!
    const androidIntent = `intent:#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/contact;S.name=${encodeURIComponent(name)};S.phone=${encodeURIComponent(phone)};S.company=${encodeURIComponent(company)};S.email=${encodeURIComponent(email)};S.notes=${encodeURIComponent(notes)};end`;
    
    window.location.href = androidIntent;
    return;
  }

  if (isIOS) {
    // 2. iOS Safari Native vCard Launch: Triggers iOS native Contact sheet directly
    const vcard = buildVCard(card);
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // 3. Desktop / PC Fallback: Standard .vcf file download
  const vcard = buildVCard(card);
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.replace(/\s+/g, '_')}_Contact.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Legacy alias for backward compatibility */
export const downloadVCard = saveContactToMobile;
