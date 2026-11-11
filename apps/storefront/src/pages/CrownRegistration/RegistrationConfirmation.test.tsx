import { faker, renderWithProviders, screen, waitFor } from 'tests/test-utils';

import { RegistrationConfirmation } from './RegistrationConfirmation';
import { SubmittedSummary } from './RegistrationForm';

const buildSummary = (): SubmittedSummary => ({
  referenceId: `CC-${faker.string.alphanumeric(6).toUpperCase()}`,
  email: faker.internet.email({ provider: 'acmefoods.com' }).toLowerCase(),
  companyName: faker.company.name(),
  contactName: `${faker.person.firstName()} ${faker.person.lastName()}`,
});

describe('RegistrationConfirmation', () => {
  it('shows the application summary', () => {
    const summary = buildSummary();

    renderWithProviders(
      <RegistrationConfirmation summary={summary} onAnother={vi.fn()} setOpenPage={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { name: 'Your account is pending approval' })).toBeVisible();
    expect(screen.getByText(summary.email)).toBeVisible();
    expect(screen.getByText(summary.companyName)).toBeVisible();
    expect(screen.getByText(summary.contactName)).toBeVisible();
    expect(screen.getByText(summary.referenceId)).toBeVisible();
    expect(screen.getByText(/the password you set during registration/)).toBeVisible();
  });

  it('starts another application', async () => {
    const onAnother = vi.fn();
    const { user } = renderWithProviders(
      <RegistrationConfirmation
        summary={buildSummary()}
        onAnother={onAnother}
        setOpenPage={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Submit another account' }));

    expect(onAnother).toHaveBeenCalledTimes(1);
  });

  it('closes the portal page and goes home when browsing the catalog', async () => {
    const setOpenPage = vi.fn();
    const { user, navigation } = renderWithProviders(
      <RegistrationConfirmation
        summary={buildSummary()}
        onAnother={vi.fn()}
        setOpenPage={setOpenPage}
      />,
      { initialEntries: ['/register'] },
    );

    await user.click(screen.getByRole('button', { name: 'Browse the catalog' }));

    expect(setOpenPage).toHaveBeenCalledWith({ isOpen: false, openUrl: '' });
    await waitFor(() => expect(navigation).toHaveBeenCalledWith('/'));
  });
});
