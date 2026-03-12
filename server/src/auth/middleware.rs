use actix_web::{
    Error, HttpMessage, HttpRequest, HttpResponse,
    body::EitherBody,
    dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready},
    web,
};
use futures_util::future::{LocalBoxFuture, Ready, ready};
use serde_json::json;
use std::rc::Rc;

use crate::auth::jwt::decode_token;
use crate::handlers::auth_handlers::AuthConfig;
use crate::models::Claims;

// ============================================================================
// AUTHENTICATED CLAIMS EXTRACTOR
// ============================================================================

/// Attached to the request extensions after successful JWT validation.
/// Handlers can extract this with `req.extensions().get::<AuthenticatedUser>()`.
#[derive(Debug, Clone)]
pub struct AuthenticatedUser(pub Claims);

impl AuthenticatedUser {
    pub fn claims(&self) -> &Claims {
        &self.0
    }
}

// ============================================================================
// MIDDLEWARE FACTORY
// ============================================================================

/// Actix middleware that extracts and validates the `Authorization: Bearer <token>`
/// header on every request passing through it.
///
/// On success: attaches `AuthenticatedUser` to request extensions and calls next.
/// On failure: short-circuits with 401 Unauthorized.
///
/// # Usage in main.rs
/// ```rust
/// web::scope("/persoana-fizica")
///     .wrap(JwtAuthMiddleware)
///     .service(find_all_persoana_fizica)
/// ```
pub struct JwtAuthMiddleware;

impl<S, B> Transform<S, ServiceRequest> for JwtAuthMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type InitError = ();
    type Transform = JwtAuthMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(JwtAuthMiddlewareService {
            service: Rc::new(service),
        }))
    }
}

pub struct JwtAuthMiddlewareService<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for JwtAuthMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = Rc::clone(&self.service);

        Box::pin(async move {
            // 1. Extract Bearer token from Authorization header
            let token = match extract_bearer_token(&req) {
                Some(t) => t,
                None => {
                    let response = HttpResponse::Unauthorized()
                        .json(json!({ "error": "Missing Authorization header" }));
                    return Ok(req.into_response(response).map_into_right_body());
                }
            };

            // 2. Get JWT secret from app state
            let config = match req.app_data::<web::Data<AuthConfig>>() {
                Some(c) => c.clone(),
                None => {
                    eprintln!("AuthConfig not found in app data — did you register it in main.rs?");
                    let response = HttpResponse::InternalServerError()
                        .json(json!({ "error": "Auth configuration missing" }));
                    return Ok(req.into_response(response).map_into_right_body());
                }
            };

            // 3. Decode + validate token
            let claims = match decode_token(&token, &config.jwt_secret) {
                Ok(c) => c,
                Err(e) => {
                    let response = HttpResponse::Unauthorized().json(json!({
                        "error": "Invalid or expired token",
                        "details": e.to_string()
                    }));
                    return Ok(req.into_response(response).map_into_right_body());
                }
            };

            // 4. Attach claims to request extensions for downstream handlers
            req.extensions_mut().insert(AuthenticatedUser(claims));

            // Success path — map B into EitherBody::Left so the type unifies
            service.call(req).await.map(|res| res.map_into_left_body())
        })
    }
}

// ============================================================================
// ROLE GUARD HELPER
// ============================================================================

use crate::models::user_model::UserRole;

/// Extract the authenticated user from request extensions.
/// Returns `None` if the middleware was not applied to this route.
pub fn get_authenticated_user(req: &HttpRequest) -> Option<AuthenticatedUser> {
    req.extensions().get::<AuthenticatedUser>().cloned()
}

/// Check if the authenticated user has one of the allowed roles.
/// Returns `Err(HttpResponse)` with 403 if the role is not permitted.
pub fn require_role(
    req: &HttpRequest,
    allowed_roles: &[UserRole],
) -> Result<AuthenticatedUser, HttpResponse> {
    let user = get_authenticated_user(req).ok_or_else(|| {
        HttpResponse::Unauthorized().json(json!({ "error": "Authentication required" }))
    })?;

    if allowed_roles.contains(&user.claims().role) {
        Ok(user)
    } else {
        Err(HttpResponse::Forbidden().json(json!({
            "error": "Insufficient permissions",
            "required": allowed_roles.iter().map(|r| r.as_str()).collect::<Vec<_>>()
        })))
    }
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/// Extract the raw token string from `Authorization: Bearer <token>`.
fn extract_bearer_token(req: &ServiceRequest) -> Option<String> {
    let header_value = req.headers().get("Authorization")?.to_str().ok()?;

    let token = header_value.strip_prefix("Bearer ")?;

    if token.is_empty() {
        None
    } else {
        Some(token.to_string())
    }
}
