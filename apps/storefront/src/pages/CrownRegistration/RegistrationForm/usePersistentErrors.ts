import { useCallback, useState } from 'react';

import { FormFieldName, PersistentErrorKey, PersistentFieldError } from './mapServerErrors';

export type PersistentErrors = Partial<Record<FormFieldName, PersistentErrorKey>>;

// The backend matches duplicate addresses on both street lines and the ZIP, so
// editing any of them makes a duplicate-address error stale.
const STALE_WHEN_EDITED: Partial<Record<FormFieldName, string[]>> = {
  bAddress1: ['bAddress1', 'bAddress2', 'bZip'],
  sAddress1: ['sAddress1', 'sAddress2', 'sZip'],
};

// Field errors that react-hook-form must not own: it drops an error on blur once
// client-side validation passes, and these carry a support email link the user has
// to be able to select and click. They stay until the field is edited or the form is
// submitted again.
export function usePersistentErrors() {
  const [persistentErrors, setPersistentErrors] = useState<PersistentErrors>({});

  // replaces every current error
  const replacePersistentErrors = useCallback((errors: PersistentFieldError[]) => {
    setPersistentErrors(Object.fromEntries(errors.map(({ field, messageKey }) => [field, messageKey])));
  }, []);

  const setPersistentError = useCallback((field: FormFieldName, messageKey: PersistentErrorKey) => {
    setPersistentErrors((current) => ({ ...current, [field]: messageKey }));
  }, []);

  // Pass the name of the field that was edited (or re-validated).
  const clearPersistentErrors = useCallback((changed: string) => {
    setPersistentErrors((current) => {
      const stale = (Object.keys(current) as FormFieldName[]).filter((field) =>
        (STALE_WHEN_EDITED[field] ?? [field]).includes(changed),
      );

      if (stale.length === 0) {
        return current;
      }

      const next = { ...current };
      stale.forEach((field) => delete next[field]);
      return next;
    });
  }, []);

  return { persistentErrors, replacePersistentErrors, setPersistentError, clearPersistentErrors };
}
