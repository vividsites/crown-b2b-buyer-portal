# Feature: Crown Registration, Phase 1 Foundations

This plan should be complete, but before you implement anything, check it against the documentation and the codebase patterns, and make sure each task makes sense.

Pay close attention to the names of existing utilities and types, and import them from the right files.

## Feature Description

Phase 1 of the Crown Business Account Registration project (see `PRD.md` §12). It builds the testable foundations the single-page registration form (Phase 2) will sit on:

1. An **anonymous VS API request path**: no JWT, and typed errors for 4xx responses.
2. The **registration API client stub and its types**, matching the PRD §10 contract.
3. The **zod validation schema**. It returns i18n keys and covers every rule in PRD §7.6.
4. **Design tokens and styled layout primitives** from `docs/registration.md`.
5. **Page-local form field components** (`CrownTextField`, `CrownSelect`, `CrownCheckbox`, `FormSection`, `ErrorSummary`), with accessibility-focused tests.
6. **A lint cleanup of `src/shared/service/vs/`**. These files exist only in Crown's fork and currently have 15 eslint errors plus formatting debt.

Phase 1 adds no route, page or UI. Nothing in production code imports these files until Phase 2.

## User Story

As a developer building the Crown registration page, I want a tested service layer, validation schema and field components, so that Phase 2 is only a matter of assembling the page, and the correctness-critical logic (anonymous requests, validation rules, accessibility) is already proven.

## Problem Statement

- `VSRequest` (`src/shared/service/vs/request/vsFetch.ts`) always attaches a customer JWT. That's wrong for anonymous registration.
- `vsFetch` (`request/fetch.ts`) treats 4xx responses as successes. It only rejects when the body contains `code === 500`, so the client can't read field errors from the server.
- There is no validation schema, and no field component that matches the Crown design.
- The `vs/` folder fails eslint.

## Solution Statement

Add:
- a separate `anonymousFetch.ts` helper that throws `VSApiError`
- a typed `api/registration.ts` stub
- a pure zod schema whose messages are i18n keys, with all rules in one `superRefine`
- tokens and `@emotion/styled` layout components
- generic react-hook-form `Controller`-based field components built on styled native elements

Also clean up `vs/` with prettier and eslint, fixing the remaining errors by hand without changing behavior.

## Feature Metadata

**Feature type:** new capability (foundation), plus refactor (the `vs/` lint cleanup)
**Estimated complexity:** Medium
**Systems affected:**
- `src/shared/service/vs/`
- `src/pages/CrownRegistration/` (new)
- `src/lib/lang/locales/en.json`
- `apps/storefront/package.json`

**Dependencies:**
- `@hookform/resolvers@^5`: new. v5 supports zod 4.
- Already installed: zod 4.1.12, react-hook-form 7.71.1, msw 2.12.10, @emotion/styled 11.14.1.

---

## CONTEXT REFERENCES

### Relevant codebase files (read these before implementing)

All paths are relative to `apps/storefront/` unless noted otherwise.

- `../../PRD.md`, especially §6 (architecture), §7.2–7.6 (fields and validation rules and messages) and §10 (API contract). This is the source of truth for field names, messages and payload shapes.
- `../../docs/registration.md`: the design tokens, field anatomy, boxed checkbox, section grid, error banner and required-label map. This is the source of truth for visuals.
- `src/shared/service/vs/request/vsFetch.ts` (whole file): the authenticated request helper. Mirror its URL building, but **not** the JWT.
- `src/shared/service/vs/request/fetch.ts` (whole file): the current response handling. You'll refactor it while keeping its behavior.
- `src/shared/service/vs/request/base.ts`:
  - `ENVIRONMENT_VS_APP_CLIENT_ID` and `getVSAppClientId` (lines 10–46): the pattern to mirror for the Turnstile site key.
  - `getEnvironment` (lines 22–35): has broken indentation.
  - `FilterDescriptor.value: any` (line 70), `queryParse` (lines 73–82).
- `src/shared/service/vs/request/jwt.ts`:
  - It imports `b2bLogger` through the relative path `../../../../utils/b3Logger`, which should use the `@/` alias.
  - `consistent-return` error at line 12.
- `src/shared/service/vs/api/product.ts`: `VSRequest.post<Body>(…)` call sites (lines 5, 13, 21, 30) and the `ProductRequirements` type (line 38). The file uses tabs and has an import-order error.
- `src/shared/service/vs/api/shoppingList.ts` and `api/login.ts`: `login.ts` uses a relative import of `basicConfig`.
- `src/shared/service/vs/shoppingListQuantityService.ts`: uses `let` and `++` loops (`prefer-const`, `no-plusplus`). Callers in `src/utils/{loginInfo,logoutSession,masquerade}.ts`, `src/pages/Login/useLogout.tsx`, `src/pages/ShoppingListDetails/index.tsx` and `src/components/outSideComponents/B3MasqueradeGlobalTip.tsx`.
- `src/shared/service/vs/index.ts`: the barrel exports.
- `src/utils/basicConfig.ts` (lines 3–8): `storeHash` and `channelId` are destructured from `window.B3.setting` **when the module loads**.
- `src/types/global.ts` (lines 1–10): `Environment` enum and `EnvSpecificConfig<T>`.
- `src/shared/service/bc/graphql/tax.ts` (lines 1–12): the existing zod import style, `import { z } from 'zod'`.
- `src/lib/lang/useB3Lang.ts`: `b3Lang(id, values?)`. **Missing keys fall back to the id itself**, but react-intl logs a `console.error`.
- `src/lib/lang/LangProvider.tsx` (line 34): `IntlProvider` has no `onError`, so every missing key logs a console error.
- `tests/setup-test-environment.ts`:
  - Lines 14–33: `window.B3.setting` is `{ channel_id: 1, store_hash: 'store-hash', vsEnvironment: 'local' }`.
  - Line 12: `vi.mock('@/store')` is global.
  - Lines 51+: **`vitest-fail-on-console`**. Any `console.error` or `console.warn` fails the test.
- `tests/mockServer.ts`: `startMockServer()`. Unhandled requests hang forever, and `onUnhandledRequest: 'error'` is set.
- `tests/test-utils.tsx`:
  - `renderWithProviders` (lines 59–108) returns `{ user, store, navigation, result }`.
  - Re-exports: `http`, `HttpResponse`, `delay`, `builder`, `bulk`, `faker`, and everything from `@testing-library/react`.
- `tests/builder.ts`: `builder(() => defaults)(overrides | 'WHATEVER_VALUES')`.
- `vite.config.ts` (lines 44–78): the test env sets `VITE_IS_LOCAL_ENVIRONMENT: 'TRUE'`, so `getVSAPIBaseURL()` resolves to `https://localhost:44320`. It also sets `clearMocks`, `mockReset` and `restoreMocks`, and `globals: true`.
- `src/pages/ForgotPassword/index.test.tsx` (lines 1–20, 147–160, 249–260): the msw test style, with `server.use(http.post(url, async ({ request }) => …))`.
- `.dependency-cruiser.cjs` (lines 5–31): `no-orphans`. The new files are orphans until Phase 2, which is expected.
- `knip.jsonc`: the knip `exports` and `files` rules are set to error. Unused exports are expected until Phase 2.

**Don't mirror** `src/components/form/B3ControlTextField.tsx`. It's the legacy pattern, with props spreading, `any` and MUI `TextField`.

### New files to create (under `apps/storefront/`)

