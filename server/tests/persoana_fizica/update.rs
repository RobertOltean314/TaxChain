#[cfg(test)]
mod test {
    use actix_http::StatusCode;
    use actix_web::test;

    use crate::common::{
        MockBehaviour, build_app,
        fixtures::{POPESCU_ID, mock_persoana_fizica_request},
    };

    #[actix_web::test]
    async fn test_update_returns_200_on_success() {
        let app = build_app(MockBehaviour::Success).await;
        let req = test::TestRequest::put()
            .uri(&format!("/persoana-fizica/{}", POPESCU_ID))
            .set_json(mock_persoana_fizica_request())
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::OK);

        let body = test::read_body(res).await;
        assert!(!body.is_empty());
    }

    #[actix_web::test]
    async fn test_update_returns_400_on_bad_request() {
        let app = build_app(MockBehaviour::BadRequest).await;
        let req = test::TestRequest::put()
            .uri(&format!("/persoana-fizica/{}", POPESCU_ID))
            .insert_header(("Content-Type", "application/json"))
            .set_payload("{this is not valid json}")
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);

        let body = test::read_body(res).await;
        assert!(!body.is_empty());
    }

    #[actix_web::test]
    async fn test_update_returns_404_when_not_found() {
        let app = build_app(MockBehaviour::NotFound).await;
        let req = test::TestRequest::put()
            .uri(&format!("/persoana-fizica/{}", POPESCU_ID))
            .set_json(mock_persoana_fizica_request())
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }

    #[actix_web::test]
    async fn test_update_returns_422_on_unprocessable_content() {
        let app = build_app(MockBehaviour::BadRequest).await;
        let mut bad_request = mock_persoana_fizica_request();
        bad_request.cnp = "ANA-ARE-MERE".to_string();
        let req = test::TestRequest::put()
            .uri(&format!("/persoana-fizica/{}", POPESCU_ID))
            .set_json(bad_request)
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);

        let body = test::read_body(res).await;
        assert!(!body.is_empty());
    }

    #[actix_web::test]
    async fn test_update_returns_500_on_internal_error() {
        let app = build_app(MockBehaviour::InternalServerError).await;
        let req = test::TestRequest::put()
            .uri(&format!("/persoana-fizica/{}", POPESCU_ID))
            .set_json(mock_persoana_fizica_request())
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = test::read_body(res).await;
        assert!(!body.is_empty());
    }
}
