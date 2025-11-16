/**
 * Restaurant Settings Models
 *
 * Defines data structures for restaurant-specific configuration including:
 * - Operating hours
 * - Table configuration
 * - Menu settings
 * - KOT settings
 * - Billing and payment settings
 */

export interface RestaurantSettings {
  id?: string;
  tenantId: string;

  // Basic Information
  restaurantName: string;
  displayName: string;
  tagline?: string;
  description?: string;

  // Contact Information
  phone: string;
  email?: string;
  website?: string;

  // Address
  address: RestaurantAddress;

  // Operating Hours
  operatingHours: OperatingHours;
  holidays: string[]; // Array of dates in ISO format

  // Cuisine Types
  cuisineTypes: string[]; // e.g., ["Indian", "Chinese", "Continental"]

  // Capacity
  totalSeatingCapacity: number;
  totalTables: number;

  // Features
  features: RestaurantFeatures;

  // KOT Settings
  kotSettings: KOTSettings;

  // Billing Settings
  billingSettings: BillingSettings;

  // Menu Settings
  menuSettings: MenuSettings;

  // Online Ordering
  onlineOrderingSettings?: OnlineOrderingSettings;

  // Delivery Settings
  deliverySettings?: DeliverySettings;

  // Notification Settings
  notificationSettings: NotificationSettings;

  // Print Settings
  printSettings: PrintSettings;

  // Branding
  logo?: string; // URL to logo image
  banner?: string; // URL to banner image
  theme?: RestaurantTheme;

  // Audit fields
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface RestaurantAddress {
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface OperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isOpen: boolean;
  slots: TimeSlot[];
}

export interface TimeSlot {
  openTime: string; // HH:mm format
  closeTime: string; // HH:mm format
  slotType: 'breakfast' | 'lunch' | 'dinner' | 'all_day';
}

export interface RestaurantFeatures {
  // Dining Options
  hasDineIn: boolean;
  hasTakeaway: boolean;
  hasDelivery: boolean;
  hasOnlineOrdering: boolean;

  // Table Features
  hasTableReservation: boolean;
  hasTableQROrdering: boolean;
  hasWaitlist: boolean;

  // Kitchen Features
  hasKOTSystem: boolean;
  hasKitchenDisplay: boolean;
  hasMultipleKitchenStations: boolean;

  // Payment Features
  acceptsCash: boolean;
  acceptsCard: boolean;
  acceptsUPI: boolean;
  acceptsWallet: boolean;
  hasOnlinePayment: boolean;
  offersCreditFacility: boolean;

  // Service Features
  hasValet: boolean;
  hasParkingFacility: boolean;
  hasWiFi: boolean;
  hasAC: boolean;
  hasOutdoorSeating: boolean;
  hasBarCounter: boolean;
  hasLiveMusic: boolean;

  // Other Features
  allowsSplitBilling: boolean;
  allowsCustomTips: boolean;
  hasSeniorCitizenDiscount: boolean;
  hasLoyaltyProgram: boolean;
}

export interface KOTSettings {
  // Generation
  autoGenerateKOT: boolean; // Auto generate when order is placed
  requireKOTApproval: boolean; // Require approval before sending to kitchen

  // Numbering
  kotNumberPrefix: string; // e.g., "KOT", "K"
  resetNumberingDaily: boolean;

  // Routing
  autoRouteToStations: boolean; // Auto assign items to kitchen stations
  allowStationSelection: boolean; // Allow manual station selection

  // Grouping
  groupItemsByStation: boolean; // Create separate KOTs per station
  maxItemsPerKOT: number; // Maximum items in one KOT (0 = unlimited)

  // Timing
  defaultPreparationTime: number; // Default prep time in minutes
  showEstimatedTime: boolean;
  enableTimerAlerts: boolean;

  // Priority
  autoMarkUrgent: boolean; // Auto mark as urgent based on rules
  urgentAfterMinutes: number; // Mark as urgent after X minutes

  // Modifications
  allowKOTModification: boolean;
  allowKOTCancellation: boolean;
  requireReasonForCancellation: boolean;

  // Kitchen Display
  refreshInterval: number; // Seconds (for kitchen display refresh)
  soundAlertOnNewKOT: boolean;
  highlightOverdueKOTs: boolean;

  // Printing
  autoPrintKOT: boolean;
  printCopies: number;
  printToStationPrinters: boolean; // Print to station-specific printers
}

export interface BillingSettings {
  // Tax Configuration
  defaultTaxRate: number; // Percentage
  includeTaxInPrice: boolean; // Tax inclusive pricing
  showTaxBreakdown: boolean;

