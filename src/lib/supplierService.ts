import { supabase, isSupabaseConfigured } from './supabase';
import { idb } from './idbService';
import { 
  Supplier, 
  SupplierPurchaseInvoice, 
  SupplierPaymentVoucher, 
  SupplierStatementItem 
} from '../types/supplier';
import { 
  SupplierReturnItem, 
  SupplierReturnStats,
  SupplierReturnStatus
} from '../types/supplierReturn';

export function toValidUUID(id?: string): string {
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  let hex = '';
  for (let i = 0; i < (id?.length || 0); i++) {
    hex += id.charCodeAt(i).toString(16);
  }
  hex = hex.padEnd(32, '0').slice(0, 32);
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-4' + hex.slice(13, 16) + '-a' + hex.slice(17, 20) + '-' + hex.slice(20, 32);
}

export function mapSupplierToDb(s: Supplier) {
  let notesPayload = '';
  try {
    notesPayload = JSON.stringify({
      contactPerson: s.contactPerson,
      whatsapp: s.whatsapp,
      city: s.city,
      country: s.country,
      taxNumber: s.taxNumber,
      categoriesSupplied: s.categoriesSupplied,
      paymentTerms: s.paymentTerms,
      currency: s.currency,
      openingBalanceUSD: s.openingBalanceUSD,
      openingBalanceIQD: s.openingBalanceIQD,
      totalPurchasesUSD: s.totalPurchasesUSD,
      totalPurchasesIQD: s.totalPurchasesIQD,
      totalPaidUSD: s.totalPaidUSD,
      totalPaidIQD: s.totalPaidIQD,
      currentDebtUSD: s.currentDebtUSD,
      currentDebtIQD: s.currentDebtIQD,
      creditLimitUSD: s.creditLimitUSD,
      creditLimitIQD: s.creditLimitIQD,
      rating: s.rating,
      notes: s.notes
    });
  } catch {}

  return {
    id: toValidUUID(s.id),
    name: s.name,
    company: s.companyType || 'distributor',
    phone: s.phone || null,
    secondary_phone: s.secondaryPhone || null,
    email: s.email || null,
    address: [s.address, s.city, s.country].filter(Boolean).join(', ') || null,
    notes: notesPayload || s.notes || null,
    status: s.status || 'active',
    created_at: s.createdAt || new Date().toISOString(),
    updated_at: s.updatedAt || new Date().toISOString()
  };
}

export function mapDbToSupplier(row: any, fallback?: Supplier): Supplier {
  let parsedMeta: any = {};
  if (row.notes && typeof row.notes === 'string') {
    try {
      if (row.notes.startsWith('{') && row.notes.endsWith('}')) {
        parsedMeta = JSON.parse(row.notes);
      }
    } catch {}
  }

  return {
    id: row.id,
    name: row.name || fallback?.name || 'Unnamed Supplier',
    companyType: (parsedMeta.companyType || row.company || fallback?.companyType || 'distributor') as any,
    contactPerson: parsedMeta.contactPerson || fallback?.contactPerson || row.name,
    phone: row.phone || fallback?.phone || '',
    secondaryPhone: row.secondary_phone || fallback?.secondaryPhone || '',
    email: row.email || fallback?.email || '',
    whatsapp: parsedMeta.whatsapp || fallback?.whatsapp || '',
    address: row.address || fallback?.address || '',
    city: parsedMeta.city || fallback?.city || '',
    country: parsedMeta.country || fallback?.country || 'Iraq',
    taxNumber: parsedMeta.taxNumber || fallback?.taxNumber || '',
    categoriesSupplied: parsedMeta.categoriesSupplied || fallback?.categoriesSupplied || ['Mobile Phones', 'Accessories'],
    paymentTerms: parsedMeta.paymentTerms || fallback?.paymentTerms || 'Cash on Delivery',
    currency: parsedMeta.currency || fallback?.currency || 'USD',
    openingBalanceUSD: Number(parsedMeta.openingBalanceUSD ?? fallback?.openingBalanceUSD ?? 0),
    openingBalanceIQD: Number(parsedMeta.openingBalanceIQD ?? fallback?.openingBalanceIQD ?? 0),
    totalPurchasesUSD: Number(parsedMeta.totalPurchasesUSD ?? fallback?.totalPurchasesUSD ?? 0),
    totalPurchasesIQD: Number(parsedMeta.totalPurchasesIQD ?? fallback?.totalPurchasesIQD ?? 0),
    totalPaidUSD: Number(parsedMeta.totalPaidUSD ?? fallback?.totalPaidUSD ?? 0),
    totalPaidIQD: Number(parsedMeta.totalPaidIQD ?? fallback?.totalPaidIQD ?? 0),
    currentDebtUSD: Number(parsedMeta.currentDebtUSD ?? fallback?.currentDebtUSD ?? 0),
    currentDebtIQD: Number(parsedMeta.currentDebtIQD ?? fallback?.currentDebtIQD ?? 0),
    creditLimitUSD: parsedMeta.creditLimitUSD ?? fallback?.creditLimitUSD,
    creditLimitIQD: parsedMeta.creditLimitIQD ?? fallback?.creditLimitIQD,
    rating: Number(parsedMeta.rating ?? fallback?.rating ?? 5),
    status: (row.status || fallback?.status || 'active') as any,
    notes: parsedMeta.notes || (!row.notes?.startsWith('{') ? row.notes : '') || fallback?.notes || '',
    createdAt: row.created_at || fallback?.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || fallback?.updatedAt || new Date().toISOString()
  };
}

const SUPPLIERS_STORAGE_KEY = 'nali_suppliers_data';
const INVOICES_STORAGE_KEY = 'nali_supplier_invoices_data';
const PAYMENTS_STORAGE_KEY = 'nali_supplier_payments_data';
const RETURNS_STORAGE_KEY = 'nali_supplier_returns_data';

