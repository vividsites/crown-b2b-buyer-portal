import { store } from '@/store';

import { getVSAPIBaseURL, queryParse } from './base';
import vsFetch from './fetch';
import { ensureVSCurrentCustomerJWT } from './jwt';

async function request(path: string, config?: RequestInit) {
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

  return vsFetch(url, init);
}

const VSRequest = {
  get: function get<T, Y>(url: string, data?: T, config?: Y): Promise<any> {
    if (data) {
      const params = queryParse(data);
      return request(`${url}?${params}`, {
        method: 'GET',
        ...config,
      });
    }
    return request(
      url,
      {
        method: 'GET',
      },
    );
  },
  post: function post<T>(url: string, data: T): Promise<any> {
    return request(
      url,
      {
        body: JSON.stringify(data),
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  },
  put: function put<T>(url: string, data: T): Promise<any> {
    return request(
      url,
      {
        body: JSON.stringify(data),
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  },
  delete: function deleteFn(url: string): Promise<any> {
    return request(
      url,
      {
        method: 'DELETE',
      },
    );
  },
};

export default VSRequest;
