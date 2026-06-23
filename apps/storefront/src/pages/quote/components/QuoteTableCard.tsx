import { Delete, Edit, Warning as WarningIcon } from '@mui/icons-material';
import { Box, CardContent, styled, TextField, Typography } from '@mui/material';

import { PRODUCT_DEFAULT_IMAGE } from '@/constants';
import { useB3Lang } from '@/lib/lang';
import { ProductRequirements } from '@/shared/service/vs/api/product';
import { CustomerRole, Product } from '@/types';
import { QuoteItem } from '@/types/quotes';
import { currencyFormat } from '@/utils/b3CurrencyFormat';
import { getBCPrice, getDisplayPrice } from '@/utils/b3Product/b3Product';
import { getProductOptionsFields } from '@/utils/b3Product/shared/config';
import { useAppSelector } from '@/store';

interface QuoteTableCardProps {
  item: QuoteItem['node'];
  onEdit: (item: Product, itemId: string) => void;
  onDelete: (id: string) => void;
  handleUpdateProductQty: (item: QuoteItem['node'], quantity: number) => void;
  isLast: boolean;
  requirements?: ProductRequirements;
}

const StyledImage = styled('img')(() => ({
  maxWidth: '60px',
  height: 'auto',
  marginRight: '0.5rem',
}));

function QuoteTableCard({
  item,
  onEdit,
  onDelete,
  handleUpdateProductQty,
  isLast,
  requirements,
}: QuoteTableCardProps) {
  const {
    basePrice,
    quantity,
    id,
    primaryImage,
    productName,
    variantSku,
    productsSearch,
    taxPrice = 0,
  } = item;

  const b3Lang = useB3Lang();

  const qtyMin = requirements?.orderQuantityMinimum ?? 0;
  const qtyIncrement = requirements?.orderQuantityIncrement ?? 0;
  const qty = Number(quantity);
  let qtyHelperText = '';
  if (qty > 0) {
    if (qtyMin > 0 && qty < qtyMin)
      qtyHelperText = b3Lang('quoteDraft.quoteTable.error.minimumQuantity', { quantity: qtyMin });
    else if (qtyIncrement > 1 && (qty - qtyMin) % qtyIncrement !== 0)
      qtyHelperText = b3Lang('quoteDraft.quoteTable.error.quantityIncrement', { increment: qtyIncrement, minimum: qtyMin });
  }

  const role = useAppSelector(({ company }) => company.customer.role);

  const price = getBCPrice(Number(basePrice), Number(taxPrice));

  const total = price * Number(quantity);

  const product = {
    ...item.productsSearch,
    selectOptions: item.optionList,
  };

  const productFields = getProductOptionsFields(product, {});

  const optionList = JSON.parse(item.optionList);
  const optionsValue: CustomFieldItems[] = productFields.filter((item) => item.valueText);

  const { productUrl } = productsSearch;

  const singlePrice = (role === CustomerRole.GUEST || Number(basePrice) === Number(0)) ? '-' : getDisplayPrice({
    price: currencyFormat(price),
    productInfo: item,
    showText: b3Lang('quoteDraft.quoteSummary.tbd'),
  });

  const totalPrice = (role === CustomerRole.GUEST || Number(basePrice) === Number(0)) ? '-' : getDisplayPrice({
    price: currencyFormat(total),
    productInfo: item,
    showText: b3Lang('quoteDraft.quoteSummary.tbd'),
  });

  return (
    <Box
      key={id}
      width="100%"
      sx={{
        borderTop: '1px solid #D9DCE9',
        borderBottom: isLast ? '1px solid #D9DCE9' : '',
      }}
    >
      <CardContent
        sx={{
          color: '#313440',
          display: 'flex',
          pl: 0,
        }}
      >
        <Box>
          <StyledImage
            src={primaryImage || PRODUCT_DEFAULT_IMAGE}
            alt="Product-img"
            loading="lazy"
          />
        </Box>
        <Box
          sx={{
            flex: 1,
          }}
        >
          <Typography
            variant="body1"
            color="#212121"
            onClick={() => {
              if (productUrl) {
                window.location.href = `${window.location.origin}${productUrl}`;
              }
            }}
            sx={{
              cursor: 'pointer',
            }}
          >
            {productName}
          </Typography>
          <Typography variant="body1" color="#616161">
            {variantSku}
          </Typography>
          <Box
            sx={{
              margin: '1rem 0',
            }}
          >
            {optionList.length > 0 && optionsValue.length > 0 && (
              <Box>
                {optionsValue.map((option) => (
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      lineHeight: '1.5',
                      color: '#455A64',
                    }}
                    key={option.valueLabel}
                  >
                    {option.valueLabel}: {option.valueText}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>

          <Typography sx={{ fontSize: '14px' }}>Price: {singlePrice}</Typography>


          {(qtyMin > 1 || qtyIncrement > 1) && (
            <Box>
              {qtyMin > 1 && (
                <Typography sx={{ fontSize: '0.75rem', lineHeight: '1.5', color: '#455A64' }}>
                  {b3Lang('quoteDraft.quoteTable.label.minimumQuantity', { quantity: qtyMin })}
                </Typography>
              )}
              {qtyIncrement > 1 && (
                <Typography sx={{ fontSize: '0.75rem', lineHeight: '1.5', color: '#455A64' }}>
                  {b3Lang('quoteDraft.quoteTable.label.quantityIncrement', { increment: qtyIncrement })}
                </Typography>
              )}
            </Box>
          )}

          <TextField
            size="small"
            type="number"
            variant="filled"
            label="qty"
            inputProps={{
              inputMode: 'numeric',
              pattern: '[0-9]*',
              min: qtyMin > 0 ? qtyMin : 1,
              step: qtyIncrement > 1 ? qtyIncrement : 1,
            }}
            value={quantity}
            sx={{
              margin: '1rem 0',
              width: '60%',
              maxWidth: '100px',
              '& label': {
                fontSize: '14px',
              },
              '& input': {
                fontSize: '14px',
              },
              '& .MuiFormHelperText-root': { marginLeft: 0, marginRight: 0 },
            }}
            onChange={(e) => {
              handleUpdateProductQty(item, Number(e.target.value));
            }}
          />

          {qtyHelperText && (
            <Box sx={{ color: 'red' }}>
              <Box
                sx={{
                  mt: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  '& svg': { mr: '0.5rem' },
                }}
              >
                <WarningIcon color="error" fontSize="small" />
                {qtyHelperText}
              </Box>
            </Box>
          )}

          <Typography sx={{ fontSize: '14px' }}>Total: {totalPrice}</Typography>
          <Box
            sx={{
              marginTop: '1rem',
              textAlign: 'end',
            }}
            id="shoppingList-actionList-mobile"
          >
            {optionList.length > 0 && (
              <Edit
                sx={{
                  marginRight: '0.5rem',
                  cursor: 'pointer',
                  color: 'rgba(0, 0, 0, 0.54)',
                }}
                onClick={() => {
                  onEdit(
                    {
                      ...productsSearch,
                      quantity,
                      selectOptions: item.optionList,
                    },
                    id,
                  );
                }}
              />
            )}
            <Delete
              sx={{ cursor: 'pointer', color: 'rgba(0, 0, 0, 0.54)' }}
              onClick={() => {
                onDelete(id);
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Box>
  );
}

export default QuoteTableCard;
