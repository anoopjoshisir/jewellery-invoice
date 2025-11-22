import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoldRateService } from '../../core/services/gold-rate.service';
import {
  GoldRate,
  MetalRate,
  MetalType,
  RateUnit,
  GoldRateHistory,
  METAL_TYPE_LABELS,
  RATE_UNIT_LABELS
} from '../../core/models/gold-rate.model';

@Component({
  selector: 'app-gold-rate-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gold-rate-management.component.html',
  styleUrls: ['./gold-rate-management.component.scss']
})
export class GoldRateManagementComponent implements OnInit {
  isLoading = false;
  tenantId = 'tenant_001'; // TODO: Get from auth service
  currentUserId = 'current_user'; // TODO: Get from auth service
  currentUserName = 'Current User'; // TODO: Get from auth service

  // Current rates
  currentRates: GoldRate | null = null;
  todaysRate: GoldRate | null = null;

  // Rate form
  selectedDate: string = '';
  rateForm: MetalRate[] = [];
  rateSource: 'manual' | 'api' = 'manual';
  remarks = '';

  // View state
  viewMode: 'current' | 'history' | 'entry' = 'current';

  // History
  rateHistory: GoldRate[] = [];
  selectedMetalForHistory: MetalType = MetalType.GOLD_24K;
  historyDays = 30;
  historyWithChanges: GoldRateHistory[] = [];

  // Enums for template
  MetalType = MetalType;
  RateUnit = RateUnit;
  METAL_TYPE_LABELS = METAL_TYPE_LABELS;
  RATE_UNIT_LABELS = RATE_UNIT_LABELS;

  metalTypes = Object.values(MetalType);
  rateUnits = Object.values(RateUnit);

  constructor(private goldRateService: GoldRateService) {}

  async ngOnInit() {
    this.selectedDate = new Date().toISOString().split('T')[0];
    await this.loadCurrentRates();
    this.initializeRateForm();
  }

  async loadCurrentRates() {
    try {
      this.isLoading = true;
      this.currentRates = await this.goldRateService.getLatestRate(this.tenantId);
      this.todaysRate = await this.goldRateService.getTodaysRate(this.tenantId);
    } catch (error) {
      console.error('Error loading current rates:', error);
      alert('Failed to load current rates');
    } finally {
      this.isLoading = false;
    }
  }

  initializeRateForm() {
    // Initialize with default metal types
    this.rateForm = this.metalTypes.map(metalType => ({
      metalType,
      rate: 0,
      unit: RateUnit.PER_GRAM,
      buyRate: 0,
      sellRate: 0
    }));

    // If current rates exist, populate form
    if (this.currentRates) {
      this.rateForm = this.currentRates.rates.map(r => ({ ...r }));
    }
  }

  async switchView(mode: 'current' | 'history' | 'entry') {
    this.viewMode = mode;

    if (mode === 'history') {
      await this.loadRateHistory();
    } else if (mode === 'entry') {
      this.initializeRateForm();
    }
  }

  async loadRateHistory() {
    try {
      this.isLoading = true;
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - this.historyDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      this.rateHistory = await this.goldRateService.getRateHistory(
        this.tenantId,
        startDate,
        endDate
      );

      // Load history with changes for selected metal
      this.historyWithChanges = await this.goldRateService.getRateHistoryWithChanges(
        this.tenantId,
        this.selectedMetalForHistory,
        this.historyDays
      );
    } catch (error) {
      console.error('Error loading rate history:', error);
      alert('Failed to load rate history');
    } finally {
      this.isLoading = false;
    }
  }

  async onMetalChangeForHistory() {
    await this.loadRateHistory();
  }

  async saveRates() {
    if (!this.selectedDate) {
      alert('Please select a date');
      return;
    }

    // Validate rates
    const validRates = this.rateForm.filter(r => r.rate > 0);
    if (validRates.length === 0) {
      alert('Please enter at least one rate');
      return;
    }

    try {
      this.isLoading = true;

      const goldRate: Omit<GoldRate, 'id'> = {
        tenantId: this.tenantId,
        date: this.selectedDate,
        rates: validRates,
        source: this.rateSource,
        remarks: this.remarks,
        createdBy: this.currentUserId,
        createdByName: this.currentUserName,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      await this.goldRateService.setGoldRate(goldRate);

      alert('Rates saved successfully!');
      await this.loadCurrentRates();
      this.switchView('current');
    } catch (error) {
      console.error('Error saving rates:', error);
      alert('Failed to save rates');
    } finally {
      this.isLoading = false;
    }
  }

  async clonePreviousRate() {
    if (!confirm('Clone previous day\'s rate to today?')) {
      return;
    }

    try {
      this.isLoading = true;
      await this.goldRateService.clonePreviousRate(
        this.tenantId,
        this.currentUserId,
        this.currentUserName
      );

      alert('Rate cloned successfully!');
      await this.loadCurrentRates();
    } catch (error) {
      console.error('Error cloning rate:', error);
      alert('Failed to clone rate');
    } finally {
      this.isLoading = false;
    }
  }

  async loadRateForDate() {
    if (!this.selectedDate) {
      return;
    }

    try {
      this.isLoading = true;
      const rate = await this.goldRateService.getRateByDate(this.tenantId, this.selectedDate);

      if (rate) {
        this.rateForm = rate.rates.map(r => ({ ...r }));
        this.remarks = rate.remarks || '';
        this.rateSource = rate.source || 'manual';
      } else {
        // No rate found for this date, initialize empty
        this.initializeRateForm();
        this.remarks = '';
      }
    } catch (error) {
      console.error('Error loading rate for date:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Auto-calculate sell rate (slightly higher than rate)
  onRateChange(metalRate: MetalRate) {
    if (!metalRate.sellRate && metalRate.rate > 0) {
      // Default: sell rate = rate + 2% (can be customized)
      metalRate.sellRate = metalRate.rate * 1.02;
    }
    if (!metalRate.buyRate && metalRate.rate > 0) {
      // Default: buy rate = rate - 2% (can be customized)
      metalRate.buyRate = metalRate.rate * 0.98;
    }
  }

  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN');
  }

  formatChange(change: number | undefined): string {
    if (change === undefined || change === null) {
      return '-';
    }
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${this.formatCurrency(change)}`;
  }

  formatChangePercent(changePercent: number | undefined): string {
    if (changePercent === undefined || changePercent === null) {
      return '-';
    }
    const prefix = changePercent >= 0 ? '+' : '';
    return `${prefix}${changePercent.toFixed(2)}%`;
  }

  getChangeClass(change: number | undefined): string {
    if (change === undefined || change === null) {
      return '';
    }
    return change >= 0 ? 'positive-change' : 'negative-change';
  }

  getMetalTypeLabel(metalType: MetalType): string {
    return METAL_TYPE_LABELS[metalType] || metalType;
  }

  getRateUnitLabel(unit: RateUnit): string {
    return RATE_UNIT_LABELS[unit] || unit;
  }
}
