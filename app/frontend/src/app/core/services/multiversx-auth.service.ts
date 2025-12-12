import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ExtensionProvider } from '@multiversx/sdk-extension-provider';
import { WalletProvider } from '@multiversx/sdk-web-wallet-provider';

export interface AuthState {
  isAuthenticated: boolean;
  address: string | null;
  provider: 'extension' | 'webwallet' | null;
}

@Injectable({
  providedIn: 'root'
})
export class MultiversxAuthService {
  private readonly STORAGE_KEY = 'mvx_auth_state';
  
  private authState = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    address: null,
    provider: null
  });

  public authState$ = this.authState.asObservable();
  
  private extensionProvider: ExtensionProvider | null = null;
  private webWalletProvider: WalletProvider | null = null;

  constructor() {
    this.loadAuthState();
  }

  /**
   * Connect with Browser Extension (DeFi Wallet)
   */
  async loginWithExtension(): Promise<void> {
    try {
      this.extensionProvider = ExtensionProvider.getInstance();
      await this.extensionProvider.init();
      
      const accounts = await this.extensionProvider.login();
      
      this.setAuthState({
        isAuthenticated: true,
        address: accounts.address,
        provider: 'extension'
      });
    } catch (error) {
      console.error('Extension login failed:', error);
      throw new Error('Failed to connect with browser extension. Please install MultiversX DeFi Wallet.');
    }
  }

  /**
   * Connect with WalletConnect (xPortal Mobile) - Simplified for now
   */
  async loginWithWalletConnect(): Promise<void> {
    // For now, show alert that WalletConnect is coming soon
    alert('WalletConnect integration coming soon! Please use DeFi Wallet or Web Wallet for now.');
    throw new Error('WalletConnect not implemented yet.');
  }

  /**
   * Connect with Web Wallet (redirect)
   */
  async loginWithWebWallet(): Promise<void> {
    try {
      const webWalletUrl = 'https://devnet-wallet.multiversx.com';
      const callbackUrl = window.location.origin + '/wallet-callback';
      
      this.webWalletProvider = new WalletProvider(webWalletUrl);
      
      sessionStorage.setItem('mvx_login_attempt', 'webwallet');
      
      await this.webWalletProvider.login({ callbackUrl });
    } catch (error) {
      console.error('Web wallet login failed:', error);
      throw new Error('Failed to connect with Web Wallet.');
    }
  }

  /**
   * Handle Web Wallet callback - extracts address from URL parameters
   */
  async handleWebWalletCallback(): Promise<boolean> {
    try {
      const loginAttempt = sessionStorage.getItem('mvx_login_attempt');
      
      if (loginAttempt !== 'webwallet') {
        return false;
      }

      // Get address from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const address = urlParams.get('address');
      
      if (address) {
        this.setAuthState({
          isAuthenticated: true,
          address: address,
          provider: 'webwallet'
        });
        
        sessionStorage.removeItem('mvx_login_attempt');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Web wallet callback failed:', error);
      return false;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    const currentState = this.authState.value;
    
    try {
      switch (currentState.provider) {
        case 'extension':
          if (this.extensionProvider) {
            await this.extensionProvider.logout();
          }
          break;
        case 'webwallet':
          if (this.webWalletProvider) {
            await this.webWalletProvider.logout({ callbackUrl: window.location.origin });
          }
          break;
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    this.clearAuthState();
  }

  /**
   * Get current address
   */
  getAddress(): string | null {
    return this.authState.value.address;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.value.isAuthenticated;
  }

  /**
   * Get current auth state
   */
  getAuthState(): Observable<AuthState> {
    return this.authState$;
  }

  /**
   * Set auth state and persist
   */
  private setAuthState(state: AuthState): void {
    this.authState.next(state);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }

  /**
   * Clear auth state
   */
  private clearAuthState(): void {
    this.authState.next({
      isAuthenticated: false,
      address: null,
      provider: null
    });
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Load auth state from storage
   */
  private loadAuthState(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const state = JSON.parse(stored);
        this.authState.next(state);
      } catch (error) {
        console.error('Failed to parse auth state:', error);
      }
    }
  }
}
