export enum TipPersoanaFizica {
  PFA = 'PFA',
  II = 'II',
  IF = 'IF',
}

export enum TipActIdentitate {
  CarteIdentitate = 'CarteIdentitate',
  Pasaport = 'Pasaport',
  PermisDeConducere = 'PermisDeConducere',
}

export enum CalitateReprezentant {
  Proprietar = 'Proprietar',
  Administrator = 'Administrator',
  Mandatar = 'Mandatar',
  AlteCalitati = 'AlteCalitati',
}

export enum TipDovada {
  ContractDeProprietate = 'ContractDeProprietate',
  ContractDeComodat = 'ContractDeComodat',
  ContractDeInchiriere = 'ContractDeInchiriere',
  AlteTipuri = 'AlteTipuri',
}

export enum StareFiscala {
  Activ = 'Activ',
  Inactiv = 'Inactiv',
  Suspendat = 'Suspendat',
  Radiat = 'Radiat',
}

export interface Address {
  tara: string;
  judet: string;
  localitate: string;
  cod_postal?: string;
  strada: string;
  numar: string;
  bloc?: string;
  scara?: string;
  etaj?: string;
  apartament?: string;
}

export interface ReprezentantRequest {
  parent_id: string;
  parent_type: string;
  nume: string;
  prenume: string;
  cnp: string;
  tip_act_identitate: TipActIdentitate;
  serie_act_identitate: string;
  numar_act_identitate: string;
  calitate: CalitateReprezentant;
  telefon: string;
  email: string;
  data_nasterii: string;
  adresa_domiciliu: string;
}

export interface PersoanaFizicaRequest {
  tip: TipPersoanaFizica;
  cnp: string;
  nume: string;
  prenume: string;
  serie_act_identitate: string;
  numar_act_identitate: string;
  data_nasterii: string;
  cetatenie: string;
  adresa_domiciliu: Address;
  dovada_drept_folosinta?: TipDovada;
  reprezentant: ReprezentantRequest;
  cod_caen?: string;
  data_inregistrarii?: string;
  euid?: string;
  nr_ordine_reg_comert?: string;
  platitor_tva: boolean;
  stare_fiscala: StareFiscala;
  inregistrat_in_spv: boolean;
}

export interface AdresaResponse {
  uuid: string;
  tara: string;
  judet: string;
  localitate: string;
  cod_postal?: string;
  strada: string;
  numar: string;
  bloc?: string;
  scara?: string;
  etaj?: string;
  apartament?: string;
  detalii?: string;
}

export interface ReprezentantResponse {
  uuid: string;
  nume: string;
  prenume: string;
  telefon: string;
  email: string;
  calitate: CalitateReprezentant;
  adresa_domiciliu: string;
  created_at: string;
}

export interface PersoanaFizicaResponse {
  uuid: string;
  tip: string;
  nume: string;
  prenume: string;
  serie_act_identitate: string;
  numar_act_identitate: string;
  data_nasterii: string;
  cetatenie: string;
  adresa_domiciliu: AdresaResponse;
  reprezentant: ReprezentantResponse;
  cod_caen?: string;
  platitor_tva: boolean;
  stare_fiscala: string;
  inregistrat_in_spv: boolean;
  created_at?: string;
}

// Persoana Juridica Models
export interface PersoanaJuridicaRequest {
  denumire: string;
  cui: string;
  nr_reg_comert: string;
  forma_juridica: string;
  adresa_sediu: Address;
  reprezentant: ReprezentantRequest;
  cod_caen?: string;
  capital_social: number;
  platitor_tva: boolean;
  stare_fiscala: StareFiscala;
  data_infiintarii: string;
}

export interface PersoanaJuridicaResponse {
  uuid: string;
  denumire: string;
  cui: string;
  nr_reg_comert: string;
  forma_juridica: string;
  adresa_sediu: AdresaResponse;
  reprezentant: ReprezentantResponse;
  cod_caen?: string;
  capital_social: number;
  platitor_tva: boolean;
  stare_fiscala: string;
  data_infiintarii: string;
  created_at?: string;
}

// ONG Models
export enum TipONG {
  Asociatie = 'Asociatie',
  Fundatie = 'Fundatie',
}

export interface ONGRequest {
  denumire: string;
  cui: string;
  nr_inregistrare: string;
  tip_ong: TipONG;
  adresa_sediu: Address;
  reprezentant: ReprezentantRequest;
  domeniu_activitate: string;
  data_infiintarii: string;
  statut_utilitate_publica: boolean;
}

export interface ONGResponse {
  uuid: string;
  denumire: string;
  cui: string;
  nr_inregistrare: string;
  tip_ong: string;
  adresa_sediu: AdresaResponse;
  reprezentant: ReprezentantResponse;
  domeniu_activitate: string;
  data_infiintarii: string;
  statut_utilitate_publica: boolean;
  created_at?: string;
}

// Institutie Publica Models
export enum TipInstitutie {
  PrimarieLocala = 'PrimarieLocala',
  ConsiliuJudetean = 'ConsiliuJudetean',
  Ministerial = 'Ministerial',
  AlteTipuri = 'AlteTipuri',
}

export enum NivelAdministrativ {
  Local = 'Local',
  Judetean = 'Judetean',
  National = 'National',
}

export interface InstitutiePublicaRequest {
  denumire: string;
  cui: string;
  cod_fiscal: string;
  tip_institutie: TipInstitutie;
  adresa_sediu: Address;
  reprezentant: ReprezentantRequest;
  nivel_administrativ: NivelAdministrativ;
  buget_anual: number;
}

export interface InstitutiePublicaResponse {
  uuid: string;
  denumire: string;
  cui: string;
  cod_fiscal: string;
  tip_institutie: string;
  adresa_sediu: AdresaResponse;
  reprezentant: ReprezentantResponse;
  nivel_administrativ: string;
  buget_anual: number;
  created_at?: string;
}

// Entitate Straina Models
export interface EntitateStrainaRequest {
  denumire: string;
  tara_origine: string;
  numar_inregistrare_strainatate: string;
  cod_identificare_fiscal_ro: string;
  tip_entitate: string;
  adresa_sediu_romania: Address;
  reprezentant: ReprezentantRequest;
  data_inregistrare_romania: string;
  sucursala_in_romania: boolean;
}

export interface EntitateStrainaResponse {
  uuid: string;
  denumire: string;
  tara_origine: string;
  numar_inregistrare_strainatate: string;
  cod_identificare_fiscal_ro: string;
  tip_entitate: string;
  adresa_sediu_romania: AdresaResponse;
  reprezentant: ReprezentantResponse;
  data_inregistrare_romania: string;
  sucursala_in_romania: boolean;
  created_at?: string;
}

// Entity Type Enum
export enum EntityType {
  PersoanaFizica = 'persoana-fizica',
  PersoanaJuridica = 'persoana-juridica',
  ONG = 'ong',
  InstitutiePublica = 'institutie-publica',
  EntitateStraina = 'entitate-straina',
}
