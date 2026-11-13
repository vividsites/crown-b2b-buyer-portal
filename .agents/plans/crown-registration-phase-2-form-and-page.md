# Feature: Crown Registration, Phase 2 Form and Page

This plan should be complete, but before you implement anything, check it against the documentation and the codebase patterns, and make sure each task makes sense.

Pay close attention to the names of existing utilities and types, and import them from the right files.

## Feature Description

Phase 2 of the Crown Business Account Registration project (see `PRD.md` §12, §6, §7, §10). Phase 1 delivered the service layer, the zod schema and the field primitives. Phase 2 assembles them into a working single-page form served at `/register`:

1. Four numbered sections: 01 Your details, 02 Billing address, 03 Shipping address, 04 Submit.
2. Country-aware address fields (US and CA), with region lists from BigCommerce data.
3. Validation on blur, error clearing on edit, a full check on submit, and an error summary banner.
4. A duplicate-email precheck on email blur.
5. Submit through `registerBusinessAccount` with the exact PRD §10.1 payload, including `stateName`.
6. Server error mapping by `code` (including `ADDRESS_EXISTS`).
7. A confirmation screen showing the API's `referenceId`.
8. The route swap and the Login "Create account" change, so `/register` serves the Crown form.

Out of scope for Phase 2 (Phase 3): the Turnstile widget and the Submit gate, and USPS address verification (`validateAddress`, the modal). Phase 2 sends a dev placeholder Turnstile token.

## User Story

As a prospective business buyer,
I want to fill in one page with separate billing and shipping addresses,
So that I can apply for a Crown online account in a couple of minutes and see what happens next.

## Problem Statement

`/register` still serves the stock three-step BigCommerce flow. The Phase 1 pieces are not connected to anything: no form, no page, no route, no hooks for regions, email precheck or submit, and no confirmation screen.

## Solution Statement

Build the page module `src/pages/CrownRegistration/` with react-hook-form and the existing zod schema. Keep the logic that can break in small pure functions (`buildSubmission`, `mapServerErrors`) with their own tests, and put side effects in three hooks (`useRegions`, `useEmailPrecheck`, `useRegistrationSubmit`). Connect with the two upstream edits allowed by PRD §6.4 (route swap, Login button) plus one `en.json` block. The Turnstile token comes from one constant so Phase 3 replaces a single line.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium-High (many small files; correctness lives in form wiring, error mapping and tests)
**Primary Systems Affected**: `src/pages/CrownRegistration/`, `src/shared/routes/index.tsx`, `src/pages/Login/index.tsx`, `src/lib/lang/locales/en.json`
**Dependencies**: `react-hook-form` ^7.71, `zod` ^4.1, `@hookform/resolvers` ^5 (already in `apps/storefront/package.json:30`). No new packages.

