import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Student } from '../core/models';
import { UiService } from '../core/ui.service';

interface GapItem {
  concept: string;
  risk: string;
  accuracy: number | null;
  avgLatency: number;
  recommendation: string;
}

interface RemedialFeedback {
  provider: string;
  model: string;
  rating: number;
  mastery: string;
  guidance: string;
  prepPlan: string[];
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="grid">
      <article class="card">
        <h2>{{ ui.t('studentTest') }}</h2>
        <p class="small">{{ ui.t('asrLowConnectivity') }}</p>

        <div class="row">
          <select [(ngModel)]="studentId">
            <option *ngFor="let s of students" [value]="s.id">{{ s.name }} (G{{ s.grade }})</option>
          </select>
          <select [(ngModel)]="concept">
            <option value="division">{{ ui.t('division') }}</option>
            <option value="multiplication">{{ ui.t('multiplication') }}</option>
            <option value="fractions">{{ ui.t('fractions') }}</option>
            <option value="decimals">{{ ui.t('decimals') }}</option>
          </select>
        </div>

        <div class="row">
          <select [(ngModel)]="language">
            <option value="hi">{{ ui.t('hindi') }}</option>
            <option value="en">{{ ui.t('english') }}</option>
            <option value="mr">{{ ui.t('marathi') }}</option>
          </select>
          <input [(ngModel)]="latencyMs" type="number" min="1000" step="100" />
        </div>

        <div class="row">
          <button (click)="startRecording()">{{ ui.t('startRecording') }}</button>
          <button class="secondary" (click)="saveAttempt()">{{ ui.t('saveAsrAttempt') }}</button>
          <button class="ghost" (click)="syncQueue()">{{ ui.t('syncQueue') }}</button>
        </div>

        <textarea [(ngModel)]="transcript" [placeholder]="ui.t('transcriptPlaceholder')"></textarea>
        <div class="small">{{ state }}</div>

        <div class="list" *ngIf="remedial">
          <div>
            <strong>{{ ui.t('remedialFeedback') }}</strong>
            <div class="small">{{ ui.t('rating') }}: {{ remedial.rating }}/100</div>
            <div class="small">{{ ui.t('mastery') }}: {{ remedial.mastery }}</div>
            <div class="small">{{ ui.t('feedbackSource') }}: {{ remedial.provider }} | {{ remedial.model }}</div>
            <div class="small">{{ remedial.guidance }}</div>
            <div class="small" *ngFor="let step of remedial.prepPlan">- {{ step }}</div>
          </div>
        </div>
      </article>

      <article class="card">
        <h3>{{ ui.t('offlineQueue') }}</h3>
        <div class="small">{{ queue.length }} {{ ui.t('eventsPending') }}</div>
        <div class="list">
          <div *ngFor="let q of queue">{{ q.payload.studentId }} | {{ q.payload.concept }}</div>
        </div>
      </article>
    </section>

    <section class="card">
      <div class="title-row">
        <h3>{{ ui.t('studentGapReport') }}</h3>
        <button class="ghost" (click)="loadGaps()">{{ ui.t('loadGaps') }}</button>
      </div>
      <div class="list">
        <div *ngFor="let gap of gaps">
          <strong>{{ gap.concept }}</strong>
          <span class="badge" [ngClass]="gap.risk">{{ gap.risk }}</span>
          <div class="small">
            {{ ui.t('accuracy') }}: {{ gap.accuracy == null ? 'n/a' : (gap.accuracy * 100 | number: '1.0-0') + '%' }} |
            {{ ui.t('latency') }}: {{ gap.avgLatency | number: '1.0-0' }} ms
          </div>
          <div class="small">{{ gap.recommendation }}</div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .grid {
        display: grid;
        gap: 0.8rem;
        grid-template-columns: 2fr 1fr;
      }

      .row {
        display: grid;
        gap: 0.55rem;
        grid-template-columns: repeat(2, 1fr);
        margin-top: 0.55rem;
      }

      .row:last-of-type {
        grid-template-columns: repeat(3, 1fr);
      }

