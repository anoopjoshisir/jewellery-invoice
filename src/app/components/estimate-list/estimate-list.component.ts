import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Estimate } from '../../core/models/estimate.model';
import { Invoice } from '../../core/models/invoice.model';
import { EstimateService } from '../../core/services/estimate.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { MainLayoutComponent } from '../main-layout/main-layout.component';

@Component({
  selector: 'app-estimate-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent],
  templateUrl: './estimate-list.component.html',
  styleUrls: ['./estimate-list.component.scss']
})
export class EstimateListComponent implements OnInit {
  estimates: Estimate[] = [];
  filteredEstimates: Estimate[] = [];
  isLoading = false;
  selectedStatus: string = 'all';
  companyId = '';

  statusOptions = [
    { value: 'all', label: 'All Estimates' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'converted', label: 'Converted to Invoice' }
  ];

  constructor(
    private estimateService: EstimateService,
    private invoiceService: InvoiceService,
    private companyContext: CompanyContextService,
    private auth: AuthService,
    private notification: NotificationService,
    private router: Router
  ) {
    this.companyId = this.companyContext.getSelectedCompanyValue() || "";
  }

  async ngOnInit() {
    await this.loadEstimates();
  }

  async loadEstimates() {
    try {
      this.isLoading = true;

      if (!this.companyId) {
        this.notification.error('No company selected. Please select a company first.');
        return;
      }

      if (this.selectedStatus === 'all') {
        this.estimates = await this.estimateService.getByCompany(this.companyId);
      } else {
        this.estimates = await this.estimateService.getByStatus(
          this.companyId,
          this.selectedStatus as any
        );
      }

      this.filteredEstimates = [...this.estimates];
    } catch (error) {
      console.error('Error loading estimates:', error);
      this.notification.error('Failed to load estimates. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async onStatusChange() {
    await this.loadEstimates();
  }

  async updateEstimateStatus(estimate: Estimate, status: 'pending' | 'accepted' | 'rejected') {
    if (!estimate.id) return;

    try {
      await this.estimateService.update(estimate.id, { status });
      this.notification.success(`Estimate ${estimate.estimateNo} marked as ${status}`);
      await this.loadEstimates();
    } catch (error) {
      console.error('Error updating estimate status:', error);
      this.notification.error('Failed to update estimate status. Please try again.');
    }
  }

  async convertToInvoice(estimate: Estimate) {
    if (!estimate.id) return;

    if (estimate.status === 'converted') {
      this.notification.warning('This estimate has already been converted to an invoice.');
      return;
    }

    if (!confirm(`Convert estimate ${estimate.estimateNo} to invoice?`)) {
      return;
    }

    try {
      const user = this.auth.currentUser;
      if (!user) {
        this.notification.error('User not authenticated. Please login again.');
        return;
      }

      const ip = await this.auth.getIp();

      // Generate invoice number
      const billNo = await this.invoiceService.generateNextBillNo(
        this.companyId,
        new Date().getFullYear()
      );

      // Create invoice from estimate
      const invoice: Invoice = {
        billNo,
        customer: estimate.customer,
        company: estimate.company,
        billDate: new Date().toISOString().substring(0, 10),
        dueDate: estimate.validUntil,
        items: estimate.items,
        payments: [],
        makingCharges: estimate.makingCharges,
        makingDiscount: estimate.makingDiscount,
        discountType: estimate.discountType,
        discountValue: estimate.discountValue,
        total: estimate.total,
        discountOnGoldWeight: estimate.discountOnGoldWeight,
        totalDiscount: estimate.totalDiscount,
        amountPaid: 0,
        grandTotal: estimate.grandTotal,
        remarks: `Converted from Estimate ${estimate.estimateNo}. ${estimate.remarks}`,
        entryDate: new Date().toISOString(),
        enteredBy: user.uid,
        enteredByName: user.displayName || user.name || "",
        enteredByIp: ip
      };

      const invoiceRef = await this.invoiceService.add(invoice);

      // Update estimate status
      await this.estimateService.update(estimate.id, {
        status: 'converted',
        convertedToInvoiceId: invoiceRef.id,
        convertedDate: new Date().toISOString()
      });

      this.notification.success(`Estimate ${estimate.estimateNo} converted to Invoice ${billNo} successfully!`);
      await this.loadEstimates();
    } catch (error) {
      console.error('Error converting estimate to invoice:', error);
      this.notification.error('Failed to convert estimate to invoice. Please try again.');
    }
  }

  async deleteEstimate(estimate: Estimate) {
    if (!estimate.id) return;

    if (estimate.status === 'converted') {
      this.notification.warning('Cannot delete an estimate that has been converted to an invoice.');
      return;
    }

    if (!confirm(`Are you sure you want to delete estimate ${estimate.estimateNo}?`)) {
      return;
    }

    try {
      await this.estimateService.delete(estimate.id);
      this.notification.success(`Estimate ${estimate.estimateNo} deleted successfully.`);
      await this.loadEstimates();
    } catch (error) {
      console.error('Error deleting estimate:', error);
      this.notification.error('Failed to delete estimate. Please try again.');
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending': return 'badge-pending';
      case 'accepted': return 'badge-accepted';
      case 'rejected': return 'badge-rejected';
      case 'converted': return 'badge-converted';
      default: return '';
    }
  }

  isExpired(estimate: Estimate): boolean {
    if (estimate.status === 'converted') return false;
    const validUntil = new Date(estimate.validUntil);
    const today = new Date();
    return validUntil < today;
  }
}
