#[cfg(test)]
mod test {
    use actix_http::StatusCode;
    use actix_web::test;

    use crate::common::{TEST_PF_ID, admin_user, auditor_user};
    use crate::invoice::{DRAFT_ID, InvoiceMockBehaviour, build_invoice_app};

    #[actix_web::test]
    async fn returns_200_with_entity_headers() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, admin_user).await;
        let req = test::TestRequest::get()
            .uri("/factura")
            .insert_header(("X-Entity-Type", "PF"))
            .insert_header(("X-Entity-Id", TEST_PF_ID.to_string()))
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::OK);

        let body: Vec<serde_json::Value> = test::read_body_json(res).await;
        assert_eq!(body.len(), 2);
        assert_eq!(body[0]["id"], DRAFT_ID.to_string());
    }

    #[actix_web::test]
    async fn returns_400_without_entity_headers() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, admin_user).await;
        let req = test::TestRequest::get().uri("/factura").to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }

    #[actix_web::test]
    async fn returns_403_for_auditor_role() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, auditor_user).await;
        let req = test::TestRequest::get()
            .uri("/factura")
            .insert_header(("X-Entity-Type", "PF"))
            .insert_header(("X-Entity-Id", TEST_PF_ID.to_string()))
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::FORBIDDEN);
    }
}
