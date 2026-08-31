import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Edit3, 
  Copy, 
  MoreVertical, 
  Heart,
  Play,
  Upload,
  Plus,
  Check,
  X,
  Trash2
} from 'lucide-react';
import { useApp, API_BASE_URL } from '../context/AppContext';
import axios from 'axios';

interface DesignDetailProps {
  designCode: string;
  onEdit?: (code: string) => void;
}

export const DesignDetail: React.FC<DesignDetailProps> = ({ designCode, onEdit }) => {
  const { designs, setSelectedDesignCode, livePrice, categories, fetchDesigns } = useApp();
  
  const design = designs.find(d => d.name === designCode || d.design_code === designCode);
  
  if (!design) {
    return (
      <div className="p-8 text-center text-gray-500">
        Design not found. <button onClick={() => setSelectedDesignCode(null)} className="text-gray-900 font-medium hover:underline">Back</button>
      </div>
    );
  }

  const [selectedVariantId, setSelectedVariantId] = useState<number>(design.variants[0]?.id || 0);
  const activeVariant = design.variants.find(v => v.id === selectedVariantId) || design.variants[0];
  
  // Load active variant media
  let mediaList = (activeVariant?.media && activeVariant.media.length > 0) ? activeVariant.media : [];
  
  // If active variant has no media, fall back to design (mother) media
  if (mediaList.length === 0) {
    mediaList = (design.media && design.media.length > 0) ? design.media : [];
  }
  
  // If design media is also empty, find any variant that has media
  if (mediaList.length === 0) {
    const firstVarWithMedia = design.variants.find(v => v.media && v.media.length > 0);
    if (firstVarWithMedia) {
      mediaList = firstVarWithMedia.media || [];
    }
  }

  const [activeBottomTab, setActiveBottomTab] = useState('Product Description');
  const [mediaTypeTab, setMediaTypeTab] = useState<'images' | 'videos'>('images');

  const handleBack = () => {
    setSelectedDesignCode(null);
  };

  const handleDeleteVariant = async (variantId: number) => {
    if (design.variants.length <= 1) {
      alert("A product must have at least one variant. To delete the entire product, please use the Delete button in the Catalog page.");
      return;
    }

    if (!confirm("Are you sure you want to completely delete this product variant? This action cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/products/variants/${variantId}`);
      
      // If we are deleting the currently selected variant, select the other one
      if (selectedVariantId === variantId) {
        const remaining = design.variants.filter(v => v.id !== variantId);
        if (remaining.length > 0) {
          setSelectedVariantId(remaining[0].id);
        }
      }
      
      await fetchDesigns('');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to delete variant");
    }
  };

  const sizeDetails = activeVariant?.sizes || [];

  const category = design.category_id ? categories.find(c => c.id === design.category_id) : null;
  const parentCategory = category?.parent_id ? categories.find(c => c.id === category.parent_id) : null;

  return (
    <div className="space-y-6 pb-12">
      <div className="section-header">
        <div className="space-y-2">
          <button 
            onClick={handleBack}
            className="flex items-center space-x-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Designs</span>
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="page-title">{design.design_code} - {design.name}</h2>
            <span className="badge-success">Ready Stock</span>
            <span className="badge-warning">Made to Order</span>
          </div>
          <p className="text-sm text-gray-500 font-medium">
            Category: {category ? (<span className="text-gray-700">{parentCategory ? `${parentCategory.name} > ` : ''}{category.name}</span>) : (<span className="text-gray-700">Uncategorized</span>)} &gt; Collection: <span className="text-gray-700">{design.collection || 'New Arrival'}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button className="btn-primary" onClick={() => onEdit?.(designCode)}>
            <Edit3 className="h-4 w-4" />
            <span>Edit Design</span>
          </button>
          <button className="btn-secondary">
            <Copy className="h-4 w-4" />
            <span>Duplicate</span>
          </button>
          <button className="btn-secondary">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 enterprise-panel p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="image-frame aspect-square md:aspect-video relative">
                <img 
                  src={mediaList[0]?.url || 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800'} 
                  alt={design.name}
                  className="w-full h-full object-cover"
                />
                <button className="absolute top-3 right-3 p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900">
                  <Heart className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-5 gap-2">
                {mediaList.slice(0, 4).map((med) => (
                  <button key={med.id} className="thumb aspect-square relative">
                    {med.file_type.startsWith('video') ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20">
                        <Play className="h-4 w-4 text-white" />
                      </div>
                    ) : null}
                    <img src={med.url} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
                {mediaList.length > 4 && (
                  <button className="aspect-square bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center text-sm font-bold text-gray-700">
                    +{mediaList.length - 4}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="card-title mb-3">Core Specifications</h3>
                <table className="spec-table">
                  <tbody>
                    <tr><td>Design Code</td><td className="font-mono">{design.design_code}</td></tr>
                    <tr><td>Metal</td><td>{design.metal}</td></tr>
                    <tr><td>Weight Range</td><td>{design.weight_range}</td></tr>
                    <tr><td>Finishing</td><td>{design.finishing}</td></tr>
                    <tr><td>Status</td><td><span className="badge-success">{design.status}</span></td></tr>
                    <tr><td>Created On</td><td>{new Date(design.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td></tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="card-title mb-3">Trade Specifications</h3>
                <table className="spec-table">
                  <tbody>
                    <tr><td>Occasion</td><td>{design.occasion}</td></tr>
                    <tr><td>Style</td><td>{design.style}</td></tr>
                    <tr><td>Gender</td><td>{design.gender}</td></tr>
                    <tr><td>Lock Type</td><td>{design.lock_type}</td></tr>
                    <tr><td>Returnable</td><td>{design.returnable ? 'Yes' : 'No'}</td></tr>
                    <tr><td>Exchangeable</td><td>{design.exchangeable ? 'Yes' : 'No'}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="enterprise-panel p-6 space-y-6">
          <div>
            <h3 className="card-title">Design Overview</h3>
            <p className="text-sm text-gray-500 mt-1">Manufacturing and catalog readiness summary.</p>
          </div>
          
          <div className="divide-y divide-gray-200 text-sm">
            <div className="py-3 flex justify-between"><span className="text-gray-500">Total Variants</span><span className="font-bold">{design.variants.length}</span></div>
            <div className="py-3 flex justify-between"><span className="text-gray-500">Total Sizes</span><span className="font-bold">(5.0&quot; - 11.0&quot;)</span></div>
            <div className="py-3 flex justify-between"><span className="text-gray-500">Ready Stock SKUs</span><span className="font-bold">156</span></div>
            <div className="py-3 flex justify-between"><span className="text-gray-500">Out of Stock SKUs</span><span className="font-bold">18</span></div>
            <div className="py-3 flex justify-between"><span className="text-gray-500">MTO Available</span><span className="font-bold text-green-700">Yes</span></div>
            <div className="py-3 flex justify-between"><span className="text-gray-500">Total Images</span><span className="font-bold">{design.media.filter(m => m.file_type.startsWith('image')).length}</span></div>
            <div className="py-3 flex justify-between"><span className="text-gray-500">Total Videos</span><span className="font-bold">{design.media.filter(m => m.file_type.startsWith('video')).length}</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="enterprise-panel p-6 space-y-4 flex flex-col">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <h3 className="card-title">Variants ({design.variants.length})</h3>
            <button className="text-xs text-gray-900 font-semibold hover:underline">View All Variants</button>
          </div>
          
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px] pr-2">
            {design.variants.map((v) => (
              <div 
                key={v.id}
                onClick={() => setSelectedVariantId(v.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  selectedVariantId === v.id 
                    ? 'bg-gray-50 border-gray-900 text-gray-900 font-semibold' 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3 text-sm min-w-0">
                  <div className="h-11 w-11 bg-gray-100 border border-gray-200 rounded-md overflow-hidden shrink-0">
                    <img 
                      src={
                        v.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                        design.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                        'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800'
                      } 
                      alt="variant thumb" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold block text-gray-900 truncate">{v.variant_name}</span>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">SKU Prefix: {v.variant_code}</p>
                    <p className="text-xs text-gray-500">{v.sizes.length} Sizes Available</p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteVariant(v.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg shrink-0 cursor-pointer transition-colors"
                  title="Delete Variant"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button className="btn-secondary mt-4">
            <Plus className="h-4 w-4" />
            <span>Add Variant</span>
          </button>
        </div>

        <div className="xl:col-span-2 enterprise-panel p-6 flex flex-col">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <div>
              <h3 className="card-title">Size & Stock Overview - {activeVariant?.variant_name}</h3>
              <p className="text-xs text-gray-500">Live prices are computed instantly with silver rate.</p>
            </div>
            <button className="text-xs text-gray-900 font-semibold hover:underline">View Full Matrix</button>
          </div>
          
          <div className="flex-1 overflow-x-auto mt-4">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Size (inch)</th>
                  <th>Size Type</th>
                  <th className="text-center">Ready Stock</th>
                  <th className="text-center">Stock Qty</th>
                  <th className="text-center">MTO Available</th>
                  <th className="text-center">MTO Time</th>
                </tr>
              </thead>
              <tbody>
                {sizeDetails.slice(0, 9).map((s) => {
                  const isBaby = s.size < 8.0;
                  return (
                    <tr key={s.id}>
                      <td className="font-semibold text-gray-900 font-mono">{s.size.toFixed(2)}</td>
                      <td>
                        <span className={isBaby ? 'badge-info' : 'badge-neutral'}>{isBaby ? 'Baby' : 'Adult'}</span>
                      </td>
                      <td className="text-center">
                        {s.stock_available - (s.stock_reserved || 0) > 0 ? (
                          <Check className="h-4.5 w-4.5 text-green-700 mx-auto" />
                        ) : (
                          <X className="h-4.5 w-4.5 text-red-700 mx-auto" />
                        )}
                      </td>
                      <td className={`text-center font-bold font-mono ${s.stock_available - (s.stock_reserved || 0) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                        {s.stock_available - (s.stock_reserved || 0)}
                      </td>
                      <td className="text-center"><Check className="h-4.5 w-4.5 text-green-700 mx-auto" /></td>
                      <td className="text-center text-gray-500 font-medium font-mono">
                        {isBaby ? '5 - 7 Days' : '7 - 10 Days'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 enterprise-panel p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <h3 className="card-title">Media Assets</h3>
            
            <div className="flex space-x-2 bg-gray-50 p-1 border border-gray-200 rounded-lg text-xs">
              <button 
                onClick={() => setMediaTypeTab('images')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  mediaTypeTab === 'images' ? 'bg-white border border-gray-300 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Images ({design.media.filter(m => m.file_type.startsWith('image')).length})
              </button>
              <button 
                onClick={() => setMediaTypeTab('videos')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  mediaTypeTab === 'videos' ? 'bg-white border border-gray-300 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Videos ({design.media.filter(m => m.file_type.startsWith('video')).length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {design.media
              .filter(m => mediaTypeTab === 'images' ? m.file_type.startsWith('image') : m.file_type.startsWith('video'))
              .slice(0, 6)
              .map((med) => (
                <div key={med.id} className="thumb aspect-square relative group">
                  {med.file_type.startsWith('video') && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20 z-10">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <img src={med.url} alt="asset" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gray-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                    <span className="text-[10px] text-white font-semibold font-mono">{med.file_size}</span>
                  </div>
                </div>
              ))}
          </div>

          <div className="upload-zone">
            <div className="text-center">
              <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
              <h5 className="text-sm font-bold text-gray-900">Upload More</h5>
              <p className="text-xs text-gray-500 mt-0.5">Drag & Drop or Click to Upload</p>
            </div>
          </div>
        </div>

        <div className="enterprise-panel p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Dynamic Pricing Summary</h4>
            <p className="text-xs text-gray-500">Calculated dynamically using the Live silver rate:</p>
            <div className="bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-sm p-4">
              <div className="flex justify-between"><span className="text-gray-500">Live Silver Price</span><span className="font-semibold font-mono">₹{livePrice?.silver_gram_rate?.toFixed(2) || '222.00'}/g</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Purity</span><span className="font-semibold">{design.purity}% (Silver 925)</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Making Charge</span><span className="font-semibold">₹{design.making_charge_per_gram}/g</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Wastage</span><span className="font-semibold">{design.wastage_percent}%</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-gray-900">
                <span>Total base billing price</span>
                <span>Calculated in catalog</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-4 leading-relaxed">
            All prices exclude 3% GST. Shipping weight calculations scale automatically according to custom specifications.
          </div>
        </div>
      </div>

      <div className="enterprise-panel p-6 space-y-4">
        <div className="flex space-x-6 border-b border-gray-200 pb-2 text-sm">
          {['Product Description', 'Variant Details', 'Size Guide', 'Tags', 'Documents', 'History'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveBottomTab(tab)}
              className={`nav-tab ${activeBottomTab === tab ? 'nav-tab-active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-600 leading-relaxed pt-2">
          {activeBottomTab === 'Product Description' && (
            <p>A beautifully crafted 925 silver anklet with floral design and tiny ghungroo bells. Perfect for daily wear and festive occasions. The weight fluctuates slightly according to the chosen length and bead finish to guarantee durability and flexibility.</p>
          )}
          {activeBottomTab === 'Variant Details' && (
            <p>Each variant contains high-quality semi-precious stones (White, Green, or Ruby stones) or polished black beads. The settings are handmade by specialized artisans to prevent falling off during running wear.</p>
          )}
          {activeBottomTab === 'Size Guide' && (
            <p>Sizes below 8 inches are categorized as baby sizing and carry lower wastage percentages. Running adult sizes (8.0&quot; to 11.5&quot;) are kept in ready stock in high quantities. Custom sizes (12.0&quot; and 12.5&quot;) can be manufactured on order.</p>
          )}
          {activeBottomTab === 'Tags' && (
            <div className="flex flex-wrap gap-2">
              {design.tags?.split(',').map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] text-gray-600 uppercase tracking-wider font-semibold">
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}
          {activeBottomTab === 'Documents' && (
            <p>Product spec sheet, Hallmark certificate (Bureau of Indian Standards 925), and design blueprint catalog PDF documents are available in the admin media center.</p>
          )}
          {activeBottomTab === 'History' && (
            <p>Design created on 12 May 2024 by Neha (Admin Catalog Team). Stock levels last adjusted 2 days ago.</p>
          )}
        </div>
      </div>
    </div>
  );
};