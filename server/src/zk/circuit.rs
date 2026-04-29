use ark_ff::PrimeField;
use ark_r1cs_std::{alloc::AllocVar, eq::EqGadget, fields::FieldVar, fields::fp::FpVar};
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};

/// Maximum invoices per proof period. Padded with zeros when fewer exist.
pub const MAX_INVOICES: usize = 64;

/// ZK circuit: proves that publicly declared VAT totals are correctly derived
/// from private per-invoice amounts, without revealing individual invoice values.
///
/// Private inputs (hidden from verifier):
///   income_bases[64]  — base amount of each income invoice (RON × 100, integer)
///   income_vats[64]   — VAT amount of each income invoice
///   expense_bases[64] — base amount of each expense invoice
///   expense_vats[64]  — VAT amount of each expense invoice
///
/// Public inputs (visible on-chain / to anyone):
///   venituri_brute    — total income (base + VAT)
///   cheltuieli_brute  — total expenses (base + VAT)
///   vat_colectat      — total VAT collected on income invoices
///   vat_deductibil    — total VAT on expense invoices
///
/// Constraints proven:
///   Σ income_bases  + Σ income_vats  == venituri_brute
///   Σ expense_bases + Σ expense_vats == cheltuieli_brute
///   Σ income_vats                    == vat_colectat
///   Σ expense_vats                   == vat_deductibil
pub struct TaxComplianceCircuit<F: PrimeField> {
    // Private witnesses
    pub income_bases: Vec<Option<F>>,
    pub income_vats: Vec<Option<F>>,
    pub expense_bases: Vec<Option<F>>,
    pub expense_vats: Vec<Option<F>>,

    // Public inputs
    pub venituri_brute: Option<F>,
    pub cheltuieli_brute: Option<F>,
    pub vat_colectat: Option<F>,
    pub vat_deductibil: Option<F>,
}

impl<F: PrimeField> TaxComplianceCircuit<F> {
    pub fn new_for_setup() -> Self {
        Self {
            income_bases: vec![None; MAX_INVOICES],
            income_vats: vec![None; MAX_INVOICES],
            expense_bases: vec![None; MAX_INVOICES],
            expense_vats: vec![None; MAX_INVOICES],
            venituri_brute: None,
            cheltuieli_brute: None,
            vat_colectat: None,
            vat_deductibil: None,
        }
    }

    pub fn new_for_proving(
        income_bases: Vec<u64>,
        income_vats: Vec<u64>,
        expense_bases: Vec<u64>,
        expense_vats: Vec<u64>,
        venituri_brute: u64,
        cheltuieli_brute: u64,
        vat_colectat: u64,
        vat_deductibil: u64,
    ) -> Self {
        let pad = |mut v: Vec<u64>| -> Vec<Option<F>> {
            v.resize(MAX_INVOICES, 0);
            v.into_iter().map(|x| Some(F::from(x))).collect()
        };
        Self {
            income_bases: pad(income_bases),
            income_vats: pad(income_vats),
            expense_bases: pad(expense_bases),
            expense_vats: pad(expense_vats),
            venituri_brute: Some(F::from(venituri_brute)),
            cheltuieli_brute: Some(F::from(cheltuieli_brute)),
            vat_colectat: Some(F::from(vat_colectat)),
            vat_deductibil: Some(F::from(vat_deductibil)),
        }
    }
}

fn alloc_witnesses<F: PrimeField>(
    cs: ConstraintSystemRef<F>,
    values: &[Option<F>],
) -> Result<Vec<FpVar<F>>, SynthesisError> {
    values
        .iter()
        .map(|v| FpVar::new_witness(cs.clone(), || v.ok_or(SynthesisError::AssignmentMissing)))
        .collect()
}

fn sum_vars<F: PrimeField>(vars: &[FpVar<F>]) -> FpVar<F> {
    vars.iter()
        .fold(FpVar::constant(F::zero()), |acc, v| acc + v.clone())
}

impl<F: PrimeField> ConstraintSynthesizer<F> for TaxComplianceCircuit<F> {
    fn generate_constraints(self, cs: ConstraintSystemRef<F>) -> Result<(), SynthesisError> {
        // ── Private witnesses ────────────────────────────────────────────────
        let income_base_vars = alloc_witnesses(cs.clone(), &self.income_bases)?;
        let income_vat_vars = alloc_witnesses(cs.clone(), &self.income_vats)?;
        let expense_base_vars = alloc_witnesses(cs.clone(), &self.expense_bases)?;
        let expense_vat_vars = alloc_witnesses(cs.clone(), &self.expense_vats)?;

        // ── Public inputs ────────────────────────────────────────────────────
        let venituri_var = FpVar::new_input(cs.clone(), || {
            self.venituri_brute.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let cheltuieli_var = FpVar::new_input(cs.clone(), || {
            self.cheltuieli_brute
                .ok_or(SynthesisError::AssignmentMissing)
        })?;
        let vat_colectat_var = FpVar::new_input(cs.clone(), || {
            self.vat_colectat.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let vat_deductibil_var = FpVar::new_input(cs.clone(), || {
            self.vat_deductibil.ok_or(SynthesisError::AssignmentMissing)
        })?;

        // ── Sums ─────────────────────────────────────────────────────────────
        let income_base_sum = sum_vars(&income_base_vars);
        let income_vat_sum = sum_vars(&income_vat_vars);
        let expense_base_sum = sum_vars(&expense_base_vars);
        let expense_vat_sum = sum_vars(&expense_vat_vars);

        // ── Constraints ──────────────────────────────────────────────────────
        // 1. Σ income_bases + Σ income_vats == venituri_brute
        (income_base_sum + income_vat_sum.clone()).enforce_equal(&venituri_var)?;

        // 2. Σ expense_bases + Σ expense_vats == cheltuieli_brute
        (expense_base_sum + expense_vat_sum.clone()).enforce_equal(&cheltuieli_var)?;

        // 3. Σ income_vats == vat_colectat
        income_vat_sum.enforce_equal(&vat_colectat_var)?;

        // 4. Σ expense_vats == vat_deductibil
        expense_vat_sum.enforce_equal(&vat_deductibil_var)?;

        Ok(())
    }
}
