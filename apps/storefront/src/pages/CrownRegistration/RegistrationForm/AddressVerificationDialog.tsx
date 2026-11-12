import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Dialog } from '@mui/material';

import { useB3Lang } from '@/lib/lang';
import { RegistrationAddress } from '@/shared/service/vs';

import { PrimaryButton } from '../styled';
import { crownColors, crownFonts, crownMedia } from '../tokens';

import { VerifiedScope } from './addressVerification';

export type AddressChoice = 'suggested' | 'entered';

export interface AddressVerificationDialogProps {
  open: boolean;
  scope: VerifiedScope;
  entered: RegistrationAddress;
  suggested: RegistrationAddress;
  changes: string[];
  onUse: (choice: AddressChoice) => void;
  onEdit: () => void;
}

const TITLE_ID = 'crown-address-verify-title';

const Header = styled.div`
  padding: 26px 30px 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
`;

const Title = styled.h2`
  font-family: ${crownFonts.comp};
  font-weight: 600;
  font-size: 30px;
  line-height: 1.1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: ${crownColors.navy};
  margin: 0;

  ${crownMedia.stacked} {
    font-size: 24px;
  }
`;

const ScopeLine = styled.p`
  margin: 6px 0 0;
  font-size: 14px;
  color: ${crownColors.mutedText};
`;

const CloseButton = styled.button`
  flex: none;
  width: 34px;
  height: 34px;
  background: ${crownColors.surface};
  border: 1px solid ${crownColors.border};
  border-radius: 4px;
  font-size: 18px;
  line-height: 1;
  color: ${crownColors.mutedText};
  cursor: pointer;

  &:hover {
    border-color: ${crownColors.navy};
    color: ${crownColors.navy};
  }
`;

const Cards = styled.div`
  padding: 22px 30px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Card = styled.label<{ selected: boolean }>`
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 14px;
  padding: 16px 18px;
  cursor: pointer;
  border: 2px solid ${({ selected }) => (selected ? crownColors.navy : crownColors.border)};
  background: ${({ selected }) => (selected ? crownColors.selectedCardFill : crownColors.surface)};

  input {
    width: 17px;
    height: 17px;
    margin: 2px 0 0;
    accent-color: ${crownColors.navy};
  }
`;

const CardLabel = styled.span<{ muted?: boolean }>`
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ muted }) => (muted ? crownColors.mutedText : crownColors.navy)};
  margin-bottom: 6px;
`;

const Lines = styled.span<{ muted?: boolean }>`
  display: block;
  font-size: 15.5px;
  line-height: 1.55;
  color: ${({ muted }) => (muted ? crownColors.bodyText : crownColors.navy)};
  overflow-wrap: anywhere;
`;

const Note = styled.span`
  display: block;
  margin-top: 6px;
  font-size: 13px;
  color: ${crownColors.mutedText};
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  padding: 24px 30px 28px;
`;

const EditButton = styled.button`
  padding: 13px 22px;
  background: ${crownColors.surface};
  color: ${crownColors.navy};
  border: 2px solid ${crownColors.navy};
  font-family: ${crownFonts.comp};
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;

  &:hover {
    background: ${crownColors.navy};
    color: ${crownColors.surface};
  }
`;

const UseButton = styled(PrimaryButton)`
  padding: 13px 26px;
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.06em;
`;

function AddressLines({ address, muted }: { address: RegistrationAddress; muted?: boolean }) {
  const street = [address.address1, address.address2].filter(Boolean).join(', ');
  const locality = `${address.city}, ${address.state} ${address.postalCode}`;

  return (
    <Lines muted={muted}>
      <span>{street}</span>
      <br />
      <span>{locality}</span>
    </Lines>
  );
}

export function AddressVerificationDialog({
  open,
  scope,
  entered,
  suggested,
  changes,
  onUse,
  onEdit,
}: AddressVerificationDialogProps) {
  const b3Lang = useB3Lang();
  // MUI portals into the host document by default; the portal UI lives in the
  // ThemeFrame iframe, so the dialog is mounted into an in-tree container.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [choice, setChoice] = useState<AddressChoice>('suggested');

  useEffect(() => {
    if (open) {
      setChoice('suggested');
    }
  }, [open, entered, suggested]);

  const note =
    changes.length > 0 ? changes.join(', ') : b3Lang('crownRegistration.verify.noteDefault');

  return (
    <>
      <div ref={setContainer} />
      <Dialog
        open={open && container !== null}
        container={container}
        onClose={onEdit}
        maxWidth={false}
        aria-labelledby={TITLE_ID}
        slotProps={{ backdrop: { style: { background: crownColors.scrim } } }}
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '620px',
            borderRadius: 0,
            borderTop: `4px solid ${crownColors.navy}`,
            boxShadow: '0 24px 60px rgba(13, 20, 45, 0.28)',
            margin: '16px',
          },
        }}
      >
        <Header>
          <div>
            <Title id={TITLE_ID}>{b3Lang('crownRegistration.verify.title')}</Title>
            <ScopeLine>
              {b3Lang(
                scope === 'billing'
                  ? 'crownRegistration.verify.scopeBilling'
                  : 'crownRegistration.verify.scopeShipping',
              )}
            </ScopeLine>
          </div>
          <CloseButton
            type="button"
            aria-label={b3Lang('crownRegistration.verify.close')}
            onClick={onEdit}
          >
            ×
          </CloseButton>
        </Header>

        <Cards role="radiogroup" aria-labelledby={TITLE_ID}>
          <Card selected={choice === 'suggested'}>
            <input
              type="radio"
              name="crown-address-choice"
              checked={choice === 'suggested'}
              onChange={() => setChoice('suggested')}
              aria-label={b3Lang('crownRegistration.verify.recommended')}
            />
            <span>
              <CardLabel>{b3Lang('crownRegistration.verify.recommended')}</CardLabel>
              <AddressLines address={suggested} />
              <Note>{note}</Note>
            </span>
          </Card>
          <Card selected={choice === 'entered'}>
            <input
              type="radio"
              name="crown-address-choice"
              checked={choice === 'entered'}
              onChange={() => setChoice('entered')}
              aria-label={b3Lang('crownRegistration.verify.entered')}
            />
            <span>
              <CardLabel muted>{b3Lang('crownRegistration.verify.entered')}</CardLabel>
              <AddressLines address={entered} muted />
            </span>
          </Card>
        </Cards>

        <Actions>
          <EditButton type="button" onClick={onEdit}>
            {b3Lang('crownRegistration.verify.edit')}
          </EditButton>
          <UseButton type="button" onClick={() => onUse(choice)}>
            {b3Lang('crownRegistration.verify.use')}
          </UseButton>
        </Actions>
      </Dialog>
    </>
  );
}
