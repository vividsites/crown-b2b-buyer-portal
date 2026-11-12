import { zodResolver } from '@hookform/resolvers/zod';
import { builder, faker } from 'tests/test-utils';

import { defaultRegistrationValues, RegistrationFormValues, registrationSchema } from './schema';

const buildValuesWith = builder<RegistrationFormValues>(() => {
  const password = `${faker.string.alpha(6)}${faker.string.numeric(3)}`;

  return {
    existingCustomer: false,
    companyName: faker.company.name(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email({ provider: 'acmefoods.com' }),
    password,
    confirmPassword: password,
    phone: faker.string.numeric(10),
    bAddress1: faker.location.streetAddress(),
    bAddress2: '',
    bCity: faker.location.city(),
    bCountry: 'US',
    bState: 'IL',
    bZip: faker.string.numeric(5),
    sameAsBilling: true,
    sAddress1: '',
    sAddress2: '',
    sCity: '',
    sCountry: 'US',
    sState: '',
    sZip: '',
    privacyAcknowledged: true,
  };
});

const issuesFor = (values: RegistrationFormValues): Record<string, string> => {
  const result = registrationSchema.safeParse(values);

  return Object.fromEntries(
    result.error?.issues.map((issue) => [issue.path.join('.'), issue.message]) ?? [],
  );
};

describe('registrationSchema', () => {
  it('accepts a complete valid application', () => {
    expect(registrationSchema.safeParse(buildValuesWith('WHATEVER_VALUES')).success).toBe(true);
  });

  it.each([
    'companyName',
    'firstName',
    'lastName',
    'email',
    'password',
    'confirmPassword',
    'phone',
    'bAddress1',
    'bCity',
    'bState',
    'bZip',
    'sAddress1',
    'sCity',
    'sState',
    'sZip',
  ] as const)('reports a required key for every blank required field: %s', (field) => {
    const values = buildValuesWith({
      sameAsBilling: false,
      sAddress1: faker.location.streetAddress(),
      sCity: faker.location.city(),
      sState: 'ON',
      sCountry: 'CA',
      sZip: 'K1A 0B1',
      [field]: '',
    });

    expect(issuesFor(values)[field]).toBe(`crownRegistration.error.required.${field}`);
  });

  it('treats a whitespace-only value as blank', () => {
    expect(issuesFor(buildValuesWith({ companyName: '   ' }))).toEqual({
      companyName: 'crownRegistration.error.required.companyName',
    });
  });

  it.each([
    ['not-an-email', 'crownRegistration.error.emailInvalid'],
    ['jane@acme.c', 'crownRegistration.error.emailInvalid'],
    ['jane@gmail.com', 'crownRegistration.error.emailCompany'],
    ['jane@yahoo.com', 'crownRegistration.error.emailCompany'],
    ['jane@hotmail.com', 'crownRegistration.error.emailCompany'],
    ['jane@outlook.com', 'crownRegistration.error.emailCompany'],
    ['jane@aol.com', 'crownRegistration.error.emailCompany'],
    ['JANE@GMAIL.COM', 'crownRegistration.error.emailCompany'],
    ['jane@acmefoods.com', undefined],
  ])('validates email %s', (email, expected) => {
    expect(issuesFor(buildValuesWith({ email })).email).toBe(expected);
  });

  it.each([
    ['555-0100', 'crownRegistration.error.phoneInvalid'],
    ['(555) 555-0100', undefined],
  ])('validates phone %s', (phone, expected) => {
    expect(issuesFor(buildValuesWith({ phone })).phone).toBe(expected);
  });

  it.each([
    ['abc12', 'crownRegistration.error.passwordLength'],
    ['abcdefgh', 'crownRegistration.error.passwordMix'],
    ['12345678', 'crownRegistration.error.passwordMix'],
    ['abcdefg1', undefined],
  ])('validates password %s', (password, expected) => {
    expect(issuesFor(buildValuesWith({ password, confirmPassword: password })).password).toBe(
      expected,
    );
  });

  it('reports mismatched passwords alongside other required errors', () => {
    const issues = issuesFor(
      buildValuesWith({ companyName: '', password: 'abcdefg1', confirmPassword: 'abcdefg2' }),
    );

    expect(issues).toEqual({
      companyName: 'crownRegistration.error.required.companyName',
      confirmPassword: 'crownRegistration.error.passwordMismatch',
    });
  });

  it.each([
    ['1234', 'crownRegistration.error.zipUS'],
    ['K1A 0B1', 'crownRegistration.error.zipUS'],
    ['62701', undefined],
    ['62701-1234', undefined],
  ])('validates US ZIP %s', (bZip, expected) => {
    expect(issuesFor(buildValuesWith({ bCountry: 'US', bZip })).bZip).toBe(expected);
  });

  it.each([
    ['12345', 'crownRegistration.error.postalCA'],
    ['K1A 0B1', undefined],
    ['k1a0b1', undefined],
    ['K1A-0B1', undefined],
  ])('validates CA postal code %s', (bZip, expected) => {
    expect(issuesFor(buildValuesWith({ bCountry: 'CA', bState: 'ON', bZip })).bZip).toBe(expected);
  });

  it('ignores shipping fields when shipping is the same as billing', () => {
    const values = buildValuesWith({ sameAsBilling: true, sZip: 'abc', sAddress1: '' });

    expect(issuesFor(values)).toEqual({});
  });

  it("validates shipping fields with the shipping country's rules when shipping differs", () => {
    const values = buildValuesWith({
      sameAsBilling: false,
      sAddress1: faker.location.streetAddress(),
      sCity: faker.location.city(),
      sState: 'ON',
      sCountry: 'CA',
      sZip: '12345',
    });

    expect(issuesFor(values)).toEqual({ sZip: 'crownRegistration.error.postalCA' });
  });

  it('requires privacy acknowledgement', () => {
    expect(issuesFor(buildValuesWith({ privacyAcknowledged: false }))).toEqual({
      privacyAcknowledged: 'crownRegistration.error.privacyRequired',
    });
  });

  it('reports only one issue per field', () => {
    const result = registrationSchema.safeParse(buildValuesWith({ email: '' }));
    const emailIssues = result.error?.issues.filter((issue) => issue.path[0] === 'email');

    expect(emailIssues?.map((issue) => issue.message)).toEqual([
      'crownRegistration.error.required.email',
    ]);
  });

  it('defaultRegistrationValues fail only on required fields and privacy', () => {
    expect(issuesFor(defaultRegistrationValues)).toEqual({
      companyName: 'crownRegistration.error.required.companyName',
      firstName: 'crownRegistration.error.required.firstName',
      lastName: 'crownRegistration.error.required.lastName',
      email: 'crownRegistration.error.required.email',
      password: 'crownRegistration.error.required.password',
      confirmPassword: 'crownRegistration.error.required.confirmPassword',
      phone: 'crownRegistration.error.required.phone',
      bAddress1: 'crownRegistration.error.required.bAddress1',
      bCity: 'crownRegistration.error.required.bCity',
      bState: 'crownRegistration.error.required.bState',
      bZip: 'crownRegistration.error.required.bZip',
      privacyAcknowledged: 'crownRegistration.error.privacyRequired',
    });
  });

  it('produces field errors through zodResolver', async () => {
    const values = buildValuesWith({ companyName: '' });

    const result = await zodResolver(registrationSchema)(values, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });

    expect(result.errors.companyName?.message).toBe('crownRegistration.error.required.companyName');
  });
});
