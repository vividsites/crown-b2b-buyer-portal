import VSRequest from '../request/vsFetch';

interface DefaultShoppingList {
  id?: number | null;
}

export const getDefaultShoppingList = () =>
  VSRequest.get<DefaultShoppingList | null>(`/storefront/company/shoppinglist/`);
