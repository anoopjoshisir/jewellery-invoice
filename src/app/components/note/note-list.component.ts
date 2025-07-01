import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteService } from '../../core/services/note.service';
import { Note } from '../../core/models/note.model';
import { SpeechToTextService } from '../../core/services/speech-to-text.service';
import { MainLayoutComponent } from '../main-layout/main-layout.component';

@Component({
  selector: 'app-note-list',
  standalone: true,
  imports: [CommonModule, FormsModule,MainLayoutComponent],
  templateUrl: './note-list.component.html'
})
export class NoteListComponent implements OnInit {
  notes: Note[] = [];
  newNote: Note = { id: '', text: '', type: 'info', createdAt: new Date().toISOString() };
  listening = false;

  constructor(
    private noteService: NoteService,
    public speech: SpeechToTextService
  ) {}

  ngOnInit() {
    this.loadNotes();
    this.speech.transcript$.subscribe(text => {
      if (this.listening && text) {
        this.newNote.text = text;
        this.listening = false;
        this.speech.stop();
      }
    });
  }

  loadNotes() {
    this.noteService.getAll().then(snapshot => {
      this.notes = [];
      snapshot.forEach(doc => {
        this.notes.push({ id: doc.id, ...doc.data() } as Note);
      });
    });
  }

  addNote() {
    if (!this.newNote.text) return;
    this.noteService.add(this.newNote).then(() => {
      this.newNote = { id: '', text: '', type: 'info', createdAt: new Date().toISOString() };
      this.loadNotes();
    });
  }

  deleteNote(id: string) {
    this.noteService.delete(id).then(() => this.loadNotes());
  }

  startListening() {
    this.listening = true;
    this.speech.start();
  }
}