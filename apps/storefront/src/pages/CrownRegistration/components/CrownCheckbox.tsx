import { ReactNode } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import styled from '@emotion/styled';

import { useB3Lang } from '@/lib/lang';

import { crownColors } from '../tokens';

import { FieldError, fullRowOptions, FullRowProps } from './fieldStyles';

type CheckboxVariant = 'boxed' | 'plain';

const CheckboxWrapper = styled('div', fullRowOptions)<FullRowProps>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${({ fullRow }) => (fullRow ? 'grid-column: 1 / -1;' : '')}
`;

const CheckboxRow = styled('label', {
  shouldForwardProp: (prop: string) => prop !== 'variant',
})<{ variant: CheckboxVariant }>`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  font-size: 16px;
  color: ${crownColors.navy};
  cursor: pointer;
  ${({ variant }) =>
    variant === 'boxed'
      ? `background: ${crownColors.fieldFill}; border: 1px solid ${crownColors.divider}; padding: 14px 16px;`
      : ''}
`;

const CheckboxInput = styled.input`
  width: 20px;
  height: 20px;
  accent-color: ${crownColors.red};
  flex-shrink: 0;
  margin: 2px 0 0;
`;

interface CrownCheckboxProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  // may contain a link
  label: ReactNode;
  variant?: CheckboxVariant;
  fullRow?: boolean;
  required?: boolean;
  onChange?: (checked: boolean) => void;
}

export function CrownCheckbox<T extends FieldValues>({
  control,
  name,
  label,
  variant = 'plain',
  fullRow = false,
  required = false,
  onChange,
}: CrownCheckboxProps<T>) {
  const b3Lang = useB3Lang();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => {
        const errorId = `${name}-error`;
        const errorText = error?.message ? b3Lang(error.message) : undefined;

        return (
          <CheckboxWrapper fullRow={fullRow}>
            <CheckboxRow variant={variant}>
              <CheckboxInput
                type="checkbox"
                id={name}
                name={field.name}
                ref={field.ref}
                checked={Boolean(field.value)}
                onChange={(event) => {
                  field.onChange(event.target.checked);
                  onChange?.(event.target.checked);
                }}
                onBlur={field.onBlur}
                aria-invalid={Boolean(errorText)}
                aria-required={required}
                aria-describedby={errorText ? errorId : undefined}
              />
              <span>{label}</span>
            </CheckboxRow>
            {errorText && <FieldError id={errorId}>{errorText}</FieldError>}
          </CheckboxWrapper>
        );
      }}
    />
  );
}
