import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then(
        (m) => m.LandingComponent
      ),
  },
  {
    path: 'portal',
    loadComponent: () =>
      import('./layouts/portal-layout/portal-layout.component').then(
        (m) => m.PortalLayoutComponent
      ),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import(
            './pages/taxpayer-dashboard/taxpayer-dashboard.component'
          ).then((m) => m.TaxpayerDashboardComponent),
      },
      {
        path: 'entity',
        children: [
          {
            path: '',
            redirectTo: 'list',
            pathMatch: 'full',
          },
          {
            path: 'list',
            loadComponent: () =>
              import(
                './components/entity-management/entity-management.component'
              ).then((m) => m.EntityManagementComponent),
          },
          {
            path: 'register',
            loadComponent: () =>
              import(
                './components/entity-management/entity-management.component'
              ).then((m) => m.EntityManagementComponent),
          },
          {
            path: 'representatives',
            loadComponent: () =>
              import(
                './components/entity-management/entity-management.component'
              ).then((m) => m.EntityManagementComponent),
          },
        ],
      },
      {
        path: 'invoices',
        children: [
          {
            path: '',
            redirectTo: 'history',
            pathMatch: 'full',
          },
          {
            path: 'upload',
            loadComponent: () =>
              import(
                './components/invoice-management/invoice-management.component'
              ).then((m) => m.InvoiceManagementComponent),
          },
          {
            path: 'history',
            loadComponent: () =>
              import(
                './components/invoice-management/invoice-management.component'
              ).then((m) => m.InvoiceManagementComponent),
          },
        ],
      },
      {
        path: 'payment',
        children: [
          {
            path: 'obligations',
            loadComponent: () =>
              import(
                './pages/taxpayer-dashboard/taxpayer-dashboard.component'
              ).then((m) => m.TaxpayerDashboardComponent),
          },
          {
            path: 'proof',
            loadComponent: () =>
              import(
                './pages/taxpayer-dashboard/taxpayer-dashboard.component'
              ).then((m) => m.TaxpayerDashboardComponent),
          },
          {
            path: 'history',
            loadComponent: () =>
              import(
                './pages/taxpayer-dashboard/taxpayer-dashboard.component'
              ).then((m) => m.TaxpayerDashboardComponent),
          },
        ],
      },
      {
        path: 'compliance',
        loadComponent: () =>
          import(
            './pages/taxpayer-dashboard/taxpayer-dashboard.component'
          ).then((m) => m.TaxpayerDashboardComponent),
      },
    ],
  },
  {
    path: 'government',
    loadComponent: () =>
      import('./layouts/government-layout/government-layout.component').then(
        (m) => m.GovernmentLayoutComponent
      ),
    children: [
      {
        path: '',
        redirectTo: 'compliance',
        pathMatch: 'full',
      },
      {
        path: 'compliance',
        loadComponent: () =>
          import(
            './pages/government-dashboard/government-dashboard.component'
          ).then((m) => m.GovernmentDashboardComponent),
      },
      {
        path: 'search',
        children: [
          {
            path: 'id',
            loadComponent: () =>
              import(
                './pages/government-dashboard/government-dashboard.component'
              ).then((m) => m.GovernmentDashboardComponent),
          },
          {
            path: 'advanced',
            loadComponent: () =>
              import(
                './pages/government-dashboard/government-dashboard.component'
              ).then((m) => m.GovernmentDashboardComponent),
          },
        ],
      },
      {
        path: 'verification',
        children: [
          {
            path: 'proof',
            loadComponent: () =>
              import(
                './pages/government-dashboard/government-dashboard.component'
              ).then((m) => m.GovernmentDashboardComponent),
          },
          {
            path: 'transactions',
            loadComponent: () =>
              import(
                './pages/government-dashboard/government-dashboard.component'
              ).then((m) => m.GovernmentDashboardComponent),
          },
        ],
      },
      {
        path: 'audit',
        loadComponent: () =>
          import(
            './pages/government-dashboard/government-dashboard.component'
          ).then((m) => m.GovernmentDashboardComponent),
      },
      {
        path: 'analytics',
        children: [
          {
            path: 'revenue',
            loadComponent: () =>
              import(
                './pages/government-dashboard/government-dashboard.component'
              ).then((m) => m.GovernmentDashboardComponent),
          },
          {
            path: 'distribution',
            loadComponent: () =>
              import(
                './pages/government-dashboard/government-dashboard.component'
              ).then((m) => m.GovernmentDashboardComponent),
          },
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
