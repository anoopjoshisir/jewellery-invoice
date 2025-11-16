# Multi-Business ERP System - Comprehensive Advancement Plan

## 🎯 EXECUTIVE SUMMARY

Transform the current jewellery invoicing system into a **Multi-Business ERP Platform** supporting:

1. **💎 Jewellery Shops** - Gold/Silver business with purity tracking
2. **🍽️ Restaurants & Hotels** - KOT, table management, menu
3. **💊 Medical Shops/Pharmacies** - Prescription tracking, expiry management, Schedule H drugs
4. **🏪 General/Retail Stores** - POS, barcode scanning, loyalty programs

**Key Innovation**: Super Admin can configure **Small** or **Advanced** access levels for each client with granular feature control.

---

## 📊 BUSINESS TYPE FEATURE MATRIX

### Access Levels per Business Type

| Feature Category | Small Access | Advanced Access |
|-----------------|--------------|-----------------|
| **Max Users** | 3 | Unlimited |
| **Max Products/Items** | 500 | Unlimited |
| **Invoices/Month** | 100 | Unlimited |
| **Branches** | 1 | Multiple |
| **Reports** | Basic (5) | Advanced (20+) |
| **API Access** | ❌ | ✅ |
| **Custom Fields** | ❌ | ✅ |
| **Mobile App** | ❌ | ✅ |
| **WhatsApp Integration** | ❌ | ✅ |
| **Email Automation** | ❌ | ✅ |

---

## 💎 MODULE 1: JEWELLERY SHOP (Already Implemented + Enhancements)

### Current Features ✅
- Invoice generation with purity tracking
- Making charges and gold weight calculations
- Customer management
- Estimates/Quotations
- Payment tracking

### Enhancements to Add

#### 1. **Jewellery-Specific Inventory**

```typescript
// src/app/core/models/jewellery-product.model.ts

export interface JewelleryProduct {
  id?: string;
  tenantId: string;

  // Product Info
  productCode: string;
  itemName: string;
  category: 'necklace' | 'ring' | 'earring' | 'bracelet' | 'pendant' | 'chain' | 'bangle' | 'anklet';

  // Metal Details
  metalType: 'gold' | 'silver' | 'platinum' | 'diamond' | 'other';
  purity: string;  // '22K', '18K', '916', '999', etc.
  grossWeight: number;
  netWeight: number;
  stoneWeight?: number;

  // Gemstone Details
  hasStones: boolean;
  stones?: {
    type: string;  // Diamond, Ruby, Emerald, etc.
    quality: string;
    carats: number;
    pieces: number;
    value: number;
  }[];

  // Pricing
  makingCharges: number;
  makingChargesType: 'per_gram' | 'fixed' | 'percentage';
  wastage: number;
  wastageType: 'percentage' | 'grams';

  // Design
  designNo?: string;
  imageUrls: string[];
  hallmarkNo?: string;

  // Stock
  currentStock: number;
  minStockLevel: number;

  // Status
  status: 'in-stock' | 'sold' | 'on-order' | 'under-making';
  location?: string;

  // Audit
  createdAt: string;
  updatedBy?: string;
}

export interface GoldRate {
  id?: string;
  tenantId: string;

  date: string;
  purity: string;  // '24K', '22K', '18K'
  ratePerGram: number;

  createdAt: string;
  createdBy: string;
}

export interface CustomOrder {
  id?: string;
  tenantId: string;

  orderNo: string;
  customerId: string;
  customerName: string;

  // Design
  designNo?: string;
  referenceImage?: string;
  description: string;

  // Metal
  metalType: string;
  purity: string;
  approxWeight: number;

  // Stones
  stoneDetails?: string;

  // Pricing
  estimatedPrice: number;
  advanceAmount: number;
  balanceAmount: number;

  // Timeline
  orderDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;

  // Status
  status: 'order-taken' | 'design-approved' | 'in-making' | 'ready' | 'delivered';

  // Progress
  progressUpdates: {
    date: string;
    status: string;
    notes: string;
    imageUrl?: string;
  }[];

  createdAt: string;
}

export interface OldGoldPurchase {
  id?: string;
  tenantId: string;

  receiptNo: string;
  date: string;

  customerId: string;
  customerName: string;

  items: {
    description: string;
    purity: string;
    grossWeight: number;
    netWeight: number;
    ratePerGram: number;
    amount: number;
  }[];

  totalWeight: number;
  totalAmount: number;

  paymentMode: string;

  // Can be used for exchange
  usedInInvoiceId?: string;
  usedInInvoiceNo?: string;

  createdAt: string;
  createdBy: string;
}
```

#### 2. **Jewellery-Specific Features**

