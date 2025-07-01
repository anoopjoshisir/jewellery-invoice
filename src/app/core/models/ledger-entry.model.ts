export interface LedgerEntry {
  id: string;
  customerId: string;
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  invoiceId?: string;
  noteId?: string;
}