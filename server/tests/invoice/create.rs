#[cfg(test)]
mod test {
    use actix_http::StatusCode;
    use actix_web::test;
    use serde_json::json;

    use crate::common::{TEST_PF_ID, admin_user};
    use crate::invoice::{PARTNER_ID, InvoiceMockBehaviour, build_invoice_app};

    fn valid_body() -> serde_json::Value {
        json!({
            "number": "FC-2025-001",
            "issued_date": "2025-01-15",
            "partner_id": PARTNER_ID.to_string(),
            "issuer_pf_id": TEST_PF_ID.to_string(),
            "lines": [
                {
                    "description": "Consulting service",
                    "quantity": "1.00",
                    "unit_price": "100.00"
                }
            ]
        })
    }

    #[actix_web::test]
    async fn returns_201_on_success() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, admin_user).await;
        let req = test::TestRequest::post()
            .uri("/factura")
            .set_json(valid_body())
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::CREATED);

        let body: serde_json::Value = test::read_body_json(res).await;
        assert_eq!(body["number"], "FC-2025-001");
        assert_eq!(body["status"], "Draft");
    }

    #[actix_web::test]
    async fn returns_422_with_empty_lines() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, admin_user).await;
        let body = json!({
            "number": "FC-2025-001",
            "issued_date": "2025-01-15",
            "partner_id": PARTNER_ID.to_string(),
            "issuer_pf_id": TEST_PF_ID.to_string(),
            "lines": []
        });

        let req = test::TestRequest::post()
            .uri("/factura")
            .set_json(body)
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
    }

    #[actix_web::test]
    async fn returns_422_when_admin_omits_issuer() {
        let app = build_invoice_app(InvoiceMockBehaviour::Normal, admin_user).await;
        let body = json!({
            "number": "FC-2025-001",
            "issued_date": "2025-01-15",
            "partner_id": PARTNER_ID.to_string(),
            "lines": [
                {"description": "Service", "quantity": "1.00", "unit_price": "50.00"}
            ]
        });

        let req = test::TestRequest::post()
            .uri("/factura")
            .set_json(body)
            .to_request();

        let res = test::call_service(&app, req).await;
        assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
    }
}
