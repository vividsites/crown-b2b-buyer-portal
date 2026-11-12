import { renderWithProviders, screen, waitFor } from 'tests/test-utils';

import { RegistrationConfirmation } from './RegistrationConfirmation';

describe('RegistrationConfirmation', () => {
  it('shows the signing-in state without any buttons', () => {
    renderWithProviders(<RegistrationConfirmation state="signingIn" />);

    expect(screen.getByRole('heading', { name: 'Your account has been created' })).toBeVisible();
    expect(screen.getByText('Signing you in…')).toBeVisible();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the pending-approval state with a sign-in button', async () => {
    const { user, navigation } = renderWithProviders(<RegistrationConfirmation state="pending" />, {
      initialEntries: ['/register'],
    });

    expect(screen.getByRole('heading', { name: 'Your account is pending approval' })).toBeVisible();
    expect(screen.getByText(/the password you set during registration/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Submit another account' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(navigation).toHaveBeenCalledWith('/login'));
  });

  it('shows the sign-in-failed state with a sign-in button', async () => {
    const { user, navigation } = renderWithProviders(
      <RegistrationConfirmation state="signInFailed" />,
      { initialEntries: ['/register'] },
    );

    expect(screen.getByRole('heading', { name: 'Your account has been created' })).toBeVisible();
    expect(screen.getByText(/We couldn't sign you in automatically/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(navigation).toHaveBeenCalledWith('/login'));
  });
});
