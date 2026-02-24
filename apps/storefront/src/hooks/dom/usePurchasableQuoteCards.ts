import { useCallback, useEffect, useState } from 'react';

import { getB2BProductPurchasable } from '@/shared/service/b2b/graphql/product';
import config from '@/lib/config';
import { useAppSelector } from '@/store';

import { useFeatureFlags } from '../useFeatureFlags';
import { useIsBackorderValidationEnabled } from '../useIsBackorderValidationEnabled';

interface ProductInfoProps {
  availability: boolean;
  inventoryLevel: number;
  inventoryTracking: boolean;
  purchasingDisabled: boolean;
  availableToSell?: number;
  unlimitedBackorder?: boolean;
}

function isOutOfStockPurchaseQuantity(
  qty: number,
  productPurchasable: ProductInfoProps,
  isBackorderValidationEnabled: boolean,
): boolean {
  const { inventoryLevel, inventoryTracking, availableToSell, unlimitedBackorder } =
    productPurchasable;

  if (!inventoryTracking) {
    return false;
  }

  if (isBackorderValidationEnabled) {
    if (unlimitedBackorder) {
      return false;
    }

    if (availableToSell !== undefined) {
      return qty > availableToSell;
    }
  }

  return qty > inventoryLevel;
}

function getCardProductInfo(card: HTMLElement, useTextContentForSku: boolean) {
  const productId = (card.querySelector('input[name=product_id]') as HTMLInputElement | null)
    ?.value;
  const qtyInput = card.querySelector('[name="qty[]"]') as HTMLInputElement | null;
  const qty = qtyInput?.value ?? '1';
  const skuEl = card.querySelector('[data-product-sku]');
  const sku = useTextContentForSku
    ? (skuEl?.textContent ?? '').trim()
    : (skuEl?.innerHTML ?? '').trim();
  return { productId, qty: Number(qty), sku };
}

/**
 * Fetches purchasability for each product card on the page using the same logic as
 * usePurchasableQuote (availability, inventory, backorder, purchasingDisabled).
 * Returns a map of productId -> isPurchasable for use when rendering quote buttons per card.
 */
export function usePurchasableQuoteCards(cardsVersion: number, openQuickView: boolean) {
  const [purchasabilityByProductId, setPurchasabilityByProductId] = useState<
    Record<string, boolean>
  >({});
  const isBackorderValidationEnabled = useIsBackorderValidationEnabled();
  const featureFlags = useFeatureFlags();
  const isEnableProduct =
    useAppSelector(({ global }) => global.blockPendingQuoteNonPurchasableOOS.isEnableProduct) ||
    false;

  const useTextContentForSku = Boolean(
    featureFlags['B2B-3474.get_sku_from_pdp_with_text_content'],
  );

  const computeIsPurchasable = useCallback(
    (
      availability: string,
      inventoryLevel: number,
      inventoryTracking: string,
      purchasingDisabled: boolean,
      qty: number,
      availableToSell?: number,
      unlimitedBackorder?: boolean,
    ): boolean => {
      const productPurchasable: ProductInfoProps = {
        availability: availability === 'available',
        inventoryLevel,
        inventoryTracking:
          inventoryTracking === 'product' || inventoryTracking === 'variant',
        purchasingDisabled,
        availableToSell,
        unlimitedBackorder,
      };
      const isOOStock = isOutOfStockPurchaseQuantity(
        qty,
        productPurchasable,
        isBackorderValidationEnabled,
      );
      return (
        !purchasingDisabled &&
        !isOOStock &&
        availability === 'available'
      );
    },
    [isBackorderValidationEnabled],
  );

  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>(config['dom.productCard']);
    if (!cards.length) return;

    const productIds = new Set<string>();
    const cardInfos: { productId: string; qty: number; sku: string }[] = [];
    cards.forEach((card) => {
      const info = getCardProductInfo(card, useTextContentForSku);
      if (info.productId && info.sku) {
        productIds.add(info.productId);
        cardInfos.push({
          productId: info.productId,
          qty: info.qty,
          sku: info.sku,
        });
      }
    });

    let cancelled = false;
    const fetchAll = async () => {
      const results = await Promise.all(
        cardInfos.map(async ({ productId, qty, sku }) => {
          try {
            const {
              productPurchasable: {
                availability,
                inventoryLevel,
                inventoryTracking,
                purchasingDisabled,
                availableToSell,
                unlimitedBackorder,
              },
            } = await getB2BProductPurchasable({
              productId: Number(productId),
              sku,
              isProduct: true,
            });
            const isPurchasable = computeIsPurchasable(
              availability,
              inventoryLevel,
              inventoryTracking,
              purchasingDisabled,
              qty,
              availableToSell,
              unlimitedBackorder,
            );
            return { productId, isPurchasable };
          } catch {
            return { productId, isPurchasable: true };
          }
        }),
      );
      if (cancelled) return;
      const next: Record<string, boolean> = {};
      results.forEach(({ productId, isPurchasable }) => {
        next[productId] = isPurchasable;
      });
      setPurchasabilityByProductId((prev) => ({ ...prev, ...next }));
    };
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [
    cardsVersion,
    openQuickView,
    isEnableProduct,
    useTextContentForSku,
    computeIsPurchasable,
  ]);

  return purchasabilityByProductId;
}
