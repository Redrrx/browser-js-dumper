#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const SRC_ORDER = [
  "src/utils.js",
  "src/state.js",
  "src/walker.js",
  "src/constants/canvas.js",
  "src/constants/date.js",
  "src/constants/fonts.js",
  "src/constants/math.js",
  "src/constants/media-queries.js",
  "src/constants/permissions.js",
  "src/constants/webgl.js",
  "src/constants/integrity.js",
  "src/constants/css.js",
  "src/constants/wasm-features.js",
  "src/constants/drm.js",
  "src/constants/gpu-fp.js",
  "src/activators.js",
  "src/integrity.js",
  "src/scanner.js",
  "src/cache.js",
  "src/renderer.js",
  "src/sidebar.js",
  "src/ui.js",
];

const bundle = SRC_ORDER.map((f) => {
  const src = fs.readFileSync(path.join(__dirname, f), "utf8");
  const bar = "─".repeat(71);
  return `// ${bar}\n// ${f}\n// ${bar}\n\n${src}`;
}).join("\n");

const script = `<script>\n(function () {\n'use strict';\n\n${bundle}\n\n})();\n</script>`;

let template = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

if (!template.includes("<!-- BUILD:JS -->")) {
  template = template.replace(
    /<script>[\s\S]*?<\/script>/,
    "<!-- BUILD:JS -->",
  );
}

const out = template.replace("<!-- BUILD:JS -->", script);
fs.writeFileSync(path.join(__dirname, "index.html"), out);
console.log(
  `Built index.html  (${(out.length / 1024).toFixed(1)} KB)  [${SRC_ORDER.length} modules]`,
);
