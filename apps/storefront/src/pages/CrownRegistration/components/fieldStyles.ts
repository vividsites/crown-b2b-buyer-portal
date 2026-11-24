import { css } from '@emotion/react';
import styled from '@emotion/styled';

import { crownColors } from '../tokens';

export interface FullRowProps {
  fullRow?: boolean;
}

export const fullRowOptions = {
  shouldForwardProp: (prop: string) => prop !== 'fullRow',
};

// FieldGrid fits 3 columns of at least 220px (3 x 220 + 2 x 20 gap)
export const THREE_COLUMN_GRID = '@container (min-width: 700px)';

export interface FieldLabelProps extends FullRowProps {
  // Takes the grid cell right after a checkbox that spans the first two columns.
  // While concealed it keeps its cell (invisible) when the grid has 3+ columns, so
  // the row height does not change; on narrower grids it is removed from the layout.
  concealed?: boolean;
}

export const FieldLabel = styled('label', {
  shouldForwardProp: (prop: string) => prop !== 'fullRow' && prop !== 'concealed',
})<FieldLabelProps>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  ${({ fullRow }) => (fullRow ? 'grid-column: 1 / -1;' : '')}
  ${({ concealed }) =>
    concealed
      ? `display: none;
  ${THREE_COLUMN_GRID} {
    display: flex;
    visibility: hidden;
  }`
      : ''}
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
