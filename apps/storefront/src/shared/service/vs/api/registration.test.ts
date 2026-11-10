import { builder, faker, http, HttpResponse, startMockServer } from 'tests/test-utils';

import { getVSAPIBaseURL } from '../request/base';
import { VSApiError } from '../request/VSApiError';

import {
  AddressValidationResult,
  registerBusinessAccount,
  REGISTRATION_ERROR_CODES,
  RegistrationAddress,
  RegistrationSubmission,
  RegistrationSubmissionAddress,
  validateAddress,
} from './registration';

const { server } = startMockServer();

const buildAddressWith = builder<RegistrationSubmissionAddress>(() => ({
  address1: faker.location.streetAddress(),
  address2: '',
  city: faker.location.city(),
  state: 'IL',
  stateName: 'Illinois',
  postalCode: faker.string.numeric(5),
  country: 'US',
}));

const buildSubmissionWith = builder<RegistrationSubmission>(() => ({
  turnstileToken: faker.string.alphanumeric(32),
  contact: {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email({ provider: 'acmefoods.com' }),
    phone: faker.string.numeric(10),
    password: `${faker.string.alpha(6)}${faker.string.numeric(3)}`,
    existingCustomer: false,
  },
  company: { name: faker.company.name() },
  privacyAcknowledged: true,
  billingAddress: buildAddressWith('WHATEVER_VALUES'),
  shippingAddress: { sameAsBilling: true },
}));

const registrationUrl = () => `${getVSAPIBaseURL()}/storefront/registration/`;
const validateAddressUrl = () => `${getVSAPIBaseURL()}/storefront/registration/validate-address/`;

describe('registerBusinessAccount', () => {
  it('sends the submission with storeHash and channelId to /storefront/registration/', async () => {
    const submission = buildSubmissionWith('WHATEVER_VALUES');
    const referenceId = faker.string.uuid();
    const captured = vi.fn();

    server.use(
      http.post(registrationUrl(), async ({ request }) => {
        captured(await request.json());

        return HttpResponse.json({ referenceId, status: 'pending' });
      }),
    );

    await expect(registerBusinessAccount(submission)).resolves.toEqual({
      referenceId,
      status: 'pending',
    });
    expect(captured).toHaveBeenCalledWith({ storeHash: 'store-hash', channelId: 1, ...submission });
  });

  it('sends a separate shipping address when shipping differs from billing', async () => {
    const shippingAddress = buildAddressWith({
      country: 'CA',
      state: 'ON',
      stateName: 'Ontario',
      postalCode: 'K1A 0B1',
    });
    const submission = buildSubmissionWith({
      shippingAddress: { sameAsBilling: false, ...shippingAddress },
    });
    const captured = vi.fn();

    server.use(
      http.post(registrationUrl(), async ({ request }) => {
        captured(await request.json());

        return HttpResponse.json({ referenceId: faker.string.uuid(), status: 'pending' });
      }),
    );

    await registerBusinessAccount(submission);

    expect(captured).toHaveBeenCalledWith(
      expect.objectContaining({
        billingAddress: expect.objectContaining({ state: 'IL', stateName: 'Illinois' }),
        shippingAddress: {
          sameAsBilling: false,
          ...shippingAddress,
          state: 'ON',
          stateName: 'Ontario',
        },
      }),
    );
  });

  it('surfaces ADDRESS_EXISTS for the billing address as a VSApiError', async () => {
    const errors = [
      {
        field: 'billingAddress',
        code: REGISTRATION_ERROR_CODES.addressExists,
        message: faker.lorem.sentence(),
      },
    ];

    server.use(http.post(registrationUrl(), () => HttpResponse.json({ errors }, { status: 400 })));

    const promise = registerBusinessAccount(buildSubmissionWith('WHATEVER_VALUES'));

    await expect(promise).rejects.toMatchObject({ status: 400, errors });
  });

  it('surfaces EMAIL_EXISTS as a VSApiError', async () => {
    const errors = [
      {
        field: 'email',
        code: REGISTRATION_ERROR_CODES.emailExists,
        message: faker.lorem.sentence(),
      },
    ];

    server.use(http.post(registrationUrl(), () => HttpResponse.json({ errors }, { status: 400 })));

    const promise = registerBusinessAccount(buildSubmissionWith('WHATEVER_VALUES'));

    await expect(promise).rejects.toBeInstanceOf(VSApiError);
    await expect(promise).rejects.toMatchObject({ status: 400, errors });
  });
});

describe('validateAddress', () => {
  it('validateAddress posts storeHash and the address and returns the result', async () => {
    const address: RegistrationAddress = {
      address1: faker.location.streetAddress(),
      address2: '',
      city: faker.location.city(),
      state: 'IL',
      postalCode: faker.string.numeric(5),
      country: 'US',
    };
    const result: AddressValidationResult = {
      status: 'corrected',
      suggested: { ...address, postalCode: '62701-1234' },
      changes: ['postalCode'],
    };
    const captured = vi.fn();

    server.use(
      http.post(validateAddressUrl(), async ({ request }) => {
        captured(await request.json());

        return HttpResponse.json(result);
      }),
    );

    await expect(validateAddress(address)).resolves.toEqual(result);
    expect(captured).toHaveBeenCalledWith({ storeHash: 'store-hash', address });
  });
});
