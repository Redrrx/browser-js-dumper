const PROTO_STOPS = new Set([
  Object.prototype, Function.prototype, EventTarget.prototype,
]);
const SKIP_KEYS = new Set(["prototype", "__proto__", "constructor", "caller", "arguments"]);

function collectKeys(obj) {
  const keys = new Set();
  let cur = obj;
  while (cur !== null && !PROTO_STOPS.has(cur)) {
    for (const k of Reflect.ownKeys(cur))
      if (typeof k === "string" && !SKIP_KEYS.has(k)) keys.add(k);
    cur = Object.getPrototypeOf(cur);
  }
  return keys;
}

function naturalDisplay(val) {
  if (val === null)      return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "string")  return val;
  if (typeof val === "number")  return String(val);
  if (typeof val === "boolean") return String(val);
  if (typeof val === "bigint")  return String(val) + "n";
  if (val instanceof Float32Array || val instanceof Float64Array ||
      val instanceof Int32Array   || val instanceof Uint32Array  ||
      val instanceof Int16Array   || val instanceof Uint8Array)
    return Array.from(val).join(", ");
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
}

async function walk(obj, ns, map, seen, depth) {
  if (depth > 10) return;
  if (obj === null || typeof obj !== "object") return;
  if (seen.has(obj)) return;
  seen.add(obj);

  for (const key of collectKeys(obj)) {
    const path = ns + "." + key;
    let val, threw = false;
    try { val = obj[key]; } catch { threw = true; }

    if (threw) {
      map.set(path, { type: "throws", display: "[throws]" });
      continue;
    }

    const vt = val === null ? "null" : typeof val;

    if (vt === "function") {
      map.set(path, { type: "function", display: "[fn]" });
      continue;
    }

    if (vt === "object") {
      if (Array.isArray(val) && val.length > 0 &&
          val.every(v => v === null || (typeof v !== "object" && typeof v !== "function"))) {
        seen.add(val);
        const sorted = [...val].sort((a, b) => String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);
        map.set(path, { type: "string", display: sorted.join(", ") });
        continue;
      }
      map.set(path, { type: "object", display: "[" + (val?.constructor?.name ?? "Object") + "]" });
      await walk(val, path, map, seen, depth + 1);
      continue;
    }

    const type = vt === "number"
      ? (Number.isInteger(val) ? "integer" : "float")
      : vt;
    map.set(path, { type, display: naturalDisplay(val) });
    if (map.size % 500 === 0) await YIELD();
  }
}
