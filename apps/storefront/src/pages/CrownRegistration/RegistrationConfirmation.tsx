import { useNavigate } from 'react-router-dom';

import { useB3Lang } from '@/lib/lang';

import {
  ActionRow,
  ConfirmationBody,
  ConfirmationRoot,
  ConfirmationTitle,
  SecondaryButton,
} from './styled';

// signingIn: auto-approved, the login is in progress (usually only visible briefly)
// pending: waiting for approval
// signInFailed: auto-approved, but the automatic login failed
export type ConfirmationState = 'signingIn' | 'pending' | 'signInFailed';

interface RegistrationConfirmationProps {
  state: ConfirmationState;
}

export function RegistrationConfirmation({ state }: RegistrationConfirmationProps) {
  const b3Lang = useB3Lang();
  const navigate = useNavigate();

  return (
    <ConfirmationRoot role="status" aria-live="polite">
      <ConfirmationTitle>
        {b3Lang(`crownRegistration.confirmation.${state}.title`)}
      </ConfirmationTitle>
      <ConfirmationBody>{b3Lang(`crownRegistration.confirmation.${state}.body`)}</ConfirmationBody>
      {state !== 'signingIn' && (
        <ActionRow>
          <SecondaryButton type="button" onClick={() => navigate('/login')}>
            {b3Lang('crownRegistration.confirmation.signIn')}
          </SecondaryButton>
        </ActionRow>
      )}
    </ConfirmationRoot>
  );
}
