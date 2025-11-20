Entități cu personalitate juridică și scop lucrativ.

### Subtipuri:

- [[Societati Comerciale]]
- [[Companii Nationale]]

```rust
    pub PersoanaJuridica {
        // Pentru SRL
        pub cui: String,
        pub cif: String,
        pub denumire: String,
        pub nr_registru_comert: String,
        pub adresa: Adress,
        pub capital_social: f64 // Optional???
        pub cod_caen: String/Enum,
        pub platitor_tva: bool,
        pub reprezentanti: Vec<Reprezentant> // to be seen


        // Datele de identificare a administratorului
        pub cnp: String,
        pub nume: String
        pub prenume: String,
        pub tip_act_identitate: CI, BI sau Pasaport,
        pub numar_act_identitate: String,
        pub serie_act_identitate: String,
        pub calitate: ReprezentantLegal, Inputernicit, ReprezentatDesemnat, NumePropriu
        pub numar_telefon: String,
        pub email: String,
    }

```

[Pagina Principala](../Entity.md)
