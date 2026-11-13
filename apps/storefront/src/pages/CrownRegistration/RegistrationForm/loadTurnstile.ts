export interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'flexible' | 'compact';
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (code?: string) => void;
  'timeout-callback'?: () => void;
}

export interface TurnstileApi {
  render: (element: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

type TurnstileWindow = Window & { turnstile?: TurnstileApi };

const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TURNSTILE_ATTRIBUTE = 'data-crown-turnstile';

const inFlight = new WeakMap<Document, Promise<TurnstileApi>>();

const getApi = (doc: Document) => (doc.defaultView as TurnstileWindow | null)?.turnstile;

// The portal renders inside the ThemeFrame iframe, so the Turnstile global has to
// live on that document's window, not the host page's.
export function loadTurnstile(doc: Document): Promise<TurnstileApi> {
  const existing = getApi(doc);
  if (existing) {
    return Promise.resolve(existing);
  }

  const pending = inFlight.get(doc);
  if (pending) {
    return pending;
  }

  const promise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = doc.createElement('script');
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.setAttribute(TURNSTILE_ATTRIBUTE, '');

    const fail = (message: string) => {
      script.remove();
      inFlight.delete(doc);
      reject(new Error(message));
    };

    script.addEventListener('load', () => {
      const api = getApi(doc);
      if (api) {
        resolve(api);
      } else {
        fail('Turnstile script loaded without defining turnstile');
      }
    });
    script.addEventListener('error', () => fail('Turnstile script failed to load'));

    doc.head.appendChild(script);
  });

  inFlight.set(doc, promise);

  return promise;
}
