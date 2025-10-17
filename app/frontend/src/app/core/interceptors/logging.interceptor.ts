/**
 * HTTP Interceptor for logging requests and responses
 */

import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.enableLogging) {
    return next(req);
  }

  const startTime = Date.now();

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          const duration = Date.now() - startTime;
          console.log(
            `[HTTP] ${req.method} ${req.url} - ${event.status} (${duration}ms)`
          );
        }
      },
      error: (error) => {
        const duration = Date.now() - startTime;
        console.error(
          `[HTTP] ${req.method} ${req.url} - Error (${duration}ms)`,
          error
        );
      },
    })
  );
};
