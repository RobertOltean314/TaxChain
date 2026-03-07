#[cfg(test)]
mod tests {
    use actix_web::{
        App,
        http::{StatusCode, header::ContentType},
        test, web,
    };
    use taxchain::{
        handlers::{
            create_persoana_fizica, delete_persoana_fizica, get_persoana_fizica_by_id,
            persoana_fizica_handler, persoana_juridica_handler, update_persoana_fizica,
        },
        hello,
        services::persoana_fizica_service,
    };

    fn pf_store() -> web::Data<persoana_fizica_service::PersoanaFizicaStore> {
        web::Data::new(persoana_fizica_service::create_store())
    }

    #[actix_web::test]
    async fn test_index_get() {
        let app = test::init_service(App::new().service(hello)).await;
        let req = test::TestRequest::default()
            .insert_header(ContentType::plaintext())
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::OK)
    }

    #[actix_web::test]
    async fn test_persoana_fizica_get() {
        let store = pf_store();
        let app = test::init_service(
            App::new()
                .app_data(store.clone())
                .service(web::scope("/persoana-fizica").service(persoana_fizica_handler)),
        )
        .await;
        let req = test::TestRequest::get()
            .uri("/persoana-fizica")
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::OK)
    }

    #[actix_web::test]
    async fn test_persoana_juridica_get() {
        let app = test::init_service(
            App::new().service(web::scope("/persoana-juridica").service(persoana_juridica_handler)),
        )
        .await;
        let req = test::TestRequest::get()
            .uri("/persoana-juridica")
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::OK)
    }

    fn build_app_with_all_pf_routes(
        store: web::Data<persoana_fizica_service::PersoanaFizicaStore>,
    ) -> actix_web::App<
        impl actix_web::dev::ServiceFactory<
            actix_web::dev::ServiceRequest,
            Config = (),
            Response = actix_web::dev::ServiceResponse,
            Error = actix_web::Error,
            InitError = (),
        >,
    > {
        App::new().app_data(store).service(
            web::scope("/persoana-fizica")
                .service(persoana_fizica_handler)
                .service(get_persoana_fizica_by_id)
                .service(create_persoana_fizica)
                .service(update_persoana_fizica)
                .service(delete_persoana_fizica),
        )
    }

    /// A valid CNP for testing: sex digit 1 (male, born 1900-2000),
    /// birth date 1990-01-01, county code 22, sequence 114.
    const VALID_CNP: &str = "1900101221140";

    /// A valid Romanian IBAN for testing.
    const VALID_IBAN: &str = "RO49AAAA1B31007593840000";

    fn valid_pf_body() -> serde_json::Value {
        serde_json::json!({
            "cnp": VALID_CNP,
            "nume": "Popescu",
            "prenume": "Ion",
            "data_nasterii": "1990-01-01",
            "sex": "M",
            "adresa_domiciliu": "Str. Exemplu nr. 1, Bucuresti",
            "iban": VALID_IBAN,
            "stare": "activ"
        })
    }

    #[actix_web::test]
    async fn test_create_persoana_fizica_returns_created() {
        let store = pf_store();
        let app = test::init_service(build_app_with_all_pf_routes(store)).await;

        let req = test::TestRequest::post()
            .uri("/persoana-fizica")
            .insert_header(ContentType::json())
            .set_json(valid_pf_body())
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::CREATED);
    }

    #[actix_web::test]
    async fn test_get_all_returns_created_record() {
        let store = pf_store();
        let app = test::init_service(build_app_with_all_pf_routes(store)).await;

        // Create one record
        let create_req = test::TestRequest::post()
            .uri("/persoana-fizica")
            .insert_header(ContentType::json())
            .set_json(valid_pf_body())
            .to_request();
        let _create_res = test::call_service(&app, create_req).await;

        // GET all should return it
        let get_req = test::TestRequest::get()
            .uri("/persoana-fizica")
            .to_request();
        let get_res = test::call_service(&app, get_req).await;
        assert_eq!(get_res.status(), StatusCode::OK);

        let body: serde_json::Value = test::read_body_json(get_res).await;
        assert!(body.as_array().unwrap().len() == 1);
    }

    #[actix_web::test]
    async fn test_get_by_id_found_and_not_found() {
        let store = pf_store();
        let app = test::init_service(build_app_with_all_pf_routes(store)).await;

        // Create one record and capture its id
        let create_req = test::TestRequest::post()
            .uri("/persoana-fizica")
            .insert_header(ContentType::json())
            .set_json(valid_pf_body())
            .to_request();
        let create_res = test::call_service(&app, create_req).await;
        let body: serde_json::Value = test::read_body_json(create_res).await;
        let id = body["id"].as_str().unwrap();

        // GET by existing id
        let get_req = test::TestRequest::get()
            .uri(&format!("/persoana-fizica/{}", id))
            .to_request();
        let get_res = test::call_service(&app, get_req).await;
        assert_eq!(get_res.status(), StatusCode::OK);

        // GET by non-existent id
        let missing = test::TestRequest::get()
            .uri("/persoana-fizica/00000000-0000-0000-0000-000000000000")
            .to_request();
        let missing_res = test::call_service(&app, missing).await;
        assert_eq!(missing_res.status(), StatusCode::NOT_FOUND);
    }

    #[actix_web::test]
    async fn test_update_persoana_fizica() {
        let store = pf_store();
        let app = test::init_service(build_app_with_all_pf_routes(store)).await;

        // Create
        let create_req = test::TestRequest::post()
            .uri("/persoana-fizica")
            .insert_header(ContentType::json())
            .set_json(valid_pf_body())
            .to_request();
        let create_res = test::call_service(&app, create_req).await;
        let body: serde_json::Value = test::read_body_json(create_res).await;
        let id = body["id"].as_str().unwrap();

        // Update with changed name
        let mut updated = valid_pf_body();
        updated["nume"] = serde_json::json!("Ionescu");
        let put_req = test::TestRequest::put()
            .uri(&format!("/persoana-fizica/{}", id))
            .insert_header(ContentType::json())
            .set_json(updated)
            .to_request();
        let put_res = test::call_service(&app, put_req).await;
        assert_eq!(put_res.status(), StatusCode::OK);
        let updated_body: serde_json::Value = test::read_body_json(put_res).await;
        assert_eq!(updated_body["nume"], "Ionescu");
    }

    #[actix_web::test]
    async fn test_delete_persoana_fizica() {
        let store = pf_store();
        let app = test::init_service(build_app_with_all_pf_routes(store)).await;

        // Create
        let create_req = test::TestRequest::post()
            .uri("/persoana-fizica")
            .insert_header(ContentType::json())
            .set_json(valid_pf_body())
            .to_request();
        let create_res = test::call_service(&app, create_req).await;
        let body: serde_json::Value = test::read_body_json(create_res).await;
        let id = body["id"].as_str().unwrap();

        // Delete
        let del_req = test::TestRequest::delete()
            .uri(&format!("/persoana-fizica/{}", id))
            .to_request();
        let del_res = test::call_service(&app, del_req).await;
        assert_eq!(del_res.status(), StatusCode::NO_CONTENT);

        // Confirm it is gone
        let get_req = test::TestRequest::get()
            .uri(&format!("/persoana-fizica/{}", id))
            .to_request();
        let get_res = test::call_service(&app, get_req).await;
        assert_eq!(get_res.status(), StatusCode::NOT_FOUND);
    }

    #[actix_web::test]
    async fn test_create_invalid_request_returns_bad_request() {
        let store = pf_store();
        let app = test::init_service(build_app_with_all_pf_routes(store)).await;

        // Send empty object — missing required fields
        let req = test::TestRequest::post()
            .uri("/persoana-fizica")
            .insert_header(ContentType::json())
            .set_json(serde_json::json!({}))
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }
}

