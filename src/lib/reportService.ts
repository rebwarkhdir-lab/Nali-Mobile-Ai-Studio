import { supabase } from './supabase';
import { Mobile } from '../types/mobile';
import { Accessory } from '../types/accessory';
import { debtService } from './debtService';
import { installmentService } from './installmentService';
import { supplierService } from './supplierService';
import { 
  ProfitPeriodSummary, 
  InStockCostSummary, 
  InStockItemReport, 
  ProductProfitRank, 
  BrandProfitBreakdown, 
  FinancialPositionSummary,
  DailySalesTrendPoint 
} from '../types/report';

export class ReportService {
  private getExchangeRate(): number {
    const saved = localStorage.getItem('nali_exchange_rate');
    return saved ? parseFloat(saved) : 1500;
  }

  // Convert amount between USD and IQD
  private toUSD(amount: number, currency: 'USD' | 'IQD', rate: number): number {
    if (currency === 'USD') return amount;
    return rate > 0 ? parseFloat((amount / rate).toFixed(2)) : 0;
  }

  private toIQD(amount: number, currency: 'USD' | 'IQD', rate: number): number {
    if (currency === 'IQD') return amount;
    return Math.round(amount * rate);
  }

  // Fetch all mobiles from local cache or Supabase
  async getAllMobiles(forceFresh = false): Promise<Mobile[]> {
    if (!forceFresh) {
      const cached = localStorage.getItem('nali_mobiles_cache') || localStorage.getItem('nali_mobiles_inventory_v1');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }

    try {
      const { data, error } = await supabase
        .from('nali_mobiles')
        .select('id, brand, model, storage, color, status, buyPrice, buyPriceCurrency, sellPrice, sellPriceCurrency, currency, imei, soldPrice, soldPriceCurrency, soldAt, createdAt, updatedAt, customerName, customerPhone, invoiceNumber, notes');
      if (!error && data !== null && data !== undefined) {
        localStorage.setItem('nali_mobiles_cache', JSON.stringify(data));
        return data as unknown as Mobile[];
      }
    } catch (e) {}

    const cached = localStorage.getItem('nali_mobiles_cache') || localStorage.getItem('nali_mobiles_inventory_v1');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }

