import { faker, renderWithProviders, screen } from 'tests/test-utils';

import { FormSection } from './FormSection';

describe('FormSection', () => {
  it('renders a labelled region with the numbered title', () => {
    const description = faker.lorem.sentence();
    const childText = faker.lorem.words();

    renderWithProviders(
      <FormSection id="details" number="01" title="Your details" description={description}>
        <p>{childText}</p>
      </FormSection>,
    );

    const region = screen.getByRole('region', { name: '01 — Your details' });

    expect(region).toHaveTextContent(description);
    expect(region).toHaveTextContent(childText);
    expect(
      screen.getByRole('heading', { level: 2, name: '01 — Your details' }),
    ).toBeInTheDocument();
  });
});