  // Charges
  enableServiceCharge: boolean;
  serviceChargeRate: number; // Percentage
  enablePackagingCharges: boolean;
  packagingChargeAmount: number;

  // Discounts
  allowDiscounts: boolean;
  maxDiscountPercentage: number;
  requireApprovalForDiscount: boolean;
  approvalThresholdPercentage: number;

  // Rounding
  enableRounding: boolean;
  roundingType: 'nearest' | 'up' | 'down';
  roundingTo: number; // e.g., 1 for nearest rupee, 0.5 for nearest 50 paise

  // Split Billing
  allowSplitBilling: boolean;
  maxSplits: number;

  // Tips
  enableTips: boolean;
  suggestedTipPercentages: number[]; // e.g., [5, 10, 15, 20]

  // Invoice
  invoicePrefix: string;
  invoiceNumberFormat: 'sequential' | 'date-based';
  showGSTIN: boolean;
  showFSSAI: boolean;

  // Payment
  minimumOrderValue: number;
  allowPartialPayment: boolean;
}

export interface MenuSettings {
  // Display
  showImages: boolean;
  showPrices: boolean;
  showPreparationTime: boolean;
  showCalories: boolean;
  showAllergens: boolean;

  // Availability
  hideOutOfStock: boolean;
  showSeasonalItems: boolean;

  // Categorization
  enableSubcategories: boolean;
  defaultSortOrder: 'name' | 'price' | 'popularity' | 'custom';

  // Recommendations
  showRecommendations: boolean;
  maxRecommendations: number;

  // Search
  enableSearch: boolean;
  enableFilters: boolean;
}

export interface OnlineOrderingSettings {
  isEnabled: boolean;

  // Timing
  acceptOrdersDuringHours: boolean; // Only during operating hours
  acceptAdvanceOrders: boolean;
  maxAdvanceOrderDays: number;

  // Ordering
  minimumOrderValue: number;
  maximumOrderValue?: number;

  // Preparation
  standardPreparationTime: number; // Minutes
  bufferTime: number; // Additional buffer time

  // Delivery
  acceptDeliveryOrders: boolean;
  acceptPickupOrders: boolean;
}

export interface DeliverySettings {
  isEnabled: boolean;

  // Area
  deliveryRadius: number; // Kilometers
  deliveryAreas: DeliveryArea[];

  // Charges
  baseDeliveryCharge: number;
  chargeType: 'flat' | 'distance-based';
  freeDeliveryAbove: number; // Free delivery above this order value

  // Timing
  standardDeliveryTime: number; // Minutes
  minimumDeliveryTime: number;
  maximumDeliveryTime: number;

  // Order Limits
  minimumOrderForDelivery: number;
  maxConcurrentDeliveries: number;
}

export interface DeliveryArea {
  name: string;
  pincode: string;
  deliveryCharge: number;
  estimatedTime: number; // Minutes
  isActive: boolean;
}

export interface NotificationSettings {
  // SMS Notifications
  enableSMS: boolean;
  sendOrderConfirmation: boolean;
  sendOrderReady: boolean;
  sendOutForDelivery: boolean;
  sendDelivered: boolean;

  // Email Notifications
  enableEmail: boolean;
  sendOrderConfirmationEmail: boolean;
  sendInvoiceEmail: boolean;

  // Kitchen Notifications
  notifyKitchenOnNewOrder: boolean;
  notificationSound: string;

  // Push Notifications
  enablePushNotifications: boolean;
}

export interface PrintSettings {
  // KOT Printing
  kotPrinterName?: string;
  kotPrintSize: 'thermal-2inch' | 'thermal-3inch' | 'a4';
  kotFontSize: 'small' | 'medium' | 'large';
  kotPrintLogo: boolean;

  // Bill Printing
  billPrinterName?: string;
  billPrintSize: 'thermal-2inch' | 'thermal-3inch' | 'a4';
  billFontSize: 'small' | 'medium' | 'large';
  billPrintLogo: boolean;
  billPrintQRCode: boolean;

  // Station Printers
  stationPrinters: Map<string, string>; // Station -> Printer name mapping

  // Print Options
  autoPrintBill: boolean;
  printDuplicateBill: boolean;
  watermarkOnDuplicate: string;
}

export interface RestaurantTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
}

