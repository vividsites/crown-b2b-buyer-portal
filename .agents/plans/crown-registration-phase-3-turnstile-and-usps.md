# Feature: Crown Registration, Phase 3 Turnstile and USPS Address Verification

This plan should be complete, but before you implement anything, check it against the documentation and the codebase patterns, and make sure each task makes sense.

Pay close attention to the names of existing utilities and types, and import them from the right files.

## Feature Description

Phase 3 of the Crown Business Account Registration project (see `PRD.md` §7.7, §7.8, §9, §10, §12). Phases 1 and 2 delivered the service layer, the form and the page, but two things are stubbed:

1. **Bot protection.** The form sends a hard-coded dummy token (`DEV_TURNSTILE_TOKEN`). Phase 3 adds the real Cloudflare Turnstile widget inside the portal iframe, gates Submit on a live token, and resets the widget after a failed submit (tokens are single-use).
2. **Address verification.** `validateAddress` exists in the API client but nothing calls it. Phase 3 verifies each US address with USPS before submit, shows a "Verify your address" modal when USPS suggests a correction, and writes the chosen address back into the form.

Decisions already made with the user (do not re-ask):
- The widget passes `action: 'registration'`. The VS API must check `siteverify.action` (the payload does **not** gain a field; the action travels inside the token). Test keys do not echo `action`, so the backend check cannot be exercised with them.
- The Turnstile site key **always** comes from `window.B3.setting.turnstileSiteKey`. The per-environment map `ENVIRONMENT_VS_TURNSTILE_SITE_KEY` in `base.ts` is **removed**, with no fallback. On the real site, the BigCommerce Script Manager snippet that defines `window.B3.setting` and loads the React app fills this value from an existing custom theme setting that holds the Turnstile site key (the user has verified that works). Changing the key (including swapping to test keys) is a theme-setting change, not a rebuild. For local `yarn dev` the key is set in `apps/storefront/index.html`'s `window.B3.setting` block. If the setting is missing or empty, the widget is not rendered, an error is logged, a "not configured" message shows, and Submit stays disabled (fail closed).
- A "What you entered" choice in the USPS modal is remembered per address for the life of the form, so a retry after a server error does not re-prompt (and does not call USPS again) unless the user edits that address.
- Submit stays disabled until a token exists, with a visible helper line under the widget and a distinct message when the Turnstile script fails to load.
- USPS verification never blocks a submit: any error or timeout is logged and the submit continues.

Out of scope: the VS server work (siteverify, USPS proxy), Canadian address validation, Phase 4 hardening (real staging/production keys, CSP check on staging, end-to-end run).

## User Story

As a prospective business buyer,
I want my address checked against USPS before I apply,
So that deliveries and invoices go to a valid address,

and, as Crown's trade team,
I want automated sign-ups blocked by Turnstile,
So that the approval queue only holds real businesses.

## Problem Statement

`useRegistrationSubmit` sends `XXXX.DUMMY.TOKEN.XXXX` as the Turnstile token, so a real VS API (which verifies tokens with Cloudflare) will reject every submission, and nothing stops a bot from posting. Addresses are sent exactly as typed, so typos and non-standard formats reach Crown's systems.

## Solution Statement

1. **Spike first** (Task 1): prove Turnstile renders and issues a token inside the portal's iframe document, and find out what `hostname` Cloudflare reports for it. The result picks Plan A (render inside the iframe, as PRD §7.8 says) or Plan B (bridge).
2. Add small, separately tested units: `loadTurnstile` (script injection), `Turnstile` (widget component with a `reset()` handle), `addressVerification` (pure helpers), `AddressVerificationDialog` (MUI dialog), and `useAddressVerification` (orchestration, returns a promise).
3. Rewire `useRegistrationSubmit` into: token present → verify addresses → re-read form values → build payload with the live token → submit → on failure reset widget.
4. Extend the existing page test with the Turnstile component mocked, and unit-test the new pieces. Cover the paired-key manual tests in a short runbook.

## Feature Metadata

**Feature Type**: Enhancement (completes stubbed Phase 2 hook points)
**Estimated Complexity**: High (third-party widget inside an iframe, async multi-step submit, modal flow)
**Primary Systems Affected**: `src/pages/CrownRegistration/RegistrationForm/`, `src/shared/service/vs/` (api + request/base), `src/lib/lang/locales/en.json`, `src/index.d.ts` (one line), `index.html` (one line, local dev)
**Dependencies**: No new packages. External: Cloudflare Turnstile `api.js`, and the two VS endpoints (mocked with msw until Phase 4).

---

## CONTEXT REFERENCES

