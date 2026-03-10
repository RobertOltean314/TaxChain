#[cfg(test)]
mod test {
    use actix_http::StatusCode;
    use actix_web::test;

    use crate::common::{MockBehaviour, build_app, fixtures::POPESCU_ID};

    #[actix_web::test]
    async fn test_delete_returns_204_on_success() {
        let app = build_app(MockBehaviour::Success).await;
        let req = test::TestRequest::delete()
            .uri(&format!("/persoana-fizica/{}", POPESCU_ID))
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::NO_CONTENT);
    }

    #[actix_web::test]
    async fn test_delete_returns_404_when_not_found() {
        let app = build_app(MockBehaviour::NotFound).await;
        let req = test::TestRequest::delete()
            .uri(&format!("/persoana-fizica/{}", POPESCU_ID))
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }

    #[actix_web::test]
    async fn test_delete_returns_500_on_internal_error() {
        let app = build_app(MockBehaviour::InternalServerError).await;
        let req = test::TestRequest::delete()
            .uri(&format!("/persoana-fizica/{}", POPESCU_ID))
            .to_request();
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = test::read_body(res).await;
        assert!(!body.is_empty());
    }
}
