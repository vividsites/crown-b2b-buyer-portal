import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import cloneDeep from 'lodash-es/cloneDeep';

import {
  getContrastColor,
  getStyles,
  setMediaStyle,
  splitCustomCssValue,
} from '@/components/outSideComponents/utils/b3CustomStyles';
import { ADD_TO_QUOTE_DEFAULT_VALUE, TRANSLATION_ADD_TO_QUOTE_VARIABLE } from '@/constants';
import config from '@/lib/config';
import { useB3Lang } from '@/lib/lang';
import { CustomStyleContext } from '@/shared/customStyleButton';
import { BtnProperties } from '@/shared/customStyleButton/context/config';
import {
  resetDraftQuoteInfo,
  resetDraftQuoteList,
  setQuoteUserId,
  useAppDispatch,
  useAppSelector,
} from '@/store';
import { CustomerRole } from '@/types';
import { OpenPageState } from '@/types/hooks';
import { setCartPermissions } from '@/utils/b3CheckPermissions/juniorRolePermissions';

import { useFeatureFlags } from '../useFeatureFlags';
import { useGetButtonText } from '../useGetButtonText';
import { useIsBackorderValidationEnabled } from '../useIsBackorderValidationEnabled';

import useDomVariation from './useDomVariation';
import { usePurchasableQuoteCards } from './usePurchasableQuoteCards';
import { addProductFromProductCardToQuote, removeElement } from './utils';

const CATEGORY_QUOTE_BUTTON_CLASS = 'b2b-add-to-quote-category';
const CATEGORY_NO_PURCHASABLE_QUOTE_BUTTON_CLASS = 'b2b-add-to-no-purchasable-quote-category';
const STABLE_LISTENER_ATTR = 'data-b2b-quote-stable';

const clearCategoryQuoteDom = () => {
  const quoteButtons = document.querySelectorAll(
    `.${CATEGORY_QUOTE_BUTTON_CLASS}, .${CATEGORY_NO_PURCHASABLE_QUOTE_BUTTON_CLASS}`,
  );
  quoteButtons.forEach((button) => {
    removeElement(button);
  });
};

type DispatchProps = Dispatch<SetStateAction<OpenPageState>>;

interface UseMyQuoteCategoryProps {
  setOpenPage: DispatchProps;
  productQuoteEnabled: boolean;
  role: number | string;
  customerId?: number | string;
}

