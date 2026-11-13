import {
  act,
  delay,
  http,
  HttpResponse,
  renderWithProviders,
  screen,
  startMockServer,
  waitFor,
  within,
} from 'tests/test-utils';

import { CustomStyleContext } from '@/shared/customStyleButton';
import { initState } from '@/shared/customStyleButton/context/config';
import { Country } from '@/shared/global/context/config';
import * as b2bService from '@/shared/service/b2b';
import { getVSAPIBaseURL } from '@/shared/service/vs/request/base';
import b2bLogger from '@/utils/b3Logger';

import CrownRegistration from './index';

vi.setConfig({ testTimeout: 30000 });

// The real login is covered in useAutoLogin.test.tsx
const autoLoginMock = vi.hoisted(() => vi.fn());

vi.mock('./useAutoLogin', () => ({ useAutoLogin: () => autoLoginMock }));

// The real widget needs Cloudflare's script inside the iframe. This fake issues a
// token on mount and lets tests emit new ones (a reset clears the token, as in life).
const turnstileMock = vi.hoisted(() => ({
  tokenOnMount: 'test-token' as string | null,
  reset: vi.fn(),
  emit: (() => {}) as (token: string | null) => void,
}));

vi.mock('./RegistrationForm/Turnstile', async () => {
  const { forwardRef, useEffect, useImperativeHandle } = await import('react');

  return {
    TURNSTILE_HELPER_ID: 'crown-turnstile-helper',
    Turnstile: forwardRef<{ reset: () => void }, { onToken: (token: string | null) => void }>(
      function FakeTurnstile({ onToken }, ref) {
        useImperativeHandle(ref, () => ({
          reset: () => {
            turnstileMock.reset();
            onToken(null);
          },
        }));
        useEffect(() => {
          turnstileMock.emit = onToken;
          onToken(turnstileMock.tokenOnMount);
        }, [onToken]);

        return null;
      },
    ),
  };
});

const { server } = startMockServer();

const countriesList: Country[] = [
  {
    countryCode: 'US',
    countryName: 'United States',
    states: [
      { stateCode: 'IL', stateName: 'Illinois' },
      { stateCode: 'TX', stateName: 'Texas' },
      { stateCode: 'PR', stateName: 'Puerto Rico' },
    ],
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    states: [
      { stateCode: 'ON', stateName: 'Ontario' },
      { stateCode: 'QC', stateName: 'Quebec' },
    ],
  },
];

const registrationUrl = () => `${getVSAPIBaseURL()}/storefront/registration/`;
const validateUrl = () => `${getVSAPIBaseURL()}/storefront/registration/validate-address/`;

type User = ReturnType<typeof renderWithProviders>['user'];

// Accounts are pending approval unless a test turns auto approval on.
const renderPage = (
  initialGlobalContext: Record<string, unknown> = {},
  { autoApproval = false }: { autoApproval?: boolean } = {},
) =>
  renderWithProviders(
    <CustomStyleContext.Provider
      value={{
        state: { ...initState, companyAutoApproval: { enabled: autoApproval } },
        dispatch: vi.fn(),
      }}
    >
      <CrownRegistration setOpenPage={vi.fn()} />
    </CustomStyleContext.Provider>,
    {
      initialGlobalContext: { countriesList, registerEnabled: true, ...initialGlobalContext },
      initialEntries: ['/register'],
    },
  );

const section = (name: RegExp) => screen.getByRole('region', { name });

const fill = async (user: User, field: HTMLElement, text: string) => {
  await user.click(field);
  await user.paste(text);
};

const fillDetails = async (user: User) => {
  await fill(user, screen.getByLabelText(/company name/i), 'Acme Foods');
  await fill(user, screen.getByLabelText(/first name/i), 'Ada');
  await fill(user, screen.getByLabelText(/last name/i), 'Lovelace');
  await fill(user, screen.getByLabelText(/work email/i), 'ada@acmefoods.com');
  await fill(user, screen.getByLabelText(/^password/i), 'secret123');
  await fill(user, screen.getByLabelText(/confirm password/i), 'secret123');
  await fill(user, screen.getByLabelText(/direct phone/i), '(312) 555-0100');
};

