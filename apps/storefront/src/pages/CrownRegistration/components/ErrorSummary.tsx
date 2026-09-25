import styled from '@emotion/styled';

import { useB3Lang } from '@/lib/lang';

import { crownColors, crownFonts } from '../tokens';

const MAX_SHOWN = 3;

const Banner = styled.div`
  margin-top: 24px;
  border: 1px solid ${crownColors.red};
  background: ${crownColors.errorSurface};
  padding: 14px 18px;
  display: flex;
  gap: 12px;
`;

const BannerLabel = styled.span`
  font-family: ${crownFonts.cond};
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${crownColors.redHover};
`;

const BannerText = styled.span`
  font-size: 15px;
  color: ${crownColors.bodyText};
`;

interface ErrorSummaryProps {
  // already translated, in field order
  messages: string[];
}

export function ErrorSummary({ messages }: ErrorSummaryProps) {
  const b3Lang = useB3Lang();

  if (messages.length === 0) {
    return null;
  }

  const shown = messages.slice(0, MAX_SHOWN).join(' · ');
  const extra = messages.length - MAX_SHOWN;
  const text =
    extra > 0
      ? `${shown} · ${b3Lang('crownRegistration.errorSummary.more', { count: extra })}`
      : shown;

  return (
    <Banner role="alert">
      <BannerLabel>{b3Lang('crownRegistration.errorSummary.check')}</BannerLabel>
      <BannerText>{text}</BannerText>
    </Banner>
  );
}
