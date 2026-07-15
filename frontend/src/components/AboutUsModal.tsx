  import React from 'react';
import { X, Truck, Camera, Store, ShieldCheck, Phone, MapPin, Clock } from 'lucide-react';

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-3xl w-full p-8 sm:p-10 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200 my-auto text-gray-800 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all cursor-pointer"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Page Title (Matching reference image) */}
        <div className="border-b border-gray-200 pb-4 mb-8">
          <h1 className="text-3xl font-bold text-[#1e293b] tracking-tight">About us</h1>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-[#334155]">
          
          {/* 1. Short Information */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#1e293b] flex items-center gap-2">
              <Store className="h-4 w-4 text-gray-600 shrink-0" />
              Short Information
            </h2>
            <p className="text-gray-600">
              SR Chains is online since 2011 but we are in this business for the past 45 years and we have used our experience in creating new products. Based in South India, and sourcing raw materials from all over India, we try to design our products so as to make it look like real metal jewellery. We specialize mainly with products which look like real gold or diamond jewellery so that people need not worry about wearing it as imitation and at the same time, feel safe of wearing it since Gold & Silver price has reached a new level and even a loss of small bead of gold will cost you a few thousand rupees.
            </p>
            <p className="text-gray-600">
              Also worth to mention that our site is not a multi vendor site like other big online sites where anyone can sell their products. We have our physical store and factory and we personally attend so many customers daily and we can give you better service than what other online multi vendor sites can do.
            </p>
          </section>

          {/* 2. Shipping Cutoff Timing */}
          <section className="space-y-3 pt-2">
            <h2 className="text-base font-bold text-[#1e293b] flex items-center gap-2">
              <Truck className="h-4 w-4 text-gray-600 shrink-0" />
              Shipping Cutoff Timing
            </h2>
            <p className="text-gray-600">
              Products in stock are shipped on the same day of order confirmation if orders are placed before 5.00 PM IST. Our main shipping partner is Blue Dart Express and in areas where these its not covered by Blue Dart, we can send by Speed Post or Professional Courier.
            </p>
            <p className="text-gray-600">
              For international orders, DHL, Speed Post and Aramex are the available options.
            </p>
          </section>

          {/* 3. Picture Quality */}
          <section className="space-y-3 pt-2">
            <h2 className="text-base font-bold text-[#1e293b] flex items-center gap-2">
              <Camera className="h-4 w-4 text-gray-600 shrink-0" />
              Picture Quality
            </h2>
            <p className="text-gray-600">
              All our pictures displayed in site is unedited or those are not digitally enhanced. The pictures are uploaded as it was captured with our watermark. In some cases, take for example, anklets are displayed using invisible threads and the thread is only removed and the product remains untouched.
            </p>
          </section>

          {/* Business & Contact info footer */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Physical Store & Factory</p>
                <p>Salem, Tamil Nadu, South India</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Wholesale Contact</p>
                <p>+91 70106 74487 / Support Desk</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Same-Day Cutoff</p>
                <p>Orders before 5:00 PM IST</p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-100 pt-6 mt-6 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-mono">SR CHAINS • Authentic Silver Manufacturer</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
