import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { renderWithProviders, screen } from 'tests/test-utils';

import { CrownSelect } from './CrownSelect';

const options = [
  { value: 'IL', label: 'Illinois' },
  { value: 'WI', label: 'Wisconsin' },
] as const;

interface HarnessProps {
  errorKey?: string;
  onChange?: (value: string) => void;
  onValue?: (value: string) => void;
}

function Harness({ errorKey, onChange, onValue }: HarnessProps) {
  const { control, setError, watch } = useForm<{ bState: string }>({
    defaultValues: { bState: '' },
  });
  const value = watch('bState');

  useEffect(() => {
    onValue?.(value);
  }, [value, onValue]);

  useEffect(() => {
    if (errorKey) setError('bState', { message: errorKey });
  }, [errorKey, setError]);

  return (
    <CrownSelect
      control={control}
      name="bState"
      label="State"
      required
      placeholder="Select a state"
      options={options}
      onChange={onChange}
    />
  );
}

describe('CrownSelect', () => {
  it('renders the placeholder and options', () => {
    renderWithProviders(<Harness />);

    const select = screen.getByRole('combobox', { name: /state/i });

    expect(select).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Select a state' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Illinois' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Wisconsin' })).toBeInTheDocument();
  });

  it('updates the value and calls onChange', async () => {
    const onChange = vi.fn();
    const onValue = vi.fn();
    const { user } = renderWithProviders(<Harness onChange={onChange} onValue={onValue} />);

    await user.selectOptions(screen.getByRole('combobox', { name: /state/i }), 'Wisconsin');

    expect(screen.getByRole('combobox', { name: /state/i })).toHaveValue('WI');
    expect(onChange).toHaveBeenCalledWith('WI');
    expect(onValue).toHaveBeenLastCalledWith('WI');
  });

  it('shows the translated error', async () => {
    renderWithProviders(<Harness errorKey="crownRegistration.error.required.bState" />);

    await screen.findByText('Billing state/province is required');

    const select = screen.getByRole('combobox', { name: /state/i });
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAccessibleDescription('Billing state/province is required');
  });
});
