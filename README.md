# Browser JS Dumper

**This is a work in progress!**

**Live Tool:** [https://redrrx.github.io/browser-js-dumper/](https://redrrx.github.io/browser-js-dumper/)

A specialized tool to dump and diff the entire JavaScript global scope. Built for reverse engineers and anti-detect developers who need to see exactly what a browser is showing to the web.

---

### Why use this?

* **Spot Anti-Bot Triggers**: Instantly find "red flags" (like `navigator.webdriver`, `cdc_` strings, or CDP artifacts) that trigger Cloudflare, DataDome, or Akamai.
* **Diff Environments**: Export a JSON snapshot of a "clean" vanilla Chrome environment and import it into your custom "stealth" build to find discrepancies in the global surface.
* **Leak Hunting**: See every property, prototype, and object injected by extensions, automation frameworks, or custom browsers.
* **Offline Analysis**: Capture a snapshot from a protected environment and analyze the object tree locally without staying connected to the target.

### Quick Workflow

1. **Dump** your current environment.
2. **Export** the JSON.
3. **Import** it later (or on a different browser) to compare object structures and identify unique fingerprints.

---

### Known Issues

* **Firefox (No DRM)**: requires installation to be finished for the dumper to initialize.
* **Type Mismatch**: Few inconsistencies between specific browser values during serialization on some environments.

### Tested On

* **Chromium-based** (Chrome, Brave, Edge, etc.)
* **Firefox**

---

### Development

To build the standalone HTML file:

```bash
node build.js
```
Then visit index.html to use!
