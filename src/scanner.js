async function scanAll(onProgress) {
  const map     = new Map();
  const seen    = new WeakSet();
  const winSeen = new WeakSet();

  onProgress?.("window", 0);
  await walk(window, "window", map, winSeen, 0);

  for (const { ns, get } of ACTIVATORS) {
    onProgress?.(ns, map.size);
    await YIELD();
    try {
      let obj = get();
      if (obj instanceof Promise) obj = await obj;
      if (obj == null) continue;

      if (typeof obj === "object") {
        map.set(ns, { type: "object", display: "[" + (obj?.constructor?.name ?? "Object") + "]" });
        await walk(obj, ns, map, seen, 0);
      } else {
        map.set(ns, { type: typeof obj, display: naturalDisplay(obj) });
      }
    } catch(e) {
      map.set(ns, { type: "throws", display: "[throws: " + e.message + "]" });
    }
  }

  return map;
}
