import { ChangeEvent, KeyboardEvent, useCallback, useContext } from 'react';
import { Search as SearchIcon } from '@mui/icons-material';
import { Box, InputAdornment, TextField, Typography } from '@mui/material';

import B3Dialog from '@/components/B3Dialog';
import { B3ProductList } from '@/components/B3ProductList';
import CustomButton from '@/components/button/CustomButton';
import B3Spin from '@/components/spin/B3Spin';
import { useMobile } from '@/hooks/useMobile';
import { useB3Lang } from '@/lib/lang';
import { useAppSelector } from '@/store';
import { snackbar } from '@/utils/b3Tip';

import { ShoppingListProductItem } from '../../../types';
import { ShoppingListDetailsContext } from '../context/ShoppingListDetailsContext';

interface ProductTableActionProps {
  product: ShoppingListProductItem;
  type?: string;
  onAddToListClick: (id: number) => void;
  onChooseOptionsClick: (id: number) => void;
  addButtonText: string;
  addQuoteButtonText: string;
}

function ProductTableAction(props: ProductTableActionProps) {
  const {
    product: { id, allOptions: productOptions, base_price },
    type,
    onAddToListClick,
    onChooseOptionsClick,
    addButtonText,
    addQuoteButtonText
  } = props;

  const {
    state: { isLoading = false }
  } = useContext(ShoppingListDetailsContext);

  const [isMobile] = useMobile();

  const b3Lang = useB3Lang();

  let price = Number(base_price);

  let addButtonDisabled = false;
  let buttonText = addButtonText;
  if(isNaN(price) || price <= 0){
    if(type === 'quote'){
      buttonText = addQuoteButtonText;
    }
    else{
      addButtonDisabled = true;
    }
  }

  return productOptions && productOptions.length > 0 ? (
    <CustomButton
      variant="outlined"
      onClick={() => {
        onChooseOptionsClick(id);
      }}
      disabled={isLoading || addButtonDisabled}
      fullWidth={isMobile}
    >
      {b3Lang('global.searchProduct.chooseOptionsButton')}
    </CustomButton>
  ) : (
    <CustomButton
      variant="outlined"
      onClick={() => {
        onAddToListClick(id);
      }}
      disabled={isLoading || addButtonDisabled}
      fullWidth={isMobile}
    >
      {buttonText}
    </CustomButton>
  );
}

interface ProductListDialogProps {
  isOpen: boolean;
  searchText: string;
  productList: ShoppingListProductItem[];
  onCancel: () => void;
  onSearchTextChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  onProductQuantityChange: (id: number, newQuantity: number) => void;
  onAddToListClick: (products: CustomFieldItems[]) => void;
  onChooseOptionsClick: (id: number) => void;
  isLoading: boolean;
  searchDialogTitle?: string;
  addButtonText?: string;
  addQuoteButtonText?: string;
  type?: string;
}

const ProductTable = B3ProductList<ShoppingListProductItem>;

export default function ProductListDialog(props: ProductListDialogProps) {
  const b3Lang = useB3Lang();
  const {
    isOpen,
    onCancel,
    searchText,
    productList,
    onSearchTextChange,
    onSearch,
    onProductQuantityChange,
    onAddToListClick,
    onChooseOptionsClick,
    isLoading,
    type,
    searchDialogTitle = b3Lang('shoppingLists.title'),
    addButtonText = b3Lang('shoppingLists.addButtonText'),
    addQuoteButtonText = b3Lang('shoppingLists.addQuoteButtonText'),
  } = props;

  const isEnableProduct = useAppSelector(
    ({ global }) => global.blockPendingQuoteNonPurchasableOOS.isEnableProduct,
  );

  const [isMobile] = useMobile();

  const handleCancelClicked = () => {
    onCancel();
  };

  const handleSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  const validateQuantityNumber = useCallback(
    (product: ShoppingListProductItem) => {
      const { variants = [] } = product || {};
      const { purchasing_disabled: purchasingDisabled = true } = variants[0] || {};

      if (type !== 'shoppingList' && purchasingDisabled === true && !isEnableProduct) {
        snackbar.error(b3Lang('shoppingList.chooseOptionsDialog.productNoLongerForSale'));
        return false;
      }

      return true;
    },
    // ignore b3Lang it's not reactive
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEnableProduct, type],
  );

  const handleAddToList = (id: number) => {
    const product = productList.find((product) => product.id === id);

    if (product && validateQuantityNumber(product || {})) {
      let variantId: number | string = product.variantId || 0;

      if (!product.variantId && product.variants?.[0]) {
        variantId = product.variants[0].variant_id;
      }

      onAddToListClick([
        {
          ...product,
          newSelectOptionList: [],
          quantity: parseInt(product.quantity.toString(), 10) || 1,
          variantId,
        },
      ]);
    }
  };

  return (
    <B3Dialog
      fullWidth
      isOpen={isOpen}
      handleLeftClick={handleCancelClicked}
      title={searchDialogTitle}
      showRightBtn={false}
      loading={isLoading}
      maxWidth="md"
      leftSizeBtn={b3Lang('shoppingLists.close')}
    >
      <B3Spin isSpinning={isLoading}>
        <Box
          sx={{
            minWidth: isMobile ? 'initial' : '100%',
            flex: 1,
          }}
        >
          <TextField
            hiddenLabel
            variant="filled"
            fullWidth
            size="small"
            value={searchText}
            onChange={onSearchTextChange}
            onKeyDown={handleSearchKeyDown}
            error={!productList || productList.length <= 0}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{
              margin: '12px 0',
              '& input': {
                padding: '12px 12px 12px 0',
              },
            }}
          />

          {productList && productList.length > 0 ? (
            <ProductTable
              products={productList}
              quantityEditable
              type={type}
              textAlign={isMobile ? 'left' : 'right'}
              canToProduct
              onProductQuantityChange={onProductQuantityChange}
              renderAction={(product) => (
                <ProductTableAction
                  product={product}
                  type={type}
                  onAddToListClick={handleAddToList}
                  onChooseOptionsClick={onChooseOptionsClick}
                  addButtonText={addButtonText}
                  addQuoteButtonText={addQuoteButtonText}
                />
              )}
              actionWidth="180px"
            />
          ) : (
            <Typography>No products found</Typography>
          )}
        </Box>
      </B3Spin>
    </B3Dialog>
  );
}