### Relevant Codebase Files. IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `apps/storefront/src/pages/CrownRegistration/RegistrationForm/useRegistrationSubmit.ts` (all, 79 lines): the hook to rewire. Line 8 imports `DEV_TURNSTILE_TOKEN`; line 16 `onFailure` is the Phase 3 reset hook point; line 40 `buildSubmission(values, countries, DEV_TURNSTILE_TOKEN)`; lines 30-77 hold the `isSubmittingRef` double-submit guard that must cover the whole async chain.
- `.../RegistrationForm/buildSubmission.ts` (line 7-8 `DEV_TURNSTILE_TOKEN` to remove; `buildAddress` lines 16-41 shows how addresses are trimmed and `stateName` resolved).
- `.../RegistrationForm/index.tsx` (all, 273 lines): wiring. Submit row is lines 257-269 (`SubmitRow`, `ErrorSummary`, `ServerBanner`, `PrimaryButton`). `useRegistrationSubmit` is called at lines 95-99. `form.getValues` is available from `useForm`.
- `.../RegistrationForm/mapServerErrors.ts` (lines 60-64): `TURNSTILE_FAILED` already maps to `crownRegistration.error.turnstileFailed`.
- `.../RegistrationForm/regions.ts` (`resolveStateName`, `getRegionOptions`): the suggested address's `state` code must exist in the region list or `buildSubmission` fails with `regionNotFound`, which is acceptable.
- `.../RegistrationForm/schema.ts` (`RegistrationFormValues`, `AddressPrefix`, field names `bAddress1 bAddress2 bCity bCountry bState bZip` and `s*`).
- `.../CrownRegistration/useTypekitFonts.ts` + `useTypekitFonts.test.tsx`: **MIRROR** for iframe script/link injection (reads `themeFrameSelector`, idempotence marker attribute, cleanup) and for testing with a real `ThemeFrame`.
- `apps/storefront/src/components/captcha/Captcha.tsx` (lines 17-23): reference for `loadCaptchaScript` into the iframe `<head>`.
- `apps/storefront/src/components/ThemeFrame.tsx` (lines 8-21, 99-103): the iframe is filled with `IFrameSetContent(iframe, DefaultIframeContent, true)`; `forceWrite` is `true`, so it uses `document.open/write`, **not** `srcdoc`. The document is `about:blank` with the parent's origin. This is why Task 1 (spike) exists.
- `apps/storefront/src/components/B3Dialog.tsx` (lines 70-96, 94-100): **MIRROR** how a MUI `Dialog` is rendered into a container inside the iframe tree (`container` ref + `<Box ref={container} />`). MUI's default portal target is the **host** `document.body`, which would put the dialog outside the iframe and break focus trap and styles. Do not forget this.
- `apps/storefront/src/shared/service/vs/request/base.ts` (lines 18-26 site key map to **remove**, 44-48 `getEnvironment` and the `window.B3?.setting?.vsEnvironment` read pattern, 59-61 `getVSTurnstileSiteKey` to rewrite so it reads only `window.B3.setting.turnstileSiteKey`).
- `apps/storefront/index.html` (lines 333-343): the local-dev `window.B3 = { setting: { ... vsEnvironment: "integration" } }` block. Add the dev site key here.
- `apps/storefront/src/shared/service/vs/api/registration.ts` (lines 51-57 `AddressValidationResult`, 71, 80-85 `validateAddress`): types to reuse. `validateAddress` takes `RegistrationAddress` (no `stateName`).
- `apps/storefront/src/shared/service/vs/request/anonymousFetch.ts` and `VSApiError.ts`: error shape (`status 0` = network/abort).
- `apps/storefront/src/index.d.ts` (lines 59-69): `Window.B3.setting` type; add `turnstileSiteKey?: string` next to `vsEnvironment`.
- `apps/storefront/src/utils/b3Logger.ts`: `b2bLogger.error` is the only logger. `vitest-fail-on-console` fails any test that logs unexpectedly, so tests must spy and assert (see `index.test.tsx`, which already imports `b2bLogger`).
- `apps/storefront/src/pages/CrownRegistration/index.test.tsx` (lines 1-120 helpers: `renderPage`, `fillValidForm`, `respondWith`, `failWith`, `submitButton`; msw `server`; `checkUserEmail` spy): extend, do not rewrite. After Phase 3 every existing submit test needs a token, so mock the Turnstile component (Task 12).
- `apps/storefront/src/pages/CrownRegistration/styled.ts` (`SubmitRow`, `ServerBanner`, `PrimaryButton`, `SecondaryButton`, `GhostButton`) and `tokens.ts` (`crownColors`, `crownFonts`, `crownMedia`): reuse for new UI. `crownColors.selectedCardFill`, `border`, `scrim`, `mutedText` already exist for the modal.
- `apps/storefront/src/pages/CrownRegistration/components/ErrorSummary.tsx` (lines 8-17): banner styling to match for the helper/error text.
- `docs/registration.md` §3 (lines 141-167) and `docs/screenshots/registration-address-validation-modal.png`: exact modal design.
- `PRD.md` §7.7 (USPS), §7.8 (Turnstile), §9 (config), §10.1 (error table, server steps), §12 Phase 3.
- `apps/storefront/knip.jsonc`: `exports` and `files` rules are `error`, so every new export must be used and every new file imported (test helpers imported by tests are fine).
- `apps/storefront/tests/setup-test-environment.ts` (lines 14-31): tests run with `vsEnvironment: Environment.Local`.

### New Files to Create

All under `apps/storefront/src/pages/CrownRegistration/RegistrationForm/` unless noted.

- `loadTurnstile.ts` + `loadTurnstile.test.ts`: types for the Turnstile global, and `loadTurnstile(doc)`.
- `Turnstile.tsx` + `Turnstile.test.tsx`: widget component with `reset()` handle.
- `addressVerification.ts` + `addressVerification.test.ts`: pure helpers.
- `AddressVerificationDialog.tsx` + `AddressVerificationDialog.test.tsx`.
- `useAddressVerification.ts` + `useAddressVerification.test.tsx`.
- `apps/storefront/src/shared/service/vs/request/base.test.ts`: tests for `getVSTurnstileSiteKey` and `isTurnstileTestSiteKey`.
- `docs/turnstile-manual-testing.md`: the manual test runbook (Task 13).

### Relevant Documentation. YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Turnstile client-side rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
  - Explicit rendering (`api.js?render=explicit`), `turnstile.render/reset/remove/getResponse/isExpired`, `size`, `theme`. `remove()` does not fire callbacks. Do not proxy or cache `api.js`.
  - Why: the widget lifecycle.
- [Turnstile widget configurations](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)
  - `action` (max 32 chars of `a-z A-Z 0-9 _ -`), `refresh-expired`, `expired-callback`, `error-callback`, `timeout-callback`, `retry`. The fetched client-side page did not cover these, so read this page and confirm the option names before coding. Also confirm that `render` accepts an `HTMLElement` and not only a selector string.
  - Why: option names and defaults.
