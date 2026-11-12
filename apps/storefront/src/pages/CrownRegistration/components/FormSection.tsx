import { ReactNode } from 'react';

import { FieldGrid, RailDescription, RailTitle, SectionGrid } from '../styled';

interface FormSectionProps {
  id: string;
  number: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
}

export function FormSection({ id, number, title, description, children }: FormSectionProps) {
  const headingId = `${id}-heading`;

  return (
    // tabIndex -1 lets Phase 3 focus the section programmatically
    <SectionGrid id={id} aria-labelledby={headingId} tabIndex={-1}>
      <div>
        <RailTitle id={headingId}>{`${number} — ${title}`}</RailTitle>
        <RailDescription>{description}</RailDescription>
      </div>
      <FieldGrid>{children}</FieldGrid>
    </SectionGrid>
  );
}
