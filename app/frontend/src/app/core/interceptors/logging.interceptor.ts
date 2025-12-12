import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.enableLogging) {
    return next(req);
  }

  const startTime = Date.now();
  console.log(`[HTTP] ${req.method} ${req.url}`);

  return next(req).pipe(
    tap({
      next: (event) => {
        const elapsed = Date.now() - startTime;
        console.log(`[HTTP] ${req.method} ${req.url} - Success (${elapsed}ms)`);
      },
      error: (error) => {
        const elapsed = Date.now() - startTime;
        console.error(`[HTTP] ${req.method} ${req.url} - Error (${elapsed}ms)`, error);
      },
    })
  );
};
