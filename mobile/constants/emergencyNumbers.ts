// Emergency numbers by country (ISO 3166-1 alpha-2 codes)

export interface EmergencyInfo {
  code: string;
  name: string;
  flag: string;
  police: string;
  ambulance: string;
  fire: string;
  universal: string;
}

export const EMERGENCY_NUMBERS: Record<string, EmergencyInfo> = {
  // North America
  US: { code: "US", name: "United States", flag: "🇺🇸", police: "911", ambulance: "911", fire: "911", universal: "911" },
  CA: { code: "CA", name: "Canada", flag: "🇨🇦", police: "911", ambulance: "911", fire: "911", universal: "911" },
  MX: { code: "MX", name: "Mexico", flag: "🇲🇽", police: "911", ambulance: "911", fire: "911", universal: "911" },
  
  // Europe
  GB: { code: "GB", name: "United Kingdom", flag: "🇬🇧", police: "999", ambulance: "999", fire: "999", universal: "999" },
  DE: { code: "DE", name: "Germany", flag: "🇩🇪", police: "110", ambulance: "112", fire: "112", universal: "112" },
  FR: { code: "FR", name: "France", flag: "🇫🇷", police: "17", ambulance: "15", fire: "18", universal: "112" },
  IT: { code: "IT", name: "Italy", flag: "🇮🇹", police: "113", ambulance: "118", fire: "115", universal: "112" },
  ES: { code: "ES", name: "Spain", flag: "🇪🇸", police: "091", ambulance: "061", fire: "080", universal: "112" },
  NL: { code: "NL", name: "Netherlands", flag: "🇳🇱", police: "112", ambulance: "112", fire: "112", universal: "112" },
  SE: { code: "SE", name: "Sweden", flag: "🇸🇪", police: "112", ambulance: "112", fire: "112", universal: "112" },
  NO: { code: "NO", name: "Norway", flag: "🇳🇴", police: "112", ambulance: "113", fire: "110", universal: "112" },
  DK: { code: "DK", name: "Denmark", flag: "🇩🇰", police: "112", ambulance: "112", fire: "112", universal: "112" },
  FI: { code: "FI", name: "Finland", flag: "🇫🇮", police: "112", ambulance: "112", fire: "112", universal: "112" },
  IE: { code: "IE", name: "Ireland", flag: "🇮🇪", police: "999", ambulance: "999", fire: "999", universal: "112" },
  PL: { code: "PL", name: "Poland", flag: "🇵🇱", police: "997", ambulance: "999", fire: "998", universal: "112" },
  AT: { code: "AT", name: "Austria", flag: "🇦🇹", police: "133", ambulance: "144", fire: "122", universal: "112" },
  CH: { code: "CH", name: "Switzerland", flag: "🇨🇭", police: "117", ambulance: "144", fire: "118", universal: "112" },
  BE: { code: "BE", name: "Belgium", flag: "🇧🇪", police: "101", ambulance: "112", fire: "112", universal: "112" },
  PT: { code: "PT", name: "Portugal", flag: "🇵🇹", police: "112", ambulance: "112", fire: "112", universal: "112" },
  GR: { code: "GR", name: "Greece", flag: "🇬🇷", police: "100", ambulance: "166", fire: "199", universal: "112" },
  CZ: { code: "CZ", name: "Czech Republic", flag: "🇨🇿", police: "158", ambulance: "155", fire: "150", universal: "112" },
  RO: { code: "RO", name: "Romania", flag: "🇷🇴", police: "112", ambulance: "112", fire: "112", universal: "112" },
  HU: { code: "HU", name: "Hungary", flag: "🇭🇺", police: "107", ambulance: "104", fire: "105", universal: "112" },
  RU: { code: "RU", name: "Russia", flag: "🇷🇺", police: "102", ambulance: "103", fire: "101", universal: "112" },
  UA: { code: "UA", name: "Ukraine", flag: "🇺🇦", police: "102", ambulance: "103", fire: "101", universal: "112" },
  TR: { code: "TR", name: "Turkey", flag: "🇹🇷", police: "155", ambulance: "112", fire: "110", universal: "112" },
  
  // Asia
  CN: { code: "CN", name: "China", flag: "🇨🇳", police: "110", ambulance: "120", fire: "119", universal: "110" },
  JP: { code: "JP", name: "Japan", flag: "🇯🇵", police: "110", ambulance: "119", fire: "119", universal: "110" },
  KR: { code: "KR", name: "South Korea", flag: "🇰🇷", police: "112", ambulance: "119", fire: "119", universal: "112" },
  IN: { code: "IN", name: "India", flag: "🇮🇳", police: "100", ambulance: "102", fire: "101", universal: "112" },
  PK: { code: "PK", name: "Pakistan", flag: "🇵🇰", police: "15", ambulance: "115", fire: "16", universal: "15" },
  BD: { code: "BD", name: "Bangladesh", flag: "🇧🇩", police: "999", ambulance: "999", fire: "999", universal: "999" },
  ID: { code: "ID", name: "Indonesia", flag: "🇮🇩", police: "110", ambulance: "118", fire: "113", universal: "112" },
  PH: { code: "PH", name: "Philippines", flag: "🇵🇭", police: "117", ambulance: "911", fire: "911", universal: "911" },
  VN: { code: "VN", name: "Vietnam", flag: "🇻🇳", police: "113", ambulance: "115", fire: "114", universal: "113" },
  TH: { code: "TH", name: "Thailand", flag: "🇹🇭", police: "191", ambulance: "1669", fire: "199", universal: "191" },
  MY: { code: "MY", name: "Malaysia", flag: "🇲🇾", police: "999", ambulance: "999", fire: "994", universal: "999" },
  SG: { code: "SG", name: "Singapore", flag: "🇸🇬", police: "999", ambulance: "995", fire: "995", universal: "999" },
  HK: { code: "HK", name: "Hong Kong", flag: "🇭🇰", police: "999", ambulance: "999", fire: "999", universal: "999" },
  TW: { code: "TW", name: "Taiwan", flag: "🇹🇼", police: "110", ambulance: "119", fire: "119", universal: "110" },
  AE: { code: "AE", name: "UAE", flag: "🇦🇪", police: "999", ambulance: "998", fire: "997", universal: "999" },
  SA: { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", police: "999", ambulance: "997", fire: "998", universal: "911" },
  IL: { code: "IL", name: "Israel", flag: "🇮🇱", police: "100", ambulance: "101", fire: "102", universal: "100" },
  
  // Oceania
  AU: { code: "AU", name: "Australia", flag: "🇦🇺", police: "000", ambulance: "000", fire: "000", universal: "000" },
  NZ: { code: "NZ", name: "New Zealand", flag: "🇳🇿", police: "111", ambulance: "111", fire: "111", universal: "111" },
  
  // South America
  BR: { code: "BR", name: "Brazil", flag: "🇧🇷", police: "190", ambulance: "192", fire: "193", universal: "190" },
  AR: { code: "AR", name: "Argentina", flag: "🇦🇷", police: "101", ambulance: "107", fire: "100", universal: "911" },
  CO: { code: "CO", name: "Colombia", flag: "🇨🇴", police: "123", ambulance: "123", fire: "123", universal: "123" },
  CL: { code: "CL", name: "Chile", flag: "🇨🇱", police: "133", ambulance: "131", fire: "132", universal: "131" },
  PE: { code: "PE", name: "Peru", flag: "🇵🇪", police: "105", ambulance: "117", fire: "116", universal: "105" },
  
  // Africa
  ZA: { code: "ZA", name: "South Africa", flag: "🇿🇦", police: "10111", ambulance: "10177", fire: "10177", universal: "112" },
  EG: { code: "EG", name: "Egypt", flag: "🇪🇬", police: "122", ambulance: "123", fire: "180", universal: "122" },
  NG: { code: "NG", name: "Nigeria", flag: "🇳🇬", police: "199", ambulance: "199", fire: "199", universal: "112" },
  KE: { code: "KE", name: "Kenya", flag: "🇰🇪", police: "999", ambulance: "999", fire: "999", universal: "999" },
  MA: { code: "MA", name: "Morocco", flag: "🇲🇦", police: "19", ambulance: "15", fire: "15", universal: "19" },
  GH: { code: "GH", name: "Ghana", flag: "🇬🇭", police: "191", ambulance: "193", fire: "192", universal: "112" },
};

export const getCountryList = (): EmergencyInfo[] => {
  return Object.values(EMERGENCY_NUMBERS).sort((a, b) => a.name.localeCompare(b.name));
};

export const getEmergencyNumber = (countryCode: string): EmergencyInfo => {
  return EMERGENCY_NUMBERS[countryCode] || EMERGENCY_NUMBERS.US;
};
