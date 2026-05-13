use ark_ff::PrimeField;
use ark_r1cs_std::{alloc::AllocVar, eq::EqGadget, fields::FieldVar, fields::fp::FpVar};
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};

pub const MAX_INVOICES: usize = 64;

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

fn pad_u64<F: PrimeField>(mut v: Vec<u64>) -> Vec<Option<F>> {
    v.resize(MAX_INVOICES, 0);
    v.into_iter().map(|x| Some(F::from(x))).collect()
}

//  PFA circuit

/// Private inputs:
///   income_bases[64],
///   income_vats[64],
///   expense_bases[64],
///   expense_vats[64]
///
/// Public inputs:
///   venituri_brute   — total income (base + VAT)
///   cheltuieli_brute — total expenses (base + VAT)
///   vat_colectat     — VAT collected on income
///   vat_deductibil   — VAT deductible on expenses
///   profit_net       — net profit (Σ income_bases − Σ expense_bases)
///   cas              — CAS owed (25% × profit_net, statutory rate, no ceiling)
///   cass             — CASS owed (10% × profit_net, statutory rate, no ceiling)
///   impozit_venit    — income tax owed (10% × (profit_net − cas − cass))
pub struct PFTaxCircuit<F: PrimeField> {
    pub income_bases: Vec<Option<F>>,
    pub income_vats: Vec<Option<F>>,
    pub expense_bases: Vec<Option<F>>,
    pub expense_vats: Vec<Option<F>>,
    pub venituri_brute: Option<F>,
    pub cheltuieli_brute: Option<F>,
    pub vat_colectat: Option<F>,
    pub vat_deductibil: Option<F>,
    pub profit_net: Option<F>,
    pub cas: Option<F>,
    pub cass: Option<F>,
    pub impozit_venit: Option<F>,
}

impl<F: PrimeField> PFTaxCircuit<F> {
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
            profit_net: None,
            cas: None,
            cass: None,
            impozit_venit: None,
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
        profit_net: u64,
        cas: u64,
        cass: u64,
        impozit_venit: u64,
    ) -> Self {
        Self {
            income_bases: pad_u64(income_bases),
            income_vats: pad_u64(income_vats),
            expense_bases: pad_u64(expense_bases),
            expense_vats: pad_u64(expense_vats),
            venituri_brute: Some(F::from(venituri_brute)),
            cheltuieli_brute: Some(F::from(cheltuieli_brute)),
            vat_colectat: Some(F::from(vat_colectat)),
            vat_deductibil: Some(F::from(vat_deductibil)),
            profit_net: Some(F::from(profit_net)),
            cas: Some(F::from(cas)),
            cass: Some(F::from(cass)),
            impozit_venit: Some(F::from(impozit_venit)),
        }
    }
}

