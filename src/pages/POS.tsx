import { useDesignSystem } from '../context/DesignContext';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, ShoppingCart, Plus, Minus, CreditCard, Banknote, User, X, 
  ScanLine, Tag, Trash2, Percent, UserPlus, MonitorSmartphone, 
  Headphones, ChevronRight, CheckCircle2, PauseCircle,
  LayoutGrid, List, Sparkles, DollarSign, Clock, Layers,
  SlidersHorizontal, RefreshCw, Smartphone, ShieldCheck,
  Edit3, Coins, AlertCircle, ArrowRight, Camera, Check
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { formatCurrency, formatDualPrice, convertCurrency, formatNumberWithCommas, cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { Mobile } from '../types/mobile';
import { Accessory } from '../types/accessory';
import POSPaymentModal from '../components/pos/POSPaymentModal';
import POSReceiptModal, { POSReceiptData } from '../components/pos/POSReceiptModal';
import CameraScannerModal from '../components/common/CameraScannerModal';
import ScreenProtectorFinderModal from '../components/screenProtector/ScreenProtectorFinderModal';
import { SearchInput } from '../components/common/SearchInput';
import { ProductAutocompleteSearch } from '../components/pos/ProductAutocompleteSearch';
import OfflineSyncModal from '../components/common/OfflineSyncModal';
import { POSFloatingBar } from '../components/pos/POSFloatingBar';
import { POSCartDrawer } from '../components/pos/POSCartDrawer';
import { debtService } from '../lib/debtService';
import { installmentService } from '../lib/installmentService';
import { cameraService, CameraDeviceInfo } from '../lib/cameraService';
import { idb } from '../lib/idbService';
import { offlineSyncService } from '../lib/offlineSyncService';
import { sound } from '../lib/sound';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { iosWidgetService } from '../lib/iosWidgetService';
import { useModalScrollLock } from '../lib/modalLock';
import { Pagination } from '../components/common/Pagination';


const getCategories = (t: any) => [
  { id: 'all', nameKey: 'common.allProducts', icon: Tag },
  { id: 'Mobiles', nameKey: 'nav.mobiles', icon: MonitorSmartphone },
  { id: 'Accessories', nameKey: 'nav.accessories', icon: Headphones },
];

type CartItem = {
  cartId: string;
  product: {
    id: string;
    type: 'mobile' | 'accessory';
    category: string;
    name: string;
    detail: string;
    price: number;
    currency: 'USD' | 'IQD';
    stock: number;
    barcode: string;
    brand: string;
    storage?: string;
    ram?: string;
    color?: string;
    battery?: string;
    condition?: string;
    originalData: any;
  };
  customPrice?: number; // allow custom price override
  quantity: number;
  discount: number;
  discountType: 'fixed' | 'percentage';
};

export default function POS() {
  const { t } = useTranslation();
  const categories = getCategories(t);
  const { profile, user } = useAuth();
  
  const { success, info, error: toastError } = useToast();
  const [mobiles, setMobiles] = useState<Mobile[]>([]);
  const [isLoadingMobiles, setIsLoadingMobiles] = useState(true);
  
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [isLoadingAccessories, setIsLoadingAccessories] = useState(true);

  const { settings, updateSettings } = useDesignSystem();
  const exchangeRate = settings.exchangeRate || 1500;

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Catalog Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Cart & Customer
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState({ value: 0, type: 'fixed' as 'fixed' | 'percentage' });
  const [taxRate] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; type: string; phone?: string } | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Cart Active Sell Type & Price Edit State
  const [cartSellType, setCartSellType] = useState<'cash' | 'card' | 'debt' | 'installment'>('cash');
  const [editingPriceItem, setEditingPriceItem] = useState<CartItem | null>(null);
  const [tempEditPrice, setTempEditPrice] = useState<string>('');

  // Direct Sale & Submitting State
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [isGlobalDiscountOpen, setIsGlobalDiscountOpen] = useState(false);
  const [tempGlobalDiscount, setTempGlobalDiscount] = useState({ value: 0, type: 'fixed' as 'fixed' | 'percentage' });

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isScreenProtectorFinderOpen, setIsScreenProtectorFinderOpen] = useState(false);
  const [isOfflineSyncOpen, setIsOfflineSyncOpen] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<CameraDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>(() => {
    return cameraService.getPreferredDeviceId() || '';
  });
  const [receiptData, setReceiptData] = useState<POSReceiptData | null>(null);
  const [activeItemDiscount, setActiveItemDiscount] = useState<CartItem | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [lastAddedItemName, setLastAddedItemName] = useState<string>('');

  // Lock background scroll whenever any POS modal/drawer is open
  const isAnyPosModalOpen = 
    isMobileCartOpen || 
    isPaymentModalOpen || 
    isReceiptModalOpen || 
    isCameraScannerOpen || 
    isScreenProtectorFinderOpen || 
    isOfflineSyncOpen || 
    isGlobalDiscountOpen || 
    !!editingPriceItem || 
    !!activeItemDiscount;

  useModalScrollLock(isAnyPosModalOpen, 'pos-page-modals');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search bar on mount
  useEffect(() => {
    // Small timeout ensures the DOM has fully painted the input before focusing
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState((settings.exchangeRate || 1500).toString());

  // Save exchange rate
  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(tempRate);
    if (!isNaN(parsed) && parsed > 0) {
      updateSettings({ exchangeRate: parsed });
      setIsEditingRate(false);
    }
  };

  // Fetch Mobiles & Accessories with local IndexedDB cache first
  useEffect(() => {
    let isMounted = true;
    
    // 1. Instant local IndexedDB load (ultra-fast zero-latency offline start)
    const loadFromLocalIDB = async () => {
      try {
        const [cachedMobiles, cachedAccessories] = await Promise.all([
          idb.getAll<Mobile>('mobiles'),
          idb.getAll<Accessory>('accessories')
        ]);

        if (isMounted) {
          if (Array.isArray(cachedMobiles) && cachedMobiles.length > 0) {
            setMobiles(cachedMobiles.filter(m => m.status === 'in_stock'));
            setIsLoadingMobiles(false);
          } else {
            const rawM = localStorage.getItem('nali_mobiles_cache') || localStorage.getItem('nali_pos_mobiles_cache');
            if (rawM) {
              try {
                const parsed = JSON.parse(rawM);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setMobiles(parsed.filter((m: Mobile) => m.status === 'in_stock'));
                  setIsLoadingMobiles(false);
                }
              } catch (e) {}
            }
            if (isLoadingMobiles) {
              setMobiles([]);
              setIsLoadingMobiles(false);
            }
          }

          if (Array.isArray(cachedAccessories) && cachedAccessories.length > 0) {
            setAccessories(cachedAccessories.filter(a => a.quantity > 0));
            setIsLoadingAccessories(false);
          } else {
            const rawA = localStorage.getItem('nali_accessories_cache') || localStorage.getItem('nali_pos_accessories_cache');
            if (rawA) {
              try {
                const parsed = JSON.parse(rawA);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setAccessories(parsed.filter((a: Accessory) => a.quantity > 0));
                  setIsLoadingAccessories(false);
                }
              } catch (e) {}
            }
            if (isLoadingAccessories) {
              setAccessories([]);
              setIsLoadingAccessories(false);
            }
          }
        }
      } catch (e) {
        console.warn('Local cache read note:', e);
        if (isMounted) {
          setMobiles([]);
          setAccessories([]);
          setIsLoadingMobiles(false);
          setIsLoadingAccessories(false);
        }
      }
    };

    loadFromLocalIDB();

    // 2. Fetch fresh catalog from Supabase if online
    const fetchMobiles = async () => {
      try {
        const { data, error } = await supabase
          .from('nali_mobiles')
          .select('*')
          .eq('status', 'in_stock');
        
        if (error) {
          if (error.code !== 'PGRST205') console.warn('Supabase mobiles offline notice:', error);
        } else if (data && isMounted) {
          const freshM = Array.isArray(data) ? (data as Mobile[]) : [];
          setMobiles(freshM);
          try {
            await idb.clear('mobiles');
            if (Array.isArray(freshM) && freshM.length > 0) {
              await idb.bulkPut('mobiles', freshM);
            }
            localStorage.setItem('nali_pos_mobiles_cache', JSON.stringify(freshM));
          } catch (e) {}
        }
      } catch (err) {
        console.warn(err);
      } finally {
        if (isMounted) setIsLoadingMobiles(false);
      }
    };

    const fetchAccessories = async () => {
      try {
        const { data, error } = await supabase
          .from('nali_accessories')
          .select('*')
          .gt('quantity', 0);
        
        if (error) {
          if (error.code !== 'PGRST205') console.warn('Supabase accessories offline notice:', error);
        } else if (data && isMounted) {
          const freshA = Array.isArray(data) ? (data as Accessory[]) : [];
          setAccessories(freshA);
          try {
            await idb.clear('accessories');
            if (Array.isArray(freshA) && freshA.length > 0) {
              await idb.bulkPut('accessories', freshA);
            }
            localStorage.setItem('nali_pos_accessories_cache', JSON.stringify(freshA));
          } catch (e) {}
        }
      } catch (err) {
        console.warn(err);
      } finally {
        if (isMounted) setIsLoadingAccessories(false);
      }
    };

    fetchMobiles();
    fetchAccessories();

    // 3. Supabase Real-time Subscriptions (keeps IndexedDB updated)
    const mobChannel = supabase
      .channel('public:nali_mobiles_pos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nali_mobiles' }, async (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT' && payload.new.status === 'in_stock') {
          setMobiles(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [payload.new as Mobile, ...prev];
          });
          await idb.put('mobiles', payload.new);
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.status === 'in_stock') {
            setMobiles(prev => {
              if (prev.some(m => m.id === payload.new.id)) {
                return prev.map(m => m.id === payload.new.id ? payload.new as Mobile : m);
              }
              return [payload.new as Mobile, ...prev];
            });
            await idb.put('mobiles', payload.new);
          } else {
            setMobiles(prev => prev.filter(m => m.id !== payload.new.id));
            await idb.delete('mobiles', payload.new.id);
          }
        } else if (payload.eventType === 'DELETE') {
          setMobiles(prev => prev.filter(m => m.id !== payload.old.id));
          await idb.delete('mobiles', payload.old.id);
        }
      })
      .subscribe();

    const accChannel = supabase
      .channel('public:nali_accessories_pos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nali_accessories' }, async (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT' && payload.new.quantity > 0) {
          setAccessories(prev => {
            if (prev.some(a => a.id === payload.new.id)) return prev;
            return [payload.new as Accessory, ...prev];
          });
          await idb.put('accessories', payload.new);
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.quantity > 0) {
            setAccessories(prev => {
              if (prev.some(a => a.id === payload.new.id)) {
                return prev.map(a => a.id === payload.new.id ? payload.new as Accessory : a);
              }
              return [payload.new as Accessory, ...prev];
            });
            await idb.put('accessories', payload.new);
          } else {
            setAccessories(prev => prev.filter(a => a.id !== payload.new.id));
            await idb.delete('accessories', payload.new.id);
          }
        } else if (payload.eventType === 'DELETE') {
          setAccessories(prev => prev.filter(a => a.id !== payload.old.id));
          await idb.delete('accessories', payload.old.id);
        }
      })
      .subscribe();

    const handleDataReload = () => {
      fetchMobiles();
      fetchAccessories();
    };

    window.addEventListener('supabase_config_changed', handleDataReload);
    window.addEventListener('supabase_data_reload', handleDataReload);

    return () => {
      isMounted = false;
      supabase.removeChannel(mobChannel);
      supabase.removeChannel(accChannel);
      window.removeEventListener('supabase_config_changed', handleDataReload);
      window.removeEventListener('supabase_data_reload', handleDataReload);
    };
  }, []);

  const isLoading = isLoadingMobiles && isLoadingAccessories;

  // Transform into unified products list
  const combinedProducts = useMemo(() => {
    const m = (mobiles || [])
      .filter(item => item.status === 'in_stock')
      .map(item => ({
        id: item.id,
        type: 'mobile' as const,
        category: 'Mobiles',
        brand: item.brand || 'Other',
        name: `${item.brand} ${item.model}`,
        detail: `${item.storage || ''} • ${item.ram ? item.ram + ' RAM • ' : ''}${item.color || ''} • ${item.condition || 'Used'}`,
        price: item.sellPrice,
        currency: item.currency || 'USD',
        stock: 1,
        barcode: item.imei || item.id,
        storage: item.storage,
        ram: item.ram,
        color: item.color,
        battery: item.battery,
        condition: item.condition,
        originalData: item
      }));
    
    const a = (accessories || [])
      .filter(item => item.quantity > 0 && item.status !== 'discontinued')
      .map(item => ({
        id: item.id,
        type: 'accessory' as const,
        category: 'Accessories',
        brand: item.brand || 'General',
        name: item.name,
        detail: `${item.brand || ''} • ${item.category || 'Accessory'}${item.compatibility ? ' • ' + item.compatibility : ''}`,
        price: item.sellPrice,
        currency: item.currency || 'USD',
        stock: item.quantity,
        barcode: item.barcode || item.sku || item.id,
        condition: 'New',
        originalData: item
      }));
    
    return [...m, ...a];
  }, [mobiles, accessories]);

  // Extract distinct brand list
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    combinedProducts.forEach(p => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands).sort();
  }, [combinedProducts]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return combinedProducts.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || 
        p.name.toLowerCase().includes(q) || 
        p.barcode.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.detail.toLowerCase().includes(q);
      
      const matchCategory = activeCategory === 'all' || p.category === activeCategory;
      const matchBrand = selectedBrand === 'all' || p.brand === selectedBrand;

      return matchSearch && matchCategory && matchBrand;
    });
  }, [combinedProducts, searchTerm, activeCategory, selectedBrand]);

  // Reset pagination when search, category, or brand changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeCategory, selectedBrand]);

  const totalPages = Math.max(1, Math.ceil((filteredProducts?.length || 0) / pageSize));

  // Paginated slice for current page
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Helper to identify single device units (mobiles and tablets) which only have stock = 1 and unique IMEI
  const isSingleDeviceItem = (p: { type?: string; category?: string; name?: string }) => {
    if (p.type === 'mobile') return true;
    const cat = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    return cat === 'mobiles' || cat.includes('mobile') || cat.includes('tablet') || cat.includes('ipad') || name.includes('tablet') || name.includes('ipad');
  };

  // Cart operations
  const addToCart = (product: any, isToggle: boolean = true) => {
    const isDevice = isSingleDeviceItem(product);
    const existingIndex = cart.findIndex(item => item.product.id === product.id);

    if (existingIndex >= 0) {
      if (isDevice) {
        if (isToggle) {
          // If already selected, clicking it again unselects and removes it from the cart
          sound.playAlert();
          const existingItem = cart[existingIndex];
          setCart(cart.filter(item => item.cartId !== existingItem.cartId));
          info(`${product.name} ${t('pos.unselectedRemoved', 'unselected & removed from cart')}`);
          return;
        } else {
          sound.playAlert();
          toastError(t('pos.deviceAlreadyInCart', 'This mobile or tablet is already in your cart (Single Device)'));
          return;
        }
      }
      const existing = cart[existingIndex];
      if (existing.quantity < product.stock) {
        sound.playScanSuccess();
        setCartSellType('cash');
        setLastAddedItemName(product.name);
        const newCart = [...cart];
        newCart[existingIndex] = { ...existing, quantity: existing.quantity + 1 };
        setCart(newCart);
        success(`Added +1 ${product.name}`);
      } else {
        sound.playAlert();
        toastError(`Maximum available stock reached (${product.stock})`);
      }
    } else {
      sound.playScanSuccess();
      setCartSellType('cash');
      setLastAddedItemName(product.name);
      setCart([...cart, { 
        cartId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, 
        product, 
        quantity: 1, 
        discount: 0, 
        discountType: 'fixed' 
      }]);
      success(isDevice 
        ? `${product.name} ${t('pos.selectedAdded', 'selected & added to cart')}`
        : `Added ${product.name} to cart`
      );
    }
  };

  const updateQuantity = (cartId: string, delta: number) => {
    sound.playClick();
    setCart(cart.map(item => {
      if (item.cartId === cartId) {
        const newQ = item.quantity + delta;
        return newQ > 0 && newQ <= item.product.stock ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (cartId: string) => {
    sound.playAlert();
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const clearCart = () => {
    if ((cart?.length || 0) > 0) {
      sound.playAlert();
      setCart([]);
      setCartSellType('cash');
      setLastAddedItemName('');
      info('Cart cleared');
    }
  };

  const handleSelectPaymentMethod = (method: 'cash' | 'card' | 'debt' | 'installment') => {
    sound.playClick();
    setCartSellType(method);
    if (method !== 'cash') {
      setIsPaymentModalOpen(true);
    }
  };

  // Handle Camera Scanned Code
  const handleScannedCode = (decodedText: string) => {
    const query = decodedText.trim().toLowerCase();
    const matched = combinedProducts.find(p => 
      p.barcode.toLowerCase() === query ||
      p.name.toLowerCase() === query ||
      p.id.toLowerCase() === query
    );

    if (matched) {
      sound.playScan();
      addToCart(matched);
      success(`Added: ${matched.name}`);
    } else {
      sound.playAlert();
      toastError(`No item matching scanned code: ${decodedText}`);
    }
  };

  // Global Hardware Barcode Gun Listener (USB/Bluetooth)
  useEffect(() => {
    const unsubscribe = cameraService.subscribeHardwareScanner((result) => {
      handleScannedCode(result.code);
    });
    return () => unsubscribe();
  }, [combinedProducts]);

  // Direct fast barcode scan & Enter handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const query = searchTerm.trim().toLowerCase();
    const matched = combinedProducts.find(p => 
      p.barcode.toLowerCase() === query ||
      p.name.toLowerCase() === query ||
      p.id.toLowerCase() === query
    ) || ((filteredProducts?.length || 0) === 1 ? filteredProducts[0] : null);

    if (matched) {
      addToCart(matched);
      setSearchTerm('');
    } else if ((filteredProducts?.length || 0) > 0) {
      addToCart(filteredProducts[0]);
      setSearchTerm('');
    } else {
      sound.playAlert();
      toastError(`No product found with code: ${searchTerm}`);
    }
  };

  // Base Currency of the Cart
  const cartCurrency = (cart?.length || 0) > 0 ? cart[0].product.currency : 'USD';

  // Subtotal in base currency normalized for multi-currency items
  const subtotalBase = useMemo(() => {
    return cart.reduce((acc, item) => {
      const activePrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
      const itemPriceInBase = item.product.currency === cartCurrency 
        ? activePrice 
        : convertCurrency(activePrice, item.product.currency, cartCurrency, exchangeRate);
      
      let itemTotal = itemPriceInBase * item.quantity;
      if (item.discount > 0) {
        if (item.discountType === 'percentage') {
          itemTotal -= itemTotal * (item.discount / 100);
        } else {
          itemTotal -= item.discount;
        }
      }
      return acc + itemTotal;
    }, 0);
  }, [cart, exchangeRate, cartCurrency]);

  // Global Discount in base currency
  const finalDiscountBase = useMemo(() => {
    if (globalDiscount.value <= 0) return 0;
    if (globalDiscount.type === 'percentage') {
      return subtotalBase * (globalDiscount.value / 100);
    }
    return globalDiscount.value;
  }, [globalDiscount, subtotalBase]);

  const taxableAmountBase = Math.max(0, subtotalBase - finalDiscountBase);
  const taxAmountBase = taxableAmountBase * (taxRate / 100);
  const totalBase = taxableAmountBase + taxAmountBase;
  
  const totalUSD = cartCurrency === 'USD' ? totalBase : convertCurrency(totalBase, 'IQD', 'USD', exchangeRate);
  const totalIQD = cartCurrency === 'IQD' ? totalBase : convertCurrency(totalBase, 'USD', 'IQD', exchangeRate);

  // Installment is strictly eligible only for Mobiles and Tablets/iPads, not accessories-only carts
  const isInstallmentEligible = useMemo(() => {
    if ((cart?.length || 0) === 0) return false;
    return cart.some(item => {
      const type = (item.product.type || '').toLowerCase();
      const cat = (item.product.category || '').toLowerCase();
      const name = (item.product.name || '').toLowerCase();
      return type === 'mobile' || cat.includes('mobile') || cat.includes('tablet') || cat.includes('ipad') || name.includes('ipad') || name.includes('tablet') || name.includes('iphone') || name.includes('galaxy');
    });
  }, [cart]);

  // Complete Sale & Sync via OfflineSyncService (IndexedDB + Auto Cloud Sync)
  const handleCompleteSale = async (receipt: POSReceiptData) => {
    try {
      // 1. Optimistic React State Updates
      for (const item of cart) {
        if (item.product.type === 'mobile') {
          setMobiles(prev => prev.filter(m => m.id !== item.product.id));
        } else if (item.product.type === 'accessory') {
          setAccessories(prev => prev.map(a => {
            if (a.id === item.product.id) {
              const newQty = Math.max(0, a.quantity - item.quantity);
              const newStatus = newQty <= 0 ? 'out_of_stock' : (a.notifyThreshold && newQty <= a.notifyThreshold ? 'low_stock' : 'in_stock');
              return { ...a, quantity: newQty, status: newStatus, totalSold: (a.totalSold || 0) + item.quantity };
            }
            return a;
          }));
        }
      }

      // 2. Delegate to OfflineSyncService for atomic IndexedDB persistence & queueing
      const syncResult = await offlineSyncService.processPOSSaleOffline(receipt, cart, exchangeRate);

      setReceiptData(receipt);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      setCart([]);
      setSelectedCustomer(null);
      setCartSellType('cash');
      setGlobalDiscount({ value: 0, type: 'fixed' });
      sound.playPaymentSuccess();

      // 3. Immediately broadcast to iPhone Widgets in real time
      try {
        const cashierName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'Cashier POS';
        iosWidgetService.recordCashierSale(receipt, cashierName);
        iosWidgetService.syncWithDatabase();
      } catch (widgetErr) {
        console.warn('iPhone widget notification error:', widgetErr);
      }

      if (syncResult.isOfflineRecorded) {
        info(`Sale #${receipt.invoiceNo} saved locally (Offline Mode). It will synchronize automatically once online.`);
      } else {
        success(`Sale #${receipt.invoiceNo} completed and synced to cloud!`);
      }
    } catch (err) {
      console.error('Error recording sale in database:', err);
      sound.playAlert();
      toastError('Failed to record sale');
    }
  };

  // Direct Cash Sale: Instantly settles the sale in cash without opening secondary modals
  const handleDirectCashSale = async () => {
    if (isSubmittingSale) return;
    if ((cart?.length || 0) === 0) {
      sound.playAlert();
      toastError(t('pos.emptyCartPrompt', 'Please select at least one mobile, tablet, or item first'));
      return;
    }

    setIsSubmittingSale(true);
    sound.playClick();

    try {
      const now = new Date();
      const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
      const dateStr = now.toLocaleDateString();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const finalCustomer = {
        name: selectedCustomer?.name || 'Walk-in Customer',
        phone: selectedCustomer?.phone || undefined,
        type: selectedCustomer?.type || 'walkin'
      };

      const itemsSummary = cart.map(item => {
        const activePrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
        return {
          id: item.product.id,
          name: item.product.name,
          type: item.product.type,
          detail: item.product.detail,
          barcode: item.product.barcode,
          quantity: item.quantity,
          price: activePrice,
          currency: item.product.currency,
          discount: item.discount
        };
      });

      const finalTotal = cartCurrency === 'USD' ? totalUSD : totalIQD;
      const finalSubtotal = subtotalBase;

      const receipt: POSReceiptData = {
        invoiceNo,
        date: dateStr,
        time: timeStr,
        sellType: 'cash',
        customer: finalCustomer,
        items: itemsSummary,
        subtotal: finalSubtotal,
        discount: finalDiscountBase,
        tax: taxAmountBase,
        total: finalTotal,
        checkoutCurrency: cartCurrency,
        exchangeRate,

        // Direct cash payment specifics
        cashTendered: finalTotal,
        cashChange: 0,
        notes: undefined
      };

      await handleCompleteSale(receipt);
    } catch (err) {
      console.error('Direct cash sale execution error:', err);
      toastError('Failed to complete cash sale');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const handleNewSale = () => {
    setIsReceiptModalOpen(false);
    setReceiptData(null);
    setCart([]);
    setSelectedCustomer(null);
    setSearchTerm('');
    setCartSellType('cash');
    setLastAddedItemName('');
    setGlobalDiscount({ value: 0, type: 'fixed' });
    
    // Auto-focus search input after starting a new sale or closing receipt
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  };

  // F2 Keyboard shortcut for instant POS Checkout (Direct for Cash, Modal for Debt/Installment/Card)
  const handleF2CheckoutRef = useRef<() => void>();
  handleF2CheckoutRef.current = () => {
    if ((cart?.length || 0) > 0) {
      if (cartSellType === 'cash') {
        handleDirectCashSale();
      } else {
        sound.playClick();
        setIsPaymentModalOpen(true);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleF2CheckoutRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full flex flex-col gap-5 font-sans pb-36">
      
      {/* Top POS Toolbar: Search, Currencies, Exchange Rate, and View Controls */}
      <div className="bg-[#121829]/95 backdrop-blur-xl p-4 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 sticky top-2 z-40">
        
        {/* Autocomplete Search & Scanner Input */}
        <div className="flex-1 min-w-0">
          <ProductAutocompleteSearch
            inputRef={searchInputRef}
            placeholder={t('pos.searchPlaceholder')}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            products={combinedProducts}
            onSelectProduct={(product) => addToCart(product, false)}
            cart={cart}
            exchangeRate={exchangeRate}
            shortcutBadge="F2"
            onScan={() => setIsCameraScannerOpen(true)}
            scanTitle={t('pos.scanBarcode', 'Scan Barcode')}
            onSubmitSearch={handleBarcodeSubmit}
          />
        </div>

        {/* View Controls & Top Bar Cart Quick-Checkout Actions */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0 justify-end">
          
          {/* Quick Cart Pill & 1-Tap Complete Sale in Top Toolbar */}
          {cart.length > 0 && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsMobileCartOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                title={t('pos.viewCart', 'View Cart')}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-indigo-400" />
                <span>{cart.reduce((a, b) => a + b.quantity, 0)} {t('pos.items', 'items')}</span>
                <span className={cn("font-mono font-black", cartCurrency === 'USD' ? 'text-amber-400' : 'text-sky-400')}>
                  {formatCurrency(cartCurrency === 'USD' ? totalUSD : totalIQD, cartCurrency)}
                </span>
              </button>

              <button
                type="button"
                id="btn-pos-top-sale"
                disabled={isSubmittingSale}
                onClick={() => {
                  sound.playClick();
                  if (cartSellType === 'cash') {
                    handleDirectCashSale();
                  } else {
                    setIsPaymentModalOpen(true);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-950/50 border border-emerald-400/60 transition-all cursor-pointer active:scale-95"
                title={cartSellType === 'cash' ? t('pos.completeCashSale') : t('pos.completeSale')}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('pos.completeSale', 'Complete Sale')}</span>
              </button>
            </div>
          )}

          {/* Grid / List Switcher */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-all cursor-pointer",
                viewMode === 'grid' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
              )}
              title={t('pos.gridView', 'Grid View')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-all cursor-pointer",
                viewMode === 'list' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
              )}
              title={t('pos.listView', 'List View')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Left (Catalog) & Right (Cart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= LEFT COLUMN: CATALOG ================= */}
        <div id="pos-catalog-top" className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4 min-w-0">
          
          {/* Category Tabs & Brand Chips */}
          <div className="bg-[#121829] p-4 rounded-2xl border border-slate-800/80 shadow-md space-y-3">
            
            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {categories.map(cat => {
                const count = cat.id === 'all' 
                  ? (combinedProducts?.length || 0) 
                  : ((combinedProducts || []).filter(p => p.category === cat.id)?.length || 0);
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setSelectedBrand('all'); }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                      activeCategory === cat.id 
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                        : "bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
                    )}
                  >
                    <cat.icon className="w-3.5 h-3.5" />
                    <span>{t(cat.nameKey)}</span>
                    <span className={cn("ml-1 rtl:mr-1 rtl:ml-0 px-1.5 py-0.2 rounded-full text-[10px] font-mono", activeCategory === cat.id ? "bg-indigo-800 text-white" : "bg-slate-800 text-slate-400")}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Brand Filter Chips */}
            {(availableBrands?.length || 0) > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-800/60 scrollbar-thin text-xs">
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider shrink-0 mr-1">{t('pos.brand', 'Brand')}:</span>
                <button
                  type="button"
                  onClick={() => setSelectedBrand('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                    selectedBrand === 'all' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  )}
                >
                  {t('common.all', 'All')}
                </button>
                {availableBrands.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedBrand(b)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                      selectedBrand === b ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Catalog State / Products Display */}
          {isLoading ? (
            <div className="bg-[#121829] rounded-2xl border border-slate-800 p-12 flex flex-col items-center justify-center text-slate-400">
              <Sparkles className="animate-pulse w-8 h-8 text-indigo-400 mb-3" />
              <p className="font-semibold text-white">{t('pos.loadingInventory', 'Loading Inventory...')}</p>
              <p className="text-xs text-slate-500 mt-1">{t('pos.connectingDatabase', 'Connecting to cloud database')}</p>
            </div>
          ) : (filteredProducts?.length || 0) === 0 ? (
            <div className="bg-[#121829] rounded-2xl border border-slate-800 p-12 text-center flex flex-col items-center justify-center text-slate-400">
              <Search className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-white">{t('pos.noProductsFound', 'No products found')}</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {t('pos.noProductsMatch', { term: searchTerm, defaultValue: `No items match your search "${searchTerm}" or active filter. Try resetting filters or adding stock in the Mobiles or Accessories page.` })}
              </p>
              {(searchTerm || selectedBrand !== 'all' || activeCategory !== 'all') && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setSelectedBrand('all'); setActiveCategory('all'); }}
                  className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  {t('pos.resetAllFilters', 'Reset All Filters')}
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* ================= GRID VIEW ================= */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {paginatedProducts.map((p) => {
                  const dual = formatDualPrice(p.price, p.currency, exchangeRate);
                  const inCart = cart.find(c => c.product.id === p.id);
                  const isDevice = isSingleDeviceItem(p);
                  const isDeviceInCart = isDevice && Boolean(inCart);

                  return (
                  <div
                    key={`${p.id}-${p.type}`}
                    onClick={() => addToCart(p, true)}
                    className={cn(
                      "bg-[#121829] border rounded-2xl p-4 flex flex-col justify-between transition-all group relative overflow-hidden shadow-sm cursor-pointer",
                      isDeviceInCart
                        ? "border-emerald-500/70 bg-emerald-950/20 ring-2 ring-emerald-500/40 shadow-sm"
                        : inCart 
                          ? "border-indigo-500/80 bg-indigo-950/10 ring-1 ring-indigo-500/30 hover:shadow-lg hover:-translate-y-0.5" 
                          : "border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-lg hover:-translate-y-0.5"
                    )}
                  >
                    {/* Top Type & Condition Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center border",
                          isDeviceInCart
                            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                            : p.type === 'mobile' 
                              ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" 
                              : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                        )}>
                          {p.type === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{p.brand}</span>
                          <span className="text-[11px] font-mono text-slate-500 truncate max-w-[120px] block">{p.barcode}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {isDeviceInCart && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 animate-in fade-in duration-200">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>{t('pos.inCart', 'In Cart')}</span>
                          </span>
                        )}

                        {p.type === 'mobile' && p.condition && (
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            p.condition.includes('New') 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          )}>
                            {p.condition}
                          </span>
                        )}

                        {p.type === 'accessory' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                            {p.stock} in stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product Title */}
                    <h3 className={cn(
                      "font-bold text-sm leading-snug transition-colors mb-1 line-clamp-1",
                      isDeviceInCart ? "text-emerald-300" : "text-slate-100 group-hover:text-indigo-300"
                    )}>
                      {p.name}
                    </h3>

                    {/* Specs / Detail line */}
                    <p className="text-xs text-slate-400 mb-4 line-clamp-1 font-mono">
                      {p.detail}
                    </p>

                    {/* Price & Add to Cart action */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-auto">
                      <div>
                        <div className={cn("text-base font-black font-mono tracking-tight", dual.primaryColor)}>
                          {dual.primary}
                        </div>
                        <div className={cn("text-[11px] font-mono font-medium", dual.secondaryColor)}>
                          ≈ {dual.secondary}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {inCart && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              sound.playClick();
                              if (cartSellType === 'cash') {
                                handleDirectCashSale();
                              } else {
                                setIsPaymentModalOpen(true);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md flex items-center gap-1 cursor-pointer transition-all active:scale-95 animate-in fade-in"
                            title={t('pos.completeSale', 'Complete Sale')}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>{t('pos.sale', 'SALE')}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(p, true);
                          }}
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all cursor-pointer",
                            isDeviceInCart
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                              : inCart 
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                                : "bg-slate-800 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white border border-slate-700"
                          )}
                          title={isDeviceInCart ? t('pos.deviceAlreadyInCart', 'Selected - Click to unselect') : t('pos.addToCart', 'Add to Cart')}
                        >
                          {isDeviceInCart ? (
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          ) : inCart ? (
                            <span className="text-xs font-mono">{inCart.quantity}x</span>
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid View Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredProducts?.length || 0}
              pageSize={pageSize}
              pageSizeOptions={[12, 24, 48, 96]}
              onPageChange={(p) => {
                setCurrentPage(p);
                const el = document.getElementById('pos-catalog-top');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              itemLabel={t('common.products', 'products')}
              className="rounded-2xl border border-slate-800/80 shadow-md"
            />
          </div>
        ) : (
          /* ================= LIST VIEW ================= */
          <div className="bg-[#121829] rounded-2xl border border-slate-800/80 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs text-slate-300 divide-y divide-slate-800">
                <thead className="bg-[#0c111d] text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">{t('pos.productSpecs', 'Product & Specs')}</th>
                    <th className="py-3 px-3">{t('pos.identifierImei', 'Identifier / IMEI')}</th>
                    <th className="py-3 px-3">{t('pos.conditionStock', 'Condition / Stock')}</th>
                    <th className="py-3 px-4 text-right rtl:text-left">{t('pos.priceDual', 'Price (Dual Currency)')}</th>
                    <th className="py-3 px-4 text-center">{t('common.actions', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {paginatedProducts.map((p) => {
                    const dual = formatDualPrice(p.price, p.currency, exchangeRate);
                    const inCart = cart.find(c => c.product.id === p.id);
                    const isDevice = isSingleDeviceItem(p);
                    const isDeviceInCart = isDevice && Boolean(inCart);

                      return (
                        <tr 
                          key={`${p.id}-${p.type}`} 
                          onClick={() => addToCart(p, true)}
                          className={cn(
                            "transition-colors cursor-pointer",
                            isDeviceInCart
                              ? "bg-emerald-950/20 ring-1 ring-inset ring-emerald-500/40"
                              : inCart 
                                ? "bg-indigo-950/20 hover:bg-slate-800/50" 
                                : "hover:bg-slate-800/50"
                          )}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center border shrink-0",
                                isDeviceInCart
                                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                  : p.type === 'mobile' 
                                    ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" 
                                    : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                              )}>
                                {p.type === 'mobile' ? <Smartphone className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <div className="font-bold text-white text-xs flex items-center gap-2">
                                  <span className={isDeviceInCart ? "text-emerald-300" : ""}>{p.name}</span>
                                  {isDeviceInCart && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                      <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                                      {t('pos.inCart', 'In Cart')}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">{p.detail}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400 text-xs">
                            {p.barcode}
                          </td>
                          <td className="py-3 px-3">
                            {p.type === 'mobile' ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-semibold">
                                {p.condition || t('common.inStock', 'In Stock')}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-300 text-xs">{p.stock} {t('common.qty', 'units')}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right rtl:text-left font-mono">
                            <div className={cn("font-bold text-xs tracking-tight", dual.primaryColor)}>
                              {dual.primary}
                            </div>
                            <div className={cn("text-[10px] font-medium", dual.secondaryColor)}>
                              ≈ {dual.secondary}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              {inCart && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sound.playClick();
                                    if (cartSellType === 'cash') {
                                      handleDirectCashSale();
                                    } else {
                                      setIsPaymentModalOpen(true);
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-sm flex items-center gap-1 cursor-pointer transition-all active:scale-95 animate-in fade-in"
                                  title={t('pos.completeSale', 'Complete Sale')}
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>{t('pos.sale', 'SALE')}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(p, true);
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5",
                                  isDeviceInCart
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                                    : inCart 
                                      ? "bg-indigo-600 text-white" 
                                      : "bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700"
                                )}
                                title={isDeviceInCart ? t('pos.deviceAlreadyInCart', 'Selected - Click to unselect') : t('pos.addToCart', 'Add to Cart')}
                              >
                                {isDeviceInCart ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>{t('pos.inCart', 'In Cart')}</span>
                                  </>
                                ) : inCart ? (
                                  `${inCart.quantity}x`
                                ) : (
                                  t('pos.add', '+ Add')
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* List View Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredProducts?.length || 0}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                onPageChange={(p) => {
                  setCurrentPage(p);
                  const el = document.getElementById('pos-catalog-top');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                itemLabel={t('common.products', 'products')}
              />
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN: CART & CHECKOUT (Side-by-Side on Landscape Tablets & Desktop) ================= */}
        <div id="pos-cart-panel" className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col bg-[#121829] rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-5.5rem)]">
          
          {/* Cart Header */}
          <div className="p-3.5 border-b border-slate-800 bg-[#0c111d] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingCart className="h-5 w-5 text-indigo-400 shrink-0" />
              <h2 className="font-bold text-base tracking-wide text-white truncate">{t('pos.currentCart')}</h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-mono font-bold shrink-0">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button 
                onClick={clearCart} 
                disabled={(cart?.length || 0) === 0} 
                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer" 
                title={t('pos.clearCart')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Customer Selection Bar */}
          <div className="p-3 border-b border-slate-800 bg-[#0e1322] shrink-0">
            {isAddingCustomer ? (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 space-y-2 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>{t('pos.customerInfo')}</span>
                  <button onClick={() => setIsAddingCustomer(false)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={t('pos.customerFullName', 'Customer Full Name')}
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                />
                <input
                  type="tel"
                  placeholder={t('pos.phonePlaceholder', 'Phone Number (e.g. 0750 000 0000)')}
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (newCustomerName.trim()) {
                        setSelectedCustomer({ name: newCustomerName.trim(), type: 'custom', phone: newCustomerPhone.trim() });
                        setIsAddingCustomer(false);
                      }
                    }}
                    className="flex-1 py-1 bg-indigo-600 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    {t('pos.setCustomer', 'Set Customer')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedCustomer(null); setIsAddingCustomer(false); }}
                    className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                  >
                    {t('pos.resetWalkIn', 'Reset to Walk-in')}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => setIsAddingCustomer(true)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-300 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 bg-slate-800 rounded-md text-indigo-400 shrink-0">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-left rtl:text-right min-w-0">
                    <span className="font-semibold text-white block truncate">
                      {selectedCustomer ? selectedCustomer.name : t('pos.walkInCustomer', 'Walk-in Customer')}
                    </span>
                    {selectedCustomer?.phone && (
                      <span className="text-[10px] text-slate-400 font-mono block truncate">{selectedCustomer.phone}</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-indigo-400 font-medium hover:underline shrink-0 ml-2">{t('pos.change', 'Change')}</span>
              </button>
            )}
          </div>

          {/* Cart Item Rows (Scrollable inner area) */}
          <div className="flex-1 min-h-[90px] max-h-[220px] sm:max-h-[260px] xl:max-h-[280px] overflow-y-auto p-3 space-y-2 bg-[#090d15]/60 divide-y divide-slate-800/40">
            {(cart?.length || 0) === 0 ? (
              <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-slate-500 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <p className="font-semibold text-slate-400 text-xs">{t('pos.emptyCart')}</p>
                <p className="text-[11px] text-slate-500 text-center max-w-[200px]">
                  {t('pos.scanPrompt')}
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const itemDual = formatDualPrice(item.product.price * item.quantity, item.product.currency, exchangeRate);

                return (
                  <div key={item.cartId} className="pt-2 first:pt-0 flex flex-col gap-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-bold text-xs text-slate-200 truncate">{item.product.name}</h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className={cn("text-[10px] font-mono shrink-0 font-medium", item.product.currency === 'USD' ? 'text-amber-400' : 'text-sky-400')}>
                            {formatCurrency(item.product.price, item.product.currency)} {t('pos.each', 'ea')}
                          </span>
                          {item.product.barcode && (
                            <span className="text-[9px] text-slate-500 font-mono truncate max-w-[110px]">
                              #{item.product.barcode}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button 
                          onClick={() => setActiveItemDiscount(item)}
                          className="p-1 text-slate-500 hover:text-indigo-400 rounded transition-colors cursor-pointer"
                          title={t('pos.itemDiscount', 'Item Discount')}
                        >
                          <Percent className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => removeFromCart(item.cartId)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                          title={t('pos.removeItem', 'Remove item')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      {/* Quantity Controls & Price Edit Button */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {item.product.type === 'accessory' ? (
                          <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 overflow-hidden h-6">
                            <button 
                              onClick={() => updateQuantity(item.cartId, -1)} 
                              className="w-6 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-mono font-bold text-white">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.cartId, 1)} 
                              className="w-6 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/25 rounded-lg h-6 px-2.5">
                            <Smartphone className="w-3 h-3 text-indigo-400" />
                            <span className="text-[10px] font-semibold text-indigo-300">
                              {t('pos.singleDevice', 'Single Device')}
                            </span>
                          </div>
                        )}

                        {/* Price Edit Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPriceItem(item);
                            setTempEditPrice((item.customPrice !== undefined ? item.customPrice : item.product.price).toString());
                          }}
                          className={cn(
                            "h-6 px-2 rounded-lg border flex items-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer",
                            item.customPrice !== undefined && item.customPrice !== item.product.price
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-indigo-300 hover:border-indigo-500/40"
                          )}
                          title={t('pos.editUnitPrice', 'Edit Unit Price')}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{t('common.price', 'Price')}</span>
                        </button>
                      </div>

                      {/* Line Item Total */}
                      <div className="text-right font-mono shrink-0 ml-auto max-w-[120px]">
                        <div className={cn("font-bold text-xs truncate", itemDual.primaryColor)} title={itemDual.primary}>
                          {itemDual.primary}
                        </div>
                        <div className={cn("text-[9px] truncate font-medium", itemDual.secondaryColor)} title={itemDual.secondary}>
                          ≈ {itemDual.secondary}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Bottom Summary & THE 4 SALE BUTTONS (Always Fixed & 100% Fully Visible) */}
          <div className="bg-[#0c111d] border-t border-slate-800 p-3.5 space-y-3 shrink-0 shadow-2xl">
            
            {/* Totals Breakdown */}
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>{t('pos.subtotal')} ({cartCurrency === 'USD' ? 'USD' : 'IQD'})</span>
                <span className="font-mono text-slate-200 font-semibold">{formatCurrency(subtotalBase, cartCurrency)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400">{t('pos.discount')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempGlobalDiscount({ ...globalDiscount });
                      setIsGlobalDiscountOpen(true);
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
                  >
                    {globalDiscount.value > 0 ? t('common.edit', 'Edit') : `+ ${t('pos.addDiscount', 'Add')}`}
                  </button>
                </span>
                {finalDiscountBase > 0 ? (
                  <div className="flex items-center gap-1.5 font-mono text-emerald-400">
                    <span>-{formatCurrency(finalDiscountBase, cartCurrency)}</span>
                    <button
                      type="button"
                      onClick={() => setGlobalDiscount({ value: 0, type: 'fixed' })}
                      className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                      title={t('common.clear', 'Clear')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="font-mono text-slate-500">{formatCurrency(0, cartCurrency)}</span>
                )}
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs sm:text-sm font-bold text-white">{t('pos.total')}</span>
                <div className="text-right font-mono">
                  <span className={cn(
                    "text-lg sm:text-xl font-black block tracking-tight leading-tight",
                    cartCurrency === 'USD' ? 'text-amber-400' : 'text-sky-400'
                  )}>
                    {formatCurrency(cartCurrency === 'USD' ? totalUSD : totalIQD, cartCurrency)}
                  </span>
                  <span className={cn(
                    "text-[11px] font-medium",
                    cartCurrency === 'USD' ? 'text-sky-400/80' : 'text-amber-400/80'
                  )}>
                    ≈ {formatCurrency(cartCurrency === 'USD' ? totalIQD : totalUSD, cartCurrency === 'USD' ? 'IQD' : 'USD')}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct 4 Sale Action Buttons (Cash, Card, Debt, Installment) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/90">
              <div className="flex items-center justify-between pb-0.5">
                <span className="text-[11px] font-extrabold text-slate-200 tracking-wide flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('pos.saleType')}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">F2: {t('pos.fastPay', 'Fast Pay')}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 1. CASH SALE */}
                <button
                  type="button"
                  id="btn-pos-checkout-cash"
                  onClick={() => handleSelectPaymentMethod('cash')}
                  className={cn(
                    "py-3 px-2.5 rounded-xl border flex items-center justify-between font-bold text-xs transition-all cursor-pointer shadow-md group relative active:scale-[0.98]",
                    cartSellType === 'cash'
                      ? "bg-gradient-to-br from-emerald-600/30 via-emerald-700/25 to-teal-900/40 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/80 shadow-emerald-950/40 hover:border-emerald-400"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-emerald-500/40 hover:bg-slate-800/60 hover:text-emerald-300"
                  )}
                  title={t('pos.cash')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                      cartSellType === 'cash'
                        ? "bg-emerald-500/30 border-emerald-400 text-emerald-300"
                        : "bg-slate-800/80 border-slate-700 text-slate-400"
                    )}>
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div className="text-left rtl:text-right truncate">
                      <div className={cn(
                        "text-[13px] font-bold leading-tight truncate",
                        cartSellType === 'cash' ? "text-white" : "text-slate-300"
                      )}>
                        {t('pos.cash')}
                      </div>
                    </div>
                  </div>
                  {cartSellType === 'cash' ? (
                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 shrink-0 flex items-center gap-1 shadow-md hover:bg-emerald-400 animate-in fade-in duration-150">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>{t('pos.sale', 'SALE')}</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-400 shrink-0">
                      {t('pos.default', 'Default')}
                    </span>
                  )}
                </button>

                {/* 2. CARD / BANK */}
                <button
                  type="button"
                  id="btn-pos-checkout-card"
                  onClick={() => handleSelectPaymentMethod('card')}
                  className={cn(
                    "py-3 px-2.5 rounded-xl border flex items-center justify-between font-bold text-xs transition-all cursor-pointer shadow-md group relative active:scale-[0.98]",
                    cartSellType === 'card'
                      ? "bg-gradient-to-br from-indigo-600/30 via-indigo-700/25 to-slate-900/40 border-indigo-500 text-indigo-100 ring-2 ring-indigo-500/80 shadow-indigo-950/40 hover:border-indigo-400"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-indigo-500/40 hover:bg-slate-800/60 hover:text-indigo-300"
                  )}
                  title={t('pos.card')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                      cartSellType === 'card'
                        ? "bg-indigo-500/30 border-indigo-400 text-indigo-300"
                        : "bg-slate-800/80 border-slate-700 text-slate-400"
                    )}>
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="text-left rtl:text-right truncate">
                      <div className={cn(
                        "text-[13px] font-bold leading-tight truncate",
                        cartSellType === 'card' ? "text-white" : "text-slate-300"
                      )}>
                        {t('pos.card')}
                      </div>
                    </div>
                  </div>
                  {cartSellType === 'card' ? (
                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-indigo-500 text-white shrink-0 flex items-center gap-1 shadow-md hover:bg-indigo-400 animate-in fade-in duration-150">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>{t('pos.sale', 'SALE')}</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-400 shrink-0">
                      {t('pos.cardBadge', 'Card')}
                    </span>
                  )}
                </button>

                {/* 3. DEBT SALE */}
                <button
                  type="button"
                  id="btn-pos-checkout-debt"
                  onClick={() => handleSelectPaymentMethod('debt')}
                  className={cn(
                    "py-3 px-2.5 rounded-xl border flex items-center justify-between font-bold text-xs transition-all cursor-pointer shadow-md group relative active:scale-[0.98]",
                    cartSellType === 'debt'
                      ? "bg-gradient-to-br from-amber-600/30 via-amber-700/25 to-slate-900/40 border-amber-500 text-amber-100 ring-2 ring-amber-500/80 shadow-amber-950/40 hover:border-amber-400"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-amber-500/40 hover:bg-slate-800/60 hover:text-amber-300"
                  )}
                  title={t('pos.debt')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                      cartSellType === 'debt'
                        ? "bg-amber-500/30 border-amber-400 text-amber-300"
                        : "bg-slate-800/80 border-slate-700 text-slate-400"
                    )}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="text-left rtl:text-right truncate">
                      <div className={cn(
                        "text-[13px] font-bold leading-tight truncate",
                        cartSellType === 'debt' ? "text-white" : "text-slate-300"
                      )}>
                        {t('pos.debt')}
                      </div>
                    </div>
                  </div>
                  {cartSellType === 'debt' ? (
                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-amber-500 text-slate-950 shrink-0 flex items-center gap-1 shadow-md hover:bg-amber-400 animate-in fade-in duration-150">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>{t('pos.sale', 'SALE')}</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-400 shrink-0">
                      {t('pos.debtBadge', 'Ledger')}
                    </span>
                  )}
                </button>

                {/* 4. INSTALLMENT SALE */}
                <button
                  type="button"
                  id="btn-pos-checkout-installment"
                  onClick={() => handleSelectPaymentMethod('installment')}
                  className={cn(
                    "py-3 px-2.5 rounded-xl border flex items-center justify-between font-bold text-xs transition-all cursor-pointer shadow-md group relative active:scale-[0.98]",
                    cartSellType === 'installment'
                      ? "bg-gradient-to-br from-cyan-600/30 via-cyan-700/25 to-slate-900/40 border-cyan-500 text-cyan-100 ring-2 ring-cyan-500/80 shadow-cyan-950/40 hover:border-cyan-400"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-cyan-500/40 hover:bg-slate-800/60 hover:text-cyan-300"
                  )}
                  title={t('pos.installment')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                      cartSellType === 'installment'
                        ? "bg-cyan-500/30 border-cyan-400 text-cyan-300"
                        : "bg-slate-800/80 border-slate-700 text-slate-400"
                    )}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="text-left rtl:text-right truncate">
                      <div className={cn(
                        "text-[13px] font-bold leading-tight truncate",
                        cartSellType === 'installment' ? "text-white" : "text-slate-300"
                      )}>
                        {t('pos.installment')}
                      </div>
                    </div>
                  </div>
                  {cartSellType === 'installment' ? (
                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-cyan-400 text-slate-950 shrink-0 flex items-center gap-1 shadow-md hover:bg-cyan-300 animate-in fade-in duration-150">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>{t('pos.sale', 'SALE')}</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-400 shrink-0">
                      {t('pos.installmentBadge', 'Plan')}
                    </span>
                  )}
                </button>
              </div>

              {/* DEDICATED PROMINENT "SALE BUTTON" */}
              <div className="pt-2">
                <button
                  type="button"
                  id="btn-pos-main-sale"
                  disabled={isSubmittingSale || (cart?.length || 0) === 0}
                  onClick={() => {
                    if ((cart?.length || 0) === 0) {
                      sound.playAlert();
                      toastError(t('pos.emptyCartPrompt', 'Please select at least one mobile, tablet, or item first'));
                      return;
                    }
                    if (cartSellType === 'cash') {
                      handleDirectCashSale();
                    } else {
                      sound.playClick();
                      setIsPaymentModalOpen(true);
                    }
                  }}
                  className={cn(
                    "w-full py-3.5 px-4 rounded-xl flex items-center justify-between font-black transition-all cursor-pointer shadow-xl group relative active:scale-[0.98] border",
                    isSubmittingSale ? "opacity-75 cursor-wait" : "",
                    (cart?.length || 0) > 0
                      ? cartSellType === 'cash'
                        ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60 border-emerald-400/60 ring-2 ring-emerald-500/40"
                        : cartSellType === 'card'
                          ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-950/60 border-indigo-400/60 ring-2 ring-indigo-500/40"
                          : cartSellType === 'debt'
                            ? "bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-950/60 border-amber-400/60 ring-2 ring-amber-500/40"
                            : "bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-700 hover:from-cyan-500 hover:to-teal-500 text-white shadow-cyan-950/60 border-cyan-400/60 ring-2 ring-cyan-500/40"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700"
                  )}
                  title={cartSellType === 'cash' ? t('pos.completeCashSale') : t('payment.confirm')}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                      {isSubmittingSale ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-left rtl:text-right truncate">
                      <div className="text-sm sm:text-base font-black text-white leading-tight flex items-center gap-1.5 truncate">
                        <span>
                          {t('pos.completeSale', 'Complete Sale')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm sm:text-base font-black font-mono tracking-tight text-white drop-shadow">
                      {formatCurrency(cartCurrency === 'USD' ? totalUSD : totalIQD, cartCurrency)}
                    </span>
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-white/20 border border-white/30 text-white shadow-sm flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{t('pos.sale', 'SALE')}</span>
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Item Price Modal */}
      {editingPriceItem && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121829] rounded-2xl border border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 bg-[#0c111d] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">{t('pos.editCustomPrice', 'Edit Custom Price')}</h3>
              </div>
              <button 
                onClick={() => setEditingPriceItem(null)} 
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-xs">
              <div>
                <p className="text-slate-200 font-bold text-sm truncate">{editingPriceItem.product.name}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {t('pos.originalPrice', 'Original Price:')} <span className="font-mono font-semibold text-slate-300">{formatCurrency(editingPriceItem.product.price, editingPriceItem.product.currency)}</span>
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  {t('pos.newUnitPrice', { currency: editingPriceItem.product.currency, defaultValue: `New Unit Price (${editingPriceItem.product.currency})` })}
                </label>
                <div className="relative">
                  <span className={cn("absolute start-3 top-1/2 -translate-y-1/2 font-bold", editingPriceItem.product.currency === 'USD' ? 'text-amber-400' : 'text-sky-400')}>
                    {editingPriceItem.product.currency === 'USD' ? '$' : 'IQD'}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatNumberWithCommas(tempEditPrice)}
                    onChange={(e) => setTempEditPrice(e.target.value.replace(/,/g, ''))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 ps-8 pe-3 text-white font-mono text-base font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Reset or Apply */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCart(cart.map(item => item.cartId === editingPriceItem.cartId ? { ...item, customPrice: undefined } : item));
                    setEditingPriceItem(null);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
                >
                  {t('pos.resetOriginal', 'Reset Original')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseFloat(tempEditPrice);
                    if (!isNaN(parsed) && parsed >= 0) {
                      setCart(cart.map(item => item.cartId === editingPriceItem.cartId ? { ...item, customPrice: parsed } : item));
                    }
                    setEditingPriceItem(null);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {t('pos.savePrice', 'Save Price')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Line Item Discount Modal */}
      {activeItemDiscount && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121829] rounded-2xl border border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 bg-[#0c111d] flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">{t('pos.applyItemDiscount', 'Apply Item Discount')}</h3>
              <button onClick={() => setActiveItemDiscount(null)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">
                <button 
                  className={cn("flex-1 py-1.5 font-medium rounded-md cursor-pointer", activeItemDiscount.discountType === 'percentage' ? "bg-indigo-600 text-white" : "text-slate-400")}
                  onClick={() => setActiveItemDiscount({...activeItemDiscount, discountType: 'percentage'})}
                >
                  {t('pos.percentage', 'Percentage (%)')}
                </button>
                <button 
                  className={cn("flex-1 py-1.5 font-medium rounded-md cursor-pointer", activeItemDiscount.discountType === 'fixed' ? "bg-indigo-600 text-white" : "text-slate-400")}
                  onClick={() => setActiveItemDiscount({...activeItemDiscount, discountType: 'fixed'})}
                >
                  {t('pos.fixedAmount', 'Fixed ($ Amount)')}
                </button>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{t('pos.discountValue', 'Discount Value')}</label>
                <input 
                  type="number" 
                  value={activeItemDiscount.discount || ''}
                  onChange={(e) => setActiveItemDiscount({...activeItemDiscount, discount: Number(e.target.value)})}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white font-mono"
                  placeholder="0"
                />
              </div>

              <button 
                onClick={() => {
                  setCart(cart.map(i => i.cartId === activeItemDiscount.cartId ? activeItemDiscount : i));
                  setActiveItemDiscount(null);
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer"
              >
                {t('pos.applyDiscount', 'Apply Discount')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Order Discount Modal */}
      {isGlobalDiscountOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121829] rounded-2xl border border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 bg-[#0c111d] flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">{t('pos.applyCartDiscount', 'Order Discount')}</h3>
              <button onClick={() => setIsGlobalDiscountOpen(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">
                <button 
                  type="button"
                  className={cn("flex-1 py-1.5 font-medium rounded-md cursor-pointer transition-colors", tempGlobalDiscount.type === 'percentage' ? "bg-indigo-600 text-white" : "text-slate-400")}
                  onClick={() => setTempGlobalDiscount(prev => ({ ...prev, type: 'percentage' }))}
                >
                  {t('pos.percentage', 'Percentage (%)')}
                </button>
                <button 
                  type="button"
                  className={cn("flex-1 py-1.5 font-medium rounded-md cursor-pointer transition-colors", tempGlobalDiscount.type === 'fixed' ? "bg-indigo-600 text-white" : "text-slate-400")}
                  onClick={() => setTempGlobalDiscount(prev => ({ ...prev, type: 'fixed' }))}
                >
                  {t('pos.fixedAmount', `Fixed (${cartCurrency})`)}
                </button>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t('pos.discountValue', 'Discount Value')}</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0"
                    step="any"
                    value={tempGlobalDiscount.value || ''}
                    onChange={(e) => setTempGlobalDiscount(prev => ({ ...prev, value: Math.max(0, Number(e.target.value)) }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white font-mono pr-8 focus:border-indigo-500 focus:outline-none"
                    placeholder="0"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">
                    {tempGlobalDiscount.type === 'percentage' ? '%' : cartCurrency}
                  </span>
                </div>
              </div>

              {/* Quick Percentage Presets */}
              {tempGlobalDiscount.type === 'percentage' && (
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[5, 10, 15, 20].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setTempGlobalDiscount({ value: pct, type: 'percentage' })}
                      className={cn(
                        "py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer",
                        tempGlobalDiscount.value === pct
                          ? "bg-indigo-600 border-indigo-400 text-white"
                          : "bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setGlobalDiscount({ value: 0, type: 'fixed' });
                    setIsGlobalDiscountOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  {t('common.clear', 'Clear')}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setGlobalDiscount(tempGlobalDiscount);
                    setIsGlobalDiscountOpen(false);
                    sound.playClick();
                  }}
                  className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-lg shadow-indigo-600/30"
                >
                  {t('pos.applyDiscount', 'Apply Discount')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={handleScannedCode}
        title={t('pos.cameraScannerTitle', 'POS Live Barcode & IMEI Scanner')}
        subtitle={t('pos.cameraScannerSubtitle', 'Auto-detects products & adds instantly to active checkout cart')}
        placeholder={t('pos.cameraScannerPlaceholder', 'Scan or type barcode / IMEI...')}
        continuousMode={true}
      />

      {/* Checkout & Payment Modal */}
      <POSPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        cart={cart}
        subtotal={subtotalBase}
        discount={finalDiscountBase}
        taxAmount={taxAmountBase}
        totalUSD={totalUSD}
        totalIQD={totalIQD}
        exchangeRate={exchangeRate}
        cartCurrency={cartCurrency}
        customer={selectedCustomer}
        initialSellType={cartSellType}
        isInstallmentEligible={isInstallmentEligible}
        onCompleteSale={handleCompleteSale}
      />

      {/* Receipt & Thermal Print Modal */}
      <POSReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={handleNewSale}
        onNewSale={handleNewSale}
        receiptData={receiptData}
      />

      {/* Screen Protector Quick Compatibility Finder */}
      <ScreenProtectorFinderModal
        isOpen={isScreenProtectorFinderOpen}
        onClose={() => setIsScreenProtectorFinderOpen(false)}
        accessories={accessories}
        onSelectAccessory={(item) => {
          const productToAdd = {
            id: item.id,
            type: 'accessory' as const,
            category: 'Accessories',
            brand: item.brand || 'General',
            name: item.name,
            detail: `${item.brand || ''} • ${item.category || 'Screen Protector'}${item.compatibility ? ' • ' + item.compatibility : ''}`,
            price: item.sellPrice || item.price || 0,
            currency: (item.currency || 'USD') as 'USD' | 'IQD',
            stock: item.quantity || 1,
            barcode: item.barcode || item.sku || item.id,
            condition: 'New',
            originalData: item
          };
          addToCart(productToAdd);
        }}
      />

      {/* Offline & Sync Center Modal */}
      <OfflineSyncModal
        isOpen={isOfflineSyncOpen}
        onClose={() => setIsOfflineSyncOpen(false)}
      />

      {/* Mobile & Tablet Floating Smart Quick-Checkout Bar */}
      <div className="lg:hidden">
        <POSFloatingBar
          cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
          totalUSD={totalUSD}
          totalIQD={totalIQD}
          cartCurrency={cartCurrency}
          cartSellType={cartSellType}
          onSelectPaymentMethod={handleSelectPaymentMethod}
          onOpenCart={() => setIsMobileCartOpen(true)}
          onCompleteSale={() => {
            if ((cart?.length || 0) === 0) {
              sound.playAlert();
              toastError(t('pos.emptyCartPrompt', 'Please select at least one mobile, tablet, or item first'));
              return;
            }
            if (cartSellType === 'cash') {
              handleDirectCashSale();
            } else {
              sound.playClick();
              setIsPaymentModalOpen(true);
            }
          }}
          isSubmittingSale={isSubmittingSale}
          selectedCustomer={selectedCustomer}
          lastAddedItemName={lastAddedItemName}
        />
      </div>

      {/* Mobile & Tablet Slide-Up Cart Drawer */}
      <POSCartDrawer
        isOpen={isMobileCartOpen}
        onClose={() => setIsMobileCartOpen(false)}
        cart={cart}
        cartCurrency={cartCurrency}
        exchangeRate={exchangeRate}
        subtotalBase={subtotalBase}
        finalDiscountBase={finalDiscountBase}
        taxAmountBase={0}
        totalUSD={totalUSD}
        totalIQD={totalIQD}
        globalDiscount={globalDiscount}
        onOpenGlobalDiscount={() => {
          setTempGlobalDiscount({ ...globalDiscount });
          setIsGlobalDiscountOpen(true);
        }}
        onClearGlobalDiscount={() => setGlobalDiscount({ value: 0, type: 'fixed' })}
        cartSellType={cartSellType}
        onSelectPaymentMethod={handleSelectPaymentMethod}
        onCompleteSale={() => {
          setIsMobileCartOpen(false);
          if ((cart?.length || 0) === 0) {
            sound.playAlert();
            toastError(t('pos.emptyCartPrompt', 'Please select at least one mobile, tablet, or item first'));
            return;
          }
          if (cartSellType === 'cash') {
            handleDirectCashSale();
          } else {
            sound.playClick();
            setIsPaymentModalOpen(true);
          }
        }}
        isSubmittingSale={isSubmittingSale}
        clearCart={clearCart}
        removeFromCart={removeFromCart}
        updateQuantity={updateQuantity}
        onEditItemPrice={(item) => {
          setEditingPriceItem(item);
          setTempEditPrice((item.customPrice !== undefined ? item.customPrice : item.product.price).toString());
        }}
        onApplyItemDiscount={(item) => setActiveItemDiscount(item)}
        selectedCustomer={selectedCustomer}
        isAddingCustomer={isAddingCustomer}
        setIsAddingCustomer={setIsAddingCustomer}
        newCustomerName={newCustomerName}
        setNewCustomerName={setNewCustomerName}
        newCustomerPhone={newCustomerPhone}
        setNewCustomerPhone={setNewCustomerPhone}
        onSetCustomer={setSelectedCustomer}
      />
    </div>
  );
}
