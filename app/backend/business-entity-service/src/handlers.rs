use crate::services::BusinessEntityService;
use axum::{
    extract::{Json, Path},
    http::StatusCode,
    response::Json as ResponseJson,
};
use common_types::{
    ApiResponse, BusinessEntity, BusinessEntityValidationRequest, BusinessEntityValidationResponse,
    CreateBusinessEntityRequest, ErrorResponse,
};

pub async fn health() -> ResponseJson<serde_json::Value> {
    ResponseJson(serde_json::json!({
        "status": "healthy",
        "service": "business-entity-service",
        "version": "0.1.0",
        "port": 8003
    }))
}
/// Creates a new business entity from the provided request data.
///
/// This endpoint handles the creation of a new business entity by accepting
/// JSON data, validating it, and persisting it to the database.
///
/// # Arguments
///
/// * `request` - A JSON payload containing the business entity details
///   (name, description, etc.)
///
/// # Returns
///
/// Returns a successful API response containing the created `BusinessEntity` on success.
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
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}

/// Gets a specific business entity specified by the id
///
/// This endpoint handles the receiving of a business entity by its id
///
/// # Arguments
///
/// * `id` - Represents a `String` that specifies the UUID identifier of a businees saved in the `Database`
///
/// # Returns
///
/// Returns a HTTP response with the business entity data
/// in a `JSON` format containing all the details of the
/// business alongside a `StatusCode`for the response
pub async fn get_entity(
    Path(id): Path<String>,
) -> Result<ResponseJson<ApiResponse<BusinessEntity>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Fetching business entity: {}", id);

    let service = BusinessEntityService::new();

    match service.get_entity(&id).await {
        Ok(Some(entity)) => Ok(ResponseJson(ApiResponse::success(entity))),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            ResponseJson(ErrorResponse::new("Business entity not found")),
        )),
        Err(e) => {
            tracing::error!("Failed to get business entity: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}

/// Updates a 'Business Entity' specified by its `ID`
///
/// # Arguments
///
/// * `id` - Represents a `String` that specifies the UUID identifier of a businees saved in the `Database`
/// * `request` - Represents a `JSON` that contains the new `data` of the specified `Business Entity`
///
/// # Returns
///
/// Returns a HTTP response with the business entity data
/// in a `JSON` format containing all the details of the
/// business alongside a `StatusCode`for the response
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
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}

/// Deletes a 'Business Entity' specified by its `ID`
///
/// # Arguments
///
/// * `id` - Represents a `String` that specifies the UUID identifier of the business entity to be deleted from the `Database`
///
/// # Returns
///
/// Returns a HTTP response with a success message confirming the deletion
/// in a `JSON` format containing the deletion confirmation alongside
/// a `StatusCode` for the response
///
/// # Errors
///
/// Returns a `NOT_FOUND` status if:
/// * The business entity with the specified `ID` does not exist in the `Database`
/// * The deletion operation fails
pub async fn delete_entity(
    Path(id): Path<String>,
) -> Result<ResponseJson<ApiResponse<String>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Deleting business entity: {}", id);

    let service = BusinessEntityService::new();

    match service.delete_entity(&id).await {
        Ok(_) => Ok(ResponseJson(ApiResponse::success(format!(
            "Business entity {} deleted",
            id
        )))),
        Err(e) => {
            tracing::error!("Failed to delete business entity: {}", e);
            Err((
                StatusCode::NOT_FOUND,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}

/// Retrieves a list of all 'Business Entities' from the `Database`
///
/// # Arguments
///
/// None
///
/// # Returns
///
/// Returns a HTTP response with a list of all business entities
/// in a `JSON` format containing all the details of each business
/// alongside a `StatusCode` for the response
///
/// # Errors
///
/// Returns an `INTERNAL_SERVER_ERROR` status if:
/// * The database query fails
/// * An unexpected error occurs during the retrieval operation
pub async fn list_entities(
) -> Result<ResponseJson<ApiResponse<Vec<BusinessEntity>>>, (StatusCode, ResponseJson<ErrorResponse>)>
{
    tracing::info!("Listing business entities");

    let service = BusinessEntityService::new();

    match service.list_entities().await {
        Ok(entities) => Ok(ResponseJson(ApiResponse::success(entities))),
        Err(e) => {
            tracing::error!("Failed to list business entities: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}

/// Validates a 'Business Entity' specified by its `ID` that is already present inside the `Database`
///
/// # Arguments
///
/// * `id` - Represents a `String` that specifies the UUID identifier of the business entity to be validated from the `Database`
///
/// # Returns
///
/// Returns a HTTP response with the validation result of the business entity
/// in a `JSON` format containing the validation details and status
/// alongside a `StatusCode` for the response
///
/// # Errors
///
/// Returns a `BAD_REQUEST` status if:
/// * The business entity with the specified `ID` does not exist in the `Database`
/// * The validation operation fails
/// * The entity data is invalid or incomplete
pub async fn validate_entity(
    Path(id): Path<String>,
) -> Result<
    ResponseJson<ApiResponse<BusinessEntityValidationResponse>>,
    (StatusCode, ResponseJson<ErrorResponse>),
> {
    tracing::info!("Validating business entity: {}", id);

    let service = BusinessEntityService::new();

    match service.validate_entity_by_id(&id).await {
        Ok(validation_result) => Ok(ResponseJson(ApiResponse::success(validation_result))),
        Err(e) => {
            tracing::error!("Failed to validate business entity: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}

/// Validates 'Business Entity' data provided in the request
///
/// # Arguments
///
/// * `request` - Represents a `JSON` that contains the business entity data to be validated
///
/// # Returns
///
/// Returns a HTTP response with the validation result of the provided business entity data
/// in a `JSON` format containing the validation details and status
/// alongside a `StatusCode` for the response
///
/// # Errors
///
/// Returns a `BAD_REQUEST` status if:
/// * The provided data is invalid or incomplete
/// * The validation rules are not satisfied
/// * The registration number format is incorrect
pub async fn validate_entity_data(
    Json(request): Json<BusinessEntityValidationRequest>,
) -> Result<
    ResponseJson<ApiResponse<BusinessEntityValidationResponse>>,
    (StatusCode, ResponseJson<ErrorResponse>),
> {
    tracing::info!(
        "Validating business entity data for: {}",
        request.registration_number
    );

    let service = BusinessEntityService::new();

    match service.validate_entity_data(request).await {
        Ok(validation_result) => Ok(ResponseJson(ApiResponse::success(validation_result))),
        Err(e) => {
            tracing::error!("Failed to validate business entity data: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}
