# TaxChain — Product Roadmap & Migration Plan

> Living document. Update at each phase boundary.
> Last updated: Phase 8 partially complete (eFactura + Reports done). Phase 9–11 remain.

---

## Current State (as of Phase 8 partial)

### What exists

- **Auth:** JWT, Google OAuth, SIWE wallet login. Custodial wallet generation for Google users.
- **Entities:** Full CRUD for `PersoanaFizica` and `PersoanaJuridica` with JWT middleware and role guards.
  - All three roles (Admin, Taxpayer, Auditor) can list PF/PJ (`GET /persoana-fizica`, `GET /persoana-juridica`).
  - Create/edit restricted to Admin only.
- **Entity management:** `accountant_entity` table — all roles manage a list of active PF/PJ entities. Active entity injected as `X-Entity-Id` / `X-Entity-Type` headers.
- **Partners:** `partener` table + CRUD handlers.
- **Invoices:** Full lifecycle (Draft → Issued → Sent → Paid / Cancelled). Payment tracking, status transitions, transaction type (Income / Expense).
- **Invoice upload:** XML (UBL 2.1 / eFactura format) + PDF (pdfjs-dist, best-effort). Pre-fills invoice form.
- **eFactura:** UBL 2.1 XML generation + mock ANAF submission + status polling (`/efactura/*`).
- **Reports:** Period filter (All / Year / Quarter / Month), VAT ledger, D394 CSV + PDF export.
- **BNR exchange rates:** Live EUR/USD rates from BNR XML feed, cached in `curs_valutar` table.
  - Multi-currency invoices converted to RON at BNR rate in all aggregations (dashboard + reports).
  - Dedicated `reqwest` client with `danger_accept_invalid_certs(true)` for BNR's occasionally expired cert.
- **Frontend:** React 19 / TypeScript / Vite / Tailwind. All pages wired to backend.
- **Docker:** All three services containerized.

### Known issues / technical debt

| Item | Priority | Status |
|---|---|---|
| `PersoanaJuridicaRequest` has no validation attributes | High | Open |
| Taxpayer can still navigate to PF/PJ list pages (no route guard) | High | Open |
| No onboarding flow for unlinked users | High (Phase 6A blocker) | Open |
| GDPR: CNP, IBAN in DB, right to erasure not implemented | High (thesis risk) | Open |
| Dashboard fetches all invoices client-side for stats — no server aggregation | Medium | Open |
| `from_request` uses `.clone()` on `Copy` primitives | Low | Open |
| `App.tsx` / `App.css` Vite defaults still in repo | Low | Open |

---

## The Accountant Mental Model

TaxChain replaces SmartBill. An accountant's daily reality:

```
Login → land in YOUR company workspace
  ↓
Issue invoices to clients  /  record bills from suppliers
  ↓
Track payment status (paid / overdue / partial)
  ↓
Summarize VAT position for the period
  ↓
Export D300 / D394 declarations
  ↓
Optionally anchor invoice hashes on-chain for audit proof
```

The PF/PJ screens are **admin tools**, not the accountant's workspace.

---

## Role-Aware Navigation

| Screen | Admin | Taxpayer | Auditor |
|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ |
| Invoices (own) | ✓ | ✓ | read |
| Partners (own) | ✓ | ✓ | read |
| Reports / VAT ledger | ✓ | ✓ | read |
| PF/PJ entity list | ✓ | ✓ (list only) | ✓ |
| PF/PJ create/edit | ✓ | ✗ | ✗ |
| Entity management | ✓ | ✓ | ✓ |
| User management | ✓ | ✗ | ✗ |
| On-chain audit dashboard | ✓ | ✓ | ✓ |

---

## Phase 6 — React Client: Accounting Workspace ✅ (mostly complete)

**Goal:** Build the UI that a Taxpayer uses day-to-day.

### 6A — Onboarding flow 🔲 (planned)

- After first login, if user has no linked entity, redirect to `/onboarding`.
- Screen: "PFA (individual) or SRL/SA (company)?" → fill PF or PJ form → create → link.
- Calls `POST /auth/link-entity` (Phase 6B) to set the FK on the `users` row and re-issue tokens.

### 6B — `POST /auth/link-entity` 🔲 (planned)

```
POST /auth/link-entity
Body: { entity_type: "PF" | "PJ", entity_id: UUID }
Auth: any authenticated user (links to themselves only)
Effect: inserts into accountant_entity, re-issues tokens with updated claims
```

### 6C — Role-aware sidebar + route guards 🔲 (partial)

- Sidebar items already conditionally rendered based on role.
- `ProtectedRoute` exists but Taxpayer can still reach PF/PJ admin pages — needs guard.

### 6D — Accounting dashboard ✅

- Stat cards: receivables, overdue count, VAT this quarter, income, expenses, net, partner count.
- Multi-currency: EUR/USD converted to RON at live BNR rate.
- Recent invoices list with status badges.
- Currency note shown when non-RON invoices exist.

