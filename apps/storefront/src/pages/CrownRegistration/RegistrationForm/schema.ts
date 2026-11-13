import { z } from 'zod';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
export const FREE_EMAIL_PATTERN = /@(gmail|yahoo|hotmail|outlook|aol)\./i;
export const US_ZIP_PATTERN = /^\d{5}(-\d{4})?$/;
export const CA_POSTAL_PATTERN = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

const countrySchema = z.enum(['US', 'CA']);

const baseSchema = z.object({
  existingCustomer: z.boolean(),
  companyName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  password: z.string(),
  confirmPassword: z.string(),
  phone: z.string(),
  bAddress1: z.string(),
  bAddress2: z.string(),
  bCity: z.string(),
  bCountry: countrySchema,
  bState: z.string(),
  bZip: z.string(),
  sameAsBilling: z.boolean(),
  sAddress1: z.string(),
  sAddress2: z.string(),
  sCity: z.string(),
  sCountry: countrySchema,
  sState: z.string(),
  sZip: z.string(),
  privacyAcknowledged: z.boolean(),
});

export type RegistrationFormValues = z.infer<typeof baseSchema>;
export type AddressPrefix = 'b' | 's';
type AddressField = `${AddressPrefix}${'Address1' | 'City' | 'State' | 'Zip'}`;

const isBlank = (value: string) => value.trim() === '';

// All rules live in one superRefine over bare fields: zod 4 skips object-level
// refinements while field-level checks fail, which would hide cross-field errors.
export const registrationSchema = baseSchema.superRefine((values, ctx) => {
  const fail = (path: keyof RegistrationFormValues, key: string) =>
    ctx.addIssue({ code: 'custom', path: [path], message: `crownRegistration.error.${key}` });

  const requireField = (field: keyof RegistrationFormValues & string, value: string) => {
    if (isBlank(value)) {
      fail(field, `required.${field}`);
      return false;
    }
    return true;
  };

  requireField('companyName', values.companyName);
  requireField('firstName', values.firstName);
  requireField('lastName', values.lastName);

  const email = values.email.trim();
  if (requireField('email', email)) {
    if (!EMAIL_PATTERN.test(email)) {
      fail('email', 'emailInvalid');
    } else if (FREE_EMAIL_PATTERN.test(email)) {
      fail('email', 'emailCompany');
    }
  }

  if (requireField('password', values.password)) {
    if (values.password.length < 8) {
      fail('password', 'passwordLength');
    } else if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
      fail('password', 'passwordMix');
    }
  }

  if (requireField('confirmPassword', values.confirmPassword)) {
    if (values.confirmPassword !== values.password) {
      fail('confirmPassword', 'passwordMismatch');
    }
  }

  if (requireField('phone', values.phone)) {
    if (values.phone.replace(/\D/g, '').length < 10) {
      fail('phone', 'phoneInvalid');
    }
  }

  const validateAddress = (prefix: AddressPrefix) => {
    const field = (name: 'Address1' | 'City' | 'State' | 'Zip'): AddressField => `${prefix}${name}`;

    requireField(field('Address1'), values[field('Address1')]);
    requireField(field('City'), values[field('City')]);
    requireField(field('State'), values[field('State')]);

    const zipField = field('Zip');
    const zip = values[zipField].trim();
    const country = values[`${prefix}Country`];
    if (requireField(zipField, zip)) {
      if (country === 'US' && !US_ZIP_PATTERN.test(zip)) {
        fail(zipField, 'zipUS');
      } else if (country === 'CA' && !CA_POSTAL_PATTERN.test(zip)) {
        fail(zipField, 'postalCA');
      }
    }
  };

  validateAddress('b');
  if (!values.sameAsBilling) {
    validateAddress('s');
  }

  if (values.privacyAcknowledged !== true) {
    fail('privacyAcknowledged', 'privacyRequired');
  }
});

export const defaultRegistrationValues: RegistrationFormValues = {
  existingCustomer: false,
  companyName: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  bAddress1: '',
  bAddress2: '',
  bCity: '',
  bCountry: 'US',
  bState: '',
  bZip: '',
  sameAsBilling: true,
  sAddress1: '',
  sAddress2: '',
  sCity: '',
  sCountry: 'US',
  sState: '',
  sZip: '',
  privacyAcknowledged: false,
};
