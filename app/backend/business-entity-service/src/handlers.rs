use axum::{
    extract::{Path, Json},
    http::StatusCode,
    response::Json as ResponseJson,
};
use common_types::{
    BusinessEntity, CreateBusinessEntityRequest, BusinessEntityValidationRequest,
    BusinessEntityValidationResponse, ApiResponse, ErrorResponse,
};
use crate::services::BusinessEntityService;

pub async fn health() -> ResponseJson<serde_json::Value> {
    ResponseJson(serde_json::json!({
        "status": "healthy",
        "service": "business-entity-service",
        "version": "0.1.0",
        "port": 8003
    }))
}

pub async fn create_entity(
    Json(request): Json<CreateBusinessEntityRequest>,
) -> Result<ResponseJson<ApiResponse<BusinessEntity>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Creating business entity: {}", request.name);
    
    let service = BusinessEntityService::new();
    
    match service.create_entity(request).await {
        Ok(entity) => Ok(ResponseJson(ApiResponse::success(entity))),
        Err(e) => {
            tracing::error!("Failed to create business entity: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}

pub async fn get_entity(
    Path(id): Path<String>,
) -> Result<ResponseJson<ApiResponse<BusinessEntity>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Fetching business entity: {}", id);
    
    let service = BusinessEntityService::new();
    
    match service.get_entity(&id).await {
        Ok(Some(entity)) => Ok(ResponseJson(ApiResponse::success(entity))),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            ResponseJson(ErrorResponse::new("Business entity not found"))
        )),
        Err(e) => {
            tracing::error!("Failed to get business entity: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}

pub async fn update_entity(
    Path(id): Path<String>,
    Json(request): Json<CreateBusinessEntityRequest>,
) -> Result<ResponseJson<ApiResponse<BusinessEntity>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Updating business entity: {}", id);
    
    let service = BusinessEntityService::new();
    
    match service.update_entity(&id, request).await {
        Ok(entity) => Ok(ResponseJson(ApiResponse::success(entity))),
        Err(e) => {
            tracing::error!("Failed to update business entity: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}

pub async fn delete_entity(
    Path(id): Path<String>,
) -> Result<ResponseJson<ApiResponse<String>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Deleting business entity: {}", id);
    
    let service = BusinessEntityService::new();
    
    match service.delete_entity(&id).await {
        Ok(_) => Ok(ResponseJson(ApiResponse::success(format!("Business entity {} deleted", id)))),
        Err(e) => {
            tracing::error!("Failed to delete business entity: {}", e);
            Err((
                StatusCode::NOT_FOUND,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}

pub async fn list_entities(
) -> Result<ResponseJson<ApiResponse<Vec<BusinessEntity>>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Listing business entities");
    
    let service = BusinessEntityService::new();
    
    match service.list_entities().await {
        Ok(entities) => Ok(ResponseJson(ApiResponse::success(entities))),
        Err(e) => {
            tracing::error!("Failed to list business entities: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}

pub async fn validate_entity(
    Path(id): Path<String>,
) -> Result<ResponseJson<ApiResponse<BusinessEntityValidationResponse>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Validating business entity: {}", id);
    
    let service = BusinessEntityService::new();
    
    match service.validate_entity_by_id(&id).await {
        Ok(validation_result) => Ok(ResponseJson(ApiResponse::success(validation_result))),
        Err(e) => {
            tracing::error!("Failed to validate business entity: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}

pub async fn validate_entity_data(
    Json(request): Json<BusinessEntityValidationRequest>,
) -> Result<ResponseJson<ApiResponse<BusinessEntityValidationResponse>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Validating business entity data for: {}", request.registration_number);
    
    let service = BusinessEntityService::new();
    
    match service.validate_entity_data(request).await {
        Ok(validation_result) => Ok(ResponseJson(ApiResponse::success(validation_result))),
        Err(e) => {
            tracing::error!("Failed to validate business entity data: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}