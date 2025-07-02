export interface Company {
  id?: string;
  name: string;
  slogan?:string;
  address: string;
  mobile: string;
  gstin: string;
  email: string;
  logoUrl?: string;
  // Field visibility settings:
  hideItemFields?: string[];       // e.g. ["purity"]
  hideInvoiceFields?: string[];    // e.g. ["discountOnGoldWeight"]
  hidePrintItemFields?: string[];
  hidePrintInvoiceFields?: string[];
}