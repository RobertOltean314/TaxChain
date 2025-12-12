use utoipa::OpenApi;

use crate::handlers::entitate_straina_handlers::*;
use crate::handlers::institutie_publica_handlers::*;
use crate::handlers::ong_handlers::*;
use crate::handlers::persoana_fizica_handlers::*;
use crate::handlers::persoana_juridica_handlers::*;

use crate::models::entitate_straina::{
    EntitateStraina, EntitateStrainaRequest, EntitateStrainaResponse,
};
use crate::models::institutie_publica::{
    InstitutiePublica, InstitutiePublicaRequest, InstitutiePublicaResponse,
};
use crate::models::ong::{Ong, OngRequest, OngResponse};
use crate::models::persoana_fizica::{
    PersoanaFizica, PersoanaFizicaRequest, PersoanaFizicaResponse,
};
use crate::models::persoana_juridica::{
    PersoanaJuridica, PersoanaJuridicaRequest, PersoanaJuridicaResponse,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        // Persoana Fizica
        get_all_persoane_fizice,
        get_persoana_fizica_by_id,
        create_new_persoana_fizica,
        delete_persoana_fizica,
        update_persoana_fizica,

        // Persoana Juridica
        get_all_persoane_juridice,
        get_persoana_juridica_by_id,
        create_new_persoana_juridica,
        delete_persoana_juridica,
        update_persoana_juridica,

        // ONGs
        get_all_ongs,
        get_ong_by_id,
        create_new_ong,
        delete_ong,
        update_ong,
        
        // Institutie Publica
        get_all_institutii_publice,
        get_institutie_publica_by_id,
        create_new_institutie_publica,
        delete_institutie_publica,
        update_institutie_publica,

        // Entitate Straina
        get_all_entitati_straine,
        get_entitate_straina_by_id,
        create_new_entitate_straina,
        delete_entitate_straina,
        update_entitate_straina,

        // Others???
    ),
    components(
        schemas(
            // Persoane Fizice
            PersoanaFizica,
            PersoanaFizicaRequest,
            PersoanaFizicaResponse,

            // Persoane Juridice
            PersoanaJuridica,
            PersoanaJuridicaRequest,
            PersoanaJuridicaResponse,
            
            // ONGs
            Ong,
            OngRequest,
            OngResponse,
    
            // Institutii Publice
            InstitutiePublica,
            InstitutiePublicaRequest,
            InstitutiePublicaResponse,

            // Entitati Straine
            EntitateStraina,
            EntitateStrainaRequest,
            EntitateStrainaResponse,

            // Other Types
        )
    ),
    tags(
        (name = "persoane-fizice", description="Persoane Fizice Autorizate (PFA), Intreprinderi Individuale (II) sau Intreprinderi Familiale (IF)"),
        (name = "persoane-juridice", description = "Societate cu raspundere Limitata (STR), Intreprinderi Mici si Mijlocii (IMM)"),
        (name = "ongs", description = "Organizatii Non-Guvernamentale (ONGs)"),
        (name = "institutii-publice", description = "Insstitutii Guvernamentale, Primarii, Scoli, Spitale, etc"),
        (name = "entitati-straine", description = "Firme cu filiale in Romania")
    ),
    info(
        title = "Entity Management Service",
        version = "1.0.0",
        description = "Microserviciu central de gestiune a entitatilor (PF, PFA, SRL, ONG, etc.)"
    )
)]
pub struct ApiDoc;
