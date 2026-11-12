import { useForm } from 'react-hook-form';
import {
  act,
  delay,
  http,
  HttpResponse,
  renderHook,
  startMockServer,
  waitFor,
} from 'tests/test-utils';

import { AddressValidationResult } from '@/shared/service/vs';
import { getVSAPIBaseURL } from '@/shared/service/vs/request/base';
import b2bLogger from '@/utils/b3Logger';

import { defaultRegistrationValues, RegistrationFormValues } from './schema';
import { useAddressVerification, VerifyOutcome } from './useAddressVerification';

const { server } = startMockServer();

const validateUrl = () => `${getVSAPIBaseURL()}/storefront/registration/validate-address/`;

const corrected: AddressValidationResult = {
  status: 'corrected',
  suggested: {
    address1: '1 MAIN ST',
    address2: '',
    city: 'CHICAGO',
    state: 'IL',
    postalCode: '60601-1234',
    country: 'US',
  },
  changes: ['ZIP+4 added'],
};

const shippingCorrected: AddressValidationResult = {
  status: 'corrected',
  suggested: {
    address1: '9 DOCK RD',
    address2: '',
    city: 'DALLAS',
    state: 'TX',
    postalCode: '75001-0001',
    country: 'US',
  },
};

const baseValues: Partial<RegistrationFormValues> = {
  bAddress1: '1 Main St',
  bCity: 'Chicago',
  bState: 'IL',
  bZip: '60601',
  sAddress1: '9 Dock Rd',
  sCity: 'Dallas',
  sState: 'TX',
  sZip: '75001',
};

type SentAddress = { address1: string; country: string };

const mockValidation = (respond: (address: SentAddress) => Response | Promise<Response>) => {
  const calls: SentAddress[] = [];
  server.use(
    http.post(validateUrl(), async ({ request }) => {
      const { address } = (await request.json()) as { address: SentAddress };
      calls.push(address);

      return respond(address);
    }),
  );

  return calls;
};

const setup = (overrides: Partial<RegistrationFormValues> = {}) =>
  renderHook(() => {
    const form = useForm<RegistrationFormValues>({
      defaultValues: { ...defaultRegistrationValues, ...baseValues, ...overrides },
    });

    return { form, verification: useAddressVerification(form) };
  });

type Setup = ReturnType<typeof setup>;

const startVerify = (result: Setup['result']) => {
  let outcome: Promise<VerifyOutcome> | undefined;
  act(() => {
    outcome = result.current.verification.verifyAddresses();
  });

  return outcome as Promise<VerifyOutcome>;
};

const dialogOf = (result: Setup['result']) => result.current.verification.dialogProps;

