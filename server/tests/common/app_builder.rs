use std::sync::Arc;

use actix_web::{App, HttpMessage, dev::{Service, ServiceResponse}, test, web};
use taxchain::{
    handlers::{
        create_persoana_fizica, delete_persoana_fizica, find_all_persoana_fizica,
        get_persoana_fizica_by_id, update_persoana_fizica,
    },
    services::persoana_fizica_service::DynPersoanaFizicaRepository,
};

use crate::common::{MockBehaviour, admin_user, mock_repo::MockRepository, mock_user_repo};

/// Build a test app for the `/persoana-fizica` scope.
/// Injects an Admin `AuthenticatedUser` on every request so `require_role` passes.
pub async fn build_app(
    mock_behaviour: MockBehaviour,
) -> impl actix_web::dev::Service<
    actix_http::Request,
    Response = ServiceResponse,
    Error = actix_web::Error,
> {
    let repo: DynPersoanaFizicaRepository = Arc::new(MockRepository { mock_behaviour });
    let user_repo = mock_user_repo();

    test::init_service(
        App::new()
            .wrap_fn(|req, srv| {
                req.extensions_mut().insert(admin_user());
                srv.call(req)
            })
            .app_data(web::Data::new(repo))
            .app_data(web::Data::new(user_repo))
            .service(
                web::scope("/persoana-fizica")
                    .service(find_all_persoana_fizica)
                    .service(get_persoana_fizica_by_id)
                    .service(create_persoana_fizica)
                    .service(update_persoana_fizica)
                    .service(delete_persoana_fizica),
            ),
    )
    .await
}
