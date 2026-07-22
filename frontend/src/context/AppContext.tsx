import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
}

export interface VariantSize {
  id: number;
  variant_id: number;
  size: number;
  weight: number;
  stock_available: number;
  stock_reserved: number;
  moq: number;
  status: string;
}

export interface ProductVariant {
  id: number;
  design_id: number;
  variant_code: string;
  variant_name: string;
  status: string;
  sizes: VariantSize[];
  media?: MediaItem[];
}

export interface MediaItem {
  id: number;
  design_id: number;
  variant_id?: number | null;
  file_name: string;
  file_type: string;
  file_size: string;
  url: string;
  category: string;
  uploaded_at: string;
}

export interface WishlistItem {
  design: ProductDesign;
  variantId?: number;
}


export interface ProductDesign {
  id: number;
  design_code: string;
  name: string;
  category_id: number | null;
  collection: string | null;
  tags: string | null;
  purity: number;
  making_charge_per_gram: number;
  wastage_percent: number;
  gst_percent: number;
  moq: number;
  price_lock_minutes: number;
  status: string;
  
  // Specs
  metal: string;
  weight_range: string | null;
  finishing: string;
  occasion: string;
  style: string | null;
  gender: string;
  lock_type: string;
  returnable: boolean;
  exchangeable: boolean;
  created_at: string;
  
  variants: ProductVariant[];
  media: MediaItem[];
}

export interface CartItem {
  design: ProductDesign;
  variant: ProductVariant;
  size: VariantSize;
  quantity: number;
  orderType: 'ready_stock' | 'make_order';
  lockedPrice?: number;
  lockedSilverRate?: number;
  lockedEffectiveWeight?: number;
  lockedBasePrice?: number;
  lockedMakingCharges?: number;
  lockedGst?: number;
}

export interface LivePriceHistory {
  rate: number;
  timestamp: string;
}

export interface LivePrice {
  silver_gram_rate: number;
  silver_kg_rate: number;
  last_updated: string;
  source: string;
  history?: LivePriceHistory[];
}

export interface CustomerInfo {
  name: string;
  email: string;
  mobile_number: string;
}

interface AppContextType {
  mode: 'buyer' | 'admin';
  setMode: (mode: 'buyer' | 'admin') => void;
  adminTab: string;
  setAdminTab: (tab: string) => void;
  selectedDesignCode: string | null;
  setSelectedDesignCode: (code: string | null) => void;
  
  livePrice: LivePrice | null;
  categories: Category[];
  designs: ProductDesign[];
  cart: CartItem[];
  
  loadingPrice: boolean;
  loadingDesigns: boolean;
  
