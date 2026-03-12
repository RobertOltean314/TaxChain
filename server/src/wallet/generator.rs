pub fn generate_custodial_wallet() -> Result<(String, String), Box<dyn std::error::Error>> {
    // TODO Phase 2: implement real HD wallet derivation
    let unique_id = uuid::Uuid::new_v4().to_string().replace("-", "");
    // UUID without hyphens is 32 chars — pad to 40 with zeros
    let dummy_address = format!("0x{:0<40}", unique_id);
    let dummy_key_enc = format!("dummy_key_{}", unique_id);
    Ok((dummy_address, dummy_key_enc))
}
