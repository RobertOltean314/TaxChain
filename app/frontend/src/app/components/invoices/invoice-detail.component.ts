import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { InvoiceService } from '../../features/invoice/services/invoice.service';
import { InvoiceResponse } from '../../features/invoice/models/invoice.models';
import { formatCurrency, formatDateRO } from '../../core/utils';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './invoice-detail.component.html',
  styleUrl: './invoice-detail.component.css'
})
export class InvoiceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private invoiceService = inject(InvoiceService);

  invoice: InvoiceResponse | null = null;
  isLoading = true;
  error: string | null = null;

  formatCurrency = formatCurrency;
  formatDateRO = formatDateRO;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInvoice(id);
    }
  }

  loadInvoice(id: string) {
    this.isLoading = true;
    this.error = null;

    this.invoiceService.getInvoice(id).subscribe({
      next: (invoice) => {
        this.invoice = invoice;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = error.message || 'Eroare la încărcarea facturii';
        this.isLoading = false;
      }
    });
  }

  deleteInvoice() {
    if (!this.invoice || !confirm('Sigur doriți să ștergeți această factură?')) {
      return;
    }

    this.invoiceService.deleteInvoice(this.invoice.id).subscribe({
      next: () => {
        window.location.href = '/invoices';
      },
      error: (error) => {
        alert('Eroare la ștergerea facturii: ' + error.message);
      }
    });
  }
}
