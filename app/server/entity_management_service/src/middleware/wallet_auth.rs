use actix_web::{
    Error, HttpMessage,
    dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready},
    error::ErrorUnauthorized,
};
use futures_util::future::LocalBoxFuture;
use std::future::{Ready, ready};

/// Middleware to verify MultiversX wallet signatures
pub struct WalletAuth;

impl<S, B> Transform<S, ServiceRequest> for WalletAuth
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = WalletAuthMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(WalletAuthMiddleware { service }))
    }
}

pub struct WalletAuthMiddleware<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for WalletAuthMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        // Extract wallet address from Authorization header
        // Format: "Bearer <wallet_address>:<signature>:<message>"
        let wallet_address = match req.headers().get("Authorization") {
            Some(auth_header) => {
                let auth_str = auth_header.to_str().unwrap_or("");
                if auth_str.starts_with("Bearer ") {
                    let token = &auth_str[7..]; // Remove "Bearer "
                    let parts: Vec<&str> = token.split(':').collect();

                    if parts.len() >= 1 {
                        Some(parts[0].to_string())
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
            None => None,
        };

        match wallet_address {
            Some(address) => {
                // TODO: Verify signature here
                // For now, just extract the address
                req.extensions_mut().insert(WalletClaims {
                    wallet_address: address,
                });

                let fut = self.service.call(req);
                Box::pin(async move {
                    let res = fut.await?;
                    Ok(res)
                })
            }
            None => Box::pin(async move {
                Err(ErrorUnauthorized(
                    "Missing or invalid wallet authentication",
                ))
            }),
        }
    }
}

#[derive(Debug, Clone)]
pub struct WalletClaims {
    pub wallet_address: String,
}

/// Optional wallet auth - doesn't fail if no auth provided
pub struct OptionalWalletAuth;

impl<S, B> Transform<S, ServiceRequest> for OptionalWalletAuth
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = OptionalWalletAuthMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(OptionalWalletAuthMiddleware { service }))
    }
}

pub struct OptionalWalletAuthMiddleware<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for OptionalWalletAuthMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        // Try to extract wallet address, but don't fail if not present
        if let Some(auth_header) = req.headers().get("Authorization") {
            let auth_str = auth_header.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                let token = &auth_str[7..];
                let parts: Vec<&str> = token.split(':').collect();

                if !parts.is_empty() {
                    req.extensions_mut().insert(WalletClaims {
                        wallet_address: parts[0].to_string(),
                    });
                }
            }
        }

        let fut = self.service.call(req);
        Box::pin(async move {
            let res = fut.await?;
            Ok(res)
        })
    }
}
