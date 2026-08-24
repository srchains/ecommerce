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
 * Saves contact to phone using the BEST available method:
 *
 * 1. MOBILE (Android/iOS) — Web Share API with .vcf file:
 *    → Fetches vCard from server, creates a File object, calls navigator.share({ files })
 *    → Android shows system share sheet → user taps "Contacts" → Add Contact screen opens!
 *    → EXACTLY like how the "Call" button opens the dialer — zero download dialog!
 *
 * 2. MOBILE FALLBACK — if Share API not supported:
 *    → Navigates to /api/cards/{id}/vcard (server returns text/vcard inline)
 *    → Android opens with Contacts app directly
 *
 * 3. DESKTOP — standard .vcf file download
 */
export async function saveContactToMobile(card: Partial<DigitalCard>): Promise<void> {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isMobile = isAndroid || isIOS;

  if (isMobile && card.id) {
    try {
      // Fetch vCard from server
      const resp = await fetch(`/api/cards/${card.id}/vcard?t=${Date.now()}`);
      const blob = await resp.blob();
      const safeName = (card.name || 'Sr_chains').replace(/\s+/g, '_');
      const file = new File([blob], `${safeName}.vcf`, { type: 'text/vcard' });

      // Use Web Share API — Android shows share sheet with "Contacts" app
      // Tapping "Contacts" opens the native Add Contact screen directly!
      // This is the SAME mechanism as tel: for calls — zero download popup!
      if (
        navigator.share &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: card.name || 'SR Chains Contact',
        });
        return;
      }
    } catch (err) {
      // User cancelled share sheet or share failed — continue to fallback
      if ((err as Error).name === 'AbortError') return; // user cancelled — that's fine
    }

    // Mobile fallback: navigate to server vcard endpoint
    // Server returns text/vcard with Content-Disposition: inline
    // Android interprets this as an OS file-open intent (not a download)
    window.location.href = `/api/cards/${card.id}/vcard?t=${Date.now()}`;
    return;
  }

  // Desktop: standard .vcf file download
  const vcard = buildVCard(card);
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(card.name || 'SR_Chains').replace(/\s+/g, '_')}_Contact.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const downloadVCard = saveContactToMobile;
