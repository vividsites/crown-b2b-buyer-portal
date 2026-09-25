import { channelId, storeHash } from '@/utils/basicConfig';

import anonymousFetch from '../request/anonymousFetch';

export type RegistrationCountry = 'US' | 'CA';

export interface RegistrationAddress {
  address1: string;
  address2: string;
  city: string;
  // region code, e.g. "IL"
  state: string;
  // BC region name, e.g. "Illinois"
  stateName?: string;
  postalCode: string;
  country: RegistrationCountry;
}

export type RegistrationShippingAddress =
  | { sameAsBilling: true }
  | ({ sameAsBilling: false } & RegistrationAddress);

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
  billingAddress: RegistrationAddress;
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
  rateLimited: 'RATE_LIMITED',
} as const;

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