// Default values
export const DEFAULT_OPERATING_HOURS: OperatingHours = {
  monday: { isOpen: true, slots: [{ openTime: '09:00', closeTime: '22:00', slotType: 'all_day' }] },
  tuesday: { isOpen: true, slots: [{ openTime: '09:00', closeTime: '22:00', slotType: 'all_day' }] },
  wednesday: { isOpen: true, slots: [{ openTime: '09:00', closeTime: '22:00', slotType: 'all_day' }] },
  thursday: { isOpen: true, slots: [{ openTime: '09:00', closeTime: '22:00', slotType: 'all_day' }] },
  friday: { isOpen: true, slots: [{ openTime: '09:00', closeTime: '22:00', slotType: 'all_day' }] },
  saturday: { isOpen: true, slots: [{ openTime: '09:00', closeTime: '23:00', slotType: 'all_day' }] },
  sunday: { isOpen: true, slots: [{ openTime: '09:00', closeTime: '23:00', slotType: 'all_day' }] }
};

export const DEFAULT_KOT_SETTINGS: Partial<KOTSettings> = {
  autoGenerateKOT: true,
  requireKOTApproval: false,
  kotNumberPrefix: 'KOT',
  resetNumberingDaily: true,
  autoRouteToStations: true,
  allowStationSelection: true,
  groupItemsByStation: false,
  maxItemsPerKOT: 0,
  defaultPreparationTime: 15,
  showEstimatedTime: true,
  enableTimerAlerts: true,
  autoMarkUrgent: false,
  urgentAfterMinutes: 30,
  allowKOTModification: true,
  allowKOTCancellation: true,
  requireReasonForCancellation: true,
  refreshInterval: 30,
  soundAlertOnNewKOT: true,
  highlightOverdueKOTs: true,
  autoPrintKOT: true,
  printCopies: 1,
  printToStationPrinters: false
};

export const DEFAULT_BILLING_SETTINGS: Partial<BillingSettings> = {
  defaultTaxRate: 5,
  includeTaxInPrice: false,
  showTaxBreakdown: true,
  enableServiceCharge: false,
  serviceChargeRate: 10,
  enablePackagingCharges: false,
  packagingChargeAmount: 10,
  allowDiscounts: true,
  maxDiscountPercentage: 20,
  requireApprovalForDiscount: true,
  approvalThresholdPercentage: 10,
  enableRounding: true,
  roundingType: 'nearest',
  roundingTo: 1,
  allowSplitBilling: true,
  maxSplits: 4,
  enableTips: true,
  suggestedTipPercentages: [5, 10, 15, 20],
  invoicePrefix: 'INV',
  invoiceNumberFormat: 'date-based',
  showGSTIN: true,
  showFSSAI: true,
  minimumOrderValue: 0,
  allowPartialPayment: false
};

// Utility functions
export function isRestaurantOpen(settings: RestaurantSettings, checkDate?: Date): boolean {
  const date = checkDate || new Date();
  const dayNames: (keyof OperatingHours)[] = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];
  const dayName = dayNames[date.getDay()];
  const daySchedule = settings.operatingHours[dayName];

  if (!daySchedule.isOpen) return false;

  // Check if date is a holiday
  const dateStr = date.toISOString().split('T')[0];
  if (settings.holidays.includes(dateStr)) return false;

  // Check if current time falls within any slot
  const currentTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  return daySchedule.slots.some(slot =>
    currentTime >= slot.openTime && currentTime <= slot.closeTime
  );
}

export function getCurrentTimeSlot(settings: RestaurantSettings, checkDate?: Date): TimeSlot | null {
  const date = checkDate || new Date();
  const dayNames: (keyof OperatingHours)[] = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];
  const dayName = dayNames[date.getDay()];
  const daySchedule = settings.operatingHours[dayName];

  if (!daySchedule.isOpen) return null;

  const currentTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  return daySchedule.slots.find(slot =>
    currentTime >= slot.openTime && currentTime <= slot.closeTime
  ) || null;
}

export function getNextOpeningTime(settings: RestaurantSettings): Date | null {
  const now = new Date();
  const dayNames: (keyof OperatingHours)[] = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];

  // Check next 7 days
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + i);

    const dayName = dayNames[checkDate.getDay()];
    const daySchedule = settings.operatingHours[dayName];

    if (daySchedule.isOpen && daySchedule.slots.length > 0) {
      const firstSlot = daySchedule.slots[0];
      const [hours, minutes] = firstSlot.openTime.split(':').map(Number);

      checkDate.setHours(hours, minutes, 0, 0);

      if (checkDate > now) {
        return checkDate;
      }
    }
  }

  return null;
}
