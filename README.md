# Browser JS Dumper

**This is a work in progress!**

**Live Tool:** [https://redrrx.github.io/browser-js-dumper/](https://redrrx.github.io/browser-js-dumper/)

A specialized tool to dump and diff the entire JavaScript global scope. Built for reverse engineers and anti-detect developers who need to see exactly what a browser is showing to the web.

---

### Why use this?

- **Spot Anti-Bot Triggers**: Instantly find "red flags" (like `navigator.webdriver`, `cdc_` strings, or CDP artifacts) that trigger Cloudflare, DataDome, or Akamai.
- **Diff Environments**: Export a JSON snapshot of a "clean" vanilla Chrome environment and import it into your custom "stealth" build to find discrepancies in the global surface.
- **Leak Hunting**: See every property, prototype, and object injected by extensions, automation frameworks, or custom browsers.
- **Offline Analysis**: Capture a snapshot from a protected environment and analyze the object tree locally without staying connected to the target.

### Quick Workflow

1. **Dump** your current environment.
2. **Export** the JSON (or **⤓ Dump All** to download env + any analyses in one file).
3. **Import** it later (or on a different browser) to compare object structures and identify unique fingerprints.

---

### API / Headless automation

The tool exposes a programmatic API on `window.BJSD` so you can drive the full battery (global-scope scan, CSS probe, GPU + timing analyses) from Puppeteer / Playwright / CDP without scraping the DOM.

| Call                                                      | Returns                                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `await BJSD.scan()`                                       | runs the scan (window + activators + CSS probe) → `{ browser, count }`                                     |
| `BJSD.query({ category, search, types, page, pageSize })` | paginated results → `{ total, pages, page, entries: [{ path, type, display }] }` (`pageSize` default 1000) |
| `BJSD.categories()`                                       | `[{ category, count }]`                                                                                    |
| `BJSD.env()`                                              | full scan as JSON (same shape as the Export file)                                                          |
| `await BJSD.runGPU()` / `await BJSD.runTiming()`          | analysis battery → JSON                                                                                    |
| `await BJSD.runAll()`                                     | scan + GPU + timing                                                                                        |
| `await BJSD.dumpAll()`                                    | everything in one object → `{ env, gpu, timing }`                                                          |
| `BJSD.download('env' \| 'gpu' \| 'timing' \| 'all')`      | triggers a file download                                                                                   |
| `BJSD.help()`                                             | self-documented method list                                                                                |

**Auto-run for fully-headless boot** — append `?api=scan` (or `gpu`, `timing`, `all`) to the URL; the page runs that battery on load and resolves `window.__bjsdReady`:

```js
await page.goto('file:///path/to/index.html?api=all');
await page.evaluate(() => window.__bjsdReady);

// paginate the scan
let page0 = await page.evaluate(() => BJSD.query({ page: 0, pageSize: 5000 }));
// or grab everything at once
const dump = await page.evaluate(() => BJSD.dumpAll());
```

Results paginate over the scan (tens of thousands of entries); analysis results are returned whole. Works from `file://` and over HTTP.

---

### Known Issues

- **Firefox (No DRM)**: requires installation to be finished for the dumper to initialize.
- **Type Mismatch**: Few inconsistencies between specific browser values during serialization on some environments.

### Tested On

- **Chromium-based** (Chrome, Brave, Edge, etc.)
- **Firefox**

---

### Development

```bash
npm ci
npm run dev
npm run build
```
