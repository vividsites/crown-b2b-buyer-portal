import { getVSTurnstileSiteKey, isTurnstileTestSiteKey } from './base';

describe('getVSTurnstileSiteKey', () => {
  it('returns the trimmed key from window.B3.setting', () => {
    window.B3.setting.turnstileSiteKey = '  0x4AAAAAAAkey  ';

    expect(getVSTurnstileSiteKey()).toBe('0x4AAAAAAAkey');
  });

  it.each([undefined, '', '   '])('returns an empty string for %j', (value) => {
    window.B3.setting.turnstileSiteKey = value;

    expect(getVSTurnstileSiteKey()).toBe('');
  });

  it('returns an empty string when window.B3 has no setting', () => {
    (window.B3 as unknown as { setting?: unknown }).setting = undefined;

    expect(getVSTurnstileSiteKey()).toBe('');
  });

  it('reads the setting at call time', () => {
    window.B3.setting.turnstileSiteKey = 'first';
    expect(getVSTurnstileSiteKey()).toBe('first');

    window.B3.setting.turnstileSiteKey = 'second';
    expect(getVSTurnstileSiteKey()).toBe('second');
  });
});

describe('isTurnstileTestSiteKey', () => {
  it.each([
    '1x00000000000000000000AA',
    '2x00000000000000000000AB',
    '1x00000000000000000000BB',
    '2x00000000000000000000BB',
    '3x00000000000000000000FF',
  ])('accepts the Cloudflare dummy key %s', (key) => {
    expect(isTurnstileTestSiteKey(key)).toBe(true);
  });

  it('rejects a realistic key', () => {
    expect(isTurnstileTestSiteKey('0x4AAAAAAAxxxxxxxxxxxxxx')).toBe(false);
  });
});