describe('useAddressVerification', () => {
  it.each(['match', 'unverifiable'] as const)(
    'continues on %s without a dialog',
    async (status) => {
      mockValidation(() => HttpResponse.json({ status }));
      const { result } = setup();

      await expect(startVerify(result)).resolves.toEqual({ ok: true });
      expect(dialogOf(result)).toBeNull();
    },
  );

  it('treats corrected without a suggestion as unverifiable', async () => {
    mockValidation(() => HttpResponse.json({ status: 'corrected' }));
    const { result } = setup();

    await expect(startVerify(result)).resolves.toEqual({ ok: true });
    expect(dialogOf(result)).toBeNull();
  });

  it('opens the dialog for a corrected address and writes the suggestion when used', async () => {
    mockValidation(() => HttpResponse.json(corrected));
    const { result } = setup();

    const outcome = startVerify(result);
    await waitFor(() => expect(dialogOf(result)).not.toBeNull());
    expect(dialogOf(result)).toMatchObject({
      open: true,
      scope: 'billing',
      changes: ['ZIP+4 added'],
      suggested: corrected.suggested,
    });

    act(() => dialogOf(result)?.onUse('suggested'));

    await expect(outcome).resolves.toEqual({ ok: true });
    expect(result.current.form.getValues()).toMatchObject({
      bAddress1: '1 MAIN ST',
      bCity: 'CHICAGO',
      bState: 'IL',
      bZip: '60601-1234',
      bCountry: 'US',
    });
    expect(dialogOf(result)).toBeNull();
  });

  it('leaves the form unchanged when the entered address is kept', async () => {
    mockValidation(() => HttpResponse.json(corrected));
    const { result } = setup();

    const outcome = startVerify(result);
    await waitFor(() => expect(dialogOf(result)).not.toBeNull());
    act(() => dialogOf(result)?.onUse('entered'));

    await expect(outcome).resolves.toEqual({ ok: true });
    expect(result.current.form.getValues('bAddress1')).toBe('1 Main St');
    expect(result.current.form.getValues('bZip')).toBe('60601');
  });

  it('resolves not-ok with the field to focus when the user chooses to edit', async () => {
    mockValidation(() => HttpResponse.json(corrected));
    const { result } = setup();

    const outcome = startVerify(result);
    await waitFor(() => expect(dialogOf(result)).not.toBeNull());
    act(() => dialogOf(result)?.onEdit());

    await expect(outcome).resolves.toEqual({ ok: false, field: 'bAddress1' });
    expect(result.current.form.getValues('bAddress1')).toBe('1 Main St');
  });

  it.each([
    ['a 500', () => HttpResponse.json({}, { status: 500 })],
    ['a 404', () => new HttpResponse('Not found', { status: 404 })],
    ['a 200 with a non-JSON body', () => new HttpResponse('<html>oops</html>', { status: 200 })],
    ['a 200 with a null body', () => HttpResponse.json(null)],
    ['a network error', () => HttpResponse.error()],
  ])('logs and continues after %s', async (_name, respond) => {
    const logError = vi.spyOn(b2bLogger, 'error').mockImplementation(() => {});
    mockValidation(respond);
    const { result } = setup();

    await expect(startVerify(result)).resolves.toEqual({ ok: true });
    expect(logError).toHaveBeenCalledWith('Address validation failed', expect.anything());
  });

  it('validates again after an error because the failure is not remembered', async () => {
    vi.spyOn(b2bLogger, 'error').mockImplementation(() => {});
    let fail = true;
    const calls = mockValidation(() =>
      fail ? HttpResponse.json({}, { status: 500 }) : HttpResponse.json({ status: 'match' }),
    );
    const { result } = setup();

    await startVerify(result);
    fail = false;
    await startVerify(result);

    expect(calls).toHaveLength(2);
  });

  it('never validates Canadian addresses', async () => {
    const calls = mockValidation(() => HttpResponse.json({ status: 'match' }));
    const { result } = setup({ bCountry: 'CA' });

    await expect(startVerify(result)).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(0);
  });

  it('verifies shipping after billing when they differ', async () => {
    const calls = mockValidation((address) =>
      HttpResponse.json(address.address1 === '1 Main St' ? corrected : shippingCorrected),
    );
    const { result } = setup({ sameAsBilling: false });

    const outcome = startVerify(result);
    await waitFor(() => expect(dialogOf(result)?.scope).toBe('billing'));
    act(() => dialogOf(result)?.onUse('entered'));
    await waitFor(() => expect(dialogOf(result)?.scope).toBe('shipping'));
    act(() => dialogOf(result)?.onUse('suggested'));

    await expect(outcome).resolves.toEqual({ ok: true });
    expect(calls.map((call) => call.address1)).toEqual(['1 Main St', '9 Dock Rd']);
    expect(result.current.form.getValues()).toMatchObject({
      sAddress1: '9 DOCK RD',
      sZip: '75001-0001',
    });
  });

  it('skips shipping when the user edits billing', async () => {
    const calls = mockValidation(() => HttpResponse.json(corrected));
    const { result } = setup({ sameAsBilling: false });

    const outcome = startVerify(result);
    await waitFor(() => expect(dialogOf(result)).not.toBeNull());
    act(() => dialogOf(result)?.onEdit());

    await expect(outcome).resolves.toEqual({ ok: false, field: 'bAddress1' });
    expect(calls).toHaveLength(1);
  });

  it('focuses the shipping field when the user edits the shipping address', async () => {
    mockValidation((address) =>
      HttpResponse.json(address.address1 === '1 Main St' ? { status: 'match' } : shippingCorrected),
    );
    const { result } = setup({ sameAsBilling: false });

    const outcome = startVerify(result);
    await waitFor(() => expect(dialogOf(result)?.scope).toBe('shipping'));
    act(() => dialogOf(result)?.onEdit());

    await expect(outcome).resolves.toEqual({ ok: false, field: 'sAddress1' });
  });

  it('does not verify shipping when it is the same as billing', async () => {
    const calls = mockValidation(() => HttpResponse.json({ status: 'match' }));
    const { result } = setup();

    await startVerify(result);

    expect(calls.map((call) => call.address1)).toEqual(['1 Main St']);
  });

  it('remembers a decision, and asks again once the address is edited', async () => {
    const calls = mockValidation(() => HttpResponse.json(corrected));
    const { result } = setup();

    const first = startVerify(result);
    await waitFor(() => expect(dialogOf(result)).not.toBeNull());
    act(() => dialogOf(result)?.onUse('entered'));
    await first;

    await expect(startVerify(result)).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(dialogOf(result)).toBeNull();

    act(() => result.current.form.setValue('bAddress1', '2 Main St'));
    const third = startVerify(result);
    await waitFor(() => expect(dialogOf(result)).not.toBeNull());
    expect(calls).toHaveLength(2);
    act(() => dialogOf(result)?.onEdit());
    await third;
  });

  it('remembers the applied suggestion so it is not verified again', async () => {
    const calls = mockValidation(() => HttpResponse.json(corrected));
    const { result } = setup();

    const first = startVerify(result);
    await waitFor(() => expect(dialogOf(result)).not.toBeNull());
    act(() => dialogOf(result)?.onUse('suggested'));
    await first;

    await expect(startVerify(result)).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(1);
  });

  it('settles a pending prompt as not-ok when unmounted', async () => {
    mockValidation(async () => {
      await delay(0);

      return HttpResponse.json(corrected);
    });
    const { result, unmount } = setup();

    const outcome = startVerify(result);
    await waitFor(() => expect(dialogOf(result)).not.toBeNull());
    unmount();

    await expect(outcome).resolves.toEqual({ ok: false, field: 'bAddress1' });
  });
});
