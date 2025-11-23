import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { GoldRateService } from '../../core/services/gold-rate.service';
import {
  Product,
  ProductCategory,
  ProductType,
  StockStatus,
  StoneDetail,
  StockTransaction,
  ProductSummary,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_TYPE_LABELS,
  STOCK_STATUS_LABELS,
  getStockStatusColor,
  calculateMakingCharges,
  calculateProductValue
} from '../../core/models/product.model';
import { MetalType, RateUnit, METAL_TYPE_LABELS } from '../../core/models/gold-rate.model';

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-catalog.component.html',
  styleUrls: ['./product-catalog.component.scss']
})
export class ProductCatalogComponent implements OnInit {
  isLoading = false;
  tenantId = 'tenant_001'; // TODO: Get from auth service
  currentUserId = 'current_user'; // TODO: Get from auth service
  currentUserName = 'Current User'; // TODO: Get from auth service

  // Products data
  products: Product[] = [];
  filteredProducts: Product[] = [];
  selectedProduct: Product | null = null;
  productSummary: ProductSummary | null = null;

  // View state
  viewMode: 'grid' | 'list' = 'grid';
  showAddModal = false;
  showEditModal = false;
  showStockModal = false;
  showDeleteConfirm = false;
  activeTab: 'all' | 'low-stock' | 'out-of-stock' = 'all';

  // Filters
  searchTerm = '';
  selectedCategory: ProductCategory | '' = '';
  selectedStockStatus: StockStatus | '' = '';

  // Current gold rate
  currentGoldRate = 0;

  // Product form
  productForm: Partial<Product> = {};
  stoneForm: Partial<StoneDetail> = {};

  // Stock adjustment
  stockAdjustment = {
    type: 'IN' as 'IN' | 'OUT' | 'ADJUSTMENT',
    quantity: 0,
    notes: ''
  };

  // Stock transactions
  stockTransactions: StockTransaction[] = [];

  // Enums for template
  ProductCategory = ProductCategory;
  ProductType = ProductType;
  StockStatus = StockStatus;
  PRODUCT_CATEGORY_LABELS = PRODUCT_CATEGORY_LABELS;
  PRODUCT_TYPE_LABELS = PRODUCT_TYPE_LABELS;
  STOCK_STATUS_LABELS = STOCK_STATUS_LABELS;

  categories = Object.values(ProductCategory);
  productTypes = Object.values(ProductType);
  stockStatuses = Object.values(StockStatus);

  makingChargesTypes = [
    { value: 'per_gram', label: 'Per Gram' },
    { value: 'percentage', label: 'Percentage' },
    { value: 'fixed', label: 'Fixed Amount' }
  ];

  metalTypes = ['24K', '22K', '18K', '14K', 'Silver 999', 'Silver 925', 'Platinum'];
  purities = ['999', '916', '750', '585', '417', '925'];
  genders: Array<'Men' | 'Women' | 'Unisex' | 'Kids'> = ['Men', 'Women', 'Unisex', 'Kids'];

  constructor(
    private productService: ProductService,
    private goldRateService: GoldRateService
  ) {}

  async ngOnInit() {
    await this.loadInitialData();
  }

