import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InvoiceService } from '../../features/invoice/services/invoice.service';
import { CreateInvoiceRequest } from '../../features/invoice/models/invoice.models';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './invoice-form.component.html',
  styleUrl: './invoice-form.component.css'
})
export class InvoiceFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private invoiceService = inject(InvoiceService);
  private router = inject(Router);

  invoiceForm: FormGroup;
  isSubmitting = false;
  errorMessage: string | null = null;

  constructor() {
    this.invoiceForm = this.fb.group({
      numar_serie: ['', Validators.required],
      issue_date: [''],
      furnizor: this.fb.group({
        nume: ['', Validators.required],
        cui: ['', Validators.required],
        adresa: ['', Validators.required],
        platitor_tva: [true]
      }),
      cumparator: this.fb.group({
        nume: ['', Validators.required],
        cui: ['', Validators.required],
        adresa: ['', Validators.required],
        platitor_tva: [true]
      }),
      line_items: this.fb.array([])
    });
  }

  ngOnInit() {
    // Add initial line item
    if (this.lineItems.length === 0) {
      this.addLineItem();
    }

    // Set default date
    const today = new Date().toISOString().split('T')[0];
    this.invoiceForm.patchValue({
      issue_date: today
    });
  }

  get lineItems(): FormArray {
    return this.invoiceForm.get('line_items') as FormArray;
  }

  addLineItem() {
    const lineItemGroup = this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit_price: [0, [Validators.required, Validators.min(0)]],
      total_price: [0, Validators.required],
      tax_rate: [19]
    });

    this.lineItems.push(lineItemGroup);
  }

  removeLineItem(index: number) {
    this.lineItems.removeAt(index);
  }

  calculateTotal(index: number) {
    const item = this.lineItems.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unit_price')?.value || 0;
    const total = quantity * unitPrice;
    
    item.patchValue({ total_price: total }, { emitEvent: false });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.invoiceForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  onSubmit() {
    if (this.invoiceForm.invalid || this.lineItems.length === 0) {
      Object.keys(this.invoiceForm.controls).forEach(key => {
        this.invoiceForm.get(key)?.markAsTouched();
      });
      
      this.lineItems.controls.forEach(control => {
        Object.keys((control as FormGroup).controls).forEach(key => {
          control.get(key)?.markAsTouched();
        });
      });

      this.errorMessage = 'Vă rugăm completați toate câmpurile obligatorii și adăugați cel puțin un articol.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const invoiceData: CreateInvoiceRequest = this.invoiceForm.value;

    this.invoiceService.createInvoice(invoiceData).subscribe({
      next: () => {
        this.router.navigate(['/invoices']);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Eroare la salvarea facturii';
        this.isSubmitting = false;
      }
    });
  }
}
