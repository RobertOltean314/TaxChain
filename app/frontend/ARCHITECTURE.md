# 🏗️ Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ANGULAR FRONTEND                                │
│                         (Port 4200 / Port 80)                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP Requests
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            NGINX GATEWAY                                 │
│                              (Port 80)                                   │
│  Routes:                                                                 │
│    /api/v1/invoices    → invoice-service:8001                          │
│    /api/v1/calculate   → tax-calculation-service:8002                  │
│    /api/v1/entities    → business-entity-service:8003                  │
│    /api/v1/proof       → zk-proof-service:8004                         │
│    /api/v1/validate    → validation-service:8005                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │   Invoice    │  │   Tax Calc   │  │   Business   │
        │   Service    │  │   Service    │  │    Entity    │
        │  (Port 8001) │  │ (Port 8002)  │  │   Service    │
        │              │  │              │  │  (Port 8003) │
        │  Rust/Axum   │  │  Rust/Axum   │  │  Rust/Axum   │
        └──────────────┘  └──────────────┘  └──────────────┘
                    │               │               │
        ┌──────────────┐  ┌──────────────┐         │
        │   ZK Proof   │  │  Validation  │         │
        │   Service    │  │   Service    │         │
        │ (Port 8004)  │  │ (Port 8005)  │         │
        │              │  │              │         │
        │  Rust/Axum   │  │  Rust/Axum   │         │
        └──────────────┘  └──────────────┘         │
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                                    ▼
                        ┌──────────────────────┐
                        │   Shared Types       │
                        │   (common-types)     │
                        │   - ApiResponse<T>   │
                        │   - ErrorResponse    │
                        │   - CountryCode      │
                        │   - DTOs             │
                        └──────────────────────┘
```

## Angular Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ANGULAR APPLICATION                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                      APP COMPONENT                              │   │
│  │                         (Routes)                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                    ┌───────────────┼───────────────┐                   │
│                    │               │               │                    │
│  ┌─────────────────▼────┐  ┌──────▼────────┐  ┌──▼──────────────┐    │
│  │ Invoice Components   │  │ Tax Components│  │Entity Components│    │
│  │  - List              │  │  - Calculator │  │  - List         │    │
│  │  - Form              │  │  - Dashboard  │  │  - Form         │    │
│  │  - Details           │  │  - Reports    │  │  - Details      │    │
│  └──────────────────────┘  └───────────────┘  └─────────────────┘    │
│           │                         │                    │              │
│           └─────────────────────────┼────────────────────┘             │
│                                     │                                   │
│                                     ▼                                   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    HTTP INTERCEPTORS                            │   │
│  │  1. Logging Interceptor       (logs requests/responses)        │   │
│  │  2. Error Handler Interceptor (retry logic, error handling)    │   │
│  │  3. API Response Interceptor  (unwraps ApiResponse<T>)         │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                     │                                   │
│                                     ▼                                   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                      ANGULAR SERVICES                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │   │
│  │  │   Invoice    │  │   Tax Calc   │  │   Business   │         │   │
│  │  │   Service    │  │   Service    │  │    Entity    │         │   │
│  │  │              │  │              │  │   Service    │         │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │   │
│  │  ┌──────────────┐  ┌──────────────┐                           │   │
│  │  │   ZK Proof   │  │  Validation  │                           │   │
│  │  │   Service    │  │   Service    │                           │   │
│  │  └──────────────┘  └──────────────┘                           │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                     │                                   │
│                                     ▼                                   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                   TYPESCRIPT MODELS                             │   │
│  │  - Invoice Models       - Tax Models                            │   │
│  │  - Entity Models        - ZK Proof Models                       │   │
│  │  - Validation Models    - Common Models                         │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Request Flow

```
┌──────────────┐
│  Component   │  User clicks "Create Invoice"
└──────┬───────┘
       │
       │ 1. Call service method
       ▼
┌──────────────────────┐
│  InvoiceService      │  createInvoice(request)
│  .createInvoice()    │
└──────┬───────────────┘
       │
       │ 2. HTTP POST request
       ▼
┌──────────────────────┐
│ Logging Interceptor  │  Logs: "POST /api/v1/invoices"
└──────┬───────────────┘
       │
       │ 3. Continue request
       ▼
┌──────────────────────┐
│ Error Handler        │  Setup retry logic
│ Interceptor          │
└──────┬───────────────┘
       │
       │ 4. Send to backend
       ▼
┌──────────────────────┐
│  NGINX Gateway       │  Route to invoice-service:8001
└──────┬───────────────┘
       │
       │ 5. Forward request
       ▼
┌──────────────────────┐
│  Invoice Service     │  Process request
│  (Rust Backend)      │  Return ApiResponse<InvoiceResponse>
└──────┬───────────────┘
       │
       │ 6. Return response
       ▼
