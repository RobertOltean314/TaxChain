pub mod persoana_fizica_handlers;
pub mod persoana_juridica_handlers;

pub use persoana_fizica_handlers::{
    create_persoana_fizica, delete_persoana_fizica, find_all_persoana_fizica,
    get_persoana_fizica_by_id, update_persoana_fizica,
};
pub use persoana_juridica_handlers::find_all_persoana_juridica;
