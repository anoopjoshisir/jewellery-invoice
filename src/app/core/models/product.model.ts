/**
 * Product/Inventory Master Model
 * Complete product catalog with stock tracking
 */

export enum ProductCategory {
  RING = 'RING',
  NECKLACE = 'NECKLACE',
  EARRING = 'EARRING',
  BRACELET = 'BRACELET',
  BANGLE = 'BANGLE',
  PENDANT = 'PENDANT',
  CHAIN = 'CHAIN',
  MANGALSUTRA = 'MANGALSUTRA',
  NOSERING = 'NOSERING',
  ANKLET = 'ANKLET',
  COIN = 'COIN',
  BAR = 'BAR',
  OTHER = 'OTHER'
}

export enum ProductType {
  JEWELLERY = 'JEWELLERY',
  LOOSE_DIAMOND = 'LOOSE_DIAMOND',
  LOOSE_GEMSTONE = 'LOOSE_GEMSTONE',
  BULLION = 'BULLION',
  ACCESSORY = 'ACCESSORY'
}

export enum StockStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  ON_ORDER = 'ON_ORDER'
}

export interface StoneDetail {
  stoneType: string;           // Diamond, Ruby, Emerald, etc.
  quantity: number;
  weight: number;              // Carats
  clarity?: string;            // IF, VVS1, VS1, etc.
  color?: string;              // D, E, F, G, etc.
  cut?: string;                // Excellent, Very Good, etc.
  shape?: string;              // Round, Princess, Oval, etc.
  certificateNumber?: string;   // GIA, IGI certificate number
  certificateType?: string;     // GIA, IGI, etc.
  value?: number;
}

export interface Product {
  id?: string;
  tenantId: string;

  // Basic Information
  sku: string;                 // Stock Keeping Unit (unique)
  barcode?: string;            // Barcode/QR code
  name: string;
  description?: string;
  category: ProductCategory;
  productType: ProductType;

  // Metal Details
  metalType?: string;          // 22K, 18K, Silver, etc.
  purity?: string;             // 916, 750, 999, etc.
  grossWeight?: number;        // Total weight in grams
  netWeight?: number;          // Pure gold/metal weight in grams
  wastagePercent?: number;     // Wastage percentage
  wastageWeight?: number;      // Wastage in grams

  // Pricing
  makingChargesType?: 'per_gram' | 'percentage' | 'fixed';
  makingChargesValue?: number;
  makingCharges?: number;      // Calculated or fixed
  goldRate?: number;           // Rate per gram at time of entry
  goldValue?: number;          // Total gold value
  stoneValue?: number;         // Total stone value
  totalValue?: number;         // Complete value
  mrp?: number;                // Maximum Retail Price
  sellingPrice?: number;       // Actual selling price

  // Stones (if applicable)
  hasStones: boolean;
  stones?: StoneDetail[];

  // Hallmark Details
  hasHallmark: boolean;
  hallmarkNumber?: string;
  hallmarkDate?: string;
  hallmarkCenter?: string;
  huid?: string;               // Hallmark Unique ID (6-digit)

  // Stock Management
  stockQuantity: number;
  stockStatus: StockStatus;
  minStockLevel?: number;      // Alert when below this
  reorderLevel?: number;
  reorderQuantity?: number;

  // Additional Details
  size?: string;               // Ring size, bangle size, etc.
  design?: string;
  occasion?: string;           // Wedding, Party, Daily Wear, etc.
  gender?: 'Men' | 'Women' | 'Unisex' | 'Kids';
  images?: string[];           // Product image URLs

  // Location
  shelfLocation?: string;
  storeLocation?: string;

  // Status
  isActive: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  salePercent?: number;

  // Audit fields
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;

  // Additional metadata
  tags?: string[];
  notes?: string;
}

export interface StockTransaction {
  id?: string;
  tenantId: string;
  productId: string;
  productSku: string;
  productName: string;

  // Transaction details
  transactionType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE';
  quantity: number;
  previousStock: number;
  newStock: number;

  // Reference
  referenceType?: 'PURCHASE' | 'SALE' | 'INVOICE' | 'ESTIMATE' | 'MANUAL';
  referenceId?: string;
  referenceNumber?: string;

  // Audit
  transactionDate: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  notes?: string;
}

export interface ProductSummary {
  totalProducts: number;
  inStockProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalStockValue: number;
  categorySummary: Record<ProductCategory, number>;
}

// Helper functions
export function calculateMakingCharges(
  product: Product,
  customGrossWeight?: number
): number {
  const weight = customGrossWeight || product.grossWeight || 0;

  switch (product.makingChargesType) {
    case 'per_gram':
      return weight * (product.makingChargesValue || 0);
    case 'percentage':
      const goldValue = product.goldValue || 0;
      return goldValue * ((product.makingChargesValue || 0) / 100);
    case 'fixed':
      return product.makingChargesValue || 0;
    default:
      return 0;
  }
}

export function calculateProductValue(
  product: Product,
  currentGoldRate?: number
): number {
  const rate = currentGoldRate || product.goldRate || 0;
  const netWeight = product.netWeight || product.grossWeight || 0;

  const goldValue = netWeight * rate;
  const makingCharges = calculateMakingCharges(product);
  const stoneValue = product.stoneValue || 0;

  return goldValue + makingCharges + stoneValue;
}

export function getStockStatusColor(status: StockStatus): string {
  switch (status) {
    case StockStatus.IN_STOCK:
      return '#48bb78';
    case StockStatus.LOW_STOCK:
      return '#ed8936';
    case StockStatus.OUT_OF_STOCK:
      return '#f56565';
    case StockStatus.ON_ORDER:
      return '#4299e1';
    default:
      return '#a0aec0';
  }
}

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.RING]: 'Ring',
  [ProductCategory.NECKLACE]: 'Necklace',
  [ProductCategory.EARRING]: 'Earring',
  [ProductCategory.BRACELET]: 'Bracelet',
  [ProductCategory.BANGLE]: 'Bangle',
  [ProductCategory.PENDANT]: 'Pendant',
  [ProductCategory.CHAIN]: 'Chain',
  [ProductCategory.MANGALSUTRA]: 'Mangalsutra',
  [ProductCategory.NOSERING]: 'Nosering',
  [ProductCategory.ANKLET]: 'Anklet',
  [ProductCategory.COIN]: 'Coin/Bar',
  [ProductCategory.BAR]: 'Bar/Biscuit',
  [ProductCategory.OTHER]: 'Other'
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  [ProductType.JEWELLERY]: 'Jewellery',
  [ProductType.LOOSE_DIAMOND]: 'Loose Diamond',
  [ProductType.LOOSE_GEMSTONE]: 'Loose Gemstone',
  [ProductType.BULLION]: 'Bullion',
  [ProductType.ACCESSORY]: 'Accessory'
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  [StockStatus.IN_STOCK]: 'In Stock',
  [StockStatus.LOW_STOCK]: 'Low Stock',
  [StockStatus.OUT_OF_STOCK]: 'Out of Stock',
  [StockStatus.ON_ORDER]: 'On Order'
};
