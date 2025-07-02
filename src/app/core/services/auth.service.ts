import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, sendPasswordResetEmail, User as FirebaseUser, setPersistence, browserLocalPersistence, browserSessionPersistence, onAuthStateChanged } from '@angular/fire/auth';
import { UserService } from './user.service';
import { User } from '../models/user.model';
import { BehaviorSubject } from 'rxjs';
import * as CryptoJS from 'crypto-js';

const STORAGE_KEY = 'jewelry_user_data';
const SECRET = 'JewelleryInvoiceSuperSecret';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user$ = new BehaviorSubject<User | null>(null);

  constructor(private auth: Auth, private userService: UserService) {
    // On service init, restore user if possible
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Try to restore from encrypted local storage
        let user = this.getStoredUser(firebaseUser.uid);
        if (!user) {
          // Fallback to Firestore if cache miss (first login or cache cleared)
          user = await this.handleUserAfterAuth(firebaseUser);
        }
        this.user$.next(user);
      } else {
        this.user$.next(null);
        this.clearStoredUser();
      }
    });
  }

  get currentUser() {
    return this.user$.getValue();
  }

  async getIp(): Promise<string> {
    try {
      const resp = await fetch('https://api.ipify.org?format=json');
      const data = await resp.json();
      return data.ip || '';
    } catch {
      return '';
    }
  }

  async login(email: string, password: string, rememberMe: boolean = true): Promise<User> {
    await setPersistence(
      this.auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    return this.handleUserAfterAuth(cred.user);
  }

  async googleSignIn(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(this.auth, provider);
    return this.handleUserAfterAuth(cred.user);
  }

  // Register a new user
  async register(email: string, password: string, name: string) {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    const userObj: User = {
      uid: cred.user.uid,
      email: cred.user.email!,
      name: name,
      displayName: cred.user.displayName || name,
      companies: [],
      isAdmin: false
    };
    await this.userService.setUser(userObj);
    this.saveUser(userObj);
    this.user$.next(userObj);
    return userObj;
  }

  async sendPasswordReset(email: string) {
    await sendPasswordResetEmail(this.auth, email);
  }

  async logout() {
    await this.auth.signOut();
    this.user$.next(null);
    this.clearStoredUser();
  }

  // Core: handles user lookup and caching after Firebase login
  private async handleUserAfterAuth(fUser: FirebaseUser): Promise<User> {
    let user = this.getStoredUser(fUser.uid);
    if (user) {
      this.user$.next(user);
      return user;
    }
    user = await this.userService.getById(fUser.uid);
    if (!user) {
      user = {
        uid: fUser.uid,
        email: fUser.email!,
        displayName: fUser.displayName || "",
        companies: [],
        isAdmin: false
      };
      await this.userService.setUser(user);
    }
    this.saveUser(user);
    this.user$.next(user);
    return user;
  }

  // --- Local storage encrypted cache ---
  private saveUser(user: User) {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(user), SECRET).toString();
    localStorage.setItem(`${STORAGE_KEY}_${user.uid}`, encrypted);
  }

  private getStoredUser(uid?: string): User | null {
    if (!uid) return null;
    const encrypted = localStorage.getItem(`${STORAGE_KEY}_${uid}`);
    if (!encrypted) return null;
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, SECRET);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  private clearStoredUser() {
    // Remove all keys matching our storage pattern
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_KEY))
      .forEach(key => localStorage.removeItem(key));
  }
}