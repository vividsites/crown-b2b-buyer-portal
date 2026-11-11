import { isVSApiError, REGISTRATION_ERROR_CODES, VSFieldError } from '@/shared/service/vs';

import { defaultRegistrationValues, RegistrationFormValues } from './schema';

// Server `message` text is written for display. The field components pass every
// error message through `b3Lang(message)`, which falls back to the text itself
// when the id is unknown (no console output). That text is then parsed as ICU
// syntax, so `escapeServerMessage` neutralises apostrophes, braces and angle
// brackets. Messages that are i18n keys (client-authored) are passed unchanged.

export type FormFieldName = keyof RegistrationFormValues;

interface MappedServerErrors {
  // message: i18n key OR escaped server text
  fieldErrors: { field: FormFieldName; message: string }[];
  // i18n key
  bannerKey?: string;
  focusField?: FormFieldName;
}

const FORM_FIELDS = new Set<string>(Object.keys(defaultRegistrationValues));

const isFormField = (field: string | undefined): field is FormFieldName =>
  field !== undefined && FORM_FIELDS.has(field);

const escapeServerMessage = (text: string): string =>
  text.replace(/'/g, "''").replace(/[{}<>]/g, (char) => `'${char}'`);

const GENERIC = 'crownRegistration.error.generic';

const mapAddressField = (
  field: string | undefined,
  sameAsBilling: boolean,
): FormFieldName | undefined => {
  if (field === 'billingAddress') {
    return 'bAddress1';
  }
  if (field === 'shippingAddress') {
    return sameAsBilling ? 'bAddress1' : 'sAddress1';
  }
  return undefined;
};

export const mapServerErrors = (error: unknown, sameAsBilling: boolean): MappedServerErrors => {
  if (!isVSApiError(error) || error.status === 0) {
    return { fieldErrors: [], bannerKey: GENERIC };
  }

  const result: MappedServerErrors = { fieldErrors: [] };

  const addFieldError = (field: FormFieldName, message: string) => {
    result.fieldErrors.push({ field, message });
    result.focusField ??= field;
  };

  const addBanner = (key: string) => {
    result.bannerKey ??= key;
  };

  const handle = ({ code, field, message }: VSFieldError) => {
    switch (code) {
      case REGISTRATION_ERROR_CODES.turnstileFailed:
        addBanner('crownRegistration.error.turnstileFailed');
        break;
      case REGISTRATION_ERROR_CODES.rateLimited:
        addBanner('crownRegistration.error.rateLimited');
        break;
      case REGISTRATION_ERROR_CODES.emailExists:
        addFieldError('email', 'crownRegistration.error.emailExists');
        break;
      case REGISTRATION_ERROR_CODES.validation:
        if (isFormField(field) && message) {
          addFieldError(field, escapeServerMessage(message));
        } else {
          addBanner(GENERIC);
        }
        break;
      case REGISTRATION_ERROR_CODES.addressExists: {
        // the API also reports duplicates on other fields, e.g. companyName
        const target =
          mapAddressField(field, sameAsBilling) ?? (isFormField(field) ? field : undefined);
        if (target && message) {
          addFieldError(target, escapeServerMessage(message));
        } else {
          addBanner(GENERIC);
        }
        break;
      }
      default:
        // Unrecognised codes still show inline when they name a form field and carry
        // text; REGISTRATION_FAILED and anything else gets the generic banner.
        if (isFormField(field) && message) {
          addFieldError(field, escapeServerMessage(message));
        } else {
          addBanner(GENERIC);
        }
    }
  };

  error.errors.forEach(handle);

  if (result.fieldErrors.length === 0 && !result.bannerKey) {
    result.bannerKey = GENERIC;
  }

  return result;
};
