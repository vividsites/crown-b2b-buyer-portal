import { useCallback, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';

import { checkUserEmail } from '@/shared/service/b2b';
import b2bLogger from '@/utils/b3Logger';
import { channelId } from '@/utils/basicConfig';

import { PersistentErrorKey } from './mapServerErrors';
import { RegistrationFormValues } from './schema';

// Early duplicate-email check on blur. The server re-checks on submit, so a
// failed lookup is logged and otherwise ignored.
export function useEmailPrecheck(
  form: Pick<UseFormReturn<RegistrationFormValues>, 'trigger'>,
  // the duplicate error is not kept in the form state, so that it survives blur
  persistentErrors: {
    setPersistentError: (field: 'email', messageKey: PersistentErrorKey) => void;
    clearPersistentErrors: (field: string) => void;
  },
) {
  const { trigger } = form;
  const { setPersistentError, clearPersistentErrors } = persistentErrors;
  const latestRequestRef = useRef(0);

  const onEmailBlur = useCallback(
    async (value: string) => {
      // reuse the schema rules (format, company email) and wait for them so the
      // result cannot race with the blur validation
      const isFormatValid = await trigger('email');
      if (!isFormatValid) {
        return;
      }

      latestRequestRef.current += 1;
      const requestId = latestRequestRef.current;

      try {
        const { isValid } = await checkUserEmail({ email: value.trim(), channelId });

        if (requestId !== latestRequestRef.current) {
          return;
        }

        if (isValid) {
          clearPersistentErrors('email');
        } else {
          setPersistentError('email', 'crownRegistration.error.emailExists');
        }
      } catch (error) {
        b2bLogger.error(error);
      }
    },
    [trigger, setPersistentError, clearPersistentErrors],
  );

  return { onEmailBlur };
}
