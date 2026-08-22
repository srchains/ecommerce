import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, AlertCircle, ShoppingBag } from 'lucide-react';
import { DigitalCardPreview } from './DigitalCardPreview';
import type { DigitalCard } from '../types/card';
import { downloadVCard } from '../utils/vcard';

interface PublicDigitalCardViewProps {
  cardId: string;
  urlData?: string | null;
  onGoToStorefront: () => void;
}

export const PublicDigitalCardView: React.FC<PublicDigitalCardViewProps> = ({
  cardId,
  urlData,
  onGoToStorefront,
}) => {
  const [card, setCard] = useState<DigitalCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCard = async () => {
      // 1. Try decoding URL data parameter if passed
      if (urlData) {
        try {
          const parsed = JSON.parse(decodeURIComponent(urlData)) as DigitalCard;
          if (parsed && (parsed.id === cardId || parsed.name)) {
            setCard(parsed);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Could not parse card URL data', e);
        }
      }

      // 2. Fetch from backend API /api/cards/{cardId}
      try {
        setLoading(true);
        const res = await axios.get(`/api/cards/${encodeURIComponent(cardId)}`);
        if (res.data) {
          setCard(res.data);
        } else {
          setError('Digital card not found.');
        }
      } catch (err: any) {
        console.error('Failed to load card', err);
        setError(err.response?.data?.detail || 'Digital card not found or has been removed.');
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [cardId, urlData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="flex items-center gap-3 text-amber-400 font-extrabold text-sm">
          <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full" />
          <span>Opening SR Chains Digital Card...</span>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm shadow-2xl space-y-4">
          <div className="h-14 w-14 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Card Not Found</h2>
          <p className="text-xs text-slate-400">
            The scanned NFC or QR business card code <code className="text-amber-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">{cardId}</code> could not be found.
          </p>
          <button
            type="button"
            onClick={onGoToStorefront}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer"
          >
            Visit SR Chains Storefront
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white py-8 px-4 flex flex-col items-center justify-between space-y-6">
      {/* Top Header */}
      <div className="w-full max-w-sm flex items-center justify-between">
        <button
          type="button"
          onClick={onGoToStorefront}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Catalog Storefront</span>
        </button>

        <div className="flex items-center gap-2 select-none" onClick={onGoToStorefront}>
          <div className="h-8 w-8 rounded-lg overflow-hidden border border-amber-500/40">
            <img src="/logo.jpg" alt="SR Chains Logo" className="h-full w-full object-cover" />
          </div>
          <span className="text-xs font-extrabold tracking-widest text-amber-400 uppercase">SR CHAINS</span>
        </div>
      </div>

      {/* Main Digital Card Preview */}
      <div className="w-full max-w-sm animate-in zoom-in-95 duration-300">
        <DigitalCardPreview
          card={card}
          onSaveContact={() => downloadVCard(card)}
        />
      </div>

      {/* Bottom Footer Action */}
      <div className="w-full max-w-sm text-center pt-2">
        <button
          type="button"
          onClick={onGoToStorefront}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs uppercase tracking-wider rounded-2xl border border-amber-500/30 shadow-lg cursor-pointer transition-all"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Explore SR Chains 92.5 Silver Anklets Catalog →</span>
        </button>
        <p className="text-[10px] text-slate-500 mt-3 font-semibold">
          © {new Date().getFullYear()} SR Chains B2B Wholesale Platform
        </p>
      </div>
    </div>
  );
};
