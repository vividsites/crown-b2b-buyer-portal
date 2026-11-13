import { renderWithProviders, screen } from 'tests/test-utils';

import { ErrorSummary } from './ErrorSummary';

const messages = ['One', 'Two', 'Three', 'Four', 'Five'];

describe('ErrorSummary', () => {
  it('renders nothing without messages', () => {
    renderWithProviders(<ErrorSummary messages={[]} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('joins up to three messages', () => {
    renderWithProviders(<ErrorSummary messages={messages.slice(0, 3)} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Check');
    expect(alert).toHaveTextContent('One · Two · Three');
    expect(alert).not.toHaveTextContent('more');
  });

  it('adds "+1 more" with four messages', () => {
    renderWithProviders(<ErrorSummary messages={messages.slice(0, 4)} />);

    expect(screen.getByText('One · Two · Three · +1 more')).toBeInTheDocument();
  });

  it('adds "+N more" beyond three', () => {
    renderWithProviders(<ErrorSummary messages={messages} />);

    expect(screen.getByText('One · Two · Three · +2 more')).toBeInTheDocument();
  });
});
