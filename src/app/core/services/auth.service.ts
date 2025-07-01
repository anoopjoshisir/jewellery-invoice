import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, sendPasswordResetEmail, User as FirebaseUser } from '@angular/fire/auth';
import { UserService } from './user.service';
import { User } from '../models/user.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user$ = new BehaviorSubject<User | null>(null);

  constructor(private auth: Auth, private userService: UserService) {}

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

  async login(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    return this.handleUserAfterAuth(cred.user);
  }

  async googleSignIn(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(this.auth, provider);
    return this.handleUserAfterAuth(cred.user);
  }

  async register(email: string, password: string, name: string) {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    // Save the user in Firestore
    const userObj: User = {
      uid: cred.user.uid,
      email: cred.user.email!,
      name: name,
      displayName: cred.user.displayName || name,
      companies: [],
      isAdmin: false
    };
    await this.userService.setUser(userObj);
    this.user$.next(userObj);
    return userObj;
  }

  async sendPasswordReset(email: string) {
    await sendPasswordResetEmail(this.auth, email);
  }

  async logout() {
    await this.auth.signOut();
    this.user$.next(null);
  }

  // Helper to always fetch user from Firestore after auth
  private async handleUserAfterAuth(fUser: FirebaseUser): Promise<User> {
    let user = await this.userService.getById(fUser.uid);
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
    this.user$.next(user);
    return user;
  }
}