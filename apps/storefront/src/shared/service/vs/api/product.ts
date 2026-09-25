import { storeHash } from '@/utils/basicConfig';

import VSRequest from '../request/vsFetch';

export const getProductRequirementsByIds = (
  productIds: number[] = [],
): Promise<ProductRequirements[]> =>
  VSRequest.post<ProductRequirements[], { productIds: number[] }>(
    `/storefront/product/requirements/`,
    {
      productIds,
    },
  );

export const getProductRequirementsBySKUs = (skus: string[] = []): Promise<ProductRequirements[]> =>
  VSRequest.post<ProductRequirements[], { skus: string[] }>(`/storefront/product/requirements/`, {
    skus,
  });

export const getAnonymousProductRequirementsByIds = (
  productIds: number[] = [],
): Promise<ProductRequirements[]> =>
  VSRequest.post<ProductRequirements[], { storeHash: string; productIds: number[] }>(
    `/storefront/product/requirements/anonymous/`,
    {
      storeHash,
      productIds,
    },
  );

export const getAnonymousProductRequirementsBySKUs = (
  skus: string[] = [],
): Promise<ProductRequirements[]> =>
  VSRequest.post<ProductRequirements[], { storeHash: string; skus: string[] }>(
    `/storefront/product/requirements/anonymous/`,
    {
      storeHash,
      skus,
    },
  );

export type ProductRequirements = {
  productId: number;
  sku: string;
  orderQuantityMinimum: number | null;
  orderQuantityIncrement: number | null;
};
