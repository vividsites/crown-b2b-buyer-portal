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
import { Turnstile, TURNSTILE_HELPER_ID, TurnstileHandle } from './Turnstile';
import { useAddressVerification } from './useAddressVerification';
import { useEmailPrecheck } from './useEmailPrecheck';
import { useRegions } from './useRegions';
import { useRegistrationSubmit } from './useRegistrationSubmit';

export interface SubmittedSummary {
  referenceId: string;
  email: string;
  companyName: string;
  contactName: string;
}

interface RegistrationFormProps {
  onSubmitted: (summary: SubmittedSummary) => void;
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
  'bCountry',
  'bState',
  'bZip',
  'sAddress1',
  'sAddress2',
  'sCity',
  'sCountry',
  'sState',
  'sZip',
  'privacyAcknowledged',
];

// Remount the form with a new `key` to reset it.
export function RegistrationForm({ onSubmitted }: RegistrationFormProps) {
  const b3Lang = useB3Lang();
  const { countries, getRegions } = useRegions();

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: defaultRegistrationValues,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });
  const { control, watch, clearErrors, setValue, handleSubmit } = form;

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

  const { onEmailBlur } = useEmailPrecheck(form);

  const handleSuccess = useCallback(
    ({ referenceId }: { referenceId: string }, values: RegistrationFormValues) => {
      onSubmitted({
        referenceId,
        email: values.email.trim(),
        companyName: values.companyName.trim(),
        contactName: `${values.firstName.trim()} ${values.lastName.trim()}`,
      });
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
  });

  const sameAsBilling = watch('sameAsBilling');

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
      <PageLink href="#" target="_blank" rel="noopener noreferrer">
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
            fullRow
          />
          <CrownTextField
            control={control}
            name="companyName"
            label={b3Lang('crownRegistration.field.companyName')}
            required
            autoComplete="organization"
          />
          <CrownTextField
            control={control}
            name="firstName"
            label={b3Lang('crownRegistration.field.firstName')}
            required
            autoComplete="given-name"
          />
          <CrownTextField
            control={control}
            name="lastName"
            label={b3Lang('crownRegistration.field.lastName')}
            required
            autoComplete="family-name"
          />
          <CrownTextField
            control={control}
            name="email"
            type="email"
            label={b3Lang('crownRegistration.field.email')}
            hint={b3Lang('crownRegistration.field.emailHint')}
            required
            autoComplete="email"
            onBlur={onEmailBlur}
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
            setValue={setValue}
            clearErrors={clearErrors}
            getRegions={getRegions}
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
              setValue={setValue}
              clearErrors={clearErrors}
              getRegions={getRegions}
            />
          )}
        </FormSection>

        <FormSection
          id="crown-reg-submit"
          number="04"
          title={b3Lang('crownRegistration.section.submit.title')}
          description={b3Lang('crownRegistration.section.submit.description')}
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