### 6E — Invoice workspace UI ✅

- List page with status filter.
- Create/edit form with line items, VAT per line, auto-computed totals.
- Detail page: status transitions, payment recording.
- Invoice upload: XML (UBL 2.1) + PDF → pre-fill form.

### 6F — Invoice auto-numbering ✅

- `GET /factura/next-number?series=FC` implemented.

### 6G — Partner workspace UI ✅

- List + create/edit pages.

---

## Phase 7 — VAT Ledger & Tax Calculations ✅ (complete)

### What was built

- `GET /reports/vat-summary` backend endpoint (live SQL aggregation by VAT rate).
- Reports page: period filter (All / Year / Quarter / Month), VAT summary by rate, income vs expense breakdown.
- D394 CSV export (partner CIF, invoice number, value, VAT).
- PDF export via browser print dialog.
- All aggregations use `toRON(amount, currency)` to convert EUR/USD at live BNR rates.

---

## Phase 8 — ANAF e-Factura Mock ✅ (complete)

### What was built

- UBL 2.1 XML generation from invoice data (`/efactura/generate/:id`).
- Mock ANAF submission (`POST /efactura/submit/:id`) — stores `efactura_index` + `efactura_status` on `factura` row.
- Status polling (`GET /efactura/status/:id`).
- CIF-based lookup (`GET /efactura/by-cif/:cif`).
- Frontend: "Trimite la e-Factura" button on invoice detail page.

---

## Phase 9 — ZK Proof Generation 🔲

**Goal:** The thesis-differentiating feature. Prove tax compliance without revealing invoice details.

### What problem it solves

GDPR conflict: raw invoice data (partner CNP, amounts) cannot go on a public blockchain. ZK proofs let you prove "the sum of VAT in Q1 2025 is X" without revealing individual invoice data.

### Candidate proving systems

- **Groth16 via `ark-groth16`** (arkworks-rs) — most mature Rust ZK library, smaller proofs, trusted setup required.
- **Recommendation:** Groth16 with a toy trusted setup for thesis demo.

### Circuits to implement

1. **VAT compliance proof:** "N invoices in period P, total VAT = X, all from entity E" — without revealing individual amounts.
2. **Invoice existence proof:** "Invoice with hash H exists and has status Paid" — without revealing contents.

### Implementation plan

```
server/src/zk/
  mod.rs
  circuit_vat_summary.rs   -- arkworks circuit
  prover.rs                -- generate proof from private inputs
  verifier.rs              -- verify proof (used by audit dashboard)
  public_inputs.rs         -- period, entity, totals commitment
```

### GDPR mitigation

- **On-chain:** proof hash + public inputs only (period, entity wallet, VAT commitment). No CNP, no IBAN.
- **Off-chain:** full invoice data stays in DB.
- **Right to erasure:** on-chain proof is a commitment, not personal data. Underlying DB rows can be deleted.

---

## Phase 10 — On-Chain Invoice Anchoring 🔲

**Goal:** Anchor invoice hashes on Sepolia testnet for an immutable audit trail.

### What gets anchored

- SHA-256 hash of canonical invoice JSON (header + sorted lines).
- Via a minimal `InvoiceRegistry` smart contract (Solidity).

### Smart contract

```solidity
contract InvoiceRegistry {
    event InvoiceAnchored(
        address indexed issuer,
        bytes32 indexed invoiceHash,
        uint256 timestamp
    );

    function anchor(bytes32 invoiceHash) external {
        emit InvoiceAnchored(msg.sender, invoiceHash, block.timestamp);
    }
}
```

### Backend integration

- New module: `server/src/blockchain/anchor.rs` using `ethers-rs`.
- Google (custodial) users: sign tx server-side with decrypted key.
- Wallet users: return unsigned tx for frontend to sign via wagmi/viem.

### DB additions

```sql
ALTER TABLE factura ADD COLUMN tx_hash VARCHAR(66);
ALTER TABLE factura ADD COLUMN block_number BIGINT;
ALTER TABLE factura ADD COLUMN anchored_at TIMESTAMPTZ;
```

### Frontend

- Invoice detail: "Not anchored" / "Pending" / "Anchored (block #XXXXX)" + Etherscan link.
- "Anchor this invoice" button (Issued+ status only).

---

## Phase 11 — Immutable Audit Trail + ZK Audit Dashboard 🔲

**Goal:** Combine Phases 9 and 10 into the thesis showcase.

### What the auditor sees

- Timeline of all on-chain anchoring events for an entity.
- Per anchored invoice: hash, block, timestamp, Etherscan link.
- ZK proof verification: paste proof + public inputs → "Valid for entity X, period Y, VAT total Z."
- Compliance score / audit trail completeness indicator.

### What this proves for the thesis

1. Invoices cannot be backdated (anchoring timestamp is immutable).
2. Tax totals provable without revealing individual invoice data (ZK).
3. GDPR respected (no personal data on-chain).
4. Interoperable with ANAF's e-Factura direction (UBL 2.1 XML generation).

