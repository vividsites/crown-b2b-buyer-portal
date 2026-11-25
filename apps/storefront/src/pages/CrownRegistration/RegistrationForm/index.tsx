import { useCallback, useEffect, useRef, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useB3Lang } from '@/lib/lang';

import { CrownCheckbox } from '../components/CrownCheckbox';
import { CrownTextField } from '../components/CrownTextField';
import { ErrorSummary } from '../components/ErrorSummary';
import { FormSection } from '../components/FormSection';
import { PageLink, PrimaryButton, ServerBanner, SubmitRow } from '../styled';

import { AddressFields } from './AddressFields';
import { AddressVerificationDialog } from './AddressVerificationDialog';
import { FormFieldName } from './mapServerErrors';
import { defaultRegistrationValues, RegistrationFormValues, registrationSchema } from './schema';
import { SupportContactError } from './SupportContactError';
import { Turnstile, TURNSTILE_HELPER_ID, TurnstileHandle } from './Turnstile';
import { useAddressVerification } from './useAddressVerification';
import { useEmailPrecheck } from './useEmailPrecheck';
import { usePersistentErrors } from './usePersistentErrors';
import { useRegions } from './useRegions';
import { useRegistrationSubmit } from './useRegistrationSubmit';

// The credentials the applicant just registered with. The parent uses them for the
// automatic login on an auto-approved account; they must never be rendered or kept.
export interface SubmittedCredentials {
  email: string;
  password: string;
}

interface RegistrationFormProps {
  onSubmitted: (credentials: SubmittedCredentials) => void;
}

// Section order, used to list client-side errors in reading order.
const FIELD_ORDER: FormFieldName[] = [
  'companyName',
  'firstName',
  'lastName',
  'email',
  'password',
  'confirmPassword',
  'phone',
  'bAddress1',
  'bAddress2',
  'bCity',
  'bState',
  'bZip',
  'sAddress1',
  'sAddress2',
  'sCity',
  'sState',
  'sZip',
  'privacyAcknowledged',
];

