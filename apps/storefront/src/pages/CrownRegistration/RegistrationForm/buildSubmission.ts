import { Country } from '@/shared/global/context/config';
import { RegistrationSubmission, RegistrationSubmissionAddress } from '@/shared/service/vs';

import { resolveStateName } from './regions';
import { AddressPrefix, RegistrationFormValues } from './schema';

// Cloudflare's documented dummy token (accepted only with their test secret).
export const DEV_TURNSTILE_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'; // Phase 3: replace with the widget token

type BuildSubmissionResult =
  | { ok: true; submission: RegistrationSubmission }
  | { ok: false; field: 'bState' | 'sState' };

type AddressResult = { ok: true; address: RegistrationSubmissionAddress } | { ok: false };

const buildAddress = (
  values: RegistrationFormValues,
  countries: Country[],
  prefix: AddressPrefix,
): AddressResult => {
  const country = values[`${prefix}Country`];
  const state = values[`${prefix}State`].trim();
  const stateName = resolveStateName(countries, country, state);

  if (stateName === undefined) {
    return { ok: false };
  }

  return {
    ok: true,
    address: {
      address1: values[`${prefix}Address1`].trim(),
      address2: values[`${prefix}Address2`].trim(),
      city: values[`${prefix}City`].trim(),
      state,
      stateName,
      postalCode: values[`${prefix}Zip`].trim(),
      country,
    },
  };
};

export const buildSubmission = (
  values: RegistrationFormValues,
  countries: Country[],
  turnstileToken: string,
): BuildSubmissionResult => {
  const billing = buildAddress(values, countries, 'b');
  if (!billing.ok) {
    return { ok: false, field: 'bState' };
  }

  const submission: RegistrationSubmission = {
    turnstileToken,
    contact: {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      // the password is sent exactly as typed
      password: values.password,
      existingCustomer: values.existingCustomer,
    },
    company: { name: values.companyName.trim() },
    privacyAcknowledged: true,
    billingAddress: billing.address,
    shippingAddress: { sameAsBilling: true },
  };

  if (values.sameAsBilling) {
    return { ok: true, submission };
  }

  const shipping = buildAddress(values, countries, 's');
  if (!shipping.ok) {
    return { ok: false, field: 'sState' };
  }

  return {
    ok: true,
    submission: {
      ...submission,
      shippingAddress: { sameAsBilling: false, ...shipping.address },
    },
  };
};
