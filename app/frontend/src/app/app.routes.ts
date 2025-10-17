import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'invoices',
    loadComponent: () =>
      import('./components/invoices/invoice-list.component').then(
        (m) => m.InvoiceListComponent
      ),
  },
  {
    path: 'invoices/new',
    loadComponent: () =>
      import('./components/invoices/invoice-form.component').then(
        (m) => m.InvoiceFormComponent
      ),
  },
  {
    path: 'invoices/:id',
    loadComponent: () =>
      import('./components/invoices/invoice-detail.component').then(
        (m) => m.InvoiceDetailComponent
      ),
  },
  {
    path: 'tax-calculator',
    loadComponent: () =>
      import('./components/tax-calculator/tax-calculator.component').then(
        (m) => m.TaxCalculatorComponent
      ),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
