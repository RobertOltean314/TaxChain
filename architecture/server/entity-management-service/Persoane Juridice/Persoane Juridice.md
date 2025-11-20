Entități cu personalitate juridică și scop lucrativ.

### Subtipuri:

- [[Societati Comerciale]]
- [[Companii Nationale]]

```rust
pub struct PersoanaJuridica {
    pub cui: String,
    pub denumire: String,
    pub nr_reg_comert: String,
    pub cod_caen: String,
    pub obiect_de_activitate: String,
    pub sediu_social: Address,
    pub capital_social: f64,
    pub durata_functionare: Option<String>,
    pub administratori: Vec<Reprezentant>,
    pub asociati: Vec<Reprezentant>,
    pub platitor_tva: bool,
    pub stare_fiscala: StareFiscala,
    pub data_inregistrare: DateTime<Utc>,
    pub euid: Option<String>,
}


```

[Pagina Principala](../Entity.md)
