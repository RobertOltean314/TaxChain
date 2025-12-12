import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { MultiversxAuthService } from '../services/multiversx-auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(MultiversxAuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login page
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
