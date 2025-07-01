import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Invoice } from '../../core/models/invoice.model';
import { Company } from '../../core/models/company.model';
import { Customer } from '../../core/models/customer.model';
import { InvoiceService } from '../../core/services/invoice.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { CustomerService } from '../../core/services/customer.service';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../main-layout/main-layout.component';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-invoice-print',
    standalone:true,
    imports:[CommonModule, FormsModule,MainLayoutComponent],
    templateUrl: './invoice-print.component.html',
    styleUrls: ['./invoice-print.component.scss']
})
export class InvoicePrintComponent implements OnInit {
    @Input() invoice?: Invoice;
    @Input() company?: Company;
    @Output() invoiceChange = new EventEmitter<Invoice>();

    invoices: Invoice[] = [];
    customers: Customer[] = [];
    selectedCustomerId: string = '';
    selectedInvoiceId: string = '';

    constructor(
        private invoiceService: InvoiceService,
        private companyContext: CompanyContextService,
        private customerService: CustomerService
    ) { }

    async ngOnInit() {
        // If invoice is not given, load all invoices for the company and all customers
        if (!this.invoice) {
            const companyId = this.companyContext.getSelectedCompanyValue() || "";
            this.invoices = await this.invoiceService.getByCompany(companyId);
            this.customers = await this.customerService.getByCompany(companyId);
            this.selectedCustomerId = '';
            this.selectedInvoiceId = '';
        } else {
            this.selectedInvoiceId = this.invoice.id ?? '';
        }
    }

    get filteredInvoices(): Invoice[] {
        if (!this.selectedCustomerId) return this.invoices;
        return this.invoices.filter(inv => inv.customer?.id === this.selectedCustomerId);
    }

    onCustomerChange() {
        this.selectedInvoiceId = '';
    }

    onInvoiceSelect(event: Event) {
        const id = (event.target as HTMLSelectElement).value;
        const inv = this.filteredInvoices.find(i => i.id === id);
        if (inv) {
            this.selectedInvoiceId = inv.id!;
            this.invoiceChange.emit(inv);
            this.invoice = inv;
        }
    }

    get balance(): number {
        if (!this.invoice) return 0;
        return (this.invoice.grandTotal || 0) - (this.invoice.amountPaid || 0);
    }

    printInvoice() {
        const printContents = document.getElementById('print-area')?.innerHTML;
        const printWindow = window.open('', '', 'height=800,width=900');
        if (printWindow && printContents) {
            printWindow.document.write('<html><head><title>Invoice Print</title>');
            printWindow.document.write('<style>');
            printWindow.document.write(document.getElementById('print-style')?.innerHTML || '');
            printWindow.document.write('</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(printContents);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 300);
        }
    }

    // exportPDF() {
    //     import('jspdf').then(html2pdf => {
    //         const element = document.getElementById('print-area');
    //         const opt = {
    //             margin: 0.5,
    //             filename: `Invoice-${this.invoice?.billNo || 'export'}.pdf`,
    //             image: { type: 'jpeg', quality: 0.98 },
    //             html2canvas: { scale: 2 },
    //             jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    //         };
    //         if (element) {
    //             html2pdf.default().from(element).set(opt).save();
    //         }
    //     });
    // }

    shareInvoice() {
        if (navigator.share) {
            import('html2canvas').then(html2canvas => {
                const element = document.getElementById('print-area');
                if (element) {
                    html2canvas.default(element).then(canvas => {
                        canvas.toBlob(blob => {
                            if (blob) {
                                const file = new File([blob], `Invoice-${this.invoice?.billNo || 'export'}.png`, { type: 'image/png' });
                                navigator.share({
                                    title: `Invoice ${this.invoice?.billNo || ''}`,
                                    text: `Sharing Invoice ${this.invoice?.billNo || ''}`,
                                    files: [file]
                                });
                            }
                        });
                    });
                }
            });
        } else {
            alert('Web Share API is not supported in your browser.');
        }
    }


    printThermal() {
        // For thermal printers, you might open a new window with a minimal style
        const printContents = document.getElementById('invoice-to-print')?.innerHTML;
        const printWindow = window.open('', '', 'width=300,height=600');
        if (printWindow && printContents) {
            printWindow.document.write('<html><head><title>Print</title>');
            // Add thermal CSS
            printWindow.document.write('<style>body{font-size:12px;} table{width:100%;}</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(printContents);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 500);
        }
    }

    async exportToPDF() {
        const jsPDF = (await import('jspdf')).jsPDF;
        const doc = new jsPDF('p', 'pt', 'a4');
        const printElement = document.getElementById('invoice-to-print');
        if (!printElement) return;
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(printElement);
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 10, 10, 575, 800);
        doc.save(`Invoice_${this.invoice?.billNo}.pdf`);        
    }

    exportToWhatsApp() {
        const text = `Invoice for ${this.invoice?.customer.name}, Grand Total: ₹${this.invoice?.grandTotal}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
}