import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';

import {
  AnalyticsContextService,
  Site
} from '../../core/services/analytics-context.service';

import { SocketService } from '../../core/services/socket.service';
import { Observable } from 'rxjs';
import { SimulationService } from '../../core/services/simulation.service';


@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {

  sites$!: Observable<Site[]>;
  selectedSite$!: Observable<Site | null>;

  showAlerts = false;
  alerts: any[] = [];

  constructor(
    private analyticsContext: AnalyticsContextService,
    private socketService: SocketService,
    private simulationService: SimulationService
  ) {}

  ngOnInit(): void {
    this.sites$ = this.analyticsContext.sites$;
    this.selectedSite$ = this.analyticsContext.selectedSite$;

    this.analyticsContext.loadSites();

    // ✅ Correct alerts subscription
    this.socketService.alerts$.subscribe(alerts => {
      this.alerts = alerts.map(a => ({
        ...a,
        time: new Date(a.timestamp ?? Date.now()).toLocaleTimeString()
      }));
    });
  }

  onSiteChange(siteId: string, sites: Site[]) {
    const site = sites.find(s => s.siteId === siteId);
    if (site) this.analyticsContext.setSelectedSite(site);
  }

  setRange(range: 'today' | 'yesterday' | 'tomorrow') {
    this.analyticsContext.setRange(range);
  }

  toggleAlerts() {
    this.showAlerts = !this.showAlerts;
  }

  closeAlerts() {
    this.showAlerts = false;
  }

  startSim() {
  this.simulationService.start().subscribe({
    next: () => console.log('Simulation started'),
    error: err => console.error(err)
  });
}

stopSim() {
  this.simulationService.stop().subscribe({
    next: () => console.log('Simulation stopped'),
    error: err => console.error(err)
  });
}

}

