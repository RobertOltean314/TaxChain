use chrono::NaiveDate;
use reqwest::Client;
use rust_decimal::Decimal;
use sqlx::PgPool;
use std::str::FromStr;
use std::sync::Arc;

/// Fetch the EUR or USD rate from BNR for `date` (or today if None).
/// Results are cached in the `curs_valutar` table to avoid repeated BNR calls.
pub struct BnrService {
    pool: PgPool,
    http: Client,
}

#[derive(sqlx::FromRow)]
struct RateRow {
    rate: String,
}

impl BnrService {
    pub fn new(pool: PgPool, http: Client) -> Self {
        Self { pool, http }
    }

    pub async fn get_rate(&self, currency: &str, date: NaiveDate) -> Result<Decimal, BnrError> {
        let currency = currency.to_uppercase();

        // 1. Try the cache first.
        if let Some(cached) = self.from_cache(&currency, date).await? {
            return Ok(cached);
        }

        // 2. Fetch from BNR XML and cache.
        let rate = self.fetch_from_bnr(&currency, date).await?;
        self.cache_rate(&currency, date, rate).await?;
        Ok(rate)
    }

    async fn from_cache(
        &self,
        currency: &str,
        date: NaiveDate,
    ) -> Result<Option<Decimal>, BnrError> {
        let row = sqlx::query_as::<_, RateRow>(
            "SELECT rate::text AS rate FROM curs_valutar WHERE currency = $1 AND date = $2",
        )
        .bind(currency)
        .bind(date)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| Decimal::from_str(&r.rate).unwrap_or(Decimal::ZERO)))
    }

    async fn cache_rate(
        &self,
        currency: &str,
        date: NaiveDate,
        rate: Decimal,
    ) -> Result<(), BnrError> {
        sqlx::query(
        "INSERT INTO curs_valutar (currency, rate, date) VALUES ($1, $2::numeric, $3) ON CONFLICT DO NOTHING"
    )
    .bind(currency)
    .bind(rate.to_string())
    .bind(date)
    .execute(&self.pool)
    .await?;

        Ok(())
    }

    async fn fetch_from_bnr(&self, currency: &str, date: NaiveDate) -> Result<Decimal, BnrError> {
        // BNR publishes daily rates — try exact date, fall back to most recent prior date.
        // For simplicity we fetch the "nbrfxrates.xml" which has today's rates and the
        // last ~10 days. For historical dates beyond that, we use "nbrfxrates10.xml".
        let url = format!(
            "https://www.bnr.ro/nbrfxrates.xml?date={}",
            date.format("%Y-%m-%d")
        );

        let xml = self
            .http
            .get(&url)
            .send()
            .await
            .map_err(|e| BnrError::Http(e.to_string()))?
            .text()
            .await
            .map_err(|e| BnrError::Http(e.to_string()))?;

        parse_bnr_xml(&xml, currency)
    }
}

pub type DynBnrService = Arc<BnrService>;

// ── XML parser ────────────────────────────────────────────────────────────────

fn parse_bnr_xml(xml: &str, currency: &str) -> Result<Decimal, BnrError> {
    // BNR XML format:
    // <Rate currency="EUR" multiplier="1">5.0792</Rate>
    let needle = format!("currency=\"{}\"", currency);
    let pos = xml
        .find(&needle)
        .ok_or_else(|| BnrError::NotFound(currency.to_string()))?;

    let after = &xml[pos..];
    let tag_close = after.find('>').ok_or(BnrError::Parse)?;
    // Only search for multiplier within this tag's attributes, not the whole remaining XML.
    let tag_attrs = &after[..tag_close];
    let value_start = tag_close + 1;
    let value_end = after[value_start..].find('<').ok_or(BnrError::Parse)?;
    let value_str = after[value_start..value_start + value_end].trim();

    // Handle the `multiplier` attribute (some currencies quote per 100 units).
    let multiplier = if let Some(m_start) = tag_attrs.find("multiplier=\"") {
        let m = &tag_attrs[m_start + 12..];
        let m_end = m.find('"').unwrap_or(1);
        m[..m_end].parse::<u64>().unwrap_or(1)
    } else {
        1
    };

    let raw = Decimal::from_str(value_str).map_err(|_| BnrError::Parse)?;

    Ok(raw / Decimal::new(multiplier as i64, 0))
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum BnrError {
    #[error("BNR HTTP error: {0}")]
    Http(String),
    #[error("Currency {0} not found in BNR response")]
    NotFound(String),
    #[error("Failed to parse BNR XML rate value")]
    Parse,
    #[error("Database error: {0}")]
    Db(#[from] sqlx::Error),
}
