import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MultiversxAuthService } from '../../core/services/multiversx-auth.service';

@Component({
  selector: 'app-wallet-callback',
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <svg
          class="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p class="text-gray-600">Autentificare în curs...</p>
      </div>
    </div>
  `,
})
export class WalletCallbackComponent implements OnInit {
  constructor(
    private authService: MultiversxAuthService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const success = await this.authService.handleWebWalletCallback();

      if (success) {
        this.router.navigate(['/taxpayer-dashboard']);
      } else {
        this.router.navigate(['/login'], {
          queryParams: { error: 'Authentication failed' },
        });
      }
    } catch (error) {
      console.error('Wallet callback error:', error);
      this.router.navigate(['/login'], {
        queryParams: { error: 'Authentication failed' },
      });
    }
  }
}
