#[cfg(test)]
mod test {
    use actix_http::StatusCode;
    use actix_web::test;
    use serde_json::json;

    use crate::common::admin_user;
    use crate::invoice::{DRAFT_ID, ISSUED_ID, NONEXISTENT_ID, InvoiceMockBehaviour, build_invoice_app};

    #[actix_web::test]
    async fn returns_200_on_valid_transition_draft_to_issued() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, admin_user).await;
        let req = test::TestRequest::patch()
            .uri(&format!("/factura/{DRAFT_ID}/status"))
            .set_json(json!({ "status": "Issued" }))
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::OK);

        let body: serde_json::Value = test::read_body_json(res).await;
        assert_eq!(body["status"], "Issued");
    }

    #[actix_web::test]
    async fn returns_409_on_invalid_transition_issued_to_draft() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, admin_user).await;
        let req = test::TestRequest::patch()
            .uri(&format!("/factura/{ISSUED_ID}/status"))
            .set_json(json!({ "status": "Draft" }))
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::CONFLICT);

        let body: serde_json::Value = test::read_body_json(res).await;
        assert!(body["error"].as_str().unwrap().contains("Invalid status transition"));
    }

    #[actix_web::test]
    async fn returns_404_when_invoice_not_found() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, admin_user).await;
        let req = test::TestRequest::patch()
            .uri(&format!("/factura/{NONEXISTENT_ID}/status"))
            .set_json(json!({ "status": "Issued" }))
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }
}
