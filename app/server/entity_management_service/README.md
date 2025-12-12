# Entity Management Service - API Documentation

## Overview

This service manages different types of entities including:

- Persoane Fizice
- Persoane Juridice
- ONG (Non-Governmental Organizations)
- Institutii Publice
- Entitati Straine

## Base URL

```
http://localhost:8080/api
```

## API Endpoints

### Persoane Fizice

#### Get All Persoane Fizice

```bash
GET /api/persoane-fizice
```

**Response:** 200 OK

```json
[
  {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "tip": "PFA",
    "nume": "Popescu",
    "prenume": "Ion",
    ...
  }
]
```

#### Get Persoana Fizica by ID

```bash
GET /api/persoane-fizice/{id}
```

**Response:** 200 OK / 404 Not Found

#### Create New Persoana Fizica

```bash
POST /api/persoane-fizice
Content-Type: application/json
```

**Request Body:**

```json
{
  "tip": "PFA",
  "cnp": "1234567890123",
  "nume": "Popescu",
  "prenume": "Ion",
  "serie_act_identitate": "RX",
  "numar_act_identitate": "123456",
  "data_nasterii": "1990-05-15",
  "cetatenie": "Romana",
  "adresa_domiciliu": {
    "tara": "Romania",
    "judet": "Bucuresti",
    "localitate": "Bucuresti",
    "cod_postal": "010101",
    "strada": "Calea Victoriei",
    "numar": "100",
    "bloc": "A1",
    "scara": "B",
    "etaj": "5",
    "apartament": "52"
  },
  "dovada_drept_folosinta": "ContractDeProprietate",
  "reprezentant": {
    "parent_id": "00000000-0000-0000-0000-000000000000",
    "parent_type": "persoana_fizica",
    "nume": "Ionescu",
    "prenume": "Maria",
    "cnp": "2987654321098",
    "tip_act_identitate": "CarteIdentitate",
    "serie_act_identitate": "AB",
    "numar_act_identitate": "654321",
    "calitate": "Administrator",
    "telefon": "+40712345678",
    "email": "maria.ionescu@example.com",
    "data_nasterii": "1985-03-20",
    "adresa_domiciliu": "00000000-0000-0000-0000-000000000000"
  },
  "cod_caen": "6201",
  "data_inregistrarii": "2023-01-15",
  "euid": "ROONRC.J40/12345/2023",
  "nr_ordine_reg_comert": "J40/12345/2023",
  "platitor_tva": true,
  "stare_fiscala": "Activ",
  "inregistrat_in_spv": false
}
```

**Response:** 201 Created

#### Update Persoana Fizica

```bash
PUT /api/persoane-fizice/{id}
Content-Type: application/json
```

**Request Body:** Same as Create

**Response:** 200 OK / 500 Internal Server Error

#### Delete Persoana Fizica

```bash
DELETE /api/persoane-fizice/{id}
```

**Response:** 200 OK / 404 Not Found

---

### Persoane Juridice (Legal Entities)

#### Get All Persoane Juridice

```bash
GET /api/persoane-juridice
```

#### Get Persoana Juridica by ID

```bash
GET /api/persoane-juridice/{id}
```

#### Create New Persoana Juridica

```bash
POST /api/persoane-juridice
Content-Type: application/json
```

**Request Body:**

```json
{
  "denumire": "SC Example SRL",
  "cui": "RO12345678",
  "nr_reg_comert": "J40/1234/2020",
  "forma_juridica": "SRL",
  "adresa_sediu": {
    "tara": "Romania",
    "judet": "Bucuresti",
    "localitate": "Bucuresti",
    "cod_postal": "010101",
    "strada": "Bd. Unirii",
    "numar": "50",
    "bloc": "B2",
    "scara": "A",
    "etaj": "3",
    "apartament": "10"
  },
  "reprezentant": {
    "parent_id": "00000000-0000-0000-0000-000000000000",
    "parent_type": "persoana_juridica",
    "nume": "Marinescu",
    "prenume": "Andrei",
    "cnp": "1850101123456",
    "tip_act_identitate": "CarteIdentitate",
    "serie_act_identitate": "RX",
    "numar_act_identitate": "789456",
    "calitate": "Administrator",
    "telefon": "+40723456789",
    "email": "andrei.marinescu@example.com",
    "data_nasterii": "1985-01-01",
    "adresa_domiciliu": "00000000-0000-0000-0000-000000000000"
  },
  "cod_caen": "6201",
  "capital_social": 10000.0,
  "platitor_tva": true,
  "stare_fiscala": "Activ",
  "data_infiintarii": "2020-05-15"
}
```

#### Update Persoana Juridica

