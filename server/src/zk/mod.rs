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

use circuit::TaxComplianceCircuit;

const PROVING_KEY_PATH: &str = "zk_keys/proving.key";
const VERIFYING_KEY_PATH: &str = "zk_keys/verifying.key";

#[derive(Clone)]
pub struct ZkService {
    pub pk: Arc<ProvingKey<Bn254>>,
    pub pvk: Arc<PreparedVerifyingKey<Bn254>>,
}

impl ZkService {
    /// Load keys from disk, generating them first if they do not exist.
    /// Key generation takes 10–60 seconds on first run; subsequent loads are instant.
    pub fn load_or_generate() -> Result<Self, Box<dyn std::error::Error>> {
        fs::create_dir_all("zk_keys")?;

        if Path::new(PROVING_KEY_PATH).exists() && Path::new(VERIFYING_KEY_PATH).exists() {
            println!("[zk] Loading existing keys from zk_keys/");
            let pk_bytes = fs::read(PROVING_KEY_PATH)?;
            let vk_bytes = fs::read(VERIFYING_KEY_PATH)?;
            let pk = ProvingKey::<Bn254>::deserialize_compressed(&*pk_bytes)?;
            let vk = ark_groth16::VerifyingKey::<Bn254>::deserialize_compressed(&*vk_bytes)?;
            let pvk = Groth16::<Bn254>::process_vk(&vk)?;
            println!("[zk] Keys loaded.");
            return Ok(Self { pk: Arc::new(pk), pvk: Arc::new(pvk) });
        }

        println!("[zk] No keys found — running trusted setup (this takes ~30 seconds)...");
        let mut rng = StdRng::from_entropy();
        let circuit = TaxComplianceCircuit::<Fr>::new_for_setup();
        let (pk, vk) = Groth16::<Bn254>::circuit_specific_setup(circuit, &mut rng)?;
        let pvk = Groth16::<Bn254>::process_vk(&vk)?;

        let mut pk_bytes = Vec::new();
        pk.serialize_compressed(&mut pk_bytes)?;
        fs::write(PROVING_KEY_PATH, &pk_bytes)?;

        let mut vk_bytes = Vec::new();
        vk.serialize_compressed(&mut vk_bytes)?;
        fs::write(VERIFYING_KEY_PATH, &vk_bytes)?;

        println!("[zk] Trusted setup complete. Keys written to zk_keys/");
        Ok(Self { pk: Arc::new(pk), pvk: Arc::new(pvk) })
    }

    /// Generate a Groth16 proof for the given tax compliance statement.
    /// Returns serialized proof bytes + the 4 public inputs (scaled u64).
    pub fn generate_proof(
        &self,
        income_bases: Vec<u64>,
        income_vats: Vec<u64>,
        expense_bases: Vec<u64>,
        expense_vats: Vec<u64>,
        venituri_brute_scaled: u64,
        cheltuieli_brute_scaled: u64,
        vat_colectat_scaled: u64,
        vat_deductibil_scaled: u64,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let mut rng = StdRng::from_entropy();
        let circuit = TaxComplianceCircuit::<Fr>::new_for_proving(
            income_bases,
            income_vats,
            expense_bases,
            expense_vats,
            venituri_brute_scaled,
            cheltuieli_brute_scaled,
            vat_colectat_scaled,
            vat_deductibil_scaled,
        );

        let proof = Groth16::<Bn254>::prove(&self.pk, circuit, &mut rng)?;

        let mut buf = Vec::new();
        proof.serialize_compressed(&mut buf)?;
        Ok(buf)
    }

    /// Verify a serialized proof against public inputs.
    pub fn verify_proof(
        &self,
        proof_bytes: &[u8],
        venituri_brute_scaled: u64,
        cheltuieli_brute_scaled: u64,
        vat_colectat_scaled: u64,
        vat_deductibil_scaled: u64,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        let proof = Proof::<Bn254>::deserialize_compressed(proof_bytes)?;
        let public_inputs = vec![
            Fr::from(venituri_brute_scaled),
            Fr::from(cheltuieli_brute_scaled),
            Fr::from(vat_colectat_scaled),
            Fr::from(vat_deductibil_scaled),
        ];
        let valid = Groth16::<Bn254>::verify_with_processed_vk(&self.pvk, &public_inputs, &proof)?;
        Ok(valid)
    }
}

pub type DynZkService = Arc<ZkService>;
