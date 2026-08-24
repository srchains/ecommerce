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

  const cardUrl = `${window.location.origin}/?card=${encodeURIComponent(card.id || '')}`;
  lines.push(`URL:${cardUrl}`);

  if (card.bio) lines.push(`NOTE:${card.bio.replace(/\n/g, ' ')}`);

  lines.push('END:VCARD');
  return lines.join('\n');
}

/** Generates direct mobile contact link data (Android Intent / iOS vCard / Desktop Download). */
export function getMobileContactData(card: Partial<DigitalCard>): { 
  href: string; 
  download?: string; 
  isAndroid: boolean;
} {
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const name = card.name || 'Sr chains';
  const phone = (card.phone || card.whatsapp || '7010674487').replace(/[^\d+]/g, '');
  const company = [card.designation, card.company || 'SR Chains'].filter(Boolean).join(' at ');
  const email = card.email || '';

  if (isAndroid) {
    // Android Direct Intent URI: Directly opens native Android 'Create Contact' screen with ZERO file downloading!
    const androidIntent = `intent:#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/contact;S.name=${encodeURIComponent(name)};S.phone=${encodeURIComponent(phone)};S.company=${encodeURIComponent(company)};S.email=${encodeURIComponent(email)};end`;
    return { href: androidIntent, isAndroid: true };
  }

  if (isIOS) {
    // iOS Safari vCard URI: Triggers native iOS contact sheet
    const vcard = buildVCard(card);
    const dataUri = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;
    return { href: dataUri, isAndroid: false };
  }

  // Desktop / PC Fallback
  const vcard = buildVCard(card);
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  return { 
    href: blobUrl, 
    download: `${name.replace(/\s+/g, '_')}_Contact.vcf`, 
    isAndroid: false 
  };
}

/** Direct trigger function fallback */
export function saveContactToMobile(card: DigitalCard) {
  const data = getMobileContactData(card);
  if (data.isAndroid || data.download) {
    window.location.href = data.href;
  } else {
    const link = document.createElement('a');
    link.href = data.href;
    if (data.download) link.download = data.download;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const downloadVCard = saveContactToMobile;
