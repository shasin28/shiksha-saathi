import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/auth.service';
import { AppLanguage, AppTheme, UiService } from './core/ui.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterOutlet],
  template: `
    <div *ngIf="showShell(); else contentOnly" class="shell">
      <aside class="sidebar">
        <div>
          <div class="brand">{{ ui.t('appName') }}</div>
          <div class="small">{{ auth.user?.name }} ({{ auth.user?.role }})</div>
        </div>
        <nav class="nav">
          <a
            *ngFor="let item of navItems()"
            [routerLink]="item.path"
            [class.active]="routePath === item.path"
          >
            {{ item.label }}
          </a>
        </nav>

        <div class="prefs">
          <label>{{ ui.t('language') }}</label>
          <select [ngModel]="ui.language" (ngModelChange)="changeLanguage($event)">
            <option value="en">{{ ui.t('english') }}</option>
            <option value="hi">{{ ui.t('hindi') }}</option>
          </select>
          <label>{{ ui.t('theme') }}</label>
          <select [ngModel]="ui.theme" (ngModelChange)="changeTheme($event)">
            <option value="light">{{ ui.t('light') }}</option>
            <option value="dark">{{ ui.t('dark') }}</option>
          </select>
        </div>

        <button class="ghost" (click)="logout()">{{ ui.t('logout') }}</button>
      </aside>
      <main class="main">
        <router-outlet></router-outlet>
      </main>
    </div>

    <ng-template #contentOnly>
      <router-outlet></router-outlet>
    </ng-template>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 260px 1fr;
        gap: 1.1rem;
        padding: 1rem;
        animation: rise 280ms ease;
      }

      .sidebar {
        background: var(--sidebar-bg);
        color: var(--sidebar-text);
        border-radius: 20px;
        padding: 1rem;
        display: grid;
        gap: 1rem;
        align-content: start;
      }

      .brand {
        font-family: 'Sora', sans-serif;
        font-size: 1.1rem;
        font-weight: 700;
      }

      .nav {
        display: grid;
        gap: 0.45rem;
      }

      .nav a {
        display: block;
        padding: 0.55rem 0.65rem;
        border-radius: 10px;
        color: var(--sidebar-muted);
      }

      .nav a.active {
        background: var(--sidebar-active-bg);
        color: var(--sidebar-active-text);
      }

      .prefs {
        display: grid;
        gap: 0.3rem;
      }

      .prefs label {
        font-size: 0.8rem;
        color: var(--sidebar-muted);
      }

      .prefs select {
        background: var(--sidebar-field-bg);
        color: var(--sidebar-text);
        border-color: var(--sidebar-field-border);
      }

      .sidebar button.ghost {
        background: var(--sidebar-ghost-bg);
        color: var(--sidebar-text);
      }

      .main {
        display: grid;
        align-content: start;
        gap: 1rem;
      }

      @media (max-width: 960px) {
        .shell {
          grid-template-columns: 1fr;
        }

        .sidebar {
          gap: 0.8rem;
        }

        .nav {
          grid-template-columns: 1fr 1fr;
        }
      }

      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `
  ]
})
export class AppComponent implements OnInit {
  routePath = '/dashboard';

  constructor(
    public readonly auth: AuthService,
    public readonly ui: UiService,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.auth.hydrateUser();
    this.routePath = this.router.url;

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.routePath = event.urlAfterRedirects;
      });
  }

  showShell(): boolean {
    return this.auth.isAuthenticated() && this.routePath !== '/login';
  }

  navItems(): Array<{ path: string; label: string }> {
    const userRole = this.auth.user?.role;
    const items = [{ path: '/dashboard', label: this.ui.t('dashboard') }];

    if (userRole === 'student') {
      items.push({ path: '/student-library', label: this.ui.t('studentLibrary') });
      return items;
    }

    items.push({ path: '/student-test', label: this.ui.t('studentTest') });

    if (userRole === 'teacher') {
      items.push({ path: '/teacher-dashboard', label: this.ui.t('teacherDashboard') });
    }

    if (userRole === 'admin') {
      items.push({ path: '/teacher-dashboard', label: this.ui.t('teacherDashboard') });
      items.push({ path: '/admin-dashboard', label: this.ui.t('adminDashboard') });
    }

    return items;
  }

  changeLanguage(language: AppLanguage): void {
    this.ui.setLanguage(language);
  }

  changeTheme(theme: AppTheme): void {
    this.ui.setTheme(theme);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
