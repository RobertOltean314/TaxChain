use std::sync::Arc;

use actix_web::{App, HttpMessage, dev::{Service, ServiceResponse}, test, web};
use taxchain::{
    auth::middleware::AuthenticatedUser,
    blockchain::anchor::AnchorService,
    handlers::invoice_handlers::{
        create_invoice, delete_invoice, find_all_invoices, get_invoice_by_id,
        update_invoice_status,
    },
};

use super::mock_repos::{InvoiceMockBehaviour, mock_audit_repo, mock_invoice_repo, mock_user_repo};

pub async fn build_invoice_app(
    behaviour: InvoiceMockBehaviour,
    user_fn: fn() -> AuthenticatedUser,
) -> impl actix_web::dev::Service<
    actix_http::Request,
    Response = ServiceResponse,
    Error = actix_web::Error,
> {
    let invoice_repo = mock_invoice_repo(behaviour);
    let user_repo = mock_user_repo();
    let audit_repo = mock_audit_repo();
    let anchor_service = Arc::new(
        AnchorService::new(
            "http://localhost:0",
            "0x0000000000000000000000000000000000000000",
        )
        .expect("dummy AnchorService"),
    );

    test::init_service(
        App::new()
            .wrap_fn(move |req, srv| {
                req.extensions_mut().insert(user_fn());
                srv.call(req)
            })
            .app_data(web::Data::new(invoice_repo))
            .app_data(web::Data::new(user_repo))
            .app_data(web::Data::new(audit_repo))
            .app_data(web::Data::new(anchor_service))
            .service(
                web::scope("/factura")
                    .service(find_all_invoices)
                    .service(get_invoice_by_id)
                    .service(create_invoice)
                    .service(update_invoice_status)
                    .service(delete_invoice),
            ),
    )
    .await
}
