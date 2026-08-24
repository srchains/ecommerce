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

/** Opens native mobile contacts prompt or triggers vCard file download. */
export function saveContactToMobile(card: DigitalCard) {
  const vcard = buildVCard(card);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // 1. Mobile Direct Launch: Open data URI text/vcard without 'download' attribute
    // so mobile browsers (iOS Safari & Android Chrome) trigger the native "Create Contact" / Contacts app!
    const dataUri = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;
    
    const link = document.createElement('a');
    link.href = dataUri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Fallback: If data URI doesn't launch contacts app within 300ms, use Blob location
    setTimeout(() => {
      try {
        const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        window.location.href = blobUrl;
      } catch (e) {
        console.warn('Fallback contact launch warning:', e);
      }
    }, 350);
  } else {
    // 2. Desktop Browser: Standard file download
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(card.name || 'SR_Chains').replace(/\s+/g, '_')}_Contact.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/** Legacy alias for backward compatibility */
export const downloadVCard = saveContactToMobile;
