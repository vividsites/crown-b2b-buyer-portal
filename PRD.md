# PRD: Crown Business Account Registration (2026 Update)

| | |
|---|---|
| **Project** | Crown Packaging B2B Buyer Portal (fork of BigCommerce `b2b-buyer-portal`) |
| **Branch** | `feature/2026-registration-update` |
| **Status** | Ready for implementation |
| **Date** | 2026-09-24 |
| **Design source** | `docs/registration.md`, `docs/Crown B2B Registration.dc.html`, `docs/screenshots/` |
| **Requirements source** | `New Customer - Auto Registration requirements.docx`, `New Customer - Sign In - Sign Up page.docx` |

---

## 1. Executive Summary

Crown Packaging's buyer portal currently uses BigCommerce's stock B2B registration. That flow has three steps, mostly empty space, asks for an email address twice, and collects one address that is used for both billing and shipping. Crown's customer-service team has asked for a single, business-only form. The form should use screen space well, collect billing and shipping addresses separately, check addresses against USPS, and record whether the applicant is already a Crown customer.

This project replaces the portal's `/register` experience with a new single-page **Crown Business Account Registration** form, built to the high-fidelity design in `docs/registration.md`. The form sends the application to a **new custom VS API endpoint**, which does all of the account creation on the server: it creates the BigCommerce customer and the B2B company, creates the addresses, and assigns the restricted "New Customer" group. The endpoint has to accept anonymous requests, so the form is protected with **Cloudflare Turnstile**. Under the plan, the new page lives in its own folder and is connected to the app with a one-line route change. That keeps upstream merges from BigCommerce cheap.

**MVP goal:** A prospective business customer can complete one page, pass bot and address checks, and submit an application that the VS API receives in a well-defined payload. The applicant then sees a "pending approval" confirmation. The stock registration code stays untouched and can be switched back on with a one-line change.

---

## 2. Mission

Make it quick and error-free for a qualified business to apply for a Crown online account, while protecting Crown's systems from bots and bad data.

**Core principles**
1. **One pass, no repetition.** Every piece of information is asked for once, on one page.
2. **Catch errors early.** Inline validation, a duplicate-email check and USPS verification stop bad data before it reaches Crown.
3. **The server is the authority.** The client validates for convenience. The VS API re-validates everything and owns all account creation.
4. **Fork hygiene.** Crown code goes in new files, and upstream files are edited as little as possible, so upstream merges stay cheap.
5. **Match the design.** Colors, type, spacing, copy and validation match `docs/registration.md` exactly.

---

## 3. Target Users

### Primary: prospective business buyer (new applicant)
- A purchasing manager, office manager or small-business owner ordering packaging for a US or Canadian business.
- **Technical comfort:** moderate. Comfortable with web forms, may be on a laptop or phone.
- **Needs:** a fast application; to know what happens next (approval timing, when they can sign in); separate billing and shipping addresses.
- **Pain points today:** three-step flow, email asked twice, one address forced to serve as both billing and shipping, no feedback that an address may be invalid.

### Secondary: existing Crown (offline/JDE) customer without an online account
- Already buys from Crown through sales or JDE, and now wants to order online.
- **Needs:** to say that they're already a customer so Crown can link them to their existing account.
- **Uses the same form** for now, and ticks "Already a customer?".

### Internal: Crown trade and customer-service team
- Reviews and approves new accounts. Crown's target is one business day.
- **Needs:** clean, validated address data; a reference number to track each application; bots kept out of the queue; new accounts placed automatically in a restricted "New Customer" group.

---

## 4. MVP Scope

### Core functionality
- ✅ Single-page form with four numbered sections: **01 Your details**, **02 Billing address**, **03 Shipping address**, **04 Submit**
- ✅ "Already a customer?" checkbox, captured as a flag with no other UI behavior
- ✅ Email asked once, used as the login, and checked for duplicates when the field loses focus
- ✅ Separate billing and shipping addresses, with "Shipping address is the same as billing" (checked by default)
- ✅ US and Canada, with country-aware region lists, labels and postal-code rules
- ✅ Client validation: on blur, error cleared on edit, full check on submit, and an error summary banner
- ✅ USPS address verification modal for US addresses, with a choice between the recommended address and the one entered
- ✅ Required privacy-policy acknowledgement, unchecked by default
- ✅ Cloudflare Turnstile widget. Submit is blocked until a token exists.
- ✅ "Application received / pending approval" confirmation showing the API's reference number
- ✅ The Login page's "Create account" button opens `/register` inside the portal
- ✅ The existing `registerEnabled` storefront toggle still hides the page (redirects to `/login`)

### Technical
- ✅ New page module `src/pages/CrownRegistration/`, connected by switching one lazy import in `src/shared/routes/index.tsx`
- ✅ Stub VS API client methods: `registerBusinessAccount`, `validateAddress`
- ✅ A new anonymous VS request helper that sends no JWT and returns typed errors for 4xx responses
- ✅ react-hook-form with a zod schema via `@hookform/resolvers` (new dependency)
- ✅ Page-local Crown field components (text, select, checkbox), without changing `B3CustomForm`
- ✅ Typekit font kit (`yss3osz`) injected into the portal iframe
- ✅ New i18n keys (`crownRegistration.*`) in `en.json`
- ✅ Vitest and Testing Library tests, with the endpoints mocked through msw

