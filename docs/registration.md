# Handoff: Crown B2B Business Account Registration

## Overview
A single-page, business-only registration form for Crown Packaging's fork of the BigCommerce B2B Buyer Portal (`vividsites/crown-b2b-buyer-portal`). It replaces the stock multi-step flow in `apps/storefront/src/pages/Registered/` (`index.tsx`, `RegisteredAccount.tsx`, `RegisteredDetail.tsx`, `RegisteredStep.tsx`, `config.ts`, `styled.ts`). The goals:
- Use the space available on large screens.
- Remove redundancy: email is asked once, and there's no account-type choice.
- Collect billing **and** shipping addresses in one pass.

## About the design files
`Crown B2B Registration.dc.html` is a **design reference built in HTML**. It's a working prototype that shows the intended look and behavior. It is not production code. Rebuild it inside the existing Buyer Portal codebase using the patterns already there: React + TypeScript, MUI theme (`theme.tsx`), existing form/field helpers, i18n (`b3Lang`), and the existing registration API calls. Where this README and the codebase conflict on mechanics, follow the codebase. Where they conflict on visuals, follow this README.

To view the prototype, open the HTML file in a browser (with `support.js` in the same folder). Fonts only load on allow-listed domains, so locally they fall back to Arial.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy and validation rules are final, apart from the placeholder copy listed at the end. Match them exactly. Map them onto MUI theme overrides / `styled` components rather than inline styles.

---

## Screens / views

### 1. Registration form (`editing` state)

**Page**
- Background `#EDEDED`. Padding `32px 24px 64px`. A centered column with `gap: 20px`. Base text color `#15296E`.
- Everything is constrained to `max-width: 1180px; width: 100%`.

**Header row** (above the card)
- Flex, `space-between`, `align-items: flex-end`, wraps, `gap: 16px`.
- Left: Crown logo `<img>`, `height: 44px`, auto width.
- Right: "Already have an account? **Sign in**" at 14px, color `#5B6473`. "Sign in" is a link (see link styles) to the existing login route.

**Card**
- White background, `1px solid #D5D8DE` border, top border `3px solid #15296E`. No radius, no shadow.

**Card header**
- Padding `36px 40px 28px`, bottom border `1px solid #E4E6EA`. Content `max-width: 620px`.
- H1 "Business Account Registration": comp face, weight 600, 40px, line-height 1.05, letter-spacing 0.01em, margin-bottom 10px.
- Intro paragraph: 16px, line-height 1.5, color `#3F4650`. **Copy is placeholder** ("Content can go here").

**Error summary banner** (only after a failed submit)
- Wrapper padding `8px 40px 0`. Banner: `margin-top: 24px`, `1px solid #E41C40`, background `#FDEEF0`, padding `14px 18px`, flex, `gap: 12px`.
- "CHECK" label: cond face, weight 700, 15px, 0.1em tracking, uppercase, color `#C1152F`.
- Message: 15px, color `#3F4650`. Shows the first 3 field errors joined by " · ", then " · +N more" if there are more.

**Sections**
- Body padding `28px 40px 40px`. Five sections, numbered 01–05; they become 01–04 when tax exemption is hidden.
- Each section is a grid: `grid-template-columns: minmax(150px, 240px) minmax(0, 1fr)`, `gap: 8px 40px`, padding `24px 0`, bottom border `1px solid #E4E6EA`. The last section has no border.
- **Left rail**
  - H2: comp face, weight 600, `font-size: clamp(16px, calc(8px + 0.85vw), 24px)`, 0.04em tracking, uppercase, `white-space: nowrap`, margin-bottom 6px. Format: "01 — Your details" (em dash with spaces).
  - Description: 14px, line-height 1.45, color `#5B6473`.
- **Right column field grid**: `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`, `gap: 18px 20px`. This gives 3 columns at full width and collapses naturally.
- **Mobile**: stack the rail above the fields (single column) below roughly 720px. The prototype relies on the minmax widths; add an explicit breakpoint in the implementation.

