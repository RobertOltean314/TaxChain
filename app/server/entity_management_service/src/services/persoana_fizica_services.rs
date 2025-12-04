use crate::{
    helpers::hash_cnp,
    models::{
        PersoanaFizica,
        common::{
            AdresaResponse, CalitateReprezentant, ReprezentantResponse, StareFiscala,
            TipActIdentitate,
        },
        persoana_fizica::{PersoanaFizicaRequest, PersoanaFizicaResponse, TipPersoanaFizica},
    },
};
use actix_web::{
    Error, HttpResponse,
    web::{self, Data, Json, Path},
};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

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

pub async fn delete_persoana_fizica(
    path: web::Path<Uuid>,
    pool: Data<PgPool>,
) -> Result<(), sqlx::Error> {
    let id = path.into_inner();

    sqlx::query!(
        r#"
        DELETE FROM persoane_fizice
        WHERE uuid = $1
        "#,
        id
    )
    .execute(pool.get_ref())
    .await?;

    Ok(())
}

pub async fn update_persoana_fizica(
    path: Path<Uuid>,
    body: Json<PersoanaFizicaRequest>,
    pool: Data<PgPool>,
) -> Result<serde_json::Value, sqlx::Error> {
    let request = body.into_inner();
    let persoana_uuid = path.into_inner();

    let mut tx = pool.begin().await.map_err(|e| {
        eprintln!("Failed to start transaction: {:?}", e);
        e
    })?;

    let existing = sqlx::query!(
        r#"
        SELECT uuid, reprezentant_uuid, adresa_domiciliu_uuid 
        FROM persoane_fizice 
        WHERE uuid = $1
        "#,
        persoana_uuid
    )
    .fetch_optional(&mut *tx)
    .await?;

    if existing.is_none() {
        return Err(sqlx::Error::RowNotFound);
    }

    let existing = existing.unwrap();
    let old_reprezentant_uuid = existing.reprezentant_uuid;
    let old_address_uuid = existing.adresa_domiciliu_uuid;

    // Step 2: Update the existing address OR create a new one
    // Option A: Update the existing address
    sqlx::query!(
        r#"
        UPDATE address 
        SET 
            tara = $2,
            judet = $3,
            localitate = $4,
            cod_postal = $5,
            strada = $6,
            numar = $7,
            bloc = $8,
            scara = $9,
            etaj = $10,
            apartament = $11,
            updated_at = NOW()
        WHERE uuid = $1
        "#,
        old_address_uuid,
        request.adresa_domiciliu.tara,
        request.adresa_domiciliu.judet,
        request.adresa_domiciliu.localitate,
        request.adresa_domiciliu.cod_postal,
        request.adresa_domiciliu.strada,
        request.adresa_domiciliu.numar,
        request.adresa_domiciliu.bloc,
        request.adresa_domiciliu.scara,
        request.adresa_domiciliu.etaj,
        request.adresa_domiciliu.apartament,
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        eprintln!("Failed to update address: {:?}", e);
        e
    })?;

    let reprezentant_address_uuid = request.reprezentant.adresa_domiciliu;

    sqlx::query!(
        r#"
        UPDATE reprezentanti 
        SET 
            nume = $2,
            prenume = $3,
            cnp = $4,
            tip_act_identitate = $5,
            serie_act_identitate = $6,
            numar_act_identitate = $7,
            calitate = $8,
            telefon = $9,
            email = $10,
            data_nasterii = $11,
            adresa_domiciliu = $12,
            updated_at = NOW()
        WHERE uuid = $1
        "#,
        old_reprezentant_uuid,
        request.reprezentant.nume,
        request.reprezentant.prenume,
        request.reprezentant.cnp,
        request.reprezentant.tip_act_identitate as TipActIdentitate,
        request.reprezentant.serie_act_identitate,
        request.reprezentant.numar_act_identitate,
        request.reprezentant.calitate as CalitateReprezentant,
        request.reprezentant.telefon,
        request.reprezentant.email,
        request.reprezentant.data_nasterii,
        reprezentant_address_uuid,
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        eprintln!("Failed to update reprezentant: {:?}", e);
        e
    })?;

    let cnp_hash = hash_cnp(&request.cnp);

    sqlx::query!(
        r#"
        UPDATE persoane_fizice 
        SET 
            tip = $2,
            cnp_hash = $3,
            nume = $4,
            prenume = $5,
            serie_act_identitate = $6,
            numar_act_identitate = $7,
            data_nasterii = $8,
            cetatenie = $9,
            dovada_drept_folosinta = $10,
            cod_caen = $11,
            data_inregistrarii = $12,
            euid = $13,
            nr_ordine_reg_comert = $14,
            platitor_tva = $15,
            stare_fiscala = $16,
            inregistrat_in_spv = $17,
            updated_at = NOW()
        WHERE uuid = $1
        "#,
        persoana_uuid,
        request.tip as TipPersoanaFizica,
        cnp_hash,
        request.nume,
        request.prenume,
        request.serie_act_identitate,
        request.numar_act_identitate,
        request.data_nasterii,
        request.cetatenie,
        request.dovada_drept_folosinta as _,
        request.cod_caen,
        request.data_inregistrarii,
        request.euid,
        request.nr_ordine_reg_comert,
        request.platitor_tva,
        request.stare_fiscala as StareFiscala,
        request.inregistrat_in_spv,
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        eprintln!("Failed to update persoana fizica: {:?}", e);
        e
    })?;

    tx.commit().await.map_err(|e| {
        eprintln!("Failed to commit transaction: {:?}", e);
        e
    })?;

    Ok(serde_json::json!({
        "success": true,
        "message": "Persoana fizică actualizată cu succes",
        "data": {
            "uuid": persoana_uuid,
            "reprezentant_uuid": old_reprezentant_uuid,
            "address_uuid": old_address_uuid
        }
    }))
}
