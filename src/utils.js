const YIELD = () => new Promise(r => setTimeout(r, 0));
const BATCH = 1500;

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function attr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function getCat(path) {
  return path.split(".")[0];
}

function getTypes() {
  const s = new Set();
  document.querySelectorAll(".tf").forEach(c => { if (c.checked) s.add(c.value); });
  return s;
}

function pbar(frac, w = 28) {
  const f = Math.round(Math.max(0, Math.min(1, frac)) * w);
  return "▐" + "█".repeat(f) + "░".repeat(w - f) + "▌";
}
