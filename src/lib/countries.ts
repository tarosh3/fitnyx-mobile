export interface Country {
  name: string;
  code: string;
  flag: string;
  iso: string;
}

export const countries: Country[] = [
  { name: 'United States', code: '+1', flag: '🇺🇸', iso: 'US' },
  { name: 'Canada', code: '+1', flag: '🇨🇦', iso: 'CA' },
  { name: 'India', code: '+91', flag: '🇮🇳', iso: 'IN' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', iso: 'GB' },
  { name: 'Australia', code: '+61', flag: '🇦🇺', iso: 'AU' },
  { name: 'Germany', code: '+49', flag: '🇩🇪', iso: 'DE' },
  { name: 'France', code: '+33', flag: '🇫🇷', iso: 'FR' },
  { name: 'Japan', code: '+81', flag: '🇯🇵', iso: 'JP' },
  { name: 'UAE', code: '+971', flag: '🇦🇪', iso: 'AE' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦', iso: 'SA' },
];
