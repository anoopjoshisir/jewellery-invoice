import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OldGoldPurchaseService } from '../../core/services/old-gold-purchase.service';
import { GoldRateService } from '../../core/services/gold-rate.service';
import {
  OldGoldPurchase,
  OldGoldItem,
  OldGoldDeduction,
  OldGoldSummary,
  OldGoldCondition,
  PurityTestMethod,
  OLD_GOLD_CONDITION_LABELS,
  PURITY_TEST_METHOD_LABELS,
  OLD_GOLD_CONDITION_COLORS,
  calculateOldGoldValue
} from '../../core/models/old-gold-purchase.model';
import { MetalType } from '../../core/models/gold-rate.model';

@Component({
  selector: 'app-old-gold-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './old-gold-purchase.component.html',
  styleUrls: ['./old-gold-purchase.component.scss']
})
export class OldGoldPurchaseComponent implements OnInit {
  isLoading = false;
  tenantId = 'tenant_001'; // TODO: Get from auth service
  currentUserId = 'current_user'; // TODO: Get from auth service
  currentUserName = 'Current User'; // TODO: Get from auth service

  // View state
  viewMode: 'list' | 'entry' | 'detail' = 'list';

  // Purchases data
  purchases: OldGoldPurchase[] = [];
  filteredPurchases: OldGoldPurchase[] = [];
  selectedPurchase: OldGoldPurchase | null = null;
  purchaseSummary: OldGoldSummary | null = null;

  // Filters
  searchTerm = '';
  dateFilter = 'all';
  startDate = '';
  endDate = '';

  // Current gold rate
  currentGoldRate24K = 0;

  // Purchase form
  purchaseForm: Partial<OldGoldPurchase> = {};
  currentItem: Partial<OldGoldItem> = {};
  currentDeduction: Partial<OldGoldDeduction> = {};

  // Enums for template
  OldGoldCondition = OldGoldCondition;
  PurityTestMethod = PurityTestMethod;
  OLD_GOLD_CONDITION_LABELS = OLD_GOLD_CONDITION_LABELS;
  PURITY_TEST_METHOD_LABELS = PURITY_TEST_METHOD_LABELS;
  OLD_GOLD_CONDITION_COLORS = OLD_GOLD_CONDITION_COLORS;

