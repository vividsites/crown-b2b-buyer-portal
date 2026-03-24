import VSRequest from '../request/vsFetch';

export const getDefaultShoppingList = () =>
	VSRequest.get(
    `/storefront/company/shoppinglist/`
  );