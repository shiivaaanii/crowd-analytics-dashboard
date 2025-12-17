import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { OverviewComponent } from './pages/overview/overview.component';
import { CrowdEntriesComponent } from './pages/crowd-entries/crowd-entries.component';
import { authGuard } from './core/guards/auth-guard';
import { LayoutComponent } from './layout/layout/layout.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },

  {
    path: 'dashboard',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'overview', component: OverviewComponent },
      { path: 'entries', component: CrowdEntriesComponent }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
