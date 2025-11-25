# Entity Management Service

## Acesta este serviciul responsabil pentru gestionarea entităților fiscale din sistem

Pentru a putea inregistra diferiti contribuabili cu obligatiile lor fiscale, folosim o structura in acest fel:

```rust
pub struct InregistrareFiscala {
	contribuabil: Contribuabil,
	obligatii: ObligatiiFiscale,
}
```

in care definim entitatea de Contribuabil sub forma unui Enum astfel:

```rust
pub enum Contribuabil {
	PersoanaFizica(Persoane Fizice),
	PersoanaJuridica(PersoanaJuridica),
	Ong(Ong),
	InstitutiiPublice(InstitutiiPublice),
	EntitatiStraine(EntitatiStraine),
	Others(???), // aici mai trebuie gandit putin
}
```

tipurile de contribuabili existente pot fi gasite in fisierul lor specific:

1. [Persoane Fizice](./Persoane%20Fizice/Persoane%20Fizice.md)
2. [Persoane Juridice](./Persoane%20Juridice/Persoane%20Juridice.md)
3. [ONGs](./ONGs/ONGs.md)
4. [Institutii Publice](./Institutii%20Publice/Institutii%20Publice.md)
5. [Entitati Straine](./Entitati%20Straine/Entitati%20Straine.md)
6. [Others](./Others/Others.md)

iar Obligatiile Fiscale sunt o structura generica pentru toate tipurile de contribuabili pe care le definim astfel:

```rust
pub struct ObligatiiFiscale {
    impozit_pe_venit: bool,
    cas: bool,
    cass: bool,
    tva: bool,
    alte_obligatii: String
}
```

am definit mai multe modele care sunt folosite in structurile noastre, precum:

```rust

pub struct Adresa {
    pub tara: String,           // default "Romania"
    pub judet: String,
    pub localitate: String,
    pub cod_postal: Option<String>,
    pub strada: String,
    pub numar: String,
    pub bloc: Option<String>,
    pub scara: Option<String>,
    pub etaj: Option<String>,
    pub apartament: Option<String>,
}

```

si un enum pentru tipurile de contracte de comodat pentru Persoane Fizice si/sau Juridice:

```rust
pub enum TipDovada {
    ContractChirie,
    Comodat,
    Proprietate,
    Other,
}
```

```rust
pub struct Reprezentant {
    pub cnp: String,
    pub nume: String,
    pub prenume: String,
    pub tip_act_identitate: TipActIdentitate,
    pub serie_act_identitate: String,
    pub numar_act_identitate: String,
    pub calitate: CalitateReprezentant,
    pub telefon: String,enti
    pub email: String,
    pub data_nasterii: Option<DateTime<Utc>>,
    pub adresa_domiciliu: Adresa,
}

```
