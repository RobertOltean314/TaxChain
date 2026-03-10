use std::io::{Error, ErrorKind};

use async_trait::async_trait;
use taxchain::{
    models::PersoanaFizica, services::persoana_fizica_service::PersoanaFizicaRepository,
};
use uuid::Uuid;

use crate::common::mock_persoana_fizica;

pub enum MockBehaviour {
    Success,
    Created,
    NoContent,
    NotFound,
    InternalServerError,
}

pub struct MockRepository {
    pub mock_behaviour: MockBehaviour,
}

#[async_trait]
impl PersoanaFizicaRepository for MockRepository {
    async fn find_all(&self) -> Result<Vec<PersoanaFizica>, sqlx::Error> {
        match self.mock_behaviour {
            MockBehaviour::Success => Ok(mock_persoana_fizica()),
            MockBehaviour::InternalServerError => Err(sqlx::Error::Io(Error::new(
                ErrorKind::TimedOut,
                "mock: database timeout",
            ))),
            _ => Ok(mock_persoana_fizica()),
        }
    }

    async fn find_by_id(&self, _id: Uuid) -> Result<Option<PersoanaFizica>, sqlx::Error> {
        match self.mock_behaviour {
            MockBehaviour::Success => Ok(Some(mock_persoana_fizica().into_iter().next().unwrap())),
            MockBehaviour::NotFound => Ok(None),
            MockBehaviour::InternalServerError => Err(sqlx::Error::Io(Error::new(
                ErrorKind::Other,
                "mock: simulated database connection failure",
            ))),
            _ => Ok(Some(mock_persoana_fizica().into_iter().next().unwrap())),
        }
    }

    async fn create(&self, persoana: PersoanaFizica) -> Result<PersoanaFizica, sqlx::Error> {
        match self.mock_behaviour {
            MockBehaviour::Created => Ok(persoana),
            MockBehaviour::InternalServerError => Err(sqlx::Error::Io(Error::new(
                ErrorKind::Other,
                "mock: simulated database connection failure",
            ))),
            _ => Ok(persoana),
        }
    }

    async fn update(
        &self,
        _id: Uuid,
        persoana: PersoanaFizica,
    ) -> Result<Option<PersoanaFizica>, sqlx::Error> {
        match self.mock_behaviour {
            MockBehaviour::Success => Ok(Some(persoana)),
            MockBehaviour::NotFound => Ok(None),
            MockBehaviour::InternalServerError => Err(sqlx::Error::Io(Error::new(
                ErrorKind::Other,
                "mock: simulated database connection failure",
            ))),
            _ => Ok(Some(persoana)),
        }
    }

    async fn delete(&self, _id: Uuid) -> Result<bool, sqlx::Error> {
        match self.mock_behaviour {
            MockBehaviour::NoContent => Ok(true),
            MockBehaviour::NotFound => Ok(false),
            MockBehaviour::InternalServerError => Err(sqlx::Error::Io(Error::new(
                ErrorKind::Other,
                "mock: simulated database connection failure",
            ))),
            _ => Ok(true),
        }
    }
}