### Integration
- ✅ Countries and states from the existing `getB2BCountries()` (BigCommerce data)
- ✅ Duplicate-email check with the existing B2B `checkUserEmail`
- ✅ Turnstile script loaded into the ThemeFrame iframe
- ✅ Payload contract for the VS registration and address-validation endpoints, documented here

### Deployment
- ✅ Turnstile site key per environment comes from `window.B3.setting.turnstileSiteKey`, a BigCommerce theme setting copied by the Script Manager snippet (no code change per environment)
- ✅ Rollback is a single-line route revert to the stock `Registered` page

### Out of scope
- ❌ **Tax exemption section** (tax ID, exempt state, certificate upload). Deferred until Crown decides on Vertex.
- ❌ Building the VS server endpoints: Turnstile check, BC/B2B account creation, USPS proxy. That's backend work in another repo. The contract is in §10.
- ❌ Any behavior for "Already a customer?" beyond capturing it (for example an account-number field or routing to sales)
- ❌ Address validation for Canadian addresses
- ❌ Automatic login after registration (every account is pending until approved)
- ❌ Changes to `RegisteredBCToB2B` (the flow for upgrading a BC customer to B2B)
- ❌ Changes, deletions or test rewrites in the stock `src/pages/Registered/`
- ❌ Login page copy changes (already shipped in `9d041bb3`)
- ❌ New-customer payment and shipping restrictions, and the later promotion to full access. These are handled in BC and B2B configuration and the backend.
- ❌ Translations other than English

---

## 5. User Stories

1. **Single page**
   As a prospective buyer, I want to fill in one page instead of stepping through three, so that I can apply in a couple of minutes.
   *Example:* On a 1440px screen, all four sections are visible as a two-column layout, with section titles on the left and fields on the right. Nothing moves me to another step.

2. **Separate shipping address**
   As a buyer whose warehouse is not at our billing office, I want to enter a separate shipping address, so that my orders go to the right dock.
   *Example:* I untick "Shipping address is the same as billing", and six shipping fields appear, all required.

3. **Email asked once**
   As an applicant, I want to give my work email once and use it to sign in, so that I don't have to track two addresses.
   *Example:* I type `jane@gmail.com` and see "Use a company email address". I type an email that's already registered and, when I leave the field, see "An account with this email already exists".

4. **Address correction**
   As an applicant, I want to be told when my address doesn't match USPS records, so that deliveries and invoices aren't delayed.
   *Example:* I enter "123 main st, springfield IL 62701". When I submit, a modal suggests "123 MAIN ST, SPRINGFIELD IL 62701-1234". I pick it, and the application is sent with the corrected address.

5. **Canadian applicant**
   As a Canadian applicant, I want province and postal-code fields, so that the form accepts my address.
   *Example:* When I choose Canada, "State" becomes "Province", the list shows 13 provinces and territories, and "K1A 0B1" is accepted while "12345" is not.

6. **Existing customer**
   As an existing offline Crown customer, I want to say I'm already a customer, so that Crown links my online account to my existing one.
   *Example:* I tick "Already a customer?", and the request includes `contact.existingCustomer: true`.

7. **Clear next steps**
   As an applicant who has just submitted, I want to know what happens next, so that I'm not left guessing.
   *Example:* I see "Your account is pending approval", my email, my company, my name and "Reference CC-104233".

8. **Bots kept out** (technical/internal)
   As Crown's trade team, I want automated sign-ups blocked, so that the approval queue only contains real businesses.
   *Example:* A scripted POST to `/storefront/registration/` without a valid Turnstile token gets `400 { errors: [{ code: "TURNSTILE_FAILED" }] }` and no account is created.

9. **Cheap upstream merges** (technical/developer)
   As a developer maintaining the fork, I want the Crown registration isolated from upstream code, so that merging BigCommerce releases doesn't cause conflicts.
   *Example:* Upstream changes `src/pages/Registered/…`, and the merge applies cleanly because Crown didn't modify those files.

---

## 6. Core Architecture & Patterns

### High-level flow

```
Login page ──"Create account"──▶ navigate('/register')
theme links / openPage('REGISTER_ACCOUNT') / login.php?action=create_account ──▶ /register
                                                   │
                         shared/routes/index.tsx (one-line swap)
                                                   ▼
                                pages/CrownRegistration (new)
      ┌──────────────────────────────┼───────────────────────────────┐
      ▼                              ▼                               ▼
getB2BCountries()          checkUserEmail() on blur      Turnstile widget (iframe)
(BC regions, cached)       (B2B GraphQL)                 → token
                                                   │ submit
                                                   ▼
                         zod validation ──fail──▶ inline errors + summary banner
                                                   │ pass
                                                   ▼
             for each US address: VS validateAddress() ──corrected──▶ USPS modal
                                                   │ (errors → continue unvalidated)
                                                   ▼
                    VS registerBusinessAccount() (anonymous + Turnstile token)
                     │ 200 {referenceId}                     │ 4xx {errors[]}
                     ▼                                       ▼
            Confirmation screen                  field errors / banner, reset Turnstile
```

### Directory structure (new files, apart from the minimal upstream edits in §6.4)

