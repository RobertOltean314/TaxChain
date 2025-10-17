use serde::{Deserialize, Serialize};
use strum::EnumString;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, EnumString)]
pub enum CountryCode {
    AF, // Afghanistan
    AX, // Åland Islands
    AL, // Albania
    DZ, // Algeria
    AS, // American Samoa
    AD, // Andorra
    AO, // Angola
    AI, // Anguilla
    AQ, // Antarctica
    AG, // Antigua and Barbuda
    AR, // Argentina
    AM, // Armenia
    AW, // Aruba
    AU, // Australia
    AT, // Austria
    AZ, // Azerbaijan
    BS, // Bahamas
    BH, // Bahrain
    BD, // Bangladesh
    BB, // Barbados
    BY, // Belarus
    BE, // Belgium
    BZ, // Belize
    BJ, // Benin
    BM, // Bermuda
    BT, // Bhutan
    BO, // Bolivia
    BQ, // Bonaire, Sint Eustatius and Saba
    BA, // Bosnia and Herzegovina
    BW, // Botswana
    BV, // Bouvet Island
    BR, // Brazil
    IO, // British Indian Ocean Territory
    BN, // Brunei Darussalam
    BG, // Bulgaria
    BF, // Burkina Faso
    BI, // Burundi
    CV, // Cabo Verde
    KH, // Cambodia
    CM, // Cameroon
    CA, // Canada
    KY, // Cayman Islands
    CF, // Central African Republic
    TD, // Chad
    CL, // Chile
    CN, // China
    CX, // Christmas Island
    CC, // Cocos (Keeling) Islands
    CO, // Colombia
    KM, // Comoros
    CG, // Congo
    CD, // Congo, Democratic Republic of the
    CK, // Cook Islands
    CR, // Costa Rica
    CI, // Côte d'Ivoire
    HR, // Croatia
    CU, // Cuba
    CW, // Curaçao
    CY, // Cyprus
    CZ, // Czechia
    DK, // Denmark
    DJ, // Djibouti
    DM, // Dominica
    DO, // Dominican Republic
    EC, // Ecuador
    EG, // Egypt
    SV, // El Salvador
    GQ, // Equatorial Guinea
    ER, // Eritrea
    EE, // Estonia
    SZ, // Eswatini
    ET, // Ethiopia
    FK, // Falkland Islands
    FO, // Faroe Islands
    FJ, // Fiji
    FI, // Finland
    FR, // France
    GF, // French Guiana
    PF, // French Polynesia
    TF, // French Southern Territories
    GA, // Gabon
    GM, // Gambia
    GE, // Georgia
    DE, // Germany
    GH, // Ghana
    GI, // Gibraltar
    GR, // Greece
    GL, // Greenland
    GD, // Grenada
    GP, // Guadeloupe
    GU, // Guam
    GT, // Guatemala
    GG, // Guernsey
    GN, // Guinea
    GW, // Guinea-Bissau
    GY, // Guyana
    HT, // Haiti
    HM, // Heard Island and McDonald Islands
    VA, // Holy See
    HN, // Honduras
    HK, // Hong Kong
    HU, // Hungary
    IS, // Iceland
    IN, // India
    ID, // Indonesia
    IR, // Iran
    IQ, // Iraq
    IE, // Ireland
    IM, // Isle of Man
    IL, // Israel
    IT, // Italy
    JM, // Jamaica
    JP, // Japan
    JE, // Jersey
    JO, // Jordan
    KZ, // Kazakhstan
    KE, // Kenya
    KI, // Kiribati
    KP, // Korea (North)
    KR, // Korea (South)
    KW, // Kuwait
    KG, // Kyrgyzstan
    LA, // Lao People's Democratic Republic
    LV, // Latvia
    LB, // Lebanon
    LS, // Lesotho
    LR, // Liberia
    LY, // Libya
    LI, // Liechtenstein
    LT, // Lithuania
    LU, // Luxembourg
    MO, // Macao
    MG, // Madagascar
    MW, // Malawi
    MY, // Malaysia
    MV, // Maldives
    ML, // Mali
    MT, // Malta
    MH, // Marshall Islands
    MQ, // Martinique
    MR, // Mauritania
    MU, // Mauritius
    YT, // Mayotte
    MX, // Mexico
    FM, // Micronesia
    MD, // Moldova
    MC, // Monaco
    MN, // Mongolia
    ME, // Montenegro
    MS, // Montserrat
    MA, // Morocco
    MZ, // Mozambique
    MM, // Myanmar
    NA, // Namibia
    NR, // Nauru
    NP, // Nepal
    NL, // Netherlands
    NC, // New Caledonia
    NZ, // New Zealand
    NI, // Nicaragua
    NE, // Niger
    NG, // Nigeria
    NU, // Niue
    NF, // Norfolk Island
    MK, // North Macedonia
    MP, // Northern Mariana Islands
    NO, // Norway
    OM, // Oman
    PK, // Pakistan
    PW, // Palau
    PS, // Palestine
    PA, // Panama
    PG, // Papua New Guinea
    PY, // Paraguay
    PE, // Peru
    PH, // Philippines
    PN, // Pitcairn
    PL, // Poland
    PT, // Portugal
    PR, // Puerto Rico
    QA, // Qatar
    RE, // Réunion
    RO, // Romania
    RU, // Russian Federation
    RW, // Rwanda
    BL, // Saint Barthélemy
    SH, // Saint Helena
    KN, // Saint Kitts and Nevis
    LC, // Saint Lucia
    MF, // Saint Martin
    PM, // Saint Pierre and Miquelon
    VC, // Saint Vincent and the Grenadines
    WS, // Samoa
    SM, // San Marino
    ST, // Sao Tome and Principe
    SA, // Saudi Arabia
    SN, // Senegal
    RS, // Serbia
    SC, // Seychelles
    SL, // Sierra Leone
    SG, // Singapore
    SX, // Sint Maarten
    SK, // Slovakia
    SI, // Slovenia
    SB, // Solomon Islands
    SO, // Somalia
    ZA, // South Africa
    GS, // South Georgia and the South Sandwich Islands
    SS, // South Sudan
    ES, // Spain
    LK, // Sri Lanka
    SD, // Sudan
    SR, // Suriname
    SJ, // Svalbard and Jan Mayen
    SE, // Sweden
    CH, // Switzerland
    SY, // Syrian Arab Republic
    TW, // Taiwan
    TJ, // Tajikistan
    TZ, // Tanzania
    TH, // Thailand
    TL, // Timor-Leste
    TG, // Togo
    TK, // Tokelau
    TO, // Tonga
    TT, // Trinidad and Tobago
    TN, // Tunisia
    TR, // Türkiye
    TM, // Turkmenistan
    TC, // Turks and Caicos Islands
    TV, // Tuvalu
    UG, // Uganda
    UA, // Ukraine
    AE, // United Arab Emirates
    UK, // United Kingdom
    US, // United States of America
    UM, // United States Minor Outlying Islands
    UY, // Uruguay
    UZ, // Uzbekistan
    VU, // Vanuatu
    VE, // Venezuela
    VN, // Viet Nam
    VG, // Virgin Islands (British)
    VI, // Virgin Islands (U.S.)
    WF, // Wallis and Futuna
    EH, // Western Sahara
    YE, // Yemen
    ZM, // Zambia
    ZW, // Zimbabwe
}

