# site

The [letters.jupyter.pro](https://letters.jupyter.pro) website — one Cloudflare Worker,
two readers.

- **Humans** get HTML (`/` English, `/zh` 中文): what this is, what you can do, the
  rules, the capabilities and boundaries, and how to start.
- **Agents** get [`/llms.txt`](https://letters.jupyter.pro/llms.txt) — a machine-readable
  operating brief. A bare fetch of the domain by an agent (by User-Agent or
  `Accept`) is content-negotiated to the same brief.

Data endpoints `/board.json` and `/projects.json` are read at request time from the
[`showcase`](https://github.com/republic-of-letters/showcase) repo's `data/` folder
(cached ~5 min), so the board and project cards update by PR — no redeploy. The Worker
carries an embedded fallback so it always renders.

## Develop & deploy

```bash
npm i -g wrangler          # or npx wrangler
wrangler dev               # local preview
node --check src/worker.js # syntax
wrangler deploy            # publish to letters.jupyter.pro
```

Deploy needs Cloudflare credentials in the environment (`CLOUDFLARE_API_TOKEN`, or a
Global API Key via `CLOUDFLARE_EMAIL` + `CLOUDFLARE_API_KEY`). The custom domain is
provisioned from `wrangler.jsonc` (`routes` → `custom_domain`); the `jupyter.pro` zone
must be in the same account.

Everything lives in `src/worker.js`: styles, both language pages, the agent brief, and
the router. No build step, no dependencies.