```bash
PUT /api/persoane-juridice/{id}
```

#### Delete Persoana Juridica

```bash
DELETE /api/persoane-juridice/{id}
```

---

### ONG (Non-Governmental Organizations)

#### Get All ONGs

```bash
GET /api/ongs
```

#### Get ONG by ID

```bash
GET /api/ongs/{id}
```

#### Create New ONG

```bash
POST /api/ongs
Content-Type: application/json
```

**Request Body:**

```json
{
  "denumire": "Asociatia Romana pentru Educatie",
  "cui": "RO87654321",
  "nr_inregistrare": "A123/2018",
  "tip_ong": "Asociatie",
  "adresa_sediu": {
    "tara": "Romania",
    "judet": "Cluj",
    "localitate": "Cluj-Napoca",
    "cod_postal": "400001",
    "strada": "Str. Universitatii",
    "numar": "25",
    "bloc": null,
    "scara": null,
    "etaj": null,
    "apartament": null
  },
  "reprezentant": {
    "parent_id": "00000000-0000-0000-0000-000000000000",
    "parent_type": "ong",
    "nume": "Vasilescu",
    "prenume": "Elena",
    "cnp": "2780505123456",
    "tip_act_identitate": "CarteIdentitate",
    "serie_act_identitate": "CJ",
    "numar_act_identitate": "123789",
    "calitate": "Proprietor",
    "telefon": "+40734567890",
    "email": "elena.vasilescu@ong.ro",
    "data_nasterii": "1978-05-05",
    "adresa_domiciliu": "00000000-0000-0000-0000-000000000000"
  },
  "domeniu_activitate": "Educatie",
  "data_infiintarii": "2018-03-10",
  "statut_utilitate_publica": false
}
```

#### Update ONG

```bash
PUT /api/ongs/{id}
```

#### Delete ONG

```bash
DELETE /api/ongs/{id}
```

---

### Institutii Publice (Public Institutions)

#### Get All Institutii Publice

```bash
GET /api/institutii-publice
```

#### Get Institutie Publica by ID

```bash
GET /api/institutii-publice/{id}
```

#### Create New Institutie Publica

```bash
POST /api/institutii-publice
Content-Type: application/json
```

**Request Body:**

```json
{
  "denumire": "Primaria Sectorului 1",
  "cui": "RO4567890",
  "cod_fiscal": "4567890",
  "tip_institutie": "PrimarieLocala",
  "adresa_sediu": {
    "tara": "Romania",
    "judet": "Bucuresti",
    "localitate": "Bucuresti",
    "cod_postal": "011011",
    "strada": "Bd. Aviatorilor",
    "numar": "1",
    "bloc": null,
    "scara": null,
    "etaj": null,
    "apartament": null
  },
  "reprezentant": {
    "parent_id": "00000000-0000-0000-0000-000000000000",
    "parent_type": "institutie_publica",
    "nume": "Georgescu",
    "prenume": "Mihai",
    "cnp": "1700303123456",
    "tip_act_identitate": "CarteIdentitate",
    "serie_act_identitate": "RT",
    "numar_act_identitate": "456123",
    "calitate": "Administrator",
    "telefon": "+40745678901",
    "email": "mihai.georgescu@primarie.ro",
    "data_nasterii": "1970-03-03",
    "adresa_domiciliu": "00000000-0000-0000-0000-000000000000"
  },
  "nivel_administrativ": "Local",
  "buget_anual": 5000000.0
}
```

#### Update Institutie Publica

```bash
PUT /api/institutii-publice/{id}
```

#### Delete Institutie Publica

```bash
DELETE /api/institutii-publice/{id}
```

---

### Entitati Straine (Foreign Entities)

#### Get All Entitati Straine

```bash
GET /api/entitati-straine
```

#### Get Entitate Straina by ID

```bash
GET /api/entitati-straine/{id}
```

#### Create New Entitate Straina

```bash
POST /api/entitati-straine
Content-Type: application/json
```

**Request Body:**

```json
{
  "denumire": "ABC Corporation Ltd",
  "tara_origine": "United Kingdom",
  "numar_inregistrare_strainatate": "UK123456789",
  "cod_identificare_fiscal_ro": "RO98765432",
  "tip_entitate": "SRL",
  "adresa_sediu_romania": {
    "tara": "Romania",
    "judet": "Bucuresti",
    "localitate": "Bucuresti",
    "cod_postal": "020101",
    "strada": "Calea Dorobantilor",
    "numar": "75",
    "bloc": "C1",
    "scara": "B",
    "etaj": "7",
    "apartament": "15"
  },
  "reprezentant": {
    "parent_id": "00000000-0000-0000-0000-000000000000",
    "parent_type": "entitate_straina",
    "nume": "Smith",
    "prenume": "John",
    "cnp": "0000000000000",
    "tip_act_identitate": "Pasaport",
    "serie_act_identitate": "UK",
    "numar_act_identitate": "987654321",
    "calitate": "Mandatar",
    "telefon": "+40756789012",
    "email": "john.smith@abc-corp.com",
    "data_nasterii": "1982-07-15",
    "adresa_domiciliu": "00000000-0000-0000-0000-000000000000"
  },
  "data_inregistrare_romania": "2021-09-20",
  "sucursala_in_romania": true
}
```

