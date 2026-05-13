pub mod circuit;

use std::fs;
use std::path::Path;
use std::sync::Arc;

use ark_bn254::{Bn254, Fr};
use ark_groth16::{Groth16, PreparedVerifyingKey, Proof, ProvingKey};
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use ark_snark::SNARK;
use ark_std::rand::SeedableRng;
use ark_std::rand::rngs::StdRng;
use sha2::{Digest, Sha256};

use circuit::{PFTaxCircuit, PJTaxCircuit};

const PF_PROVING_KEY: &str = "zk_keys/pf_proving.key";
const PF_VERIFYING_KEY: &str = "zk_keys/pf_verifying.key";
const PJ_PROVING_KEY: &str = "zk_keys/pj_v3_proving.key";
const PJ_VERIFYING_KEY: &str = "zk_keys/pj_v3_verifying.key";

pub const PF_CIRCUIT_LABEL: &str = "pf_v2";
pub const PJ_CIRCUIT_LABEL: &str = "pj_v3";

#[derive(Clone)]
pub struct ZkService {
    pf_pk: Arc<ProvingKey<Bn254>>,
    pf_pvk: Arc<PreparedVerifyingKey<Bn254>>,
    pj_pk: Arc<ProvingKey<Bn254>>,
    pj_pvk: Arc<PreparedVerifyingKey<Bn254>>,
    pf_vk_fp: String,
    pj_vk_fp: String,
}

impl ZkService {
    pub fn load_or_generate() -> Result<Self, Box<dyn std::error::Error>> {
        fs::create_dir_all("zk_keys")?;

        let (pf_pk, pf_pvk) = load_or_generate_keys::<PFTaxCircuit<Fr>>(
            PF_PROVING_KEY,
            PF_VERIFYING_KEY,
            "PF",
            PFTaxCircuit::new_for_setup(),
        )?;
        let pf_vk_fp = vk_fingerprint(PF_VERIFYING_KEY)?;

        let (pj_pk, pj_pvk) = load_or_generate_keys::<PJTaxCircuit<Fr>>(
            PJ_PROVING_KEY,
            PJ_VERIFYING_KEY,
            "PJ",
            PJTaxCircuit::new_for_setup(),
        )?;
        let pj_vk_fp = vk_fingerprint(PJ_VERIFYING_KEY)?;

        println!("[zk] PF circuit version: {}_{pf_vk_fp}", PF_CIRCUIT_LABEL);
        println!("[zk] PJ circuit version: {}_{pj_vk_fp}", PJ_CIRCUIT_LABEL);

        Ok(Self {
            pf_pk: Arc::new(pf_pk),
            pf_pvk: Arc::new(pf_pvk),
            pj_pk: Arc::new(pj_pk),
            pj_pvk: Arc::new(pj_pvk),
            pf_vk_fp,
            pj_vk_fp,
        })
    }

    pub fn pf_circuit_version(&self) -> String {
        format!("{}_{}", PF_CIRCUIT_LABEL, self.pf_vk_fp)
    }

    pub fn pj_circuit_version(&self) -> String {
        format!("{}_{}", PJ_CIRCUIT_LABEL, self.pj_vk_fp)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn generate_pf_proof(
        &self,
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
    ) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let mut rng = StdRng::from_entropy();
        let circuit = PFTaxCircuit::<Fr>::new_for_proving(
            income_bases,
            income_vats,
            expense_bases,
            expense_vats,
            venituri_brute,
            cheltuieli_brute,
            vat_colectat,
            vat_deductibil,
            profit_net,
            cas,
            cass,
            impozit_venit,
        );
        serialize_proof(Groth16::<Bn254>::prove(&self.pf_pk, circuit, &mut rng)?)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn generate_pj_proof(
        &self,
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
    ) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let mut rng = StdRng::from_entropy();
        let circuit = PJTaxCircuit::<Fr>::new_for_proving(
            income_bases,
            income_vats,
            expense_bases,
            expense_vats,
            venituri_brute,
            cheltuieli_brute,
            vat_colectat,
            vat_deductibil,
            profit_net,
            impozit_profit,
        );
        serialize_proof(Groth16::<Bn254>::prove(&self.pj_pk, circuit, &mut rng)?)
    }

