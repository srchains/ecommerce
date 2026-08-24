import React from 'react';
import { 
  Phone, 
  MessageCircle, 
  Mail, 
  Globe, 
  MapPin, 
  Share2, 
  UserPlus, 
  User, 
  Sparkles,
  AtSign,
  Link2,
  Building2,
  Check
} from 'lucide-react';
import type { DigitalCard } from '../types/card';
import { getContactHref } from '../utils/vcard';

interface DigitalCardPreviewProps {
  card: Partial<DigitalCard>;
  onShare?: () => void;
}

export const DigitalCardPreview: React.FC<DigitalCardPreviewProps> = ({ 
  card, 
  onShare
}) => {
  const [copied, setCopied] = React.useState(false);
  const contactHref = getContactHref(card);


  const handleShareClick = () => {
    if (onShare) {
      onShare();
      return;
    }

    const shareUrl = `${window.location.origin}/?card=${encodeURIComponent(card.id || '')}`;
    if (navigator.share) {
      navigator.share({
        title: `${card.name || 'SR Chains'} - Digital Card`,
        text: `SR Chains Digital Business Card for ${card.name}`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };



  const formattedPhone = card.phone ? card.phone.replace(/\D/g, '') : '';
  const formattedWhatsApp = card.whatsapp ? card.whatsapp.replace(/\D/g, '') : formattedPhone;

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-amber-500/30 bg-slate-900 text-white shadow-2xl relative select-none">
      {/* Background Decorative Accent */}
      <div className="h-28 bg-gradient-to-r from-slate-950 via-amber-950 to-slate-950 relative border-b border-amber-500/20">
        <div className="absolute top-3 left-4 flex items-center gap-1.5 text-amber-400 text-[10px] font-extrabold uppercase tracking-widest bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20 backdrop-blur-xs">
          <Sparkles className="h-3 w-3" />
          <span>SR CHAINS DIGITAL CARD</span>
        </div>
      </div>

      {/* Avatar & Profile Info */}
      <div className="-mt-14 flex flex-col items-center px-6 pb-6 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-amber-500/80 bg-slate-800 shadow-xl">
          {card.profileImage ? (
            <img src={card.profileImage} alt={card.name || 'Profile'} className="h-full w-full object-cover" />
          ) : (
            <User className="h-10 w-10 text-amber-400" />
          )}
        </div>

        <h2 className="mt-3 text-xl font-extrabold text-white tracking-tight">
          {card.name || 'Staff Member'}
        </h2>

        {(card.designation || card.company) && (
          <p className="mt-0.5 text-xs font-semibold text-amber-400/90 flex items-center justify-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            <span>{[card.designation, card.company || 'SR Chains'].filter(Boolean).join(' at ')}</span>
          </p>
        )}

        {card.bio && (
          <p className="mt-3 text-xs text-slate-300 leading-relaxed bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 w-full text-left">
            {card.bio}
          </p>
        )}

        {/* Quick Contact Action Buttons */}
        <div className="mt-5 grid w-full grid-cols-2 gap-2">
          {card.phone && (
            <a href={`tel:${card.phone}`} className="w-full">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                <span>Call</span>
              </button>
            </a>
          )}

          {(card.whatsapp || card.phone) && (
            <a
              href={`https://wa.me/${formattedWhatsApp}?text=${encodeURIComponent(`Hello ${card.name || ''}, I scanned your SR Chains Digital Card and would like to inquire about wholesale silver anklet designs.`)}`}
              target="_blank"
              rel="noreferrer"
              className="w-full"
            >
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-600/50 transition-colors cursor-pointer"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>WhatsApp</span>
              </button>
            </a>
          )}

          {card.email && (
            <a href={`mailto:${card.email}`} className="w-full">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5 text-amber-400" />
                <span>Email</span>
              </button>
            </a>
          )}

          {card.website && (
            <a href={card.website.startsWith('http') ? card.website : `https://${card.website}`} target="_blank" rel="noreferrer" className="w-full">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5 text-sky-400" />
                <span>Website</span>
              </button>
            </a>
          )}
        </div>

        {/* Social Links */}
        {(card.instagram || card.linkedin) && (
          <div className="mt-3 flex items-center justify-center gap-3">
            {card.instagram && (
              <a
                href={card.instagram.startsWith('http') ? card.instagram : `https://instagram.com/${card.instagram.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-pink-400 hover:bg-pink-950/50 border border-slate-700 transition-colors"
                title="Instagram"
              >
                <AtSign className="h-4 w-4" />
              </a>
            )}
            {card.linkedin && (
              <a
                href={card.linkedin.startsWith('http') ? card.linkedin : `https://linkedin.com/in/${card.linkedin}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sky-400 hover:bg-sky-950/50 border border-slate-700 transition-colors"
                title="LinkedIn"
              >
                <Link2 className="h-4 w-4" />
              </a>
            )}
          </div>
        )}

        {/* Address */}
        {card.address && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
            <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>{card.address}</span>
          </p>
        )}

        {/* Primary Action Buttons */}
        <div className="mt-6 flex w-full gap-2.5">
          <a
            href={contactHref}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer no-underline"
          >
            <UserPlus className="h-4 w-4" />
            <span>Save Contact</span>
          </a>

          <button
            type="button"
            onClick={handleShareClick}
            className="flex flex-none items-center justify-center gap-1.5 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
