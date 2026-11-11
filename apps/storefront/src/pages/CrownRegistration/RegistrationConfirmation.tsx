import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';

import { useB3Lang } from '@/lib/lang';
import { getHomeUrl } from '@/lib/lang/getHomeUrl';
import { type SetOpenPage } from '@/pages/SetOpenPage';
import { GlobalContext } from '@/shared/global';
import { useAppSelector } from '@/store';

import { SubmittedSummary } from './RegistrationForm';
import {
  ActionRow,
  ConfirmationBody,
  ConfirmationRoot,
  ConfirmationTitle,
  Eyebrow,
  GhostButton,
  SecondaryButton,
  SummaryBox,
} from './styled';
import { crownColors } from './tokens';

const Strong = styled.strong`
  color: ${crownColors.navy};
`;

interface RegistrationConfirmationProps {
  summary: SubmittedSummary;
  onAnother: () => void;
  setOpenPage: SetOpenPage;
}

export function RegistrationConfirmation({
  summary,
  onAnother,
  setOpenPage,
}: RegistrationConfirmationProps) {
  const b3Lang = useB3Lang();
  const navigate = useNavigate();
  const locales = useAppSelector(({ global }) => global.locales);
  const {
    state: { isCloseGotoBCHome },
  } = useContext(GlobalContext);

  // same behaviour as the stock close button (RegisteredCloseButton)
  const handleBrowse = () => {
    const isInLoginPage = window.location.hash.startsWith('#/login');
    if (isCloseGotoBCHome || isInLoginPage) {
      window.location.href = getHomeUrl(locales);
    } else {
      navigate('/');
      setOpenPage({ isOpen: false, openUrl: '' });
    }

    window.history.replaceState(null, '', window.location.pathname || '/');
  };

  return (
    <ConfirmationRoot>
      <Eyebrow>{b3Lang('crownRegistration.confirmation.eyebrow')}</Eyebrow>
      <ConfirmationTitle>{b3Lang('crownRegistration.confirmation.title')}</ConfirmationTitle>
      <ConfirmationBody>
        {b3Lang('crownRegistration.confirmation.bodyPrefix')}
        <Strong>{summary.email}</Strong>
        {b3Lang('crownRegistration.confirmation.bodySuffix')}
      </ConfirmationBody>
      <SummaryBox>
        <div>
          <dt>{b3Lang('crownRegistration.confirmation.company')}</dt>
          <dd>{summary.companyName}</dd>
        </div>
        <div>
          <dt>{b3Lang('crownRegistration.confirmation.contact')}</dt>
          <dd>{summary.contactName}</dd>
        </div>
        <div>
          <dt>{b3Lang('crownRegistration.confirmation.reference')}</dt>
          <dd>{summary.referenceId}</dd>
        </div>
      </SummaryBox>
      <ActionRow>
        <SecondaryButton type="button" onClick={handleBrowse}>
          {b3Lang('crownRegistration.confirmation.browse')}
        </SecondaryButton>
        <GhostButton type="button" onClick={onAnother}>
          {b3Lang('crownRegistration.confirmation.another')}
        </GhostButton>
      </ActionRow>
    </ConfirmationRoot>
  );
}