- `src/shared/service/vs/request/VSApiError.ts`: typed error class and type guard
- `src/shared/service/vs/request/anonymousFetch.ts`: POST helper with no JWT
- `src/shared/service/vs/request/anonymousFetch.test.ts`
- `src/shared/service/vs/api/registration.ts`: stub client and types
- `src/shared/service/vs/api/registration.test.ts`
- `src/pages/CrownRegistration/tokens.ts`
- `src/pages/CrownRegistration/styled.ts`
- `src/pages/CrownRegistration/RegistrationForm/schema.ts`
- `src/pages/CrownRegistration/RegistrationForm/schema.test.ts`
- `src/pages/CrownRegistration/components/fieldStyles.ts`: shared styled label, control, hint and error elements
- `src/pages/CrownRegistration/components/CrownTextField.tsx` and `CrownTextField.test.tsx`
- `src/pages/CrownRegistration/components/CrownSelect.tsx` and `CrownSelect.test.tsx`
- `src/pages/CrownRegistration/components/CrownCheckbox.tsx` and `CrownCheckbox.test.tsx`
- `src/pages/CrownRegistration/components/FormSection.tsx` and `FormSection.test.tsx`
- `src/pages/CrownRegistration/components/ErrorSummary.tsx` and `ErrorSummary.test.tsx`

### Relevant documentation (read before implementing)

