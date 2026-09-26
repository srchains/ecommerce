import React, { useEffect, useState } from 'react';
import { Download, FileText, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { downloadCatalogPDFForCollection } from '../utils/catalogPdfGenerator';

/**
 * Mobile "Download Catalog PDF" bottom sheet. Opened from anywhere in the buyer UI via
 * `window.dispatchEvent(new Event('open-pdf-download-drawer'))`. Lists only the
 * catalogues the admin made visible in Catalogue Manager.
 */
export const BuyerCatalogueDrawer: React.FC = () => {
  const { designs, categories, buyerCatalogue, refreshBuyerCatalogue } = useApp();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      refreshBuyerCatalogue();
      setOpen(true);
    };
    window.addEventListener('open-pdf-download-drawer', handleOpen);
    return () => window.removeEventListener('open-pdf-download-drawer', handleOpen);
  }, []);

  if (!open) return null;

  const download = (collectionName: string) => {
    setOpen(false);
    downloadCatalogPDFForCollection(collectionName, designs, categories, buyerCatalogue);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs z-50 flex justify-center items-end sm:items-center lg:hidden">
      <div
        className="fixed inset-0"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto p-4 shadow-2xl space-y-4 z-10 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between border-b pb-3 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2 font-extrabold text-gray-900 text-sm">
            <Download className="h-4.5 w-4.5 text-amber-600" />
            <span>DOWNLOAD CATALOG PDF</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-full cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {buyerCatalogue.collections.length === 0 && (
          <div className="py-8 text-center text-sm font-semibold text-gray-500">
            No catalogues available right now.
          </div>
        )}

        {/* All Collections Button */}
        {buyerCatalogue.showAll && (
          <button
            onClick={() => download('All')}
            className="w-full flex items-center justify-between p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl hover:bg-amber-100 transition-all text-amber-950 font-extrabold text-xs cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Download className="h-4.5 w-4.5 text-amber-700" />
              <span>All Collections Catalog</span>
            </div>
            <span className="bg-amber-200 text-amber-900 text-[10px] font-mono font-extrabold px-2.5 py-1 rounded">
              PDF →
            </span>
          </button>
        )}

        {buyerCatalogue.collections.length > 0 && (
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pt-2 border-t">
            {buyerCatalogue.showAll ? 'Or Choose Collection:' : 'Choose Collection:'}
          </div>
        )}

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
          {buyerCatalogue.collections.map((collName) => (
            <button
              key={collName}
              onClick={() => download(collName)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 hover:border-amber-400 hover:bg-amber-50/50 rounded-xl transition-all text-gray-800 font-semibold text-xs cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-600" />
                <span>{collName} PDF</span>
              </div>
              <span className="text-amber-700 text-[11px] font-bold flex items-center gap-1">
                Download <Download className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
