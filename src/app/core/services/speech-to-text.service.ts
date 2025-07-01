import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SpeechToTextService {
  private recognition: any;
  private listening = false;
  transcript$ = new BehaviorSubject<string>('');

  constructor(private ngZone: NgZone) {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'en-US';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.ngZone.run(() => this.transcript$.next(transcript));
      };

      this.recognition.onerror = () => this.stop();
      this.recognition.onend = () => this.stop();
    }
  }

  start() {
    if (this.recognition && !this.listening) {
      this.listening = true;
      this.recognition.start();
    }
  }

  stop() {
    if (this.recognition && this.listening) {
      this.listening = false;
      this.recognition.stop();
    }
  }
}