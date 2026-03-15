use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DocumentType {
    Fiscala,
    Proforma,
    NoteDeCredit,
    Chitanta,
    AvizDeExpeditie,
}

impl Default for DocumentType {
    fn default() -> Self {
        DocumentType::Fiscala
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum InvoiceStatus {
    Draft,
    Emisa,
    Trimisa,
    Platita,
    Anulata,
}

impl InvoiceStatus {
    pub fn can_transition_to(&self, next: InvoiceStatus) -> bool {
        matches!(
            (self, next),
            (InvoiceStatus::Draft, InvoiceStatus::Emisa)
                | (InvoiceStatus::Draft, InvoiceStatus::Anulata)
                | (InvoiceStatus::Emisa, InvoiceStatus::Trimisa)
                | (InvoiceStatus::Emisa, InvoiceStatus::Anulata)
                | (InvoiceStatus::Trimisa, InvoiceStatus::Platita)
                | (InvoiceStatus::Trimisa, InvoiceStatus::Anulata)
        )
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CotaTva {
    Standard, // 21%
    Redusa9,  // 9%
    Redusa5,  // 5%
    Scutit,   // 0%
}

impl Default for CotaTva {
    fn default() -> Self {
        Self::Standard
    }
}

impl CotaTva {
    pub fn procent(&self) -> Decimal {
        match self {
            CotaTva::Standard => Decimal::new(21, 2),
            CotaTva::Redusa9 => Decimal::new(9, 2),
            CotaTva::Redusa5 => Decimal::new(5, 2),
            CotaTva::Scutit => Decimal::ZERO,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Invoice {
    pub id: Uuid,

    pub numar: String,
    pub serie: Option<String>,
    pub tip_document: DocumentType,
    pub stare: InvoiceStatus,

    pub data_emitere: NaiveDate,
    pub data_scadenta: Option<NaiveDate>,
    pub data_livrare: Option<NaiveDate>,

    pub emitent_pf_id: Option<Uuid>,
    pub emitent_pj_id: Option<Uuid>,

    pub partener_id: Uuid,

    pub moneda: String,
    pub total_fara_tva: Decimal,
    pub total_tva: Decimal,
    pub total_cu_tva: Decimal,
    pub suma_platita: Decimal,
    pub rest_de_plata: Decimal,

    pub factura_referinta_id: Option<Uuid>,

    pub observatii: Option<String>,
    pub conditii_plata: Option<String>,

    pub created_by: Uuid,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InvoiceRow {
    pub id: Uuid,
    pub factura_id: Uuid,

    pub pozitie: i16,
    pub denumire: String,
    pub cod_produs: Option<String>,
    pub um: String,

    pub cantitate: Decimal,
    pub pret_unitar: Decimal,
    pub discount_procent: Decimal,

    pub cota_tva: CotaTva,

    pub valoare_fara_tva: Decimal,
    pub valoare_tva: Decimal,
    pub valoare_cu_tva: Decimal,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl InvoiceRow {
    pub fn recompute_totals(&mut self) {
        let hundred = Decimal::new(100, 0);
        let discount_factor = (hundred - self.discount_procent) / hundred;
        self.valoare_fara_tva = (self.cantitate * self.pret_unitar * discount_factor).round_dp(2);
        self.valoare_tva = (self.valoare_fara_tva * self.cota_tva.procent()).round_dp(2);
        self.valoare_cu_tva = self.valoare_fara_tva + self.valoare_tva;
    }
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct InvoiceRequest {
    #[validate(length(min = 1, max = 50, message = "Numar must be 1-50 characters"))]
    pub numar: String,

    #[validate(length(max = 20, message = "Serie max 20 characters"))]
    pub serie: Option<String>,

    pub tip_document: Option<DocumentType>,

    pub data_emitere: NaiveDate,
    pub data_scadenta: Option<NaiveDate>,
    pub data_livrare: Option<NaiveDate>,

    /// Set for PF issuers
    pub emitent_pf_id: Option<Uuid>,
    /// Set for PJ issuers
    pub emitent_pj_id: Option<Uuid>,

    pub partener_id: Uuid,

    #[validate(length(min = 1, max = 3, message = "Moneda must be 3 characters (e.g. RON)"))]
    pub moneda: Option<String>,

    /// Optional — used for partial payment updates
    pub suma_platita: Option<Decimal>,

    pub factura_referinta_id: Option<Uuid>,

    #[validate(length(max = 2000, message = "Observatii max 2000 characters"))]
    pub observatii: Option<String>,

    #[validate(length(max = 200, message = "Conditii plata max 200 characters"))]
    pub conditii_plata: Option<String>,

    #[validate(nested)]
    pub linii: Vec<InvoiceRowRequest>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct InvoiceRowRequest {
    pub pozitie: Option<i16>,

    #[validate(length(min = 1, max = 300, message = "Denumire must be 1-300 characters"))]
    pub denumire: String,

    #[validate(length(max = 100, message = "Cod produs max 100 characters"))]
    pub cod_produs: Option<String>,

    #[validate(length(min = 1, max = 20, message = "UM must be 1-20 characters"))]
    pub um: Option<String>,

    pub cantitate: Decimal,
    pub pret_unitar: Decimal,
    pub discount_procent: Option<Decimal>,
    pub cota_tva: Option<CotaTva>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InvoiceStatusRequest {
    pub stare: InvoiceStatus,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct InvoiceToBePaidRequest {
    pub suma: Decimal,
}

impl Invoice {
    pub fn from_request(req: &InvoiceRequest, created_by: Uuid) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            numar: req.numar.clone(),
            serie: req.serie.clone(),
            tip_document: req.tip_document.unwrap_or_default(),
            stare: InvoiceStatus::Draft,
            data_emitere: req.data_emitere,
            data_scadenta: req.data_scadenta,
            data_livrare: req.data_livrare,
            emitent_pf_id: req.emitent_pf_id,
            emitent_pj_id: req.emitent_pj_id,
            partener_id: req.partener_id,
            moneda: req.moneda.clone().unwrap_or_else(|| "RON".to_string()),
            total_fara_tva: Decimal::ZERO,
            total_tva: Decimal::ZERO,
            total_cu_tva: Decimal::ZERO,
            suma_platita: Decimal::ZERO,
            rest_de_plata: Decimal::ZERO,
            factura_referinta_id: req.factura_referinta_id,
            observatii: req.observatii.clone(),
            conditii_plata: req.conditii_plata.clone(),
            created_by,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn update_from_request(existing: &Invoice, req: &InvoiceRequest) -> Self {
        let now = Utc::now();
        Self {
            id: existing.id,
            numar: req.numar.clone(),
            serie: req.serie.clone(),
            tip_document: req.tip_document.unwrap_or(existing.tip_document),
            stare: existing.stare,
            data_emitere: req.data_emitere,
            data_scadenta: req.data_scadenta,
            data_livrare: req.data_livrare,
            emitent_pf_id: req.emitent_pf_id,
            emitent_pj_id: req.emitent_pj_id,
            partener_id: req.partener_id,
            moneda: req
                .moneda
                .clone()
                .unwrap_or_else(|| existing.moneda.clone()),
            total_fara_tva: existing.total_fara_tva,
            total_tva: existing.total_tva,
            total_cu_tva: existing.total_cu_tva,
            suma_platita: req.suma_platita.unwrap_or(existing.suma_platita),
            rest_de_plata: existing.rest_de_plata,
            factura_referinta_id: req.factura_referinta_id,
            observatii: req.observatii.clone(),
            conditii_plata: req.conditii_plata.clone(),
            created_by: existing.created_by,
            created_at: existing.created_at,
            updated_at: now,
        }
    }
}

impl InvoiceRow {
    pub fn from_request(req: InvoiceRowRequest, factura_id: Uuid, pozitie: i16) -> Self {
        let now = Utc::now();
        let mut linie = Self {
            id: Uuid::new_v4(),
            factura_id,
            pozitie: req.pozitie.unwrap_or(pozitie),
            denumire: req.denumire,
            cod_produs: req.cod_produs,
            um: req.um.unwrap_or_else(|| "buc".to_string()),
            cantitate: req.cantitate,
            pret_unitar: req.pret_unitar,
            discount_procent: req.discount_procent.unwrap_or(Decimal::ZERO),
            cota_tva: req.cota_tva.unwrap_or_default(),
            valoare_fara_tva: Decimal::ZERO,
            valoare_tva: Decimal::ZERO,
            valoare_cu_tva: Decimal::ZERO,
            created_at: now,
            updated_at: now,
        };
        linie.recompute_totals();
        linie
    }
}
