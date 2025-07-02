import { Customer } from './customer.model';
import { Company } from './company.model';
export interface InvoiceItem {
  name: string;
  purity?: string;
  qty: number;
  rate: number;
  makingCharges: number; // renamed from labourCharges
}

export interface Payment {
  date: string;
  amount: number;
  mode: string;
  note?: string;
}
export interface Invoice {
  id?: string;
  billNo: string;
  customer: Customer;
  company: Company;
  billDate: string;
  dueDate: string;
  items: InvoiceItem[];
  payments: Payment[];
  makingCharges: number;
  makingDiscount: number;
  discountType: string;
  discountValue: number;
  total: number;
  discountOnGoldWeight: number;
  totalDiscount: number;
  amountPaid: number;
  grandTotal: number;
  entryDate: string;
  enteredBy: string;
  enteredByName: string;
  enteredByIp: string;
  remarks:string;
}