**Field anatomy** (every text input and select)
- Wrapping `<label>`: flex column, `gap: 6px`.
- Label: 11px, weight 600, 0.12em tracking, uppercase, color `#5B6473`. Required fields end with " *".
- Control:
  - `padding: 12px`, 16px, color `#15296E`, background `#F4F5F7`.
  - Border `1px solid transparent` with bottom border `2px solid #BFC6CD`, radius `4px 4px 0 0`.
  - Selects use `appearance: none`. **Add a chevron** in the implementation; the prototype has none.
- **Focus**: no outline, bottom border `#E41C40`, background `#FFFFFF`.
- Error text below the control: 12.5px, color `#C1152F`.
- Hint text below the control: 12.5px, color `#5B6473`. Hidden while an error is showing.

**Boxed checkbox row** (used for "same as billing" and "tax exempt")
- Flex, `gap: 12px`, background `#F4F5F7`, `1px solid #E4E6EA`, padding `14px 16px`.
- Checkbox 20×20 with `accent-color: #E41C40`. Label 16px, color `#15296E`.

#### 01 — Your details
Rail copy: "The person who will administer the company account."

Fields, in order:

| Field | Name | Type / autocomplete | Required | Notes |
|---|---|---|---|---|
| Already a customer? | `existingCustomer` | Checkbox, **unboxed**, full-width row (`grid-column: 1 / -1`) | No | Label 16px `#15296E`. Default unchecked. Only captured in the payload for now; it has no UI behavior. |
| Company name | `companyName` | `organization` | Yes | |
| First name | `firstName` | `given-name` | Yes | |
| Last name | `lastName` | `family-name` | Yes | |
| Email | `email` | `email` | Yes | Hint: "Used to sign in once approved" |
| Password | `password` | `password` / `new-password` | Yes | Hint: "At least 8 characters, with a letter and a number" |
| Confirm password | `confirmPassword` | `password` / `new-password` | Yes | |
| Phone | `phone` | `tel` / `tel`, placeholder "(555) 555-0100" | Yes | |

#### 02 — Billing address
Rail copy: "Where invoices and statements are sent."

| Field | Name | Required | Notes |
|---|---|---|---|
| Street address | `bAddress1` | Yes | Full row |
| Suite, dock, floor | `bAddress2` | No | Full row |
| City | `bCity` | Yes | |
| Country | `bCountry` | Yes | Select: United States (`US`, default) or Canada (`CA`) |
| State / Province | `bState` | Yes | Select. Prompt "Select state" or "Select province" |
| ZIP code / Postal code | `bZip` | Yes | `inputmode="numeric"` (use `text` for CA) |

#### 03 — Shipping address
Rail copy: "You can add more ship-to locations after approval."
- Boxed checkbox: "Shipping address is the same as billing". **Checked by default.**
- When unchecked, the shipping fields appear below it (flex column, `gap: 18px`): `sAddress1`, `sAddress2`, `sCity`, `sCountry`, `sState`, `sZip`. Same layout and rules as billing.

#### 04 — Tax exemption (feature flag `showTaxExemption`, default on)
Rail copy: "Optional."
- Boxed checkbox: "We hold a resale or tax-exemption certificate". Unchecked by default.
- When checked, show:
  - **Tax ID** (`taxId`): label and placeholder depend on the *billing* country (see the country table).
  - **Exempt in state / province** (`taxState`): select, uses the billing country's region list.
  - **Certificate upload**, full row:
    - Dashed `2px #BFC6CD` border, background `#FAFBFC`, padding 20px. Hover border `#E41C40`.
    - Contains a navy "CHOOSE FILE" pill (padding `11px 20px`, background `#15296E`, white text, comp 600, 14px, 0.12em, uppercase).
    - Next to it, 15px `#3F4650` text: the chosen file name, or "PDF or image, up to 10 MB".
    - Accepts `.pdf, .jpg, .jpeg, .png`.

