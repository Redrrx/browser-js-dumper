function cmpRow(cls, content, myEntry, otherVal, otherType) {
  let d = '';
  if (myEntry)          d += ` data-val="${attr(myEntry.display)}" data-type="${myEntry.type}"`;
  if (otherVal != null) d += ` data-other="${attr(otherVal)}"`;
  if (otherType)        d += ` data-otype="${otherType}"`;
  return `<div class="row ${cls}"${d}>${content}</div>`;
}

const TAG_ONLY   = '<span class="tag tg-only">only here</span>';
const TAG_VAL    = '<span class="tag tg-val">≠ val</span>';
const mkTypeTag  = (f, t) => `<span class="tag tg-type">≠ type (${esc(f)}→${esc(t)})</span>`;

async function buildSingleCache() {
  singleCache = new Map([["__all__", []]]);
  let n = 0;
  for (const [path, e] of curMap) {
    const text  = path + " = " + e.display;
    const html  = `<div class="row t-${e.type}" data-path="${attr(path)}" data-val="${attr(e.display)}" data-type="${e.type}">${esc(text)}</div>`;
    const entry = { html, text, type: e.type };
    const cat   = getCat(path);
    if (!singleCache.has(cat)) singleCache.set(cat, []);
    singleCache.get(cat).push(entry);
    singleCache.get("__all__").push(entry);
    if (++n % 2000 === 0) await YIELD();
  }
}

async function buildCmpCache() {
  cmpCache = new Map([["__all__", { diff: [], same: [], miss: [], all: [] }]]);
  const allPaths = new Set([...curMap.keys(), ...impMap.keys()]);
  let n = 0;

  for (const path of allPaths) {
    const a = curMap.get(path), b = impMap.get(path);
    const ta = path + (a ? " = " + a.display : " = —");
    const tb = path + (b ? " = " + b.display : " = —");

    const state = (a && b)
      ? (a.type !== b.type ? "type" : a.display !== b.display ? "val" : "same")
      : (a ? "only-a" : "only-b");

    let aHtml, bHtml;
    if (state === "same") {
      aHtml = `<div class="row d-same">${esc(ta)}</div>`;
      bHtml = `<div class="row d-same">${esc(tb)}</div>`;
    } else if (state === "only-a") {
      aHtml = cmpRow("d-only",   esc(ta) + TAG_ONLY,              a,    "—",       null);
      bHtml = cmpRow("d-absent", esc(path) + " = —",              null, a.display, a.type);
    } else if (state === "only-b") {
      aHtml = cmpRow("d-absent", esc(path) + " = —",              null, b.display, b.type);
      bHtml = cmpRow("d-only",   esc(tb) + TAG_ONLY,              b,    "—",       null);
    } else if (state === "val") {
      aHtml = cmpRow("d-val",    esc(ta) + TAG_VAL,               a,    b.display, b.type);
      bHtml = cmpRow("d-val",    esc(tb) + TAG_VAL,               b,    a.display, a.type);
    } else {
      aHtml = cmpRow("d-type",   esc(ta) + mkTypeTag(a.type, b.type), a, b.display, b.type);
      bHtml = cmpRow("d-type",   esc(tb) + mkTypeTag(b.type, a.type), b, a.display, a.type);
    }

    const bucket = state === "same" ? "same" : (state === "only-a" || state === "only-b") ? "miss" : "diff";
    const entry  = { aHtml, bHtml, ta, tb, typeA: a?.type ?? null, typeB: b?.type ?? null };
    const cat    = getCat(path);

    if (!cmpCache.has(cat)) cmpCache.set(cat, { diff: [], same: [], miss: [], all: [] });
    cmpCache.get(cat)[bucket].push(entry);
    cmpCache.get(cat).all.push(entry);
    cmpCache.get("__all__")[bucket].push(entry);
    cmpCache.get("__all__").all.push(entry);

    if (++n % 2000 === 0) await YIELD();
  }
}
