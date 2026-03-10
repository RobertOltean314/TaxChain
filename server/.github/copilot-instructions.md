# TaxChain Server — AI Coding Agent Instructions

## Project Overview

**TaxChain** is a Rust-based tax management backend using Actix-web REST API with PostgreSQL. It manages two Romanian taxpayer entity types: **PersoanaFizica** (individuals) and **PersoanaJuridica** (businesses). The codebase follows a **layered architecture** (handlers → services → repositories → database).

## Core Architecture

### Layered Design Pattern

- **Handlers** (`src/handlers/`): HTTP request routing & validation (Actix-web)
- **Services** (`src/services/`): Business logic & repository traits (async trait pattern)
- **Models** (`src/models/`): Domain structs with `#[derive(Validate)]` for input validation
- **Validators** (`src/validators/`): Custom validation rules (CNP, IBAN, phone, postal codes)
- **Database**: PostgreSQL with raw SQL queries (not ORM)

### Key Design Decisions

1. **Repository Pattern**: Abstract `PersoanaFizicaRepository` trait + `PgPersoanaFizicaRepository` concrete impl. Type alias `DynPersoanaFizicaRepository = Arc<dyn PersoanaFizicaRepository>` enables mocking in tests.
2. **Enum-to-String Mapping**: Database stores enums (Sex, StarePersoanaFizica) as strings; conversion happens in `row_to_model()` and `*_str()` helper functions.
3. **Request/Domain Separation**: `PersoanaFizicaRequest` for input, `PersoanaFizica` for domain model; `from_request()` method converts between them with auto-generated UUIDs and timestamps.
4. **Validation Stacking**: Decorator pattern using `#[validate(...)]` attributes on structs + custom validators (`validate_cnp`, `validate_iban`).

## Critical Patterns & Conventions

### Adding a New Entity (e.g., PersoanaJuridica)

1. Create model in `src/models/persoana_juridica_model.rs` with `#[validate]` attributes
2. Implement `PersoanaJuridica` struct + `PersoanaJuridicaRequest`
3. Create `PersoanaJuridicaRepository` trait in `src/services/persoana_juridica_service.rs`
4. Implement `PgPersoanaJuridicaRepository` with DB row mapping logic
5. Create CRUD handlers in `src/handlers/persoana_juridica_handlers.rs` (mirror PersoanaFizica pattern)
6. Add route scope in `main.rs`: `web::scope("/persoana-juridica").service(...)`
7. Export from module files (`mod.rs`)

### Validation Workflow

**Never skip validator calls**—every handler checks `body.validate()` before processing:

```rust
if let Err(errors) = body.validate() {
    return HttpResponse::BadRequest().body(errors.to_string());
}
```

Custom validators in `src/validators/common.rs` use `lazy_static!` regex for performance:

- **CNP**: Romanian Personal ID (12 digits, country-specific checksum)
- **IBAN**: Romanian format `RO##XXXX##########` + mod-97 checksum
- **Telefon**: E.164-like format `+40/0 7########`
- **Cod Postal**: 6-digit postal code

### Error Handling Pattern

Return structured JSON with error details in all handlers:

```rust
Err(e) => {
    eprintln!("Operation error: {e}");
    let error_body = json!({"error": "User-friendly message", "details": e.to_string()});
    HttpResponse::InternalServerError().json(error_body)
}
```

### Database Row Deserialization

Use intermediate row struct (e.g., `PersoanaFizicaRow`) with `#[derive(sqlx::FromRow)]` to safely convert database strings to domain enums via helper function:

```rust
#[derive(sqlx::FromRow)]
struct PersoanaFizicaRow { /* ...fields... */ }

fn row_to_model(row: PersoanaFizicaRow) -> Result<PersoanaFizica, sqlx::Error> {
    let sex = match row.sex.as_str() { "M" => Sex::M, "F" => Sex::F, _ => Err(...) };
    // ...reassemble domain model...
}
```

## Build & Test Commands

```bash
# Run server (requires DATABASE_URL env var)
cargo run

# Execute tests (spawns in-memory DB if available)
cargo test --package taxchain --test test_persoana_fizica -- --nocapture

# Build release
cargo build --release
```

**Critical**: `DATABASE_URL` must be set (parsed in `main.rs`) or the app fails with "Failed to connect to the database".

## Project-Specific Dependencies

- **actix-web 4.13**: HTTP framework
- **sqlx 0.8**: Database driver with runtime-tokio + PostgreSQL
- **uuid 1.0**: Auto-generated IDs
- **chrono 0.4**: Timestamps (NaiveDate for dates, DateTime<Utc> for created_at/updated_at)
- **validator 0.18**: Declarative validation with custom rules
- **regex 1.10**: URL pattern matching (lazy_static-cached)

## File Organization & Typical Naming

- Models: `PersoanaFizica` (CamelCase) + `PersoanaFizicaRequest`
- Handlers: `find_all_*`, `get_*_by_id`, `create_*`, `update_*`, `delete_*` (REST pattern)
- Services: `*Repository` trait + `Pg*Repository` impl
- Validators: `validate_*` functions returning `Result<(), ValidationError>`
- Tests: `tests/test_*.rs` (integration tests, not unit tests in `/src`)

## Common Pitfalls

1. **Forgetting `.await`** on async repository calls → compilation error
2. **Missing `#[validate]` checks** in handlers → accepts invalid data
3. **String enum comparison** without proper mapping → runtime decode errors
4. **Unhandled `Option<T>` fields** (e.g., `prenume_tata`, `telefon`) → panic
5. **Module exports not in `mod.rs`** → private visibility issues
