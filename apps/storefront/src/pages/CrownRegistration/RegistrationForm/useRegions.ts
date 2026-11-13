import { useCallback, useContext } from 'react';

import { useSetCountry } from '@/hooks/useGetCountry';
import { GlobalContext } from '@/shared/global';
import { Country } from '@/shared/global/context/config';
import { RegistrationCountry } from '@/shared/service/vs';

import { getRegionOptions, resolveStateName } from './regions';

// stable reference while the country list has not loaded
const NO_COUNTRIES: Country[] = [];

// BigCommerce country and region data from GlobalContext (fetched when empty).
export function useRegions() {
  useSetCountry();
  const {
    state: { countriesList },
  } = useContext(GlobalContext);
  const countries = countriesList ?? NO_COUNTRIES;

  const getRegions = useCallback(
    (country: RegistrationCountry) => getRegionOptions(countries, country),
    [countries],
  );

  const getStateName = useCallback(
    (country: RegistrationCountry, stateCode: string) =>
      resolveStateName(countries, country, stateCode),
    [countries],
  );

  return { countries, getRegions, resolveStateName: getStateName };
}
