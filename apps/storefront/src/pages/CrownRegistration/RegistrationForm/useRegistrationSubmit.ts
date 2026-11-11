import { useCallback, useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

import { Country } from '@/shared/global/context/config';
import { registerBusinessAccount } from '@/shared/service/vs';

import { buildSubmission, DEV_TURNSTILE_TOKEN } from './buildSubmission';
import { mapServerErrors } from './mapServerErrors';
import { RegistrationFormValues } from './schema';

interface UseRegistrationSubmitArgs {
  form: Pick<UseFormReturn<RegistrationFormValues>, 'setError' | 'setFocus'>;
  countries: Country[];
  onSuccess: (result: { referenceId: string }, values: RegistrationFormValues) => void;
  // Phase 3 hook point: reset the Turnstile widget. No-op for now.
  onFailure?: () => void;
}

export function useRegistrationSubmit({
  form,
  countries,
  onSuccess,
  onFailure,
}: UseRegistrationSubmitArgs) {
  const { setError, setFocus } = form;
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerKey, setBannerKey] = useState<string | undefined>();

  const submit = useCallback(
    async (values: RegistrationFormValues) => {
      if (isSubmittingRef.current) {
        return;
      }
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setBannerKey(undefined);

      try {
        const built = buildSubmission(values, countries, DEV_TURNSTILE_TOKEN);

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
          onSuccess({ referenceId: result.referenceId }, values);
        } catch (error) {
          const {
            fieldErrors,
            bannerKey: nextBannerKey,
            focusField,
          } = mapServerErrors(error, values.sameAsBilling);

          fieldErrors.forEach(({ field, message }) => {
            setError(field, { type: 'server', message });
          });
          setBannerKey(nextBannerKey);
          if (focusField) {
            setFocus(focusField);
          }
          onFailure?.();
        }
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [countries, onFailure, onSuccess, setError, setFocus],
  );

  return { submit, isSubmitting, bannerKey };
}
