#[cfg(test)]
mod test {
    use crate::common::{IONESCU_ID, MockBehaviour, POPESCU_ID, build_app, fixtures::GEORGESCU_ID};
    use actix_http::StatusCode;
    use actix_web::test;
    use taxchain::models::PersoanaFizica;

    #[actix_web::test]
    async fn test_find_all_returns_200_with_results() {
        let app = build_app(MockBehaviour::ReturnsResults).await;
        let req = test::TestRequest::get()
            .uri("/persoana-fizica")
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::OK);

        let body: Vec<PersoanaFizica> = test::read_body_json(res).await;
        assert_eq!(body.len(), 3);
        assert_eq!(body[0].id, POPESCU_ID);
        assert_eq!(body[1].id, IONESCU_ID);
        assert_eq!(body[2].id, GEORGESCU_ID);
    }

    #[actix_web::test]
    async fn test_find_all_returns_200_with_empty_list() {
        let app = build_app(MockBehaviour::ReturnsEmpty).await;
        let req = test::TestRequest::get()
            .uri("/persoana-fizica")
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::OK);

        let body: Vec<PersoanaFizica> = test::read_body_json(res).await;
        assert!(body.is_empty());
    }

    #[actix_web::test]
    async fn test_find_all_returns_500_on_error() {
        let app = build_app(MockBehaviour::DatabaseFails).await;
        let req = test::TestRequest::get()
            .uri("/persoana-fizica")
            .to_request();
        let res = test::call_service(&app, req).await;

        assert_eq!(res.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }
}
