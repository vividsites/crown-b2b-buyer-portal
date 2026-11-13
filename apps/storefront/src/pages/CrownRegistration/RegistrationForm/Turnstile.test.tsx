import { createRef, useState } from 'react';
import { act, renderWithProviders, screen, waitFor, within } from 'tests/test-utils';

import { ThemeFrame } from '@/components/ThemeFrame';
import { Environment } from '@/types';
import b2bLogger from '@/utils/b3Logger';

import { loadTurnstile, TurnstileApi, TurnstileRenderOptions } from './loadTurnstile';
import { Turnstile, TurnstileHandle } from './Turnstile';

vi.mock('./loadTurnstile', () => ({ loadTurnstile: vi.fn() }));

const loadMock = vi.mocked(loadTurnstile);

let renderOptions: TurnstileRenderOptions | undefined;
let renderedInto: HTMLElement | undefined;
const api = {
  render: vi.fn<TurnstileApi['render']>(),
  reset: vi.fn<TurnstileApi['reset']>(),
  remove: vi.fn<TurnstileApi['remove']>(),
};

const handleRef = createRef<TurnstileHandle>();

function Page({ onToken }: { onToken: (token: string | null) => void }) {
  const [show, setShow] = useState(true);

  return (
    <>
      <button type="button" onClick={() => setShow(false)}>
        hide
      </button>
      <ThemeFrame title="test-frame">
        {show ? <Turnstile ref={handleRef} onToken={onToken} /> : null}
      </ThemeFrame>
    </>
  );
}

// The widget renders inside the ThemeFrame iframe, so queries must target its body.
const renderPage = async (onToken: (token: string | null) => void = vi.fn()) => {
  const view = renderWithProviders(<Page onToken={onToken} />);
  await waitFor(() => expect(view.store.getState().theme.themeFrame?.body).toBeTruthy());
  const frame = within(view.store.getState().theme.themeFrame!.body);

  return { ...view, frame };
};

const helperText = 'Complete the verification above to enable Submit';

describe('Turnstile', () => {
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.B3.setting.turnstileSiteKey = '1x00000000000000000000AA';
    renderOptions = undefined;
    renderedInto = undefined;
    api.render.mockReset().mockImplementation((element, options) => {
      renderedInto = element;
      renderOptions = options;
      return 'w1';
    });
    api.reset.mockReset();
    api.remove.mockReset();
    loadMock.mockReset().mockResolvedValue(api);
    logError = vi.spyOn(b2bLogger, 'error').mockImplementation(() => {});
  });

  it('renders the widget with the site key from the setting and the registration action', async () => {
    const { store } = await renderPage();

    await waitFor(() => expect(api.render).toHaveBeenCalledTimes(1));
    expect(renderedInto?.ownerDocument).toBe(store.getState().theme.themeFrame);
    expect(renderOptions).toMatchObject({
      sitekey: '1x00000000000000000000AA',
      action: 'registration',
      size: 'normal',
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it.each([undefined, '', '  '])(
    'fails closed without a widget when the setting is %j',
    async (value) => {
      window.B3.setting.turnstileSiteKey = value;
      const { frame } = await renderPage();

      expect(await frame.findByRole('alert')).toHaveTextContent(
        'Verification is not available right now',
      );
      expect(loadMock).not.toHaveBeenCalled();
      expect(api.render).not.toHaveBeenCalled();
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledWith(expect.stringContaining('not configured'));
    },
  );

  it('shows the helper until a token arrives, then reports the token', async () => {
    const onToken = vi.fn();
    const { frame } = await renderPage(onToken);
    await waitFor(() => expect(api.render).toHaveBeenCalled());

    expect(await frame.findByText(helperText)).toBeInTheDocument();

    act(() => {
      renderOptions?.callback('tok-1');
    });

    await waitFor(() => expect(frame.queryByText(helperText)).toBeNull());
    expect(onToken).toHaveBeenLastCalledWith('tok-1');
  });

  it('clears the token when it expires', async () => {
    const onToken = vi.fn();
    const { frame } = await renderPage(onToken);
    await waitFor(() => expect(api.render).toHaveBeenCalled());

    act(() => {
      renderOptions?.callback('tok-1');
    });
    act(() => {
      renderOptions?.['expired-callback']?.();
    });

    await waitFor(() => expect(onToken).toHaveBeenLastCalledWith(null));
    expect(await frame.findByText(helperText)).toBeInTheDocument();
  });

  it('shows the widget error when the challenge errors', async () => {
    const onToken = vi.fn();
    const { frame } = await renderPage(onToken);
    await waitFor(() => expect(api.render).toHaveBeenCalled());

    act(() => {
      renderOptions?.['error-callback']?.('110200');
    });

    expect(await frame.findByRole('alert')).toHaveTextContent('Verification could not complete');
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it('resets the widget and clears the token through the handle', async () => {
    const onToken = vi.fn();
    await renderPage(onToken);
    await waitFor(() => expect(api.render).toHaveBeenCalled());
    act(() => {
      renderOptions?.callback('tok-1');
    });

    act(() => {
      handleRef.current?.reset();
    });

    expect(api.reset).toHaveBeenCalledWith('w1');
    await waitFor(() => expect(onToken).toHaveBeenLastCalledWith(null));
  });

  it('removes the widget when unmounted', async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(api.render).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'hide' }));

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('w1'));
  });

  it('shows a load error and retries the loader', async () => {
    loadMock.mockRejectedValueOnce(new Error('blocked'));
    const { user, frame } = await renderPage();

    expect(await frame.findByRole('alert')).toHaveTextContent(
      "We couldn't load the verification check",
    );
    expect(loadMock).toHaveBeenCalledTimes(1);

    await user.click(frame.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(api.render).toHaveBeenCalledTimes(1));
    expect(loadMock).toHaveBeenCalledTimes(2);
    expect(frame.queryByRole('alert')).toBeNull();
  });

  it('logs once when a Cloudflare test key is used in production', async () => {
    window.B3.setting.vsEnvironment = Environment.Production;
    await renderPage();
    await waitFor(() => expect(api.render).toHaveBeenCalled());

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith('Turnstile test site key in use in production');
  });

  it('does not log for a test key outside production', async () => {
    await renderPage();
    await waitFor(() => expect(api.render).toHaveBeenCalled());

    expect(logError).not.toHaveBeenCalled();
  });
});
