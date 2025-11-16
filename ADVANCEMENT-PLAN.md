# Invoicing System Advancement Plan

## Current System Analysis

### Existing Features
- **Core Invoicing**: Bill generation, customer management, payment tracking
- **Estimates/Quotations**: Quote creation and conversion to invoices
- **Multi-Tenant Architecture**: Tenant isolation, RBAC, subscription plans
- **Jewellery-Specific**: Purity tracking, making charges, gold weight calculations
- **User Management**: Authentication, role-based permissions, audit trails

### Current Database Models
```typescript
- Invoice (billNo, customer, items[], payments[], totals, discounts)
- Estimate (estimateNo, similar to Invoice)
- Customer (name, contact, address)
- Tenant (multi-tenant config, plans, features)
- User (auth, roles, permissions)
```

---

## 🏭 PRODUCTION & MANUFACTURING MODULE

### Overview
Transform the invoicing system into a complete ERP solution for manufacturing businesses by adding production planning, inventory management, and manufacturing cost tracking.

### Key Features

#### 1. **Inventory Management**

**Database Schema:**
```typescript
// src/app/core/models/inventory.model.ts

export interface Product {
  id?: string;
  tenantId: string;

  // Basic Info
  productCode: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  unit: 'pcs' | 'kg' | 'gram' | 'liter' | 'meter' | 'box' | 'set';

  // Type Classification
  type: 'finished' | 'semi-finished' | 'raw-material' | 'consumable';

  // Inventory Tracking
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderPoint: number;

  // Costing
  costPrice: number;
  sellingPrice: number;
  taxRate: number;

  // Manufacturing
  hasBOM: boolean;  // Bill of Materials
  leadTimeDays?: number;

  // Storage
  location?: string;
  rackNo?: string;
  binNo?: string;

  // Images & Docs
  imageUrl?: string;
  specifications?: Record<string, any>;

  // Status
  isActive: boolean;

  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface StockTransaction {
  id?: string;
  tenantId: string;

  productId: string;
  productName: string;

  // Transaction Details
  type: 'in' | 'out' | 'adjustment' | 'transfer' | 'production' | 'wastage';
  quantity: number;
  unit: string;

  // Reference
  referenceType?: 'purchase' | 'production' | 'sale' | 'return' | 'adjustment';
  referenceId?: string;
  referenceNo?: string;

  // Costing
  unitCost: number;
  totalCost: number;

  // Location
  fromLocation?: string;
  toLocation?: string;

  // Stock Levels (at time of transaction)
  stockBefore: number;
  stockAfter: number;

  // Details
  notes?: string;
  batchNo?: string;
  lotNo?: string;
  expiryDate?: string;

  // Audit
  transactionDate: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface StockAdjustment {
  id?: string;
  tenantId: string;

  adjustmentNo: string;
  adjustmentDate: string;

  // Items
  items: {
    productId: string;
    productName: string;
    currentStock: number;
    actualStock: number;
    difference: number;
    reason: string;
    cost: number;
  }[];

  // Totals
  totalAdjustmentValue: number;

  // Status
  status: 'draft' | 'approved' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;

  // Audit
  notes?: string;
  createdAt: string;
  createdBy: string;
}
```

#### 2. **Bill of Materials (BOM)**

```typescript
// src/app/core/models/bom.model.ts

export interface BOMItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unit: string;
  costPrice: number;
  totalCost: number;
  wastagePercent?: number;
  notes?: string;
}

export interface BOM {
  id?: string;
  tenantId: string;

  // Product Info
  finishedProductId: string;
  finishedProductName: string;
  finishedProductCode: string;

  // BOM Details
  bomNo: string;
  version: number;
  outputQuantity: number;  // How many units this BOM produces

  // Components
  rawMaterials: BOMItem[];
  semiFinished: BOMItem[];
  consumables: BOMItem[];

  // Costing
  totalRawMaterialCost: number;
  totalSemiFinishedCost: number;
  totalConsumableCost: number;
  totalMaterialCost: number;

  labourCost: number;
  overheadCost: number;
  otherCosts: number;

  totalProductionCost: number;
  costPerUnit: number;

  // Production Details
  productionTimeMinutes: number;
  workstations?: string[];
  skillsRequired?: string[];

  // Status
  status: 'draft' | 'active' | 'obsolete';
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;

  // Audit
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}
```