#### 05 — Submit
Rail copy is **placeholder** ("Content can go here...").
- Checkbox, aligned to the top, 15px, line-height 1.5, `#3F4650`: "I acknowledge that I have read and understand the Crown Packaging Corporation **Privacy Policy**." Privacy Policy is a link.
  - The prototype defaults this to checked and stores it as `marketing` / `marketingOptIn`. **Recommend:** make it required, unchecked by default, and rename it to `privacyAcknowledged`. Confirm with the product owner.
- Primary button "SUBMIT APPLICATION":
  - Padding `16px 34px`, background `#E41C40`, hover `#C1152F`, white text, no border.
  - Comp face, weight 700, 17px, 0.14em tracking, uppercase.
  - While submitting: label changes to "Submitting…" and the button is disabled.

**Footer** (below the card): 13.5px, `#5B6473`: "Need help with an application? Email **CrownCommerceSupport@crownpack.com**". The address is a `mailto:` link.

### 2. Confirmation (`submitted` state)
This replaces the card contents. Padding `64px 48px`, flex column, `gap: 18px`, `max-width: 720px`.
- Eyebrow "APPLICATION RECEIVED": cond face, 600, 13px, 0.18em tracking, uppercase, `#E41C40`.
- H1 "Your account is pending approval": comp face, 600, 40px, line-height 1.1.
- Body, 17px, line-height 1.55, `#3F4650`: "Our trade team reviews new business accounts within one business day. Once approved, we email **{email}** confirmation and you can sign in with the password you set below." (The email is bold navy.)
  - *Copy note:* "below" should read "during registration". Fix this in the implementation.
- Summary box:
  - `1px solid #D5D8DE`, background `#F4F5F7`, padding `18px 20px`.
  - Grid `repeat(auto-fit, minmax(200px, 1fr))`, `gap: 18px 28px`.
  - Three items: Company / Primary contact / Reference. Each has an 11px uppercase `#5B6473` label over a 15px navy value.
  - Reference should come from the API response; the prototype fakes it as `CC-XXXXXX`.
- Actions:
  - "BROWSE THE CATALOG" (navy fill `#15296E`, hover `#000000`).
  - "SUBMIT ANOTHER ACCOUNT" (transparent, `1px solid #BFC6CD`, hover border navy).
  - Both: padding `13px 26px`, comp 600, 15px, 0.12em, uppercase.

### 3. USPS address verification modal
It's triggered by the USPS address validation response. **The validation logic is out of scope for the design.** Intended flow: on submit, validate the billing address (and the shipping address when separate). If USPS returns a standardized address that differs from the input, open this modal once per differing address before sending the payload.
- Overlay: fixed, `rgba(13, 20, 45, 0.55)`, centered, padding 24px, z-index above the portal chrome.
- Dialog:
  - `role="dialog"`, `aria-modal`, `max-width: 620px`, white.
  - Top border `4px solid #15296E`, shadow `0 24px 60px rgba(13, 20, 45, 0.28)`.
  - Scrolls internally when it doesn't fit.
- Header (padding `26px 30px 0`):
  - H2 "VERIFY YOUR ADDRESS": comp face, 600, 30px, line-height 1.1, 0.02em tracking, uppercase, navy.
  - Close button: 34×34, `1px solid #D5D8DE`, radius 4px, "×" at 18px `#5B6473`. Hover: navy border and glyph.
- Two radio cards (padding `22px 30px 0`, `gap: 12px`). Each card:
  - Grid `22px 1fr`, `gap: 14px`, padding `16px 18px`.
  - **Selected**: border `2px solid #15296E`, background `#F2F4FA`.
  - **Unselected**: border `2px solid #D5D8DE`, background `#FFFFFF`.
  - Radio 17×17, `accent-color: #15296E`.
  1. **USPS recommended** (selected by default)
     - Label: 11px, 600, 0.12em, uppercase, navy.
     - Two address lines, 15.5px, line-height 1.55, navy. These show the USPS-standardized uppercase address with ZIP+4.
     - Note, 13px `#5B6473`: "Standardized to USPS format, ZIP+4 added." Should reflect what USPS actually changed.
  2. **What you entered**
     - Label in `#5B6473`.
     - Address lines as the user entered them, color `#3F4650`.
