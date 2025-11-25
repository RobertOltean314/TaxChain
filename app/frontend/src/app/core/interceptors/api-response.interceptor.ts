/**
 * HTTP Interceptor for handling API responses
 * Unwraps ApiResponse<T> wrapper and handles errors globally
 */

import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map, throwError } from 'rxjs';
import { ApiResponse, ErrorResponse } from '../models/common.models';
import { environment } from '../../../environments/environment';

export const apiResponseInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.enableLogging) {
    console.log(`[API] ${req.method} ${req.url}`);
  }

  return next(req).pipe(
    map((event) => {
      // Only process HTTP responses
      if (event instanceof HttpResponse) {
        const body = event.body;

        // Check if response is wrapped in ApiResponse<T>
        if (body && typeof body === 'object' && 'success' in body) {
          const apiResponse = body as ApiResponse<any>;

          if (environment.enableLogging) {
            console.log(`[API Response] ${req.url}:`, apiResponse);
          }

          // If the API indicates failure, throw an error
          if (!apiResponse.success) {
            throw new Error(apiResponse.error || 'Unknown API error');
          }

          // Return unwrapped data
          return event.clone({ body: apiResponse.data });
        }
      }

      return event;
    }),
    catchError((error: HttpErrorResponse) => {
      if (environment.enableLogging) {
        console.error(`[API Error] ${req.url}:`, error);
      }

      let errorMessage = 'An unknown error occurred';
      let errorCode: string | undefined;
      let errorDetails: any;

      if (error.error) {
        // Check if it's an ErrorResponse from backend
        const errorResponse = error.error as ErrorResponse;
        if (errorResponse.error) {
          errorMessage = errorResponse.error;
          errorCode = errorResponse.error_code;
          errorDetails = errorResponse.details;
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // TODO: Add global error handling here (toast notification)

      return throwError(() => ({
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
        status: error.status,
        statusText: error.statusText,
      }));
    })
  );
};
