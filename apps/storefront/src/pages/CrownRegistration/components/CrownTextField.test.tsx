import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { faker, renderWithProviders, screen } from 'tests/test-utils';

import { CrownTextField } from './CrownTextField';

interface HarnessProps {
  errorKey?: string;
  hint?: string;
  onBlur?: (value: string) => void;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
}

function Harness({ errorKey, hint, onBlur, autoComplete, inputMode }: HarnessProps) {
  const { control, setError } = useForm<{ companyName: string }>({
    defaultValues: { companyName: '' },
  });

  useEffect(() => {
    if (errorKey) setError('companyName', { message: errorKey });
  }, [errorKey, setError]);

  return (
    <CrownTextField
      control={control}
      name="companyName"
      label="Company name"
      required
      hint={hint}
      onBlur={onBlur}
      autoComplete={autoComplete}
      inputMode={inputMode}
    />
  );
}

describe('CrownTextField', () => {
  it('associates the label with the input and marks required fields', () => {
    renderWithProviders(<Harness />);

    const input = screen.getByLabelText(/company name/i);

    expect(input).toHaveAccessibleName('Company name *');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('shows the hint when there is no error', () => {
    const hint = faker.lorem.words();
    renderWithProviders(<Harness hint={hint} />);

    expect(screen.getByLabelText(/company name/i)).toHaveAccessibleDescription(hint);
  });

  it('shows the translated error, hides the hint and marks the input invalid', async () => {
    const hint = faker.lorem.words();
    renderWithProviders(
      <Harness hint={hint} errorKey="crownRegistration.error.required.companyName" />,
    );

    await screen.findByText('Company name is required');

    const input = screen.getByLabelText(/company name/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Company name is required');
    expect(screen.queryByText(hint)).not.toBeInTheDocument();
  });

  it('calls onBlur with the current value', async () => {
    const onBlur = vi.fn();
    const value = faker.company.name();
    const { user } = renderWithProviders(<Harness onBlur={onBlur} />);

    await user.type(screen.getByLabelText(/company name/i), value);
    await user.tab();

    expect(onBlur).toHaveBeenCalledWith(value);
  });

  it('passes autocomplete and inputmode through', () => {
    renderWithProviders(<Harness autoComplete="organization" inputMode="text" />);

    const input = screen.getByLabelText(/company name/i);
    expect(input).toHaveAttribute('autocomplete', 'organization');
    expect(input).toHaveAttribute('inputmode', 'text');
  });
});
