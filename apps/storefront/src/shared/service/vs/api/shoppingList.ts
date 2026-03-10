import VSRequest from '../request/vsFetch';

export const getDefaultShoppingList = () =>
	VSRequest.get(
    `/storefront/shoppingList/default/`
  );