- Actions (right-aligned, padding `24px 30px 28px`, `gap: 12px`):
  - "EDIT ADDRESS": secondary. White background, `2px solid #15296E`, navy text. Hover: navy fill, white text. Closes the modal and focuses the relevant address section.
  - "USE THIS ADDRESS": primary red. Writes the chosen address into form state, then continues the submit.
  - Both: comp 600, 16px, 0.06em, uppercase, padding `13px 22px` / `13px 26px`.
- Esc and the close button behave like "Edit address". Trap focus inside the dialog.

---

## Interactions & behavior

**Validation timing**
- Validate a field on blur.
- Clear that field's error as soon as the user edits it.
- On submit, validate everything. If anything fails, show the summary banner and the inline errors, and don't submit.

**Rules**
- Required fields show "{Label} is required". Labels come from this map (country-aware where noted): First name, Last name, Work email, Direct phone, Password, Password confirmation, Company name, Billing street address, Billing city, Billing state/province, Billing ZIP/postal code, Shipping street address, Shipping city, Shipping state/province, Shipping ZIP/postal code, Tax ID, Exempt state/province.
- Email: must match `/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i`, else "Enter a valid email address". Reject `@(gmail|yahoo|hotmail|outlook|aol).` with "Use a company email address".
- Phone: fewer than 10 digits gives "Enter a 10-digit phone number".
- Password: fewer than 8 characters gives "Use at least 8 characters". Missing a letter or a digit gives "Include at least one letter and one number". Align with BigCommerce's customer password policy if it's stricter.
- Confirm password: must equal the password, else "Passwords do not match".
- ZIP / postal code:
  - US: `/^\d{5}(-\d{4})?$/`, "Enter a 5-digit ZIP code".
  - CA: `/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/`, "Enter a postal code like K1A 0B1".
- Tax ID:
  - US: `/^\d{2}-?\d{7}$/`, "Enter a 9-digit Tax ID (12-3456789)".
  - CA: `/^\d{9}([A-Za-z]{2}\d{4})?$/` after stripping spaces, "Enter a 9-digit business number".

**Country switching**
- Changing billing country clears `bState` and `taxState`, and clears the errors on `bState`, `bZip`, `taxState` and `taxId`.
- Changing shipping country clears `sState` and the errors on `sState` and `sZip`.

**Country table**

| | US | CA |
|---|---|---|
| Region label | State * | Province * |
| Region prompt | Select state | Select province |
| Region list | 50 states + DC | 13 provinces/territories |
| Postal label | ZIP code * | Postal code * |
| Tax ID label | Tax ID / EIN * | Business number (BN) * |
| Tax ID placeholder | 12-3456789 | 123456789 RT0001 |
| Tax region label | Exempt in state * | Exempt in province * |

The full region lists are in the prototype's script (`US_STATES`, `CA_PROVINCES`). The portal may already expose country and state data from BigCommerce (`getB2BCountries`); prefer that.

**Conditional requirements**
- Shipping fields are required only when "same as billing" is unchecked.
- Tax fields are required only when the flag is on and "tax exempt" is checked.

**Hover states**
- Links: `#E41C40`, hover `#C1152F` with underline.
- Buttons: as listed per component above.

No animations or transitions are specified.

## State
- `values`: every field listed above.
- `errors: Record<field, string>`.
- `sameAsBilling: boolean`: default `true`, configurable via `shippingSameByDefault`.
- `taxExempt: boolean`.
- `privacyAcknowledged: boolean`.
- `certificateFile: File | null`.
- `submitting` / `submitted`.
- Modal: `addrModal: { open, scope: 'billing' | 'shipping', suggested, entered, choice: 'suggested' | 'entered' }`.

**Feature flags / config:** `showTaxExemption` (default true), `shippingSameByDefault` (default true).

**Payload the prototype POSTs** to its stub `/api/b2b/registration`. Map this onto the portal's real registration calls (BC customer create + B2B company create, address creation, attachment upload).