// Initial realistic seed suppliers
const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup_001',
    name: 'Apple Regional Distribution MEA',
    companyType: 'distributor',
    contactPerson: 'Sarkawt Barzan',
    phone: '+964 750 441 8899',
    secondaryPhone: '+964 770 120 3344',
    email: 'mea.distrib@apple-partner.iq',
    whatsapp: '+9647504418899',
    address: 'Empire World Business Tower C, 8th Floor',
    city: 'Erbil',
    country: 'Iraq (Kurdistan)',
    taxNumber: 'IQ-ERB-992014',
    categoriesSupplied: ['Apple iPhones', 'iPads & Tablets', 'Original Apple Cables & Adapters', 'Apple Watch'],
    paymentTerms: 'Net 15 Days',
    currency: 'USD',
    openingBalanceUSD: 0,
    openingBalanceIQD: 0,
    totalPurchasesUSD: 24500,
    totalPurchasesIQD: 0,
    totalPaidUSD: 18500,
    totalPaidIQD: 0,
    currentDebtUSD: 6000,
    currentDebtIQD: 0,
    creditLimitUSD: 15000,
    rating: 5,
    status: 'active',
    notes: 'Primary supplier for factory-sealed Apple devices with official 1-year regional warranty.',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'sup_002',
    name: 'Samsung Regional Hub (Al-Nakheel Electronics)',
    companyType: 'distributor',
    contactPerson: 'Ali Qasim Al-Basri',
    phone: '+964 770 555 1234',
    secondaryPhone: '+964 780 999 8877',
    email: 'ali.sales@alnakheel-tech.com',
    whatsapp: '+9647705551234',
    address: 'Karrada Outer Street, Tech Trade Plaza',
    city: 'Baghdad',
    country: 'Iraq',
    taxNumber: 'BG-TX-88310',
    categoriesSupplied: ['Samsung Galaxy S Series', 'Galaxy A Series', 'Galaxy Fold & Flip', 'Samsung Buds'],
    paymentTerms: 'Weekly Settlement',
    currency: 'USD',
    openingBalanceUSD: 0,
    openingBalanceIQD: 0,
    totalPurchasesUSD: 16200,
    totalPurchasesIQD: 0,
    totalPaidUSD: 12800,
    totalPaidIQD: 0,
    currentDebtUSD: 3400,
    currentDebtIQD: 0,
    creditLimitUSD: 10000,
    rating: 5,
    status: 'active',
    notes: 'Official Samsung MEA authorized dealer. Fast dispatch via weekly Erbil courier.',
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'sup_003',
    name: 'Anker & Baseus Direct Import (TechZone Trading)',
    companyType: 'importer',
    contactPerson: 'Hawre Sleman',
    phone: '+964 750 312 9900',
    email: 'info@techzone-accessories.com',
    whatsapp: '+9647503129900',
    address: 'Salim Street, Qazi Muhammad Commercial Center',
    city: 'Sulaymaniyah',
    country: 'Iraq (Kurdistan)',
    taxNumber: 'SUL-ACC-44910',
    categoriesSupplied: ['Chargers & Adapters', 'Power Banks', 'Cables & Adapters', 'Wireless Audio', 'Car Holders'],
    paymentTerms: 'Cash / 30% Down Payment',
    currency: 'USD',
    openingBalanceUSD: 0,
    openingBalanceIQD: 0,
    totalPurchasesUSD: 7850,
    totalPurchasesIQD: 4500000,
    totalPaidUSD: 6650,
    totalPaidIQD: 4500000,
    currentDebtUSD: 1200,
    currentDebtIQD: 0,
    creditLimitUSD: 5000,
    rating: 4,
    status: 'active',
    notes: 'Official distributor for Anker GaN Prime chargers and Baseus automotive mounts.',
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: 'sup_004',
    name: 'Hawler Mobile Wholesale & Trade-ins',
    companyType: 'wholesaler',
    contactPerson: 'Karwan Haji',
    phone: '+964 750 882 1100',
    whatsapp: '+9647508821100',
    address: 'Bakhi Gishti Mobile Market, Store #44',
    city: 'Erbil',
    country: 'Iraq (Kurdistan)',
    categoriesSupplied: ['Used iPhones', 'Used Samsung', 'Xiaomi Global', 'Customer Trade-in Batches'],
    paymentTerms: 'Cash on Delivery',
    currency: 'USD',
    openingBalanceUSD: 0,
    openingBalanceIQD: 0,
    totalPurchasesUSD: 11400,
    totalPurchasesIQD: 0,
    totalPaidUSD: 11400,
    totalPaidIQD: 0,
    currentDebtUSD: 0,
    currentDebtIQD: 0,
    creditLimitUSD: 4000,
    rating: 4,
    status: 'active',
    notes: 'Grade A+ used phones, tested 100% genuine with battery health check reports.',
    createdAt: new Date(Date.now() - 150 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 86400000).toISOString()
  },
  {
    id: 'sup_005',
    name: 'Green Lion & Joyroom Regional Co.',
    companyType: 'distributor',
    contactPerson: 'Zana Azad',
    phone: '+964 750 901 4455',
    email: 'kurdistan.sales@greenlion.me',
    whatsapp: '+9647509014455',
    address: 'Sultan Muthafar Road, Star Mall Level 1',
    city: 'Erbil',
    country: 'Iraq (Kurdistan)',
    categoriesSupplied: ['Screen Protectors & Glass', 'Protective Cases & Covers', 'Smartwatch Straps', 'Gaming Accessories'],
    paymentTerms: 'Consignment / Monthly Ledger',
    currency: 'IQD',
    openingBalanceUSD: 0,
    openingBalanceIQD: 0,
    totalPurchasesUSD: 0,
    totalPurchasesIQD: 6800000,
    totalPaidUSD: 0,
    totalPaidIQD: 4900000,
    currentDebtUSD: 0,
    currentDebtIQD: 1900000,
    creditLimitIQD: 10000000,
    rating: 5,
    status: 'active',
    notes: 'Premium tempered glass 9H, privacy protectors and magnetic shockproof cases.',
    createdAt: new Date(Date.now() - 80 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString()
  }
];

