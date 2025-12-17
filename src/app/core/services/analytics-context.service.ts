import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { DateTime } from 'luxon';


export interface Site {
  siteId: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsContextService {

  private readonly SITES_API =
    'https://hiring-dev.internal.kloudspot.com/api/sites';

  // -------------------------
  // SITES
  // -------------------------
  private sitesSubject = new BehaviorSubject<Site[]>([]);
  sites$ = this.sitesSubject.asObservable();

  private selectedSiteSubject = new BehaviorSubject<Site | null>(null);
  selectedSite$ = this.selectedSiteSubject.asObservable();

  // -------------------------
  // DATE RANGE
  // -------------------------
  private rangeSubject = new BehaviorSubject<'today' | 'yesterday' | 'tomorrow'>('today');
  range$ = this.rangeSubject.asObservable();

  // -------------------------
  // COMPUTED CONTEXT
  // -------------------------
  private contextSubject = new BehaviorSubject<{
    siteId: string;
    timezone: string;
    fromUtc: number;
    toUtc: number;
  } | null>(null);

  context$ = this.contextSubject.asObservable();

  constructor(private http: HttpClient) {}

  // 🔹 Call after login
  loadSites() {
    this.http.get<Site[]>(this.SITES_API).subscribe(sites => {
      this.sitesSubject.next(sites);
      if (sites.length) this.setSelectedSite(sites[0]);
    });
  }

  setSelectedSite(site: Site) {
    this.selectedSiteSubject.next(site);
    this.recomputeContext();
  }

  setRange(range: 'today' | 'yesterday' | 'tomorrow') {
    this.rangeSubject.next(range);
    this.recomputeContext();
  }

  // 🔥 CENTRAL LOGIC
  private recomputeContext() {
    const site = this.selectedSiteSubject.value;
    const range = this.rangeSubject.value;
    if (!site) return;

    const { fromUtc, toUtc } = this.computeUtc(range, site.timezone);

    this.contextSubject.next({
      siteId: site.siteId,
      timezone: site.timezone,
      fromUtc,
      toUtc
    });
  }

  // ✅ Correct UTC calculation using Luxon
  private computeUtc(
  range: 'today' | 'yesterday' | 'tomorrow',
  timezone: string
) {
  // 1️⃣ Get SITE LOCAL DATE (calendar date only)
  const siteNow = DateTime.now().setZone(timezone);

  let date = siteNow.startOf('day');

  if (range === 'yesterday') date = date.minus({ days: 1 });
  if (range === 'tomorrow')  date = date.plus({ days: 1 });

  // 2️⃣ Build start & end of day IN SITE TIMEZONE
  const startOfDay = DateTime.fromObject(
    {
      year: date.year,
      month: date.month,
      day: date.day,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0
    },
    { zone: timezone }
  );

  const endOfDay = DateTime.fromObject(
    {
      year: date.year,
      month: date.month,
      day: date.day,
      hour: 23,
      minute: 59,
      second: 59,
      millisecond: 999
    },
    { zone: timezone }
  );

  // 3️⃣ Convert to UTC
  return {
    fromUtc: startOfDay.toUTC().toMillis(),
    toUtc: endOfDay.toUTC().toMillis()
  };
}






}