```
apps/storefront/src/
├── pages/CrownRegistration/
│   ├── index.tsx                       # guard, shell, form ↔ confirmation switch
│   ├── index.test.tsx
│   ├── RegistrationConfirmation.tsx
│   ├── useTypekitFonts.ts
│   ├── tokens.ts                       # design tokens (colors, fonts, spacing)
│   ├── styled.ts                       # styled() layout components
│   ├── assets/crown-logo.png
│   ├── components/
│   │   ├── CrownTextField.tsx
│   │   ├── CrownSelect.tsx             # includes chevron
│   │   ├── CrownCheckbox.tsx           # boolean; boxed | plain; ReactNode label
│   │   ├── FormSection.tsx             # "01 — Title" rail + field grid
│   │   └── ErrorSummary.tsx
│   └── RegistrationForm/
│       ├── index.tsx
│       ├── schema.ts                   # zod schema + RegistrationFormValues
│       ├── schema.test.ts
│       ├── AddressFields.tsx           # prefix 'b' | 's'
│       ├── AddressVerificationDialog.tsx
│       ├── Turnstile.tsx
│       ├── loadTurnstile.ts
│       ├── useRegions.ts
│       ├── useEmailPrecheck.ts
│       └── useRegistrationSubmit.ts
└── shared/service/vs/
    ├── api/registration.ts             # stub client + types (new)
    ├── api/registration.test.ts
    ├── request/anonymousFetch.ts       # no-JWT request helper (new)
    ├── request/anonymousFetch.test.ts
    ├── request/base.ts                 # + getVSTurnstileSiteKey / isTurnstileTestSiteKey, read from window.B3.setting (edit)
    └── index.ts                        # + exports (edit)
```

### Key patterns
- **Matroska layout** (from `AGENTS.md`): the page owns its components, hooks and tests, placed next to each other.
- **Props over context/Redux:** form state stays in react-hook-form. The only Redux read is `themeFrameSelector`, for the iframe document.
- **Schema-first validation:** one zod schema, with `superRefine` for the conditional rules (shipping fields when shipping differs from billing; ZIP or postal format by country). Unit-tested on its own.
- **Anonymous requests are kept separate from authenticated ones.** `VSRequest` always attaches a customer JWT. Registration uses `anonymousFetch`, which never does.
- **Scripts load inside the iframe.** The portal renders inside `ThemeFrame`, so the Turnstile and Typekit tags are added to the iframe document's `<head>`. This follows `loadCaptchaScript` in `components/captcha/Captcha.tsx`.

### 6.4 Upstream file edits (the only ones)
| File | Change |
|---|---|
| `src/shared/routes/index.tsx:40` | `const Registered = lazy(() => import('@/pages/CrownRegistration')); // Crown:` |
| `src/pages/Login/index.tsx:311` | `handleCreateAccountClick` → `navigate('/register')` (this file is already customized for Crown) |
| `src/lib/lang/locales/en.json` | One contiguous `crownRegistration.*` block |
| `src/index.d.ts` | One line: `turnstileSiteKey?: string` in `Window.B3.setting` |
| `apps/storefront/index.html` | One line: the local-dev Turnstile site key in the `window.B3.setting` block (dev harness only) |
| `apps/storefront/package.json` | Add `@hookform/resolvers` |
| `knip.jsonc` | Only if knip flags the stock `Registered` page as unused |

---

## 7. Features

### 7.1 Page shell
- `registerEnabled` false → redirect to `/login`. This is the same guard the stock page uses.
- Background `#EDEDED`, and a content column up to 1180px wide.
- The header row shows the Crown logo (44px tall) and "Already have an account? **Sign in**" (links to `/login`).
- The card has a 3px navy top border. The H1 is "Business Account Registration", followed by an intro paragraph that is placeholder copy for now.
- Footer: "Need help with an application? Email **CrownCommerceSupport@crownpack.com**" (a `mailto:` link).
- Wrapped in the shared `B3Card` / `RegisteredCloseButton` shell.

### 7.2 Section 01: Your details
Rail text: "The person who will administer the company account."

| Field | Name | Autocomplete | Required | Notes |
|---|---|---|---|---|
| Already a customer? | `existingCustomer` | — | No | Plain checkbox spanning the full row, unchecked by default |
| Company name | `companyName` | `organization` | Yes | |
| First name | `firstName` | `given-name` | Yes | |
| Last name | `lastName` | `family-name` | Yes | |
| Email | `email` | `email` | Yes | Hint: "Used to sign in once approved". Duplicate check on blur. |
| Password | `password` | `new-password` | Yes | Hint: "At least 8 characters, with a letter and a number" |
| Confirm password | `confirmPassword` | `new-password` | Yes | |
| Phone | `phone` | `tel` | Yes | Placeholder "(555) 555-0100" |

### 7.3 Section 02: Billing address
Rail text: "Where invoices and statements are sent."
`bAddress1` (full row, required), `bAddress2` (full row, optional), `bCity`, `bCountry` (US by default, or CA), `bState`, `bZip`. `bZip` uses `inputMode="numeric"` for US and `text` for CA.

### 7.4 Section 03: Shipping address
Rail text: "You can add more ship-to locations after approval."
A boxed checkbox, "Shipping address is the same as billing", is checked by default. Unticking it shows `sAddress1…sZip`, with the same layout and rules as billing. These fields are required only while they're shown.

