# Lookalike Scheme-Bypass — Mechanism PoC

Tests whether Chrome's **lookalike URL protection** (the “Did you mean google.com?” throttle) is
skipped for top-level navigations to **`blob:`** and **`filesystem:`** documents — a variant of
Chromium issue **422217920** (Luan Herrera). The throttle is gated on `SchemeIsHTTPOrHTTPS()` in
`lookalike_url_service.cc`, so any origin-inheriting non-HTTP scheme can bypass it.

> **Scope:** authorized security research / responsible disclosure only. Use **only domains you
> control**. The rendered page is intentionally neutral and must **not** be turned into a brand
> impersonation / phishing page. Report findings to the **Chrome VRP**.

## What it checks

1. **`blob:` bypass** — re-confirm the known technique (and test it on a *patched* build → incomplete-fix).
2. **`filesystem:` sibling** — the prime novel candidate: does the same gap apply to `filesystem:`?
   First question is whether top-nav to `filesystem:` is even permitted.
3. **Permission-prompt chain** — from the landed blob:/filesystem: page, open a Contact / Bluetooth /
   USB chooser and see whether the dialog shows the **lookalike origin** (the chooser uses
   `FormatOriginForSecurityDisplay`, which runs the IDN check but **not** the lookalike throttle).

## Files

| File | Where to host | Role |
|------|---------------|------|
| `index.html` | any benign domain (e.g. your `*.github.io`) | launcher / UI |
| `common.js`  | **both** origins | shared helpers + the neutral landed page |
| `frame.html` | **the lookalike domain** | builds the blob:/filesystem: URL, redirects top |

## Quick smoke test (no lookalike domain needed)

1. Put all three files in a GitHub repo, enable **Pages** → open `https://<you>.github.io/<repo>/`.
2. Section 1 → tap **Top-nav → blob:** and **→ filesystem:**.
3. Observe the URL bar format for each scheme, and whether `filesystem:` top-nav is allowed or blocked.
4. On the landed page, tap the chooser buttons to see the origin shown.

(No lookalike warning fires here because `github.io` isn't a lookalike — this only proves the plumbing.)

## Full bypass test (needs a lookalike domain you own)

1. Host `frame.html` + `common.js` on a **lookalike subdomain you control**, e.g.
   `accounts.g{ligature}ogle.<yourdomain>` (use a confusable/ligature that the omnibox IDN check
   does *not* punycode — that's what the throttle is meant to catch).
2. Open `index.html` on your benign domain → Section 2 → enter the lookalike origin → pick the scheme →
   **Embed sandboxed iframe**.
3. The top window should redirect to `blob:`/`filesystem:` `https://<lookalike>/…`.
4. **Bypass confirmed if:** the landed page renders with the lookalike domain in the URL bar and **no
   “Did you mean…” interstitial**.

## Evidence to capture for a report

- Screen recording of the redirect + URL bar (no warning).
- `chrome://version` (must be a **patched** build for a regression/variant claim).
- For the chain: screenshot of the chooser dialog showing the lookalike origin.
- Note which scheme (`blob:` vs `filesystem:`) and whether it reproduces after the 422217920 fix.

## Eligibility

`LookalikeUrlNavigationThrottle` is Chromium code → Edge/Brave inherit both bug and fix (not
Edge-unique, so **not** MSRC-eligible). This is a **Chrome VRP** target. Firefox uses a different
anti-spoofing model.