**Decisions already made with the user**
- Phase 2 sends `turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX'` (Cloudflare's documented dummy token for the test keys) from a single exported constant marked `// Phase 3`.
- The page header logo comes from `GlobalContext` (`logo`, `isLogoLoaded`), as the stock Registered page does. Do not bundle `crown-logo.png`.
- Phase 2 includes the route swap and Login change (PRD §12). The work stays on the feature branch. The PRD's deployment rule (backend live before release) is about shipping, not about this branch.

---

## CONTEXT REFERENCES

### Relevant Codebase Files. IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

Phase 1 outputs to build on:
- `apps/storefront/src/pages/CrownRegistration/RegistrationForm/schema.ts` (all, 141 lines). Exports `registrationSchema`, `RegistrationFormValues`, `defaultRegistrationValues`, `AddressPrefix`, `EMAIL_PATTERN`, `FREE_EMAIL_PATTERN`, `US_ZIP_PATTERN`, `CA_POSTAL_PATTERN`. Error messages are i18n keys: `crownRegistration.error.required.<field>`, `emailInvalid`, `emailCompany`, `phoneInvalid`, `passwordLength`, `passwordMix`, `passwordMismatch`, `zipUS`, `postalCA`, `privacyRequired`. Shipping rules only run when `sameAsBilling` is false (lines 107-110).
- `.../CrownRegistration/components/CrownTextField.tsx` (lines 8-24 props, 60-71 `onBlur?: (value: string) => void` fires after `field.onBlur()`). The error text is `b3Lang(error.message)`, so `setError` messages must be i18n keys or they render untranslated (unknown keys render as the key, so for server `message` text see Task 8 GOTCHA).
- `.../components/CrownSelect.tsx` (props lines 12-24: `options: {value,label}[]`, `placeholder`, `onChange?: (value: string) => void`).
- `.../components/CrownCheckbox.tsx` (props lines 44-52: `variant: 'boxed' | 'plain'`, `fullRow`, `label: ReactNode`, `onChange?: (checked: boolean) => void`).
- `.../components/ErrorSummary.tsx` (`messages: string[]`, already translated, in field order; shows 3 plus "+N more").
- `.../components/FormSection.tsx` (props `id, number, title, description`; the section element has `tabIndex={-1}`).
- `.../CrownRegistration/styled.ts` (`PageRoot`, `ContentColumn`, `Card`, `CardHeader`, `CardBody`, `FieldGrid`, `FullRow`, `PrimaryButton`, `SecondaryButton`). `.../tokens.ts` (`crownColors`, `crownFonts`, `crownMedia`).
- `apps/storefront/src/shared/service/vs/api/registration.ts` (all, 86 lines). Types `RegistrationSubmission` (no `storeHash`/`channelId`; the client adds them), `RegistrationSubmissionAddress` (has `stateName`), `RegistrationShippingAddress`, `RegistrationCountry`, `REGISTRATION_ERROR_CODES`. `registerBusinessAccount(submission)`.
- `apps/storefront/src/shared/service/vs/request/VSApiError.ts` (all). `VSApiError.errors: { field?, code, message }[]`, `status` (0 = network/timeout), `isVSApiError`.
- `apps/storefront/src/shared/service/vs/index.ts` (lines 5-8). Re-exports the client, `VSApiError`, `isVSApiError`. Import from `@/shared/service/vs`.

Shell and integration patterns to mirror:
- `apps/storefront/src/pages/Registered/index.tsx` (lines 28-58 setup and `registerEnabled` guard; 154-186 render: `useScrollBar(false)`, `B3Card`, `logo`/`isLogoLoaded`). Mirror, do not modify.
- `apps/storefront/src/components/RegisteredCloseButton.tsx` (lines 25-37). The "Browse the catalog" behavior to replicate: `isCloseGotoBCHome || on /login ? window.location.href = getHomeUrl(locales) : navigate('/') + setOpenPage({ isOpen: false, openUrl: '' })`, then `history.replaceState`.
- `apps/storefront/src/lib/lang/getHomeUrl.ts` (all). `getHomeUrl(locales)`.
- `apps/storefront/src/shared/routes/index.tsx` line 40 (`const Registered = lazy(() => import('@/pages/Registered'));`). The `/register` route uses `Registered` at lines ~83-88.
- `apps/storefront/src/pages/Login/index.tsx` line 311 (`handleCreateAccountClick`, currently `window.parent.postMessage({ type: 'create-account' }, '*')`). `navigate` is already declared at line 78. No Login test references `create-account` (`pages/Login/index.test.tsx`), so no test needs updating, but add one assertion (Task 12).
- `apps/storefront/src/hooks/useGetCountry.ts` (lines 7-28). `useSetCountry()` fetches `getB2BCountries()` into `GlobalContext.countriesList` when the list is empty. Reuse it. Do NOT reuse `useGetCountry` (tied to `B3CustomForm` field arrays).
- `apps/storefront/src/shared/global/context/config.ts` (lines 6-17 `State { stateCode?, stateName? }`, `Country { countryCode, countryName, states }`; 33-34 `logo`, `isLogoLoaded`; 60 `registerEnabled`).
- `apps/storefront/src/shared/service/b2b/graphql/users.ts` (lines 59-65). `checkUserEmail({ email, channelId })` returns `{ ..., isValid }`. Exported from `@/shared/service/b2b`.
- `apps/storefront/src/utils/basicConfig.ts` (lines 4-5). `channelId`, `storeHash` exports.
- `apps/storefront/src/components/captcha/Captcha.tsx` (lines 40-80). Iframe script-injection pattern: `useAppSelector(themeFrameSelector)`, `iframeDocument.head.appendChild(...)`, `initialized` ref.
- `apps/storefront/src/store/selectors.ts` line 17 (`themeFrameSelector`); `store/slices/theme.ts` line 4 (`themeFrame?: Document | null`, may be null or undefined).
- `apps/storefront/src/pages/ForgotPassword/index.tsx` (lines 43, 71-92). Double-submit guard pattern with `isSubmittingRef`.
- `apps/storefront/src/utils/b3Logger.ts`. `import b2bLogger from '@/utils/b3Logger'`.
- `apps/storefront/src/pages/PageProps.ts`. `PageProps { setOpenPage }`.

Test patterns:
- `apps/storefront/tests/test-utils.tsx` (lines 59-98 `renderWithProviders` returns `{ user, store, navigation, result }`, options `initialGlobalContext`, `preloadedState`, `initialEntries`; line 157-168 re-exports `startMockServer`, `http`, `HttpResponse`, `graphql`, `faker`, `builder`, `buildGlobalStateWith`, testing-library).
- `apps/storefront/tests/mockServer.ts` (all). `startMockServer()` returns `{ server }`; unmocked requests error.
- `apps/storefront/src/shared/service/vs/api/registration.test.ts` (lines 1-40). msw plus `getVSAPIBaseURL()` and `builder` patterns for VS calls.
- `apps/storefront/src/pages/CrownRegistration/components/CrownTextField.test.tsx` (lines 1-60). Harness-with-`useForm` pattern.
- `apps/storefront/src/pages/Registered/index.test.tsx` (lines 52-69 `mockCountries`; 1086 `vi.spyOn(b2bService, 'getB2BCountries')`). Prefer passing `initialGlobalContext: { countriesList }` to avoid the fetch.
- `apps/storefront/vite.config.ts` and `tests/setup-test-environment.ts`. `vitest-fail-on-console` is active: any `console.*` call fails the test.

Project rules:
- `AGENTS.md` (Matroska layout, testing philosophy, import rules, no `any`). `CLAUDE.md` (run `py -m graphify update .` after code changes).
- Memory: minimize upstream conflicts (Crown code in new files; upstream edits as small as possible).

### New Files to Create

All under `apps/storefront/src/pages/CrownRegistration/`:
- `index.tsx`, `index.test.tsx`: page shell, guard, form-to-confirmation switch.
- `RegistrationConfirmation.tsx`, `RegistrationConfirmation.test.tsx`.
- `useTypekitFonts.ts`, `useTypekitFonts.test.ts`.
- `RegistrationForm/index.tsx`: form assembly.
- `RegistrationForm/AddressFields.tsx`.
- `RegistrationForm/regions.ts`, `regions.test.ts`: `US_REGION_CODES` allowlist and pure region helpers.
- `RegistrationForm/useRegions.ts`, `useRegions.test.tsx`.
- `RegistrationForm/useEmailPrecheck.ts`, `useEmailPrecheck.test.tsx`.
- `RegistrationForm/buildSubmission.ts`, `buildSubmission.test.ts`: pure payload builder.
- `RegistrationForm/mapServerErrors.ts`, `mapServerErrors.test.ts`: pure server-error mapper.
- `RegistrationForm/useRegistrationSubmit.ts`.

### Relevant Documentation. YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `PRD.md` §6.4 (the only upstream edits), §7.1-7.6 and §7.9-7.10 (page, fields, validation, confirmation, responsive), §10.1 (payload and error table, lines 400-475).
- `docs/registration.md` (design handoff: field anatomy, copy, section layout) and `docs/screenshots/registration-same-as-billing.png`, `registration-separate-shipping.png`.
- [react-hook-form `useForm`](https://react-hook-form.com/docs/useform): `mode`, `reValidateMode`, `shouldFocusError`.
  - Why: `mode: 'onBlur'` plus `reValidateMode: 'onBlur'` gives validate-on-blur.
- [react-hook-form `watch` callback](https://react-hook-form.com/docs/useform/watch#rules): the subscription form `watch((value, { name, type }) => ...)`.
  - Why: `type === 'change'` identifies user edits (to clear that field's error) as opposed to programmatic `setValue`.
- [react-hook-form `trigger`](https://react-hook-form.com/docs/useform/trigger) and [`setFocus`](https://react-hook-form.com/docs/useform/setfocus).
  - Why: the email precheck awaits `trigger('email')`; `setFocus` focuses the field across the iframe boundary.
- [@hookform/resolvers zod](https://github.com/react-hook-form/resolvers#zod): v5 supports zod 4 (`import { zodResolver } from '@hookform/resolvers/zod'`).
- [Typekit CSS link usage](https://helpx.adobe.com/fonts/using/add-fonts-website.html): kit stylesheet is `https://use.typekit.net/<kitId>.css`.

### Patterns to Follow

**Naming**: components PascalCase files (`AddressFields.tsx`), hooks `useXxx.ts`, pure helpers camelCase files. Tests colocated as `*.test.ts(x)`. Form field names are fixed by the schema (`bAddress1`, `sZip`, ...).

**i18n**: all user-visible text goes through `useB3Lang()` (`b3Lang('crownRegistration.x', { count })`). Field components translate `error.message` themselves, so store i18n keys in form errors. Labels are passed to field components already translated.

**Styling**: `@emotion/styled` and tokens; no inline `style`, no hard-coded hex outside `tokens.ts`. Add any new styled pieces to `styled.ts`.

**Error handling / logging**: `b2bLogger.error(error)` for swallowed errors (see `Registered/index.tsx:95`). Never log or store the password.

**Double submit guard** (`ForgotPassword/index.tsx:71-92`):
```ts
if (isSubmittingRef.current) return;
isSubmittingRef.current = true;
try { ... } finally { isSubmittingRef.current = false; }
```

**Imports**: path alias `@/` for `src/`; `tests/test-utils` for tests. Imports sorted by `simple-import-sort` (run `yarn lint:eslint --fix`).

**Anti-patterns to avoid**: no changes in `src/pages/Registered/`; no Redux for form state; no `any`; no `document.getElementById` for focusing (the portal renders inside the ThemeFrame iframe, so use RHF `setFocus`); no console calls in code or tests.

---

## IMPLEMENTATION PLAN

### Phase A: Foundation (copy, pure logic)
i18n keys, region helpers, `buildSubmission`, `mapServerErrors`. All pure and unit-tested before any UI exists.

### Phase B: Hooks
`useRegions`, `useEmailPrecheck`, `useRegistrationSubmit`, `useTypekitFonts`.

### Phase C: UI
`AddressFields`, `RegistrationForm`, `RegistrationConfirmation`, the page.

### Phase D: Integration
Route swap, Login button, knip check.

### Phase E: Testing and validation
Page-level tests, full validation, visual check, graphify update.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Run each task's VALIDATE command before moving on. All commands run from `apps/storefront/` unless noted.

### Task 1. UPDATE `src/lib/lang/locales/en.json`

- **IMPLEMENT**: Add the keys below directly after `"crownRegistration.errorSummary.more"` (line 30), keeping the single contiguous `crownRegistration.*` block at the top of the file. Do not touch other keys.
  ```
  page.title: "Business Account Registration"
  page.intro: "Content can go here"
  page.signInPrompt: "Already have an account?"
  page.signIn: "Sign in"
  page.helpPrompt: "Need help with an application? Email"
  section.details.title: "Your details"
  section.details.description: "The person who will administer the company account."
  section.billing.title: "Billing address"
  section.billing.description: "Where invoices and statements are sent."
  section.shipping.title: "Shipping address"
  section.shipping.description: "You can add more ship-to locations after approval."
  section.submit.title: "Submit"
  section.submit.description: "Content can go here"
  field.existingCustomer: "Already a customer?"
  field.companyName: "Company name"
  field.firstName: "First name"
  field.lastName: "Last name"
  field.email: "Work email"
  field.emailHint: "Used to sign in once approved"
  field.password: "Password"
  field.passwordHint: "At least 8 characters, with a letter and a number"
  field.confirmPassword: "Confirm password"
  field.phone: "Direct phone"
  field.phonePlaceholder: "(555) 555-0100"
  field.address1: "Street address"
  field.address2: "Suite, dock, floor"
  field.city: "City"
  field.country: "Country"
  field.state: "State"
  field.province: "Province"
  field.statePrompt: "Select state"
  field.provincePrompt: "Select province"
  field.zip: "ZIP code"
  field.postalCode: "Postal code"
  field.sameAsBilling: "Shipping address is the same as billing"
  field.privacy: "I acknowledge that I have read and understand the Crown Packaging Corporation {privacyLink}."
  field.privacyLink: "Privacy Policy"
  country.US: "United States"
  country.CA: "Canada"
  button.submit: "Submit application"
  button.submitting: "Submitting…"
  error.turnstileFailed: "Verification failed, please try again"
  error.rateLimited: "Too many attempts, please try again later"
  error.generic: "We couldn't submit your application. Please try again."
  error.regionNotFound: "Select a valid state or province"
  confirmation.eyebrow: "Application received"
  confirmation.title: "Your account is pending approval"
  confirmation.body: "Our trade team reviews new business accounts within one business day. Once approved, we email {email} confirmation and you can sign in with the password you set during registration."
  confirmation.company: "Company"
  confirmation.contact: "Primary contact"
  confirmation.reference: "Reference"
  confirmation.browse: "Browse the catalog"
  confirmation.another: "Submit another account"
  ```
  All keys are prefixed `crownRegistration.` (for example `crownRegistration.field.companyName`). The `error.required.*` keys exist already; `error.emailExists` exists already.
- **PATTERN**: existing block `en.json:2-30`; interpolation uses `{name}` (see `errorSummary.more`).
- **GOTCHA**: the `field.privacy` message uses a `{privacyLink}` placeholder, and react-intl `b3Lang` returns a string, so render the link by splitting the translated string around the placeholder, or make the label from two keys. Simplest: pass the link as a ReactNode through the form's `label` prop by building the label as `b3Lang('...privacyPrefix')`, `<a>`, `b3Lang('...privacySuffix')`. Decide when implementing Task 9 and adjust the keys (`field.privacyPrefix`: "I acknowledge that I have read and understand the Crown Packaging Corporation ", `field.privacyLink`: "Privacy Policy", `field.privacySuffix`: "."). Use this two-key form to avoid the placeholder problem. The Privacy Policy URL is still an open item, so the link points to `#` with a `// TODO: URL pending` comment, `target="_blank"` and `rel="noopener noreferrer"`.
- **VALIDATE**: `node -e "JSON.parse(require('fs').readFileSync('src/lib/lang/locales/en.json','utf8'))"`

### Task 2. CREATE `RegistrationForm/regions.ts` and `regions.test.ts`

- **IMPLEMENT**:
  ```ts
  import { Country } from '@/shared/global/context/config';
  import { RegistrationCountry } from '@/shared/service/vs';

  export interface RegionOption { stateCode: string; stateName: string }
  export const US_REGION_CODES = [ /* 50 states + 'DC', two-letter codes */ ] as const;

  export const getRegionOptions = (countries: Country[], country: RegistrationCountry): RegionOption[]
  export const resolveStateName = (countries: Country[], country: RegistrationCountry, stateCode: string): string | undefined
  ```
  - `getRegionOptions` finds the `Country` by `countryCode === country`, keeps states that have both `stateCode` and `stateName`. For `US`, keep only codes in `US_REGION_CODES` (drops territories such as PR, GU). For `CA`, return all states. Sort by `stateName`.
  - `resolveStateName` looks the code up in `getRegionOptions(...)` and returns its `stateName`.
- **PATTERN**: `Country`/`State` types at `shared/global/context/config.ts:6-17`.
- **GOTCHA**: BigCommerce data may mark states as optional strings; filter, do not assert.
- **TESTS**: US returns exactly 51 entries when fed all codes plus extras (PR, GU); CA returns its 13; unknown country list returns `[]`; `resolveStateName('US','IL')` returns "Illinois"; unknown code returns `undefined`.
- **VALIDATE**: `yarn vitest run src/pages/CrownRegistration/RegistrationForm/regions.test.ts`

### Task 3. CREATE `RegistrationForm/buildSubmission.ts` and test

- **IMPLEMENT**:
  ```ts
  export const DEV_TURNSTILE_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'; // Phase 3: replace with the widget token
  export type BuildSubmissionResult =
    | { ok: true; submission: RegistrationSubmission }
    | { ok: false; field: 'bState' | 'sState' };
  export const buildSubmission = (
    values: RegistrationFormValues,
    countries: Country[],
    turnstileToken: string,
  ): BuildSubmissionResult
  ```
  - Trim all string values (but never the password).
  - `contact`: `firstName, lastName, email, phone, password, existingCustomer`.
  - `company: { name: companyName }`; `privacyAcknowledged: true`.
  - `billingAddress`: `{ address1, address2, city, state: bState, stateName, postalCode: bZip, country: bCountry }`, `stateName` from `resolveStateName`. If undefined, return `{ ok: false, field: 'bState' }`.
  - `shippingAddress`: `{ sameAsBilling: true }` when `values.sameAsBilling`; otherwise `{ sameAsBilling: false, ...}` built the same way from the `s*` fields (`{ ok: false, field: 'sState' }` if the name is unresolved).
  - Put `DEV_TURNSTILE_TOKEN` here only as the default the submit hook passes in (Task 6).
- **PATTERN**: types in `shared/service/vs/api/registration.ts:20-44`; the PRD §10.1 example body (lines 406-436).
- **GOTCHA**: when `sameAsBilling` is true the shipping object contains ONLY `sameAsBilling: true` (no address keys). `RegistrationShippingAddress` enforces this in the type.
- **TESTS** (use `builder` and `faker` from `tests/test-utils`): exact object for same-as-billing; exact object for separate shipping to a CA address (`state: 'ON'`, `stateName: 'Ontario'`); whitespace trimmed; unresolved state returns `ok: false` with the right field; password not trimmed.
- **VALIDATE**: `yarn vitest run src/pages/CrownRegistration/RegistrationForm/buildSubmission.test.ts`

### Task 4. CREATE `RegistrationForm/mapServerErrors.ts` and test

- **IMPLEMENT**:
  ```ts
  export type FormFieldName = keyof RegistrationFormValues;
  export interface MappedServerErrors {
    fieldErrors: { field: FormFieldName; message: string }[]; // message: i18n key OR raw server text
    bannerKey?: string; // i18n key
    focusField?: FormFieldName;
  }
  export const mapServerErrors = (error: unknown, sameAsBilling: boolean): MappedServerErrors
  ```
  Rules (switch on `code`, never on `status`):
  - Not a `VSApiError`, or status 0, or no recognised code: `bannerKey: 'crownRegistration.error.generic'`.
  - `TURNSTILE_FAILED`: `bannerKey: 'crownRegistration.error.turnstileFailed'`.
  - `RATE_LIMITED`: `bannerKey: 'crownRegistration.error.rateLimited'`.
  - `REGISTRATION_FAILED`: generic banner.
  - `EMAIL_EXISTS`: field error on `email`, message key `crownRegistration.error.emailExists`, `focusField: 'email'`.
  - `VALIDATION`: if `field` is a known form field, a field error with the server `message`; otherwise add the message to a banner (use `error.generic` as the key when no usable text).
  - `ADDRESS_EXISTS`: `billingAddress` goes to `bAddress1`; `shippingAddress` goes to `sAddress1` unless `sameAsBilling`, then `bAddress1`. Message is the server `message` as-is. `focusField` is the mapped field.
  - Several errors in one response: collect all field errors; `focusField` is the first.
- **PATTERN**: PRD §10.1 error table (lines 451-461). `VSFieldError` in `request/VSApiError.ts:1-5`.
- **GOTCHA**: `CrownTextField` and others call `b3Lang(error.message)` for every error. For server text that is not a key, react-intl's `b3Lang` falls back to the id string itself (check `src/lib/lang` `useB3Lang` behavior). Verify this in a quick test; if it logs a missing-translation error (fails `vitest-fail-on-console`) or mangles the text, wrap server messages with a dedicated marker, for example `message: 'crownRegistration.error.server'` plus value interpolation, or extend `b3Lang` usage. Resolve this before Task 8 and record the chosen approach in the file's header comment. The `field` names the server sends are the form field names (see PRD §10.1 note), so validate membership against `Object.keys(defaultRegistrationValues)`.
- **TESTS**: one test per row of the PRD table, plus: unknown field goes to banner; `ADDRESS_EXISTS` with `sameAsBilling` true and false; non-`VSApiError` input.
- **VALIDATE**: `yarn vitest run src/pages/CrownRegistration/RegistrationForm/mapServerErrors.test.ts`

### Task 5. CREATE `RegistrationForm/useRegions.ts` and test

- **IMPLEMENT**:
  ```ts
  export function useRegions() {
    useSetCountry();
    const { state: { countriesList } } = useContext(GlobalContext);
    // memoised
    return {
      countries: countriesList,
      getRegions: (country: RegistrationCountry) => getRegionOptions(countriesList ?? [], country),
      resolveStateName: (country, code) => resolveStateName(countriesList ?? [], country, code),
    };
  }
  ```
- **IMPORTS**: `useSetCountry` from `@/hooks/useGetCountry`; `GlobalContext` from `@/shared/global`.
- **PATTERN**: `hooks/useGetCountry.ts:7-28`.
- **GOTCHA**: `useSetCountry` only fetches when `countriesList` is empty, and dispatches `type: 'common'`. In tests pass `initialGlobalContext: { countriesList }` so no network call happens.
- **TESTS** (render through a harness): returns the US list of 51 and CA list of 13 from a context with extra territories; `resolveStateName` resolves.
- **VALIDATE**: `yarn vitest run src/pages/CrownRegistration/RegistrationForm/useRegions.test.tsx`

### Task 6. CREATE `RegistrationForm/useEmailPrecheck.ts` and test

- **IMPLEMENT**: `useEmailPrecheck(form: Pick<UseFormReturn<RegistrationFormValues>, 'trigger' | 'setError'>)` returns `onEmailBlur(value: string)`:
  1. `const valid = await trigger('email'); if (!valid) return;` This reuses the resolver rules (format, company email), and waits for validation so it cannot race with the blur validation.
  2. Increment a `requestIdRef`; call `checkUserEmail({ email: value.trim(), channelId })`.
  3. If the response is stale (id changed) return. If `!isValid`, `setError('email', { type: 'server', message: 'crownRegistration.error.emailExists' })`.
  4. `catch`: `b2bLogger.error(error)` and continue silently (the server re-checks).
- **IMPORTS**: `checkUserEmail` from `@/shared/service/b2b`; `channelId` from `@/utils/basicConfig`; `b2bLogger` from `@/utils/b3Logger`.
- **GOTCHA**: submitting runs the resolver, which replaces manual errors, so the duplicate-email error disappears on submit. That is acceptable: the server returns `EMAIL_EXISTS`, which `mapServerErrors` shows inline. Do not add extra state to remember it.
- **TESTS**: mock `checkUserEmail` with `vi.spyOn(b2bService, 'checkUserEmail')` (see `Registered/index.test.tsx:1086` for the spy style): invalid format never calls it; free-email domain never calls it; `isValid: false` sets the error; `isValid: true` leaves no error; a rejected promise sets no error and logs through `b2bLogger` (mock `b2bLogger.error` so the console stays quiet); a stale slow response does not override a newer one.
- **VALIDATE**: `yarn vitest run src/pages/CrownRegistration/RegistrationForm/useEmailPrecheck.test.tsx`

### Task 7. CREATE `useTypekitFonts.ts` and test (in `pages/CrownRegistration/`)

- **IMPLEMENT**: reads `useAppSelector(themeFrameSelector)`. When the document exists and has no `link[data-crown-typekit]`, append `<link rel="stylesheet" href="https://use.typekit.net/yss3osz.css" data-crown-typekit>` to `head`. Remove it on unmount only if this hook added it.
- **PATTERN**: `components/captcha/Captcha.tsx:40-80` (`themeFrameSelector`, `iframeDocument.head.appendChild`, `initialized` ref).
- **GOTCHA**: `themeFrame` may be `null` or `undefined` (stock tests render with no frame); do nothing in that case.
- **TESTS**: with a `preloadedState` theme frame (`document.implementation.createHTMLDocument()`), the link is added once, not duplicated on re-render, and removed on unmount; no frame means no error.
- **VALIDATE**: `yarn vitest run src/pages/CrownRegistration/useTypekitFonts.test.ts`

### Task 8. CREATE `RegistrationForm/useRegistrationSubmit.ts`

- **IMPLEMENT**:
  ```ts
  interface Args {
    form: Pick<UseFormReturn<RegistrationFormValues>, 'setError' | 'setFocus'>;
    countries: Country[];
    onSuccess: (result: { referenceId: string }, values: RegistrationFormValues) => void;
    onFailure?: () => void; // Phase 3 hook point: reset Turnstile. No-op for now.
  }
  returns { submit: (values: RegistrationFormValues) => Promise<void>; isSubmitting: boolean; bannerKey?: string }
  ```
  Flow: guard with `isSubmittingRef`; set `isSubmitting` and clear the banner; `buildSubmission(values, countries, DEV_TURNSTILE_TOKEN)`. If `!ok`, `setError(field, { message: 'crownRegistration.error.regionNotFound' })`, `setFocus(field)`, return. Otherwise `await registerBusinessAccount(submission)`; on success call `onSuccess`; on error `mapServerErrors(error, values.sameAsBilling)`, apply each `setError`, set `bannerKey`, `setFocus(focusField)`, call `onFailure`. `finally` clears the ref and the state.
- **PATTERN**: `ForgotPassword/index.tsx:71-92` for the guard; `registration.ts:73-78` for the call.
- **GOTCHA**: never put the password in state, Redux, logs or error messages. Do not log `submission`. Do not use `document.getElementById` to focus (iframe); use `setFocus`. Follow the decision recorded in Task 4 for rendering server `message` text.
- **VALIDATE**: covered by the page tests (Task 13). Run `yarn tsc --noEmit` now.

### Task 9. CREATE `RegistrationForm/AddressFields.tsx`

- **IMPLEMENT**: props `{ prefix: 'b' | 's'; control; setValue; clearErrors; getRegions }` (types from `UseFormReturn<RegistrationFormValues>`). Renders, as children of the parent `FormSection` grid, in order:
  1. `CrownTextField name={`${prefix}Address1`} required fullRow autoComplete=address-line1`
  2. `CrownTextField ${prefix}Address2 fullRow` (optional)
  3. `CrownTextField ${prefix}City required`
  4. `CrownSelect ${prefix}Country required` with options US, CA (labels from `crownRegistration.country.*`). `onChange` sets `${prefix}State` to `''` via `setValue(..., { shouldValidate: false })` and calls `clearErrors([`${prefix}State`, `${prefix}Zip`])`.
  5. `CrownSelect ${prefix}State required`, options `getRegions(country)` mapped to `{ value: stateCode, label: stateName }`, label State/Province and prompt Select state/province by the watched country (`useWatch({ control, name: `${prefix}Country` })`).
  6. `CrownTextField ${prefix}Zip required`, label ZIP code/Postal code, `inputMode` numeric for US and text for CA.
  Use `autoComplete` tokens with section prefix (`billing address-line1`, `shipping postal-code`, etc.).
- **PATTERN**: `CrownSelect` props at `components/CrownSelect.tsx:12-24`; `FullRow`/`FieldGrid` in `styled.ts`.
- **GOTCHA**: field names are template-literal types (`${AddressPrefix}Address1`); type them with the `AddressField` helper shape from `schema.ts:37` or cast through a small typed helper (`const name = <K extends 'Address1'|'Address2'|'City'|'Country'|'State'|'Zip'>(k: K) => `${prefix}${k}` as const`). No `any`.
- **VALIDATE**: `yarn tsc --noEmit`

### Task 10. CREATE `RegistrationForm/index.tsx`

- **IMPLEMENT**: props `{ onSubmitted: (summary: SubmittedSummary) => void; resetKey?: number }`, where `SubmittedSummary = { referenceId, email, companyName, contactName }`.
  - `useForm<RegistrationFormValues>({ resolver: zodResolver(registrationSchema), defaultValues: defaultRegistrationValues, mode: 'onBlur', reValidateMode: 'onBlur' })`.
  - Clear-on-edit: `useEffect(() => { const sub = watch((_, { name, type }) => { if (name && type === 'change') clearErrors(name); }); return () => sub.unsubscribe(); }, [watch, clearErrors])`.
  - `const { countries, getRegions, resolveStateName } = useRegions()`; `const { onEmailBlur } = useEmailPrecheck({ trigger, setError })`; `useRegistrationSubmit`.
  - `watch('sameAsBilling')` decides whether `AddressFields prefix="s"` renders.
  - Sections (ids `crown-reg-details|billing|shipping|submit`):
    1. `FormSection number="01"`: `CrownCheckbox existingCustomer variant="plain" fullRow`, then text fields: companyName (`organization`), firstName (`given-name`), lastName (`family-name`), email (`email`, type email, hint, `onBlur={onEmailBlur}`), password (`new-password`, type password, hint), confirmPassword (`new-password`, type password), phone (`tel`, type tel, placeholder).
    2. `FormSection number="02"`: `AddressFields prefix="b"`.
    3. `FormSection number="03"`: `CrownCheckbox sameAsBilling variant="boxed" fullRow`, then `AddressFields prefix="s"` when unchecked.
    4. `FormSection number="04"`: `CrownCheckbox privacyAcknowledged variant="plain" fullRow required` with the link label from Task 1; then `ErrorSummary` (client validation messages), the server banner (`role="alert"`, same banner style as `ErrorSummary`; add a small `ServerBanner` styled component to `styled.ts` or reuse its look), then `PrimaryButton type="submit"` with `button.submit` / `button.submitting`, `disabled={isSubmitting}`.
  - `form noValidate onSubmit={handleSubmit(onValid, onInvalid)}`. `onInvalid(errors)`: collect messages in field order. Define `FIELD_ORDER: FormFieldName[]` from the section order above, map each present error to `b3Lang(error.message)`, and store in state for `ErrorSummary`. `onValid` clears the summary and calls `submit(values)`. RHF's default `shouldFocusError` focuses the first invalid field.
  - On success: `onSubmitted({ referenceId, email: values.email.trim(), companyName: values.companyName.trim(), contactName: `${first} ${last}` })`.
  - Reset on "submit another account": the page increments `resetKey` and the form remounts (use it as the React `key`), which resets values and Turnstile later.
- **PATTERN**: PRD §7.2-7.5 field table (lines 241-270); `CrownCheckbox`, `CrownTextField` props as listed above.
- **GOTCHA**: hidden shipping values stay in form state but the schema skips them (`schema.ts:107-110`); `buildSubmission` ignores them when `sameAsBilling` is true. The summary shows client errors only; server errors are inline plus the separate banner. Clear both banners at the start of each submit. Reading `form.formState.errors` in `onInvalid` must use the `errors` argument passed by `handleSubmit`.
- **VALIDATE**: `yarn tsc --noEmit`

### Task 11. CREATE `RegistrationConfirmation.tsx` and test; ADD styled pieces

- **IMPLEMENT**: props `{ summary: SubmittedSummary; onAnother: () => void; setOpenPage: SetOpenPage }`. Content per PRD §7.9: eyebrow, H1, body (bold email through `b3Lang` with the email passed as `{email}`; if bold is wanted, split the string around the email like Task 1's link approach), summary box (Company, Primary contact, Reference), and two buttons: `SecondaryButton` "Browse the catalog" (replicate `RegisteredCloseButton.tsx:25-37`: `useAppSelector(({ global }) => global.locales)`, `isCloseGotoBCHome` from `GlobalContext`, `getHomeUrl`, `navigate('/')`, `setOpenPage`, `history.replaceState`) and a ghost button "Submit another account" calling `onAnother`.
- **IMPORTS**: `SetOpenPage` from `@/pages/SetOpenPage`; `getHomeUrl` from `@/lib/lang/getHomeUrl`.
- **Styled**: add `ConfirmationRoot`, `Eyebrow`, `SummaryBox`, `GhostButton` to `styled.ts` using tokens (design values: `docs/registration.md` "Confirmation" section).
- **TESTS**: renders email, company, contact and reference; "Submit another account" calls the handler; "Browse the catalog" calls `setOpenPage({ isOpen: false, openUrl: '' })` and navigates home.
- **VALIDATE**: `yarn vitest run src/pages/CrownRegistration/RegistrationConfirmation.test.tsx`

### Task 12. CREATE `index.tsx` (page); UPDATE routes and Login

- **IMPLEMENT** `src/pages/CrownRegistration/index.tsx`, default export `CrownRegistration(props: PageProps)`:
  - `registerEnabled` from `GlobalContext`; `useEffect(() => { if (!registerEnabled) navigate('/login'); }, ...)` (mirror `Registered/index.tsx:54-58`).
  - `useScrollBar(false)`; `useTypekitFonts()`.
  - `const [submitted, setSubmitted] = useState<SubmittedSummary | null>(null); const [resetKey, setResetKey] = useState(0);`
  - Render inside `<B3Card setOpenPage={setOpenPage}>` → `PageRoot` → `ContentColumn`: header row (logo `img` 44px tall when `isLogoLoaded && logo`, alt `b3Lang('global.tips.registerLogo')`; right side "Already have an account? **Sign in**" using `Link to="/login"` from `react-router-dom`), the `Card`. Inside: while `submitted` is null, `CardHeader` (H1, intro) and `CardBody` with `RegistrationForm key={resetKey}`; otherwise `RegistrationConfirmation`. Footer with "Need help…" and a `mailto:CrownCommerceSupport@crownpack.com` link (keep the address in one constant).
  - Add header/link/footer styled pieces to `styled.ts` (link `#E41C40`, hover `#C1152F` with underline).
  - `onAnother`: `setSubmitted(null); setResetKey((k) => k + 1)`.
- **UPDATE** `src/shared/routes/index.tsx:40` to: `const Registered = lazy(() => import('@/pages/CrownRegistration')); // Crown: stock page is src/pages/Registered`.
- **UPDATE** `src/pages/Login/index.tsx:311-315`: replace the `postMessage` body with `navigate('/register');`. `navigate` is already in scope (line 78).
- **PATTERN**: `Registered/index.tsx:28-58, 154-186`.
- **GOTCHA**: the lazy component type is `LazyExoticComponent<(props: PageProps) => ReactElement>` (`routes/index.tsx:~46`), so the default export must accept `PageProps` and return a single element. Keep the `Registered` identifier so no other line in `routes/index.tsx` changes. `src/pages/Registered/` must stay untouched.
- **VALIDATE**: `yarn tsc --noEmit && yarn vitest run src/pages/Login`

### Task 13. CREATE `index.test.tsx` (page-level tests)

- **IMPLEMENT** with `renderWithProviders(<CrownRegistration setOpenPage={vi.fn()} />, { initialGlobalContext: { countriesList, registerEnabled: true } })`, `startMockServer()`, and msw handlers on `${getVSAPIBaseURL()}/storefront/registration/`. Mock `checkUserEmail` with `vi.spyOn`. Build `countriesList` with `builder`-style helpers: US (include IL plus a non-allowlisted territory), CA (ON).
  Cases:
  1. `registerEnabled: false` navigates to `/login` (use the `navigation` spy).
  2. Defaults: US selected in both address blocks, shipping block hidden, privacy unchecked.
  3. Blur validation shows exact messages (`Work email is required`, `Use a company email address` for `x@gmail.com`, `Enter a 10-digit phone number`); editing a field clears its error.
  4. Submitting an empty form shows the summary with three messages plus "+N more" and focuses the first invalid field; no request is sent.
  5. Switching billing country to CA changes the label to Province, empties the state, lists CA regions, and swaps ZIP rules (`K1A 0B1` accepted, `12345` rejected); same for shipping.
  6. Unchecking same-as-billing shows the six shipping fields and requires them; checking it again hides them.
  7. Duplicate email: `checkUserEmail` returns `isValid: false`, blur shows "An account with this email already exists".
  8. Valid submit (same as billing): assert the exact request body (capture with msw), including `turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX'`, `stateName`, `shippingAddress: { sameAsBilling: true }`, no `storeHash`/`channelId` assumptions beyond what the client adds. Then the confirmation shows email, company, contact and the mocked `referenceId`.
  9. Valid submit with separate CA shipping: body contains the full shipping object with `stateName: 'Ontario'`.
  10. Server errors: `EMAIL_EXISTS` inline on email; `VALIDATION` on `bZip` inline; `ADDRESS_EXISTS` for `billingAddress`, for `shippingAddress` (separate), and for `shippingAddress` while same-as-billing (shows on billing), each with the server message and focus on the target input; `TURNSTILE_FAILED`, `REGISTRATION_FAILED`, 500 with non-JSON body, and a network error each show their banner; the form stays filled and Submit re-enables.
  11. Double click on Submit sends a single request (use a delayed msw response).
  12. "Submit another account" returns to an empty form with defaults.
  13. Login "Create account" (in `pages/Login/index.test.tsx`): clicking it navigates to `/register` (use the `navigation` spy); add next to existing Login tests.
- **PATTERN**: `registration.test.ts:1-40` (msw plus `getVSAPIBaseURL`); `CrownTextField.test.tsx` (queries by accessible label); user events via `user` from `renderWithProviders`.
- **GOTCHA**: `vitest-fail-on-console` fails any console output. Await async state with `findBy*`/`waitFor`, never `act` warnings. Query labels with the required asterisk (`/work email/i`).
- **VALIDATE**: `yarn vitest run src/pages/CrownRegistration src/pages/Login`

### Task 14. Lint, knip, full checks

- **IMPLEMENT**: fix whatever `yarn lint` reports. If knip flags files now only reachable through `pages/Registered/` (for example `RegisteredBCToB2B` shares them) or the stock page, add a minimal entry to `knip.jsonc` and note why. Do not delete stock code.
- **VALIDATE**: `yarn tsc --noEmit && yarn lint`

---

## TESTING STRATEGY

### Unit Tests
- Pure logic (regions, `buildSubmission`, `mapServerErrors`) with `faker` and `builder` data; every row of the PRD §10.1 error table is covered.
- Hooks through small harness components (pattern: `CrownTextField.test.tsx`).
- Follow `AGENTS.md`: Testing Library queries by role and label, no implementation details, mock only network and module boundaries.

### Integration Tests
`index.test.tsx` drives the whole page with `renderWithProviders`, msw for the VS API, and a mocked `checkUserEmail`. It covers validation, country switching, shipping toggle, payload, error mapping, confirmation and reset.

### Edge Cases
- A BC region list that lacks the selected code (submit stops with `regionNotFound` on the right field, no request).
- Territories in the US list are hidden (allowlist).
- Duplicate-email error is gone after submit (server re-reports it).
- Hidden shipping values are ignored when same-as-billing is checked, even if they were filled earlier.
- Switching country while a ZIP error is showing clears the error.
- Rapid double submit, and a submit after a failed submit.
- Non-JSON error bodies and network errors.
- `themeFrame` null (tests) for `useTypekitFonts`.
- Password with leading and trailing spaces is sent unchanged.

---

## VALIDATION COMMANDS

Run from `apps/storefront/`.

### Level 1: Syntax & Style
```
yarn tsc --noEmit
yarn lint
```

### Level 2: Unit Tests
```
yarn vitest run src/pages/CrownRegistration src/shared/service/vs
```

### Level 3: Regression
```
yarn vitest run src/pages/Login src/pages/Registered src/pages/RegisteredBCToB2B
```
Baseline notes: ShoppingListDetails and hooks tests fail on the baseline, and `Registered` is flaky (see memory). If `Registered` fails, rerun it once and compare with `git stash` before blaming the change. The stock Registered files must be unmodified: `git diff --stat -- src/pages/Registered` prints nothing.

### Level 4: Manual Validation (`yarn dev`)
1. Open the portal at `/register`. Compare with `docs/screenshots/registration-same-as-billing.png` and `registration-separate-shipping.png` at 1440px. Check 375px: no horizontal scroll, section titles stacked.
2. Blur each field empty and with bad values; check the exact messages and that editing clears them.
3. Switch the country on both address blocks. Untick and tick "same as billing".
4. Submit an invalid form and check the summary banner. Submit a valid form against a mocked or test backend and check the request body in the network tab: `stateName` present, `turnstileToken: "XXXX.DUMMY.TOKEN.XXXX"`, no `Authorization` header.
5. Check the confirmation, "Submit another account", the Login page "Create account" button, and that `registerEnabled = false` redirects to `/login`.
6. Check fonts load (Typekit) inside the iframe when the domain is allow-listed.

### Level 5: Housekeeping
```
py -m graphify update .
git status --short
```
The change set must be limited to the new files above, `src/shared/routes/index.tsx`, `src/pages/Login/index.tsx` (+ its test), `src/lib/lang/locales/en.json`, possibly `knip.jsonc`, and the graphify output.

---

## ACCEPTANCE CRITERIA

- [ ] `/register` serves the Crown form, with four numbered sections and the layout in `docs/registration.md`
- [ ] Every rule in PRD §7.6 fires on blur and on submit with the exact message text; edits clear the field's error
- [ ] The summary banner shows at most three errors plus "+N more"
- [ ] Changing a country resets the region and swaps labels and postal rules, for billing and shipping
- [ ] A duplicate email shows the inline error on blur
- [ ] The request body matches PRD §10.1 exactly, including `stateName` and the `sameAsBilling: true` shorthand; an unresolved region blocks the submit on that field
- [ ] Server errors map by `code`: inline for `EMAIL_EXISTS`, `VALIDATION` and `ADDRESS_EXISTS` (billing, shipping, and billing when same-as-billing), and banners for the rest; the form stays editable
- [ ] The confirmation shows email, company, contact and `referenceId`; "Submit another account" resets everything
- [ ] The Login "Create account" button opens `/register`; `registerEnabled = false` redirects to `/login`
- [ ] The Turnstile placeholder is one constant, marked for Phase 3
- [ ] `yarn tsc --noEmit` and `yarn lint` pass with zero warnings
- [ ] New code is covered by tests; Login, Registered and RegisteredBCToB2B suites behave as on baseline
- [ ] Upstream diff limited to the files listed in PRD §6.4 (plus `knip.jsonc` only if needed); nothing changed under `src/pages/Registered/`
- [ ] No password in state, logs, Redux or storage

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order, each VALIDATE passed
- [ ] Full validation commands run (Levels 1-3 and 5)
- [ ] Manual checks (Level 4) done, or noted as not done
- [ ] Acceptance criteria all met
- [ ] Phase 3 seams are in place and marked: `DEV_TURNSTILE_TOKEN`, `onFailure` in `useRegistrationSubmit`, `resetKey` remount
- [ ] graphify updated

---

## NOTES

- **Why `trigger('email')` before the duplicate check:** the field's blur validation runs asynchronously, and a manual `setError` made before it finishes would be wiped. Awaiting `trigger` also avoids a network call for emails that already fail the format or free-email rules.
- **Why pure `buildSubmission` and `mapServerErrors`:** they hold the contract-critical logic (payload shape, error routing). Unit tests pin them without rendering the form.
- **`setFocus` instead of focusing the section element:** the portal renders inside the ThemeFrame iframe, so top-level `document.getElementById` would not find the elements. Focusing the field (billing: `bAddress1`; shipping: `sAddress1`) also gives screen-reader users the error text. The section element still has `tabIndex={-1}` for Phase 3's "Edit address" focus.
- **Server message rendering:** `ADDRESS_EXISTS` and `VALIDATION` messages are written for display, but field components pass `error.message` through `b3Lang`. Task 4 requires confirming how `b3Lang` treats an unknown id, and picking one approach for the whole file set.
- **Placeholder token:** `XXXX.DUMMY.TOKEN.XXXX` is only accepted by backends using Cloudflare's test secret. Phase 3 must replace it before any environment with real keys.
- **Open items from the PRD** (placeholders until the owner supplies them): intro paragraph and Submit rail copy, Privacy Policy URL, Turnstile staging and production site keys.
- **Phase 3 follow-ups this plan leaves ready:** Turnstile widget and token gate, USPS `validateAddress` loop and modal (`AddressVerificationDialog`), `onFailure` widget reset, focusing a section from the modal's "Edit address".

**Confidence score: 7.5/10** for one-pass success. The main uncertainties are how `b3Lang` handles untranslated server messages (Task 4), whether the RHF `watch` callback reports `type: 'change'` for `Controller`-driven edits (verify in Task 10; fall back to calling `clearErrors(name)` inside each field's `onChange`), and the volume of test code in Task 13.
