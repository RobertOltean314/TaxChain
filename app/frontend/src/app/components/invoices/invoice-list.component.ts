import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InvoiceService } from '../../features/invoice/services/invoice.service';
import { InvoiceResponse } from '../../features/invoice/models/invoice.models';
import { formatCurrency, formatDateRO } from '../../core/utils';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './invoice-list.component.html',
  styleUrl: './invoice-list.component.css'
})
export class InvoiceListComponent implements OnInit {
  private invoiceService = inject(InvoiceService);

  invoices: InvoiceResponse[] = [];
  isLoading = true;
  error: string | null = null;

  formatCurrency = formatCurrency;
  formatDateRO = formatDateRO;

  ngOnInit() {
    this.loadInvoices();
  }

  loadInvoices() {
    this.isLoading = true;
    this.error = null;

    this.invoiceService.listInvoices().subscribe({
      next: (invoices) => {
        this.invoices = invoices;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = error.message || 'Eroare la încărcarea facturilor';
        this.isLoading = false;
      }
    });
  }

  deleteInvoice(id: string) {
    if (!confirm('Sigur doriți să ștergeți această factură?')) {
      return;
    }

    this.invoiceService.deleteInvoice(id).subscribe({
      next: () => {
        this.invoices = this.invoices.filter(inv => inv.id !== id);
      },
      error: (error) => {
        alert('Eroare la ștergerea facturii: ' + error.message);
      }
    });
  }
}
