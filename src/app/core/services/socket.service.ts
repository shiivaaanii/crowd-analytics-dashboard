import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket!: Socket;

  private alertsSubject = new BehaviorSubject<any[]>([]);
  alerts$ = this.alertsSubject.asObservable();

  private liveOccupancySubject = new BehaviorSubject<any>(null);
  liveOccupancy$ = this.liveOccupancySubject.asObservable();

  connect() {
    if (this.socket) return;

    this.socket = io('https://hiring-dev.internal.kloudspot.com', {
      transports: ['websocket']
    });

    this.socket.on('alert', (data) => {
      const current = this.alertsSubject.value;
      this.alertsSubject.next([data, ...current].slice(0, 50));
    });

    this.socket.on('live_occupancy', (data) => {
      this.liveOccupancySubject.next(data);
    });
  }

  disconnect() {
    this.socket?.disconnect();
  }
}
