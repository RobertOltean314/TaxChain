Reprezintă entități individuale cu obligații fiscale.

### Subtipuri:

- [Proprietari De Bunuri](./Proprietari%20De%20Bunuri.md)
- [Persoane Fizice Cu Venituri](./Persoane%20Fizice%20Cu%20Venituri.md)

##### Pentru inregistrarea unei Persoane Fizice folosim o structura in genul acesta

```rust
pub struct PersoanaFizica {
    // Identificare
    pub tip: TipPersoanaFizica, // ex: proprietari de bunuri sau cu venituri
    pub reprezentatn: Reprezentant,

    pub cnp: String,
    pub nume: String,
    pub prenume: String,
    pub serie_act: String,
    pub numar_act: String,
    pub data_nasterii: DateTime<Utc>,
    pub cetatenie: Cetatenie, // ex: "RO", "MD", sau altele
    pub adresa_domiciliu: String,
    pub rezident: bool,
    pub adresa_domiciliu: Adresa, // to be implemented

    // Sediul profesional
    pub adresa_sediu: Adresa,
    pub dovada_drept_folosinta: TipDovada, // ex: Contract, Comodat

    // Activitate
    pub forma_organizare: FormaOrganizare, // PFA, II, IF
    pub cod_caen: String,
    pub data_inregistrare: DateTime<Utc>,
    pub euid: Option<String>,
    pub nr_ordine_reg_comert: Option<String>,
    pub platitor_tva: bool,

    // Stare și înregistrare
    pub stare_fiscala: StareFiscala, // Activ, Inactiv, Suspendat
    pub inregistrat_in_spv: bool,
}
```

aici definim structurile ajutatoare:

```rust

pub enum TipPersoanaFizica {
    ProprietarBunuri,
    VenituriIndependente,
    ProfesiiLibere,
    DrepturiAutor
}
```

```rust
    pub enum FormaOrganizare {
        PFA,
        II, // Intreprindere Individuala
        IF, // Intreprindere Familiala
    }
```

```rust
    pub enum Cetatenie {
        RO,
        MD,
        etc,
    }
```

```rust
pub enum StareFiscala {
    Activ,
    Inactiv,
    Suspendat
}

```

To be later added:

- WalletID

[Pagina Principala](../Entity.md)
