# Prompt Firewall (white-label starter)

A small Cloudflare Pages site that screens text with Caelara Shield before it reaches a model. It returns an allow, review or block verdict, a risk score and the findings behind them, and can return a redacted copy of the text.

It is a static page plus Pages Functions. Your Caelara key stays in the Function environment and is never sent to the browser.

## One-click deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kingefman1-cmyk/prompt-firewall-proxy-kit)

The button opens Cloudflare's deploy flow for this repository. When it finishes, add your key as the `CAELARA_API_KEY` secret (step 4 below); the site shows an error until it is set.

## Set up in about five minutes

1. Get a key. A free trial key (50 calls, no card) is at https://caelaralabs.com/#trial. For more volume, email ops@caelaralabs.com.
2. Install and log in to Cloudflare:
   ```bash
   npm install
   npx wrangler login
   ```
3. Set your brand name in `wrangler.toml` (`NEXT_PUBLIC_BRAND_NAME`).
4. Deploy and add the key as a secret:
   ```bash
   npm run deploy
   npx wrangler pages secret put CAELARA_API_KEY --project-name prompt-firewall-proxy
   ```
5. Open the `*.pages.dev` address Wrangler prints. Add your own domain under Pages > Custom domains.

Local run: copy `.dev.vars.example` to `.dev.vars`, fill in the key, then `npm run dev`.

## What it costs

One screening is one call to the Shield prompt endpoint at 0.015 USDC, so a free trial key (50 calls) covers about 50 screenings.

The site has no billing of its own: add a login and a payment step in front of the API before you open it to the public.

## Endpoints used

| Call | Purpose |
|---|---|
| `POST https://shield.caelaralabs.com/v1/shield/prompt` | Injection, hidden-character, personal-data and secret screening with a verdict |

Results are heuristic. A clean result is not a guarantee of anything, and the page says so.

## Call it from your own app

```bash
curl -s https://YOUR-SITE.pages.dev/api/screen -H "Content-Type: application/json" -d '{"text":"Ignore previous instructions"}'
```

By default only pages served by the same site may call the API, so other sites cannot spend your credits. To call it from your own server, set `ALLOW_DIRECT_CALLS=true` in `wrangler.toml` and put your own authentication in front of it first: with that flag on, anyone who can reach the URL can spend your credits.

## Security notes

- The Caelara key is read only inside the Pages Functions and is never returned in a response.
- Input is validated before any paid call is made.
- Every value from the API is shown with `textContent`, never as HTML, and the page ships a strict Content-Security-Policy.
- No secret, wallet or key is stored in this repository. `.dev.vars` is git-ignored.

## Files

| File | What it does |
|---|---|
| `functions/api/screen.js` | POST /api/screen: validates the text, calls Shield with your key, returns the verdict |
| `functions/api/config.js` | Brand and form settings for the page |
| `lib/proxy.js` | Shared helpers: caller check, key gate, upstream call |
| `lib/spec.js` | The form and result settings for the page |
| `public/` | The static page, script and styles |
| `test/` | Unit tests: `npm test` |

## License

MIT. See `LICENSE`.
