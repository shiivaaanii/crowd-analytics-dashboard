import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly API_URL =
    'https://hiring-dev.internal.kloudspot.com/api/auth/login';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(this.API_URL, {
      email,
      password
    }).pipe(
      tap((response) => {
        // ✅ assuming backend sends token
        localStorage.setItem('token', response.token);
      })
    );
  }

  getToken(): string | null {
  return localStorage.getItem('token');
}

  logout() {
    localStorage.removeItem('token');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}
