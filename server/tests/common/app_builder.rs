use std::sync::Arc;

use actix_web::{App, dev::ServiceResponse, test, web};
use taxchain::{
    handlers::{
        create_persoana_fizica, delete_persoana_fizica, find_all_persoana_fizica,
        get_persoana_fizica_by_id, update_persoana_fizica,
    },
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
        App::new().app_data(web::Data::new(repo)).service(
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
