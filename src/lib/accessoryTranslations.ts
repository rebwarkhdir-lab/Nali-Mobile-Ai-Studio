import { AccessoryStatus } from '../types/accessory';

export function getCategoryTranslation(category: string, t: (key: any, defaultValOrOptions?: any) => any): string {
  if (!category) return '';
  const translated = t(`accessories.categories.${category}`, { defaultValue: category });
  if (translated && translated !== `accessories.categories.${category}`) {
    return translated;
  }
  return category;
}

export function getWarrantyTranslation(warranty: string, t: (key: any, defaultValOrOptions?: any) => any): string {
  if (!warranty) return '';
  const translated = t(`accessories.warranties.${warranty}`, { defaultValue: warranty });
  if (translated && translated !== `accessories.warranties.${warranty}`) {
    return translated;
  }
  return warranty;
}

export function getStatusTranslation(status: AccessoryStatus, t: (key: any, defaultValOrOptions?: any) => any): string {
  switch (status) {
    case 'in_stock':
      return t('accessories.inStock', { defaultValue: 'In Stock' });
    case 'low_stock':
      return t('accessories.lowStock', { defaultValue: 'Low Stock' });
    case 'out_of_stock':
      return t('accessories.outOfStock', { defaultValue: 'Out of Stock' });
    case 'discontinued':
      return t('accessories.discontinued', { defaultValue: 'Discontinued' });
    default:
      return status;
  }
}
