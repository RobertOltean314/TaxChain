use actix_web::{Scope, web};

use crate::{
    handlers::{get_my_entities, search_entities},
    middleware::WalletAuth,
};

pub fn entity_routes() -> Scope {
    web::scope("/entities")
        .service(search_entities)  // Public - no auth required
        .service(
            web::scope("")
                .wrap(WalletAuth)  // Protected - auth required
                .service(get_my_entities)
        )
}
