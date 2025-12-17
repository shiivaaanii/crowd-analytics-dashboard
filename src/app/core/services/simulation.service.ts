import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SimulationService {
  private BASE = 'https://hiring-dev.internal.kloudspot.com/api/sim';

  constructor(private http: HttpClient) {}

  start() {
    return this.http.get(`${this.BASE}/start`);
  }

  stop() {
    return this.http.get(`${this.BASE}/stop`);
  }
}
