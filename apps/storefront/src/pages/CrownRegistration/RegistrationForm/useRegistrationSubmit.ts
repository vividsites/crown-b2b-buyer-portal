import { useCallback, useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

import { Country } from '@/shared/global/context/config';
import { registerBusinessAccount } from '@/shared/service/vs';

import { buildSubmission } from './buildSubmission';
import { mapServerErrors } from './mapServerErrors';
import { RegistrationFormValues } from './schema';
import { VerifyOutcome } from './useAddressVerification';

interface UseRegistrationSubmitArgs {
  form: Pick<UseFormReturn<RegistrationFormValues>, 'setError' | 'setFocus' | 'getValues'>;
  countries: Country[];
  onSuccess: (result: { referenceId: string }, values: RegistrationFormValues) => void;
  // The live Turnstile token, or null while there is none.
  getToken: () => string | null;
  verifyAddresses: () => Promise<VerifyOutcome>;
  // Called after every failed registration request: the token is single-use, so
  // the Turnstile widget has to be reset.
  onFailure: () => void;
}

export function useRegistrationSubmit({
  form,
  countries,
  onSuccess,
  getToken,
  verifyAddresses,
  onFailure,
}: UseRegistrationSubmitArgs) {
  const { setError, setFocus, getValues } = form;
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [bannerKey, setBannerKey] = useState<string | undefined>();

  const submit = useCallback(async () => {
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setBannerKey(undefined);

    const showMissingToken = () => setBannerKey('crownRegistration.error.turnstileMissing');

    try {
      if (!getToken()) {
        showMissingToken();
        return;
      }

      let outcome: VerifyOutcome;
      setIsVerifying(true);
      try {
        outcome = await verifyAddresses();
      } finally {
        setIsVerifying(false);
      }

      if (!outcome.ok) {
        // the token was not consumed, so the widget is left alone
        setFocus(outcome.field);
        return;
      }

      // The user may have applied a USPS suggestion, so the values from the
      // submit event are stale. The token may also have been refreshed or have
      // expired while the dialog was open.
      const fresh = getValues();
      const token = getToken();
      if (!token) {
        showMissingToken();
        return;
      }

      const built = buildSubmission(fresh, countries, token);

      if (!built.ok) {
        setError(built.field, {
          type: 'region',
          message: 'crownRegistration.error.regionNotFound',
        });
        setFocus(built.field);
        return;
      }

      try {
        const result = await registerBusinessAccount(built.submission);
        onSuccess({ referenceId: result.referenceId }, fresh);
      } catch (error) {
        const {
          fieldErrors,
          bannerKey: nextBannerKey,
          focusField,
        } = mapServerErrors(error, fresh.sameAsBilling);

        fieldErrors.forEach(({ field, message }) => {
          setError(field, { type: 'server', message });
        });
        setBannerKey(nextBannerKey);
        if (focusField) {
          setFocus(focusField);
        }
        onFailure();
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [countries, getToken, getValues, onFailure, onSuccess, setError, setFocus, verifyAddresses]);

  return { submit, isSubmitting, isVerifying, bannerKey };
}
