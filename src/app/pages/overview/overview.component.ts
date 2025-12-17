import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { EMPTY, Subscription } from 'rxjs';
import Chart from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';
import { AnalyticsContextService } from '../../core/services/analytics-context.service';
import { SocketService } from '../../core/services/socket.service';

Chart.register(annotationPlugin);

@Component({
  selector: 'app-overview',
  standalone: true,
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class OverviewComponent implements OnInit, AfterViewInit {

  // =============================
  // KPI CARDS
  // =============================
  liveOccupancy = 0;
  todayFootfall = 0;
  avgDwellTime = '';

  maleCount = 0;
  femaleCount = 0;

  // =============================
  // CHART INSTANCES
  // =============================
  private occupancyChart!: Chart;
  private donutChart!: Chart;
  private genderChart!: Chart;

  // =============================
  // CANVAS REFERENCES
  // =============================
  @ViewChild('occupancyCanvas') occupancyCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutCanvas') donutCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('genderCanvas') genderCanvas!: ElementRef<HTMLCanvasElement>;

  private contextSub!: Subscription;

  constructor(
    private http: HttpClient,
    private analyticsContext: AnalyticsContextService,
    private socket: SocketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.socket.liveOccupancy$.subscribe(data => {
    if (!data) return;
    console.log('LIVE OCCUPANCY EVENT:', data);
  });
  }

  ngAfterViewInit() {
    // 🔥 Listen to global context (site + date range)
    this.contextSub = this.analyticsContext.context$.subscribe(ctx => {
      if (!ctx) return;

      this.loadOverviewData(ctx.siteId, ctx.fromUtc, ctx.toUtc);
    });
  }

  ngOnDestroy() {
    this.contextSub?.unsubscribe();
  }

  // =============================
  // LOAD ALL OVERVIEW DATA
  // =============================
  loadOverviewData(siteId: string, fromUtc: number, toUtc: number) {
    this.loadOccupancy(siteId, fromUtc, toUtc);
    this.loadFootfall(siteId, fromUtc, toUtc);
    this.loadDwell(siteId, fromUtc, toUtc);
    this.loadDemographics(siteId, fromUtc, toUtc);
  }

  // =============================
  // OCCUPANCY
  // =============================
  loadOccupancy(siteId: string, fromUtc: number, toUtc: number) {
    const payload = { siteId, fromUtc, toUtc };

    this.http
      .post<any>(
        'https://hiring-dev.internal.kloudspot.com/api/analytics/occupancy',
        payload
      )
      .pipe(catchError(err => this.handleError(err)))
      .subscribe(res => {
        const labels = res.buckets.map(
          (b: any) => b.local.split(' ')[1].slice(0, 5)
        );
        const values = res.buckets.map((b: any) => b.avg);

        const lastValidIndex = [...values]
          .map(v => v > 0)
          .lastIndexOf(true);

        this.liveOccupancy = values[lastValidIndex] ?? 0;

        setTimeout(() => {
          this.buildOccupancyChart(labels, values, lastValidIndex);
          this.cdr.detectChanges();
        }, 50);
      });
  }

  // =============================
  // FOOTFALL
  // =============================
  loadFootfall(siteId: string, fromUtc: number, toUtc: number) {
    const payload = { siteId, fromUtc, toUtc };

    this.http
      .post<any>(
        'https://hiring-dev.internal.kloudspot.com/api/analytics/footfall',
        payload
      )
      .pipe(catchError(err => this.handleError(err)))
      .subscribe(res => {
        const value =
          res?.footfall ??
          res?.data?.footfall ??
          res?.result?.footfall ??
          0;

        setTimeout(() => {
          this.todayFootfall = value;
          this.cdr.detectChanges();
        }, 50);
      });
  }

  // =============================
  // DWELL
  // =============================
  loadDwell(siteId: string, fromUtc: number, toUtc: number) {
    const payload = { siteId, fromUtc, toUtc };

    this.http
      .post<any>(
        'https://hiring-dev.internal.kloudspot.com/api/analytics/dwell',
        payload
      )
      .pipe(catchError(err => this.handleError(err)))
      .subscribe(res => {
        const minutes = Math.floor(res.avgDwellMinutes);
        const seconds = Math.round(
          (res.avgDwellMinutes - minutes) * 60
        );

        this.avgDwellTime = `${minutes} min ${seconds} sec`;
      });
  }

  // =============================
  // DEMOGRAPHICS
  // =============================
  loadDemographics(siteId: string, fromUtc: number, toUtc: number) {
    const payload = { siteId, fromUtc, toUtc };

    this.http
      .post<any>(
        'https://hiring-dev.internal.kloudspot.com/api/analytics/demographics',
        payload
      )
      .pipe(catchError(err => this.handleError(err)))
      .subscribe(res => {
        const labels = res.buckets.map(
          (b: any) => b.local.split(' ')[1].slice(0, 5)
        );

        const maleSeries = res.buckets.map((b: any) => b.male);
        const femaleSeries = res.buckets.map((b: any) => b.female);

        const lastValidIndex = [...res.buckets]
          .map((b: any) => b.male + b.female)
          .lastIndexOf(
            Math.max(
              ...res.buckets.map((b: any) => b.male + b.female)
            )
          );

        this.maleCount = res.buckets[lastValidIndex]?.male ?? 0;
        this.femaleCount = res.buckets[lastValidIndex]?.female ?? 0;

        setTimeout(() => {
          this.buildDonutChart();
          this.buildGenderLineChart(labels, maleSeries, femaleSeries);
          this.cdr.detectChanges();
        }, 50);
      });
  }

  // =============================
  // ERROR HANDLER
  // =============================
  private handleError(error: any) {
    console.error('API Error:', error);
    return EMPTY;
  }

  // =============================
  // OCCUPANCY CHART (UNCHANGED DESIGN)
  // =============================

  buildOccupancyChart(labels: string[], data: number[], liveIndex: number) {
    // Ensure canvas ref is available before creating chart
    if (!this.occupancyCanvas?.nativeElement) {
      console.warn('occupancyCanvas ref not ready');
      return;
    }
    if (this.occupancyChart) {
      this.occupancyChart.destroy();
    }

    this.occupancyChart = new Chart(
  this.occupancyCanvas.nativeElement,
  {

      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Occupancy',
          data,
          borderColor: '#2a9d8f',
          backgroundColor: 'rgba(42,157,143,0.12)',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#2a9d8f'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20
            }
          },
          tooltip: {
            enabled: true,
            mode: 'nearest',
            intersect: false,
            backgroundColor: '#fff',
            titleColor: '#111',
            bodyColor: '#333',
            borderColor: '#ddd',
            borderWidth: 1,
            padding: 12,
            displayColors: false
          },
          annotation: {
    clip: false, // 🔥 THIS FIXES HIDING
    annotations: {
      liveLine: {
        type: 'line',
        scaleID: 'x',
        value: liveIndex,
        borderColor: '#c1121f',
        borderWidth: 2,
        borderDash: [6, 3]
      },
      liveLabel: {
        type: 'label',
        xScaleID: 'x',
        yScaleID: 'y',
        xValue: liveIndex,
        yValue: data[liveIndex],
        backgroundColor: '#c1121f',
        color: '#fff',
        content: 'LIVE',
        padding: 6,
        borderRadius: 4,
        font: { size: 11, weight: 'bold' }
      }
    }
  }


        },
        scales: {
          y: {
            beginAtZero: false,
            suggestedMin: Math.min(...data) - 5,
            suggestedMax: Math.max(...data) + 5,
            title: {
              display: true,
              text: 'Count',
              color: '#444',
              font: { size: 14, weight: 600 }
            },
            ticks: { color: '#666' },
            grid: { color: 'rgba(0,0,0,0.08)' }
          },
          x: {
            title: {
              display: true,
              text: 'Time',
              color: '#444',
              font: { size: 14, weight: 600 }
            },
            ticks: { color: '#666' },
            grid: { color: 'rgba(0,0,0,0.05)' }
          }
        }
      }
    });
  }

  // =============================
  // DONUT CHART (UNCHANGED DESIGN)
  // =============================

  buildDonutChart() {
  // Ensure canvas ref is available before creating chart
  if (!this.donutCanvas?.nativeElement) {
    console.warn('donutCanvas ref not ready');
    return;
  }
  if (this.donutChart) {
    this.donutChart.destroy();
  }

  this.donutChart = new Chart(
  this.donutCanvas.nativeElement,
  {

    type: "doughnut",
    data: {
      labels: ["Male", "Female"],
      datasets: [{
        data: [this.maleCount, this.femaleCount], // ✅ REAL COUNTS
        backgroundColor: ['#2a9d8f', '#A7E2D8'],
        hoverOffset: 8,
        borderWidth: 0
      }]
    },
    options: {
      cutout: "68%",
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            pointStyle: "circle"
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = this.maleCount + this.femaleCount;
              const value = ctx.raw as number;
              const pct = ((value / total) * 100).toFixed(1);
              return `${ctx.label}: ${value} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

get totalCrowd(): number {
  return this.maleCount + this.femaleCount;
}



  // =============================
  // GENDER LINE CHART (UNCHANGED DESIGN)
  // =============================

  buildGenderLineChart(labels: string[], male: number[], female: number[]) {
    // Ensure canvas ref is available before creating chart
    if (!this.genderCanvas?.nativeElement) {
      console.warn('genderCanvas ref not ready');
      return;
    }
    if (this.genderChart) {
      this.genderChart.destroy();
    }

    this.genderChart = new Chart(
  this.genderCanvas.nativeElement,
  {

      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Male',
            data: male,
            borderColor: '#2a9d8f',
            backgroundColor: 'rgba(42,157,143,0.15)',
            fill: true,
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3
          },
          {
            label: 'Female',
            data: female,
            borderColor: '#9FD9CC',
            backgroundColor: 'rgba(159,217,204,0.15)',
            fill: true,
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, pointStyle: 'circle' }
          },
          tooltip: {
            enabled: true,
            mode: 'nearest',
            intersect: false,
            backgroundColor: '#fff',
            titleColor: '#111',
            bodyColor: '#333',
            borderColor: '#ddd',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}`
            }
          }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: "Count",
              color: "#444",
              font: { size: 14, weight: 600 }
            },
            ticks: { color: "#666" },
            grid: { color: "rgba(0,0,0,0.08)" }
          },
          x: {
            title: {
              display: true,
              text: "Time",
              color: "#444",
              font: { size: 14, weight: 600 }
            },
            ticks: { color: "#666" },
            grid: { color: "rgba(0,0,0,0.05)" }
          }
        }
      }
    });
  }
}
