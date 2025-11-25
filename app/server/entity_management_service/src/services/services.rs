use actix_web::{
    Error, HttpResponse,
    web::{self, Data, Json},
};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    helpers::hash_cnp,
    models::{
        PersoanaFizica,
        common::{AdresaResponse, CalitateReprezentant, ReprezentantResponse},
        persoana_fizica::{PersoanaFizicaRequest, PersoanaFizicaResponse},
    },
};

pub async fn get_persoana_fizica_by_id(
    path: web::Path<Uuid>,
    pool: web::Data<PgPool>,
) -> Result<PersoanaFizicaResponse, HttpResponse> {
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
            return Err(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Persoana fizică nu a fost găsită"
            })));
        }
        Err(e) => {
            log::error!("Eroare DB persoana: {:?}", e);
            return Err(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Eroare internă de server"
            })));
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
            return Err(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Eroare la încărcarea adresei"
            })));
        }
    };

    let reprezentant_result = sqlx::query!(
        r#"
        SELECT 
            uuid,
            nume,
            prenume,
            telefon,
            email,
            calitate as "calitate!: CalitateReprezentant",
            adresa_domiciliu,
            created_at
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
            telefon: r.telefon,
            email: r.email,
            calitate: r.calitate,
            adresa_domiciliu: r.adresa_domiciliu,
            created_at: r.created_at.unwrap_or_else(|| chrono::Utc::now()),
        },
        Err(e) => {
            log::error!("Eroare DB reprezentant: {:?}", e);
            return Err(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Eroare la încărcarea reprezentantului"
            })));
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
        reprezentant,
        cod_caen: persoana.cod_caen,
        platitor_tva: persoana.platitor_tva,
        stare_fiscala: persoana.stare_fiscala,
        inregistrat_in_spv: persoana.inregistrat_in_spv,
        created_at: Some(persoana.created_at.unwrap_or_else(|| chrono::Utc::now())),
    };

    Ok(response)
}