const fillAddress = async (
  user: User,
  region: RegExp,
  values: { address1: string; city: string; country?: string; state: string; zip: string },
) => {
  const scope = within(section(region));

  if (values.country) {
    await user.selectOptions(scope.getByLabelText(/^country/i), values.country);
  }
  await fill(user, scope.getByLabelText(/street address/i), values.address1);
  await fill(user, scope.getByLabelText(/^city/i), values.city);
  await user.selectOptions(scope.getByLabelText(/^(state|province)/i), values.state);
  await fill(user, scope.getByLabelText(/^(zip|postal) code/i), values.zip);
};

const fillBilling = (user: User) =>
  fillAddress(user, /billing address/i, {
    address1: '1 Main St',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
  });

const acknowledgePrivacy = (user: User) =>
  user.click(screen.getByRole('checkbox', { name: /privacy policy/i }));

const submitButton = () => screen.getByRole('button', { name: /submit application|submitting/i });

const fillValidForm = async (user: User) => {
  await fillDetails(user);
  await fillBilling(user);
  await acknowledgePrivacy(user);
};

const respondWith = (response: () => Response | Promise<Response>) => {
  const requests: unknown[] = [];
  server.use(
    http.post(registrationUrl(), async ({ request }) => {
      requests.push(await request.json());
      return response();
    }),
  );

  return requests;
};

const success = () => HttpResponse.json({ referenceId: 'CC-ABC123', status: 'pending' });

type SentAddress = { address1: string; country: string };