#### 3. **Production Orders**

```typescript
// src/app/core/models/production.model.ts

export interface ProductionOrder {
  id?: string;
  tenantId: string;

  // Order Info
  productionOrderNo: string;
  orderDate: string;
  targetStartDate: string;
  targetEndDate: string;

  // Product
  productId: string;
  productName: string;
  productCode: string;
  bomId: string;
  bomVersion: number;

  // Quantity
  orderedQuantity: number;
  producedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unit: string;

  // Status
  status: 'planned' | 'released' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Reference
  referenceType?: 'sales-order' | 'forecast' | 'stock-replenishment';
  referenceId?: string;
  referenceNo?: string;

  // Costing
  estimatedCost: number;
  actualCost: number;

  // Work Centers
  workCenters?: string[];
  currentWorkCenter?: string;

  // Dates
  actualStartDate?: string;
  actualEndDate?: string;

  // Quality
  qualityCheckStatus?: 'pending' | 'passed' | 'failed';
  qualityCheckedBy?: string;
  qualityCheckedAt?: string;
  qualityNotes?: string;

  // Audit
  notes?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ProductionStage {
  id?: string;
  productionOrderId: string;

  stageName: string;
  stageNo: number;

  status: 'pending' | 'in-progress' | 'completed' | 'skipped';

  workCenter?: string;
  assignedTo?: string;
  assignedToName?: string;

  startTime?: string;
  endTime?: string;
  durationMinutes?: number;

  quantityProcessed: number;
  notes?: string;

  createdAt: string;
  updatedAt?: string;
}

export interface MaterialConsumption {
  id?: string;
  productionOrderId: string;

  productId: string;
  productName: string;

  plannedQuantity: number;
  actualQuantity: number;
  unit: string;

  unitCost: number;
  totalCost: number;

  wastageQuantity?: number;
  wastageReason?: string;

  consumedAt: string;
  consumedBy: string;
}

export interface ProductionCost {
  productionOrderId: string;

  // Material Costs
  rawMaterialCost: number;
  semiFinishedCost: number;
  consumableCost: number;
  totalMaterialCost: number;

  // Labour Costs
  directLabourCost: number;
  indirectLabourCost: number;
  totalLabourCost: number;

  // Overhead Costs
  electricityCost: number;
  machineCost: number;
  maintenanceCost: number;
  otherOverheadCost: number;
  totalOverheadCost: number;

  // Totals
  totalProductionCost: number;
  costPerUnit: number;

  // Variance
  estimatedCost: number;
  variance: number;
  variancePercent: number;
}
```

#### 4. **Work Orders & Shop Floor**

```typescript
// src/app/core/models/work-order.model.ts

export interface WorkOrder {
  id?: string;
  tenantId: string;

  workOrderNo: string;
  productionOrderId: string;
  productionOrderNo: string;

  // Work Center
  workCenter: string;
  workStation?: string;

  // Assignment
  assignedTo: string;
  assignedToName: string;
  assignedAt: string;

  // Operation
  operationName: string;
  operationNo: number;
  description?: string;

  // Quantity
  quantity: number;
  unit: string;

  // Time
  estimatedTimeMinutes: number;
  actualTimeMinutes?: number;

  startTime?: string;
  endTime?: string;

  // Status
  status: 'pending' | 'in-progress' | 'paused' | 'completed' | 'cancelled';

  // Tools & Materials
  toolsRequired?: string[];
  materialsIssued?: {
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
  }[];

  // Notes
  instructions?: string;
  notes?: string;

  createdAt: string;
  updatedAt?: string;
}
```

### Manufacturing Components to Build

#### 1. **Inventory Management**
- `inventory-list.component.ts` - View all products with stock levels
- `inventory-add.component.ts` - Add new products
- `stock-transaction.component.ts` - Record stock movements
- `stock-adjustment.component.ts` - Physical stock verification
- `low-stock-alerts.component.ts` - Reorder notifications

#### 2. **BOM Management**
- `bom-list.component.ts` - View all BOMs
- `bom-create.component.ts` - Create BOM with material picker
- `bom-cost-analysis.component.ts` - Cost breakdown visualization

