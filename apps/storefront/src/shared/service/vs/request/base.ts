import { Environment, EnvSpecificConfig } from '@/types';

const ENVIRONMENT_VS_API_URL: EnvSpecificConfig<string> = {
  local: `https://localhost:44320`,
  integration: 'https://vsconnector.vsstaging.com',
  staging: 'https://crowntest.vividconnector.com',
  production: 'https://crowncom.vividconnector.com',
};

// cspell:disable
const ENVIRONMENT_VS_APP_CLIENT_ID: EnvSpecificConfig<string> = {
  local: 'rewfea6m9enlzs1elq6c5ifdhz9rme8',
  integration: 'rewfea6m9enlzs1elq6c5ifdhz9rme8',
  staging: 'rewfea6m9enlzs1elq6c5ifdhz9rme8',
  production: 'rewfea6m9enlzs1elq6c5ifdhz9rme8',
};

// cspell:enable

const DEFAULT_ENVIRONMENT =
  import.meta.env.VITE_IS_LOCAL_ENVIRONMENT === 'TRUE' ? Environment.Local : Environment.Production;

function isEnvironment(value?: string): value is Environment {
  if (!value) {
    return false;
  }

  return Object.values<string>(Environment).includes(value);
}

const getEnvironment = (environment?: Environment): Environment => {
  if (environment) {
    return environment;
  }

  if (isEnvironment(window.B3?.setting?.vsEnvironment)) {
    return window.B3.setting.vsEnvironment;
  }

  return DEFAULT_ENVIRONMENT;
};

export function getVSAPIBaseURL(environment?: Environment) {
  return ENVIRONMENT_VS_API_URL[getEnvironment(environment)];
}

export function getVSAppClientId(environment?: Environment) {
  return ENVIRONMENT_VS_APP_CLIENT_ID[getEnvironment(environment)];
}

// The site key comes only from the BigCommerce theme setting that the Script
// Manager snippet copies into window.B3.setting. Read at call time, no fallback.
export function getVSTurnstileSiteKey(): string {
  return window.B3?.setting?.turnstileSiteKey?.trim() ?? '';
}

// Cloudflare's dummy keys: a digit, "x", 20 zeros, then two letters.
export function isTurnstileTestSiteKey(key: string): boolean {
  return /^[123]x0{20}[A-Z]{2}$/.test(key);
}

export interface DataSourceRequest {
  page: number;
  pageSize: number;
  skip: number;
  sort: SortDescriptor[];
  filter: Partial<FilterDescriptor>;
  companyId: string;
  companyIds: number[];
}

export interface SortDescriptor {
  field: string;
  dir: string;
}

export interface FilterDescriptor {
  logic: string;
  filters: Partial<FilterDescriptor>[];
  field: string;
  operator: string;
  value: unknown;
}

export type QueryParams = Record<string, string | number | boolean>;

const queryParse = (query: QueryParams): string =>
  Object.entries(query)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

export { queryParse };