- [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
  - `siteverify` response: `success`, `hostname`, `action`, `cdata`, `error-codes`. Tokens last 300 s and are single-use. Cloudflare recommends checking `action` and `hostname`.
  - Why: the contract the VS API implements; also used in the spike.
- [Turnstile testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
  - Dummy site keys: `1x00000000000000000000AA` pass (visible), `2x00000000000000000000AB` fail (visible), `1x00000000000000000000BB` pass (invisible), `2x00000000000000000000BB` fail (invisible), `3x00000000000000000000FF` forced interactive.
  - Dummy secret keys: `1x0000000000000000000000000000000AA` pass, `2x0000000000000000000000000000000AA` fail, `3x0000000000000000000000000000000AA` returns `timeout-or-duplicate`.
  - Test site keys issue the token `XXXX.DUMMY.TOKEN.XXXX`. Test secret keys accept **only** that token, and real secret keys reject it. With test keys `siteverify` returns `hostname: "example.com"` and **no `action`**.
  - Why: the manual matrix. (Note: an earlier chat message listed the secret keys with the shorter 24-character form; the values above are the correct ones.)
- MUI Dialog `container` prop: https://mui.com/material-ui/api/dialog/ (focus trap and portal target).

### Patterns to Follow

**Iframe injection (MIRROR `useTypekitFonts.ts`):** read `themeFrameSelector`, bail when absent, use an attribute marker to stay idempotent, clean up in the effect return.

**Dialog in iframe (MIRROR `B3Dialog.tsx:70-96`):**
```tsx
const container = useRef<HTMLDivElement | null>(null);
<Box ref={container} />
<Dialog open={isOpen && Boolean(container.current)} container={container.current} ... />
```
`container.current` is null on first render, so the dialog must re-render once the ref is set (B3Dialog relies on the parent re-render; add a `useState` flag or callback ref).

**i18n:** every user-visible string is a key in the single contiguous `crownRegistration.*` block of `en.json`; read with `const b3Lang = useB3Lang()`. Server text is not translated; it is escaped with `escapeServerMessage` only when it goes through `b3Lang` (see `mapServerErrors.ts`). Text rendered directly as React children (the USPS `changes[]` notes) needs no escaping.

**Logging:** `b2bLogger.error('<message>', error)`. Tests must `vi.spyOn(b2bLogger, 'error').mockImplementation(() => {})` and assert on it.

**Styling:** `@emotion/styled` with `crownColors/crownFonts/crownMedia`; no inline colors.

**Tests:** Vitest + Testing Library from `tests/test-utils`; msw via `startMockServer()`; `renderWithProviders`; user-centric queries (`getByRole`, `getByLabelText`); no snapshot tests.

**Naming:** PascalCase components, camelCase hooks/functions, i18n keys `crownRegistration.<area>.<name>`.

**Upstream-edit rule (PRD §6.4, memory "minimize upstream merge conflicts"):** Crown code goes in new files. The only upstream-owned edits in this phase are one added line in `src/index.d.ts` and the `en.json` keys. `base.ts` and `registration.ts` are already Crown-edited. Record the `index.d.ts` line in PRD §6.4.

---

## IMPLEMENTATION PLAN

### Phase A: Spike and foundations
Prove the widget works in the iframe, then add config and types.

### Phase B: Turnstile
Loader, component, token lifecycle.

### Phase C: USPS verification
Pure helpers, dialog, orchestration hook.

### Phase D: Integration
Rewire the submit hook and the form, add i18n keys.

### Phase E: Tests, docs, validation
Page tests, runbook, PRD updates, lint/knip/tsc.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable. **Task 1 is a gate: stop and report to the user before continuing if Plan A does not work.**

### Task 1. SPIKE: Turnstile inside the ThemeFrame iframe (manual, throwaway code)

- **IMPLEMENT**: On a scratch branch (or uncommitted, discard afterwards), temporarily add to `RegistrationForm/index.tsx` a `useEffect` that, using `themeFrameSelector`, injects `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` into the iframe `<head>`, waits for `frame.defaultView.turnstile`, and calls `turnstile.render(<div appended to frame.body>, { sitekey, action: 'registration', callback: (t) => console.log(t) })`. Run `yarn dev` from `apps/storefront/`.
- **CHECK 1 (test key)**: with `1x00000000000000000000AA` a token (`XXXX.DUMMY.TOKEN.XXXX`) is logged and no console errors appear. Also try `3x00000000000000000000FF` (interactive challenge is visible and clickable inside the iframe) and `2x00000000000000000000AB` (error state).
- **CHECK 2 (real key, needs the user)**: create a temporary real Turnstile widget (hostnames: the dev host) and use its site key and secret. Render it in the iframe, copy the token, then from a terminal: `curl -s https://challenges.cloudflare.com/turnstile/v0/siteverify -d "secret=<SECRET>" -d "response=<TOKEN>"`. Record `success`, **`hostname`** and **`action`**. Never commit or paste the secret into the repo.
- **CHECK 3**: confirm `render` accepts an `HTMLElement` (not only a selector), and whether `error 110200` (domain not allowed) or similar appears because the iframe document is `about:blank`.
- **GOTCHA**: `ThemeFrame` writes content via `document.open/write` (`ThemeFrame.tsx:12-21`, called with `forceWrite = true` at line ~103). A document with an `about:blank` URL may not give Turnstile a usable hostname.
- **DELIVERABLE**: a short findings note appended to the "Notes" section of this plan: works / does not work, what `hostname` siteverify returned (tell the backend owner so their allowlist is correct), and the chosen plan.
  - **Plan A** (works): continue with Tasks 4-5 as written.
  - **Plan B** (does not work): STOP and ask the user. The fallback is rendering the widget in the host page (or a small hosted iframe) and bridging the token with `postMessage`, the `frameCaptchaCode.js` pattern (`components/captcha/frameCaptchaCode.js`). That changes Tasks 4-5.
- **VALIDATE**: manual; findings recorded; scratch code removed (`git status` shows no change to `RegistrationForm/index.tsx`).

### UPDATE apps/storefront/src/index.d.ts

- **ADD**: `turnstileSiteKey?: string;` inside `Window.B3.setting`, directly after `vsEnvironment: string;` (line 65). Keep it optional: the type is shared with test fixtures that build `window.B3` literals, and the runtime code must handle a missing value anyway.
- **VALIDATE**: `cd apps/storefront && yarn tsc --noEmit`

### UPDATE apps/storefront/index.html

- **ADD**: `turnstileSiteKey: "1x00000000000000000000AA"` (Cloudflare's always-pass test key) to the `window.B3.setting` object (lines 333-343), after `vsEnvironment`. Remember the preceding line needs a comma. This file is only the local-dev harness; on the real site the Script Manager snippet defines `window.B3.setting`.
- **GOTCHA**: the local VS API must be configured with the matching test secret (`1x0000000000000000000000000000000AA`), or the real token flow fails. Record this in the runbook.
- **VALIDATE**: `cd apps/storefront && yarn dev` starts and `window.B3.setting.turnstileSiteKey` is set in the browser console.

### UPDATE apps/storefront/src/shared/service/vs/request/base.ts

- **REMOVE**: the `ENVIRONMENT_VS_TURNSTILE_SITE_KEY` map and its `TODO(Crown)` comment (lines 18-25). Keep the surrounding `// cspell:disable` / `// cspell:enable` markers valid (the app client id map still needs them).
- **IMPLEMENT**:
  - `getVSTurnstileSiteKey(): string` returns `window.B3?.setting?.turnstileSiteKey?.trim() ?? ''`. No environment parameter, no fallback. (Verify no other caller passes an argument: `grep -rn getVSTurnstileSiteKey apps/storefront/src`.)
  - Add and export `isTurnstileTestSiteKey(key: string): boolean` = `/^[123]x0{20}[A-Z]{2}$/.test(key)` (Cloudflare's dummy keys: digit, `x`, 20 zeros, two letters).
- **PATTERN**: the `window.B3?.setting?.vsEnvironment` read at `base.ts:44-46`.
- **GOTCHA**: do not import the store, Redux or the JWT module here; this file is imported by `anonymousFetch`, which must never reach the customer JWT. Read `window.B3.setting` at call time (not at module load), because the Script Manager snippet defines it before the app loads but tests change it per test.
- **VALIDATE**: `cd apps/storefront && yarn vitest run src/shared/service/vs/request/base.test.ts` (after the next task)

### CREATE apps/storefront/src/shared/service/vs/request/base.test.ts

- **IMPLEMENT**: tests: returns the trimmed `window.B3.setting.turnstileSiteKey`; returns `''` when the setting is undefined, empty or whitespace; returns `''` when `window.B3` has no `setting`; reflects a changed value on the next call (read at call time); `isTurnstileTestSiteKey` true for all five dummy keys, false for a realistic key like `0x4AAAAAAAxxxxxxxxxxxxxx`. Restore `window.B3.setting` in `afterEach` (tests set it globally in `tests/setup-test-environment.ts`).
- **VALIDATE**: `cd apps/storefront && yarn vitest run src/shared/service/vs/request/base.test.ts`

### UPDATE apps/storefront/src/shared/service/vs/api/registration.ts

- **ADD**: `export const REGISTRATION_TURNSTILE_ACTION = 'registration';` with a one-line comment "must match the VS API's expected siteverify action". `shared/service/vs/index.ts` already does `export *` from this file, and `getVSTurnstileSiteKey` is already exported there; also export `isTurnstileTestSiteKey` from `index.ts` (one line).
- **GOTCHA**: knip fails on unused exports, so these must be imported in Tasks 5 and the guard below.
- **VALIDATE**: `cd apps/storefront && yarn tsc --noEmit`

### CREATE .../RegistrationForm/loadTurnstile.ts (Plan A)

- **IMPLEMENT**:
  - Export types: `TurnstileRenderOptions` (`sitekey`, `action?`, `theme?: 'light' | 'dark' | 'auto'`, `size?: 'normal' | 'flexible' | 'compact'`, `callback(token)`, `'expired-callback'?()`, `'error-callback'?(code?: string)`, `'timeout-callback'?()`), and `TurnstileApi` (`render(el: HTMLElement, options): string`, `reset(widgetId): void`, `remove(widgetId): void`).
  - `loadTurnstile(doc: Document): Promise<TurnstileApi>`: if `doc.defaultView.turnstile` exists, resolve it. Otherwise append (once, marked `data-crown-turnstile`) a `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer>` to `doc.head`; resolve on `load` with `doc.defaultView.turnstile`, reject on `error` (or when the global is missing after load). Cache the in-flight promise per document in a `WeakMap<Document, Promise<TurnstileApi>>`; **delete the cache entry on failure** so a retry can run, and remove the failed `<script>` element so it can be re-added.
- **PATTERN**: `useTypekitFonts.ts` (idempotent marker attribute) and `Captcha.tsx:17-23`.
- **GOTCHA**: the global lives on the **iframe's** window (`doc.defaultView`), not the host `window`. Type it as `Window & { turnstile?: TurnstileApi }`. Never add the script to the host document. Do not self-host or cache `api.js`.
- **VALIDATE**: `cd apps/storefront && yarn vitest run src/pages/CrownRegistration/RegistrationForm/loadTurnstile.test.ts`

### CREATE .../RegistrationForm/loadTurnstile.test.ts

- **IMPLEMENT**: use `document.implementation.createHTMLDocument()` (jsdom) as the frame. Cases: injects exactly one script with the exact URL even when called twice; resolves when the test sets `defaultView.turnstile` and dispatches `load`; resolves immediately if the global exists; rejects on `error`; after a failure a second call injects a fresh script and can succeed. If jsdom's `createHTMLDocument` has no `defaultView`, use a real `ThemeFrame` as in `useTypekitFonts.test.tsx` and read the document from the store.
- **VALIDATE**: same command as above.

### CREATE .../RegistrationForm/Turnstile.tsx (Plan A)

- **IMPLEMENT**: `forwardRef<TurnstileHandle, TurnstileProps>`; `TurnstileHandle = { reset(): void }`. Props: `onToken(token: string | null): void` only. The site key is `getVSTurnstileSiteKey()` (read inside the effect so it reflects the current `window.B3.setting`) and the action is `REGISTRATION_TURNSTILE_ACTION`; tests set `window.B3.setting.turnstileSiteKey` instead of passing a prop.
  - **Missing key (fail closed):** if `getVSTurnstileSiteKey()` is empty, do not load the script or render a widget; set status `'notConfigured'`, call `b2bLogger.error('Turnstile site key is not configured (window.B3.setting.turnstileSiteKey)')` once, and show `crownRegistration.turnstile.notConfigured` (`role="alert"`). Submit stays disabled because no token can arrive.
  - Reads `themeFrameSelector`. When present, `loadTurnstile(frame)` then `api.render(containerRef.current, { sitekey, action, theme: 'light', size: 'normal', callback: (t) => { setHasToken(true); onToken(t); }, 'expired-callback': clear, 'error-callback': () => { clear(); setStatus('widgetError'); }, 'timeout-callback': clear })` where `clear` = `setHasToken(false); onToken(null)`.
  - `useImperativeHandle`: `reset()` calls `api.reset(widgetId)` and `clear()`.
  - Effect cleanup: `api.remove(widgetId)` (it fires no callbacks) and `onToken(null)`. Guard against React StrictMode double effects and a late-resolving load promise (use a `cancelled` flag).
  - Status state: `'loading' | 'ready' | 'loadError' | 'widgetError' | 'notConfigured'`. Render: the container div, then a helper line: while no token and no error, `crownRegistration.turnstile.helper` ("Complete the verification above to enable Submit", `aria-live="polite"`); on `loadError`, `role="alert"` text `crownRegistration.turnstile.loadError` plus a small "Try again" button (`crownRegistration.turnstile.retry`) that re-runs the load (bump a `attempt` state in the effect deps); on `widgetError`, `crownRegistration.turnstile.widgetError`.
  - **Test-key guard**: on mount, if `isTurnstileTestSiteKey(siteKey)` and `getVSAPIBaseURL() === getVSAPIBaseURL(Environment.Production)`, call `b2bLogger.error('Turnstile test site key in use in production')` once. (The key now comes from the theme setting, so this guards against someone leaving a Cloudflare test key in the production theme setting.)
  - Placement/size: normal (300px) widget fits at 375px (card side padding 20px + page 16px).
- **PATTERN**: `useTypekitFonts.ts` for the iframe read/cleanup; `Captcha.tsx` for the overall role.
- **IMPORTS**: `themeFrameSelector, useAppSelector` from `@/store`; `useB3Lang` from `@/lib/lang`; `getVSTurnstileSiteKey, isTurnstileTestSiteKey, REGISTRATION_TURNSTILE_ACTION` from `@/shared/service/vs`; `getVSAPIBaseURL` from `@/shared/service/vs/request/base`; `Environment` from `@/types`; `b2bLogger` from `@/utils/b3Logger`.
- **GOTCHA**: use only the documented option names (verify them on the widget-configurations page, Task 1). Do not put the token in Redux, `localStorage` or the console. A reset must clear the token immediately so Submit disables until the new token arrives.
- **VALIDATE**: `cd apps/storefront && yarn vitest run src/pages/CrownRegistration/RegistrationForm/Turnstile.test.tsx`

### CREATE .../RegistrationForm/Turnstile.test.tsx

- **IMPLEMENT**: render inside a real `ThemeFrame` (as `useTypekitFonts.test.tsx`) and `vi.mock('./loadTurnstile')` to return a fake `TurnstileApi` (`render` stores the options and returns `'w1'`; `reset`, `remove` are `vi.fn`). Set `window.B3.setting.turnstileSiteKey` in a `beforeEach` and restore it in `afterEach`. Cases: renders with the site key from the setting and `action: 'registration'`; with an empty/missing setting it renders no widget, never calls the loader, shows the "not configured" alert and logs once; helper text shows until the callback fires, then disappears and `onToken` gets the token; `expired-callback` clears the token; `error-callback` shows the widget error; `ref.reset()` calls `api.reset('w1')` and emits `onToken(null)`; unmount calls `api.remove('w1')`; load rejection shows the alert and "Try again" re-invokes the loader; production + test key logs once (spy on `b2bLogger.error`); no log in local env.
- **VALIDATE**: same command as above.

### CREATE .../RegistrationForm/addressVerification.ts

- **IMPLEMENT** pure helpers (no React):
  - `type VerifiedScope = 'billing' | 'shipping'`; `prefixFor(scope): AddressPrefix`.
  - `readAddress(values: RegistrationFormValues, prefix: AddressPrefix): RegistrationAddress`: trimmed values (same trimming as `buildSubmission.buildAddress`, but without `stateName`).
  - `addressKey(address: RegistrationAddress): string`: canonical key (uppercased, trimmed, collapsed whitespace, joined with `|`) used for the "already decided" cache.
  - `getAddressesToVerify(values): { scope: VerifiedScope; address: RegistrationAddress }[]`: billing first; shipping only when `!values.sameAsBilling`; **only entries with `country === 'US'`**.
  - `addressFieldUpdates(prefix, address): Partial<RegistrationFormValues>`: `{ [`${prefix}Address1`], ...Address2, ...City, ...State, ...Zip }` (country is left alone).
  - `primaryField(prefix): 'bAddress1' | 'sAddress1'` for focusing.
- **IMPORTS**: `RegistrationAddress` from `@/shared/service/vs`; `AddressPrefix, RegistrationFormValues` from `./schema`.
- **VALIDATE**: `cd apps/storefront && yarn vitest run src/pages/CrownRegistration/RegistrationForm/addressVerification.test.ts`

### CREATE .../RegistrationForm/addressVerification.test.ts

- **IMPLEMENT**: billing only when same as billing; both when different; Canadian addresses excluded; shipping US while billing CA; `addressKey` ignores case and extra spaces but differs on ZIP; `addressFieldUpdates` maps all five fields.
- **VALIDATE**: same command as above.

### CREATE .../RegistrationForm/AddressVerificationDialog.tsx

- **IMPLEMENT**: props `{ open: boolean; scope: VerifiedScope; entered: RegistrationAddress; suggested: RegistrationAddress; changes: string[]; onUse(choice: 'suggested' | 'entered'): void; onEdit(): void }`.
  - MUI `Dialog` rendered into an in-tree container (`<Box ref>` as `B3Dialog.tsx:70-96`), `maxWidth` 620px, `aria-labelledby` the title, white paper with a `4px solid navy` top border and the design's shadow; scrim `crownColors.scrim`.
  - Header: H2 "Verify your address" (`crownFonts.comp`, 600, 30px, uppercase, navy) and a 34x34 close button (`aria-label` from i18n) that calls `onEdit`.
  - Two radio cards (a `radiogroup`, native `<input type="radio">` with `accent-color: navy`): "USPS recommended" (default selected) shows two lines (`address1 [address2]`, then `CITY, ST ZIP`) plus the note (`changes.join(', ')` or the default note key); "What you entered" shows the entered address in `bodyText` color. Selected card: `2px solid navy` and `selectedCardFill`; unselected: `2px solid border`.
  - Actions right-aligned: "Edit address" (secondary: white, `2px solid navy`, hover navy fill) and "Use this address" (primary red). Esc and the close button call `onEdit`. Backdrop click should also call `onEdit` (do not silently use an address).
  - The selected choice resets to `suggested` whenever the dialog opens for a new address.
  - Screen-reader: announce which address scope (billing/shipping) the dialog is about, e.g. a visually-hidden or visible sub-line "Billing address" / "Shipping address" (`crownRegistration.verify.scopeBilling/scopeShipping`).
- **PATTERN**: `docs/registration.md` §3 and `docs/screenshots/registration-address-validation-modal.png`; styled components in `styled.ts` style.
- **GOTCHA**: focus trap and Esc come from MUI `Dialog` only when it is mounted in the correct document; test with a real `ThemeFrame`. Hover colors per spec; no animations. Add the new styled pieces to a local `AddressVerificationDialog.styled.ts` only if the file grows past ~250 lines; otherwise keep them in the component file.
- **VALIDATE**: `cd apps/storefront && yarn vitest run src/pages/CrownRegistration/RegistrationForm/AddressVerificationDialog.test.tsx`

### CREATE .../RegistrationForm/AddressVerificationDialog.test.tsx

- **IMPLEMENT** (render inside `ThemeFrame`): shows both addresses and the recommended option selected by default; the note uses `changes` and falls back to the default; choosing "What you entered" then "Use this address" calls `onUse('entered')`; default calls `onUse('suggested')`; "Edit address", the close button and Esc each call `onEdit`; keyboard: Tab stays inside the dialog; the dialog has role `dialog` with an accessible name.
- **VALIDATE**: same command as above.

### CREATE .../RegistrationForm/useAddressVerification.ts

- **IMPLEMENT**: `useAddressVerification(form: Pick<UseFormReturn<RegistrationFormValues>, 'getValues' | 'setValue'>)` returns `{ verifyAddresses, dialogProps }`.
  - `verifyAddresses(): Promise<{ ok: true } | { ok: false; field: 'bAddress1' | 'sAddress1' }>`:
    1. `getAddressesToVerify(getValues())`, in order.
    2. For each: if `addressKey` is in the `decided` set (a `useRef<Set<string>>`), skip (no API call).
    3. Else `await validateAddress(address)`. `match` / `unverifiable` → add key to `decided`, continue. Thrown error (including timeout, `status 0`, 5xx) → `b2bLogger.error('Address validation failed', error)`, continue **without** adding to `decided` (so a retry may succeed).
    4. `corrected` with a `suggested` → open the dialog (set `dialogState`, return a promise resolved by `onUse`/`onEdit`). `onUse('suggested')` → `setValue` each field from `addressFieldUpdates` (`shouldDirty: true`), add **both** the entered key and the suggested key to `decided`. `onUse('entered')` → add the entered key. `onEdit()` → resolve `{ ok: false, field: primaryField(prefix) }` and stop (the rest of the addresses are not prompted).
    5. Status `corrected` without `suggested` is treated as `unverifiable`.
  - `dialogProps` is `null` when closed, otherwise the props for `AddressVerificationDialog`.
  - On unmount while a prompt is pending, resolve it as `{ ok: false, ... }` so nothing hangs.
- **GOTCHA**: after the user applies a suggestion, the submit code must re-read `getValues()` (the `values` argument is a stale snapshot). When `sameAsBilling` is true only billing is verified (the server copies billing to shipping). Never call `validateAddress` for CA. The API client already enforces the 8 s timeout (`ADDRESS_VALIDATION_TIMEOUT_MS`).
- **IMPORTS**: `validateAddress` from `@/shared/service/vs`; `b2bLogger` from `@/utils/b3Logger`; helpers from `./addressVerification`.
- **VALIDATE**: `cd apps/storefront && yarn vitest run src/pages/CrownRegistration/RegistrationForm/useAddressVerification.test.tsx`

### CREATE .../RegistrationForm/useAddressVerification.test.tsx

- **IMPLEMENT** with `renderHook` and a real `useForm`, `validateAddress` mocked with `vi.spyOn` on the `@/shared/service/vs` module or msw (match the existing `registration.test.ts` approach), and `b2bLogger.error` spied. Cases: `match` continues; `unverifiable` continues; `corrected` opens the dialog; use suggested writes the five fields and resolves `ok`; use entered leaves the form unchanged; edit resolves `{ ok: false, field }`; error/timeout logs and continues; CA is never called; separate shipping verified after billing, and a billing "edit" skips shipping; decision remembered (second `verifyAddresses` makes no API call) and re-validated after the address is edited; shipping not verified when same as billing.
- **VALIDATE**: same command as above.

### UPDATE apps/storefront/src/lib/lang/locales/en.json

- **ADD** to the contiguous `crownRegistration.*` block (the same area as lines ~71-76):
  - `crownRegistration.turnstile.helper`: "Complete the verification above to enable Submit"
  - `crownRegistration.turnstile.loadError`: "We couldn't load the verification check. Disable any content blocker for this page and try again."
  - `crownRegistration.turnstile.widgetError`: "Verification could not complete. Please try again."
  - `crownRegistration.turnstile.retry`: "Try again"
  - `crownRegistration.turnstile.notConfigured`: "Verification is not available right now. Please contact customer support."
  - `crownRegistration.error.turnstileMissing`: "Complete the verification before submitting"
  - `crownRegistration.button.verifying`: "Verifying address…"
  - `crownRegistration.verify.title`: "Verify your address"
  - `crownRegistration.verify.close`: "Close"
  - `crownRegistration.verify.scopeBilling`: "Billing address"
  - `crownRegistration.verify.scopeShipping`: "Shipping address"
  - `crownRegistration.verify.recommended`: "USPS recommended"
  - `crownRegistration.verify.entered`: "What you entered"
  - `crownRegistration.verify.noteDefault`: "Standardized to USPS format."
  - `crownRegistration.verify.edit`: "Edit address"
  - `crownRegistration.verify.use`: "Use this address"
- **GOTCHA**: one contiguous block only (upstream merge hygiene); keys must be unique (knip/duplicates, and `generate-translations-csv.ts` on build).
- **VALIDATE**: `cd apps/storefront && yarn tsc --noEmit && yarn vitest run src/pages/CrownRegistration`

### UPDATE .../RegistrationForm/buildSubmission.ts

- **REMOVE**: the `DEV_TURNSTILE_TOKEN` export and its comment (lines 7-8). `buildSubmission(values, countries, turnstileToken)` keeps its signature.
- **UPDATE** `buildSubmission.test.ts`: replace any use of `DEV_TURNSTILE_TOKEN` with a local `'test-token'` constant.
- **VALIDATE**: `cd apps/storefront && yarn vitest run src/pages/CrownRegistration/RegistrationForm/buildSubmission.test.ts`

### UPDATE .../RegistrationForm/useRegistrationSubmit.ts

- **IMPLEMENT**: new args: `form: Pick<UseFormReturn<RegistrationFormValues>, 'setError' | 'setFocus' | 'getValues'>`, `getToken: () => string | null`, `verifyAddresses: () => Promise<VerifyOutcome>`; `onFailure` becomes required semantics ("reset the widget"). Return adds `isVerifying`.
  - Flow inside the existing `try/finally` and `isSubmittingRef` guard:
    1. `if (!getToken())` → `setBannerKey('crownRegistration.error.turnstileMissing')`; return.
    2. `setIsVerifying(true)`; `const outcome = await verifyAddresses()`; `setIsVerifying(false)` (in `finally`). If `!outcome.ok` → `setFocus(outcome.field)`; return (no reset: the token was not consumed).
    3. `const fresh = form.getValues()`; `const token = getToken()`; if null → banner as step 1; return. (Read the token **after** the modal: it may have been refreshed or have expired while the modal was open.)
    4. `buildSubmission(fresh, countries, token)`; the region-error branch is unchanged.
    5. `registerBusinessAccount(...)`; success → `onSuccess({ referenceId }, fresh)`; failure → existing `mapServerErrors` handling, then `onFailure()` (**always**, including network errors: the token may have been consumed).
- **GOTCHA**: a failure after the dialog must not re-prompt (the `decided` set handles it). `onSuccess` should receive `fresh` so the confirmation shows what was actually sent. Keep the `isSubmitting` boolean for the button label logic; add `isVerifying` separately.
- **VALIDATE**: `cd apps/storefront && yarn tsc --noEmit`

### UPDATE .../RegistrationForm/index.tsx

- **IMPLEMENT**:
  - `const turnstileRef = useRef<TurnstileHandle>(null)`, `const tokenRef = useRef<string | null>(null)`, `const [hasToken, setHasToken] = useState(false)`; `handleToken = useCallback((token) => { tokenRef.current = token; setHasToken(token !== null); }, [])`.
  - `const verification = useAddressVerification(form)`; pass `getToken: () => tokenRef.current`, `verifyAddresses: verification.verifyAddresses`, `onFailure: () => turnstileRef.current?.reset()` to `useRegistrationSubmit`.
  - In the Submit section render `<Turnstile ref={turnstileRef} onToken={handleToken} />` inside `SubmitRow`, above the error summary/banner and button. Button: `disabled={isSubmitting || isVerifying || !hasToken}`; label `verifying` while `isVerifying`, `submitting` while `isSubmitting`, else `submit`. Add `aria-describedby` pointing at the Turnstile helper id when disabled for lack of a token.
  - Render `{verification.dialogProps && <AddressVerificationDialog {...verification.dialogProps} />}` as a sibling of the `<form>` (wrap the return in a fragment).
- **GOTCHA**: remounting the form with a new `key` (the "Submit another account" flow) unmounts `Turnstile` (calls `remove`) and a new widget is created; `hasToken` starts false. Keep `onInvalid`'s summary behavior unchanged. The privacy checkbox and Turnstile are independent; both must pass.
- **VALIDATE**: `cd apps/storefront && yarn tsc --noEmit && yarn vitest run src/pages/CrownRegistration`

### UPDATE apps/storefront/src/pages/CrownRegistration/index.test.tsx

- **IMPLEMENT**: at the top `vi.mock('./RegistrationForm/Turnstile')` with a factory returning a `Turnstile` fake built with `forwardRef`: on mount call `props.onToken('test-token')`, expose `reset` as a shared `vi.fn()` (`turnstileReset`), and render nothing. Add a way for single tests to start tokenless (a module-level `let tokenOnMount: string | null = 'test-token'`). Existing submit tests keep working; assert the request body carries `turnstileToken: 'test-token'`.
- **ADD tests**:
  - Submit is disabled with no token and enabled once the fake emits one.
  - Failed submit (`failWith(400, [{ code: 'TURNSTILE_FAILED', message: ... }])`) shows "Verification failed, please try again" and calls `turnstileReset` once; also reset after a 500 and after a network error.
  - A successful submit does not reset.
  - USPS: `server.use(http.post(`${getVSAPIBaseURL()}/storefront/registration/validate-address/`, ...))` returning `corrected`; modal appears with "Verify your address"; "Use this address" writes the suggested address into the form (assert field values) and the registration request body contains it and the live token; "What you entered" sends the entered address; "Edit address" sends **no** registration request and focuses the billing street address.
  - Validation endpoint returning 500 or aborting: `b2bLogger.error` called, submit still goes through.
  - Canadian billing address: `validate-address` is never requested (track with a flag in the handler).
  - Separate shipping: two sequential prompts (billing, then shipping); an "Edit" on billing means no shipping prompt.
  - Retry after `EMAIL_EXISTS` does not re-open the modal or call `validate-address` again for an unchanged address.
  - Button text shows "Verifying address…" while the validate call is pending (use `delay`).
- **PATTERN**: helpers already in the file (`fillValidForm`, `respondWith`, `failWith`, `startMockServer`). Existing tests that assert `b2bLogger` use `vi.spyOn(b2bLogger, 'error')`.
- **GOTCHA**: the dialog renders inside the in-tree container, so queries by role still find it. With the mocked Turnstile there is no `ThemeFrame` in the page tests; the dialog test coverage of iframe behavior lives in `AddressVerificationDialog.test.tsx`.
- **VALIDATE**: `cd apps/storefront && yarn vitest run src/pages/CrownRegistration`

### CREATE docs/turnstile-manual-testing.md (runbook)

- **IMPLEMENT**: a short runbook with: how to change the site key (on the real site: edit the BigCommerce theme setting that holds the Turnstile site key, which the Script Manager snippet copies into `window.B3.setting.turnstileSiteKey`; locally: edit `apps/storefront/index.html`; changing it in the browser console does not work, because `window.B3` is defined by the snippet before the app loads, so use the theme setting or a scratch theme), and the paired-key matrix. Include a row for an empty site key (expect the "not configured" message and a disabled Submit). Every row also states the exact **VS API secret** to configure.

| # | Site key (client) | VS API secret (server) | Expected |
|---|---|---|---|
| 1 | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` | Widget passes; submit succeeds |
| 2 | `1x00000000000000000000AA` | `2x0000000000000000000000000000000AA` | `TURNSTILE_FAILED` banner; widget resets; token cleared so Submit disables until a new token arrives |
| 3 | `1x00000000000000000000AA` | `3x0000000000000000000000000000000AA` | Same banner (server reports `timeout-or-duplicate`); log reason server-side |
| 4 | `2x00000000000000000000AB` | any | Widget shows its error; no token; Submit stays disabled; widget error text appears |
| 5 | `3x00000000000000000000FF` | `1x…AA` | Interactive challenge renders inside the card at 375px and 1440px; Submit enables only after solving |
| 6 | real site key | real secret | Real token accepted; the server sees `action == "registration"` and the expected `hostname` (record it) |
| 7 | real site key | real secret, token replayed | Second use of the same token is rejected (single use) |

  Also list: block `challenges.cloudflare.com` (devtools request blocking) to see the load-error message and "Try again"; wait 5+ minutes with the widget idle to confirm auto-refresh produces a new token; test rows 1-5 at 375px width.
- **GOTCHA**: test secrets accept only the dummy token and real secrets reject it, so site key and secret must always be changed **together**. With test keys `siteverify` returns `hostname: "example.com"` and no `action`, so the VS API's action/hostname checks must be relaxed (or bypassed) in test environments. Row 6 is the only row that exercises them.
- **VALIDATE**: manual read-through; `cd apps/storefront && yarn lint:eslint` unaffected (markdown).

### UPDATE PRD.md

- **UPDATE** (keep edits small and factual):
  - §6.4 upstream edits table: add `src/index.d.ts` (one line, `turnstileSiteKey?`) and `apps/storefront/index.html` (local-dev site key).
  - §4 and §9: the `request/base.ts` Turnstile site key map no longer exists; the key comes from `window.B3.setting.turnstileSiteKey` (BigCommerce theme setting via the Script Manager snippet). Update the "Deployment" bullet in §4 ("Turnstile site key per environment ... set in `request/base.ts`") and the §9 configuration row (location, values, and that staging/production keys are theme settings, not code).
  - §7.8: add `action: 'registration'`, the missing-key fail-closed behavior, and the Plan A/B outcome of the spike; fix the render-option names if the spike showed differences.
  - §9 configuration table: add the corrected secret-key values from the testing page.
  - §10.1 "Expected server behavior" step 1: "Verify the token with siteverify: `success`, `action == 'registration'`, and `hostname` in the allowlist. Log the specific failure reason; return `TURNSTILE_FAILED` for all of them."
  - §12 Phase 3: replace the ✅ marks with the real status after implementation.
- **VALIDATE**: `git diff PRD.md` reviewed.

### FINAL: lint, knip, types, graph

- **VALIDATE** (from `apps/storefront/`):
  - `yarn tsc --noEmit`
  - `yarn lint` (runs depcruise, eslint with `--max-warnings 0`, and knip)
  - `yarn vitest run src/pages/CrownRegistration src/shared/service/vs`
  - From repo root: `py -m graphify update .`

---

## TESTING STRATEGY

### Unit Tests
- `base.test.ts` (site key from `window.B3.setting`, test-key detector), `loadTurnstile.test.ts`, `Turnstile.test.tsx`, `addressVerification.test.ts`, `AddressVerificationDialog.test.tsx`, `useAddressVerification.test.tsx`, updated `buildSubmission.test.ts`. Each new file has a co-located `*.test.ts(x)`.

### Integration Tests
- `index.test.tsx` page flows with msw (see the task above): token gating, reset after each failure kind, the modal choices, validation-endpoint failure, Canadian skip, two-address sequencing, remembered decisions, button states.

### Manual (cannot be automated)
- The paired-key matrix in `docs/turnstile-manual-testing.md`, plus the spike findings (real hostname behavior in the iframe). Real-token verification needs the VS API with a real secret (Phase 4).

### Edge Cases
- Token expires while the USPS modal is open (token read after the modal; auto-refresh).
- User edits an address after choosing "What you entered" (re-verifies).
- USPS suggests a state code not in the region list (`regionNotFound` inline error).
- `corrected` without `suggested`; unknown `status` string (treat as `unverifiable`, log nothing).
- Double click on Submit during verification (guarded by `isSubmittingRef`).
- Form remount ("Submit another account") leaves no stale widget or token.
- Script blocked, slow, or loaded twice.
- Production build with a Cloudflare test key (logged).

---

## VALIDATION COMMANDS

Run from `apps/storefront/` (AGENTS.md: all commands run there).

### Level 1: Syntax & Style
- `yarn tsc --noEmit`
- `yarn lint`

### Level 2: Unit Tests
- `yarn vitest run src/pages/CrownRegistration src/shared/service/vs`

### Level 3: Regression
- `yarn vitest run` (full suite). Known baseline failures that are **not** from this work: `ShoppingListDetails` and its hooks fail on baseline, and `Registered` is flaky (see project memory).

### Level 4: Manual Validation
- `yarn dev`, open `/register`: the widget renders in Section 04, helper text shows, Submit enables after the token. Enter a US address like "123 main st, springfield IL 62701" and confirm the modal flow against `docs/screenshots/registration-address-validation-modal.png`. Run the matrix in `docs/turnstile-manual-testing.md`. Check 1440px and 375px (no horizontal scroll, widget fits).

### Level 5: Additional
- None required.

---

## ACCEPTANCE CRITERIA

- [ ] The spike result is recorded and the user confirmed Plan A (or approved Plan B).
- [ ] The Turnstile widget renders in the portal iframe with `action: 'registration'`; Submit is disabled without a token, with helper text; a script load failure shows a distinct message and a working "Try again".
- [ ] The real token is sent as `turnstileToken`; `DEV_TURNSTILE_TOKEN` is gone.
- [ ] The widget resets (token cleared, Submit disabled until a new token) after every failed registration request, and is not reset after a success or a cancelled verification.
- [ ] US addresses (billing, and shipping when separate) are verified one at a time; a `corrected` result opens the modal; "Use this address" writes the chosen address into the form and the payload; "Edit address", Esc and the close button abort and focus the address.
- [ ] Verification errors and timeouts are logged with `b2bLogger` and never block the submit; Canadian addresses are never sent for validation.
- [ ] Decisions are remembered per address; a retry after a server error does not re-prompt.
- [ ] The site key is read only from `window.B3.setting.turnstileSiteKey`; `ENVIRONMENT_VS_TURNSTILE_SITE_KEY` is gone; a missing or empty key fails closed (no widget, logged, "not configured" message, Submit disabled).
- [ ] All validation commands pass; no new knip or lint errors; coverage for new files is 80%+.
- [ ] Only upstream-owned edits: one line in `index.d.ts`, one line in `index.html` (local dev), and the `en.json` block.
- [ ] `docs/turnstile-manual-testing.md` exists and PRD sections are updated.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order, each validation passed
- [ ] Full test suite run (baseline failures noted separately)
- [ ] `yarn lint` and `yarn tsc --noEmit` clean
- [ ] Manual matrix rows 1-5 run on `yarn dev`; row 6-7 deferred to Phase 4 with the real VS API
- [ ] `py -m graphify update .` run
- [ ] Acceptance criteria all met

---

## NOTES

- **Correction to earlier discussion:** the iframe is filled with `document.open/write`, not `srcdoc`, so its document is `about:blank` with the parent origin. The risk is the same (Turnstile may not see a normal hostname), and Task 1 settles it.
- **Backend items (other repo), to hand to the VS API owner:** (1) verify `success`, `action == "registration"` and `hostname` allowlist, and log the specific reason; (2) test keys give `hostname: "example.com"` and no `action`, so the check must be switchable in non-production; (3) return `TURNSTILE_FAILED` for all three failure types; (4) the hostname the spike observes for the iframe.
- **Phase 4 dependencies:** the real Turnstile site keys must be set in the BigCommerce theme settings for staging and production (the existing custom setting; no code change), the widget's hostname list in Cloudflare must include the storefront domains (and whatever the spike shows for the iframe), CSP allowlist for `https://challenges.cloudflare.com` (script and frame), and the end-to-end run on `crowntest`.
- **Design choices:** "Edit address" focuses the first address field of that section via `setFocus` (testable, and it scrolls into view) rather than the section element. Backdrop click on the modal acts as "Edit address". The widget uses `size: 'normal'` (300px), which fits at 375px.
- **Spike findings (2026-11-11):** Plan A works. With a real Turnstile widget on the local dev server, the widget renders and issues a token inside the ThemeFrame iframe, and siteverify returns `hostname: "localhost"` and `action: "registration"`. So the `about:blank` iframe reports the page's own hostname. Backend owner: allowlist the storefront domains (and `localhost` for dev). Not yet verified on a deployed storefront domain (Phase 4).

**Confidence for one-pass implementation: 7/10.** The pure logic, tests and UI are well specified. The main uncertainty is Task 1, whether Turnstile behaves inside the `about:blank` iframe, plus unverified widget option names that the spike confirms.