#### 3. **Production Planning**
- `production-order-list.component.ts` - View all production orders
- `production-order-create.component.ts` - Create new orders
- `production-dashboard.component.ts` - Overview of production status
- `shop-floor-display.component.ts` - Live production tracking

#### 4. **Work Orders**
- `work-order-list.component.ts` - Operator task list
- `work-order-execute.component.ts` - Record production progress

#### 5. **Reports**
- `inventory-valuation-report.component.ts`
- `production-cost-report.component.ts`
- `material-consumption-report.component.ts`
- `wastage-analysis-report.component.ts`

### Permissions to Add

```typescript
// src/app/core/models/role.model.ts - Add these permissions

export enum Permission {
  // ... existing permissions ...

  // Inventory
  VIEW_INVENTORY = 'view_inventory',
  CREATE_PRODUCT = 'create_product',
  EDIT_PRODUCT = 'edit_product',
  DELETE_PRODUCT = 'delete_product',
  ADJUST_STOCK = 'adjust_stock',
  VIEW_STOCK_TRANSACTIONS = 'view_stock_transactions',

  // BOM
  VIEW_BOM = 'view_bom',
  CREATE_BOM = 'create_bom',
  EDIT_BOM = 'edit_bom',
  DELETE_BOM = 'delete_bom',
  APPROVE_BOM = 'approve_bom',

  // Production
  VIEW_PRODUCTION = 'view_production',
  CREATE_PRODUCTION_ORDER = 'create_production_order',
  EDIT_PRODUCTION_ORDER = 'edit_production_order',
  DELETE_PRODUCTION_ORDER = 'delete_production_order',
  START_PRODUCTION = 'start_production',
  COMPLETE_PRODUCTION = 'complete_production',
  QUALITY_CHECK = 'quality_check',

  // Work Orders
  VIEW_WORK_ORDERS = 'view_work_orders',
  EXECUTE_WORK_ORDERS = 'execute_work_orders',

  // Reports
  VIEW_PRODUCTION_REPORTS = 'view_production_reports',
  VIEW_INVENTORY_REPORTS = 'view_inventory_reports',
}

// New Role
export const ProductionManager = {
  id: 'production_manager',
  name: 'Production Manager',
  permissions: [
    Permission.VIEW_INVENTORY,
    Permission.VIEW_BOM,
    Permission.VIEW_PRODUCTION,
    Permission.CREATE_PRODUCTION_ORDER,
    Permission.EDIT_PRODUCTION_ORDER,
    Permission.START_PRODUCTION,
    Permission.COMPLETE_PRODUCTION,
    Permission.QUALITY_CHECK,
    Permission.VIEW_PRODUCTION_REPORTS,
  ]
};

export const ShopFloorOperator = {
  id: 'shop_floor_operator',
  name: 'Shop Floor Operator',
  permissions: [
    Permission.VIEW_WORK_ORDERS,
    Permission.EXECUTE_WORK_ORDERS,
    Permission.VIEW_PRODUCTION,
  ]
};
```

---

## 🍽️ HOTEL & RESTAURANT MODULE (KOT System)

### Overview
Add comprehensive restaurant management with KOT (Kitchen Order Ticket), table management, and order tracking for hotels and restaurants.

### Key Features

#### 1. **Menu Management**

```typescript
// src/app/core/models/menu.model.ts

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
  cuisine?: string;  // Indian, Chinese, Continental, etc.
  type: 'veg' | 'non-veg' | 'vegan' | 'egg';

  // Pricing
  price: number;
  taxRate: number;

  // Availability
  isAvailable: boolean;
  availableFrom?: string;  // Time-based availability (e.g., "18:00")
  availableTo?: string;
  daysAvailable?: string[];  // ['Mon', 'Tue', 'Wed', ...]

  // Recipe & Costing
  hasRecipe: boolean;
  recipeId?: string;
  foodCost?: number;
  costPercent?: number;

  // Timing
  prepTimeMinutes: number;

  // Kitchen
  preparationStation: 'main-kitchen' | 'tandoor' | 'grill' | 'bar' | 'cold-station' | 'bakery';

  // Display
  imageUrl?: string;
  displayOrder: number;

  // Tags & Filters
  tags?: string[];  // 'Spicy', 'Chef Special', 'New', 'Bestseller'
  allergens?: string[];

  // Variants
  hasVariants: boolean;
  variants?: {
    name: string;
    price: number;
  }[];

  // Add-ons
  addOns?: {
    name: string;
    price: number;
  }[];

  // Status
  isActive: boolean;

  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Recipe {
  id?: string;
  tenantId: string;

  menuItemId: string;
  menuItemName: string;

  portionSize: number;
  unit: string;

  ingredients: {
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    cost: number;
  }[];

  totalFoodCost: number;
  sellingPrice: number;
  foodCostPercent: number;

  instructions?: string;

  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}
```

