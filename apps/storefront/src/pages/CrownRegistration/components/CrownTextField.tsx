import { HTMLAttributes } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import { useB3Lang } from '@/lib/lang';

import { ControlInput, FieldError, FieldHint, FieldLabel, FieldLabelText } from './fieldStyles';

interface CrownTextFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  // already translated
  label: string;
  required?: boolean;
  // already translated
  hint?: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  placeholder?: string;
  fullRow?: boolean;
  // extra hook (Phase 2 email precheck)
  onBlur?: (value: string) => void;
}

export function CrownTextField<T extends FieldValues>({
  control,
  name,
  label,
  required = false,
  hint,
  type = 'text',
  autoComplete,
  inputMode,
  placeholder,
  fullRow = false,
  onBlur,
}: CrownTextFieldProps<T>) {
  const b3Lang = useB3Lang();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => {
        const errorId = `${name}-error`;
        const hintId = `${name}-hint`;
        const errorText = error?.message ? b3Lang(error.message) : undefined;
        let describedBy: string | undefined;
        if (errorText) {
          describedBy = errorId;
        } else if (hint) {
          describedBy = hintId;
        }

        return (
          <FieldLabel fullRow={fullRow}>
            <FieldLabelText>{required ? `${label} *` : label}</FieldLabelText>
            <ControlInput
              id={name}
              name={field.name}
              ref={field.ref}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={() => {
                field.onBlur();
                onBlur?.(field.value);
              }}
              type={type}
              autoComplete={autoComplete}
              inputMode={inputMode}
              placeholder={placeholder}
              aria-invalid={Boolean(errorText)}
              aria-required={required}
              aria-describedby={describedBy}
            />
            {errorText ? (
              <FieldError id={errorId}>{errorText}</FieldError>
            ) : (
              hint && <FieldHint id={hintId}>{hint}</FieldHint>
            )}
          </FieldLabel>
        );
      }}
    />
  );
}
