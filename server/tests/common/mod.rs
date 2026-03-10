pub mod app_builder;
pub mod fixtures;
pub mod mock_repo;

pub use app_builder::build_app;
pub use fixtures::{IONESCU_ID, POPESCU_ID, mock_persoana_fizica};
pub use mock_repo::MockBehaviour;