  async loadInitialData() {
    try {
      this.isLoading = true;
      await Promise.all([
        this.loadProducts(),
        this.loadProductSummary(),
        this.loadCurrentGoldRate()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      alert('Failed to load data');
    } finally {
      this.isLoading = false;
    }
  }

  async loadProducts() {
    this.products = await this.productService.getAllProducts(this.tenantId);
    this.applyFilters();
  }

  async loadProductSummary() {
    this.productSummary = await this.productService.getProductSummary(this.tenantId);
  }

  async loadCurrentGoldRate() {
    const rate = await this.goldRateService.getLatestRate(this.tenantId);
    if (rate) {
      const gold22K = rate.rates.find(r => r.metalType === MetalType.GOLD_22K);
      this.currentGoldRate = gold22K?.rate || 0;
    }
  }

  applyFilters() {
    let filtered = [...this.products];

    // Apply tab filter
    if (this.activeTab === 'low-stock') {
      filtered = filtered.filter(p => p.stockStatus === StockStatus.LOW_STOCK);
    } else if (this.activeTab === 'out-of-stock') {
      filtered = filtered.filter(p => p.stockStatus === StockStatus.OUT_OF_STOCK);
    }

    // Apply search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(p => p.category === this.selectedCategory);
    }

    // Apply stock status filter
    if (this.selectedStockStatus) {
      filtered = filtered.filter(p => p.stockStatus === this.selectedStockStatus);
    }

    this.filteredProducts = filtered;
  }

  onSearchChange() {
    this.applyFilters();
  }

  onCategoryChange() {
    this.applyFilters();
  }

  onStockStatusChange() {
    this.applyFilters();
  }

  switchTab(tab: 'all' | 'low-stock' | 'out-of-stock') {
    this.activeTab = tab;
    this.applyFilters();
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  // Product Form Methods
  openAddModal() {
    this.productForm = this.getEmptyProductForm();
    this.showAddModal = true;
  }

  openEditModal(product: Product) {
    this.selectedProduct = product;
    this.productForm = { ...product };
    this.showEditModal = true;
  }

  closeModal() {
    this.showAddModal = false;
    this.showEditModal = false;
    this.showStockModal = false;
    this.showDeleteConfirm = false;
    this.selectedProduct = null;
    this.productForm = {};
    this.stoneForm = {};
    this.stockAdjustment = { type: 'IN', quantity: 0, notes: '' };
  }

  getEmptyProductForm(): Partial<Product> {
    return {
      tenantId: this.tenantId,
      sku: '',
      name: '',
      description: '',
      category: ProductCategory.RING,
      productType: ProductType.JEWELLERY,
      metalType: '22K',
      purity: '916',
      grossWeight: 0,
      netWeight: 0,
      wastagePercent: 0,
      makingChargesType: 'per_gram',
      makingChargesValue: 0,
      goldRate: this.currentGoldRate,
      hasStones: false,
      stones: [],
      hasHallmark: false,
      stockQuantity: 1,
      stockStatus: StockStatus.IN_STOCK,
      minStockLevel: 1,
      isActive: true,
      isFeatured: false,
      isOnSale: false,
      gender: 'Unisex',
      createdBy: this.currentUserId,
      createdByName: this.currentUserName
    };
  }

  async saveProduct() {
    if (!this.validateProductForm()) {
      return;
    }

    try {
      this.isLoading = true;

      // Calculate values
      this.calculateProductValues();

      if (this.showAddModal) {
        await this.productService.createProduct(this.productForm as Omit<Product, 'id'>);
        alert('Product added successfully!');
      } else if (this.showEditModal && this.selectedProduct?.id) {
        await this.productService.updateProduct(this.selectedProduct.id, this.productForm);
        alert('Product updated successfully!');
      }

      this.closeModal();
      await this.loadInitialData();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(error.message || 'Failed to save product');
    } finally {
      this.isLoading = false;
    }
  }

  validateProductForm(): boolean {
    if (!this.productForm.sku?.trim()) {
      alert('SKU is required');
      return false;
    }
    if (!this.productForm.name?.trim()) {
      alert('Product name is required');
      return false;
    }
    if (!this.productForm.grossWeight || this.productForm.grossWeight <= 0) {
      alert('Gross weight must be greater than 0');
      return false;
    }
    return true;
  }

  calculateProductValues() {
    const form = this.productForm;

    // Calculate net weight
    if (form.grossWeight) {
      const wastage = ((form.wastagePercent || 0) / 100) * form.grossWeight;
      form.wastageWeight = wastage;
      form.netWeight = form.grossWeight - wastage;
    }

    // Calculate gold value
    if (form.netWeight && form.goldRate) {
      form.goldValue = form.netWeight * form.goldRate;
    }

    // Calculate making charges
    form.makingCharges = calculateMakingCharges(form as Product);

    // Calculate stone value if applicable
    if (form.hasStones && form.stones?.length) {
      form.stoneValue = form.stones.reduce((sum, stone) => sum + (stone.value || 0), 0);
    }

    // Calculate total value
    form.totalValue = (form.goldValue || 0) + (form.makingCharges || 0) + (form.stoneValue || 0);
    form.mrp = form.totalValue;
    form.sellingPrice = form.totalValue;
  }

  onWeightChange() {
    this.calculateProductValues();
  }

  onGoldRateChange() {
    this.calculateProductValues();
  }

  // Stone Management
  addStone() {
    if (!this.productForm.stones) {
      this.productForm.stones = [];
    }
    this.productForm.stones.push({
      stoneType: this.stoneForm.stoneType || 'Diamond',
      quantity: this.stoneForm.quantity || 1,
      weight: this.stoneForm.weight || 0,
      clarity: this.stoneForm.clarity,
      color: this.stoneForm.color,
      cut: this.stoneForm.cut,
      shape: this.stoneForm.shape,
      certificateNumber: this.stoneForm.certificateNumber,
      certificateType: this.stoneForm.certificateType,
      value: this.stoneForm.value || 0
    });
    this.stoneForm = {};
    this.calculateProductValues();
  }

  removeStone(index: number) {
    this.productForm.stones?.splice(index, 1);
    this.calculateProductValues();
  }

  // Stock Management
  openStockModal(product: Product) {
    this.selectedProduct = product;
    this.stockAdjustment = { type: 'IN', quantity: 0, notes: '' };
    this.loadStockTransactions(product.id!);
    this.showStockModal = true;
  }

  async loadStockTransactions(productId: string) {
    try {
      this.stockTransactions = await this.productService.getStockTransactions(productId);
    } catch (error) {
      console.error('Error loading stock transactions:', error);
    }
  }

  async adjustStock() {
    if (!this.selectedProduct?.id || this.stockAdjustment.quantity === 0) {
      alert('Please enter a valid quantity');
      return;
    }

    try {
      this.isLoading = true;

      const quantityChange = this.stockAdjustment.type === 'OUT'
        ? -Math.abs(this.stockAdjustment.quantity)
        : Math.abs(this.stockAdjustment.quantity);

      await this.productService.updateStock(
        this.selectedProduct.id,
        quantityChange,
        this.stockAdjustment.type,
        'MANUAL',
        undefined,
        undefined,
        this.currentUserId,
        this.currentUserName,
        this.stockAdjustment.notes
      );

      alert('Stock updated successfully!');
      this.closeModal();
      await this.loadInitialData();
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      alert(error.message || 'Failed to adjust stock');
    } finally {
      this.isLoading = false;
    }
  }

  // Delete Product
  confirmDelete(product: Product) {
    this.selectedProduct = product;
    this.showDeleteConfirm = true;
  }

  async deleteProduct() {
    if (!this.selectedProduct?.id) {
      return;
    }

    try {
      this.isLoading = true;
      await this.productService.deleteProduct(this.selectedProduct.id);
      alert('Product deleted successfully!');
      this.closeModal();
      await this.loadInitialData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } finally {
      this.isLoading = false;
    }
  }

  // Bulk Price Update
  async updateAllPrices() {
    if (!confirm('Update prices for all products based on current gold rate?')) {
      return;
    }

    try {
      this.isLoading = true;
      const count = await this.productService.updatePricesByGoldRate(
        this.tenantId,
        this.currentGoldRate
      );
      alert(`Updated prices for ${count} products!`);
      await this.loadProducts();
    } catch (error) {
      console.error('Error updating prices:', error);
      alert('Failed to update prices');
    } finally {
      this.isLoading = false;
    }
  }

  // Helper Methods
  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatWeight(weight: number | undefined): string {
    if (weight === undefined || weight === null) return '0.000g';
    return `${weight.toFixed(3)}g`;
  }

  getStockStatusColor(status: StockStatus): string {
    return getStockStatusColor(status);
  }

  getCategoryLabel(category: ProductCategory): string {
    return PRODUCT_CATEGORY_LABELS[category] || category;
  }

  getStockStatusLabel(status: StockStatus): string {
    return STOCK_STATUS_LABELS[status] || status;
  }

  getTransactionTypeIcon(type: string): string {
    switch (type) {
      case 'IN': return '📥';
      case 'OUT': return '📤';
      case 'ADJUSTMENT': return '⚖️';
      case 'RETURN': return '↩️';
      case 'DAMAGE': return '⚠️';
      default: return '📋';
    }
  }
}