**Small Access:**
- ✅ Basic invoicing with purity tracking
- ✅ Customer management
- ✅ Daily gold rate update
- ✅ Stock register
- ✅ Basic reports (Sales, Payments, Stock)

**Advanced Access:**
- ✅ Everything in Small +
- ✅ Custom order management with progress tracking
- ✅ Old gold purchase and exchange
- ✅ Barcode printing for items
- ✅ Photo gallery for designs
- ✅ Hallmarking certificate tracking
- ✅ Stone inventory management
- ✅ Scheme/Installment management
- ✅ Repair and alteration tracking
- ✅ Automatic gold rate sync (API)
- ✅ WhatsApp order updates to customers
- ✅ Advanced analytics (Metal-wise sales, Making charges analysis)

---

## 🍽️ MODULE 2: RESTAURANT & HOTEL

### Database Models

```typescript
// src/app/core/models/restaurant.model.ts

export interface MenuItem {
  id?: string;
  tenantId: string;

  // Basic Info
  itemCode: string;
  name: string;
  description?: string;

  // Classification
  category: string;  // Starters, Main Course, Desserts, Beverages
  subCategory?: string;
  cuisine?: string;
  type: 'veg' | 'non-veg' | 'vegan' | 'egg';

  // Pricing
  price: number;
  taxRate: number;
  halfPlatePrice?: number;

  // Availability
  isAvailable: boolean;
  availableFrom?: string;
  availableTo?: string;
  daysAvailable?: string[];

  // Recipe & Costing (Advanced Access Only)
  hasRecipe: boolean;
  recipeId?: string;
  foodCost?: number;

  // Kitchen
  prepTimeMinutes: number;
  preparationStation: 'main-kitchen' | 'tandoor' | 'grill' | 'bar' | 'cold-station' | 'bakery';

  // Display
  imageUrl?: string;
  displayOrder: number;
  tags?: string[];

  // Add-ons & Variants
  variants?: { name: string; price: number; }[];
  addOns?: { name: string; price: number; }[];

  isActive: boolean;
  createdAt: string;
}

export interface Table {
  id?: string;
  tenantId: string;

  tableNo: string;
  tableName: string;
  section: string;
  capacity: number;
  type: 'regular' | 'vip' | 'private-dining' | 'outdoor';

  status: 'available' | 'occupied' | 'reserved' | 'cleaning';

  currentOrderId?: string;
  occupiedSince?: string;
  guestCount?: number;

  assignedWaiterId?: string;
  assignedWaiterName?: string;

  coordinates?: { x: number; y: number };  // For floor plan
  isActive: boolean;
}

export interface KOT {
  id?: string;
  tenantId: string;

  kotNo: string;
  kotDate: string;
  kotTime: string;

  orderId: string;
  orderNo: string;

  orderType: 'dine-in' | 'takeaway' | 'delivery' | 'room-service';
  tableId?: string;
  tableNo?: string;
  roomNo?: string;

  waiterId: string;
  waiterName: string;

  items: {
    menuItemId: string;
    itemName: string;
    category: string;
    quantity: number;
    variant?: string;
    addOns?: string[];
    price: number;
    specialInstructions?: string;
    status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
    orderedAt: string;
    readyAt?: string;
  }[];

  preparationStation: string;
  status: 'pending' | 'in-kitchen' | 'ready' | 'served' | 'cancelled';
  priority: 'normal' | 'high' | 'urgent';

  createdAt: string;
  printCount: number;
}

export interface RestaurantOrder {
  id?: string;
  tenantId: string;

  orderNo: string;
  orderDate: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery' | 'room-service';

  tableId?: string;
  tableNo?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  guestCount?: number;

  items: {
    menuItemId: string;
    itemName: string;
    quantity: number;
    price: number;
    taxRate: number;
    totalPrice: number;
    status: 'pending' | 'preparing' | 'ready' | 'served';
    kotId?: string;
  }[];

  kots: string[];  // KOT IDs

  waiterId: string;
  waiterName: string;

  // Billing
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  serviceChargeAmount: number;
  deliveryCharges: number;
  totalAmount: number;

  paymentStatus: 'pending' | 'partial' | 'paid';
  paymentMode?: string;

  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

  completedAt?: string;
  createdAt: string;
}

export interface TableReservation {
  id?: string;
  tenantId: string;

  reservationNo: string;
  tableId: string;
  tableNo: string;

  customerName: string;
  customerPhone: string;
  guestCount: number;

  reservationDate: string;
  reservationTime: string;

  occasion?: string;
  specialRequests?: string;

  status: 'pending' | 'confirmed' | 'arrived' | 'seated' | 'completed' | 'cancelled' | 'no-show';

  createdAt: string;
}
```

