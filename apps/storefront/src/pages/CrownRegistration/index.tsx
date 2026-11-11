import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { B3Card } from '@/components/B3Card';
import { useScrollBar } from '@/hooks/useScrollBar';
import { useB3Lang } from '@/lib/lang';
import { GlobalContext } from '@/shared/global';

import { type PageProps } from '../PageProps';

import { RegistrationConfirmation } from './RegistrationConfirmation';
import { RegistrationForm, SubmittedSummary } from './RegistrationForm';
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
import { useTypekitFonts } from './useTypekitFonts';

const SUPPORT_EMAIL = 'CrownCommerceSupport@crownpack.com';

export default function CrownRegistration({ setOpenPage }: PageProps) {
  const b3Lang = useB3Lang();
  const navigate = useNavigate();
  const {
    state: { logo, isLogoLoaded, registerEnabled },
  } = useContext(GlobalContext);

  const [submitted, setSubmitted] = useState<SubmittedSummary | null>(null);
  const [resetKey, setResetKey] = useState(0);

  // registerEnabled mirrors the B2B "Trade professional application" storefront setting
  useEffect(() => {
    if (!registerEnabled) {
      navigate('/login');
    }
  }, [navigate, registerEnabled]);

  useScrollBar(false);
  useTypekitFonts();

  const handleAnother = useCallback(() => {
    setSubmitted(null);
    setResetKey((key) => key + 1);
  }, []);

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
            {submitted ? (
              <RegistrationConfirmation
                summary={submitted}
                onAnother={handleAnother}
                setOpenPage={setOpenPage}
              />
            ) : (
              <>
                <CardHeader>
                  <PageTitle>{b3Lang('crownRegistration.page.title')}</PageTitle>
                  <PageIntro>{b3Lang('crownRegistration.page.intro')}</PageIntro>
                </CardHeader>
                <CardBody>
                  <RegistrationForm key={resetKey} onSubmitted={setSubmitted} />
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
