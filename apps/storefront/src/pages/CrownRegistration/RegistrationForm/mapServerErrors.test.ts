import { VSApiError } from '@/shared/service/vs';

import { mapServerErrors } from './mapServerErrors';

const apiError = (status: number, code: string, field?: string, message = 'Server says no') =>
  new VSApiError(status, [{ code, field, message }]);

describe('mapServerErrors', () => {
  it('shows the generic banner for unexpected errors', () => {
    expect(mapServerErrors(new Error('boom'), true)).toEqual({
      fieldErrors: [],
      bannerKey: 'crownRegistration.error.generic',
    });
  });

  it('shows the generic banner for network failures', () => {
    const error = new VSApiError(0, [{ code: 'NETWORK', message: 'Failed to fetch' }]);

    expect(mapServerErrors(error, true)).toEqual({
      fieldErrors: [],
      bannerKey: 'crownRegistration.error.generic',
    });
  });

  it('shows the generic banner when the response has no recognised code', () => {
    expect(mapServerErrors(new VSApiError(500, []), true).bannerKey).toBe(
      'crownRegistration.error.generic',
    );
    expect(mapServerErrors(apiError(502, 'SOMETHING_NEW'), true).bannerKey).toBe(
      'crownRegistration.error.generic',
    );
  });

  it('shows an unrecognised code inline when it names a form field with a message', () => {
    expect(
      mapServerErrors(apiError(400, 'DUPLICATE_COMPANY', 'companyName', 'Already used'), true),
    ).toEqual({
      fieldErrors: [{ field: 'companyName', message: 'Already used' }],
      focusField: 'companyName',
    });
  });

  it('maps TURNSTILE_FAILED to its banner', () => {
    expect(mapServerErrors(apiError(400, 'TURNSTILE_FAILED'), true)).toEqual({
      fieldErrors: [],
      bannerKey: 'crownRegistration.error.turnstileFailed',
    });
  });

  it('maps RATE_LIMITED to its banner', () => {
    expect(mapServerErrors(apiError(429, 'RATE_LIMITED'), true)).toEqual({
      fieldErrors: [],
      bannerKey: 'crownRegistration.error.rateLimited',
    });
  });

  it('maps REGISTRATION_FAILED to the generic banner', () => {
    expect(mapServerErrors(apiError(500, 'REGISTRATION_FAILED'), true)).toEqual({
      fieldErrors: [],
      bannerKey: 'crownRegistration.error.generic',
    });
  });

  it('maps EMAIL_EXISTS inline on the email field and focuses it', () => {
    expect(mapServerErrors(apiError(409, 'EMAIL_EXISTS', 'email'), true)).toEqual({
      fieldErrors: [{ field: 'email', message: 'crownRegistration.error.emailExists' }],
      focusField: 'email',
    });
  });

  it('maps VALIDATION on a known field inline with the server message', () => {
    expect(mapServerErrors(apiError(422, 'VALIDATION', 'bZip', 'Bad ZIP'), true)).toEqual({
      fieldErrors: [{ field: 'bZip', message: 'Bad ZIP' }],
      focusField: 'bZip',
    });
  });

  it('puts VALIDATION errors for unknown fields into the banner', () => {
    expect(mapServerErrors(apiError(422, 'VALIDATION', 'nonsense', 'Bad'), true)).toEqual({
      fieldErrors: [],
      bannerKey: 'crownRegistration.error.generic',
    });
    expect(mapServerErrors(apiError(422, 'VALIDATION'), true).fieldErrors).toEqual([]);
  });

  it('maps ADDRESS_EXISTS for billing to the billing street field', () => {
    expect(
      mapServerErrors(apiError(409, 'ADDRESS_EXISTS', 'billingAddress', 'Address exists'), false),
    ).toEqual({
      fieldErrors: [{ field: 'bAddress1', message: 'Address exists' }],
      focusField: 'bAddress1',
    });
  });

  it('maps ADDRESS_EXISTS for a separate shipping address to the shipping street field', () => {
    expect(
      mapServerErrors(apiError(409, 'ADDRESS_EXISTS', 'shippingAddress', 'Address exists'), false),
    ).toEqual({
      fieldErrors: [{ field: 'sAddress1', message: 'Address exists' }],
      focusField: 'sAddress1',
    });
  });

  it('maps ADDRESS_EXISTS for shipping to billing when shipping is the same as billing', () => {
    expect(
      mapServerErrors(apiError(409, 'ADDRESS_EXISTS', 'shippingAddress', 'Address exists'), true),
    ).toEqual({
      fieldErrors: [{ field: 'bAddress1', message: 'Address exists' }],
      focusField: 'bAddress1',
    });
  });

  it('maps ADDRESS_EXISTS reported on a form field such as companyName inline on that field', () => {
    expect(
      mapServerErrors(
        apiError(400, 'ADDRESS_EXISTS', 'companyName', 'Company already exists'),
        true,
      ),
    ).toEqual({
      fieldErrors: [{ field: 'companyName', message: 'Company already exists' }],
      focusField: 'companyName',
    });
  });

  it('falls back to the generic banner for ADDRESS_EXISTS on an unknown field', () => {
    expect(mapServerErrors(apiError(400, 'ADDRESS_EXISTS', 'nonsense', 'Taken'), true)).toEqual({
      fieldErrors: [],
      bannerKey: 'crownRegistration.error.generic',
    });
  });

  it('collects several errors and focuses the first', () => {
    const error = new VSApiError(422, [
      { code: 'VALIDATION', field: 'phone', message: 'Bad phone' },
      { code: 'VALIDATION', field: 'bCity', message: 'Bad city' },
    ]);

    expect(mapServerErrors(error, true)).toEqual({
      fieldErrors: [
        { field: 'phone', message: 'Bad phone' },
        { field: 'bCity', message: 'Bad city' },
      ],
      focusField: 'phone',
    });
  });

  it('escapes ICU syntax in server text', () => {
    const { fieldErrors } = mapServerErrors(
      apiError(422, 'VALIDATION', 'bCity', "Can't use {braces}"),
      true,
    );

    expect(fieldErrors[0].message).toBe("Can''t use '{'braces'}'");
  });
});
