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
  TrendingUp, 
  CheckCircle,
  ArrowRight,
  Clock,
  Plus,
  AlertCircle,
  Menu,
  LogOut,
  Home,
  Folder,
  ChevronDown,
  Info,
  Heart,
  UserCircle,
  ChevronUp,
  Download,
  FileText
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from './context/AppContext';
import { downloadCatalogPDFForCollection } from './utils/catalogPdfGenerator';
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
    // Customer auth
    isCustomerAuthenticated,
    currentCustomer,
    customerLogin,
    customerLogout,
    // Wishlist
    wishlist,
    removeFromWishlist,
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
  const [pdfDropdownOpen, setPdfDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [storefrontResetKey, setStorefrontResetKey] = useState(0);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const catalogDropdownRef = useRef<HTMLDivElement>(null);
  const pdfDropdownRef = useRef<HTMLDivElement>(null);

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
        pdfDropdownOpen &&
        pdfDropdownRef.current &&
        !pdfDropdownRef.current.contains(e.target as Node)
      ) {
        setPdfDropdownOpen(false);
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
  }, [catalogDropdownOpen, pdfDropdownOpen, profileMenuOpen]);

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
          variant_code: item.variant.variant_code || item.variant.variant_name || item.design.design_code,
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
        const typeStr = item.orderType === 'ready_stock' ? 'Ready Stock' : 'Make Order (MTO)';
        
        message += `${idx + 1}. *${item.design.name}* (${item.design.design_code})\n`;
        message += `   - Variant: ${item.variant.variant_name} (${item.variant.variant_code})\n`;
        message += `   - Size: ${item.size.size.toFixed(2)}"\n`;
        message += `   - Weight: ${item.size.weight.toFixed(2)}g\n`;
        message += `   - Type: ${typeStr}\n`;
        message += `   - Qty: ${item.quantity}\n\n`;
      });
      
      message += `----------------------------------------\n`;
      message += `*Total Weight:* ${cartTotals.weight.toFixed(2)}g (approx)\n`;
      message += `*In-Stock Payable Amount (${cartTotals.inStockPcs} pcs):* ₹${cartTotals.inStockPrice.toLocaleString('en-IN')} (approx)\n`;
      if (cartTotals.mtoPcs > 0) {
        message += `*Make to Order Amount (${cartTotals.mtoPcs} pcs):* ₹${cartTotals.mtoPrice.toLocaleString('en-IN')} (approx)\n`;
      }
      message += `*Total Order Amount:* ₹${cartTotals.price.toLocaleString('en-IN')} (approx)\n`;
      message += `----------------------------------------\n\n`;
      message += `Thank you for your order`;

      // Open WhatsApp for Wholesaler
      const wholesalerPhone = '917010674487';
      const wholesalerUrl = `https://api.whatsapp.com/send?phone=${wholesalerPhone}&text=${encodeURIComponent(message)}`;
      setOrderSuccess(res.data.order_number);
      clearCart();
      setTimeout(() => { fetchDesigns(); }, 100);
      window.open(wholesalerUrl, '_blank');
      setTimeout(() => {
        setOrderSuccess(null);
        setCartOpen(false);
      }, 4000);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to submit order. Check stock availability.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleDownloadCartInvoice = () => {
    if (cart.length === 0) {
      alert("Your wholesale cart is empty.");
      return;
    }

    let content = `====================================================\n`;
    content += `         SR CHAINS - WHOLESALE CART INVOICE         \n`;
    content += `====================================================\n`;
    content += `Customer Name : ${currentCustomer?.name || 'Wholesale Buyer'}\n`;
    content += `Mobile Number : ${currentCustomer?.mobile_number || 'N/A'}\n`;
    content += `Email Address : ${currentCustomer?.email || 'N/A'}\n`;
    content += `Generated Date: ${new Date().toLocaleString()}\n`;
    content += `----------------------------------------------------\n\n`;

    content += `ITEMIZED WHOLESALE PRODUCTS:\n`;
    content += `----------------------------------------------------\n`;

    cart.forEach((item, idx) => {
      const itemPricePerPiece = item.lockedPrice !== undefined
        ? item.lockedPrice
        : calculatePriceBreakdown(
            item.size.weight,
            item.design.purity,
            item.design.wastage_percent,
            item.design.making_charge_per_gram
          ).total;

      const br = calculatePriceBreakdown(
        item.size.weight,
        item.design.purity,
        item.design.wastage_percent,
        item.design.making_charge_per_gram
      );

      const itemSubtotal = itemPricePerPiece * item.quantity;
      const typeStr = item.orderType === 'ready_stock' ? 'Ready Stock (Warehouse)' : 'Make to Order (7-10 Days)';

      content += `${idx + 1}. DESIGN: ${item.design.name} (${item.design.design_code})\n`;
      content += `   Variant       : ${item.variant.variant_name} (${item.variant.variant_code})\n`;
      content += `   Size & Weight : ${item.size.size.toFixed(2)}" | ${item.size.weight.toFixed(2)}g per piece\n`;
      content += `   Fulfillment   : ${typeStr}\n`;
      content += `   Quantity      : ${item.quantity} pcs\n`;
      content += `   Silver Base   : ₹${(br.basePrice * item.quantity).toLocaleString('en-IN', {maximumFractionDigits: 2})}\n`;
      content += `   Making Charges: ₹${(br.makingCharges * item.quantity).toLocaleString('en-IN', {maximumFractionDigits: 2})}\n`;
      content += `   GST (3%)      : ₹${(br.gst * item.quantity).toLocaleString('en-IN', {maximumFractionDigits: 2})}\n`;
      content += `   Subtotal Price: ₹${itemSubtotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}\n\n`;
    });

    content += `====================================================\n`;
    content += `SUMMARY FINANCIAL & WEIGHT BREAKDOWN:\n`;
    content += `====================================================\n`;
    content += `Total Gross Weight           : ${cartTotals.weight.toFixed(2)} g\n`;
    content += `In-Stock Payable Amount (${cartTotals.inStockPcs} pcs) : ₹${cartTotals.inStockPrice.toLocaleString('en-IN')}\n`;
    if (cartTotals.mtoPcs > 0) {
      content += `Make to Order Amount (${cartTotals.mtoPcs} pcs)   : ₹${cartTotals.mtoPrice.toLocaleString('en-IN')}\n`;
    }
    content += `----------------------------------------------------\n`;
    content += `TOTAL ORDER INVOICE AMOUNT   : ₹${cartTotals.price.toLocaleString('en-IN')}\n`;
    content += `====================================================\n\n`;
    content += `* Note: Total pricing incorporates live spot silver rates, BIS hallmarking, wastage, 3% GST, and making charges.\n`;
    content += `Thank you for choosing SR Chains Wholesale B2B Silver Jewelry!\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SR_Chains_Wholesale_Cart_Invoice_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const handleDeleteDesign = async (designId: number, designName: string) => {
    if (!confirm(`Are you sure you want to completely delete "${designName}"? This action cannot be undone.`)) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/products/designs/${designId}`);
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
    
    const subtotal = itemPrice * item.quantity;
    const isReady = item.orderType === 'ready_stock';

    return {
      weight: acc.weight + (item.size.weight * item.quantity),
      price: acc.price + subtotal,
      inStockPrice: acc.inStockPrice + (isReady ? subtotal : 0),
      mtoPrice: acc.mtoPrice + (!isReady ? subtotal : 0),
      inStockPcs: acc.inStockPcs + (isReady ? item.quantity : 0),
      mtoPcs: acc.mtoPcs + (!isReady ? item.quantity : 0),
    };
  }, { weight: 0, price: 0, inStockPrice: 0, mtoPrice: 0, inStockPcs: 0, mtoPcs: 0 });

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

              {/* Download Catalog PDF Button & Dropdown */}
              <div className="relative" ref={pdfDropdownRef}>
                <button
                  onClick={() => {
                    setAboutModalOpen(false);
                    setCatalogDropdownOpen(false);
                    setPdfDropdownOpen(!pdfDropdownOpen);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    pdfDropdownOpen
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 shadow-2xs'
                  }`}
                  title="Download Catalog PDF for collections"
                >
                  <Download className="h-4 w-4 text-amber-700" />
                  <span>Download Catalog</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${pdfDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {pdfDropdownOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 w-64 bg-white rounded-2xl border border-amber-200 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] font-extrabold text-amber-900 uppercase tracking-widest px-3 py-2 border-b border-amber-100 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-amber-700" />
                        <span>Download Catalog PDF</span>
                      </span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">A4 TAGS</span>
                    </div>

                    {/* Download Full Catalog */}
                    <button
                      onClick={() => {
                        downloadCatalogPDFForCollection('All', designs, categories);
                        setPdfDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-extrabold bg-amber-50 hover:bg-amber-100 text-amber-950 flex items-center justify-between transition-all border border-amber-200/80 my-1 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-amber-700" />
                        <span>All Collections Catalog</span>
                      </span>
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-200/60 px-1.5 py-0.5 rounded font-bold">PDF →</span>
                    </button>

                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 py-1.5 mt-1 border-t border-gray-100">
                      Or Choose Collection
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                      {Array.from(
                        new Set(
                          designs
                            .filter(d => d.status === 'Active' || !d.status)
                            .map(d => {
                              const catName = categories.find(c => c.id === d.category_id)?.name;
                              if (catName) return catName;
                              if (d.collection && d.collection.trim()) return d.collection.trim();
                              if (d.name && d.name.trim()) return d.name.split('-')[0].trim();
                              return null;
                            })
                            .filter(Boolean) as string[]
                        )
                      )
                      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
                      .map((collName) => (
                        <button
                          key={collName}
                          onClick={() => {
                            downloadCatalogPDFForCollection(collName, designs, categories);
                            setPdfDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-900 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span className="truncate">{collName} PDF</span>
                          </span>
                          <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1 shrink-0">
                            <span>Download</span>
                            <Download className="h-3 w-3" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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

        {/* FIXED FLOATING: Grand Total Weight & Price Box — page top-right corner, stays on scroll */}
        {mode === 'buyer' && cart.length > 0 && (
          <div
            onClick={() => setCartOpen(true)}
            className="fixed top-[90px] right-4 z-[60] cursor-pointer select-none"
            title="Click to view cart"
          >
            <div className="bg-white border border-indigo-200 shadow-lg rounded-xl px-4 py-2.5 flex items-center space-x-4 animate-in fade-in zoom-in-95">
              <div>
                <span className="text-indigo-500 text-[9px] uppercase font-bold block leading-none mb-0.5">TOTAL WEIGHT</span>
                <span className="font-bold font-mono text-slate-900 text-sm">{cartTotals.weight.toFixed(2)}g</span>
              </div>
              <div className="h-6 w-px bg-indigo-100"></div>
              <div>
                <span className="text-indigo-500 text-[9px] uppercase font-bold block leading-none mb-0.5">TOTAL PRICE (APPROX. PRICE)</span>
                <span className="font-bold text-indigo-600 font-mono text-sm">₹{cartTotals.price.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Live Silver Spot Rate Bar for Mobile */}
        {mode === 'buyer' && (
          <div className="flex md:hidden items-center justify-between bg-slate-950 text-white px-4 py-2 text-[11px] font-mono shadow-inner border-b border-slate-800 shrink-0">
            <div className="flex items-center space-x-2 truncate">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-gray-300 font-sans text-[10px] uppercase font-bold tracking-wider">Live Silver:</span>
              <span className="font-extrabold text-white">₹{livePrice?.silver_gram_rate.toFixed(2)}/g</span>
              <span className="text-gray-500">•</span>
              <span className="font-extrabold text-emerald-400">₹{livePrice ? livePrice.silver_kg_rate.toLocaleString('en-IN') : '2,30,300'}/kg</span>
            </div>
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              LIVE
            </span>
          </div>
        )}

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

              {/* Download Catalog PDF Button */}
              <button
                onClick={() => {
                  setSelectedDesignCode(null);
                  setAboutModalOpen(false);
                  setMobileMenuOpen(false);
                  setTimeout(() => {
                    const btn = document.getElementById('open-mobile-pdf-btn');
                    if (btn) btn.click();
                    else {
                      downloadCatalogPDFForCollection('All', designs, categories);
                    }
                  }, 120);
                }}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider text-amber-950 bg-amber-50 border border-amber-300 hover:bg-amber-100 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <Download className="h-4 w-4 text-amber-700" />
                  <span>Download Catalog PDF</span>
                </div>
                <span className="text-[10px] font-mono bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">PDF ↓</span>
              </button>

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

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  downloadCatalogPDFForCollection('All', designs, categories);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-amber-950 bg-amber-50 border border-amber-300 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <Download className="h-4 w-4 text-amber-700" />
                  <span>Download Catalog PDF</span>
                </div>
                <span className="text-[10px] font-mono bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-bold">A4 PDF</span>
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
                onOpenCart={() => setCartOpen(true)}
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
                                  onClick={() => handleDeleteDesign(d.id, d.name)}
                                  className="btn-secondary w-full text-xs border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
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

      {/* ─── Horizontal Excel-Style Spreadsheet Cart Modal ──────────────── */}
      {cartOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setCartOpen(false)}></div>
          
          <div className="relative w-full max-w-7xl h-[94vh] sm:h-[92vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col z-50 border border-slate-300 overflow-hidden">
            {/* ── Excel-Style Cart Modal Header ── */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div className="flex items-center space-x-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold shadow-sm shrink-0">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base sm:text-lg tracking-tight text-white">Shopping Cart</h3>
                      <span className="bg-amber-400 text-slate-950 font-extrabold text-xs px-2.5 py-0.5 rounded-full font-mono">
                        {cart.reduce((s, i) => s + i.quantity, 0)} Pcs
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-400">Excel Worksheet View • B2B Wholesale Order Summary</p>
                  </div>
                </div>

                {/* Close Button on Mobile */}
                <button 
                  onClick={() => setCartOpen(false)} 
                  className="sm:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Action Buttons Header Bar */}
              <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                {cart.length > 0 && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleDownloadCartInvoice}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                      title="Download Excel / Invoice PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => clearCart()}
                      className="flex items-center justify-center gap-1 px-3 py-2 sm:py-2 bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear</span>
                    </button>
                  </div>
                )}
                {/* Close Button on Desktop */}
                <button 
                  onClick={() => setCartOpen(false)} 
                  className="hidden sm:block p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* ── Scrollable Excel Spreadsheet Table ── */}
            <div className="flex-1 overflow-auto p-2.5 sm:p-4 bg-slate-100/60">
              {orderSuccess && (
                <div className="mb-3 p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-sm space-y-1 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <span className="font-extrabold text-base">Order Placed Successfully!</span>
                  </div>
                  <p className="text-xs text-emerald-800">Order Reference: <span className="font-mono text-emerald-950 font-extrabold">{orderSuccess}</span> has been saved into the database.</p>
                </div>
              )}

              {cart.length > 0 ? (
                <div className="space-y-2">
                  {/* Mobile Horizontal Scroll Hint Badge */}
                  <div className="sm:hidden text-[10px] text-slate-500 font-bold flex items-center justify-between px-1">
                    <span>← Swipe horizontally to view spreadsheet grid →</span>
                    <span className="font-mono text-amber-800">{cart.length} lines</span>
                  </div>

                  {/* Horizontal Scroll Wrapper for Table */}
                  <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse text-xs min-w-[860px]">
                      {/* Excel Table Header */}
                      <thead>
                        <tr className="bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-900 select-none">
                          <th className="py-3 px-3 border-r border-slate-700 text-center w-12">#</th>
                          <th className="py-3 px-4 border-r border-slate-700">Design & Variant</th>
                          <th className="py-3 px-3 border-r border-slate-700 text-center">Size</th>
                          <th className="py-3 px-3 border-r border-slate-700 text-center">Type</th>
                          <th className="py-3 px-3 border-r border-slate-700 text-right">Unit Wt</th>
                          <th className="py-3 px-3 border-r border-slate-700 text-right">Total Wt</th>
                          <th className="py-3 px-3 border-r border-slate-700 text-center w-32">Quantity (Pcs)</th>
                          <th className="py-3 px-3 border-r border-slate-700 text-right">Pure Wt (70%)</th>
                          <th className="py-3 px-3 border-r border-slate-700 text-right">Silver Base Cost</th>
                          <th className="py-3 px-3 border-r border-slate-700 text-right">Making Charges (Rate/Kg)</th>
                          <th className="py-3 px-3 border-r border-slate-700 text-right">GST (3%)</th>
                          <th className="py-3 px-4 border-r border-slate-700 text-right bg-slate-900 text-amber-400">Total Price (Approx)</th>
                          <th className="py-3 px-2 text-center w-10">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-sans">
                        {cart.map((item, idx) => {
                          const hasLock = item.lockedPrice !== undefined;
                          const breakdown = hasLock
                            ? {
                                basePrice: item.lockedBasePrice!,
                                makingCharges: item.lockedMakingCharges!,
                                gst: item.lockedGst!,
                                total: item.lockedPrice!,
                                effectiveWeight: item.lockedEffectiveWeight!
                              }
                            : calculatePriceBreakdown(
                                item.size.weight,
                                item.design.purity,
                                item.design.wastage_percent,
                                item.design.making_charge_per_gram
                              );

                          const unitWt = item.size.weight;
                          const totalGrossWt = unitWt * item.quantity;
                          const totalPureWt = totalGrossWt * (item.design.purity / 100);
                          const rowSilverBase = breakdown.basePrice * item.quantity;
                          const rowMaking = breakdown.makingCharges * item.quantity;
                          const rowGst = breakdown.gst * item.quantity;
                          const rowTotal = breakdown.total * item.quantity;
                          const makingPerKg = Math.round((item.design.making_charge_per_gram || 0.40) * 1000);

                          const imgUrl = item.variant?.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                            item.design?.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                            'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400';

                          return (
                            <tr key={idx} className="hover:bg-amber-50/60 transition-colors odd:bg-slate-50/50 even:bg-white text-slate-800">
                              {/* Row Index */}
                              <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono font-bold text-slate-500">
                                {idx + 1}
                              </td>

                              {/* Design & Variant */}
                              <td className="py-2.5 px-4 border-r border-slate-200">
                                <div className="flex items-center gap-3">
                                  <img src={imgUrl} alt={item.design.name} className="h-10 w-10 object-cover rounded-lg border border-slate-200 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-extrabold text-slate-900 text-xs leading-tight truncate">{item.design.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">
                                      {item.design.design_code} • {item.variant.variant_name}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Size */}
                              <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono font-extrabold text-slate-900 text-xs">
                                {item.size.size.toFixed(2)}"
                              </td>

                              {/* Order Type Badge */}
                              <td className="py-2.5 px-3 border-r border-slate-200 text-center">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block ${
                                  item.orderType === 'ready_stock'
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-950 border border-amber-300'
                                }`}>
                                  {item.orderType === 'ready_stock' ? 'In-Stock' : 'MTO'}
                                </span>
                              </td>

                              {/* Unit Wt */}
                              <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-slate-700">
                                {unitWt.toFixed(2)}g
                              </td>

                              {/* Total Gross Wt */}
                              <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                                {totalGrossWt.toFixed(2)}g
                              </td>

                              {/* Quantity Stepper */}
                              <td className="py-2.5 px-3 border-r border-slate-200 text-center">
                                <div className="inline-flex items-center border border-amber-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (item.quantity > 1) {
                                        updateCartQuantity(idx, item.quantity - 1);
                                      } else {
                                        removeFromCart(idx);
                                      }
                                    }}
                                    className="h-6 w-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors cursor-pointer"
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      if (!isNaN(val) && val > 0) {
                                        updateCartQuantity(idx, val);
                                      }
                                    }}
                                    className="w-10 h-6 text-center font-mono font-extrabold text-slate-900 text-xs border-x border-slate-200 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateCartQuantity(idx, item.quantity + 1)}
                                    className="h-6 w-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              {/* Pure Metal Wt */}
                              <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-slate-700">
                                {totalPureWt.toFixed(3)}g
                              </td>

                              {/* Silver Base Cost */}
                              <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-slate-800">
                                <span className="font-bold">₹{rowSilverBase.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                <span className="block text-[9px] text-slate-400 font-sans font-medium">
                                  (@ ₹{livePrice?.silver_gram_rate || 231.70}/g)
                                </span>
                              </td>

                              {/* Making Charges */}
                              <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-slate-800">
                                <span className="font-extrabold text-slate-900">₹{rowMaking.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                <span className="block text-[9px] text-amber-800 font-sans font-extrabold">
                                  (@ ₹{makingPerKg}/kg)
                                </span>
                              </td>

                              {/* GST */}
                              <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-slate-700">
                                ₹{rowGst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </td>

                              {/* Row Total Price */}
                              <td className="py-2.5 px-4 border-r border-slate-200 text-right font-mono font-extrabold text-slate-950 bg-amber-50/50">
                                ₹{rowTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              {/* Remove Row Button */}
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(idx)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remove line item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>

                      {/* ── Excel Summary Totals Footer Row ── */}
                      <tfoot>
                        <tr className="bg-slate-900 text-white font-extrabold text-xs border-t-2 border-slate-950">
                          <td colSpan={5} className="py-3 px-4 border-r border-slate-800 text-right uppercase tracking-wider text-amber-400 font-mono">
                            Spreadsheet Grand Totals ({cart.reduce((s, i) => s + i.quantity, 0)} Items):
                          </td>
                          <td className="py-3 px-3 border-r border-slate-800 text-right font-mono text-amber-300">
                            {cartTotals.weight.toFixed(2)}g
                          </td>
                          <td className="py-3 px-3 border-r border-slate-800 text-center font-mono text-amber-300">
                            {cart.reduce((s, i) => s + i.quantity, 0)} pcs
                          </td>
                          <td className="py-3 px-3 border-r border-slate-800 text-right font-mono text-slate-300">
                            {(cartTotals.weight * 0.70).toFixed(3)}g
                          </td>
                          <td colSpan={3} className="py-3 px-3 border-r border-slate-800 text-right text-slate-400 text-[11px]">
                            In-Stock: ₹{cartTotals.inStockPrice.toLocaleString('en-IN')} | MTO: ₹{cartTotals.mtoPrice.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 border-r border-slate-800 text-right font-mono text-amber-400 text-sm bg-slate-950 font-extrabold">
                            ₹{cartTotals.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] text-amber-300 font-sans font-normal">(Approx)</span>
                          </td>
                          <td className="py-3 px-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                !orderSuccess && (
                  <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-slate-200">
                    <div className="h-16 w-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600">
                      <ShoppingBag className="h-8 w-8" />
                    </div>
                    <span className="text-lg font-extrabold text-slate-900">Your Shopping Cart is Empty</span>
                    <p className="text-xs text-slate-500 max-w-sm">Select products from the catalog to build your horizontal Excel spreadsheet cart order.</p>
                  </div>
                )
              )}
            </div>

            {/* ── Excel Cart Summary Footer ── */}
            {cart.length > 0 && (
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-200 bg-white flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 shrink-0 shadow-lg">
                {/* Left: Summary Badges Grid on Mobile */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full md:w-auto text-center sm:text-left text-xs">
                  <div className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-bold block truncate">Gross Weight</span>
                    <span className="font-mono font-extrabold text-slate-900 text-xs sm:text-sm">{cartTotals.weight.toFixed(2)}g</span>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2">
                    <span className="text-[9px] sm:text-[10px] text-emerald-700 uppercase font-bold block truncate">In-Stock ({cartTotals.inStockPcs}pcs)</span>
                    <span className="font-mono font-extrabold text-emerald-950 text-xs sm:text-sm">₹{cartTotals.inStockPrice.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2">
                    <span className="text-[9px] sm:text-[10px] text-amber-800 uppercase font-bold block truncate">MTO ({cartTotals.mtoPcs}pcs)</span>
                    <span className="font-mono font-extrabold text-amber-950 text-xs sm:text-sm">₹{cartTotals.mtoPrice.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Right: Checkout CTA & Customer Status */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="text-right hidden md:block">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block text-slate-500">Approx. Total Order Payable</span>
                    <span className="font-mono font-extrabold text-slate-950 text-xl">₹{cartTotals.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {isCustomerAuthenticated && currentCustomer ? (
                    <form onSubmit={handleCheckout} className="w-full md:w-auto">
                      <button
                        type="submit"
                        disabled={orderSubmitting}
                        className="w-full md:w-auto bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-50 text-slate-950 font-extrabold py-3 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-500 text-sm"
                      >
                        <span>{orderSubmitting ? 'Filing Order...' : `Proceed to Buy (${cart.reduce((s, i) => s + i.quantity, 0)} items)`}</span>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBuyerLoginOpen(true)}
                      className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <UserCircle className="h-5 w-5 text-amber-400" />
                      <span>Login / Sign Up to Place Order</span>
                    </button>
                  )}
                </div>
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
              setAboutModalOpen(false);
              setMobileMenuOpen(false);
              setTimeout(() => {
                const btn = document.getElementById('open-mobile-pdf-btn');
                if (btn) btn.click();
                else {
                  downloadCatalogPDFForCollection('All', designs, categories);
                }
              }, 100);
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors text-amber-700 hover:text-amber-900`}
          >
            <Download className="h-5 w-5 text-amber-600" />
            <span>Catalog PDF</span>
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

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-md shadow-xl space-y-4">
            <div className="h-14 w-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Something went wrong</h2>
            <p className="text-xs text-gray-500 font-mono bg-gray-100 p-3 rounded-xl text-left overflow-x-auto">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer hover:bg-slate-800"
            >
              Return to Home Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;