┌──────────────────────┐
│ API Response         │  Unwrap ApiResponse<T>
│ Interceptor          │  Extract 'data' field
└──────┬───────────────┘
       │
       │ 7. Return unwrapped data
       ▼
┌──────────────────────┐
│  Component           │  Receives InvoiceResponse directly
│  .subscribe()        │  Update UI
└──────────────────────┘
```

## Error Handling Flow

```
┌──────────────┐
│   Service    │  Makes HTTP request
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  Network Error       │  Connection failed
└──────┬───────────────┘
       │
       │ Caught by Error Handler Interceptor
       ▼
┌──────────────────────┐
│  Retry Logic         │  Attempt 1/3 (wait 1s)
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Retry Logic         │  Attempt 2/3 (wait 2s)
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Retry Logic         │  Attempt 3/3 (wait 4s)
└──────┬───────────────┘
       │
       │ Still failing
       ▼
┌──────────────────────┐
│  Error Response      │  Return formatted error
│                      │  { message, code, status }
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Component           │  Display error to user
│  .error()            │  Show notification
└──────────────────────┘
```

## Data Flow Example: Create Invoice → Calculate Tax

```
1. User fills invoice form
        │
        ▼
2. InvoiceService.createInvoice()
        │
        ▼
3. POST /api/v1/invoices
        │
        ▼
4. Backend creates invoice
        │
        ▼
5. Returns InvoiceResponse
        │
        ▼
6. Component receives invoice
        │
        ▼
7. TaxCalculationService.calculateTax()
        │
        ▼
8. POST /api/v1/calculate
        │
        ▼
9. Backend calculates tax
        │
        ▼
10. Returns TaxCalculationResponse
        │
        ▼
11. Component receives tax result
        │
        ▼
12. Display tax breakdown to user
```

## Feature Module Structure

Each feature module follows this pattern:

```
feature-name/
├── models/
│   └── feature-name.models.ts     (TypeScript interfaces)
├── services/
│   └── feature-name.service.ts    (Angular service)
└── index.ts                        (Barrel export)
```

Example for Invoice feature:

```
invoice/
├── models/
│   └── invoice.models.ts
│       - InvoiceType enum
│       - CreateInvoiceRequest interface
│       - InvoiceResponse interface
│       - LineItemDto interface
│       - BusinessEntityDto interface
│
├── services/
│   └── invoice.service.ts
│       - createInvoice()
│       - getInvoice()
│       - updateInvoice()
│       - deleteInvoice()
│       - listInvoices()
│       - validateInvoice()
│
└── index.ts
    - export * from './models/invoice.models';
    - export * from './services/invoice.service';
```

## Type Safety Flow

```
┌─────────────────────┐
│  Rust Backend       │
│  struct Invoice {   │
│    id: Uuid,        │
│    numar_serie: String,
│    ...             │
│  }                  │
└──────┬──────────────┘
       │
       │ Serialized to JSON
       ▼
┌─────────────────────┐
│  HTTP Response      │
│  {                  │
│    "id": "uuid",    │
│    "numar_serie": "INV-001",
│    ...             │
│  }                  │
└──────┬──────────────┘
       │
       │ Received by Angular
       ▼
┌─────────────────────┐
│ TypeScript          │
│ interface InvoiceResponse {
│   id: string;       │
│   numar_serie: string;
│   ...              │
│ }                   │
└──────┬──────────────┘
       │
       │ Type-checked at compile time
       ▼
┌─────────────────────┐
│ Runtime Validation  │
│ isInvoiceResponse() │
│ Type guard          │
└─────────────────────┘
```

## Complete Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND STACK                          │
├─────────────────────────────────────────────────────────────┤
│ - Angular 18+ (Standalone Components)                        │
│ - TypeScript 5+                                              │
│ - RxJS 7+ (Reactive Programming)                             │
│ - Tailwind CSS (Styling)                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      BACKEND STACK                           │
├─────────────────────────────────────────────────────────────┤
│ - Rust (Systems Programming)                                 │
│ - Axum (Web Framework)                                       │
│ - Tokio (Async Runtime)                                      │
│ - Serde (Serialization)                                      │
│ - Chrono (Date/Time)                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                            │
├─────────────────────────────────────────────────────────────┤
│ - Docker (Containerization)                                  │
│ - Docker Compose (Orchestration)                             │
│ - Nginx (Reverse Proxy & API Gateway)                        │
└─────────────────────────────────────────────────────────────┘
```

## Summary

- **5 Microservices** - Each with a dedicated Angular service
- **23 API Endpoints** - All integrated and type-safe
- **3 HTTP Interceptors** - Logging, Error Handling, Response Unwrapping
- **30+ TypeScript Interfaces** - Matching Rust DTOs exactly
- **Feature-based Architecture** - Clean separation of concerns
- **Production-ready** - Error handling, retry logic, validation
- **Romanian Localization** - CUI validation, tax rates, messages
