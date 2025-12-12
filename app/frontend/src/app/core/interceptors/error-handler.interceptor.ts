import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorHandlerInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An error occurred';

      if (error.error instanceof ErrorEvent) {
        errorMessage = `Client Error: ${error.error.message}`;
      } else {
        errorMessage = `Server Error: ${error.status} - ${error.message}`;

        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.error?.details) {
          errorMessage = error.error.details;
        }
      }

      console.error('HTTP Error:', errorMessage, error);

      return throwError(() => error);
    })
  );
};
