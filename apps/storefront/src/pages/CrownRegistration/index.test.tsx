import {
  delay,
  http,
  HttpResponse,
  renderWithProviders,
  screen,
  startMockServer,
  waitFor,
  within,
} from 'tests/test-utils';

import { Country } from '@/shared/global/context/config';
import * as b2bService from '@/shared/service/b2b';
import { getVSAPIBaseURL } from '@/shared/service/vs/request/base';
import b2bLogger from '@/utils/b3Logger';

import CrownRegistration from './index';

vi.setConfig({ testTimeout: 30000 });

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

type User = ReturnType<typeof renderWithProviders>['user'];

const renderPage = (initialGlobalContext: Record<string, unknown> = {}) =>
  renderWithProviders(<CrownRegistration setOpenPage={vi.fn()} />, {
    initialGlobalContext: { countriesList, registerEnabled: true, ...initialGlobalContext },
    initialEntries: ['/register'],
  });

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

const failWith = (status: number, errors: { code: string; field?: string; message: string }[]) =>
  respondWith(() => HttpResponse.json({ errors }, { status }));

describe('CrownRegistration page', () => {
  beforeEach(() => {
    vi.spyOn(b2bService, 'checkUserEmail').mockResolvedValue({ isValid: true });
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
      turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
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
    expect(screen.getByText('ada@acmefoods.com')).toBeVisible();
    expect(screen.getByText('Acme Foods')).toBeVisible();
    expect(screen.getByText('Ada Lovelace')).toBeVisible();
    expect(screen.getByText('CC-ABC123')).toBeVisible();
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
      expect(screen.getByRole('button', { name: 'Submit application' })).toBeEnabled();
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

  it('starts over with an empty form after "Submit another account"', async () => {
    respondWith(success);
    const { user } = renderPage();

    await fillValidForm(user);
    await user.click(submitButton());
    await user.click(await screen.findByRole('button', { name: 'Submit another account' }));

    expect(screen.getByLabelText(/company name/i)).toHaveValue('');
    expect(within(section(/billing address/i)).getByLabelText(/^country/i)).toHaveValue('US');
    expect(screen.getByRole('checkbox', { name: /same as billing/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /privacy policy/i })).not.toBeChecked();
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
