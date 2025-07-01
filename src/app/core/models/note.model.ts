export interface Note {
  id: string;
  text: string;
  customerId?: string;
  invoiceId?: string;
  type: 'credit' | 'debit' | 'info';
  createdAt: string;
}