---

## Deferred / Out of Scope for Thesis

- **Real ANAF SPV submission** — requires qualified digital signature hardware.
- **D300 XML electronic filing** — same blocker.
- **Supplier invoice tracking (payables)** — partial (Expense transaction type exists; no dedicated payables flow).
- **Mobile app** — post-thesis.
- **Production smart contract audit** — InvoiceRegistry is a demo contract.

---

## API Route Reference (current, complete)

```
POST   /auth/google
GET    /auth/wallet/nonce?address=
POST   /auth/wallet/verify
POST   /auth/refresh
POST   /auth/logout
POST   /auth/link-entity              ← Phase 6B (planned)

GET    /persoana-fizica
GET    /persoana-fizica/:id
POST   /persoana-fizica
PUT    /persoana-fizica/:id
DELETE /persoana-fizica/:id

GET    /persoana-juridica
GET    /persoana-juridica/:id
POST   /persoana-juridica
PUT    /persoana-juridica/:id
DELETE /persoana-juridica/:id

GET    /partener                      ← scoped to authenticated user
GET    /partener/:id
POST   /partener
PUT    /partener/:id
DELETE /partener/:id

GET    /factura                       ← scoped to authenticated user
GET    /factura/:id                   ← returns { invoice, lines }
GET    /factura/next-number?series=FC
POST   /factura
PUT    /factura/:id
PATCH  /factura/:id/status
PATCH  /factura/:id/payment
DELETE /factura/:id

GET    /efactura/generate/:id         ← returns UBL 2.1 XML
POST   /efactura/submit/:id           ← mock ANAF submission
GET    /efactura/status/:id
GET    /efactura/by-cif/:cif

GET    /entitate                      ← list entities for current user
POST   /entitate                      ← add entity to user's list
DELETE /entitate/:entity_type/:entity_id

GET    /curs-bnr?currency=EUR&date=   ← BNR exchange rate (public, no auth)

GET    /reports/vat-summary?period=   ← VAT ledger by rate and transaction type
```

---

## DB Migration Files (current)

```
server/migrations/
  taxchain.session.sql              ← base schema: PF, PJ, enums, reprezentanti
  phase_01_migrations.sql           ← auth tables: users, auth_nonces, refresh_tokens
  03_invoice_tables.sql             ← partener, factura, factura_linie
  04_anaf_mock.sql                  ← eFactura columns on factura
  05_add_invoice_transaction_type.sql ← tip_tranzactie enum (no-op if 03 already applied)
  06_entity_management.sql          ← accountant_entity table, curs_valutar cache table
```

Planned:

```
  phase_09_zk.sql                   ← zk_proofs table (proof hash, public inputs, period)
  phase_10_blockchain.sql           ← ALTER factura ADD tx_hash, block_number, anchored_at
```

---

## Naming Conventions (enforced throughout)

| Context | Convention | Example |
|---|---|---|
| Rust structs / enums | PascalCase English | `PartnerType`, `InvoiceStatus` |
| Rust fields | snake_case English | `created_by`, `partner_id` |
| DB tables | Romanian snake_case | `factura`, `partener`, `persoana_fizica` |
| DB columns | Romanian snake_case | `denumire`, `data_emitere`, `cod_fiscal` |
| API routes | Romanian kebab-case | `/partener`, `/persoana-fizica`, `/factura` |
| Frontend TypeScript | camelCase / matches API | `denumire`, `codFiscal` via Zod |
| Enum DB variants | PascalCase Romanian | `Client`, `Furnizor`, `Ambele` |
| UI labels | Romanian language | "Factură", "Partener", "TVA Colectat" |

---

## Critical Implementation Patterns

### sqlx + rust_decimal

`rust_decimal` feature is **not** enabled in sqlx. Always use:
```rust
// In row struct:
struct MyRow { amount: String }

// In SQL:
SELECT amount::text AS amount FROM ...

// In mapping:
Decimal::from_str(&row.amount).unwrap_or(Decimal::ZERO)

// In INSERT:
.bind(decimal_value.to_string())  // with $N::numeric cast in SQL
```

### Multi-currency aggregation

All money aggregations (dashboard stats, reports, D394 export) must convert to RON:
```ts
function toRON(amount: number, currency: string): number {
  if (currency === "EUR") return amount * eurRate;
  if (currency === "USD") return amount * usdRate;
  return amount;
}
```
Pass `toRON` as a parameter to any function that sums invoice amounts.

### EntityProvider auth gate

Any React provider making authenticated API calls must check auth state first:
```tsx
useEffect(() => {
  if (authLoading) return;       // wait for auth to settle
  if (!user) { setEntities([]); setIsLoading(false); return; }
  refreshEntities().finally(() => setIsLoading(false));
}, [user?.id, authLoading]);
```
Failing to gate causes: API call → 401 → redirect to /login → page reload → repeat (infinite loop).
