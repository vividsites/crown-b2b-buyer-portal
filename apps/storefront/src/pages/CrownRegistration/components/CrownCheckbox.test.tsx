import { ReactNode, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { faker, renderWithProviders, screen } from 'tests/test-utils';

import { CrownCheckbox } from './CrownCheckbox';

interface HarnessProps {
  label: ReactNode;
  variant?: 'boxed' | 'plain';
  errorKey?: string;
  onChange?: (checked: boolean) => void;
}

function Harness({ label, variant, errorKey, onChange }: HarnessProps) {
  const { control, setError } = useForm<{ privacyAcknowledged: boolean }>({
    defaultValues: { privacyAcknowledged: false },
  });

  useEffect(() => {
    if (errorKey) setError('privacyAcknowledged', { message: errorKey });
  }, [errorKey, setError]);

  return (
    <CrownCheckbox
      control={control}
      name="privacyAcknowledged"
      label={label}
      variant={variant}
      required
      onChange={onChange}
    />
  );
}

describe('CrownCheckbox', () => {
  it.each(['plain', 'boxed'] as const)('toggles a boolean value (%s)', async (variant) => {
    const label = faker.lorem.words(3);
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <Harness label={label} variant={variant} onChange={onChange} />,
    );

    const checkbox = screen.getByRole('checkbox', { name: label });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders a link inside the label', () => {
    renderWithProviders(
      <Harness
        label={
          <>
            I acknowledge the <a href="/privacy-policy">Privacy Policy</a>
          </>
        }
      />,
    );

    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute(
      'href',
      '/privacy-policy',
    );
    expect(screen.getByRole('checkbox', { name: /privacy policy/i })).toBeInTheDocument();
  });

  it('shows the privacy error', async () => {
    renderWithProviders(
      <Harness
        label="I acknowledge the Privacy Policy"
        errorKey="crownRegistration.error.privacyRequired"
      />,
    );

    await screen.findByText('You must acknowledge the Privacy Policy');

    const checkbox = screen.getByRole('checkbox', { name: /privacy policy/i });
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    expect(checkbox).toHaveAccessibleDescription('You must acknowledge the Privacy Policy');
  });
});
