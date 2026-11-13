import { fireEvent, renderWithProviders, waitFor, within } from 'tests/test-utils';

import { ThemeFrame } from '@/components/ThemeFrame';
import { RegistrationAddress } from '@/shared/service/vs';

import { AddressVerificationDialog } from './AddressVerificationDialog';

const entered: RegistrationAddress = {
  address1: '123 main st',
  address2: '',
  city: 'springfield',
  state: 'IL',
  postalCode: '62701',
  country: 'US',
};

const suggested: RegistrationAddress = {
  address1: '123 MAIN ST',
  address2: 'APT 4',
  city: 'SPRINGFIELD',
  state: 'IL',
  postalCode: '62701-1234',
  country: 'US',
};

const setup = async (changes: string[] = ['ZIP+4 added']) => {
  const onUse = vi.fn();
  const onEdit = vi.fn();
  const view = renderWithProviders(
    <ThemeFrame title="test-frame">
      <AddressVerificationDialog
        open
        scope="billing"
        entered={entered}
        suggested={suggested}
        changes={changes}
        onUse={onUse}
        onEdit={onEdit}
      />
    </ThemeFrame>,
  );
  await waitFor(() => expect(view.store.getState().theme.themeFrame?.body).toBeTruthy());
  const frame = within(view.store.getState().theme.themeFrame!.body);
  const dialog = await frame.findByRole('dialog');

  return { ...view, frame, dialog, onUse, onEdit };
};

describe('AddressVerificationDialog', () => {
  it('shows both addresses with the recommended one selected and a named dialog', async () => {
    const { frame, dialog } = await setup();

    expect(dialog).toHaveAccessibleName('Verify your address');
    expect(frame.getByText('Billing address')).toBeInTheDocument();
    expect(frame.getByText('123 MAIN ST, APT 4')).toBeInTheDocument();
    expect(frame.getByText('SPRINGFIELD, IL 62701-1234')).toBeInTheDocument();
    expect(frame.getByText('123 main st')).toBeInTheDocument();
    expect(frame.getByText('springfield, IL 62701')).toBeInTheDocument();
    expect(frame.getByRole('radio', { name: 'Recommended' })).toBeChecked();
    expect(frame.getByRole('radio', { name: 'What you entered' })).not.toBeChecked();
  });

  it('uses the changes as the note', async () => {
    const { frame } = await setup(['ZIP+4 added', 'Street abbreviated']);

    expect(frame.getByText('ZIP+4 added, Street abbreviated')).toBeInTheDocument();
  });

  it('falls back to the default note when USPS lists no changes', async () => {
    const { frame } = await setup([]);

    expect(frame.getByText('Standardized to USPS format.')).toBeInTheDocument();
  });

  it('applies the suggested address by default', async () => {
    const { user, frame, onUse } = await setup();

    await user.click(frame.getByRole('button', { name: 'Use this address' }));

    expect(onUse).toHaveBeenCalledWith('suggested');
  });

  it('applies what the user entered when chosen', async () => {
    const { user, frame, onUse } = await setup();

    await user.click(frame.getByRole('radio', { name: 'What you entered' }));
    await user.click(frame.getByRole('button', { name: 'Use this address' }));

    expect(onUse).toHaveBeenCalledWith('entered');
  });

  it('treats the Edit button, the close button and Escape as "edit"', async () => {
    const { user, frame, dialog, onEdit } = await setup();

    await user.click(frame.getByRole('button', { name: 'Edit address' }));
    await user.click(frame.getByRole('button', { name: 'Close' }));
    // user-event keyboard input targets the host document, not the iframe's
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(onEdit).toHaveBeenCalledTimes(3);
  });

  it('moves focus into the dialog and traps it there', async () => {
    const { dialog } = await setup();
    const doc = dialog.ownerDocument;

    // jsdom cannot cycle Tab across the iframe boundary, so assert what MUI's
    // focus trap guarantees: focus starts inside and sentinels bracket the dialog.
    const modalRoot = dialog.closest('[role="presentation"]') as HTMLElement;
    await waitFor(() => expect(modalRoot.contains(doc.activeElement)).toBe(true));
    expect(
      doc.querySelectorAll('[data-testid="sentinelStart"], [data-testid="sentinelEnd"]'),
    ).toHaveLength(2);
  });
});