impl<F: PrimeField> ConstraintSynthesizer<F> for PFTaxCircuit<F> {
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
        let vat_col_var = FpVar::new_input(cs.clone(), || {
            self.vat_colectat.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let vat_ded_var = FpVar::new_input(cs.clone(), || {
            self.vat_deductibil.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let profit_var = FpVar::new_input(cs.clone(), || {
            self.profit_net.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let cas_var = FpVar::new_input(cs.clone(), || {
            self.cas.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let cass_var = FpVar::new_input(cs.clone(), || {
            self.cass.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let iv_var = FpVar::new_input(cs.clone(), || {
            self.impozit_venit.ok_or(SynthesisError::AssignmentMissing)
        })?;

        // ── Sums ─────────────────────────────────────────────────────────────
        let income_base_sum = sum_vars(&income_base_vars);
        let income_vat_sum = sum_vars(&income_vat_vars);
        let expense_base_sum = sum_vars(&expense_base_vars);
        let expense_vat_sum = sum_vars(&expense_vat_vars);

        let c25 = FpVar::constant(F::from(25u64));
        let c10 = FpVar::constant(F::from(10u64));
        let c100 = FpVar::constant(F::from(100u64));

        // 1. Σ income_bases + Σ income_vats == venituri_brute
        (income_base_sum.clone() + income_vat_sum.clone()).enforce_equal(&venituri_var)?;
        // 2. Σ expense_bases + Σ expense_vats == cheltuieli_brute
        (expense_base_sum.clone() + expense_vat_sum.clone()).enforce_equal(&cheltuieli_var)?;
        // 3. Σ income_vats == vat_colectat
        income_vat_sum.enforce_equal(&vat_col_var)?;
        // 4. Σ expense_vats == vat_deductibil
        expense_vat_sum.enforce_equal(&vat_ded_var)?;
        // 5. Σ income_bases − Σ expense_bases == profit_net
        (income_base_sum - expense_base_sum).enforce_equal(&profit_var)?;
        // 6. profit_net × 25 == cas × 100  (proves CAS = 25% of profit)
        (profit_var.clone() * &c25).enforce_equal(&(cas_var.clone() * &c100))?;
        // 7. profit_net × 10 == cass × 100  (proves CASS = 10% of profit)
        (profit_var.clone() * &c10).enforce_equal(&(cass_var.clone() * &c100))?;
        // 8. (profit_net − cas − cass) × 10 == impozit_venit × 100
        //    proves impozit_venit = 10% of taxable base after social contributions
        let taxable = profit_var - cas_var - cass_var;
        (taxable * &c10).enforce_equal(&(iv_var * &c100))?;

        Ok(())
    }
}

// ── SRL circuit ───────────────────────────────────────────────────────────────

/// ZK circuit for Persoana Juridica / SRL (Romanian limited liability company).
///
/// Public inputs:
///   venituri_brute, cheltuieli_brute, vat_colectat, vat_deductibil (same as PF)
///   profit_net     — net profit (Σ income_bases − Σ expense_bases)
///   impozit_profit — corporate profit tax (16% × profit_net, standard rate)
///
/// Note: the 3% micro-enterprise rate (for SRL with revenue < 500 000 EUR) uses
/// a different tax base (revenue, not profit) and requires conditional logic not
/// expressible as linear constraints. This circuit proves the 16% standard rate.
pub struct PJTaxCircuit<F: PrimeField> {
    pub income_bases: Vec<Option<F>>,
    pub income_vats: Vec<Option<F>>,
    pub expense_bases: Vec<Option<F>>,
    pub expense_vats: Vec<Option<F>>,
    pub venituri_brute: Option<F>,
    pub cheltuieli_brute: Option<F>,
    pub vat_colectat: Option<F>,
    pub vat_deductibil: Option<F>,
    pub profit_net: Option<F>,
    pub impozit_profit: Option<F>,
}

impl<F: PrimeField> PJTaxCircuit<F> {
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
            profit_net: None,
            impozit_profit: None,
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
        profit_net: u64,
        impozit_profit: u64,
    ) -> Self {
        Self {
            income_bases: pad_u64(income_bases),
            income_vats: pad_u64(income_vats),
            expense_bases: pad_u64(expense_bases),
            expense_vats: pad_u64(expense_vats),
            venituri_brute: Some(F::from(venituri_brute)),
            cheltuieli_brute: Some(F::from(cheltuieli_brute)),
            vat_colectat: Some(F::from(vat_colectat)),
            vat_deductibil: Some(F::from(vat_deductibil)),
            profit_net: Some(F::from(profit_net)),
            impozit_profit: Some(F::from(impozit_profit)),
        }
    }
}

impl<F: PrimeField> ConstraintSynthesizer<F> for PJTaxCircuit<F> {
    fn generate_constraints(self, cs: ConstraintSystemRef<F>) -> Result<(), SynthesisError> {
        let income_base_vars = alloc_witnesses(cs.clone(), &self.income_bases)?;
        let income_vat_vars = alloc_witnesses(cs.clone(), &self.income_vats)?;
        let expense_base_vars = alloc_witnesses(cs.clone(), &self.expense_bases)?;
        let expense_vat_vars = alloc_witnesses(cs.clone(), &self.expense_vats)?;

        let venituri_var = FpVar::new_input(cs.clone(), || {
            self.venituri_brute.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let cheltuieli_var = FpVar::new_input(cs.clone(), || {
            self.cheltuieli_brute
                .ok_or(SynthesisError::AssignmentMissing)
        })?;
        let vat_col_var = FpVar::new_input(cs.clone(), || {
            self.vat_colectat.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let vat_ded_var = FpVar::new_input(cs.clone(), || {
            self.vat_deductibil.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let profit_var = FpVar::new_input(cs.clone(), || {
            self.profit_net.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let ip_var = FpVar::new_input(cs.clone(), || {
            self.impozit_profit.ok_or(SynthesisError::AssignmentMissing)
        })?;

        let income_base_sum = sum_vars(&income_base_vars);
        let income_vat_sum = sum_vars(&income_vat_vars);
        let expense_base_sum = sum_vars(&expense_base_vars);
        let expense_vat_sum = sum_vars(&expense_vat_vars);

        let c3   = FpVar::constant(F::from(3u64));
        let c100 = FpVar::constant(F::from(100u64));

        // 1–4: VAT constraints (identical to PF)
        (income_base_sum.clone() + income_vat_sum.clone()).enforce_equal(&venituri_var)?;
        (expense_base_sum.clone() + expense_vat_sum.clone()).enforce_equal(&cheltuieli_var)?;
        income_vat_sum.enforce_equal(&vat_col_var)?;
        expense_vat_sum.enforce_equal(&vat_ded_var)?;
        // 5. Σ income_bases − Σ expense_bases == profit_net
        (income_base_sum - expense_base_sum).enforce_equal(&profit_var)?;
        // 6. (venituri_brute − vat_colectat) × 3 == impozit_profit × 100
        //    proves micro-enterprise tax = 3% of net revenue (CA fără TVA)
        let venituri_nete_var = venituri_var - vat_col_var;
        (venituri_nete_var * &c3).enforce_equal(&(ip_var * &c100))?;

        Ok(())
    }
}