### 7.5 Section 04: Submit
- Rail text is placeholder copy for now.
- A required checkbox, unchecked by default: "I acknowledge that I have read and understand the Crown Packaging Corporation **Privacy Policy**." The Privacy Policy URL is still to come.
- The Turnstile widget (managed mode).
- A "SUBMIT APPLICATION" button, red (`#E41C40`, hover `#C1152F`). It's disabled until there's a Turnstile token, and shows "Submitting…" while the request is in flight.

### 7.6 Validation

**Timing**
- Each field is validated when it loses focus.
- A field's error clears as soon as the user edits it.
- On submit, every field is validated.

**Error summary banner:** a "CHECK" label, followed by the first three errors joined with " · ", plus " · +N more" when there are more than three.

| Rule | Condition | Message |
|---|---|---|
| Required | Empty | "{Label} is required" (labels: Work email, Direct phone, Billing city, …) |
| Email format | fails `/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i` | "Enter a valid email address" |
| Company email | matches `@(gmail\|yahoo\|hotmail\|outlook\|aol)\.` | "Use a company email address" |
| Duplicate email | `checkUserEmail` → `!isValid` | "An account with this email already exists" |
| Phone | < 10 digits | "Enter a 10-digit phone number" |
| Password length | < 8 characters | "Use at least 8 characters" |
| Password mix | no letter or no digit | "Include at least one letter and one number" |
| Confirm | ≠ password | "Passwords do not match" |
| US ZIP | fails `/^\d{5}(-\d{4})?$/` | "Enter a 5-digit ZIP code" |
| CA postal | fails `/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/` | "Enter a postal code like K1A 0B1" |
| Privacy | unchecked | "You must acknowledge the Privacy Policy" |

**Changing country**
- Changing the billing country clears `bState` and the errors on `bState` and `bZip`.
- Changing the shipping country clears `sState` and the errors on `sState` and `sZip`.

**Country-specific labels**

| | US | CA |
|---|---|---|
| Region label / prompt | State * / "Select state" | Province * / "Select province" |
| Region list | 50 states + DC (allowlist applied to BC data) | 13 provinces/territories |
| Postal label | ZIP code * | Postal code * |