### Restaurant Features

**Small Access:**
- ✅ Menu management (up to 100 items)
- ✅ Table management (up to 20 tables)
- ✅ Basic KOT system
- ✅ Order taking and billing
- ✅ Dine-in and takeaway
- ✅ Basic reports (Daily sales, Item-wise sales)

**Advanced Access:**
- ✅ Everything in Small +
- ✅ Unlimited menu items and tables
- ✅ Multi-location/branch support
- ✅ Delivery management with rider tracking
- ✅ Table reservations
- ✅ Kitchen Display System (KDS)
- ✅ Recipe and food cost management
- ✅ Ingredient inventory tracking
- ✅ Online ordering integration
- ✅ Customer feedback and ratings
- ✅ Waiter performance analytics
- ✅ Table turnover optimization
- ✅ Happy hours and dynamic pricing
- ✅ WhatsApp order notifications
- ✅ Loyalty program

---

## 💊 MODULE 3: MEDICAL SHOP / PHARMACY

### Overview
Comprehensive pharmacy management with prescription tracking, expiry alerts, Schedule H drug compliance, and batch management.

### Database Models

```typescript
// src/app/core/models/medicine.model.ts

export interface Medicine {
  id?: string;
  tenantId: string;

  // Basic Info
  productCode: string;
  name: string;
  genericName?: string;
  manufacturer: string;

  // Classification
  category: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'ointment' | 'drops' | 'inhaler' | 'other';
  drugType: 'allopathy' | 'ayurvedic' | 'homeopathy' | 'unani';

  // Regulatory
  scheduleType: 'H' | 'H1' | 'X' | 'G' | 'OTC';  // Schedule H, H1, X (Narcotics), G (General), OTC
  requiresPrescription: boolean;

  // Packaging
  packSize: number;
  packUnit: 'tablets' | 'capsules' | 'ml' | 'gm';
  packType: 'strip' | 'bottle' | 'tube' | 'box' | 'vial';

  // Composition
  composition?: string;
  strength?: string;  // e.g., "500mg", "10ml"

  // Pricing
  mrp: number;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: number;

  // Stock
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderQuantity: number;

  // Storage
  storageCondition?: string;  // "Room Temperature", "Refrigerate 2-8°C"
  rackNo?: string;
  shelfNo?: string;

  // Batch Tracking
  hasBatchTracking: boolean;

  // Images
  imageUrl?: string;

  // Status
  isActive: boolean;
  isDiscontinued: boolean;

  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

export interface MedicineBatch {
  id?: string;
  tenantId: string;

  medicineId: string;
  medicineName: string;
  productCode: string;

  // Batch Details
  batchNo: string;
  manufacturingDate: string;
  expiryDate: string;

  // Stock
  quantity: number;
  availableQuantity: number;
  soldQuantity: number;
  returnedQuantity: number;
  damagedQuantity: number;

  // Pricing (can vary per batch)
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;

  // Supplier
  supplierId?: string;
  supplierName?: string;
  purchaseOrderId?: string;

  // Status
  status: 'active' | 'near-expiry' | 'expired' | 'recalled';

  // Audit
  receivedDate: string;
  createdAt: string;
}

export interface Prescription {
  id?: string;
  tenantId: string;

  // Prescription Info
  prescriptionNo: string;
  prescriptionDate: string;

  // Doctor Details
  doctorName: string;
  doctorRegNo?: string;
  hospitalName?: string;
  doctorPhone?: string;

  // Patient Details
  patientName: string;
  patientAge: number;
  patientGender: 'male' | 'female' | 'other';
  patientPhone?: string;
  patientAddress?: string;

  // Prescription Image (for verification)
  prescriptionImageUrl?: string;

  // Medicines Prescribed
  medicines: {
    medicineName: string;
    dosage: string;
    frequency: string;  // "1-0-1", "1-1-1"
    duration: string;   // "5 days", "1 week"
    instructions?: string;  // "After food", "Before sleep"
  }[];

  // Status
  status: 'pending' | 'partially-filled' | 'filled' | 'cancelled';

  // Link to Sales
  invoiceIds: string[];

  // Validity
  validityDays: number;
  expiresOn: string;

  // Notes
  notes?: string;

  // Audit
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface PharmacySale {
  id?: string;
  tenantId: string;

  // Sale Info
  billNo: string;
  billDate: string;
  billTime: string;

  // Customer (Optional for pharmacy)
  customerId?: string;
  customerName?: string;
  customerPhone?: string;

  // Prescription
  prescriptionId?: string;
  prescriptionNo?: string;
  doctorName?: string;

  // Items
  items: {
    medicineId: string;
    medicineName: string;
    batchId: string;
    batchNo: string;
    expiryDate: string;

    quantity: number;
    freeQuantity?: number;  // Buy 1 Get 1

    mrp: number;
    discount: number;
    discountPercent: number;
    sellingPrice: number;
    gstRate: number;
    gstAmount: number;
    totalAmount: number;

    scheduleType?: string;
  }[];

  // Totals
  subtotal: number;
  totalDiscount: number;
  totalGST: number;
  roundOff: number;
  totalAmount: number;

  // Payment
  paymentMode: 'cash' | 'card' | 'upi' | 'wallet';
  amountPaid: number;
  balanceAmount: number;

  // Schedule H Compliance
  hasScheduleHDrugs: boolean;
  pharmacistName?: string;
  pharmacistRegNo?: string;

  // Status
  status: 'completed' | 'cancelled' | 'returned';

  // Return
  returnedDate?: string;
  returnAmount?: number;
  returnReason?: string;

  // Audit
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface PurchaseOrder {
  id?: string;
  tenantId: string;

  poNo: string;
  poDate: string;

  supplierId: string;
  supplierName: string;
  supplierGSTIN?: string;

  items: {
    medicineId: string;
    medicineName: string;
    quantity: number;
    freeQuantity: number;
    purchasePrice: number;
    mrp: number;
    gstRate: number;
    gstAmount: number;
    totalAmount: number;

    batchNo?: string;
    expiryDate?: string;
  }[];

  subtotal: number;
  totalGST: number;
  otherCharges: number;
  totalAmount: number;

  status: 'draft' | 'sent' | 'partially-received' | 'received' | 'cancelled';

  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;

  paymentTerms?: string;
  notes?: string;

  createdAt: string;
  createdBy: string;
}

export interface ExpiryAlert {
  id?: string;
  tenantId: string;

  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNo: string;

  expiryDate: string;
  daysToExpiry: number;

  currentStock: number;
  estimatedValue: number;

  alertType: 'expiring-soon' | 'expired' | 'near-expiry';  // 60 days, expired, 30 days

  status: 'active' | 'acknowledged' | 'resolved';

  actionTaken?: string;  // "Returned to supplier", "Sold at discount", "Disposed"

  createdAt: string;
}

export interface DrugRegister {
  id?: string;
  tenantId: string;

  // For Schedule H, H1, X drugs
  date: string;
  billNo: string;

  // Medicine
  medicineName: string;
  batchNo: string;
  scheduleType: string;

  // Patient
  patientName: string;
  patientAge: number;
  patientAddress: string;

  // Doctor
  doctorName: string;
  doctorRegNo: string;

  // Quantity
  quantitySold: number;

  // Prescription
  prescriptionNo: string;

  // Pharmacist
  dispensedBy: string;
  pharmacistRegNo: string;

  createdAt: string;
}
```

