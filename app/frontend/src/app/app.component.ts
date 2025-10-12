import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TaxCalculatorComponent } from './components/tax-calculator/tax-calculator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TaxCalculatorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'TaxChain - Blockchain Tax Compliance';
}
