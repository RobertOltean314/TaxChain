use actix_web::{Scope, web};

use crate::handlers::{
    create_new_persoana_fizica, delete_persoana_fizica, get_all_persoane_fizice,
    get_persoana_fizica_by_id, update_persoana_fizica,
};

pub fn persoana_fizica_routes() -> Scope {
    web::scope("/persoane-fizice")
        .service(get_all_persoane_fizice)
        .service(get_persoana_fizica_by_id)
        .service(create_new_persoana_fizica)
        .service(update_persoana_fizica)
        .service(delete_persoana_fizica)
}
