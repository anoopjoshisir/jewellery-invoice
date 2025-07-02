import { Component, OnInit } from '@angular/core';
import { Invoice } from '../../core/models/invoice.model';
import { InvoiceService } from '../../core/services/invoice.service';
import { MatDialog } from '@angular/material/dialog';
import { InvoicePrintComponent } from '../print/invoice-print.component';
import { CompanyContextService } from '../../core/services/company-context.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MainLayoutComponent } from '../main-layout/main-layout.component';

@Component({
    selector: 'app-invoice-list',
    standalone:true,
    imports:[CommonModule,FormsModule,MainLayoutComponent],
    templateUrl: './invoice-list.component.html',
    styleUrls: ['./invoice-list.component.scss']
})
export class InvoiceListComponent implements OnInit {
    invoices: Invoice[] = [];
    filteredInvoices: Invoice[] = [];
    customers: string[] = [];
    selectedCustomer: string = '';
    loading = true;

    constructor(
        private invoiceService: InvoiceService,
        private companyContext: CompanyContextService,
        private dialog: MatDialog
    ) { }

    async ngOnInit() {
        debugger;
        const companyId = this.companyContext.getSelectedCompanyValue() || "";
        this.invoices = await this.invoiceService.getByCompany(companyId);
        // Descending by billDate
        this.invoices.sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
        this.customers = Array.from(new Set(this.invoices.map(inv => inv.customer?.name ?? ''))).filter(x => x);
        this.applyFilter();
        this.loading = false;
    }

    applyFilter() {
        this.filteredInvoices = this.selectedCustomer
            ? this.invoices.filter(inv => inv.customer?.name === this.selectedCustomer)
            : this.invoices;
    }

    getItemSummary(invoice: Invoice): string {
        return invoice.items
            .map(
                (item) =>
                    `${item.name}${item.purity ? '-' + item.purity : ''}-${item.qty}(${item.rate})`
            )
            .join(', ');
    }

    openInvoiceDetail(invoice: Invoice) {
        this.dialog.open(InvoicePrintComponent, {
            width: '95vw',
            maxWidth: '900px',
            height: '90vh',
            panelClass: 'invoice-dialog-panel',
            data: { invoice, type: 'normal', exportMode: false }
        });
    }

    printInvoice(invoice: Invoice, type: 'normal' | 'thermal') {
        this.dialog.open(InvoicePrintComponent, {
            width: type === 'thermal' ? '350px' : '800px',
            maxWidth: type === 'thermal' ? '350px' : '800px',
            height: '90vh',
            panelClass: 'invoice-dialog-panel',
            data: { invoice, type }
        });
    }

    exportAsPDF(invoice: Invoice) {
        this.dialog.open(InvoicePrintComponent, {
            width: '95vw',
            maxWidth: '900px',
            height: '90vh',
            panelClass: 'invoice-dialog-panel',
            data: { invoice, type: 'normal', exportMode: true, exportType: 'pdf' }
        });

    }

    exportAsImage(invoice: Invoice) {
        this.dialog.open(InvoicePrintComponent, {
            width: '95vw',
            maxWidth: '900px',
            height: '90vh',
            panelClass: 'invoice-dialog-panel',
            data: { invoice, type: 'normal', exportMode: true, exportType: 'image' }
        });
    }

    shareInvoice(invoice: Invoice) {
        this.dialog.open(InvoicePrintComponent, {
            width: '95vw',
            maxWidth: '900px',
            height: '90vh',
            panelClass: 'invoice-dialog-panel',
            data: { invoice, type: 'normal', exportMode: true, exportType: 'share' }
        })
    }
}