export const useMyQuoteCategory = ({
  setOpenPage,
  productQuoteEnabled,
  role,
}: UseMyQuoteCategoryProps) => {
  const b3Lang = useB3Lang();
  const dispatch = useAppDispatch();
  const isBackorderValidationEnabled = useIsBackorderValidationEnabled();
  const featureFlags = useFeatureFlags();

  const quoteDraftUserId = useAppSelector(({ quoteInfo }) => quoteInfo.draftQuoteInfo.userId);
  const b2bId = useAppSelector(({ company }) => company.customer.b2bId);
  const isEnableProduct =
    useAppSelector(({ global }) => global.blockPendingQuoteNonPurchasableOOS.isEnableProduct) ||
    false;

  useEffect(() => {
    const isLoginAndNotB2CAccount = role !== CustomerRole.GUEST && role !== CustomerRole.B2C;

    if (
      quoteDraftUserId &&
      isLoginAndNotB2CAccount &&
      Number(quoteDraftUserId) !== 0 &&
      Number(quoteDraftUserId) !== b2bId
    ) {
      dispatch(resetDraftQuoteInfo());
      dispatch(resetDraftQuoteList());
      if (typeof b2bId === 'number') {
        dispatch(setQuoteUserId(b2bId));
      }
    }
    // ignore dispatch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b2bId, role, quoteDraftUserId]);

  const { addToQuote, addLoading } = addProductFromProductCardToQuote(
    setOpenPage,
    isEnableProduct,
    b3Lang,
    isBackorderValidationEnabled,
    featureFlags,
  );

  const quoteCallBack = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const b2bLoading = document.querySelector('#b2b-div-loading');
      if (target && !b2bLoading) {
        addLoading(target);
        addToQuote(target);
      }
    },
    [addLoading, addToQuote],
  );

  const quoteCallBackRef = useRef(quoteCallBack);
  quoteCallBackRef.current = quoteCallBack;
  const stableQuoteListener = useCallback((e: Event) => {
    quoteCallBackRef.current(e as MouseEvent);
  }, []);

  const setCartPermissionsCallback = useCallback(() => {
    const isLoggedInAndB2BAccount = role !== CustomerRole.GUEST && role !== CustomerRole.B2C;

    setCartPermissions(isLoggedInAndB2BAccount);
  }, [role]);

  const [openQuickView] = useDomVariation(
    config['dom.productCard'],
    setCartPermissionsCallback,
  );

  const [cardsVersion, setCardsVersion] = useState(0);
  const productCardSelectorRef = useRef(config['dom.productCard']);
  productCardSelectorRef.current = config['dom.productCard'];

  useEffect(() => {
    const selector = productCardSelectorRef.current;

    const hasNewProductCard = (node: Node): boolean => {
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      const el = node as Element;
      if (el.matches?.(selector)) return true;
      return Boolean(el.querySelector?.(selector));
    };

    const observer = new MutationObserver((records: MutationRecord[]) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (hasNewProductCard(node)) {
            setCardsVersion((v) => v + 1);
            return;
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  const purchasabilityByProductId = usePurchasableQuoteCards(cardsVersion, openQuickView);

  const cachePurchasable = useRef<BtnProperties | null>(null);
  const cacheNonPurchasable = useRef<BtnProperties | null>(null);
  const {
    state: { addQuoteBtn, quoteOnNonPurchasableProductPageBtn },
  } = useContext(CustomStyleContext);

  const { color, text, customCss, classSelector, enabled } = addQuoteBtn;
  const {
    color: nonPurchasableColor,
    text: nonPurchasableText,
    customCss: nonPurchasableCustomCss,
    classSelector: nonPurchasableClassSelector,
    enabled: nonPurchasableEnabled,
  } = quoteOnNonPurchasableProductPageBtn;

  const purchasableButtonLabel = useGetButtonText(
    TRANSLATION_ADD_TO_QUOTE_VARIABLE,
    text,
    ADD_TO_QUOTE_DEFAULT_VALUE,
  );
  const nonPurchasableButtonLabel = useGetButtonText(
    TRANSLATION_ADD_TO_QUOTE_VARIABLE,
    nonPurchasableText,
    ADD_TO_QUOTE_DEFAULT_VALUE,
  );

  const { cssValue, mediaBlocks } = splitCustomCssValue(customCss);
  const {
    cssValue: nonPurchasableCssValue,
    mediaBlocks: nonPurchasableMediaBlocks,
  } = splitCustomCssValue(nonPurchasableCustomCss);

  const purchasableCustomTextColor =
    getStyles(cssValue).color || getContrastColor(color);
  const nonPurchasableCustomTextColor =
    getStyles(nonPurchasableCssValue).color ||
    getContrastColor(nonPurchasableColor);

  useEffect(() => {
    if (!productQuoteEnabled) {
      clearCategoryQuoteDom();
      return;
    }

    const cards = document.querySelectorAll<HTMLElement>(config['dom.productCard']);
    const insertSelector = config['dom.setToQuoteCategory'];

    if (!cards.length) return;

    quoteCallBackRef.current = quoteCallBack;

    cards.forEach((card) => {
      const productId = (
        card.querySelector('input[name=product_id]') as HTMLInputElement | null
      )?.value;
      const isProductPurchasable =
        productId === undefined
          ? true
          : purchasabilityByProductId[productId] !== false;

      const buttonClass = isProductPurchasable
        ? CATEGORY_QUOTE_BUTTON_CLASS
        : CATEGORY_NO_PURCHASABLE_QUOTE_BUTTON_CLASS;
      const buttonProperties = isProductPurchasable
        ? addQuoteBtn
        : quoteOnNonPurchasableProductPageBtn;
      const cacheRef = isProductPurchasable ? cachePurchasable : cacheNonPurchasable;
      const quoteButtonLabel = isProductPurchasable
        ? purchasableButtonLabel
        : nonPurchasableButtonLabel;
      const buttonCss = isProductPurchasable ? customCss : nonPurchasableCustomCss;
      const buttonColor = isProductPurchasable ? color : nonPurchasableColor;
      const buttonTextColor = isProductPurchasable
        ? purchasableCustomTextColor
        : nonPurchasableCustomTextColor;
      const buttonClassSelector = isProductPurchasable
        ? classSelector
        : nonPurchasableClassSelector;
      const buttonMediaBlocks = isProductPurchasable
        ? mediaBlocks
        : nonPurchasableMediaBlocks;

      const cacheQuoteDom = cacheRef.current;
      const isSameStyles =
        cacheQuoteDom &&
        Object.keys(cacheQuoteDom).every(
          (key) =>
            cacheQuoteDom[key as keyof BtnProperties] ===
            buttonProperties[key as keyof BtnProperties],
        );
      const shouldRenderButton = isProductPurchasable ? enabled : nonPurchasableEnabled;

      const insertPoint = card.querySelector<HTMLElement>(insertSelector);
      const container = insertPoint ?? card;

      const existingButton = container.querySelector<HTMLElement>(
        `.${CATEGORY_QUOTE_BUTTON_CLASS}, .${CATEGORY_NO_PURCHASABLE_QUOTE_BUTTON_CLASS}`,
      );
      if(existingButton && !shouldRenderButton) {
        removeElement(existingButton);
      }
      else if (existingButton) {
        const hasStableListener = existingButton.getAttribute(STABLE_LISTENER_ATTR) === 'true';
        if (!hasStableListener) {
          removeElement(existingButton);
        } else {
          const existingIsPurchasable = existingButton.classList.contains(
            CATEGORY_QUOTE_BUTTON_CLASS,
          );
          if (existingIsPurchasable !== isProductPurchasable) {
            removeElement(existingButton);
          } else {
            if (!isSameStyles) {
              existingButton.innerHTML = quoteButtonLabel;
              existingButton.setAttribute('style', buttonCss);
              existingButton.style.backgroundColor = buttonColor;
              existingButton.style.color = buttonTextColor;
              existingButton.setAttribute(
                'class',
                `${buttonClass} ${buttonClassSelector}`.trim(),
              );
              setMediaStyle(
                buttonMediaBlocks,
                `${buttonClass} ${buttonClassSelector}`.trim(),
              );
            }
            return;
          }
        }
      }
      else if(shouldRenderButton) {
        const quoteButton = document.createElement('div');
        quoteButton.innerHTML = quoteButtonLabel;
        quoteButton.setAttribute('role', 'button');
        quoteButton.setAttribute('style', buttonCss);
        quoteButton.style.backgroundColor = buttonColor;
        quoteButton.style.color = buttonTextColor;
        quoteButton.setAttribute('class', `${buttonClass} ${buttonClassSelector}`.trim());
        quoteButton.setAttribute(STABLE_LISTENER_ATTR, 'true');
        quoteButton.addEventListener('click', stableQuoteListener, {
          capture: true,
        });

        setMediaStyle(buttonMediaBlocks, `${buttonClass} ${buttonClassSelector}`.trim());

        container.appendChild(quoteButton);
      }
    });

    if (cards.length > 0) {
      cachePurchasable.current = cloneDeep(addQuoteBtn);
      cacheNonPurchasable.current = cloneDeep(quoteOnNonPurchasableProductPageBtn);
    }
  }, [
    addQuoteBtn,
    cardsVersion,
    classSelector,
    color,
    customCss,
    enabled,
    mediaBlocks,
    nonPurchasableClassSelector,
    nonPurchasableColor,
    nonPurchasableCustomCss,
    nonPurchasableCustomTextColor,
    nonPurchasableEnabled,
    nonPurchasableMediaBlocks,
    nonPurchasableButtonLabel,
    openQuickView,
    productQuoteEnabled,
    purchasabilityByProductId,
    purchasableButtonLabel,
    purchasableCustomTextColor,
    quoteCallBack,
    quoteOnNonPurchasableProductPageBtn,
    stableQuoteListener,
  ]);
};