### Medical Shop Features

**Small Access:**
- ✅ Medicine master (up to 500 products)
- ✅ Simple billing
- ✅ Basic stock management
- ✅ Expiry alerts (30 days before)
- ✅ Customer management
- ✅ Basic reports (Sales, Stock, Expiry)
- ✅ Schedule H drug register

**Advanced Access:**
- ✅ Everything in Small +
- ✅ Unlimited medicine database
- ✅ Batch-wise tracking
- ✅ Prescription management with image upload
- ✅ Barcode scanning
- ✅ Purchase order management
- ✅ Supplier management
- ✅ Multi-level expiry alerts (90, 60, 30 days)
- ✅ Automatic reorder suggestions
- ✅ Medicine substitution suggestions
- ✅ Drug interaction warnings
- ✅ Insurance claim management
- ✅ Doctor database
- ✅ SMS/WhatsApp reminders to patients
- ✅ Inventory optimization
- ✅ Margin analysis per medicine
- ✅ Slow-moving stock analysis
- ✅ GST filing reports
- ✅ Integration with distributors (API)

---

## 🏪 MODULE 4: GENERAL STORE / RETAIL

### Overview
Complete retail POS with barcode scanning, inventory management, loyalty programs, and multi-payment support.

### Database Models

```typescript
// src/app/core/models/retail.model.ts

export interface RetailProduct {
  id?: string;
  tenantId: string;

  // Basic Info
  productCode: string;
  barcode?: string;
  name: string;
  description?: string;

  // Classification
  category: string;
  subCategory?: string;
  brand?: string;

  // Packaging
  unit: 'pcs' | 'kg' | 'gram' | 'liter' | 'ml' | 'box' | 'packet' | 'dozen';
  packSize?: string;  // "500g", "1L", "Pack of 6"

  // Pricing
  mrp: number;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;

  // Discounts
  hasDiscount: boolean;
  discountPercent?: number;
  discountValidFrom?: string;
  discountValidTo?: string;

  // Stock
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderPoint: number;

  // Supplier
  supplierId?: string;
  supplierName?: string;

  // Product Details
  imageUrl?: string;
  tags?: string[];

  // Perishable
  isPerishable: boolean;
  shelfLifeDays?: number;

  // Batch tracking (for perishables)
  hasBatchTracking: boolean;

  // Status
  isActive: boolean;
  isFeatured: boolean;

  // Audit
  createdAt: string;
  updatedAt?: string;
}

export interface RetailBatch {
  id?: string;
  tenantId: string;

  productId: string;
  productName: string;

  batchNo: string;
  manufacturingDate?: string;
  expiryDate?: string;

  quantity: number;
  availableQuantity: number;

  purchasePrice: number;
  mrp: number;

  status: 'active' | 'near-expiry' | 'expired';

  receivedDate: string;
  createdAt: string;
}

export interface RetailSale {
  id?: string;
  tenantId: string;

  // Sale Info
  billNo: string;
  billDate: string;
  billTime: string;

  // Customer (Optional)
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  loyaltyPoints?: number;  // Points earned
  loyaltyPointsUsed?: number;

  // Items
  items: {
    productId: string;
    productName: string;
    barcode?: string;
    batchId?: string;

    quantity: number;
    unit: string;

    mrp: number;
    sellingPrice: number;
    discountPercent: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
  }[];

  // Totals
  itemCount: number;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  roundOff: number;
  totalAmount: number;

  // Loyalty
  loyaltyDiscount: number;

  // Payment
  payments: {
    mode: 'cash' | 'card' | 'upi' | 'wallet' | 'credit';
    amount: number;
    referenceNo?: string;
  }[];

  totalPaid: number;
  changeGiven: number;
  balanceAmount: number;

  // Status
  status: 'completed' | 'cancelled' | 'returned';

  // Return
  returnDate?: string;
  returnAmount?: number;
  returnReason?: string;

  // Cashier
  cashierId: string;
  cashierName: string;

  // Audit
  createdAt: string;
}

export interface Customer {
  id?: string;
  tenantId: string;

  // Basic Info
  customerNo: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  anniversary?: string;

  // Address
  address?: string;
  city?: string;
  pincode?: string;

  // Loyalty Program (Advanced Access)
  loyaltyCardNo?: string;
  loyaltyPoints: number;
  loyaltyTier?: 'silver' | 'gold' | 'platinum';

  // Purchase History
  totalPurchases: number;
  totalSpent: number;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;

  // Credit (Advanced Access)
  creditLimit?: number;
  outstandingAmount: number;

  // Status
  isActive: boolean;

  // Preferences
  preferredPaymentMode?: string;
  tags?: string[];

  // Audit
  createdAt: string;
  updatedAt?: string;
}

export interface LoyaltyProgram {
  id?: string;
  tenantId: string;

  programName: string;
  isActive: boolean;

  // Points Configuration
  pointsPerRupee: number;  // e.g., 1 point per ₹100
  redemptionValue: number;  // e.g., 1 point = ₹1

  // Tiers
  tiers: {
    name: string;  // Silver, Gold, Platinum
    minSpend: number;
    benefits: string;
    discountPercent: number;
    bonusPointsMultiplier: number;  // 1.5x, 2x
  }[];

  // Rules
  minRedemptionPoints: number;
  maxRedemptionPercent: number;  // Max % of bill that can be paid with points
  pointsExpiryDays?: number;

  createdAt: string;
}

export interface Promotion {
  id?: string;
  tenantId: string;

  promotionName: string;
  description?: string;

  // Type
  type: 'discount' | 'buy-x-get-y' | 'bundle' | 'cashback';

  // Discount
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;

  // Buy X Get Y
  buyQuantity?: number;
  getQuantity?: number;

  // Bundle
  bundleProducts?: string[];  // Product IDs
  bundlePrice?: number;

  // Applicability
  applicableTo: 'all' | 'category' | 'product';
  categories?: string[];
  productIds?: string[];

  // Validity
  startDate: string;
  endDate: string;

  // Conditions
  minPurchaseAmount?: number;
  maxDiscount?: number;

  // Status
  isActive: boolean;

  createdAt: string;
}

export interface DayClosing {
  id?: string;
  tenantId: string;

  closingDate: string;

  // Cash Register
  openingCash: number;
  expectedCash: number;
  actualCash: number;
  cashDifference: number;

  // Sales Summary
  totalSales: number;
  totalBills: number;
  totalItems: number;

  // Payment Mode Wise
  cashSales: number;
  cardSales: number;
  upiSales: number;
  walletSales: number;
  creditSales: number;

  // Returns
  totalReturns: number;
  returnAmount: number;

  // Expenses
  expenses: {
    type: string;
    amount: number;
    notes?: string;
  }[];
  totalExpenses: number;

  // Net
  netCash: number;

  // Status
  status: 'open' | 'closed';

  // Closed By
  closedBy?: string;
  closedByName?: string;
  closedAt?: string;

  // Notes
  notes?: string;

  createdAt: string;
}
```