  conditions = Object.values(OldGoldCondition);
  testMethods = Object.values(PurityTestMethod);
  paymentModes: Array<'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'EXCHANGE'> = [
    'CASH', 'BANK_TRANSFER', 'CHEQUE', 'EXCHANGE'
  ];

  itemTypes = [
    'Ring', 'Necklace', 'Chain', 'Bangle', 'Bracelet',
    'Earring', 'Pendant', 'Mangalsutra', 'Coin', 'Bar', 'Other'
  ];

  purities = ['24K', '23K', '22K', '21K', '20K', '18K', '14K', '10K', '916', '750', '585'];

  deductionTypes: Array<{ value: string; label: string }> = [
    { value: 'STONE_WEIGHT', label: 'Stone Weight Deduction' },
    { value: 'IMPURITY', label: 'Impurity Deduction' },
    { value: 'DAMAGE', label: 'Damage Deduction' },
    { value: 'WASTAGE', label: 'Wastage Deduction' },
    { value: 'OTHER', label: 'Other Deduction' }
  ];

  idProofTypes = [
    'Aadhaar Card', 'PAN Card', 'Passport', 'Driving License', 'Voter ID'
  ];

  constructor(
    private oldGoldPurchaseService: OldGoldPurchaseService,
    private goldRateService: GoldRateService
  ) {}

  async ngOnInit() {
    await this.loadInitialData();
  }

  async loadInitialData() {
    try {
      this.isLoading = true;
      await Promise.all([
        this.loadPurchases(),
        this.loadPurchaseSummary(),
        this.loadCurrentGoldRate()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      alert('Failed to load data');
    } finally {
      this.isLoading = false;
    }
  }

  async loadPurchases() {
    this.purchases = await this.oldGoldPurchaseService.getAllPurchases(this.tenantId);
    this.applyFilters();
  }

  async loadPurchaseSummary() {
    this.purchaseSummary = await this.oldGoldPurchaseService.getPurchaseSummary(this.tenantId);
  }

  async loadCurrentGoldRate() {
    const rate = await this.goldRateService.getLatestRate(this.tenantId);
    if (rate) {
      const gold24K = rate.rates.find(r => r.metalType === MetalType.GOLD_24K);
      this.currentGoldRate24K = gold24K?.rate || 0;
    }
  }

  applyFilters() {
    let filtered = [...this.purchases];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.purchaseNumber.toLowerCase().includes(term) ||
        p.customerName.toLowerCase().includes(term) ||
        p.customerMobile.includes(term)
      );
    }

    // Date filter
    if (this.dateFilter === 'custom' && this.startDate && this.endDate) {
      filtered = filtered.filter(p =>
        p.purchaseDate >= this.startDate && p.purchaseDate <= this.endDate
      );
    } else if (this.dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(p => p.purchaseDate === today);
    } else if (this.dateFilter === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      filtered = filtered.filter(p => p.purchaseDate >= weekAgo);
    } else if (this.dateFilter === 'month') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      filtered = filtered.filter(p => p.purchaseDate >= monthAgo);
    }

    this.filteredPurchases = filtered;
  }

  onSearchChange() {
    this.applyFilters();
  }

  onDateFilterChange() {
    this.applyFilters();
  }

  // View methods
  switchView(mode: 'list' | 'entry' | 'detail') {
    this.viewMode = mode;
    if (mode === 'entry') {
      this.initializePurchaseForm();
    }
  }

  viewPurchaseDetail(purchase: OldGoldPurchase) {
    this.selectedPurchase = purchase;
    this.viewMode = 'detail';
  }

  backToList() {
    this.viewMode = 'list';
    this.selectedPurchase = null;
    this.purchaseForm = {};
  }

  // Purchase form methods
  initializePurchaseForm() {
    this.purchaseForm = {
      tenantId: this.tenantId,
      purchaseDate: new Date().toISOString().split('T')[0],
      customerName: '',
      customerMobile: '',
      customerAddress: '',
      customerIdProof: '',
      customerIdNumber: '',
      items: [],
      totalGrossWeight: 0,
      totalNetWeight: 0,
      totalValue: 0,
      paymentMode: 'CASH',
      paidAmount: 0,
      exchangeAmount: 0,
      testedBy: this.currentUserId,
      testedByName: this.currentUserName,
      status: 'DRAFT',
      createdBy: this.currentUserId,
      createdByName: this.currentUserName
    };
    this.currentItem = this.getEmptyItem();
  }

  getEmptyItem(): Partial<OldGoldItem> {
    return {
      itemType: 'Ring',
      description: '',
      grossWeight: 0,
      netWeight: 0,
      stoneWeight: 0,
      purityMarked: '22K',
      purityTested: '22K',
      testMethod: PurityTestMethod.TOUCHSTONE,
      condition: OldGoldCondition.GOOD,
      rate24K: this.currentGoldRate24K,
      rateForPurity: 0,
      deductions: [],
      grossValue: 0,
      totalDeductions: 0,
      netValue: 0,
      hasStones: false,
      hasDamage: false
    };
  }

  calculateItemValues() {
    if (!this.currentItem.grossWeight || !this.currentItem.purityTested) {
      return;
    }

    // Calculate net weight
    const stoneWeight = this.currentItem.stoneWeight || 0;
    this.currentItem.netWeight = this.currentItem.grossWeight - stoneWeight;

    // Calculate values using helper
    const result = calculateOldGoldValue(
      this.currentItem.netWeight,
      this.currentItem.purityTested,
      this.currentItem.rate24K || this.currentGoldRate24K,
      this.currentItem.deductions as OldGoldDeduction[] || []
    );

    this.currentItem.grossValue = result.grossValue;
    this.currentItem.totalDeductions = result.totalDeductions;
    this.currentItem.netValue = result.netValue;

    // Calculate rate for purity
    const PURITY_FACTORS: Record<string, number> = {
      '24K': 1.000, '23K': 0.958, '22K': 0.916, '21K': 0.875,
      '20K': 0.833, '18K': 0.750, '14K': 0.583, '10K': 0.417,
      '916': 0.916, '750': 0.750, '585': 0.585
    };
    const factor = PURITY_FACTORS[this.currentItem.purityTested] || 0.916;
    this.currentItem.rateForPurity = (this.currentItem.rate24K || this.currentGoldRate24K) * factor;
  }

  addDeduction() {
    if (!this.currentDeduction.type || !this.currentDeduction.amount) {
      alert('Please enter deduction type and amount');
      return;
    }

    if (!this.currentItem.deductions) {
      this.currentItem.deductions = [];
    }

    this.currentItem.deductions.push({
      type: this.currentDeduction.type as any,
      description: this.currentDeduction.description || '',
      amount: this.currentDeduction.amount,
      percentage: this.currentDeduction.percentage
    });

    this.currentDeduction = {};
    this.calculateItemValues();
  }

  removeDeduction(index: number) {
    this.currentItem.deductions?.splice(index, 1);
    this.calculateItemValues();
  }

  addItem() {
    if (!this.currentItem.grossWeight || this.currentItem.grossWeight <= 0) {
      alert('Please enter valid gross weight');
      return;
    }

    this.calculateItemValues();

    if (!this.purchaseForm.items) {
      this.purchaseForm.items = [];
    }

    this.purchaseForm.items.push(this.currentItem as OldGoldItem);
    this.currentItem = this.getEmptyItem();
    this.calculateTotals();
  }

  removeItem(index: number) {
    this.purchaseForm.items?.splice(index, 1);
    this.calculateTotals();
  }

  calculateTotals() {
    if (!this.purchaseForm.items?.length) {
      this.purchaseForm.totalGrossWeight = 0;
      this.purchaseForm.totalNetWeight = 0;
      this.purchaseForm.totalValue = 0;
      return;
    }

    this.purchaseForm.totalGrossWeight = this.purchaseForm.items.reduce(
      (sum, item) => sum + item.grossWeight, 0
    );
    this.purchaseForm.totalNetWeight = this.purchaseForm.items.reduce(
      (sum, item) => sum + (item.netWeight || 0), 0
    );
    this.purchaseForm.totalValue = this.purchaseForm.items.reduce(
      (sum, item) => sum + item.netValue, 0
    );
    this.purchaseForm.paidAmount = this.purchaseForm.totalValue;
  }

  async savePurchase(status: 'DRAFT' | 'COMPLETED') {
    if (!this.validatePurchaseForm()) {
      return;
    }

    try {
      this.isLoading = true;
      this.purchaseForm.status = status;

      await this.oldGoldPurchaseService.createPurchase(
        this.purchaseForm as Omit<OldGoldPurchase, 'id' | 'purchaseNumber'>
      );

      alert(`Purchase ${status === 'COMPLETED' ? 'completed' : 'saved as draft'} successfully!`);
      await this.loadInitialData();
      this.backToList();
    } catch (error) {
      console.error('Error saving purchase:', error);
      alert('Failed to save purchase');
    } finally {
      this.isLoading = false;
    }
  }

  validatePurchaseForm(): boolean {
    if (!this.purchaseForm.customerName?.trim()) {
      alert('Customer name is required');
      return false;
    }
    if (!this.purchaseForm.customerMobile?.trim()) {
      alert('Customer mobile is required');
      return false;
    }
    if (!this.purchaseForm.items?.length) {
      alert('Please add at least one item');
      return false;
    }
    return true;
  }

  async cancelPurchase(purchase: OldGoldPurchase) {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) {
      return;
    }

    try {
      this.isLoading = true;
      await this.oldGoldPurchaseService.cancelPurchase(
        purchase.id!,
        reason,
        this.currentUserId,
        this.currentUserName
      );
      alert('Purchase cancelled successfully');
      await this.loadInitialData();
      if (this.viewMode === 'detail') {
        this.backToList();
      }
    } catch (error) {
      console.error('Error cancelling purchase:', error);
      alert('Failed to cancel purchase');
    } finally {
      this.isLoading = false;
    }
  }

  // Helper methods
  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatWeight(weight: number | undefined): string {
    if (weight === undefined || weight === null) return '0.000g';
    return `${weight.toFixed(3)}g`;
  }

  formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('en-IN');
  }

  getConditionLabel(condition: OldGoldCondition): string {
    return OLD_GOLD_CONDITION_LABELS[condition] || condition;
  }

  getConditionColor(condition: OldGoldCondition): string {
    return OLD_GOLD_CONDITION_COLORS[condition] || '#718096';
  }

  getTestMethodLabel(method: PurityTestMethod): string {
    return PURITY_TEST_METHOD_LABELS[method] || method;
  }

  getPaymentModeLabel(mode: string): string {
    const labels: Record<string, string> = {
      'CASH': 'Cash',
      'BANK_TRANSFER': 'Bank Transfer',
      'CHEQUE': 'Cheque',
      'EXCHANGE': 'Exchange'
    };
    return labels[mode] || mode;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED': return '#48bb78';
      case 'DRAFT': return '#ed8936';
      case 'CANCELLED': return '#f56565';
      default: return '#718096';
    }
  }

  getDeductionLabel(type: string): string {
    const deduction = this.deductionTypes.find(d => d.value === type);
    return deduction?.label || type;
  }
}
