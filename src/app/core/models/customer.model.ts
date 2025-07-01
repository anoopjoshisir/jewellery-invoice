export interface Customer {
  id?: string;
  name: string;
  address?: string;
  mobile?: string;
  email?: string;
  companyId?: string; // Always set on create
  balance: number;
  lastInvoiceAmount?: number;
  lastInvoiceDate?: string;
  lastPayment?: number;
  lastPaymentDate?: string;
  entryDate: string;
  enteredBy: string;
  enteredByName: string;
  enteredByIp: string;  
}