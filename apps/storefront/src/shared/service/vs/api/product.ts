import VSRequest from '../request/vsFetch';

export const getProductRequirementsByIds = (productIds: number[] = []): Promise<ProductRequirements[]> =>
	VSRequest.post<{ productIds: number[] }>(
		`/storefront/product/requirements/`,
		{
			productIds,
		}
	);

export const getProductRequirementsBySKUs = (skus: string[] = []): Promise<ProductRequirements[]> =>
	VSRequest.post<{ skus: string[] }>(
		`/storefront/product/requirements/`,
		{
			skus,
		}
	);

export type ProductRequirements = {
	productId: number;
	sku: string;
	orderQuantityMinimum: number | null;
	orderQuantityIncrement: number | null;
};