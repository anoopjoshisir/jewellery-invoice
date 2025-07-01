import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  app: FirebaseApp = initializeApp(environment.firebaseConfig);
  auth: Auth = getAuth(this.app);
  db: Firestore = getFirestore(this.app);
  storage: FirebaseStorage = getStorage(this.app);
}