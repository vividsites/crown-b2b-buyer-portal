import { useEffect } from 'react';

import { themeFrameSelector, useAppSelector } from '@/store';

const TYPEKIT_URL = 'https://use.typekit.net/yss3osz.css';
const TYPEKIT_ATTRIBUTE = 'data-crown-typekit';

// The portal renders inside the ThemeFrame iframe, so the kit stylesheet has to
// be added to that document rather than the host page.
export function useTypekitFonts() {
  const themeFrame = useAppSelector(themeFrameSelector);

  useEffect(() => {
    if (!themeFrame || themeFrame.head.querySelector(`link[${TYPEKIT_ATTRIBUTE}]`)) {
      return undefined;
    }

    const link = themeFrame.createElement('link');
    link.rel = 'stylesheet';
    link.href = TYPEKIT_URL;
    link.setAttribute(TYPEKIT_ATTRIBUTE, '');
    themeFrame.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [themeFrame]);
}
