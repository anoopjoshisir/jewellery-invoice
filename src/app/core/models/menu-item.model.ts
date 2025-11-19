/**
 * Menu Item Management Models
 *
 * Defines data structures for restaurant menu management including:
 * - Menu categories and subcategories
 * - Menu items with variants and modifiers
 * - Pricing and availability
 * - Dietary information and allergens
 */

export enum FoodType {
  VEG = 'veg',
  NON_VEG = 'non_veg',
  VEGAN = 'vegan',
  EGGETARIAN = 'eggetarian'
}

export enum SpiceLevel {
  NONE = 'none',
  MILD = 'mild',
  MEDIUM = 'medium',
  HOT = 'hot',
  EXTRA_HOT = 'extra_hot'
}

export enum MenuItemStatus {
  AVAILABLE = 'available',
  OUT_OF_STOCK = 'out_of_stock',
  SEASONAL = 'seasonal',
  COMING_SOON = 'coming_soon',
  DISCONTINUED = 'discontinued'
}

export interface MenuCategory {
  id?: string;
  tenantId: string;

  // Basic Information
  name: string; // e.g., "Starters", "Main Course", "Desserts"
  displayName: string;
  description?: string;

  // Organization
  parentCategoryId?: string; // For subcategories
  level: number; // 0 = root, 1 = subcategory, etc.

  // Display
  displayOrder: number;
  icon?: string; // Icon name or emoji
  color?: string; // Color code for UI
  image?: string; // Category image URL

  // Availability
  isActive: boolean;
  isVisible: boolean; // Show in menu

  // Timing
  availableDays?: number[]; // 0-6 (Sunday-Saturday), empty = all days
  availableFrom?: string; // HH:mm format
  availableUntil?: string; // HH:mm format

  // Statistics
  itemCount: number; // Number of items in category

  // Audit fields
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface MenuItemVariant {
  id: string; // Unique ID for variant
  name: string; // e.g., "Small", "Medium", "Large", "Half", "Full"
  price: number;
  discountedPrice?: number;

  // Availability
  isAvailable: boolean;

  // Serving Information
  servingSize?: string; // e.g., "250ml", "500g"
  calories?: number;

  // Default selection
  isDefault: boolean;

  // Display
  displayOrder: number;
}

export interface MenuItemModifier {
  id: string;
  name: string; // e.g., "Extra Cheese", "No Onions", "Less Spicy"
  price: number; // Additional charge (can be 0)

  // Type
  modifierType: 'addon' | 'removal' | 'customization';

  // Availability
  isAvailable: boolean;

  // Default selection
  isDefault: boolean;
  isRequired: boolean;

  // Display
  displayOrder: number;
}

export interface NutritionInfo {
  calories: number;
  protein: number; // grams
  carbohydrates: number; // grams
  fat: number; // grams
  fiber?: number; // grams
  sugar?: number; // grams
  sodium?: number; // mg
}

export interface MenuItem {
  id?: string;
  tenantId: string;

  // Basic Information
  name: string;
  displayName: string;
  description?: string;
  shortDescription?: string; // For list views

  // Organization
  categoryId: string;
  categoryName?: string; // Denormalized for quick display
  subcategoryId?: string;

  // Identification
  itemCode?: string; // SKU or item code
  barcode?: string;

  // Pricing (for single-variant items)
  basePrice: number;
  discountedPrice?: number;
  taxRate: number; // Percentage

  // Variants (for items with sizes/options)
  hasVariants: boolean;
  variants: MenuItemVariant[];

  // Modifiers (add-ons, customizations)
  modifiers: MenuItemModifier[];

  // Food Classification
  foodType: FoodType;
  spiceLevel: SpiceLevel;
  cuisine?: string; // e.g., "Indian", "Chinese", "Continental"

  // Dietary Information
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  allergens: string[]; // e.g., ["peanuts", "shellfish", "soy"]
  nutritionInfo?: NutritionInfo;

  // Availability
  status: MenuItemStatus;
  isAvailable: boolean;
  availableQuantity?: number; // Stock quantity (if tracked)

  // Timing
  availableDays?: number[]; // 0-6 (Sunday-Saturday)
  availableFrom?: string; // HH:mm format
  availableUntil?: string; // HH:mm format
  seasonalFrom?: string; // ISO date
  seasonalUntil?: string; // ISO date

  // Preparation
  preparationTime: number; // Minutes
  cookingInstructions?: string;

  // Display
  image?: string; // Primary image URL
  images?: string[]; // Additional images
  displayOrder: number;
  isFeatured: boolean;
  isPopular: boolean;
  isBestSeller: boolean;
  isChefSpecial: boolean;
  isNew: boolean;

  // Tags and Search
  tags: string[]; // e.g., ["healthy", "low-calorie", "kids-friendly"]
  searchKeywords: string[]; // Additional keywords for search

  // Recommendations
  recommendedWith: string[]; // IDs of items that go well together

  // Statistics
  orderCount: number; // Total times ordered
  rating?: number; // Average rating (1-5)
  reviewCount?: number;

  // Notes
  chefNotes?: string;
  servingNotes?: string;

  // Visibility
  isActive: boolean;
  isVisible: boolean; // Show in menu

