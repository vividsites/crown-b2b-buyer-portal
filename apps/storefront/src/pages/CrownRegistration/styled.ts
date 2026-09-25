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
