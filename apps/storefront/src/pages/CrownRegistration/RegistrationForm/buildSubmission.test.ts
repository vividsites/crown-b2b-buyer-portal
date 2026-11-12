import { builder, faker } from 'tests/test-utils';

import { Country } from '@/shared/global/context/config';

import { buildSubmission } from './buildSubmission';
import { defaultRegistrationValues, RegistrationFormValues } from './schema';

const countries: Country[] = [
  {
    countryCode: 'US',
    countryName: 'United States',
    states: [{ stateCode: 'IL', stateName: 'Illinois' }],
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    states: [{ stateCode: 'ON', stateName: 'Ontario' }],
  },
];

const buildValuesWith = builder<RegistrationFormValues>(() => ({
  ...defaultRegistrationValues,
  existingCustomer: faker.datatype.boolean(),
  companyName: faker.company.name(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email({ provider: 'acmefoods.com' }).toLowerCase(),
  password: `${faker.string.alpha(6)}${faker.string.numeric(3)}`,
  phone: '(312) 555-0100',
  bAddress1: faker.location.streetAddress(),
  bAddress2: '',
  bCity: faker.location.city(),
  bCountry: 'US',
  bState: 'IL',
  bZip: '60601',
  sameAsBilling: true,
  privacyAcknowledged: true,
}));

const TOKEN = faker.string.alphanumeric(24);

describe('buildSubmission', () => {
  it('builds the same-as-billing payload with only the shorthand for shipping', () => {
    const values = buildValuesWith({
      sameAsBilling: true,
      // hidden values that must be ignored
      sAddress1: '1 Ignored St',
      sState: 'ZZ',
    });

    const result = buildSubmission(values, countries, TOKEN);

    expect(result).toEqual({
      ok: true,
      submission: {
        turnstileToken: TOKEN,
        contact: {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          password: values.password,
          existingCustomer: values.existingCustomer,
        },
        company: { name: values.companyName },
        privacyAcknowledged: true,
        billingAddress: {
          address1: values.bAddress1,
          address2: '',
          city: values.bCity,
          state: 'IL',
          stateName: 'Illinois',
          postalCode: '60601',
          country: 'US',
        },
        shippingAddress: { sameAsBilling: true },
      },
    });
  });

  it('builds a full Canadian shipping address when it differs from billing', () => {
    const values = buildValuesWith({
      sameAsBilling: false,
      sAddress1: '100 Queen St',
      sAddress2: 'Dock 4',
      sCity: 'Ottawa',
      sCountry: 'CA',
      sState: 'ON',
      sZip: 'K1A 0B1',
    });

    const result = buildSubmission(values, countries, TOKEN);

    expect(result).toMatchObject({
      ok: true,
      submission: {
        shippingAddress: {
          sameAsBilling: false,
          address1: '100 Queen St',
          address2: 'Dock 4',
          city: 'Ottawa',
          state: 'ON',
          stateName: 'Ontario',
          postalCode: 'K1A 0B1',
          country: 'CA',
        },
      },
    });
  });

  it('trims text values', () => {
    const values = buildValuesWith({
      companyName: '  Acme Foods  ',
      firstName: ' Ada ',
      email: ' ada@acmefoods.com ',
      bAddress1: '  1 Main St ',
      bZip: ' 60601 ',
    });

    const result = buildSubmission(values, countries, TOKEN);

    expect(result).toMatchObject({
      ok: true,
      submission: {
        company: { name: 'Acme Foods' },
        contact: { firstName: 'Ada', email: 'ada@acmefoods.com' },
        billingAddress: { address1: '1 Main St', postalCode: '60601' },
      },
    });
  });

  it('sends the password exactly as typed', () => {
    const password = '  pass word1  ';

    const result = buildSubmission(buildValuesWith({ password }), countries, TOKEN);

    expect(result).toMatchObject({ ok: true, submission: { contact: { password } } });
  });

  it('reports the billing state when its region cannot be resolved', () => {
    const result = buildSubmission(buildValuesWith({ bState: 'ZZ' }), countries, TOKEN);

    expect(result).toEqual({ ok: false, field: 'bState' });
  });

  it('reports the shipping state when its region cannot be resolved', () => {
    const result = buildSubmission(
      buildValuesWith({ sameAsBilling: false, sState: 'ZZ' }),
      countries,
      TOKEN,
    );

    expect(result).toEqual({ ok: false, field: 'sState' });
  });
});
