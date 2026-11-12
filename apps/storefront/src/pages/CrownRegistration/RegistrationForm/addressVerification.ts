import { RegistrationAddress } from '@/shared/service/vs';

import { AddressPrefix, RegistrationFormValues } from './schema';

export type VerifiedScope = 'billing' | 'shipping';

export const prefixFor = (scope: VerifiedScope): AddressPrefix => (scope === 'billing' ? 'b' : 's');

export const primaryField = (prefix: AddressPrefix): 'bAddress1' | 'sAddress1' =>
  prefix === 'b' ? 'bAddress1' : 'sAddress1';

export const readAddress = (
  values: RegistrationFormValues,
  prefix: AddressPrefix,
): RegistrationAddress => ({
  address1: values[`${prefix}Address1`].trim(),
  address2: values[`${prefix}Address2`].trim(),
  city: values[`${prefix}City`].trim(),
  state: values[`${prefix}State`].trim(),
  postalCode: values[`${prefix}Zip`].trim(),
  country: values[`${prefix}Country`],
});

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toUpperCase();

// Canonical key for the "already decided" cache.
export const addressKey = (address: RegistrationAddress): string =>
  [
    address.address1,
    address.address2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .map(normalize)
    .join('|');

// Billing first; shipping only when it is separate. US addresses only: USPS
// cannot verify Canadian ones.
export const getAddressesToVerify = (
  values: RegistrationFormValues,
): { scope: VerifiedScope; address: RegistrationAddress }[] => {
  const entries: { scope: VerifiedScope; address: RegistrationAddress }[] = [
    { scope: 'billing', address: readAddress(values, 'b') },
  ];

  if (!values.sameAsBilling) {
    entries.push({ scope: 'shipping', address: readAddress(values, 's') });
  }

  return entries.filter(({ address }) => address.country === 'US');
};

// Country is left alone: a suggestion never changes it.
export const addressFieldUpdates = (
  prefix: AddressPrefix,
  address: RegistrationAddress,
): Partial<RegistrationFormValues> => ({
  [`${prefix}Address1`]: address.address1,
  [`${prefix}Address2`]: address.address2,
  [`${prefix}City`]: address.city,
  [`${prefix}State`]: address.state,
  [`${prefix}Zip`]: address.postalCode,
});