const respondToValidation = (respond: (address: SentAddress) => Response | Promise<Response>) => {
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

const emitToken = (token: string | null) => act(() => turnstileMock.emit(token));

const dialog = () => screen.findByRole('dialog', { name: 'Verify your address' });

const correctedBilling = {
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

const correctedShipping = {
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

const failWith = (status: number, errors: { code: string; field?: string; message: string }[]) =>
  respondWith(() => HttpResponse.json({ errors }, { status }));

describe('CrownRegistration page', () => {
  beforeEach(() => {
    vi.spyOn(b2bService, 'checkUserEmail').mockResolvedValue({ isValid: true });
    turnstileMock.tokenOnMount = 'test-token';
    turnstileMock.reset.mockClear();
    // USPS has no opinion unless a test says otherwise
    respondToValidation(() => HttpResponse.json({ status: 'match' }));
  });

  it('redirects to the login page when registration is disabled', async () => {
    const { navigation } = renderPage({ registerEnabled: false });

    await waitFor(() => expect(navigation).toHaveBeenCalledWith('/login'));
  });

  it('renders four numbered sections with the default selections', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Business Account Registration' })).toBeVisible();
    expect(section(/01 — your details/i)).toBeVisible();
    expect(section(/02 — billing address/i)).toBeVisible();
    expect(section(/03 — shipping address/i)).toBeVisible();
    expect(section(/04 — submit/i)).toBeVisible();

    expect(within(section(/billing address/i)).getByLabelText(/^country/i)).toHaveValue('US');
    expect(screen.getByRole('checkbox', { name: /same as billing/i })).toBeChecked();
    expect(within(section(/shipping address/i)).queryByLabelText(/street address/i)).toBeNull();
    expect(screen.getByRole('checkbox', { name: /privacy policy/i })).not.toBeChecked();
  });

  it('validates on blur with the exact messages and clears the error on edit', async () => {
    const { user } = renderPage();
    const email = screen.getByLabelText(/work email/i);
    const phone = screen.getByLabelText(/direct phone/i);

    await user.click(email);
    await user.tab();
    expect(await screen.findByText('Work email is required')).toBeVisible();

    await user.type(email, 'x@gmail.com');
    expect(screen.queryByText('Work email is required')).toBeNull();
    await user.tab();
    expect(await screen.findByText('Use a company email address')).toBeVisible();

    await user.type(phone, '12345');
    await user.tab();
    expect(await screen.findByText('Enter a 10-digit phone number')).toBeVisible();

    await user.type(phone, '67890');
    expect(screen.queryByText('Enter a 10-digit phone number')).toBeNull();
  });

  it('summarises at most three errors on an invalid submit and focuses the first field', async () => {
    const send = respondWith(success);
    const { user } = renderPage();

    await user.click(submitButton());

    expect(
      await screen.findByText(
        'Company name is required · First name is required · Last name is required · +9 more',
      ),
    ).toBeVisible();
    expect(screen.getByLabelText(/company name/i)).toHaveFocus();
    expect(send).toHaveLength(0);
  });

  it.each([
    ['billing', /billing address/i],
    ['shipping', /shipping address/i],
  ])('swaps the %s region label, list and postal rules for Canada', async (kind, region) => {
    const { user } = renderPage();
    if (kind === 'shipping') {
      await user.click(screen.getByRole('checkbox', { name: /same as billing/i }));
    }
    const scope = within(section(region));

    await user.selectOptions(scope.getByLabelText(/^state/i), 'IL');
    await user.selectOptions(scope.getByLabelText(/^country/i), 'CA');

    const province = scope.getByLabelText(/^province/i);
    expect(province).toHaveValue('');
    expect(
      within(province)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Select province', 'Ontario', 'Quebec']);

    const postal = scope.getByLabelText(/^postal code/i);
    await user.type(postal, '12345');
    await user.tab();
    expect(await screen.findByText('Enter a postal code like K1A 0B1')).toBeVisible();

    await user.clear(postal);
    await user.type(postal, 'K1A 0B1');
    await user.tab();
    await waitFor(() =>
      expect(screen.queryByText('Enter a postal code like K1A 0B1')).not.toBeInTheDocument(),
    );
  });

  it('hides US territories from the state list', () => {
    renderPage();

    const options = within(within(section(/billing address/i)).getByLabelText(/^state/i))
      .getAllByRole('option')
      .map((option) => option.textContent);

    expect(options).toEqual(['Select state', 'Illinois', 'Texas']);
  });

  it('clears a postal error when the country changes', async () => {
    const { user } = renderPage();
    const scope = within(section(/billing address/i));

    await user.type(scope.getByLabelText(/^zip code/i), 'abc');
    await user.tab();
    expect(await screen.findByText('Enter a 5-digit ZIP code')).toBeVisible();

    await user.selectOptions(scope.getByLabelText(/^country/i), 'CA');

    expect(screen.queryByText('Enter a 5-digit ZIP code')).toBeNull();
  });

  it('requires the shipping address only when it differs from billing', async () => {
    const { user } = renderPage();
    const toggle = screen.getByRole('checkbox', { name: /same as billing/i });

    await user.click(toggle);
    const shipping = within(section(/shipping address/i));
    expect(shipping.getByLabelText(/street address/i)).toBeVisible();
    expect(shipping.getByLabelText(/^city/i)).toBeVisible();
    expect(shipping.getByLabelText(/^country/i)).toBeVisible();
    expect(shipping.getByLabelText(/^state/i)).toBeVisible();
    expect(shipping.getByLabelText(/^zip code/i)).toBeVisible();

    await user.click(submitButton());
    expect(await screen.findByText('Shipping street address is required')).toBeVisible();

    await user.click(toggle);
    expect(shipping.queryByLabelText(/street address/i)).toBeNull();
  });

  it('shows an inline error when the email already has an account', async () => {
    vi.spyOn(b2bService, 'checkUserEmail').mockResolvedValue({ isValid: false });
    const { user } = renderPage();

    await user.type(screen.getByLabelText(/work email/i), 'ada@acmefoods.com');
    await user.tab();

    expect(await screen.findByText('An account with this email already exists')).toBeVisible();
  });

  it('submits the exact payload for a same-as-billing registration and shows the confirmation', async () => {
    const requests = respondWith(success);
    const { user } = renderPage();

    await fillValidForm(user);
    await user.click(submitButton());

    expect(
      await screen.findByRole('heading', { name: 'Your account is pending approval' }),
    ).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      turnstileToken: 'test-token',
      contact: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@acmefoods.com',
        phone: '(312) 555-0100',
        password: 'secret123',
        existingCustomer: false,
      },
      company: { name: 'Acme Foods' },
      privacyAcknowledged: true,
      billingAddress: {
        address1: '1 Main St',
        address2: '',
        city: 'Chicago',
        state: 'IL',
        stateName: 'Illinois',
        postalCode: '60601',
        country: 'US',
      },
      shippingAddress: { sameAsBilling: true },
    });
    expect(autoLoginMock).not.toHaveBeenCalled();
  });

  it('submits a separate Canadian shipping address with its region name', async () => {
    const requests = respondWith(success);
    const { user } = renderPage();

    await fillDetails(user);
    await fillBilling(user);
    await user.click(screen.getByRole('checkbox', { name: /same as billing/i }));
    await fillAddress(user, /shipping address/i, {
      address1: '100 Queen St',
      city: 'Ottawa',
      country: 'CA',
      state: 'ON',
      zip: 'K1A 0B1',
    });
    await acknowledgePrivacy(user);
    await user.click(submitButton());

    await screen.findByRole('heading', { name: 'Your account is pending approval' });
    expect(requests[0]).toMatchObject({
      shippingAddress: {
        sameAsBilling: false,
        address1: '100 Queen St',
        address2: '',
        city: 'Ottawa',
        state: 'ON',
        stateName: 'Ontario',
        postalCode: 'K1A 0B1',
        country: 'CA',
      },
    });
  });

  it('blocks the submit when the region list has no state to choose', async () => {
    const requests = respondWith(success);
    const { user } = renderPage({
      countriesList: [{ ...countriesList[0], states: [] }, countriesList[1]],
    });

    await fillDetails(user);
    await fill(
      user,
      within(section(/billing address/i)).getByLabelText(/street address/i),
      '1 Main',
    );
    await fill(user, within(section(/billing address/i)).getByLabelText(/^city/i), 'Chicago');
    await fill(user, within(section(/billing address/i)).getByLabelText(/^zip code/i), '60601');
    await acknowledgePrivacy(user);
    await user.click(submitButton());

    expect(await screen.findAllByText('Billing state/province is required')).not.toHaveLength(0);
    expect(requests).toHaveLength(0);
  });

  describe('server errors', () => {
    it('shows EMAIL_EXISTS inline on the email field', async () => {
      failWith(409, [{ code: 'EMAIL_EXISTS', field: 'email', message: 'exists' }]);
      const { user } = renderPage();

      await fillValidForm(user);
      await user.click(submitButton());

      expect(await screen.findByText('An account with this email already exists')).toBeVisible();
      expect(screen.getByLabelText(/work email/i)).toHaveFocus();
    });

    it('shows VALIDATION messages inline, rendering special characters literally', async () => {
      failWith(422, [{ code: 'VALIDATION', field: 'bZip', message: "ZIP isn't {valid}" }]);
      const { user } = renderPage();

      await fillValidForm(user);
      await user.click(submitButton());

      expect(await screen.findByText("ZIP isn't {valid}")).toBeVisible();
      expect(within(section(/billing address/i)).getByLabelText(/^zip code/i)).toHaveFocus();
    });

    it('shows ADDRESS_EXISTS on the billing street field', async () => {
      failWith(409, [
        { code: 'ADDRESS_EXISTS', field: 'billingAddress', message: 'Billing taken' },
      ]);
      const { user } = renderPage();

      await fillValidForm(user);
      await user.click(submitButton());

      expect(await screen.findByText('Billing taken')).toBeVisible();
      expect(within(section(/billing address/i)).getByLabelText(/street address/i)).toHaveFocus();
    });

    it('shows ADDRESS_EXISTS for a separate shipping address on the shipping street field', async () => {
      failWith(409, [
        { code: 'ADDRESS_EXISTS', field: 'shippingAddress', message: 'Shipping taken' },
      ]);
      const { user } = renderPage();

      await fillDetails(user);
      await fillBilling(user);
      await user.click(screen.getByRole('checkbox', { name: /same as billing/i }));
      await fillAddress(user, /shipping address/i, {
        address1: '9 Dock Rd',
        city: 'Dallas',
        state: 'TX',
        zip: '75001',
      });
      await acknowledgePrivacy(user);
      await user.click(submitButton());

      expect(await screen.findByText('Shipping taken')).toBeVisible();
      expect(within(section(/shipping address/i)).getByLabelText(/street address/i)).toHaveFocus();
    });

    it('shows ADDRESS_EXISTS for shipping on the billing field when shipping is the same', async () => {
      failWith(409, [
        { code: 'ADDRESS_EXISTS', field: 'shippingAddress', message: 'Shipping taken' },
      ]);
      const { user } = renderPage();

      await fillValidForm(user);
      await user.click(submitButton());

      expect(await screen.findByText('Shipping taken')).toBeVisible();
      expect(within(section(/billing address/i)).getByLabelText(/street address/i)).toHaveFocus();
    });

    it.each([
      [
        'TURNSTILE_FAILED',
        () => failWith(400, [{ code: 'TURNSTILE_FAILED', message: 'bad token' }]),
        'Verification failed, please try again',
      ],
      [
        'RATE_LIMITED',
        () => failWith(429, [{ code: 'RATE_LIMITED', message: 'slow down' }]),
        'Too many attempts, please try again later',
      ],
      [
        'REGISTRATION_FAILED',
        () => failWith(500, [{ code: 'REGISTRATION_FAILED', message: 'oops' }]),
        "We couldn't submit your application. Please try again.",
      ],
      [
        'a non-JSON 500',
        () => respondWith(() => new HttpResponse('<html>boom</html>', { status: 500 })),
        "We couldn't submit your application. Please try again.",
      ],
      [
        'a network error',
        () => respondWith(() => HttpResponse.error()),
        "We couldn't submit your application. Please try again.",
      ],
    ])('shows a banner for %s and keeps the form editable', async (_name, setup, banner) => {
      setup();
      const { user } = renderPage();

      await fillValidForm(user);
      await user.click(submitButton());

      expect(await screen.findByText(banner)).toBeVisible();
      expect(screen.getByLabelText(/company name/i)).toHaveValue('Acme Foods');
      // the token is single-use: the widget resets and Submit waits for a new one
      expect(turnstileMock.reset).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Submit application' })).toBeDisabled();

      emitToken('token-2');
      expect(screen.getByRole('button', { name: 'Submit application' })).toBeEnabled();
    });
  });

  describe('Turnstile', () => {
    it('keeps Submit disabled until a token exists and does not reset after a success', async () => {
      turnstileMock.tokenOnMount = null;
      const requests = respondWith(success);
      const { user } = renderPage();

      expect(submitButton()).toBeDisabled();
      await fillValidForm(user);
      expect(submitButton()).toBeDisabled();

      emitToken('live-token');
      expect(submitButton()).toBeEnabled();
      await user.click(submitButton());

      await screen.findByRole('heading', { name: 'Your account is pending approval' });
      expect(requests[0]).toMatchObject({ turnstileToken: 'live-token' });
      expect(turnstileMock.reset).not.toHaveBeenCalled();
    });
  });

  describe('USPS address verification', () => {
    const billingStreet = () =>
      within(section(/billing address/i)).getByLabelText(/street address/i);

    it('writes the recommended address into the form and the payload', async () => {
      respondToValidation(() => HttpResponse.json(correctedBilling));
      const requests = respondWith(success);
      const { user } = renderPage();

      await fillValidForm(user);
      await user.click(submitButton());

      const verifyDialog = await dialog();
      expect(within(verifyDialog).getByText('1 MAIN ST')).toBeVisible();
      await user.click(within(verifyDialog).getByRole('button', { name: 'Use this address' }));

      await screen.findByRole('heading', { name: 'Your account is pending approval' });
      expect(requests).toHaveLength(1);
      expect(requests[0]).toMatchObject({
        turnstileToken: 'test-token',
        billingAddress: {
          address1: '1 MAIN ST',
          city: 'CHICAGO',
          state: 'IL',
          stateName: 'Illinois',
          postalCode: '60601-1234',
          country: 'US',
        },
      });
    });

    it('shows the applied address in the form when the server then rejects the submit', async () => {
      respondToValidation(() => HttpResponse.json(correctedBilling));
      failWith(500, [{ code: 'REGISTRATION_FAILED', message: 'oops' }]);
      const { user } = renderPage();

      await fillValidForm(user);
      await user.click(submitButton());
      await user.click(within(await dialog()).getByRole('button', { name: 'Use this address' }));

      await screen.findByText("We couldn't submit your application. Please try again.");
      expect(billingStreet()).toHaveValue('1 MAIN ST');
      expect(within(section(/billing address/i)).getByLabelText(/^zip code/i)).toHaveValue(
        '60601-1234',
      );
    });

    it('sends what the user entered when they choose it', async () => {
      respondToValidation(() => HttpResponse.json(correctedBilling));
      const requests = respondWith(success);
      const { user } = renderPage();

      await fillValidForm(user);
      await user.click(submitButton());
      const verifyDialog = await dialog();
      await user.click(within(verifyDialog).getByRole('radio', { name: 'What you entered' }));
      await user.click(within(verifyDialog).getByRole('button', { name: 'Use this address' }));

      await screen.findByRole('heading', { name: 'Your account is pending approval' });
      expect(requests[0]).toMatchObject({
        billingAddress: { address1: '1 Main St', city: 'Chicago', postalCode: '60601' },
      });
    });

    it('sends nothing and focuses the street address on "Edit address"', async () => {
      respondToValidation(() => HttpResponse.json(correctedBilling));
      const requests = respondWith(success);
      const { user } = renderPage();

      await fillValidForm(user);
      await user.click(submitButton());
      await user.click(within(await dialog()).getByRole('button', { name: 'Edit address' }));

      await waitFor(() => expect(billingStreet()).toHaveFocus());
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(requests).toHaveLength(0);
      expect(turnstileMock.reset).not.toHaveBeenCalled();
      expect(submitButton()).toBeEnabled();
    });

    it.each([
      ['a server error', () => HttpResponse.json({}, { status: 500 })],
      ['a network error', () => HttpResponse.error()],
    ])('logs %s from USPS and still submits', async (_name, respond) => {
      const logError = vi.spyOn(b2bLogger, 'error').mockImplementation(() => {});
      respondToValidation(respond);
      const requests = respondWith(success);
      const { user } = renderPage();

      await fillValidForm(user);
      await user.click(submitButton());

      await screen.findByRole('heading', { name: 'Your account is pending approval' });
      expect(requests).toHaveLength(1);
      expect(logError).toHaveBeenCalledWith('Address validation failed', expect.anything());
    });

    it('never sends a Canadian address for validation', async () => {
      const calls = respondToValidation(() => HttpResponse.json({ status: 'match' }));
      const requests = respondWith(success);
      const { user } = renderPage();

      await fillDetails(user);
      await fillAddress(user, /billing address/i, {
        address1: '100 Queen St',
        city: 'Ottawa',
        country: 'CA',
        state: 'ON',
        zip: 'K1A 0B1',
      });
      await acknowledgePrivacy(user);
      await user.click(submitButton());

      await screen.findByRole('heading', { name: 'Your account is pending approval' });
      expect(requests).toHaveLength(1);
      expect(calls).toHaveLength(0);
    });

    const fillSeparateShipping = async (user: User) => {
      await fillDetails(user);
      await fillBilling(user);
      await user.click(screen.getByRole('checkbox', { name: /same as billing/i }));
      await fillAddress(user, /shipping address/i, {
        address1: '9 Dock Rd',
        city: 'Dallas',
        state: 'TX',
        zip: '75001',
      });
      await acknowledgePrivacy(user);
    };

    it('prompts for billing then shipping, one at a time', async () => {
      const calls = respondToValidation((address) =>
        HttpResponse.json(address.address1 === '1 Main St' ? correctedBilling : correctedShipping),
      );
      const requests = respondWith(success);
      const { user } = renderPage();

      await fillSeparateShipping(user);
      await user.click(submitButton());

      const first = await dialog();
      expect(within(first).getByText('Billing address')).toBeVisible();
      await user.click(within(first).getByRole('button', { name: 'Use this address' }));

      await waitFor(() =>
        expect(within(screen.getByRole('dialog')).getByText('Shipping address')).toBeVisible(),
      );
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Use this address' }),
      );

      await screen.findByRole('heading', { name: 'Your account is pending approval' });
      expect(calls.map((call) => call.address1)).toEqual(['1 Main St', '9 Dock Rd']);
      expect(requests[0]).toMatchObject({
        billingAddress: { address1: '1 MAIN ST' },
        shippingAddress: { sameAsBilling: false, address1: '9 DOCK RD', postalCode: '75001-0001' },
      });
    });

    it('does not prompt for shipping when the user edits billing', async () => {
      const calls = respondToValidation(() => HttpResponse.json(correctedBilling));
      const requests = respondWith(success);
      const { user } = renderPage();

      await fillSeparateShipping(user);
      await user.click(submitButton());
      await user.click(within(await dialog()).getByRole('button', { name: 'Edit address' }));

      await waitFor(() => expect(billingStreet()).toHaveFocus());
      expect(calls).toHaveLength(1);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(requests).toHaveLength(0);
    });

    it('does not ask again, or call USPS again, when retrying after a server error', async () => {
      const calls = respondToValidation(() => HttpResponse.json(correctedBilling));
      failWith(409, [{ code: 'EMAIL_EXISTS', field: 'email', message: 'exists' }]);
      const { user } = renderPage();

      await fillValidForm(user);
      await user.click(submitButton());
      await user.click(within(await dialog()).getByRole('radio', { name: 'What you entered' }));
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Use this address' }),
      );
      await screen.findByText('An account with this email already exists');

      respondWith(success);
      emitToken('token-2');
      await user.click(submitButton());

      await screen.findByRole('heading', { name: 'Your account is pending approval' });
      expect(calls).toHaveLength(1);
    });

    it('shows "Verifying address…" while USPS is being asked', async () => {
      respondToValidation(async () => {
        await delay(300);

        return HttpResponse.json({ status: 'match' });
      });
      respondWith(success);
      const { user } = renderPage();

      await fillValidForm(user);
      await user.click(submitButton());

      const verifying = await screen.findByRole('button', { name: 'Verifying address…' });
      expect(verifying).toBeDisabled();
      await screen.findByRole('heading', { name: 'Your account is pending approval' });
    });
  });

  it('sends a single request when Submit is clicked twice', async () => {
    const requests = respondWith(async () => {
      await delay(100);
      return success();
    });
    const { user } = renderPage();

    await fillValidForm(user);
    await user.dblClick(submitButton());

    await screen.findByRole('heading', { name: 'Your account is pending approval' });
    expect(requests).toHaveLength(1);
  });

  describe('after a successful registration', () => {
    it('logs in with the submitted credentials when the account is auto-approved', async () => {
      autoLoginMock.mockResolvedValue(true);
      respondWith(success);
      const { user } = renderPage({}, { autoApproval: true });

      await fillValidForm(user);
      await user.click(submitButton());

      expect(await screen.findByText('Signing you in…')).toBeVisible();
      expect(autoLoginMock).toHaveBeenCalledTimes(1);
      expect(autoLoginMock).toHaveBeenCalledWith({
        email: 'ada@acmefoods.com',
        password: 'secret123',
      });
      expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
    });

    it('offers a sign-in button when the automatic login fails', async () => {
      autoLoginMock.mockResolvedValue(false);
      respondWith(success);
      const { user, navigation } = renderPage({}, { autoApproval: true });

      await fillValidForm(user);
      await user.click(submitButton());

      expect(await screen.findByText(/We couldn't sign you in automatically/)).toBeVisible();
      await user.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => expect(navigation).toHaveBeenCalledWith('/login'));
    });

    it('does not log in, and links to sign in, when the account is pending approval', async () => {
      respondWith(success);
      const { user, navigation } = renderPage();

      await fillValidForm(user);
      await user.click(submitButton());

      expect(
        await screen.findByRole('heading', { name: 'Your account is pending approval' }),
      ).toBeVisible();
      expect(autoLoginMock).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Submit another account' })).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => expect(navigation).toHaveBeenCalledWith('/login'));
    });
  });

  it('does not log anything when the email lookup fails', async () => {
    vi.spyOn(b2bService, 'checkUserEmail').mockRejectedValue(new Error('down'));
    const logError = vi.spyOn(b2bLogger, 'error').mockImplementation(() => {});
    const { user } = renderPage();

    await user.type(screen.getByLabelText(/work email/i), 'ada@acmefoods.com');
    await user.tab();

    await waitFor(() => expect(logError).toHaveBeenCalled());
    expect(screen.queryByText('An account with this email already exists')).toBeNull();
  });
});
