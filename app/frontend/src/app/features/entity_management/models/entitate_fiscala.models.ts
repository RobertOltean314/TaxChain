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
