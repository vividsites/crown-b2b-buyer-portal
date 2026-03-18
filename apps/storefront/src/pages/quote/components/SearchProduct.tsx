import { ChangeEvent, KeyboardEvent, useState } from 'react';
import { Search as SearchIcon } from '@mui/icons-material';
import { Box, InputAdornment, TextField, Typography } from '@mui/material';

import CustomButton from '@/components/button/CustomButton';
import B3Spin from '@/components/spin/B3Spin';
import { useBlockPendingAccountViewPrice } from '@/hooks/useBlockPendingAccountViewPrice';
import { useB3Lang } from '@/lib/lang';
import { searchProducts } from '@/shared/service/b2b';
import { getProductRequirementsByIds, ProductRequirements } from '@/shared/service/vs/api/product';
import { useAppSelector } from '@/store';
import { calculateProductListPrice } from '@/utils/b3Product/b3Product';
import { conversionProductsList } from '@/utils/b3Product/shared/config';
import { snackbar } from '@/utils/b3Tip';

import { ShoppingListProductItem } from '../../../types';

import ChooseOptionsDialog from './ChooseOptionsDialog';
import ProductListDialog from './ProductListDialog';

interface SearchProductProps {
  updateList?: () => void;
  addToList: (products: CustomFieldItems[]) => Promise<void>;
  searchDialogTitle?: string;
  addButtonText?: string;
  addQuoteButtonText?: string;
  type?: string;
}

export default function SearchProduct({
  updateList = () => {},
  addToList,
  searchDialogTitle,
  addButtonText,
  addQuoteButtonText,
  type,
}: SearchProductProps) {
  const b3Lang = useB3Lang();
  const companyInfoId = useAppSelector(({ company }) => company.companyInfo.id);
  const customerGroupId = useAppSelector((state) => state.company.customer.customerGroupId);
  const companyStatus = useAppSelector(({ company }) => company.companyInfo.status);
  const salesRepCompanyId = useAppSelector(({ b2bFeatures }) => b2bFeatures.masqueradeCompany.id);
  const companyId = companyInfoId || salesRepCompanyId;
  const [isLoading, setIsLoading] = useState(false);
  const [productListOpen, setProductListOpen] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [productList, setProductList] = useState<ShoppingListProductItem[]>([]);
  const [requirementsMap, setRequirementsMap] = useState<Map<number, ProductRequirements>>(new Map());
  const [chooseOptionsOpen, setChooseOptionsOpen] = useState(false);
  const [optionsProduct, setOptionsProduct] = useState<ShoppingListProductItem>();

  const [blockPendingAccountViewPrice] = useBlockPendingAccountViewPrice();

  const handleSearchTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const searchProduct = async () => {
    if (!searchText || isLoading) return;

    if (blockPendingAccountViewPrice && companyStatus === 0) {
      snackbar.info(b3Lang('global.searchProductAddProduct.businessAccountPendingApproval'));
      return;
    }

    setIsLoading(true);
    try {
      const { productsSearch } = await searchProducts({
        search: searchText,
        companyId,
        customerGroupId,
        categoryFilter: true,
      });

      const productIds = productsSearch.map((p: ShoppingListProductItem) => p.id);
      let map:Map<number, ProductRequirements> = new Map();
      if (productIds.length) {
        const reqs = await getProductRequirementsByIds(productIds);
        map = new Map(reqs.map((r) => [r.productId, r] as [number, ProductRequirements]));
        setRequirementsMap(map);
      }

      const converted = conversionProductsList(productsSearch, [], map);
      setProductList(converted);

      setProductListOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchTextKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') searchProduct();
  };

  const clearProductInfo = () => setProductList([]);

  const handleProductListDialogCancel = () => {
    setChooseOptionsOpen(false);
    setProductListOpen(false);

    if (isAdded) {
      setIsAdded(false);
      updateList();
    }

    clearProductInfo();
  };

  const handleProductQuantityChange = (id: number, newQuantity: number) => {
    const product = productList.find((p) => p.id === id);
    if (product) {
      product.quantity = newQuantity;
      const qty = Number(newQuantity);
      const qtyMin = product.orderQuantityMinimum || 0;
      const qtyIncrement = product.orderQuantityIncrement || 1;
      if (qty > 0 && qtyMin > 0 && qty < qtyMin) {
        product.helperText = b3Lang('quoteDraft.quoteTable.error.minimumQuantity', { quantity: qtyMin });
      } else if (qty > 0 && qtyIncrement > 1 && (qty - qtyMin) % qtyIncrement !== 0) {
        product.helperText = b3Lang('quoteDraft.quoteTable.error.quantityIncrement', { increment: qtyIncrement, minimum: qtyMin });
      } else {
        product.helperText = '';
      }
    }
    setProductList([...productList]);
  };

  const handleAddToListClick = async (products: CustomFieldItems[]) => {
    try {
      setIsLoading(true);
      await calculateProductListPrice(products);
      await addToList(products);
      updateList();
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeOptionsClick = (productId: number) => {
    const product = productList.find((p) => p.id === productId);
    if (product) setOptionsProduct({ ...product });
    setProductListOpen(false);
    setChooseOptionsOpen(true);
  };

  const handleChooseOptionsDialogCancel = () => {
    setChooseOptionsOpen(false);
    setProductListOpen(true);
  };

  const handleChooseOptionsDialogConfirm = async (products: CustomFieldItems[]) => {
    try {
      setIsLoading(true);
      await calculateProductListPrice(products);
      await handleAddToListClick(products);
      setChooseOptionsOpen(false);
      setProductListOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ margin: '24px 0' }}>
      <Typography>{b3Lang('global.searchProductAddProduct.searchBySkuOrName')}</Typography>
      <TextField
        hiddenLabel
        placeholder={b3Lang(`global.searchProduct.placeholder.${type}`)}
        variant="filled"
        fullWidth
        size="small"
        value={searchText}
        onChange={handleSearchTextChange}
        onKeyDown={handleSearchTextKeyDown}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{
          margin: '12px 0',
          '& input': { padding: '12px 12px 12px 0' },
        }}
      />
      <CustomButton
        variant="outlined"
        fullWidth
        disabled={isLoading}
        onClick={searchProduct}
      >
        <B3Spin isSpinning={isLoading} tip="" size={16}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            {b3Lang('global.searchProductAddProduct.searchProduct')}
          </Box>
        </B3Spin>
      </CustomButton>

      <ProductListDialog
        isOpen={productListOpen}
        isLoading={isLoading}
        productList={productList}
        searchText={searchText}
        type={type}
        onSearchTextChange={handleSearchTextChange}
        onSearch={searchProduct}
        onCancel={handleProductListDialogCancel}
        onProductQuantityChange={handleProductQuantityChange}
        onChooseOptionsClick={handleChangeOptionsClick}
        onAddToListClick={handleAddToListClick}
        requirementsMap={requirementsMap}
        searchDialogTitle={searchDialogTitle}
        addButtonText={addButtonText}
        addQuoteButtonText={addQuoteButtonText}
      />

      <ChooseOptionsDialog
        isOpen={chooseOptionsOpen}
        isLoading={isLoading}
        type={type}
        setIsLoading={setIsLoading}
        product={optionsProduct}
        onCancel={handleChooseOptionsDialogCancel}
        onConfirm={handleChooseOptionsDialogConfirm}
        addButtonText={addButtonText}
      />
    </Box>
  );
}
