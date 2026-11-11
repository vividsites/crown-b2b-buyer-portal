import { Link } from 'react-router-dom';
import styled from '@emotion/styled';

import { crownColors, crownFonts, crownMedia } from './tokens';

// Page shell

export const PageRoot = styled.div`
  background: ${crownColors.pageGround};
  padding: 32px 24px 64px;
  color: ${crownColors.navy};
  font-family: ${crownFonts.body};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;

  ${crownMedia.stacked} {
    padding: 24px 16px 48px;
  }
`;

export const ContentColumn = styled.div`
  max-width: 1180px;
  width: 100%;
`;

export const Card = styled.div`
  background: ${crownColors.surface};
  border: 1px solid ${crownColors.border};
  border-top: 3px solid ${crownColors.navy};
  border-radius: 0;
  box-shadow: none;
`;

export const CardHeader = styled.div`
  padding: 36px 40px 28px;
  border-bottom: 1px solid ${crownColors.divider};

  & > * {
    max-width: 620px;
  }

  ${crownMedia.stacked} {
    padding: 28px 20px 20px;
  }
`;

export const CardBody = styled.div`
  padding: 28px 40px 40px;

  ${crownMedia.stacked} {
    padding-left: 20px;
    padding-right: 20px;
  }
`;

// Sections

export const SectionGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(150px, 240px) minmax(0, 1fr);
  gap: 8px 40px;
  padding: 24px 0;
  border-bottom: 1px solid ${crownColors.divider};

  &:last-of-type {
    border-bottom: none;
  }

  ${crownMedia.stacked} {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const RailTitle = styled.h2`
  font-family: ${crownFonts.comp};
  font-weight: 600;
  font-size: clamp(16px, calc(8px + 0.85vw), 24px);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  margin: 0 0 6px;
  color: ${crownColors.navy};
`;

export const RailDescription = styled.p`
  font-size: 14px;
  line-height: 1.45;
  color: ${crownColors.mutedText};
  margin: 0;
`;

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px 20px;
  align-content: start;
`;

export const FullRow = styled.div`
  grid-column: 1 / -1;
`;

// Buttons

export const PrimaryButton = styled.button`
  padding: 16px 34px;
  background: ${crownColors.red};
  color: ${crownColors.surface};
  border: none;
  font-family: ${crownFonts.comp};
  font-weight: 700;
  font-size: 17px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${crownColors.redHover};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const SecondaryButton = styled.button`
  padding: 13px 26px;
  background: ${crownColors.navy};
  color: ${crownColors.surface};
  border: none;
  font-family: ${crownFonts.comp};
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${crownColors.black};
  }
`;

export const GhostButton = styled.button`
  padding: 13px 26px;
  background: transparent;
  color: ${crownColors.navy};
  border: 1px solid ${crownColors.fieldUnderline};
  font-family: ${crownFonts.comp};
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${crownColors.navy};
  }
`;

// Page header and footer

export const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
`;

export const LogoImage = styled.img`
  height: 44px;
  width: auto;
`;

export const HeaderPrompt = styled.span`
  font-size: 14px;
  color: ${crownColors.mutedText};
`;

const pageLinkStyles = `
  color: ${crownColors.red};
  font-weight: 700;
  text-decoration: none;

  &:hover {
    color: ${crownColors.redHover};
    text-decoration: underline;
  }
`;

export const PageLink = styled.a`
  ${pageLinkStyles}
`;

export const PageRouterLink = styled(Link)`
  ${pageLinkStyles}
`;

export const PageFooter = styled.p`
  margin: 20px 0 0;
  font-size: 13.5px;
  color: ${crownColors.mutedText};
`;

export const PageTitle = styled.h1`
  font-family: ${crownFonts.comp};
  font-weight: 600;
  font-size: 40px;
  line-height: 1.05;
  letter-spacing: 0.01em;
  margin: 0 0 10px;
  color: ${crownColors.navy};
`;

export const PageIntro = styled.p`
  font-size: 16px;
  line-height: 1.5;
  color: ${crownColors.bodyText};
  margin: 0;
`;

// Submit section

export const ServerBanner = styled.div`
  grid-column: 1 / -1;
  border: 1px solid ${crownColors.red};
  background: ${crownColors.errorSurface};
  padding: 14px 18px;
  font-size: 15px;
  color: ${crownColors.bodyText};
`;

export const SubmitRow = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

// Confirmation

export const ConfirmationRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 720px;
  padding: 64px 48px;

  ${crownMedia.stacked} {
    padding: 40px 20px;
  }
`;

export const Eyebrow = styled.span`
  font-family: ${crownFonts.cond};
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${crownColors.red};
`;

export const ConfirmationTitle = styled.h1`
  font-family: ${crownFonts.comp};
  font-weight: 600;
  font-size: 40px;
  line-height: 1.1;
  margin: 0;
  color: ${crownColors.navy};
`;

export const ConfirmationBody = styled.p`
  font-size: 17px;
  line-height: 1.55;
  color: ${crownColors.bodyText};
  margin: 0;
`;

export const SummaryBox = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 18px 28px;
  margin: 0;
  padding: 18px 20px;
  background: ${crownColors.fieldFill};
  border: 1px solid ${crownColors.border};

  dt {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${crownColors.mutedText};
    margin: 0 0 4px;
  }

  dd {
    font-size: 15px;
    color: ${crownColors.navy};
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;
