import type { DigitalCard } from '../types/card';

/** Builds a downloadable vCard (.vcf) string from a digital card profile. */
export function buildVCard(card: DigitalCard): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${card.name}`];

  if (card.company) lines.push(`ORG:${card.company}`);
  if (card.designation) lines.push(`TITLE:${card.designation}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL:${card.phone}`);
  if (card.whatsapp && card.whatsapp !== card.phone) lines.push(`TEL;TYPE=WhatsApp:${card.whatsapp}`);
  if (card.email) lines.push(`EMAIL:${card.email}`);
  if (card.address) lines.push(`ADR;TYPE=WORK:;;${card.address.replace(/\n/g, ' ')}`);
  if (card.website) lines.push(`URL:${card.website}`);

  const cardUrl = `${window.location.origin}/?card=${encodeURIComponent(card.id)}`;
  lines.push(`URL:${cardUrl}`);

  if (card.bio) lines.push(`NOTE:${card.bio.replace(/\n/g, ' ')}`);

  lines.push('END:VCARD');
  return lines.join('\n');
}

/** Triggers a browser download of the given card's vCard (.vcf) file. */
export function downloadVCard(card: DigitalCard) {
  const vcard = buildVCard(card);
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${card.name.replace(/\s+/g, '_')}_SR_Chains.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