pub async fn create_new_persoana_fizica(
    body: Json<PersoanaFizicaRequest>,
    pool: Data<PgPool>,
) -> Result<HttpResponse, Error> {
    let request = body.into_inner();

    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(err) => {
            eprintln!("DB error starting transaction: {:?}", err);
            return Ok(HttpResponse::InternalServerError().body("Eroare la pornirea tranzacției"));
        }
    };

    let persoana_uuid = Uuid::new_v4();
    let reprezentant_uuid = Uuid::new_v4();
    let address_uuid = Uuid::new_v4();

    if let Err(err) = sqlx::query!(
        r#"
        INSERT INTO address (
            uuid,
            tara,
            judet,
            localitate,
            cod_postal,
            strada,
            numar,
            bloc,
            scara,
            etaj,
            apartament
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
        )
        "#,
        address_uuid,
        request.adresa_domiciliu.tara,
        request.adresa_domiciliu.judet,
        request.adresa_domiciliu.localitate,
        request.adresa_domiciliu.cod_postal,
        request.adresa_domiciliu.strada,
        request.adresa_domiciliu.numar,
        request.adresa_domiciliu.bloc,
        request.adresa_domiciliu.scara,
        request.adresa_domiciliu.etaj,
        request.adresa_domiciliu.apartament
    )
    .execute(&mut *tx)
    .await
    {
        eprintln!("DB error inserting address: {:?}", err);
        let _ = tx.rollback().await;
        return Ok(HttpResponse::InternalServerError().body("Eroare la salvarea adresei"));
    }

    if let Err(err) = sqlx::query!(
        r#"
        INSERT INTO reprezentanti (
            uuid,
            parent_id,
            parent_type,
            nume,
            prenume,
            cnp,
            tip_act_identitate,
            serie_act_identitate,
            numar_act_identitate,
            calitate,
            telefon,
            email,
            data_nasterii,
            adresa_domiciliu,
            created_at,
            updated_at
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
        )
        "#,
        reprezentant_uuid,
        persoana_uuid,
        "persoana_fizica",
        request.reprezentant.nume,
        request.reprezentant.prenume,
        request.reprezentant.cnp,
        request.reprezentant.tip_act_identitate as _,
        request.reprezentant.serie_act_identitate,
        request.reprezentant.numar_act_identitate,
        request.reprezentant.calitate as _,
        request.reprezentant.telefon,
        request.reprezentant.email,
        request.reprezentant.data_nasterii,
        address_uuid,
        Utc::now(),
        Utc::now()
    )
    .execute(&mut *tx)
    .await
    {
        eprintln!("DB error inserting reprezentant: {:?}", err);
        let _ = tx.rollback().await;
        return Ok(HttpResponse::InternalServerError().body("Eroare la salvarea reprezentantului"));
    }

    let new_persoana_fizica = PersoanaFizica {
        uuid: persoana_uuid,
        tip: request.tip,
        reprezentant_uuid: reprezentant_uuid,
        cnp_hash: hash_cnp(&request.cnp),
        nume: request.nume,
        prenume: request.prenume,
        serie_act_identitate: request.serie_act_identitate,
        numar_act_identitate: request.numar_act_identitate,
        data_nasterii: request.data_nasterii,
        cetatenie: request.cetatenie,
        adresa_domiciliu_uuid: address_uuid,
        dovada_drept_folosinta: request.dovada_drept_folosinta,
        cod_caen: request.cod_caen,
        data_inregistrarii: request.data_inregistrarii,
        euid: request.euid,
        nr_ordine_reg_comert: request.nr_ordine_reg_comert,
        platitor_tva: request.platitor_tva,
        stare_fiscala: request.stare_fiscala,
        inregistrat_in_spv: request.inregistrat_in_spv,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = sqlx::query!(
        r#"
        INSERT INTO persoane_fizice (
            uuid,
            tip,
            reprezentant_uuid,
            cnp_hash,
            nume,
            prenume,
            serie_act_identitate,
            numar_act_identitate,
            data_nasterii,
            cetatenie,
            adresa_domiciliu_uuid,
            dovada_drept_folosinta,
            cod_caen,
            data_inregistrarii,
            euid,
            nr_ordine_reg_comert,
            platitor_tva,
            stare_fiscala,
            inregistrat_in_spv,
            created_at,
            updated_at
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
        )
        "#,
        new_persoana_fizica.uuid,
        new_persoana_fizica.tip as _,
        new_persoana_fizica.reprezentant_uuid,
        new_persoana_fizica.cnp_hash,
        new_persoana_fizica.nume,
        new_persoana_fizica.prenume,
        new_persoana_fizica.serie_act_identitate,
        new_persoana_fizica.numar_act_identitate,
        new_persoana_fizica.data_nasterii,
        new_persoana_fizica.cetatenie,
        new_persoana_fizica.adresa_domiciliu_uuid,
        new_persoana_fizica.dovada_drept_folosinta as _,
        new_persoana_fizica.cod_caen,
        new_persoana_fizica.data_inregistrarii,
        new_persoana_fizica.euid,
        new_persoana_fizica.nr_ordine_reg_comert,
        new_persoana_fizica.platitor_tva,
        new_persoana_fizica.stare_fiscala as _,
        new_persoana_fizica.inregistrat_in_spv,
        new_persoana_fizica.created_at,
        new_persoana_fizica.updated_at
    )
    .execute(&mut *tx)
    .await;

    match result {
        Ok(_) => {
            if let Err(err) = tx.commit().await {
                eprintln!("DB error commit: {:?}", err);
                return Ok(HttpResponse::InternalServerError().body("Eroare la commit"));
            }
            Ok(HttpResponse::Created().json(new_persoana_fizica))
        }
        Err(sqlx::Error::Database(db_err))
            if db_err.constraint() == Some("persoana_fizica_cnp_key") =>
        {
            let _ = tx.rollback().await;
            Ok(HttpResponse::Conflict().body("CNP-ul există deja în sistem"))
        }
        Err(err) => {
            eprintln!("Database error inserting persoana_fizica: {:?}", err);
            let _ = tx.rollback().await;
            Ok(HttpResponse::InternalServerError().body("Eroare la salvarea persoanei fizice"))
        }
    }
}
