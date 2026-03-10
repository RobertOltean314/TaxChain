#[cfg(test)]
mod test {
    use actix_http::StatusCode;
    use actix_web::test;

    use crate::common::{MockBehaviour, build_app, fixtures::mock_persoana_fizica_request};

    #[actix_web::test]
    async fn test_create_returns_201_on_succes() {
        let app = build_app(MockBehaviour::Created).await;
        let req = test::TestRequest::post()
            .uri("/persoana-fizica")
            .set_json(mock_persoana_fizica_request())
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::CREATED);

        let body = test::read_body(res).await;
        assert!(!body.is_empty())
    }

    #[actix_web::test]
    async fn test_create_returns_400_on_bad_request() {
        let app = build_app(MockBehaviour::BadRequest).await;
        let req = test::TestRequest::post()
            .uri("/persoana-fizica")
            .insert_header(("Content-Type", "application/json"))
            .set_payload("{this is not valid json}")
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);

        let body = test::read_body(res).await;
        assert!(!body.is_empty())
    }

    #[actix_web::test]
    async fn test_create_returns_422_on_unprocessable_content() {
        let app = build_app(MockBehaviour::BadRequest).await;

        let mut bad_persoana_fizica_request = mock_persoana_fizica_request();
        bad_persoana_fizica_request.cnp = "ANA-ARE-MERE".to_string();

        let req = test::TestRequest::post()
            .uri("/persoana-fizica")
            .set_json(bad_persoana_fizica_request)
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);

        let body = test::read_body(res).await;
        assert!(!body.is_empty())
    }

    #[actix_web::test]
    async fn test_create_returns_500_on_internal_error() {
        let app = build_app(MockBehaviour::InternalServerError).await;
        let req = test::TestRequest::post()
            .uri("/persoana-fizica")
            .set_json(mock_persoana_fizica_request())
            .to_request();
        let res = test::call_service(&app, req).await;

        assert_eq!(res.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = test::read_body(res).await;
        assert!(
            !body.is_empty(),
            "Expected error JSON body on internal server error"
        );
    }
}
