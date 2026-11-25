import { ReactNode } from 'react';
import { Control } from 'react-hook-form';

import { useB3Lang } from '@/lib/lang';

import { CrownSelect } from '../components/CrownSelect';
import { CrownTextField } from '../components/CrownTextField';

import { RegionOption, REGISTRATION_COUNTRY } from './regions';
import { AddressPrefix, RegistrationFormValues } from './schema';

interface AddressFieldsProps {
  prefix: AddressPrefix;
  control: Control<RegistrationFormValues>;
  getRegions: (country: typeof REGISTRATION_COUNTRY) => RegionOption[];
  // shown under the street address until it is edited, e.g. a duplicate-address error
  address1Error?: ReactNode;
}

type AddressFieldKey = 'Address1' | 'Address2' | 'City' | 'State' | 'Zip';

// Renders as children of a FormSection grid.
export function AddressFields({ prefix, control, getRegions, address1Error }: AddressFieldsProps) {
  const b3Lang = useB3Lang();
  const section = prefix === 'b' ? 'billing' : 'shipping';

  const name = <K extends AddressFieldKey>(key: K) => `${prefix}${key}` as const;

  return (
    <>
      <CrownTextField
        control={control}
        name={name('Address1')}
        label={b3Lang('crownRegistration.field.address1')}
        required
        maxLength={200}
        fullRow
        autoComplete={`${section} address-line1`}
        persistentError={address1Error}
      />
      <CrownTextField
        control={control}
        name={name('Address2')}
        label={b3Lang('crownRegistration.field.address2')}
        maxLength={200}
        fullRow
        autoComplete={`${section} address-line2`}
      />
      <CrownTextField
        control={control}
        name={name('City')}
        label={b3Lang('crownRegistration.field.city')}
        maxLength={100}
        required
        autoComplete={`${section} address-level2`}
      />
      <CrownSelect
        control={control}
        name={name('State')}
        label={b3Lang('crownRegistration.field.state')}
        placeholder={b3Lang('crownRegistration.field.statePrompt')}
        required
        autoComplete={`${section} address-level1`}
        options={getRegions(REGISTRATION_COUNTRY).map(({ stateCode, stateName }) => ({
          value: stateCode,
          label: stateName,
        }))}
      />
      <CrownTextField
        control={control}
        name={name('Zip')}
        label={b3Lang('crownRegistration.field.zip')}
        required
        autoComplete={`${section} postal-code`}
        inputMode="numeric"
      />
    </>
  );
}
