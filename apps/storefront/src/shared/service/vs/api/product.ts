import VSRequest from '../request/vsFetch';

export const getProductRequirements = (productIds: number[] = []): Promise<ProductRequirements[]> =>
	VSRequest.post<{ productIds: number[] }>(
		`/storefront/product/requirements/`,
		{
			productIds,
		}
	);

export type ProductRequirements = {
	productId: number;
	sku: string;
	orderQuantityMinimum: number | null;
	orderQuantityIncrement: number | null;
};