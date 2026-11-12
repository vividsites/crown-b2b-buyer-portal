import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { B3Card } from '@/components/B3Card';
import { useScrollBar } from '@/hooks/useScrollBar';
import { useB3Lang } from '@/lib/lang';
import { CustomStyleContext } from '@/shared/customStyleButton';
import { GlobalContext } from '@/shared/global';

import { type PageProps } from '../PageProps';

import { ConfirmationState, RegistrationConfirmation } from './RegistrationConfirmation';
import { RegistrationForm, SubmittedCredentials } from './RegistrationForm';
import {
  Card,
  CardBody,
  CardHeader,
  ContentColumn,
  HeaderPrompt,
  HeaderRow,
  LogoImage,
  PageFooter,
  PageIntro,
  PageLink,
  PageRoot,
  PageRouterLink,
  PageTitle,
} from './styled';
import { useAutoLogin } from './useAutoLogin';
import { useTypekitFonts } from './useTypekitFonts';

const SUPPORT_EMAIL = 'CrownCommerceSupport@crownpack.com';

export default function CrownRegistration({ setOpenPage }: PageProps) {
  const b3Lang = useB3Lang();
  const navigate = useNavigate();
  const {
    state: { logo, isLogoLoaded, registerEnabled },
  } = useContext(GlobalContext);

  const {
    state: { companyAutoApproval },
  } = useContext(CustomStyleContext);
  const autoLogin = useAutoLogin();

  // null while the form is showing
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);

  // registerEnabled mirrors the B2B "Trade professional application" storefront setting
  useEffect(() => {
    if (!registerEnabled) {
      navigate('/login');
    }
  }, [navigate, registerEnabled]);

  useScrollBar(false);
  useTypekitFonts();

  // Same rule the stock BC-to-B2B registration uses: the B2B "company auto approval"
  // storefront setting. Auto-approved accounts are logged in straight away; the
  // credentials only pass through this callback and are never put in state.
  const handleSubmitted = useCallback(
    (credentials: SubmittedCredentials) => {
      if (!companyAutoApproval.enabled) {
        setConfirmation('pending');
        return;
      }

      setConfirmation('signingIn');
      autoLogin(credentials).then((loggedIn) => {
        if (!loggedIn) {
          setConfirmation('signInFailed');
        }
      });
    },
    [autoLogin, companyAutoApproval.enabled],
  );

  return (
    <B3Card setOpenPage={setOpenPage}>
      <PageRoot>
        <ContentColumn>
          <HeaderRow>
            {isLogoLoaded && logo ? (
              <LogoImage src={logo} alt={b3Lang('global.tips.registerLogo')} />
            ) : (
              <span />
            )}
            <HeaderPrompt>
              {b3Lang('crownRegistration.page.signInPrompt')}{' '}
              <PageRouterLink to="/login">{b3Lang('crownRegistration.page.signIn')}</PageRouterLink>
            </HeaderPrompt>
          </HeaderRow>

          <Card>
            {confirmation ? (
              <RegistrationConfirmation state={confirmation} />
            ) : (
              <>
                <CardHeader>
                  <PageTitle>{b3Lang('crownRegistration.page.title')}</PageTitle>
                  <PageIntro>{b3Lang('crownRegistration.page.intro')}</PageIntro>
                </CardHeader>
                <CardBody>
                  <RegistrationForm onSubmitted={handleSubmitted} />
                </CardBody>
              </>
            )}
          </Card>

          <PageFooter>
            {b3Lang('crownRegistration.page.helpPrompt')}{' '}
            <PageLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</PageLink>
          </PageFooter>
        </ContentColumn>
      </PageRoot>
    </B3Card>
  );
}
