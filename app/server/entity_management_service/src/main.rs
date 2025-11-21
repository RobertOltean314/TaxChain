mod handlers;
mod helpers;
mod models;
mod repository;

use actix_web::{App, HttpServer, web};
use models::{EntitateStraina, InstitutiePublica, Ong, PersoanaFizica, PersoanaJuridica};

use crate::{
    handlers::{create_persoana_fizica, get_persoana_fizica},
    repository::database_connection::create_pool,
};

pub struct InregistrareFiscala {
    contribuabil: Contribuabil,
    obligatii: ObligatiiFiscale,
}

pub enum Contribuabil {
    PersoanaFizica(PersoanaFizica),
    PersoanaJuridica(PersoanaJuridica),
    Ong(Ong),
    InstitutiePublica(InstitutiePublica),
    EntitateStraina(EntitateStraina),
    Other(String),
}

pub struct ObligatiiFiscale {
    impozit_pe_venit: bool,
    cas: bool,
    cass: bool,
    tva: bool,
    alte_obligatii: String,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let pool = create_pool().await;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    let host = "127.0.0.1";
    let port = 8080;

    println!("Starting Entity Management Service...");
    println!("Server running at http://{}:{}", host, port);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .service(get_persoana_fizica)
            .service(create_persoana_fizica)
    })
    .bind((host, port))?
    .run()
    .await
}
