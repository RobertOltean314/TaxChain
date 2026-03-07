#[cfg(test)]
mod tests {
    use actix_web::{
        App,
        http::{StatusCode, header::ContentType},
        test, web,
    };
    use taxchain::{
        handlers::{persoana_fizica_handler, persoana_juridica_handler},
        hello,
    };

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
        let app = test::init_service(
            App::new().service(web::scope("/persoana-fizica").service(persoana_fizica_handler)),
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
}
