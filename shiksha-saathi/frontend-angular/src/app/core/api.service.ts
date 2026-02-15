import { Injectable } from '@angular/core';
import { API_BASE } from './config';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly auth: AuthService) {}

  get<T>(path: string, authed = true): Promise<T> {
    return this.request<T>(path, { method: 'GET' }, authed);
  }

  post<T>(path: string, payload: unknown, authed = true): Promise<T> {
    return this.request<T>(
      path,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      authed
    );
  }

  private async request<T>(path: string, options: RequestInit, authed: boolean): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (authed && this.auth.token) {
      headers.Authorization = `Bearer ${this.auth.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      try {
        const data = await res.json();
        throw new Error(data?.error || `Request failed: ${path}`);
      } catch {
        throw new Error(`Request failed: ${path}`);
      }
    }

    return (await res.json()) as T;
  }
}