#### 2. **Table Management**

```typescript
// src/app/core/models/table.model.ts

export interface Table {
  id?: string;
  tenantId: string;

  // Table Info
  tableNo: string;
  tableName: string;

  // Location
  section: string;  // 'Ground Floor', 'First Floor', 'Garden', 'AC', 'Non-AC'
  floor?: string;

  // Capacity
  capacity: number;
  minCapacity?: number;

  // Type
  type: 'regular' | 'vip' | 'private-dining' | 'bar-counter' | 'outdoor';

  // Status
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';

  // Current Occupancy
  currentOrderId?: string;
  occupiedSince?: string;
  guestCount?: number;

  // Waiter Assignment
  assignedWaiterId?: string;
  assignedWaiterName?: string;

  // Display
  displayOrder: number;
  coordinates?: { x: number; y: number };  // For floor plan

  // Features
  features?: string[];  // 'Window View', 'Near Kitchen', 'Smoking', etc.

  // Status
  isActive: boolean;

  createdAt: string;
  updatedAt?: string;
}

export interface TableReservation {
  id?: string;
  tenantId: string;

  reservationNo: string;

  // Table
  tableId: string;
  tableNo: string;
  section: string;

  // Customer
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  guestCount: number;

  // Timing
  reservationDate: string;
  reservationTime: string;
  duration Minutes?: number;

  // Special Requests
  occasion?: string;  // Birthday, Anniversary
  specialRequests?: string;

  // Status
  status: 'pending' | 'confirmed' | 'arrived' | 'seated' | 'completed' | 'cancelled' | 'no-show';

  // Confirmation
  confirmedBy?: string;
  confirmedAt?: string;

  // Arrival
  arrivedAt?: string;
  seatedAt?: string;

  // Notes
  notes?: string;

  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}
```

#### 3. **KOT (Kitchen Order Ticket)**

```typescript
// src/app/core/models/kot.model.ts

export interface KOTItem {
  menuItemId: string;
  itemCode: string;
  itemName: string;
  category: string;

  quantity: number;
  variant?: string;
  addOns?: string[];

  price: number;
  totalPrice: number;

  // Kitchen
  preparationStation: string;

  // Instructions
  specialInstructions?: string;

  // Status
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

  // Timing
  orderedAt: string;
  startedPreparingAt?: string;
  readyAt?: string;
  servedAt?: string;

  prepTimeMinutes?: number;
  actualPrepTime?: number;
}

export interface KOT {
  id?: string;
  tenantId: string;

  // KOT Info
  kotNo: string;
  kotDate: string;
  kotTime: string;

  // Order Reference
  orderId: string;
  orderNo: string;

  // Table/Location
  orderType: 'dine-in' | 'takeaway' | 'delivery' | 'room-service';
  tableId?: string;
  tableNo?: string;
  section?: string;
  roomNo?: string;  // For hotels

  // Staff
  waiterId: string;
  waiterName: string;

  // Items
  items: KOTItem[];

  // Kitchen Station
  preparationStation: string;

  // Status
  status: 'pending' | 'in-kitchen' | 'ready' | 'served' | 'cancelled';
  priority: 'normal' | 'high' | 'urgent';

  // Timing
  createdAt: string;
  sentToKitchenAt?: string;
  allItemsReadyAt?: string;
  allItemsServedAt?: string;

  // Cancellation
  cancelledBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;

  // Notes
  notes?: string;

  // Print
  printCount: number;
  lastPrintedAt?: string;
}
```

#### 4. **Restaurant Orders**

