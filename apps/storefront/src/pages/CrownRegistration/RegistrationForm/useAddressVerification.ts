import { useCallback, useEffect, useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

import { RegistrationAddress, validateAddress } from '@/shared/service/vs';
import b2bLogger from '@/utils/b3Logger';

import {
  addressFieldUpdates,
  addressKey,
  getAddressesToVerify,
  prefixFor,
  primaryField,
} from './addressVerification';
import { AddressChoice, AddressVerificationDialogProps } from './AddressVerificationDialog';
import { RegistrationFormValues } from './schema';

export type VerifyOutcome = { ok: true } | { ok: false; field: 'bAddress1' | 'sAddress1' };

interface PendingPrompt {
  props: Omit<AddressVerificationDialogProps, 'onUse' | 'onEdit' | 'open'>;
  settle: (result: AddressChoice | 'edit') => void;
}

type VerificationForm = Pick<UseFormReturn<RegistrationFormValues>, 'getValues' | 'setValue'>;

export function useAddressVerification({ getValues, setValue }: VerificationForm) {
  // Addresses the user already decided on (or USPS already confirmed). A retry
  // after a server error must not prompt or call USPS again for these.
  const decided = useRef(new Set<string>());
  const pendingRef = useRef<PendingPrompt | null>(null);
  const [prompt, setPrompt] = useState<PendingPrompt | null>(null);

  const ask = useCallback(
    (props: PendingPrompt['props']) =>
      new Promise<AddressChoice | 'edit'>((resolve) => {
        const pending: PendingPrompt = {
          props,
          settle: (result) => {
            pendingRef.current = null;
            setPrompt(null);
            resolve(result);
          },
        };
        pendingRef.current = pending;
        setPrompt(pending);
      }),
    [],
  );

  // Do not leave the submit hanging if the form unmounts with a prompt open.
  useEffect(
    () => () => {
      pendingRef.current?.settle('edit');
    },
    [],
  );

  const verifyAddresses = useCallback(async (): Promise<VerifyOutcome> => {
    const entries = getAddressesToVerify(getValues());

    for (let i = 0; i < entries.length; i += 1) {
      const { scope, address } = entries[i];
      const enteredKey = addressKey(address);

      if (!decided.current.has(enteredKey)) {
        let suggested: RegistrationAddress | undefined;
        let changes: string[] = [];

        try {
          // eslint-disable-next-line no-await-in-loop
          const result = await validateAddress(address);
          if (result.status === 'corrected' && result.suggested) {
            suggested = result.suggested;
            changes = result.changes ?? [];
          } else {
            decided.current.add(enteredKey);
          }
        } catch (error) {
          // Verification never blocks a submit; not remembered so a retry may succeed.
          b2bLogger.error('Address validation failed', error);
        }

        if (suggested) {
          // eslint-disable-next-line no-await-in-loop
          const choice = await ask({ scope, entered: address, suggested, changes });
          const prefix = prefixFor(scope);

          if (choice === 'edit') {
            return { ok: false, field: primaryField(prefix) };
          }

          decided.current.add(enteredKey);
          if (choice === 'suggested') {
            decided.current.add(addressKey(suggested));
            const updates = addressFieldUpdates(prefix, suggested);
            (Object.keys(updates) as (keyof RegistrationFormValues)[]).forEach((field) => {
              setValue(field, updates[field] as never, { shouldDirty: true });
            });
          }
        }
      }
    }

    return { ok: true };
  }, [ask, getValues, setValue]);

  const dialogProps: AddressVerificationDialogProps | null = prompt
    ? {
        ...prompt.props,
        open: true,
        onUse: (choice) => prompt.settle(choice),
        onEdit: () => prompt.settle('edit'),
      }
    : null;

  return { verifyAddresses, dialogProps };
}
