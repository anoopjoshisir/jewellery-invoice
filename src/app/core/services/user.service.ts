import { Injectable } from '@angular/core';
import { collection, doc, setDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private fb: FirebaseService) {}

  async getAll(): Promise<User[]> {
    const snap = await getDocs(collection(this.fb.db, 'users'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as User));
  }

  async getById(id: string): Promise<User | null> {
    const d = await getDoc(doc(this.fb.db, 'users', id));
    return d.exists() ? ({ id: d.id, ...d.data() } as any as User) : null;
  }

  async add(user: User) {
    const ref = doc(collection(this.fb.db, 'users'));
    return setDoc(ref, user);
  }

  async update(id: string, user: Partial<User>) {
    return updateDoc(doc(this.fb.db, 'users', id), user);
  }

  async delete(id: string) {
    return deleteDoc(doc(this.fb.db, 'users', id));
  }

  // Get users associated with a company
  async getByCompanyId(companyId: string): Promise<User[]> {
    const q = query(collection(this.fb.db, 'users'), where('companies', 'array-contains', companyId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as User));
  }
 
  // Create/update user
  async setUser(user: User) {
    const docRef = doc(this.fb.db, 'users', user.uid);
    await setDoc(docRef, user, { merge: true });
  }
}