### General Store Features

**Small Access:**
- ✅ Product catalog (up to 500 items)
- ✅ Quick POS billing
- ✅ Basic stock management
- ✅ Customer management
- ✅ Cash payment
- ✅ Daily sales report
- ✅ Day closing

**Advanced Access:**
- ✅ Everything in Small +
- ✅ Unlimited products
- ✅ Barcode scanning
- ✅ Batch-wise stock (for perishables)
- ✅ Expiry management
- ✅ Multi-payment support (Cash, Card, UPI, Wallet, Credit)
- ✅ Loyalty program with tiers
- ✅ Promotions and discounts
- ✅ Customer credit management
- ✅ Purchase order management
- ✅ Supplier management
- ✅ Low stock alerts
- ✅ Price change history
- ✅ Weighing scale integration
- ✅ Receipt printer (thermal)
- ✅ SMS/WhatsApp promotions
- ✅ Birthday/Anniversary wishes
- ✅ Category-wise sales analysis
- ✅ Fast-moving/Slow-moving analysis
- ✅ Margin analysis
- ✅ Multi-location inventory
- ✅ Inter-branch transfer
- ✅ GST reports

---

## 🛡️ SUPER ADMIN CONTROLS

### Enhanced Super Admin Dashboard

```typescript
// src/app/core/models/super-admin.model.ts

export interface TenantConfiguration {
  tenantId: string;

  // Business Type
  businessType: 'jewellery' | 'restaurant' | 'medical' | 'retail' | 'manufacturing';

  // Access Level
  accessLevel: 'small' | 'advanced';

  // Module Access
  modules: {
    // Core
    invoicing: boolean;
    estimates: boolean;
    customers: boolean;
    reports: boolean;

    // Jewellery
    jewelleryInventory: boolean;
    customOrders: boolean;
    oldGoldPurchase: boolean;
    goldRateSync: boolean;
    hallmarkTracking: boolean;

    // Restaurant
    menuManagement: boolean;
    kotSystem: boolean;
    tableManagement: boolean;
    onlineOrdering: boolean;
    tableReservations: boolean;
    deliveryManagement: boolean;
    recipeCostManagement: boolean;

    // Medical
    medicineInventory: boolean;
    prescriptionManagement: boolean;
    batchTracking: boolean;
    expiryManagement: boolean;
    purchaseOrders: boolean;
    scheduleHCompliance: boolean;

    // Retail
    retailPOS: boolean;
    barcodeScanning: boolean;
    loyaltyProgram: boolean;
    promotions: boolean;
    customerCredit: boolean;
    multiPayment: boolean;

    // Manufacturing (from previous plan)
    manufacturing: boolean;
    bom: boolean;
    productionPlanning: boolean;

    // Advanced Features (All Business Types)
    multiLocation: boolean;
    mobileApp: boolean;
    whatsappIntegration: boolean;
    emailAutomation: boolean;
    smsNotifications: boolean;
    apiAccess: boolean;
    customFields: boolean;
    advancedReports: boolean;
    dataExport: boolean;
    backupRestore: boolean;
  };

  // Limits
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxInvoicesPerMonth: number;
    maxBranches: number;
    maxStorageGB: number;
    maxAPICallsPerDay: number;
  };

  // Pricing
  pricing: {
    plan: 'free' | 'small' | 'advanced' | 'enterprise';
    monthlyFee: number;
    perUserFee: number;
    perTransactionFee: number;
    setupFee: number;
    renewalDate: string;
    billingCycle: 'monthly' | 'quarterly' | 'yearly';
  };

  // Status
  status: 'trial' | 'active' | 'suspended' | 'expired';
  trialEndsOn?: string;

  // Features Customization (Granular Control)
  customFeatures?: {
    featureName: string;
    enabled: boolean;
    customConfig?: any;
  }[];

  // Branding
  branding?: {
    logo?: string;
    primaryColor?: string;
    companyName?: string;
  };

  // Support
  supportPlan: 'basic' | 'priority' | '24x7';
  supportContact?: string;

  // Audit
  createdAt: string;
  activatedAt?: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
}

export interface FeatureTemplate {
  id?: string;

  templateName: string;
  businessType: string;
  accessLevel: 'small' | 'advanced';

  description: string;

  modules: Record<string, boolean>;
  limits: any;
  pricing: any;

  isDefault: boolean;

  createdAt: string;
}

export interface AuditLog {
  id?: string;

  timestamp: string;

  // Who
  userId: string;
  userName: string;
  userRole: string;

  // What
  action: string;  // 'tenant_created', 'feature_enabled', 'plan_upgraded', etc.
  module: string;

  // Where
  tenantId?: string;
  tenantName?: string;

  // Details
  oldValue?: any;
  newValue?: any;
  description: string;

  // Meta
  ipAddress?: string;
  userAgent?: string;
}
```

