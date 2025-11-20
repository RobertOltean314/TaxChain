mod handlers;
mod models;

use actix_web::{App, HttpServer};
use models::{EntitateStraina, InstitutiePublica, Ong, PersoanaFizica, PersoanaJuridica};

use crate::handlers::get_persoana_fizica_test;

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
    let host = "127.0.0.1";
    let port = 8080;

    println!("Starting Entity Management Service...");
    println!("Server running at http://{}:{}", host, port);

    HttpServer::new(|| App::new().service(get_persoana_fizica_test))
        .bind((host, port))?
        .run()
        .await
}
