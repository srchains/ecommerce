import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Eye, 
  Edit3, 
  Trash2, 
  Download, 
  QrCode, 
  Wifi, 
  ArrowLeft, 
  Save, 
  Check, 
  AlertCircle, 
  User, 
  Share2, 
  Printer, 
  Sparkles,
  Phone,
  MessageCircle,
  Mail,
  Globe,
  MapPin,
  Building2,
  FileText
} from 'lucide-react';
import type { DigitalCard } from '../types/card';
import { DigitalCardPreview } from './DigitalCardPreview';
import { downloadVCard } from '../utils/vcard';

interface DigitalCardHubProps {
  initialTab?: 'list' | 'create' | 'nfc';
  initialCardId?: string | null;
  onGoToStorefront: () => void;
}

export const DigitalCardHub: React.FC<DigitalCardHubProps> = ({
  initialTab = 'list',
  initialCardId = null,
  onGoToStorefront,
}) => {
  const [cards, setCards] = useState<DigitalCard[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'nfc' | 'preview' | 'qr'>(initialTab);
  const [selectedCard, setSelectedCard] = useState<DigitalCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<DigitalCard>>({
    name: '',
    company: 'SR Chains',
    designation: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: 'srchains.ddns.net',
    instagram: '',
    linkedin: '',
    address: '64, Arumuga Pillayar Koil St, Salem - 636 005',
    bio: '',
    profileImage: '',
  });

  const [nfcSupported, setNfcSupported] = useState<boolean>(false);
  const [nfcReading, setNfcReading] = useState<boolean>(false);
  const [lookupIdInput, setLookupIdInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch cards from backend
  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/cards');
      if (Array.isArray(res.data)) {
        setCards(res.data);
        if (initialCardId) {
          const found = res.data.find(c => c.id === initialCardId);
          if (found) {
            setSelectedCard(found);
            setActiveTab('preview');
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load cards from backend, using local fallback', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
    // Check if Web NFC is supported
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, [initialCardId]);

  // Handle image upload for card avatar
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      setSaving(true);
      const res = await axios.post('/api/cards/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.url) {
        setFormData(prev => ({ ...prev, profileImage: res.data.url }));
      }
    } catch (err: any) {
      console.error('Image upload failed', err);
      // Fallback: convert to base64 data URL
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setSaving(false);
    }
  };

  // Save or update card
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setError('Please enter worker/staff full name.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await axios.post('/api/cards', formData);
      if (res.data) {
        setStatusMsg(formData.id ? 'Card updated successfully!' : 'Digital Card created successfully!');
        await fetchCards();
        setSelectedCard(res.data);
        setActiveTab('preview');
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err: any) {
      console.error('Save card failed', err);
      setError(err.response?.data?.detail || 'Failed to save digital card.');
    } finally {
      setSaving(false);
    }
  };

  // Delete card
  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm('Are you sure you want to delete this digital card?')) return;
    try {
      await axios.delete(`/api/cards/${cardId}`);
      setStatusMsg('Card deleted.');
      await fetchCards();
      setActiveTab('list');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error('Delete card failed', err);
      alert('Failed to delete card.');
    }
  };

  // Web NFC Scanner
  const handleStartNFCScan = async () => {
    if (!('NDEFReader' in window)) {
      alert('Web NFC is not supported on this browser/device. Use Chrome on Android or lookup by 6-digit Card ID below.');
      return;
    }

    try {
      setNfcReading(true);
      // @ts-ignore
      const ndef = new NDEFReader();
      await ndef.scan();

      // @ts-ignore
      ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
        for (const record of message.records) {
          if (record.recordType === 'text' || record.recordType === 'url') {
            const textDecoder = new TextDecoder(record.encoding || 'utf-8');
            const text = textDecoder.decode(record.data);
            
            // Extract Card ID if URL or text
            const match = text.match(/(?:card=|\/card\/)([A-Z0-9]{6})/i);
            if (match && match[1]) {
              const cardId = match[1].toUpperCase();
              window.location.href = `/?card=${cardId}`;
              return;
            }
          }
        }
      });
    } catch (err: any) {
      console.error('NFC Scan error', err);
      alert(`NFC scan error: ${err.message || 'Permission denied'}`);
      setNfcReading(false);
    }
  };

  const handleLookupId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupIdInput.trim()) return;
    const cleanId = lookupIdInput.trim().toUpperCase();
    const found = cards.find(c => c.id.toUpperCase() === cleanId);
    if (found) {
      setSelectedCard(found);
      setActiveTab('preview');
    } else {
      window.location.href = `/?card=${encodeURIComponent(cleanId)}`;
    }
  };

  const filteredCards = cards.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.designation || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.id || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onGoToStorefront}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
                title="Return to Catalog Storefront"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-amber-500" />
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  SR Chains Digital Card Hub
                </h1>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1 pl-12">
              Freely create, share, and scan Digital NFC & QR Business Cards for staff, management, and artisans.
            </p>
          </div>

          {/* Action Tabs Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'list' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Cards ({cards.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormData({
                  name: '',
                  company: 'SR Chains',
                  designation: '',
                  phone: '',
                  whatsapp: '',
                  email: '',
                  website: 'srchains.ddns.net',
                  instagram: '',
                  linkedin: '',
                  address: '64, Arumuga Pillayar Koil St, Salem - 636 005',
                  bio: '',
                  profileImage: '',
                });
                setActiveTab('create');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'create' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>+ Create Card</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('nfc')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'nfc' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wifi className="h-4 w-4" />
              <span>NFC Scanner</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
            <Check className="h-4 w-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-red-950/80 border border-red-500/50 text-red-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── TAB 1: ALL CARDS DIRECTORY ── */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {/* Search Input Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search cards by name, title, phone, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <span className="text-xs text-slate-400 font-semibold">
                Showing {filteredCards.length} of {cards.length} Digital Cards
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-amber-400 font-extrabold text-xs">
                Loading Digital Cards...
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/60 rounded-3xl border border-dashed border-slate-800 p-8 space-y-3">
                <CreditCard className="h-12 w-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-extrabold text-white">No Digital Cards Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Create your first Digital NFC Card for SR Chains staff or artisans.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Digital Card</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-5 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-4 group shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-amber-500/80 bg-slate-800 shrink-0 flex items-center justify-center">
                          {card.profileImage ? (
                            <img src={card.profileImage} alt={card.name} className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-6 w-6 text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                            ID: {card.id}
                          </span>
                          <h3 className="text-sm font-extrabold text-white truncate mt-1">
                            {card.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 truncate">
                            {card.designation || card.company || 'SR Chains'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-slate-500 block">
                          {card.views || 0} Views
                        </span>
                      </div>
                    </div>

                    {card.bio && (
                      <p className="text-xs text-slate-400 line-clamp-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        {card.bio}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCard(card);
                            setActiveTab('preview');
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5 text-amber-400" />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFormData(card);
                            setActiveTab('create');
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                          title="Edit Card"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadVCard(card)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                          title="Download .vcf Contact"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCard(card);
                            setActiveTab('qr');
                          }}
                          className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                          title="Print QR Badge"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                        title="Delete Card"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: CREATE / EDIT CARD FORM + LIVE PREVIEW ── */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Input Form */}
            <form onSubmit={handleSaveCard} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-amber-500" />
                  <span>{formData.id ? `Edit Card (${formData.id})` : 'Create Digital Card'}</span>
                </h3>
                {formData.id && (
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                    ID: {formData.id}
                  </span>
                )}
              </div>

              {/* Profile Image Upload */}
              <div>
                <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-amber-500/80 bg-slate-800 flex items-center justify-center shrink-0">
                    {formData.profileImage ? (
                      <img src={formData.profileImage} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-amber-400" />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 cursor-pointer transition-colors"
                  >
                    Upload Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sr chains"
                    value={formData.name || ''}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Saravana Jewellery worker / SR Chains"
                    value={formData.company || ''}
                    onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Job Designation / Role</label>
                  <input
                    type="text"
                    placeholder="e.g. owner / Wholesale Master Artisan"
                    value={formData.designation || ''}
                    onChange={e => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 70106 74487"
                    value={formData.phone || ''}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 70106 74487"
                    value={formData.whatsapp || ''}
                    onChange={e => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. srchains19@gmail.com"
                    value={formData.email || ''}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Website URL</label>
                <input
                  type="text"
                  placeholder="e.g. srchains.ddns.net"
                  value={formData.website || ''}
                  onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Location / Address</label>
                <input
                  type="text"
                  placeholder="e.g. 64, Arumuga Pillayar Koil St, Gugai, Salem - 636 005"
                  value={formData.address || ''}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Worker Bio / Craft Story</label>
                <textarea
                  rows={3}
                  placeholder="e.g. A jewellery worker bio tells the story of your craft, skills, and passion for making pieces by hand..."
                  value={formData.bio || ''}
                  onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : formData.id ? 'Update Card' : 'Create & Save Card'}</span>
                </button>
              </div>
            </form>

            {/* Live Card Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-extrabold text-amber-400 uppercase tracking-widest px-2">
                <span>Live Interactive Mobile Preview</span>
                <Sparkles className="h-4 w-4" />
              </div>
              <DigitalCardPreview card={formData} />
            </div>
          </div>
        )}

        {/* ── TAB 3: NFC SCANNER & ID LOOKUP ── */}
        {activeTab === 'nfc' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
              <div className="h-14 w-14 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                <Wifi className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-extrabold text-white">Scan Physical NFC Card</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tap your physical NFC business card against your Android Chrome device or lookup a card by its 6-digit ID below.
              </p>

              <button
                type="button"
                onClick={handleStartNFCScan}
                className={`w-full py-3.5 px-6 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  nfcReading
                    ? 'bg-amber-600 text-slate-950 animate-pulse'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-lg'
                }`}
              >
                {nfcReading ? '📡 NFC Scanner Active — Tap Tag Now...' : 'Start Web NFC Scan'}
              </button>

              {!nfcSupported && (
                <p className="text-[11px] text-amber-400/90 font-semibold bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/30">
                  ⚠️ Web NFC is supported on Android Chrome. For iPhone / Desktop, use the QR Code or Card ID lookup below.
                </p>
              )}
            </div>

            {/* Look up by Card ID */}
            <form onSubmit={handleLookupId} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Search className="h-4 w-4 text-amber-400" />
                <span>Look up by Card ID</span>
              </h4>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. ABC123"
                  value={lookupIdInput}
                  onChange={e => setLookupIdInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl border border-slate-700 cursor-pointer"
                >
                  Open Card
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB 4: CARD PREVIEW SINGLE ── */}
        {activeTab === 'preview' && selectedCard && (
          <div className="max-w-md mx-auto space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>All Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/30 cursor-pointer"
              >
                <QrCode className="h-4 w-4" />
                <span>QR Badge</span>
              </button>
            </div>

            <DigitalCardPreview
              card={selectedCard}
              onSaveContact={() => downloadVCard(selectedCard)}
            />
          </div>
        )}

        {/* ── TAB 5: PRINTABLE QR CODE BADGE ── */}
        {activeTab === 'qr' && selectedCard && (
          <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="flex items-center gap-1 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Card</span>
              </button>

              <span className="text-xs font-mono font-bold text-amber-400">
                Card ID: {selectedCard.id}
              </span>
            </div>

            <div className="bg-white p-6 rounded-2xl border-4 border-amber-500/80 shadow-xl inline-block mx-auto text-slate-950">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${window.location.origin}/?card=${selectedCard.id}`)}`}
                alt={`QR Code for ${selectedCard.name}`}
                className="h-48 w-48 mx-auto object-contain"
              />
              <div className="mt-3 text-center">
                <p className="text-sm font-extrabold text-slate-950 uppercase tracking-wider">{selectedCard.name}</p>
                <p className="text-[11px] font-bold text-amber-800">{selectedCard.designation || 'SR Chains Staff'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                <span>Print QR Badge</span>
              </button>

              <a
                href={`${window.location.origin}/?card=${selectedCard.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Share2 className="h-4 w-4" />
                <span>Open URL</span>
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
