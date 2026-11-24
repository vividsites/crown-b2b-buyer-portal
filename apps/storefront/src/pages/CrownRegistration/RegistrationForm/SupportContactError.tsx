import { useB3Lang } from '@/lib/lang';

import { PageLink } from '../styled';
import { SUPPORT_EMAIL } from '../supportEmail';

import { PersistentErrorKey } from './mapServerErrors';

interface SupportContactErrorProps {
  messageKey: PersistentErrorKey;
}

// Error text with a mailto link to Crown support. A {SUPPORT_EMAIL} placeholder in
// the string marks where the link goes; without one, the link follows the text.
export function SupportContactError({ messageKey }: SupportContactErrorProps) {
  const b3Lang = useB3Lang();
  const link = <PageLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</PageLink>;

  // the address is substituted, then split out again so it can be rendered as a link
  const [before, after] = b3Lang(messageKey, { SUPPORT_EMAIL }).split(SUPPORT_EMAIL);

  if (after === undefined) {
    return (
      <>
        {before} {link}
      </>
    );
  }

  return (
    <>
      {before}
      {link}
      {after}
    </>
  );
}