export function RegistrationForm({ onSubmitted }: RegistrationFormProps) {
  const b3Lang = useB3Lang();
  const { countries, getRegions } = useRegions();

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: defaultRegistrationValues,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });
  const { control, watch, clearErrors, handleSubmit } = form;

  const [summaryMessages, setSummaryMessages] = useState<string[]>([]);

  // editing a field clears its error right away
  useEffect(() => {
    const subscription = watch((_, { name, type }) => {
      if (name && type === 'change') {
        clearErrors(name);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, clearErrors]);

  const { persistentErrors, replacePersistentErrors, setPersistentError, clearPersistentErrors } =
    usePersistentErrors();

  const { onEmailBlur } = useEmailPrecheck(form, { setPersistentError, clearPersistentErrors });

  const handleSuccess = useCallback(
    (_result: { referenceId: string }, values: RegistrationFormValues) => {
      onSubmitted({ email: values.email.trim(), password: values.password });
    },
    [onSubmitted],
  );

  const turnstileRef = useRef<TurnstileHandle>(null);
  // the token lives in a ref so it is never rendered, stored or logged
  const tokenRef = useRef<string | null>(null);
  const [hasToken, setHasToken] = useState(false);

  const handleToken = useCallback((token: string | null) => {
    tokenRef.current = token;
    setHasToken(token !== null);
  }, []);
  const getToken = useCallback(() => tokenRef.current, []);
  const resetTurnstile = useCallback(() => turnstileRef.current?.reset(), []);

  const verification = useAddressVerification(form);

  const { submit, isSubmitting, isVerifying, bannerKey } = useRegistrationSubmit({
    form,
    countries,
    onSuccess: handleSuccess,
    getToken,
    verifyAddresses: verification.verifyAddresses,
    onFailure: resetTurnstile,
    replacePersistentErrors,
  });

  // Duplicate company/address errors survive blur; only editing the field clears them.
  useEffect(() => {
    const subscription = watch((_, { name, type }) => {
      if (name && type === 'change') {
        clearPersistentErrors(name);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, clearPersistentErrors]);

  const persistentErrorFor = (field: FormFieldName) => {
    const messageKey = persistentErrors[field];

    return messageKey ? <SupportContactError messageKey={messageKey} /> : undefined;
  };

  const sameAsBilling = watch('sameAsBilling');
  const existingCustomer = watch('existingCustomer');

  const onValid = () => {
    setSummaryMessages([]);
    return submit();
  };

  const onInvalid = (errors: FieldErrors<RegistrationFormValues>) => {
    const messages: string[] = [];
    FIELD_ORDER.forEach((field) => {
      const message = errors[field]?.message;
      if (message) {
        messages.push(b3Lang(message));
      }
    });
    setSummaryMessages(messages);
  };

  const privacyLabel = (
    <>
      {b3Lang('crownRegistration.field.privacyPrefix')}
      {/* TODO: Privacy Policy URL pending */}
      <PageLink
        href="https://crownpack.com/privacy-policy/"
        target="_blank"
        rel="noopener noreferrer"
      >
        {b3Lang('crownRegistration.field.privacyLink')}
      </PageLink>
      {b3Lang('crownRegistration.field.privacySuffix')}
    </>
  );

  let submitLabel = 'crownRegistration.button.submit';
  if (isVerifying) {
    submitLabel = 'crownRegistration.button.verifying';
  } else if (isSubmitting) {
    submitLabel = 'crownRegistration.button.submitting';
  }

  return (
    <>
      <form noValidate onSubmit={handleSubmit(onValid, onInvalid)}>
        <FormSection
          id="crown-reg-details"
          number="01"
          title={b3Lang('crownRegistration.section.details.title')}
          description={b3Lang('crownRegistration.section.details.description')}
        >
          <CrownCheckbox
            control={control}
            name="existingCustomer"
            label={b3Lang('crownRegistration.field.existingCustomer')}
            variant="plain"
            pairedField
          />
          <CrownTextField
            control={control}
            name="salesRepName"
            label={b3Lang('crownRegistration.field.salesRepName')}
            concealed={!existingCustomer}
          />
          <CrownTextField
            control={control}
            name="companyName"
            label={b3Lang('crownRegistration.field.companyName')}
            required
            maxLength={200}
            autoComplete="organization"
            persistentError={persistentErrorFor('companyName')}
          />
          <CrownTextField
            control={control}
            name="firstName"
            label={b3Lang('crownRegistration.field.firstName')}
            required
            maxLength={100}
            autoComplete="given-name"
          />
          <CrownTextField
            control={control}
            name="lastName"
            label={b3Lang('crownRegistration.field.lastName')}
            required
            maxLength={100}
            autoComplete="family-name"
          />
          <CrownTextField
            control={control}
            name="email"
            type="email"
            label={b3Lang('crownRegistration.field.email')}
            hint={b3Lang('crownRegistration.field.emailHint')}
            required
            maxLength={100}
            autoComplete="email"
            onBlur={onEmailBlur}
            persistentError={persistentErrorFor('email')}
          />
          <CrownTextField
            control={control}
            name="password"
            type="password"
            label={b3Lang('crownRegistration.field.password')}
            hint={b3Lang('crownRegistration.field.passwordHint')}
            required
            autoComplete="new-password"
          />
          <CrownTextField
            control={control}
            name="confirmPassword"
            type="password"
            label={b3Lang('crownRegistration.field.confirmPassword')}
            required
            autoComplete="new-password"
          />
          <CrownTextField
            control={control}
            name="phone"
            type="tel"
            label={b3Lang('crownRegistration.field.phone')}
            placeholder={b3Lang('crownRegistration.field.phonePlaceholder')}
            required
            maxLength={100}
            autoComplete="tel"
          />
        </FormSection>

        <FormSection
          id="crown-reg-billing"
          number="02"
          title={b3Lang('crownRegistration.section.billing.title')}
          description={b3Lang('crownRegistration.section.billing.description')}
        >
          <AddressFields
            prefix="b"
            control={control}
            getRegions={getRegions}
            address1Error={persistentErrorFor('bAddress1')}
          />
        </FormSection>

        <FormSection
          id="crown-reg-shipping"
          number="03"
          title={b3Lang('crownRegistration.section.shipping.title')}
          description={b3Lang('crownRegistration.section.shipping.description')}
        >
          <CrownCheckbox
            control={control}
            name="sameAsBilling"
            label={b3Lang('crownRegistration.field.sameAsBilling')}
            variant="boxed"
            fullRow
          />
          {!sameAsBilling && (
            <AddressFields
              prefix="s"
              control={control}
              getRegions={getRegions}
              address1Error={persistentErrorFor('sAddress1')}
            />
          )}
        </FormSection>

        <FormSection
          id="crown-reg-submit"
          number="04"
          title={b3Lang('crownRegistration.section.submit.title')}
          description=""
        >
          <CrownCheckbox
            control={control}
            name="privacyAcknowledged"
            label={privacyLabel}
            variant="plain"
            fullRow
            required
          />
          <SubmitRow>
            <Turnstile ref={turnstileRef} onToken={handleToken} />
            <ErrorSummary messages={summaryMessages} />
            {bannerKey && <ServerBanner role="alert">{b3Lang(bannerKey)}</ServerBanner>}
            <div>
              <PrimaryButton
                type="submit"
                disabled={isSubmitting || isVerifying || !hasToken}
                aria-describedby={hasToken ? undefined : TURNSTILE_HELPER_ID}
              >
                {b3Lang(submitLabel)}
              </PrimaryButton>
            </div>
          </SubmitRow>
        </FormSection>
      </form>
      {verification.dialogProps && <AddressVerificationDialog {...verification.dialogProps} />}
    </>
  );
}