```json
{
  "contact": { "firstName": "", "lastName": "", "email": "", "phone": "", "password": "", "existingCustomer": false },
  "company": { "name": "", "marketingOptIn": true },
  "billingAddress": { "address1": "", "address2": "", "city": "", "state": "", "postalCode": "", "country": "US" },
  "shippingAddress": { "sameAsBilling": true },
  "taxExemption": { "taxId": "", "state": "", "country": "US", "certificate": "filename.pdf" }
}
```

- When "same as billing" is unchecked, `shippingAddress` takes the same shape as `billingAddress`.
- `taxExemption` is `null` when the tax-exempt box isn't checked.
- On the BC side, "same as billing" should create one address flagged as both default billing and default shipping.

## Design tokens

**Colors**
| Token | Hex | Use |
|---|---|---|
| Navy | `#15296E` | Headings, body ink, secondary buttons, card top rule, selected borders |
| Red | `#E41C40` | Primary CTA, links, focus underline, checkbox accent, eyebrows |
| Red hover / error text | `#C1152F` | CTA hover, link hover, field errors |
| Error surface | `#FDEEF0` | Error banner background |
| Page ground | `#EDEDED` | Page background |
| Surface | `#FFFFFF` | Card, dialog |
| Field fill | `#F4F5F7` | Inputs, boxed checkbox rows, summary box |
| Upload fill | `#FAFBFC` | Upload drop area |
| Selected card fill | `#F2F4FA` | Modal selected option |
| Body text | `#3F4650` | Paragraphs |
| Muted text | `#5B6473` | Labels, hints, rail descriptions |
| Field underline | `#BFC6CD` | Input bottom border, dashed upload border |
| Border | `#D5D8DE` | Card border, unselected option |
| Divider | `#E4E6EA` | Section dividers, boxed-row border |
| Scrim | `rgba(13,20,45,0.55)` | Modal overlay |

**Typography** (Adobe Fonts kit `yss3osz`: `<link rel="stylesheet" href="https://use.typekit.net/yss3osz.css">`; the kit must be allow-listed for the storefront domains)
- `franklin-gothic-urw`: body, inputs, labels. Fallback: `'Franklin Gothic', Arial, sans-serif`.
- `franklin-gothic-urw-comp`: H1 (40px), section H2 (fluid clamp), modal H2 (30px), all buttons.
- `franklin-gothic-urw-cond`: eyebrows and the "CHECK" banner label.

**Type scale:** 11 (labels), 12.5 (hints/errors), 13 / 13.5, 14, 15, 15.5, 16 (inputs, body), 17, 30, 40 px.

**Spacing:**
- Card padding: 40px horizontal (40/36/28 vertical).
- Section padding: 24px vertical.
- Field grid gap: 18px rows × 20px columns.
- Label gap: 6px.

**Radii:** 0 everywhere, except input tops (`4px 4px 0 0`) and the modal close button (4px).

**Shadows:** the modal only (`0 24px 60px rgba(13,20,45,0.28)`).

## Assets
- `crown-logo.png`: Crown Packaging Corp. logo on a transparent background, displayed at 44px tall. Add it to the storefront's assets.

## Files in this bundle
- `Crown B2B Registration.dc.html`: the interactive prototype. Its template holds all markup and styles; the `<script data-dc-script>` block holds validation, state and the payload logic.
- `support.js`: the prototype runtime (only needed to open the HTML; don't port it).
- `crown-logo.png`
- `screenshots/`:
  - `registration-same-as-billing.png`: default state
  - `registration-separate-shipping.png`: shipping expanded
  - `registration-address-validation-modal.png`: modal open

## Open items / placeholder copy
- Card-header intro paragraph: placeholder.
- "05 — Submit" rail description: placeholder.
- Confirmation copy: "set below" should become "set during registration".
- Privacy checkbox: decide on required vs. optional and the default state.
- "Already a customer?": behavior is TBD (e.g. an account-number field or routing to sales). It's only captured for now.
- Select chevron and an explicit mobile breakpoint need adding.
- USPS integration: which endpoint, and whether it runs for Canadian addresses (USPS is US-only; skip it or use a different provider for CA).
