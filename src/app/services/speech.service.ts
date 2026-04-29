import { Injectable, signal, NgZone, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface SpeechRecognitionEvent {
  results: Record<number, Record<number, { transcript: string }>>;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onend: () => void;
  onerror: (event: { error: string }) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  start: () => void;
  stop: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private recognition: SpeechRecognitionInstance | null = null;
  isListening = signal<boolean>(false);
  lastTranscription = signal<string>('');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const win = window as unknown as { SpeechRecognition: unknown; webkitSpeechRecognition: unknown };
      const SpeechRecognition = (win.SpeechRecognition || win.webkitSpeechRecognition) as new () => SpeechRecognitionInstance;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'th-TH';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;

        this.recognition.onstart = () => {
          this.ngZone.run(() => this.isListening.set(true));
        };

        this.recognition.onend = () => {
          this.ngZone.run(() => this.isListening.set(false));
        };

        this.recognition.onerror = (event: { error: string }) => {
          console.error('Speech recognition error:', event.error);
          this.ngZone.run(() => this.isListening.set(false));
        };
      }
    }
  }

  isSupported(): boolean {
    return isPlatformBrowser(this.platformId) && !!this.recognition;
  }

  startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject('Speech recognition not supported');
        return;
      }

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        this.ngZone.run(() => {
          this.lastTranscription.set(transcript);
          resolve(transcript);
        });
      };

      this.recognition.start();
    });
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}
