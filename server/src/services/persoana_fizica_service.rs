use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use uuid::Uuid;

use crate::models::PersoanaFizica;

pub type PersoanaFizicaStore = Arc<RwLock<HashMap<Uuid, PersoanaFizica>>>;

pub fn create_store() -> PersoanaFizicaStore {
    Arc::new(RwLock::new(HashMap::new()))
}

pub fn find_all(store: &PersoanaFizicaStore) -> Vec<PersoanaFizica> {
    store.read().unwrap().values().cloned().collect()
}

pub fn find_by_id(store: &PersoanaFizicaStore, id: Uuid) -> Option<PersoanaFizica> {
    store.read().unwrap().get(&id).cloned()
}

pub fn create(store: &PersoanaFizicaStore, persoana: PersoanaFizica) -> PersoanaFizica {
    let mut lock = store.write().unwrap();
    lock.insert(persoana.id, persoana.clone());
    persoana
}

pub fn update(store: &PersoanaFizicaStore, id: Uuid, persoana: PersoanaFizica) -> Option<PersoanaFizica> {
    let mut lock = store.write().unwrap();
    if lock.contains_key(&id) {
        lock.insert(id, persoana.clone());
        Some(persoana)
    } else {
        None
    }
}

pub fn delete(store: &PersoanaFizicaStore, id: Uuid) -> bool {
    store.write().unwrap().remove(&id).is_some()
}
