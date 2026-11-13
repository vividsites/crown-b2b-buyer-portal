import { getVSAPIBaseURL } from './base';
import { VSApiError, VSFieldError } from './VSApiError';

interface AnonymousRequestOptions {
  timeoutMs?: number;
}

const isFieldError = (value: unknown): value is VSFieldError =>
  typeof value === 'object' && value !== null && 'code' in value && typeof value.code === 'string';

const isFieldErrorList = (value: unknown): value is VSFieldError[] =>
  Array.isArray(value) && value.every(isFieldError);

const readErrors = async (res: Response): Promise<VSFieldError[]> => {
  try {
    const body: unknown = await res.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'errors' in body &&
      isFieldErrorList(body.errors)
    ) {
      return body.errors;
    }
  } catch {
    // non-JSON body
  }

  return res.status === 429 ? [{ code: 'RATE_LIMITED', message: 'Too many requests' }] : [];
};

// Anonymous VS API requests: never attaches the customer JWT (no store/jwt imports here).
async function post<TResult>(
  path: string,
  body: unknown,
  { timeoutMs }: AnonymousRequestOptions = {},
): Promise<TResult> {
  const controller = new AbortController();
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  let res: Response;
  try {
    res = await fetch(`${getVSAPIBaseURL()}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    throw new VSApiError(0, [{ code: 'NETWORK', message }]);
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!res.ok) {
    throw new VSApiError(res.status, await readErrors(res));
  }

  return (await res.json()) as TResult;
}

const anonymousFetch = { post };

export default anonymousFetch;
