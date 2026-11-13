import { useState } from 'react';
import { renderWithProviders, screen, waitFor } from 'tests/test-utils';

import { ThemeFrame } from '@/components/ThemeFrame';

import { useTypekitFonts } from './useTypekitFonts';

function Fonts() {
  useTypekitFonts();

  return null;
}

function Page() {
  const [showFonts, setShowFonts] = useState(true);
  const [, setTick] = useState(0);

  return (
    <>
      <button type="button" onClick={() => setShowFonts(false)}>
        hide
      </button>
      <button type="button" onClick={() => setTick((tick) => tick + 1)}>
        rerender
      </button>
      <ThemeFrame title="test-frame">{showFonts ? <Fonts /> : null}</ThemeFrame>
    </>
  );
}

const LINK_SELECTOR = 'link[data-crown-typekit]';

describe('useTypekitFonts', () => {
  it('adds the kit stylesheet to the theme frame once and removes it when unmounted', async () => {
    const { store, user } = renderWithProviders(<Page />);

    await waitFor(() =>
      expect(store.getState().theme.themeFrame?.head.querySelectorAll(LINK_SELECTOR)).toHaveLength(
        1,
      ),
    );
    const frameDocument = store.getState().theme.themeFrame;
    expect(frameDocument?.head.querySelector(LINK_SELECTOR)).toHaveAttribute(
      'href',
      'https://use.typekit.net/yss3osz.css',
    );

    await user.click(screen.getByRole('button', { name: 'rerender' }));
    expect(frameDocument?.head.querySelectorAll(LINK_SELECTOR)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'hide' }));
    await waitFor(() =>
      expect(frameDocument?.head.querySelectorAll(LINK_SELECTOR)).toHaveLength(0),
    );
  });

  it('does nothing without a theme frame', () => {
    expect(() => renderWithProviders(<Fonts />)).not.toThrow();
  });
});
