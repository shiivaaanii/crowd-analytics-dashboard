import { Component, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { AgGridAngular } from 'ag-grid-angular';
import {
  ModuleRegistry,
  AllCommunityModule,
  ColDef,
  RowClassParams,
  RowStyle,
  GridReadyEvent,
  PaginationChangedEvent
} from 'ag-grid-community';

import { AnalyticsContextService } from '../../core/services/analytics-context.service';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-crowd-entries',
  standalone: true,
  imports: [CommonModule, AgGridAngular],
  templateUrl: './crowd-entries.component.html',
  styleUrls: ['./crowd-entries.component.css']
})
export class CrowdEntriesComponent implements OnDestroy {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  private readonly API_URL =
    'https://hiring-dev.internal.kloudspot.com/api/analytics/entry-exit';

  // -------------------------
  // GRID CONFIG
  // -------------------------
  paginationPageSize = 10;
  displayedRowCount = 10;
  rowHeight = 52;
  headerHeight = 64;
  paginationPanelHeight = 50;

  currentPage = 1;
  totalRecords = 0;

  columnDefs: ColDef[] = [
    { headerName: 'Name', field: 'name', flex: 1 },
    { headerName: 'Sex', field: 'sex', width: 150 },
    { headerName: 'Entry', field: 'entry', width: 200 },
    { headerName: 'Exit', field: 'exit', width: 200 },
    { headerName: 'Dwell Time', field: 'dwell', width: 150 }
  ];

  defaultColDef: ColDef = {
    sortable: true,
    resizable: false
  };

  rowData: any[] = [];

  // -------------------------
  // CONTEXT
  // -------------------------
  private contextSub!: Subscription;
  private activeContext: {
    siteId: string;
    fromUtc: number;
    toUtc: number;
  } | null = null;

  constructor(
    private http: HttpClient,
    private analyticsContext: AnalyticsContextService
  ) {}

  // =============================
  // GRID READY
  // =============================
  onGridReady(event: GridReadyEvent) {
    // 🔥 Subscribe once – auto reloads on site/date change
    this.contextSub = this.analyticsContext.context$.subscribe(ctx => {
      if (!ctx) return;

      this.activeContext = ctx;
      this.currentPage = 1; // reset page on context change
      this.loadEntries();
    });
  }

  // =============================
  // API CALL
  // =============================
  loadEntries() {
    if (!this.activeContext) return;

    const payload = {
      siteId: this.activeContext.siteId,
      fromUtc: this.activeContext.fromUtc,
      toUtc: this.activeContext.toUtc,
      pageNumber: this.currentPage,
      pageSize: this.paginationPageSize
    };

    this.http.post<any>(this.API_URL, payload).subscribe(res => {
      this.totalRecords = res.totalRecords;

      const mappedRows = res.records.map((r: any) => ({
        name: r.personName,
        sex: r.gender,
        entry: r.entryLocal,
        exit: r.exitLocal ?? '--',
        dwell: r.dwellMinutes != null ? `${r.dwellMinutes} min` : '--'
      }));

      this.rowData = mappedRows;
      this.displayedRowCount = mappedRows.length;

      // 🔥 ag-grid update (NO deprecated APIs)
      this.agGrid.api.setGridOption('rowData', mappedRows);
    });
  }

  // =============================
  // PAGINATION
  // =============================
  onPaginationChanged(event: PaginationChangedEvent) {
    if (!event.api || !this.activeContext) return;

    const newPage = event.api.paginationGetCurrentPage() + 1;
    const newPageSize = event.api.paginationGetPageSize();

    if (
      newPage !== this.currentPage ||
      newPageSize !== this.paginationPageSize
    ) {
      this.currentPage = newPage;
      this.paginationPageSize = newPageSize;
      this.loadEntries();
    }
  }

  // =============================
  // TABLE HEIGHT
  // =============================
  get tableHeight(): string {
    const totalHeight =
      this.headerHeight +
      this.displayedRowCount * this.rowHeight +
      this.paginationPanelHeight;
    return `${totalHeight}px`;
  }

  // =============================
  // ZEBRA ROW STYLE
  // =============================
  getRowStyle(params: RowClassParams): RowStyle | undefined {
    if (params.node && typeof params.node.rowIndex === 'number') {
      return {
        background:
          params.node.rowIndex % 2 === 0 ? '#fbfbfb' : '#ffffff'
      };
    }
    return undefined;
  }

  // =============================
  // CLEANUP
  // =============================
  ngOnDestroy() {
    this.contextSub?.unsubscribe();
  }
}
