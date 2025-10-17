/**
 * HTTP Interceptor for error handling and retry logic
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, timer, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export const errorHandlerInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    // Retry failed requests
    retry({
      count: environment.retryAttempts,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        if (error.status >= 400 && error.status < 500 && error.status !== 408) {
          throw error;
        }

        if (error.status === 401 || error.status === 403) {
          throw error;
        }

        if (environment.enableLogging) {
          console.log(
            `[Retry] Attempt ${retryCount + 1}/${
              environment.retryAttempts
            } for ${req.url}`
          );
        }

        // Exponential backoff: delay * 2^retryCount
        const delay = environment.retryDelay * Math.pow(2, retryCount);
        return timer(delay);
      },
    }),
    catchError((error: HttpErrorResponse) => {
      if (environment.enableLogging) {
        console.error('[Error Handler]', {
          url: req.url,
          status: error.status,
          message: error.message,
        });
      }

      switch (error.status) {
        case 0:
          console.error(
            'Network error or CORS issue. Please check your connection.'
          );
          break;
        case 401:
          console.error('Unauthorized access. Please log in.');
          // TODO: inject Router here and navigate to login
          break;
        case 403:
          console.error('Access forbidden.');
          break;
        case 404:
          console.error('Resource not found.');
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          console.error('Server error. Please try again later.');
          break;
      }

      return throwError(() => error);
    })
  );
};
