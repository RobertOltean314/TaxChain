use std::sync::Arc;

use actix_web::{App, dev::ServiceResponse, test, web};
use taxchain::{
    handlers::find_all_persoana_fizica,
    services::persoana_fizica_service::DynPersoanaFizicaRepository,
};

use crate::common::{MockBehaviour, mock_repo::MockRepository};

pub async fn build_app(
    mock_behaviour: MockBehaviour,
) -> impl actix_web::dev::Service<
    actix_http::Request,
    Response = ServiceResponse,
    Error = actix_web::Error,
> {
    let repo: DynPersoanaFizicaRepository = Arc::new(MockRepository { mock_behaviour });

    test::init_service(
        App::new()
            .app_data(web::Data::new(repo))
            .service(web::scope("/persoana-fizica").service(find_all_persoana_fizica)),
    )
    .await
}