impl Default for CountryCode {
    fn default() -> Self {
        CountryCode::RO
    }
}

impl CountryCode {
    pub fn as_str(&self) -> &str {
        match self {
            CountryCode::AF => "AF",
            CountryCode::AX => "AX",
            CountryCode::AL => "AL",
            CountryCode::DZ => "DZ",
            CountryCode::AS => "AS",
            CountryCode::AD => "AD",
            CountryCode::AO => "AO",
            CountryCode::AI => "AI",
            CountryCode::AQ => "AQ",
            CountryCode::AG => "AG",
            CountryCode::AR => "AR",
            CountryCode::AM => "AM",
            CountryCode::AW => "AW",
            CountryCode::AU => "AU",
            CountryCode::AT => "AT",
            CountryCode::AZ => "AZ",
            CountryCode::BS => "BS",
            CountryCode::BH => "BH",
            CountryCode::BD => "BD",
            CountryCode::BB => "BB",
            CountryCode::BY => "BY",
            CountryCode::BE => "BE",
            CountryCode::BZ => "BZ",
            CountryCode::BJ => "BJ",
            CountryCode::BM => "BM",
            CountryCode::BT => "BT",
            CountryCode::BO => "BO",
            CountryCode::BQ => "BQ",
            CountryCode::BA => "BA",
            CountryCode::BW => "BW",
            CountryCode::BV => "BV",
            CountryCode::BR => "BR",
            CountryCode::IO => "IO",
            CountryCode::BN => "BN",
            CountryCode::BG => "BG",
            CountryCode::BF => "BF",
            CountryCode::BI => "BI",
            CountryCode::CV => "CV",
            CountryCode::KH => "KH",
            CountryCode::CM => "CM",
            CountryCode::CA => "CA",
            CountryCode::KY => "KY",
            CountryCode::CF => "CF",
            CountryCode::TD => "TD",
            CountryCode::CL => "CL",
            CountryCode::CN => "CN",
            CountryCode::CX => "CX",
            CountryCode::CC => "CC",
            CountryCode::CO => "CO",
            CountryCode::KM => "KM",
            CountryCode::CG => "CG",
            CountryCode::CD => "CD",
            CountryCode::CK => "CK",
            CountryCode::CR => "CR",
            CountryCode::CI => "CI",
            CountryCode::HR => "HR",
            CountryCode::CU => "CU",
            CountryCode::CW => "CW",
            CountryCode::CY => "CY",
            CountryCode::CZ => "CZ",
            CountryCode::DK => "DK",
            CountryCode::DJ => "DJ",
            CountryCode::DM => "DM",
            CountryCode::DO => "DO",
            CountryCode::EC => "EC",
            CountryCode::EG => "EG",
            CountryCode::SV => "SV",
            CountryCode::GQ => "GQ",
            CountryCode::ER => "ER",
            CountryCode::EE => "EE",
            CountryCode::SZ => "SZ",
            CountryCode::ET => "ET",
            CountryCode::FK => "FK",
            CountryCode::FO => "FO",
            CountryCode::FJ => "FJ",
            CountryCode::FI => "FI",
            CountryCode::FR => "FR",
            CountryCode::GF => "GF",
            CountryCode::PF => "PF",
            CountryCode::TF => "TF",
            CountryCode::GA => "GA",
            CountryCode::GM => "GM",
            CountryCode::GE => "GE",
            CountryCode::DE => "DE",
            CountryCode::GH => "GH",
            CountryCode::GI => "GI",
            CountryCode::GR => "GR",
            CountryCode::GL => "GL",
            CountryCode::GD => "GD",
            CountryCode::GP => "GP",
            CountryCode::GU => "GU",
            CountryCode::GT => "GT",
            CountryCode::GG => "GG",
            CountryCode::GN => "GN",
            CountryCode::GW => "GW",
            CountryCode::GY => "GY",
            CountryCode::HT => "HT",
            CountryCode::HM => "HM",
            CountryCode::VA => "VA",
            CountryCode::HN => "HN",
            CountryCode::HK => "HK",
            CountryCode::HU => "HU",
            CountryCode::IS => "IS",
            CountryCode::IN => "IN",
            CountryCode::ID => "ID",
            CountryCode::IR => "IR",
            CountryCode::IQ => "IQ",
            CountryCode::IE => "IE",
            CountryCode::IM => "IM",
            CountryCode::IL => "IL",
            CountryCode::IT => "IT",
            CountryCode::JM => "JM",
            CountryCode::JP => "JP",
            CountryCode::JE => "JE",
            CountryCode::JO => "JO",
            CountryCode::KZ => "KZ",
            CountryCode::KE => "KE",
            CountryCode::KI => "KI",
            CountryCode::KP => "KP",
            CountryCode::KR => "KR",
            CountryCode::KW => "KW",
            CountryCode::KG => "KG",
            CountryCode::LA => "LA",
            CountryCode::LV => "LV",
            CountryCode::LB => "LB",
            CountryCode::LS => "LS",
            CountryCode::LR => "LR",
            CountryCode::LY => "LY",
            CountryCode::LI => "LI",
            CountryCode::LT => "LT",
            CountryCode::LU => "LU",
            CountryCode::MO => "MO",
            CountryCode::MG => "MG",
            CountryCode::MW => "MW",
            CountryCode::MY => "MY",
            CountryCode::MV => "MV",
            CountryCode::ML => "ML",
            CountryCode::MT => "MT",
            CountryCode::MH => "MH",
            CountryCode::MQ => "MQ",
            CountryCode::MR => "MR",
            CountryCode::MU => "MU",
            CountryCode::YT => "YT",
            CountryCode::MX => "MX",
            CountryCode::FM => "FM",
            CountryCode::MD => "MD",
            CountryCode::MC => "MC",
            CountryCode::MN => "MN",
            CountryCode::ME => "ME",
            CountryCode::MS => "MS",
            CountryCode::MA => "MA",
            CountryCode::MZ => "MZ",
            CountryCode::MM => "MM",
            CountryCode::NA => "NA",
            CountryCode::NR => "NR",
            CountryCode::NP => "NP",
            CountryCode::NL => "NL",
            CountryCode::NC => "NC",
            CountryCode::NZ => "NZ",
            CountryCode::NI => "NI",
            CountryCode::NE => "NE",
            CountryCode::NG => "NG",
            CountryCode::NU => "NU",
            CountryCode::NF => "NF",
            CountryCode::MK => "MK",
            CountryCode::MP => "MP",
            CountryCode::NO => "NO",
            CountryCode::OM => "OM",
            CountryCode::PK => "PK",
            CountryCode::PW => "PW",
            CountryCode::PS => "PS",
            CountryCode::PA => "PA",
            CountryCode::PG => "PG",
            CountryCode::PY => "PY",
            CountryCode::PE => "PE",
            CountryCode::PH => "PH",
            CountryCode::PN => "PN",
            CountryCode::PL => "PL",
            CountryCode::PT => "PT",
            CountryCode::PR => "PR",
            CountryCode::QA => "QA",
            CountryCode::RE => "RE",
            CountryCode::RO => "RO",
            CountryCode::RU => "RU",
            CountryCode::RW => "RW",
            CountryCode::BL => "BL",
            CountryCode::SH => "SH",
            CountryCode::KN => "KN",
            CountryCode::LC => "LC",
            CountryCode::MF => "MF",
            CountryCode::PM => "PM",
            CountryCode::VC => "VC",
            CountryCode::WS => "WS",
            CountryCode::SM => "SM",
            CountryCode::ST => "ST",
            CountryCode::SA => "SA",
            CountryCode::SN => "SN",
            CountryCode::RS => "RS",
            CountryCode::SC => "SC",
            CountryCode::SL => "SL",
            CountryCode::SG => "SG",
            CountryCode::SX => "SX",
            CountryCode::SK => "SK",
            CountryCode::SI => "SI",
            CountryCode::SB => "SB",
            CountryCode::SO => "SO",
            CountryCode::ZA => "ZA",
            CountryCode::GS => "GS",
            CountryCode::SS => "SS",
            CountryCode::ES => "ES",
            CountryCode::LK => "LK",
            CountryCode::SD => "SD",
            CountryCode::SR => "SR",
            CountryCode::SJ => "SJ",
            CountryCode::SE => "SE",
            CountryCode::CH => "CH",
            CountryCode::SY => "SY",
            CountryCode::TW => "TW",
            CountryCode::TJ => "TJ",
            CountryCode::TZ => "TZ",
            CountryCode::TH => "TH",
            CountryCode::TL => "TL",
            CountryCode::TG => "TG",
            CountryCode::TK => "TK",
            CountryCode::TO => "TO",
            CountryCode::TT => "TT",
            CountryCode::TN => "TN",
            CountryCode::TR => "TR",
            CountryCode::TM => "TM",
            CountryCode::TC => "TC",
            CountryCode::TV => "TV",
            CountryCode::UG => "UG",
            CountryCode::UA => "UA",
            CountryCode::AE => "AE",
            CountryCode::UK => "UK",
            CountryCode::US => "US",
            CountryCode::UM => "UM",
            CountryCode::UY => "UY",
            CountryCode::UZ => "UZ",
            CountryCode::VU => "VU",
            CountryCode::VE => "VE",
            CountryCode::VN => "VN",
            CountryCode::VG => "VG",
            CountryCode::VI => "VI",
            CountryCode::WF => "WF",
            CountryCode::EH => "EH",
            CountryCode::YE => "YE",
            CountryCode::ZM => "ZM",
            CountryCode::ZW => "ZW",
        }
    }
}