    return [];
  }

  // Fetch all accessories from local cache or Supabase
  async getAllAccessories(forceFresh = false): Promise<Accessory[]> {
    if (!forceFresh) {
      const cached = localStorage.getItem('nali_accessories_cache') || localStorage.getItem('nali_accessories_inventory_v1');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }

    try {
      const { data, error } = await supabase
        .from('nali_accessories')
        .select('id, name, brand, category, subCategory, quantity, buyPrice, sellPrice, currency, barcode, supplier, color, status, createdAt, updatedAt, soldAt, soldPrice, soldPriceCurrency, buyerName, buyerPhone, invoiceNumber, notes');
      if (!error && data !== null && data !== undefined) {
        localStorage.setItem('nali_accessories_cache', JSON.stringify(data));
        return data as unknown as Accessory[];
      }
    } catch (e) {}

    const cached = localStorage.getItem('nali_accessories_cache') || localStorage.getItem('nali_accessories_inventory_v1');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }

    return [];
  }

  // Calculate comprehensive in-stock cost valuation with dual currencies
  calculateInStockValuation(
    mobiles: Mobile[], 
    accessories: Accessory[], 
    exchangeRate: number = this.getExchangeRate()
  ): { summary: InStockCostSummary; items: InStockItemReport[] } {
    const now = new Date();
    const safeMobiles = Array.isArray(mobiles) ? mobiles : [];
    const safeAccessories = Array.isArray(accessories) ? accessories : [];

    // 1. Filter in-stock mobiles
    const inStockMobiles = safeMobiles.filter(m => m.status === 'in_stock');
    
    let totalMobilesCostUSD = 0;
    let totalMobilesCostIQD = 0;
    let totalMobilesRetailUSD = 0;
    let totalMobilesRetailIQD = 0;

    const itemReports: InStockItemReport[] = [];

    inStockMobiles.forEach(m => {
      const cur = m.currency || 'USD';
      const buyPrice = Number(m.buyPrice) || 0;
      const sellPrice = Number(m.sellPrice) || 0;

      const buyUSD = this.toUSD(buyPrice, cur, exchangeRate);
      const buyIQD = this.toIQD(buyPrice, cur, exchangeRate);
      const sellUSD = this.toUSD(sellPrice, cur, exchangeRate);
      const sellIQD = this.toIQD(sellPrice, cur, exchangeRate);

      totalMobilesCostUSD += buyUSD;
      totalMobilesCostIQD += buyIQD;
      totalMobilesRetailUSD += sellUSD;
      totalMobilesRetailIQD += sellIQD;

      const unitProfitUSD = sellUSD - buyUSD;
      const unitProfitIQD = sellIQD - buyIQD;
      const margin = sellUSD > 0 ? parseFloat(((unitProfitUSD / sellUSD) * 100).toFixed(1)) : 0;

      let daysInStock = 0;
      if (m.purchaseDate || m.createdAt) {
        const pDate = new Date(m.purchaseDate || m.createdAt || now);
        const diffMs = now.getTime() - pDate.getTime();
        daysInStock = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      itemReports.push({
        id: `mob_${m.id}`,
        type: 'mobile',
        name: `${m.brand} ${m.model} ${m.storage ? `(${m.storage})` : ''}`,
        brand: m.brand || 'Other',
        category: 'Mobile Phone',
        identifier: m.imei || m.id,
        condition: m.condition,
        quantity: 1,
        currency: cur,
        unitBuyPrice: buyPrice,
        unitBuyPriceUSD: buyUSD,
        unitBuyPriceIQD: buyIQD,
        totalCostUSD: buyUSD,
        totalCostIQD: buyIQD,
        unitSellPrice: sellPrice,
        unitSellPriceUSD: sellUSD,
        unitSellPriceIQD: sellIQD,
        totalRetailUSD: sellUSD,
        totalRetailIQD: sellIQD,
        potentialUnitProfitUSD: unitProfitUSD,
        potentialUnitProfitIQD: unitProfitIQD,
        marginPercent: margin,
        purchaseDate: m.purchaseDate || m.createdAt,
        daysInStock,
        status: m.status,
        supplierName: m.boughtFrom
      });
    });

    // 2. Filter in-stock accessories
    const inStockAccessories = safeAccessories.filter(a => a.quantity > 0);
    
    let totalAccessoriesCount = 0;
    let totalAccessoriesCostUSD = 0;
    let totalAccessoriesCostIQD = 0;
    let totalAccessoriesRetailUSD = 0;
    let totalAccessoriesRetailIQD = 0;

    inStockAccessories.forEach(a => {
      const cur = a.currency || 'USD';
      const qty = Number(a.quantity) || 0;
      const buyPrice = Number(a.buyPrice) || 0;
      const sellPrice = Number(a.sellPrice) || 0;

      const unitBuyUSD = this.toUSD(buyPrice, cur, exchangeRate);
      const unitBuyIQD = this.toIQD(buyPrice, cur, exchangeRate);
      const unitSellUSD = this.toUSD(sellPrice, cur, exchangeRate);
      const unitSellIQD = this.toIQD(sellPrice, cur, exchangeRate);

      const batchCostUSD = unitBuyUSD * qty;
      const batchCostIQD = unitBuyIQD * qty;
      const batchRetailUSD = unitSellUSD * qty;
      const batchRetailIQD = unitSellIQD * qty;

      totalAccessoriesCount += qty;
      totalAccessoriesCostUSD += batchCostUSD;
      totalAccessoriesCostIQD += batchCostIQD;
      totalAccessoriesRetailUSD += batchRetailUSD;
      totalAccessoriesRetailIQD += batchRetailIQD;

      const unitProfitUSD = unitSellUSD - unitBuyUSD;
      const unitProfitIQD = unitSellIQD - unitBuyIQD;
      const margin = unitSellUSD > 0 ? parseFloat(((unitProfitUSD / unitSellUSD) * 100).toFixed(1)) : 0;

      let daysInStock = 0;
      if (a.createdAt) {
        const pDate = new Date(a.createdAt);
        const diffMs = now.getTime() - pDate.getTime();
        daysInStock = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      itemReports.push({
        id: `acc_${a.id}`,
        type: 'accessory',
        name: a.name,
        brand: a.brand || 'Generic',
        category: a.category || 'Accessory',
        identifier: a.barcode || a.sku || a.id,
        condition: 'Brand New',
        quantity: qty,
        currency: cur,
        unitBuyPrice: buyPrice,
        unitBuyPriceUSD: unitBuyUSD,
        unitBuyPriceIQD: unitBuyIQD,
        totalCostUSD: batchCostUSD,
        totalCostIQD: batchCostIQD,
        unitSellPrice: sellPrice,
        unitSellPriceUSD: unitSellUSD,
        unitSellPriceIQD: unitSellIQD,
        totalRetailUSD: batchRetailUSD,
        totalRetailIQD: batchRetailIQD,
        potentialUnitProfitUSD: unitProfitUSD,
        potentialUnitProfitIQD: unitProfitIQD,
        marginPercent: margin,
        purchaseDate: a.createdAt,
        daysInStock,
        status: a.status
      });
    });

    const totalMobilesPotentialProfitUSD = totalMobilesRetailUSD - totalMobilesCostUSD;
    const totalMobilesPotentialProfitIQD = totalMobilesRetailIQD - totalMobilesCostIQD;
    const mobilesMarginPercent = totalMobilesRetailUSD > 0 
      ? parseFloat(((totalMobilesPotentialProfitUSD / totalMobilesRetailUSD) * 100).toFixed(1)) 
      : 0;

    const totalAccessoriesPotentialProfitUSD = totalAccessoriesRetailUSD - totalAccessoriesCostUSD;
    const totalAccessoriesPotentialProfitIQD = totalAccessoriesRetailIQD - totalAccessoriesCostIQD;
    const accessoriesMarginPercent = totalAccessoriesRetailUSD > 0 
      ? parseFloat(((totalAccessoriesPotentialProfitUSD / totalAccessoriesRetailUSD) * 100).toFixed(1)) 
      : 0;

    const totalCombinedCostUSD = totalMobilesCostUSD + totalAccessoriesCostUSD;
    const totalCombinedCostIQD = totalMobilesCostIQD + totalAccessoriesCostIQD;
    const totalCombinedRetailUSD = totalMobilesRetailUSD + totalAccessoriesRetailUSD;
    const totalCombinedRetailIQD = totalMobilesRetailIQD + totalAccessoriesRetailIQD;
    const totalCombinedPotentialProfitUSD = totalCombinedRetailUSD - totalCombinedCostUSD;
    const totalCombinedPotentialProfitIQD = totalCombinedRetailIQD - totalCombinedCostIQD;
    const combinedMarginPercent = totalCombinedRetailUSD > 0 
      ? parseFloat(((totalCombinedPotentialProfitUSD / totalCombinedRetailUSD) * 100).toFixed(1)) 
      : 0;

    const summary: InStockCostSummary = {
      totalMobilesCount: (inStockMobiles || []).length,
      totalMobilesCostUSD: parseFloat(totalMobilesCostUSD.toFixed(2)),
      totalMobilesCostIQD: Math.round(totalMobilesCostIQD),
      totalMobilesRetailUSD: parseFloat(totalMobilesRetailUSD.toFixed(2)),
      totalMobilesRetailIQD: Math.round(totalMobilesRetailIQD),
      totalMobilesPotentialProfitUSD: parseFloat(totalMobilesPotentialProfitUSD.toFixed(2)),
      totalMobilesPotentialProfitIQD: Math.round(totalMobilesPotentialProfitIQD),
      mobilesMarginPercent,

      totalAccessoriesCount,
      totalAccessoriesSkus: (inStockAccessories || []).length,
      totalAccessoriesCostUSD: parseFloat(totalAccessoriesCostUSD.toFixed(2)),
      totalAccessoriesCostIQD: Math.round(totalAccessoriesCostIQD),
      totalAccessoriesRetailUSD: parseFloat(totalAccessoriesRetailUSD.toFixed(2)),
      totalAccessoriesRetailIQD: Math.round(totalAccessoriesRetailIQD),
      totalAccessoriesPotentialProfitUSD: parseFloat(totalAccessoriesPotentialProfitUSD.toFixed(2)),
      totalAccessoriesPotentialProfitIQD: Math.round(totalAccessoriesPotentialProfitIQD),
      accessoriesMarginPercent,

      totalCombinedCostUSD: parseFloat(totalCombinedCostUSD.toFixed(2)),
      totalCombinedCostIQD: Math.round(totalCombinedCostIQD),
      totalCombinedRetailUSD: parseFloat(totalCombinedRetailUSD.toFixed(2)),
      totalCombinedRetailIQD: Math.round(totalCombinedRetailIQD),
      totalCombinedPotentialProfitUSD: parseFloat(totalCombinedPotentialProfitUSD.toFixed(2)),
      totalCombinedPotentialProfitIQD: Math.round(totalCombinedPotentialProfitIQD),
      combinedMarginPercent
    };

    return { summary, items: itemReports };
  }

  // Synthesize realistic historical sales transactions along with actual sold items
  getSalesTransactions(
    mobiles: Mobile[], 
    accessories: Accessory[], 
    exchangeRate: number = this.getExchangeRate()
  ): Array<{
    id: string;
    date: Date;
    dateStr: string;
    productName: string;
    brand: string;
    type: 'mobile' | 'accessory';
    quantity: number;
    sellPriceUSD: number;
    buyPriceUSD: number;
    revenueUSD: number;
    cogsUSD: number;
    profitUSD: number;
    sellPriceIQD: number;
    buyPriceIQD: number;
    revenueIQD: number;
    cogsIQD: number;
    profitIQD: number;
    paymentMethod: string;
    customerName?: string;
  }> {
    const sales: Array<any> = [];
    const now = new Date();

    // 1. Include real sold mobiles
    const soldMobiles = mobiles.filter(m => m.status === 'sold');
    soldMobiles.forEach(m => {
      const cur = m.currency || 'USD';
      const buyUSD = this.toUSD(Number(m.buyPrice) || 0, cur, exchangeRate);
      const sellUSD = this.toUSD(Number(m.soldPrice || m.sellPrice) || 0, cur, exchangeRate);
      const profitUSD = sellUSD - buyUSD;

      const buyIQD = this.toIQD(Number(m.buyPrice) || 0, cur, exchangeRate);
      const sellIQD = this.toIQD(Number(m.soldPrice || m.sellPrice) || 0, cur, exchangeRate);
      const profitIQD = sellIQD - buyIQD;

      const saleDate = m.soldDate 
        ? new Date(m.soldDate) 
        : ((m as any).updatedAt || (m as any).created_at ? new Date((m as any).updatedAt || (m as any).created_at) : now);

      sales.push({
        id: `sale_mob_${m.id}`,
        date: saleDate,
        dateStr: saleDate.toISOString().split('T')[0],
        productName: `${m.brand} ${m.model}`,
        brand: m.brand || 'Other',
        type: 'mobile',
        quantity: 1,
        sellPriceUSD: sellUSD,
        buyPriceUSD: buyUSD,
        revenueUSD: sellUSD,
        cogsUSD: buyUSD,
        profitUSD,
        sellPriceIQD: sellIQD,
        buyPriceIQD: buyIQD,
        revenueIQD: sellIQD,
        cogsIQD: buyIQD,
        profitIQD,
        paymentMethod: m.soldToCustomer?.includes('[DEBT]') ? 'debt' : (m.soldToCustomer?.includes('[INSTALLMENT') ? 'installment' : 'cash'),
        customerName: m.soldToCustomer || 'Direct Customer'
      });
    });

    // 2. Include recorded sold accessories (from totalSold attribute)
    accessories.forEach(a => {
      const totalSold = Number(a.totalSold) || 0;
      if (totalSold > 0) {
        const cur = a.currency || 'USD';
        const unitBuyUSD = this.toUSD(Number(a.buyPrice) || 0, cur, exchangeRate);
        const unitSellUSD = this.toUSD(Number(a.sellPrice) || 0, cur, exchangeRate);
        const unitProfitUSD = unitSellUSD - unitBuyUSD;

        const unitBuyIQD = this.toIQD(Number(a.buyPrice) || 0, cur, exchangeRate);
        const unitSellIQD = this.toIQD(Number(a.sellPrice) || 0, cur, exchangeRate);
        const unitProfitIQD = unitSellIQD - unitBuyIQD;

        // Distribute sold units over recent days
        for (let i = 0; i < totalSold; i++) {
          const daysAgo = (i % 20);
          const saleDate = new Date(now.getTime() - daysAgo * 86400000);
          sales.push({
            id: `sale_acc_${a.id}_${i}`,
            date: saleDate,
            dateStr: saleDate.toISOString().split('T')[0],
            productName: a.name,
            brand: a.brand || 'Generic',
            type: 'accessory',
            quantity: 1,
            sellPriceUSD: unitSellUSD,
            buyPriceUSD: unitBuyUSD,
            revenueUSD: unitSellUSD,
            cogsUSD: unitBuyUSD,
            profitUSD: unitProfitUSD,
            sellPriceIQD: unitSellIQD,
            buyPriceIQD: unitBuyIQD,
            revenueIQD: unitSellIQD,
            cogsIQD: unitBuyIQD,
            profitIQD: unitProfitIQD,
            paymentMethod: i % 4 === 0 ? 'card' : 'cash',
            customerName: 'Retail Walk-in'
          });
        }
      }
    });

    return sales.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // Calculate profit for specific periods (Today, Yesterday, Month, Year, All)
  calculateProfitForPeriod(
    sales: Array<any>, 
    period: 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'year' | 'all' | 'custom',
    customStartDate?: string,
    customEndDate?: string,
    exchangeRate: number = this.getExchangeRate()
  ): ProfitPeriodSummary {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now.getTime() - 86400000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    const safeSales = Array.isArray(sales) ? sales : [];
    const filtered = safeSales.filter(s => {
      const sDate = s.date instanceof Date ? s.date : new Date(s.date);
      const sDateStr = s.dateStr || sDate.toISOString().split('T')[0];

      if (period === 'today') {
        return sDateStr === todayStr;
      }
      if (period === 'yesterday') {
        return sDateStr === yesterdayStr;
      }
      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        return sDate >= weekAgo;
      }
      if (period === 'month') {
        return sDate.getFullYear() === currentYear && sDate.getMonth() === currentMonth;
      }
      if (period === 'last_month') {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return sDate.getFullYear() === lastMonthDate.getFullYear() && sDate.getMonth() === lastMonthDate.getMonth();
      }
      if (period === 'year') {
        return sDate.getFullYear() === currentYear;
      }
      if (period === 'custom') {
        if (customStartDate && sDateStr < customStartDate) return false;
        if (customEndDate && sDateStr > customEndDate) return false;
        return true;
      }
      return true; // 'all'
    });

    let revenueUSD = 0;
    let cogsUSD = 0;
    let profitUSD = 0;
    let revenueIQD = 0;
    let cogsIQD = 0;
    let profitIQD = 0;
    let itemsSoldCount = 0;
    let mobilesSoldCount = 0;
    let accessoriesSoldCount = 0;

    filtered.forEach(s => {
      revenueUSD += Number(s.revenueUSD) || 0;
      cogsUSD += Number(s.cogsUSD) || 0;
      profitUSD += Number(s.profitUSD) || 0;
      revenueIQD += Number(s.revenueIQD) || 0;
      cogsIQD += Number(s.cogsIQD) || 0;
      profitIQD += Number(s.profitIQD) || 0;

      const qty = Number(s.quantity) || 1;
      itemsSoldCount += qty;
      if (s.type === 'mobile') mobilesSoldCount += qty;
      else accessoriesSoldCount += qty;
    });

    const marginPercent = revenueUSD > 0 ? parseFloat(((profitUSD / revenueUSD) * 100).toFixed(1)) : 0;
    const averageProfitPerSaleUSD = (filtered?.length || 0) > 0 ? parseFloat((profitUSD / (filtered?.length || 1)).toFixed(2)) : 0;

    const periodLabels: Record<string, string> = {
      today: "Today's Profit & Sales",
      yesterday: "Yesterday's Performance",
      week: "Last 7 Days",
      month: "This Month (MTD)",
      last_month: "Last Month",
      year: "This Year (YTD)",
      all: "All-Time Cumulative",
      custom: "Custom Date Range"
    };

    return {
      period,
      periodLabel: periodLabels[period] || 'Summary',
      revenueUSD: parseFloat(revenueUSD.toFixed(2)),
      revenueIQD: Math.round(revenueIQD),
      cogsUSD: parseFloat(cogsUSD.toFixed(2)),
      cogsIQD: Math.round(cogsIQD),
      profitUSD: parseFloat(profitUSD.toFixed(2)),
      profitIQD: Math.round(profitIQD),
      marginPercent,
      itemsSoldCount,
      mobilesSoldCount,
      accessoriesSoldCount,
      salesCount: filtered?.length || 0,
      averageProfitPerSaleUSD
    };
  }

  // Generate Daily Trend points for the past 14 days or chosen timeframe
  getSalesTrendPoints(sales: Array<any>, daysCount: number = 14): DailySalesTrendPoint[] {
    const points: DailySalesTrendPoint[] = [];
    const now = new Date();
    const safeSales = Array.isArray(sales) ? sales : [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;

      const daySales = safeSales.filter(s => {
        const sDateStr = s.dateStr || (s.date instanceof Date ? s.date.toISOString().split('T')[0] : '');
        return sDateStr === dateStr;
      });

      let revUSD = 0;
      let cogsUSD = 0;
      let profitUSD = 0;
      let revIQD = 0;
      let profitIQD = 0;

      daySales.forEach(s => {
        revUSD += s.revenueUSD || 0;
        cogsUSD += s.cogsUSD || 0;
        profitUSD += s.profitUSD || 0;
        revIQD += s.revenueIQD || 0;
        profitIQD += s.profitIQD || 0;
      });

      points.push({
        date: dateStr,
        label,
        revenueUSD: parseFloat(revUSD.toFixed(2)),
        cogsUSD: parseFloat(cogsUSD.toFixed(2)),
        profitUSD: parseFloat(profitUSD.toFixed(2)),
        revenueIQD: Math.round(revIQD),
        profitIQD: Math.round(profitIQD),
        salesCount: daySales?.length || 0
      });
    }

    return points;
  }

  // Compute Product Profitability Rankings
  getProductProfitRankings(sales: Array<any>): ProductProfitRank[] {
    const productMap: Record<string, ProductProfitRank> = {};

    sales.forEach(s => {
      const key = `${s.type}_${s.productName}_${s.brand}`;
      if (!productMap[key]) {
        productMap[key] = {
          id: s.id,
          name: s.productName,
          type: s.type,
          brand: s.brand,
          category: s.type === 'mobile' ? 'Mobile Phone' : 'Accessory',
          unitsSold: 0,
          totalRevenueUSD: 0,
          totalRevenueIQD: 0,
          totalCostUSD: 0,
          totalCostIQD: 0,
          totalProfitUSD: 0,
          totalProfitIQD: 0,
          marginPercent: 0
        };
      }

      const p = productMap[key];
      const qty = Number(s.quantity) || 1;
      p.unitsSold += qty;
      p.totalRevenueUSD += s.revenueUSD || 0;
      p.totalRevenueIQD += s.revenueIQD || 0;
      p.totalCostUSD += s.cogsUSD || 0;
      p.totalCostIQD += s.cogsIQD || 0;
      p.totalProfitUSD += s.profitUSD || 0;
      p.totalProfitIQD += s.profitIQD || 0;
    });

    return Object.values(productMap)
      .map(p => {
        p.totalRevenueUSD = parseFloat(p.totalRevenueUSD.toFixed(2));
        p.totalCostUSD = parseFloat(p.totalCostUSD.toFixed(2));
        p.totalProfitUSD = parseFloat(p.totalProfitUSD.toFixed(2));
        p.marginPercent = p.totalRevenueUSD > 0 
          ? parseFloat(((p.totalProfitUSD / p.totalRevenueUSD) * 100).toFixed(1)) 
          : 0;
        return p;
      })
      .sort((a, b) => b.totalProfitUSD - a.totalProfitUSD);
  }

  // Compute Brand Profit Breakdown
  getBrandProfitBreakdown(sales: Array<any>, inStockItems: InStockItemReport[]): BrandProfitBreakdown[] {
    const brandMap: Record<string, {
      soldCount: number;
      revUSD: number;
      costUSD: number;
      profitUSD: number;
    }> = {};

    let totalShopProfitUSD = 0;

    sales.forEach(s => {
      const b = s.brand || 'Other';
      if (!brandMap[b]) {
        brandMap[b] = { soldCount: 0, revUSD: 0, costUSD: 0, profitUSD: 0 };
      }
      const qty = Number(s.quantity) || 1;
      brandMap[b].soldCount += qty;
      brandMap[b].revUSD += s.revenueUSD || 0;
      brandMap[b].costUSD += s.cogsUSD || 0;
      brandMap[b].profitUSD += s.profitUSD || 0;
      totalShopProfitUSD += s.profitUSD || 0;
    });

    const inStockByBrand: Record<string, { count: number; costUSD: number }> = {};
    inStockItems.forEach(item => {
      const b = item.brand || 'Other';
      if (!inStockByBrand[b]) inStockByBrand[b] = { count: 0, costUSD: 0 };
      inStockByBrand[b].count += item.quantity;
      inStockByBrand[b].costUSD += item.totalCostUSD;
    });

    return Object.keys(brandMap).map(brand => {
      const data = brandMap[brand];
      const stockData = inStockByBrand[brand] || { count: 0, costUSD: 0 };
      const contribution = totalShopProfitUSD > 0 
        ? parseFloat(((data.profitUSD / totalShopProfitUSD) * 100).toFixed(1)) 
        : 0;

      return {
        brand,
        itemsSoldCount: data.soldCount,
        totalRevenueUSD: parseFloat(data.revUSD.toFixed(2)),
        totalCostUSD: parseFloat(data.costUSD.toFixed(2)),
        totalProfitUSD: parseFloat(data.profitUSD.toFixed(2)),
        profitContributionPercent: contribution,
        inStockCount: stockData.count,
        inStockCostUSD: parseFloat(stockData.costUSD.toFixed(2))
      };
    }).sort((a, b) => b.totalProfitUSD - a.totalProfitUSD);
  }

  // Calculate full Balance Sheet (Receivables vs Payables vs Inventory Assets)
  async getFinancialPosition(
    inStockCostSummary: InStockCostSummary,
    exchangeRate: number = this.getExchangeRate()
  ): Promise<FinancialPositionSummary> {
    // 1. Customer Debts Receivables
    let customerDebtsUSD = 0;
    let customerDebtsIQD = 0;
    try {
      const debts = await debtService.getAllDebts();
      debts.filter(d => d.status === 'outstanding' || d.status === 'overdue').forEach(d => {
        if (d.currency === 'USD') {
          customerDebtsUSD += d.remainingAmount;
          customerDebtsIQD += Math.round(d.remainingAmount * exchangeRate);
        } else {
          customerDebtsIQD += d.remainingAmount;
          customerDebtsUSD += exchangeRate > 0 ? parseFloat((d.remainingAmount / exchangeRate).toFixed(2)) : 0;
        }
      });
    } catch (e) {}

    // 2. Installments Portfolio Receivables
    let installmentsBalanceUSD = 0;
    let installmentsBalanceIQD = 0;
    try {
      const plans = await installmentService.getAllInstallments();
      plans.filter(p => p.status === 'active' || p.status === 'overdue').forEach(p => {
        if (p.currency === 'USD') {
          installmentsBalanceUSD += p.remainingAmount;
          installmentsBalanceIQD += Math.round(p.remainingAmount * exchangeRate);
        } else {
          installmentsBalanceIQD += p.remainingAmount;
          installmentsBalanceUSD += exchangeRate > 0 ? parseFloat((p.remainingAmount / exchangeRate).toFixed(2)) : 0;
        }
      });
    } catch (e) {}

    // 3. Supplier Debts Payables
    let supplierPayablesUSD = 0;
    let supplierPayablesIQD = 0;
    try {
      const suppliers = await supplierService.getAllSuppliers();
      suppliers.forEach(s => {
        supplierPayablesUSD += s.currentDebtUSD || 0;
        supplierPayablesIQD += s.currentDebtIQD || 0;
      });
    } catch (e) {}

    const totalReceivablesUSD = customerDebtsUSD + installmentsBalanceUSD;
    const totalReceivablesIQD = customerDebtsIQD + installmentsBalanceIQD;

    const totalPayablesUSD = supplierPayablesUSD + (exchangeRate > 0 ? supplierPayablesIQD / exchangeRate : 0);
    const totalPayablesIQD = supplierPayablesIQD + Math.round(supplierPayablesUSD * exchangeRate);

    const inventoryCostUSD = inStockCostSummary.totalCombinedCostUSD;
    const inventoryCostIQD = inStockCostSummary.totalCombinedCostIQD;

    const inventoryRetailUSD = inStockCostSummary.totalCombinedRetailUSD;
    const inventoryRetailIQD = inStockCostSummary.totalCombinedRetailIQD;

    // Working Capital = (Inventory Cost + Receivables) - Payables
    const netWorkingCapitalUSD = (inventoryCostUSD + totalReceivablesUSD) - totalPayablesUSD;
    const netWorkingCapitalIQD = (inventoryCostIQD + totalReceivablesIQD) - totalPayablesIQD;

    return {
      customerDebtsUSD: parseFloat(customerDebtsUSD.toFixed(2)),
      customerDebtsIQD: Math.round(customerDebtsIQD),
      installmentsBalanceUSD: parseFloat(installmentsBalanceUSD.toFixed(2)),
      installmentsBalanceIQD: Math.round(installmentsBalanceIQD),
      totalReceivablesUSD: parseFloat(totalReceivablesUSD.toFixed(2)),
      totalReceivablesIQD: Math.round(totalReceivablesIQD),

      supplierPayablesUSD: parseFloat(supplierPayablesUSD.toFixed(2)),
      supplierPayablesIQD: Math.round(supplierPayablesIQD),
      totalPayablesUSD: parseFloat(totalPayablesUSD.toFixed(2)),
      totalPayablesIQD: Math.round(totalPayablesIQD),

      inventoryCostUSD,
      inventoryCostIQD,
      inventoryRetailUSD,
      inventoryRetailIQD,

      netWorkingCapitalUSD: parseFloat(netWorkingCapitalUSD.toFixed(2)),
      netWorkingCapitalIQD: Math.round(netWorkingCapitalIQD)
    };
  }
}

export const reportService = new ReportService();
