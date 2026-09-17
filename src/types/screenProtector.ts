export type NotchType = 
  | 'waterdrop' 
  | 'punch_hole_center' 
  | 'punch_hole_left' 
  | 'dynamic_island' 
  | 'wide_notch' 
  | 'flat_full' 
  | 'curved_edge' 
  | 'universal';

export type GlassFinish = 
  | 'clear_hd'
  | 'matte_gaming'
  | 'privacy_anti_spy'
  | 'full_glue_9d'
  | 'uv_curved'
  | 'hydrogel'
  | 'camera_lens'
  | 'anti_blue_light';

export interface CompatibleModel {
  brand: string;
  model: string;
  aliases?: string[];
  screenSize?: string;
  releaseYear?: number;
  notes?: string;
  isPopular?: boolean;
}

export interface ScreenProtectorGroup {
  id: string;
  dieCode: string; // e.g. "SAM-A12", "IP-13/14-6.1", "REDMI-NOTE11"
  name: string; // e.g. "Samsung A12 / A02s / A03s / M12 (6.5\")"
  screenSize: string; // e.g. "6.5 inches"
  notchType: NotchType;
  primaryBrand: string;
  glassCategory?: GlassFinish[];
  models: CompatibleModel[];
  shelfLocation?: string; // e.g. "Box B-12 / Shelf 3"
  notes?: string;
  linkedAccessoryIds?: string[]; // IDs in nali_accessories
  customBarcodes?: string[];
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScreenProtectorSearchResult {
  group: ScreenProtectorGroup;
  matchedModel?: CompatibleModel;
  matchType: 'exact' | 'alias' | 'group_name' | 'die_code' | 'brand';
  inStockCount: number;
  inventoryItems: {
    id: string;
    name: string;
    brand: string;
    category: string;
    quantity: number;
    price: number;
    currency: 'USD' | 'IQD';
    location?: string;
    barcode?: string;
  }[];
}
