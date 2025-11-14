import { Component, Inject, OnInit, ElementRef, ViewChild, Input } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Invoice } from '../../core/models/invoice.model';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyContextService } from '../../core/services/company-context.service';
import { CompanyService } from '../../core/services/company.service';
import { Company } from '../../core/models/company.model';

@Component({
    selector: 'app-invoice-print',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './invoice-print.component.html',
    styleUrls: ['./invoice-print.component.scss']
})
export class InvoicePrintComponent implements OnInit {
    @ViewChild('printSection', { static: false }) printSection!: ElementRef;
    @Input() invoice!: Invoice;
    company!: Company;
    type: 'normal' | 'thermal' = 'normal';
    exportMode = false;
    exportType: string = '';
    hideInvoiceFields: string[] = [];
    hideItemFields: string[] = [];

    constructor(
        private companyService: CompanyService,
        public dialogRef: MatDialogRef<InvoicePrintComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.invoice = data?.invoice || this.invoice;
        //this.company = data?.company || this.invoice?.company || this.company;
        this.type = data?.type || 'normal';
        this.exportMode = !!data?.exportMode;
        this.exportType = data?.exportType || "";

    }

    async ngOnInit() {
        const companies = await this.companyService.getByIds([this.invoice?.company.id || ""]);
        if (companies.length > 0) {
            this.company=companies[0];
            this.hideInvoiceFields = this.company.hidePrintInvoiceFields || [];
            this.hideItemFields = this.company.hidePrintItemFields || [];
        }
        else{
             this.hideInvoiceFields = [];
            this.hideItemFields = [];
        }
        if (this.exportType === 'pdf') {
            setTimeout(() => this.exportAsPDF(), 0);
        }
        if (this.exportType === 'image') {
            setTimeout(() => this.exportAsImage(), 0);
        }
        if (this.exportType === 'share') {
            setTimeout(() => this.shareOnWhatsApp('pdf'), 0);
        }
    }
    shouldShow(field: string): boolean {
        return !this.hideInvoiceFields?.includes(field);
    }
    shouldShowItemColumn(field: string): boolean {
        return !this.hideItemFields?.includes(field);
    }

    print() {
        const printContents = document.getElementById('print-section')?.innerHTML;
        if (!printContents) return;
        const win = window.open('', '', 'width=800,height=600');
        if (!win) return;
        win.document.write(`
      <html>
        <head>
          <title>Print Invoice</title>
          <style>
            ${this.type === 'thermal' ? this.thermalPrintCSS() : this.normalPrintCSS()}
          </style>
        </head>
        <body onload="window.focus();window.print();setTimeout(()=>window.close(), 100)">
          <div>${printContents}</div>
        </body>
      </html>
    `);
        win.document.close();
    }

    async exportAsPDF() {
        const element = this.printSection.nativeElement;
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#fff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: this.type === 'thermal' ? [80, canvas.height * 80 / canvas.width] : 'a4'
        });
        const width = this.type === 'thermal' ? 80 : 190;
        const height = (canvas.height * width) / canvas.width;
        pdf.addImage(imgData, 'PNG', 10, 10, width, height);
        pdf.save(`invoice-${this.invoice.billNo || this.invoice.id}.pdf`);
    }

    async exportAsImage() {
        const element = this.printSection.nativeElement;
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#fff' });
        canvas.toBlob(blob => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice-${this.invoice.billNo || this.invoice.id}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        }, 'image/jpeg', 1);
    }

    shareOnWhatsApp(as: 'pdf' | 'image' = 'pdf') {
        alert(
            `To share this invoice on WhatsApp:\n
1. Export as ${as === 'pdf' ? 'PDF' : 'Image'} using the button below.
2. Open WhatsApp Web or App.
3. Attach the saved file from your device to a chat.`
        );
        const url = window.location.origin + `/invoice/${this.invoice.id}`;
        window.open(`https://wa.me/?text=See your invoice: ${encodeURIComponent(url)}`);
    }

    // Inline print CSS for iframe approach
    normalPrintCSS() {
        return `
      body { margin:0; padding:0; background:#fff; color:#222; font-family:'Segoe UI',Arial,sans-serif;}
      .normal-print, .invoice-print { background:#fff; color:#222; padding:1.2rem; max-width:800px; margin:0 auto; border:1px solid #eee;}
      .company-header { display:flex; align-items:center; margin-bottom:1rem; }
      .company-logo { max-width:80px; max-height:80px; margin-right:1rem; }
      .company-details h2 { margin:0 0 0.3rem 0; font-size:1.3rem; color:#7c43bd;}
      .bill-details { display:flex; justify-content:space-between; font-size:1.1em; margin-bottom:0.8rem;}
      .customer-details { font-size:1em; margin-bottom:0.8rem; border-bottom:1px solid #f1eaff; padding-bottom:0.4rem;}
      .customer-details span { display:inline-block; margin-right:1.2rem;}
      .item-table { width:100%; border-collapse:collapse; margin-bottom:0.5rem;}
      .item-table th, .item-table td { padding:0.3rem 0.5rem; border:1px solid #eee; font-size:0.98em;}
      .item-table th { background:#f9f8ff; font-weight:600;}
      .amount-details { font-size:1.09em; margin-bottom:0.4rem;}
      .remarks { font-size:0.96em; color:#6d3b7d; margin-top:0.5rem; padding-top:0.3rem; border-top:1px dashed #e1baff;}
      .payment-table { width:100%; border-collapse:collapse; margin-top:0.7rem;}
      .payment-table th, .payment-table td { padding:0.21rem 0.4rem; border:1px solid #eee; font-size:0.97em;}
      .payment-table th { background:#f1f7fa; font-weight:600;}
    `;
    }
    thermalPrintCSS() {
        return `
      body { margin:0; padding:0; background:#fff; color:#222; font-family:'Segoe UI',Arial,sans-serif;}
      .thermal-print, .invoice-print { background:#fff; color:#222; padding:0.5rem; max-width:290px; margin:0 auto; border:1px solid #eee;}
      .company-header { display:flex; align-items:center; margin-bottom:0.7rem; }
      .company-logo { max-width:48px; max-height:48px; margin-right:0.5rem; }
      .company-details h2 { margin:0 0 0.2rem 0; font-size:1.07rem; color:#7c43bd;}
      .bill-details { display:flex; justify-content:space-between; font-size:0.97em; margin-bottom:0.5rem;}
      .customer-details { font-size:0.96em; margin-bottom:0.6rem; border-bottom:1px solid #f1eaff; padding-bottom:0.2rem;}
      .customer-details span { display:inline-block; margin-right:1rem;}
      .item-table { width:100%; border-collapse:collapse; margin-bottom:0.3rem;}
      .item-table th, .item-table td { padding:0.23rem 0.3rem; border:1px solid #eee; font-size:0.92em;}
      .item-table th { background:#f9f8ff; font-weight:600;}
      .amount-details { font-size:0.97em; margin-bottom:0.2rem;}
      .remarks { font-size:0.92em; color:#6d3b7d; margin-top:0.3rem; padding-top:0.2rem; border-top:1px dashed #e1baff;}
      .payment-table { width:100%; border-collapse:collapse; margin-top:0.5rem;}
      .payment-table th, .payment-table td { padding:0.16rem 0.3rem; border:1px solid #eee; font-size:0.89em;}
      .payment-table th { background:#f1f7fa; font-weight:600;}
    `;
    }

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

    exportToWhatsApp() {
        const text = `Invoice for ${this.invoice?.customer.name}, Grand Total: ₹${this.invoice?.grandTotal}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
}