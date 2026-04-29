use std::str::FromStr;
use std::sync::Arc;

use chrono::NaiveDate;
use rust_decimal::Decimal;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::models::proof_model::FiscalProof;

// ── Internal DB row (all numerics as ::text per project sqlx pattern) ─────────

#[derive(FromRow)]
struct ProofRow {
    id: Uuid,
    user_id: Uuid,
    entity_type: String,
    entity_id: Uuid,
    entity_name: String,
    entity_fiscal_code: String,
    period_from: NaiveDate,
    period_to: NaiveDate,
    vat_colectat: String,
    vat_deductibil: String,
    vat_net: String,
    venituri_brute: String,
    cheltuieli_brute: String,
    cas: String,
    cass: String,
    impozit_venit: String,
    impozit_profit: String,
    total_obligatii: String,
    proof_hash: String,
    period_hash: String,
    tx_hash: String,
    block_number: i64,
    anchored_at: chrono::DateTime<chrono::Utc>,
    created_at: chrono::DateTime<chrono::Utc>,
    is_zk: bool,
}

fn row_to_proof(r: ProofRow) -> FiscalProof {
    let dec = |s: String| Decimal::from_str(&s).unwrap_or(Decimal::ZERO);
    FiscalProof {
        id: r.id,
        user_id: r.user_id,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        entity_name: r.entity_name,
        entity_fiscal_code: r.entity_fiscal_code,
        period_from: r.period_from,
        period_to: r.period_to,
        vat_colectat: dec(r.vat_colectat),
        vat_deductibil: dec(r.vat_deductibil),
        vat_net: dec(r.vat_net),
        venituri_brute: dec(r.venituri_brute),
        cheltuieli_brute: dec(r.cheltuieli_brute),
        cas: dec(r.cas),
        cass: dec(r.cass),
        impozit_venit: dec(r.impozit_venit),
        impozit_profit: dec(r.impozit_profit),
        total_obligatii: dec(r.total_obligatii),
        proof_hash: r.proof_hash,
        period_hash: r.period_hash,
        tx_hash: r.tx_hash,
        block_number: r.block_number,
        anchored_at: r.anchored_at,
        created_at: r.created_at,
        is_zk: r.is_zk,
    }
}

// ── Repository ────────────────────────────────────────────────────────────────

pub struct ProofRepository {
    pool: PgPool,
}

pub type DynProofRepository = Arc<ProofRepository>;

