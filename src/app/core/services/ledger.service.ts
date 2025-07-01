import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { LedgerEntry } from '../models/ledger-entry.model';

@Injectable({ providedIn: 'root' })
export class LedgerService {
  constructor(private fb: FirebaseService) {}

  getAll() {
    return getDocs(collection(this.fb.db, 'ledger'));
  }

  add(entry: LedgerEntry) {
    return addDoc(collection(this.fb.db, 'ledger'), entry);
  }

  update(id: string, entry: Partial<LedgerEntry>) {
    return updateDoc(doc(this.fb.db, 'ledger', id), entry);
  }

  delete(id: string) {
    return deleteDoc(doc(this.fb.db, 'ledger', id));
  }
}