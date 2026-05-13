#[cfg(test)]
mod test {
    use actix_http::StatusCode;
    use actix_web::test;

    use crate::common::admin_user;
    use crate::invoice::{DRAFT_ID, NONEXISTENT_ID, InvoiceMockBehaviour, build_invoice_app};

    #[actix_web::test]
    async fn returns_200_when_found() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, admin_user).await;
        let req = test::TestRequest::get()
            .uri(&format!("/factura/{DRAFT_ID}"))
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::OK);

        let body: serde_json::Value = test::read_body_json(res).await;
        assert_eq!(body["invoice"]["id"], DRAFT_ID.to_string());
        assert_eq!(body["invoice"]["status"], "Draft");
        assert!(body["lines"].is_array());
    }

    #[actix_web::test]
    async fn returns_404_when_not_found() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, admin_user).await;
        let req = test::TestRequest::get()
            .uri(&format!("/factura/{NONEXISTENT_ID}"))
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }

    #[actix_web::test]
    async fn returns_500_on_db_error() {
        let app = build_invoice_app(InvoiceMockBehaviour::InternalServerError, admin_user).await;
        let req = test::TestRequest::get()
            .uri(&format!("/factura/{DRAFT_ID}"))
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }
}