### Super Admin Feature Matrix Builder

**Super Admin Can:**

1. **Create Custom Access Templates**
   - Define business type
   - Set access level (Small/Advanced)
   - Enable/disable individual features
   - Set limits (users, products, transactions)
   - Set pricing

2. **Granular Feature Control**
   - Toggle any feature on/off per tenant
   - Override template settings
   - Enable beta features for specific tenants
   - Create custom feature combinations

3. **Tenant Management**
   - View all tenants with status
   - Activate/suspend/delete tenants
   - Upgrade/downgrade plans
   - Extend trial periods
   - Reset limits
   - View usage statistics

4. **Business Type Specific Controls**

   **Jewellery:**
   - Enable custom order management
   - Enable old gold purchase
   - Enable hallmark tracking
   - Set making charges rules

   **Restaurant:**
   - Enable KOT printing
   - Set KOT station configuration
   - Enable delivery management
   - Configure table count limits

   **Medical:**
   - Enable Schedule H compliance
   - Set expiry alert thresholds
   - Enable batch tracking
   - Configure prescription validity

   **Retail:**
   - Enable barcode scanning
   - Configure loyalty point rules
   - Set promotion limits
   - Enable credit management

5. **Pricing & Billing**
   - Set monthly fees
   - Set per-user charges
   - Set transaction charges
   - Generate invoices
   - Track payment status
   - Apply discounts