// Initial realistic seed invoices
const INITIAL_INVOICES: SupplierPurchaseInvoice[] = [
  {
    id: 'inv_001',
    supplierId: 'sup_001',
    supplierName: 'Apple Regional Distribution MEA',
    invoiceNumber: 'APL-MEA-9941',
    purchaseDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    currency: 'USD',
    totalAmount: 11200,
    downPayment: 5200,
    paidAmount: 5200,
    remainingDebt: 6000,
    status: 'partially_paid',
    productType: 'mobiles',
    itemsSummary: '10x iPhone 15 Pro 128GB, 4x iPhone 15 Pro Max 256GB',
    itemCount: 14,
    notes: 'Batch #B-8821. Remaining $6,000 due within 15 days.',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    id: 'inv_002',
    supplierId: 'sup_002',
    supplierName: 'Samsung Regional Hub (Al-Nakheel Electronics)',
    invoiceNumber: 'SAM-IQ-20410',
    purchaseDate: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    currency: 'USD',
    totalAmount: 6800,
    downPayment: 3400,
    paidAmount: 3400,
    remainingDebt: 3400,
    status: 'overdue',
    productType: 'mobiles',
    itemsSummary: '6x Galaxy S24 Ultra 512GB, 8x Galaxy A55 5G',
    itemCount: 14,
    notes: 'Supplier requested settlement by end of week.',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 86400000).toISOString()
  },
  {
    id: 'inv_003',
    supplierId: 'sup_003',
    supplierName: 'Anker & Baseus Direct Import (TechZone Trading)',
    invoiceNumber: 'TZ-ACC-5520',
    purchaseDate: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    currency: 'USD',
    totalAmount: 2800,
    downPayment: 1600,
    paidAmount: 1600,
    remainingDebt: 1200,
    status: 'partially_paid',
    productType: 'accessories',
    itemsSummary: '40x Anker 20W PD Nano, 20x 10,000mAh Power Banks, 50x Type-C Braided Cables',
    itemCount: 110,
    notes: 'Fast selling stock, accessories in shop display.',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 86400000).toISOString()
  },
  {
    id: 'inv_004',
    supplierId: 'sup_005',
    supplierName: 'Green Lion & Joyroom Regional Co.',
    invoiceNumber: 'GL-ERB-883',
    purchaseDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    currency: 'IQD',
    totalAmount: 3200000,
    downPayment: 1300000,
    paidAmount: 1300000,
    remainingDebt: 1900000,
    status: 'partially_paid',
    productType: 'accessories',
    itemsSummary: '150x 9H Privacy Glass, 80x MagSafe Matte Cases',
    itemCount: 230,
    notes: 'Monthly restock for Erbil main branch.',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 86400000).toISOString()
  }
];

// Initial realistic seed payment vouchers
const INITIAL_PAYMENTS: SupplierPaymentVoucher[] = [
  {
    id: 'vch_001',
    voucherNumber: 'SPV-2026-0012',
    supplierId: 'sup_001',
    supplierName: 'Apple Regional Distribution MEA',
    invoiceId: 'inv_001',
    invoiceNumber: 'APL-MEA-9941',
    amount: 5200,
    currency: 'USD',
    paymentDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    exchangeOfficeOrBank: 'RT Bank Erbil Branch',
    receiptNumber: 'RTB-TRF-99401',
    paidBy: 'Store Manager',
    notes: 'Down payment for 14x iPhone 15 batch',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    id: 'vch_002',
    voucherNumber: 'SPV-2026-0013',
    supplierId: 'sup_002',
    supplierName: 'Samsung Regional Hub (Al-Nakheel Electronics)',
    invoiceId: 'inv_002',
    invoiceNumber: 'SAM-IQ-20410',
    amount: 3400,
    currency: 'USD',
    paymentDate: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
    paymentMethod: 'exchange_office',
    exchangeOfficeOrBank: 'Al-Taif Exchange Erbil',
    receiptNumber: 'TE-TR-77219',
    paidBy: 'Store Cashier',
    notes: '50% advance for Galaxy S24 Ultra batch',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
  },
  {
    id: 'vch_003',
    voucherNumber: 'SPV-2026-0014',
    supplierId: 'sup_003',
    supplierName: 'Anker & Baseus Direct Import (TechZone Trading)',
    invoiceId: 'inv_003',
    invoiceNumber: 'TZ-ACC-5520',
    amount: 1600,
    currency: 'USD',
    paymentDate: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
    paymentMethod: 'cash',
    receiptNumber: 'CSH-0914',
    paidBy: 'Admin',
    notes: 'Cash payment upon inventory arrival',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString()
  },
  {
    id: 'vch_004',
    voucherNumber: 'SPV-2026-0015',
    supplierId: 'sup_005',
    supplierName: 'Green Lion & Joyroom Regional Co.',
    invoiceId: 'inv_004',
    invoiceNumber: 'GL-ERB-883',
    amount: 1300000,
    currency: 'IQD',
    paymentDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    paymentMethod: 'cash',
    receiptNumber: 'CSH-0988',
    paidBy: 'Store Cashier',
    notes: 'Cash payment at showroom counter',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
  }
];

// Initial realistic seed defective return items (RMA)
const INITIAL_RETURNS: SupplierReturnItem[] = [
  {
    id: 'rma_001',
    rmaNumber: 'RMA-2026-0038',
    supplierId: 'sup_001',
    supplierName: 'Apple Regional Distribution MEA',
    supplierPhone: '+964 750 441 8899',
    supplierCity: 'Erbil',
    itemType: 'mobile',
    itemName: 'iPhone 15 Pro 128GB',
    brand: 'Apple',
    model: 'iPhone 15 Pro',
    serialOrImei: '354921087729104',
    color: 'Natural Titanium',
    storage: '128GB',
    quantity: 1,
    unitCost: 890,
    currency: 'USD',
    totalValue: 890,
    defectCategory: 'screen_display',
    defectDescription: 'Vertical bright green pixel line running through OLED display directly out of sealed box. Factory hardware flaw.',
    requestedResolution: 'replacement',
    status: 'pending_dispatch',
    priority: 'high',
    invoiceRef: 'APL-MEA-9941',
    purchaseDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    notes: 'Quarantined in Store Safe RMA shelf. Waiting for Apple Erbil courier pickup.'
  },
  {
    id: 'rma_002',
    rmaNumber: 'RMA-2026-0039',
    supplierId: 'sup_003',
    supplierName: 'Anker & Baseus Direct Import (TechZone Trading)',
    supplierPhone: '+964 750 312 9900',
    supplierCity: 'Sulaymaniyah',
    itemType: 'accessory',
    itemName: 'Anker 737 Power Bank (PowerCore 24K)',
    brand: 'Anker',
    model: 'A1289',
    serialOrImei: 'ANK-24K-88192',
    color: 'Black / Silver',
    quantity: 2,
    unitCost: 95,
    currency: 'USD',
    totalValue: 190,
    defectCategory: 'dead_on_arrival',
    defectDescription: 'Digital smart screen is dead/unresponsive and the primary 140W USB-C PD 3.1 port does not deliver current.',
    requestedResolution: 'replacement',
    status: 'dispatched',
    priority: 'urgent',
    invoiceRef: 'TZ-ACC-5520',
    purchaseDate: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    dispatchedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    notes: 'Handed to TechZone field representative (Hawre Sleman) for warranty replacement.'
  },
  {
    id: 'rma_003',
    rmaNumber: 'RMA-2026-0040',
    supplierId: 'sup_002',
    supplierName: 'Samsung Regional Hub (Al-Nakheel Electronics)',
    supplierPhone: '+964 770 555 1234',
    supplierCity: 'Baghdad',
    itemType: 'accessory',
    itemName: 'Samsung Galaxy Buds2 Pro',
    brand: 'Samsung',
    model: 'SM-R510',
    serialOrImei: 'RF2N90ABCD',
    color: 'Graphite',
    quantity: 1,
    unitCost: 110,
    currency: 'USD',
    totalValue: 110,
    defectCategory: 'audio_mic',
    defectDescription: 'Left earbud produces severe high-pitch feedback distortion when Active Noise Cancellation is engaged.',
    customerName: 'Aso Muhammad',
    customerPhone: '+964 750 112 3344',
    requestedResolution: 'cash_refund',
    status: 'refunded_cash',
    priority: 'normal',
    invoiceRef: 'SAM-IQ-20410',
    purchaseDate: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    dispatchedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    resolvedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    refundAmount: 110,
    refundCurrency: 'USD',
    settlementType: 'cash_collected',
    resolutionNotes: 'Supplier field representative visited store and issued $110 cash refund on the spot.'
  }
];