  // Audit fields
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface MenuSection {
  id?: string;
  tenantId: string;

  // Basic Information
  name: string; // e.g., "Breakfast Menu", "Lunch Specials", "Dinner Menu"
  description?: string;

  // Timing
  availableDays: number[]; // 0-6
  availableFrom: string; // HH:mm
  availableUntil: string; // HH:mm

  // Categories included
  categoryIds: string[];

  // Display
  displayOrder: number;
  isActive: boolean;

  // Audit fields
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

// Helper interfaces for UI
export interface MenuItemWithCategory extends MenuItem {
  category: MenuCategory;
  subcategory?: MenuCategory;
}

export interface CategoryWithItems {
  category: MenuCategory;
  items: MenuItem[];
  subcategories?: CategoryWithItems[];
}

export interface MenuSummary {
  totalCategories: number;
  totalItems: number;
  availableItems: number;
  outOfStockItems: number;
  popularItems: MenuItem[];
  newItems: MenuItem[];
  bestSellers: MenuItem[];
}

// Default values
export const DEFAULT_TAX_RATE = 5; // 5% GST
export const DEFAULT_PREPARATION_TIME = 15; // 15 minutes

export const FOOD_TYPE_ICONS: Record<FoodType, string> = {
  [FoodType.VEG]: '🟢',
  [FoodType.NON_VEG]: '🔴',
  [FoodType.VEGAN]: '🟢',
  [FoodType.EGGETARIAN]: '🟡'
};

export const FOOD_TYPE_LABELS: Record<FoodType, string> = {
  [FoodType.VEG]: 'Vegetarian',
  [FoodType.NON_VEG]: 'Non-Vegetarian',
  [FoodType.VEGAN]: 'Vegan',
  [FoodType.EGGETARIAN]: 'Eggetarian'
};

export const SPICE_LEVEL_LABELS: Record<SpiceLevel, string> = {
  [SpiceLevel.NONE]: 'No Spice',
  [SpiceLevel.MILD]: 'Mild',
  [SpiceLevel.MEDIUM]: 'Medium',
  [SpiceLevel.HOT]: 'Hot',
  [SpiceLevel.EXTRA_HOT]: 'Extra Hot'
};

export const SPICE_LEVEL_ICONS: Record<SpiceLevel, string> = {
  [SpiceLevel.NONE]: '',
  [SpiceLevel.MILD]: '🌶️',
  [SpiceLevel.MEDIUM]: '🌶️🌶️',
  [SpiceLevel.HOT]: '🌶️🌶️🌶️',
  [SpiceLevel.EXTRA_HOT]: '🌶️🌶️🌶️🌶️'
};

// Utility functions
export function calculateItemPrice(
  item: MenuItem,
  variantId?: string,
  modifierIds: string[] = []
): number {
  let price = item.basePrice;

  // If has variants and variant is selected
  if (item.hasVariants && variantId) {
    const variant = item.variants.find(v => v.id === variantId);
    if (variant) {
      price = variant.discountedPrice || variant.price;
    }
  } else if (item.discountedPrice) {
    price = item.discountedPrice;
  }

  // Add modifier prices
  modifierIds.forEach(modId => {
    const modifier = item.modifiers.find(m => m.id === modId);
    if (modifier) {
      price += modifier.price;
    }
  });

  return price;
}

export function calculateTaxAmount(price: number, taxRate: number): number {
  return Math.round((price * taxRate / 100) * 100) / 100;
}

export function calculateTotalWithTax(price: number, taxRate: number): number {
  return price + calculateTaxAmount(price, taxRate);
}

export function isItemAvailableNow(item: MenuItem): boolean {
  if (!item.isActive || !item.isVisible || !item.isAvailable) {
    return false;
  }

  if (item.status !== MenuItemStatus.AVAILABLE) {
    return false;
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // Check day availability
  if (item.availableDays && item.availableDays.length > 0) {
    if (!item.availableDays.includes(currentDay)) {
      return false;
    }
  }

  // Check time availability
  if (item.availableFrom && currentTime < item.availableFrom) {
    return false;
  }
  if (item.availableUntil && currentTime > item.availableUntil) {
    return false;
  }

  // Check seasonal availability
  if (item.seasonalFrom && item.seasonalUntil) {
    const nowDate = now.toISOString().split('T')[0];
    if (nowDate < item.seasonalFrom || nowDate > item.seasonalUntil) {
      return false;
    }
  }

  // Check stock
  if (item.availableQuantity !== undefined && item.availableQuantity <= 0) {
    return false;
  }

  return true;
}

export function getItemDisplayPrice(item: MenuItem): string {
  if (item.hasVariants && item.variants.length > 0) {
    const prices = item.variants
      .filter(v => v.isAvailable)
      .map(v => v.discountedPrice || v.price);

    if (prices.length === 0) return '₹0';

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
      return `₹${minPrice}`;
    }
    return `₹${minPrice} - ₹${maxPrice}`;
  }

  const price = item.discountedPrice || item.basePrice;
  return `₹${price}`;
}

export function hasDiscount(item: MenuItem): boolean {
  if (item.hasVariants) {
    return item.variants.some(v => v.discountedPrice && v.discountedPrice < v.price);
  }
  return item.discountedPrice !== undefined && item.discountedPrice < item.basePrice;
}

export function getDiscountPercentage(originalPrice: number, discountedPrice: number): number {
  if (originalPrice === 0) return 0;
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
}