      .title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      section.card {
        margin-top: 0.9rem;
      }

      @media (max-width: 980px) {
        .grid {
          grid-template-columns: 1fr;
        }

        .row,
        .row:last-of-type {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class StudentTestComponent implements OnInit {
  private readonly queueKey = 'shiksha_offline_queue_spa';
  private readonly deviceId = 'device-rural-001';
  private recognition: any;

  students: Student[] = [];
  studentId = '';
  concept = 'division';
  language = 'hi';
  latencyMs = 9000;
  transcript = '';
  queue: any[] = [];
  gaps: GapItem[] = [];
  remedial: RemedialFeedback | null = null;

  private stateKey = 'readyToCapture';
  private rawState = '';

  constructor(private readonly api: ApiService, public readonly ui: UiService) {}

  get state(): string {
    return this.rawState || this.ui.t(this.stateKey);
  }

  async ngOnInit(): Promise<void> {
    this.students = await this.api.get<Student[]>('/students');
    this.studentId = this.students[0]?.id || '';
    this.queue = this.getQueue();
    this.initializeSpeech();
  }

  startRecording(): void {
    if (!this.recognition) {
      this.rawState = '';
      this.stateKey = 'srUnavailable';
      return;
    }

    this.recognition.lang = this.language === 'en' ? 'en-IN' : `${this.language}-IN`;
    this.recognition.start();
    this.rawState = '';
    this.stateKey = 'listening';
  }

  async saveAttempt(): Promise<void> {
    if (!this.transcript) {
      this.rawState = '';
      this.stateKey = 'transcriptRequired';
      return;
    }

    const payload = {
      studentId: this.studentId,
      concept: this.concept,
      language: this.language,
      latencyMs: Number(this.latencyMs),
      transcript: this.transcript,
      offline: !navigator.onLine
    };

    if (!navigator.onLine) {
      this.queue.push({ type: 'attempt.created.asr', payload });
      this.persistQueue();
      this.rawState = '';
      this.stateKey = 'savedOffline';
      return;
    }

    try {
      const response: any = await this.api.post('/asr/attempts', payload, false);
      this.stateKey = 'readyToCapture';
      this.rawState = response?.asr?.feedback || '';
      this.remedial = response?.remedial || null;
      await this.loadGaps();
    } catch (error: any) {
      this.rawState = error?.message || '';
      this.stateKey = 'asrError';
      this.remedial = null;
    }
  }

  async syncQueue(): Promise<void> {
    if (!this.queue.length) {
      return;
    }

    if (!navigator.onLine) {
      this.rawState = '';
      this.stateKey = 'offlinePostponed';
      return;
    }

    try {
      for (const event of this.queue) {
        await this.api.post('/asr/attempts', event.payload, false);
      }
      await this.api.post('/sync/events', { deviceId: this.deviceId, events: this.queue }, false);
      this.queue = [];
      this.persistQueue();
      this.rawState = '';
      this.stateKey = 'queueSynced';
      await this.loadGaps();
    } catch (error: any) {
      this.rawState = error?.message || '';
      this.stateKey = 'asrError';
    }
  }

  async loadGaps(): Promise<void> {
    if (!this.studentId) return;
    const data: any = await this.api.get(`/students/${this.studentId}/gaps`);
    this.gaps = data.report.gaps;
  }

  private getQueue(): any[] {
    return JSON.parse(localStorage.getItem(this.queueKey) || '[]');
  }

  private persistQueue(): void {
    localStorage.setItem(this.queueKey, JSON.stringify(this.queue));
  }

  private initializeSpeech(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      this.recognition = null;
      return;
    }

    this.recognition = new SR();
    this.recognition.interimResults = false;
    this.recognition.onresult = (event: any) => {
      this.transcript = event.results[0][0].transcript;
      this.rawState = '';
      this.stateKey = 'transcriptCaptured';
    };
    this.recognition.onerror = () => {
      this.rawState = '';
      this.stateKey = 'asrError';
    };
  }
}
