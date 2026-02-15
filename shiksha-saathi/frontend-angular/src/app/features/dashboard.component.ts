import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { UiService } from '../core/ui.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="card">
      <h2>{{ ui.t('dashboard') }}</h2>
      <p class="small">{{ auth.user?.role === 'student' ? ui.t('studentWelcome') : ui.t('roleOverview') }}</p>
    </section>

    <section class="grid shared-grid">
      <article class="card">
        <h3>{{ ui.t('sharedOverview') }}</h3>
        <div class="small">{{ ui.t('role') }}: {{ auth.user?.role }}</div>
        <div class="small" *ngIf="auth.user?.grade">{{ ui.t('grade') }}: {{ auth.user?.grade }}</div>
        <div class="small">{{ ui.t('language') }}: {{ ui.language }}</div>
      </article>

      <article class="card">
        <h3>{{ ui.t('quickActions') }}</h3>
        <div class="actions">
          <a routerLink="/dashboard"><button class="ghost">{{ ui.t('dashboard') }}</button></a>
          <a *ngIf="auth.user?.role === 'student'" routerLink="/student-library"
            ><button>{{ ui.t('openLibrary') }}</button></a
          >
          <a *ngIf="auth.user?.role !== 'student'" routerLink="/student-test"
            ><button>{{ ui.t('openStudentTest') }}</button></a
          >
          <a *ngIf="auth.user?.role === 'teacher'" routerLink="/teacher-dashboard"
            ><button class="secondary">{{ ui.t('teacherDashboard') }}</button></a
          >
          <a *ngIf="auth.user?.role === 'admin'" routerLink="/admin-dashboard"
            ><button class="secondary">{{ ui.t('adminDashboard') }}</button></a
          >
        </div>
      </article>
    </section>

    <section class="card" *ngIf="auth.user?.role !== 'student'">
      <div class="stats">
        <div>
          <span>{{ ui.t('students') }}</span>
          <strong>{{ overview.totalStudents }}</strong>
        </div>
        <div>
          <span>{{ ui.t('attempts') }}</span>
          <strong>{{ overview.totalAttempts }}</strong>
        </div>
        <div>
          <span>{{ ui.t('voiceShare') }}</span>
          <strong>{{ (overview.voiceShare * 100) | number: '1.0-0' }}%</strong>
        </div>
        <div>
          <span>{{ ui.t('offlineShare') }}</span>
          <strong>{{ (overview.offlineShare * 100) | number: '1.0-0' }}%</strong>
        </div>
      </div>
    </section>

    <section class="card" *ngIf="auth.user?.role === 'student'">
      <div class="stats">
        <div>
          <span>{{ ui.t('attempts') }}</span>
          <strong>{{ studentAttempts }}</strong>
        </div>
        <div>
          <span>{{ ui.t('highRiskGaps') }}</span>
          <strong>{{ highRiskGaps }}</strong>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .shared-grid {
        margin-top: 1rem;
      }

      .actions {
        margin-top: 0.6rem;
        display: grid;
        gap: 0.5rem;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }

      .stats {
        margin-top: 0.85rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 0.6rem;
      }

      .stats div {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: var(--panel-soft);
        padding: 0.7rem;
        display: grid;
      }

      .stats span {
        color: var(--muted);
        font-size: 0.8rem;
      }

      .stats strong {
        font-size: 1.2rem;
        margin-top: 0.2rem;
      }

      .grid {
        margin-top: 1rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 0.8rem;
      }

      h3 {
        margin-bottom: 0.4rem;
      }
    `
  ]
})
export class DashboardComponent implements OnInit {
  overview = {
    totalStudents: 0,
    totalAttempts: 0,
    voiceShare: 0,
    offlineShare: 0
  };

  studentAttempts = 0;
  highRiskGaps = 0;

  constructor(
    public readonly auth: AuthService,
    public readonly ui: UiService,
    private readonly api: ApiService
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.auth.user?.role !== 'student') {
      this.overview = await this.api.get('/analytics/overview');
      return;
    }

    if (this.auth.user?.id) {
      const data: any = await this.api.get(`/students/${this.auth.user.id}/gaps`);
      this.studentAttempts = data?.report?.totalAttempts || 0;
      this.highRiskGaps = (data?.report?.gaps || []).filter((gap: any) => gap.risk === 'high').length;
    }
  }
}
