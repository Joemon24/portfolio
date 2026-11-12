# Joemon Joy | AI Engineer

[Live portfolio](https://joemon24.github.io/portfolio/) · [Ask Ryu](https://joemon24.github.io/portfolio/#contact) · [Logly Simulation Lab](https://joemon24.github.io/Logly/lab.html)

A neo-brutalist portfolio with pixel typography, light and dark themes, a downloadable resume, project case studies, and an interactive Logly recovery replay.

## Preview

Run `npm ci` and `npm run dev`, then open `http://127.0.0.1:8765/`. To preview the static build, run `npm run build` and `npm run preview`. A prebuilt `dist/` directory can also be served with `python3 -m http.server 8765 --bind 127.0.0.1 --directory dist`.

## Ryu companion

Open Ryu from the hero, mobile header, Contact section, or floating sprite. Starter questions and local commands work in the local preview. The floating sprite hides when a quarter of the hero or Contact sprite is visible, or while chat is open or minimized. The hint appears after scrolling stops or after five seconds of first-visit idle, up to twice per session. Use **×** to hide the sprite and **Show Ryu** in the footer to restore it.

Append `?debug=1` to see visibility reasons, hint counts, scroll timing, and the companion’s storage values. The action trace is also available in this mode.

## Publish

Merge the release pull request into `main` to trigger **Deploy portfolio to GitHub Pages**. The workflow runs tests, builds the site, and publishes only `dist/`. When a release changes the Worker, deploy and smoke-test it before merging the Pages changes.

After connecting a custom domain, update the absolute `og:image` URL in `index.html` to point to it.

Geist is bundled under the SIL Open Font License. The name uses custom pixel lettering. See `components/REACT-BITS-LICENSE.txt` for the React Bits component license.

## Optional AI selector

Ryu is Joemon’s portfolio assistant. Its keyword matcher works without credentials. If configured, AI answers are on by default and visitors can turn them off in **Settings**. Submitted questions, including starter questions, go to Groq in this mode along with the reviewed public facts. The fact list includes selected details from the portfolio, GitHub profile, public LinkedIn profile, and bundled resume. Ryu only sends the curated fact list, with no live profile lookups or resume upload. Actions always run through the local action registry. The model returns fact IDs or an allowlisted action with validated arguments. The site renders facts from its own copy of [facts.json](facts.json) and links to their sources.

The Worker allows browser requests only from `https://joemon24.github.io`. It caps questions at 300 characters, uses a five-second deadline and applies a limit of 12 requests per minute per IP per Cloudflare location plus a shared UTC daily cap of 150 Groq requests. CORS is a browser restriction, so the rate limit also applies to direct requests. Provider outages and rate limits fall back to local commands. A refusal or invalid output displays “I’ll need to ask Boss about that” and offers the confirmed Copy email action. Copying an email address requires a separate click even if the model selects that action.

To enable the selector, authenticate Wrangler for the target Cloudflare account, then run these commands from the repo root:

```sh
npx wrangler secret put GROQ_API_KEY --config worker/wrangler.toml
npx wrangler deploy --config worker/wrangler.toml
```

Set the GitHub repository Actions **variable** `PORTFOLIO_AGENT_WORKER_URL` to the deployed HTTPS Worker URL ending in `/agent` and rebuild Pages. The browser build receives only the public URL. Keep the Groq key in the Worker secret. To turn the feature off, remove the Actions variable and rebuild.

`npm test` runs the offline contract and proxy checks. Run the [baseline questions](tests/questions.json) and the separate [held-out set](tests/held-out.json) before publishing eval results:

```sh
# Add GROQ_API_KEY to the ignored worker/.env, then test without deploying.
node --env-file=worker/.env tests/evaluate.js --groq

# Or use a key already set in your shell.
npm run eval -- --groq

# End-to-end against the deployed Worker. Requests are paced below its per-IP limit.
npm run eval -- --worker https://YOUR_WORKER.workers.dev/agent
npm run eval -- --worker https://YOUR_WORKER.workers.dev/agent --held-out
```

The live evaluator reports semantic pass rate, request errors and p50/p95 latency. It pauses 20 seconds between requests to leave room under free-tier token limits. The baseline run takes about 17 minutes. The localhost preview intentionally cannot call the deployed Worker directly because of the production-only origin policy.

### Facts to confirm

- **TODO:** Confirm the CoCreate Ventures internship start date and whether it is ongoing. The fact file includes the title and employer but omits the dates shown on the page pending confirmation.
- **TODO:** Provide publishable Pingo details if you want the assistant to answer questions about it. The page currently only marks it as in progress.
- **TODO:** Supply public evidence before adding unlisted skills, certifications, compensation preferences, or project metrics. The selector currently refuses those questions.
