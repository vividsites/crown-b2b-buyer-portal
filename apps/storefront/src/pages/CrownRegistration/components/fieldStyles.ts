import { css } from '@emotion/react';
import styled from '@emotion/styled';

import { crownColors } from '../tokens';

export interface FullRowProps {
  fullRow?: boolean;
}

export const fullRowOptions = {
  shouldForwardProp: (prop: string) => prop !== 'fullRow',
};

export const FieldLabel = styled('label', fullRowOptions)<FullRowProps>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  ${({ fullRow }) => (fullRow ? 'grid-column: 1 / -1;' : '')}
`;

export const FieldLabelText = styled.span`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${crownColors.mutedText};
`;

export const controlStyles = css`
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  font: inherit;
  font-size: 16px;
  color: ${crownColors.navy};
  background-color: ${crownColors.fieldFill};
  border: 1px solid transparent;
  border-bottom: 2px solid ${crownColors.fieldUnderline};
  border-radius: 4px 4px 0 0;

  &:focus {
    outline: none;
    border-bottom-color: ${crownColors.red};
    background-color: ${crownColors.surface};
  }

  &[aria-invalid='true'] {
    border-bottom-color: ${crownColors.redHover};
  }
`;

export const ControlInput = styled.input`
  ${controlStyles}
`;

const chevron = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" fill="none" stroke="${crownColors.navy}" stroke-width="2"/></svg>`,
);

export const ControlSelect = styled.select`
  ${controlStyles}
  appearance: none;
  padding-right: 40px;
  background-image: url('data:image/svg+xml,${chevron}');
  background-repeat: no-repeat;
  background-position: right 14px center;
`;

export const FieldHint = styled.span`
  font-size: 12.5px;
  color: ${crownColors.mutedText};
`;

export const FieldError = styled.span`
  font-size: 12.5px;
  color: ${crownColors.redHover};
`;
