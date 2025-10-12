import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface Invoice {
  amount: number;
  invoice_type: 'Income' | 'Expense';
  description?: string;
}

interface TaxCalculationResponse {
  total_income: number;
  total_expenses: number;
  profit: number;
  tax_owed: number;
  tax_rate: number;
  zk_proof_generated: boolean;
}

@Component({
  selector: 'app-tax-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tax-calculator.component.html',
  styleUrl: './tax-calculator.component.css',
})
export class TaxCalculatorComponent {
  private http = inject(HttpClient);

  invoices: Invoice[] = [];

  currentInvoice: Invoice = {
    amount: 0,
    invoice_type: 'Income',
    description: '',
  };

  taxResult: TaxCalculationResponse | null = null;
  isCalculating = false;
  errorMessage = '';
  successMessage = '';

  addInvoice(): void {
    if (!this.currentInvoice.amount || this.currentInvoice.amount <= 0) {
      this.showError('Please enter a valid amount!');
      return;
    }

    this.invoices.push({ ...this.currentInvoice });
    this.showSuccess(
      `Added ${this.currentInvoice.invoice_type}: ${this.currentInvoice.amount} RON`
    );

    this.currentInvoice = {
      amount: 0,
      invoice_type: 'Income',
      description: '',
    };
  }

  removeInvoice(index: number): void {
    this.invoices.splice(index, 1);
    this.showSuccess('Invoice removed');
  }

  clearAll(): void {
    this.invoices = [];
    this.taxResult = null;
    this.showSuccess('All invoices cleared');
  }

  async calculateTax(): Promise<void> {
    if (this.invoices.length === 0) {
      this.showError('Please add some invoices first!');
      return;
    }

    this.isCalculating = true;
    this.errorMessage = '';

    try {
      const backendUrl = environment.apiUrl;

      const response = await firstValueFrom(
        this.http.post<TaxCalculationResponse>(`${backendUrl}/calculate-tax`, {
          invoices: this.invoices,
        })
      );

      this.taxResult = response;
      this.showSuccess('Tax calculation completed successfully!');
    } catch (error: any) {
      console.error('Error calculating tax:', error);
      const errorMessage =
        error.status === 0
          ? `Cannot connect to backend service at ${environment.apiUrl}. Please check if the service is running.`
          : `Error calculating tax: ${error.message || 'Unknown error'}`;
      this.showError(errorMessage);
    } finally {
      this.isCalculating = false;
    }
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => (this.errorMessage = ''), 5000);
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => (this.successMessage = ''), 3000);
  }

  getTotalIncome(): number {
    return this.invoices
      .filter((inv) => inv.invoice_type === 'Income')
      .reduce((sum, inv) => sum + inv.amount, 0);
  }

  getTotalExpenses(): number {
    return this.invoices
      .filter((inv) => inv.invoice_type === 'Expense')
      .reduce((sum, inv) => sum + inv.amount, 0);
  }
}