  fetchPrice: () => Promise<void>;
  fetchDesigns: (status?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  
  addToCart: (item: CartItem) => void;
  addMultipleToCart: (items: CartItem[]) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  updateCartQuantity: (index: number, qty: number) => void;
  
  calculatePriceBreakdown: (weight: number, purity: number, wastage: number, makingChargePerGram: number) => {
    effectiveWeight: number;
    basePrice: number;
    makingCharges: number;
    gst: number;
    total: number;
  };

  // Admin auth
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  navigateTo: (path: string) => void;

  // Customer auth
  customerToken: string | null;
  isCustomerAuthenticated: boolean;
  currentCustomer: CustomerInfo | null;
  customerLogin: (token: string, name: string, email: string, mobile: string) => void;
  customerLogout: () => void;

  // Wishlist
  wishlist: WishlistItem[];
  addToWishlist: (design: ProductDesign, variantId?: number) => void;
  removeFromWishlist: (designId: number, variantId?: number) => void;
  isInWishlist: (designId: number, variantId?: number) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'buyer' | 'admin'>(window.location.pathname.startsWith('/admin') ? 'admin' : 'buyer');
  const [adminTab, setAdminTab] = useState<string>('dashboard');
  const [selectedDesignCode, setSelectedDesignCode] = useState<string | null>(() => {
    // Read ?design= param synchronously so product detail shows immediately on refresh
    const params = new URLSearchParams(window.location.search);
    return params.get('design') || null;
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  const [livePrice, setLivePrice] = useState<LivePrice | null>({
    silver_gram_rate: 222.00,
    silver_kg_rate: 222000.0,
    last_updated: new Date().toISOString(),
    source: "Initializing..."
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [designs, setDesigns] = useState<ProductDesign[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingDesigns, setLoadingDesigns] = useState(false);

  // Customer auth state
  const [customerToken, setCustomerToken] = useState<string | null>(localStorage.getItem('customer_token'));
  const [currentCustomer, setCurrentCustomer] = useState<CustomerInfo | null>(() => {
    try {
      const stored = localStorage.getItem('customer_info');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const isCustomerAuthenticated = !!customerToken && !!currentCustomer;

  // Wishlist state — persisted in localStorage
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    try {
      const stored = localStorage.getItem('buyer_wishlist');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrating old database scheme where wishlist stored ProductDesign directly:
        return parsed.map((item: any) => {
          if (item && item.id !== undefined && item.design_code !== undefined) {
            return { design: item, variantId: item.variants?.[0]?.id };
          }
          return item;
        });
      }
      return [];
    } catch {
      return [];
    }
  });

  // Persist wishlist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('buyer_wishlist', JSON.stringify(wishlist));
    } catch {
      // Storage quota exceeded — ignore
    }
  }, [wishlist]);

  // WebSocket reference for real-time price updates
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch Live Silver Price from API
  const fetchPrice = async () => {
    try {
      setLoadingPrice(true);
      const res = await axios.get(`${API_BASE_URL}/api/live-price`);
      setLivePrice(res.data);
    } catch (err) {
      console.error("Error fetching live price:", err);
      // Fail-soft: oscillate price slightly using current value
      setLivePrice(prev => {
        if (!prev) return null;
        const change = (Math.random() - 0.48) * 0.30;
        const newGram = Math.max(200, Math.min(260, prev.silver_gram_rate + change));
        return {
          ...prev,
          silver_gram_rate: parseFloat(newGram.toFixed(2)),
          silver_kg_rate: parseFloat((newGram * 1000).toFixed(2)),
          last_updated: new Date().toISOString(),
          source: "Fallback (Offline)"
        };
      });
    } finally {
      setLoadingPrice(false);
    }
  };

  // Initialize WebSocket for real-time price updates
  const initializeWebSocket = () => {
    if (wsRef.current) return; // Already connected

    try {
      const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/live-price/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
          console.log("WebSocket connected for live prices");
          stopPolling(); // Stop fallback polling when WS is active
        };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLivePrice(data);
          console.log("Live price updated via WebSocket:", data.silver_gram_rate);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        // Fallback to polling on WebSocket error
        startPolling();
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        wsRef.current = null;
        // Fallback to polling when WebSocket closes
        startPolling();
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to initialize WebSocket:", err);
      // Fallback to polling
      startPolling();
    }
  };

  // Fallback polling mechanism
  const startPolling = () => {
    if (pollingIntervalRef.current) return; // Already polling

    console.log("Starting fallback polling (5s interval)");
    // Fetch immediately
    fetchPrice();

    // Poll every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchPrice();
    }, 5000);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log("Stopped polling");
    }
  };

  // Fetch Designs
  const fetchDesigns = async (status: string = 'Active') => {
    try {
      setLoadingDesigns(true);
      const res = await axios.get(`${API_BASE_URL}/api/products/designs`, {
        params: status === '' ? { status: '' } : { status }
      });
      setDesigns(res.data);
    } catch (err) {
      console.error("Error fetching designs:", err);
    } finally {
      setLoadingDesigns(false);
    }
  };

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/products/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  // Calculate Price Breakdown
  const calculatePriceBreakdown = (
    weight: number, 
    purity: number, 
    wastage: number, 
    makingChargePerGram: number
  ) => {
    const rate = livePrice?.silver_gram_rate || 222.00;
    
    // Effective Weight = (WeightPerSize * (Purity + Wastage)) / 100
    const effectiveWeight = (weight * (purity + wastage)) / 100;
    
    // Base Price = Effective Weight * Live Rate
    const basePrice = effectiveWeight * rate;
    
    // Making Charges = Making Charge Per Gram * WeightPerSize
    const makingCharges = makingChargePerGram * weight;
    
    // GST = 3%
    const gst = (basePrice + makingCharges) * 0.03;
    
    const total = basePrice + makingCharges + gst;
    
    return {
      effectiveWeight: parseFloat(effectiveWeight.toFixed(3)),
      basePrice: parseFloat(basePrice.toFixed(2)),
      makingCharges: parseFloat(makingCharges.toFixed(2)),
      gst: parseFloat(gst.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  };

  // Cart Management
  const addToCart = (newItem: CartItem) => {
    // If locked price fields are not already provided, calculate and populate them
    if (newItem.lockedPrice === undefined) {
      const breakdown = calculatePriceBreakdown(
        newItem.size.weight,
        newItem.design.purity,
        newItem.design.wastage_percent,
        newItem.design.making_charge_per_gram
      );
      newItem.lockedPrice = breakdown.total;
      newItem.lockedSilverRate = livePrice?.silver_gram_rate || 222.00;
      newItem.lockedEffectiveWeight = breakdown.effectiveWeight;
      newItem.lockedBasePrice = breakdown.basePrice;
      newItem.lockedMakingCharges = breakdown.makingCharges;
      newItem.lockedGst = breakdown.gst;
    }

    setCart(prev => {
      // Check if duplicate item (same variant, same size, same order type)
      const existingIdx = prev.findIndex(item => 
        item.variant.id === newItem.variant.id && 
        item.size.id === newItem.size.id && 
        item.orderType === newItem.orderType
      );
      
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += newItem.quantity;
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const addMultipleToCart = (newItems: CartItem[]) => {
    setCart(prev => {
      const updated = [...prev];
      newItems.forEach(newItem => {
        if (newItem.lockedPrice === undefined) {
          const breakdown = calculatePriceBreakdown(
            newItem.size.weight,
            newItem.design.purity,
            newItem.design.wastage_percent,
            newItem.design.making_charge_per_gram
          );
          newItem.lockedPrice = breakdown.total;
          newItem.lockedSilverRate = livePrice?.silver_gram_rate || 222.00;
          newItem.lockedEffectiveWeight = breakdown.effectiveWeight;
          newItem.lockedBasePrice = breakdown.basePrice;
          newItem.lockedMakingCharges = breakdown.makingCharges;
          newItem.lockedGst = breakdown.gst;
        }

        const existingIdx = updated.findIndex(item => 
          item.variant.id === newItem.variant.id && 
          item.size.id === newItem.size.id && 
          item.orderType === newItem.orderType
        );
        
        if (existingIdx > -1) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + newItem.quantity
          };
        } else {
          updated.push(newItem);
        }
      });
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateCartQuantity = (index: number, qty: number) => {
    setCart(prev => {
      const updated = [...prev];
      updated[index].quantity = qty;
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  // Listen to popstate for route path changes
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setMode(path.startsWith('/admin') ? 'admin' : 'buyer');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Axios request interceptor to attach bearer token
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [token]);

  // Admin login
  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // Support admin credentials on Vercel static deployment or local server:
    if (
      (cleanEmail === 'srchains19@gmail.com' || cleanEmail === 'admin' || cleanEmail === 'admin@srchains.com') && 
      cleanPass === 'srchains195757'
    ) {
      const fallbackToken = 'demo-admin-token-srchains195757';
      localStorage.setItem('admin_token', fallbackToken);
      setToken(fallbackToken);
      setIsAuthenticated(true);
      setMode('admin');
      window.history.pushState({}, '', '/admin');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { email: cleanEmail, password: cleanPass });
      const receivedToken = res.data.token;
      localStorage.setItem('admin_token', receivedToken);
      setToken(receivedToken);
      setIsAuthenticated(true);
      setMode('admin');
      window.history.pushState({}, '', '/admin');
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Login failed. Invalid email or password.');
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setIsAuthenticated(false);
    setMode('buyer');
    window.history.pushState({}, '', '/');
  };

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setMode(path.startsWith('/admin') ? 'admin' : 'buyer');
  };

  // Customer login (called after successful API response)
  const customerLogin = (token: string, name: string, email: string, mobile: string) => {
    const info: CustomerInfo = { name, email, mobile_number: mobile };
    localStorage.setItem('customer_token', token);
    localStorage.setItem('customer_info', JSON.stringify(info));
    setCustomerToken(token);
    setCurrentCustomer(info);
  };

  // Customer logout
  const customerLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    setCustomerToken(null);
    setCurrentCustomer(null);
  };

  // Wishlist management
  const addToWishlist = (design: ProductDesign, variantId?: number) => {
    setWishlist(prev => {
      if (prev.find(item => item.design.id === design.id && item.variantId === variantId)) return prev; // already in wishlist
      return [...prev, { design, variantId }];
    });
  };

  const removeFromWishlist = (designId: number, variantId?: number) => {
    setWishlist(prev => prev.filter(item => {
      if (item.design.id !== designId) return true;
      if (variantId !== undefined && variantId !== null) {
        return item.variantId !== variantId;
      }
      return false; // if no variantId is specified, remove all items matching designId
    }));
  };

  const isInWishlist = (designId: number, variantId?: number) => {
    return wishlist.some(item => {
      if (item.design.id !== designId) return false;
      if (variantId !== undefined && variantId !== null) {
        return item.variantId === variantId;
      }
      return true; // if no variantId specified, return true if any variant is wishlisted
    });
  };

  // Initialize live price updates on mount
  // First try WebSocket, fallback to polling
  useEffect(() => {
    fetchCategories();
    fetchDesigns();

    const verifyToken = async () => {
      const storedToken = localStorage.getItem('admin_token');
      if (storedToken) {
        try {
          await axios.get(`${API_BASE_URL}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setIsAuthenticated(true);
        } catch (err) {
          console.error("Token verification failed, logging out", err);
          localStorage.removeItem('admin_token');
          setToken(null);
          setIsAuthenticated(false);
        }
      }
    };
    verifyToken();

    // Start polling as a fallback (will be stopped if WebSocket connects)
    startPolling();

    // Try WebSocket first, fallback to polling
    initializeWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      stopPolling();
    };
  }, []);

  return (
    <AppContext.Provider value={{
      mode, setMode,
      adminTab, setAdminTab,
      selectedDesignCode, setSelectedDesignCode,
      livePrice,
      categories,
      designs,
      cart,
      loadingPrice,
      loadingDesigns,
      fetchPrice,
      fetchDesigns,
      fetchCategories,
      addToCart,
      addMultipleToCart,
      removeFromCart,
      clearCart,
      updateCartQuantity,
      calculatePriceBreakdown,
      token,
      isAuthenticated,
      login,
      logout,
      navigateTo,
      // Customer auth
      customerToken,
      isCustomerAuthenticated,
      currentCustomer,
      customerLogin,
      customerLogout,
      // Wishlist
      wishlist,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
