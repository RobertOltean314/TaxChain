mod models;

use models::{EntitateStraina, InstitutiePublica, Ong, PersoanaFizica, PersoanaJuridica};
pub enum Contribuabil {
    PersoanaFizica(PersoanaFizica),
    PersoanaJuridica(PersoanaJuridica),
    Ong(Ong),
    InstitutiePublica(InstitutiePublica),
    EntitateStraina(EntitateStraina),
    Other(String),
}

fn main() {
    println!("Hello, world!");
}