```typescript
// src/app/core/models/restaurant-order.model.ts

export interface RestaurantOrder {
  id?: string;
  tenantId: string;

  // Order Info
  orderNo: string;
  orderDate: string;
  orderTime: string;

  // Type
  orderType: 'dine-in' | 'takeaway' | 'delivery' | 'room-service';

  // Table (for dine-in)
  tableId?: string;
  tableNo?: string;
  section?: string;

  // Customer
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;  // For delivery
  guestCount?: number;

  // Room (for hotels)
  roomNo?: string;
  guestName?: string;

  // Items
  items: {
    menuItemId: string;
    itemCode: string;
    itemName: string;
    category: string;

    quantity: number;
    variant?: string;
    addOns?: string[];

    price: number;
    taxRate: number;
    totalPrice: number;

    status: 'pending' | 'preparing' | 'ready' | 'served';
    kotId?: string;
    kotNo?: string;
  }[];

  // KOTs
  kots: string[];  // Array of KOT IDs

  // Staff
  waiterId: string;
  waiterName: string;
  captainId?: string;
  captainName?: string;

  // Billing
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  discountPercent: number;
  serviceChargeAmount: number;
  serviceChargePercent: number;
  deliveryCharges: number;
  packagingCharges: number;
  totalAmount: number;

  // Payment
  paymentStatus: 'pending' | 'partial' | 'paid';
  paymentMode?: string;
  paidAmount: number;

  // Status
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

  // Timing
  estimatedReadyTime?: string;
  actualReadyTime?: string;
  completedAt?: string;

  // Special
  specialInstructions?: string;
  occasion?: string;

  // Ratings
  rating?: number;
  feedback?: string;

  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}
```

### Restaurant Components to Build

#### 1. **Menu Management**
- `menu-list.component.ts` - View all menu items
- `menu-item-create.component.ts` - Add/edit menu items
- `recipe-management.component.ts` - Manage recipes and food costs
- `menu-availability.component.ts` - Set time-based availability

#### 2. **Table Management**
- `table-layout.component.ts` - Visual floor plan
- `table-list.component.ts` - List view of tables
- `table-status.component.ts` - Real-time table status
- `table-reservation.component.ts` - Manage reservations

#### 3. **Order Taking (POS)**
- `pos-order.component.ts` - Main POS interface
- `quick-order.component.ts` - Fast order entry
- `table-order.component.ts` - Dine-in order management
- `takeaway-order.component.ts` - Takeaway orders
- `delivery-order.component.ts` - Delivery orders

#### 4. **KOT System**
- `kot-display.component.ts` - Kitchen display system
- `kot-print.component.ts` - KOT print template
- `kot-status.component.ts` - Track KOT status
- `station-display.component.ts` - Station-specific KOTs

#### 5. **Billing**
- `restaurant-bill.component.ts` - Generate bills
- `split-bill.component.ts` - Split bills by items/guests
- `settle-bill.component.ts` - Payment settlement

#### 6. **Waiter App**
- `waiter-dashboard.component.ts` - Waiter's assigned tables
- `waiter-orders.component.ts` - Take orders on tablet/mobile
- `waiter-kot-status.component.ts` - Track order status

#### 7. **Reports**
- `daily-sales-report.component.ts`
- `menu-performance-report.component.ts`
- `waiter-performance-report.component.ts`
- `table-turnover-report.component.ts`
- `food-cost-analysis.component.ts`

### Permissions to Add

