import { useCallback, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';

import { checkUserEmail } from '@/shared/service/b2b';
import b2bLogger from '@/utils/b3Logger';
import { channelId } from '@/utils/basicConfig';

import { RegistrationFormValues } from './schema';

// Early duplicate-email check on blur. The server re-checks on submit, so a
// failed lookup is logged and otherwise ignored.
export function useEmailPrecheck(
  form: Pick<UseFormReturn<RegistrationFormValues>, 'trigger' | 'setError'>,
) {
  const { trigger, setError } = form;
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

        if (!isValid) {
          setError('email', { type: 'server', message: 'crownRegistration.error.emailExists' });
        }
      } catch (error) {
        b2bLogger.error(error);
      }
    },
    [trigger, setError],
  );

  return { onEmailBlur };
}
