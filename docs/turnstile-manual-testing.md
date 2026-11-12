# Turnstile manual testing

The Turnstile widget cannot be exercised by unit tests (they mock it), so run this matrix by hand.

## Changing the site key

The site key is read from `window.B3.setting.turnstileSiteKey` and nowhere else.

- **On the real site:** edit the BigCommerce theme setting that holds the Turnstile site key. The Script Manager snippet copies it into `window.B3.setting.turnstileSiteKey` before the app loads. Use a scratch theme for experiments.
- **Locally:** edit `turnstileSiteKey` in the `window.B3.setting` block of `apps/storefront/index.html` and reload `yarn dev`.
- Changing it from the browser console does **not** work: `window.B3` is defined before the app loads, and the widget reads it on mount.

## Pairing site key and secret

Cloudflare's test secrets accept only the dummy token `XXXX.DUMMY.TOKEN.XXXX`, and real secrets reject it. **Always change the site key (client) and the VS API secret (server) together.**

| # | Site key (client) | VS API secret (server) | Expected |
|---|---|---|---|
| 0 | empty / unset | any | No widget. "Verification is not available right now" message. Submit stays disabled. An error is logged. |
| 1 | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` | Widget passes; submit succeeds |
| 2 | `1x00000000000000000000AA` | `2x0000000000000000000000000000000AA` | `TURNSTILE_FAILED` banner; widget resets; token cleared so Submit disables until a new token arrives |
| 3 | `1x00000000000000000000AA` | `3x0000000000000000000000000000000AA` | Same banner (server reports `timeout-or-duplicate`); log the reason server-side |
| 4 | `2x00000000000000000000AB` | any | Widget shows its error; no token; Submit stays disabled; widget error text appears |
| 5 | `3x00000000000000000000FF` | `1x0000000000000000000000000000000AA` | Interactive challenge renders inside the card at 375px and 1440px; Submit enables only after solving |
| 6 | real site key | real secret | Real token accepted; the server sees `action == "registration"` and the expected `hostname` (record it) |
| 7 | real site key | real secret, token replayed | Second use of the same token is rejected (single use) |

Rows 1-5 run on `yarn dev` (local VS API configured with the matching test secret). Rows 6-7 need the real VS API and real keys (Phase 4).

## Other checks

- **Script blocked:** block `challenges.cloudflare.com` in devtools (request blocking). Expect the load-error message and a working "Try again" button.
- **Auto-refresh:** leave the widget idle for 5+ minutes. Expect a new token (Submit stays enabled).
- **Width:** run rows 1-5 at 375px as well as 1440px. No horizontal scroll; the 300px widget fits.
- **USPS flow:** enter `123 main st, springfield IL 62701`. Confirm the "Verify your address" modal against `docs/screenshots/registration-address-validation-modal.png`, and that Esc, the close button and "Edit address" all return to the form without submitting.

## Notes for the VS API owner

- With test keys, `siteverify` returns `hostname: "example.com"` and **no `action`**, so the `action` and `hostname` checks must be relaxed (or bypassed) in test environments. Only row 6 exercises them.
- The widget passes `action: "registration"`; the payload has no extra field.
- The spike (real key, local dev server) showed `siteverify` returns `hostname: "localhost"` and `action: "registration"` for the portal's `about:blank` iframe, i.e. the page's own hostname. Allowlist the storefront domains (and `localhost` for dev), and confirm the hostname on a deployed domain via row 6.
