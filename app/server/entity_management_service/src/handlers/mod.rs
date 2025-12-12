pub mod entitate_straina_handlers;
pub mod institutie_publica_handlers;
pub mod ong_handlers;
pub mod persoana_fizica_handlers;
pub mod persoana_juridica_handlers;

pub use persoana_fizica_handlers::*;

pub mod entity_search_handlers;
pub mod entity_dashboard_handlers;

pub use entity_search_handlers::*;
pub use entity_dashboard_handlers::*;