6. **Analytics & Monitoring**
   - View system-wide statistics
   - Monitor tenant usage
   - Track revenue
   - Identify inactive tenants
   - Feature adoption analysis
   - Performance metrics

7. **Support Management**
   - Assign support plans
   - View support tickets per tenant
   - Track response times
   - Escalate issues

---

## 📋 COMPREHENSIVE FEATURE COMPARISON TABLE

| Feature | Free | Small | Advanced | Enterprise |
|---------|------|-------|----------|------------|
| **Users** | 1 | 3 | 10 | Unlimited |
| **Products/Items** | 50 | 500 | 5,000 | Unlimited |
| **Invoices/Month** | 20 | 100 | 1,000 | Unlimited |
| **Branches** | 1 | 1 | 3 | Unlimited |
| **Storage** | 100MB | 1GB | 10GB | 100GB+ |
| **Mobile App** | ❌ | ❌ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ✅ | ✅ |
| **WhatsApp Integration** | ❌ | ❌ | ✅ | ✅ |
| **Email Automation** | ❌ | ❌ | ✅ | ✅ |
| **Custom Fields** | ❌ | ❌ | ✅ | ✅ |
| **Advanced Reports** | ❌ | 5 Reports | 20 Reports | Unlimited |
| **Data Export** | ❌ | PDF only | PDF, Excel | PDF, Excel, API |
| **Support** | Email | Email | Phone, Email | 24x7 Priority |

### Business-Specific Features

#### 💎 Jewellery

| Feature | Small | Advanced |
|---------|-------|----------|
| Basic Invoicing | ✅ | ✅ |
| Gold Rate Updates | Manual | Auto API |
| Custom Orders | ❌ | ✅ |
| Old Gold Purchase | ❌ | ✅ |
| Barcode Printing | ❌ | ✅ |
| Hallmark Tracking | ❌ | ✅ |
| Scheme Management | ❌ | ✅ |
| WhatsApp Updates | ❌ | ✅ |

#### 🍽️ Restaurant

| Feature | Small | Advanced |
|---------|-------|----------|
| Menu (Items) | 100 | Unlimited |
| Tables | 20 | Unlimited |
| KOT System | ✅ | ✅ |
| Kitchen Display | ❌ | ✅ |
| Table Reservations | ❌ | ✅ |
| Online Ordering | ❌ | ✅ |
| Delivery Management | ❌ | ✅ |
| Recipe Costing | ❌ | ✅ |
| Waiter Analytics | ❌ | ✅ |

