export type SupplierReturnStatus = 
  | 'pending_dispatch'       // In Store (Quarantined) - Awaiting Pickup / Rep Courier
  | 'dispatched'             // Sent to Supplier (At Factory / Service Center)
  | 'received_replacement'   // Resolved: Supplier delivered brand new replacement unit
  | 'refunded_cash'          // Resolved: Supplier returned full cash back
  | 'credited_to_account'    // Resolved: Supplier deducted from current shop debt/balance
  | 'rejected';              // Supplier denied warranty (e.g. water damage/expired)

export type ReturnItemType = 'mobile' | 'accessory' | 'screen_protector' | 'other';

export type RequestedResolution = 'replacement' | 'cash_refund' | 'account_credit';

export type DefectCategory = 
  | 'dead_on_arrival'        // Dead on Arrival / Won't Power On
  | 'screen_display'         // Screen / Touch / Lines / Flickering
  | 'battery_charging'       // Battery Drain / Charging Port Defect
  | 'audio_mic'              // Speaker / Earpiece / Microphone Fault
  | 'camera_sensor'          // Camera Blur / Black Screen / Sensor Error
  | 'connectivity'           // No Service / Baseband / Wi-Fi / Bluetooth
  | 'cracked_damaged'        // Damaged in Box / Factory Cosmetic Flaw
  | 'accessory_defect'       // Charger / Cable / Audio Not Working
  | 'wrong_item_sent'        // Wrong Model / Color / Spec from Supplier
  | 'other';                 // Other Hardware Issue

export interface SupplierReturnItem {
  id: string;
  rmaNumber: string;                 // e.g. "RMA-2026-0038"
  supplierId: string;                // ID in nali_suppliers
  supplierName: string;
  supplierPhone?: string;
  supplierCity?: string;
  itemType: ReturnItemType;
  itemId?: string;                   // Reference to original inventory item
  itemName: string;
  brand: string;
  model?: string;
  serialOrImei?: string;             // IMEI for phones, S/N for accessories
  color?: string;
  storage?: string;
  quantity: number;
  unitCost: number;
  currency: 'USD' | 'IQD';
  totalValue: number;
  defectCategory: DefectCategory;
  defectDescription: string;
  customerName?: string;             // If returned by customer to shop first
  customerPhone?: string;
  requestedResolution: RequestedResolution;
  status: SupplierReturnStatus;
  priority: 'normal' | 'high' | 'urgent';
  invoiceRef?: string;               // Original Purchase Invoice Ref
  purchaseDate?: string;
  createdAt: string;
  dispatchedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  replacementSerialOrImei?: string;  // New IMEI / Serial if replaced
  replacementItemName?: string;
  refundAmount?: number;
  refundCurrency?: 'USD' | 'IQD';
  settlementType?: 'replacement_restocked' | 'cash_collected' | 'debt_deducted' | 'supplier_rejected';
  photos?: string[];
  notes?: string;
}

export interface SupplierReturnStats {
  totalReturns: number;
  pendingCount: number;
  dispatchedCount: number;
  resolvedCount: number;
  totalPendingValueUSD: number;
  totalPendingValueIQD: number;
  totalRecoveredUSD: number;
  totalRecoveredIQD: number;
}
