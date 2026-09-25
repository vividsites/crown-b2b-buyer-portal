import { delay, faker, http, HttpResponse, startMockServer } from 'tests/test-utils';

import { store } from '@/store';
import { setVSCurrentCustomerJWT } from '@/store/slices/company';

import anonymousFetch from './anonymousFetch';
import { getVSAPIBaseURL } from './base';
import { VSApiError } from './VSApiError';

const { server } = startMockServer();

const path = '/storefront/anonymous-test/';
const url = () => `${getVSAPIBaseURL()}${path}`;

describe('anonymousFetch.post', () => {
  it('posts JSON to the VS API and returns the parsed body', async () => {
    const captured = vi.fn();
    const payload = { name: faker.company.name() };
    const responseBody = { referenceId: faker.string.uuid() };

    server.use(
      http.post(url(), async ({ request }) => {
        captured({
          method: request.method,
          contentType: request.headers.get('content-type'),
          body: await request.json(),
        });

        return HttpResponse.json(responseBody);
      }),
    );

    await expect(anonymousFetch.post(path, payload)).resolves.toEqual(responseBody);
    expect(captured).toHaveBeenCalledWith({
      method: 'POST',
      contentType: 'application/json',
      body: payload,
    });
  });

  it('never sends an Authorization header', async () => {
    store.dispatch(setVSCurrentCustomerJWT(faker.string.uuid()));
    const authorization = vi.fn();

    server.use(
      http.post(url(), ({ request }) => {
        authorization(request.headers.get('authorization'));

        return HttpResponse.json({});
      }),
    );

    await anonymousFetch.post(path, {});

    expect(authorization).toHaveBeenCalledWith(null);
  });

  it('throws VSApiError with status and field errors on 400', async () => {
    const errors = [{ field: 'email', code: 'VALIDATION', message: faker.lorem.sentence() }];

    server.use(http.post(url(), () => HttpResponse.json({ errors }, { status: 400 })));

    const promise = anonymousFetch.post(path, {});

    await expect(promise).rejects.toBeInstanceOf(VSApiError);
    await expect(promise).rejects.toMatchObject({ status: 400, errors });
  });

  it('throws VSApiError with no errors when a 5xx body is not JSON', async () => {
    server.use(http.post(url(), () => new HttpResponse('oops', { status: 502 })));

    const promise = anonymousFetch.post(path, {});

    await expect(promise).rejects.toBeInstanceOf(VSApiError);
    await expect(promise).rejects.toMatchObject({ status: 502, errors: [] });
  });

  it('maps a 429 without a body to RATE_LIMITED', async () => {
    server.use(http.post(url(), () => new HttpResponse(null, { status: 429 })));

    await expect(anonymousFetch.post(path, {})).rejects.toMatchObject({
      status: 429,
      errors: [{ code: 'RATE_LIMITED', message: 'Too many requests' }],
    });
  });

  it('throws VSApiError with status 0 on network failure', async () => {
    server.use(http.post(url(), () => HttpResponse.error()));

    const promise = anonymousFetch.post(path, {});

    await expect(promise).rejects.toBeInstanceOf(VSApiError);
    await expect(promise).rejects.toMatchObject({
      status: 0,
      errors: [expect.objectContaining({ code: 'NETWORK' })],
    });
  });

  it('aborts and throws a NETWORK VSApiError when the timeout elapses', async () => {
    server.use(
      http.post(url(), async () => {
        await delay('infinite');

        return HttpResponse.json({});
      }),
    );

    const promise = anonymousFetch.post(path, {}, { timeoutMs: 20 });

    await expect(promise).rejects.toBeInstanceOf(VSApiError);
    await expect(promise).rejects.toMatchObject({
      status: 0,
      errors: [expect.objectContaining({ code: 'NETWORK' })],
    });
  });
});
