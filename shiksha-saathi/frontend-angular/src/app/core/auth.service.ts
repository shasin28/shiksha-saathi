import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { API_BASE } from './config';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'shiksha_token';
  private readonly userKey = 'shiksha_user';
  private readonly userSubject = new BehaviorSubject<User | null>(this.readUser());

  readonly user$ = this.userSubject.asObservable();

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get user(): User | null {
    return this.userSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  async login(email: string, password: string, roleHint: 'student' | 'teacher' = 'teacher'): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, roleHint })
    });

    if (!res.ok) {
      throw new Error('Login failed');
    }

    const data = await res.json();
    localStorage.setItem(this.tokenKey, data.token);
    localStorage.setItem(this.userKey, JSON.stringify(data.user));
    this.userSubject.next(data.user);
  }

  async hydrateUser(): Promise<void> {
    if (!this.token) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!res.ok) {
        this.logout();
        return;
      }

      const user = await res.json();
      localStorage.setItem(this.userKey, JSON.stringify(user));
      this.userSubject.next(user);
    } catch {
      this.logout();
    }
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.userSubject.next(null);
  }

  private readUser(): User | null {
    const raw = localStorage.getItem(this.userKey);
    return raw ? (JSON.parse(raw) as User) : null;
  }
}