- [@hookform/resolvers README, zod section](https://github.com/react-hook-form/resolvers#zod)
  - Import `zodResolver` from `@hookform/resolvers/zod`. v5 supports zod 4 schemas.
- [Zod 4: refinements / `.superRefine`](https://zod.dev/api#superrefine)
  - `ctx.addIssue({ code: 'custom', message, path: ['field'] })`.
- [Zod 4 changelog](https://zod.dev/v4/changelog)
  - Refinements on an object don't run while inner checks fail. That's why all rules go in one `superRefine` over bare fields.
- [React Hook Form: `Controller`](https://react-hook-form.com/docs/usecontroller/controller)
  - The `field` and `fieldState.error` props.
- [React Hook Form: `useForm` `setError`](https://react-hook-form.com/docs/useform/seterror)
  - Used in the component tests.
- [MSW 2: `HttpResponse.error()`, `delay('infinite')`](https://mswjs.io/docs/api/http-response#httpresponseerror)
  - Used for the network-error and timeout tests.
- [Testing Library query priority](https://testing-library.com/docs/queries/about#priority)

### Patterns to follow

**Imports:**
- Use the `@/` alias for `src`. Never use relative `../../` imports across directories.
- `import styled from '@emotion/styled'`. This is the dominant pattern in the repo.
- `import { z } from 'zod'`.
- Tests import from `'tests/test-utils'`.
- Import groups are auto-sorted by `simple-import-sort`, so run `eslint --fix`.

**Formatting:** prettier, from `@bigcommerce/eslint-config/prettier`: 2-space indent, semicolons, single quotes, trailing commas, 100-character print width. **Write files with LF line endings.**

**Env config pattern** (`request/base.ts`):
```ts
const ENVIRONMENT_VS_APP_CLIENT_ID: EnvSpecificConfig<string> = { local: '…', integration: '…', staging: '…', production: '…' };
export function getVSAppClientId(environment?: Environment) {
  return ENVIRONMENT_VS_APP_CLIENT_ID[getEnvironment(environment)];
}
```

**msw test pattern:**
```ts
import { http, HttpResponse, startMockServer } from 'tests/test-utils';
const { server } = startMockServer();
server.use(http.post(url, async ({ request }) => { captured(await request.json()); return HttpResponse.json({...}); }));
```

**Builder pattern:**
```ts
const buildValuesWith = builder<RegistrationFormValues>(() => ({ ...valid faker values }));
buildValuesWith({ bCountry: 'CA', bZip: 'K1A 0B1' });
```

**Test names** describe behavior, with no "should", for example `it('rejects free-mail email domains')`.

**Error handling:**
- Service functions throw typed errors (`VSApiError`).
- Callers narrow with `isVSApiError`.
- Don't use `console.*`. The logger is `b2bLogger` from `@/utils/b3Logger`, but it isn't needed in Phase 1.

---

## IMPLEMENTATION PLAN

### Phase A: Dependency and lint baseline
Add `@hookform/resolvers`, then clean up `vs/` **before** adding new files to it. That way the refactor diff stays separate from the feature diff.

### Phase B: Service layer
Build `VSApiError`, `anonymousFetch`, the Turnstile key in `base.ts`, `api/registration.ts`, the exports, and the tests.

### Phase C: Schema and i18n
Add the `en.json` key block, `schema.ts`, and `schema.test.ts`, including a `zodResolver` compatibility test.

### Phase D: Design system and primitives
Build `tokens.ts`, `styled.ts`, `fieldStyles.ts`, the five components, and their tests.

### Phase E: Full validation

---

## STEP-BY-STEP TASKS

Run every command from `apps/storefront/` unless the task says otherwise. Do the tasks in order.

**Lint command used throughout.** The local checkout has CRLF line endings (`core.autocrlf=true`), so neutralize line-ending noise:
```
LINT="npx eslint --max-warnings 0 --rule '{\"prettier/prettier\":[\"warn\",{\"endOfLine\":\"auto\"}]}'"
```
Shown below as `$LINT <paths>`. Written out in full:
`npx eslint --max-warnings 0 --rule "{\"prettier/prettier\":[\"warn\",{\"endOfLine\":\"auto\"}]}" <paths>`

### Task 1: UPDATE `apps/storefront/package.json` (add dependency)
- **IMPLEMENT:** `yarn add @hookform/resolvers@^5`. This updates `package.json` dependencies and the root `yarn.lock`.
- **GOTCHA:** run it from `apps/storefront/`. Don't hand-edit `yarn.lock`. Confirm the installed version is 5.x, and that `node_modules/@hookform/resolvers/zod` exists (it's hoisted to the repo root `node_modules`).
- **VALIDATE:** `node -e "require.resolve('@hookform/resolvers/zod')" && grep '"@hookform/resolvers"' package.json`

### Task 2: REFACTOR `src/shared/service/vs/` (auto-format)
- **IMPLEMENT:** `npx prettier --write src/shared/service/vs` and then `npx eslint --fix src/shared/service/vs`. This converts tabs to spaces, adds semicolons and sorts imports.
- **GOTCHA:** check `git diff --stat`. Only files under `vs/` should change.
- **VALIDATE:** `$LINT src/shared/service/vs`. The remaining errors should only be the hand-fix list in Task 3.

### Task 3: REFACTOR the remaining `vs/` lint errors (no behavior change)
- **`request/jwt.ts`:**
  - Change `import b2bLogger from '../../../../utils/b3Logger'` to `import b2bLogger from '@/utils/b3Logger'`.
  - Add `return undefined;` at the end of `ensureVSCurrentCustomerJWT`, to satisfy `consistent-return`.
- **`api/login.ts`:** change `'../../../../utils/basicConfig'` to `'@/utils/basicConfig'`.
- **`api/product.ts`:** fix the import order. It should use `'@/shared/service/vs/request/vsFetch'`, or keep the relative sibling import `../request/vsFetch` if eslint accepts it. `eslint --fix` sorts it either way.
- **`request/fetch.ts`:** rewrite with no `any`, and exactly the same semantics:
  ```ts
  interface VSErrorEnvelope { code?: number; message?: string; data?: { errMsg?: string } }
  const isErrorEnvelope = (v: unknown): v is VSErrorEnvelope => typeof v === 'object' && v !== null && 'code' in v;

  async function vsFetch(path: string, init: RequestInit): Promise<unknown> {
    const res = await fetch(path, init);
    if (init.method === 'DELETE') return undefined;
    const body: unknown = await res.json();
    if (isErrorEnvelope(body) && body.code === 500) {
      throw body.data?.errMsg || body.message || '';
    }
    return body;
  }
  export default vsFetch;
  ```
  Why this matches the original:
  - The original resolved `undefined` right away for DELETE.
  - It rejected with the message string on `code === 500`.
  - Network errors propagated.
  - `no-throw-literal` may flag throwing a string. Existing callers may depend on receiving a string rejection, so keep it: add `// eslint-disable-next-line no-throw-literal`, **or** wrap it as `return Promise.reject(message)`. **Prefer `return Promise.reject(message)`**, which needs no disable comment.
- **`request/vsFetch.ts`:** make the return types generic, and remove `any`:
  ```ts
  type QueryParams = Record<string, string | number | boolean>;
  async function request<TResult>(path: string, config?: RequestInit): Promise<TResult> { …same body…; return (await vsFetch(url, init)) as TResult; }
  const VSRequest = {
    get<TResult = unknown>(url: string, data?: QueryParams, config?: RequestInit): Promise<TResult> {…},
    post<TResult = unknown, TBody = unknown>(url: string, data: TBody): Promise<TResult> {…},
    put<TResult = unknown, TBody = unknown>(url: string, data: TBody): Promise<TResult> {…},
    delete<TResult = unknown>(url: string): Promise<TResult> {…},
  };
  ```
  - Keep the existing `function get(...)` naming style if eslint's `func-names` requires it.
  - Keep the JWT behavior **identical**.
- **`api/product.ts`:** update the four call sites to `VSRequest.post<ProductRequirements[], { productIds: number[] }>(…)` (and the equivalent for the others). Add explicit `Promise<ProductRequirements[]>` return types.
- **`api/shoppingList.ts`:** `VSRequest.get(…)` now returns `Promise<unknown>`. It has no callers, so leave the function in place. **Don't delete it.** List it in the final report as a knip candidate.
- **`request/base.ts`:**
  - Fix the indentation of `isEnvironment` and `getEnvironment`. Prettier should already have done this in Task 2.
  - Change `FilterDescriptor.value: any` to `value: unknown`.
  - Change `queryParse` to `(query: Record<string, string | number | boolean>): string`, using `Object.entries(query).map(([k, v]) => \`${k}=${v}\`).join('&')`. This is the same output as before: key=value pairs joined with `&`.
- **`shoppingListQuantityService.ts`:**
  ```ts
  export const clearShoppingListItemQuantities = () => {
    const keys = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i))
      .filter((key): key is string => !!key && key.startsWith('quantities_'));
    keys.forEach((key) => sessionStorage.removeItem(key));
  };
  ```
- **GOTCHA:** don't change the public function names or signatures, apart from adding generics. `DataSourceRequest` is re-exported from `index.ts`, so keep it.
- **VALIDATE:**
  - `$LINT src/shared/service/vs` gives 0 problems.
  - `yarn tsc --noEmit` passes.
  - `yarn test --run src/hooks src/pages/ShoppingListDetails src/components src/pages/Login` passes.

### Task 4: CREATE `src/shared/service/vs/request/VSApiError.ts`
- **IMPLEMENT:**
  ```ts
  export interface VSFieldError { field?: string; code: string; message: string }

  export class VSApiError extends Error {
    readonly status: number; // HTTP status; 0 = network failure or timeout
    readonly errors: VSFieldError[];
    constructor(status: number, errors: VSFieldError[], message?: string) {
      super(message ?? errors[0]?.message ?? `VS API request failed (${status})`);
      this.name = 'VSApiError';
      this.status = status;
      this.errors = errors;
    }
  }

  export const isVSApiError = (error: unknown): error is VSApiError => error instanceof VSApiError;
  ```
- **VALIDATE:** `$LINT src/shared/service/vs/request/VSApiError.ts && yarn tsc --noEmit`

### Task 5: CREATE `src/shared/service/vs/request/anonymousFetch.ts`
- **IMPLEMENT:**
  ```ts
  import { getVSAPIBaseURL } from './base';
  import { VSApiError, VSFieldError } from './VSApiError';

  interface AnonymousRequestOptions { timeoutMs?: number }

  const isFieldErrorList = (value: unknown): value is VSFieldError[] =>
    Array.isArray(value) && value.every((e) => typeof e === 'object' && e !== null && typeof (e as { code?: unknown }).code === 'string');

  const readErrors = async (res: Response): Promise<VSFieldError[]> => {
    try {
      const body: unknown = await res.json();
      if (typeof body === 'object' && body !== null && 'errors' in body && isFieldErrorList(body.errors)) return body.errors;
    } catch { /* non-JSON body */ }
    return res.status === 429 ? [{ code: 'RATE_LIMITED', message: 'Too many requests' }] : [];
  };

  async function post<TResult>(path: string, body: unknown, { timeoutMs }: AnonymousRequestOptions = {}): Promise<TResult> {
    const controller = new AbortController();
    const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
    let res: Response;
    try {
      res = await fetch(`${getVSAPIBaseURL()}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },   // never Authorization
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error';
      throw new VSApiError(0, [{ code: 'NETWORK', message }]);
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res.ok) throw new VSApiError(res.status, await readErrors(res));
    return (await res.json()) as TResult;
  }

  const anonymousFetch = { post };
  export default anonymousFetch;
  ```
- **GOTCHA:**
  - **Don't import `@/store` or `./jwt`.** That keeps anonymous requests structurally free of the JWT.
  - Keep the type-guard approach. Avoid `as` except for the final generic `TResult` cast.
  - The `(e as { code?: unknown })` narrowing may trip lint rules. If it does, use `'code' in e && typeof e.code === 'string'`.
- **VALIDATE:** `$LINT src/shared/service/vs/request/anonymousFetch.ts && yarn tsc --noEmit`

### Task 6: CREATE `src/shared/service/vs/request/anonymousFetch.test.ts`
- **IMPLEMENT** these tests (use `startMockServer` and `http`, `HttpResponse`, `delay` and `faker` from `tests/test-utils`; the base URL is `https://localhost:44320`, and import `getVSAPIBaseURL` from `@/shared/service/vs/request/base` to build URLs):
  1. `posts JSON to the VS API and returns the parsed body`: check the method, the `content-type` and the body.
  2. `never sends an Authorization header`:
     - Render nothing. Set store state with a JWT: `store.dispatch(setVSCurrentCustomerJWT(faker.string.uuid()))`, using `store` from `@/store`, which the global mock provides.
     - Assert that `request.headers.get('authorization')` is `null`.
  3. `throws VSApiError with status and field errors on 400`: `HttpResponse.json({ errors: [...] }, { status: 400 })`.
  4. `throws VSApiError with no errors when a 5xx body is not JSON`: `new HttpResponse('oops', { status: 502 })`.
  5. `maps a 429 without a body to RATE_LIMITED`.
  6. `throws VSApiError with status 0 on network failure`: `HttpResponse.error()`.
  7. `aborts and throws a NETWORK VSApiError when the timeout elapses`:
     - The handler does `await delay('infinite')`.
     - Call with `{ timeoutMs: 20 }` and **real timers**.
- **PATTERN:** `src/pages/ForgotPassword/index.test.tsx:147-160`
- **GOTCHA:**
  - Use `await expect(promise).rejects.toMatchObject({ status: 400, errors: [...] })` together with `rejects.toBeInstanceOf(VSApiError)`.
  - `vitest-fail-on-console` fails the test on any console output, so make sure none is emitted.
- **VALIDATE:** `yarn test --run src/shared/service/vs/request/anonymousFetch.test.ts`

### Task 7: UPDATE `src/shared/service/vs/request/base.ts` (Turnstile site key)
- **IMPLEMENT:** below `ENVIRONMENT_VS_APP_CLIENT_ID`, inside the existing `cspell:disable` block or a new one:
  ```ts
  // Cloudflare always-pass test key for local/integration.
  // TODO(Crown): provide staging and production Turnstile site keys.
  const ENVIRONMENT_VS_TURNSTILE_SITE_KEY: EnvSpecificConfig<string> = {
    local: '1x00000000000000000000AA',
    integration: '1x00000000000000000000AA',
    staging: '1x00000000000000000000AA',
    production: '1x00000000000000000000AA',
  };
  ```
  Then add `export function getVSTurnstileSiteKey(environment?: Environment) { return ENVIRONMENT_VS_TURNSTILE_SITE_KEY[getEnvironment(environment)]; }`, mirroring `getVSAppClientId`.
- **GOTCHA:**
  - Staging and production deliberately use the test key, with a TODO. A bogus string would make the widget error.
  - Record this in the final report as an open item that blocks release.
- **VALIDATE:** `$LINT src/shared/service/vs/request/base.ts && yarn tsc --noEmit`

### Task 8: CREATE `src/shared/service/vs/api/registration.ts`
- **IMPLEMENT:**
  ```ts
  import { channelId, storeHash } from '@/utils/basicConfig';
  import anonymousFetch from '../request/anonymousFetch';

  export type RegistrationCountry = 'US' | 'CA';

  export interface RegistrationAddress {
    address1: string; address2: string; city: string;
    state: string;          // region code, e.g. "IL"
    stateName?: string;     // BC region name, e.g. "Illinois"
    postalCode: string; country: RegistrationCountry;
  }

  export type RegistrationShippingAddress =
    | { sameAsBilling: true }
    | ({ sameAsBilling: false } & RegistrationAddress);

  export interface RegistrationRequest {
    storeHash: string; channelId: number; turnstileToken: string;
    contact: { firstName: string; lastName: string; email: string; phone: string; password: string; existingCustomer: boolean };
    company: { name: string };
    privacyAcknowledged: true;
    billingAddress: RegistrationAddress;
    shippingAddress: RegistrationShippingAddress;
  }

  export type RegistrationSubmission = Omit<RegistrationRequest, 'storeHash' | 'channelId'>;
  export interface RegistrationResponse { referenceId: string; status: 'pending' }

  export type AddressValidationStatus = 'match' | 'corrected' | 'unverifiable';
  export interface AddressValidationResult { status: AddressValidationStatus; suggested?: RegistrationAddress; changes?: string[] }

  export const REGISTRATION_ERROR_CODES = {
    turnstileFailed: 'TURNSTILE_FAILED', emailExists: 'EMAIL_EXISTS',
    validation: 'VALIDATION', rateLimited: 'RATE_LIMITED',
  } as const;

  const ADDRESS_VALIDATION_TIMEOUT_MS = 8000;

  export const registerBusinessAccount = (submission: RegistrationSubmission) =>
    anonymousFetch.post<RegistrationResponse>('/storefront/registration/', { storeHash, channelId, ...submission });

  export const validateAddress = (address: RegistrationAddress) =>
    anonymousFetch.post<AddressValidationResult>('/storefront/registration/validate-address/', { storeHash, address }, { timeoutMs: ADDRESS_VALIDATION_TIMEOUT_MS });
  ```
- **GOTCHA:**
  - Put `storeHash` and `channelId` **first** in the body, so the key order matches PRD §10.1. Order doesn't matter functionally.
  - `channelId` comes from `window.B3.setting` and is typed there; check that its type is `number`.
  - Use a relative sibling import (`../request/anonymousFetch`), matching `product.ts`, or the `@/shared/service/vs/request/anonymousFetch` alias. Pick whichever eslint accepts without warnings.
- **VALIDATE:** `$LINT src/shared/service/vs/api/registration.ts && yarn tsc --noEmit`

### Task 9: CREATE `src/shared/service/vs/api/registration.test.ts`
- **IMPLEMENT:**
  - A builder for `RegistrationSubmission` (faker values; `billingAddress.country: 'US'`; shipping `{ sameAsBilling: true }`) and one for `RegistrationAddress`.
  - Tests:
    1. `sends the submission with storeHash and channelId to /storefront/registration/`. The body equals `{ storeHash: 'store-hash', channelId: 1, ...submission }`. Returns `referenceId`.
    2. `sends a separate shipping address when shipping differs from billing`. Uses the `sameAsBilling: false` shape.
    3. `surfaces EMAIL_EXISTS as a VSApiError`: a 400 with `{ errors: [{ field: 'email', code: REGISTRATION_ERROR_CODES.emailExists, message }] }`.
    4. `validateAddress posts storeHash and the address and returns the result`: a `corrected` result with `suggested` and `changes`.
- **GOTCHA:** `storeHash` and `channelId` are read when `basicConfig` loads, from the setup file (`'store-hash'`, `1`). Don't reassign `window.B3` in these tests.
- **VALIDATE:** `yarn test --run src/shared/service/vs/api/registration.test.ts`

### Task 10: UPDATE `src/shared/service/vs/index.ts`
- **IMPLEMENT:** append:
  ```ts
  export * from './api/registration';
  export { getVSTurnstileSiteKey } from './request/base';
  export type { VSFieldError } from './request/VSApiError';
  export { isVSApiError, VSApiError } from './request/VSApiError';
  ```
- **VALIDATE:** `$LINT src/shared/service/vs && yarn tsc --noEmit`

### Task 11: UPDATE `src/lib/lang/locales/en.json` (one contiguous Crown block)
- **IMPLEMENT:** insert the block below **directly after the opening `{` on line 1**, before `"global.tips.loading"`. The file isn't alphabetical, and upstream usually appends at the end, so the top is the least likely place to conflict.
  ```json
    "crownRegistration.error.required.companyName": "Company name is required",
    "crownRegistration.error.required.firstName": "First name is required",
    "crownRegistration.error.required.lastName": "Last name is required",
    "crownRegistration.error.required.email": "Work email is required",
    "crownRegistration.error.required.password": "Password is required",
    "crownRegistration.error.required.confirmPassword": "Password confirmation is required",
    "crownRegistration.error.required.phone": "Direct phone is required",
    "crownRegistration.error.required.bAddress1": "Billing street address is required",
    "crownRegistration.error.required.bCity": "Billing city is required",
    "crownRegistration.error.required.bCountry": "Billing country is required",
    "crownRegistration.error.required.bState": "Billing state/province is required",
    "crownRegistration.error.required.bZip": "Billing ZIP/postal code is required",
    "crownRegistration.error.required.sAddress1": "Shipping street address is required",
    "crownRegistration.error.required.sCity": "Shipping city is required",
    "crownRegistration.error.required.sCountry": "Shipping country is required",
    "crownRegistration.error.required.sState": "Shipping state/province is required",
    "crownRegistration.error.required.sZip": "Shipping ZIP/postal code is required",
    "crownRegistration.error.emailInvalid": "Enter a valid email address",
    "crownRegistration.error.emailCompany": "Use a company email address",
    "crownRegistration.error.emailExists": "An account with this email already exists",
    "crownRegistration.error.phoneInvalid": "Enter a 10-digit phone number",
    "crownRegistration.error.passwordLength": "Use at least 8 characters",
    "crownRegistration.error.passwordMix": "Include at least one letter and one number",
    "crownRegistration.error.passwordMismatch": "Passwords do not match",
    "crownRegistration.error.zipUS": "Enter a 5-digit ZIP code",
    "crownRegistration.error.postalCA": "Enter a postal code like K1A 0B1",
    "crownRegistration.error.privacyRequired": "You must acknowledge the Privacy Policy",
    "crownRegistration.errorSummary.check": "Check",
    "crownRegistration.errorSummary.more": "+{count} more",
  ```
- **GOTCHA:**
  - Keep it valid JSON: each line ends with a comma, and the existing first key follows.
  - "Check" is uppercased with CSS, not in the copy.
  - Phase 2 adds the labels, section titles and the rest of the copy to this same block.
- **VALIDATE:** `node -e "JSON.parse(require('fs').readFileSync('src/lib/lang/locales/en.json','utf8'))" && git diff --stat src/lib/lang/locales/en.json`. This should be a single insertion hunk.

### Task 12: CREATE `src/pages/CrownRegistration/RegistrationForm/schema.ts`
- **IMPLEMENT:**
  ```ts
  import { z } from 'zod';

  const countrySchema = z.enum(['US', 'CA']);

  export const registrationSchema = z
    .object({
      existingCustomer: z.boolean(),
      companyName: z.string(), firstName: z.string(), lastName: z.string(),
      email: z.string(), password: z.string(), confirmPassword: z.string(), phone: z.string(),
      bAddress1: z.string(), bAddress2: z.string(), bCity: z.string(),
      bCountry: countrySchema, bState: z.string(), bZip: z.string(),
      sameAsBilling: z.boolean(),
      sAddress1: z.string(), sAddress2: z.string(), sCity: z.string(),
      sCountry: countrySchema, sState: z.string(), sZip: z.string(),
      privacyAcknowledged: z.boolean(),
    })
    .superRefine((values, ctx) => { /* see rules */ });

  export type RegistrationFormValues = z.infer<typeof registrationSchema>;
  export type AddressPrefix = 'b' | 's';
  export const defaultRegistrationValues: RegistrationFormValues = { existingCustomer: false, …'' strings…, bCountry: 'US', sCountry: 'US', sameAsBilling: true, privacyAcknowledged: false };
  ```
- **Rules inside `superRefine`.** Use a local helper `const fail = (path: keyof RegistrationFormValues, key: string) => ctx.addIssue({ code: 'custom', path: [path], message: \`crownRegistration.error.${key}\` });`
  - **Exported regex constants** (copy them exactly from PRD §7.6):
    - `EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i`
    - `FREE_EMAIL_PATTERN = /@(gmail|yahoo|hotmail|outlook|aol)\./i`
    - `US_ZIP_PATTERN = /^\d{5}(-\d{4})?$/`
    - `CA_POSTAL_PATTERN = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/`
  - `isBlank = (v: string) => v.trim() === ''`.
  - Order of checks. **Report at most one issue per field**: use `if / else if` chains, and don't check format once a field is blank.
    1. **Blank, not address:** `companyName`, `firstName`, `lastName` → `required.<field>` when blank.
    2. **`email`:**
       - blank → `required.email`
       - else fails `EMAIL_PATTERN` → `emailInvalid`
       - else matches `FREE_EMAIL_PATTERN` → `emailCompany`
       - Test the trimmed value.
    3. **`password`:**
       - blank → `required.password`
       - else `length < 8` → `passwordLength`
       - else fails `/[A-Za-z]/` or `/\d/` → `passwordMix`
    4. **`confirmPassword`:**
       - blank → `required.confirmPassword`
       - else `!== password` → `passwordMismatch`
    5. **`phone`:**
       - blank → `required.phone`
       - else `phone.replace(/\D/g, '').length < 10` → `phoneInvalid`
    6. **Address rules.** A helper `validateAddress(prefix)` checks `${prefix}Address1`, `${prefix}City` and `${prefix}State` (required), then `${prefix}Zip`:
       - blank → `required.${prefix}Zip`
       - else if country is US and it fails `US_ZIP_PATTERN` → `zipUS`
       - else if country is CA and it fails `CA_POSTAL_PATTERN` → `postalCA`
       - Trim the zip before testing.
       - Address2 is optional.
    7. Always call `validateAddress('b')`. Call `validateAddress('s')` **only if `!values.sameAsBilling`**.
    8. `privacyAcknowledged !== true` → `privacyRequired`.
  - Type the address field keys with template literals: ``type AddressField = `${AddressPrefix}${'Address1' | 'City' | 'State' | 'Zip'}` `` so the `fail` paths stay type-safe. Avoid string casts.
- **GOTCHA:**
  - **Don't** add `.min()` or `.email()` on the fields themselves. In zod 4, object-level refinements are skipped while field checks fail, and you'd lose the cross-field errors.
  - Unknown country values fail the `z.enum` itself (message: zod default). That's acceptable, because the select only offers US and CA. Optionally pass `z.enum(['US','CA'], { error: 'crownRegistration.error.required.bCountry' })`, but the enum is shared, so the simplest option is to leave the default.
  - Messages are **i18n keys**, not English.
- **VALIDATE:** `$LINT src/pages/CrownRegistration/RegistrationForm/schema.ts && yarn tsc --noEmit`

### Task 13: CREATE `src/pages/CrownRegistration/RegistrationForm/schema.test.ts`
- **IMPLEMENT:**
  - **Builder** `buildValuesWith = builder<RegistrationFormValues>(() => ({ …valid values… }))`, with:
    - `email: faker.internet.email({ provider: 'acmefoods.com' })`. **Always set a provider**, because the faker default can generate gmail or yahoo.
    - `phone: faker.string.numeric(10)`
    - `password: \`${faker.string.alpha(6)}${faker.string.numeric(3)}\``, with `confirmPassword` set to the same value (set both in the builder defaults using one local variable)
    - `bZip: faker.string.numeric(5)`, `bState: 'IL'`, `bCountry: 'US'`
    - `sameAsBilling: true`, `privacyAcknowledged: true`
    - Empty shipping fields
  - **Helper** `issuesFor(values) => Object.fromEntries(result.error?.issues.map(i => [i.path.join('.'), i.message]) ?? [])` over `registrationSchema.safeParse(values)`.
  - **Tests:**
    - `accepts a complete valid application`
    - `reports a required key for every blank required field`. Uses `it.each` over the 15 required fields, with `sameAsBilling: false` for the shipping fields.
    - `it.each` email cases:
      - `'not-an-email'` → `emailInvalid`
      - `'jane@acme.c'` → `emailInvalid`
      - `'jane@gmail.com'`, `'jane@yahoo.com'`, `'jane@hotmail.com'`, `'jane@outlook.com'`, `'jane@aol.com'` → `emailCompany`
      - A valid company email passes.
    - Phone:
      - `'555-0100'` → `phoneInvalid`
      - `'(555) 555-0100'` passes
    - Password:
      - `'abc12'` → `passwordLength`
      - `'abcdefgh'` → `passwordMix`
      - `'12345678'` → `passwordMix`
      - `'abcdefg1'` passes
    - `reports mismatched passwords alongside other required errors`, with `companyName: ''` and a mismatched confirm. Expect both issues, which proves the single-`superRefine` design.
    - US ZIP:
      - `'1234'` and `'K1A 0B1'` → `zipUS`
      - `'62701'` and `'62701-1234'` pass
    - CA postal:
      - `'12345'` → `postalCA`
      - `'K1A 0B1'`, `'k1a0b1'` and `'K1A-0B1'` pass
    - `ignores shipping fields when shipping is the same as billing`
    - `validates shipping fields with the shipping country's rules when shipping differs`, with `sCountry: 'CA'` and `sZip: '12345'` → `postalCA` at the `sZip` path.
    - `requires privacy acknowledgement`
    - `reports only one issue per field`: a blank email gives only `required.email`.
    - `defaultRegistrationValues fail only on required fields and privacy`: the default shipping fields don't produce any issues.
    - **Resolver compatibility:** `it('produces field errors through zodResolver')`. Call `await zodResolver(registrationSchema)(values, undefined, { fields: {}, shouldUseNativeValidation: false })` and assert that `result.errors.companyName.message === 'crownRegistration.error.required.companyName'`. This de-risks zod 4 plus resolvers v5 compatibility now, and it also means knip sees `@hookform/resolvers` as used.
- **GOTCHA:** use each message key's full string in assertions, e.g. `'crownRegistration.error.zipUS'`.
- **VALIDATE:** `yarn test --run src/pages/CrownRegistration/RegistrationForm/schema.test.ts`

### Task 14: CREATE `src/pages/CrownRegistration/tokens.ts`
- **IMPLEMENT:**
  ```ts
  export const crownColors = {
    navy: '#15296E', red: '#E41C40', redHover: '#C1152F', errorSurface: '#FDEEF0',
    pageGround: '#EDEDED', surface: '#FFFFFF', fieldFill: '#F4F5F7', uploadFill: '#FAFBFC',
    selectedCardFill: '#F2F4FA', bodyText: '#3F4650', mutedText: '#5B6473',
    fieldUnderline: '#BFC6CD', border: '#D5D8DE', divider: '#E4E6EA',
    scrim: 'rgba(13, 20, 45, 0.55)', black: '#000000',
  } as const;
  const fallback = "'Franklin Gothic', Arial, sans-serif";
  export const crownFonts = {
    body: `franklin-gothic-urw, ${fallback}`,
    comp: `franklin-gothic-urw-comp, ${fallback}`,
    cond: `franklin-gothic-urw-cond, ${fallback}`,
  } as const;
  export const crownBreakpoints = { stack: 720 } as const;
  export const crownMedia = { stacked: `@media (max-width: ${crownBreakpoints.stack - 1}px)` } as const;
  ```
- **VALIDATE:** `$LINT src/pages/CrownRegistration/tokens.ts`

### Task 15: CREATE `src/pages/CrownRegistration/styled.ts`
- **IMPLEMENT** these `@emotion/styled` components. All values come from `docs/registration.md` and `tokens.ts`.
  - **Page shell:**
    - `PageRoot`: background `pageGround`, padding `32px 24px 64px`, color navy, `font-family: crownFonts.body`, flex column centered, `gap: 20px`. `crownMedia.stacked` reduces the padding to `24px 16px 48px`.
    - `ContentColumn`: `max-width: 1180px; width: 100%`.
    - `Card`: white, `border: 1px solid border`, `border-top: 3px solid navy`, no radius or shadow.
    - `CardHeader`:
      - padding `36px 40px 28px`, `border-bottom: 1px solid divider`
      - `& > *` max-width 620px
      - under `stacked`: padding `28px 20px 20px`
    - `CardBody`: padding `28px 40px 40px`, or `20px` horizontal under `stacked`.
  - **Sections:**
    - `SectionGrid` (`styled.section`):
      - `display: grid; grid-template-columns: minmax(150px, 240px) minmax(0, 1fr); gap: 8px 40px; padding: 24px 0; border-bottom: 1px solid divider`
      - `&:last-of-type { border-bottom: none }`
      - under `stacked`: `grid-template-columns: minmax(0, 1fr)`
    - `RailTitle` (`styled.h2`): comp face, 600, `clamp(16px, calc(8px + 0.85vw), 24px)`, `letter-spacing: 0.04em`, uppercase, `white-space: nowrap`, margin `0 0 6px`, navy.
    - `RailDescription` (`styled.p`): 14px, line-height 1.45, muted, margin 0.
    - `FieldGrid`: `display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px 20px; align-content: start`.
    - `FullRow`: `grid-column: 1 / -1`.
  - **Buttons** (used in Phases 2 and 3):
    - `PrimaryButton` (`styled.button`):
      - padding `16px 34px`, red background, white text, no border
      - comp 700, 17px, `0.14em` tracking, uppercase, `cursor: pointer`
      - `&:hover:not(:disabled)`: redHover
      - `&:disabled`: `opacity: 0.6; cursor: not-allowed`
    - `SecondaryButton`: navy fill, padding `13px 26px`, comp 600, 15px, `0.12em`, uppercase, hover black.
- **GOTCHA:** use template-literal or object styles, with no inline `style` props anywhere. Declare the typed intrinsic element (`styled.section`, `styled.h2`) so the semantics hold.
- **VALIDATE:** `$LINT src/pages/CrownRegistration/styled.ts && yarn tsc --noEmit`

### Task 16: CREATE `src/pages/CrownRegistration/components/fieldStyles.ts`
- **IMPLEMENT** the field anatomy shared by the primitives:
  - `FieldLabel` (`styled.label`): flex column, `gap: 6px`, `min-width: 0`. Takes an optional prop `fullRow` (via `shouldForwardProp`) that adds `grid-column: 1 / -1`.
  - `FieldLabelText` (`styled.span`): 11px, 600, `0.12em` tracking, uppercase, muted.
  - `controlStyles` (a shared `css` string or object):
    - `width: 100%; box-sizing: border-box; padding: 12px; font: inherit; font-size: 16px; color: navy; background: fieldFill`
    - `border: 1px solid transparent; border-bottom: 2px solid fieldUnderline; border-radius: 4px 4px 0 0`
    - `&:focus { outline: none; border-bottom-color: red; background: surface }`
    - `&[aria-invalid='true'] { border-bottom-color: redHover }`
  - `ControlInput` (`styled.input`), which uses `controlStyles`.
  - `ControlSelect` (`styled.select`), which uses `controlStyles` plus:
    - `appearance: none; padding-right: 40px`
    - chevron: `background-image: url("data:image/svg+xml,…")` (a navy 12×8 chevron), `background-repeat: no-repeat; background-position: right 14px center`
  - `FieldHint` (`styled.span`): 12.5px, muted.
  - `FieldError` (`styled.span`): 12.5px, redHover.
- **GOTCHA:**
  - When using `shouldForwardProp`, import `isPropValid` from `@emotion/is-prop-valid` **only if it's already a dependency**. Check `package.json` first. Otherwise use `shouldForwardProp: (prop) => prop !== 'fullRow'`.
  - In the SVG data URI, URL-encode `#` as `%23`.
- **VALIDATE:** `$LINT src/pages/CrownRegistration/components/fieldStyles.ts && yarn tsc --noEmit`

### Task 17: CREATE `src/pages/CrownRegistration/components/CrownTextField.tsx`
- **IMPLEMENT:**
  ```tsx
  interface CrownTextFieldProps<T extends FieldValues> {
    control: Control<T>;
    name: Path<T>;
    label: string;                 // already translated
    required?: boolean;
    hint?: string;                 // already translated
    type?: 'text' | 'email' | 'password' | 'tel';
    autoComplete?: string;
    inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
    placeholder?: string;
    fullRow?: boolean;
    onBlur?: (value: string) => void;   // extra hook (Phase 2 email precheck)
  }
  export function CrownTextField<T extends FieldValues>({ control, name, label, required = false, hint, type = 'text', autoComplete, inputMode, placeholder, fullRow = false, onBlur }: CrownTextFieldProps<T>) {
    const b3Lang = useB3Lang();
    return (
      <Controller control={control} name={name} render={({ field, fieldState: { error } }) => {
        const errorId = `${name}-error`; const hintId = `${name}-hint`;
        const errorText = error?.message ? b3Lang(error.message) : undefined;
        const describedBy = errorText ? errorId : hint ? hintId : undefined;
        return (
          <FieldLabel fullRow={fullRow}>
            <FieldLabelText>{required ? `${label} *` : label}</FieldLabelText>
            <ControlInput id={name} name={field.name} ref={field.ref} value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={() => { field.onBlur(); onBlur?.(field.value); }}
              type={type} autoComplete={autoComplete} inputMode={inputMode} placeholder={placeholder}
              aria-invalid={Boolean(errorText)} aria-required={required} aria-describedby={describedBy} />
            {errorText ? <FieldError id={errorId}>{errorText}</FieldError> : hint && <FieldHint id={hintId}>{hint}</FieldHint>}
          </FieldLabel>
        );
      }} />
    );
  }
  ```
  - Because the `<label>` wraps the input, the accessible name is the label text including " *". Tests should query with regex names, for example `getByLabelText(/company name/i)`.
- **IMPORTS:** `Control, Controller, FieldValues, Path` from `react-hook-form`; `useB3Lang` from `@/lib/lang`; the styled parts from `./fieldStyles`.
- **GOTCHA:**
  - **Don't spread** `{...field}`, because `react/jsx-props-no-spreading` is disallowed in new code. List the props explicitly.
  - Nested ternaries may trip `no-nested-ternary`. If they do, compute `describedBy` in a small if/else.
  - Clear-on-edit is deliberately **not** here; Phase 2 handles it.
  - Check that `useB3Lang` is exported from `@/lib/lang`, with `grep -n useB3Lang src/lib/lang/index.ts`. If it isn't, import from `@/lib/lang/useB3Lang`.
- **VALIDATE:** `$LINT src/pages/CrownRegistration/components/CrownTextField.tsx && yarn tsc --noEmit`

### Task 18: CREATE `src/pages/CrownRegistration/components/CrownSelect.tsx`
- **IMPLEMENT:**
  - The same shape as `CrownTextField`, with these props:
    - `options: ReadonlyArray<{ value: string; label: string }>`
    - `placeholder?: string`, rendered as the first `<option value="">`
    - `onChange?: (value: string) => void`, called **after** `field.onChange(e.target.value)`
    - `fullRow?`, `required?`, `autoComplete?`
  - Renders `ControlSelect` with the same ARIA wiring and error display. There's no hint.
- **VALIDATE:** `$LINT src/pages/CrownRegistration/components/CrownSelect.tsx && yarn tsc --noEmit`

### Task 19: CREATE `src/pages/CrownRegistration/components/CrownCheckbox.tsx`
- **IMPLEMENT:**
  - **Props:**
    - `control`, `name`
    - `label: ReactNode`, which can contain a link
    - `variant: 'boxed' | 'plain'` (default `'plain'`)
    - `fullRow?`, `required?`
    - `onChange?: (checked: boolean) => void`
  - **Local styled parts:**
    - `CheckboxRow` (`styled.label`): flex, `gap: 12px`, `align-items: flex-start`, 16px, navy, cursor pointer.
    - Boxed variant: background `fieldFill`, `1px solid divider`, padding `14px 16px`.
    - `fullRow` adds `grid-column: 1 / -1`.
    - `CheckboxInput` (`styled.input`): `width: 20px; height: 20px; accent-color: red; flex-shrink: 0; margin: 2px 0 0`.
  - **Field wiring:**
    - `checked={Boolean(field.value)}`
    - `onChange={(e) => { field.onChange(e.target.checked); onChange?.(e.target.checked); }}`
    - `onBlur={field.onBlur}`
  - **Error:** show a `FieldError` below the row, and point `aria-describedby` at it.
  - **Layout:** wrap the row and the error in a `div`, and put `fullRow` on the wrapper.
- **GOTCHA:** for the wrapper, use `styled.div` with `shouldForwardProp`, the same as in Task 16.
- **VALIDATE:** `$LINT src/pages/CrownRegistration/components/CrownCheckbox.tsx && yarn tsc --noEmit`

### Task 20: CREATE `src/pages/CrownRegistration/components/FormSection.tsx`
- **IMPLEMENT:**
  ```tsx
  interface FormSectionProps { id: string; number: string; title: string; description: ReactNode; children: ReactNode }
  export function FormSection({ id, number, title, description, children }: FormSectionProps) {
    const headingId = `${id}-heading`;
    return (
      <SectionGrid id={id} aria-labelledby={headingId} tabIndex={-1}>
        <div>
          <RailTitle id={headingId}>{`${number} — ${title}`}</RailTitle>
          <RailDescription>{description}</RailDescription>
        </div>
        <FieldGrid>{children}</FieldGrid>
      </SectionGrid>
    );
  }
  ```
  - The em dash is surrounded by spaces.
  - `tabIndex={-1}` lets Phase 3 focus the section programmatically.
- **VALIDATE:** `$LINT src/pages/CrownRegistration/components/FormSection.tsx && yarn tsc --noEmit`

### Task 21: CREATE `src/pages/CrownRegistration/components/ErrorSummary.tsx`
- **IMPLEMENT:**
  - **Prop:** `messages: string[]`, already translated and in field order.
  - **Empty list:** return `null`.
  - **Otherwise:**
    - `const shown = messages.slice(0, 3).join(' · ');`
    - `const extra = messages.length - 3;`
    - `const text = extra > 0 ? \`${shown} · ${b3Lang('crownRegistration.errorSummary.more', { count: extra })}\` : shown;`
  - **Rendered markup:** `<Banner role="alert"><BannerLabel>{b3Lang('crownRegistration.errorSummary.check')}</BannerLabel><BannerText>{text}</BannerText></Banner>`.
  - **Styles:**
    - `Banner`: `margin-top: 24px; border: 1px solid red; background: errorSurface; padding: 14px 18px; display: flex; gap: 12px`
    - `BannerLabel`: cond face, 700, 15px, `0.1em`, uppercase, redHover
    - `BannerText`: 15px, bodyText
- **VALIDATE:** `$LINT src/pages/CrownRegistration/components/ErrorSummary.tsx && yarn tsc --noEmit`

### Task 22: CREATE the component tests (one per component)
Use `renderWithProviders` and `screen` from `tests/test-utils`, and `userEvent` via the returned `user`. Each file defines a small harness:
```tsx
function Harness({ errorKey, ...fieldProps }: { errorKey?: string } & Partial<…>) {
  const { control, setError } = useForm<{ companyName: string }>({ defaultValues: { companyName: '' } });
  useEffect(() => { if (errorKey) setError('companyName', { message: errorKey }); }, [errorKey, setError]);
  return <CrownTextField control={control} name="companyName" label="Company name" required hint="Hint text" />;
}
```
Labels and hints in the tests come from `faker.lorem.words()` wherever the exact text doesn't matter.

- **`CrownTextField.test.tsx`:**
  - `associates the label with the input and marks required fields`: uses `getByLabelText` and checks that the label contains `*`.
  - `shows the hint when there is no error`: `aria-describedby` points at the hint text.
  - `shows the translated error, hides the hint and marks the input invalid`:
    - `errorKey='crownRegistration.error.required.companyName'`
    - `await screen.findByText('Company name is required')`
    - `aria-invalid="true"`
    - the hint is absent
  - `calls onBlur with the current value`: type into the field, tab away, and assert the spy was called with the typed value.
  - `passes autocomplete and inputmode through`.
- **`CrownSelect.test.tsx`:**
  - `renders the placeholder and options`: `getByRole('combobox', { name: /state/i })` and `getByRole('option', { name })`.
  - `updates the value and calls onChange`: `user.selectOptions`.
  - `shows the translated error`.
- **`CrownCheckbox.test.tsx`:**
  - `toggles a boolean value` in both the `plain` and `boxed` variants: `getByRole('checkbox', { name })`, click, and assert it's checked.
  - `renders a link inside the label`: `getByRole('link', { name: /privacy policy/i })`.
  - `shows the privacy error`, using `crownRegistration.error.privacyRequired`.
- **`FormSection.test.tsx`:**
  - `renders a labelled region with the numbered title`: `getByRole('region', { name: '01 — Your details' })` together with the description and children.
- **`ErrorSummary.test.tsx`:**
  - `renders nothing without messages`: `queryByRole('alert')` is not in the document.
  - `joins up to three messages`: three messages are shown joined with " · ".
  - `adds "+N more" beyond three`: five messages end with `· +2 more`.
- **GOTCHA:**
  - The default messages in these tests must be real keys from Task 11. Unknown keys make react-intl log a console error, and `vitest-fail-on-console` then fails the test.
  - Don't use `container.querySelector` or `getByTestId`.
  - `useForm` is allowed in a test harness. It's not a mock.
- **VALIDATE:** `yarn test --run src/pages/CrownRegistration/components`

### Task 23: VALIDATE everything (Phase 1 gate)
Run every command in the Validation Commands section below.

---

## TESTING STRATEGY

### Unit tests
- **Service layer** (`anonymousFetch`, `registration`): mock the HTTP boundary with msw only; don't use `vi.mock` on fetch. Assert on request method, headers and body, and on the typed errors.
- **Schema:** plain `safeParse` tests driven by a builder. Every rule has at least one failing case and one passing case. Also includes one `zodResolver` integration test.

### Component tests
Five small files. They check the accessibility contract (labels, `aria-invalid`, `aria-describedby`, roles), i18n resolution and the display rules. They're rendered with `renderWithProviders`, so `LangProvider` supplies the real `en.json`.

### Regression
- The `vs/` refactor must not change behavior.
- Run the existing suites that use `VSRequest` and `clearShoppingListItemQuantities` indirectly: Login, ShoppingListDetails, the components and the hooks.
- Also run the stock Registered, RegisteredBCToB2B and Login suites, so we know the `en.json` insertion broke nothing.

### Edge cases to cover
- A whitespace-only value is treated as blank.
- Mixed-case CA postal codes, and codes with a hyphen or no space.
- ZIP+4.
- Free-mail detection is case-insensitive (`JANE@GMAIL.COM`).
- A confirm-password mismatch is reported alongside other errors.
- Shipping rules are skipped when shipping is the same as billing, even with bad shipping data (for example `sZip: 'abc'`).
- A non-JSON error body, a 429 with no body, a network failure, and a timeout.
- Anonymous requests have no Authorization header even when the store holds a JWT.
- `ErrorSummary` with exactly 3 messages (no "+N") and with 4 ("+1 more").

---

## VALIDATION COMMANDS

Run all of these from `apps/storefront/`.

### Level 1: Syntax and style
```bash
npx eslint --max-warnings 0 --rule "{\"prettier/prettier\":[\"warn\",{\"endOfLine\":\"auto\"}]}" src/shared/service/vs src/pages/CrownRegistration src/lib/lang
yarn tsc --noEmit
node -e "JSON.parse(require('fs').readFileSync('src/lib/lang/locales/en.json','utf8'))"
```

### Level 2: Unit and component tests
```bash
yarn test --run src/shared/service/vs src/pages/CrownRegistration
```

### Level 3: Regression
```bash
yarn test --run src/pages/Login src/pages/ShoppingListDetails src/pages/Registered src/pages/RegisteredBCToB2B src/components src/hooks src/lib/lang
```

### Level 4: Fork-hygiene checks
```bash
git diff --stat origin/main -- src/pages/Registered src/pages/RegisteredBCToB2B src/shared/routes src/pages/Login   # expect: no Phase-1 changes
git diff --stat -- src/lib/lang/locales/en.json                                                          # expect: one insertion hunk
git status --short                                                                                       # only files listed in this plan
```

### Level 5: Informational only (expected to report findings until Phase 2)
```bash
yarn lint:knip            # expect: unused exports/files from the new modules; @hookform/resolvers should NOT be flagged (used in schema.test)
yarn lint:dependencies    # expect: no-orphans for the new non-test files
```
Record the output in the completion report. Don't "fix" the findings by adding ignores.

---

## ACCEPTANCE CRITERIA

- [ ] `@hookform/resolvers` v5 is installed, and `zodResolver(registrationSchema)` produces keyed field errors, which a test proves.
- [ ] `anonymousFetch.post` never sends `Authorization` and never imports the store or the JWT helpers. Non-2xx responses throw `VSApiError` with the status and parsed errors. Network failures and timeouts throw `VSApiError(0, NETWORK)`.
- [ ] `registerBusinessAccount` and `validateAddress` post the exact PRD §10 shapes, with `storeHash` (both calls) and `channelId` (registration only) added.
- [ ] `getVSTurnstileSiteKey()` is exported, and returns the Cloudflare test key in every environment, with a TODO for the real keys.
- [ ] Every rule in PRD §7.6, apart from the duplicate-email check (Phase 2), is implemented in `schema.ts` and returns an i18n key, and each rule has passing and failing tests.
- [ ] The `en.json` changes are a single contiguous `crownRegistration.*` block at the top of the file.
- [ ] The five primitives render accessible, correctly labelled controls, with error and hint wiring, and without props spreading or `any`.
- [ ] `src/shared/service/vs/` has zero eslint problems and no behavior changes, and the regression suites pass.
- [ ] `tsc --noEmit` passes, and every new test passes.
- [ ] Nothing under `src/pages/Registered/`, `src/pages/RegisteredBCToB2B/`, `src/shared/routes/` or `src/pages/Login/` is modified.

---

## COMPLETION CHECKLIST

- [ ] Tasks 1–23 done in order, and each task's VALIDATE passed right away.
- [ ] Levels 1–4 pass. The Level 5 output is recorded.
- [ ] No `console.*`, no `any`, no `eslint-disable`, and no props spreading in new code.
- [ ] The final report lists:
  - the knip and depcruise findings expected in Phase 2
  - `getDefaultShoppingList` as an unused-export candidate
  - Turnstile staging and production keys as outstanding

---

## NOTES

- **Why the rules sit in one `superRefine`:** zod 4 doesn't run object-level refinements while nested checks are failing. With `.min(1)` on the fields, a submit with blank fields would hide "Passwords do not match" and the ZIP-format errors. Bare fields plus one refinement give full, deterministic error reporting, with one issue per field.
- **Why the messages are i18n keys:** it keeps the schema pure and testable without React. The primitives translate with `b3Lang`. In Phase 2, server `VALIDATION` messages (raw English) should be mapped to keys where possible. Passing unknown strings through `b3Lang` works in production but logs a react-intl error, which fails tests.
- **Why native elements rather than MUI `TextField`:** the design's field anatomy (filled background, 2px bottom rule, uppercase external label, chevron select) matches closely enough that restyling MUI would take more overrides than writing a styled native control. Phase 3 still uses MUI `Dialog` for the modal, because it provides the focus trap.
- **Clear-on-edit:** deliberately left to Phase 2. There the form uses a single `watch` subscription that calls `clearErrors(name)`, which also covers `setValue` from the country reset and the USPS modal.
- **Staging and production Turnstile keys are placeholders**, deliberately set to Cloudflare's always-pass test key. They're flagged with a TODO and must be replaced before release (PRD open item 1).
- **Where the `en.json` block goes:** at the top of the file, because the file isn't sorted and upstream appends to the end.
- **Out of scope for Phase 1:** the page, routing, Login changes, Turnstile rendering, the USPS dialog, the email precheck, the regions hook, the Typekit fonts and the logo asset.

**Confidence score: 8/10** for a one-pass implementation. The main risks:
- lint-rule friction on new code (`func-names`, `no-nested-ternary`, `shouldForwardProp` typing), which `eslint --fix` and small adjustments resolve
- the exact type signature of the zod 4 plus resolvers v5 call in the compatibility test
- AbortController and msw timing in the timeout test (mitigated by real timers and a 20 ms timeout)
