interface VSErrorEnvelope {
  code?: number;
  message?: string;
  data?: { errMsg?: string };
}

const isErrorEnvelope = (value: unknown): value is VSErrorEnvelope =>
  typeof value === 'object' && value !== null && 'code' in value;

async function vsFetch(path: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(path, init);
  if (init.method === 'DELETE') {
    return undefined;
  }

  const body: unknown = await res.json();
  if (isErrorEnvelope(body) && body.code === 500) {
    return Promise.reject(body.data?.errMsg || body.message || '');
  }

  return body;
}
export default vsFetch;
