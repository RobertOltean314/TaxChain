#[cfg(test)]
mod test {
    use actix_http::StatusCode;
    use actix_web::test;

    use crate::common::admin_user;
    use crate::invoice::{DRAFT_ID, ISSUED_ID, NONEXISTENT_ID, InvoiceMockBehaviour, build_invoice_app};

    #[actix_web::test]
    async fn returns_204_for_draft_invoice() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, admin_user).await;
        let req = test::TestRequest::delete()
            .uri(&format!("/factura/{DRAFT_ID}"))
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::NO_CONTENT);
    }

    #[actix_web::test]
    async fn returns_409_for_non_deletable_status() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, admin_user).await;
        let req = test::TestRequest::delete()
            .uri(&format!("/factura/{ISSUED_ID}"))
            .to_request();

        // Issued invoices cannot be deleted (only Draft or Paid can)
        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::CONFLICT);

        let body: serde_json::Value = test::read_body_json(res).await;
        assert!(body["error"].as_str().unwrap().contains("Only Draft or Paid"));
    }

    #[actix_web::test]
    async fn returns_404_when_invoice_not_found() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, admin_user).await;
        let req = test::TestRequest::delete()
            .uri(&format!("/factura/{NONEXISTENT_ID}"))
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }
}
