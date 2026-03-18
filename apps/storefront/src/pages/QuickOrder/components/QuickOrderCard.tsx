import { ReactElement } from 'react';
import { Box, CardContent, styled, TextField, Typography } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

import { PRODUCT_DEFAULT_IMAGE } from '@/constants';
import { useB3Lang } from '@/lib/lang';
import { ProductRequirements } from '@/shared/service/vs/api/product';
import b2bGetVariantImageByVariantInfo from '@/utils/b2bGetVariantImageByVariantInfo';
import { currencyFormat } from '@/utils/b3CurrencyFormat';
import { displayFormat } from '@/utils/b3DateFormat';

interface QuickOrderCardProps {
  item: any;
  checkBox?: () => ReactElement;
  handleUpdateProductQty: (id: number, val: string) => void;
  requirements?: ProductRequirements;
}

const StyledImage = styled('img')(() => ({
  maxWidth: '60px',
  height: 'auto',
  marginRight: '0.5rem',
}));

function QuickOrderCard(props: QuickOrderCardProps) {
  const { item: shoppingDetail, checkBox, handleUpdateProductQty, requirements } = props;

  const b3Lang = useB3Lang();


  const {
    quantity,
    imageUrl,
    productName,
    variantSku,
    optionList,
    basePrice,
    lastOrderedAt,
    variantId,
    productsSearch,
  } = shoppingDetail;

  const qtyMin = requirements?.orderQuantityMinimum ?? 0;
  const qtyIncrement = requirements?.orderQuantityIncrement ?? 0;
  const qty = Number(quantity);
  let warningMessage = '';
  if (qty > 0) {
    if (qtyMin > 0 && qty < qtyMin)
      warningMessage = b3Lang('quoteDraft.quoteTable.error.minimumQuantity', { quantity: qtyMin });
    else if (qtyIncrement > 1 && (qty - qtyMin) % qtyIncrement !== 0)
      warningMessage = b3Lang('quoteDraft.quoteTable.error.quantityIncrement', { increment: qtyIncrement, minimum: qtyMin });
  }

  const price = Number(basePrice) * Number(quantity);
  const currentVariants = productsSearch.variants || [];
  const currentImage = b2bGetVariantImageByVariantInfo(currentVariants, { variantId }) || imageUrl;

  return (
    <Box
      key={shoppingDetail.id}
      sx={{
        borderTop: '1px solid #D9DCE9',
      }}
    >
      <CardContent
        sx={{
          color: '#313440',
          display: 'flex',
          pl: 0,
        }}
      >
        <Box>{checkBox && checkBox()}</Box>
        <Box>
          <StyledImage
            src={currentImage || PRODUCT_DEFAULT_IMAGE}
            alt="Product-img"
            loading="lazy"
          />
        </Box>
        <Box
          sx={{
            flex: 1,
          }}
        >
          <Typography variant="body1" color="#212121">
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
            {optionList.length > 0 && (
              <Box>
                {optionList.map((option: CustomFieldItems) => (
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      lineHeight: '1.5',
                      color: '#455A64',
                    }}
                    key={option.display_name}
                  >
                    {`${option.display_name}: ${option.display_value}`}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>

          <Typography sx={{ fontSize: '14px' }}>
            {b3Lang('purchasedProducts.quickOrderCard.price', {
              price: currencyFormat(price),
            })}
          </Typography>
          
          {(qtyMin > 1 || qtyIncrement > 1) && (
            <Box>
              {qtyMin > 1 && (
                <Typography sx={{ fontSize: '0.75rem', lineHeight: '1.5', color: '#455A64' }}>
                  {b3Lang('shoppingList.table.label.minimumQuantity', { quantity: qtyMin })}
                </Typography>
              )}
              {qtyIncrement > 1 && (
                <Typography sx={{ fontSize: '0.75rem', lineHeight: '1.5', color: '#455A64' }}>
                  {b3Lang('shoppingList.table.label.quantityIncrement', { increment: qtyIncrement })}
                </Typography>
              )}
            </Box>
          )}

          <Box
            sx={{
              '& label': {
                zIndex: 0,
              },
            }}
          >
            <TextField
              size="small"
              type="number"
              variant="filled"
              label="Qty"
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
              }}
              onChange={(e) => {
                handleUpdateProductQty(shoppingDetail.id, e.target.value);
              }}
            />
          </Box>

          <Typography sx={{ fontSize: '14px' }}>
            {b3Lang('purchasedProducts.quickOrderCard.lastOrdered', {
              lastOrderedAt: displayFormat(lastOrderedAt),
            })}
          </Typography>

          {warningMessage && (
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
                {warningMessage}
              </Box>
            </Box>
          )}
        </Box>
      </CardContent>
    </Box>
  );
}

export default QuickOrderCard;
