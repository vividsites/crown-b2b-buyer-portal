import {
  addressFieldUpdates,
  addressKey,
  getAddressesToVerify,
  prefixFor,
  primaryField,
  readAddress,
} from './addressVerification';
import { defaultRegistrationValues, RegistrationFormValues } from './schema';

const values = (overrides: Partial<RegistrationFormValues> = {}): RegistrationFormValues => ({
  ...defaultRegistrationValues,
  bAddress1: ' 1 Main St ',
  bCity: 'Chicago',
  bState: 'IL',
  bZip: '60601',
  sAddress1: '9 Dock Rd',
  sCity: 'Dallas',
  sState: 'TX',
  sZip: '75001',
  ...overrides,
});

describe('getAddressesToVerify', () => {
  it('returns only billing when shipping is the same', () => {
    const result = getAddressesToVerify(values());

    expect(result.map(({ scope }) => scope)).toEqual(['billing']);
    expect(result[0].address.address1).toBe('1 Main St');
  });

  it('returns billing then shipping when they differ', () => {
    const result = getAddressesToVerify(values({ sameAsBilling: false }));

    expect(result.map(({ scope }) => scope)).toEqual(['billing', 'shipping']);
  });

  it('excludes Canadian addresses', () => {
    expect(getAddressesToVerify(values({ bCountry: 'CA' }))).toEqual([]);
  });

  it('keeps a US shipping address when billing is Canadian', () => {
    const result = getAddressesToVerify(values({ bCountry: 'CA', sameAsBilling: false }));

    expect(result.map(({ scope }) => scope)).toEqual(['shipping']);
  });
});

describe('addressKey', () => {
  const base = readAddress(values(), 'b');

  it('ignores case and extra whitespace', () => {
    expect(addressKey({ ...base, address1: '  1   MAIN  st', city: 'chicago' })).toBe(
      addressKey(base),
    );
  });

  it('differs when the ZIP differs', () => {
    expect(addressKey({ ...base, postalCode: '60602' })).not.toBe(addressKey(base));
  });
});

describe('addressFieldUpdates', () => {
  it('maps all five fields for each prefix and leaves the country alone', () => {
    const address = {
      address1: '1 MAIN ST',
      address2: 'STE 2',
      city: 'CHICAGO',
      state: 'IL',
      postalCode: '60601-1234',
      country: 'US' as const,
    };

    expect(addressFieldUpdates('s', address)).toEqual({
      sAddress1: '1 MAIN ST',
      sAddress2: 'STE 2',
      sCity: 'CHICAGO',
      sState: 'IL',
      sZip: '60601-1234',
    });
    expect(Object.keys(addressFieldUpdates('b', address))).toEqual([
      'bAddress1',
      'bAddress2',
      'bCity',
      'bState',
      'bZip',
    ]);
  });
});

describe('scope helpers', () => {
  it('maps scope to prefix and focus field', () => {
    expect(prefixFor('billing')).toBe('b');
    expect(prefixFor('shipping')).toBe('s');
    expect(primaryField('b')).toBe('bAddress1');
    expect(primaryField('s')).toBe('sAddress1');
  });
});
