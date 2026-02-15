import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ClassItem, SectionItem } from '../core/models';
import { UiService } from '../core/ui.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <h2>{{ ui.t('teacherDashboard') }}</h2>
      <p class="small">{{ ui.t('analyzeMisconceptions') }}</p>

      <div class="controls">
        <select [(ngModel)]="classId" (ngModelChange)="onClassChange()">
          <option *ngFor="let c of classes" [value]="c.id">{{ c.name }}</option>
        </select>
        <select [(ngModel)]="sectionId">
          <option *ngFor="let s of sections" [value]="s.id">{{ ui.t('section') }} {{ s.name }}</option>
        </select>
        <select [(ngModel)]="worksheetLanguage">
          <option value="en">{{ ui.t('english') }}</option>
          <option value="hi">{{ ui.t('hindi') }}</option>
        </select>
      </div>

      <div class="controls actions">
        <button (click)="loadClassInsights()">{{ ui.t('analyzeClass') }}</button>
        <button class="secondary" (click)="loadSectionInsights()">{{ ui.t('analyzeSection') }}</button>
        <button class="ghost" (click)="generateWorksheet()">{{ ui.t('generateWorksheet') }}</button>
      </div>

      <div class="list">
        <div *ngFor="let m of misconceptions">
          <strong>{{ m.concept }}</strong>
          <span class="badge" [ngClass]="m.severity">{{ m.severity }}</span>
          <div class="small">
            {{ ui.t('errorRate') }}: {{ m.errorRate * 100 | number: '1.0-0' }}% | {{ ui.t('avgLatency') }}:
            {{ m.avgLatency | number: '1.0-0' }} ms | {{ ui.t('attempts') }}: {{ m.totalAttempts }}
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <h3>{{ ui.t('worksheet') }}</h3>
      <pre>{{ worksheet | json }}</pre>
    </section>
  `,
  styles: [
    `
      .controls {
        margin-top: 0.7rem;
        display: grid;
        gap: 0.55rem;
        grid-template-columns: repeat(3, 1fr);
      }

      .actions {
        grid-template-columns: repeat(3, minmax(120px, 1fr));
      }

      section.card {
        margin-top: 0.9rem;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        background: var(--panel-soft);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 0.8rem;
      }

      @media (max-width: 960px) {
        .controls,
        .actions {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class TeacherDashboardComponent implements OnInit {
  classes: ClassItem[] = [];
  sections: SectionItem[] = [];
  classId = '';
  sectionId = '';
  worksheetLanguage = 'en';

  misconceptions: any[] = [];
  worksheet: any = null;

  constructor(private readonly api: ApiService, public readonly ui: UiService) {}

  async ngOnInit(): Promise<void> {
    this.classes = await this.api.get<ClassItem[]>('/teacher/classes');
    this.classId = this.classes[0]?.id || '';
    await this.onClassChange();
  }

  async onClassChange(): Promise<void> {
    if (!this.classId) return;
    this.sections = await this.api.get<SectionItem[]>(`/teacher/classes/${this.classId}/sections`);
    this.sectionId = this.sections[0]?.id || '';
  }

  async loadClassInsights(): Promise<void> {
    if (!this.classId) return;
    const data: any = await this.api.get(`/teacher/classes/${this.classId}/misconceptions`);
    this.misconceptions = data.misconceptionMap;
  }

  async loadSectionInsights(): Promise<void> {
    if (!this.sectionId) return;
    const data: any = await this.api.get(`/teacher/sections/${this.sectionId}/misconceptions`);
    this.misconceptions = data.misconceptionMap;
  }

  async generateWorksheet(): Promise<void> {
    if (!this.classId) return;
    const data: any = await this.api.post(`/teacher/classes/${this.classId}/worksheet`, {
      language: this.worksheetLanguage
    });
    this.worksheet = data.worksheet;
  }
}
