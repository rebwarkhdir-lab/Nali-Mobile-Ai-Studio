export interface ProfitPeriodSummary {
  period: 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'year' | 'all' | 'custom';
  periodLabel: string;
  revenueUSD: number;
  revenueIQD: number;
  cogsUSD: number; // Cost of goods sold
  cogsIQD: number;
  profitUSD: number;
  profitIQD: number;
  marginPercent: number;
  itemsSoldCount: number;
  mobilesSoldCount: number;
  accessoriesSoldCount: number;
  salesCount: number;
  averageProfitPerSaleUSD: number;
}

export interface InStockCostSummary {
  totalMobilesCount: number;
  totalMobilesCostUSD: number;
  totalMobilesCostIQD: number;
  totalMobilesRetailUSD: number;
  totalMobilesRetailIQD: number;
  totalMobilesPotentialProfitUSD: number;
  totalMobilesPotentialProfitIQD: number;
  mobilesMarginPercent: number;

  totalAccessoriesCount: number;
  totalAccessoriesSkus: number;
  totalAccessoriesCostUSD: number;
  totalAccessoriesCostIQD: number;
  totalAccessoriesRetailUSD: number;
  totalAccessoriesRetailIQD: number;
  totalAccessoriesPotentialProfitUSD: number;
  totalAccessoriesPotentialProfitIQD: number;
  accessoriesMarginPercent: number;

  totalCombinedCostUSD: number;
  totalCombinedCostIQD: number;
  totalCombinedRetailUSD: number;
  totalCombinedRetailIQD: number;
  totalCombinedPotentialProfitUSD: number;
  totalCombinedPotentialProfitIQD: number;
  combinedMarginPercent: number;
}

export interface InStockItemReport {
  id: string;
  type: 'mobile' | 'accessory';
  name: string;
  brand: string;
  category: string;
  identifier: string; // IMEI or Barcode
  condition?: string;
  quantity: number;
  currency: 'USD' | 'IQD';
  unitBuyPrice: number;
  unitBuyPriceUSD: number;
  unitBuyPriceIQD: number;
  totalCostUSD: number;
  totalCostIQD: number;
  unitSellPrice: number;
  unitSellPriceUSD: number;
  unitSellPriceIQD: number;
  totalRetailUSD: number;
  totalRetailIQD: number;
  potentialUnitProfitUSD: number;
  potentialUnitProfitIQD: number;
  marginPercent: number;
  purchaseDate?: string;
  daysInStock: number;
  status: string;
  supplierName?: string;
}

export interface ProductProfitRank {
  id: string;
  name: string;
  type: 'mobile' | 'accessory';
  brand: string;
  category: string;
  unitsSold: number;
  totalRevenueUSD: number;
  totalRevenueIQD: number;
  totalCostUSD: number;
  totalCostIQD: number;
  totalProfitUSD: number;
  totalProfitIQD: number;
  marginPercent: number;
}

export interface BrandProfitBreakdown {
  brand: string;
  itemsSoldCount: number;
  totalRevenueUSD: number;
  totalCostUSD: number;
  totalProfitUSD: number;
  profitContributionPercent: number;
  inStockCount: number;
  inStockCostUSD: number;
}

export interface FinancialPositionSummary {
  // Receivables (Incoming money owed to shop)
  customerDebtsUSD: number;
  customerDebtsIQD: number;
  installmentsBalanceUSD: number;
  installmentsBalanceIQD: number;
  totalReceivablesUSD: number;
  totalReceivablesIQD: number;

  // Payables (Outgoing money shop owes to suppliers)
  supplierPayablesUSD: number;
  supplierPayablesIQD: number;
  totalPayablesUSD: number;
  totalPayablesIQD: number;

  // Inventory Assets
  inventoryCostUSD: number;
  inventoryCostIQD: number;
  inventoryRetailUSD: number;
  inventoryRetailIQD: number;

  // Net Balance
  netWorkingCapitalUSD: number;
  netWorkingCapitalIQD: number;
}

export interface DailySalesTrendPoint {
  date: string;
  label: string;
  revenueUSD: number;
  cogsUSD: number;
  profitUSD: number;
  revenueIQD: number;
  profitIQD: number;
  salesCount: number;
}
