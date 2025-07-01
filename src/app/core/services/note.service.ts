import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Note } from '../models/note.model';

@Injectable({ providedIn: 'root' })
export class NoteService {
  constructor(private fb: FirebaseService) {}

  getAll() {
    return getDocs(collection(this.fb.db, 'notes'));
  }

  add(note: Note) {
    return addDoc(collection(this.fb.db, 'notes'), note);
  }

  update(id: string, note: Partial<Note>) {
    return updateDoc(doc(this.fb.db, 'notes', id), note);
  }

  delete(id: string) {
    return deleteDoc(doc(this.fb.db, 'notes', id));
  }
}