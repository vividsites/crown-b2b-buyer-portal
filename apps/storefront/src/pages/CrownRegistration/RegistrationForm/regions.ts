import { Country } from '@/shared/global/context/config';
import { RegistrationCountry } from '@/shared/service/vs';

export interface RegionOption {
  stateCode: string;
  stateName: string;
}

// 50 states plus DC. BigCommerce also lists territories (PR, GU, ...) that the
// registration API does not accept.
export const US_REGION_CODES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'DC',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
] as const;

const US_REGION_CODE_SET: ReadonlySet<string> = new Set(US_REGION_CODES);

export const getRegionOptions = (
  countries: Country[],
  country: RegistrationCountry,
): RegionOption[] => {
  const match = countries.find(({ countryCode }) => countryCode === country);

  if (!match) {
    return [];
  }

  const options: RegionOption[] = [];
  match.states.forEach(({ stateCode, stateName }) => {
    if (!stateCode || !stateName) {
      return;
    }
    if (country === 'US' && !US_REGION_CODE_SET.has(stateCode)) {
      return;
    }
    options.push({ stateCode, stateName });
  });

  return options.sort((a, b) => a.stateName.localeCompare(b.stateName));
};

export const resolveStateName = (
  countries: Country[],
  country: RegistrationCountry,
  stateCode: string,
): string | undefined =>
  getRegionOptions(countries, country).find((option) => option.stateCode === stateCode)?.stateName;