export const supplierService = {
  // -------------------------------------------------------------
  // SUPPLIER CRUD
  // -------------------------------------------------------------
  async getAllSuppliers(): Promise<Supplier[]> {
    if (isSupabaseConfigured()) {
      try {
        // 1. Fetch from settings for rich objects
        const { data: settingsData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', SUPPLIERS_STORAGE_KEY)
          .maybeSingle();

        let richList: Supplier[] = [];
        if (settingsData && Array.isArray(settingsData.value)) {
          richList = settingsData.value;
        }

        // 2. Fetch from suppliers relational table
        const { data: tableRows, error: tableErr } = await supabase
          .from('suppliers')
          .select('*')
          .order('created_at', { ascending: false });

        if (!tableErr && tableRows) {
          const richMap = new Map(richList.map(s => [s.id, s]));

          // Map each database row to rich Supplier object
          const combined = tableRows.map(row => {
            const existing = richMap.get(row.id);
            return mapDbToSupplier(row, existing);
          });

          // Also check if there were richList suppliers not yet in tableRows
          const tableIdSet = new Set(tableRows.map(r => r.id));
          for (const s of richList) {
            if (!tableIdSet.has(s.id) && !tableIdSet.has(toValidUUID(s.id))) {
              combined.push(s);
              // Background push to suppliers table
              try {
                supabase.from('suppliers').upsert(mapSupplierToDb(s)).then(() => {});
              } catch {}
            }
          }

          if ((combined?.length || 0) > 0) {
            localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(combined));
            try {
              for (const s of combined) {
                await idb.put('suppliers', s);
              }
            } catch {}
            return combined;
          }
        }

        if ((richList?.length || 0) > 0) {
          // Seed the relational table with these suppliers
          for (const s of richList) {
            try {
              await supabase.from('suppliers').upsert(mapSupplierToDb(s));
            } catch {}
          }
          localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(richList));
          return richList;
        }

        // If both empty, return empty
        localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify([]));
        return [];
      } catch (e) {
        console.warn('Supabase supplier fetch error, using local fallback', e);
      }
    }

    // Offline / Fallback
    try {
      const idbList = await idb.getAll<Supplier>('suppliers');
      if (Array.isArray(idbList) && idbList.length > 0) {
        localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(idbList));
        return idbList;
      }
    } catch {}

    const localData = localStorage.getItem(SUPPLIERS_STORAGE_KEY);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }

    return [];
  },

  async getSupplierById(id: string): Promise<Supplier | null> {
    const suppliers = await this.getAllSuppliers();
    return suppliers.find(s => s.id === id || toValidUUID(s.id) === toValidUUID(id)) || null;
  },

  async saveSupplier(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Supplier> {
    const suppliers = await this.getAllSuppliers();
    const now = new Date().toISOString();

    let updatedSupplier: Supplier;

    if (supplier.id) {
      // Update
      const index = suppliers.findIndex(s => s.id === supplier.id || toValidUUID(s.id) === toValidUUID(supplier.id));
      if (index === -1) throw new Error('Supplier not found');

      updatedSupplier = {
        ...suppliers[index],
        ...supplier,
        updatedAt: now
      };
      suppliers[index] = updatedSupplier;
    } else {
      // Create new with valid UUID
      const newId = toValidUUID();
      updatedSupplier = {
        ...supplier,
        id: newId,
        openingBalanceUSD: supplier.openingBalanceUSD || 0,
        openingBalanceIQD: supplier.openingBalanceIQD || 0,
        totalPurchasesUSD: supplier.totalPurchasesUSD || 0,
        totalPurchasesIQD: supplier.totalPurchasesIQD || 0,
        totalPaidUSD: supplier.totalPaidUSD || 0,
        totalPaidIQD: supplier.totalPaidIQD || 0,
        currentDebtUSD: supplier.currentDebtUSD ?? (supplier.openingBalanceUSD || 0),
        currentDebtIQD: supplier.currentDebtIQD ?? (supplier.openingBalanceIQD || 0),
        rating: supplier.rating || 5,
        status: supplier.status || 'active',
        createdAt: now,
        updatedAt: now
      };
      suppliers.unshift(updatedSupplier);
    }

    localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(suppliers));
    try {
      await idb.put('suppliers', updatedSupplier);
    } catch {}

    if (isSupabaseConfigured()) {
      try {
        // Upsert to suppliers relational table
        await supabase.from('suppliers').upsert(mapSupplierToDb(updatedSupplier));

        // Also upsert complete array to settings
        await supabase
          .from('settings')
          .upsert({ key: SUPPLIERS_STORAGE_KEY, value: suppliers as any }, { onConflict: 'key' });
      } catch (e) {
        console.warn('Failed to sync suppliers to Supabase', e);
      }
    }

    return updatedSupplier;
  },

  async deleteSupplier(id: string): Promise<boolean> {
    const suppliers = await this.getAllSuppliers();
    const filtered = suppliers.filter(s => s.id !== id && toValidUUID(s.id) !== toValidUUID(id));

    localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(filtered));
    try {
      await idb.delete('suppliers', id);
    } catch {}

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('suppliers').delete().eq('id', toValidUUID(id));
        await supabase
          .from('settings')
          .upsert({ key: SUPPLIERS_STORAGE_KEY, value: filtered as any }, { onConflict: 'key' });
      } catch (e) {
        console.warn('Failed to sync suppliers deletion to Supabase', e);
      }
    }

    return true;
  },

  // -------------------------------------------------------------
  // INVOICES & PURCHASES CRUD
  // -------------------------------------------------------------
  async getAllInvoices(): Promise<SupplierPurchaseInvoice[]> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', INVOICES_STORAGE_KEY)
        .maybeSingle();

      if (!error) {
        if (data && Array.isArray(data.value)) {
          localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(data.value));
          return data.value as SupplierPurchaseInvoice[];
        } else if (!data) {
          localStorage.removeItem(INVOICES_STORAGE_KEY);
          return [];
        }
      }
    } catch (e) {
      console.warn('Supabase supplier invoices fetch error, using fallback', e);
    }

    const localData = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }

    return [];
  },

  async saveInvoice(invoiceData: Omit<SupplierPurchaseInvoice, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<SupplierPurchaseInvoice> {
    const invoices = await this.getAllInvoices();
    const suppliers = await this.getAllSuppliers();
    const now = new Date().toISOString();

    const remaining = Math.max(0, invoiceData.totalAmount - (invoiceData.downPayment || 0));
    let status = invoiceData.status;
    if (!status) {
      if (remaining === 0) status = 'paid';
      else if (invoiceData.downPayment > 0) status = 'partially_paid';
      else status = 'unpaid';
    }

    let savedInvoice: SupplierPurchaseInvoice;

    if (invoiceData.id) {
      const idx = invoices.findIndex(i => i.id === invoiceData.id);
      if (idx === -1) throw new Error('Invoice not found');
      savedInvoice = {
        ...invoices[idx],
        ...invoiceData,
        remainingDebt: remaining,
        status,
        updatedAt: now
      };
      invoices[idx] = savedInvoice;
    } else {
      savedInvoice = {
        ...invoiceData,
        id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        paidAmount: invoiceData.downPayment || 0,
        remainingDebt: remaining,
        status,
        createdAt: now,
        updatedAt: now
      };
      invoices.unshift(savedInvoice);

      // Also create payment voucher if downpayment > 0
      if (invoiceData.downPayment > 0) {
        await this.recordPayment({
          voucherNumber: `SPV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          supplierId: savedInvoice.supplierId,
          supplierName: savedInvoice.supplierName,
          invoiceId: savedInvoice.id,
          invoiceNumber: savedInvoice.invoiceNumber,
          amount: invoiceData.downPayment,
          currency: savedInvoice.currency,
          paymentDate: savedInvoice.purchaseDate,
          paymentMethod: 'cash',
          receiptNumber: `ADV-${savedInvoice.invoiceNumber}`,
          notes: `Advance / down payment for Bill #${savedInvoice.invoiceNumber}`,
          paidBy: 'Store Cashier'
        }, false); // don't re-adjust debt, done below
      }

      // Update supplier debt & purchase totals
      const supIdx = suppliers.findIndex(s => s.id === savedInvoice.supplierId);
      if (supIdx !== -1) {
        const sup = suppliers[supIdx];
        if (savedInvoice.currency === 'USD') {
          sup.totalPurchasesUSD = (sup.totalPurchasesUSD || 0) + savedInvoice.totalAmount;
          sup.totalPaidUSD = (sup.totalPaidUSD || 0) + (invoiceData.downPayment || 0);
          sup.currentDebtUSD = Math.max(0, (sup.currentDebtUSD || 0) + remaining);
        } else {
          sup.totalPurchasesIQD = (sup.totalPurchasesIQD || 0) + savedInvoice.totalAmount;
          sup.totalPaidIQD = (sup.totalPaidIQD || 0) + (invoiceData.downPayment || 0);
          sup.currentDebtIQD = Math.max(0, (sup.currentDebtIQD || 0) + remaining);
        }
        sup.updatedAt = now;
        suppliers[supIdx] = sup;
        localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(suppliers));
        try { idb.put('suppliers', sup); } catch {}
        if (isSupabaseConfigured()) {
          supabase.from('settings').upsert({ key: SUPPLIERS_STORAGE_KEY, value: suppliers as any }, { onConflict: 'key' }).then(() => {});
          supabase.from('suppliers').upsert(mapSupplierToDb(sup)).then(() => {});
        }
      }
    }

    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
    try {
      await supabase.from('settings').upsert({ key: INVOICES_STORAGE_KEY, value: invoices as any }, { onConflict: 'key' });
    } catch {}

    return savedInvoice;
  },

  async deleteInvoice(id: string): Promise<boolean> {
    const invoices = await this.getAllInvoices();
    const filtered = invoices.filter(i => i.id !== id);
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(filtered));
    try {
      await supabase.from('settings').upsert({ key: INVOICES_STORAGE_KEY, value: filtered as any }, { onConflict: 'key' });
    } catch {}
    return true;
  },

  // -------------------------------------------------------------
  // PAYMENTS & VOUCHERS CRUD
  // -------------------------------------------------------------
  async getAllPayments(): Promise<SupplierPaymentVoucher[]> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', PAYMENTS_STORAGE_KEY)
        .maybeSingle();

      if (!error) {
        if (data && Array.isArray(data.value)) {
          localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(data.value));
          return data.value as SupplierPaymentVoucher[];
        } else if (!data) {
          localStorage.removeItem(PAYMENTS_STORAGE_KEY);
          return [];
        }
      }
    } catch (e) {
      console.warn('Supabase supplier payments fetch error, using fallback', e);
    }

    const localData = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }

    return [];
  },

  async recordPayment(
    paymentData: Omit<SupplierPaymentVoucher, 'id' | 'createdAt'> & { id?: string },
    adjustSupplierBalance: boolean = true
  ): Promise<SupplierPaymentVoucher> {
    const payments = await this.getAllPayments();
    const suppliers = await this.getAllSuppliers();
    const invoices = await this.getAllInvoices();
    const now = new Date().toISOString();

    const voucher: SupplierPaymentVoucher = {
      ...paymentData,
      id: paymentData.id || `vch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now
    };

    payments.unshift(voucher);
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
    supabase.from('settings').upsert({ key: PAYMENTS_STORAGE_KEY, value: payments as any }, { onConflict: 'key' }).then(() => {});

    if (adjustSupplierBalance) {
      // 1. Adjust Invoice if payment is linked to a specific invoice
      if (voucher.invoiceId) {
        const invIdx = invoices.findIndex(i => i.id === voucher.invoiceId);
        if (invIdx !== -1) {
          const inv = invoices[invIdx];
          inv.paidAmount = (inv.paidAmount || 0) + voucher.amount;
          inv.remainingDebt = Math.max(0, inv.totalAmount - inv.paidAmount);
          if (inv.remainingDebt <= 0) {
            inv.status = 'paid';
          } else {
            inv.status = 'partially_paid';
          }
          inv.updatedAt = now;
          invoices[invIdx] = inv;
          localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
          supabase.from('settings').upsert({ key: INVOICES_STORAGE_KEY, value: invoices as any }, { onConflict: 'key' }).then(() => {});
        }
      }

      // 2. Adjust Supplier Debt & Total Paid
      const supIdx = suppliers.findIndex(s => s.id === voucher.supplierId);
      if (supIdx !== -1) {
        const sup = suppliers[supIdx];
        if (voucher.currency === 'USD') {
          sup.totalPaidUSD = (sup.totalPaidUSD || 0) + voucher.amount;
          sup.currentDebtUSD = Math.max(0, (sup.currentDebtUSD || 0) - voucher.amount);
        } else {
          sup.totalPaidIQD = (sup.totalPaidIQD || 0) + voucher.amount;
          sup.currentDebtIQD = Math.max(0, (sup.currentDebtIQD || 0) - voucher.amount);
        }
        sup.updatedAt = now;
        suppliers[supIdx] = sup;
        localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(suppliers));
        try { idb.put('suppliers', sup); } catch {}
        if (isSupabaseConfigured()) {
          supabase.from('settings').upsert({ key: SUPPLIERS_STORAGE_KEY, value: suppliers as any }, { onConflict: 'key' }).then(() => {});
          supabase.from('suppliers').upsert(mapSupplierToDb(sup)).then(() => {});
        }
      }
    }

    return voucher;
  },

  async deletePayment(id: string): Promise<boolean> {
    const payments = await this.getAllPayments();
    const filtered = payments.filter(p => p.id !== id);
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(filtered));
    try {
      await supabase.from('settings').upsert({ key: PAYMENTS_STORAGE_KEY, value: filtered as any }, { onConflict: 'key' });
    } catch {}
    return true;
  },

  // -------------------------------------------------------------
  // STATEMENT OF ACCOUNT (LEDGER)
  // -------------------------------------------------------------
  async getSupplierStatement(
    supplierId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    supplier: Supplier | null;
    items: SupplierStatementItem[];
    totals: {
      totalPurchasesUSD: number;
      totalPurchasesIQD: number;
      totalPaymentsUSD: number;
      totalPaymentsIQD: number;
      finalBalanceUSD: number;
      finalBalanceIQD: number;
    };
  }> {
    const supplier = await this.getSupplierById(supplierId);
    if (!supplier) {
      return {
        supplier: null,
        items: [],
        totals: {
          totalPurchasesUSD: 0,
          totalPurchasesIQD: 0,
          totalPaymentsUSD: 0,
          totalPaymentsIQD: 0,
          finalBalanceUSD: 0,
          finalBalanceIQD: 0
        }
      };
    }

    const allInvoices = (await this.getAllInvoices()).filter(i => i.supplierId === supplierId);
    const allPayments = (await this.getAllPayments()).filter(p => p.supplierId === supplierId);

    // Build timeline items
    const rawEvents: Array<{
      date: string;
      type: 'opening_balance' | 'invoice' | 'payment';
      ref: string;
      description: string;
      currency: 'USD' | 'IQD';
      debit: number; // bill/purchase
      credit: number; // payment
      timestamp: number;
    }> = [];

    // Opening Balance
    if (supplier.openingBalanceUSD > 0) {
      rawEvents.push({
        date: supplier.createdAt ? supplier.createdAt.split('T')[0] : '2024-01-01',
        type: 'opening_balance',
        ref: 'OPENING-USD',
        description: 'Opening Debt Balance (USD)',
        currency: 'USD',
        debit: supplier.openingBalanceUSD,
        credit: 0,
        timestamp: new Date(supplier.createdAt || '2024-01-01').getTime() - 1000
      });
    }

    if (supplier.openingBalanceIQD > 0) {
      rawEvents.push({
        date: supplier.createdAt ? supplier.createdAt.split('T')[0] : '2024-01-01',
        type: 'opening_balance',
        ref: 'OPENING-IQD',
        description: 'Opening Debt Balance (IQD)',
        currency: 'IQD',
        debit: supplier.openingBalanceIQD,
        credit: 0,
        timestamp: new Date(supplier.createdAt || '2024-01-01').getTime() - 900
      });
    }

    // Invoices
    for (const inv of allInvoices) {
      rawEvents.push({
        date: inv.purchaseDate,
        type: 'invoice',
        ref: inv.invoiceNumber,
        description: `Purchase Bill #${inv.invoiceNumber} (${inv.itemsSummary || inv.productType})`,
        currency: inv.currency,
        debit: inv.totalAmount,
        credit: 0,
        timestamp: new Date(inv.purchaseDate).getTime()
      });
    }

    // Payments
    for (const p of allPayments) {
      rawEvents.push({
        date: p.paymentDate,
        type: 'payment',
        ref: p.voucherNumber,
        description: `Payment Voucher #${p.voucherNumber} via ${p.paymentMethod.replace('_', ' ').toUpperCase()} ${p.receiptNumber ? `(Ref: ${p.receiptNumber})` : ''}`,
        currency: p.currency,
        debit: 0,
        credit: p.amount,
        timestamp: new Date(p.paymentDate).getTime() + 100
      });
    }

    // Sort chronologically
    rawEvents.sort((a, b) => a.timestamp - b.timestamp);

    // Compute running balance
    let curBalUSD = 0;
    let curBalIQD = 0;
    let totPurchasesUSD = 0;
    let totPurchasesIQD = 0;
    let totPaymentsUSD = 0;
    let totPaymentsIQD = 0;

    const statementItems: SupplierStatementItem[] = [];

    for (let i = 0; i < (rawEvents?.length || 0); i++) {
      const ev = rawEvents[i];

      if (ev.currency === 'USD') {
        curBalUSD += (ev.debit - ev.credit);
        totPurchasesUSD += ev.debit;
        totPaymentsUSD += ev.credit;
      } else {
        curBalIQD += (ev.debit - ev.credit);
        totPurchasesIQD += ev.debit;
        totPaymentsIQD += ev.credit;
      }

      // Filter by date if specified
      if (startDate && ev.date < startDate) continue;
      if (endDate && ev.date > endDate) continue;

      statementItems.push({
        id: `stmt_${i}_${ev.ref}`,
        date: ev.date,
        type: ev.type,
        referenceNumber: ev.ref,
        description: ev.description,
        currency: ev.currency,
        debit: ev.debit,
        credit: ev.credit,
        runningBalanceUSD: curBalUSD,
        runningBalanceIQD: curBalIQD
      });
    }

    return {
      supplier,
      items: statementItems,
      totals: {
        totalPurchasesUSD: totPurchasesUSD,
        totalPurchasesIQD: totPurchasesIQD,
        totalPaymentsUSD: totPaymentsUSD,
        totalPaymentsIQD: totPaymentsIQD,
        finalBalanceUSD: curBalUSD,
        finalBalanceIQD: curBalIQD
      }
    };
  },

  // -------------------------------------------------------------
  // DEFECTIVE RETURNS & RMA (WARRANTY / RETURN TO SUPPLIER)
  // -------------------------------------------------------------
  async getAllReturns(): Promise<SupplierReturnItem[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', RETURNS_STORAGE_KEY)
          .maybeSingle();

        if (!error) {
          if (data && Array.isArray(data.value)) {
            localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(data.value));
            try {
              await idb.put('app_settings', { key: RETURNS_STORAGE_KEY, value: data.value });
            } catch {}
            return data.value as SupplierReturnItem[];
          } else if (!data) {
            localStorage.removeItem(RETURNS_STORAGE_KEY);
            try {
              await idb.delete('app_settings', RETURNS_STORAGE_KEY);
            } catch {}
            return [];
          }
        }
      } catch (e) {
        console.warn('Supabase returns fetch error, using local storage fallback', e);
      }
    }

    // Check IndexedDB
    try {
      const idbData = await idb.get<{ key: string; value: SupplierReturnItem[] }>('app_settings', RETURNS_STORAGE_KEY);
      if (idbData && Array.isArray(idbData.value) && idbData.value.length > 0) {
        localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(idbData.value));
        return idbData.value;
      }
    } catch {}

    const localData = localStorage.getItem(RETURNS_STORAGE_KEY);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }

    return [];
  },

  async getReturnById(id: string): Promise<SupplierReturnItem | null> {
    const all = await this.getAllReturns();
    return all.find(r => r.id === id) || null;
  },

  async getReturnsBySupplier(supplierId: string): Promise<SupplierReturnItem[]> {
    const all = await this.getAllReturns();
    return all.filter(r => r.supplierId === supplierId);
  },

  async saveReturn(returnPayload: Partial<SupplierReturnItem> & { 
    itemName: string; 
    supplierId: string; 
    supplierName: string;
    unitCost: number;
    quantity: number;
    defectCategory: any;
    defectDescription: string;
    requestedResolution: any;
  }): Promise<SupplierReturnItem> {
    const all = await this.getAllReturns();
    const isEdit = Boolean(returnPayload.id);

    let savedItem: SupplierReturnItem;

    if (isEdit) {
      const index = all.findIndex(r => r.id === returnPayload.id);
      if (index === -1) throw new Error('Return item not found');
      
      savedItem = {
        ...all[index],
        ...returnPayload,
        totalValue: (returnPayload.quantity ?? all[index].quantity) * (returnPayload.unitCost ?? all[index].unitCost),
        updatedAt: new Date().toISOString()
      } as SupplierReturnItem;
      all[index] = savedItem;
    } else {
      const returnCount = (all?.length || 0) + 1;
      const rmaNum = returnPayload.rmaNumber || `RMA-${new Date().getFullYear()}-${String(returnCount).padStart(4, '0')}`;
      const newId = `rma_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      savedItem = {
        id: newId,
        rmaNumber: rmaNum,
        supplierId: returnPayload.supplierId,
        supplierName: returnPayload.supplierName,
        supplierPhone: returnPayload.supplierPhone,
        supplierCity: returnPayload.supplierCity,
        itemType: returnPayload.itemType || 'accessory',
        itemId: returnPayload.itemId,
        itemName: returnPayload.itemName,
        brand: returnPayload.brand || 'Generic',
        model: returnPayload.model,
        serialOrImei: returnPayload.serialOrImei,
        color: returnPayload.color,
        storage: returnPayload.storage,
        quantity: returnPayload.quantity || 1,
        unitCost: returnPayload.unitCost || 0,
        currency: returnPayload.currency || 'USD',
        totalValue: (returnPayload.quantity || 1) * (returnPayload.unitCost || 0),
        defectCategory: returnPayload.defectCategory || 'dead_on_arrival',
        defectDescription: returnPayload.defectDescription || '',
        customerName: returnPayload.customerName,
        customerPhone: returnPayload.customerPhone,
        requestedResolution: returnPayload.requestedResolution || 'replacement',
        status: returnPayload.status || 'pending_dispatch',
        priority: returnPayload.priority || 'normal',
        invoiceRef: returnPayload.invoiceRef,
        purchaseDate: returnPayload.purchaseDate,
        createdAt: new Date().toISOString(),
        notes: returnPayload.notes
      };

      all.unshift(savedItem);
    }

    // Save locally and IDB
    localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(all));
    try {
      await idb.put('app_settings', { key: RETURNS_STORAGE_KEY, value: all });
    } catch {}

    // Sync to Supabase settings key
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('settings')
          .upsert({
            key: RETURNS_STORAGE_KEY,
            value: all,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
      } catch (e) {
        console.warn('Failed to sync returns to Supabase settings:', e);
      }
    }

    return savedItem;
  },

  async updateReturnStatus(id: string, updates: Partial<SupplierReturnItem>): Promise<SupplierReturnItem> {
    const all = await this.getAllReturns();
    const index = all.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Return record not found');

    const updated = {
      ...all[index],
      ...updates
    };

    all[index] = updated;
    localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(all));
    try {
      await idb.put('app_settings', { key: RETURNS_STORAGE_KEY, value: all });
    } catch {}

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('settings')
          .upsert({
            key: RETURNS_STORAGE_KEY,
            value: all,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
      } catch (e) {
        console.warn('Failed to sync updated return to Supabase settings:', e);
      }
    }

    return updated;
  },

  async resolveReturn(
    id: string, 
    resolution: {
      settlementType: 'replacement_restocked' | 'cash_collected' | 'debt_deducted' | 'supplier_rejected';
      notes?: string;
      replacementSerialOrImei?: string;
      replacementItemName?: string;
      refundAmount?: number;
      refundCurrency?: 'USD' | 'IQD';
      autoDeductDebt?: boolean;
    }
  ): Promise<SupplierReturnItem> {
    const current = await this.getReturnById(id);
    if (!current) throw new Error('Return record not found');

    let newStatus: SupplierReturnStatus = 'received_replacement';
    if (resolution.settlementType === 'cash_collected') {
      newStatus = 'refunded_cash';
    } else if (resolution.settlementType === 'debt_deducted') {
      newStatus = 'credited_to_account';
    } else if (resolution.settlementType === 'supplier_rejected') {
      newStatus = 'rejected';
    }

    const updates: Partial<SupplierReturnItem> = {
      status: newStatus,
      settlementType: resolution.settlementType,
      resolvedAt: new Date().toISOString(),
      resolutionNotes: resolution.notes,
      replacementSerialOrImei: resolution.replacementSerialOrImei,
      replacementItemName: resolution.replacementItemName,
      refundAmount: resolution.refundAmount,
      refundCurrency: resolution.refundCurrency || current.currency
    };

    // If resolution is debt_deducted and user opted to adjust supplier debt automatically:
    if (resolution.settlementType === 'debt_deducted' && resolution.autoDeductDebt && resolution.refundAmount && resolution.refundAmount > 0) {
      try {
        const curSupplier = await this.getSupplierById(current.supplierId);
        if (curSupplier) {
          const deduction = resolution.refundAmount;
          const isUSD = (resolution.refundCurrency || current.currency) === 'USD';
          
          const updatedDebtUSD = isUSD 
            ? Math.max(0, (curSupplier.currentDebtUSD || 0) - deduction)
            : (curSupplier.currentDebtUSD || 0);
          
          const updatedDebtIQD = !isUSD
            ? Math.max(0, (curSupplier.currentDebtIQD || 0) - deduction)
            : (curSupplier.currentDebtIQD || 0);

          await this.updateSupplier(curSupplier.id, {
            currentDebtUSD: updatedDebtUSD,
            currentDebtIQD: updatedDebtIQD
          });

          // Also record a payment/credit adjustment voucher
          await this.recordPayment({
            supplierId: curSupplier.id,
            supplierName: curSupplier.name,
            amount: deduction,
            currency: resolution.refundCurrency || current.currency,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'exchange_office',
            receiptNumber: current.rmaNumber,
            paidBy: 'Supplier RMA Credit',
            notes: `Auto Debt Credit from RMA #${current.rmaNumber} (${current.itemName}) - Defect Return Settlement`
          });
        }
      } catch (e) {
        console.warn('Auto debt deduction error for RMA settlement:', e);
      }
    }

    return await this.updateReturnStatus(id, updates);
  },

  async deleteReturn(id: string): Promise<boolean> {
    const all = await this.getAllReturns();
    const safeAll = Array.isArray(all) ? all : [];
    const filtered = safeAll.filter(r => r.id !== id);
    if ((filtered?.length || 0) === (safeAll?.length || 0)) return false;

    localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(filtered));
    try {
      await idb.put('app_settings', { key: RETURNS_STORAGE_KEY, value: filtered });
    } catch {}

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('settings')
          .upsert({
            key: RETURNS_STORAGE_KEY,
            value: filtered,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
      } catch (e) {
        console.warn('Failed to delete return from Supabase:', e);
      }
    }

    return true;
  },

  async getReturnStats(): Promise<SupplierReturnStats> {
    const all = await this.getAllReturns();
    
    let pendingCount = 0;
    let dispatchedCount = 0;
    let resolvedCount = 0;
    let totalPendingValueUSD = 0;
    let totalPendingValueIQD = 0;
    let totalRecoveredUSD = 0;
    let totalRecoveredIQD = 0;

    for (const r of all) {
      if (r.status === 'pending_dispatch') {
        pendingCount++;
        if (r.currency === 'USD') totalPendingValueUSD += (r.totalValue || 0);
        else totalPendingValueIQD += (r.totalValue || 0);
      } else if (r.status === 'dispatched') {
        dispatchedCount++;
        if (r.currency === 'USD') totalPendingValueUSD += (r.totalValue || 0);
        else totalPendingValueIQD += (r.totalValue || 0);
      } else if (['received_replacement', 'refunded_cash', 'credited_to_account'].includes(r.status)) {
        resolvedCount++;
        const recoveredVal = r.refundAmount || r.totalValue || 0;
        const curr = r.refundCurrency || r.currency;
        if (curr === 'USD') totalRecoveredUSD += recoveredVal;
        else totalRecoveredIQD += recoveredVal;
      }
    }

    return {
      totalReturns: all?.length || 0,
      pendingCount,
      dispatchedCount,
      resolvedCount,
      totalPendingValueUSD,
      totalPendingValueIQD,
      totalRecoveredUSD,
      totalRecoveredIQD
    };
  },

  async saveInvoices(invoices: SupplierPurchaseInvoice[]): Promise<void> {
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
    if (isSupabaseConfigured()) {
      try { await supabase.from('settings').upsert({ key: INVOICES_STORAGE_KEY, value: invoices as any }, { onConflict: 'key' }); } catch {}
    }
  },

  async savePayments(payments: SupplierPaymentVoucher[]): Promise<void> {
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
    if (isSupabaseConfigured()) {
      try { await supabase.from('settings').upsert({ key: PAYMENTS_STORAGE_KEY, value: payments as any }, { onConflict: 'key' }); } catch {}
    }
  },

  async saveReturns(returns: SupplierReturnItem[]): Promise<void> {
    localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(returns));
    try { await idb.put('app_settings', { key: RETURNS_STORAGE_KEY, value: returns }); } catch {}
    if (isSupabaseConfigured()) {
      try { await supabase.from('settings').upsert({ key: RETURNS_STORAGE_KEY, value: returns as any }, { onConflict: 'key' }); } catch {}
    }
  },

  async pushLocalSuppliersToCloud(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      const suppliers = await this.getAllSuppliers();
      for (const s of suppliers) {
        try {
          await supabase.from('suppliers').upsert(mapSupplierToDb(s));
        } catch {}
      }
      await supabase.from('settings').upsert({ key: SUPPLIERS_STORAGE_KEY, value: suppliers as any }, { onConflict: 'key' });

      const invoices = await this.getAllInvoices();
      await supabase.from('settings').upsert({ key: INVOICES_STORAGE_KEY, value: invoices as any }, { onConflict: 'key' });

      const payments = await this.getAllPayments();
      await supabase.from('settings').upsert({ key: PAYMENTS_STORAGE_KEY, value: payments as any }, { onConflict: 'key' });

      const returns = await this.getAllReturns();
      await supabase.from('settings').upsert({ key: RETURNS_STORAGE_KEY, value: returns as any }, { onConflict: 'key' });
    } catch (e) {
      console.warn('Failed to push suppliers data to cloud:', e);
    }
  }
};
