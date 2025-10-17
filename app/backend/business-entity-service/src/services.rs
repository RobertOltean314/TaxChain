use anyhow::Result;
use common_types::{
    BusinessEntity, BusinessEntityValidationRequest, BusinessEntityValidationResponse, CountryCode,
    CreateBusinessEntityRequest,
};
use std::collections::HashMap;
use tokio::sync::RwLock;
use uuid::Uuid;

// TODO: Implement actual DB CRUD operations for this service

pub struct BusinessEntityService {
    // TODO: Migrate this storage to an actual DB
    entity_storage: RwLock<HashMap<String, BusinessEntity>>,
}

impl BusinessEntityService {
    pub fn new() -> Self {
        Self {
            entity_storage: RwLock::new(HashMap::new()),
        }
    }

    // CRUD Operations for Business Entity
    pub async fn create_entity(
        &self,
        request: CreateBusinessEntityRequest,
    ) -> Result<BusinessEntity> {
        let validation_request = BusinessEntityValidationRequest {
            registration_number: request.registration_number.clone(),
            tax_id: request.tax_id.clone(),
            country_code: request.country_code.clone(),
        };

        let validation_result = self.validate_entity_data(validation_request).await?;
        if !validation_result.is_valid {
            return Err(anyhow::anyhow!(
                "Entity validation failed: {:?}",
                validation_result.errors
            ));
        }

        let entity_id = Uuid::new_v4().to_string();
        let entity = BusinessEntity {
            id: entity_id.clone(),
            name: request.name,
            registration_number: request.registration_number,
            tax_id: request.tax_id,
            country_code: request.country_code,
            address: request.address,
            entity_type: request.entity_type,
            is_active: true,
        };

        let mut storage = self.entity_storage.write().await;
        storage.insert(entity_id, entity.clone());

        tracing::info!("Created business entity: {}", entity.id);
        Ok(entity)
    }

    pub async fn get_entity(&self, id: &str) -> Result<Option<BusinessEntity>> {
        // TODO: Migrate search to an actual DB
        let storage = self.entity_storage.read().await;
        Ok(storage.get(id).cloned())
    }

    pub async fn update_entity(
        &self,
        id: &str,
        request: CreateBusinessEntityRequest,
    ) -> Result<BusinessEntity> {
        let mut storage = self.entity_storage.write().await;

        if let Some(mut entity) = storage.get(id).cloned() {
            entity.name = request.name;
            entity.registration_number = request.registration_number;
            entity.tax_id = request.tax_id;
            entity.country_code = request.country_code;
            entity.address = request.address;
            entity.entity_type = request.entity_type;

            storage.insert(id.to_string(), entity.clone());
            tracing::info!("Updated business entity: {}", id);
            Ok(entity)
        } else {
            Err(anyhow::anyhow!("Business entity not found"))
        }
    }

    pub async fn delete_entity(&self, id: &str) -> Result<()> {
        let mut storage = self.entity_storage.write().await;

        if storage.remove(id).is_some() {
            tracing::info!("Deleted business entity: {}", id);
            Ok(())
        } else {
            Err(anyhow::anyhow!("Business entity not found"))
        }
    }

    pub async fn list_entities(&self) -> Result<Vec<BusinessEntity>> {
        let storage = self.entity_storage.read().await;
        Ok(storage.values().cloned().collect())
    }

    pub async fn validate_entity_by_id(
        &self,
        id: &str,
    ) -> Result<BusinessEntityValidationResponse> {
        let storage = self.entity_storage.read().await;

        if let Some(entity) = storage.get(id) {
            let request = BusinessEntityValidationRequest {
                registration_number: entity.registration_number.clone(),
                tax_id: entity.tax_id.clone(),
                country_code: entity.country_code.clone(),
            };
            self.validate_entity_data(request).await
        } else {
            Err(anyhow::anyhow!("Business entity not found"))
        }
    }

    pub async fn validate_entity_data(
        &self,
        request: BusinessEntityValidationRequest,
    ) -> Result<BusinessEntityValidationResponse> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Validate registration number
        if request.registration_number.is_empty() {
            errors.push("Registration number is required".to_string());
        } else {
            match request.country_code {
                // TODO: Check for Factory implementation here. Maybe it can work
                CountryCode::RO => {
                    if !self.validate_romanian_registration_number(&request.registration_number) {
                        errors.push("Invalid Romanian registration number format".to_string());
                    }
                }
                _ => {
                    if request.registration_number.len() < 5 {
                        warnings.push("Registration number seems unusually short".to_string());
                    }
                }
            }
        }

        if request.tax_id.is_empty() {
            errors.push("Tax ID is required".to_string());
        } else {
            match request.country_code {
                // TODO: Check for Factory implementation here. Maybe it can work
                CountryCode::RO => {
                    if !self.validate_romanian_tax_id(&request.tax_id) {
                        errors.push("Invalid Romanian tax ID format".to_string());
                    }
                }
                _ => {
                    if request.tax_id.len() < 5 {
                        warnings.push("Tax ID seems unusually short".to_string());
                    }
                }
            }
        }

        Ok(BusinessEntityValidationResponse {
            is_valid: errors.is_empty(),
            errors,
            warnings,
        })
    }

    fn validate_romanian_registration_number(&self, reg_number: &str) -> bool {
        // Basic Romanian registration number validation
        // Format: J[XX]/[NUMBER]/[YEAR] for companies or other patterns for different entity types
        // TODO: Implement proper validation, for now it works
        // ^[JF](\d{2}|00)\/\d{1,9}\/\d{4}$ -> potential regex
        if reg_number.starts_with('J') && reg_number.contains('/') {
            let parts: Vec<&str> = reg_number.split('/').collect();
            parts.len() >= 3
        } else {
            // For now, accept other formats
            !reg_number.is_empty() && reg_number.len() > 5
        }
    }

    fn validate_romanian_tax_id(&self, tax_id: &str) -> bool {
        // Basic Romanian tax ID validation (CUI)
        let cleaned = tax_id.replace("RO", "");
        cleaned.chars().all(|c| c.is_ascii_digit()) && cleaned.len() >= 2 && cleaned.len() <= 10
    }
}

impl Default for BusinessEntityService {
    fn default() -> Self {
        Self::new()
    }
}