```typescript
// src/app/core/models/role.model.ts - Add these permissions

export enum Permission {
  // ... existing permissions ...

  // Menu
  VIEW_MENU = 'view_menu',
  CREATE_MENU_ITEM = 'create_menu_item',
  EDIT_MENU_ITEM = 'edit_menu_item',
  DELETE_MENU_ITEM = 'delete_menu_item',
  MANAGE_RECIPES = 'manage_recipes',

  // Tables
  VIEW_TABLES = 'view_tables',
  MANAGE_TABLES = 'manage_tables',
  CREATE_RESERVATION = 'create_reservation',
  EDIT_RESERVATION = 'edit_reservation',
  CANCEL_RESERVATION = 'cancel_reservation',

  // Orders
  VIEW_ORDERS = 'view_orders',
  CREATE_ORDER = 'create_order',
  EDIT_ORDER = 'edit_order',
  CANCEL_ORDER = 'cancel_order',
  GENERATE_KOT = 'generate_kot',

  // Billing
  VIEW_BILLS = 'view_bills',
  GENERATE_BILL = 'generate_bill',
  APPLY_DISCOUNT = 'apply_discount',
  SETTLE_BILL = 'settle_bill',
  SPLIT_BILL = 'split_bill',

  // Kitchen
  VIEW_KOT = 'view_kot',
  UPDATE_KOT_STATUS = 'update_kot_status',

  // Reports
  VIEW_RESTAURANT_REPORTS = 'view_restaurant_reports',
}

// New Roles
export const RestaurantManager = {
  id: 'restaurant_manager',
  name: 'Restaurant Manager',
  permissions: [
    Permission.VIEW_MENU,
    Permission.CREATE_MENU_ITEM,
    Permission.EDIT_MENU_ITEM,
    Permission.MANAGE_TABLES,
    Permission.VIEW_ORDERS,
    Permission.CREATE_ORDER,
    Permission.CANCEL_ORDER,
    Permission.VIEW_BILLS,
    Permission.GENERATE_BILL,
    Permission.APPLY_DISCOUNT,
    Permission.VIEW_RESTAURANT_REPORTS,
  ]
};

export const Waiter = {
  id: 'waiter',
  name: 'Waiter/Server',
  permissions: [
    Permission.VIEW_MENU,
    Permission.VIEW_TABLES,
    Permission.VIEW_ORDERS,
    Permission.CREATE_ORDER,
    Permission.EDIT_ORDER,
    Permission.GENERATE_KOT,
    Permission.VIEW_BILLS,
  ]
};

export const Chef = {
  id: 'chef',
  name: 'Chef/Cook',
  permissions: [
    Permission.VIEW_KOT,
    Permission.UPDATE_KOT_STATUS,
    Permission.VIEW_MENU,
  ]
};

export const Captain = {
  id: 'captain',
  name: 'Captain',
  permissions: [
    Permission.VIEW_MENU,
    Permission.VIEW_TABLES,
    Permission.MANAGE_TABLES,
    Permission.VIEW_ORDERS,
    Permission.CREATE_ORDER,
    Permission.EDIT_ORDER,
    Permission.CANCEL_ORDER,
    Permission.GENERATE_BILL,
    Permission.APPLY_DISCOUNT,
    Permission.SETTLE_BILL,
    Permission.SPLIT_BILL,
  ]
};
```

---

## 🔧 INTEGRATION WITH EXISTING ARCHITECTURE

### Tenant Feature Flags

Update the `Tenant` model to include new module features:

```typescript
// src/app/core/models/tenant.model.ts

export interface Tenant {
  // ... existing fields ...

  // Module Selection
  businessType: 'jewellery' | 'manufacturing' | 'restaurant' | 'hotel' | 'retail' | 'services';

  features: {
    // ... existing features ...

    // Manufacturing Module
    manufacturing: boolean;
    inventory: boolean;
    bom: boolean;
    productionPlanning: boolean;
    shopFloor: boolean;
    qualityControl: boolean;

    // Restaurant Module
    restaurant: boolean;
    kot: boolean;
    tableManagement: boolean;
    menuManagement: boolean;
    onlineOrdering: boolean;
    tableReservations: boolean;

    // Hotel Specific
    roomService: boolean;
    hotelPMS: boolean;  // Property Management System
  };

  // Module-Specific Settings
  manufacturingSettings?: {
    enableBatching: boolean;
    enableSerialNumbers: boolean;
    enableQualityInspection: boolean;
    defaultWorkCenter?: string;
  };

  restaurantSettings?: {
    enableKOT: boolean;
    enableTableReservations: boolean;
    serviceChargePercent: number;
    packagingChargeType: 'fixed' | 'percent';
    packagingChargeValue: number;
    defaultTaxRate: number;
    kotPrinterIP?: string;
    billPrinterIP?: string;
    enableOnlineOrdering: boolean;
  };
}
```

### Subscription Plan Feature Matrix

