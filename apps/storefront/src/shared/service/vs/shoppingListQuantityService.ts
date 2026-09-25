import { ProductsProps } from '@/utils/b3Product/shared/config';

export const getShoppingListItemQuantities = (shoppingListId: string | number) => {
  return JSON.parse(sessionStorage.getItem(`quantities_${shoppingListId}`) || '[]');
};

export const setShoppingListItemQuantities = (
  shoppingListId: string | number,
  items: ProductsProps[],
) => {
  sessionStorage.setItem(`quantities_${shoppingListId}`, JSON.stringify(items));
};

export const clearShoppingListItemQuantities = () => {
  const keys = Array.from({ length: sessionStorage.length }, (_, i) =>
    sessionStorage.key(i),
  ).filter((key): key is string => !!key && key.startsWith('quantities_'));
  keys.forEach((key) => sessionStorage.removeItem(key));
};