#[allow(clippy::too_many_arguments)]
impl ProofRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(
        &self,
        user_id: Uuid,
        entity_type: &str,
        entity_id: Uuid,
        entity_name: &str,
        entity_fiscal_code: &str,
        period_from: NaiveDate,
        period_to: NaiveDate,
        vat_colectat: Decimal,
        vat_deductibil: Decimal,
        vat_net: Decimal,
        venituri_brute: Decimal,
        cheltuieli_brute: Decimal,
        cas: Decimal,
        cass: Decimal,
        impozit_venit: Decimal,
        impozit_profit: Decimal,
        total_obligatii: Decimal,
        proof_hash: &str,
        period_hash: &str,
        tx_hash: &str,
        block_number: i64,
        is_zk: bool,
        zk_proof_bytes: Option<Vec<u8>>,
    ) -> Result<FiscalProof, sqlx::Error> {
        let row: ProofRow = sqlx::query_as(
            r#"
            INSERT INTO dovada_fiscala (
                user_id, entity_type, entity_id, entity_name, entity_fiscal_code,
                period_from, period_to,
                vat_colectat, vat_deductibil, vat_net,
                venituri_brute, cheltuieli_brute,
                cas, cass, impozit_venit, impozit_profit, total_obligatii,
                proof_hash, period_hash, tx_hash, block_number,
                is_zk, zk_proof_bytes
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,
                $8::numeric, $9::numeric, $10::numeric,
                $11::numeric, $12::numeric,
                $13::numeric, $14::numeric, $15::numeric, $16::numeric, $17::numeric,
                $18,$19,$20,$21,
                $22,$23
            )
            RETURNING
                id, user_id, entity_type, entity_id,
                entity_name, entity_fiscal_code,
                period_from, period_to,
                vat_colectat::text, vat_deductibil::text, vat_net::text,
                venituri_brute::text, cheltuieli_brute::text,
                cas::text, cass::text, impozit_venit::text,
                impozit_profit::text, total_obligatii::text,
                proof_hash, period_hash, tx_hash, block_number,
                anchored_at, created_at, is_zk
            "#,
        )
        .bind(user_id)
        .bind(entity_type)
        .bind(entity_id)
        .bind(entity_name)
        .bind(entity_fiscal_code)
        .bind(period_from)
        .bind(period_to)
        .bind(vat_colectat.to_string())
        .bind(vat_deductibil.to_string())
        .bind(vat_net.to_string())
        .bind(venituri_brute.to_string())
        .bind(cheltuieli_brute.to_string())
        .bind(cas.to_string())
        .bind(cass.to_string())
        .bind(impozit_venit.to_string())
        .bind(impozit_profit.to_string())
        .bind(total_obligatii.to_string())
        .bind(proof_hash)
        .bind(period_hash)
        .bind(tx_hash)
        .bind(block_number)
        .bind(is_zk)
        .bind(zk_proof_bytes)
        .fetch_one(&self.pool)
        .await?;

        Ok(row_to_proof(row))
    }

    pub async fn list_for_entity(
        &self,
        entity_type: &str,
        entity_id: Uuid,
    ) -> Result<Vec<FiscalProof>, sqlx::Error> {
        let rows: Vec<ProofRow> = sqlx::query_as(
            r#"
            SELECT
                id, user_id, entity_type, entity_id,
                entity_name, entity_fiscal_code,
                period_from, period_to,
                vat_colectat::text, vat_deductibil::text, vat_net::text,
                venituri_brute::text, cheltuieli_brute::text,
                cas::text, cass::text, impozit_venit::text,
                impozit_profit::text, total_obligatii::text,
                proof_hash, period_hash, tx_hash, block_number,
                anchored_at, created_at, is_zk
            FROM dovada_fiscala
            WHERE entity_type = $1 AND entity_id = $2
            ORDER BY period_from DESC, created_at DESC
            "#,
        )
        .bind(entity_type)
        .bind(entity_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(row_to_proof).collect())
    }

    /// List all proofs in the system — for ANAF-style auditor access.
    /// Supports optional filtering by fiscal code, entity type, and date range.
    pub async fn list_all(
        &self,
        fiscal_code: Option<&str>,
        entity_type: Option<&str>,
        period_from: Option<NaiveDate>,
        period_to: Option<NaiveDate>,
    ) -> Result<Vec<FiscalProof>, sqlx::Error> {
        let rows: Vec<ProofRow> = sqlx::query_as(
            r#"
            SELECT
                id, user_id, entity_type, entity_id,
                entity_name, entity_fiscal_code,
                period_from, period_to,
                vat_colectat::text, vat_deductibil::text, vat_net::text,
                venituri_brute::text, cheltuieli_brute::text,
                cas::text, cass::text, impozit_venit::text,
                impozit_profit::text, total_obligatii::text,
                proof_hash, period_hash, tx_hash, block_number,
                anchored_at, created_at, is_zk
            FROM dovada_fiscala
            WHERE ($1::text IS NULL OR entity_fiscal_code ILIKE '%' || $1 || '%')
              AND ($2::text IS NULL OR entity_type = $2)
              AND ($3::date IS NULL OR period_from >= $3)
              AND ($4::date IS NULL OR period_to   <= $4)
            ORDER BY created_at DESC
            LIMIT 500
            "#,
        )
        .bind(fiscal_code)
        .bind(entity_type)
        .bind(period_from)
        .bind(period_to)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(row_to_proof).collect())
    }

    /// List proofs for a public entity profile (by fiscal code, no auth required).
    pub async fn list_for_fiscal_code(
        &self,
        fiscal_code: &str,
    ) -> Result<Vec<FiscalProof>, sqlx::Error> {
        let rows: Vec<ProofRow> = sqlx::query_as(
            r#"
            SELECT
                id, user_id, entity_type, entity_id,
                entity_name, entity_fiscal_code,
                period_from, period_to,
                vat_colectat::text, vat_deductibil::text, vat_net::text,
                venituri_brute::text, cheltuieli_brute::text,
                cas::text, cass::text, impozit_venit::text,
                impozit_profit::text, total_obligatii::text,
                proof_hash, period_hash, tx_hash, block_number,
                anchored_at, created_at, is_zk
            FROM dovada_fiscala
            WHERE entity_fiscal_code = $1
            ORDER BY period_from DESC, created_at DESC
            "#,
        )
        .bind(fiscal_code)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(row_to_proof).collect())
    }

    /// Fetch a single proof with its ZK bytes for verification.
    pub async fn get_with_zk_bytes(
        &self,
        proof_id: Uuid,
    ) -> Result<Option<(FiscalProof, Option<Vec<u8>>)>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT
                id, user_id, entity_type, entity_id,
                entity_name, entity_fiscal_code,
                period_from, period_to,
                vat_colectat::text  AS vat_colectat,
                vat_deductibil::text AS vat_deductibil,
                vat_net::text        AS vat_net,
                venituri_brute::text AS venituri_brute,
                cheltuieli_brute::text AS cheltuieli_brute,
                cas::text, cass::text, impozit_venit::text,
                impozit_profit::text, total_obligatii::text,
                proof_hash, period_hash, tx_hash, block_number,
                anchored_at, created_at, is_zk,
                zk_proof_bytes
            FROM dovada_fiscala
            WHERE id = $1
            "#,
        )
        .bind(proof_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(r) = row {
            use sqlx::Row;
            let dec = |s: String| {
                rust_decimal::Decimal::from_str(&s).unwrap_or(rust_decimal::Decimal::ZERO)
            };
            let proof = FiscalProof {
                id: r.get("id"),
                user_id: r.get("user_id"),
                entity_type: r.get("entity_type"),
                entity_id: r.get("entity_id"),
                entity_name: r.get("entity_name"),
                entity_fiscal_code: r.get("entity_fiscal_code"),
                period_from: r.get("period_from"),
                period_to: r.get("period_to"),
                vat_colectat: dec(r.get("vat_colectat")),
                vat_deductibil: dec(r.get("vat_deductibil")),
                vat_net: dec(r.get("vat_net")),
                venituri_brute: dec(r.get("venituri_brute")),
                cheltuieli_brute: dec(r.get("cheltuieli_brute")),
                cas: dec(r.get("cas")),
                cass: dec(r.get("cass")),
                impozit_venit: dec(r.get("impozit_venit")),
                impozit_profit: dec(r.get("impozit_profit")),
                total_obligatii: dec(r.get("total_obligatii")),
                proof_hash: r.get("proof_hash"),
                period_hash: r.get("period_hash"),
                tx_hash: r.get("tx_hash"),
                block_number: r.get("block_number"),
                anchored_at: r.get("anchored_at"),
                created_at: r.get("created_at"),
                is_zk: r.get("is_zk"),
            };
            let zk_bytes: Option<Vec<u8>> = r.get("zk_proof_bytes");
            Ok(Some((proof, zk_bytes)))
        } else {
            Ok(None)
        }
    }
}
