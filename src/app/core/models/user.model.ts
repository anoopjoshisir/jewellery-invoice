export interface User {
  uid: string;
  name?: string;
  email: string;
  displayName?: string;
  companies?: string[]; // Allotted companies (IDs)
  isAdmin?: boolean;
}

