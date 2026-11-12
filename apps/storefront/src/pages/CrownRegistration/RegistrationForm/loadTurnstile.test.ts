import { loadTurnstile, TurnstileApi } from './loadTurnstile';

const SCRIPT_SELECTOR = 'script[data-crown-turnstile]';

const makeFrame = () => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument as Document;

  return { iframe, doc, win: doc.defaultView as Window & { turnstile?: TurnstileApi } };
};

const fakeApi = (): TurnstileApi => ({ render: vi.fn(), reset: vi.fn(), remove: vi.fn() });

describe('loadTurnstile', () => {
  it('injects exactly one script with the exact URL, even when called twice', () => {
    const { doc } = makeFrame();

    loadTurnstile(doc).catch(() => {});
    loadTurnstile(doc).catch(() => {});

    const scripts = doc.head.querySelectorAll(SCRIPT_SELECTOR);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute(
      'src',
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    );
  });

  it('resolves with the global once the script loads', async () => {
    const { doc, win } = makeFrame();
    const api = fakeApi();

    const promise = loadTurnstile(doc);
    win.turnstile = api;
    doc.head.querySelector(SCRIPT_SELECTOR)?.dispatchEvent(new Event('load'));

    await expect(promise).resolves.toBe(api);
  });

  it('resolves immediately when the global already exists', async () => {
    const { doc, win } = makeFrame();
    const api = fakeApi();
    win.turnstile = api;

    await expect(loadTurnstile(doc)).resolves.toBe(api);
    expect(doc.head.querySelector(SCRIPT_SELECTOR)).toBeNull();
  });

  it('rejects when the script errors', async () => {
    const { doc } = makeFrame();

    const promise = loadTurnstile(doc);
    doc.head.querySelector(SCRIPT_SELECTOR)?.dispatchEvent(new Event('error'));

    await expect(promise).rejects.toThrow('failed to load');
    expect(doc.head.querySelector(SCRIPT_SELECTOR)).toBeNull();
  });

  it('rejects when the script loads without defining the global', async () => {
    const { doc } = makeFrame();

    const promise = loadTurnstile(doc);
    doc.head.querySelector(SCRIPT_SELECTOR)?.dispatchEvent(new Event('load'));

    await expect(promise).rejects.toThrow('without defining');
  });

  it('can retry with a fresh script after a failure', async () => {
    const { doc, win } = makeFrame();

    const first = loadTurnstile(doc);
    doc.head.querySelector(SCRIPT_SELECTOR)?.dispatchEvent(new Event('error'));
    await expect(first).rejects.toThrow();

    const api = fakeApi();
    const second = loadTurnstile(doc);
    expect(doc.head.querySelectorAll(SCRIPT_SELECTOR)).toHaveLength(1);
    win.turnstile = api;
    doc.head.querySelector(SCRIPT_SELECTOR)?.dispatchEvent(new Event('load'));

    await expect(second).resolves.toBe(api);
  });
});