#### 💊 Medical Shop

| Feature | Small | Advanced |
|---------|-------|----------|
| Medicines | 500 | Unlimited |
| Billing | ✅ | ✅ |
| Expiry Alerts | 30 days | 90/60/30 days |
| Batch Tracking | ❌ | ✅ |
| Prescriptions | Basic | With Images |
| Barcode Scanning | ❌ | ✅ |
| Purchase Orders | ❌ | ✅ |
| Drug Interactions | ❌ | ✅ |
| Insurance Claims | ❌ | ✅ |

#### 🏪 Retail Store

| Feature | Small | Advanced |
|---------|-------|----------|
| Products | 500 | Unlimited |
| POS Billing | ✅ | ✅ |
| Barcode Scanning | ❌ | ✅ |
| Loyalty Program | ❌ | ✅ |
| Promotions | ❌ | ✅ |
| Customer Credit | ❌ | ✅ |
| Multi-Payment | Cash only | All modes |
| Batch Tracking | ❌ | ✅ |
| Weighing Scale | ❌ | ✅ |

---

## 🗺️ IMPLEMENTATION ROADMAP

### Phase 1: Super Admin Enhancements (Week 1-2)
1. Create `TenantConfiguration` model
2. Build Feature Matrix Builder UI
3. Create Access Templates
4. Implement granular feature toggles
5. Add usage monitoring
6. Create audit logging

### Phase 2: Jewellery Enhancements (Week 3-4)
1. Jewellery inventory model
2. Custom order management
3. Old gold purchase
4. Gold rate API integration
5. Hallmark tracking

### Phase 3: Restaurant Module (Week 5-8)
1. Menu management
2. Table management
3. KOT system
4. Kitchen display
5. Billing
6. Reservations & delivery (Advanced)
7. Recipe costing (Advanced)

### Phase 4: Medical Shop Module (Week 9-12)
1. Medicine master
2. Batch tracking
3. Expiry management
4. Prescription management
5. Schedule H compliance
6. Purchase orders
7. Barcode integration (Advanced)

### Phase 5: Retail Module (Week 13-16)
1. Retail POS
2. Stock management
3. Customer loyalty
4. Promotions
5. Multi-payment
6. Day closing
7. Barcode scanning (Advanced)

### Phase 6: Advanced Features (Week 17-20)
1. Multi-location support
2. Mobile apps (Waiter, Cashier)
3. WhatsApp integration
4. Email automation
5. Advanced analytics
6. API development

---

## 💰 PRICING RECOMMENDATION

### Subscription Plans

#### Free Plan
- ₹0/month
- 1 user, 50 products, 20 invoices/month
- Good for: Testing, very small businesses

#### Small Plan
- ₹999/month (Jewellery, Medical, Retail)
- ₹1,499/month (Restaurant)
- 3 users, 500 products/items, 100 invoices/month
- Basic features only
- Email support

#### Advanced Plan
- ₹2,999/month (Jewellery, Medical, Retail)
- ₹4,999/month (Restaurant)
- 10 users, 5,000 products, 1,000 invoices/month
- All advanced features
- Phone + Email support
- WhatsApp integration

#### Enterprise Plan
- Custom pricing
- Unlimited everything
- Custom features
- Dedicated support
- On-premise option
- Custom integrations

### Add-ons (For Advanced/Enterprise)
- Extra user: ₹200/month
- Extra branch: ₹500/month
- Additional storage (10GB): ₹300/month
- SMS credits: ₹0.10/SMS
- WhatsApp credits: ₹0.25/message

---

## 🎯 SUCCESS METRICS

### For Jewellery
- Custom order tracking: 95% on-time delivery
- Old gold exchange: 30% of sales
- Inventory accuracy: 99%+

### For Restaurant
- Order processing: <2 minutes average
- Table turnover: +25%
- Kitchen errors: <1%

### For Medical
- Expiry wastage: <2%
- Stock availability: 95%+
- Regulatory compliance: 100%

### For Retail
- Checkout time: <1 minute
- Loyalty enrollment: 60% of customers
- Inventory accuracy: 98%+

---

## 🚀 NEXT STEPS

1. **Review this enhanced plan** with your team
2. **Prioritize modules** based on:
   - Client demand
   - Revenue potential
   - Implementation complexity
3. **Start with** one module MVP (recommend Restaurant KOT for quick impact)
4. **Implement Super Admin controls** first for better tenant management
5. **Get beta customers** for each business type
6. **Iterate** based on feedback

**Which module shall we implement first?**

Let me know and I'll start building!
