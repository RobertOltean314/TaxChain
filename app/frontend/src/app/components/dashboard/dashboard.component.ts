import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InvoiceService } from '../../features/invoice/services/invoice.service';
import { BusinessEntityService } from '../../features/business-entity/services/business-entity.service';
import { formatCurrency } from '../../core/utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private invoiceService = inject(InvoiceService);
  private entityService = inject(BusinessEntityService);

  stats = {
    totalInvoices: 0,
    totalEntities: 0,
    totalValue: 0,
  };

  recentInvoices: any[] = [];
  isLoading = true;
  formatCurrency = formatCurrency;

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading = true;

    // Load invoices
    this.invoiceService.listInvoices().subscribe({
      next: (invoices) => {
        this.recentInvoices = invoices.slice(0, 5);
        this.stats.totalInvoices = invoices.length;
        this.stats.totalValue = invoices.reduce(
          (sum, inv) => sum + inv.total_de_plata,
          0
        );
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
        this.isLoading = false;
      },
    });

    // Load entities
    this.entityService.listEntities().subscribe({
      next: (entities) => {
        this.stats.totalEntities = entities.length;
      },
      error: (error) => {
        console.error('Error loading entities:', error);
      },
    });
  }
}
