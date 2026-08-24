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

/** Directly opens native phone contacts app (Add Contact screen) with pre-filled name & phone number - 0% downloading. */
export function saveContactToMobile(card: DigitalCard) {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const name = card.name || 'Sr chains';
  const rawPhone = (card.phone || card.whatsapp || '').trim();
  const phone = rawPhone ? rawPhone : '7010674487';
  const company = [card.designation, card.company || 'SR Chains'].filter(Boolean).join(' at ');
  const email = card.email || 'srchains19@gmail.com';
  const notes = card.bio || '';

  if (isAndroid) {
    // Android Intent format for Xiaomi HyperOS/MIUI, Samsung, Vivo, Oppo, OnePlus
    // Triggers native 'Create New Contact' Activity directly with NO file downloading!
    const androidIntent = `intent://com.android.contacts/contacts#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.item/contact;S.name=${encodeURIComponent(name)};S.phone=${encodeURIComponent(phone)};S.company=${encodeURIComponent(company)};S.email=${encodeURIComponent(email)};S.notes=${encodeURIComponent(notes)};end`;
    
    // Trigger intent via link click
    const link = document.createElement('a');
    link.href = androidIntent;
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Fallback: If Intent is intercepted, try direct window navigation to intent
    setTimeout(() => {
      if (document.hasFocus()) {
        const altIntent = `intent:#Intent;action=android.intent.action.INSERT_OR_EDIT;type=vnd.android.cursor.item/contact;S.name=${encodeURIComponent(name)};S.phone=${encodeURIComponent(phone)};S.company=${encodeURIComponent(company)};S.email=${encodeURIComponent(email)};end`;
        window.location.href = altIntent;
      }
    }, 400);

    return;
  }

  if (isIOS) {
    // iOS Safari Native Contact Sheet
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

  // Desktop / PC Fallback
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
