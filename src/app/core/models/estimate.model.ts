import { Customer } from './customer.model';
import { Company } from './company.model';

export interface EstimateItem {
  name: string;
  purity?: string;
  qty: number;
  rate: number;
  makingCharges: number;
}

export interface Estimate {
  id?: string;
  estimateNo: string;
  customer: Customer;
  company: Company;
  estimateDate: string;
  validUntil: string;
  items: EstimateItem[];
  makingCharges: number;
  makingDiscount: number;
  discountType: string;
  discountValue: number;
  total: number;
  discountOnGoldWeight: number;
  totalDiscount: number;
  grandTotal: number;
  status: 'pending' | 'accepted' | 'rejected' | 'converted';
  convertedToInvoiceId?: string;
  convertedDate?: string;
  remarks: string;
  entryDate: string;
  enteredBy: string;
  enteredByName: string;
  enteredByIp: string;
}
