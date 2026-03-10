#[cfg(test)]
mod test {
    use crate::common::{MockBehaviour, POPESCU_ID, build_app, mock_persoana_fizica};
    use actix_http::StatusCode;
    use actix_web::test;
    use taxchain::models::PersoanaFizica;

    #[actix_web::test]
    async fn test_find_by_id_returns_200_with_result() {
        let app = build_app(MockBehaviour::Success).await;
        let req = test::TestRequest::get()
            .uri(&format!("/persoana-fizica/{}", POPESCU_ID))
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::OK);

        let expected_persoana_fizica: PersoanaFizica = mock_persoana_fizica()[0].clone();
        let body: PersoanaFizica = test::read_body_json(res).await;
        assert_eq!(body, expected_persoana_fizica);
    }

    #[actix_web::test]
    async fn test_find_by_id_returns_404_when_not_found() {
        let app = build_app(MockBehaviour::NotFound).await;
        let req = test::TestRequest::get()
            .uri(&format!("/persoana-fizica/{}", POPESCU_ID))
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }

    #[actix_web::test]
    async fn test_find_by_id_returns_500_on_internal_error() {
        let app = build_app(MockBehaviour::InternalServerError).await;
        let req = test::TestRequest::get()
            .uri(&format!("/persoana-fizica/{}", POPESCU_ID))
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
