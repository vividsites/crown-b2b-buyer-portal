import { store } from '@/store';

import { getVSAPIBaseURL, QueryParams, queryParse } from './base';
import vsFetch from './fetch';
import { ensureVSCurrentCustomerJWT } from './jwt';

async function request<TResult>(path: string, config?: RequestInit): Promise<TResult> {
  const url = `${getVSAPIBaseURL()}${path}`;

  await ensureVSCurrentCustomerJWT();
  const { vsCurrentCustomerJWT } = store.getState().company.tokens;

  const getToken: HeadersInit = {
    Authorization: `Bearer ${vsCurrentCustomerJWT}`,
  };

  const {
    headers = {
      'content-type': 'application/json',
    },
  } = config || {};

  const init = {
    ...config,
    headers: {
      ...headers,
      ...getToken,
    },
  };

  return (await vsFetch(url, init)) as TResult;
}

const VSRequest = {
  get: function get<TResult = unknown>(
    url: string,
    data?: QueryParams,
    config?: RequestInit,
  ): Promise<TResult> {
    if (data) {
      const params = queryParse(data);
      return request<TResult>(`${url}?${params}`, {
        method: 'GET',
        ...config,
      });
    }
    return request<TResult>(url, {
      method: 'GET',
      ...config,
    });
  },
  post: function post<TResult = unknown, TBody = unknown>(
    url: string,
    data: TBody,
  ): Promise<TResult> {
    return request<TResult>(url, {
      body: JSON.stringify(data),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
    });
  },
  put: function put<TResult = unknown, TBody = unknown>(
    url: string,
    data: TBody,
  ): Promise<TResult> {
    return request<TResult>(url, {
      body: JSON.stringify(data),
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
      },
    });
  },
  delete: function deleteFn<TResult = unknown>(url: string): Promise<TResult> {
    return request<TResult>(url, {
      method: 'DELETE',
    });
  },
};

export default VSRequest;
