use actix_web::{HttpResponse, Responder, get, web};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{
    common::{AdresaResponse, ReprezentantResponse},
    persoana_fizica::PersoanaFizicaResponse,
};

#[get("/api/persoana_fizica/{id}")]
pub async fn get_persoana_fizica(path: web::Path<Uuid>, pool: web::Data<PgPool>) -> impl Responder {
    let id = path.into_inner();

    let persoana_result = sqlx::query!(
        r#"
        SELECT 
            uuid,
            tip::TEXT AS "tip!",
            nume,
            prenume,
            serie_act_identitate,
            numar_act_identitate,
            data_nasterii,
            cetatenie,
            adresa_domiciliu_uuid,
            reprezentant_uuid,
            cod_caen,
            platitor_tva,
            stare_fiscala::TEXT AS "stare_fiscala!",
            inregistrat_in_spv,
            created_at
        FROM persoane_fizice
        WHERE uuid = $1
        "#,
        id
    )
    .fetch_optional(&**pool)
    .await;

    let persoana = match persoana_result {
        Ok(Some(p)) => p,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Persoana fizică nu a fost găsită"
            }));
        }
        Err(e) => {
            log::error!("Eroare DB persoana: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Eroare internă de server"
            }));
        }
    };

    let adresa_result = sqlx::query!(
        r#"
        SELECT uuid, tara, judet, localitate, cod_postal, strada, numar,
               bloc, scara, etaj, apartament, detalii
        FROM address
        WHERE uuid = $1
        "#,
        persoana.adresa_domiciliu_uuid
    )
    .fetch_one(&**pool)
    .await;

    let adresa = match adresa_result {
        Ok(a) => AdresaResponse {
            uuid: a.uuid,
            tara: a.tara,
            judet: a.judet,
            localitate: a.localitate,
            cod_postal: a.cod_postal,
            strada: a.strada,
            numar: a.numar,
            bloc: a.bloc,
            scara: a.scara,
            etaj: a.etaj,
            apartament: a.apartament,
            detalii: a.detalii,
        },
        Err(e) => {
            log::error!("Eroare DB adresa: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Eroare la încărcarea adresei"
            }));
        }
    };

    let reprezentant_result = sqlx::query!(
        r#"
        SELECT uuid, nume, prenume, email, telefon, calitate::TEXT AS "calitate!"
        FROM reprezentanti
        WHERE uuid = $1
        "#,
        persoana.reprezentant_uuid
    )
    .fetch_one(&**pool)
    .await;

    let reprezentant = match reprezentant_result {
        Ok(r) => ReprezentantResponse {
            uuid: r.uuid,
            nume: r.nume,
            prenume: r.prenume,
            email: r.email,
            telefon: r.telefon,
            calitate: r.calitate,
        },
        Err(e) => {
            log::error!("Eroare DB reprezentant: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Eroare la încărcarea reprezentantului"
            }));
        }
    };

    let response = PersoanaFizicaResponse {
        uuid: persoana.uuid,
        tip: persoana.tip,
        nume: persoana.nume,
        prenume: persoana.prenume,
        serie_act_identitate: persoana.serie_act_identitate,
        numar_act_identitate: persoana.numar_act_identitate,
        data_nasterii: persoana.data_nasterii,
        cetatenie: persoana.cetatenie,
        adresa_domiciliu: adresa,
        reprezentant: reprezentant,
        cod_caen: persoana.cod_caen,
        platitor_tva: persoana.platitor_tva,
        stare_fiscala: persoana.stare_fiscala,
        inregistrat_in_spv: persoana.inregistrat_in_spv,
        created_at: persoana.created_at,
    };

    HttpResponse::Ok().json(response)
}
