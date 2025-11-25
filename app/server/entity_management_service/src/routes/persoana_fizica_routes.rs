use actix_web::{Scope, web};

use crate::handlers::{
    create_new_persoana_fizica, delete_persoana_fizica, get_persoana_fizica_by_id,
};

pub fn persoana_fizica_routes() -> Scope {
    web::scope("/persoana_fizica")
        .service(get_persoana_fizica_by_id)
        .service(create_new_persoana_fizica)
        //.service(update_persoana_fizica)
        .service(delete_persoana_fizica)
}