```typescript
// Update plan features

const PlanFeatures = {
  free: {
    manufacturing: false,
    restaurant: false,
    maxProducts: 50,
    maxMenuItems: 20,
  },

  basic: {
    manufacturing: true,
    restaurant: true,
    inventory: true,
    maxProducts: 500,
    maxMenuItems: 100,
    bom: false,
    productionPlanning: false,
    kot: true,
    tableManagement: true,
  },

  premium: {
    manufacturing: true,
    restaurant: true,
    inventory: true,
    bom: true,
    productionPlanning: true,
    shopFloor: true,
    kot: true,
    tableManagement: true,
    tableReservations: true,
    maxProducts: 5000,
    maxMenuItems: 500,
  },

  enterprise: {
    manufacturing: true,
    restaurant: true,
    inventory: true,
    bom: true,
    productionPlanning: true,
    shopFloor: true,
    qualityControl: true,
    kot: true,
    tableManagement: true,
    tableReservations: true,
    onlineOrdering: true,
    roomService: true,
    hotelPMS: true,
    maxProducts: -1,  // Unlimited
    maxMenuItems: -1,  // Unlimited
  },
};
```

### Navigation Updates

Update navigation to show modules based on tenant features:

```typescript
// src/app/components/main-layout/main-layout.component.html

<nav class="main-nav">
  <!-- Existing Links -->
  <a routerLink="/dashboard">Dashboard</a>

  <!-- Manufacturing Module -->
  <div *ngIf="tenant?.features?.manufacturing" class="nav-group">
    <h4>Manufacturing</h4>
    <a *hasPermission="'view_inventory'" routerLink="/inventory">Inventory</a>
    <a *hasPermission="'view_bom'" routerLink="/bom">BOM</a>
    <a *hasPermission="'view_production'" routerLink="/production">Production</a>
    <a *hasPermission="'view_work_orders'" routerLink="/work-orders">Work Orders</a>
  </div>

  <!-- Restaurant Module -->
  <div *ngIf="tenant?.features?.restaurant" class="nav-group">
    <h4>Restaurant</h4>
    <a *hasPermission="'view_menu'" routerLink="/menu">Menu</a>
    <a *hasPermission="'view_tables'" routerLink="/tables">Tables</a>
    <a *hasPermission="'create_order'" routerLink="/pos">POS</a>
    <a *hasPermission="'view_kot'" routerLink="/kot">KOT Display</a>
    <a *hasPermission="'view_orders'" routerLink="/orders">Orders</a>
  </div>

  <!-- Existing Modules -->
  <div class="nav-group">
    <h4>Invoicing</h4>
    <a *hasPermission="'view_estimate'" routerLink="/estimate">Estimates</a>
    <a *hasPermission="'view_invoice'" routerLink="/invoice">Invoices</a>
    <a *hasPermission="'view_customer'" routerLink="/customers">Customers</a>
  </div>
</nav>
```

---

## 📋 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
1. Update `Tenant` model with module flags
2. Create database models for all new entities
3. Create base services for each module
4. Update permission system
5. Create new system roles

### Phase 2: Manufacturing Module (Week 3-6)
1. **Week 3**: Inventory Management
   - Product CRUD
   - Stock transaction recording
   - Stock adjustment

2. **Week 4**: BOM Management
   - BOM creation
   - Cost calculation
   - BOM versioning

3. **Week 5**: Production Planning
   - Production order management
   - Material consumption tracking
   - Production stages

4. **Week 6**: Shop Floor & Reports
   - Work order execution
   - Production dashboard
   - Reports

### Phase 3: Restaurant Module (Week 7-10)
1. **Week 7**: Menu & Table Management
   - Menu item CRUD
   - Recipe management
   - Table setup
   - Table reservations

2. **Week 8**: POS & Order Management
   - POS interface
   - Order taking
   - Order types (dine-in, takeaway, delivery)

3. **Week 9**: KOT System
   - KOT generation
   - Kitchen display
   - Station-wise KOT
   - Status tracking

4. **Week 10**: Billing & Reports
   - Bill generation
   - Split bills
   - Payment settlement
   - Restaurant reports

### Phase 4: Integration & Testing (Week 11-12)
1. Integration testing
2. User acceptance testing
3. Performance optimization
4. Documentation
5. Training materials

---

## 🎯 QUICK WINS (Start Here)

