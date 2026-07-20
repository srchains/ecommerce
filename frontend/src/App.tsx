import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { BuyerStorefront } from './components/BuyerStorefront';
import { AdminLogin } from './components/AdminLogin';
import { BuyerLogin } from './components/BuyerLogin';
import { BuyerProductDetail } from './components/BuyerProductDetail';
import { DesignDetail } from './components/DesignDetail';
import { InventoryManagement } from './components/InventoryManagement';
import { MediaLibrary } from './components/MediaLibrary';
import { CategoryManagement } from './components/CategoryManagement';
import { Reports } from './components/Reports';
import { Customers } from './components/Customers';
import { Variants } from './components/Variants';
import { Collections } from './components/Collections';
import { AboutUsModal } from './components/AboutUsModal';
import { WorkerOrders } from './components/WorkerOrders';
import { InvoiceModal } from './components/InvoiceModal';
import { 
  ShoppingBag, 
  Trash2, 
  ChevronRight, 
  ArrowLeft,
  X, 
  Store, 
  TrendingUp, 
  CheckCircle,
  ArrowRight,
  Clock,
  User,
  Plus,
  AlertCircle,
  Menu,
  LogOut,
  MessageCircle,
  Phone,
  Home,
  Grid,
  ChevronDown,
  Info,
  Heart,
  UserCircle,
  ChevronUp
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from './context/AppContext';
import { ProductForm } from './components/ProductForm';


const statusClass = (status: string) => {
  if (status === 'Completed') return 'badge-success';
  if (status === 'Ready To Ship' || status === 'QC') return 'badge-info';
  if (status === 'Confirmed' || status === 'Production') return 'badge-warning';
  if (status === 'Pending') return 'badge-neutral';
  return 'badge-neutral';
};

interface AppFooterProps {
  onHomeClick: () => void;
  onCatalogClick: () => void;
  onAboutClick: () => void;
}

const AppFooter: React.FC<AppFooterProps> = ({ onHomeClick, onCatalogClick, onAboutClick }) => {
  return (
    <footer className="enterprise-panel mt-4 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 p-8">
        <div className="lg:col-span-2">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
              <img src="/logo.jpg" alt="SR Chains Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-widest text-gray-900">SR CHAINS</h3>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">Premium Silver Jewelry Manufacturer</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed mt-4 max-w-xl">
            Enterprise wholesale platform for silver anklet manufacturing, dealer catalogs, inventory control, and B2B order processing.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Navigation</h4>
          <div className="space-y-2 text-sm">
            <p
              className="text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
              onClick={onHomeClick}
            >Home</p>
            <p
              className="text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
              onClick={onCatalogClick}
            >Catalogue</p>
            <p
              className="text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
              onClick={onAboutClick}
            >About Us</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Contact</h4>
          <div className="space-y-2 text-sm text-gray-500">
            <p className="leading-relaxed">64, Arumuga Pillayar Koil Street,<br />Gugai,<br />Salem - 636 005</p>
            <p>Ph no : <a href="tel:+917010674487" className="hover:text-gray-900 transition-colors">70106 74487</a></p>
            <p>Email : <a href="mailto:srchains19@gmail.com" className="hover:text-gray-900 transition-colors">srchains19@gmail.com</a></p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 px-8 py-4 flex items-center justify-center text-xs text-gray-500">
        <p>© 2026 SR Chains. All rights reserved.</p>
      </div>
    </footer>
  );
};

const MainLayout: React.FC = () => {
  const { 
    mode, 
    setMode, 
    adminTab, 
    setAdminTab,
    selectedDesignCode, 
    setSelectedDesignCode,
    livePrice,
    designs,
    categories,
    cart,
    removeFromCart,
    clearCart,
    updateCartQuantity,
    calculatePriceBreakdown,
    fetchDesigns,
    fetchCategories,
    isAuthenticated,
    logout,
    navigateTo,
    // Customer auth
    isCustomerAuthenticated,
    currentCustomer,
    customerLogin,
    customerLogout,
    // Wishlist
    wishlist,
    removeFromWishlist,
    isInWishlist,
  } = useApp();

  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [buyerLoginOpen, setBuyerLoginOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [editingDesignCode, setEditingDesignCode] = useState<string | null>(null);
  const [initialVariantId, setInitialVariantId] = useState<number | undefined>(() => {
    const v = new URLSearchParams(window.location.search).get('variant');
    return v ? Number(v) : undefined;
  });
  const [initialSizeId, setInitialSizeId] = useState<number | undefined>(() => {
    const s = new URLSearchParams(window.location.search).get('size');
    return s ? Number(s) : undefined;
  });

  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState<string | null>(null);
  const [catalogDropdownOpen, setCatalogDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [storefrontResetKey, setStorefrontResetKey] = useState(0);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const catalogDropdownRef = useRef<HTMLDivElement>(null);

  // Automatically reset selected group when changing admin tabs
  useEffect(() => {
    setSelectedGroup(null);
  }, [adminTab]);

  // Group designs by category (group name is category name)
  const designGroups = useMemo(() => {
    const groups: Record<number, {
      category_id: number;
      category_name: string;
      collection: string;
      designsCount: number;
      variantsCount: number;
      image: string;
    }> = {};

    designs.forEach(d => {
      const catId = d.category_id || 0;
      const catName = categories.find(c => c.id === catId)?.name || 'Uncategorized';
      if (!groups[catId]) {
        groups[catId] = {
          category_id: catId,
          category_name: catName,
          collection: d.collection || 'General',
          designsCount: 0,
          variantsCount: 0,
          image: ''
        };
      }
      
      const grp = groups[catId];
      grp.designsCount += 1;
      grp.variantsCount += d.variants ? d.variants.length : 0;
      
      if (!grp.image) {
        grp.image = d.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                    d.variants?.find((v: any) => v.media?.some((m: any) => m.file_type.startsWith('image')))
                      ?.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800';
      }
    });

    return Object.values(groups).sort((a, b) => a.category_name.localeCompare(b.category_name));
  }, [designs, categories]);
  const profileMenuRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        catalogDropdownOpen &&
        catalogDropdownRef.current &&
        !catalogDropdownRef.current.contains(e.target as Node)
      ) {
        setCatalogDropdownOpen(false);
      }
      if (
        profileMenuOpen &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [catalogDropdownOpen, profileMenuOpen]);

  // Synchronize design and parameters state with URL query parameters (popstate only — initial load handled by state initializers)
  useEffect(() => {
    const handleUrlSync = () => {
      if (mode === 'buyer') {
        const params = new URLSearchParams(window.location.search);
        const designCode = params.get('design');
        const variantId = params.get('variant');
        const sizeId = params.get('size');

        if (designCode) {
          setSelectedDesignCode(designCode);
          setInitialVariantId(variantId ? Number(variantId) : undefined);
          setInitialSizeId(sizeId ? Number(sizeId) : undefined);
        } else {
          setSelectedDesignCode(null);
          setInitialVariantId(undefined);
          setInitialSizeId(undefined);
        }
      }
    };

    window.addEventListener('popstate', handleUrlSync);
    return () => {
      window.removeEventListener('popstate', handleUrlSync);
    };
  }, [mode]);

  const prevDesignCodeRef = useRef<string | null>(null);

  // Clear URL parameters when returning to storefront (selectedDesignCode is null)
  useEffect(() => {
    if (mode === 'buyer') {
      if (selectedDesignCode === null && prevDesignCodeRef.current !== null) {
        const params = new URLSearchParams(window.location.search);
        if (params.has('design') || params.has('variant') || params.has('size')) {
          window.history.pushState(null, '', window.location.pathname);
        }
      }
      prevDesignCodeRef.current = selectedDesignCode;
    }
  }, [selectedDesignCode, mode]);


  const [orders, setOrders] = useState<any[]>([]);
  const [mfgQueue, setMfgQueue] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await axios.get(`${API_BASE_URL}/api/orders`);
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchQueue = async () => {
    try {
      setLoadingQueue(true);
      const res = await axios.get(`${API_BASE_URL}/api/orders/manufacturing-queue`);
      setMfgQueue(res.data);
    } catch (err) {
      console.error('Error fetching mfg queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    if (mode === 'admin') {
      if (adminTab === 'orders' || adminTab === 'reports') {
        fetchOrders();
      } else if (adminTab === 'make-to-order') {
        fetchQueue();
      }
    }
  }, [mode, adminTab]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) {
      setBuyerLoginOpen(true);
      return;
    }
    if (cart.length === 0) return;

    const customerName = currentCustomer.name;
    const mobileNumber = currentCustomer.mobile_number;

    try {
      setOrderSubmitting(true);
      
      const itemsPayload = cart.map(item => {
        const itemPrice = item.lockedPrice !== undefined
          ? item.lockedPrice
          : calculatePriceBreakdown(
              item.size.weight,
              item.design.purity,
              item.design.wastage_percent,
              item.design.making_charge_per_gram
            ).total;
        return {
          design_code: item.design.design_code,
          variant_code: item.variant.variant_code,
          size: item.size.size.toString(),
          weight: item.size.weight,
          quantity: item.quantity,
          order_type: item.orderType,
          price: itemPrice
        };
      });

      const res = await axios.post(`${API_BASE_URL}/api/orders`, {
        customer_name: customerName,
        mobile_number: mobileNumber,
        items: itemsPayload
      });

      // Construct the WhatsApp message estimate payload
      const orderNumber = res.data.order_number;
      let message = `*SR CHAINS - WHOLESALE ESTIMATE*\n`;
      message += `*Customer:* ${customerName}\n`;
      message += `*Mobile:* ${mobileNumber}\n`;
      message += `*Order No:* ${orderNumber}\n\n`;
      message += `*Items Details:*\n`;
      
      cart.forEach((item, idx) => {
        const itemPricePerPiece = item.lockedPrice !== undefined
          ? item.lockedPrice
          : calculatePriceBreakdown(
              item.size.weight,
              item.design.purity,
              item.design.wastage_percent,
              item.design.making_charge_per_gram
            ).total;
        const itemPrice = itemPricePerPiece * item.quantity;
        const typeStr = item.orderType === 'ready_stock' ? 'Ready Stock' : 'Make Order (MTO)';
        
        message += `${idx + 1}. *${item.design.name}* (${item.design.design_code})\n`;
        message += `   - Variant: ${item.variant.variant_name} (${item.variant.variant_code})\n`;
        message += `   - Size: ${item.size.size.toFixed(2)}"\n`;
        message += `   - Weight: ${item.size.weight.toFixed(2)}g\n`;
        message += `   - Type: ${typeStr}\n`;
        message += `   - Qty: ${item.quantity} | Subtotal: ₹${itemPrice.toLocaleString('en-IN')}\n\n`;
      });
      
      message += `*Total Weight:* ${cartTotals.weight.toFixed(2)}g\n`;
      message += `*Estimated Total Invoice:* ₹${cartTotals.price.toLocaleString('en-IN')}\n\n`;
      message += `Thank you for your order!`;

      // Open WhatsApp for Wholesaler
      const wholesalerPhone = '917010674487';
      const wholesalerUrl = `https://api.whatsapp.com/send?phone=${wholesalerPhone}&text=${encodeURIComponent(message)}`;
      window.open(wholesalerUrl, '_blank');

      setOrderSuccess(res.data.order_number);
      clearCart();
      fetchDesigns();
      setTimeout(() => {
        setOrderSuccess(null);
        setCartOpen(false);
      }, 5000);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to submit order. Check stock availability.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleUpdateMfgStatus = async (orderItemId: number, status: string) => {
    try {
      await axios.post(`${API_BASE_URL}/api/orders/update-manufacturing-status`, {
        order_item_id: orderItemId,
        status: status
      });
      fetchQueue();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/orders/update-status`, {
        order_id: orderId,
        status: status
      });
      fetchOrders();
      if (status === 'Confirmed') {
        alert(`Order status updated to Confirmed! Bill generated and automatically sent to ${res.data.customer_name} via WhatsApp and Email.`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to update order status');
    }
  };

  const handleDeleteDesign = async (designCode: string) => {
    if (!confirm('Are you sure you want to completely delete this product design? This action cannot be undone.')) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/api/products/designs/${designCode}`);
      await axios.delete(`${API_BASE_URL}/api/products/designs/${res.data.id}`);
      await fetchDesigns('');
      setSelectedDesignCode(null);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to delete product');
    }
  };

  useEffect(() => {
    if (mode === 'admin' && ['dashboard', 'all-designs', 'add-design', 'categories', 'inventory'].includes(adminTab)) {
      fetchDesigns('');
      fetchCategories();
    } else if (mode === 'buyer') {
      fetchDesigns('Active');
    }
  }, [mode, adminTab]);

  const cartTotals = cart.reduce((acc, item) => {
    const itemPrice = item.lockedPrice !== undefined 
      ? item.lockedPrice 
      : calculatePriceBreakdown(
          item.size.weight,
          item.design.purity,
          item.design.wastage_percent,
          item.design.making_charge_per_gram
        ).total;
    return {
      weight: acc.weight + (item.size.weight * item.quantity),
      price: acc.price + (itemPrice * item.quantity)
    };
  }, { weight: 0, price: 0 });

  if (mode === 'admin' && !isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <div className="app-shell flex overflow-hidden font-sans">
      {/* Mobile Sidebar backdrop */}
      {mode === 'admin' && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar container */}
      {mode === 'admin' && (
        <div 
          className={`fixed md:relative inset-y-0 left-0 z-50 transform md:transform-none transition-transform duration-300 md:flex ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="topbar px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between shrink-0 z-30">
          {/* Left Side: Brand Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Hamburger for Buyer Mobile */}
            {mode === 'buyer' && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 text-gray-700 hover:text-gray-900 md:hidden cursor-pointer shrink-0 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="h-5.5 w-5.5" /> : <Menu className="h-5.5 w-5.5" />}
              </button>
            )}

            {/* Hamburger for Admin Mobile */}
            {mode === 'admin' && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900 md:hidden cursor-pointer shrink-0"
              >
                <Menu className="h-5.5 w-5.5" />
              </button>
            )}

            {/* Admin Brand on Mobile */}
            {mode === 'admin' && (
              <div className="flex items-center space-x-2 md:hidden select-none mr-2">
                <div className="h-8 w-8 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                  <img src="/logo.jpg" alt="SR Chains Logo" className="h-full w-full object-cover" />
                </div>
                <span className="text-sm font-bold tracking-wider topbar-brand">SR CHAINS</span>
              </div>
            )}

            {/* Company Logo & Name */}
            {mode === 'buyer' && (
              <div 
                onClick={() => {
                  setSelectedDesignCode(null);
                  setSelectedCollectionFilter(null);
                  setStorefrontResetKey(prev => prev + 1);
                }}
                className="flex items-center space-x-3 select-none cursor-pointer shrink-0"
              >
                <div className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shadow-xs">
                  <img src="/logo.jpg" alt="SR Chains Logo" className="h-full w-full object-cover" />
                </div>
                <div>
                  <span className="text-lg font-bold tracking-widest topbar-brand text-gray-900">SR CHAINS</span>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">B2B Silver Jewelry</p>
                </div>
              </div>
            )}
          </div>

          {/* Center: Navigation Links (Home, Catalog, About Us) */}
          {mode === 'buyer' && (
            <nav className="hidden md:flex items-center justify-center space-x-4 lg:space-x-8 flex-1 px-6">
              {/* Home Button */}
              <button
                onClick={() => {
                  setSelectedDesignCode(null);
                  setSelectedCollectionFilter(null);
                  setAboutModalOpen(false);
                  setCatalogDropdownOpen(false);
                  setStorefrontResetKey(prev => prev + 1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedDesignCode === null && !selectedCollectionFilter && !aboutModalOpen
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </button>

              {/* Catalog Dropdown */}
              <div className="relative" ref={catalogDropdownRef}>
                <button
                  onClick={() => {
                    setSelectedDesignCode(null);
                    setCatalogDropdownOpen(!catalogDropdownOpen);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedCollectionFilter || catalogDropdownOpen
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                  <span>Catalog</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${catalogDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {catalogDropdownOpen && (
                  <div 
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 w-56 bg-white rounded-xl border border-gray-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-1.5 border-b border-gray-100 mb-1">
                      Collections Catalog
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedDesignCode(null);
                        setSelectedCollectionFilter(null);
                        setCatalogDropdownOpen(false);
                        setStorefrontResetKey(prev => prev + 1);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        !selectedCollectionFilter ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>All Collections</span>
                      <span className="text-[10px] font-mono text-gray-400">All</span>
                    </button>

                    {Array.from(
                      new Set(
                        designs
                          .filter(d => d.status === 'Active')
                          .map(d => {
                            if (d.collection && d.collection.trim()) return d.collection.trim();
                            if (d.name && d.name.trim()) {
                              const parts = d.name.split('-');
                              return parts[0].trim();
                            }
                            return null;
                          })
                          .filter(Boolean) as string[]
                      )
                    ).map((collName) => (
                      <button
                        key={collName}
                        onClick={() => {
                          setSelectedDesignCode(null);
                          setSelectedCollectionFilter(collName);
                          setCatalogDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                          selectedCollectionFilter?.toLowerCase() === collName.toLowerCase()
                            ? 'bg-gray-900 text-white font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span>{collName} Collection</span>
                        <span className="text-[10px] font-mono opacity-60">View →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* About Us Button */}
              <button
                onClick={() => setAboutModalOpen(true)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  aboutModalOpen 
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Info className="h-4 w-4" />
                <span>About Us</span>
              </button>
            </nav>
          )}
          
          {/* Right Controls: Live Silver Spot Rate, Wishlist, Login/Profile & Cart */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div className="hidden lg:flex items-center space-x-2 text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 shadow-2xs">
              <TrendingUp className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-600">Silver Price:</span>
              <span className="text-gray-900 font-bold font-mono">₹{livePrice?.silver_gram_rate.toFixed(2)}/g • ₹{livePrice ? livePrice.silver_kg_rate.toLocaleString('en-IN') : '2,26,539'}/kg</span>
              <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block"></span>
                LIVE
              </span>
            </div>

            {mode === 'buyer' && (
              <>
                {/* Wishlist Button */}
                <button
                  onClick={() => setWishlistOpen(true)}
                  className="relative p-2.5 bg-white border border-gray-200 hover:border-red-300 text-gray-700 hover:text-red-500 rounded-xl transition-all cursor-pointer shadow-xs"
                  title="Wishlist"
                >
                  <Heart className={`h-5 w-5 transition-colors ${wishlist.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                  {wishlist.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold h-4.5 w-4.5 rounded-full flex items-center justify-center border border-white shadow-sm">
                      {wishlist.length}
                    </span>
                  )}
                </button>

                {/* Login / Profile Button */}
                <div className="relative" ref={profileMenuRef}>
                  {isCustomerAuthenticated && currentCustomer ? (
                    <button
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all cursor-pointer shadow-xs"
                    >
                      <UserCircle className="h-4 w-4" />
                      <span className="hidden sm:block max-w-[80px] truncate">{currentCustomer.name.split(' ')[0]}</span>
                      {profileMenuOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  ) : (
                    <button
                      onClick={() => setBuyerLoginOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:border-gray-400 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <UserCircle className="h-4 w-4" />
                      <span className="hidden sm:block">Login</span>
                    </button>
                  )}

                  {/* Profile Dropdown */}
                  {profileMenuOpen && isCustomerAuthenticated && currentCustomer && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-2.5 border-b border-gray-100 mb-1">
                        <p className="text-xs font-bold text-gray-900 truncate">{currentCustomer.name}</p>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">{currentCustomer.email}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{currentCustomer.mobile_number}</p>
                      </div>
                      <button
                        onClick={() => {
                          customerLogout();
                          setProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Cart Button */}
                <button 
                  onClick={() => setCartOpen(true)}
                  className="relative p-2.5 bg-white border border-gray-200 hover:border-gray-400 text-gray-700 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white text-[9px] font-bold h-4.5 w-4.5 rounded-full flex items-center justify-center border border-white shadow-sm">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </header>

        {/* Mobile Navigation Menu Drawer for Buyer */}
        {mode === 'buyer' && mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200 shadow-xl px-4 py-4 space-y-3 z-30 animate-in slide-in-from-top duration-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
              Navigation Menu
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  setSelectedDesignCode(null);
                  setSelectedCollectionFilter(null);
                  setAboutModalOpen(false);
                  setMobileMenuOpen(false);
                  setStorefrontResetKey(prev => prev + 1);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedDesignCode === null && !selectedCollectionFilter && !aboutModalOpen
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </button>

              {/* Mobile Catalog Collections Section */}
              <div className="border border-gray-100 bg-gray-50/80 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800 px-1 py-1">
                  <Grid className="h-4 w-4 text-gray-600" />
                  <span>Collections Catalog</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedDesignCode(null);
                    setSelectedCollectionFilter(null);
                    setMobileMenuOpen(false);
                    setStorefrontResetKey(prev => prev + 1);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    !selectedCollectionFilter ? 'bg-gray-900 text-white' : 'text-gray-700 bg-white hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  <span>All Collections</span>
                  <span className="text-[10px] font-mono opacity-80">All →</span>
                </button>
                {Array.from(
                  new Set(
                    designs
                      .filter(d => d.status === 'Active')
                      .map(d => {
                        if (d.collection && d.collection.trim()) return d.collection.trim();
                        if (d.name && d.name.trim()) {
                          const parts = d.name.split('-');
                          return parts[0].trim();
                        }
                        return null;
                      })
                      .filter(Boolean) as string[]
                  )
                ).map((collName) => (
                  <button
                    key={collName}
                    onClick={() => {
                      setSelectedDesignCode(null);
                      setSelectedCollectionFilter(collName);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      selectedCollectionFilter?.toLowerCase() === collName.toLowerCase()
                        ? 'bg-gray-900 text-white font-semibold'
                        : 'text-gray-700 bg-white hover:bg-gray-100 border border-gray-100'
                    }`}
                  >
                    <span>{collName} Collection</span>
                    <span className="text-[10px] font-mono opacity-60">View →</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setAboutModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  aboutModalOpen 
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Info className="h-4 w-4" />
                <span>About Us</span>
              </button>
            </div>
          </div>
        )}

        <main className="app-main flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-8 pb-20 md:pb-8 scrollbar-thin">
          {mode === 'buyer' && (
            selectedDesignCode === null ? (
              <BuyerStorefront 
                key={storefrontResetKey}
                onSelectProduct={(code, variantId, sizeId) => {
                  setSelectedDesignCode(code);
                  setInitialVariantId(variantId);
                  setInitialSizeId(sizeId);

                  // Update URL with query parameters using pushState
                  const params = new URLSearchParams();
                  params.set('design', code);
                  if (variantId) params.set('variant', String(variantId));
                  if (sizeId) params.set('size', String(sizeId));
                  window.history.pushState({ design: code, variant: variantId, size: sizeId }, '', `?${params.toString()}`);
                }} 
                selectedCollectionFilter={selectedCollectionFilter}
                onClearCollectionFilter={() => setSelectedCollectionFilter(null)}
              />
            ) : (
              <BuyerProductDetail 
                key={selectedDesignCode}
                designCode={selectedDesignCode} 
                initialVariantId={initialVariantId}
                initialSizeId={initialSizeId}
                onRequireLogin={() => setBuyerLoginOpen(true)}
                onSelectProduct={(code, variantId, sizeId) => {
                  setSelectedDesignCode(code);
                  setInitialVariantId(variantId);
                  setInitialSizeId(sizeId);

                  const params = new URLSearchParams();
                  params.set('design', code);
                  if (variantId) params.set('variant', String(variantId));
                  if (sizeId) params.set('size', String(sizeId));
                  window.history.pushState({ design: code, variant: variantId, size: sizeId }, '', `?${params.toString()}`);

                  const scrollContainer = document.querySelector('.app-main');
                  if (scrollContainer) {
                    scrollContainer.scrollTop = 0;
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                onBack={() => {
                  setSelectedDesignCode(null);
                  setInitialVariantId(undefined);
                  setInitialSizeId(undefined);

                  // Clear URL parameters using pushState
                  window.history.pushState(null, '', window.location.pathname);
                }} 
              />
            )
          )}

          {mode === 'admin' && (
            <>
              {adminTab === 'dashboard' && <Dashboard />}

              {adminTab === 'reports' && <Reports orders={orders} loading={loadingOrders} />}

              {adminTab === 'all-designs' && (
                selectedDesignCode === null ? (
                  selectedGroup === null ? (
                    // 1. Group View
                    <div className="space-y-6">
                      <div className="section-header">
                        <div>
                          <h2 className="page-title">Product Catalog</h2>
                          <p className="muted-text text-sm mt-2">Select a design collection group to manage its variants and specifications.</p>
                        </div>
                        <button 
                          onClick={() => {
                            setEditingDesignCode(null);
                            setAdminTab('add-design');
                          }}
                          className="btn-primary"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Design</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {designGroups.map(group => (
                          <div 
                            key={group.category_id}
                            className="catalog-card flex flex-col justify-between group cursor-pointer hover:shadow-lg transition-all"
                            onClick={() => setSelectedGroup(group.category_name)}
                          >
                            <div className="aspect-video bg-gray-100 relative overflow-hidden border-b border-gray-200">
                              <img 
                                src={group.image} 
                                alt={group.category_name} 
                                className="w-full h-full object-cover" 
                              />
                              <span className="absolute top-2 right-2 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                                {group.collection}
                              </span>
                            </div>
                            <div className="p-5 space-y-4">
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 tracking-tight truncate">{group.category_name}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                  {group.designsCount} Design Codes • {group.variantsCount} Total Variants
                                </p>
                              </div>
                              <button
                                className="btn-primary w-full text-xs"
                              >
                                <span>View Variants</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // 2. Inside Group View
                    <div className="space-y-6">
                      <div className="section-header">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setSelectedGroup(null)}
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Back</span>
                          </button>
                          <div>
                            <h2 className="page-title">{selectedGroup} Collection</h2>
                            <p className="muted-text text-sm mt-0.5">Manage designs under the {selectedGroup} catalog group.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setEditingDesignCode(null);
                            setAdminTab('add-design');
                          }}
                          className="btn-primary"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Design</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {designs.filter(d => (categories.find(c => c.id === d.category_id)?.name || 'Uncategorized') === selectedGroup).map(d => (
                          <div 
                            key={d.id}
                            className="catalog-card flex flex-col justify-between group"
                          >
                            <div className="aspect-video bg-gray-100 relative overflow-hidden border-b border-gray-200">
                              <img 
                                src={
                                  d.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                                  d.variants?.find((v: any) => v.media?.some((m: any) => m.file_type.startsWith('image')))
                                    ?.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                                  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800'
                                } 
                                alt={d.name} 
                                className="w-full h-full object-cover" 
                              />
                              <span className="absolute top-2 right-2 bg-white border border-gray-200 px-2 py-1 rounded-md text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                                {d.collection || 'Active'}
                              </span>
                            </div>
                            <div className="p-5 space-y-4">
                              <div>
                                <span className="text-xs text-gray-500 font-mono font-semibold">{d.design_code}</span>
                                <h3 className="text-base font-bold text-gray-900 tracking-tight truncate mt-1">{d.name}</h3>
                                <p className="text-xs text-gray-500 mt-1">{d.variants.length} Variants • {d.metal}</p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button
                                  onClick={() => setSelectedDesignCode(d.name)}
                                  className="btn-secondary w-full text-xs sm:col-span-3"
                                >
                                  <span>Manage Specification</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingDesignCode(d.name);
                                    setAdminTab('add-design');
                                  }}
                                  className="btn-secondary w-full text-xs sm:col-span-2"
                                >
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteDesign(d.design_code)}
                                  className="btn-secondary w-full text-xs border-red-200 text-red-700 hover:bg-red-50"
                                >
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  <DesignDetail
                    designCode={selectedDesignCode}
                    onEdit={(code) => {
                      setEditingDesignCode(code);
                      setSelectedDesignCode(null);
                      setAdminTab('add-design');
                    }}
                  />
                )
              )}

              {adminTab === 'add-design' && (
                editingDesignCode ? (
                  <ProductForm 
                    editingCode={editingDesignCode} 
                    onSuccess={() => {
                      setEditingDesignCode(null);
                      fetchDesigns('');
                      setAdminTab('all-designs');
                    }}
                    onCancel={() => {
                      setEditingDesignCode(null);
                      setAdminTab('all-designs');
                    }}
                  />
                ) : (
                  <ProductForm 
                    editingCode={null}
                    onSuccess={() => {
                      fetchDesigns('');
                      setAdminTab('all-designs');
                    }}
                    onCancel={() => setAdminTab('all-designs')}
                  />
                )
              )}

              {adminTab === 'categories' && <CategoryManagement />}
              {adminTab === 'inventory' && <InventoryManagement />}
              {adminTab === 'media-library' && <MediaLibrary />}
              {adminTab === 'customers' && <Customers />}
              {adminTab === 'variants' && <Variants />}
              {adminTab === 'collections' && <Collections />}

              {adminTab === 'orders' && (
                <div className="space-y-6">
                  <div className="section-header">
                    <div>
                      <h2 className="page-title">Wholesale B2B Orders</h2>
                      <p className="muted-text text-sm mt-2">Review customer invoices, ready stock clearances, and make-order links.</p>
                    </div>
                    <span className="badge-neutral">{orders.length} Orders</span>
                  </div>

                  {loadingOrders ? (
                    <div className="empty-state">Loading orders...</div>
                  ) : orders.length > 0 ? (
                    <div className="enterprise-panel overflow-hidden">
                      <table className="enterprise-table">
                        <thead>
                          <tr>
                            <th>Order Code</th>
                            <th>Jeweler / Customer Name</th>
                            <th>Order Date</th>
                            <th className="text-center">Items Count</th>
                            <th className="text-center">Status</th>
                            <th className="text-center font-semibold">Bill</th>
                            <th className="text-right">Invoice Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((o) => {
                            const totalVal = o.items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);
                            return (
                              <tr key={o.id}>
                                <td className="font-semibold text-gray-900 font-mono">{o.order_number}</td>
                                <td className="font-semibold text-gray-900">{o.customer_name}</td>
                                <td className="text-gray-500">{new Date(o.order_date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="text-center text-gray-900 font-semibold font-mono">{o.items.length}</td>
                                <td className="text-center">
                                  <select
                                    value={o.status}
                                    onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                                    className={`select py-1 px-2 text-xs font-semibold rounded-lg ${
                                      o.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-700 font-bold' :
                                      o.status === 'Confirmed' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' :
                                      o.status === 'Pending' ? 'bg-amber-50 border-amber-200 text-amber-700 font-bold' :
                                      'bg-gray-50 border-gray-200 text-gray-700'
                                    }`}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                  </select>
                                </td>
                                <td className="text-center">
                                  <button
                                    onClick={() => setSelectedInvoiceOrder(o)}
                                    className="p-1 px-3 text-xs bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer shadow-xs"
                                  >
                                    View Bill
                                  </button>
                                </td>
                                <td className="text-right font-bold text-gray-900 font-mono">₹{totalVal.toLocaleString('en-IN')}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state">No orders logged in system yet.</div>
                  )}
                </div>
              )}

              {adminTab === 'make-to-order' && (
                <div className="space-y-6">
                  <div className="section-header">
                    <div>
                      <h2 className="page-title">Manufacturing Production Board</h2>
                      <p className="muted-text text-sm mt-2">Track made-to-order anklets throughout factory workflows.</p>
                    </div>
                    <span className="badge-warning">Production Queue</span>
                  </div>

                  <div className="enterprise-panel p-5">
                    <h3 className="card-title mb-4">Order Status Timeline</h3>
                    <div className="timeline">
                      {['Pending', 'Confirmed', 'Production', 'QC', 'Ready To Ship', 'Completed'].map((stage, idx) => (
                        <div key={stage} className={`timeline-step ${idx <= 2 ? 'timeline-step-active' : ''}`}>
                          {stage}
                        </div>
                      ))}
                    </div>
                  </div>

                  {loadingQueue ? (
                    <div className="empty-state">Loading manufacturing queue...</div>
                  ) : mfgQueue.length > 0 ? (
                    <div className="enterprise-panel overflow-hidden">
                      <table className="enterprise-table">
                        <thead>
                          <tr>
                            <th>Design / Variant</th>
                            <th>Size (Inch)</th>
                            <th className="text-center">Order Qty</th>
                            <th>Est. Delivery</th>
                            <th className="text-center">Workflow Stage</th>
                            <th className="text-right">Advance Workflow</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mfgQueue.map((item) => {
                            const mfg = item.manufacturing_detail;
                            const status = mfg?.status || 'Pending';
                            
                            return (
                              <tr key={item.id}>
                                <td>
                                  <span className="font-bold text-gray-900 block">{item.design_code}</span>
                                  <span className="text-xs text-gray-500">{item.variant_code}</span>
                                </td>
                                <td className="font-semibold text-gray-900 font-mono">{item.size}&quot;</td>
                                <td className="text-center text-gray-900 font-bold font-mono">{item.quantity} pcs</td>
                                <td className="text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                                    <span>{mfg?.lead_time_days || 10} Days Lead</span>
                                  </div>
                                </td>
                                <td className="text-center">
                                  <span className={statusClass(status)}>{status}</span>
                                </td>
                                <td className="text-right">
                                  {status !== 'Completed' && (
                                    <select 
                                      value={status}
                                      onChange={(e) => handleUpdateMfgStatus(item.id, e.target.value)}
                                      className="select w-40 py-1.5 text-sm"
                                    >
                                      <option value="Pending">Pending</option>
                                      <option value="Confirmed">Confirmed</option>
                                      <option value="Production">Production</option>
                                      <option value="QC">QC</option>
                                      <option value="Ready To Ship">Ready To Ship</option>
                                      <option value="Completed">Completed</option>
                                    </select>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state">No made-to-order manufacturing jobs enqueued.</div>
                  )}
                </div>
              )}

              {adminTab === 'worker-orders' && (
                <WorkerOrders />
              )}

              {['settings'].includes(adminTab) && (
                <div className="module-placeholder">
                  <div className="mx-auto h-12 w-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 mb-4">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">B2B Module Template</h4>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">This panel is linked dynamically. Data hooks will display updates once custom data streams are mapped.</p>
                </div>
              )}
            </>
          )}
          {mode === 'buyer' && (
            <AppFooter
              onHomeClick={() => {
                setSelectedDesignCode(null);
                setSelectedCollectionFilter(null);
                setAboutModalOpen(false);
                setCatalogDropdownOpen(false);
                setStorefrontResetKey(prev => prev + 1);
              }}
              onCatalogClick={() => {
                setSelectedDesignCode(null);
                setSelectedCollectionFilter(null);
                setAboutModalOpen(false);
                setCatalogDropdownOpen(false);
                setStorefrontResetKey(prev => prev + 1);
              }}
              onAboutClick={() => {
                setAboutModalOpen(true);
              }}
            />
          )}
        </main>
      </div>

      {cartOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="absolute inset-0" onClick={() => setCartOpen(false)}></div>
          
          <div className="drawer-light relative w-full max-w-xl h-full flex flex-col justify-between z-50">
            <div className="drawer-header p-6 flex justify-between items-center">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <span className="font-bold text-sm tracking-wider uppercase">Wholesale Cart</span>
              </div>
              <button onClick={() => setCartOpen(false)} className="text-gray-500 hover:text-gray-900 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
              {orderSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4.5 w-4.5" />
                    <span className="font-bold">Wholesale Order Logged!</span>
                  </div>
                  <p className="text-xs text-gray-600">Order ID: <span className="font-mono text-gray-900 font-semibold">{orderSuccess}</span> has been saved and ready stock weights cleared.</p>
                </div>
              )}

              {(() => {
                const groupedCart: {
                  design: any;
                  variant: any;
                  items: {
                    cartIdx: number;
                    size: any;
                    quantity: number;
                    orderType: 'ready_stock' | 'make_order';
                  }[];
                }[] = [];

                cart.forEach((item, idx) => {
                  const existingGroup = groupedCart.find(g => g.variant.id === item.variant.id);
                  if (existingGroup) {
                    existingGroup.items.push({
                      cartIdx: idx,
                      size: item.size,
                      quantity: item.quantity,
                      orderType: item.orderType
                    });
                  } else {
                    groupedCart.push({
                      design: item.design,
                      variant: item.variant,
                      items: [{
                        cartIdx: idx,
                        size: item.size,
                        quantity: item.quantity,
                        orderType: item.orderType
                      }]
                    });
                  }
                });

                return groupedCart.length > 0 ? (
                  groupedCart.map((group, groupIdx) => {
                    let groupSilverBase = 0;
                    let groupMaking = 0;
                    let groupGst = 0;
                    let groupTotal = 0;
                    let groupWeight = 0;

                    group.items.forEach(it => {
                      const cartItem = cart[it.cartIdx];
                      const hasLock = cartItem.lockedPrice !== undefined;
                      const baseP = hasLock ? cartItem.lockedBasePrice! : 0;
                      const makingC = hasLock ? cartItem.lockedMakingCharges! : 0;
                      const gstV = hasLock ? cartItem.lockedGst! : 0;
                      const totalP = hasLock ? cartItem.lockedPrice! : 0;

                      if (hasLock) {
                        groupSilverBase += baseP * it.quantity;
                        groupMaking += makingC * it.quantity;
                        groupGst += gstV * it.quantity;
                        groupTotal += totalP * it.quantity;
                      } else {
                        const br = calculatePriceBreakdown(
                          it.size.weight,
                          group.design.purity,
                          group.design.wastage_percent,
                          group.design.making_charge_per_gram
                        );
                        groupSilverBase += br.basePrice * it.quantity;
                        groupMaking += br.makingCharges * it.quantity;
                        groupGst += br.gst * it.quantity;
                        groupTotal += br.total * it.quantity;
                      }
                      groupWeight += it.size.weight * it.quantity;
                    });

                    const firstImage = group.variant.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                      group.design.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                      group.design.variants?.find((v: any) => v.media?.some((m: any) => m.file_type.startsWith('image')))
                        ?.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800';

                    return (
                      <div 
                        key={groupIdx} 
                        onClick={() => {
                          setSelectedDesignCode(group.design.name);
                          setInitialVariantId(group.variant.id);
                          if (group.items[0]) {
                            setInitialSizeId(group.items[0].size.id);
                          }
                          setCartOpen(false);
                        }}
                        className="cart-item space-y-3 p-4 rounded-xl border border-gray-200 hover:border-gray-300 bg-white transition-all cursor-pointer relative group"
                      >
                        {/* Product Header */}
                        <div className="flex items-start space-x-3 text-sm">
                          <div className="h-14 w-14 bg-gray-100 border border-gray-200 rounded-lg overflow-hidden shrink-0">
                            <img 
                              src={firstImage} 
                              alt="cart item" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-mono text-xs text-gray-500 block">{group.design.design_code}</span>
                            <h4 className="font-bold text-gray-900 truncate">{group.design.name}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Variant: <span className="font-semibold text-gray-700">{group.variant.variant_name}</span>
                            </p>
                          </div>
                        </div>

                        {/* Sizes List */}
                        <div className="space-y-2 border-t border-gray-100 pt-3">
                          {group.items.map((it) => {
                            const cartItem = cart[it.cartIdx];
                            const itemPrice = cartItem.lockedPrice !== undefined
                              ? cartItem.lockedPrice
                              : calculatePriceBreakdown(
                                  it.size.weight,
                                  group.design.purity,
                                  group.design.wastage_percent,
                                  group.design.making_charge_per_gram
                                ).total;
                            const itemSubtotal = itemPrice * it.quantity;

                            return (
                              <div 
                                key={it.cartIdx} 
                                className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-b-0 text-xs"
                                onClick={(e) => e.stopPropagation()} // Prevent nav to details when interacting with controls
                              >
                                {/* Size, Weight and Tag */}
                                <div className="flex items-center gap-2 min-w-[120px]">
                                  <span className="font-bold text-gray-900 font-mono">{it.size.size.toFixed(2)}&quot;</span>
                                  <span className="text-gray-400 font-mono">({it.size.weight.toFixed(2)}g)</span>
                                  <span className={`badge ${it.orderType === 'ready_stock' ? 'badge-success' : 'badge-warning'} scale-90 shrink-0`}>
                                    {it.orderType === 'ready_stock' ? 'Stock' : 'MTO'}
                                  </span>
                                </div>

                                {/* Qty pickers */}
                                <div className="qty-control h-[26px] scale-95">
                                  <button type="button" onClick={() => updateCartQuantity(it.cartIdx, Math.max(1, it.quantity - 1))}>-</button>
                                  <span>{it.quantity}</span>
                                  <button type="button" onClick={() => updateCartQuantity(it.cartIdx, it.quantity + 1)}>+</button>
                                </div>

                                {/* Price and Delete */}
                                <div className="flex items-center gap-2.5 ml-auto text-right">
                                  <span className="font-bold text-gray-900 font-mono">₹{itemSubtotal.toLocaleString('en-IN')}</span>
                                  <button 
                                    type="button"
                                    onClick={() => removeFromCart(it.cartIdx)}
                                    className="text-gray-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                                    title="Remove from cart"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Pricing Breakdown summary for this variant */}
                        <div className="bg-gray-50 rounded-lg p-2.5 mt-3 border border-gray-200 text-[11px] text-gray-500 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-between">
                            <span>Silver Base ({groupWeight.toFixed(2)}g total)</span>
                            <span className="font-mono text-gray-700">₹{groupSilverBase.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Making Charge</span>
                            <span className="font-mono text-gray-700">₹{groupMaking.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                          </div>
                          <div className="flex justify-between font-medium text-gray-600 border-t border-gray-200 pt-1 mt-1">
                            <span>GST (3%)</span>
                            <span className="font-mono">₹{groupGst.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                          </div>
                          <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1">
                            <span>Variant Total (Approx. Price)</span>
                            <span className="font-mono">₹{groupTotal.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  !orderSuccess && (
                    <div className="text-center py-12 text-gray-500 flex flex-col items-center space-y-2 select-none">
                      <ShoppingBag className="h-10 w-10 text-gray-300" />
                      <span className="text-sm font-bold text-gray-700">Wholesale cart is empty</span>
                      <p className="text-xs text-gray-500 max-w-[200px]">Add designs from the catalog page to compile invoice pricing.</p>
                    </div>
                  )
                );
              })()}
            </div>

            {cart.length > 0 && (
              <div className="drawer-footer p-6 space-y-4 shrink-0">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Weight (g)</span>
                    <span className="text-gray-900 font-mono font-semibold">{cartTotals.weight.toFixed(2)}g</span>
                  </div>
                  <div className="flex justify-between font-extrabold border-t border-gray-200 pt-2.5 text-base text-gray-900">
                    <span>Estimated Total Invoice (Approx. Price)</span>
                    <span className="font-mono">₹{cartTotals.price.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed pt-1.5">
                    * Total calculated pricing incorporates BIS hallmarking, wastage rates, 3% GST, and making charges corresponding to live spot rates.
                  </p>
                </div>

                {/* Customer info or login prompt */}
                {isCustomerAuthenticated && currentCustomer ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {currentCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{currentCustomer.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{currentCustomer.mobile_number} • {currentCustomer.email}</p>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  </div>
                ) : (
                  <button
                    onClick={() => setBuyerLoginOpen(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:border-gray-500 hover:text-gray-900 transition-all cursor-pointer"
                  >
                    <UserCircle className="h-4 w-4" />
                    <span>Login / Sign Up to Place Order</span>
                  </button>
                )}

                <form onSubmit={handleCheckout} className="pt-1">
                  <button
                    type="submit"
                    disabled={orderSubmitting || !isCustomerAuthenticated}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{orderSubmitting ? 'Filing Order...' : 'Submit Order'}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Wishlist Drawer ─────────────────────────────────────────── */}
      {wishlistOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="absolute inset-0" onClick={() => setWishlistOpen(false)}></div>

          <div className="drawer-light relative w-full max-w-md h-full flex flex-col z-50">
            <div className="drawer-header p-6 flex justify-between items-center">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-500">
                  <Heart className="h-5 w-5 fill-red-500" />
                </div>
                <div>
                  <span className="font-bold text-sm tracking-wider uppercase">Wishlist</span>
                  <p className="text-[10px] text-gray-500 font-medium">{wishlist.length} Saved {wishlist.length === 1 ? 'Item' : 'Items'}</p>
                </div>
              </div>
              <button onClick={() => setWishlistOpen(false)} className="text-gray-500 hover:text-gray-900 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
              {wishlist.length > 0 ? (
                wishlist.map((item) => {
                  const { design, variantId } = item;
                  const variant = design.variants?.find((v: any) => v.id === variantId) || design.variants?.[0];
                  const firstImage = variant?.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                    design.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800';
                  return (
                    <div key={`${design.id}-${variantId}`} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-gray-300 bg-white group transition-all">
                      <div
                        className="h-16 w-16 bg-gray-100 border border-gray-200 rounded-lg overflow-hidden shrink-0 cursor-pointer"
                        onClick={() => {
                          setSelectedDesignCode(design.name);
                          if (variantId) setInitialVariantId(variantId);
                          setWishlistOpen(false);
                        }}
                      >
                        <img src={firstImage} alt={variant?.variant_name || design.name} className="w-full h-full object-cover" />
                      </div>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          setSelectedDesignCode(design.name);
                          if (variantId) setInitialVariantId(variantId);
                          setWishlistOpen(false);
                        }}
                      >
                        <span className="font-mono text-[10px] text-gray-500 block">{variant?.variant_code || design.design_code}</span>
                        <h4 className="font-bold text-gray-900 text-sm truncate">{variant?.variant_name || design.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{design.metal}</p>
                      </div>
                      <button
                        onClick={() => removeFromWishlist(design.id, variantId)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Remove from wishlist"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 flex flex-col items-center space-y-3 select-none">
                  <Heart className="h-12 w-12 text-gray-200" />
                  <span className="text-sm font-bold text-gray-700">Your wishlist is empty</span>
                  <p className="text-xs text-gray-500 max-w-[200px]">Click the heart icon on any product to save it here. Your wishlist is saved forever!</p>
                  <button
                    onClick={() => setWishlistOpen(false)}
                    className="btn-secondary text-xs mt-2"
                  >
                    Browse Catalog
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Buyer Login Modal ──────────────────────────────────────────── */}
      {buyerLoginOpen && (
        <BuyerLogin
          onClose={() => setBuyerLoginOpen(false)}
          onLoginSuccess={(token, name, email, mobile) => {
            customerLogin(token, name, email, mobile);
            setBuyerLoginOpen(false);
          }}
        />
      )}

      {/* About Us Modal */}
      <AboutUsModal 
        isOpen={aboutModalOpen} 
        onClose={() => setAboutModalOpen(false)} 
      />

      {/* Invoice Modal */}
      {selectedInvoiceOrder && (
        <InvoiceModal 
          order={selectedInvoiceOrder} 
          onClose={() => setSelectedInvoiceOrder(null)} 
        />
      )}

      {/* Mobile Bottom Navigation Bar for Buyer Mode */}
      {mode === 'buyer' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-2 flex items-center justify-around shadow-lg">
          {/* Home */}
          <button
            onClick={() => {
              setSelectedDesignCode(null);
              setSelectedCollectionFilter(null);
              setAboutModalOpen(false);
              setStorefrontResetKey(prev => prev + 1);
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
              selectedDesignCode === null && !selectedCollectionFilter && !aboutModalOpen
                ? 'text-gray-900 font-extrabold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </button>

          {/* Catalog */}
          <button
            onClick={() => {
              setSelectedDesignCode(null);
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
              selectedCollectionFilter || mobileMenuOpen
                ? 'text-gray-900 font-extrabold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Grid className="h-5 w-5" />
            <span>Catalog</span>
          </button>

          {/* Wishlist */}
          <button
            onClick={() => setWishlistOpen(true)}
            className="relative flex flex-col items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <div className="relative">
              <Heart className={`h-5 w-5 ${wishlist.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-white">
                  {wishlist.length}
                </span>
              )}
            </div>
            <span>Wishlist</span>
          </button>

          {/* Cart */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex flex-col items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <div className="relative">
              <ShoppingBag className="h-5 w-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-gray-900 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-white">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </div>
            <span>Cart</span>
          </button>

          {/* About Us */}
          <button
            onClick={() => setAboutModalOpen(true)}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
              aboutModalOpen ? 'text-gray-900 font-extrabold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Info className="h-5 w-5" />
            <span>About Us</span>
          </button>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  )
}

export default App;

