import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { UiService } from '../core/ui.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="auth-wrap">
      <div class="auth-card card">
        <div class="top-controls">
          <div class="lang-group">
            <label>{{ ui.t('language') }}</label>
            <select [ngModel]="ui.language" (ngModelChange)="ui.setLanguage($event)">
              <option value="en">{{ ui.t('english') }}</option>
              <option value="hi">{{ ui.t('hindi') }}</option>
            </select>
          </div>
          <div class="lang-group">
            <label>{{ ui.t('theme') }}</label>
            <select [ngModel]="ui.theme" (ngModelChange)="ui.setTheme($event)">
              <option value="light">{{ ui.t('light') }}</option>
              <option value="dark">{{ ui.t('dark') }}</option>
            </select>
          </div>
        </div>

        <p class="pill">{{ ui.t('voiceFirst') }}</p>
        <h1>{{ ui.t('appName') }}</h1>
        <p class="small">{{ ui.t('loginSubtitle') }}</p>

        <label>{{ ui.t('loginAs') }}</label>
        <select [(ngModel)]="loginRole">
          <option value="teacher">{{ ui.t('teacherAdmin') }}</option>
          <option value="student">{{ ui.t('student') }}</option>
        </select>

        <label>{{ ui.t('usernameOrEmail') }}</label>
        <input [(ngModel)]="email" placeholder="teacher@shiksha.local" />

        <label>{{ ui.t('password') }}</label>
        <input [(ngModel)]="password" type="password" placeholder="teacher123" />

        <button (click)="onLogin()" [disabled]="loading">{{ loading ? ui.t('signingIn') : ui.t('login') }}</button>
        <div class="small">{{ state }}</div>
        <div class="small" *ngIf="loginRole === 'student'">{{ ui.t('studentHint') }}</div>
      </div>
    </section>
  `,
  styles: [
    `
      .auth-wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1rem;
      }

      .auth-card {
        width: min(520px, 96vw);
        display: grid;
        gap: 0.65rem;
      }

      .top-controls {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.55rem;
      }

      .lang-group {
        display: grid;
        gap: 0.25rem;
      }

      .pill {
        width: fit-content;
        margin: 0;
        background: color-mix(in srgb, var(--primary) 14%, white);
        color: color-mix(in srgb, var(--primary) 74%, black);
        border-radius: 999px;
        padding: 0.25rem 0.6rem;
        font-size: 0.8rem;
      }

      :host-context([data-theme='dark']) .pill {
        background: color-mix(in srgb, var(--primary) 32%, #111b30);
        color: #dbe3ff;
      }

      h1 {
        margin-bottom: 0.2rem;
      }

      label {
        font-size: 0.88rem;
        color: var(--muted);
      }

      @media (max-width: 640px) {
        .top-controls {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class LoginComponent {
  email = 'teacher@shiksha.local';
  password = 'teacher123';
  loginRole: 'student' | 'teacher' = 'teacher';
  loading = false;
  private stateKey = 'useSeeded';

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    public readonly ui: UiService
  ) {}

  get state(): string {
    return this.ui.t(this.stateKey);
  }

  async onLogin(): Promise<void> {
    if (!this.email || !this.password) {
      this.stateKey = 'credsRequired';
      return;
    }

    this.loading = true;
    this.stateKey = 'checkingCreds';

    try {
      await this.auth.login(this.email.trim(), this.password, this.loginRole);
      this.router.navigateByUrl('/dashboard');
    } catch {
      this.stateKey = 'loginFailed';
    } finally {
      this.loading = false;
    }
  }
}
