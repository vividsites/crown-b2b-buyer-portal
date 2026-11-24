import { z } from 'zod';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
// At least one letter in any script, so accented names pass too.
export const HAS_LETTER_PATTERN = /\p{L}/u;
export const US_ZIP_PATTERN = /^\d{5}(-\d{4})?$/;

const baseSchema = z.object({
  existingCustomer: z.boolean(),
  // optional, even when existingCustomer is checked
  salesRepName: z.string(),
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
  bState: z.string(),
  bZip: z.string(),
  sameAsBilling: z.boolean(),
  sAddress1: z.string(),
  sAddress2: z.string(),
  sCity: z.string(),
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

  const requireLetter = (field: 'companyName' | 'firstName' | 'lastName', value: string) => {
    if (requireField(field, value) && !HAS_LETTER_PATTERN.test(value)) {
      fail(field, `${field}Invalid`);
    }
  };

  requireLetter('companyName', values.companyName);
  requireLetter('firstName', values.firstName);
  requireLetter('lastName', values.lastName);

  const email = values.email.trim();
  if (requireField('email', email) && !EMAIL_PATTERN.test(email)) {
    fail('email', 'emailInvalid');
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
    if (requireField(zipField, zip) && !US_ZIP_PATTERN.test(zip)) {
      fail(zipField, 'zipUS');
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
  salesRepName: '',
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
  bState: '',
  bZip: '',
  sameAsBilling: true,
  sAddress1: '',
  sAddress2: '',
  sCity: '',
  sState: '',
  sZip: '',
  privacyAcknowledged: false,
};