#### Update Entitate Straina

```bash
PUT /api/entitati-straine/{id}
```

#### Delete Entitate Straina

```bash
DELETE /api/entitati-straine/{id}
```

---

## Enums Reference

### TipPersoanaFizica

- `PFA` - Persoană Fizică Autorizată
- `II` - Întreprindere Individuală
- `IF` - Întreprindere Familială

### TipActIdentitate

- `CarteIdentitate` - Carte de Identitate
- `Pasaport` - Pașaport
- `PermisDeConducere` - Permis de Conducere

### CalitateReprezentant

- `Proprietor` - Proprietar
- `Administrator` - Administrator
- `Mandatar` - Mandatar
- `AlteCalitati` - Alte Calități

### TipDovada

- `ContractDeProprietate` - Contract de Proprietate
- `ContractDeComodat` - Contract de Comodat
- `ContractDeInchiriere` - Contract de Închiriere
- `AlteTipuri` - Alte Tipuri

### StareFiscala

- `Activ` - Activ
- `Inactiv` - Inactiv
- `Suspendat` - Suspendat
- `Radiat` - Radiat

---

## cURL Examples

### Create Persoana Fizica

```bash
curl -X POST http://localhost:8080/api/persoane-fizice \
  -H "Content-Type: application/json" \
  -d '{
    "tip": "PFA",
    "cnp": "1234567890123",
    "nume": "Popescu",
    "prenume": "Ion",
    "serie_act_identitate": "RX",
    "numar_act_identitate": "123456",
    "data_nasterii": "1990-05-15",
    "cetatenie": "Romana",
    "adresa_domiciliu": {
      "tara": "Romania",
      "judet": "Bucuresti",
      "localitate": "Bucuresti",
      "cod_postal": "010101",
      "strada": "Calea Victoriei",
      "numar": "100",
      "bloc": "A1",
      "scara": "B",
      "etaj": "5",
      "apartament": "52"
    },
    "dovada_drept_folosinta": "ContractDeProprietate",
    "reprezentant": {
      "parent_id": "00000000-0000-0000-0000-000000000000",
      "parent_type": "persoana_fizica",
      "nume": "Ionescu",
      "prenume": "Maria",
      "cnp": "2987654321098",
      "tip_act_identitate": "CarteIdentitate",
      "serie_act_identitate": "AB",
      "numar_act_identitate": "654321",
      "calitate": "Administrator",
      "telefon": "+40712345678",
      "email": "maria.ionescu@example.com",
      "data_nasterii": "1985-03-20",
      "adresa_domiciliu": "00000000-0000-0000-0000-000000000000"
    },
    "cod_caen": "6201",
    "data_inregistrarii": "2023-01-15",
    "euid": "ROONRC.J40/12345/2023",
    "nr_ordine_reg_comert": "J40/12345/2023",
    "platitor_tva": true,
    "stare_fiscala": "Activ",
    "inregistrat_in_spv": false
  }'
```

### Get Persoana Fizica by ID

```bash
curl -X GET http://localhost:8080/api/persoane-fizice/550e8400-e29b-41d4-a716-446655440000
```

### Update Persoana Fizica

```bash
curl -X PUT http://localhost:8080/api/persoane-fizice/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{...}' # Same structure as create
```

### Delete Persoana Fizica

```bash
curl -X DELETE http://localhost:8080/api/persoane-fizice/550e8400-e29b-41d4-a716-446655440000
```

---

## Response Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate entry (e.g., CNP already exists)
- `500 Internal Server Error` - Server error
- `501 Not Implemented` - Endpoint not yet implemented

---

## Notes

- All dates should be in `YYYY-MM-DD` format
- UUIDs are automatically generated for new entities
- The `parent_id` and `adresa_domiciliu` fields in `reprezentant` can use placeholder UUIDs as they will be generated/linked during creation
- CNP must be exactly 13 characters
- All enum values are case-sensitive

---

## OpenAPI Documentation

Access the interactive API documentation at:

```
http://localhost:8080/swagger-ui
```
