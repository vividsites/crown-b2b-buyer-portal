import { channelId, storeHash } from '@/utils/basicConfig';

import anonymousFetch from '../request/anonymousFetch';

export type RegistrationCountry = 'US' | 'CA';

export interface RegistrationAddress {
  address1: string;
  address2: string;
  city: string;
  // region code, e.g. "IL"
  state: string;
  postalCode: string;
  country: RegistrationCountry;
}

// Registration payloads also need the BC region name (e.g. "Illinois"): one of
// the underlying BigCommerce calls requires the name instead of the code.
// validate-address requests and its `suggested` result omit it.
export type RegistrationSubmissionAddress = RegistrationAddress & { stateName: string };

export type RegistrationShippingAddress =
  | { sameAsBilling: true }
  | ({ sameAsBilling: false } & RegistrationSubmissionAddress);

export interface RegistrationRequest {
  storeHash: string;
  channelId: number;
  turnstileToken: string;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    existingCustomer: boolean;
  };
  company: { name: string };
  privacyAcknowledged: true;
  billingAddress: RegistrationSubmissionAddress;
  shippingAddress: RegistrationShippingAddress;
}

export type RegistrationSubmission = Omit<RegistrationRequest, 'storeHash' | 'channelId'>;

export interface RegistrationResponse {
  referenceId: string;
  status: 'pending';
}

export type AddressValidationStatus = 'match' | 'corrected' | 'unverifiable';

export interface AddressValidationResult {
  status: AddressValidationStatus;
  suggested?: RegistrationAddress;
  changes?: string[];
}

export const REGISTRATION_ERROR_CODES = {
  turnstileFailed: 'TURNSTILE_FAILED',
  emailExists: 'EMAIL_EXISTS',
  validation: 'VALIDATION',
  // field is "billingAddress" or "shippingAddress", or "companyName" for a duplicate company name
  addressExists: 'ADDRESS_EXISTS',
  // 500, no field
  registrationFailed: 'REGISTRATION_FAILED',
  // Not emitted by the VS API; Cloudflare rate limiting may still return 429
  rateLimited: 'RATE_LIMITED',
} as const;

// must match the VS API's expected siteverify action
export const REGISTRATION_TURNSTILE_ACTION = 'registration';

const ADDRESS_VALIDATION_TIMEOUT_MS = 8000;

export const registerBusinessAccount = (submission: RegistrationSubmission) =>
  anonymousFetch.post<RegistrationResponse>('/storefront/registration/', {
    storeHash,
    channelId,
    ...submission,
  });

export const validateAddress = (address: RegistrationAddress) =>
  anonymousFetch.post<AddressValidationResult>(
    '/storefront/registration/validate-address/',
    { storeHash, address },
    { timeoutMs: ADDRESS_VALIDATION_TIMEOUT_MS },
  );
