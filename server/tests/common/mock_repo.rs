use async_trait::async_trait;
use taxchain::{
    models::PersoanaFizica, services::persoana_fizica_service::PersoanaFizicaRepository,
};
use uuid::Uuid;

use crate::common::mock_persoana_fizica;

pub enum MockBehaviour {
    ReturnsResults,
    ReturnsEmpty,
    DatabaseFails,
}

pub struct MockRepository {
    pub mock_behaviour: MockBehaviour,
}

#[async_trait]
impl PersoanaFizicaRepository for MockRepository {
    async fn find_all(&self) -> Result<Vec<PersoanaFizica>, sqlx::Error> {
        match self.mock_behaviour {
            MockBehaviour::ReturnsResults => Ok(mock_persoana_fizica()),
            MockBehaviour::ReturnsEmpty => Ok(vec![]),
            MockBehaviour::DatabaseFails => Err(sqlx::Error::RowNotFound),
        }
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<PersoanaFizica>, sqlx::Error> {
        todo!()
    }

    async fn create(&self, persoana: PersoanaFizica) -> Result<PersoanaFizica, sqlx::Error> {
        todo!()
    }

    async fn update(
        &self,
        id: Uuid,
        persoana: PersoanaFizica,
    ) -> Result<Option<PersoanaFizica>, sqlx::Error> {
        todo!()
    }

    async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        todo!()
    }
}
