import { Injectable } from '@angular/core';
import { collection, addDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { LoginHistory } from '../models/login-history.model';

@Injectable({ providedIn: 'root' })
export class LoginHistoryService {
  constructor(private fb: FirebaseService) {}

  async recordLogin(userId: string, userName: string, ip: string) {
    await addDoc(collection(this.fb.db, 'loginHistory'), {
      userId,
      userName,
      loginTime: new Date().toISOString(),
      ip,
      userAgent: navigator.userAgent
    } as LoginHistory);
  }
}