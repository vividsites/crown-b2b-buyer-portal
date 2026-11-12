import { useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { GlobalContext } from '@/shared/global';
import { bcLogin } from '@/shared/service/bc';
import b2bLogger from '@/utils/b3Logger';
import { loginJump } from '@/utils/b3Login';
import { B3SStorage } from '@/utils/b3Storage';
import { getCurrentCustomerInfo } from '@/utils/loginInfo';

import { loginCheckout } from '../Login/helper';

export interface LoginCredentials {
  email: string;
  password: string;
}

// Logs the customer in right after an auto-approved registration. This mirrors
// `handleFinish` in src/pages/Registered/index.tsx, minus the RegisteredContext
// bookkeeping (loading flag, clearRegisterInfo) that the Crown page doesn't have.
//
// NOTE: the stock handleFinish also has a Catalyst branch. When isCatalystPlatform()
// is true it dispatches the `on-registered` callback with { email, password,
// landingLoginLocation } (landing location is CHECKOUT when the `redirectTo` search
// param is `check-out`), then clears the URL hash instead of navigating. That branch
// is deliberately NOT implemented here because Crown does not run Catalyst. If that
// changes, port it from Registered/index.tsx. (loginJump already returns false on
// Catalyst, so the code below would silently skip navigation there.)
//
// Resolves true once the login went through (the page is navigating away or
// reloading), false if it failed. Failures are logged and never thrown.
export function useAutoLogin() {
  const navigate = useNavigate();
  const {
    state: { isCheckout, isCloseGotoBCHome },
  } = useContext(GlobalContext);

  return useCallback(
    async ({ email, password }: LoginCredentials): Promise<boolean> => {
      try {
        if (isCheckout) {
          await loginCheckout({ email, password });
          window.location.reload();

          return true;
        }

        const customer = await bcLogin({ email, password }).then(
          (res) => res?.data?.login?.customer,
        );

        if (!customer) {
          throw new Error('Automatic sign-in after registration did not return a customer');
        }

        B3SStorage.set('loginCustomer', {
          emailAddress: customer.email,
          phoneNumber: customer.phone,
          ...customer,
        });

        await getCurrentCustomerInfo();

        // loginJump navigates itself (and returns false) when the landing location is home
        if (!loginJump(navigate)) {
          return true;
        }

        if (isCloseGotoBCHome) {
          window.location.href = '/';
        } else {
          navigate('/orders');
        }

        return true;
      } catch (error) {
        b2bLogger.error(error);

        return false;
      }
    },
    [isCheckout, isCloseGotoBCHome, navigate],
  );
}
