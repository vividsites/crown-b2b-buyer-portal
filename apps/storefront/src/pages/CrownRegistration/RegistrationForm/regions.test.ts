import { builder } from 'tests/test-utils';

import { Country } from '@/shared/global/context/config';

import { getRegionOptions, resolveStateName, US_REGION_CODES } from './regions';

const buildCountryWith = builder<Country>(() => ({
  countryCode: 'US',
  countryName: 'United States',
  states: [],
}));

const CA_CODES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

const countries: Country[] = [
  buildCountryWith({
    countryCode: 'US',
    states: [
      ...US_REGION_CODES.map((code) => ({
        stateCode: code,
        stateName: code === 'IL' ? 'Illinois' : `State ${code}`,
      })),
      { stateCode: 'PR', stateName: 'Puerto Rico' },
      { stateCode: 'GU', stateName: 'Guam' },
      { stateCode: undefined, stateName: 'Nameless' },
    ],
  }),
  buildCountryWith({
    countryCode: 'CA',
    countryName: 'Canada',
    states: CA_CODES.map((code) => ({
      stateCode: code,
      stateName: code === 'ON' ? 'Ontario' : `Province ${code}`,
    })),
  }),
];

describe('getRegionOptions', () => {
  it('keeps only the 50 states and DC for the US', () => {
    const options = getRegionOptions(countries, 'US');

    expect(options).toHaveLength(51);
    expect(options.map(({ stateCode }) => stateCode)).not.toContain('PR');
    expect(options.map(({ stateCode }) => stateCode)).not.toContain('GU');
  });

  it('returns every Canadian province and territory', () => {
    expect(getRegionOptions(countries, 'CA')).toHaveLength(13);
  });

  it('sorts options by name', () => {
    const names = getRegionOptions(countries, 'CA').map(({ stateName }) => stateName);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('returns an empty list when the country is missing', () => {
    expect(getRegionOptions([], 'US')).toEqual([]);
    expect(getRegionOptions([countries[1]], 'US')).toEqual([]);
  });
});

describe('resolveStateName', () => {
  it('returns the region name for a known code', () => {
    expect(resolveStateName(countries, 'US', 'IL')).toBe('Illinois');
    expect(resolveStateName(countries, 'CA', 'ON')).toBe('Ontario');
  });

  it('returns undefined for an unknown code, a territory or the wrong country', () => {
    expect(resolveStateName(countries, 'US', 'ZZ')).toBeUndefined();
    expect(resolveStateName(countries, 'US', 'PR')).toBeUndefined();
    expect(resolveStateName(countries, 'CA', 'IL')).toBeUndefined();
  });
});
