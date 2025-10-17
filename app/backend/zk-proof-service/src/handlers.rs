use axum::{
    extract::{Path, Json},
    http::StatusCode,
    response::Json as ResponseJson,
};
use common_types::{
    ZkProofRequest, ZkProofResponse, ZkProofVerificationRequest, ZkProofVerificationResponse,
    ApiResponse, ErrorResponse,
};
use crate::services::ZkProofService;

pub async fn health() -> ResponseJson<serde_json::Value> {
    ResponseJson(serde_json::json!({
        "status": "healthy",
        "service": "zk-proof-service",
        "version": "0.1.0",
        "port": 8004
    }))
}

/// Generate ZK proof
pub async fn generate_proof(
    Json(request): Json<ZkProofRequest>,
) -> Result<ResponseJson<ApiResponse<ZkProofResponse>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Generating ZK proof for calculation: {}", request.calculation_id);
    
    let service = ZkProofService::new();
    
    match service.generate_proof(request).await {
        Ok(response) => Ok(ResponseJson(ApiResponse::success(response))),
        Err(e) => {
            tracing::error!("Failed to generate ZK proof: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}

pub async fn verify_proof(
    Json(request): Json<ZkProofVerificationRequest>,
) -> Result<ResponseJson<ApiResponse<ZkProofVerificationResponse>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Verifying ZK proof: {}", request.proof_hash);
    
    let service = ZkProofService::new();
    
    match service.verify_proof(request).await {
        Ok(response) => Ok(ResponseJson(ApiResponse::success(response))),
        Err(e) => {
            tracing::error!("Failed to verify ZK proof: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}

pub async fn get_proof(
    Path(calculation_id): Path<String>,
) -> Result<ResponseJson<ApiResponse<ZkProofResponse>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Fetching ZK proof for calculation: {}", calculation_id);
    
    let service = ZkProofService::new();
    
    match service.get_proof_by_calculation_id(&calculation_id).await {
        Ok(Some(response)) => Ok(ResponseJson(ApiResponse::success(response))),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            ResponseJson(ErrorResponse::new("Proof not found"))
        )),
        Err(e) => {
            tracing::error!("Failed to get ZK proof: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}