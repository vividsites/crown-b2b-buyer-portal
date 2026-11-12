import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import { useB3Lang } from '@/lib/lang';

import { ControlSelect, FieldError, FieldLabel, FieldLabelText } from './fieldStyles';

interface CrownSelectOption {
  value: string;
  label: string;
}

interface CrownSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  // already translated
  label: string;
  options: ReadonlyArray<CrownSelectOption>;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  fullRow?: boolean;
  onChange?: (value: string) => void;
}

export function CrownSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  required = false,
  autoComplete,
  fullRow = false,
  onChange,
}: CrownSelectProps<T>) {
  const b3Lang = useB3Lang();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => {
        const errorId = `${name}-error`;
        const errorText = error?.message ? b3Lang(error.message) : undefined;

        return (
          <FieldLabel fullRow={fullRow}>
            <FieldLabelText>{required ? `${label} *` : label}</FieldLabelText>
            <ControlSelect
              id={name}
              name={field.name}
              ref={field.ref}
              value={field.value ?? ''}
              onChange={(event) => {
                field.onChange(event.target.value);
                onChange?.(event.target.value);
              }}
              onBlur={field.onBlur}
              autoComplete={autoComplete}
              aria-invalid={Boolean(errorText)}
              aria-required={required}
              aria-describedby={errorText ? errorId : undefined}
            >
              {placeholder !== undefined && <option value="">{placeholder}</option>}
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </ControlSelect>
            {errorText && <FieldError id={errorId}>{errorText}</FieldError>}
          </FieldLabel>
        );
      }}
    />
  );
}
