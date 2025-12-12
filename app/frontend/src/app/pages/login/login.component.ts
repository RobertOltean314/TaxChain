import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MultiversxAuthService } from '../../core/services/multiversx-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  isLoading = false;
  errorMessage: string | null = null;
  returnUrl: string = '/taxpayer-dashboard';

  constructor(
    private authService: MultiversxAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get return URL from route parameters or default to dashboard
    this.returnUrl =
      this.route.snapshot.queryParams['returnUrl'] || '/taxpayer-dashboard';

    // Check if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  async loginWithExtension(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      await this.authService.loginWithExtension();
      this.router.navigate([this.returnUrl]);
    } catch (error: any) {
      this.errorMessage =
        error.message || 'Failed to connect with browser extension';
      console.error('Extension login error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loginWithWalletConnect(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      await this.authService.loginWithWalletConnect();
      this.router.navigate([this.returnUrl]);
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to connect with xPortal';
      console.error('WalletConnect login error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loginWithWebWallet(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      await this.authService.loginWithWebWallet();
      // Web wallet will redirect, so no need to handle navigation here
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to connect with Web Wallet';
      console.error('Web wallet login error:', error);
      this.isLoading = false;
    }
  }
}
