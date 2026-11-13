import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { renderWithProviders, screen, waitFor } from 'tests/test-utils';

import * as b2bService from '@/shared/service/b2b';
import b2bLogger from '@/utils/b3Logger';

import { CrownTextField } from '../components/CrownTextField';

import { defaultRegistrationValues, RegistrationFormValues, registrationSchema } from './schema';
import { useEmailPrecheck } from './useEmailPrecheck';

function Harness() {
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: defaultRegistrationValues,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });
  const { onEmailBlur } = useEmailPrecheck(form);

  return (
    <>
      <CrownTextField control={form.control} name="email" label="Work email" onBlur={onEmailBlur} />
      <CrownTextField control={form.control} name="firstName" label="First name" />
    </>
  );
}

const emailExists = 'An account with this email already exists';

const mockCheck = (isValid: boolean) =>
  vi.spyOn(b2bService, 'checkUserEmail').mockResolvedValue({ isValid });

describe('useEmailPrecheck', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not call the service for an invalid email format', async () => {
    const check = mockCheck(true);
    const { user } = renderWithProviders(<Harness />);

    await user.type(screen.getByLabelText(/work email/i), 'not-an-email');
    await user.tab();

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(check).not.toHaveBeenCalled();
  });

  it('does not call the service for a free email domain', async () => {
    const check = mockCheck(true);
    const { user } = renderWithProviders(<Harness />);

    await user.type(screen.getByLabelText(/work email/i), 'someone@gmail.com');
    await user.tab();

    expect(await screen.findByText('Use a company email address')).toBeInTheDocument();
    expect(check).not.toHaveBeenCalled();
  });

  it('shows the duplicate error when the account already exists', async () => {
    const check = mockCheck(false);
    const { user } = renderWithProviders(<Harness />);

    await user.type(screen.getByLabelText(/work email/i), ' buyer@acmefoods.com ');
    await user.tab();

    expect(await screen.findByText(emailExists)).toBeInTheDocument();
    expect(check).toHaveBeenCalledWith(expect.objectContaining({ email: 'buyer@acmefoods.com' }));
  });

  it('shows no error when the email is available', async () => {
    const check = mockCheck(true);
    const { user } = renderWithProviders(<Harness />);

    await user.type(screen.getByLabelText(/work email/i), 'buyer@acmefoods.com');
    await user.tab();

    await waitFor(() => expect(check).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(emailExists)).not.toBeInTheDocument();
  });

  it('logs and ignores a failed lookup', async () => {
    const failure = new Error('lookup failed');
    vi.spyOn(b2bService, 'checkUserEmail').mockRejectedValue(failure);
    const logError = vi.spyOn(b2bLogger, 'error').mockImplementation(() => {});
    const { user } = renderWithProviders(<Harness />);

    await user.type(screen.getByLabelText(/work email/i), 'buyer@acmefoods.com');
    await user.tab();

    await waitFor(() => expect(logError).toHaveBeenCalledWith(failure));
    expect(screen.queryByText(emailExists)).not.toBeInTheDocument();
  });

  it('ignores a stale slow response that finishes after a newer one', async () => {
    let resolveFirst: (value: { isValid: boolean }) => void = () => {};
    const check = vi
      .spyOn(b2bService, 'checkUserEmail')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({ isValid: true });
    const { user } = renderWithProviders(<Harness />);
    const email = screen.getByLabelText(/work email/i);

    await user.type(email, 'first@acmefoods.com');
    await user.tab();
    await waitFor(() => expect(check).toHaveBeenCalledTimes(1));

    await user.clear(email);
    await user.type(email, 'second@acmefoods.com');
    await user.tab();
    await waitFor(() => expect(check).toHaveBeenCalledTimes(2));

    resolveFirst({ isValid: false });

    await waitFor(() => expect(screen.queryByText(emailExists)).not.toBeInTheDocument());
  });
});
