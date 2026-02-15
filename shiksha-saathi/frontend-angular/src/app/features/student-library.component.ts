import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../core/api.service';
import { UiService } from '../core/ui.service';

type BookItem = {
  id: string;
  board: string;
  grade: number;
  subject: string;
  title: string;
  language: string;
  pdf_url: string;
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <h2>{{ ui.t('libraryTitle') }}</h2>
      <p class="small">{{ ui.t('studentLibraryDesc') }}</p>
      <div class="filters">
        <label>
          {{ ui.t('chooseClass') }}
          <select [(ngModel)]="grade" (ngModelChange)="loadBooks()">
            <option *ngFor="let g of grades" [value]="g">{{ ui.t('classLabel') }} {{ g }}</option>
          </select>
        </label>
        <label>
          {{ ui.t('chooseSubject') }}
          <select [(ngModel)]="subject" (ngModelChange)="loadBooks()">
            <option value="">{{ ui.t('allSubjects') }}</option>
            <option value="hindi">{{ ui.t('hindi') }}</option>
            <option value="english">{{ ui.t('english') }}</option>
            <option value="math">{{ ui.t('math') }}</option>
            <option value="science">{{ ui.t('science') }}</option>
            <option value="social-science">{{ ui.t('socialScience') }}</option>
          </select>
        </label>
      </div>
    </section>

    <section class="grid">
      <article class="card">
        <h3>{{ ui.t('availableBooks') }}</h3>
        <div class="small" *ngIf="!books.length">{{ ui.t('noBooks') }}</div>
        <div class="list">
          <div *ngFor="let book of books" [class.active]="activeBook?.id === book.id">
            <strong>{{ book.title }}</strong>
            <div class="small">{{ ui.t('classLabel') }} {{ book.grade }} | {{ book.subject }}</div>
            <button class="ghost" (click)="openBook(book)">{{ ui.t('openPdf') }}</button>
          </div>
        </div>
      </article>

      <article class="card viewer">
        <h3>{{ activeBook?.title || ui.t('openPdf') }}</h3>
        <iframe *ngIf="activeBook" [src]="activeBookUrl()"></iframe>
        <div class="actions">
          <a *ngIf="activeBook" [href]="activeBook.pdf_url" target="_blank" rel="noreferrer">
            <button class="ghost">{{ ui.t('openPdf') }} (New Tab)</button>
          </a>
        </div>
        <p class="small">{{ ui.t('notePdf') }}</p>
      </article>
    </section>

    <section class="card">
      <h3>{{ ui.t('askAi') }}</h3>
      <textarea [(ngModel)]="question" [placeholder]="ui.t('askPlaceholder')"></textarea>
      <div class="actions">
        <button (click)="askQuestion()">{{ ui.t('getAnswer') }}</button>
      </div>
      <div class="small" *ngIf="message">{{ message }}</div>
      <div class="small" *ngIf="answerMeta">{{ answerMeta }}</div>
      <pre *ngIf="answer">{{ answer }}</pre>
    </section>
  `,
  styles: [
    `
      .filters {
        margin-top: 0.8rem;
        display: grid;
        gap: 0.8rem;
        grid-template-columns: 1fr 1fr;
      }

      .filters label {
        font-size: 0.9rem;
        color: var(--muted);
      }

      .grid {
        margin-top: 0.9rem;
        display: grid;
        gap: 0.8rem;
        grid-template-columns: 1fr 1.4fr;
      }

      .list > div.active {
        border-color: color-mix(in srgb, var(--primary) 55%, var(--line));
      }

      .viewer iframe {
        width: 100%;
        min-height: 520px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: var(--panel-soft);
      }

      section.card {
        margin-top: 0.9rem;
      }

      .actions {
        margin-top: 0.6rem;
      }

      pre {
        margin-top: 0.8rem;
        white-space: pre-wrap;
        background: var(--panel-soft);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 0.8rem;
      }

      @media (max-width: 980px) {
        .filters,
        .grid {
          grid-template-columns: 1fr;
        }

        .viewer iframe {
          min-height: 360px;
        }
      }
    `
  ]
})
export class StudentLibraryComponent implements OnInit {
  grades = Array.from({ length: 12 }, (_v, i) => i + 1);
  grade = 4;
  subject = '';

  books: BookItem[] = [];
  activeBook: BookItem | null = null;
  question = '';
  answer = '';
  answerMeta = '';
  message = '';

  constructor(
    private readonly api: ApiService,
    private readonly sanitizer: DomSanitizer,
    public readonly ui: UiService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadBooks();
  }

  async loadBooks(): Promise<void> {
    const query = new URLSearchParams({ grade: String(this.grade), board: 'bihar-board' });
    if (this.subject) query.set('subject', this.subject);
    const data: any = await this.api.get(`/student/books?${query.toString()}`);
    this.books = data.books;
    this.activeBook = this.books[0] || null;
    this.answer = '';
    this.answerMeta = '';
    this.message = '';
  }

  openBook(book: BookItem): void {
    this.activeBook = book;
  }

  activeBookUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.activeBook?.pdf_url || '');
  }

  async askQuestion(): Promise<void> {
    this.answer = '';
    this.message = '';

    if (!this.activeBook) {
      this.message = this.ui.t('selectBookFirst');
      return;
    }

    if (!this.question.trim()) {
      this.message = this.ui.t('questionRequired');
      return;
    }

    try {
      const data: any = await this.api.post('/student/ask', {
        question: this.question,
        bookId: this.activeBook.id,
        language: this.ui.language
      });
      this.answer = data.answer;
      this.answerMeta = [data.provider, data.model].filter(Boolean).join(' | ');
    } catch (error: any) {
      this.message = error?.message || this.ui.t('aiUnavailable');
    }
  }
}
