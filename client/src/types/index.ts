export interface UserResponse {
  id: string;
  email: string | null;
  display_name: string | null;
  role: 'Admin' | 'Taxpayer' | 'Auditor';
  assigned_wallet_address: string;
  persoana_fizica_id: string | null;
  persoana_juridica_id: string | null;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: UserResponse;
}

export interface PersoanaFizica {
  id: string;
  cnp: string;
  nume: string;
  prenume: string;
  prenume_tata: string | null;
  data_nasterii: string;
  sex: 'M' | 'F';
  adresa_domiciliu: string;
  cod_postal: string | null;
  iban: string;
  telefon: string | null;
  email: string | null;
  stare: 'Activ' | 'Inactiv' | 'Suspendat';
  wallet: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersoanaJuridica {
  id: string;
  cod_fiscal: string;
  denumire: string;
  numar_de_inregistrare_in_registrul_comertului: string;
  an_infiintare: number;
  adresa_sediu_social: string;
  cod_postal: string | null;
  adresa_puncte_de_lucru: string[] | null;
  iban: string;
  telefon: string | null;
  email: string | null;
  cod_caen_principal: string;
  coduri_caen_secundare: string[] | null;
  numar_angajati: number;
  capital_social: number;
  stare: 'Activa' | 'Radiata' | 'Suspendata' | 'InInsolventa';
  wallet: string | null;
  created_at: string;
  updated_at: string;
}
