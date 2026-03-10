You are an expert Angular architect specializing in modern Angular (v18–v20+), using standalone components, signals, functional patterns, and best practices for scalable, maintainable enterprise applications.

Your task is to generate a complete, production-ready Angular application structure (file tree + key code files) for an admin dashboard that manages Romanian taxpayers — both Persoana Fizică (individuals) and Persoana Juridică (legal entities/businesses).

The backend is a REST API called TaxChain (Actix-web + PostgreSQL) with the following endpoints (all JSON):

Base URL: http://localhost:8080 (or configurable via environment)

Individuals (Persoana Fizica) — prefix /persoana-fizica
• GET /persoana-fizica → list all (paged? → at least returns array)
• GET /persoana-fizica/:id → get one
• POST /persoana-fizica → create (body = PersoanaFizicaRequest)
• PUT /persoana-fizica/:id → update (body = partial update allowed)
• DELETE /persoana-fizica/:id → delete

Legal entities (Persoana Juridica) — prefix /persoana-juridica
(same CRUD pattern as above)

Important domain fields — use these TypeScript interfaces:

pub struct PersoanaFizica {
pub id: Uuid,

    #[validate(custom(function = "validate_cnp"))]
    pub cnp: String,

    #[validate(length(min = 1, max = 50, message = "Nume must be 1-50 characters"))]
    pub nume: String,

    #[validate(length(min = 1, max = 50, message = "Prenume must be 1-50 characters"))]
    pub prenume: String,

    #[validate(length(max = 30, message = "Prenume tata must be max 30 characters"))]
    pub prenume_tata: Option<String>,

    pub data_nasterii: NaiveDate,

    pub sex: Sex,

    #[validate(length(min = 1, max = 200, message = "Adresa must be 1-200 characters"))]
    pub adresa_domiciliu: String,

    #[validate(custom(function = "validate_cod_postal"))]
    pub cod_postal: Option<String>,

    #[validate(custom(function = "validate_iban"))]
    pub iban: String,

    #[validate(custom(function = "validate_telefon"))]
    pub telefon: Option<String>,

    #[validate(email(message = "Invalid email format"))]
    #[validate(length(max = 100, message = "Email must be max 100 characters"))]
    pub email: Option<String>,

    pub stare: StarePersoanaFizica,

    #[validate(length(max = 100, message = "Wallet must be max 100 characters"))]
    pub wallet: String,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

}

pub struct PersoanaJuridica {
pub id: Uuid,

    #[validate(custom(function = "validate_cod_fiscal"))]
    pub cod_fiscal: String,

    #[validate(length(min = 1, max = 200, message = "Denumire must be 1-200 characters"))]
    pub denumire: String,

    #[validate(custom(function = "validate_nr_reg_com"))]
    pub numar_de_inregistrare_in_registrul_comertului: String,

    #[validate(range(min = 1800, max = 2100, message = "An infiintare must be valid year"))]
    pub an_infiintare: i32,

    #[validate(length(min = 1, max = 200, message = "Adresa must be 1-200 characters"))]
    pub adresa_sediu_social: String,

    #[validate(custom(function = "validate_cod_postal"))]
    pub cod_postal: Option<String>,

    pub adresa_puncte_de_lucru: Option<Vec<String>>,

    #[validate(custom(function = "validate_iban"))]
    pub iban: String,

    #[validate(custom(function = "validate_telefon"))]
    pub telefon: Option<String>,

    #[validate(email(message = "Invalid email format"))]
    #[validate(length(max = 100, message = "Email must be max 100 characters"))]
    pub email: Option<String>,

    #[validate(custom(function = "validate_caen"))]
    pub cod_caen_principal: String,

    pub coduri_caen_secundare: Option<Vec<String>>,

    #[validate(range(min = 0, message = "Number of employees cannot be negative"))]
    pub numar_angajati: i32,

    #[validate(range(min = 1.0, message = "Capital social must be at least 1 RON"))]
    pub capital_social: f64,

    pub stare: StarePersoanaJuridica,

    #[validate(length(max = 100, message = "Wallet must be max 100 characters"))]
    pub wallet: Option<String>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

}

Requirements — follow these rules strictly:

1. Use **latest Angular best practices (v19/v20 style)**:
   - 100% standalone components (no NgModules at all)
   - input() / output() instead of @Input/@Output decorators
   - signals + computed() for state & derived state
   - ChangeDetectionStrategy.OnPush everywhere
   - inject() function instead of constructor DI
   - native control flow (@if, @for, @switch, @defer)
   - no ngClass / ngStyle — use class/style bindings
   - reactive forms (FormGroup + signal-based form state if possible)
   - no deprecated features

2. UI/UX style:
   - Modern, clean, professional admin dashboard look
   - Use **Tailwind CSS** classes (assume tailwind is configured)
   - OR use Angular Material + modern theme (your choice — state which one)
   - Sidebar navigation (collapsible on mobile)
   - Top bar with app name "TaxChain Admin", user menu (placeholder)
   - Light/dark mode toggle (simple implementation)
   - Responsive (mobile-friendly tables & forms)
   - Good accessibility: ARIA labels, keyboard navigation, sufficient contrast

3. Routing structure (lazy-loaded):
   - / → Dashboard overview (simple stats cards)
   - /persoane-fizice
     • list view (table + search + pagination if backend supports)
     • /persoane-fizice/new → create form
     • /persoane-fizice/:id → edit form + view details
   - /persoane-juridice (same structure)

4. Features to implement (at least):
   - Paginated & searchable list views (use query params: ?page=1&size=20&search=...)
   - Form validation matching backend (CNP, IBAN, phone, email, required fields)
   - Loading states + error toasts/notifications
   - Confirmation dialog before delete
   - Success/error feedback after CRUD operations
   - Table sorting (client-side if needed)

5. Folder structure suggestion (you can adapt):
   src/app/
   ├── core/ (auth, interceptors, guards — stub for now)
   ├── features/
   │ ├── persoana-fizica/
   │ │ ├── components/ (list, form, detail, card...)
   │ │ ├── services/
   │ │ └── persoana-fizica.routes.ts
   │ └── persoana-juridica/ (similar)
   ├── shared/ (ui components: table, form-field, button, toast...)
   ├── layout/ (sidebar, header, main layout)
   └── app.routes.ts

6. Generate code for (at minimum):
   - app.component.ts + html
   - main layout component with sidebar
   - persoana-fizica-list.component (table)
   - persoana-fizica-form.component (create & edit)
   - persoana-fizica.service.ts (HttpClient calls, signals for state)
   - routing configuration (provideRouter + lazy routes)

7. Use environment.ts for API base url
8. Add basic error handling & loading indicators
9. Prefer functional & declarative style over imperative

Please output:
• Recommended UI library choice (Tailwind, Material, other) and why
• Folder/file tree
• Key files with complete code (especially layout, list, form, service, routes)
• Brief explanation how to run it (ng new → copy files → ng serve)

Do NOT generate thousands of lines — focus on clean, representative, high-quality code for the core parts. Use modern Angular 20+ syntax only.