### For Manufacturing:
1. **Simple Inventory Module**
   - Product master with stock tracking
   - Stock in/out transactions
   - Low stock alerts
   - Inventory valuation report

### For Restaurant:
1. **Basic KOT System**
   - Menu management
   - Simple order taking
   - KOT generation and printing
   - Order-to-bill conversion

These quick wins can be implemented in 2-3 weeks and provide immediate value.

---

## 💡 TECHNOLOGY RECOMMENDATIONS

### Printing
- **KOT Printing**: Use `ngx-print` or direct printer API
- **Network Printers**: ESC/POS commands for thermal printers
- **PDF Generation**: `jspdf` for detailed reports

### Real-time Updates
- **Firebase Realtime Database**: For live KOT updates
- **WebSockets**: For shop floor displays
- **Push Notifications**: For kitchen alerts

### Barcode/QR
- **ngx-barcode**: Generate barcodes for products
- **ngx-qrcode**: QR codes for table ordering
- **zxing**: Barcode scanning

### Charts & Analytics
- **Chart.js** or **Highcharts**: Production analytics
- **D3.js**: Custom visualizations

### Mobile Apps
- **Ionic/Capacitor**: Waiter app, shop floor app
- **Progressive Web App**: Offline support

---

## 📊 DATABASE OPTIMIZATION

### Indexing Strategy
```javascript
// Firestore indexes for performance

// Production orders - frequently filtered by status and date
db.collection('productionOrders')
  .where('tenantId', '==', tenantId)
  .where('status', '==', 'in-progress')
  .orderBy('targetEndDate')

// KOTs - filtered by station and status
db.collection('kots')
  .where('tenantId', '==', tenantId)
  .where('preparationStation', '==', 'main-kitchen')
  .where('status', '==', 'pending')
  .orderBy('createdAt')

// Restaurant orders - filtered by table and status
db.collection('restaurantOrders')
  .where('tenantId', '==', tenantId)
  .where('orderType', '==', 'dine-in')
  .where('status', 'in', ['pending', 'preparing'])
  .orderBy('orderTime')
```

### Data Archival
- Archive completed production orders older than 1 year
- Archive settled restaurant bills older than 3 months
- Maintain summary data for historical reporting

---

## 🔐 SECURITY CONSIDERATIONS

1. **Data Isolation**: All queries must filter by `tenantId`
2. **Permission Checks**: Validate permissions on both client and server
3. **Audit Trails**: Log all critical operations
4. **Printer Security**: Secure printer endpoints
5. **PII Protection**: Encrypt customer data
6. **Payment Security**: PCI compliance for card payments

---

## 📱 MOBILE & OFFLINE SUPPORT

### Waiter App (PWA/Mobile)
- Offline order taking with sync
- Table assignment
- Quick menu selection
- Order status notifications

### Kitchen Display (Tablet)
- Real-time KOT updates
- Touch-based status updates
- Audio/visual alerts
- Station-specific filtering

### Shop Floor App
- Work order execution
- Time tracking
- Material consumption recording
- Production reporting

---

## 🎨 UI/UX CONSIDERATIONS

### Manufacturing
- Kanban boards for production orders
- Drag-and-drop BOM builder
- Visual stock level indicators
- Production timeline visualization

### Restaurant
- Touch-optimized POS interface
- Visual table layout with real-time status
- Swipe-based KOT status updates
- Color-coded order priorities
- Quick access menu categories

---

## 📈 ANALYTICS & REPORTING

### Manufacturing KPIs
- Production efficiency
- Material consumption variance
- Production cost variance
- On-time delivery percentage
- Quality rejection rate
- Inventory turnover ratio

### Restaurant KPIs
- Average order value
- Table turnover rate
- Menu item popularity
- Food cost percentage
- Waiter performance
- Kitchen preparation time
- Customer satisfaction rating

---

## 🚀 NEXT STEPS

1. **Discuss with stakeholders**: Which module to implement first?
2. **Choose quick win**: Start with basic inventory or basic KOT
3. **Set up dev environment**: Create development tenant with features enabled
4. **Create MVP**: Focus on core workflow first
5. **Iterate**: Add advanced features based on feedback

Let me know which module you'd like to start with, and I can begin implementation!
