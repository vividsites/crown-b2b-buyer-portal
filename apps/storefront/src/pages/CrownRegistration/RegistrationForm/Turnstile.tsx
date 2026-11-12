import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styled from '@emotion/styled';

import { useB3Lang } from '@/lib/lang';
import {
  getVSTurnstileSiteKey,
  isTurnstileTestSiteKey,
  REGISTRATION_TURNSTILE_ACTION,
} from '@/shared/service/vs';
import { getVSAPIBaseURL } from '@/shared/service/vs/request/base';
import { themeFrameSelector, useAppSelector } from '@/store';
import { Environment } from '@/types';
import b2bLogger from '@/utils/b3Logger';

import { GhostButton } from '../styled';
import { crownColors } from '../tokens';

import { loadTurnstile, TurnstileApi } from './loadTurnstile';

export const TURNSTILE_HELPER_ID = 'crown-turnstile-helper';

export interface TurnstileHandle {
  reset: () => void;
}

interface TurnstileProps {
  onToken: (token: string | null) => void;
}

type Status = 'loading' | 'ready' | 'loadError' | 'widgetError' | 'notConfigured';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
`;

const HelperText = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${crownColors.mutedText};
`;

const AlertText = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${crownColors.bodyText};
  border: 1px solid ${crownColors.red};
  background: ${crownColors.errorSurface};
  padding: 10px 14px;
`;

const RetryButton = styled(GhostButton)`
  padding: 8px 16px;
  font-size: 13px;
`;

export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(function Turnstile(
  { onToken },
  ref,
) {
  const b3Lang = useB3Lang();
  const themeFrame = useAppSelector(themeFrameSelector);

  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<TurnstileApi | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  const [status, setStatus] = useState<Status>(() =>
    getVSTurnstileSiteKey() ? 'loading' : 'notConfigured',
  );
  const [hasToken, setHasToken] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const clear = useCallback(() => {
    setHasToken(false);
    onTokenRef.current(null);
  }, []);

  // Configuration checks run once per mount.
  useEffect(() => {
    const siteKey = getVSTurnstileSiteKey();

    if (!siteKey) {
      b2bLogger.error('Turnstile site key is not configured (window.B3.setting.turnstileSiteKey)');
      return;
    }

    if (
      isTurnstileTestSiteKey(siteKey) &&
      getVSAPIBaseURL() === getVSAPIBaseURL(Environment.Production)
    ) {
      b2bLogger.error('Turnstile test site key in use in production');
    }
  }, []);

  useEffect(() => {
    const siteKey = getVSTurnstileSiteKey();
    const container = containerRef.current;

    if (!siteKey || !themeFrame || !container) {
      return undefined;
    }

    let cancelled = false;
    let widgetId: string | null = null;
    let api: TurnstileApi | null = null;

    setStatus('loading');

    loadTurnstile(themeFrame)
      .then((loaded) => {
        if (cancelled) {
          return;
        }

        api = loaded;
        apiRef.current = loaded;
        widgetId = loaded.render(container, {
          sitekey: siteKey,
          action: REGISTRATION_TURNSTILE_ACTION,
          theme: 'light',
          size: 'normal',
          callback: (token) => {
            setHasToken(true);
            onTokenRef.current(token);
          },
          'expired-callback': clear,
          'error-callback': () => {
            clear();
            setStatus('widgetError');
          },
          'timeout-callback': clear,
        });
        widgetIdRef.current = widgetId;
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('loadError');
        }
      });

    return () => {
      cancelled = true;
      if (api && widgetId !== null) {
        api.remove(widgetId);
      }
      apiRef.current = null;
      widgetIdRef.current = null;
      onTokenRef.current(null);
    };
  }, [themeFrame, attempt, clear]);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        if (apiRef.current && widgetIdRef.current !== null) {
          apiRef.current.reset(widgetIdRef.current);
        }
        clear();
        setStatus((current) => (current === 'widgetError' ? 'ready' : current));
      },
    }),
    [clear],
  );

  if (status === 'notConfigured') {
    return (
      <AlertText role="alert">{b3Lang('crownRegistration.turnstile.notConfigured')}</AlertText>
    );
  }

  return (
    <Wrapper>
      <div ref={containerRef} />
      {status === 'loadError' && (
        <>
          <AlertText role="alert">{b3Lang('crownRegistration.turnstile.loadError')}</AlertText>
          <RetryButton type="button" onClick={() => setAttempt((count) => count + 1)}>
            {b3Lang('crownRegistration.turnstile.retry')}
          </RetryButton>
        </>
      )}
      {status === 'widgetError' && (
        <AlertText role="alert">{b3Lang('crownRegistration.turnstile.widgetError')}</AlertText>
      )}
      {!hasToken && (status === 'loading' || status === 'ready') && (
        <HelperText id={TURNSTILE_HELPER_ID} aria-live="polite">
          {b3Lang('crownRegistration.turnstile.helper')}
        </HelperText>
      )}
    </Wrapper>
  );
});