### 7.7 USPS address verification
- Runs after client validation passes, for each US address being submitted (billing, and shipping if it's separate). The addresses are handled one at a time.
- `validateAddress` returns one of three statuses:
  - `match` or `unverifiable`: continue.
  - `corrected`: open the modal.
  - Error or timeout: log it with `b2bLogger` and continue without validation. Verification should never stop a submit.
- The modal:
  - Built on MUI `Dialog`, which provides `aria-modal` and traps focus.
  - Title: "VERIFY YOUR ADDRESS".
  - Two radio cards:
    - "Recommended" (selected by default): the uppercase address with ZIP+4, plus a note built from `changes[]`.
    - "What you entered".
  - Actions:
    - "Use this address": writes the chosen address into the form with `setValue`, then continues the submit.
    - "Edit address", Esc or the close button: stops the submit and focuses that address section.

### 7.8 Bot protection (Turnstile)
- Loads `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` into the ThemeFrame iframe `<head>`, only once.
- Renders through `iframeWindow.turnstile.render(el, { sitekey, action: 'registration', theme: 'light', size: 'normal', callback, 'expired-callback', 'error-callback', 'timeout-callback' })`. The iframe is same-origin, so it calls `render` directly (Plan A). If that proves unreliable, it falls back to the reCAPTCHA-style `postMessage` bridge (Plan B). **Spike result:** Plan A works. With a real widget on the local dev server, siteverify returned `hostname: "localhost"` and `action: "registration"`. The hostname on deployed domains is confirmed in Phase 4.
- The site key comes only from `window.B3.setting.turnstileSiteKey`. If it is missing or empty the widget is not rendered, an error is logged, a "not configured" message shows and Submit stays disabled (fail closed). A Cloudflare test key in a production build is logged.
- The `action` travels inside the token (the payload has no extra field); the VS API checks it against `siteverify`.
- Token lifecycle:
  - The callback stores the token.
  - When the token expires or errors, it's cleared and Submit is disabled.
  - After any failed submit, the widget resets, because tokens are single-use.
  - On unmount, the widget is removed.

### 7.9 Confirmation screen
- Eyebrow "APPLICATION RECEIVED". H1 "Your account is pending approval".
- Body: "Our trade team reviews new business accounts within one business day. Once approved, we email **{email}** confirmation and you can sign in with the password you set during registration."
- Summary box: Company, Primary contact, Reference (`referenceId` from the API).
- Buttons:
  - "BROWSE THE CATALOG" goes to the storefront home, the same behavior as `RegisteredCloseButton`.
  - "SUBMIT ANOTHER ACCOUNT" resets the form and Turnstile.

### 7.10 Responsive layout
- Section grid: `minmax(150px, 240px) | 1fr` on desktop. Below 720px the section title and description stack above the fields.
- Field grid: `repeat(auto-fit, minmax(220px, 1fr))`, which gives 3, 2 or 1 columns depending on width.
- No horizontal scrolling at 375px.

---

## 8. Technology Stack

| Area | Technology | Version | Notes |
|---|---|---|---|
| Language | TypeScript | ^5.9.3 | |
| UI | React | 18 | |
| Components / styling | MUI + Emotion | ^5.18.0 / ^11.14 | `styled()` and design tokens, no inline styles |
| Forms | react-hook-form | ^7.71.1 | Already a dependency |
| Validation | zod | ^4.1.12 | Already a dependency (currently used only to parse API responses) |
| Resolver | **@hookform/resolvers** | ^5.x | **New dependency.** v5 supports zod 4. |
| i18n | react-intl via `useB3Lang` | ^5.20.3 | New keys in `en.json` only |
| Build | Vite | ^7.3.2 | Imports the PNG asset |
| Tests | Vitest + Testing Library + msw | ^3.2.4 | `renderWithProviders` from `tests/test-utils.tsx` |
| Runtime | Node | 22.16 | Yarn 1.22, Turborepo |

**Third-party services**
- **Cloudflare Turnstile.** The client widget is in this repo. Server verification (siteverify) happens in the VS API.
- **Adobe Fonts (Typekit)**, kit `yss3osz`: `franklin-gothic-urw`, `-comp` and `-cond`.
- **USPS Addresses API**, called only through the VS API proxy, never from the browser.
- **BigCommerce / B2B Edition:** `getB2BCountries` and `checkUserEmail` from the client, and account creation from the VS API.

---

## 9. Security & Configuration

### Authentication and authorization
- Both registration endpoints are **anonymous**. `anonymousFetch` must **never** send the customer JWT or an `Authorization` header.
- The Turnstile token is the proof that a human filled in the form. The VS API **must** verify it through Cloudflare siteverify before doing anything else, and should check `hostname` and, if one is set, `action`. Tokens are single-use and expire after 300 seconds.
- The password travels over HTTPS in the request body, is never logged by the client, and is never kept in Redux or storage.

### Configuration
| Setting | Location | Values |
|---|---|---|
| VS API base URL | `shared/service/vs/request/base.ts` (existing) | local `https://localhost:44320`, integration, staging `crowntest.vividconnector.com`, production `crowncom.vividconnector.com` |
| Turnstile site key | `window.B3.setting.turnstileSiteKey`, filled by the Script Manager snippet from the existing BigCommerce theme setting (locally: `apps/storefront/index.html`) | local: `1x00000000000000000000AA` (Cloudflare's always-pass test key); staging and production: real keys set as theme settings, **still to be provided**. Changing the key is a theme-setting change, not a rebuild. |
| Environment selection | `window.B3.setting.vsEnvironment` (existing) | |
| Registration enabled | B2B storefront config `tradeProfessionalApplication` → `registerEnabled` (existing) | |
| Turnstile secret key | **VS API server only.** Never in this repo. | Test secrets pair with test site keys: `1x0000000000000000000000000000000AA` always passes, `2x0000000000000000000000000000000AA` always fails, `3x0000000000000000000000000000000AA` returns `timeout-or-duplicate`. Test secrets accept only the token `XXXX.DUMMY.TOKEN.XXXX`, and real secrets reject it. See `docs/turnstile-manual-testing.md`. |

### Security scope
- ✅ **In scope for the client:** anonymous request path, Turnstile widget, client validation, no password persistence, a submit button that can't be double-clicked (`isSubmittingRef`).
- ✅ **Required of the VS API (documented here):**
  - Turnstile verification
  - Server-side re-validation
  - Duplicate-email and duplicate-address enforcement
  - A CORS allowlist of storefront domains
- ✅ **Handled by Cloudflare, not the VS API code:** IP rate limiting on both endpoints. The validate-address endpoint isn't covered by Turnstile, so its Cloudflare rule matters most.
- ❌ **Out of scope:** WAF rules, the BC customer password policy (the client rule matches the spec; the server should enforce BC's policy if it's stricter).

### Deployment considerations
- If the storefront has a Content Security Policy, allow `https://challenges.cloudflare.com` (script and frame) and `https://use.typekit.net` (style and font).
- The Typekit kit's domain allowlist must include the storefront and portal domains, or the fonts fall back to Arial.
- **Deployment order:** the VS API endpoints go live before the route swap, or the route swap waits behind them. Rollback is the one-line route revert.

---

## 10. API Specification

Both endpoints are on `getVSAPIBaseURL()`, use JSON, and **don't require authentication**.

### 10.1 `POST /storefront/registration/`

**Request**
```json
{
  "storeHash": "twftgtyvcg",
  "channelId": 1,
  "turnstileToken": "0.AbCdEf…",
  "contact": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane.doe@acmefoods.com",
    "phone": "(555) 555-0100",
    "password": "Str0ngPass",
    "existingCustomer": false
  },
  "company": { "name": "Acme Foods LLC" },
  "privacyAcknowledged": true,
  "billingAddress": {
    "address1": "123 MAIN ST",
    "address2": "Dock 4",
    "city": "SPRINGFIELD",
    "state": "IL",
    "stateName": "Illinois",
    "postalCode": "62701-1234",
    "country": "US"
  },
  "shippingAddress": { "sameAsBilling": true }
}
```
When shipping differs from billing: `"shippingAddress": { "sameAsBilling": false, "address1": "…", "address2": "", "city": "…", "state": "ON", "stateName": "Ontario", "postalCode": "K1A 0B1", "country": "CA" }`.

**`stateName` is required** on `billingAddress` and on a separate `shippingAddress`, next to the `state` code. One of the underlying BigCommerce APIs needs the region name instead of the code. The client takes the name from the BC region data (`getB2BCountries()`, which returns `stateCode` and `stateName`) when it builds the payload. `stateName` is not sent to, or returned from, `validate-address` (§10.2). When `sameAsBilling` is true, the server copies the billing address into the shipping address.

**Success: `200`**
```json
{ "referenceId": "CC-104233", "status": "pending" }
```

**Errors: `4xx`**
```json
{
  "errors": [
    { "field": "email", "code": "EMAIL_EXISTS", "message": "An account with this email already exists" }
  ]
}
```
| Code | Field | Client behavior |
|---|---|---|
| `TURNSTILE_FAILED` | — | Banner "Verification failed, please try again"; reset the widget |
| `EMAIL_EXISTS` | `email` | Inline error on the email field |
| `VALIDATION` | any form field name | Inline error on that field |
| `ADDRESS_EXISTS` | `billingAddress`, `shippingAddress`, or `companyName` | Duplicate address: inline error on that address (`bAddress1` / `sAddress1`) and focus the field. Duplicate company name: inline error on `companyName`. Show the server's `message` as-is (it is written for display). |
| `REGISTRATION_FAILED` (500) | — | Generic banner, reset the widget |
| `RATE_LIMITED` (429) | — | Banner "Too many attempts, please try again later". Only Cloudflare returns this; the VS API doesn't. |
| other / 404 / 5xx / network | — | Generic banner, reset the widget. Exception: an unrecognised `code` that names a form field and carries a `message` is shown inline on that field. |

All application errors (`TURNSTILE_FAILED`, `EMAIL_EXISTS`, `VALIDATION`, `ADDRESS_EXISTS`) come back as HTTP 400, so the client switches on `code`, not on status. `VALIDATION` fields use the form field names (`companyName`, `bAddress1`, `bZip`, …). A failed password step also returns `VALIDATION` on `password`. The privacy field is `privacyAcknowledged`, the same name as the form field.

**Expected server behavior**
1. Verify the token with siteverify: `success`, `action == 'registration'`, and `hostname` in the allowlist. Log the specific failure reason; return `TURNSTILE_FAILED` for all of them. (Cloudflare's test keys return `hostname: "example.com"` and no `action`, so these two checks must be relaxed in non-production.)
2. Re-validate the payload with the same rules as the client.
3. Check for duplicate billing and shipping addresses already in BigCommerce (exact match on both address lines and ZIP), and for an existing company with the same name. Reject with `ADDRESS_EXISTS` before creating anything: `field` is `billingAddress` or `shippingAddress` for addresses, and `companyName` for a duplicate company name (message: "An account with this company name already exists. Please contact customer service."). If the BC search itself fails, the check is skipped.
4. Create the B2B company, with the registrant as company Admin. BC creates the customer as part of this call, and no creation email is sent. `existingCustomer` is stored in the company extra field `IsAlreadyCustomer` for the Crown team to follow up.
5. Set the registrant's password. This step is fatal: on failure the company is deleted and the request returns an error.
6. Create **two** company addresses, even when `sameAsBilling` is true: billing (default billing) and shipping (default shipping).
7. Set the ShipperHQ customer-group attribute to "New Customer" (UPS Ground, LTL with lift gate and inside delivery, and Truckload shipping).
8. Restrict payment methods to `stripeupe`, `card` and `us_bank_account`.
9. Return `referenceId` (`"CC-" + BC company id`) and `status: "pending"`.

Steps 6 to 8 are non-fatal on the server: a failure is logged and the request still succeeds.

### 10.2 `POST /storefront/registration/validate-address/`

**Request**
```json
{
  "storeHash": "twftgtyvcg",
  "address": { "address1": "123 main st", "address2": "", "city": "springfield", "state": "IL", "postalCode": "62701", "country": "US" }
}
```
**Response `200`**
```json
{
  "status": "corrected",
  "suggested": { "address1": "123 MAIN ST", "address2": "", "city": "SPRINGFIELD", "state": "IL", "postalCode": "62701-1234", "country": "US" },
  "changes": ["Standardized to USPS format", "ZIP+4 added"]
}
```
`status` is one of `match`, `corrected` or `unverifiable`. The client only calls this endpoint for `country === "US"`.

### 10.3 Client stub signatures (`shared/service/vs/api/registration.ts`)
```ts
export function registerBusinessAccount(payload: RegistrationRequest): Promise<RegistrationResponse>;
// RegistrationAddress has no stateName; RegistrationSubmissionAddress adds a required stateName
export function validateAddress(address: RegistrationAddress): Promise<AddressValidationResult>;
export class VSApiError extends Error {
  status: number;
  errors: { field?: string; code: string; message: string }[];
}
```

### 10.4 Existing endpoints reused
- `getB2BCountries()`: `shared/service/b2b/graphql/register.ts:229` (B2B GraphQL)
- `checkUserEmail({ email, channelId })`: `shared/service/b2b/graphql/users.ts:59` (B2B GraphQL)

---

## 11. Success Criteria

**The MVP is done when** `/register` serves the Crown form, a valid application produces the correct payload for the stub endpoint and shows the confirmation, and every existing test (including the untouched stock `Registered` and `RegisteredBCToB2B` suites) still passes.

### Functional requirements
- ✅ The form matches `docs/screenshots/registration-same-as-billing.png` and `registration-separate-shipping.png` at 1440px
- ✅ Every validation rule in §7.6 fires on blur and on submit, with the exact message text
- ✅ The summary banner shows at most three errors plus "+N more"
- ✅ Changing the country resets the region and swaps the postal rules for both addresses
- ✅ A duplicate email shows an inline error before submit
- ✅ Submit stays disabled without a Turnstile token and after the token expires
- ✅ A `corrected` USPS response opens the modal (matching `registration-address-validation-modal.png`). Both choices behave as specified.
- ✅ If the validate endpoint fails, the submit still goes through
- ✅ The request body matches §10.1 exactly, including the `sameAsBilling: true` shorthand
- ✅ 4xx field errors map to inline errors, and Turnstile resets after any failure
- ✅ The confirmation shows the email, company, contact and `referenceId`. "Submit another account" resets everything.
- ✅ The Login "Create account" button, `openPage('REGISTER_ACCOUNT')` and `login.php?action=create_account` all open the new page
- ✅ `registerEnabled = false` redirects to `/login`

### Quality indicators
- ✅ `yarn lint` (eslint with zero warnings, depcruise, knip) and `tsc --noEmit` pass
- ✅ The new page and service modules are covered by tests; every rule in `schema.ts` has a unit test
- ✅ No changes under `src/pages/Registered/`; the upstream diff is limited to the files in §6.4
- ✅ Accessibility: each input has a label; errors are linked with `aria-describedby`; the modal traps focus and closes on Esc; everything works with the keyboard alone

### User experience goals
- A typical applicant finishes in under three minutes.
- No horizontal scrolling at 375px; the section title stacks above the fields below 720px.
- Crown's review queue has little or no bot spam and fewer returned-mail or bad-address problems.

---

## 12. Implementation Phases

### Phase 1: Foundations (≈1–1.5 days)
**Goal:** a service layer and form primitives that can be tested.
- ✅ `request/anonymousFetch.ts` and `VSApiError`, with tests
- ✅ `api/registration.ts` stub and types, and exports from `vs/index.ts` (the Turnstile site key is read from `window.B3.setting` since Phase 3)
- ✅ Add `@hookform/resolvers`
- ✅ `schema.ts` and `schema.test.ts` (the full validation matrix)
- ✅ `tokens.ts`, `styled.ts`, and `CrownTextField`, `CrownSelect`, `CrownCheckbox`, `FormSection`, `ErrorSummary`

**Validation:** the unit tests pass. A request with no Authorization header works, and a 4xx response becomes a `VSApiError`.

### Phase 2: Form and page (≈2 days)
**Goal:** a complete form at `/register`, without the external checks.
- ✅ `pages/CrownRegistration/index.tsx` (guard, shell, logo, `useTypekitFonts`)
- ✅ `RegistrationForm` with all four sections, `AddressFields`, `useRegions`, `useEmailPrecheck`
- ✅ Submit through `registerBusinessAccount` (msw-mocked) and `RegistrationConfirmation`
- ✅ `stateName`: `useRegions` returns `{ stateCode, stateName }`. `useRegistrationSubmit` resolves the name from the country and state code when building `billingAddress` and a separate `shippingAddress`. If a code has no match, submit fails on that field instead of sending an empty name.
- ✅ Server error mapping: `field` → form field, including `billingAddress` → `bAddress1`, `shippingAddress` → `sAddress1` (billing only when `sameAsBilling`). Every other server field name already matches a form field. Unknown fields go to the summary banner. `ADDRESS_EXISTS` shows the server `message` as-is, and is also returned on `companyName` for a duplicate company name. Any error code that names a known form field and has a message is shown inline on that field.
- ✅ `en.json` keys, the route swap, and the Login button change
- ✅ `index.test.tsx`: guard, defaults, validation, country switching, shipping toggle, payload, errors, confirmation

**Validation:** in `yarn dev`, the form visually matches the screenshots at 1440px and 375px, and the stock `Registered` tests pass unchanged.

### Phase 3: Turnstile and USPS (≈1.5 days)
**Goal:** bot protection and the address-verification flow.
- ✅ `loadTurnstile.ts` and `Turnstile.tsx` (iframe injection, token lifecycle, reset, fail-closed on a missing key), built as Plan A
- ✅ `validateAddress` integration (`useAddressVerification`, `addressVerification.ts`), `AddressVerificationDialog`, and submit that walks through each address in turn
- ✅ Tests: token gating, reset after failure, modal choices, validate endpoint down, remembered decisions
- ✅ Spike: Turnstile renders and issues a real token inside the ThemeFrame iframe (local dev, real key; `hostname` = `localhost`, `action` = `registration`)
- ⏳ Not yet done: the full manual key matrix in `docs/turnstile-manual-testing.md` (rows 2-3 and 5-7 need the VS API). Unit and page tests mock the widget.

**Validation:** the Turnstile test key renders and issues a token inside the ThemeFrame iframe (confirmed). The modal works with the keyboard and screen readers.

### Phase 4: Hardening and integration (≈1 day, plus backend dependency)
**Goal:** production readiness.
- ✅ `yarn lint`, knip adjustments, `tsc`
- ✅ Accessibility pass; check the CSP and Typekit allowlist on staging
- ✅ Connect to the real VS staging endpoints once they exist, and run an end-to-end application on `crowntest`
- ✅ Put in the real Turnstile keys and the final placeholder copy and URLs

- ✅ End-to-end checks from the backend plan: duplicate address (`ADDRESS_EXISTS`), duplicate email (`EMAIL_EXISTS`), `IsAlreadyCustomer` set, two addresses created for `sameAsBilling`

**Validation:** an end-to-end application on staging creates the B2B company (with its customer) and two addresses, and puts the customer in the New Customer group.

**Estimated total:** about 5.5–6 developer-days for the client work. Phase 4's end-to-end step waits on the VS backend.

---

## 13. Future Considerations
- **Tax exemption section:** tax ID, exempt state or province, and certificate upload, once the Vertex integration is decided. The design already exists in `docs/registration.md`.
- **"Already a customer?" behavior:** an account-number field, JDE lookup, or routing to sales.
- **Canadian address validation:** Canada Post or another provider.
- **Tax certificates elsewhere:** submitted from the customer portal account area and at checkout, per Crown's requirements.
- **Automatic promotion:** move customers from "New Customer" to full access (and possibly from Admin to Sr. Buyer) after JDE setup.
- **Restyle `RegisteredBCToB2B`** to match, if Crown uses that path.
- **Share the Crown field components** with the Login and Forgot Password pages for a consistent look.
- **Analytics:** track completion and drop-off per section.

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The VS endpoints aren't ready or drift from the contract | Blocks end-to-end testing and release | This PRD fixes the contract (§10). The client is built and tested against msw mocks. The route swap ships only once the backend is live, and reverting it is one line. |
| Turnstile doesn't render or call back inside the ThemeFrame iframe | Nobody can submit | Load the script into the iframe document and call `render` directly. If that fails, use the proven reCAPTCHA `postMessage` bridge pattern (`frameCaptchaCode.js`). Check early in Phase 3 with the test key. |
| CSP or Typekit allowlist blocks the scripts or fonts on production domains | Widget missing (can't submit) or fallback fonts | Deployment checklist in §9. Confirm on staging during Phase 4. If Turnstile fails to load, Submit stays disabled and a clear message is shown. |
| An upstream merge touches the route file or `en.json` | Small merge conflicts | The edits are a single line or a single block with `// Crown:` markers. Stock `Registered` code is never modified. |
| USPS proxy slow or unavailable | Submit delayed or blocked | Short client timeout. On error, continue without validation and log it. The server can re-check later. |
| Anonymous endpoints abused | Spam accounts, higher USPS costs | Turnstile on register; Cloudflare rate limiting and a CORS allowlist on both endpoints; the server re-validates everything. |

---

## 15. Appendix

### Related documents
- `docs/registration.md`: the design handoff (tokens, copy, behavior)
- `docs/Crown B2B Registration.dc.html` and `docs/support.js`: interactive prototype
- `docs/screenshots/`: reference images for default, separate-shipping and modal states
- `New Customer - Auto Registration requirements.docx`: Crown's business requirements
- `New Customer - Sign In - Sign Up page.docx`: Crown's changes to the sign-in and sign-up pages
- `AGENTS.md`: codebase conventions (Matroska layout, testing, import rules)
- Implementation plan: `~/.claude/plans/we-are-going-to-polished-haven.md`

### Existing code referenced
| Purpose | Location |
|---|---|
| Route table | `src/shared/routes/index.tsx:40, 83-88` |
| Stock registration (not modified) | `src/pages/Registered/` |
| VS request layer | `src/shared/service/vs/request/{base,vsFetch,fetch,jwt}.ts` |
| Example anonymous VS call | `src/shared/service/vs/api/product.ts` |
| Countries | `src/shared/service/b2b/graphql/register.ts:229`, `src/hooks/useGetCountry.ts` |
| Email check | `src/shared/service/b2b/graphql/users.ts:59` |
| Iframe script injection pattern | `src/components/captcha/Captcha.tsx`, `frameCaptchaCode.js` |
| Double-submit guard pattern | `src/pages/ForgotPassword/index.tsx` |
| Test utilities | `apps/storefront/tests/test-utils.tsx`, `tests/mockServer.ts` |

### Key external references
- Cloudflare Turnstile client rendering: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
- Turnstile server validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Turnstile testing keys: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
- `@hookform/resolvers`: https://github.com/react-hook-form/resolvers

### Open items (need owner decisions)
1. Turnstile site keys for staging and production.
2. Intro paragraph and Submit rail copy; Privacy Policy and Terms of Access URLs.
3. USPS API choice and credentials (VS backend).
4. Registrant role: Admin or Sr. Buyer, and the process for leaving the "New Customer" group.
5. Whether Catalyst storefronts need an `on-registered` callback after submit.
6. ~~The `referenceId` format~~ Settled: `"CC-" + BC company id`.
7. ~~Privacy field name and `ADDRESS_EXISTS` message text~~ Settled: `privacyAcknowledged`, and the server message is shown as-is.
8. ~~Approval email~~ Settled: assume the registration process emails the customer in some form, so the §7.9 confirmation copy ("we email you…") stays as written. The VS API itself sends no BC creation email; the exact mechanism is Crown's to decide.