    /// Verify a stored PF proof.
    #[allow(clippy::too_many_arguments)]
    pub fn verify_pf_proof(
        &self,
        proof_bytes: &[u8],
        venituri_brute: u64,
        cheltuieli_brute: u64,
        vat_colectat: u64,
        vat_deductibil: u64,
        profit_net: u64,
        cas: u64,
        cass: u64,
        impozit_venit: u64,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        let proof = Proof::<Bn254>::deserialize_compressed(proof_bytes)?;
        let public_inputs = vec![
            Fr::from(venituri_brute),
            Fr::from(cheltuieli_brute),
            Fr::from(vat_colectat),
            Fr::from(vat_deductibil),
            Fr::from(profit_net),
            Fr::from(cas),
            Fr::from(cass),
            Fr::from(impozit_venit),
        ];
        Ok(Groth16::<Bn254>::verify_with_processed_vk(
            &self.pf_pvk,
            &public_inputs,
            &proof,
        )?)
    }

    /// Verify a stored PJ proof.
    #[allow(clippy::too_many_arguments)]
    pub fn verify_pj_proof(
        &self,
        proof_bytes: &[u8],
        venituri_brute: u64,
        cheltuieli_brute: u64,
        vat_colectat: u64,
        vat_deductibil: u64,
        profit_net: u64,
        impozit_profit: u64,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        let proof = Proof::<Bn254>::deserialize_compressed(proof_bytes)?;
        let public_inputs = vec![
            Fr::from(venituri_brute),
            Fr::from(cheltuieli_brute),
            Fr::from(vat_colectat),
            Fr::from(vat_deductibil),
            Fr::from(profit_net),
            Fr::from(impozit_profit),
        ];
        Ok(Groth16::<Bn254>::verify_with_processed_vk(
            &self.pj_pvk,
            &public_inputs,
            &proof,
        )?)
    }
}

pub type DynZkService = Arc<ZkService>;

// ── Internal helpers ──────────────────────────────────────────────────────────

/// First 8 hex characters of SHA-256 over the verifying key file bytes.
fn vk_fingerprint(path: &str) -> Result<String, Box<dyn std::error::Error>> {
    let bytes = fs::read(path)?;
    let hash = Sha256::digest(&bytes);
    Ok(hash.iter().take(4).map(|b| format!("{b:02x}")).collect())
}

fn load_or_generate_keys<C>(
    proving_path: &str,
    verifying_path: &str,
    label: &str,
    setup_circuit: C,
) -> Result<(ProvingKey<Bn254>, PreparedVerifyingKey<Bn254>), Box<dyn std::error::Error>>
where
    C: ark_relations::r1cs::ConstraintSynthesizer<Fr> + Send,
{
    if Path::new(proving_path).exists() && Path::new(verifying_path).exists() {
        println!("[zk] Loading existing {label} keys from {proving_path}");
        let pk = ProvingKey::<Bn254>::deserialize_compressed(&*fs::read(proving_path)?)?;
        let vk = ark_groth16::VerifyingKey::<Bn254>::deserialize_compressed(&*fs::read(
            verifying_path,
        )?)?;
        let pvk = Groth16::<Bn254>::process_vk(&vk)?;
        println!("[zk] {label} keys loaded.");
        return Ok((pk, pvk));
    }

    println!("[zk] No {label} keys found — running trusted setup (~30 s)...");
    let mut rng = StdRng::from_entropy();
    let (pk, vk) = Groth16::<Bn254>::circuit_specific_setup(setup_circuit, &mut rng)?;
    let pvk = Groth16::<Bn254>::process_vk(&vk)?;

    let mut pk_bytes = Vec::new();
    pk.serialize_compressed(&mut pk_bytes)?;
    fs::write(proving_path, &pk_bytes)?;

    let mut vk_bytes = Vec::new();
    vk.serialize_compressed(&mut vk_bytes)?;
    fs::write(verifying_path, &vk_bytes)?;

    println!("[zk] {label} trusted setup complete. Keys written to zk_keys/");
    Ok((pk, pvk))
}

fn serialize_proof(proof: Proof<Bn254>) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let mut buf = Vec::new();
    proof.serialize_compressed(&mut buf)?;
    Ok(buf)
}
