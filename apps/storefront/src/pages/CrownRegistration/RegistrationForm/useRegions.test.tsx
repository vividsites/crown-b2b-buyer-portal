import { renderWithProviders, screen } from 'tests/test-utils';

import { Country } from '@/shared/global/context/config';

import { US_REGION_CODES } from './regions';
import { useRegions } from './useRegions';

const countriesList: Country[] = [
  {
    countryCode: 'US',
    countryName: 'United States',
    states: [
      ...US_REGION_CODES.map((code) => ({
        stateCode: code,
        stateName: code === 'IL' ? 'Illinois' : `State ${code}`,
      })),
      { stateCode: 'PR', stateName: 'Puerto Rico' },
    ],
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    states: ['ON', 'QC', 'BC'].map((code) => ({
      stateCode: code,
      stateName: code === 'ON' ? 'Ontario' : `Province ${code}`,
    })),
  },
];

function Harness() {
  const { getRegions, resolveStateName } = useRegions();

  return (
    <>
      <p data-testid="us">{getRegions('US').length}</p>
      <p data-testid="ca">{getRegions('CA').length}</p>
      <p data-testid="il">{resolveStateName('US', 'IL')}</p>
      <p data-testid="zz">{String(resolveStateName('US', 'ZZ'))}</p>
    </>
  );
}

describe('useRegions', () => {
  it('returns the filtered region lists from the global country data', () => {
    renderWithProviders(<Harness />, { initialGlobalContext: { countriesList } });

    expect(screen.getByTestId('us')).toHaveTextContent('51');
    expect(screen.getByTestId('ca')).toHaveTextContent('3');
  });

  it('resolves a region name from its code', () => {
    renderWithProviders(<Harness />, { initialGlobalContext: { countriesList } });

    expect(screen.getByTestId('il')).toHaveTextContent('Illinois');
    expect(screen.getByTestId('zz')).toHaveTextContent('undefined');
  });
});
