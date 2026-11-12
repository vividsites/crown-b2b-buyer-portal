import { Control, UseFormClearErrors, UseFormSetValue, useWatch } from 'react-hook-form';

import { useB3Lang } from '@/lib/lang';
import { RegistrationCountry } from '@/shared/service/vs';

import { CrownSelect } from '../components/CrownSelect';
import { CrownTextField } from '../components/CrownTextField';

import { RegionOption } from './regions';
import { AddressPrefix, RegistrationFormValues } from './schema';

interface AddressFieldsProps {
  prefix: AddressPrefix;
  control: Control<RegistrationFormValues>;
  setValue: UseFormSetValue<RegistrationFormValues>;
  clearErrors: UseFormClearErrors<RegistrationFormValues>;
  getRegions: (country: RegistrationCountry) => RegionOption[];
}

type AddressFieldKey = 'Address1' | 'Address2' | 'City' | 'Country' | 'State' | 'Zip';

const COUNTRIES: RegistrationCountry[] = ['US', 'CA'];

// Renders as children of a FormSection grid.
export function AddressFields({
  prefix,
  control,
  setValue,
  clearErrors,
  getRegions,
}: AddressFieldsProps) {
  const b3Lang = useB3Lang();
  const country = useWatch({ control, name: `${prefix}Country` });
  const isCanada = country === 'CA';
  const section = prefix === 'b' ? 'billing' : 'shipping';

  const name = <K extends AddressFieldKey>(key: K) => `${prefix}${key}` as const;

  return (
    <>
      <CrownTextField
        control={control}
        name={name('Address1')}
        label={b3Lang('crownRegistration.field.address1')}
        required
        fullRow
        autoComplete={`${section} address-line1`}
      />
      <CrownTextField
        control={control}
        name={name('Address2')}
        label={b3Lang('crownRegistration.field.address2')}
        fullRow
        autoComplete={`${section} address-line2`}
      />
      <CrownTextField
        control={control}
        name={name('City')}
        label={b3Lang('crownRegistration.field.city')}
        required
        autoComplete={`${section} address-level2`}
      />
      <CrownSelect
        control={control}
        name={name('Country')}
        label={b3Lang('crownRegistration.field.country')}
        required
        autoComplete={`${section} country`}
        options={COUNTRIES.map((code) => ({
          value: code,
          label: b3Lang(`crownRegistration.country.${code}`),
        }))}
        onChange={() => {
          setValue(name('State'), '', { shouldValidate: false });
          clearErrors([name('State'), name('Zip')]);
        }}
      />
      <CrownSelect
        control={control}
        name={name('State')}
        label={b3Lang(`crownRegistration.field.${isCanada ? 'province' : 'state'}`)}
        placeholder={b3Lang(
          `crownRegistration.field.${isCanada ? 'provincePrompt' : 'statePrompt'}`,
        )}
        required
        autoComplete={`${section} address-level1`}
        options={getRegions(country).map(({ stateCode, stateName }) => ({
          value: stateCode,
          label: stateName,
        }))}
      />
      <CrownTextField
        control={control}
        name={name('Zip')}
        label={b3Lang(`crownRegistration.field.${isCanada ? 'postalCode' : 'zip'}`)}
        required
        autoComplete={`${section} postal-code`}
        inputMode={isCanada ? 'text' : 'numeric'}
      />
    </>
  );
}
