import React from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SizeConfiguratorProps {
  design: any;
  selectedVariantId: number | null;
  onSelectVariant: (variantId: number) => void;
  sizeQuantities: Record<number, number>; // sizeId -> qty
  onUpdateQuantity: (sizeId: number, qty: number) => void;
  onRemoveSize: (sizeId: number) => void;
  onToggleSizePill?: (sizeId: number) => void; // Optional custom click handler for size pill
}

export const SizeConfigurator: React.FC<SizeConfiguratorProps> = ({
  design,
  selectedVariantId,
  onSelectVariant,
  sizeQuantities = {},
  onUpdateQuantity,
  onRemoveSize,
  onToggleSizePill
}) => {
  const { calculatePriceBreakdown } = useApp();

  if (!design) return null;

  const safeQuantities = sizeQuantities || {};
  const currentVar =
    design.variants?.find((v: any) => v.id === selectedVariantId) ||
    design.variants?.[0];
  const sizes: any[] = currentVar?.sizes || [];
  const minSz = sizes.length ? Number(sizes[0].size).toFixed(1) : '5.0';
  const maxSz = sizes.length ? Number(sizes[sizes.length - 1].size).toFixed(1) : '11.0';

  const selectedSizeIds = Object.keys(safeQuantities)
    .map(Number)
    .filter(id => (safeQuantities[id] || 0) > 0);

  const totalWeight = selectedSizeIds.reduce((sum, sizeId) => {
    const sz = sizes.find(s => s.id === sizeId);
    return sum + (sz ? sz.weight * (safeQuantities[sizeId] || 0) : 0);
  }, 0);

  const totalPrice = selectedSizeIds.reduce((sum, sizeId) => {
    const sz = sizes.find(s => s.id === sizeId);
    if (!sz) return sum;
    const p = calculatePriceBreakdown
      ? calculatePriceBreakdown(
          sz.weight,
          design.purity || 70,
          design.wastage_percent || 0,
          design.making_charge_per_gram || 0
        )
      : { total: 0, effectiveWeight: 0, basePrice: 0, makingCharges: 0, gst: 0 };
    return sum + (p ? p.total * (safeQuantities[sizeId] || 0) : 0);
  }, 0);

  return (
    <div className="space-y-5">
      {/* ── Select Finish / Variant ── */}
      {design?.variants?.length > 1 && (
        <div className="space-y-2">
          <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
            Select Finish / Variant
          </p>
          <div className="flex flex-wrap gap-2">
            {design.variants.map((v: any) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectVariant(v.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  selectedVariantId === v.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-slate-400'
                }`}
              >
                {v.variant_name || v.variant_code}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Select Anklet Size (Inches) Grid ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
            Select Anklet Size (Inches)
          </p>
          <span className="text-[11px] text-gray-400 font-semibold">
            Running Sizes: {minSz}" - {maxSz}"
          </span>
        </div>

        {/* Size Pills Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {sizes.map((sz: any) => {
            const qty = safeQuantities[sz.id] || 0;
            const isSelected = qty > 0;
            const readyPcs = Math.max(
              0,
              (sz.stock_available || 0) - (sz.stock_reserved || 0)
            );

            return (
              <button
                key={sz.id}
                type="button"
                onClick={() => {
                  if (onToggleSizePill) {
                    onToggleSizePill(sz.id);
                  } else {
                    onUpdateQuantity(sz.id, (safeQuantities[sz.id] || 0) + 1);
                  }
                }}
                className={`relative py-2.5 px-1 rounded-xl border-2 flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-105'
                    : readyPcs > 0
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 hover:border-emerald-400 hover:bg-emerald-100/60'
                    : 'bg-white border-gray-200 text-gray-800 hover:border-slate-400 hover:bg-gray-50'
                }`}
              >
                {isSelected && (
                  <span className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 bg-indigo-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {qty}
                  </span>
                )}
                <span
                  className={`text-xs font-extrabold font-mono ${
                    isSelected
                      ? 'text-white'
                      : readyPcs > 0
                      ? 'text-emerald-950'
                      : 'text-gray-900'
                  }`}
                >
                  {Number(sz.size).toFixed(2)}
                </span>
                <span
                  className={`text-[9px] font-bold ${
                    isSelected
                      ? 'text-slate-300'
                      : readyPcs > 0
                      ? 'text-emerald-700'
                      : 'text-gray-400'
                  }`}
                >
                  {readyPcs > 0 ? `${readyPcs} in stock` : 'MTO'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Your Selected Configurations Breakdown ── */}
      {selectedSizeIds.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
              Your Selected Configurations
            </p>
            <div className="flex gap-4 text-[11px] font-bold text-gray-700">
              <span>
                Total Weight:{' '}
                <span className="text-slate-900 font-mono">
                  {totalWeight.toFixed(2)}g
                </span>
              </span>
              <span>
                Total Price:{' '}
                <span className="text-slate-900 font-mono">
                  ₹{totalPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {selectedSizeIds.map(sizeId => {
              const sz = sizes.find(s => s.id === sizeId);
              if (!sz) return null;
              const qty = safeQuantities[sizeId] || 1;
              const readyPcs = Math.max(
                0,
                (sz.stock_available || 0) - (sz.stock_reserved || 0)
              );
              const orderLabel =
                readyPcs >= qty
                  ? 'Ready Stock'
                  : readyPcs > 0
                  ? `${readyPcs} Stock + ${qty - readyPcs} MTO`
                  : 'Make Order (MTO)';
              const p = calculatePriceBreakdown(
                sz.weight,
                design.purity,
                design.wastage_percent,
                design.making_charge_per_gram
              );
              const pureWt = sz.weight * ((design.purity || 70) / 100);

              return (
                <div
                  key={sizeId}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-900">
                      Size: {Number(sz.size).toFixed(2)}"
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Weight: {sz.weight}g &bull; Pure: {pureWt.toFixed(3)}g
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Subtotal:{' '}
                      <span className="font-bold text-slate-800">
                        ₹{(p.total * qty).toLocaleString('en-IN', {
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </p>
                    <span className="text-[10px] font-bold text-amber-700">
                      {orderLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(sizeId, Math.max(0, qty - 1))}
                      className="h-7 w-7 flex items-center justify-center bg-white border border-slate-300 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-mono font-extrabold text-slate-900 text-sm">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(sizeId, qty + 1)}
                      className="h-7 w-7 flex items-center justify-center bg-white border border-slate-300 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveSize(sizeId)}
                      className="h-6 w-6 ml-1 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
